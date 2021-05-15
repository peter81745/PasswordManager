'use strict'
var fs = require('fs');
const path = require('path');
const url = require('url');

class UpdateGUI {
  constructor(mainWindow, db) {
    this.mainWindow = mainWindow;
    this.db = db;
  }

  updateHTMLTable(encryptionKey) {
    var return_value = '';
    this.db.all(`SELECT * FROM dataTable`, [], (err, rows) => {
      rows.forEach((row) => {
        if (!(row.name == "password")) {
          return_value = return_value + '<tr><td>' + row.name + '</td><td><a href="javascript:void(0);" onclick="copy(`' + row.name + '`)"><i class="material-icons">content_copy</i></a></td><td><a href="javascript:void(0);" onclick="del(`' + row.name + '`)"><i class="material-icons">delete</i></a></td></tr>'
        }
      });
      this.mainWindow.webContents.send("update_gui", return_value);
    });
  }
}

module.exports = UpdateGUI;
