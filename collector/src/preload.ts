import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('collector', {
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  // Reserved for future IPC channels
  // e.g. ipcRenderer.invoke('some-channel', ...args)
});
