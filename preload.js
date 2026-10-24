const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  pdf: o => ipcRenderer.invoke('pdf', o),
  print: o => ipcRenderer.invoke('print', o),
  printers: () => ipcRenderer.invoke('printers')
});
