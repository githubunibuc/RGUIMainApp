const { ipcRenderer } = require('electron');
const { BrowserWindow, dialog } = require('electron').remote;

// top menu and subitems
var menuTopTarget = [];
var menuSubTarget = {};

// trigger when the window opens
ipcRenderer.on('elementsList', (event, args) => 
{    
    let newItemList = args.newItemList;
    let menu = args.currentMenu;

    // create the left part of the window (system elements and dialogs list)
    if (newItemList.length > 0) 
    {
        let leftContainer = document.getElementById('leftContainer');       
        for (let i = 0; i < newItemList.length; i++) 
        {
            let el = document.createElement('div');
            el.setAttribute('data-id', newItemList[i].id);
            el.setAttribute('data-name', newItemList[i].name);
            el.setAttribute('data-type', newItemList[i].type);
            // data-visible used for searching
            el.setAttribute('data-visible', 1);
            
            // add the text
            let txt = document.createTextNode(newItemList[i].name);
            el.appendChild(txt);

            el.addEventListener('click', function elClick(ev) {
                // call deselect all items
                deselectAllNewItems('leftContainer');
                this.style.backgroundColor = '#0078d7';
                this.style.color = 'white';
                this.setAttribute('data-selected', 'true');
            });
            leftContainer.appendChild(el);
        }
    }

    // create the right part oh the window (parse and load the actual menu structure)
    let topPosition = 0;
    if (menu.length > 0) {
        for(let i = 0; i < menu.length; i++) {
            // top menu
            let parentName = menu[i].name;
            // position and name
            menuTopTarget[topPosition] = {name: parentName, position: menu[i].position, parent: ''};
            topPosition++;
            // subitems
            menuSubTarget[parentName] = [];
            if (menu[i].subitems.length > 0) {
                for(let j = 0; j < menu[i].subitems.length; j++) {
                    // position and name
                    if (menu[i].subitems[j].type === 'submenu') {
                        let submenuName = parentName + ' | ' + menu[i].subitems[j].name;                        
                        menuTopTarget.splice(topPosition, 0, {name: submenuName, sName: menu[i].subitems[j].name, position: menu[i].position+1, parent: parentName});
                        parseSubMenu(menu[i].subitems[j].subitems, submenuName);
                        topPosition++;
                    }
                    menuSubTarget[parentName][menu[i].subitems[j].position] = menu[i].subitems[j];                    
                }
            }
        }                
        // initial setup
        makeMenuTopItems(menuTopTarget);        
        // load first element in list
        makeMenuSubItems(menuSubTarget[menuTopTarget[0].name]);
    }
});

// trigger after a subitem has been renames
ipcRenderer.on('newItemName', (event, args) => {   
    
    let oldTopName = args.main + ' | ' + args.oldName;
    let isSubmenu = false;

    // update the top menu with the new names
    for (let i = 0; i < menuTopTarget.length; i++) {
        if (menuTopTarget[i].name === oldTopName) {
            menuTopTarget[i].name = args.main + ' | ' + args.newName;
            menuTopTarget[i].sName =  args.newName;
        }
    }
    // update the subitems with the new name
    if (menuSubTarget[args.main] !== void 0) {
        for (let i = 0; i < menuSubTarget[args.main].length; i++) {
            // replace the name of the item
            if (menuSubTarget[args.main][i].name == args.oldName) {
                menuSubTarget[args.main][i].name = args.newName;
                if ( menuSubTarget[args.main][i].type === 'submenu') {
                    isSubmenu = true;
                }
            }
        }
    }
    // is the subitem a submenu?
    if (isSubmenu) {
        for (let item in menuSubTarget) {
            if (item === oldTopName) {
                menuSubTarget[args.main + ' | ' + args.newName] = menuSubTarget[item];
                delete menuSubTarget[item];
            }            
        }
    }
    
    // remake top and subitems in window
    makeMenuTopItems(menuTopTarget);
    makeMenuSubItems(menuSubTarget[args.main]);

    // reset the target category value
    document.getElementById('targetCategory').value = args.main;
});

