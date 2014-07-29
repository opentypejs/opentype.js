// The `sfnt` wrapper provides organization for the tables in the font.
// It is the top-level data structure in a font.
// https://www.microsoft.com/typography/OTSPEC/otff.htm

'use strict';

var check = require('../check');
var table = require('../table');

function log2(v) {
    return Math.log(v) / Math.log(2) | 0;
}

function calcTableCheckSum(table) {
    var bytes = table.encode();
    while (bytes.length % 4 !== 0) {
        bytes.push(0);
    }
    var sum = 0;
    for (var i = 0; i < bytes.length; i += 4) {
        sum += (table[i] << 24) +
               (table[i + 1] << 16) +
               (table[i + 2] << 8) +
               (table[i + 3]);
    }
    sum %= Math.pow(2, 32);
    return sum;
}

function TableRecord() {
}

TableRecord.prototype = new table.Table('Table Record', [
    {name: 'tag', type: 'TAG', value: ''},
    {name: 'checkSum', type: 'ULONG', value: 0},
    {name: 'offset', type: 'ULONG', value: 0},
    {name: 'length', type: 'ULONG', value: 0}
]);

function SfntTable() {
    this.tables = [];
}

SfntTable.prototype = new table.Table('sfnt', [
    {name: 'version', type: 'TAG', value: 'OTTO'},
    {name: 'numTables', type: 'USHORT', value: 0},
    {name: 'searchRange', type: 'USHORT', value: 0},
    {name: 'entrySelector', type: 'USHORT', value: 0},
    {name: 'rangeShift', type: 'USHORT', value: 0}
]);

SfntTable.prototype.addTable = function (table) {
    this.tables.push(table);
};

SfntTable.prototype.build = function () {
    this.numTables = this.tables.length;
    var highestPowerOf2 = Math.pow(2, log2(this.numTables));
    this.searchRange = 16 * highestPowerOf2;
    this.entrySelector = log2(highestPowerOf2);
    this.rangeShift = this.numTables * 16 - this.searchRange;

    var tableFields = [];
    var offset = this.sizeOf() + ((new TableRecord()).sizeOf() * this.numTables);
    while (offset % 4 !== 0) {
        offset += 1;
        tableFields.push({name: 'padding', type: 'BYTE', value: 0});
    }

    for (var i = 0; i < this.tables.length; i += 1) {
        var table = this.tables[i];
        tableFields.push({name: table.tableName + ' table', type: 'TABLE', value: table});
        var tableLength = table.sizeOf();
        var tableRecord = new TableRecord();
        tableRecord.tag = table.tableName;
        check.argument(table.tableName.length === 4, 'Table name' + table.tableName + ' is invalid.');
        tableRecord.checkSum = calcTableCheckSum(table);
        tableRecord.offset = offset;
        tableRecord.length = tableLength;
        this.fields.push({name: tableRecord.tag + ' Table Record', type: 'TABLE', value: tableRecord});
        offset += tableLength;
        check.argument(!isNaN(offset), 'Something went wrong calculating the offset.');
        while (offset % 4 !== 0) {
            offset += 1;
            tableFields.push({name: 'padding', type: 'BYTE', value: 0});
        }
    }

    this.fields = this.fields.concat(tableFields);
};

exports.Table = SfntTable;
