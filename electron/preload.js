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
  // ---- 系统工具(电脑自动化) ----
  createFile: (ctx) => ipcRenderer.invoke('system:create-file', ctx),
  readTextFile: () => ipcRenderer.invoke('system:read-text-file'),
  readPhoto: () => ipcRenderer.invoke('system:read-photo'),
  openFolder: (folderPath) => ipcRenderer.invoke('system:open-folder', folderPath),
  getWorkspaceDir: () => ipcRenderer.invoke('system:workspace-dir'),
});