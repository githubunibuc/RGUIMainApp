const { dialog, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

// the list of windows / dialogs
let windowsList = {};

const dialogBuilder = {
    // get data from menu builder and try to create the window
    build: function(dialogID, parentWindow, i18next, missingPackages, lastState)
    {
        fs.readFile(path.resolve('./dialogs/' + dialogID + '.json'), 'UTF8', (err, data) => {
            if ( err ) {
                dialog.showMessageBox(parentWindow, {type: "info", message: i18next.t("No functionality for this item!"), title: i18next.t("Error"), buttons: ["OK"]});
            } 
            else {    
                let dialogData;
                try {
                    dialogData = JSON.parse(data);
                }
                catch (error) {
                    // show message and return
                    dialog.showMessageBox(parentWindow, {type: "error", message: i18next.t("Dialog data error!"), title: i18next.t("Error"), buttons: ["OK"]});
                    return;
                }
                // we have the dialog data try to make the window
                if (dialogData !== void 0) {
                    let missing = [];
                    if (dialogData.properties.dependencies !== void 0) {
                        missing = this.checkForPackages(dialogData.properties.dependencies, missingPackages);
                    }
                    
                    if (missing.length === 0) {
                        this.makeTheWindow(
                            dialogData.properties.title,
                            dialogData.properties.width,
                            dialogData.properties.height,
                            parentWindow,
                            dialogData, 
                            lastState,
                            dialogID
                        );
                    } else {
                        dialog.showMessageBox(parentWindow, {type: "error", message: i18next.t( "Required package(s) not installed " + missing), title: i18next.t("Error"), buttons: ["OK"]});
                        return;
                    }
                } 
            }
        });
    },

    // make the if not already build
    // alldata - for objects
    // lastState - if was already opened
    // dialogID - the file name - used for saving the state
    makeTheWindow: function(name, windowWidth, windowHeight, parentWindow, allData, lastState, dialogID)
    {      

        if (windowsList[name] !== void 0 && windowsList[name] !== null && !windowsList[name].isDestroyed()) {           
            windowsList[name].focus();
        } else {
            let theWindow;
            theWindow = new BrowserWindow({
                width: parseInt(windowWidth) + 40,
                height: parseInt(windowHeight) + 50,
                title: name,
                resizable: false,
                parent: parentWindow,
                webPreferences: {
                    nodeIntegration: true
                },
                show: false,
            });

            // Open the DevTools.
            if (process.env.NODE_ENV == 'development') {
                theWindow.webContents.openDevTools();
            }
                    
            // and load the settings.html of the app.
            theWindow.loadFile('./components/dialogBuilder/dialogBuilder.html');

                // Emitted when the window is closed.
            theWindow.on('closed', () => {
                theWindow = null;
            });
            
            // when data is ready show window
            theWindow.once("show", () => {
                theWindow.webContents.send('dialogCreated', {'dialogID': dialogID, 'data': allData, 'lastState': lastState});
            });
            // when window is ready send data
            theWindow.once("ready-to-show", () => {
                theWindow.show();
            });

            theWindow.setMenu(null);
            
            windowsList[dialogID] = theWindow;
        }
    },

    // check for required packages
    checkForPackages: function(dependencies, missing)
    {   
        let packages = dependencies.split(';');
        let resp = '';
        let first = true;
        
        // nothing missing
        if (missing.length === 0) { return resp; }
        
        
        for (let i = 0; i < packages.length; i++) {
            if (missing.includes(packages[i])) {       
                resp += (first?'':', ') + packages[i];
                first = false;
            }
        } 
        return resp;
    }
};

// populate window with existing data
ipcMain.on('dialogIncomingData', (event, args) =>
{
    // console.log('receiving data dialogBuilder');
    // console.log(args.data.dataframe);
    
    if (args.name !== null && windowsList[args.name]) {
        windowsList[args.name].webContents.send('dialogIncomingData', args.data);
    } else {        
        for (let window in windowsList) {            
            if (!windowsList[window].isDestroyed()){
                windowsList[window].webContents.send('dialogIncomingData', args.data);
            }
        }
    }
});

// announce all windows that we have data
ipcMain.on('dialogDataUpdate', (event, args) => 
{
    for (let win in windowsList) {
        if(!windowsList[win].isDestroyed()) {
            windowsList[win].webContents.send('dataUpdateFromR', args);
        }
    }
});

module.exports = dialogBuilder;