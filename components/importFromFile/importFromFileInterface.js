const { ipcRenderer } = require('electron');
const { BrowserWindow, dialog } = require('electron').remote;
const EventEmitter = require('events');
const fs = require('fs');
const upath = require("upath");

const i18next = require("i18next");
const Backend = require ('i18next-sync-fs-backend');
const i18nextOptions = require("../../i18nextOptions");

let importOptions = {};
let cModify = new EventEmitter();
let headerNames;
let paper;
let importObj = {};
let previewData = [];

// the window is redy - the data is loaded 
ipcRenderer.on('dataLoaded', (event, args) => {
    
    let wWidth = parseInt(args.wWidth);
    let wHeight = parseInt(args.wHeight);

    let settings = args.systemS;

    // load translations to FRONT
    i18nextOptions.setLanguage(settings.language, settings.languageNS);
    i18next.use(Backend).init(i18nextOptions.getOptions(process.env.NODE_ENV, false));    

    // create paper and background
    paper = Raphael('paperImportFromFile', wWidth, wHeight);
    paper.rect(0, 0, wWidth, wHeight).attr({fill: '#FFFFFF', stroke: '#FFFFFF'});
    
    // paper.previewData = paper.set();
    // create the browse file
    selectFile(paper, wWidth, wHeight);

    //  make function to show preview
    paper.text(15, 85, i18next.t('Preview Data')).attr({'fill': '#000000', "font-size": '13px', "font-family": 'Arial', 'text-anchor': 'start', "cursor": "default"});
    paper.rect(15, 95, wWidth - 30, wHeight - 350).attr({fill: "#FFFFFF", "stroke": "#5d5d5d", "stroke-width": 1});

    drawLabel(paper, 20, wHeight - 223, i18next.t('Name'));
    drawInput(paper, 65, wHeight - 235, 150, 'dataset', true, 'dataset');
    
    drawLabel(paper, 20, wHeight - 188, i18next.t('Skip'));
    drawInput(paper, 65, wHeight - 200, 50, 'skip', true, '0');

    // header row
    headerNames = Object.assign({}, drawCheckBox);
    headerNames.make(paper, 20, wHeight - 150, 'header', 'First row as names', true);

    drawCheckBox.make(paper, 20, wHeight - 120, 'stripwhite', 'Trim spaces', false);

    paper.path("M240 " + (wHeight - 245) + "L240 " + ((wHeight - 245) + 180)).attr({stroke: "#ccc"});
    drawRadioGroup(paper, 270, wHeight - 223, 'sep', 'Delimiter', ['comma', 'space', 'tab', 'other'], 'comma', true);
    
    paper.path("M380 " + (wHeight - 245) + "L380 " + ((wHeight - 245) + 180)).attr({stroke: "#ccc"});
    drawRadioGroup(paper, 410, wHeight - 223, 'dec', 'Decimal', ['dot', 'comma'], 'dot', false);
    
    paper.path("M490 " + (wHeight - 245) + "L490 " + ((wHeight - 245) + 180)).attr({stroke: "#ccc"});

    drawLabel(paper, 520, wHeight - 223, i18next.t('NA values'));
    let na = drawSelect(paper, 520, wHeight - 207, ['NA', '0', 'NULL', 'empty'], 'nastrings', 'NA');
    na.setValue('NA');

    drawLabel(paper, 520, wHeight - 165, i18next.t('Quotes'));
    let quote = drawSelect(paper, 520, wHeight - 150, ['Double', 'Single', 'None'], 'quote', 'Double');
    quote.setValue('Double');

    drawLabel(paper, 650, wHeight - 223, i18next.t('Comment'));
    let comment = drawSelect(paper, 650, wHeight - 207, ['Disabled', '#', '%', '//', '\'', '!', ';', '--', '*', '||', '\"', '\\', '*>'], 'commentchar', '#');
    comment.setValue('#');
    
    paper.path("M15 " + (wHeight - 55) + "L" + (wWidth - 15) + " " + (wHeight - 55)).attr({stroke: "#000"});
    

    let buttonsX = wWidth - 185;
    let buttonsY = wHeight - 40;
    // get the text's width
    let importBox = getTextDim(paper, i18next.t('Import'));
    let saveTxtPosX = buttonsX + (Math.floor(75/2) - Math.floor(importBox.width / 2));
    // save button
    paper.rect(buttonsX, buttonsY, 75, 25).attr({fill: "#FFFFFF", "stroke": "#5d5d5d", "stroke-width": 1});
    paper.text(saveTxtPosX, buttonsY + 12, i18next.t('Import')).attr({'fill': '#000000', "font-size": '13px', "font-family": 'Arial', 'text-anchor': 'start', "cursor": "default"});
    paper.rect(buttonsX, buttonsY, 75, 25).attr({fill: "#FFFFFF", stroke: "none", "fill-opacity": 0, "cursor": "pointer"}).click(function saveSettings()
    {
        let theCommand = makeCommand();
        if (theCommand === '') {
            dialog.showMessageBox(BrowserWindow.getFocusedWindow(), {type: "info", message: i18next.t("No file selected! Please select a file first."), title: i18next.t("Error"), buttons: ["OK"]});
        } else {
            ipcRenderer.send('runCommand', theCommand);   
            BrowserWindow.getFocusedWindow().close();
        }
    });
    // get the text's width
    let cancelBox = getTextDim(paper, i18next.t('Cancel'));
    let cancelTxtPosX = (buttonsX + 90) + (Math.floor(75/2) - Math.floor(cancelBox.width / 2));
    // cancel button - try to close the window
    paper.rect(buttonsX + 90, buttonsY, 75, 25).attr({fill: "#FFFFFF", "stroke": "#5d5d5d", "stroke-width": 1});
    paper.text(cancelTxtPosX, buttonsY + 12, i18next.t('Cancel')).attr({'fill': '#000000', "font-size": '13px', "font-family": 'Arial', 'text-anchor': 'start', "cursor": "default"});
    paper.rect(buttonsX + 90, buttonsY, 75, 25).attr({fill: "#FFFFFF", stroke: "none", "fill-opacity": 0, "cursor": "pointer"}).click(function saveSettings(){
        BrowserWindow.getFocusedWindow().close();
    });
});

