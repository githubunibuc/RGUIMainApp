const helpers = require("./helpers");
const conditions = {
    // operators
    operators: ['==', '!=', '>=', '<='],
    elements: [],
    availableProperties: ['selected', 'checked', 'visible', 'enabled'],

    // entry point for parsing an element's condition string
    parseConditions: function(str)
    {
        // clear array every time
        // who is affecting the element
        this.elements.length = 0;

        // we are spliting the element's condition string by semicolumn (;) to get the actual conditions
        let conditions = str.split(';');
        // remove empty trailing condition
        if(conditions[conditions.length - 1] == '') {
            conditions.pop();
        }
        
        // if we do no have conditions or there was an error we exit
        if(conditions.length == 0) { return { error: true, result: {}}; }
    
        let result = {};
    
        for(let i=0; i < conditions.length; i++)
        {
            // we are spliting the condion in two parts based on if
            let ifC = conditions[i].split('if');
            
            // we have an error - wrong format no | method if conditions |
            if(ifC.length != 2){ return { error: true, result: {}}; }
            
            // recursiv parse each condition | ifC[1] is the right side of if
            obj = this.conditionParserRecursion(ifC[1].trim()); 
            
            // there was an error parsing the conditions
            if(obj === void 0){ return { error: true, result: {}}; }

            result[ifC[0].trim()] = obj; 
        }

        // if there are no errors, return results and a copy of elements
        return { error: false, result: result, elements: this.elements.slice() };
    },

    // parse the right side of the if statement
    conditionParserRecursion: function(condition) 
    {
        let response = [];
        let p1 = condition.match(/\(/g);
        let p2 = condition.match(/\)/g);
        
        // get the position of the first level of parantheses if there are any
        let positions = [];
        if(p1 !== null & p2 !== null) {
            if (p1.length == p2.length){
                positions = this.getPositions(condition);
            }
            else {
                // something wrong - probably the parentheses pairs do not match
                return false;
            }
        } 

        // parsing
        let substrings = [];
        // spliting string based on ()
        if (positions.length > 0){
            for (let i=0; i < positions.length + 1; i++) {
                if (i == 0){
                    if (positions[i][0] > 0) {
                        substrings.push(condition.substring(0, positions[i][0] - 1));
                    }
                    substrings.push(condition.substring(positions[i][0], positions[i][1] + 1));
                } else if ( i < positions.length) {
                    substrings.push(condition.substring(positions[i - 1][1] + 1, positions[i][0]).trim());
                    substrings.push(condition.substring(positions[i][0], positions[i][1] + 1).trim());
                } else {
                    substrings.push(condition.substring(positions[i - 1][1] + 1, condition.length).trim());
                }
            }
        } else {
            substrings[0] = condition.trim();
        }
        
        // parsing substrings
        for (let i = 0; i < substrings.length; i++) {
            if (substrings[i][0] == "(") {
                // call ourself on the string without the external ()
                response.push(this.conditionParserRecursion(substrings[i].substring(1, substrings[i].length - 1)));
            }
            else {
                if (substrings[i] != "") {
                    // parse the operand
                    let conditionByLogical = this.logicalsParser(substrings[i]);
                    let cPush = [];
                    for (let j = 0; j < conditionByLogical.length; j++) {
                        res = this.operatorsParser(conditionByLogical[j]);
                        if (Array.isArray(res)) {
                            cPush.push(res);
                        }else{
                            cPush.push(conditionByLogical[j]);
                        }
                    }
                    response.push(cPush);
                }
            }
        }
        return response;
    },

    // entry point for checking an elements conditions
    // weHave - who triggerd the check, 
    // element - what conditions we are checking, 
    // list - contains a referance to all the elements of the dialog
    checkConditions: function(weHave, element, list)
    {
        // geting only the conditions | skiping elements
        let conditions = element.conditions.conditions;

        // methods to apply
        methods = Object.keys(conditions);
        for(let i in methods){
            let mtd = methods[i];
            // recursively checking the conditions (left side of if - now an array)
            let respArray = [];
            let isOK = false;
            if(conditions[mtd] !== void 0) {
                respArray = this.conditionCheckRecursion(conditions[mtd], list);
                // get the array's depth for flatening the array
                let depth = helpers.getArrayDepth(respArray);
                
                isOK = this.textConditionTest(respArray.flat(depth).join(' '));
            }
                                
            // if conditions are meet, try to apply the 'method'
            if(isOK) {
                let asg = mtd.split('=');
                let mtdIs = asg[0].trim();
                let valueIs = (asg[1] != void 0) ? helpers.removeExternalQuotes(asg[1].trim()) : true;
                
                if ( list[valueIs] !== void 0 && list[valueIs].value !== void 0){
                    valueIs = list[valueIs].value;
                } 

                // check if valid method
                if ( typeof list[element.name][mtdIs] === 'function') 
                {
                    // call the method with the value
                    list[element.name][mtdIs](valueIs);
                }
            }
        }        
    },

    // recursiv condition checker
    conditionCheckRecursion: function(conditions, list)
    {        
        // the condition here is an array with string or array keys
        let response = [];
        for(let i = 0; i < conditions.length; i++) {
            if(Array.isArray(conditions[i])) {
                let r = false;
                conditions[i].forEach(function(element) {
                    if(Array.isArray(element)){
                        r = true;
                    }
                });
                if(r) {
                    // if the key is an array call ourself
                    response.push(this.conditionCheckRecursion(conditions[i], list));
                } else {
                    // validate condition
                    response.push(this.validateCondition(conditions[i], list));
                }
            } else {
                // it is an logical perator
                response.push(conditions[i]);
            }  
        }
        return response;    
    },

    // Helpers 
    // =======================================
    // get the position of the () in the string
    getPositions: function(str)
    {    
        // get the position of the ( in the string
        let regex1 = /\(/gi;
        let result;
        let indices1 = [];     
        while((result = regex1.exec(str))){
            indices1.push(result.index);
        }
        // get the position of the ) in the string
        let regex2 = /\)/gi;
        let indices2 = [];     
        while((result = regex2.exec(str))){
            indices2.push(result.index);
        }
    
        // make array of pair parentheses
        let response = [];
        let first = 0;
        for(let i=0; i < indices1.length; i++){
            if (i == indices1.length - 1) {
                response.push([indices1[first], indices2[i]]);
            } else if (indices2[i] < indices1[i + 1]) {
                response.push([indices1[first], indices2[i]]);
                first = i + 1;
            }
        }
        return response;
    },

    // parse by logicals
    logicalsParser: function(str)
    {
        let response = [];
        let a = str.split('&');
        if(a.length == 1) {
            bla = str.split('|');
            for (let i=0; i < bla.length; i++){
                response.push(bla[i]);
                if (i < bla.length - 1) {
                    response.push("|");
                }
            }
        }
        else {
            for(let i = 0; i < a.length; i ++){
                let bla = a[i].split('|');
                for (let j = 0; j < bla.length; j++) {
                    response.push(bla[j].trim());
                    if (j < bla.length - 1) {
                        response.push("|");
                    }
                }
                if (i < a.length - 1) {
                    response.push("&");
                }
            }
        }

        // remove trailing from split
        if (response[0] == "") { response.shift(); }
        if (response[response.length - 1] == "") { response.pop(); }

        return response;
    },
    // parse by operators
    // Note - operator with one char -- do we need it?
    operatorsParser: function(str)
    {
        str = str.trim();
        let counter = 0;
        let operatorFound = '';
        for (let i=0; i < this.operators.length; i++){
            if (str.includes(this.operators[i])) {
                counter++;
                operatorFound = this.operators[i];
            }
        }
        
        // we have an error -> there should be only one operator
        if ( counter > 1 ) { return void 0; }

        // nothing found, return the string
        if (counter === 0) { return str; }

        let a = str.split(operatorFound);

        let element = a[0].trim();
        // save the element that is affecting us
        if(!this.elements.includes(element)) {
            this.elements.push(element);
        }

        return [element, operatorFound, a[1].trim()];
    },

    // validate a condition
    validateCondition: function(condition, list)
    {
        // a condition mist have exactly 3 elements | name, operator, property(value)
        if(condition.length != 3){
            return false;
        }

        let res = false;
        let name = condition[0]; 
        let operator = condition[1]; 
        let propertyOrValue = condition[2]; 

        // is it a valid property?
        if(this.availableProperties.includes(propertyOrValue))
        {    
            // check if element and property exists
            if(list[name] === void 0 && list[name][propertyOrValue] === void 0){
                return false;
            }
            switch (operator) {
                case '==':
                    res = list[name][propertyOrValue];
                    break;
                case '!=':
                    res = !list[name][propertyOrValue];
                    break;
            }
        } else {
            // check if element and value exists
            if(lista[name].value === void 0){
                return false;
            }
            switch (operator) {
                case '==':
                    res = (list[name].value == propertyOrValue);
                    break;
                case '!=':
                    res = (list[name].value != propertyOrValue);
                    break;
                case '>=':
                    res = (list[name].value >= propertyOrValue) ? true : false;
                    break;
                case '>=':
                    res = (list[name].value <= propertyOrValue) ? true : false;
                    break;
            }
        }                
        // in case of wrong values
        if(res) {
            return true;
        } else {
            return false;
        }
    },
    // text condition test
    textConditionTest: function(txt)
    {
        return Function('"use strict";return (' + txt + ')')();
    }
};

module.exports = conditions;