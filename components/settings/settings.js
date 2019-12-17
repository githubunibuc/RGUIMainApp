const { dialog, BrowserWindow } = require('electron');
const { ipcMain } = require('electron');

const fs = require('fs');
const path = require('path');

let settingsWindow;

// TODO -- add translation
const settings = {
    // used later fot saving
    data: {},
    i18next: {},
    windowWidth: 540,
    windowHeight: 320,
    appPath: '',

    createSettingsWindow: function(i18next, theWindow, theSettings) 
    {
        this.appPath = theSettings.appPath;      
        fs.readFile(this.appPath + '/settings.json', function rs(err, data){
            if (err) {
                dialog.showMessageBox(theWindow, {type: "error", message: i18next.t("An error occured we can not open the settings window!"), title: theLanguage.t("Error"), buttons: ["OK"]});
            }
            else {
                // let settingsData;
                try {
                    settings.data = JSON.parse(data);
                    settings.i18next = i18next;
                } catch (error) {
                    dialog.showMessageBox(theWindow, {type: "error", message: i18next.t("An error occured we can not open the settings window!"), title: theLanguage.t("Error"), buttons: ["OK"]});
                    return;
                }
               
                if (settingsWindow !== void 0 && settingsWindow !== null) {
                    settingsWindow.focus();
                } else {
                    // Create the browser window.
                    settingsWindow = new BrowserWindow({
                        width: settings.windowWidth,
                        height: settings.windowHeight,
                        title: i18next.t('Settings'),
                        parent: theWindow,
                        webPreferences: {
                            nodeIntegration: true
                        },
                        resizable: false,
                        show: false,
                    });
                    
                    // Open the DevTools.
                    if (process.env.NODE_ENV == 'development') {
                        settingsWindow.webContents.openDevTools();
                    }
                    
                    // and load the settings.html of the app.
                    settingsWindow.loadFile('./components/settings/settings.html');

                        // Emitted when the window is closed.
                    settingsWindow.on('closed', () => {
                        settingsWindow = null;
                    });
                    
                
                    // when data is ready show window
                    settingsWindow.once("show", () => {
                        settingsWindow.webContents.send('settingsLoaded', {
                            wWidth : settings.windowWidth - 10,
                            wHeight : settings.windowHeight - 30,
                            systemS: theSettings,
                            data : settings.data
                        });
                    });
                    // when window is ready send data
                    settingsWindow.once("ready-to-show", () => {
                        settingsWindow.show();
                    });

                    settingsWindow.setMenu(null);
                }
            }
        });  
    },

    saveSettings: function(data)
    {        
        for(let key in data) {
            if ( settings.data[key] ) {
                settings.data[key] = data[key];
            }
        }

        fs.open(this.appPath + '/settings.json', 'w', (err, fd) => {
            if (err) { 
                dialog.showMessageBox(theWindow, {type: "error", message: theLanguage.t("An error occured while trying to save the settings!"), title: theLanguage.t("Error"), buttons: ["OK"]});
            } else {
                fs.writeFile(fd, JSON.stringify(settings.data), 'utf8', (err) => {
                    if (err) { 
                        dialog.showMessageBox(theWindow, {type: "error", message: theLanguage.t("An error occured while trying to save the settings!"), title: theLanguage.t("Error"), buttons: ["OK"]});
                    } else {
                        settingsWindow.webContents.send('settingsSaved');
                    }
                });
            }
        });
    },
};

ipcMain.on('saveSettings', (event, args) => {    
    settings.saveSettings(args);
});


module.exports = settings;