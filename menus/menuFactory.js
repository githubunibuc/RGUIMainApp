const { Menu, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');

const importDialog = require('../components/importDialog');
const menuCustomize = require('../components/menuCustomize/menuCustomize');
const menuLibrary = require('./menuLibrary');
const logging = require('../libraries/logging');

const menuBuilder = (app, mainWindow, i18next, theSettings) => {

    let menuTemplate;
    // get the menu.json path
    let menuPath = theSettings.appPath + '/menus/menu.json';
    let menuData = fs.readFileSync(menuPath, "utf8");
    try {
        menuData = JSON.parse(menuData);
    } catch (error) {
        logging.error('Loading menu file - ' + error);
        return [];
    }

    if ( menuData !== void 0) {
        menuTemplate = makeTemplate(menuData, app, i18next, mainWindow, theSettings);               
    }
    if ( menuTemplate !== void 0) 
    {
        return Menu.buildFromTemplate(menuTemplate);
    }
     return null;
};

const makeTemplate = function(data, app, i18next, mainWindow, theSettings)
{
    // set the translations and the window for the menu
    menuLibrary.initialize(app, i18next, mainWindow, theSettings);

    let menuTemplate = [];
    
    for (let mainItem = 0; mainItem < data.length; mainItem++) {
        let thisItem = data[mainItem];
        // adding & in front af the main labels so we can acces them with alt + first leter in the name
        let tmpMenu = {
            label: i18next.t(thisItem.name),
        };
        
        // the menu has subitems
        if (thisItem.subitems.length > 0) {           
            tmpMenu.submenu = [];
            for (let subItem = 0; subItem < thisItem.subitems.length; subItem++) {
                if (thisItem.subitems[subItem].type === 'system') {
                    if ( typeof menuLibrary[thisItem.subitems[subItem].id] === 'function') {
                        tmpMenu.submenu[subItem] = menuLibrary[thisItem.subitems[subItem].id](thisItem.subitems[subItem].name);
                    }
                } else if (thisItem.subitems[subItem].type === 'submenu') {
                    tmpMenu.submenu[subItem] = parseSubMenu(thisItem.subitems[subItem].subitems, thisItem.subitems[subItem].name);
                } else if (thisItem.subitems[subItem].type === 'dialog') {
                    tmpMenu.submenu[subItem] = menuLibrary.menuForDialog(thisItem.subitems[subItem].id, thisItem.subitems[subItem].name);
                }
            }
        }
        menuTemplate[thisItem.position] = tmpMenu;
    }
    
    function parseSubMenu(items, name) 
    {
        let response = {
            'label': name,
            'submenu': []
        };

        let subItems = [];
        for(let i = 0; i < items.length; i++) {
            if (items[i].type === 'system') {
                if ( typeof menuLibrary[items[i].id] === 'function') {
                    subItems[i] = menuLibrary[items[i].id](items[i].name);
                }
            } else if (items[i].type === 'submenu') {
                subItems[i] = parseSubMenu(items[i].subitems, items[i].name);
            } else if (items[i].type === 'dialog') {
                subItems[i] = menuLibrary.menuForDialog(items[i].id, items[i].name);
            }
        }

        response.submenu = subItems;
        return response;
    }

    // Add developer tools item if not in production
    if(process.env.NODE_ENV !== 'production'){
        menuTemplate.push({
            label: "Developer Tools",
            submenu: [
                {
                    label: "Customize menu",
                    click(){
                        menuCustomize.start(mainWindow);
                    }
                },
                {
                    label : "Import dialog",
                    click(){
                        dialog.showOpenDialog(menuLibrary.theWindow, {title: "Import dialog", filters: [{name: 'R-GUI-DialogCreator', extensions: ['json']}], properties: ['openFile']}, result => {
                            if (result !== void 0 && result.length > 0) {                            
                                fs.readFile(result[0], 'utf-8', (err, data) => {
                                    if (err) {
                                        dialog.showMessageBox(menuLibrary.theWindow, {type: 'error', title: 'Could not open the file!', buttons: ['OK']});
                                    } else {
                                        // pass menuLibrary.theWindow for dialog messages
                                        importDialog.save(data, menuLibrary.theWindow, menuLibrary.theSettings);
                                    }
                                });
                            }
                        });
                    }
                },
                {
                    label: "Toggle DevTools",
                    accelerator: "CommandOrControl+I",
                    click(item, focusedWindow){
                        focusedWindow.toggleDevTools();        
                    }
                },
                {
                    role: 'reload'
                },
            ]
        });
    }   

    return menuTemplate;
};

module.exports = menuBuilder;