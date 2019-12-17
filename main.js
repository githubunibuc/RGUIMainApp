const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const os = require('os');
const fs = require('fs');
const path = require('path');
const fixPath = require('fix-path');
fixPath();

// language
const menuFactroy = require('./menus/menuFactory');
const i18next = require("i18next");
const Backend = require("i18next-node-fs-backend");
const i18nextOptions = require("./i18nextOptions");
const logging = require('./libraries/logging');
const upath = require("upath");

// Setting ENVIROMENT
process.env.NODE_ENV = 'development';
// process.env.NODE_ENV = 'production';

let appPathTmp = app.getAppPath();
if(process.env.NODE_ENV === 'production') {
  let p = upath.parse(appPathTmp);
  appPathTmp = p.dir;
}

// the settings object - to be passed around - add here other properties
let theSettings = {
  language: 'en',
  languageNS: 'en_US',
  workingDirectory: os.homedir(),
  dependencies: '',
  appPath: appPathTmp,
  dialogs: {},
  currentCommand: '',
  missingPackages: ''
};

//console.log(theSettings.appPath);

// loading language from settings
let settingsPath = theSettings.appPath + '/settings.json';

let settingsFileData  = fs.readFileSync(settingsPath, 'utf8');
try{
  settingsFileData = JSON.parse(settingsFileData);
  theSettings.dependencies = settingsFileData.dependencies;
}
catch (error){
  logging.error('Reading settings - ' + error);
}
// set the language and load
if ( settingsFileData.defaultLanguage !== void 0) {
    // get only the en of the eu_US part
    let lang = settingsFileData.defaultLanguage.split('_');
    // update date from the settings file
    theSettings.language = lang[0];
    theSettings.languageNS = settingsFileData.defaultLanguage;
}

i18nextOptions.setLanguage(theSettings.language, theSettings.languageNS);
i18next.use(Backend).init(i18nextOptions.getOptions(process.env.NODE_ENV, true, theSettings.appPath));
//---------------------------------------

let mainWindow;

function createMainWindow () {
    // Create the browser window.
    mainWindow = new BrowserWindow({
      title: 'R-GUI-MainApp',
      width: 800,
      minWidth: 800,
      height: 600,
      minHeight: 600,
      center: true,
      webPreferences: {
        nodeIntegration: true
      },
      show: false
    });

    // and load the index.html of the app.
    mainWindow.loadFile('./components/main/main.html');

    // Open the DevTools.
    if (process.env.NODE_ENV == 'development') {
      mainWindow.webContents.openDevTools();
    }
    
    // Emitted when the window is closed.
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Insert menu after language has loaded
    i18next.on('languageChanged', () => {
        Menu.setApplicationMenu(menuFactroy(app, mainWindow, i18next, theSettings));        
    });

    // when window is ready send data
    mainWindow.once("ready-to-show", ()=>{
        mainWindow.show();
    });
    // when data is ready show window
    mainWindow.once("show", () => {
        let appPath = path.resolve('./'); 
        mainWindow.webContents.send('initializeApp', {dependencies: theSettings.dependencies, appPath: upath.normalize(theSettings.appPath)});
    });
}

app.on('ready', createMainWindow);
// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createMainWindow();
  }
});

// check for missing packages
ipcMain.on('missingPackages', (event, args) => {   
  // console.log('missing packages');
   // save the missing packages
  theSettings.missingPackages = args;
}); 

// save dialogs state
ipcMain.on('dialogCurrentStateUpdate', (event, args) => {
  // save dialog state to settings
  if (theSettings.dialogs[args.name]) {
    theSettings.dialogs[args.name] = args.changes;
  } else {
    theSettings.dialogs[args.name] = {};
    theSettings.dialogs[args.name] = args.changes;
  }
});


// event on dialog created - send data
ipcMain.on('dialogCreated', (event, args) => {
  mainWindow.webContents.send('dialogCreated', args);
});
// show the current dialog command
ipcMain.on('dialogCommandUpdate', (event, args) => {
  mainWindow.webContents.send('commandSyntax', args);
});
// run a dialog's command
ipcMain.on('runCommand', (event, args) => {
  mainWindow.webContents.send('runCommand', args);
});
// import data from file - send command to receive data for preview
ipcMain.on('sendComandForPreviewData', (event, args) => {
  mainWindow.webContents.send('sendComandForPreviewData', args);
});
ipcMain.on('quitApplication', (ev, args) => {
  app.quit();
})

