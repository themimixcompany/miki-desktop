const VERSION = "1.4.0";

const { app, BrowserWindow } = require('electron');
const path = require('path');
const child_process = require('child_process');
const fs = require('fs');

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
    width: 1800,
    height: 900
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadURL(`http://${HOST}:${PORT}`);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function runApp () {
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
