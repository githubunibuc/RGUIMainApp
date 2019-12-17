
const { dialog, BrowserWindow } = require('electron');
const { ipcMain } = require('electron');

const fs = require('fs');
const path = require('path');

let loadFileWindow;

const loadFile = {

    i18next: {},
    windowWidth: 800,
    windowHeight: 600,

    createLoadFileWindow: function(i18next, theWindow, theSettings)
    {
        this.i18next = i18next;
        
        if (loadFileWindow !== void 0 && loadFileWindow !== null) {
            loadFileWindow.focus();
        } else {
            // Create the browser window.
            loadFileWindow = new BrowserWindow({
                width: this.windowWidth,
                height: this.windowHeight,
                title: i18next.t('Import data from file'),
                parent: theWindow,
                webPreferences: {
                    nodeIntegration: true
                },
                resizable: false,
                show: false,
            });
            
            // Open the DevTools.
            if (process.env.NODE_ENV == 'development') {
                loadFileWindow.webContents.openDevTools();
            }
            
            // and load the settings.html of the app.
            loadFileWindow.loadFile('./components/importFromFile/importFromFile.html');

                // Emitted when the window is closed.
            loadFileWindow.on('closed', () => {
                loadFileWindow = null;
            });
            
        
            // when data is ready show window
            loadFileWindow.once("show", () => {
                loadFileWindow.webContents.send('dataLoaded', {
                    wWidth : loadFile.windowWidth - 10,
                    wHeight : loadFile.windowHeight - 30,
                    systemS: theSettings
                });
            });
            // when window is ready send data
            loadFileWindow.once("ready-to-show", () => {
                loadFileWindow.show();
            });

            loadFileWindow.setMenu(null);
        }
    }
};


ipcMain.on('importDataForPreview', (event, args) => {
    if(loadFileWindow !== void 0 && !loadFileWindow.isDestroyed()) {
        loadFileWindow.webContents.send('importDataForPreview', args);
    }
});

module.exports = loadFile;