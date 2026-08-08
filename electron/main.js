// Electron 主进程:启动内嵌后端(ELECTRON_RUN_AS_NODE)并打开应用窗口
const { app, BrowserWindow, dialog, shell, ipcMain, session } = require('electron');
const { spawn, execFile } = require('child_process');
const path = require('path');
const http = require('http');

const PORT = 3000;
const STARTUP_TIMEOUT_MS = 180000;
const APP_NAME = 'Nexus Agnes';
let backendProcess = null;
let mainWindow = null;

function isElevated() {
  return new Promise((resolve) => {
    execFile('net', ['session'], { timeout: 5000 }, (err) => {
      // `net session` 仅在提升令牌下成功;非提升返回拒绝访问
      resolve(!err);
    });
  });
}

async function maybeRelocateElevated() {
  if (process.env.AGNES_RELAUNCHED === '1' || process.argv.includes('--agnes-relaunched')) {
    return false;
  }
  let elevated = false;
  try {
    elevated = await isElevated();
  } catch (err) {
    elevated = false;
  }
  if (!elevated) {
    return false;
  }
  log('running elevated, relaunching with a restricted token...');
  const relaunchEnv = {
    ...process.env,
    AGNES_RELAUNCHED: '1',
  };
  try {
    const child = spawn('runas.exe', ['/trustlevel:0x20000', `"${process.execPath}" --agnes-relaunched`], {
      env: relaunchEnv,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.on('error', (err) => {
      log('relaunch failed:', err);
      dialog.showErrorBox(
        '提示',
        '检测到当前以管理员权限运行,但无法自动切换到普通权限启动。\n本程序不需要管理员权限,请直接双击启动。'
      );
      app.exit(1);
    });
    child.unref();
    log('relaunch requested, exiting elevated instance...');
    app.exit(0);
    return true;
  } catch (err) {
    log('relaunch error:', err);
    return false;
  }
}

function logFile(...args) {
  try {
    const fs = require('fs');
    const os = require('os');
    const dir = process.env.LOG_DIR || require('path').join(os.tmpdir(), 'agnes-chat-desktop');
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(require('path').join(dir, 'desktop.log'), `[${new Date().toISOString()}] ${args.join(' ')}\n`);
  } catch (err) {
    // ignore
  }
}

function log(...args) {
  console.log('[desktop]', ...args);
  logFile(...args);
}

function isPortOpen(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const net = require('net');
    const socket = net.connect({ host, port });
    const done = (ok) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(2000);
    socket.on('connect', () => done(true));
    socket.on('error', () => done(false));
    socket.on('timeout', () => done(false));
  });
}

async function waitForServer(port, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isPortOpen(port)) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

