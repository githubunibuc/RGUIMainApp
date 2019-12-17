const { ipcRenderer } = require('electron');
const { BrowserWindow, dialog } = require('electron').remote;

// TODO -- discus about deleting an item

let menuItemList;
let onlyTop = [];

ipcRenderer.on('elementData', (ev, args) => {
    
    if (args.length > 0) {

        // save the initial list
        menuItemList = args;     

        let j = 0; 
        for (let i = 0; i < menuItemList.length; i++) {
            if (menuItemList[i].parent === '') {
                onlyTop.push({name: menuItemList[i].name, position: j, oldName: menuItemList[i].name});
                j++;
            }
        }
        makeItemList(onlyTop);        
    }
});

//  Helper functions ========================
// make the item list
function makeItemList(list)
{
    let itemList = document.getElementById('itemList');        
    
    // clear list
    itemList.innerHTML = '';

    for(let i = 0; i < list.length; i++) 
    {
        let el = document.createElement('div');

        el.setAttribute('data-name', list[i].name);
        el.setAttribute('data-position', i);
        el.setAttribute('data-selected', 'false');
        
        // add the text
        let txt = document.createTextNode(list[i].name);
        el.appendChild(txt);
        // TODO -- discus about it
        // add the delete button
        // let del = document.createElement('button');
        // del.className ='deleteItem';
        // del.addEventListener('click', deleteItem, false);
        // el.appendChild(del);

        el.addEventListener('click', function elClick(ev) {
            // call deselect all items
            deselectAllItems();
            document.getElementById('renameItemInput').value = this.getAttribute('data-name');
            this.style.backgroundColor = '#0078d7';
            this.style.color = 'white';
            this.setAttribute('data-selected', 'true');            
        });

        itemList.appendChild(el);
    }
}
// deselet all items
function deselectAllItems()
{
    let theContainer = document.getElementById('itemList');    
    let allElements = theContainer.querySelectorAll('div');
    for (let i = 0; i < allElements.length; i++) 
    {  
        allElements[i].style.backgroundColor = 'white';
        allElements[i].style.color = 'black';
        allElements[i].setAttribute('data-selected', 'false');
    }
}
// reassign positions
function reassignPositions(arr)
{
    for (let i = 0; i < arr.length; i++)
    {
        arr[i].position = i;
    }
    return arr;
}
// move an item up or down
function moveItem(position)
{
    let itemList = document.getElementById('itemList');
    let selected = itemList.querySelectorAll("div[data-selected='true']");
    
    // is something selected ?
    if ( selected.length > 0 && selected[0]) 
    {    
        let selectedPosition = parseInt(selected[0].getAttribute('data-position'));
        let selectedName = selected[0].getAttribute('data-name');
        onlyTop.splice(selectedPosition, 1);
        // setting new position
        if (position === 'up') {
            selectedPosition = (selectedPosition-1 <= 0) ? 0 : selectedPosition-1; 
        } else if (position === 'down') {
            selectedPosition = (selectedPosition+1 >= onlyTop.length) ? onlyTop.length : selectedPosition+1;
        }
        onlyTop.splice(selectedPosition, 0, {name: selectedName, position: selectedPosition, parent: ''});    
        onlyTop = reassignPositions(onlyTop);  
        
        makeItemList(onlyTop);
        // reselect item
        let sItem = itemList.querySelectorAll("div[data-name='"+ selectedName +"']");
        if (sItem[0]) {
            sItem[0].style.backgroundColor = '#0078d7';
            sItem[0].style.color = 'white';
            sItem[0].setAttribute('data-selected', 'true');
        }
    } else {
        let theWindow = BrowserWindow.getFocusedWindow();
        dialog.showMessageBoxSync(theWindow, {type: 'none', message: 'Please select at least an item first.', title:'No item selected', buttons:['OK']});
    }
}
// TODO -- to be discussed
// delete/remove item
function deleteItem(ev)
{
    // stop propagation so we do not trigger div click
    ev.stopPropagation();
    
    let parentName = this.parentNode.getAttribute('data-name');
    
    for (let i = 0; i < onlyTop.length; i++) {
        if ( onlyTop[i].name === parentName) {
            onlyTop.splice(i, 1);
        }
    }
    // reset rename input value
    document.getElementById('renameItemInput').value = '';
    makeItemList(onlyTop);
}
// update name in initial array
function updateNameInitial(newName, oldName)
{
    for (let i = 0; i < menuItemList.length; i++) 
    {
        if (menuItemList[i].name === oldName) {
            menuItemList[i].name = newName;
        }        
        if(menuItemList[i].parent !== '' && menuItemList[i].parent.indexOf(oldName) !== -1) {
            menuItemList[i].name = menuItemList[i].name.replace(oldName, newName);
            menuItemList[i].parent = menuItemList[i].parent.replace(oldName, newName);
        }
    }
}

