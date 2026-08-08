// Preload: 向渲染进程暴露最小化的桌面能力（窗口控制/工作目录）
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nexusDesktop', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  onMaximizeChange: (callback) => {
    ipcRenderer.on('window:maximized-changed', (_event, value) => callback(value));
    return () => ipcRenderer.removeAllListeners('window:maximized-changed');
  },
  pickWorkspaceDir: () => ipcRenderer.invoke('dialog:pick-workspace'),
});
