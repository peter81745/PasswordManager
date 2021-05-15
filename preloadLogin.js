const { contextBridge, ipcRenderer} = require('electron')

contextBridge.exposeInMainWorld(
    'loginWindow',
    {
        login: (key) => ipcRenderer.send('login', key),
        receive: (channel, func) => {
            let validChannels = ["incorrect-login"];
            if (validChannels.includes(channel)) {
                // Deliberately strip event as it includes `sender`
                ipcRenderer.once(channel, (event, ...args) => func(...args));
            }
        }
    }
)
