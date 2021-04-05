const VERSION = '2.7.0';

const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs-extra');
const { checkPortStatus } = require('portscanner');
const sleep = require('system-sleep');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT || 80;

var PG_ROOT;
const PG_HOST = 'localhost';
const PG_PORT = 5432;
const PG_USER = 'doadmin';
const PG_PASSWORD = '0123456789';
const PG_DATABASE = 'defaultdb';

var MIKI_ROOT;
const MIMIX_APPDATA = path.resolve(process.env.APPDATA, 'Mimix');

let mainWindow;
let postgresStat;
let mikiStat;

function initDatabase () {
  console.log('** initDatabase');

  spawnSync(`${PG_ROOT}/bin/initdb`,
            ['-U', PG_USER, '-A', 'trust', '-D', `${PG_ROOT}/data`]);
}

function startDatabase () {
  console.log('** startDatabase');

  spawn(`${PG_ROOT}/bin/pg_ctl`,
        ['start', '-D', `${PG_ROOT}/data`]);

  sleep(5*1000);
}

function createDatabase () {
  console.log('** createDatabase');

  spawnSync(`${PG_ROOT}/bin/createdb`,
            ['-h', PG_HOST, '-p', PG_PORT, '-U', PG_USER, PG_DATABASE]);
}

function execSQL(statement) {
  spawnSync(`${PG_ROOT}/bin/psql`,
            ['-h', PG_HOST, '-p', PG_PORT, '-U', PG_USER, '-d', PG_DATABASE, '-c', statement]);
}

function setupDatabase () {
  console.log('** setupDatabase');

  execSQL(`GRANT ALL PRIVILEGES ON DATABASE ${PG_DATABASE} TO ${PG_USER};`);
}

function installCore () {
  console.log('** installCore');

  const corePath = path.resolve(`${MIMIX_APPDATA}/pgdumps/miki-core.postgres`);

  spawnSync(`${PG_ROOT}/bin/pg_restore`,
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

  const configPath = path.resolve(`${MIKI_ROOT}/config.yml`);
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
  if(fs.existsSync(`${PG_ROOT}/data`)) {
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
  console.log('** Starting PostgreSQL...');

  switch(process.platform) {
  case 'win32':
    PG_ROOT = path.resolve(`${MIMIX_APPDATA}/pgsql`);
    MIKI_ROOT = path.resolve(`${MIMIX_APPDATA}/miki`);

    handleStartPostgres();
    break;
  case 'darwin':
    return true;
    break;
  default:
    console.log(`The platform ${process.platform} is unsupported. Aborting.`);
    process.exit(1);
  }
}

function startMiki () {
  console.log('** Starting Miki...');

  process.chdir(MIKI_ROOT);
  require(`${MIKI_ROOT}/server/index.js`);
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
  startPostgres();
  startMiki();

  outer:
  while (true) {
    checkPortStatus(PG_PORT, PG_HOST, (error, status) => {
      postgresStat = status;
    });

    checkPortStatus(PORT, HOST, (error, status) => {
      mikiStat = status;
    });

    if (postgresStat == 'open' && mikiStat == 'open') {
      sleep(5*1000);
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
