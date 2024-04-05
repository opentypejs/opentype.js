// The `gvar` table stores information on how to modify glyf outlines across the variation space
// https://learn.microsoft.com/en-us/typography/opentype/spec/gvar

import check from '../check.js';
import parse from '../parse.js';
import table from '../table.js';

function parseGvarTable(data, start, fvar) {
    const p = new parse.Parser(data, start);
    const tableVersionMajor = p.parseUShort();
    const tableVersionMinor = p.parseUShort();
    if (tableVersionMajor !== 1) {
        console.warn(`Unsupported gvar table version ${tableVersionMajor}.${tableVersionMinor}`);
    }
    const axisCount = p.parseUShort();  // Or use the passed axisCount if already available
    if(axisCount !== fvar.axes.length) {
        console.warn(`axisCount ${axisCount} in gvar table does not match the number of axes ${fvar.axes.length} in the fvar table!`);
    }
    const sharedTupleCount = p.parseUShort();

    const sharedTuples = p.parsePointer32(function() {
        return this.parseTupleRecords(sharedTupleCount, axisCount);
    });

    const glyphVariations = p.parseTupleVariationStoreList(axisCount);

    return {
        version: [tableVersionMajor, tableVersionMinor],
        axisCount,
        sharedTupleCount,
        sharedTuples,
        glyphVariations
    };
}

function makeGvarTable(gvar) {
    console.warn('Writing of gvar tables is not yet supported.');
}

export default { make: makeGvarTable, parse: parseGvarTable };