// on element change make the command and send it to the main window
cModify.on('elementChanged', (event, args) => {
    let theCommand = makeCommand();
    if (theCommand !== '') {
        ipcRenderer.send('dialogCommandUpdate', theCommand);
        
        // add number of rows
        importObj.nrows = 8;
        ipcRenderer.send('sendComandForPreviewData', importObj);        
    }
});
// draw the import preview
ipcRenderer.on('importDataForPreview', (event, args) => {

    let headerRow = args.colnames;
    let vdata = args.vdata;
    console.log(previewData.length);

    if (previewData.length){
        for (let index = 0; index < previewData.length; index++) {
            if( typeof previewData[index].remove === 'function'){
                previewData[index].remove();
            };
        }
        previewData.length = 0;
    }
    
    if(Array.isArray(headerRow)) {
        // do not show more than 10 column
        let count = headerRow.length < 9 ? headerRow.length : 8;  
        for (let index = 0; index < count; index++) {
            previewData.push(paper.rect(20 + index*94, 100, 90, 20).attr({fill: "#d6d6d6", stroke: "none"}));
            // make text fit 100px cell width
            let txt = headerRow[index].length > 9 ? headerRow[index].substring(0,7) + '...' : headerRow[index];            
            previewData.push(paper.text(25 + index*94, 110, txt).attr({"text-anchor": "start", "font-size": "14px", fill: "black"}));
        }
    }

    if(Array.isArray(vdata)) {
        // do not show more than 7 column
        let count = vdata.length < 9 ? vdata.length : 8;  
        for (let index = 0; index < count; index++) {
            if (Array.isArray(vdata[index])) {
                // do not show more than 7 vdata
                let count2 = vdata[index].length < 9 ? vdata[index].length : 8;  
                for (let j = 0; j < count2; j++) {
                    previewData.push(paper.rect(20 + index*94, 125 + j*23, 90, 20).attr({fill: "#f8f8f8", stroke: "none"}));
                    // make text fit 100px cell width
                    let txt = vdata[index][j].length > 9 ? vdata[index][j].substring(0,7) + '...' : vdata[index][j];            
                    previewData.push(paper.text(25 + index*94, 135 + j*23, txt).attr({"text-anchor": "start", "font-size": "14px", fill: "black"}));    
                }
            }
        }
    }

});

