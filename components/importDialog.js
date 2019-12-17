const fs = require('fs');
const path = require('path');
const { dialog } = require('electron');
const logging = require('../libraries/logging');
const os = require('os');

const importDialog = {
    
    appPath: '',

    //save the dialog
    save: function(data, mWindow, theSettings)
    {
        let dialogData;
        this.appPath = theSettings.appPath;
        try {
            dialogData = JSON.parse(data);
        } catch (err) {
            dialog.showMessageBox(mWindow, {type: "error", message: "Could not open the file!", title: "Error", buttons: ["OK"]});
        }
        if (dialogData !== void 0 && dialogData.properties.name !== void 0) {
            let dialogName = dialogData.properties.name.toLowerCase().replace(' ', '-');
            let dialogPath = this.appPath + '/dialogs/' + dialogName + '.json';

            let dialogExists = false;

            // check if the file exist sync    
            try {
                fs.accessSync(dialogPath, fs.constants.R_OK | fs.constants.W_OK);
                dialogExists = true;
            } catch (err) {
                dialogExists = false;
            }

            if (dialogExists) {
                // If a dialog with the same name exist, ask to override it
                let question = dialog.showMessageBoxSync(mWindow, {type: "question", message: "A dialog with the same name already exists! Would you like to override it?", title: "Already exists", buttons: ["No", "Yes"]});
                if (question === 1) {
                    fs.open(dialogPath, 'w', (err, fd) => {
                        if (err) {
                            dialog.showMessageBox(mWindow, {type: "error", message: "Could not import dialog! Error open!", title: "Error", buttons: ["OK"]});
                        } else {
                            fs.writeFile(fd, data, (err) => {
                                if (err) {
                                    dialog.showMessageBox(mWindow, {type: "error", message: "Could not import file! Error write!", title: "Error", buttons: ["OK"]});
                                } else {
                                     // check that we have the property
                                    if (dialogData.properties.dependencies !== void 0) {
                                        importDialog.updateMainDependencies(dialogData.properties.dependencies, theSettings.dependencies);
                                    }
                                    dialog.showMessageBox(mWindow, {type: "info", message: "Dialog imported successfully!", title: "Success", buttons: ["OK"]});
                                }
                            });
                        }
                    });
                }
            } else {
                // import dialog
                fs.open(dialogPath, 'wx', (err, fd) => {
                    if (err) {
                        dialog.showMessageBox(mWindow, {type: "error", message: "Could not import dialog! Error open non exist!", title: "Error", buttons: ["OK"]});
                    } else {
                        fs.writeFile(fd, data, (err) => {
                            if (err) {
                                dialog.showMessageBox(mWindow, {type: "error", message: "Could not import file! Error write non exist!", title: "Error", buttons: ["OK"]});
                            } else {
                                 // check that we have the property
                                 if (dialogData.properties.dependencies !== void 0) {
                                    importDialog.updateMainDependencies(dialogData.properties.dependencies, theSettings.dependencies);
                                }
                                dialog.showMessageBox(mWindow, {type: "info", message: "Dialog imported successfully!", title: "Success", buttons: ["OK"]});
                            }
                        });
                    }
                });
            }
        }
    },
    // update new dependencies
    updateMainDependencies: function(dependencies)
    {        
        let settingsPath = this.appPath + '/settings.json';

        fs.open(settingsPath, "r+", function(err, fd) {
            if (err) {
                logging.error('Opening setting when importing dialog: ' + err);
            } else {
                fs.readFile(fd, function rs(err, data){
                    if (err) {
                        logging.error('Reading from setting when importing dialog: ' + err);
                    }
                    else {
                        try {
                            let settingsData = JSON.parse(data);

                            let depArray = dependencies.split(';');
                            let newDependencies = [];
                            
                            // remove last element after the (;) which should be ''
                            if (depArray[depArray.length-1] === '') {
                                depArray.pop();
                            }
                            // do we have dependencies?
                            if (Array.isArray(settingsData.dependencies)) {

                                for (let i = 0; i < depArray.length; i++) {
                                    if (!settingsData.dependencies.includes(depArray[i])) {
                                        newDependencies.push(depArray[i]);
                                    }
                                }

                                newDependencies = settingsData.dependencies.concat(newDependencies);
                            } else {
                                newDependencies = depArray;
                            }

                            // update dependencies
                            settingsData.dependencies = newDependencies;

                            // write settings back
                            fs.writeFile(settingsPath, JSON.stringify(settingsData), {encoding: 'utf8', flag: 'w+'}, (err) => {
                                if (err) { 
                                    logging.error('Writing back to setting when importing dialog: ' + err);
                                } else {
                                    return true;
                                }
                            });                   
                        } catch (error) {
                            logging.error('Parsing from setting when importing dialog: ' + err);
                            return;
                        }
                    }
                });
            }   
        });
    }
};

module.exports = importDialog;