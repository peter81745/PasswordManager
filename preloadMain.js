const { contextBridge, ipcRenderer} = require('electron')

contextBridge.exposeInMainWorld(
    'mainWindow',
    {
        create: (name, key) => ipcRenderer.send('new_entry', name, key),
		    delete: (value) => ipcRenderer.send('del_entry', value),
        copy: (value) => ipcRenderer.send('copy_entry', value),
        manual_update: () => ipcRenderer.send('manual_update'),
        receive: (channel, func) => {
            let validChannels = ["update_gui"];
            if (validChannels.includes(channel)) {
                // Deliberately strip event as it includes `sender`
                ipcRenderer.on(channel, (event, ...args) => func(...args));
            }
        }
    }
)
