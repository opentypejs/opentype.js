// The `CPAL` define a contiguous list of colors (colorRecords)
// Theses colors must be index by at least one default (0) palette (colorRecordIndices)
// every palettes share the same size (numPaletteEntries) and can overlap to refere the same colors
// https://www.microsoft.com/typography/OTSPEC/cpal.htm

import { Parser } from '../parse.js';
import check from '../check.js';
import table from '../table.js';

// Parse the header `head` table
function parseCpalTable(data, start) {
    const p = new Parser(data, start);
    const version = p.parseShort();
    const numPaletteEntries = p.parseShort();
    const numPalettes = p.parseShort();
    const numColorRecords = p.parseShort();
    const colorRecordsArrayOffset = p.parseOffset32();
    const colorRecordIndices = p.parseUShortList(numPalettes);
    p.relativeOffset = colorRecordsArrayOffset;
    const colorRecords = p.parseULongList(numColorRecords);
    return {
        version,
        numPaletteEntries,
        colorRecords,
        colorRecordIndices,
    };
}

function makeCpalTable({ version = 0, numPaletteEntries = 0, colorRecords = [], colorRecordIndices = [0] }) {
    check.argument(version === 0, 'Only CPALv0 are supported.');
    check.argument(colorRecords.length, 'No colorRecords given.');
    check.argument(colorRecordIndices.length, 'No colorRecordIndices given.');
    if (colorRecordIndices.length > 1) {
        check.argument(numPaletteEntries, 'Can\'t infer numPaletteEntries on multiple colorRecordIndices');
    }
    return new table.Table('CPAL', [
        { name: 'version', type: 'USHORT', value: version },
        { name: 'numPaletteEntries', type: 'USHORT', value: numPaletteEntries || colorRecords.length },
        { name: 'numPalettes', type: 'USHORT', value: colorRecordIndices.length },
        { name: 'numColorRecords', type: 'USHORT', value: colorRecords.length },
        { name: 'colorRecordsArrayOffset', type: 'ULONG', value: 12 + 2 * colorRecordIndices.length },
        ...colorRecordIndices.map((palette, i) => ({ name: 'colorRecordIndices_' + i, type: 'USHORT', value: palette })),
        ...colorRecords.map((color, i) => ({ name: 'colorRecords_' + i, type: 'ULONG', value: color })),
    ]);
}

export default { parse: parseCpalTable, make: makeCpalTable };

