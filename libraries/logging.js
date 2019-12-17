const fs = require('fs');
const path = require('path');

const logging = {
    
    theFile: 'messages.log',
    
    info: function(message, file) 
    {    
        if (file) { 
            logging.theFile = file; 
        }
        logging.writeToFile('INFO (' + new Date().toLocaleDateString() + '):' + message + '\r\n');
    },
    
    warning: function(message, file) 
    {
        if (file) { 
            logging.theFile = file; 
        }
        logging.writeToFile('WARNING (' + new Date().toLocaleDateString() + '):' + message + '\r\n');
    },
    
    error: function (message, file) 
    {
        if (file) { 
            logging.theFile = file; 
        }
        logging.writeToFile('ERROR (' + new Date().toLocaleDateString() + '):' + message + '\r\n');
    },
    
    writeToFile: function(data) {
        fs.writeFile(path.resolve(logging.theFile), data, {encoding: 'utf8', flag:'a+'}, function writingLog(err){
            if (err) {
                throw err;
                
            }
        });
    }
};

module.exports = logging;