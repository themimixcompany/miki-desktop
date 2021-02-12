const VERSION = "1.5.0";

const { app, BrowserWindow } = require('electron');
const path = require('path');
const child_process = require('child_process');
const fs = require('fs');
const portscanner = require('portscanner');
const sleep = require('system-sleep');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT || 3000;
const MIKIROOT = path.resolve(__dirname, 'miki');

let mainWindow;

function runMiki () {
  process.chdir(MIKIROOT);
  require(__dirname + '/miki/server/index.js');
}

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    center: true
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadURL(`http://${HOST}:${PORT}`);
  mainWindow.maximize();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function runApp () {
  let stat;

  runMiki();

  outer:
  while (true) {
    portscanner.checkPortStatus(PORT, HOST, (error, status) => {
      stat = status;
    });

    if (stat == 'open') {
      break outer;
    } else {
      sleep(1*1000);
    }
  }

  createWindow();
}

function main () {
  app.on('ready', runApp);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', () => {
    if (mainWindow === null) createWindow();
  });
}

main();
