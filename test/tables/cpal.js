import assert from 'assert';
import { hex, unhex } from '../testutil.js';
import cpal from '../../src/tables/cpal.js';

describe('tables/cpal.js', function() {
    const data = '00 00 00 02 00 03 00 04 00 00 00 12 00 00 00 01 00 02 ' +
                 '88 66 BB AA 00 11 22 33 12 34 56 78 DE AD BE EF';
    const obj = {
        version: 0,
        numPaletteEntries: 2,
        colorRecords: [0x8866BBAA, 0x00112233, 0x12345678, 0xDEADBEEF],
        colorRecordIndices: [0, 1, 2],
    };

    it('can parse cpal table', function() {
        assert.deepStrictEqual(obj, cpal.parse(unhex(data), 0));
    });

    it('can make cpal table', function() {
        const hexString = hex(cpal.make(obj).encode());
        cpal.parse(unhex(hexString), 0);
        assert.deepStrictEqual(data, hexString);
    });
});
