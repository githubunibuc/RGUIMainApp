const { ipcRenderer } = require('electron');
const { BrowserWindow } = require('electron').remote;
const EventEmitter = require('events');
const path = require('path');

const i18next = require("i18next");
const Backend = require ('i18next-sync-fs-backend');
const i18nextOptions = require("../../i18nextOptions");

// TODO -- optimize for multiple settings

ipcRenderer.on('settingsLoaded', (event, args) => {
    
    let wWidth = args.wWidth;
    let wHeight = args.wHeight;

    let settings = args.systemS;
    let data = args.data;

    // load translations to FRONT
    i18nextOptions.setLanguage(settings.language, settings.languageNS);
    i18next.use(Backend).init(i18nextOptions.getOptions(process.env.NODE_ENV, false));    

    // create paper and background
    let paper = Raphael('paperSettings', wWidth - 10, wHeight - 10);
    paper.rect(0, 0, wWidth - 10, wHeight - 10).attr({fill: '#FFFFFF', stroke: '#FFFFFF'});

    // Default language
    paper.text(15, 25, i18next.t('Language')).attr({'fill': '#000000', "font-size": '13px', "font-family": 'Arial', 'text-anchor': 'start', "cursor": "default"});
    
    // select default language
    let language = drawSelect(paper, 15, 40, Object.keys(data.languages));
    language.setValue(langName(data.languages, data.defaultLanguage));

    
    // Settings reload app message
    paper.text(15, wHeight - 28, i18next.t('If order to apply the setting please reload the aplication.')).attr({'fill': '#aaaaaa', "font-size": '13px', "font-family": 'Arial', 'text-anchor': 'start', "cursor": "default"});

    let buttonsX = wWidth - 185;
    let buttonsY = wHeight - 40;
    // get the text's width
    let saveBox = getTextDim(paper, i18next.t('Save'));
    let saveTxtPosX = buttonsX + (Math.floor(75/2) - Math.floor(saveBox.width / 2));
    // save button
    paper.rect(buttonsX, buttonsY, 75, 25).attr({fill: "#FFFFFF", "stroke": "#5d5d5d", "stroke-width": 1});
    paper.text(saveTxtPosX, buttonsY + 12, i18next.t('Save')).attr({'fill': '#000000', "font-size": '13px', "font-family": 'Arial', 'text-anchor': 'start', "cursor": "default"});
    paper.rect(buttonsX, buttonsY, 75, 25).attr({fill: "#FFFFFF", stroke: "none", "fill-opacity": 0, "cursor": "pointer"}).click(function saveSettings(){
    
        let sendData = {'defaultLanguage': langCode(data.languages, language.value)};

        ipcRenderer.send('saveSettings', sendData);
        // window closes if setting succesfully saved.
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

ipcRenderer.on('settingsSaved', (event, args) => {
    BrowserWindow.getFocusedWindow().close();
});

// make a select element
function drawSelect(paper, x, y, list)
{
    let eventMe = new EventEmitter();

    // data to int
    let dataLeft = parseInt(x);
    let dataTop = parseInt(y);
    let dataWidth = 175;

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
            listSupport.div.style.left = (dataLeft - 1) + 'px';
            listSupport.div.style.width = (dataWidth -1) + 'px';
            // initial height only visible
            listSupport.div.style.height = '0px';

            // initialy paper is small - allow ather elements to be clickable
            let newPaper = Raphael(listSupport.div, dataWidth, 1);
            let p = document.getElementById('paperSettings');
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
            eventMe.emit('deSelected');
        } else if (list.includes(val)) {
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
            if( exist !== null && listSupport.listBg.items[exist] !== void 0) {                
                listSupport.listBg.items[exist].attr({fill: "#79a74c"});
            }
        }
        listSupport.hide();
    };

    return select;
}

function langCode(langs, lang)
{
    let code;
    for (let item in langs) {
        if (item === lang) {
            code = langs[item];
        }
    }
    return code;
}
function langName(langs, code)
{
    let name;
    for (let item in langs) {
        if (langs[item] === code) {
            name = item;
        }
    }
    return name;
}

// retun a text's width
function getTextDim(paper, text, fSize, fFamily) 
{
    // temporary element to get the button's width
    let labelT = paper.text(50, 50, text).attr({"text-anchor": "start", "font-size": '13px', "font-family": 'Arial'});
    let lBBox = labelT.getBBox();
    labelT.remove();   

    return {width: lBBox.width, height: lBBox.height};
}