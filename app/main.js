const VERSION = '2.4.1';

const { app, BrowserWindow } = require('electron');
const path = require('path');
const { execSync, spawn, spawnSync } = require('child_process');
const fs = require('fs-extra');
const portscanner = require('portscanner');
const sleep = require('system-sleep');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT || 80;
const MIKIROOT = path.resolve(__dirname, 'miki');

var PG_PATH;
const PG_HOST = 'localhost';
const PG_PORT = 5432;
const PG_USER = 'doadmin';
const PG_PASSWORD = '0123456789';
const PG_DATABASE = 'defaultdb';

const MIMIX_APPDATA = path.resolve(process.env.APPDATA, 'Mimix');

let mainWindow;

function debug (error, stdout, stderr) {
  if (error) {
    console.error(`exec error: ${error}`);
  }
  console.log(`stdout: ${stdout}`);
  console.error(`stderr: ${stderr}`);
}

function installPostgres () {
  console.log('** installPostgres start');

  const appdata = process.env.APPDATA;
  const sourcePath = path.resolve(__dirname, 'pgsql/windows');
  const destPath = path.resolve(`${MIMIX_APPDATA}/pgsql`);

  if(fs.existsSync(destPath)) {
    return true;
  } else {
    fs.mkdirSync(MIMIX_APPDATA);

    try {
      fs.copySync(sourcePath, destPath);
      console.log('success!');
    } catch (err) {
      console.error(err);
    }
  }

  console.log('** installPostgres done');
}

function initDatabase () {
  console.log('** initDatabase start');
  spawnSync(`${PG_PATH}/bin/initdb`,
            ['-U', PG_USER, '-A', 'trust', '-D', `${PG_PATH}/data`]);
  console.log('** initDatabase end');
}

function startDatabase () {
  console.log('** startDatabase start');
  spawn(`${PG_PATH}/bin/pg_ctl`, ['start', '-D', `${PG_PATH}/data`]);
  console.log('** startDatabase end');
}

function createDatabase () {
  console.log('** createDatabase start');
  spawnSync(`${PG_PATH}/bin/createdb`, ['-h', PG_HOST, '-p', PG_PORT, '-U', PG_USER, PG_DATABASE]);
  console.log('** createDatabase end');
}

function execSQL(statement) {
  spawnSync(`${PG_PATH}/bin/psql`,
            ['-h', PG_HOST, '-p', PG_PORT, '-U', PG_USER, '-d', PG_DATABASE, '-c', statement]);
}

function setupDatabase () {
  console.log('** setupDatabase start');
  execSQL(`GRANT ALL PRIVILEGES ON DATABASE ${PG_DATABASE} TO ${PG_USER};`);
  console.log('** setupDatabase end');
}

function startPostgresWindows () {
  console.log('** Starting Postgres for Windows...');

  PG_PATH = path.resolve(`${MIMIX_APPDATA}/pgsql`);

  if(fs.existsSync(`${PG_PATH}/data`)) {
    startDatabase();
  } else {
    process.env.PGPASSWORD = PG_PASSWORD;
    installPostgres();
    initDatabase();
    startDatabase();
    createDatabase();
    setupDatabase();
  }
}

function startPostgres () {
  switch(process.platform) {
  case 'win32':
    startPostgresWindows();
    break;
  default:
    console.log(`The platform ${process.platform} is unsupported. Aborting.`);
    process.exit(1);
  }
}

function startMiki () {
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
  let postgresStat;
  let mikiStat;

  startPostgres();
  startMiki();

  outer:
  while (true) {
    portscanner.checkPortStatus(PG_PORT, PG_HOST, (error, status) => {
      postgresStat = status;
    });

    portscanner.checkPortStatus(PORT, HOST, (error, status) => {
      mikiStat = status;
    });

    if (postgresStat == 'open' && mikiStat == 'open') {
      sleep(5*1000);
      break outer;
    } else {
      console.log(`postgresStat: ${postgresStat}`);
      console.log(`mikiStat: ${mikiStat}`);
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
