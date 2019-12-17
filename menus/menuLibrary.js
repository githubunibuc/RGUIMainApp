const { dialog } = require('electron');
const upath = require("upath");
const loadFile = require('../components/importFromFile/importFromFile');
const settings = require('../components/settings/settings');
const dialogBuilder = require('../components/dialogBuilder/dialogBuilder');

// TODO -- add translation to all string messages for all function

const menuLibrary = {

    theApp: {},
    theWindow: {},
    i18next: {},
    theSettings: {},

    initialize: function(theApp, i18next, mainWindow, theSettings)
    {
        this.theApp = theApp;
        this.theWindow = mainWindow;
        this.i18next = i18next;
        this.theSettings = theSettings;
    },

    // import data from file
    mainAppImportFromFile: function(name)
    {
        return {
            label : menuLibrary.i18next.t(name),
            accelerator: "CommandOrControl+L",
            click(){
                loadFile.createLoadFileWindow(menuLibrary.i18next, menuLibrary.theWindow, menuLibrary.theSettings);
            }
        };
    },
    
    // change R working directory
    mainAppChangeWD: function(name)
    {
        return {
            label : menuLibrary.i18next.t(name),
            click(){
                
                dialog.showOpenDialog(menuLibrary.theWindow, {title: menuLibrary.i18next.t('Select directory'), defaultPath: menuLibrary.theSettings.workingDirectory, properties: ['openDirectory']}, function getSelectedDirectoy(result){                 
                    if (result[0]) { 
                        menuLibrary.theWindow.webContents.send('runCommand', 'setwd("' +upath.normalize(result[0]) +'")');
                        // menuLibrary.theWindow.webContents.send('runCommandInvisible', 'RGUI_call()');
                    }
                });
            }
        };
    },

    // open the settings dialog
    mainAppSettings: function(name)
    {
        return {
            label : menuLibrary.i18next.t(name),
            click(){
                settings.createSettingsWindow(menuLibrary.i18next, menuLibrary.theWindow, menuLibrary.theSettings);
            }
        };
    },
    
    // quit the application
    mainAppExist: function(name) 
    {
        return {
            label : menuLibrary.i18next.t(name),
            accelerator: "CommandOrControl+Q",
            click(){
                menuLibrary.theApp.quit();
            }
        };
    },

    // create a dialog
    menuForDialog: function(dialogID, dialogName)
    {
        return {
            label : menuLibrary.i18next.t(dialogName),
            click(){
                // retrive the last state
                let lastState = menuLibrary.theSettings.dialogs[dialogID] ? menuLibrary.theSettings.dialogs[dialogID] : null;
                dialogBuilder.build(
                    dialogID, 
                    menuLibrary.theWindow, 
                    menuLibrary.i18next,
                    menuLibrary.theSettings.missingPackages,
                    lastState
                );  
            }
        };
    },
    
    // System -------------------------------------------------
    mainAppUndo: function(name)
    {
        return { label: menuLibrary.i18next.t(name), accelerator: "CmdOrCtrl+Z", role: "undo" };
    },
    mainAppRedo: function(name)
    {
        return { label: menuLibrary.i18next.t(name), accelerator: "Shift+CmdOrCtrl+Z", role: "redo" };
    },
    mainAppCut: function(name)
    {
        return { label: menuLibrary.i18next.t(name), accelerator: "CmdOrCtrl+X", role: "cut" };
    },
    mainAppCopy: function(name)
    {
        return { label: menuLibrary.i18next.t(name), accelerator: "CmdOrCtrl+C", role: "copy" };
    },
    mainAppPaste: function(name)
    {
        return { label: menuLibrary.i18next.t(name), accelerator: "CmdOrCtrl+V", role: "paste" };
    },
    mainAppSelectAll: function(name)
    {
        return { label: menuLibrary.i18next.t(name), accelerator: "CmdOrCtrl+A", role: "selectAll" };
    },
    mainAppZoomIn: function(name)
    {
        return { label: menuLibrary.i18next.t(name), accelerator: "CmdOrCtrl+=", role: "zoomIn" };
    },
    mainAppZoomOut: function(name)
    {
        return { label: menuLibrary.i18next.t(name), accelerator: "CmdOrCtrl+-", role: "zoomOut" };
    },
    mainAppZoomReset: function(name)
    {
        return { label: menuLibrary.i18next.t(name), accelerator: "CmdOrCtrl+0", role: "resetZoom" };
    },
    separator: function(name)
    {
        return { type: 'separator' };
    },
};

module.exports = menuLibrary;