function findFreePort(start) {
  return new Promise((resolve, reject) => {
    const server = require('net').createServer();
    server.unref();
    server.on('error', reject);
    server.listen(start, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

function isPortInUseByUs(port, host = '127.0.0.1') {
  return isPortOpen(port, host);
}

function getPidByPort(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    execFile('netstat', ['-ano'], { timeout: 10000 }, (err, stdout) => {
      if (err) {
        resolve(null);
        return;
      }
      const re = new RegExp(`\\s${host}:${port}\\s+.*\\s(\\d+)\\s*$`, 'm');
      const m = stdout.match(re);
      resolve(m ? Number(m[1]) : null);
    });
  });
}

async function killStaleBackend(port) {
  const pid = await getPidByPort(port);
  if (!pid) {
    return;
  }
  // 只清理我们的后端:端口由主进程管理,若已被占用且锁未生效,说明是残留进程
  log(`stale backend detected on port ${port} (pid ${pid}), killing...`);
  try {
    execFile('taskkill', ['/PID', String(pid), '/T', '/F'], { timeout: 10000 }, (e) => {
      if (e) {
        log('failed to kill stale backend:', e.message);
      }
    });
    // 等待端口释放
    for (let i = 0; i < 30; i++) {
      const stillOpen = await isPortOpen(port);
      if (!stillOpen) {
        return;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  } catch (err) {
    log('kill stale backend error:', err);
  }
}

async function startBackend() {
  // 已有本应用在运行时,直接复用现有后端,避免启动第二个 PG 实例造成端口/数据目录冲突
  const inUse = await isPortInUseByUs(PORT);
  if (inUse) {
    log(`reusing existing backend (port ${PORT})...`);
    return PORT;
  }
  await killStaleBackend(PORT);
  const freePort = await findFreePort(PORT);
  const standalonePath = path.join(__dirname, '..', 'standalone', 'start.mjs');
  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    SERVER_PORT: String(freePort),
    NODE_ENV: 'production',
    STANDALONE_VERBOSE: process.env.STANDALONE_VERBOSE || '',
  };
  log(`starting backend (port ${freePort})...`);
  backendProcess = spawn(process.execPath, [standalonePath], {
    env,
    cwd: path.join(__dirname, '..'),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  backendProcess.stdout.on('data', (d) => {
    const s = d.toString();
    process.stdout.write(`[server] ${s}`);
    logFile(`[server] ${s}`);
  });
  backendProcess.stderr.on('data', (d) => {
    const s = d.toString();
    process.stderr.write(`[server] ${s}`);
    logFile(`[server] ${s}`);
  });
  backendProcess.on('exit', (code) => {
    log(`backend exited with code ${code}`);
  });

  const ready = await waitForServer(freePort, STARTUP_TIMEOUT_MS);
  if (!ready) {
    throw new Error(`backend did not become ready within ${STARTUP_TIMEOUT_MS / 1000}s`);
  }
  return freePort;
}

function createWindow(url) {
  // 允许渲染进程访问摄像头/麦克风(相机助手插件)
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === 'media' || permission === 'mediaKeySystem');
  });

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 420,
    minHeight: 700,
    title: APP_NAME,
    // 透明无边框窗口：视觉更轻盈；配合 CSS 圆角与原型背景
    transparent: true,
    frame: false,
    backgroundColor: '#00000000',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // 窗口控制 IPC
  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:maximize', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
    return mainWindow.isMaximized();
  });
  ipcMain.handle('window:close', () => quitApp());
  ipcMain.handle('window:is-maximized', () => !!mainWindow && mainWindow.isMaximized());
  mainWindow.on('maximize', () => mainWindow?.webContents.send('window:maximized-changed', true));
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window:maximized-changed', false));

  // 选择工作目录
  ipcMain.handle('dialog:pick-workspace', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择工作目录',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  // ---- 系统工具(电脑自动化): 文件/文件夹/照片 ----
  const getWorkspaceDir = (override) => {
    const fallback = path.join(app.getPath('documents'), 'Nexus Agnes');
    return override && typeof override === 'string' ? override : fallback;
  };

  ipcMain.handle('system:workspace-dir', () => process.env.AGNES_WORKSPACE || getWorkspaceDir());

  ipcMain.handle('system:create-file', async (_event, ctx) => {
    try {
      const fs = require('fs');
      const fileName = String((ctx && ctx.fileName) || 'unnamed.txt').replace(/[\\/:*?"<>|]/g, '_');
      const content = String((ctx && ctx.content) || '');
      const dir = getWorkspaceDir(ctx && ctx.dir);
      fs.mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, fileName);
      fs.writeFileSync(filePath, content, 'utf8');
      return { success: true, path: filePath, dir };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('system:read-text-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择要读取的文件',
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }
    try {
      const fs = require('fs');
      const filePath = result.filePaths[0];
      const content = fs.readFileSync(filePath, 'utf8');
      const size = fs.statSync(filePath).size;
      return { success: true, path: filePath, name: path.basename(filePath), size, content: content.slice(0, 200000) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('system:read-photo', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '读取照片',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] }],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }
    try {
      const fs = require('fs');
      const filePath = result.filePaths[0];
      const data: Buffer = fs.readFileSync(filePath);
      const ext = path.extname(filePath).slice(1) || 'png';
      const mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp' }[ext] || 'image/png';
      const dataUrl = `data:${mime};base64,${data.toString('base64')}`;
      return { success: true, path: filePath, name: path.basename(filePath), size: data.length, dataUrl };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('system:open-folder', async (_event, folderPath) => {
    const dir = folderPath || getWorkspaceDir();
    const shellError = await shell.openPath(dir);
    return { success: !shellError, path: dir, shellError };
  });

  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
      shell.openExternal(targetUrl);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    log(`[renderer] console:${level} ${message} (${sourceId}:${line})`);
  });
  mainWindow.webContents.session.webRequest.onErrorOccurred((details) => {
    if (details.error && details.error !== 'net::ERR_ABORTED') {
      log(`[renderer] net error ${details.error} url=${details.url}`);
    }
  });
  mainWindow.webContents.executeJavaScript(`(() => {
    window.__errors = [];
    window.__susp = [];
    window.addEventListener('error', (e) => { window.__errors.push('onerror: ' + String(e.error && e.error.stack || e.message)); });
    window.addEventListener('unhandledrejection', (e) => { window.__errors.push('unhandledrejection: ' + (e.reason && e.reason.stack || String(e.reason))); });
  })();`, true).catch(() => {});
  try {
    mainWindow.webContents.debugger.attach('1.3');
    mainWindow.webContents.debugger.on('message', (_e, method, params) => {
      if (method === 'Runtime.exceptionThrown') {
        const d = params && params.exceptionDetails;
        const text = d && d.exception ? (d.exception.description || d.exception.value) : (d && d.text);
        log('[cdp] exception: ' + String(text).slice(0, 500));
      } else if (method === 'Runtime.consoleAPICalled') {
        const type = params && params.type;
        if (type === 'error' || type === 'warning') {
          const args = (params.args || []).map(a => a.value !== undefined ? a.value : a.description).join(' | ');
          log(`[cdp] console.${type}: ` + String(args).slice(0, 500));
        }
      }
    });
    mainWindow.webContents.debugger.sendCommand('Runtime.enable');
    mainWindow.webContents.debugger.sendCommand('Log.enable');
  } catch (e) {
    log('[cdp] attach failed:', e.message);
  }
  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url2, isMainFrame) => {
    if (isMainFrame) {
      log(`[renderer] did-fail-load code=${code} desc=${desc} url=${url2}`);
    }
  });
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    log(`[renderer] process gone reason=${details.reason}`);
  });
  mainWindow.webContents.on('did-finish-load', () => {
    log('[renderer] did-finish-load');
    setTimeout(async () => {
      try {
        const snap = await mainWindow.webContents.executeJavaScript(
          `(() => {
            const rootEl = document.getElementById('root');
            const fiberProbe = (() => {
              try {
                const key = Object.keys(rootEl || {}).find(k => k.startsWith('__reactContainer'));
                if (!key) return 'no-fiber-key';
                const containerVal = rootEl[key];
                const rootFiber = containerVal && containerVal.current && containerVal.current.tag !== undefined ? containerVal.current : containerVal;
                const fiberRootNode = rootFiber.stateNode;
                const out = [];
                let f = rootFiber.child;
                let depth = 0;
                while (f && depth < 30) {
                  const t = (f.elementType && (f.elementType.name || f.elementType.displayName)) || String(f.type || '').slice(0, 40) || ('tag' + f.tag);
                  out.push({ d: depth, tag: f.tag, t, flags: f.flags });
                  f = f.child;
                  depth++;
                }
                const outAlt = [];
                let fa = rootFiber.alternate;
                let da = 0;
                while (fa && da < 40) {
                  const t = (fa.elementType && (fa.elementType.name || fa.elementType.displayName)) || String(fa.type || '').slice(0, 40) || ('tag' + fa.tag);
                  outAlt.push({ d: da, tag: fa.tag, t, flags: fa.flags });
                  fa = fa.child;
                  da++;
                }
                return JSON.stringify({ containerKeys: Object.keys(rootEl || {}).filter(k => k.startsWith('__react')), hasChild: !!rootFiber.child, pendingLanes: fiberRootNode && fiberRootNode.pendingLanes, suspendedLanes: fiberRootNode && fiberRootNode.suspendedLanes, pingedLanes: fiberRootNode && fiberRootNode.pingedLanes, expiredLanes: fiberRootNode && fiberRootNode.expiredLanes, wip: !!(fiberRootNode && fiberRootNode.current && fiberRootNode.current.alternate), chain: out, altChain: outAlt });
              } catch (e) { return 'probe-err: ' + (e && e.stack || e); }
            })();
            return ({html: rootEl ? rootEl.innerHTML.slice(0, 300) : 'NO ROOT', bodyLen: document.body.innerHTML.length, title: document.title, errors: (window.__errors||[]).slice(0,8), res: performance.getEntriesByType('resource').map(r => r.name), hasReactRoot: !!(rootEl && Object.keys(rootEl).some(k => k.startsWith('__reactContainer'))), scripts: Array.from(document.scripts).map(s => s.src || 'inline'), fiber: fiberProbe});
          })()`
        );
        log(`[renderer] snapshot root=${snap.html} bodyLen=${snap.bodyLen} title=${snap.title} errors=${JSON.stringify(snap.errors)} resources=${JSON.stringify(snap.res.slice(0,40))} hasReactRoot=${snap.hasReactRoot} scripts=${JSON.stringify(snap.scripts)} fiber=${snap.fiber}`);
        if (mainWindow) {
          const img = await mainWindow.webContents.capturePage();
          const fs = require('fs');
          fs.writeFileSync(require('path').join(require('os').tmpdir(), 'agnes-chat-desktop', 'shot.png'), img.toPNG());
          log('[renderer] screenshot saved');
        }
      } catch (err) {
        log('[renderer] snapshot failed:', err.message);
      }
    }, 15000);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    quitApp();
  });

  mainWindow.loadURL(url);
}

