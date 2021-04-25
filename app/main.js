const VERSION = '2.11.2';

const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs-extra');
const os = require('os');
const sleep = require('system-sleep');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT || 48000; //see port dictionary

var PG_PATH;
var PG_DATA_PATH;

const PG_HOST = 'localhost';
const PG_PORT = 60750; //see port dictionary
const PG_USER = 'doadmin';
const PG_PASSWORD = '0123456789';
const PG_DATABASE = 'defaultdb';

var MIMIX_DIRECTORY;
var MIKI_PATH;
var CORE_PATH;

const MIKI_LOCK = path.resolve(os.tmpdir(), 'miki.lock');

let splashWindow;
let mainWindow;

function hardSleep (milliseconds) {
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

  if(cmd.error) { console.log(`error: ${cmd.error}`); }
  if(cmd.stdout) { console.log(`stdout: ${cmd.stdout}`); }
  if(cmd.stderr) { console.log(`stderr: ${cmd.stderr}`); }
  if(cmd.status) { console.log(`exit code: ${cmd.status}`); }
}

function checkPostgresOnce () {
  const cmd = spawnSync(`${PG_PATH}/bin/pg_ctl`,
                        ['status', '-o', `"-p ${PG_PORT}"`, '-D', PG_DATA_PATH]);

  return cmd.status == 0;
}

function checkPostgresPort () {
  console.log('** checkPostgresPort');

  while(!checkPostgresOnce()) {
    hardSleep(1000);
  }
}

function checkMikiOnce () {
  if(fs.existsSync(MIKI_LOCK)) {
    fs.unlinkSync(MIKI_LOCK);
    return true;
  } else {
    return false;
  }
}

function checkMiki () {
  console.log('** checkMiki');

  while(!checkMikiOnce()) {
    sleep(1000);
  }
}

function createMimixDirectory () {
  console.log('** createMimixDirectory');

  if(!fs.existsSync(MIMIX_DIRECTORY)) {
    fs.mkdirSync(MIMIX_DIRECTORY, { recursive: true });
  }
}

function createPostgresDirectory () {
  console.log('** createPostgresDirectory');

  if(!fs.existsSync(`${MIMIX_DIRECTORY}/pgsql`)) {
    fs.mkdirSync(`${MIMIX_DIRECTORY}/pgsql`, { recursive: true });
  }
}

function initPostgres () {
  console.log('** initPostgres');

  debugSync(spawnSync(`${PG_PATH}/bin/initdb`,
                      ['-U', PG_USER, '-A', 'trust', '-D', PG_DATA_PATH],
                      { encoding: 'utf8'}));
}

function startPostgres () {
  console.log('** startPostgres');

  debug(spawn(`${PG_PATH}/bin/pg_ctl`,
              ['restart', '-o',`"-p ${PG_PORT}"`, '-l', `${MIMIX_DIRECTORY}/pgsql/log`,
               '-D', PG_DATA_PATH]));
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

  if(match) {
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
    if(err) {
      console.error(err);
    }

    email = getValueByKey(data, 'email');
    password = getValueByKey(data, 'password');

    execSQL(`UPDATE users SET email = '${email}' WHERE id = '1';`);
    execSQL(`UPDATE users SET password = '${password}' WHERE id = '1';`);
    execSQL(`UPDATE users SET "mustChangePwd" = 't' WHERE id = '1';`);
  });
}

function setupCommonVars () {
  console.log('** setupCommonVars');

  switch(process.platform) {
  case 'win32':
    MIMIX_DIRECTORY = path.resolve(process.env.APPDATA, 'Mimix');
    break;
  case 'darwin':
    MIMIX_DIRECTORY = path.resolve(os.homedir(), '.mimix');
    break;
  default:
    console.log(`The platform ${process.platform} is unsupported. Aborting.`);
    process.exit(1);
  }
}

function handleStartPostgres () {
  console.log('** handleStartPostgres');

  if(fs.existsSync(`${PG_DATA_PATH}`)) {
    startPostgres();
    checkPostgresPort();
  } else {
    process.env.PGPASSWORD = PG_PASSWORD;
    createMimixDirectory();
    createPostgresDirectory();
    initPostgres();
    startPostgres();
    checkPostgresPort();
    createDatabase();
    setupPrivileges();
    installCore();
    setupAccount();
  }
}

function setupPostgres () {
  console.log('** setupPostgres');

  switch(process.platform) {
  case 'win32':
    PG_PATH = path.resolve(`${MIMIX_DIRECTORY}/pgsql`);
    PG_DATA_PATH = path.resolve(`${PG_PATH}/data`);
    CORE_PATH = path.resolve(`${MIMIX_DIRECTORY}/pgdumps/miki-core.postgres`);
    handleStartPostgres();
    break;
  case 'darwin':
    PG_PATH = path.resolve(__dirname, 'pgsql');
    PG_DATA_PATH = path.resolve(`${MIMIX_DIRECTORY}/pgsql/data`);
    CORE_PATH = path.resolve(__dirname, 'pgdumps/miki-core.postgres');
    handleStartPostgres();
    break;
  default:
    console.log(`The platform ${process.platform} is unsupported. Aborting.`);
    process.exit(1);
  }
}

function setupMiki () {
  console.log('** setupMiki');

  switch(process.platform) {
  case 'win32':
    MIKI_PATH = path.resolve(`${MIMIX_DIRECTORY}/miki`);
    break;
  case 'darwin':
    MIKI_PATH = path.resolve(__dirname, 'miki');
    break;
  default:
    console.log(`The platform ${process.platform} is unsupported. Aborting.`);
    process.exit(1);
  }

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
    hasShadow: false,
    visualEffectState: 'inactive',
    titelBarStyle: 'hidden',
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
  if(!lockRequested) {
    app.exit();
  }

  //we have the lock!

  //setup for electron ready
  app.on('ready', () => {
    createSplashWindow();

    checkMiki();
    createMainWindow();
  });

  //if someone started another instance, focus us (the original)
  app.on('second-instance', (event, cmdline, cwd) => {
    if(mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  });

  // macos
  app.on('window-all-closed', () => {
    if(process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if(mainWindow === null) {
      createMainWindow();
    }
  });

  // setup common variables
  setupCommonVars();

  // setup and start Postgres
  setupPostgres();

  // setup and start Miki
  setupMiki();
}

main();
