import assert from 'assert';
import { hex, unhex } from '../testutil.js';
import cpal from '../../src/tables/cpal.js';
import Font from '../../src/font.js';

describe('tables/cpal.js', function() {
    const data = '00 00 00 02 00 02 00 04 00 00 00 10 00 00 00 02 ' +
                 '88 66 BB AA 00 11 22 33 12 34 56 78 DE AD BE EF';
    const obj = {
        version: 0,
        numPaletteEntries: 2,
        colorRecords: [0x8866BBAA, 0x00112233, 0x12345678, 0xDEADBEEF],
        colorRecordIndices: [0, 2],
    };
    const font = new Font({
        familyName: 'test',
        styleName: 'Regular',
        unitsPerEm: 1000,
        ascender: 800,
        descender: -200,
        tables: {
            cpal: obj
        }
    });

    it('can parse cpal table', function() {
        assert.deepStrictEqual(obj, cpal.parse(unhex(data), 0));
    });

    it('can make cpal table', function() {
        const hexString = hex(cpal.make(obj).encode());
        cpal.parse(unhex(hexString), 0);
        assert.deepStrictEqual(data, hexString);
    });
    
    const colors = [
        cpal.getPaletteColor(font, 0),
        cpal.getPaletteColor(font, 1),
        cpal.getPaletteColor(font, 0, 1),
        cpal.getPaletteColor(font, 1, 1),
    ];

    it('correctly parses color values', function() {
        const expectedColors = [
            { a: 0.6666666666666666, b: 136, g: 102, r: 187 },
            { a: 0.2, b: 0, g: 17, r: 34 },
            { a: 0.47058823529411764, b: 18, g: 52, r: 86 },
            { a: 0.9372549019607843, b: 222, g: 173, r: 190 }
        ];
        assert.deepStrictEqual(colors, expectedColors);
    });

    it('correctly formats color values', function() {
        assert.equal(cpal.formatColor(colors[0]), 'rgba(187, 102, 136, 0.667)');
        assert.equal(cpal.formatColor(colors[0], 'rgba'), 'rgba(187, 102, 136, 0.667)');
        assert.equal(cpal.formatColor(colors[1], 'hex'), '#221100');
        assert.equal(cpal.formatColor(colors[2], 'hexa'), '#56341278');
        assert.equal(cpal.formatColor(colors[3], 'hsl'), 'hsl(260.82, 42.61%, 77.45%)');
        assert.equal(cpal.formatColor(colors[3], 'hsla'), 'hsla(260.82, 42.61%, 77.45%, 0.937)');
    });

    it('correctly detects the special palette index for current text color', function() {
        assert.deepStrictEqual(cpal.getPaletteColor(font, 0xFFFF), 'currentColor');
        assert.deepStrictEqual(cpal.formatColor(cpal.getPaletteColor(font, 0xFFFF)), 'currentColor');
        assert.deepStrictEqual(cpal.formatColor(cpal.getPaletteColor(font, 0xFFFF), 'hsla'), 'currentColor');
    });
});
