const { ipcRenderer } = require('electron');
const { BrowserWindow } = require('electron').remote;

let data;

ipcRenderer.on('elementData', (event, args) => 
{
    let name = document.getElementById('newName');
    name.value = args.name;
    name.focus(); 
    data = args;
});

// document ready
document.addEventListener("DOMContentLoaded", function(event) 
{     
    // cancel / close window without saving
    let cancel = document.getElementById('cancel');
    cancel.addEventListener('click', function(event)
    {        
        let theWindow = BrowserWindow.getFocusedWindow();
        theWindow.close();
    });

    // send the new name and close the window
    let save = document.getElementById('save');
    save.addEventListener('click', function saveNewName(event)
    {
        let newName = document.getElementById('newName').value;
        ipcRenderer.send('newItemName', {main: data.main, newName: newName, oldName: data.name});
        let theWindow = BrowserWindow.getFocusedWindow();
        theWindow.close();
    });
});