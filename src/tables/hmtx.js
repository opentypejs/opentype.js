// The `hmtx` table contains the horizontal metrics for all glyphs.
// https://www.microsoft.com/typography/OTSPEC/hmtx.htm

import parse from '../parse.js';
import table from '../table.js';

function parseHmtxTableAll(data, start, numMetrics, numGlyphs, glyphs) {
    let advanceWidth;
    const p = new parse.Parser(data, start);
    for (let i = 0; i < numMetrics; i += 1) {
          advanceWidth = p.parseUShort();  // 16 bits 
         const   leftSideBearing = p.parseShort(); // 16 bits

        const glyph = glyphs.get(i);
        glyph.advanceWidth = advanceWidth;
        glyph.leftSideBearing = leftSideBearing;
    }
// If numGlyphs > numMetrics
    for (let i = numMetrics; i < numGlyphs; i += 1) {
        const glyph = glyphs.get(i);
        glyph.advanceWidth = advanceWidth;//same as from previous loop
        glyph.leftSideBearing = p.parseShort(); // 16 bits
    }
}

function parseHmtxTableOnLowMemory(font, data, start, numMetrics, numGlyphs) {
    font._hmtxTableData = {};

    let advanceWidth;
    const p = new parse.Parser(data, start);
    for (let i = 0; i < numMetrics; i += 1) {
        advanceWidth = p.parseUShort();
        const leftSideBearing = p.parseShort();
        font._hmtxTableData[i] = {
            advanceWidth: advanceWidth,
            leftSideBearing: leftSideBearing,
        };
    }

// If numGlyphs > numMetrics
    for (let i = numMetrics; i < numGlyphs; i += 1) {
        font._hmtxTableData[i] = {
            advanceWidth: advanceWidth,//same as from previous loop
            leftSideBearing: p.parseShort(), // 16 bits
        };
    }
}

// Parse the `hmtx` table, which contains the horizontal metrics for all glyphs.
// This function augments the glyph array, adding the advanceWidth and leftSideBearing to each glyph.
function parseHmtxTable(font, data, start, numMetrics, numGlyphs, glyphs, opt) {
    if (opt.lowMemory)
        parseHmtxTableOnLowMemory(font, data, start, numMetrics, numGlyphs);
    else
        parseHmtxTableAll(data, start, numMetrics, numGlyphs, glyphs);
}

function makeHmtxTable(glyphs) {
    const t = new table.Table('hmtx', []);
    for (let i = 0; i < glyphs.length; i += 1) {
        const glyph = glyphs.get(i);
        const advanceWidth = glyph.advanceWidth || 0;
        const leftSideBearing = glyph.leftSideBearing || 0;
        t.fields.push({name: 'advanceWidth_' + i, type: 'USHORT', value: advanceWidth});
        t.fields.push({name: 'leftSideBearing_' + i, type: 'SHORT', value: leftSideBearing});
    }

    return t;
}

export default { parse: parseHmtxTable, make: makeHmtxTable };
