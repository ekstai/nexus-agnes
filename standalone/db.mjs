// 嵌入式 PostgreSQL 生命周期管理
// 数据目录与运行时位置无关,持久化在用户数据目录,保证数据不随程序更新丢失
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getDataDir() {
  const override = process.env.STANDALONE_DATA_DIR;
  if (override) {
    return path.resolve(override);
  }
  const base = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  return path.join(base, 'agnes-chat-app', 'pgdata');
}

function resolveSchemaSqlPath() {
  // 打包后与运行时同目录;开发时在项目 standalone 目录
  return path.join(__dirname, 'schema.sql');
}

export async function ensureSchema(pgClient) {
  const sql = fs.readFileSync(resolveSchemaSqlPath(), 'utf-8');
  await pgClient.query(sql);
}

export function getConnectionString(dataDir, port, user, password) {
  return `postgresql://${user}:${password}@127.0.0.1:${port}/agnes`;
}

export async function startEmbeddedPostgres() {
  const { default: EmbeddedPostgres } = await import('embedded-postgres');

  const dataDir = getDataDir();
  const port = Number(process.env.STANDALONE_PG_PORT || '54329');
  const user = process.env.STANDALONE_PG_USER || 'postgres';
  const password = process.env.STANDALONE_PG_PASSWORD || 'postgres';
  const database = 'agnes';

  fs.mkdirSync(dataDir, { recursive: true });

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    port,
    user,
    password,
    authMethod: 'password',
    persistent: true,
    initdbFlags: ['--locale=C'],
    onLog: (msg) => {
      if (process.env.STANDALONE_VERBOSE === '1') {
        console.log('[pg]', msg);
      }
    },
    onError: (msg) => console.error('[pg]', msg),
  });

  const initialized = fs.existsSync(path.join(dataDir, 'PG_VERSION'));
  if (!initialized) {
    await pg.initialise();
  }
  await pg.start();

  // 确保数据库存在
  const adminClient = await pg.getPgClient();
  try {
    await adminClient.connect();
    const res = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [database]
    );
    if (res.rowCount === 0) {
      await adminClient.query(`CREATE DATABASE ${database}`);
    }
  } finally {
    await adminClient.end();
  }

  const conn = await pg.getPgClient(database);
  try {
    await conn.connect();
  } catch (err) {
    throw err;
  }

  return {
    pg,
    client: conn,
    connectionString: getConnectionString(dataDir, port, user, password),
    async close() {
      try {
        await conn.end();
      } catch {}
      await pg.stop();
    },
  };
}
