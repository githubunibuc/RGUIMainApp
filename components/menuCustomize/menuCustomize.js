const { dialog, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

const systemElements = require('../../menus/systemElements');

let menuCustomizeWindow;
let renameItemWindow;
let menuTopEditWindow;

const menuCustomize = {

    start: function(mWindow)
    {
        if (menuCustomizeWindow !== void 0 && menuCustomizeWindow !== null) {
            menuCustomizeWindow.focus();
        } else {
            menuCustomizeWindow = new BrowserWindow({
                width: 800,
                height: 600,
                title: 'Customize the menu',
                parent: mWindow,
                webPreferences: {
                    nodeIntegration: true
                },
                resizable: false,
                show: false,
            });

            // Open the DevTools.
            // menuCustomizeWindow.webContents.openDevTools();

            // and load the menuCustomize.html of the app.
            menuCustomizeWindow.loadFile('./components/menuCustomize/menuCustomize.html');

                // Emitted when the window is closed.
            menuCustomizeWindow.on('closed', () => {
                menuCustomizeWindow = null;
            });
                    
            // when data is ready show window
            menuCustomizeWindow.once("show", () => {
                let dialogList = this.getAvailableDialogs();
                let currentMenu = this.getCurrentMenu();
                
                let newList = [...systemElements];
                for (let i = 0; i < dialogList.length; i++) {
                    newList.push(dialogList[i]);
                }
                menuCustomizeWindow.webContents.send('elementsList', {'newItemList': newList, 'currentMenu': currentMenu});

            });
            // when window is ready send data
            menuCustomizeWindow.once("ready-to-show", () => {
                menuCustomizeWindow.show();
            });
            // no menu
            menuCustomizeWindow.setMenu(null);
        }
    },
    // get dialogs from the dialogs folder
    getAvailableDialogs: function()
    {
        let data = fs.readFileSync(path.resolve('./menus/menuDialogList.json'), 'UTF8');
        try{
            // return data
            return JSON.parse(data);
        }catch(error){
            return [];
        }
    },
    // get current menu
    getCurrentMenu: function()
    {
        let data = fs.readFileSync(path.resolve('./menus/menu.json'), 'UTF8');
        try{
            // return data
            return JSON.parse(data);
        }catch(error){
            return [];
        }
    }
};
// rebuild the available dialog list
ipcMain.on('rebuildDialogList', (event, args) => {
    let question = dialog.showMessageBoxSync(menuCustomizeWindow, {type: "question", message: "Are you sure you want to update the dialog list?", title: "Update available dialog list", buttons: ["No", "Yes"]});
    if (question === 1) {
        let dialogList = [];
        fs.readdir(path.resolve('./dialogs'), (err, files) => {
            if(err){
                console.log('Error reading the dialogs folder' + err);
            } else {
                for (let i = 0; i< files.length; i++) 
                {    
                    let dialog;
                    let data = fs.readFileSync(path.resolve('./dialogs/' + files[i]), 'UTF8');
                    
                    try{
                        dialog = JSON.parse(data);
                    }catch(error){
                        console.log('Could not parse dialog. ' + err);
                        dialog = null;
                    }
                    if (dialog !== void 0 && dialog !== null) {
                        let dialogFileName = files[i].substring(0, files[i].length - 5);
                        dialogList.push({
                            "id": dialogFileName,
                            "name": dialog.properties.title,
                            "type": "dialog"
                        });
                    }               
                }
                fs.open(path.resolve('./menus/menuDialogList.json'), 'w', (err, fd) => {
                    if (err) {
                        console.log('Could not open the menuDialogList for writing' + err);
                    } else {
                        fs.writeFile(fd, JSON.stringify(dialogList), (err) => {
                            if (err) {
                                dialog.showMessageBox(menuCustomizeWindow, {type: "error", message: "Could not update the available dialog list", title: "Error", buttons: ["OK"]});
                            } else {
                                dialog.showMessageBox(menuCustomizeWindow, {type: "info", message: "Dialog list updated successfully! Please close and reopen the window.", title: "Success", buttons: ["OK"]});
                            }
                        });
                    }
                });
            }
        });
    }
});
// reset menu to default
ipcMain.on('resetMenuToDefault', (event, args) => {
    let question = dialog.showMessageBoxSync(menuCustomizeWindow, {type: "question", message: "Are you sure you sure ? This operation cannot be undone!", title: "Reset menu to default", buttons: ["No", "Yes"]});
    if (question === 1) {
        fs.readFile(path.resolve('./menus/menuDefault.json'), (err, data) =>
        {
            if (err) {
                dialog.showMessageBoxSync(menuCustomizeWindow, {type: 'error', message: "Read error occured!", title: "Error", buttons: ["OK"]});
            } else {
                // write data to file
                fs.open(path.resolve('./menus/menu.json'), 'w', function openMenuDefault(err, fd)
                {
                    if (err) {
                        dialog.showMessageBoxSync(menuCustomizeWindow, {type: 'error', message: "Cannot not reset the menu!", title: "Error", buttons: ["OK"]});
                    } else {
                        fs.writeFile(fd, data, function writeMenuDefault(err) {
                            if (err) {
                                dialog.showMessageBoxSync(menuCustomizeWindow, {type: 'error', message: "Cannot not reset the menu!", title: "Error", buttons: ["OK"]});
                            } else {
                                dialog.showMessageBoxSync(menuCustomizeWindow, {type: 'info', message: "Menu reseted successfully!", title: "Success", buttons: ["OK"]});
                            }
                        });
                    }
                });
            }
        });
    }
});

// lunch the rename Item window
ipcMain.on('renameItem', (event, args) => {
    
    if (renameItemWindow !== void 0 && renameItemWindow !== null) {
        renameItemWindow.focus();
    } else {
        renameItemWindow = new BrowserWindow({
            width: 300,
            height: 140,
            title: 'Rename menu',
            parent: menuCustomizeWindow,
            webPreferences: {
                nodeIntegration: true
            },
            resizable: false,
            minimizable: false,
            show: false,
        });

        // Open the DevTools.
        // renameItemWindow.webContents.openDevTools();

        // and load the menuCustomize.html of the app.
        renameItemWindow.loadFile('./components/menuCustomize/menuRenameItem.html');

            // Emitted when the window is closed.
        renameItemWindow.on('closed', () => {
            renameItemWindow = null;
        });
                
        // when data is ready show window
        renameItemWindow.once("show", () => {
            renameItemWindow.webContents.send('elementData', args);
        });
        // when window is ready send data
        renameItemWindow.once("ready-to-show", () => {
            renameItemWindow.show();
        });
        // no menu
        renameItemWindow.setMenu(null);
    }
});
// send the new name back
ipcMain.on('newItemName', (ev, args) => {
    menuCustomizeWindow.webContents.send('newItemName', args);
});

// lunch the tom menu editor
ipcMain.on('menuTopEdit', (event, args) => {
    
    if (menuTopEditWindow !== void 0 && menuTopEditWindow !== null) {
        menuTopEditWindow.focus();
    } else {
        menuTopEditWindow = new BrowserWindow({
            width: 350,
            height: 490,
            title: 'Top menu edit',
            parent: menuCustomizeWindow,
            webPreferences: {
                nodeIntegration: true
            },
            resizable: false,
            minimizable: false,
            show: false,
        });

        // Open the DevTools.
        // menuTopEditWindow.webContents.openDevTools();

        // and load the menuCustomize.html of the app.
        menuTopEditWindow.loadFile('./components/menuCustomize/menuTopEdit.html');

            // Emitted when the window is closed.
        menuTopEditWindow.on('closed', () => {
            menuTopEditWindow = null;
        });
                
        // when data is ready show window
        menuTopEditWindow.once("show", () => {
            menuTopEditWindow.webContents.send('elementData', args);
        });
        // when window is ready send data
        menuTopEditWindow.once("ready-to-show", () => {
            menuTopEditWindow.show();
        });
        // no menu
        menuTopEditWindow.setMenu(null);
    }
});
ipcMain.on('topMenuUpdated', (event, args) => {
    menuCustomizeWindow.webContents.send('topMenuUpdated', args);
});

// save menu as default
ipcMain.on("saveAsDefault", (event, args) => {
    
    let theMenu = makeMenuData(args);

    // write data to file
    fs.open(path.resolve('./menus/menuDefault.json'), 'w', function openMenuDefault(err, fd)
    {
        if (err) {
            dialog.showMessageBoxSync(menuCustomizeWindow, {type: 'error', message: "Cannot save menu as default!", title: "Error", buttons: ["OK"]});
        } else {
            fs.writeFile(fd, JSON.stringify(theMenu), function writeMenuDefault(err) {
                if (err) {
                    dialog.showMessageBoxSync(menuCustomizeWindow, {type: 'error', message: "Cannot save menu as default!", title: "Error", buttons: ["OK"]});
                } else {
                    dialog.showMessageBoxSync(menuCustomizeWindow, {type: 'info', message: "Menu saved as default!", title: "Success", buttons: ["OK"]});
                }
            });
        }
    });
});
// save menu
ipcMain.on("saveMenu", (event, args) => 
{
    let theMenu = makeMenuData(args);

    // write data to file
    fs.open(path.resolve('./menus/menu.json'), 'w', function openMenuDefault(err, fd)
    {
        if (err) {
            dialog.showMessageBoxSync(menuCustomizeWindow, {type: 'error', message: "Cannot save the menu!", title: "Error", buttons: ["OK"]});
        } else {
            fs.writeFile(fd, JSON.stringify(theMenu), function writeMenuDefault(err) {
                if (err) {
                    dialog.showMessageBoxSync(menuCustomizeWindow, {type: 'error', message: "Cannot save the menu!", title: "Error", buttons: ["OK"]});
                } else {
                    dialog.showMessageBoxSync(menuCustomizeWindow, {type: 'info', message: "Menu saved!", title: "Success", buttons: ["OK"]});
                    menuCustomizeWindow.close();
                }
            });
        }
    });
});
// meke data for saving
makeMenuData = function(data) {
    let topMenu = data.topMenu;
    let subMenu = data.subMenu;

    let theMenu = [];

    for (let i = 0; i < topMenu.length; i++) 
    {
        if (topMenu[i].parent === '') {
            let menuItem = {};
            menuItem.name = topMenu[i].name;
            menuItem.position = topMenu[i].position;
            menuItem.subitems = [];    
            for (let j = 0; j < subMenu[topMenu[i].name].length; j++) 
            {
                let menuSubItem = {};
                menuSubItem.id = (subMenu[topMenu[i].name][j].id === void 0) ? 'wrongId' : makeID(subMenu[topMenu[i].name][j].id);
                menuSubItem.name = subMenu[topMenu[i].name][j].name;
                menuSubItem.position = subMenu[topMenu[i].name][j].position;
                menuSubItem.type = subMenu[topMenu[i].name][j].type;
                if (menuSubItem.type === 'submenu') {
                    menuSubItem.subitems = [];
                    menuSubItem.subitems = makeSubitems(menuItem.name + ' | ' + menuSubItem.name);
                }
                menuItem.subitems.push(menuSubItem);
            }
            theMenu.push(menuItem);
        }

    }
    function makeSubitems(name)
    {
        let items = [];
        if (subMenu[name]) {
            for (let k = 0; k < subMenu[name].length; k++) {
                let item = {};
                item.id = (subMenu[name][k].id === void 0) ? 'wrongId' : makeID(subMenu[name][k].id);
                item.name = subMenu[name][k].name;
                item.position = subMenu[name][k].position;
                item.type = subMenu[name][k].type;
                if (item.type === 'submenu') {
                    item.subitems = [];
                    item.subitems = makeSubitems(name + ' | ' + item.name);
                }
                items.push(item);
            }
        }
        return items;        
    }
    function makeID(id)
    {
        let newID = id;
        let testSeparator = id.substring(0, 9).toLowerCase();
        if (testSeparator === 'separator') {
            newID = testSeparator;
        }
        let testSubmenu = id.substring(0, 7).toLowerCase();
        if (testSubmenu === 'submenu') {
            newID = testSubmenu;
        }
        return newID;
    }
    return theMenu;
};

module.exports = menuCustomize;