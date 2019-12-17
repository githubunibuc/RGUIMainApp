const os = require('os');
const pty = require('node-pty');
const Terminal = require('xterm').Terminal;
const chalk = require('chalk');
const { ipcRenderer } = require('electron');
const { BrowserWindow, dialog } = require('electron').remote;
// const logger = require('./logging');
// const upath = require("upath");
const commHelpers = require('./communicationHelpers');
// const stripAnsi = require('strip-ansi');
const commandExec = require('child_process');


// check if R is installed
let shell = '';
let findR; 

if(process.platform === 'win32') {
    findR = commandExec.execSync('where.exe R.exe',
    {
        shell: 'cmd.exe',
        cwd: process.cwd(),
        env: process.env,
        encoding: 'UTF8'
    });
} else {
  findR = commandExec.execSync('which R',
    {
        shell: '/bin/bash',
        cwd: process.cwd(),
        env: process.env,
        encoding: 'UTF8'
    });
}

// The R Shell
shell = findR.replace(/(\r\n|\n|\r)/gm, "");

// we use this variable to send invisible data to R
var invisible = false;
var runFromVisible = false;
var response = '';
let keyboardEnter = false;
let initial = true;

// terminal PTY
let ptyEnv;
if(process.platform === 'win32') {
    ptyEnv = {
        TERM: 'xterm-256color',
        WINPTY_FLAG_PLAIN_OUTPUT: '1',
        SHELL: shell,
        USER: process.env.USERNAME,
        PATH: process.env.PATH,
        PWD: process.env.PWD,
        SHLVL: '5',
        HOME: process.env.HOMEPATH,
        LOGNAME: process.env.USERNAME,
        FORCE_COLOR: '1',
        TMP: process.env.TMP
    };
} else if (process.platform === 'darwin') {
    ptyEnv = {
        TERM: 'xterm-256color',
        WINPTY_FLAG_PLAIN_OUTPUT: '1',
        SHELL: shell,
        USER: process.env.LOGNAME,
        PATH: process.env.PATH,
        PWD: process.env.PWD,
        SHLVL: '5',
        HOME: process.env.HOME,
        LOGNAME: process.env.LOGNAME,
        FORCE_COLOR: '1',
        TMP: process.env.TMPDIR
    };
} else if (process.platform === 'linux') {
    // needs testing
    ptyEnv = {
        TERM: 'xterm-256color',
        WINPTY_FLAG_PLAIN_OUTPUT: '1',
        SHELL: shell,
        USER: process.env.LOGNAME,
        PATH: process.env.PATH,
        PWD: process.env.PWD,
        SHLVL: '5',
        HOME: process.env.HOME,
        LOGNAME: process.env.LOGNAME,
        FORCE_COLOR: '1',
        TMP: process.env.TMPDIR
    };
}

const ptyProcess = pty.spawn(shell, ['-q', '--no-save'], {
    name: 'xterm-color',
    cols: 80,
    rows: 50,
    cwd: process.env.HOME,
    env: ptyEnv,
    handleFlowControl: true,
    useConpty: false,
    conptyInheritCursor: false
});

// Initialize xterm.js and attach it to the DOM
const xterm = new Terminal({
    fontSize: 13,
    tabStopWidth: 4,
    cursorBlink: true,
    cursorStyle: 'bar',
    cols: 10,
    rows: 10,
    lineHeight: 1,
    // rendererType: 'dom',
    theme: {
        background: '#f8f8f8',
        foreground: '#000080',
        cursor: '#ff0000',
        cursorAccent: '#ff0000',
        selection: 'rgba(193, 221, 255, 0.5)'
    }
});

xterm.open(document.getElementById('xterm'));
// Setup communication between xterm.js and node-pty
xterm.onData( data => { 
    invisible = false;
    ptyProcess.write(data);
});
xterm.onKey( (e) => {
    // on command call RGUI_call()
    if (e.key === '\r' && e.domEvent.keyCode === 13) {
        keyboardEnter = true;   
    }
});
ptyProcess.on('data', (data) => {

    // console.log(data);
    const prompter = data.charAt(0) === '>';
    const dl = data.length;

    if (invisible) 
    {
        if (!prompter) {
            response += data;          
        } else {
            comm.processData(response);
        }
    } else
    // send data to terminal 
    if (data !=='') {
        if (data.includes("Error")) {
            // make line red
            xterm.write(chalk.red(data));
        } else {
            // write to terminal
            xterm.write(data);
            
            if(prompter && dl == 2)
            {
                if(keyboardEnter) {
                    setTimeout( () => {
                        invisible = true;
                        ptyProcess.write('RGUI_call()\n');
                        keyboardEnter = false;
                    }, 1);
                }
            }
        }
    }
});
ptyProcess.on('exit', (code, signal) => {
  ptyProcess.kill();
});


