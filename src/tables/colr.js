// The `COLR` table adds support for multi-colored glyphs
// https://www.microsoft.com/typography/OTSPEC/colr.htm

import { Parser } from '../parse.js';
import check from '../check.js';
import table from '../table.js';

function parseColrTable(data, start) {
    const p = new Parser(data, start);
    const version = p.parseUShort();
    check.argument(version === 0x0000, 'Only COLRv0 supported.');
    const numBaseGlyphRecords = p.parseUShort();
    const baseGlyphRecordsOffset = p.parseOffset32();
    const layerRecordsOffset = p.parseOffset32();
    const numLayerRecords = p.parseUShort();
    p.relativeOffset = baseGlyphRecordsOffset;
    const baseGlyphRecords = p.parseRecordList(numBaseGlyphRecords, {
        glyphID: Parser.uShort,
        firstLayerIndex: Parser.uShort,
        numLayers: Parser.uShort,
    });
    p.relativeOffset = layerRecordsOffset;
    const layerRecords = p.parseRecordList(numLayerRecords, {
        glyphID: Parser.uShort,
        paletteIndex: Parser.uShort
    });

    return {
        version,
        baseGlyphRecords,
        layerRecords,
    };
}

function makeColrTable({ version = 0x0000, baseGlyphRecords = [], layerRecords = [] }) {
    check.argument(version === 0x0000, 'Only COLRv0 supported.');
    const baseGlyphRecordsOffset = 14;
    const layerRecordsOffset = baseGlyphRecordsOffset + (baseGlyphRecords.length * 6);
    return new table.Table('COLR', [
        { name: 'version', type: 'USHORT', value: version },
        { name: 'numBaseGlyphRecords', type: 'USHORT', value: baseGlyphRecords.length },
        { name: 'baseGlyphRecordsOffset', type: 'ULONG', value: baseGlyphRecordsOffset },
        { name: 'layerRecordsOffset', type: 'ULONG', value: layerRecordsOffset },
        { name: 'numLayerRecords', type: 'USHORT', value: layerRecords.length },
        ...baseGlyphRecords.map((glyph, i) => [
            { name: 'glyphID_' + i, type: 'USHORT', value: glyph.glyphID },
            { name: 'firstLayerIndex_' + i, type: 'USHORT', value: glyph.firstLayerIndex },
            { name: 'numLayers_' + i, type: 'USHORT', value: glyph.numLayers },
        ]).flat(),
        ...layerRecords.map((layer, i) => [
            { name: 'LayerGlyphID_' + i, type: 'USHORT', value: layer.glyphID },
            { name: 'paletteIndex_' + i, type: 'USHORT', value: layer.paletteIndex },
        ]).flat(),
    ]);
}

export default { parse: parseColrTable, make: makeColrTable };
