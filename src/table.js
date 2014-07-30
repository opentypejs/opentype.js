// Table metadata

'use strict';

var check = require('./check');
var encode = require('./types').encode;
var sizeOf = require('./types').sizeOf;

function Table(tableName, fields) {
    for (var i = 0; i < fields.length; i += 1) {
        var field = fields[i];
        this[field.name] = field.value;
    }
    this.tableName = tableName;
    this.fields = fields;
}

Table.prototype.sizeOf = function () {
    var v = 0;
    for (var i = 0; i < this.fields.length; i += 1) {
        var field = this.fields[i];
        var value = this[field.name];
        if (value === undefined) {
            value = field.value;
        }
        if (typeof value.sizeOf === 'function') {
            v += value.sizeOf();
        } else {
            var sizeOfFunction = sizeOf[field.type];
            check.assert(typeof sizeOfFunction === 'function', 'Could not find sizeOf function for field' + field.name);
            v += sizeOfFunction(value);
        }
    }
    return v;
};

Table.prototype.encode = function () {
    return encode.TABLE(this);
};

exports.Table = Table;
