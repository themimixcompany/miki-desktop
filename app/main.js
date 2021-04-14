const VERSION = '2.10.0';

const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs-extra');
const { checkPortStatus } = require('portscanner');
const sleep = require('system-sleep');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT || 50000; //see port dictionary

var PG_PATH;
const PG_HOST = 'localhost';
const PG_PORT = 60750; //see port dictionary
const PG_USER = 'doadmin';
const PG_PASSWORD = '0123456789';
const PG_DATABASE = 'defaultdb';

var MIKI_PATH;
const MIMIX_APPDATA = path.resolve(process.env.APPDATA, 'Mimix');

var CORE_PATH;

let splashWindow;
let mainWindow;

function checkPostgresPort () {
  console.log('** checkPostgresPort');

  let postgresStat;

  postgresOut:
  while (true) {
    checkPortStatus(PG_PORT, PG_HOST, (error, status) => {
      postgresStat = status;
    });

    console.log(`** postgresStat: ${postgresStat}`);

    if (postgresStat == 'open') {
      break postgresOut;
    } else {
      sleep(1000);
    }
  }
}

function checkMikiPort () {
  console.log('** checkMikiPort');

  let mikiStat;

  mikiOut:
  while (true) {
    checkPortStatus(PORT, HOST, (error, status) => {
      mikiStat = status;
    });

    console.log(`** mikiStat: ${mikiStat}`);

    if (mikiStat == 'open') {
      break mikiOut;
    } else {
      sleep(1000);
    }
  }
}

function setupPostgres () {
  console.log('** setupPostgres');

  spawnSync(`${PG_PATH}/bin/initdb`,
            ['-U', PG_USER, '-A', 'trust', '-D', `${PG_PATH}/data`]);
}

function startPostgres () {
  console.log('** startPostgres');
  console.log()

  spawn(`${PG_PATH}/bin/pg_ctl`,
        ['start', '-o',`"-p ${PG_PORT}"`,'-D', `${PG_PATH}/data`]);
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

function setupPrivileges () {
  console.log('** setupPrivileges');

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
    startPostgres();
  } else {
    process.env.PGPASSWORD = PG_PASSWORD;
    setupPostgres();
    startPostgres();
    checkPostgresPort();
    createDatabase();
    setupPrivileges();
    installCore();
    setupAccount();
  }
}

function setupPostgresPlatform () {
  console.log('** setupPostgresPlatform');

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

function createSplashWindow () {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 400,
    frame: false,
    center: true,
    transparent: true,
    resizable: false,
    webPreferences: {
      contextIsolation: true
    }
  });

  splashWindow.loadURL(`file://${__dirname}/splash/index.html`);
}

function createMainWindow () {
  mainWindow = new BrowserWindow({
    titleBarStyle: 'hidden',
    width: 1024,
    height: 768,
    center: true,
    show: false,
    webPreferences: {
      contextIsolation: true
    }
  });

  mainWindow.setMenuBarVisibility(false);

  mainWindow.loadURL(`http://${HOST}:${PORT}`);
  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.on('ready-to-show', () => {
    splashWindow.destroy();
    mainWindow.maximize();
    mainWindow.show();
  });
}

function main () {

  //attempt to get a lock for this process
  const lockRequested = app.requestSingleInstanceLock();

  console.log("lockRequested: ",lockRequested);

  //are we the process that has the lock? if not, quit
  if (!lockRequested) {
    app.exit();
  }

  //we have the lock!

  //setup for electron ready
  app.on('ready', () => {
    createSplashWindow();
    checkPostgresPort();
    checkMikiPort();
    createMainWindow();
  });

  //if someone started another instance, focus us (the original)
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  });

  //detect platform & start SQL server
  setupPostgresPlatform();

  //start Miki
  startMiki();

  // macos
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
  app.on('activate', () => {
    if (mainWindow === null) createMainWindow();
  });
}

main();