// trigger after we modify the top menu (target in window)
ipcRenderer.on('topMenuUpdated', (event, args) => 
{
    if (args.length > 0) {
        menuTopTarget = args;
        // get topMenu
        let topMenuIs = document.getElementById('targetCategory');
        let topM = topMenuIs.options[topMenuIs.selectedIndex].value;
        makeMenuTopItems(args);
        // change also the subitems name
        for (let i = 0; i < args.length; i++) 
        {
            if (menuSubTarget[args[i].initialName] !== void 0 && args[i].name !== args[i].initialName) {
                // assing to hte new name
                menuSubTarget[args[i].name] = menuSubTarget[args[i].initialName];
                // remove ald name from array
                delete menuSubTarget[args[i].initialName];
            } else {
                if (menuSubTarget[args[i].name] === void 0) {
                    menuSubTarget[args[i].name] = [];
                }
            }
        }
        makeMenuSubItems(menuSubTarget[args[0].name]);
    }
});

// Helper functions ==================================
// menu subitems recursion
function parseSubMenu(items, parentName)
{
    menuSubTarget[parentName] = [];
    if (items.length > 0) {        
        for(let j = 0; j < items.length; j++) 
        {    
            // position and name
            if (items[j].type === 'submenu') {
                let submenuName = parentName + ' | ' + items[j].name;
                let pos = menuTopTarget.indexOf(parentName);
                menuTopTarget.splice(pos+1, 0, submenuName);
                parseSubMenu(items[j].subitems, submenuName);
            } else {
                menuSubTarget[parentName][items[j].position] = items[j];                    
            }
        }
    }
}
// make/remake targent top menu
function makeMenuTopItems(nameList)
{    
    // getting the element
    let targetCategory = document.getElementById('targetCategory');    
    targetCategory.innerHTML = '';
    // new loop for ordered items
    for(let i = 0; i < nameList.length; i++) {
        let el = document.createElement('option');
        el.value = nameList[i].name;
        el.innerHTML = nameList[i].name;
        targetCategory.appendChild(el);
    }
}
// make/remake target sub item menu
function makeMenuSubItems(nameList)
{    
    let rightContainer = document.getElementById('rightContainer');
    rightContainer.innerHTML = "";   
    for(let i = 0; i < nameList.length; i++) 
    {
        let el = document.createElement('div');
        
        let innerTxt = nameList[i].name;
        let elId = nameList[i].id;
        
        // element type is separator
        if (nameList[i].name === '') {
            innerTxt = '----------------------------------------';
            elId = nameList[i].id.substring(0,9) + '-' + i;
        }
        // element type is submenu
        let testID = nameList[i].id.substring(0,7);
        if (testID === 'submenu') {
            // if item is separator - rebuid ID
            elId = testID + '-' + i;
        }

        el.setAttribute('data-id', elId);
        el.setAttribute('data-name', nameList[i].name);
        el.setAttribute('data-type', nameList[i].type);
        el.setAttribute('data-position', i);
        // data-visible used for searching
        el.setAttribute('data-visible', 1);

        // add background arrow to submenus
        if (nameList[i].type === 'submenu') {
            el.className = 'submenuArrow';
        }
        // add the text
        let txt = document.createTextNode(innerTxt);
        el.appendChild(txt);
        el.addEventListener('click', function elClick(ev) {
            // call deselect all items
            deselectAllNewItems('rightContainer');
            this.style.backgroundColor = '#0078d7';
            this.style.color = 'white';
            this.setAttribute('data-selected', 'true');
        });
        rightContainer.appendChild(el);
    }
}
// add item to top menu - // updates top variable
function addItemToTopMenu(mainItem, child)
{
    for(let i = 0; i < menuTopTarget.length; i++) 
    {
        if (menuTopTarget[i].name === mainItem) {
            menuTopTarget.splice(i+1, 0, {name: mainItem + ' | '+ child, sName: child, position: i+1, parent: mainItem});
        }
    }    
    makeMenuTopItems(menuTopTarget);
}
// deselect all items on leftContainer/rightContainer
function deselectAllNewItems(side)
{
    let theContainer = document.getElementById(side);    
    let allElements = theContainer.querySelectorAll('div');
    for (let i = 0; i < allElements.length; i++) 
    {  
        allElements[i].style.backgroundColor = 'white';
        allElements[i].style.color = 'black';
        allElements[i].setAttribute('data-selected', 'false');
    }
}
// reassign positions and update menuTopTarget
function reassignPositions(arr)
{
    for (let i = 0; i < arr.length; i++) 
    {
        arr[i].position = i;
        
        // update also top menu
        for (let j = 0; j < menuTopTarget.length; j++) 
        {
            if (menuTopTarget[j].sName === arr[i].name) {
                menuTopTarget[j].position = i;
            }
        }
    }    
    return arr;
}

