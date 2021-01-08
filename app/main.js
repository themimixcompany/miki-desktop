const VERSION = "1.0.0";

const { app, BrowserWindow } = require('electron');
const host = process.env.HOST || '127.0.0.1';
const port = process.env.PORT || 3000;

const path = require('path');
const child_process = require('child_process');
const fs = require('fs');

var mikiPath = null;
var child_proc = null;

let mainWindow;

function setMikiPath () {
    mikiPath= path.resolve(__dirname, 'miki');
}

function runMiki () {
  process.chdir(mikiPath);
  child_proc = child_process.exec('npm start');
  child_proc.stdout.on('data', (data) => {
    console.log(data);
  });
}

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1800,
    height: 900
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadURL(`http://${host}:${port}`);
  // mainWindow.webContents.openDevTools()

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function runApp () {
  setMikiPath();
  runMiki();
  await new Promise(resolve => setTimeout(resolve, 10000));
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