// TODO -- to be removed testing only
const mockupData = {
    "dataframe": {
        "df1": {"nrows": [], // number of rows
                "ncols": [], // number of columns
                "rownames": [],
                "colnames": [],
                "numeric": [], // true, false (for all columns)
                "calibrated": [], // true, false (for all columns)
                "binary": [], // true, false (for all columns)
                "scrollvh": [], // length 2: start row and start column
                "vdata": [[], [], ], // visible data
                "vcoords": "" // sort of a useful hash for the visible data, something like: "1_1_17_8_50"
                // "startrow_startcol_endrow_endcol_ncols"
            },
    },
    "list": [], // just the names of the objects
    "matrix": [], // just the names of the objects
    "vector": [], // just the names of the objects
};

// number of visible rows and columns assume all cells have equal height and width
// but this mig`ht change when further developing the data editor
let infobjs = {
    "vrows": 17, // visible rows in (from) the data editor
    "vcols": 8, // visible columns
    "active": "", // the name of the currently selected dataframe in the data editor
    "dataframe": {},
    "select": {
        "list": [],
        "matrix": [],
        "vector": []
    }
};

const comm = {
    // used for window resize event
    initial: true,

    // start the app
    // send function to communicate to r
    // send function to check for dependencies
    initiateCommunication: function(data)
    {       
        let commands = 'source("' + data.appPath + '/RGUI_call.R"); aa <- data.frame(A = 1:5); RGUI_dependencies(' + commHelpers.Rify(data.dependencies) + '); RGUI_call(); \n';
        invisible = true;
        ptyProcess.write(commands);
    },
    
    // run a command
    runRCommand: function(command)
    {
        invisible = false;
        ptyProcess.write(command + '\n');
        keyboardEnter = true;
    },
    
    // run a command without showing the output in the terminal
    runRCommandInvisible: function(command)
    {
        invisible = true;
        ptyProcess.write(command + '\n');
    },
    
    // process invisible data
    processData: function(data) 
    {      
        let jsonData = this.getJsonText(data);
        
        if (jsonData) {
            try {
                response = '';
                invisible = false;

                let obj = JSON.parse(jsonData);  

                if (obj.missing !== void 0) {
                    // do we have any?
                    if (obj.missing.length > 0) {
                        ipcRenderer.send('missingPackages', obj.missing);
                    }
                }
                // anything changed
                if (obj.changed !== void 0) {
                    for( let key in obj.changed) {
                        // update / create data frame
                        if (key === 'dataframe') {
                            for (let i in obj.changed[key]) {
                                if (infobjs.dataframe[i] === void 0) {
                                    infobjs.dataframe[i] = {};
                                    infobjs.dataframe[i] = obj.changed[key][i];
                                } else {
                                    infobjs.dataframe[i] = obj.changed[key][i];
                                }
                            }
                        }
                        // update / create list
                        if (key === 'list') {
                            for (let i = 0; i < obj.changed[key].length; i++) {
                                if (infobjs.select.list.length === 0) {
                                    infobjs.select.list.push(obj.changed[key][i]);
                                } else if (!infobjs.select.list[i].includes(obj.changed[key][i])){
                                    infobjs.select.list.push(obj.changed[key][i]);
                                }
                            }
                        }
                        // update / create matrix
                        if (key === 'matrix') {
                            for (let i = 0; i < obj.changed[key].length; i++) {
                                if (infobjs.select.matrix.length === 0) {
                                    infobjs.select.matrix.push(obj.changed[key][i]);
                                } else if (!infobjs.select.matrix[i].includes(obj.changed[key][i])){
                                    infobjs.select.matrix.push(obj.changed[key][i]);
                                }
                            }
                        }
                        // update / create vector
                        if (key === 'vector') {
                            for (let i = 0; i < obj.changed[key].length; i++) {
                                if (infobjs.select.vector.length === 0) {
                                    infobjs.select.vector.push(obj.changed[key][i]);
                                } else if (!infobjs.select.vector[i].includes(obj.changed[key][i])){
                                    infobjs.select.vector.push(obj.changed[key][i]);
                                }
                            }
                        }
                    }
                }
                // is any element deleted ?
                if (obj.deleted !== void 0) {
                    for( let key in obj.changed) {
                        // delete data frame
                        if (key === 'dataframe') {
                            for (let i in obj.changed[key]) {
                                if (infobjs.dataframe[i] !== void 0) {
                                    delete infobjs.dataframe[i];
                                }
                            }
                        }
                        // delete list
                        if (key === 'list') {
                            for (let i = 0; i < obj.changed[key].length; i++) {
                                let index = infobjs.select.list[i].indexOf(obj.changed[key][i]);
                                if ( index != -1) {
                                    infobjs.select.list.splice(index, 1);
                                }
                            }
                        }
                        // delete matrix
                        if (key === 'matrix') {
                            for (let i = 0; i < obj.changed[key].length; i++) {
                                let index = infobjs.select.matrix[i].indexOf(obj.changed[key][i]);
                                if ( index != -1) {
                                    infobjs.select.matrix.splice(index, 1);
                                }
                            }
                        }
                        // delete vector
                        if (key === 'vector') {
                            for (let i = 0; i < obj.changed[key].length; i++) {
                                let index = infobjs.select.vector[i].indexOf(obj.changed[key][i]);
                                if ( index != -1) {
                                    infobjs.select.vector.splice(index, 1);
                                }
                            }
                        }
                    }
                }  
                
                if(obj.imported !== void 0) {
                    // let data = {
                    //     vdata: obj.imported.vdata,
                    //     colnames: obj.imported.colnames,
                    //     rownames: obj.imported.rownames
                    // };
                    ipcRenderer.send('importDataForPreview', obj.imported);
                }
                // send update to dialogs
                ipcRenderer.send('dialogIncomingData', {name: null, data: infobjs});
            }
            catch(e){
                console.log(e);
                console.log(jsonData);
            }
        } else {
            if (data.includes('#nodata#')) {
                invisible = false;
                response = '';
            }
        }
        // invisible = false;
    },

    // return current data
    getCurrentData: function()
    {
        // console.log(infobjs);
        
        return infobjs;
    },
    // // For testing only
    // sendComandForPreviewData: function(args)
    // {
    //     return {
    //         colnames: ["a.b.c.d"],
    //         vdata: [["1,2,3,4","5,6,7,8","9,10,11,12","13,14,15,16"]]
    //     };
    //     // return {
    //     //     colnames: ["asdvafs dfsdvsrgs", "b", "c","d"],
    //     //     vdata: [[1,5,9,13],[2,6,10,14],[3,7,11,15],[4,8,12,16]]
    //     // };
    // },

    // Helpers ===========================================================
    //return a json seq from string
    getJsonText: function(theString)
    {   
        let cleanString = theString;
        let start = cleanString.lastIndexOf('startR');
        let end = cleanString.lastIndexOf('endR');
        
        if (start !== -1 && end !== -1) {
            newString = cleanString.slice(start+7, end-1);
            // clean string
            // console.log(newString);
            
            newString = newString.replace(/[^\x20-\x7E]+/g, "");
            newString = newString.replace(/\[0K/g, "");
            newString = newString.replace(/\[[0-9]+G/g, "");
            newString = newString.replace(/\[\?25(h|l)/gmu, "");
            return newString;
        }else {
            return false;
        }
    },
    // resize the terminal with the window
    resizeTerm: function()
    {
        let theWindow = BrowserWindow.getFocusedWindow(); 
        if( theWindow !== null) {
            let size = theWindow.getSize(); 
            let termDiv = document.getElementById('xterm');
            let computed = window.getComputedStyle(termDiv);
            let pageContainer = window.getComputedStyle(document.getElementById('pageContainer'));
            let commandHeight = window.getComputedStyle(document.getElementById('command'));   

            let width = Math.max(0, parseInt(computed.getPropertyValue('width'))) - xterm._core.viewport.scrollBarWidth - 15;
            let height = parseInt(pageContainer.getPropertyValue('height')) - parseInt(commandHeight.getPropertyValue('height')) - 15;
            
            let newWidth = Math.max(2, (Math.floor(width / xterm._core._renderService.dimensions.actualCellWidth)  - 0));
            let newHeight = Math.max(1, (Math.floor(height / xterm._core._renderService.dimensions.actualCellHeight) - 1));
            
            xterm.resize(newWidth, newHeight);
            ptyProcess.resize(newWidth, newHeight);

            // add resize listener
            if (this.initial) {
                theWindow.on('resize', this.debounce(comm.resizeTerm, 500, false));
                this.initial = false;
            }
        }
    },
    // for resizing the terminal
    debounce: function(func, wait, immediate) 
    {
        var timeout;
        return function() {
            var context = this, args = arguments;
            var later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    }
};

module.exports = comm;
