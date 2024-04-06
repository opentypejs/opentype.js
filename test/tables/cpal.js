import assert from 'assert';
import { hex, unhex, enableMockCanvas } from '../testutil.js';
import cpal, { parseColor } from '../../src/tables/cpal.js';
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
            '#bb6688aa',
            '#22110033',
            '#56341278',
            '#beaddeef',
        ];
        assert.deepStrictEqual(colors, expectedColors);

        enableMockCanvas();

        const convertedColors = [
            parseColor(0x12345678, 'raw'),
            parseColor(0x12345678, 'cpal'),
            parseColor('currentColor'),
            parseColor('#ffaa00', 'raw'),
            parseColor('#ffaa00', 'bgra'),
            parseColor('#ffaa0033', 'raw'),
            parseColor('#ffaa0033', 'bgra'),
            parseColor('#DeadBeef', 'hexa'),
            parseColor('#123', 'raw'),
            parseColor('#123', 'bgra'),
            parseColor('#123', 'hexa'),
            parseColor('#1234', 'bgra'),
            parseColor('#1234', 'hexa'),
            parseColor('rgb(17, 34 ,51)', 'hexa'),
            parseColor('rgb(17,34,51,0.267 )', 'hexa'),
            parseColor('rgba(17,34 ,51)', 'hexa'),
            parseColor('rgba( 17,34,51, 0.267)', 'hexa'),
            parseColor('rgb( 17,34,51, .267)', 'hexa'),
            parseColor(' rgba(17 , 34,51,.267) ', 'hexa'),
            parseColor('rgba(17,34,51,0) ', 'hexa'),
            parseColor('rgb(17 34  51)', 'hexa'),
            parseColor('rgb(17 34 51 0.267 )', 'hexa'),
            parseColor('rgba(17  34 51 )', 'hexa'),
            parseColor('rgba( 17 34 51 0.267)', 'hexa'),
            parseColor('rgb( 17 34 51 .267)', 'hexa'),
            parseColor(' rgba(17 34 51  .267) ', 'hexa'),
            parseColor('rgba(17 34 51 0) ', 'hexa'),
            parseColor('rgba(17 34 51 26.7%) ', 'hexa'),
            parseColor('rgba(17 34 51 / 26.7%) ', 'hexa'),
            parseColor('rgba(17 34 51 / 0.267) ', 'hexa'),
            parseColor('rgba(17 34 51 / .267) ', 'hexa'),
            parseColor('rgba(6.66% 13.33% 20% / .267) ', 'hexa'),

            parseColor('hsl( 260.82, 42.61%, 77.45%)', 'hexa'),
            parseColor('hsla(260.82, 42.61%, 77.45%, 0.9373)', 'raw'),
            parseColor('background: hsl(0.3turn 48% 48%);', 'rgb'),
            
            parseColor('rebeccapurple', 'hex'),
        ];

        const expectedConvertedColors = [
            0x12345678,
            0x12345678,
            'currentColor',
            0x00aaffff,
            { r: 255, g: 170, b: 0, a: 1 },
            0x00aaff33,
            { r: 255, g: 170, b: 0, a: 0.2 },
            '#deadbeef',
            0x332211FF,
            { r: 17, g: 34, b: 51, a: 1 },
            '#112233ff',
            { r: 17, g: 34, b: 51, a: 0.26666666666666666 },
            '#11223344',
            '#112233ff',
            '#11223344',
            '#112233ff',
            '#11223344',
            '#11223344',
            '#11223344',
            '#11223300',
            '#112233ff',
            '#11223344',
            '#112233ff',
            '#11223344',
            '#11223344',
            '#11223344',
            '#11223300',
            '#11223344',
            '#11223344',
            '#11223344',
            '#11223344',
            '#11223344',

            '#beaddeff',
            obj.colorRecords[3],
            'rgb(87, 181, 64)',

            '#663399',
        ];

        assert.deepEqual(convertedColors, expectedConvertedColors);
    });

    it('correctly formats color values', function() {
        const formattedColors = [
            cpal.formatColor(colors[0]),
            cpal.formatColor(colors[0], 'rgba'),
            cpal.formatColor(colors[0], 'bgra'),
            cpal.formatColor(colors[1], 'hex'),
            cpal.formatColor(colors[1], 'hexa'),
            cpal.formatColor(colors[1], 'raw'),
            cpal.formatColor(colors[2], 'hexa'),
            cpal.formatColor(colors[3], 'hsl'),
            cpal.formatColor(colors[3], 'hsla'),
        ];
        const expectedColors = [
            '#bb6688aa',
            'rgba(187, 102, 136, 0.667)',
            {b: 136, g: 102, r: 187, a: 0.6666666666666666},
            '#221100',
            '#22110033',
            0x00112233,
            '#56341278',
            'hsl(260.82, 42.61%, 77.45%)',
            'hsla(260.82, 42.61%, 77.45%, 0.937)',
        ];

        assert.deepEqual(formattedColors, expectedColors);
    });

    it('correctly detects the special palette index for current text color', function() {
        assert.deepStrictEqual(cpal.getPaletteColor(font, 0xFFFF), 'currentColor');
        assert.deepStrictEqual(cpal.formatColor(cpal.getPaletteColor(font, 0xFFFF)), 'currentColor');
        assert.deepStrictEqual(cpal.formatColor(cpal.getPaletteColor(font, 0xFFFF), 'hsla'), 'currentColor');
    });
});
