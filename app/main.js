const VERSION = '2.6.1';

const { app, BrowserWindow } = require('electron');
const path = require('path');
const { execSync, spawn, spawnSync } = require('child_process');
const fs = require('fs-extra');
const portscanner = require('portscanner');
const sleep = require('system-sleep');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT || 80;

var PG_PATH;
const PG_HOST = 'localhost';
const PG_PORT = 5432;
const PG_USER = 'doadmin';
const PG_PASSWORD = '0123456789';
const PG_DATABASE = 'defaultdb';

const MIKI_ROOT = path.resolve(__dirname, 'miki');
const MIMIX_APPDATA = path.resolve(process.env.APPDATA, 'Mimix');

let splashWindow;
let mainWindow;

function installPostgres () {
  console.log('** installPostgres');

  const sourcePath = path.resolve(__dirname, 'pgsql/windows');
  const destPath = PG_PATH;

  if(fs.existsSync(destPath)) {
    return true;
  } else {
    fs.mkdirSync(MIMIX_APPDATA);

    try {
      fs.copySync(sourcePath, destPath);
    } catch (err) {
      console.error(err);
    }
  }
}

function initDatabase () {
  console.log('** initDatabase');

  spawnSync(`${PG_PATH}/bin/initdb`,
            ['-U', PG_USER, '-A', 'trust', '-D', `${PG_PATH}/data`]);
}

function startDatabase () {
  console.log('** startDatabase');

  spawn(`${PG_PATH}/bin/pg_ctl`,
        ['start', '-D', `${PG_PATH}/data`]);

  sleep(5*1000);
}

function createDatabase () {
  console.log('** createDatabase');

  spawnSync(`${PG_PATH}/bin/createdb`,
            ['-h', PG_HOST, '-p', PG_PORT, '-U', PG_USER, PG_DATABASE]);
}

function execSQL(statement) {
  spawnSync(`${PG_PATH}/bin/psql`,
            ['-h', PG_HOST, '-p', PG_PORT, '-U', PG_USER, '-d', PG_DATABASE, '-c', statement]);
}

function setupDatabase () {
  console.log('** setupDatabase');

  execSQL(`GRANT ALL PRIVILEGES ON DATABASE ${PG_DATABASE} TO ${PG_USER};`);
}

function installCore () {
  console.log('** installCore');

  const corePath = path.resolve(__dirname, 'pgsql/dumps/miki-core.postgres');
  spawnSync(`${PG_PATH}/bin/pg_restore`,
            ['-c', '-h', PG_HOST, '-p', PG_PORT, '-U', PG_USER, '-d', PG_DATABASE, corePath]);
}

function getValueByKey(text, key) {
  const regex = new RegExp("^" + key + ": (.*)$", "m");
  const match = regex.exec(text);

  if (match) {
    return match[1];
  }
  else {
    return null;
  }
}

function setupAccount () {
  console.log('** setupAccount');

  const configPath = path.resolve(__dirname + '/miki/config.yml');
  let email;
  let password;

  fs.readFile(configPath, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
    }

    email = getValueByKey(data, 'email');
    password = getValueByKey(data, 'password');

    execSQL(`UPDATE users SET email = '${email}' WHERE id = '1';`);
    execSQL(`UPDATE users SET password = '${password}' WHERE id = '1';`);
    execSQL(`UPDATE users SET "mustChangePwd" = 't' WHERE id = '1';`);
  });
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
    installCore();
    setupAccount();
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
  process.chdir(MIKI_ROOT);
  require(__dirname + '/miki/server/index.js');
}

function createMainWindow () {
  mainWindow = new BrowserWindow({
    titleBarStyle: 'hidden',
    width: 1024,
    height: 768,
    center: true,
    show: false
  });

  mainWindow.setMenuBarVisibility(false);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createSplashWindow () {
  splashWindow = new BrowserWindow({
    width: 300,
    height: 300,
    frame: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: true
  });

  splashWindow.setMenuBarVisibility(false);
}

function startServers () {
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
      console.log(`** postgresStat: ${postgresStat}`);
      console.log(`** mikiStat: ${mikiStat}`);
      sleep(1*1000);
    }
  }
}

function startApp () {
  createSplashWindow();
  splashWindow.loadURL(`file://${__dirname}/splash/index.html`);

  startServers();

  createMainWindow();
  mainWindow.loadURL(`http://${HOST}:${PORT}`);

  mainWindow.on('ready-to-show', () => {
    splashWindow.destroy();
    mainWindow.maximize();
    mainWindow.show();
  });
}

function main () {
  app.on('ready', startApp);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', () => {
    if (mainWindow === null) createMainWindow();
  });
}

main();
