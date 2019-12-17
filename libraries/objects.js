/* eslint-disable no-console */
// numer of max elements (events) - to decide on it
require('events').EventEmitter.prototype._maxListeners = 35;
const EventEmitter = require('events');
const { dialog } = require('electron').remote;
const { ipcRenderer } = require('electron');
// get current window for making dialogs modals
const objectsWindow = require('electron').remote.getCurrentWindow();

const defaultSettings = require('./defaultSettings');
const helpers = require("./helpers");
const objectsHelpers = require("./objectsHelpers");
const conditions = require('./conditions');


var objects = 
{    
    // default styles
    fontFamily: defaultSettings.fontFamily,
    fontSize: defaultSettings.fontSize,
    // the container -- needed for dialog reset
    dialogDefaultData: {},
    // dialog ID
    dialogID: '',
    // the container -- needed for dialog status restore
    dialogCurrentData: {},
    // the container list -- needed for data update
    containersList: [],
    // the main paper
    paper: {},
    // list of all created objects
    objList: {},
    // helper for radiogroups
    radios: {},
    // main event thread
    events: new EventEmitter(),
    // command
    command: '',
    // dataframe data
    dataframes: {},
    // select data
    selectData: {},

    // create the main window & Raphael paper
    makeDialog: function(dialogID, container) 
    {            
        this.dialogID = dialogID;        
        if (((container.properties === void 0) == false) && helpers.hasSameProps(defaultSettings.dialog, container.properties)) 
        {
            let props = container.properties;
            // create a new raphael paper
            this.paper = Raphael('paper', props.width, props.height);
            this.paper.rect(1, 1, props.width - 1, props.height - 1).attr({'fill': '#FFFFFF', stroke: '#FFFFFF'});
        }

        // check if we have the Raphael paper and if we have elements to display
        if (this.paper.setSize && container.elements) {
            for (let key in container.elements) {
                this.makeObject(container.elements[key]);
            }
        }
        
        // build dialog command
        if(container.syntax !== void 0 && container.syntax.command != '') {
            this.makeCommand(container.syntax);
        }

        // listening for change event
        objects.events.on('iSpeak', function(data)
        {
            if(container.syntax !== void 0 && container.syntax.command != '') {
                objects.makeCommand(container.syntax);
            }
            
            objects.saveCurrentState(data);
            // save current state
            ipcRenderer.send('dialogCurrentStateUpdate', {name: dialogID, changes: objects.dialogCurrentData});
        });

        // register listener for executing the command
        objects.events.on('iSpeakButton', function(data)
        {            
            if (data.type == "run"){
                // send the command to main
                ipcRenderer.send('runCommand', objects.command);
            } else if (data.type == "reset") {
                dialog.showMessageBox(objectsWindow, {type: "question", message: "Are you sure you want to reset the dialog?", title: "Reset dialog", buttons: ["No", "Yes"]}, (response) => {
                    if (response) {
                      objects.changeDialogState(objects.dialogDefaultData, false);  
                      // reset also state
                      objects.dialogCurrentData = {};
                      ipcRenderer.send('dialogCurrentStateUpdate', {name: objects.dialogID, changes: objects.dialogCurrentData});
                    }
                });
            }
        });
    },

    // create an object based on it's type
    makeObject: function(obj) 
    {
        
        let elType = obj.type.toLowerCase();
        switch(elType) {
            case "button": 
                this.button.call(this.paper, obj, elType);
                break;
            case "checkbox":
                this.checkBox.call(this.paper, obj, elType);
                break;
            case "container": 
                this.container.call(this.paper, obj, elType);
                break;
            case "counter": 
                this.counter.call(this.paper, obj, elType);
                break;
            case "input":
                this.input.call(this.paper, obj, elType);
                break;
            case "label": 
                this.label.call(this.paper, obj, elType);
                break;
            case "plot": 
                this.plot.call(this.paper, obj, elType);
                break;
            case "radio": 
                this.radio.call(this.paper, this.radios, obj, elType);
                break;
            case "select": 
                this.select.call(this.paper, obj, elType, new EventEmitter(), ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5', 'Item 6']);
                break;
            case "separator": 
                this.separator.call(this.paper, obj, elType);
                break;
            case "slider": 
                this.slider.call(this.paper, obj, elType);
                break;
        }
    },

    // build the dialog command
    makeCommand: function(syntax)
    {
        let command = syntax.command;
        // let previewCommand = objectsHelpers.updateCommand(command, syntax.defaultElements);
        
        // {name}
        let regex = /({[a-z0-9]+})/g;
        let elements = command.match(regex);
        for(let i = 0; i < elements.length; i++) {
            let name = elements[i].substring(1, elements[i].length-1);
            let elementValue = objectsHelpers.getCommandElementValue(objects.objList, objects.radios, name);
            // console.log(elementValue);
            
            command = objectsHelpers.updateCommand(command, syntax.defaultElements, name, elements[i], elementValue);
            // previewCommand = previewCommand.replace(elements[i], elementValue);                       
        }
        // update dialog comand
        objects.command = command;        
        // this.events.emit('commandUpdate', command);
        ipcRenderer.send('dialogCommandUpdate', command);
    },

    // change the dialog state - reset to default or update to old state
    changeDialogState: function(data, saveCurrent)
    {
        for (let element in data) {
                            
            if ( objects.objList[element] !== void 0) {
                // reinitalizing do not emit events
                objects.objList[element].initialize = true;
                let theEl = data[element];
                for (let prop in theEl) {
                    switch(prop){
                        case 'visible':
                            if (theEl[prop]) { objects.objList[element].show(); } else { objects.objList[element].hide(); }
                            break;
                        case 'enabled':
                            if (theEl[prop]) { objects.objList[element].enable(); } else { objects.objList[element].disable(); }
                            break;
                        case 'checked':
                            if (theEl[prop]) { objects.objList[element].check(); } else { objects.objList[element].uncheck(); }
                            break;
                        case 'value':
                            objects.objList[element].setValue(theEl[prop]);
                            break;
                        case 'selected':                           
                            if (theEl[prop]) { objects.objList[element].select(); } else { objects.objList[element].deselect(); }
                            break;
                    }
                }
            }
        }
        // save the state if we already have one
        if (saveCurrent) {
            objects.dialogCurrentData = data;
            ipcRenderer.send('dialogCurrentStateUpdate', {name: objects.dialogID, changes: objects.dialogCurrentData});
        }
    },
    // save elements current state - modify object.dialogCurrentData
    saveCurrentState: function(data)
    {        
        if (data.name && data.status) {
            
            objects.dialogCurrentData[data.name] = {visible: objects.objList[data.name].visible};
            
            // does it have the enable property
            if (objects.objList[data.name].enabled) {
                objects.dialogCurrentData[data.name].enabled = objects.objList[data.name].enabled;
            }
            
            switch(data.status){
                case 'check': 
                case 'uncheck':
                    objects.dialogCurrentData[data.name].checked = objects.objList[data.name].checked;
                    break;
                case 'value':
                    if (Array.isArray(objects.objList[data.name].value)) {
                        objects.dialogCurrentData[data.name].value = [];
                    } else {
                        objects.dialogCurrentData[data.name].value = '';
                    }
                    objects.dialogCurrentData[data.name].value = objects.objList[data.name].value; 
                    break;
                case 'select':
                case 'deselect':
                    objects.dialogCurrentData[data.name].selected = objects.objList[data.name].selected;
                    break;
            }
        }        
    },

    // shift key pressed event - container multiselect
    keyPressedEvent: function(theKey, theStatus)
    {
        objects.events.emit('keyTriggered', {key: theKey, status: theStatus});
    },

    // new data from R - anounce objects
    incommingDataFromR: function(data)
    {   
        if (data !== void 0) {
            // do we have dataframes
            if (data.dataframe !== void 0) {
                this.dataframes = data.dataframe;
                objects.events.emit('containerData', this.dataframes);
            }
            // do we have R objects (martix, vectors, etc.)
            if (data.select !== void 0) {
                this.selectData = data.select;
                objects.events.emit('selectData', this.selectData);
            }
        }
    },
    // TODO -- to verify and delete
    // update current data 
    // incommingUpdateDataFromR: function(data)
    // {
    //     // TODO --- container does not save selected value to be fixed; add also for selects to set the value again
    //     console.log(data);
    //     console.log(objects.dialogCurrentData);
    //     console.log(objects.containersList);
        
    //     if (data.dataframes !== void 0) {
    //         for ( let key in data.dataframes) {
    //             if (this.dataframes[key] === void 0) {
    //                 this.dataframes[key] = {};
    //             }
    //             this.dataframes[key] = data.dataframes[key];
    //         }
    //         objects.events.emit('containerData', this.dataframes);


    //         for (let i = 0;i < objects.containersList.length; i++) {
    //             // reseting values
    //             console.log(objects.dialogCurrentData[objects.containersList[i]]);
                
    //             // if (objects.dialogCurrentData[objects.containersList[i]] !== void 0) {
    //             //     objects.dialogCurrentData[objects.containersList[i]].setValue(objects.dialogCurrentData[objects.containersList[i]].value);
    //             // }
    //         }
    //     } 
    //     else if (data.selectData !== void 0) {
    //         for ( let key in data.selectData) {
    //             if (this.selectData[key] === void 0) {
    //                 this.selectData[key] = {};
    //             }
    //             this.selectData[key] = data.selectData[key];
    //         }
    //         objects.events.emit('selectData', this.selectData);
    //     }
    // },
    
    // Elements 
    // =================================================================
    
    // the button element
    button: function(obj, type)
    {
        // return if the received object is not corect;
        if(!helpers.hasSameProps(defaultSettings[type], obj)) { return false; }

        let button = {
            name: obj.name,
            visible: (obj.isVisible == 'true') ? true : false,
            enabled: (obj.isEnabled == 'true') ? true : false,
            element: {},
            conditions: objects.conditionsParser(obj.conditions),
            initialize: true,
            click: obj.onClick,
        };
        // save default values
        objects.dialogDefaultData[obj.name] = {visible: button.visible, enabled: button.enabled};

        // data to int
        let dataLeft = parseInt(obj.left);
        let dataTop = parseInt(obj.top);

        // get the button's width
        let lBBox = objectsHelpers.getTextDim(this, obj.label, objects.fontSize, objects.fontFamily);

        let elButton = {};
        elButton.rect = this.rect(dataLeft, dataTop, Math.round(lBBox.width)+20, Math.round(lBBox.height) + 10).attr({fill: "#FFFFFF", "stroke": "#5d5d5d", "stroke-width": 1});
        elButton.txt = this.text(dataLeft+10, dataTop + ((Math.round(lBBox.height) / 2) + 5), obj.label).attr({"text-anchor": "start", "font-size": objects.fontSize, "font-family": objects.fontFamily});

        elButton.cover = this.rect(dataLeft, dataTop, Math.round(lBBox.width)+20, Math.round(lBBox.height) + 10).attr({fill: "#FFFFFF", stroke: "none", "fill-opacity": 0, "cursor": "pointer"});
        elButton.cover.click(function() 
        {
            // if enable emit event with command (run or reset)      
            if(button.enabled) {            
                objects.events.emit('iSpeakButton', {name: button.name, type: button.click});
            }
        });

        button.element = elButton;

        // listen for events / changes
        objects.events.on('iSpeak', function(data)
        {
            if(obj.name != data.name){
                objects.conditionsChecker(data, button);
            }
        });

        // Button's properties
        button.show = function(){
            button.visible = true;
            for( let i in button.element){
                button.element[i].show();
            }
            //  emit event only if already intialized
            if(!button.initialize) {
                objects.events.emit('iSpeak', {name: button.name, status: 'show'});
            }
        };
        button.hide = function(){
            button.visible = false;
            for( let i in button.element){
                button.element[i].hide();
            }
            //  emit event only if already intialized
            if(!button.initialize) {
                objects.events.emit('iSpeak', {name: button.name, status: 'hide'});
            }
        };
        button.enable = function() {
            button.enabled = true;
            button.element.rect.attr({fill: "#FFFFFF", opacity: 1});
            button.element.txt.attr({opacity: 1});
            button.element.cover.attr({'cursor': 'pointer'});
            //  emit event only if already intialized
            if(!button.initialize) {
                objects.events.emit('iSpeak', {name: button.name, status: 'enable'});
            }
        };
        button.disable = function() {
            button.enabled = false;
            button.element.rect.attr({fill: "#cccccc", stroke: "#848484"});
            button.element.txt.attr({fill: "#848484"});
            button.element.cover.attr({'cursor': 'default'});
            //  emit event only if already intialized
            if(!button.initialize) {
                objects.events.emit('iSpeak', {name: button.name, status: 'disable'});
            }
        };

        // initialize
        if(button.visible) { 
            button.show();
        } else {
            button.hide();
        }
        if(button.enabled) {
            button.enable();
        } else {
            button.disable();
        }        
        // set to false - we have initialized the element
        button.initialize = false;

        // add the element to the main list
        objects.objList[obj.name] = button;
    },

    // the checkbox element
    checkBox: function(obj, type) 
    {    
        // return if the received object is not corect;
        if(!helpers.hasSameProps(defaultSettings[type], obj)) { return false; }

        // x, y, isChecked, label, pos, dim, fontsize
        // checking / making properties
        if (helpers.missing(obj.top)) { obj.top = 10; }
        if (helpers.missing(obj.left)) { obj.left = 10; }
        if (helpers.missing(obj.isChecked)) { obj.isChecked = false; }
        if (helpers.missing(obj.label)) { obj.label = ""; }
        if (helpers.missing(obj.pos)) { obj.pos = 3; }
        if (helpers.missing(obj.dim)) { obj.dim = 12; }
        if (helpers.missing(obj.fontsize)) { obj.fontsize = objects.fontSize; }
        
        let checkBox = {
            name: obj.name,
            visible: (obj.isVisible == 'true') ? true : false,
            checked: (obj.isChecked == 'true') ? true : false,
            enabled: (obj.isEnabled == 'true') ? true : false,
            element: {},
            conditions: objects.conditionsParser(obj.conditions),
            initialize: true,
        };
        // save default values
        objects.dialogDefaultData[obj.name] = {visible: checkBox.visible, checked: checkBox.checked, enabled: checkBox.enabled};

        var cbElement = {};     
    
        // checkbox label - position
        var txtanchor = "start";
        var xpos = parseInt(obj.left);
        var ypos = parseInt(obj.top);
        if (obj.pos == 1) { // left
            xpos -= 8;
            ypos += obj.dim / 2;
            txtanchor = "end";
        }
        else if (obj.pos == 2) { // below
            xpos += obj.dim / 2;
            ypos -= obj.dim;
            txtanchor = "middle";
        }
        else if (obj.pos == 3) { // right
            xpos += 20;
            ypos += obj.dim / 2;
        }
        else { // top
            xpos += obj.dim / 2;
            ypos += 27;
            txtanchor = "middle";
        }
        // the label
        cbElement.label = this.text(xpos, ypos, obj.label).attr({"text-anchor": txtanchor, "font-size": (obj.fontsize + "px"), "font-family": objects.fontFamily, "cursor": "default"});
        // the box        
        cbElement.box = this.rect(parseInt(obj.left), parseInt(obj.top), obj.dim, obj.dim).attr({fill: (checkBox.checked ? "#97bd6c" : "#eeeeee"), "stroke-width": 1, stroke: "#5d5d5d"});
        // the checked 
        cbElement.chk = this.path([
            ["M", parseInt(obj.left) + 0.2*obj.dim, parseInt(obj.top) + 0.3*obj.dim],
            ["l", 0.15*obj.dim*2, 0.2*obj.dim*2],
            ["l", 0.3*obj.dim*2, -0.45*obj.dim*2]
        ]).attr({"stroke-width": 2});
        
        // the cover needs to be drawn last, to cover all other drawings (for click events)
        cbElement.cover = this.rect(parseInt(obj.left), parseInt(obj.top), obj.dim, obj.dim)
            .attr({fill: "#fff", opacity: 0, cursor: "pointer"})
            .click(function() {
                // if the element is enabled
                if (checkBox.enabled) {
                    // the element
                    checkBox.checked = !checkBox.checked;
                    // the cover
                    this.checked = checkBox.checked;
                    
                    if (checkBox.checked) {
                        // the element is checked
                        cbElement.box.attr({fill: "#97bd6c"});
                        cbElement.chk.show();
                        objects.events.emit('iSpeak', {name: obj.name, status: 'check'});
                    } else {
                        // the element is unchecked
                        cbElement.box.attr({fill: "#eeeeee"});
                        cbElement.chk.hide();
                        objects.events.emit('iSpeak', {name: obj.name, status: 'uncheck'});
                    }
                }
            });
        
        cbElement.cover.checked = true;

        checkBox.element = cbElement;
        
        // listen for events / changes
        objects.events.on('iSpeak', function(data)
        {
            if(data.name != obj.name) {
                objects.conditionsChecker(data, checkBox);
            }
        });
        
        // Checkbox's properties
        checkBox.enable = function() {
            checkBox.enabled = true;
            checkBox.element.cover.active = true;
            checkBox.element.cover.attr({cursor: "pointer"});
            cbElement.box.attr({fill: (checkBox.checked ? "#97bd6c" : "#eeeeee"), stroke: "#5d5d5d"});
            cbElement.label.attr({fill: "#000000"});
            cbElement.chk.attr({stroke: "#000000"});
            //  emit event only if already intialized
            if(!checkBox.initialize) {
                objects.events.emit('iSpeak', {name: obj.name, status: 'enable'});
            }
        };
        // checkbox is not enabled
        checkBox.disable = function() {
            checkBox.enabled = false;
            checkBox.element.cover.active = false;
            checkBox.element.cover.attr({cursor: "default"});
            cbElement.box.attr({fill: "#cccccc", stroke: "#848484"});
            cbElement.label.attr({fill: "#848484"});
            cbElement.chk.attr({stroke: "#848484"});
            //  emit event only if already intialized
            if(!checkBox.initialize) {
                objects.events.emit('iSpeak', {name: obj.name, status: 'disable'});
            }
        };
        // checkbox is checked
        checkBox.check = function() {
            checkBox.checked = true;
            checkBox.element.box.attr({fill: "#97bd6c"});
            checkBox.element.chk.show();
            checkBox.element.cover.checked = true;
            //  emit event only if already intialized
            if(!checkBox.initialize) {
                objects.events.emit('iSpeak', {name: obj.name, status: 'check'});
            }
        };
        // checkbox is not checked
        checkBox.uncheck = function() {
            checkBox.checked = false;
            checkBox.element.box.attr({fill: "#eeeeee"});
            checkBox.element.chk.hide();
            checkBox.element.cover.checked = false;
            //  emit event only if already intialized
            if(!checkBox.initialize) {            
                objects.events.emit('iSpeak', {name: obj.name, status: 'uncheck'});
            }
        };
        // checkbox is visible
        checkBox.show = function() {
            checkBox.element.cover.show();
            checkBox.element.box.show();
            
            if (checkBox.checked) {
                checkBox.element.chk.show();
            } else {
                checkBox.element.chk.hide();
            }
            checkBox.element.label.show();
            //  emit event only if already intialized
            if(!checkBox.initialize) {
                objects.events.emit('iSpeak', {name: obj.name, status: 'show'});
            }
        };
        // checkbox is not visible
        checkBox.hide = function() {
            checkBox.element.cover.hide();
            checkBox.element.box.hide();
            checkBox.element.chk.hide();
            checkBox.element.label.hide();
            //  emit event only if already intialized
            if(!checkBox.initialize) {
                objects.events.emit('iSpeak', {name: obj.name, status: 'hide'});
            }
        };

        // Initialize      
        if (checkBox.checked) {
            checkBox.check();
        } else {
            checkBox.uncheck();
        }
        if (checkBox.enabled) {
            checkBox.enable();
        } else {
            checkBox.disable();
        }
        if (checkBox.visible) {
            checkBox.show();
        } else {
            checkBox.hide();
        }

        // set to false - we have initialized the element
        checkBox.initialize = false;

        // add the element to the main list
        objects.objList[obj.name] = checkBox;
    },

    // the container element
    container: function(obj, type)
    {       
        // return if the received object is not corect;
        if(!helpers.hasSameProps(defaultSettings[type], obj)) { return false; }

        let container = {
            name: obj.name,
            type: obj.objViewClass,
            parent: obj.parentContainer,
            visible: (obj.isVisible == 'true') ? true : false,
            enabled: (obj.isEnabled == 'true') ? true : false,
            element: {},
            conditions: objects.conditionsParser(obj.conditions),
            initialize: true,
            // multiple items can be selected
            value: [],
            shiftKey: false,
            data: {}, 
            listLength: 0,
            variableType: obj.variableType.toLowerCase()
        };

        // save default values
        objects.dialogDefaultData[obj.name] = {visible: container.visible, value: [], enabled: container.enabled};
        // save the name
        objects.containersList.push(obj.name);

        // data to int
        let dataLeft = parseInt(obj.left);
        let dataTop = parseInt(obj.top);
        // check for user input
        if(obj.width < 50) { obj.width = 50; }
        else if(obj.width > paper.width - 15) { obj.width = paper.width - 30; dataLeft = 15;}

        if(obj.height < 50) { obj.height = 50; }
        else if(obj.height > paper.height - 15) { obj.height = paper.height - 30; dataTop = 15; }

        // draw rectangle till we have data
        container.element = this.rect(dataLeft, dataTop, obj.width + 6, obj.height).attr({fill: "#ffffff", "stroke": "#5d5d5d", "stroke-width": 1});
        // The containers's element list paper support
        // ===============================================================================
        const listSupport = {
            div: document.createElement("div"),
            paper: {},
            selectElements: {},
            makeSupport: function(noElements) {
                // make hight for div, svg and rect
                let divWidth = (obj.height > noElements * 25 + 11) ? obj.width + 4 : obj.width + 4;
                let svgHeight = (obj.height < noElements * 25 + 11) ? noElements * 25 + 10 : obj.height - 2;

                listSupport.div.style.position = "absolute";
                listSupport.div.style.top = (dataTop + 4) + 'px';
                listSupport.div.style.left = (dataLeft + 16) + 'px';
                // listSupport.div.style.backgroundColor = '#FF0000';
                listSupport.div.style.width = (divWidth + 1) + 'px';
                listSupport.div.style.height = (obj.height - 1) + 'px';
                //  make object scroll Y if needed
                if(obj.height < noElements * 25 + 11) {
                    listSupport.div.id = 'container-' + obj.name;
                    listSupport.div.className = 'scrollbarStyle';
                } else {
                    listSupport.div.style.border = '1px';
                    listSupport.div.style.borderColor = '#5d5d5d';
                    listSupport.div.style.borderStyle = 'solid';
                }

                // hide initial rectangle
                if (typeof container.element.hide === 'function') {
                    container.element.hide();
                }
                // if we already have a paper we have to remove it first
                if (typeof listSupport.paper.remove === 'function') {
                    listSupport.paper.remove();
                }

                let newPaper = Raphael(listSupport.div, obj.width + 2, svgHeight);
                listSupport.selectElements = newPaper.rect(1, 1, obj.width, svgHeight).attr({fill: container.enabled ? "#FFFFFF" : "#cccccc", "stroke-width": 0}).toFront();

                // append div to original|main paper
                document.getElementById('paper').appendChild(listSupport.div);
                
                // save paper referance for later use
                listSupport.paper = newPaper;               
            }
        };

        // The containers's listeners
        // ===============================================================================
        objects.events.on('iSpeak', function(data) // changes
        {
            if(obj.name != data.name){
                objects.conditionsChecker(data, container);
            }
        });
        objects.events.on('containerData', function(data) // new data
        {
            if(obj.name != data.name){
                container.data = (data.data === void 0) ? data : data.data;                
                if (container.type === 'dataSet' && data.name === void 0) {                    
                    container.makeDataSetList(data);
                } else if (container.type === 'variable' && container.parent == data.name) { // variable container and triggered by dataSet container
                    container.makeVarialeSetList(data);
                }
            }
        });        
        objects.events.on('keyTriggered', function(data) // key pressed
        {
            if(data.key === 'Shift') {
                container.shiftKey = data.status;
            }
        });

        // The containers's element list
        // ===============================================================================
        let selectedElementsList = [];
        let txt = [];
        let bg = [];
        let cover = [];
        let listLength = 0;
        let selectedDataset = '';

        // on click element
        let elClicked = function() {             
            // active only if container is enable
            if(container.enabled)
            {
                let isOn = this.data('clicked');
                let valueName = this.data('elName');            
                let position = this.data('position');            
                
                // if shift key presed | only vor variables
                if(container.shiftKey && container.type == 'variable') {
                    // if we have already selected at least an element
                    if ( selectedElementsList.length > 0) {
                                
                        let first = selectedElementsList[0];
                        selectedElementsList.length = 0;
                        container.value.length = 0;

                        // deselect everything
                        for(let i = 0; i < listLength; i++) {
                            cover[i].data('clicked', 0);
                            bg[i].attr({opacity: 0});
                        }

                        if (position >= first) {
                            for(let i = first; i <= position; i++) {
                                cover[i].data('clicked', 1);
                                bg[i].attr({opacity: 1});
                                selectedElementsList.push(i);
                                container.value.push(cover[i].data('elName'));
                            }   
                        } else if (position < first) {
                            for(let i = position; i <= first; i++) {
                                cover[i].data('clicked', 1);
                                bg[i].attr({opacity: 1});
                                selectedElementsList.push(i);
                                container.value.push(cover[i].data('elName'));
                            }
                        }
                        // sort selected elements
                        selectedElementsList.sort((a, b)=>{
                            return a < b;
                        });

                    } else {
                        this.data('clicked', 1);
                        bg[position].attr({opacity: 1});
                        // save|add the name of the selected
                        container.value.push(valueName);
                        selectedElementsList.push(position);
                    }
                } else {
                    
                    if(!isOn) {
                        // save|add the name of the selected
                        if(container.type === 'variable') {                            
                            container.value.push(valueName);
                            selectedElementsList.push(position);
                        } else {
                            // for dataFrames you can select only one value
                            container.value = [valueName];
                            selectedElementsList = [position]; 
                            for(let i = 0; i < listLength; i++) {
                                cover[i].data('clicked', 0);
                                bg[i].attr({opacity: 0});
                            }
                        }
                        this.data('clicked', 1);
                        bg[position].attr({opacity: 1});
                    } else {
                        this.data('clicked', 0);
                        bg[position].attr({opacity: 0});
                        // remove the unselected item
                        if(container.type === 'variable') {
                            container.value = helpers.removeValueFromArray(container.value, valueName);
                            selectedElementsList = helpers.removeValueFromArray(selectedElementsList, position);
                        } else {
                            // for dataFrames you can select only one value
                            container.value.length = 0;
                            selectedElementsList.length = 0;
                        }
                    }
                    // something selected / deselected 
                }     
                objects.events.emit('containerData', {name: container.name, data: container.data, selected: container.value});            
                objects.events.emit('iSpeak', {name: container.name, status: 'value'});            
            }
        };
        // dataSet list
        container.makeDataSetList = function(data)
        {            
            // get dataframes
            let list = Object.keys(data);

            // make paper for list
            listSupport.makeSupport(list.length);
            let newPaper = listSupport.paper;           

            listLength = list.length;
            container.listLength = list.length;
            
            let position = 15;
            // populate the list
            for(let i = 0; i < list.length; i++) {                
                bg[i] = newPaper.rect(3 , position-10, obj.width - 5, 25).attr({fill: "#79a74c", "opacity": 0, "cursor": "pointer", stroke: 0});
                txt[i] = newPaper.text(11, position+3, list[i]).attr({"text-anchor": "start", "font-size": objects.fontSize, "font-family": objects.fontFamily, fill: container.enabled ? '#000000' : '#848484'});
                // save the name of the
                cover[i] = newPaper.rect(3 , position-10, obj.width - 5, 25).attr({fill: "#eeeeee", opacity: 0, stroke: 0, cursor: container.enabled ? "pointer" : "default"})
                                .data('clicked', 0)
                                .data('elName', list[i])
                                .data('position', i);
                position += 25;
            }         

            // add click events for elements
            for(let i = 0; i < cover.length; i++) {
                 cover[i].click(elClicked);
            }
            // TODO -- check if okay
            // set the value if there is any data
            if (objects.dialogCurrentData[container.name] !== void 0) {
                container.setValue(objects.dialogCurrentData[container.name].value);
            }
        };
        // variable list
        container.makeVarialeSetList = function(data)
        {
            // data.data (we have some datasets)
            if (Object.keys(data.data).length === 0 ){
                return;
            }
        
            // reseting current selection if the element exists
            // not just opened and is different
            if (selectedDataset !== '' && selectedDataset !== data.selected[0]) {
                if (objects.dialogCurrentData[container.name] !== void 0) {
                    objects.dialogCurrentData[container.name].value.length = 0;
                }
            }
            // set the current selected dataset
            selectedDataset = data.selected[0];
            
            // get dataframes
            let list = [];
            for (let i = 0; i < data.selected.length; i++) {
                list.push(data.data[data.selected[i]].colnames);
            }
            // level one array
            list = list.flat(list.length);            
            listLength = list.length;
            container.listLength = list.length;

            // remove ald paper and div
            if (typeof listSupport.paper.remove === 'function') {
                listSupport.paper.remove();
                if(listSupport.div.parentNode != null) {
                    listSupport.div.parentNode.removeChild(listSupport.div);
                }
            }

            // do we have data?
            if(listLength == 0) {
                container.element.show();
            } else {
                listSupport.makeSupport(listLength);
                let newPaper = listSupport.paper;
                
                let position = 15;
                // populate the list
                for(let i = 0; i < listLength; i++) {
                    bg[i] = newPaper.rect(3 , position-10, obj.width - 5, 25).attr({fill: "#79a74c", "opacity": 0, "cursor": "pointer", stroke: 0});
                    txt[i] = newPaper.text(11, position+3, list[i]).attr({"text-anchor": "start", "font-size": objects.fontSize, "font-family": objects.fontFamily, fill: container.enabled ? '#000000' : '#848484'});
                    // save the name of the
                    cover[i] = newPaper.rect(3 , position-10, obj.width - 5, 25).attr({fill: "#eeeeee", opacity: 0, stroke: 0, cursor: container.enabled ? "pointer" : "default"})
                                    .data('clicked', 0)
                                    .data('elName', list[i])
                                    .data('position', i);
                    // listSet.push( txt[i], cover[i] );
                    position += 25;
                }         

                // TODO -- check if okay
                // set the value if there is any data
                if (objects.dialogCurrentData[container.name] !== void 0) {                                       
                    container.setValue(objects.dialogCurrentData[container.name].value);
                }   

                // add click events for elements
                for(let i = 0; i < cover.length; i++) {
                    if (data.data[selectedDataset][container.variableType][i]) {
                        cover[i].click(elClicked);
                    } else {
                        cover[i].attr({cursor: 'default'});                        
                        bg[i].attr({fill: "#eeeeee", opacity: 1, "cursor": "default"});
                    }
                }  
            }     
        };

        // the container's properties
        container.setValue = function(val) { // more like a clear selected values for dataSet containers - variable do not have data without dataSets
            
                if (val.length === 0) {
                    container.value.length = 0;
                    selectedElementsList.length = 0;
                    for(let i = 0; i < container.listLength; i++) {
                        cover[i].data('clicked', 0);
                        bg[i].attr({opacity: 0});
                    }
                    if (container.type === 'dataSet') {
                        objects.events.emit('containerData', {name: container.name, data: container.data, selected: []});
                    }
                } else {
                    container.value = val;
                    for(let i = 0; i < container.listLength; i++) {
                        if (val.includes(cover[i].data('elName'))) {
                            cover[i].data('clicked', 1);
                            bg[i].attr({opacity: 1});
                            selectedElementsList.push(i);
                        }
                    }
                    if (container.type === 'dataSet') {
                    // TODO -- check if we need to emit the current state event
                        objects.events.emit('containerData', {name: container.name, data: container.data, selected: val});
                    }
                }
        };   
        container.show = function() {
            // container.element.show();
            listSupport.div.style.display = 'block';
            //  emit event only if already intialized
            if(!container.initialize) {
                objects.events.emit('iSpeak', {name: container.name, status: 'show'});
            }
        };
        container.hide = function(){
            listSupport.div.style.display = 'none';
            // container.element.hide();
            //  emit event only if already intialized
            if(!container.initialize) {
                objects.events.emit('iSpeak', {name: container.name, status: 'hide'});
            }
        };
        container.enable = function() {
            container.enabled = true;
            container.element.attr({fill: "#FFFFFF"});
            
            for(let i = 0; i < listLength; i++) {
                cover[i].attr({'cursor':'pointer'});
                txt[i].attr({fill: "#000000"});
            }
            if (typeof listSupport.selectElements.attr === 'function') {
                listSupport.selectElements.attr({fill: "#ffffff"});
            }

            listSupport.div.style.backgroundColor = '#FFFFFF';

            //  emit event only if already intialized
            if(!container.initialize) {
                objects.events.emit('iSpeak', {name: container.name, status: 'enable'});
            }
        };
        container.disable = function() {
            container.enabled = false;
            container.element.attr({fill: "#cccccc", stroke: "#848484"});

            for(let i = 0; i < listLength; i++) {
                cover[i].attr({'cursor':'default'});
                txt[i].attr({fill: "#848484"});
            }
            if (typeof listSupport.selectElements.attr === 'function') {
                listSupport.selectElements.attr({fill: "#cccccc", stroke: "#848484"});
            }

            listSupport.div.style.backgroundColor = '#cccccc';
            
            //  emit event only if already intialized
            if(!container.initialize) {
                objects.events.emit('iSpeak', {name: container.name, status: 'disable'});
            }
        };

        // initialize
        if(container.visible) { 
            container.show();
        } else {
            container.hide();
        }
        if(container.enabled) {
            container.enable();
        } else {
            container.disable();
        }               

        // set to false - we have initialized the element
        container.initialize = false;

        // add the element to the main list
        objects.objList[obj.name] = container;     
    },

    // the counter element
    counter: function(obj, type) 
    {
        // return if the received object is not corect;
        if(!helpers.hasSameProps(defaultSettings[type], obj)) { return false; }

        let counter = {
            name: obj.name,
            visible: (obj.isVisible == 'true') ? true : false,
            enabled: (obj.isEnabled == 'true') ? true : false,
            value: parseInt(obj.startval),
            min: parseInt(obj.startval),
            max: parseInt(obj.maxval),
            element: {},
            conditions: objects.conditionsParser(obj.conditions),
            initialize: true,
            paper: this,
        };

        // save default values
        objects.dialogDefaultData[obj.name] = {visible: counter.visible, value: counter.value, enabled: counter.enabled};        

        // obj properties
        if (helpers.missing(obj.fontsize)) { obj.fontsize = objects.fontSize; } else { obj.fontsize = obj.fontsize + "px"; }
        if (helpers.missing(obj.width)) { obj.width = 20; }
        
        let elCounter = {};      
        
        // data to int
        let dataLeft = parseInt(obj.left) + 22;
        let dataTop = parseInt(obj.top) ;
        
        let txtanchor = "middle";
        
        elCounter.textvalue = this.text(dataLeft, dataTop, "" + obj.startval)
            .attr({"text-anchor": txtanchor, "font-size": obj.fontsize, "font-family": objects.fontFamily});
        
        elCounter.downsign = this.path([
            ["M", dataLeft - 12 - obj.width / 2, dataTop - 6],
            ["l", 12, 0],
            ["l", -6, 12],
            ["z"]
        ]).attr({fill: "#79a74c", "stroke-width": 1, stroke: "#5d5d5d"});
        
        elCounter.upsign = this.path([
            ["M", dataLeft + obj.width / 2, dataTop + 6],
            ["l", 12, 0],
            ["l", -6, -12],
            ["z"]
        ]).attr({fill: "#79a74c", "stroke-width": 1, stroke: "#5d5d5d"});
        
        // listen for events / changes - must be declared before thee emit events
        objects.events.on('iSpeak', function(data)
        {
            if(obj.name != data.name){
                objects.conditionsChecker(data, counter);
            }
        }); 

        elCounter.down = this.rect((dataLeft - (obj.width / 2)) - 14, dataTop - 7, 15, 15)
            .attr({fill: "#fff", opacity: 0,cursor: "pointer"})
            .click(function() {
                if(counter.enabled) {
                    if (counter.value > counter.min) {
                        counter.value -= 1;
                        elCounter.textvalue.attr({"text": ("" + counter.value)});
                        // say that the value has changed
                        objects.events.emit('iSpeak', {name: counter.name, status: 'value'});
                    }
                }
            });
        
        elCounter.up = this.rect((dataLeft + (obj.width / 2)) - 2, dataTop - 7, 15, 15)
            .attr({fill: "#fff", opacity: 0, cursor: "pointer"})
            .click(function() {
                if(counter.enabled) {
                    if (counter.value < counter.max) {
                        counter.value += 1;
                        elCounter.textvalue.attr({"text": ("" + counter.value)});
                        // say that the value has changed
                        objects.events.emit('iSpeak', {name: counter.name, status: 'value'});
                    }
                }
            });

        counter.element = elCounter;   

        // the counter's methods
        counter.setValue = function(val) 
        {
            let newVal = parseInt(val);
            // check for valid value and limits
            if (isNaN(newVal) || newVal < counter.min || newVal > counter.max) {
                return;
            }
            // we should have a value
            if (typeof counter.element.textvalue.remove === 'function') {
                counter.element.textvalue.remove();
                counter.element.textvalue = counter.paper.text(dataLeft, dataTop, "" + newVal)
                .attr({"text-anchor": txtanchor, "font-size": obj.fontsize, "font-family": objects.fontFamily});
                counter.value = newVal;
            }
        };

        counter.show = function() {
            for (let i in counter.element){
                counter.element[i].show();
            }
            //  emit event only if already intialized
            if(!counter.initialize) {
                objects.events.emit('iSpeak', {name: counter.name, status: 'show'});
            }
        };
        counter.hide = function() {
            for (let i in counter.element){
                counter.element[i].hide();
            }
            //  emit event only if already intialized
            if(!counter.initialize) {
                objects.events.emit('iSpeak', {name: counter.name, status: 'hide'});
            }
        };

        counter.enable = function() {
            counter.enabled = true;
            counter.element.textvalue.attr({fill: '#000000'});
            counter.element.upsign.attr({fill: '#79a74c', stroke: "#5d5d5d"});
            counter.element.downsign.attr({fill: '#79a74c', stroke: "#5d5d5d"});
            counter.element.up.attr({'cursor': 'pointer'});
            counter.element.down.attr({'cursor': 'pointer'});
            //  emit event only if already intialized
            if(!counter.initialize) {
                objects.events.emit('iSpeak', {name: counter.name, status: 'enable'});
            }
        };
        counter.disable = function() {
            counter.enabled = false;
            counter.element.textvalue.attr({fill: '#848484'});
            counter.element.upsign.attr({fill: '#cccccc', stroke: "#848484"});
            counter.element.downsign.attr({fill: '#cccccc', stroke: "#848484"});
            counter.element.up.attr({'cursor': 'default'});
            counter.element.down.attr({'cursor': 'default'});
            //  emit event only if already intialized
            if(!counter.initialize) {
                objects.events.emit('iSpeak', {name: counter.name, status: 'disable'});
            }
        };
                
        // initialize
        if(counter.visible) {
            counter.show();
        } else {
            counter.hide();
        }
        if(counter.enabled) {
            counter.enable();
        } else {
            counter.disable();
        }        

        // set to false - we have initialized the element
        counter.initialize = false;

        // add the element to the main list
        objects.objList[obj.name] = counter;
    }, 

    // the input element
    input: function(obj, type)
    {
        // return if the received object is not corect;
        if(!helpers.hasSameProps(defaultSettings[type], obj)) { return false; }

        let input = {
            name: obj.name,
            value: obj.value,
            visible: (obj.isVisible == 'true') ? true : false,
            enabled: (obj.isEnabled == 'true') ? true : false,
            element: {},
            conditions: objects.conditionsParser(obj.conditions),
            initialize: true,
            paper: this,
            width: obj.width,
        };

        // save default values
        objects.dialogDefaultData[obj.name] = {visible: input.visible, value: input.value, enabled: input.enabled};

        // data to int
        let dataLeft = parseInt(obj.left);
        let dataTop = parseInt(obj.top);

        let elinput = {};
        elinput.rect = this.rect(dataLeft, dataTop, obj.width, 25).attr({fill: "#ffffff", "stroke": "#5d5d5d", "stroke-width": 1});

        elinput.cover = this.rect(dataLeft, dataTop, obj.width, 25).attr({fill: "#ffffff", stroke: "none", opacity: 0, "cursor": "text"});
        elinput.cover.click(function() 
        {
            if(input.enabled) {
                objectsHelpers.customInput(obj.width - 10, 19, dataLeft+22, dataTop+7, input.value, input.paper, objects.fontSize, objects.fontFamily).then((result) => {
                    input.setValue(result);                    
                });
            }
        }); 

        input.element = elinput;

        // listen for events / changes
        objects.events.on('iSpeak', function(data)
        {
            if(obj.name != data.name){
                objects.conditionsChecker(data, input);
            }
        });

        // the input's methods
        input.setValue = function(val) 
        {    
            // remove previous element 
            if(typeof input.element.txt === 'object' && typeof input.element.txt.remove === "function") {
                input.element.txt.remove();                
            }
            // check if the new text is bigger then the input an trim if so
            let newValDim = objectsHelpers.getTextDim(input.paper, val, objects.fontSize, objects.fontFamily);
            
            let newText = (newValDim.width < input.width) ? val :  objectsHelpers.limitTextOnWidth(val, input.width, input.paper, objects.fontSize, objects.fontFamily) + '...';
            input.element.txt = input.paper.text(dataLeft+5, dataTop + 12, newText).attr({"text-anchor": "start", "font-size": objects.fontSize, "font-family": objects.fontFamily});
            // make it editable
            input.element.txt.click(function(){
                if(input.enabled) {
                    objectsHelpers.customInput(obj.width - 10, 19, dataLeft+22, dataTop+7, input.value, input.paper, objects.fontSize, objects.fontFamily).then((result) => {
                        input.setValue(result);                    
                    });
                }
            });
            // save full new value
            input.value = val;
            if(!input.initialize) {
                objects.events.emit('iSpeak', {name: input.name, status: 'value'});
            }
        };
        input.show = function()
        {
            for( let i in input.element){
                input.element[i].show();
            }
            //  emit event only if already intialized
            if(!input.initialize) {
                objects.events.emit('iSpeak', {name: input.name, status: 'show'});
            }
        };
        input.hide = function(){
            for( let i in input.element){
                input.element[i].hide();
            }
            //  emit event only if already intialized
            if(!input.initialize) {
                objects.events.emit('iSpeak', {name: input.name, status: 'hide'});
            }
        };
        input.enable = function() {
            input.enabled = true;
            input.element.rect.attr({fill: "#ffffff", stroke: "#5d5d5d"});
            if(typeof input.element.txt === 'object'){
                input.element.txt.attr({cursor: "text", fill: "#000000"});
            }
            input.element.cover.attr({"cursor": "text"});
            //  emit event only if already intialized
            if(!input.initialize) {
                objects.events.emit('iSpeak', {name: input.name, status: 'enable'});
            }
        };
        input.disable = function() {            
            input.enabled = false;
            input.element.rect.attr({fill: "#cccccc", stroke: "#848484"});
            if(typeof input.element.txt === 'object'){
                input.element.txt.attr({cursor: "default", fill: "#848484"});
            }
            input.element.cover.attr({"cursor": "default"});
            //  emit event only if already intialized
            if(!input.initialize) {
                objects.events.emit('iSpeak', {name: input.name, status: 'disable'});
            }
        };

        // initialize
        if(obj.value.trim() != '') {
            input.setValue.call(this, obj.value);
        }       
        if(input.visible) { 
            input.show();
        } else {
            input.hide();
        }
        if(input.enabled) {
            input.enable();
        } else {
            input.disable();
        } 
        
        // set to false - we have initialized the element
        input.initialize = false;

        // add the element to the main list
        objects.objList[obj.name] = input;
    },       
   
    // the label element
    label: function(obj, type)
    {
        // return if the received object is not corect;
        if(!helpers.hasSameProps(defaultSettings[type], obj)) { return false; }

        let label = {
            name: obj.name,
            visible: (obj.isVisible == 'true') ? true : false,
            element: {},
            conditions: objects.conditionsParser(obj.conditions),
            initialize: true,
        };

        // save default values
        objects.dialogDefaultData[obj.name] = {visible: label.visible};

        label.element = this.text(parseInt(obj.left), parseInt(obj.top) + (obj.fontSize / 2 + 1), obj.text).attr({'fill': '#000000', "font-size": obj.fontSize, "font-family": objects.fontFamily, 'text-anchor': 'start', "cursor": "default"});
     
        // listen for events / changes
        objects.events.on('iSpeak', function(data)
        {            
            if(obj.name != data.name){
                objects.conditionsChecker(data, label);
            }
        });
        
        // the lable's methods
        label.show = function() {
            this.element.show();
            //  emit event only if already intialized
            if(!label.initialize) {
                objects.events.emit('iSpeak', {name: obj.name, status: 'show'});
            }
        };
        label.hide = function() {
            this.element.hide();
            //  emit event only if already intialized
            if(!label.initialize) {
                objects.events.emit('iSpeak', {name: obj.name, status: 'hide'});
            }
        };

        // initial status
        if(label.visible){
            label.show();
        } else {
            label.hide();
        }

        // set to false - we have initialized the element
        label.initialize = false;

        // add the element to the main list
        objects.objList[obj.name] = label;
    },

    // the plot element
    // TODO -- add functionality
    // plot: function(obj, type)
    // {
    //     // return if the received object is not corect;
    //     if(!helpers.hasSameProps(defaultSettings[type], obj)) { return false; }

    //     let plot = {
    //         name: obj.name,
    //         visible: (obj.isVisible == 'true') ? true : false,
    //         element: {},
    //         conditions: objects.conditionsParser(obj.conditions),
    //         initialize: true,
    //     };

        
    //     plot.element.rect = this.rect(obj.left, obj.top, obj.width, obj.height).attr({fill: "#ffffff", "stroke": "#d6d6d6", "stroke-width": 1});
    //     plot.element.text = this.text(obj.left + 20, obj.top + 20, 'This is a plot').attr({'fill': '#000000', "font-size": obj.fontSize, "font-family": objects.fontFamily, 'text-anchor': 'start', "cursor": "default"});

    //     // listen for events / changes
    //     objects.events.on('iSpeak', function(data)
    //     {            
    //         if(obj.name != data.name){
    //             objects.conditionsChecker(data, plot);
    //         }
    //     });
        
    //     // the lable's methods
    //     plot.show = function() {
    //         this.element.rect.show();
    //         this.element.text.show();
    //         //  emit event only if already intialized
    //         if(!plot.initialize) {
    //             objects.events.emit('iSpeak', {name: obj.name, status: 'show'});
    //         }
    //     };
    //     plot.hide = function() {
    //         this.element.rect.hide();
    //         this.element.text.hide();
    //         //  emit event only if already intialized
    //         if(!plot.initialize) {
    //             objects.events.emit('iSpeak', {name: obj.name, status: 'hide'});
    //         }
    //     };

    //     // initial status
    //     if(plot.visible){
    //         plot.show();
    //     } else {
    //         plot.hide();
    //     }

    //     // set to false - we have initialized the element
    //     plot.initialize = false;

    //     // add the element to the main list
    //     objects.objList[obj.name] = plot;
    // },

    // the radio element
    radio: function(radios, obj, type) 
    {
        // return if the received object is not corect;
        if(!helpers.hasSameProps(defaultSettings[type], obj)) { return false; }

        let radio = {
            name: obj.name,
            group: obj.radioGroup,
            visible: (obj.isVisible == 'true') ? true : false,
            enabled: (obj.isEnabled == 'true') ? true : false,
            selected: (obj.isSelected == 'true') ? true : false,
            element: {},
            conditions: objects.conditionsParser(obj.conditions),
            initialize: true,
        };

        // save default values
        objects.dialogDefaultData[obj.name] = {visible: radio.visible, selected: radio.selected, enabled: radio.enabled};        

        // add the element to the main list
        objects.objList[obj.name] = radio;  

        if (helpers.missing(obj.size)) { obj.size = 7; }
        if (helpers.missing(obj.vertspace)) { obj.vertspace = 25; }
        if (helpers.missing(obj.fontsize)) { obj.fontsize = objects.fontSize; } else { obj.fontsize = obj.fontsize + 'px'; }
        
        // data
        let dataLeft = parseInt(obj.left);
        let dataTop = parseInt(obj.top);
        
        // initializing the radioGroup if it does not already exists
        if(radios[obj.radioGroup] == void 0){
            radios[obj.radioGroup] = {};
        }
        radios[obj.radioGroup][obj.name] = {};
        let me = radios[obj.radioGroup][obj.name];

        // drawing the radio and label
        let cColor = (obj.isEnabled == 'true') ? "#eeeeee" : "#cccccc";
        let tColor = (obj.isEnabled == 'true') ? "#000000" : "#848484";
        me.label = this.text(dataLeft + 15, dataTop, obj.label).attr({"text-anchor": "start", "font-size": obj.fontsize, "font-family": objects.fontFamily, fill:tColor, cursor:"default"});
        me.circle = this.circle(dataLeft, dataTop, obj.size).attr({fill: cColor, "stroke": "#5d5d5d", "stroke-width": 1});
    
        // selected - initial hide - new Raphael SET
        me.fill = this.set();
        // the interior green circle
        me.fill.push(this.circle(dataLeft, dataTop, obj.size - 0.5).attr({fill: "#97bd6c", stroke: "none"}));
        // the interior black smaller circle
        me.fill.push(this.circle(dataLeft, dataTop, obj.size - 4.5).attr({fill: tColor, stroke: "none"}));
        // add iD / name
        me.name = obj.name;
        me.fill.hide();

        me.cover =  this.circle(dataLeft, dataTop, obj.size + 2).attr({fill: "#ffffff", opacity:0, "cursor": "pointer"});
        me.cover.click(function() 
        {
            if(radio.enabled) {
                let rList = Object.keys(radios[obj.radioGroup]);
                for(let i = 0; i < rList.length; i++)
                {
                    if(rList[i] == me.name) {
                        radios[obj.radioGroup][rList[i]].fill.show();
                        objects.objList[rList[i]].selected = true;       
                        objects.events.emit('iSpeak', {name: radios[obj.radioGroup][rList[i]].name, status: 'select'});
                    } else {
                        radios[obj.radioGroup][rList[i]].fill.hide();
                        objects.objList[rList[i]].selected = false;
                        objects.events.emit('iSpeak', {name: radios[obj.radioGroup][rList[i]].name, status: 'deselect'});
                    }
                }
            }
        });

        // listen for events / changes
        objects.events.on('iSpeak', function(data)
        {
            if(obj.name != data.name){
                objects.conditionsChecker(data, radio);
            }
        });
        
        // the radio's methods
        radio.show = function() {
            me.label.show();
            me.circle.show();
            // check if selected
            if(radio.selected) {
                me.fill.show();
            }
            //  emit event only if already intialized
            if(!radio.initialize) {
                objects.events.emit('iSpeak', {name: radio.name, status: 'show'});
            }
        };
        radio.hide = function() {
            me.label.hide();
            me.circle.hide();
            me.fill.hide();
            //  emit event only if already intialized
            if(!radio.initialize) {            
                objects.events.emit('iSpeak', {name: radio.name, status: 'hide'});
            }
        };
        radio.enable = function() {
            radio.enabled = true;
            me.cover.attr({'cursor': 'pointer'});
            me.circle.attr({fill: "#eeeeee", "stroke": "#5d5d5d"});
            me.label.attr({fill: "#000000"});
            // me.fill[0].attr({fill: "#97bd6c"});
            me.fill[1].attr({fill: "#000000"});
            //  emit event only if already intialized
            if(!radio.initialize) {            
                objects.events.emit('iSpeak', {name: radio.name, status: 'enable'});
            }
        };
        radio.disable = function() {
            radio.enabled = false;
            me.cover.attr({'cursor': 'default'});
            // me.circle.attr({fill: "#cccccc", "stroke": "#848484"});
            me.label.attr({fill: "#848484"});
            // me.fill[0].attr({fill: "#97bd6c"});
            me.fill[1].attr({fill: "#848484"});
            //  emit event only if already intialized
            if(!radio.initialize) {            
                objects.events.emit('iSpeak', {name: radio.name, status: 'disable'});
            }
        };
        radio.select = function() {
            radio.selected = true;
            me.fill.show();
            //  emit event only if already intialized
            if(!radio.initialize) {            
                objects.events.emit('iSpeak', {name: radio.name, status: 'select'});
            }
        };
        radio.deselect = function() {
            radio.selected = false;
            me.fill.hide();
            //  emit event only if already intialized
            if(!radio.initialize) {            
                objects.events.emit('iSpeak', {name: radio.name, status: 'deselect'});
            }
        };

        // initial status
        if(radio.visible) {
            radio.show();
        } else {
            radio.hide();
        }
        if(radio.enabled) {
            radio.enable();
        } else {
            radio.disable();
        }        
        if(radio.selected) {
            radio.select();
        } else {
            radio.deselect();
        }        

        // set to false - we have initialized the element
        radio.initialize = false;
    },

    // the select element
    // TODO - test functionality
    select: function(obj, type, eventMe)
    {
        // return if the received object is not corect;
        if(!helpers.hasSameProps(defaultSettings[type], obj)) { return false; }

        let select = {
            name: obj.name,
            visible: (obj.isVisible == 'true') ? true : false,
            enabled: (obj.isEnabled == 'true') ? true : false,
            selected: false,
            objSelected: {},
            value: '',
            element: {},
            conditions: objects.conditionsParser(obj.conditions),
            initialize: true,
            dataList: [],
            paper: this,
        };

        // save default values
        objects.dialogDefaultData[obj.name] = {visible: select.visible, value: select.value, enabled: select.enabled};

        // data to int
        let dataLeft = parseInt(obj.left);
        let dataTop = parseInt(obj.top);
        
        // not widther than 350
        obj.width = (obj.width > 350) ? 350 : obj.width;
        let dataWidth = parseInt(obj.width);

        // draw visibel rectangle
        select.element.rect = this.rect(dataLeft, dataTop, dataWidth, 25).attr({fill: "#FFFFFF", "stroke": "#5d5d5d", "stroke-width": 1});  
        // Open / close element list
        select.element.downsign = this.path([
            ["M", dataLeft + dataWidth - 15 , dataTop + 8],
            ["l", 8, 0],
            ["l", -4, 8],
            ["z"]
        ]).attr({fill: "#5d5d5d", "stroke-width": 0});
        select.element.upsign = this.path([
            ["M", dataLeft + dataWidth - 15 , dataTop + 15 ],
            ["l", 8, 0],
            ["l", -4, -8],
            ["z"]
        ]).attr({fill: "#5d5d5d", "stroke-width": 0}).hide();
        
        select.element.showList = this.rect(dataLeft, dataTop, dataWidth, 25).attr({fill: "#79a74c", "opacity": 0, "cursor": "pointer"});        
        select.element.showList.click(function() {
            if(select.enabled && typeof listSupport.paper.setSize === "function") {                                
                if(listSupport.listSet[0] !== void 0 && listSupport.listSet[0].data('visible')) {
                    listSupport.hide();

                    select.element.downsign.show();
                    select.element.upsign.hide();

                    // resize div and paper and remove scrollbar
                    listSupport.div.style.height = '0px';
                    listSupport.div.id = '';
                    listSupport.div.className = '';
                    listSupport.paper.setSize(dataWidth, 0);
                } else {
                    listSupport.show();
                    // resize div and paper
                    select.element.downsign.hide();
                    select.element.upsign.show();

                    // add scrollbar
                    listSupport.div.id = 'container-' + obj.name;
                    listSupport.div.className = 'scrollbarStyle';
                    
                    let newHeight = listSupport.height;
                    if (listSupport.height > 125) {
                        newHeight = 125;
                    }
                    listSupport.div.style.height = newHeight + 'px';
                    listSupport.paper.setSize(dataWidth, listSupport.height);
                }
            }
        });

        // show / hide selected    
        // ===============================================================================
        eventMe.on('selected', function(data) {
            // check if we have an element | if yes remove it
            if(typeof select.objSelected.remove === "function") {
                select.objSelected.remove();                
            }
            select.objSelected = select.paper.text(dataLeft+10, dataTop+12, data).attr({"text-anchor": "start",fill: "#000000", "font-size": objects.fontSize, "font-family": objects.fontFamily});
            select.value = data;
            select.selected = true;
            // etmit event - obj value change
            objects.events.emit('iSpeak', {name: obj.name, status: 'value'});            
        });
        eventMe.on('deSelected', function(data) {
            if(typeof select.objSelected.remove === "function") {
                select.objSelected.remove();                
            }
            select.value = '';
            select.selected = false;
            // etmit event - obj value change
            objects.events.emit('iSpeak', {name: obj.name, status: 'value'});
        });

        const listSupport = {
            div: document.createElement("div"),
            paper: {},
            listSet: {},
            // listBg used only for having a referance to clear selection
            listBg: {},
            height: 0,

            makeSupport: function(noElements) {
                listSupport.div.style.position = "absolute";
                listSupport.div.style.top = (dataTop + 29) + 'px';
                listSupport.div.style.left = (dataLeft + 16) + 'px';
                listSupport.div.style.width = (dataWidth -1) + 'px';
                // initial height only visible
                listSupport.div.style.height = '0px';

                // initialy paper is small - allow ather elements to be clickable
                let newPaper = Raphael(listSupport.div, dataWidth, 1);
                let p = document.getElementById('paper');
                p.appendChild(listSupport.div);

                listSupport.paper = newPaper;
                listSupport.height = noElements * 25;
            },
            makeList: function(list) {
                // The select's element list
                // ===============================================================================
                let selectElements = listSupport.paper.rect(0, 0, dataWidth, list.length * 25).attr({fill: "#FFFFFF", stroke: "#5d5d5d", "stroke-width": 0}); 
                selectElements.hide();
                selectElements.data('visible', 0);
                selectElements.toFront();   

                listSupport.listSet = listSupport.paper.set();                
                listSupport.listSet.push(selectElements);
                // new set for background
                listSupport.listBg = listSupport.paper.set();                

                let position = 10;
                let bg = [];
                let txt = [];
                let cover = [];

                // on click element
                let elClicked = function() { 
                    let isOn = this.data('clicked');
                    let pos = this.data('position');
                    for(let j = 0; j < cover.length; j++) {
                        cover[j].data('clicked', 0);
                        bg[j].attr({fill: "#ffffff"});
                    }
                    
                    if(!isOn) {
                        this.data('clicked', 1);
                        bg[pos].attr({fill: "#79a74c"});
                        eventMe.emit('selected', this.data('elName'));
                    } else {
                        this.data('clicked', 0);
                        eventMe.emit('deSelected', this.data('elName'));
                    }
                };
                // on element over
                let elIn = function() { 
                    if(!this.data('clicked')){
                        bg[this.data('position')].attr({fill: "#79a74c"});
                    }
                };
                // on element out
                let elOut = function() { 
                    if(!this.data('clicked')){
                        bg[this.data('position')].attr({fill: "#ffffff"});
                    }                                             
                };
                
                // populate the list
                for(let i = 0; i < list.length; i++) {
                    bg[i] = listSupport.paper.rect(0 , position-10, dataWidth - 5, 25).attr({fill: "#ffffff", stroke: 0});
                    txt[i] = listSupport.paper.text(10, position+3, list[i]).attr({"text-anchor": "start", "font-size": objects.fontSize, "font-family": objects.fontFamily, fill: '#000000'}).hide();
                    // save the name of the
                    cover[i] = listSupport.paper.rect(0 , position-10, dataWidth - 5, 25).attr({fill: "#eeeeee", opacity: 0, cursor: "pointer", stroke: 0})
                                    .hide()
                                    .data('clicked', 0)
                                    .data('position', i)
                                    .data('elName', list[i])
                                    .click( elClicked )
                                    .hover( elIn, elOut );
                    listSupport.listSet.push(txt[i], cover[i]);
                    listSupport.listBg.push(bg[i]);
                    position += 25;
                } 
            },

            show: function(){
                this.div.style.display = 'block';
                if (typeof this.listSet.show == 'function') { 
                    this.listSet.show(); 
                    listSupport.listSet[0].data('visible', 1);
                }
            },
            hide: function(){
                this.div.style.display = 'none';
                if (typeof this.listSet.hide == 'function') { 
                    this.listSet.hide(); 
                    listSupport.listSet[0].data('visible', 0);
                }
            }
        };

        //  add data based on type
        if (obj.dataSource === 'custom') {
            let list = obj.dataValue.split(',');
            // remove last element if ""
            if(list[list.length-1] === "") { list.pop(); }

            // do we have a list?
            if (Array.isArray(list) && list.length != 0) {
                listSupport.makeSupport(list.length);
                // make the list with tha data
                listSupport.makeList(list);  
                // save data list  
                select.dataList = list;
            }
        }
        // listen for events / changes for data
        objects.events.on('selectData', function(data)
        {
            if(obj.dataSource === 'fromR') {
                // specific data type                
                if(data[obj.dataValue] !== void 0 && data[obj.dataValue].length > 0) {
                    listSupport.makeSupport(data[obj.dataValue].length);
                    // make the list with tha data
                    listSupport.makeList(data[obj.dataValue]);  
                    // save data list  
                    select.dataList = data[obj.dataValue];
                } else {
                    // all data types
                    if(obj.dataValue === 'all') {
                        let allData = [];
                        let keys = Object.keys(data);
                        for(let i = 0; i < keys.length; i++) {
                            allData = allData.concat(data[keys[i]]);                            
                        }                        
                        listSupport.makeSupport(allData.length);
                        // make the list with tha data
                        listSupport.makeList(allData);    
                        // save data list
                        select.dataList = allData;
                    }
                }
            }            
        });

        // listen for events / changes
        objects.events.on('iSpeak', function(data)
        {
            
            if(obj.name != data.name){
                objects.conditionsChecker(data, select);
            }            
        });

        // the select's methods
        select.setValue = function(val) {
            select.value = val;
            if (val === '') {
                eventMe.emit('deSelected');
            } else if (select.dataList.includes(val)) {
                eventMe.emit('selected', val);
            }
            // the position of the selected value if it exists
            let exist = null; 
            // clear bg and deselect all
            if (listSupport.listSet.length > 0) {
                for(let j = 0; j < listSupport.listSet.length; j++) {
                    if (listSupport.listSet[j].data('clicked')) {
                        listSupport.listSet[j].data('clicked', 0);
                    }
                    if (listSupport.listSet[j].data('elName') && listSupport.listSet[j].data('elName') === val) {
                        listSupport.listSet[j].data('clicked', 1);
                        exist = listSupport.listSet[j].data('position');
                    }
                    if (listSupport.listBg.items[j] !== void 0) {
                        listSupport.listBg.items[j].attr({fill: "#ffffff"});
                    }
                }
                // make the background of the selected value green in the list
                if( exist && listSupport.listBg.items[exist] !== void 0) {
                    listSupport.listBg.items[exist].attr({fill: "#79a74c"});
                }
            }
            listSupport.hide();
        };
        select.show = function(){
            select.element.rect.show();
            select.element.downsign.show();
            select.element.showList.show();
            // check if we have anythig selected and hide-it
            if(typeof select.objSelected.remove === "function") {
                select.objSelected.show();
            }
            //  emit event only if already intialized
            if(!select.initialize) {
                objects.events.emit('iSpeak', {name: select.name, status: 'show'});
            }
        };
        select.hide = function(){
            listSupport.hide();
            select.element.rect.hide();
            select.element.upsign.hide();
            select.element.downsign.hide();
            select.element.showList.hide();
            // check if we have anythig selected and hide-it
            if(typeof select.objSelected.remove === "function") {
                select.objSelected.hide();
            }
            //  emit event only if already intialized
            if(!select.initialize) {
                objects.events.emit('iSpeak', {name: select.name, status: 'hide'});
            }
        };
        select.enable = function() {
            select.enabled = true;
            select.element.rect.attr({fill: "#FFFFFF"});
            select.element.downsign.attr({fill: "#5d5d5d"});
            select.element.upsign.hide();
            select.element.showList.attr({'cursor': 'pointer'});
            if(typeof select.objSelected.remove === "function") {
                select.objSelected.attr({fill: "#000000"});
            }
            //  emit event only if already intialized
            if(!select.initialize) {
                objects.events.emit('iSpeak', {name: select.name, status: 'enable'});
            }
        };
        select.disable = function() {            
            select.enabled = false;
            select.element.rect.attr({fill: "#cccccc", stroke: "#848484"});
            select.element.downsign.show();
            select.element.downsign.attr({fill: "#848484"});
            select.element.upsign.hide();
            select.element.showList.attr({'cursor': 'default'});
            listSupport.hide();
            if(typeof select.objSelected.remove === "function") {
                select.objSelected.attr({fill: "#848484"});
            }
            //  emit event only if already intialized
            if(!select.initialize) {
                objects.events.emit('iSpeak', {name: select.name, status: 'disable'});
            }
        };

        // initialize
        if(select.visible) { 
            select.show();
        } else {
            select.hide();
        }
        if(select.enabled) {
            select.enable();
        } else {
            select.disable();
        }  

        // set to false - we have initialized the element
        select.initialize = false;

        // set the first element as default
        if(select.dataList.length > 0) {
            select.setValue(select.dataList[0]);
        }
        // add the element to the main list
        objects.objList[obj.name] = select;
    },

    // the separator element
    separator: function(obj, type)
    {
        // return if the received object is not corect;
        if(!helpers.hasSameProps(defaultSettings[type], obj)) { return false; }

        let separator = {
            name: obj.name,
            visible: (obj.isVisible == 'true') ? true : false,
            element: {},
            conditions: objects.conditionsParser(obj.conditions),
            initialize: true,
        };

        // save default values
        objects.dialogDefaultData[obj.name] = {visible: separator.visible};        

        if(obj.direction == 'x') 
        {    
            if(obj.length < 10 || obj.length > this.width - 20){ obj.length = 300; }
            let v = parseInt(obj.length) + parseInt(obj.left);
            separator.element = this.path("M" + obj.left + " " + obj.top + "L"+ v +" " + obj.top).attr({stroke: "#5d5d5d"});
        } else if(obj.direction == 'y') 
        {
            if(obj.length < 10 || obj.length > this.height - 20){ obj.length = 300; }
            let v = parseInt(obj.length) + parseInt(obj.top);
            separator.element = this.path("M" + obj.left + " " + obj.top + "L" + obj.left + " " + v).attr({stroke: "#5d5d5d"});
        }

        // listen for events / changes
        objects.events.on('iSpeak', function(data)
        {
            if(obj.name != data.name){
                objects.conditionsChecker(data, separator);
            }
        });
        
        // the separator's methods
        separator.show = function() {
            this.element.show();
            //  emit event only if already intialized
            if(!separator.initialize) {            
                objects.events.emit('iSpeak', {name: obj.name, status: 'show'});
            }
        };
        separator.hide = function() {
            this.element.hide();
            //  emit event only if already intialized
            if(!separator.initialize) {
                objects.events.emit('iSpeak', {name: obj.name, status: 'hide'});
            }
        };

        // initial status
        if(separator.visible){
            separator.show();
        } else {
            separator.hide();
        }

        // set to false - we have initialized the element
        separator.initialize = false;
        
        // add the element to the main list
        objects.objList[obj.name] = separator;
    },

    // the slider element
    slider: function(obj, type)
    {
        // return if the received object is not corect;
        if(!helpers.hasSameProps(defaultSettings[type], obj)) { return false; }

        let slider = {
            name: obj.name,
            visible: (obj.isVisible == 'true') ? true : false,
            enabled: (obj.isEnabled == 'true') ? true : false,
            value: obj.value,
            element: {},
            conditions: objects.conditionsParser(obj.conditions),
            initialize: true,
        };
        
        // save default values
        objects.dialogDefaultData[obj.name] = {visible: slider.visible, value: slider.value, enabled: slider.enabled};

         // data to int
         let dataLeft = parseInt(obj.left);
         let dataTop = parseInt(obj.top);
         let dataWidth = parseInt(obj.length);
         let dataVal = parseFloat(obj.value);

         // check for user input
         if(dataLeft < 10 || dataLeft > paper.width - 10){ dataLeft = 10; }
         if(dataTop < 10 || dataTop > paper.height - 10){ dataTop = 10; }

        // width to big
        if(dataWidth < 50) { dataWidth = 50; }
        else if(dataWidth > paper.width - 30) { dataWidth = paper.width - 30; dataLeft = 15;}

        let v = parseInt(dataWidth) + parseInt(dataLeft);
        
        let line = this.path("M" + dataLeft + " " + dataTop + "L"+ v +" " + dataTop).attr({stroke: "#000000", "stroke-width": 2});
        let tLeft = dataLeft + (dataWidth * dataVal);
        let triangle = this.path([
            ["M", tLeft - 6, dataTop + 13],
            ["l", 12, 0],
            ["l", -6, -12],
            ["z"]
        ]).attr({fill: "#79a74c", "stroke-width": 1, stroke: "#5d5d5d"});
    
        let lastX = 0;
        let absoluteX = 0;

        triangle.drag(
            function move(dx, dy){
                if (slider.enabled) {
                    let newX = dx - lastX;

                    if (absoluteX + dx > dataLeft + dataWidth) {
                        newX = dataLeft + dataWidth - absoluteX - lastX;
                    }
                    
                    if (absoluteX + dx < dataLeft) {
                        newX = dataLeft - absoluteX - lastX;
                    }
                    
                    triangle.translate(newX, 0);
                    // transform() does not work the same as translate() ... !!
                    // triangle.transform('T' + newX + ',' + 0);
        
                    if (absoluteX + dx < dataLeft) {
                        lastX = dataLeft - absoluteX;
                    }
                    else {
                        lastX += newX;
                    }
                }
            },
            function start() {
                lastX = 0;
                let getBB = triangle.getBBox();
                absoluteX = getBB.x + getBB.width / 2;
            },
            function end(){
                if (slider.enabled) {        
                    slider.value = ((absoluteX + lastX) - dataLeft) / dataWidth; 
                    // say that the value has changed
                    objects.events.emit('iSpeak', {name: slider.name, status: 'value'});
                }
            }
        );

        let set = this.set();
        set.push(line, triangle);
        // save to elements
        slider.element = set;
        // listen for events / changes

        objects.events.on('iSpeak', function(data)
        {
            if(obj.name != data.name){
                objects.conditionsChecker(data, slider);
            }
        });
        
        // the slider's methods
        slider.setValue = function(val) {
            slider.value = val;
            if (val >= 0 && val <= 1) {
                let newPos = (dataLeft + (dataWidth * val)) - 6;
                // move triangle to position
                triangle.translate(newPos - triangle.getBBox().x, 0);
            }
        };
        slider.show = function() {
            slider.element.show();
            //  emit event only if already intialized
            if(!slider.initialize) {            
                objects.events.emit('iSpeak', {name: slider.name, status: 'show'});
            }
        };
        slider.hide = function() {
            slider.element.hide();
            //  emit event only if already intialized
            if(!slider.initialize) {
                objects.events.emit('iSpeak', {name: slider.name, status: 'hide'});
            }
        };

        slider.enable = function() {
            slider.enabled = true;
            // first element in set is the line            
            slider.element.items[0].attr({stroke: "#5d5d5d"});
            // second element in the set is teh circle
            slider.element.items[1].attr({fill: "#79a74c", "cursor": "pointer", "stroke": "#5d5d5d", "stroke-width": 1});
            //  emit event only if already intialized
            if(!slider.initialize) {
                objects.events.emit('iSpeak', {name: slider.name, status: 'enable'});
            }
        };
        slider.disable = function() {
            slider.enabled = false;
            // first element in set is the line 
            slider.element.items[0].attr({stroke: '#cccccc'});
            // second element in the set is teh circle
            slider.element.items[1].attr({fill: "#cccccc", "stroke": "#cccccc", 'cursor': 'default'});
            //  emit event only if already intialized
            if(!slider.initialize) {
                objects.events.emit('iSpeak', {name: slider.name, status: 'disable'});
            }
        };

        // initial status
        if(slider.visible){
            slider.show();
        } else {
            slider.hide();
        }
        if(slider.enabled) {
            slider.enable();
        } else {
            slider.disable();
        }        

        // set to false - we have initialized the element
        slider.initialize = false;
        
        // add the element to the main list
        objects.objList[obj.name] = slider;
    },

    // Conditions =================================================================
    conditionsParser: function(str)
    {
        let isOK = conditions.parseConditions(str);
                        
        if(!isOK.error) {
            return {conditions: isOK.result, elements: isOK.elements};
        }
        return {conditions: [], elements: []};
    },
    conditionsChecker: function(data, element)
    {                
        // check condition only if the element that "speak" is affecting us
        if(element.conditions.elements.includes(data.name)){
            conditions.checkConditions(data, element, objects.objList);
        }
    },
};  

module.exports = objects;
