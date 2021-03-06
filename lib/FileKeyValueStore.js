var api = require('./api.js');
var fs = require('fs-extra');
var path = require('path');
var utils = require('./utils');

var FileKeyValueStore = api.KeyValueStore.extend({

    _dir: "",   // root directory for the file store

    constructor: function(dir /*string*/) {
        this._dir = dir;
        fs.mkdirsSync(this._dir);
    },

    /**
     * Get the value associated with name.
     * @param name
     * @returns Promise for the value
     */
    getValue: function(name /*string*/) {
    	var self = this;

    	return new Promise(function(resolve, reject) {
	        var p = path.join(self._dir, name);
	        fs.readFile(p, 'utf8', function (err, data) {
	            if (err) {
	                if (err.code !== 'ENOENT') {
	                	reject(err);
	                } else {
                        return resolve(null);
                    }
	            }

	            return resolve(data);
	        });
    	});
    },

    /**
     * Set the value associated with name.
     * @param name
     * @returns Promise for a "true" value on successful completion
     */
    setValue: function (name /*string*/, value /*string*/) {
    	var self = this;

    	return new Promise(function(resolve, reject) {
	        var p = path.join(self._dir, name);
	        fs.writeFile(p, value, function(err) {
	        	if (err) {
	        		reject(err);
	        	} else {
                    return resolve(true);
                }
	        });
    	});
    }
});

module.exports = FileKeyValueStore;