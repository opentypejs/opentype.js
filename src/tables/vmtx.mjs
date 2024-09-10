// The `vmtx` table contains the vertical metrics for all glyphs.
// https://learn.microsoft.com/en-us/typography/opentype/spec/vmtx

import parse from '../parse.mjs';
import table from '../table.mjs';

function parseVmtxTableAll(data, start, numMetrics, numGlyphs, glyphs) {
    let advanceHeight;
    let topSideBearing;
    const p = new parse.Parser(data, start);
    for (let i = 0; i < numGlyphs; i += 1) {
        // If the font is monospaced, only one entry is needed. This last entry applies to all subsequent glyphs.
        if (i < numMetrics) {
            advanceHeight = p.parseUShort();
            topSideBearing = p.parseShort();
        }

        const glyph = glyphs.get(i);
        glyph.advanceHeight = advanceHeight;
        glyph.topSideBearing = topSideBearing;
    }
}

function parseVmtxTableOnLowMemory(font, data, start, numMetrics, numGlyphs) {
    font._vmtxTableData = {};

    let advanceHeight;
    let topSideBearing;
    const p = new parse.Parser(data, start);
    for (let i = 0; i < numGlyphs; i += 1) {
        // If the font is monospaced, only one entry is needed. This last entry applies to all subsequent glyphs.
        if (i < numMetrics) {
            advanceHeight = p.parseUShort();
            topSideBearing = p.parseShort();
        }

        font._vmtxTableData[i] = {
            advanceHeight: advanceHeight,
            topSideBearing: topSideBearing
        };
    }
}

// Parse the `vmtx` table, which contains the horizontal metrics for all glyphs.
// This function augments the glyph array, adding the advanceHeight and topSideBearing to each glyph.
function parseVmtxTable(font, data, start, numMetrics, numGlyphs, glyphs, opt) {
    if (opt.lowMemory)
        parseVmtxTableOnLowMemory(font, data, start, numMetrics, numGlyphs);
    else
        parseVmtxTableAll(data, start, numMetrics, numGlyphs, glyphs);
}

function makeVmtxTable(glyphs) {
    const t = new table.Table('vmtx', []);
    for (let i = 0; i < glyphs.length; i += 1) {
        const glyph = glyphs.get(i);
        const advanceHeight = glyph.advanceHeight || 0;
        const topSideBearing = glyph.topSideBearing || 0;
        t.fields.push({name: 'advanceHeight_' + i, type: 'USHORT', value: advanceHeight});
        t.fields.push({name: 'topSideBearing_' + i, type: 'SHORT', value: topSideBearing});
    }

    return t;
}

export default { parse: parseVmtxTable, make: makeVmtxTable };
