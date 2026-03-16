const { contextBridge, ipcRenderer } = require('electron');


contextBridge.exposeInMainWorld('electronAPI', {
// future safe IPC wrappers
send: (channel, payload) => ipcRenderer.send(channel, payload),
invoke: (channel, payload) => ipcRenderer.invoke(channel, payload)
});