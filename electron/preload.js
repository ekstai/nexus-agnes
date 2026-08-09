// Preload: 向渲染进程暴露最小化的桌面能力（窗口控制/工作目录/系统工具）
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nexusDesktop', {
  isDesktop: true,
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  onMaximizeChange: (callback) => {
    ipcRenderer.on('window:maximized-changed', (_event, value) => callback(value));
    return () => ipcRenderer.removeAllListeners('window:maximized-changed');
  },
  pickWorkspaceDir: () => ipcRenderer.invoke('dialog:pick-workspace'),
  // ---- Computer Use(电脑控制,对齐 Codex) ----
  computerUse: {
    screenshot: () => ipcRenderer.invoke('computer-use:screenshot'),
    mouse: (opts) => ipcRenderer.invoke('computer-use:mouse', opts),
    type: (text) => ipcRenderer.invoke('computer-use:type', String(text ?? '')),
    key: (name) => ipcRenderer.invoke('computer-use:key', String(name ?? '')),
    shell: (command, cwd) =>
      ipcRenderer.invoke('computer-use:shell', { command: String(command ?? ''), cwd: cwd ? String(cwd) : undefined }),
    open: (target) => ipcRenderer.invoke('computer-use:open', String(target ?? '')),
    info: () => ipcRenderer.invoke('computer-use:info'),
  },
});