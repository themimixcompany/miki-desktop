const VERSION = '2.9.1';

const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs-extra');
const { checkPortStatus } = require('portscanner');
const sleep = require('system-sleep');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT || 80;

var PG_PATH;
const PG_HOST = 'localhost';
const PG_PORT = 5432;
const PG_USER = 'doadmin';
const PG_PASSWORD = '0123456789';
const PG_DATABASE = 'defaultdb';

var MIKI_PATH;
const MIMIX_APPDATA = path.resolve(process.env.APPDATA, 'Mimix');

var CORE_PATH;

let splashWindow;
let mainWindow;
let postgresStat;
let mikiStat;

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

  spawnSync(`${PG_PATH}/bin/pg_restore`,
            ['-c', '-h', PG_HOST, '-p', PG_PORT, '-U', PG_USER, '-d', PG_DATABASE, CORE_PATH]);
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

  const configPath = path.resolve(`${MIKI_PATH}/config.yml`);
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

function handleStartPostgres () {
  console.log('** handleStartPostgres');

  if(fs.existsSync(`${PG_PATH}/data`)) {
    startDatabase();
  } else {
    process.env.PGPASSWORD = PG_PASSWORD;
    initDatabase();
    startDatabase();
    createDatabase();
    setupDatabase();
    installCore();
    setupAccount();
  }
}

function startPostgres () {
  console.log('** startPostgres');

  switch(process.platform) {
  case 'win32':
    PG_PATH = path.resolve(`${MIMIX_APPDATA}/pgsql`);
    MIKI_PATH = path.resolve(`${MIMIX_APPDATA}/miki`);
    CORE_PATH = path.resolve(`${MIMIX_APPDATA}/pgdumps/miki-core.postgres`);
    handleStartPostgres();
    break;
  case 'darwin':
    PG_PATH = path.resolve(__dirname, 'pgsql');
    MIKI_PATH = path.resolve(__dirname, 'miki');
    CORE_PATH = path.resolve(__dirname, 'pgdumps/miki-core.postgres');
    handleStartPostgres();
    break;
  default:
    console.log(`The platform ${process.platform} is unsupported. Aborting.`);
    process.exit(1);
  }
}

function startMiki () {
  console.log('** startMiki');

  process.chdir(MIKI_PATH);
  require(`${MIKI_PATH}/server/index.js`);
}

function checkPostgresPort () {
  console.log('** checkPostgresPort');

  loopBreak1:
  while (true) {
    checkPortStatus(PG_PORT, PG_HOST, (error, status) => {
      postgresStat = status;
    });

    console.log(`** postgresStat: ${postgresStat}`);

    if (postgresStat == 'open') {
      sleep(5*1000);
      break loopBreak1;
    } else {
      sleep(5*1000);
    }
  }
}

function checkMikiPort () {
  console.log('** checkMikiPort');

  loopBreak2:
  while (true) {
    checkPortStatus(PORT, HOST, (error, status) => {
      mikiStat = status;
    });

    console.log(`** mikiStat: ${mikiStat}`);

    if (mikiStat == 'open') {
      sleep(5*1000);
      break loopBreak2;
    } else {
      sleep(5*1000);
    }
  }
}

function createSplashWindow () {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 400,
    frame: false,
    center: true,
    transparent: true
  });

  splashWindow.setResizable(false);

  splashWindow.loadURL(`file://${__dirname}/splash/index.html`);
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

  mainWindow.loadURL(`http://${HOST}:${PORT}`);
  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.on('ready-to-show', () => {
    checkPostgresPort();
    checkMikiPort();
    splashWindow.destroy();
    mainWindow.maximize();
    mainWindow.show();
  });
}

function main () {
  app.on('ready', () => {
    createSplashWindow();
    startPostgres();
    startMiki();
    createMainWindow();
  });

  // macos
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
  app.on('activate', () => {
    if (mainWindow === null) createMainWindow();
  });
}

main();
