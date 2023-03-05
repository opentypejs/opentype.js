import assert from 'assert';
import { hex, unhex } from '../testutil.js';
import colr from '../../src/tables/colr.js';

describe('tables/colr.js', function () {
    const data = '00 00 00 02 00 00 00 0E 00 00 00 1A 00 03 ' +
        '00 AA 00 00 00 01 00 BB 00 01 00 02 ' +
        '00 20 FF FF 00 21 00 40 00 23 00 41';
    const obj = {
        version: 0,
        baseGlyphRecords: [
            { glyphID: 0xAA, firstLayerIndex: 0, numLayers: 1 },
            { glyphID: 0xBB, firstLayerIndex: 1, numLayers: 2 },
        ],
        layerRecords: [
            { glyphID: 0x20, paletteIndex: 0xFFFF },
            { glyphID: 0x21, paletteIndex: 0x0040 },
            { glyphID: 0x23, paletteIndex: 0x0041 },
        ]
    };

    it('can parse colr table', function () {
        assert.deepStrictEqual(obj, colr.parse(unhex(data), 0));
    });

    it('can make colr table', function () {
        const hexString = hex(colr.make(obj).encode());
        colr.parse(unhex(hexString), 0);
        assert.deepStrictEqual(data, hexString);
    });
});
