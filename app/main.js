const VERSION = "1.4.0";

const { app, BrowserWindow } = require('electron');
const path = require('path');
const child_process = require('child_process');
const fs = require('fs');
const portscanner = require('portscanner');
const sleep = require('system-sleep');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT || 3000;
const MIKIROOT = path.resolve(__dirname, 'miki');

let pythonPath;
let mainWindow;

function setPythonPath () {
  console.log(`** setPythonPath`);
  console.log(`__dirname: ${__dirname}`);
  if (process.platform === 'win32'){
    if (fs.existsSync(path.resolve(__dirname, 'resources/app/app/python/windows/python'))) {
      pythonPath = path.resolve(__dirname, 'resources/app/app/python/windows/python');
    } else {
      pythonPath = "python";
    }
  } else {
    pythonPath = "python";
  }
}

function runMiki () {
  console.log(`** runMiki`);
  console.log(`__dirname: ${__dirname}`);
  console.log(`MIKIROOT: ${MIKIROOT}`);
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

function runApp () {
  let stat;

  setPythonPath();
  runMiki();

  outer:
  while (true) {
    portscanner.checkPortStatus(PORT, HOST, (error, status) => {
      stat = status;
    });

    if (stat == 'open') {
      break outer;
    } else {
      sleep(5*1000);
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
