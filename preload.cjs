const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isOfflineDesktop: true,
  getVersion: () => '1.2.0-offline-pro'
});