function quitApp() {
  if (backendProcess) {
    log('stopping backend...');
    try {
      backendProcess.kill();
    } catch (err) {
      // ignore
    }
    backendProcess = null;
  }
  app.quit();
}

// 单实例保护:重复启动(无论是否管理员)直接复用已运行的实例,不再启动第二个后端/PG
const isRelaunched = process.argv.includes('--agnes-relaunched') || process.env.AGNES_RELAUNCHED === '1';
let hasMainLock = false;
if (!isRelaunched) {
  hasMainLock = app.requestSingleInstanceLock();
} else {
  // 由提权实例重启动的实例:等待原实例退出释放单实例锁
  const buf = new Int32Array(new SharedArrayBuffer(4));
  let waited = 0;
  while (waited < 30000) {
    hasMainLock = app.requestSingleInstanceLock();
    if (hasMainLock) {
      break;
    }
    Atomics.wait(buf, 0, 0, 250);
    waited += 250;
  }
}
if (!hasMainLock) {
  app.quit();
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  }
});

app.whenReady().then(async () => {
  if (!hasMainLock) {
    return;
  }
  try {
    const relocated = await maybeRelocateElevated();
    if (relocated) {
      return;
    }
    const port = await startBackend();
    createWindow(`http://127.0.0.1:${port}/app/local-app/`);
  } catch (err) {
    log('failed to start backend:', err);
    dialog.showErrorBox('启动失败', `无法启动应用服务:\n${err.message}`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  quitApp();
});

app.on('before-quit', () => {
  if (backendProcess) {
    try {
      backendProcess.kill();
    } catch (err) {
      // ignore
    }
    backendProcess = null;
  }
});
