// Table metadata

'use strict';

// var encode = require('./types').encode;

function Table(tableName, fields) {
    console.log('init table ', tableName, ' with fields', this, fields);
    for (var i = 0; i < fields.length; i += 1) {
        var field = fields[i];
        this[field.name] = field.value;
    }
    this.tableName = tableName;
    this.fields = fields;
}

Table.prototype.encode = function () {
    console.log('Encode table', this);
    return [1, 2, 3];
};

exports.Table = Table;
