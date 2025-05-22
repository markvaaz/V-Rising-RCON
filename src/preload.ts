const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  rconConnect: (host: string, port: number, password: string) =>
    ipcRenderer.invoke('rcon-connect', host, port, password),
  rconCommand: (command: string) =>
    ipcRenderer.invoke('rcon-command', command),
  rconDisconnect: () =>
    ipcRenderer.invoke('rcon-disconnect'),
  onRconDisconnected: (callback: () => void) =>
    ipcRenderer.on('rcon-disconnected', callback),
});