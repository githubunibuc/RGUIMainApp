
const helpers = {

    //https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
    makeid: function() 
    {
        let result           = '';
        let characters       = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let charactersLength = characters.length;
        for ( let i = 0; i < 5; i++ ) {
           result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    },

    //https://stackoverflow.com/questions/14368596/how-can-i-check-that-two-objects-have-the-same-set-of-property-names
    // This function ignores the elements 'conditions' properties
    hasSameProps: function( obj1, obj2 ) {
        let obj1Props = Object.keys( obj1 ),
            obj2Props = Object.keys( obj2 );
    
        if ( obj1Props.length == obj2Props.length ) {
            return obj1Props.every( function( prop ) {
                return obj2Props.indexOf( prop ) >= 0;
            });
        }
        return false;
    },

    // remove single or double external quotes "text"
    removeExternalQuotes: function(str)
    {
        let newStr = str;
        if((str[0] == "'" || str[0] == '"') && (str[str.length-1] == "'" || str[str.length-1] == '"')) {
            newStr = str.substring(1, str.length-1);
        }
        return newStr;
    },

    // return and array depth
    getArrayDepth: function(obj) {
        if (obj instanceof Array){
            return 1 + Math.max(...obj.map(t => this.getArrayDepth(t)));
        } else {
            return 0;
        }
    },

    // remove item from array
    removeValueFromArray: function(obj, value)
    {
        return(obj.filter(function(element){            
            return element != value;
        }));
    },

    missing: function(x) {
        return x === void 0;
    },

    isBoolean: function(obj) { 
        if (obj.length == 0) {
            return false;
        }

        if (obj instanceof Array) {
            for (let i = 0; i < obj.length; i++) {
                if (!this.isBoolean(obj[i])) {
                    return false;
                }
            }

            return true;
        }

        return(typeof(obj) === "boolean");
    },
    
    isNumeric: function(obj) {   
        if (obj.length == 0) {
            return false;
        }

        if (obj instanceof Array) {
            for (let i = 0; i < obj.length; i++) {
                if (!this.isNumeric(obj[i])) {
                    return false;
                }
            }
            return true;
        }
        
        return !/^(NaN|-?Infinity)$/.test(+obj);
        //return !isNaN(parseFloat(obj)) && isFinite(obj);
        
    },

    isScalar: function(x) {
        if (typeof(x) === "number") {
            // to prevent NaN being considered numeric
            if (this.isNumeric(x)) return true;
        }
        else if (typeof(x) === "string") {
            return true;
        }

        return false;
    },

    isTrue: function(x) {
        return x === true;
    },

    isFalse: function(x) {
        return x === false;
    },
    
    // https://dev.to/duomly/13-useful-javascript-array-tips-and-tricks-you-should-know-2jfo
    array2object: function(obj)
    {
        if (obj instanceof Array){
            return {...obj};
        }
        return new Object;
    },

    sum: function(obj)
    {
        if (this.isNumeric(obj)) {
            return obj.reduce((x, y) => x*1 + y*1);
        }
        return null;
    },

    prod: function(obj) {
        if (this.isNumeric(obj)) {
            return obj.reduce((x, y) => x * y);
        }
        return null;
    },

    which: function(obj) {
        if (!(obj instanceof Array)) {
            return(null);
        }
        let out = new Array(this.sum(obj));
        let index = 0;
        for (let i = 0; i < obj.length; i++) {
            if (obj[i]) {
                out[index] = i;
                index++;
            }
        }
        return out;
    },

    rev: function(obj) // reverse array
    {
        return [...obj].reverse();
    },

    // adapted from:
    // http://stackoverflow.com/questions/728360/how-do-i-correctly-clone-a-javascript-object
    copy: function(obj, exclude) {
        
        // Handle the 3 simple types, and null or undefined
        if (null == obj || "object" != typeof obj) return obj;
        
        // Handle Date
        if (obj instanceof Date) {
            let copy = new Date();
            copy.setTime(obj.getTime());
            return copy;
        }
        
        // Handle Array
        if (obj instanceof Array) {
            //console.log("array");
            let clone = new Array();
            for (let i = 0, len = obj.length; i < len; i++) {
                if (exclude !== void 0) {
                    if (exclude.indexOf(i) < 0) { // or perhaps exclude.indexOf(obj[i]) ??
                        clone.push(copy(obj[i]));
                    }
                }
                else {
                    clone.push(copy(obj[i]));
                }
            }
            return clone;
        }

        // Handle Object
        if (obj instanceof Object) {
            //console.log("object");
            let clone = new Object;
            for (let key in obj) {
                if (obj.hasOwnProperty(key)) {
                    if (exclude !== void 0) {
                        if (exclude.indexOf(key) < 0) {
                            clone[key] = this.copy(obj[key]);
                        }
                    }
                    else {
                        clone[key] = this.copy(obj[key]);
                    }
                }
            }
            return clone;
        }
    },

    // modified version from: https://github.com/pieterprovoost/jerzy/blob/master/lib/vector.js
    sortArray: function(obj, options) {
        
        if (this.missing(options)) {
            options = {};
        }
        
        // empty last is needed to get something like:
        // ["A", "B", ""] instead of ["", "A", "B"]
        // same with numbers
        if (this.missing(options.emptylast)) {
            options.emptylast = true;
        }
        
        let sorted = obj.slice();
        let sortlen = sorted.length;
        for (let i = 0, j; i < sortlen; i++) {
            // allow sorting with letious cases, e.g. "datasets" before "QCA"
            tmp1 = sorted[i];
            tmp2 = tmp1;
            if (!this.isNumeric(tmp1)) {
                tmp2 = tmp2.toLowerCase();
            }

            for (j = i - 1; j >= 0; j--) {
                tmp3 = sorted[j];
                if (!this.isNumeric(tmp3)) {
                    tmp3 = tmp3.toLowerCase();
                }
                if (tmp3 > tmp2) {
                    sorted[j + 1] = sorted[j];
                }
                else {
                    break;
                }
            }
            sorted[j + 1] = tmp1;
        }
        
        if (options.emptylast) {
            let cobj = this.rep("", sortlen);
            let position = 0;
            for (let i = 0; i < sortlen; i++) {
                if (sorted[i] != "") {
                    cobj[position] = sorted[i];
                    position += 1;
                }
            }
            return cobj;
        }
        
        return sorted;
    },

    arraysEqual: function(a, b) {
        if (a === b) {
            return true;
        }
        
        if (a == null || b == null) {
            return false;
        }

        if (a.length != b.length) {
            return false;
        }
        
        for (let i = 0; i < a.length; ++i) {
            if (a[i] !== b[i]) {
                return false;
            }
        }

        return true;
    },

    getKeys: function(obj) {
        if (obj === null) return(Array());
        return Object.keys(obj);
    },

    getTrueKeys: function(obj) { // get those keys which have a logical true
        if (obj === null) {
            return(Array());
        }
        
        let trueKeys = new Array();
        for (let key in obj) {
            if (obj[key]) {
                trueKeys.push(key);
            }
        }
        
        if (trueKeys.length == 0) {
            return(Array());
        }
        else {
            return(trueKeys);
        }
    },

    round: function(x, y) {
        y = Math.pow(10, y);
        return Math.round(x*y)/y;
    },

    all: function(obj, fun) {
        if (!(obj instanceof Array)) return null;

        if (this.missing(fun)) return obj.every(this.isTrue);

        if (typeof fun !== "function") {
            console.log("Argument fun should be a function.");
            return null;
        }

        return obj.every(fun);
    },

    any: function(obj, fun) {
        if (!(obj instanceof Array)) return null;

        if (this.missing(fun)) return obj.some(this.isTrue);

        if (typeof fun !== "function") {
            console.log("Argument fun should be a function.");
            return null;
        }
        
        return obj.some(fun);
    },

    rep: function(rule, times) {
        return Array(times).fill(rule);
    },

    unique: function(obj) {
        if (obj instanceof Array) return [...new Set(obj)];

        if (isScalar(obj)) return obj;

        return null;
    },

    max: function(obj) {
        if (!this.isNumeric(obj)) return null;

        if (obj instanceof Array) return Math.min(...obj);

        return obj;
    },

    max: function(obj) {
        if (!this.isNumeric(obj)) return null;

        if (obj instanceof Array) return Math.max(...obj);

        return obj;
    },

    paste: function(obj, options) {
        if (!(obj instanceof Array)) return("");

        if (obj.length == 0) return("");
        
        if (this.missing(options)) {
            options = {};
        }
        
        if (this.missing(options.sep)) {
            options.sep = " ";
        }
        
        if (this.missing(options.from)) {
            options.from = 0;
        }
        
        if (this.missing(options.to)) {
            options.to = obj.length - 1;
        }
        
        let result = obj[options.from];
        
        if (options.from < options.to) {
            for (let i = options.from + 1; i < options.to + 1; i++) {
                result += options.sep + obj[i];
            }
        }
        
        return result;
    },

    reorder: function(obj, from, to) {
        let keys = this.getKeys(obj);
        let values = new Array(keys.length);
        for (let i = 0; i < keys.length; i++) {
            values[i] = obj[keys[i]];
        }
        
        keys.splice(to, 0, keys.splice(from, 1)[0]);
        values.splice(to, 0, values.splice(from, 1)[0]);
        
        let out = {};
        for (let i = 0; i < keys.length; i++) {
            out[keys[i]] = values[i];
        }
        
        return out;
    },

    duplicated: function(obj) {
        const uniq = this.unique(obj);
        let out = new Array(obj.length).fill(false);
        let duplicate = false;

        for (let i = 0; i < uniq.length; i++) {
            duplicate = false;
            for (let j = 0; j < obj.length; j++) {
                if (obj[j] == uniq[i]) {
                    if (duplicate) {
                        out[j] = true;
                    }
                    duplicate = true;
                }
            }
        }

        return out;
    },

    duplicates: function(obj) {
        let len = obj.length,
            out = [],
            counts = {};
        
        for (let i = 0; i < len; i++) {
            let item = obj[i];
            counts[item] = (counts[item] >= 1) ? (counts[item] + 1) : 1;
        }
        
        for (let item in counts) {
            if (counts[item] > 1) {
                out[out.length] = this.isNumeric(item) ? item*1 : item;
            }
        }
        
        return out;
    },

    intersect: function(x, y) {
        return this.unique(x).filter(item => y.includes(item));
    },

    setdiff: function(x, y) {
        return this.unique(x).filter(item => !y.includes(item));
    },

    union: function(x, y) {
        return this.unique([...x, ...y]);
    },

    Rify: function(obj, first) {
        if (this.missing(first)) {
            first = true;
        }
        const objnum = this.isNumeric(obj);
        let result = '';
        // console.log(obj)
        if (obj === null) {
            result += "c()";
        }
        else if (obj instanceof Array) {
            if (obj.length > 1) result += 'c(';
            result += (objnum ? '' : '\"');
            result += obj.join((objnum ? ', ' : '\", \"'));
            result += (objnum ? '' : '\"');
            if (obj.length > 1) result += ')';
        }
        else if (obj instanceof Object) {
            result += first ? '' : 'list(';
            const keys = this.getKeys(obj);
            if (keys.length > 0) {
                for (let i = 0; i < keys.length; i++) {
                    result += keys[i] + ' = ';
                    result += this.Rify(obj[keys[i]], false);
                    if (i < keys.length - 1) result += ', ';
                }
            }
            else {
                result += 'x = \"\"';
            }
            result += first ? '' : ')';
        }
        else {
            result += objnum ? obj : ('\"' + obj + '\"');;
        }
        return result.replace('false', 'FALSE').replace('true', 'TRUE');
    },


};

module.exports = helpers;
