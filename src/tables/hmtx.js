// The `hmtx` table contains the horizontal metrics for all glyphs.
// https://www.microsoft.com/typography/OTSPEC/hmtx.htm

'use strict';

var parse = require('../parse');
var table = require('../table');

function HmtxTable() {
}

HmtxTable.prototype = new table.Table('hmtx', []);

HmtxTable.prototype.encode = function() {
    var metrics = [{advanceWidth: 600, leftSideBearing: 0}];
    for (var i = 0; i < metrics.length; i += 1) {
        var metric = metrics[i];
        this.fields.push({name: 'advanceWidth_' + i, type: 'USHORT', value: metric.advanceWidth});
        this.fields.push({name: 'leftSideBearing_' + i, type: 'SHORT', value: metric.leftSideBearing});
    }
    console.log('hmtx', this);
    return this;
};

// Parse the `hmtx` table, which contains the horizontal metrics for all glyphs.
// This function augments the glyph array, adding the advanceWidth and leftSideBearing to each glyph.
function parseHmtxTable(data, start, numMetrics, numGlyphs, glyphs) {
    var p, i, glyph, advanceWidth, leftSideBearing;
    p = new parse.Parser(data, start);
    for (i = 0; i < numGlyphs; i += 1) {
        // If the font is monospaced, only one entry is needed. This last entry applies to all subsequent glyphs.
        if (i < numMetrics) {
            advanceWidth = p.parseUShort();
            leftSideBearing = p.parseShort();
        }
        glyph = glyphs[i];
        glyph.advanceWidth = advanceWidth;
        glyph.leftSideBearing = leftSideBearing;
    }
}

function encodeHmtxTable() {
    var t = new HmtxTable();
    return t.encode();
}

exports.parse = parseHmtxTable;
exports.encode = encodeHmtxTable;



