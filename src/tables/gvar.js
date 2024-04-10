// The `gvar` table stores information on how to modify glyf outlines across the variation space
// https://learn.microsoft.com/en-us/typography/opentype/spec/gvar

import parse from '../parse.js';

function parseGvarTable(data, start, fvar, glyphs) {
    const p = new parse.Parser(data, start);
    const tableVersionMajor = p.parseUShort();
    const tableVersionMinor = p.parseUShort();
    if (tableVersionMajor !== 1) {
        console.warn(`Unsupported gvar table version ${tableVersionMajor}.${tableVersionMinor}`);
    }
    const axisCount = p.parseUShort();
    if(axisCount !== fvar.axes.length) {
        console.warn(`axisCount ${axisCount} in gvar table does not match the number of axes ${fvar.axes.length} in the fvar table!`);
    }
    const sharedTupleCount = p.parseUShort();

    const sharedTuples = p.parsePointer32(function() {
        return this.parseTupleRecords(sharedTupleCount, axisCount);
    });

    const glyphVariations = p.parseTupleVariationStoreList(axisCount, 'gvar', glyphs);

    return {
        version: [tableVersionMajor, tableVersionMinor],
        sharedTuples,
        glyphVariations
    };
}

function makeGvarTable(/*gvar*/) {
    console.warn('Writing of gvar tables is not yet supported.');
}

export default { make: makeGvarTable, parse: parseGvarTable };
