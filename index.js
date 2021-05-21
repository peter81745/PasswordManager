const electron = require('electron');
const {app, BrowserWindow, Menu, ipcMain} = electron;
var fs = require('fs');
const path = require('path');
const url = require('url');
var CryptoJS = require("crypto-js");
var UpdateGUI = require("./update.js")
const sqlite3 = require('sqlite3').verbose();
const dialog = electron.dialog;
const util = require("util");

/*
  Convert the Electron Dialog Popup to an console output.
*/
dialog.showErrorBox = function(title, content) {
    console.log(`${title}\n${content}`);
};

/*
  Create/Initzialising the Database File. After that check if the Table called dataTable exists, if not it will be created.
  If not Password is set, create the default Password which is "1234"
*/
let db = new sqlite3.Database('data.db');
db.run(`
  CREATE TABLE IF NOT EXISTS dataTable (
    name TEXT NOT NULL PRIMARY KEY,
    password TEXT NOT NULL
  );
`,[],(err,row) => {
  db.run(`
    INSERT OR IGNORE INTO dataTable(name, password) VALUES ("password",?)
  `,[CryptoJS.AES.encrypt('1234', '1234').toString()]);
});


/*
  The Menu Layout
*/
menuTemplate = [
  {
    label: 'Info',
    submenu: [
      {
        label: 'About me',
        click: () => {
          openAboutWindow();
        }
      }
    ]
  },
  {
    label: 'Settings',
    submenu: [
      {
        label: 'Change Password',
        click: () => {
          openChangePasswordWindow();
          mainWindow.close();
        }
      }
    ]
  }
]

let loginWindow;

/*
  Function to create the Login Windows which is used on startup.
*/
function createLoginWindow () {

  // Create the browser window.
  loginWindow = new BrowserWindow({
    width: 500,
    height: 500,
    icon: path.join(__dirname, 'assets/icon.ico'),
	webPreferences: {
		nodeIntegration: false,
		contextIsolation: true,
		enableRemoteModule: false,
    preload: path.join(__dirname, "preloadLogin.js")
    }
  })

  // Load the index.html file
  loginWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'login.html'),
    protocol: 'file:',
    slashes: true
  }))

  loginWindow.setMenu(null);

  loginWindow.on('closed', () => {
    loginWindow = null
  })
  /*
    Enable Devtools for the Login Window.
  */
  //devtools = new BrowserWindow()
  //loginWindow.webContents.setDevToolsWebContents(devtools.webContents)
  //loginWindow.webContents.openDevTools({ mode: 'detach' })
}

let mainWindow;

/*
  This Function creates the Main Window where Passwords can be seen, added and deleted.
*/
function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 650,
    icon: path.join(__dirname, 'assets/icon.ico'),
	webPreferences: {
		nodeIntegration: false,
		contextIsolation: true,
		enableRemoteModule: false,
    preload: path.join(__dirname, "preloadMain.js")
    }
  })

  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  var menu = Menu.buildFromTemplate(menuTemplate)
  mainWindow.setMenu(menu)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
  /*
    Enable Devtools for the Login Window.
  */
  //devtools = new BrowserWindow()
  //mainWindow.webContents.setDevToolsWebContents(devtools.webContents)
  //mainWindow.webContents.openDevTools({ mode: 'detach' })
}

let encryptionKey;

/*
  Login Event which is called from the Login Windows, this Event basically verifies the if the Password is correct.
  If the Password is correct, the mainWindow will be opened.
*/
ipcMain.on('login', function(e, key){
  encryptionKey = key.toString();
  db.get(`SELECT password FROM dataTable WHERE name = ?`, ['password'], (err, row) => {
    var bytes  = CryptoJS.AES.decrypt(row.password, encryptionKey);
    var originalText = bytes.toString(CryptoJS.enc.Utf8);
    if (originalText === encryptionKey) {
      createWindow();
      loginWindow.close();
    } else {
      loginWindow.webContents.send("incorrect-login");
    }
  });
});

