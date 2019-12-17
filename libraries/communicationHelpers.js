const communicationHelpers = {
    missing: function(obj) {
        return(obj === void 0);
    },
    
    isNumeric: function(obj) {   
        if (obj.length == 0) {
            return false;
        }
        else {
            if (obj instanceof Array) {
                var result = new Array(obj.length);
                for (var i = 0; i < obj.length; i++) {
                    result[i] = (obj[i].length == 0) ? false : !/^(NaN|-?Infinity)$/.test(+obj[i]);
                }
                return(result);
            }
            else {
                return !/^(NaN|-?Infinity)$/.test(+obj);
                //return !isNaN(parseFloat(obj)) && isFinite(obj);
            }
        }
    },

    getKeys: function(obj) {
        if (obj === null) return(Array());
        return(Object.keys(obj));
    },

    Rify: function(obj, first) {
        if (this.missing(first)) first = true;
        let result = '';
        // console.log(obj)
        if (obj === null) {
            result += "c()";
        }
        else if (obj instanceof Array) {
            if (obj.length > 1) result += 'c(';
            const objnum = this.isNumeric(obj)[0];
            result += (objnum ? '' : '\"');
            result += obj.join((objnum ? ', ' : '\", \"'));
            result += (objnum ? '' : '\"');
            if (obj.length > 1) result += ')';
        }
        else if (obj instanceof Object) {
            result += first?'':'list(';
            const keys = this.getKeys(obj);
            if (keys.length > 0) {
                for (var i = 0; i < keys.length; i++) {
                    result += keys[i] + ' = ';
                    result += this.Rify(obj[keys[i]], false);
                    if (i < keys.length - 1) result += ', ';
                }
            }
            else {
                result += 'x = \"\"';
            }
            result += first?'':')';
        }
        else {
            result += this.isNumeric(obj)? obj : ('\"' + obj + '\"');;
        }
        return(result.replace('false', 'FALSE').replace('true', 'TRUE'));
    }
}

module.exports = communicationHelpers;
