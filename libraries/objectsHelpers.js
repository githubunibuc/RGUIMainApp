
const objectsHelpers = {
    
    // get the element's value for command
    getCommandElementValue: function(objList, objRadios, name)
    {
        // we have the object
        if(objList[name] !== void 0) {
            let el = objList[name];
            
            // is a checkbox
            if(el.checked !== void 0) {
                return el.checked;
            }
            // is input or counter
            if(el.value !== void 0) {
                return el.value;
            }
        } else {
            // check if we have a radioGroup            
            if(objRadios[name] !== void 0) {
                let found = '';
                for (let key in objRadios[name]) {
        
                    if(objList[key].selected){
                        found = objList[key].name;
                    }
                }
                return found;
            }
        }
    },
    // updateCommand - remove elements
    updateCommand: function(command, defaultElements, elName, elNameFull, elValue) 
    {
        // type comparison fix
        elValue = (elValue === true) ? 'true' : elValue;
        elValue = (elValue === false) ? 'false' : elValue;

        let commandArgs = [];
        let newCommand = '';
        commandArgs = this.getCommandArgs(command);            
        // console.log(commandArgs);
        
        if (commandArgs.length > 0) {    
                               
            newCommand += commandArgs[0]; 
            for (let j = 1; j < commandArgs.length - 1; j++) {
                let add = true;  
                for (let i in defaultElements) {
                    
                    if (commandArgs[j].indexOf(i) != -1) {
                        if(i == elName && defaultElements[i] == elValue) {
                            add = false;
                        }
                    }
                }    
                // if is the next element after the ( trim in case the first does not have a value
                if (j == 1) { commandArgs[j] = commandArgs[j].trim(); }
                // do not add element with no value == default value
                if(elValue == '' && commandArgs[j].indexOf(elName) != -1){ add = false; }
                
                if (add && commandArgs[j] !== "") {
                    newCommand += commandArgs[j] + ',';
                }
            }
            if(newCommand[newCommand.length - 1] === ','){
                newCommand = newCommand.substring(0, newCommand.length - 1);
            }
            newCommand += commandArgs[commandArgs.length - 1]; 
        }
        // replace with value
        newCommand = newCommand.replace(elNameFull, elValue);                       
    
        return newCommand;
    },
    // get the comand's args
    getCommandArgs: function(command)
    {
        let fIndex = command.indexOf('(');
        let lIndex = command.lastIndexOf(')');
        // wrong formula?
        if (fIndex == -1 || lIndex == -1) {
            return [];
        }
        let cArgs = command.substring(fIndex+1, lIndex);
        // return splited command        
        return [command.substring(0, fIndex+1), cArgs.split(','), command.substring(lIndex, command.length)].flat(1);
    },

    // retun a text's width
    getTextDim: function(paper, text, fSize, fFamily) 
    {
        // temporary element to get the button's width
        let labelT = paper.text(50, 50, text).attr({"text-anchor": "start", "font-size": fSize, "font-family": fFamily});
        let lBBox = labelT.getBBox();
        labelT.remove();   

        return {width: lBBox.width, height: lBBox.height};
    },
    
    // limit a text to a fix width
    limitTextOnWidth(text, width, paper, fSize, fFamily)
    {
        let textDim =  this.getTextDim(paper, text, fSize, fFamily);
        
        while(textDim.width > (width - 13))
        {
            text = text.substring(0, text.length - 5);
            textDim = this.getTextDim(paper, text, fSize, fFamily);           
        }
        return text;
    },

    // enable input editing
    customInput: function(width, height, x, y, oldValue, paper, fSize, fFamily) 
    {    
        return new Promise((resolve, reject) => {
            let container = paper.canvas.parentNode;    
            let styles = "position: absolute; width: "+ (width) +"px; height: "+ (height) +"px; left: "+ x +"px; top: "+ y +"px; border: none; font-size: "+ fSize +"; font-family: "+ fFamily +" ; background: #FFFFFF; z-index:9000;";
            
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
    },

};

module.exports = objectsHelpers;