/*
  Event which, when called, creates a new Database entry with the provided name and encrypted Password.
*/
ipcMain.on('new_entry', function(e, name, pw) {
  if (name == "password") {
	const win = new BrowserWindow();
	win.loadURL(url.format({
		pathname: path.join(__dirname, 'error.html'),
		protocol: 'file:',
		slashes: true
	}));
	win.setMenu(null);
  } else {
	  db.run(`
		INSERT OR REPLACE INTO dataTable(name, password) VALUES (?,?)
	  `,[name, CryptoJS.AES.encrypt(pw, encryptionKey).toString()]);
	  // Update the Gui after creating a new Entry
	  new UpdateGUI(mainWindow, db).updateHTMLTable(encryptionKey);
  }
});

/*
  Event which, when called, deletes an entry from the Database.
*/
ipcMain.on('del_entry', function(e, value) {
  db.run(`
    DELETE FROM dataTable WHERE name = ?
  `,[value]);
  // Update the Gui after deleting an Entry
  new UpdateGUI(mainWindow, db).updateHTMLTable(encryptionKey);
});

/*
  Event which when called, copy the original Password to the Users Clipboard
*/
ipcMain.on('copy_entry', function(e, value){
  db.get(`SELECT password FROM dataTable WHERE name = ?`, [value], (err, row) => {
    var bytes  = CryptoJS.AES.decrypt(row.password, encryptionKey);
    require('child_process').spawn('clip').stdin.end(bytes.toString(CryptoJS.enc.Utf8));
  });
});

/*
  Event which, when called, updates the Content on the mainWindow.
*/
ipcMain.on('manual_update', function(e) {
  new UpdateGUI(mainWindow, db).updateHTMLTable(encryptionKey);
});

ipcMain.on('change_pw', function(e, pw) {
  if (!(pw.length <= 0)) {
    db.run(`
      UPDATE dataTable SET password = ? WHERE name = ?
    `,[CryptoJS.AES.encrypt(pw, pw).toString(), 'password']);
    db.all(`SELECT * FROM dataTable`, [], (err, rows) => {
      rows.forEach((row) => {
        if (!(row.name == "password")) {
          db.run(`
            UPDATE dataTable SET password = ? WHERE name = ?
          `,[CryptoJS.AES.encrypt(CryptoJS.AES.decrypt(row.password, encryptionKey).toString(CryptoJS.enc.Utf8), pw).toString(), row.name]);
        }
      });
      e.sender.send("change_gui", "The Password has been changed, you can close this Window now and start the Password Manager again.");
    });
  } else {
    e.sender.send("change_gui", "The Password Field can't be blank.");
  }
});

/*
  Function, which creates the About Window when called.
*/
function openAboutWindow() {

  let aboutWindow = new BrowserWindow({
    parent: mainWindow,
    modal: true,
    show: false,
    width: 500,
    height: 400,
    icon: path.join(__dirname, 'assets/icon.ico'),
  })
  aboutWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'about.html'),
    protocol: 'file:',
    slashes: true
  }))
  aboutWindow.setMenu(null)
  aboutWindow.once('ready-to-show', () => {
    aboutWindow.show();
  })
}

/*
  Function, which creates the Change Password Window when called.
*/
let changePasswordWindow;

function openChangePasswordWindow() {
  changePasswordWindow = new BrowserWindow({
    width: 500,
    height: 500,
    icon: path.join(__dirname, 'assets/icon.ico'),
  	webPreferences: {
  		nodeIntegration: false,
  		contextIsolation: true,
  		enableRemoteModule: false,
      preload: path.join(__dirname, "preloadChangePassword.js")
      }
  })

  changePasswordWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'changePassword.html'),
    protocol: 'file:',
    slashes: true
  }))
  changePasswordWindow.setMenu(null)

  changePasswordWindow.on('closed', () => {
    changePasswordWindow = null;
  });
}


// Create the window then the app is ready
app.on('ready', () => {
  createLoginWindow();
  electron.powerMonitor.on('on-ac', () => {
    mainWindow.restore();
  })
  electron.powerMonitor.on('on-battery', () => {
    mainWindow.minimize();
  })
})

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
})

// Reopen the app on macOS
app.on('activate', () => {
  if (loginWindow === null) {
    createLoginWindow();
  }
})