// document ready
document.addEventListener("DOMContentLoaded", function(event) { 
  
    // make, send data & close the window
    let save = document.getElementById('save');
    save.addEventListener('click', function(event)
    {    
        let theList = [];
        let sublist = {};
        // get submenus
        for (let i = 0; i < menuItemList.length; i++) 
        {
            if (menuItemList[i].parent !== '') {
                if (sublist[menuItemList[i].parent] === void 0) {
                    sublist[menuItemList[i].parent] = [];
                }
                if (menuItemList[i].oldPos === void 0) {
                    menuItemList[i].oldPos = menuItemList[i].position;
                }
                sublist[menuItemList[i].parent][menuItemList[i].oldPos] = menuItemList[i];
                // remove undefine positions
                sublist[menuItemList[i].parent] = sublist[menuItemList[i].parent].filter(function () { return true; });
            }
        }

        let position = 0;
        // update positions
        for (let i = 0; i < onlyTop.length; i++) 
        {    
            let name = onlyTop[i].name;
            let found = false;
            for (let j = 0; j < menuItemList.length; j++) {
                if (menuItemList[j].name === name) {
                    menuItemList[j].position = position;
                    theList.splice(position, 0, menuItemList[j]);
                    found = true;
                    position++;
                    if (sublist[menuItemList[j].name] !== void 0 && sublist[menuItemList[j].name].length > 0) {
                        for(let k = 0; k < sublist[menuItemList[j].name].length; k++) {
                            
                            sublist[menuItemList[j].name][k].position = position;
                            theList.splice(position, 0, sublist[menuItemList[j].name][k]);
                            position++;
                        }
                    }
                } 
            }
            // add new top menu
            if (!found) {
                onlyTop[i].position = position;
                theList.splice(position, 0, onlyTop[i]);
                position++;
            }
        }

        ipcRenderer.send('topMenuUpdated', theList); 
        let window = BrowserWindow.getFocusedWindow();
        window.close();     
    });

    // close the window
    let cancel = document.getElementById('cancel');
    cancel.addEventListener('click', function(event)
    {
        let window = BrowserWindow.getFocusedWindow();
        window.close();
    });

    // move item up -> upArrow
    let upArrow = document.getElementById('arrowUp');
    upArrow.addEventListener('click', function moveItemUp(event)
    {
        moveItem('up');
    }); 
    
    // move item down -> downArrow
    let downArrow = document.getElementById('arrowDown');
    downArrow.addEventListener('click', function moveItemDown(event)
    {
        moveItem('down');
    });

    // rename an item
    let renameItem = document.getElementById('renameItemButton');
    renameItem.addEventListener('click', function renameItem(event)
    {    
        let theWindow = BrowserWindow.getFocusedWindow();
        let selected = itemList.querySelectorAll("div[data-selected='true']");
        
        // if something is selected
        if ( selected.length > 0 && selected[0]) {
            let newName = document.getElementById('renameItemInput').value;
            let oldName = selected[0].getAttribute('data-name');

            if (newName !== '') {
                for (let i = 0; i < onlyTop.length; i++) {
                    if (onlyTop[i].name == oldName) {
                        onlyTop[i].name = newName;
                    }
                }
            } 
            else {
                dialog.showMessageBoxSync(theWindow, {type: 'none', message: 'Please set a name.', title:'No name', buttons:['OK']});
            }
            updateNameInitial(newName, oldName);
            makeItemList(onlyTop);
            // reset rename input value
            document.getElementById('renameItemInput').value = '';
        } 
        else {
            dialog.showMessageBoxSync(theWindow, {type: 'none', message: 'Please select an item.', title:'No item selected', buttons:['OK']});
        }
    });

    // new item
    let newItem = document.getElementById('newItem');
    newItem.addEventListener('click', function addNewItem(event)
    {
        let itemList = document.getElementById('itemList');
        // is something selected ?
        let selected = itemList.querySelectorAll("div[data-selected='true']");
        let selectedPosition;
        let lastItemPos = onlyTop.length;
    
        // if something is selected
        if ( selected.length > 0 && selected[0]) {    
            selectedPosition = parseInt(selected[0].getAttribute('data-position'));
            onlyTop.splice(selectedPosition, 0, {name: 'New menu', position: selectedPosition, parent: ''});
        } 
        else {
            onlyTop.splice(lastItemPos, 0, {name: 'New menu', position: lastItemPos, parent: ''});
        }        
        reassignPositions(onlyTop);
        makeItemList(onlyTop);
    });
});