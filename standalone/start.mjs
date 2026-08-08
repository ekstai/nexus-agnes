// 独立运行启动器:嵌入式 PostgreSQL + NestJS 服务
// 通过 ELECTRON_RUN_AS_NODE=1 或 node 直接运行
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { startEmbeddedPostgres, ensureSchema } from './db.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');

function resolveServerEntry() {
  // 开发:dist/server/main.js;打包:resources 下同样布局
  const candidates = [
    path.join(appRoot, 'dist', 'server', 'main.js'),
    path.join(__dirname, 'dist', 'server', 'main.js'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  throw new Error('server entry not found, run `npm run build:prod` first');
}

async function main() {
  process.chdir(appRoot);

  const dataDir = process.env.STANDALONE_DATA_DIR || '';
  if (dataDir) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  console.log('[standalone] starting embedded postgres...');
  const db = await startEmbeddedPostgres();
  console.log('[standalone] postgres ready, applying schema...');
  try {
    await ensureSchema(db.client);
  } catch (err) {
    console.error('[standalone] failed to apply schema:', err);
    process.exitCode = 1;
    await db.close();
    return;
  }
  await db.client.end();

  const port = Number(process.env.SERVER_PORT || '3000');
  process.env.NODE_ENV = process.env.NODE_ENV || 'production';
  process.env.SUDA_DATABASE_URL = db.connectionString;
  process.env.SERVER_HOST = '127.0.0.1';
  process.env.SERVER_PORT = String(port);
  process.env.LOG_DIR = process.env.LOG_DIR || path.join(dataDir || appRoot, 'logs');
  // 平台相关能力默认关闭,避免无意义的外部请求
  process.env.FORCE_FRAMEWORK_ENVIRONMENT = 'standalone';
  // 平台 HTTP 客户端要求该域名;本地无真实平台调用,占位即可
  process.env.FORCE_AUTHN_INNERAPI_DOMAIN = `http://127.0.0.1:${port}`;

  const serverEntry = resolveServerEntry();
  console.log(`[standalone] starting server from ${serverEntry} on 127.0.0.1:${port}...`);

  const require = createRequire(import.meta.url);
  require(serverEntry);
}

main().catch((err) => {
  console.error('[standalone] fatal:', err);
  process.exit(1);
});
