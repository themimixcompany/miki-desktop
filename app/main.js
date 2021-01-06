const { app, BrowserWindow } = require('electron');
const host = process.env.HOST || '127.0.0.1';
const port = process.env.PORT || 3000;

let mainWindow;

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

function runApp () {
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