// document ready ==================================
document.addEventListener("DOMContentLoaded", function(event) 
{      
    // Bottom buttons from left to right =========================================

    // update available dialog list
    let updateDialogList = document.getElementById('updateDialogList');
    updateDialogList.addEventListener('click', function(event)
    {
        ipcRenderer.send('rebuildDialogList');
    });
    // make current as default
    let makeDefault = document.getElementById('makeDefault');
    makeDefault.addEventListener('click', function saveAsDefault()
    {
        let theWindow = BrowserWindow.getFocusedWindow();
        dialog.showMessageBox(theWindow, {type: "question", message: "Are you sure you sure ? This operation cannot be undone!", title: "Save current menu configuration as ddefault", buttons: ["No", "Yes"]}).then(function(value){
            if (value.response === 1) {
                ipcRenderer.send('saveAsDefault', {topMenu: menuTopTarget, subMenu: menuSubTarget});
            }
        });
    });    
    // save settings
    let save = document.getElementById('saveMenu');
    save.addEventListener('click', function(event)
    {
        ipcRenderer.send('saveMenu', {topMenu: menuTopTarget, subMenu: menuSubTarget});
    });
    // cancel settings
    let cancel = document.getElementById('cancelMenu');
    cancel.addEventListener('click', function(event)
    {
        let theWindow = BrowserWindow.getFocusedWindow();
        theWindow.close();
    });
    // reset menu to default
    let reset = document.getElementById('resetMenu');
    reset.addEventListener('click', function(event)
    {
        ipcRenderer.send('resetMenuToDefault');
    });

    // Functionality & buttons from top left to right bottom =========================================

    // search element by name | input must be bigger than 3 chars
    let searchNewElement = document.getElementById('searchNewElement');
    searchNewElement.addEventListener('keyup', function searchNEl() 
    {
        let leftContainer = document.getElementById('leftContainer');
        let itemList = leftContainer.querySelectorAll("div[data-visible ='1']");
        let toFind = searchNewElement.value;
        if(toFind.length >= 3){
            // deselect all items
            deselectAllNewItems('leftContainer');
            for(let i = 0; i < itemList.length; i++) {
                let item = itemList[i].getAttribute('data-name');
                let exp = new RegExp(toFind, 'i');
                if (item.search(exp) !== -1){
                    itemList[i].style.display = "block";

                }else{
                    itemList[i].style.display = "none";
                }
            }
        } else {            
            for(let i = 0; i < itemList.length; i++) {
                itemList[i].style.display = "block";
            }
        }
    });

    // filter available elements/items by category change (all/system/dialogs)
    let newItemCategory = document.getElementById('newItemCategory');
    newItemCategory.addEventListener('change', function newItemCatChange(event)
    {
        let selectedV = this.options[this.selectedIndex].value;
        let leftContainer = document.getElementById('leftContainer');
        let allElements = leftContainer.querySelectorAll('div');
        
        for (let i = 0; i < allElements.length; i++) {
            // reset selection
            allElements[i].setAttribute('data-selected', 'false');
            allElements[i].style.backgroundColor = 'white';
            allElements[i].style.color = 'black';
            if ( selectedV !== 'all') {   
                if ( allElements[i].getAttribute('data-type') !== selectedV) {
                    allElements[i].style.display = 'none';
                    allElements[i].setAttribute('data-visible', 0);
                } else {
                    allElements[i].setAttribute('data-visible', 1);
                    allElements[i].style.display = 'block';
                }
            } else {
                allElements[i].setAttribute('data-visible', 1);
                allElements[i].style.display = 'block';
            }
        }
        // reset search box
        document.getElementById('searchNewElement').value = '';
    });

    // Add(right) and remove(left) elements ==========
    
    // right arrow add element to top menu
    let rightArrow = document.getElementById('rightArrow');
    rightArrow.addEventListener('click', function addEl(event)
    {
        // the window for messages
        let theWindow = BrowserWindow.getFocusedWindow();

        let leftContainer = document.getElementById('leftContainer');
        let selectedL = leftContainer.querySelectorAll("div[data-selected='true']");

        if ( selectedL.length > 0 && selectedL[0]) 
        { 
            // get topMenu
            let topMenuIs = document.getElementById('targetCategory');
            let topM = topMenuIs.options[topMenuIs.selectedIndex].value;
            
            // get the id and check if already exists
            let newId = selectedL[0].getAttribute('data-id');
            
            let alreadyThere = rightContainer.querySelectorAll("div[data-id='"+ newId +"']");

            if (alreadyThere.length > 0) {
                dialog.showMessageBoxSync(theWindow, {type: 'none', message: 'Item already in the list', title:'Item exists', buttons:['OK']});
            } else {
                // get the name and the type
                let newName = selectedL[0].getAttribute('data-name');
                let newType = selectedL[0].getAttribute('data-type');

                // is something selected on the right side?
                let rightContainer = document.getElementById('rightContainer');
                let selectedR = rightContainer.querySelectorAll("div[data-selected='true']");
                let selectedRPosition;

                // TODO -- add to main list? we will see
                if ( selectedR.length > 0 && selectedR[0]) {
                    selectedRPosition = selectedR[0].getAttribute('data-position');
                    // insert at position
                    menuSubTarget[topM].splice(selectedRPosition, 0, {id: newId, name: newName, position: selectedRPosition, type: newType});
                } else {
                    // insert at the begining of the list
                    menuSubTarget[topM].splice(0, 0, {id: newId, name: newName, position: 0, type: newType});
                    menuSubTarget[topM] = reassignPositions(menuSubTarget[topM]);
                }
                makeMenuSubItems(menuSubTarget[topM]);
            }
        } else {
            dialog.showMessageBoxSync(theWindow, {type: 'none', message: 'Please select an item to add first', title:'No item selected', buttons:['OK']});
        }
    });

    // left arrow - remove element
    let leftArrow = document.getElementById('leftArrow');
    leftArrow.addEventListener('click', function removeEl(event)
    {
        let rightContainer = document.getElementById('rightContainer');
        let selected = rightContainer.querySelectorAll("div[data-selected='true']");
        
        // is something selected ?
        if ( selected.length > 0 && selected[0]) 
        {
            // get topMenu
            let topMenuIs = document.getElementById('targetCategory');
            let topM = topMenuIs.options[topMenuIs.selectedIndex].value;
            
            let selectedPosition = selected[0].getAttribute('data-position');
            let selectedType = selected[0].getAttribute('data-type');
            let selectedName = selected[0].getAttribute('data-name');
            menuSubTarget[topM].splice(selectedPosition, 1);

            if (selectedType === 'submenu') {
                delete menuSubTarget[topM + ' | ' + selectedName];
                for (let i = 0; i < menuTopTarget.length; i++) {
                    if (menuTopTarget[i].name == topM + ' | ' + selectedName) {
                        menuTopTarget.splice(i, 1);
                    }
                }
            }
            // reassign positions
            menuSubTarget[topM] = reassignPositions(menuSubTarget[topM]);
    
            makeMenuSubItems(menuSubTarget[topM]);
            makeMenuTopItems(menuTopTarget);
            document.getElementById('targetCategory').value = topM;
        } else {
            // the window for messages
            let theWindow = BrowserWindow.getFocusedWindow();
            dialog.showMessageBoxSync(theWindow, {type: 'none', message: 'Please select at least an item to remove.', title:'No item selected', buttons:['OK']});
        }
    });

    // Top menu category & setting ==========

    // target menu top on change
    let targetCategory = document.getElementById('targetCategory');
    targetCategory.addEventListener('change', function elClick(ev) {
        let selectedV = this.options[this.selectedIndex].value;               
        deselectAllNewItems('rightContainer');        
        makeMenuSubItems(menuSubTarget[selectedV]);    
    });

    // top menu edit
    let menuTopEdit = document.getElementById('menuTopEdit');
    menuTopEdit.addEventListener('click', function topMenuEdit()
    {    
        // add initial name for later updates
        for (let i = 0; i < menuTopTarget.length; i++) {
            menuTopTarget[i].initialName = menuTopTarget[i].name;
        }
        // send data to the edit window
        ipcRenderer.send('menuTopEdit', menuTopTarget);
    });

    // Move menu subitems up and down ==========
    
    // move item up -> upArrow
    let upArrow = document.getElementById('upArrow');
    upArrow.addEventListener('click', function moveItemUp(event)
    {    
        let rightContainer = document.getElementById('rightContainer');
        let selected = rightContainer.querySelectorAll("div[data-selected='true']");
        
        // is something selected ?
        if ( selected.length > 0 && selected[0]) 
        {
            // get topMenu
            let topMenuIs = document.getElementById('targetCategory');
            let topM = topMenuIs.options[topMenuIs.selectedIndex].value;

            let selectedPosition = parseInt(selected[0].getAttribute('data-position'));
            let sId = selected[0].getAttribute('data-id');
            let sName = selected[0].getAttribute('data-name');
            let sType = selected[0].getAttribute('data-type');

            menuSubTarget[topM].splice(selectedPosition, 1);
            // setting new position
            selectedPosition = (selectedPosition-1 <= 0) ? 0 : selectedPosition-1; 
            menuSubTarget[topM].splice(selectedPosition, 0, {id: sId, name: sName, position: selectedPosition, type: sType});
            menuSubTarget[topM] = reassignPositions(menuSubTarget[topM]);
        
            makeMenuSubItems(menuSubTarget[topM]);
            // reselect item
            if (sName === '') {
                // if item is separator - rebuid ID
                sId = sId.substring(0,9) + '-' + selectedPosition;
            }
            let testID = sId.substring(0,7);
            if (testID === 'submenu') {
                // if item is separator - rebuid ID
                sId = testID + '-' + selectedPosition;
            }
            let rItem = rightContainer.querySelectorAll("div[data-id='"+ sId +"']");
            if (rItem[0]) {
                rItem[0].style.backgroundColor = '#0078d7';
                rItem[0].style.color = 'white';
                rItem[0].setAttribute('data-selected', 'true');
            }
        } else {
            // the window for messages
            let theWindow = BrowserWindow.getFocusedWindow();
            dialog.showMessageBoxSync(theWindow, {type: 'none', message: 'Please select an item first.', title:'No item selected', buttons:['OK']});
        }
    });

    // move item down -> downArrow
    let downArrow = document.getElementById('downArrow');
    downArrow.addEventListener('click', function moveItemDown(event)
    {
        let rightContainer = document.getElementById('rightContainer');
        let selected = rightContainer.querySelectorAll("div[data-selected='true']");
        
        // is something selected ?
        if ( selected.length > 0 && selected[0]) 
        {
            // get topMenu
            let topMenuIs = document.getElementById('targetCategory');
            let topM = topMenuIs.options[topMenuIs.selectedIndex].value;

            let selectedPosition = parseInt(selected[0].getAttribute('data-position'));    
            let sId = selected[0].getAttribute('data-id');
            let sName = selected[0].getAttribute('data-name');
            let sType = selected[0].getAttribute('data-type');
            
            menuSubTarget[topM].splice(selectedPosition, 1);
            // setting new position            
            selectedPosition = (selectedPosition+1 >= menuSubTarget[topM].length) ? menuSubTarget[topM].length : selectedPosition+1;             
            menuSubTarget[topM].splice(selectedPosition, 0, {id: sId, name: sName, position: selectedPosition, type: sType});
            menuSubTarget[topM] = reassignPositions(menuSubTarget[topM]);

            makeMenuSubItems(menuSubTarget[topM]);
            // reselect item
            if (sName === '') {
                // if item is separator - rebuid ID
                sId = sId.substring(0,9) + '-' + selectedPosition;
            }
            let testID = sId.substring(0,7);
            if (testID === 'submenu') {
                // if item is separator - rebuid ID
                sId = testID + '-' + selectedPosition;
            }
            let rItem = rightContainer.querySelectorAll("div[data-id='"+ sId +"']");
            if (rItem[0]) {
                rItem[0].style.backgroundColor = '#0078d7';
                rItem[0].style.color = 'white';
                rItem[0].setAttribute('data-selected', 'true');
            }
        } else {
            // the window for messages
            let theWindow = BrowserWindow.getFocusedWindow();
            dialog.showMessageBoxSync(theWindow, {type: 'none', message: 'Please select an item first.', title:'No item selected', buttons:['OK']});
        }
    });

    // Right side of the window under subitem buttons ==========

    // open the dropdown menu with "Insert separator" & "Insert submenu"
    let insertMenu = document.getElementById("insertMenu");
    insertMenu.addEventListener('click', function toggleDropDown(event)
    {
        document.getElementById('inserMenuDropdown').classList.toggle("show");      
    });

    // Close the dropdown if the user clicks outside of it
    window.onclick = function(event) 
    {
        if (!event.target.matches('#insertMenu')) {
            var dropdowns = document.getElementsByClassName("dropdown-menu");
            for (let i = 0; i < dropdowns.length; i++) {
                var openDropdown = dropdowns[i];
                if (openDropdown.classList.contains('show')) {
                    openDropdown.classList.remove('show');
                }
            }
        }
    };

    // insert a new separator
    let insertSeparator = document.getElementById('insertSeparator');
    insertSeparator.addEventListener('click', function insertS(event) 
    {
        // get topMenu
        let topMenuIs = document.getElementById('targetCategory');
        let topM = topMenuIs.options[topMenuIs.selectedIndex].value;
        
        let rightContainer = document.getElementById('rightContainer');
        let selected = rightContainer.querySelectorAll("div[data-selected='true']");
        let selectedPosition;
        
        // is something selected ?
        if ( selected.length > 0 && selected[0]) {
            selectedPosition = selected[0].getAttribute('data-position');
            menuSubTarget[topM].splice(selectedPosition, 0, {id:'separator', name: '', type:'system', position: parseInt(selectedPosition)});
        } else {
            menuSubTarget[topM].splice(0, 0, {id:'separator', name: '', type:'system', position: 0});
        }
        
        makeMenuSubItems(menuSubTarget[topM]);
    });

    // insert submenu new submenu
    let insertSubmenu = document.getElementById('insertSubmenu');
    insertSubmenu.addEventListener('click', function(event)
    {
        // get topMenu
        let topMenuIs = document.getElementById('targetCategory');
        let topM = topMenuIs.options[topMenuIs.selectedIndex].value;
        
        let newTopMenuItemName = topM + ' | SubMenu';
        if (menuSubTarget[newTopMenuItemName] === void 0) {
            // insert the new subitem to the list so it can have elements
            menuSubTarget[newTopMenuItemName] = [];

            let rightContainer = document.getElementById('rightContainer');
            // is something selected ?
            let selected = rightContainer.querySelectorAll("div[data-selected='true']");

            // add the subitem to the current selection/subitem
            if ( selected.length > 0 && selected[0]) {
                let selectedPosition = selected[0].getAttribute('data-position');
                menuSubTarget[topM].splice(selectedPosition, 0, {id:'submenu', name: 'SubMenu', type:'submenu', position: parseInt(selectedPosition)});
            } 
            else {
                menuSubTarget[topM].splice(0, 0, {id:'submenu', name: 'SubMenu', type:'submenu', position: 0});
            }
            addItemToTopMenu(topM, 'SubMenu');
            menuSubTarget[topM] = reassignPositions(menuSubTarget[topM]);
            makeMenuSubItems(menuSubTarget[topM]);
            document.getElementById('targetCategory').value = topM;
        } else {
            // the window for messages
            let theWindow = BrowserWindow.getFocusedWindow();
            dialog.showMessageBoxSync(theWindow, {type: 'none', message: 'An item with the name already exists! Please rename it first.', title:'Item exists', buttons:['OK']});
        }
    });

    // rename submenu item
    let renameItem = document.getElementById('renameItem');
    renameItem.addEventListener('click', function renameItem(event)
    {                 
        // the window for messages
        let theWindow = BrowserWindow.getFocusedWindow();

        let rightContainer = document.getElementById('rightContainer');
        // is something selected ?
        let selected = rightContainer.querySelectorAll("div[data-selected='true']");
        if ( selected.length > 0 && selected[0]) {
            let currentName = selected[0].getAttribute('data-name');
            let currentType = selected[0].getAttribute('data-type');
            if (currentName !== '' && currentType !== 'separator') {
                // get topMenu
                let topMenuIs = document.getElementById('targetCategory');
                let topM = topMenuIs.options[topMenuIs.selectedIndex].value;
                ipcRenderer.send('renameItem', {'main': topM, 'name': currentName});
            } else {
                dialog.showMessageBoxSync(theWindow, {type: 'none', message: 'This item cannot be renamed', title:'Not possible', buttons:['OK']});
            }
        } else {
            dialog.showMessageBoxSync(theWindow, {type: 'none', message: 'Please select at least one item.', title:'No item selected', buttons:['OK']});
        }
    });
});