// The `hmtx` table contains the horizontal metrics for all glyphs.
// https://www.microsoft.com/typography/OTSPEC/hmtx.htm

'use strict';

var parse = require('../parse');
var table = require('../table');

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

function makeHmtxTable() {
    var t = new table.Table('hmtx', []);
    var metrics = [{advanceWidth: 600, leftSideBearing: 0}];
    for (var i = 0; i < metrics.length; i += 1) {
        var metric = metrics[i];
        t.fields.push({name: 'advanceWidth_' + i, type: 'USHORT', value: metric.advanceWidth});
        t.fields.push({name: 'leftSideBearing_' + i, type: 'SHORT', value: metric.leftSideBearing});
    }
    return t;
}

exports.parse = parseHmtxTable;
exports.make = makeHmtxTable;



