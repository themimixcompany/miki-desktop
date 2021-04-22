const VERSION = '2.10.1';

const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs-extra');
const isPortReachable = require('is-port-reachable');
const os = require('os');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT || 48000; //see port dictionary

var PG_PATH;
var PG_DATA_PATH;

const PG_HOST = 'localhost';
const PG_PORT = 60750; //see port dictionary
const PG_USER = 'doadmin';
const PG_PASSWORD = '0123456789';
const PG_DATABASE = 'defaultdb';

var MIKI_PATH;

var MIMIX_APPDATA;
var MIMIX_DIRECTORY;

var CORE_PATH;

let splashWindow;
let mainWindow;

function sleep (milliseconds) {
  const date = Date.now();
  let currentDate = null;

  do {
    currentDate = Date.now();
  } while (currentDate - date < milliseconds);
}

function debug (cmd) {
  console.log('** debug');

  cmd.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });

  cmd.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  cmd.on('close', (code) => {
    console.log(`exit code: ${code}`);
  });
}

function debugSync (cmd) {
  console.log('** debugSync');

  if (cmd.error) { console.log(`error: ${cmd.error}`); }
  if (cmd.stdout) { console.log(`stdout: ${cmd.stdout}`); }
  if (cmd.stderr) { console.log(`stderr: ${cmd.stderr}`); }
  if (cmd.status) { console.log(`exit code: ${cmd.status}`); }
}

function checkPostgresPort () {
  console.log('** checkPostgresPort');

  loopBreak:
  while (true) {
    if ((async () => { return(await isPortReachable(PG_PORT, { host: PG_HOST })); })()) {
      break loopBreak;
    } else {
      sleep(1000);
    }
  }
}

function checkMikiPort () {
  console.log('** checkMikiPort');

  loopBreak:
  while (true) {
    if ((async () => { return(await isPortReachable(PORT, { host: HOST })); })()) {
      break loopBreak;
    } else {
      sleep(1000);
    }
  }
}

function createMimixDirectory () {
  console.log('** createMimixDirectory');

  if (!fs.existsSync(MIMIX_DIRECTORY)) {
    fs.mkdirSync(MIMIX_DIRECTORY, { recursive: true });
  }
}

function createPostgresDirectory () {
  console.log('** createPostgresDirectory');

  if (!fs.existsSync(`${MIMIX_DIRECTORY}/pgsql`)) {
    fs.mkdirSync(`${MIMIX_DIRECTORY}/pgsql`, { recursive: true });
  }
}

function setupPostgres () {
  console.log('** setupPostgres');

  debugSync(spawnSync(`${PG_PATH}/bin/initdb`,
                      ['-U', PG_USER, '-A', 'trust', '-D', PG_DATA_PATH],
                      { encoding: 'utf8'}));
}

function startPostgres () {
  console.log('** startPostgres');

  spawn(`${PG_PATH}/bin/pg_ctl`,
        ['restart', '-o',`"-p ${PG_PORT}"`, '-l', `${MIMIX_DIRECTORY}/pgsql/log`,
         '-D', PG_DATA_PATH]);
}

function createDatabase () {
  console.log('** createDatabase');

  debugSync(spawnSync(`${PG_PATH}/bin/createdb`,
                      ['-h', PG_HOST, '-p', PG_PORT, '-U', PG_USER, PG_DATABASE],
                      { encoding: 'utf8'}));
}

function execSQL(statement) {
  debugSync(spawnSync(`${PG_PATH}/bin/psql`,
                      ['-h', PG_HOST, '-p', PG_PORT, '-U', PG_USER, '-d', PG_DATABASE, '-c', statement],
                      { encoding: 'utf8'}));
}

function setupPrivileges () {
  console.log('** setupPrivileges');

  execSQL(`GRANT ALL PRIVILEGES ON DATABASE ${PG_DATABASE} TO ${PG_USER};`);
}

function installCore () {
  console.log('** installCore');

  debugSync(spawnSync(`${PG_PATH}/bin/pg_restore`,
                      ['-c', '-h', PG_HOST, '-p', PG_PORT, '-U', PG_USER, '-d', PG_DATABASE, CORE_PATH],
                      { encoding: 'utf8'}));
}

function getValueByKey (text, key) {
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

  if(fs.existsSync(`${PG_DATA_PATH}`)) {
    startPostgres();
  } else {
    process.env.PGPASSWORD = PG_PASSWORD;
    createMimixDirectory();
    createPostgresDirectory();
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
    MIMIX_APPDATA = path.resolve(process.env.APPDATA, 'Mimix');
    PG_PATH = path.resolve(`${MIMIX_APPDATA}/pgsql`);
    PG_DATA_PATH = path.resolve(`${PG_PATH}/data`);
    MIKI_PATH = path.resolve(`${MIMIX_APPDATA}/miki`);
    CORE_PATH = path.resolve(`${MIMIX_APPDATA}/pgdumps/miki-core.postgres`);
    handleStartPostgres();
    break;
  case 'darwin':
    MIMIX_DIRECTORY = path.resolve(os.homedir(), '.mimix');
    PG_PATH = path.resolve(__dirname, 'pgsql');
    PG_DATA_PATH = path.resolve(`${MIMIX_DIRECTORY}/pgsql/data`);
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
  app.on('second-instance', (event, cmdline, cwd) => {
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
