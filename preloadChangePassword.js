const { contextBridge, ipcRenderer} = require('electron')

contextBridge.exposeInMainWorld(
  'changePasswordWindow',
  {
    change: (pw) => ipcRenderer.send('change_pw', pw),
    receive: (channel, func) => {
        let validChannels = ["change_gui"];
        if (validChannels.includes(channel)) {
            // Deliberately strip event as it includes `sender`
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    }
  }
);
