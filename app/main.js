const VERSION = "1.2.0";

const { app, BrowserWindow } = require('electron');
const path = require('path');
const child_process = require('child_process');
const fs = require('fs');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT || 3000;

var mikiPath = null;
var child_proc = null;

let mainWindow;

function setMikiPath () {
  mikiPath = path.resolve(__dirname, 'miki');
}

function runMiki () {
  process.chdir(mikiPath);
  child_proc = child_process.exec('npm start');
  child_proc.stdout.on('data', (data) => {
    console.log(data);
  });
}

function stopMiki () {
  child_proc.kill("SIGTERM");
}

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1800,
    height: 900
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadURL(`http://${HOST}:${PORT}`);
  mainWindow.on('closed', () => {
    stopMiki();
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