// Elements ==========================================================
// make a select element
function drawSelect(paper, x, y, list, name, defaultValue)
{
    let eventMe = new EventEmitter();

    // data to int
    let dataLeft = parseInt(x);
    let dataTop = parseInt(y);
    let dataWidth = 120;

    let select = {
        selected: false,
        objSelected: {},
        value: '',
        element: {},
    };

    // draw visibel rectangle
    select.element.rect = paper.rect(dataLeft, dataTop, dataWidth, 25).attr({fill: "#FFFFFF", "stroke": "#5d5d5d", "stroke-width": 1});  
    // Open / close element list
    select.element.downsign = paper.path([
        ["M", dataLeft + dataWidth - 15 , dataTop + 8],
        ["l", 8, 0],
        ["l", -4, 8],
        ["z"]
    ]).attr({fill: "#5d5d5d", "stroke-width": 0});
    select.element.upsign = paper.path([
        ["M", dataLeft + dataWidth - 15 , dataTop + 15 ],
        ["l", 8, 0],
        ["l", -4, -8],
        ["z"]
    ]).attr({fill: "#5d5d5d", "stroke-width": 0}).hide();
    
    select.element.showList = paper.rect(dataLeft, dataTop, dataWidth, 25).attr({fill: "#79a74c", "opacity": 0, "cursor": "pointer"});        
    select.element.showList.click(function() {
        if(typeof listSupport.paper.setSize === "function") {                                
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
                // TODO -- modify name
                listSupport.div.id = 'container-emilian';
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
        select.objSelected = paper.text(dataLeft+10, dataTop+12, data).attr({"text-anchor": "start",fill: "#000000", "font-size": "13px", "font-family": "Arial"});
        select.value = data;
        select.selected = true;
        importOptions[name] = data;    
        cModify.emit('elementChanged');
        // hide list
        listSupport.hide();
        select.element.downsign.show();
        select.element.upsign.hide();
    });
    eventMe.on('deSelected', function(data) {
        if(typeof select.objSelected.remove === "function") {
            select.objSelected.remove();                
        }
        select.value = '';
        select.selected = false;
        importOptions[name] = defaultValue;
        cModify.emit('elementChanged');
        // hide list
        listSupport.hide();
        select.element.downsign.show();
        select.element.upsign.hide();
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
            listSupport.div.style.top = (dataTop + 24) + 'px';
            listSupport.div.style.left = (dataLeft + 1) + 'px';
            listSupport.div.style.width = (dataWidth -1) + 'px';
            // initial height only visible
            listSupport.div.style.height = '0px';

            // initialy paper is small - allow ather elements to be clickable
            let newPaper = Raphael(listSupport.div, dataWidth, 1);
            let p = document.getElementById('paperImportFromFile');
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
                txt[i] = listSupport.paper.text(10, position+3, list[i]).attr({"text-anchor": "start", "font-size": "13px", "font-family": "Arial", fill: '#000000'}).hide();
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

    //  add data
    if (Array.isArray(list) && list.length != 0) {
        listSupport.makeSupport(list.length);
        // make the list with tha data
        listSupport.makeList(list);  
    }

    // the select's methods
    select.setValue = function(val) {
        select.value = val;
        if (val === '') {
            importOptions[name] = defaultValue;
            eventMe.emit('deSelected');
            cModify.emit('elementChanged');
        } else if (list.includes(val)) {
            importOptions[name] = val;
            eventMe.emit('selected', val);
            cModify.emit('elementChanged');
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
            if( exist !== null && listSupport.listBg.items[exist] !== void 0) {                
                listSupport.listBg.items[exist].attr({fill: "#79a74c"});
            }
        }
        listSupport.hide();
    };

    select.setValue(defaultValue);
    return select;
}
// draw select file
function selectFile(paper, wWidth, wHeight)
{
    let name = '';
    let theWindow = BrowserWindow.getFocusedWindow();

    importOptions.filePath = '';

    paper.text(15, 25, i18next.t('File to read from')).attr({'fill': '#000000', "font-size": '13px', "font-family": 'Arial', 'text-anchor': 'start', "cursor": "default"});
    paper.rect(15, 35, wWidth - 150, 25).attr({fill: "#FFFFFF", "stroke": "#5d5d5d", "stroke-width": 1});

    let browseXPos = wWidth - 125;
    // get the text's width & position
    let browseBox = getTextDim(paper, i18next.t('Browse'));
    let browseTxtPosX = browseXPos + (Math.floor(75/2) - Math.floor(browseBox.width / 2));
    paper.rect(browseXPos, 35, 75, 25).attr({fill: "#FFFFFF", "stroke": "#5d5d5d", "stroke-width": 1});
    paper.text(browseTxtPosX, 35 + 12, i18next.t('Browse')).attr({'fill': '#000000', "font-size": '13px', "font-family": 'Arial', 'text-anchor': 'start', "cursor": "default"});
    paper.rect(browseXPos, 35, 75, 25).attr({fill: "#FFFFFF", stroke: "none", "fill-opacity": 0, "cursor": "pointer"}).click(function openDialog()
    {
        dialog.showOpenDialog(theWindow, {title: i18next.t("Select text file to import"), properties: ['openFile']}, result => {
            if (result !== void 0 && result.length > 0) {            
                let filePath = result.pop();    
                // check if the file exists and we can read from it                                            
                fs.access(filePath, fs.constants.F_OK | fs.constants.R_OK, (err) => {
                    if (err) {
                        dialog.showMessageBox(theWindow, {type: 'error', title: i18next.t('There is a problem with the file you selected!'), buttons: ['OK']});
                    } else {
                        if (typeof name.remove === 'function') {
                            name.remove();
                        }                        
                        name = paper.text(25, 48, filePath).attr({'fill': '#000000', "font-size": '13px', "font-family": 'Arial', 'text-anchor': 'start', "cursor": "default"});
                        importOptions.filePath = filePath;
                        cModify.emit('elementChanged');
                    }
                });
            }
        });
    });
    
}
// draw radioGroup
function drawRadioGroup(paper, x, y, name, label, elements, defaultValue, other)
{
    let radio = {
        name: name,
        value: ''
    };

    // data
    let dataLeft = parseInt(x);
    let dataTop = parseInt(y);
    let group = [];
    let elSize = 7;
    let input;

    paper.text(dataLeft - 15, dataTop, label).attr({"text-anchor": "start", "font-size": '13px', "font-family": 'Arial', fill: '#000000', cursor:"default"});

    dataTop += 35;

    for (let i = 0; i < elements.length; i++) 
    {
        group[elements[i]] = {};
        let me = group[elements[i]];

        let yPos = dataTop + (i * 30);

        // drawing the radio and label
        me.label = paper.text(dataLeft + 15, yPos, elements[i]).attr({"text-anchor": "start", "font-size": '13px', "font-family": 'Arial', fill: '#000000', cursor:"default"});
        me.circle = paper.circle(dataLeft, yPos, elSize).attr({fill: '#eeeeee', "stroke": "#5d5d5d", "stroke-width": 1});

        // selected - initial hide - new Raphael SET
        me.fill = paper.set();
        // the interior green circle
        me.fill.push(paper.circle(dataLeft, yPos, elSize - 0.5).attr({fill: "#97bd6c", stroke: "none"}));
        // the interior black smaller circle
        me.fill.push(paper.circle(dataLeft, yPos, elSize - 4.5).attr({fill: "#000000", stroke: "none"}));
        // add iD / name
        me.name = elements[i];
        me.fill.hide();

        me.cover =  paper.circle(dataLeft, yPos, elSize + 2).attr({fill: "#ffffff", opacity:0, "cursor": "pointer"});
        me.cover.click(function() 
        {
            radio.setValue(me.name);
        });

        if (elements[i] === 'other') {
           input = drawInput(paper, dataLeft + 50, yPos - 12, 35, name, false, null);
        }
    }

    radio.setValue = function(keyName)
    {
        let rList = Object.keys(group);
        for(let i = 0; i < rList.length; i++)
        {
            if(rList[i] == keyName) {
                group[rList[i]].fill.show();
                radio.value = keyName;
                // check if select type other
                if (other && keyName === 'other') {
                    input.enable();
                    importOptions[name] = input.value;
                } else if(other){
                    input.disable();
                    importOptions[name] = keyName;
                } else {
                    importOptions[name] = keyName;
                }
                cModify.emit('elementChanged');
            } else {
                group[rList[i]].fill.hide();
            }
        }
    }; 

    radio.setValue(defaultValue);
}
// create an imput
function drawInput(paper, x, y, width, name, status, defaultValue)
{
    let input = {
        name: name,
        value: '',
        enabled: status
    };

    let text;
    let element = paper.rect(x, y, width, 25).attr({fill: (input.enabled ? "#fff" : "#eee"), "stroke": "#5d5d5d", "stroke-width": 1});
    let cover = paper.rect(x, y, width, 25).attr({fill: "#ffffff", stroke: "none", opacity: 0, cursor: ((input.enabled ? "text" : "default"))});
    cover.click(function() 
    {
        if (input.enabled) {
            customInput(width - 10, 19, x + 7, y + 2, input.value, paper).then((result) => {
                input.setValue(result);                    
            });
        }
    });

    input.setValue = function(val) 
    {    
        // remove previous element 
        if(typeof text === 'object' && typeof text.remove === "function") {
            text.remove();                
        }
        // check if the new text is bigger then the input an trim if so
        let newValDim = getTextDim(paper, val);
        
        let newText = (newValDim.width < width) ? val :  limitTextOnWidth(val, width, paper) + '...';
        text = paper.text(x + 5, y + 12, newText).attr({"text-anchor": "start", "font-size": '13px', "font-family": 'Arial'});
        // make it editable
        text.click(function(){
            if (input.enabled) {
                customInput(width - 10, 19, x + 7, y + 2, input.value, paper).then((result) => {
                    input.setValue(result);                    
                });
            }
        });
        // save full new value
        input.value = val;
        importOptions[name] = val;
        cModify.emit('elementChanged');        
    };

    input.enable = function(){
        input.enabled = true; 
        element.attr({'fill' : '#ffff'});
        cover.attr({'cursor': 'text'});
    };
    input.disable = function(){
        input.enabled = false; 
        element.attr({'fill' : '#eee'});
        cover.attr({'cursor': 'default'});
    };

    // set default value if we have one
    if (defaultValue !== null) {
        input.setValue(defaultValue);
    }
    return input;
}
// create an checkbox
let drawCheckBox = {

    checked: false,
    label: {},
    box: {},
    chk: {},
    cover: {},
    name: '',

    make: function (paper, x, y, name, text, isChecked)
    {
        this.checked = isChecked;
        this.name = name;

        this.label = paper.text(x + 20, y + 6, text).attr({"text-anchor": 'start', "font-size": "13px", "font-family": "Arial", "cursor": "default"});
        // the box        
        this.box = paper.rect(x, y, 12, 12).attr({fill: (this.checked ? '#97bd6c': "#eeeeee"), "stroke-width": 1, stroke: "#5d5d5d"});
        // the checked 
        this.chk = paper.path([
            ["M", x + 0.2*12, y + 0.3*12],
            ["l", 0.15*12*2, 0.2*12*2],
            ["l", 0.3*12*2, -0.45*12*2]
        ]).attr({"stroke-width": 2});

        if (!this.checked) {
            this.chk.hide();
        }
        
        // the cover needs to be drawn last, to cover all other drawings (for click events)
        let thisObj = this;
        this.cover = paper.rect(x, y, 12, 12)
            .attr({fill: "#fff", opacity: 0, cursor: "pointer"})
            .click(function() {                
                // the element
                thisObj.checked = !thisObj.checked;
                
                if (thisObj.checked) {
                    // the element is checked
                    thisObj.box.attr({fill: "#97bd6c"});
                    thisObj.chk.show();
                } else {
                    // the element is unchecked
                    thisObj.box.attr({fill: "#eeeeee"});
                    thisObj.chk.hide();
                }
                // save value to main object
                importOptions[name] = thisObj.checked;
                cModify.emit('elementChanged');
            });

        // save value to main object
        importOptions[name] = this.checked;

        // return the value of the checkbox (true/false)
        return this.checked;
    },
    setValue: function(val) {
        if (this.checked !== val) {
            
            this.checked = val;
            importOptions[this.name] = this.checked;
            cModify.emit('elementChanged');
            
            if (val) {
                this.box.attr({fill: "#97bd6c"});
                this.chk.show();
            } else {
                this.box.attr({fill: "#eeeeee"});
                this.chk.hide();
            }
        }        
    }
};
// create a label
function drawLabel(paper, x, y, label)
{
    paper.text(x, y, label).attr({"fill": "#000", "font-size": "13px", "font-family": "Arial", "text-anchor": "start"});
}

// Helper functions ====================
// build the dialog command
function makeCommand()
{
    // let table = '{dataset} <- read.table(file, header = FALSE, quote = "\"", sep = "", dec = ".", na.strings = "NA", skip = 0, strip.white = FALSE, comment.char = "#")';
    // let csv = '{dataset} <- read.csv(file, header = TRUE, sep = ",", quote = "\"", dec = ".", comment.char = "", na.strings = "NA", skip = 0, strip.white = FALSE,)';
    let theCommand = '';

    // exit if no file selected
    if(importOptions.filePath === "") {
        return '';
    }

    importObj.file = upath.normalize(importOptions.filePath);

    // reading with CSV
    if (importOptions.sep === 'comma') {
        importObj.command = 'read.csv';
        theCommand = importOptions.dataset + ' <- read.csv("' + importObj.file + '"';
        // importObj.file = upath.normalize(importOptions.filePath).replace(/(\s+)/g, '\\\\\$1');
        // console.log(upath.normalize(importOptions.filePath));
        
        // importObj.sep = '';
    } else if (importOptions.sep === 'tab') {
        importObj.command = 'read.delim';
        theCommand = importOptions.dataset + ' <- read.delim("' + importObj.file + '"';
    }
    // reading with table
    else {      
        importObj.command = 'read.table';
        theCommand = importOptions.dataset + ' <- read.table("' + importObj.file + '"';
    }

    // do we have the first row as header ?
    if (importObj.command == "read.table" && importOptions.header) {
        theCommand += ', header = TRUE';
    }

    if (importObj.command != "read.table" && !importOptions.header) {
        theCommand += ', header = FALSE';
    }

    // for sending it to R preview
    if (importOptions.header) {
        importObj.header = true;
    } else {
        importObj.header = false;
    }

    // if(importOptions.sep === 'tab') {
    //     theCommand += ', sep = "\\t"';
    // }
    // if(importOptions.sep === 'space') {
    //     theCommand += ', sep = ""';
    // }
    console.log(importOptions.sep);
    
    // setting the separator
    if (importOptions.sep != 'comma' & importOptions.sep != 'space' & importOptions.sep != 'tab' & importOptions.sep != '') {
        theCommand += ', sep = "' + importOptions.sep + '"';
        importObj.sep = importOptions.sep;
    } else {
        delete importObj.sep;
    }

    // setting quote char
    switch(importOptions.quote){
        case 'Single':
            theCommand += ', quote = "\'"';
            importObj.quote = "\\\'";
            break;
        case 'None':
            theCommand += ', quote = ""';
            importObj.quote = "";
            break;
        default:
            importObj.quote = "\\\"";
    }
    // setting the decimal
    if (importOptions.dec === 'comma') {
        theCommand += ', dec=","';
        importObj.dec = ",";
    } else {
        importObj.dec = ".";
    }

    // setting NA values
    if (importOptions.nastrings !== 'NA') {
        theCommand += ', na.strings = "' + importOptions.nastrings + '"';
        importObj['na.strings'] = importOptions.nastrings;
    } else {
        importObj['na.strings'] = 'NA';
    }
    // setting skip
    if (importOptions.skip !== '0') {
        let newSkip = isNaN(parseInt(importOptions.skip)) ? 0 : parseInt(importOptions.skip); 
        theCommand += ', skip = "' + newSkip + '"';
        importObj.skip = newSkip;
    } else if (importOptions.skip == '0'){
        importObj.skip = 0;
    }
    // setting strip white | trim space
    if (importOptions.stripwhite) {
        theCommand += ', strip.white = TRUE';
        importObj['strip.white'] = true;
    } else {
        importObj['strip.white'] = false;
    }
    // setting comment char
    switch(importOptions.commentchar) {
        case '#':
            importObj['comment.char'] = '#';
            break;
        case 'Disabled':
            theCommand += ', comment.char =""';
            importObj['comment.char'] = '';
            break;
        default:
            theCommand += ', comment.char ="' + importOptions.commentchar + '"';
            importObj['comment.char'] = importOptions.commentchar;
    }
    // closing the command
    theCommand += ")";

    return theCommand;    
}
// retun a text's width
function getTextDim(paper, textDim) 
{
    // temporary element to get the button's width
    let labelT = paper.text(50, 50, textDim).attr({"text-anchor": "start", "font-size": '13px', "font-family": 'Arial'});
    let lBBox = labelT.getBBox();
    labelT.remove();   

    return {width: lBBox.width, height: lBBox.height};
}
// enable input editing
function customInput(width, height, x, y, oldValue, paper) 
{    
    return new Promise((resolve, reject) => {
        let container = paper.canvas.parentNode;    
        let styles = "position: absolute; width: "+ (width) +"px; height: "+ (height) +"px; left: "+ x +"px; top: "+ y +"px; border: none; font-size: 13px; font-family: Arial ; background: #FFFFFF; z-index:9000;";
        
        let input = document.createElement("input");

        input.setAttribute("style", styles);
        input.setAttribute("id", "inputEdit");
        input.value = oldValue;
        container.appendChild(input);
        input.focus();

        input.addEventListener('keyup', (event) => {
            if(event.keyCode === 13) {
                input.blur();
            }
            if(event.keyCode === 27) {
                resolve(oldValue);
                input.blur();
            }
        });
        input.addEventListener('blur', (event) => {
            input.parentNode.removeChild(input);            
            resolve(input.value);
        });            
    });
}
// limit a text to a fix width
function limitTextOnWidth(text, width, paper)
{
    let textDim =  getTextDim(paper, text);
    
    while(textDim.width > (width - 13))
    {
        text = text.substring(0, text.length - 5);
        textDim = getTextDim(paper, text);           
    }
    return text;
}
