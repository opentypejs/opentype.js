import assert from 'assert';
import { unhex, hex } from '../testutil.js';
import Glyph from '../../src/glyph.js';
import glyphset from '../../src/glyphset.js';
import Path from '../../src/path.js';
import cff from '../../src/tables/cff.js';
import { parse } from '../../src/opentype.js';
import { readFileSync } from 'fs';
const loadSync = (url, opt) => parse(readFileSync(url), opt);

describe('tables/cff.js', function () {
    const data =
        '01 00 04 01 00 01 01 01 03 70 73 00 01 01 01 32 ' +
        'F8 1B 00 F8 1C 02 F8 1C 03 F8 1D 04 1D 00 00 00 ' +
        '55 0F 1D 00 00 00 58 11 8B 1D 00 00 00 80 12 1E ' +
        '0A 12 5F 1E 0F 1E 0F 1E 0A 12 5F 1E 0F 1E 0F 0C ' +
        '07 00 04 01 01 02 04 06 0B 30 66 6E 77 6E 62 75 ' +
        '6D 70 73 00 00 00 01 8A 00 02 01 01 03 23 9B 0E ' +
        '9B 8B 8B 15 8C 8D 8B 8B 8C 89 08 89 8B 15 8C 8D ' +
        '8B 8B 8C 89 08 89 8B 15 8C 8D 8B 8B 8C 89 08 0E';

    it('can make a cff tag table', function () {
        const options = {
            unitsPerEm: 8,
            version: '0',
            fullName: 'fn',
            postScriptName: 'ps',
            familyName: 'fn',
            weightName: 'wn',
            fontBBox: [0, 0, 0, 0],
        };
        const path = new Path();
        path.moveTo(0, 0);
        path.quadraticCurveTo(1, 3, 2, 0);
        path.moveTo(0, 0);
        path.quadraticCurveTo(1, 3, 2, 0);
        path.moveTo(0, 0);
        path.quadraticCurveTo(1, 3, 2, 0);
        const bumpsGlyph = new Glyph({ name: 'bumps', path, advanceWidth: 16 });
        const nodefGlyph = new Glyph({ name: 'nodef', path: new Path(), advanceWidth: 16 });
        const glyphSetFont = { unitsPerEm: 8 };
        const glyphs = new glyphset.GlyphSet(glyphSetFont, [nodefGlyph, bumpsGlyph]);

        assert.deepEqual(data, hex(cff.make(glyphs, options).encode()));
    });

    /**
     * @see https://github.com/opentypejs/opentype.js/issues/524
     */
    it('can fall back to CIDs instead of strings when parsing the charset', function () {
        const font = loadSync('./test/fonts/FiraSansOT-Medium.otf', { lowMemory: true });
        assert.equal((new Set(font.cffEncoding.charset)).size, 1509);
        assert.equal(font.cffEncoding.charset.includes(undefined), false);
    });

    it('can parse a CFF2 table', function() {
        const data =
            '01 02 03 04' + // just some dummy padding to test offsets
            // https://learn.microsoft.com/en-us/typography/opentype/spec/cff2#appendix-a-example-cff2-font
            '02 00 05 00 07 CF 0C 24 C3 11 9B 18 00 00 00 00 ' +
            '00 26 00 01 00 00 00 0C 00 01 00 00 00 1C 00 01 ' +
            '00 02 C0 00 E0 00 00 00 C0 00 C0 00 E0 00 00 00 ' +
            '00 00 00 02 00 00 00 01 00 00 00 02 01 01 03 05 ' +
            '20 0A 20 0A 00 00 00 01 01 01 05 F7 06 DA 12 77 ' +
            '9F F8 6C 9D AE 9A F4 9A 95 9F B3 9F 8B 8B 8B 8B ' +
            '85 9A 8B 8B 97 73 8B 8B 8C 80 8B 8B 8B 8D 8B 8B ' +
            '8C 8A 8B 8B 97 17 06 FB 8E 95 86 9D 8B 8B 8D 17 ' +
            '07 77 9F F8 6D 9D AD 9A F3 9A 95 9F B3 9F 08 FB ' +
            '8D 95 09 1E A0 37 5F 0C 09 8B 0C 0B C2 6E 9E 8C ' +
            '17 0A DB 57 F7 02 8C 17 0B B3 9A 77 9F 82 8A 8D ' +
            '17 0C 0C DB 95 57 F7 02 85 8B 8D 17 0C 0D F7 06 ' +
            '13 00 00 00 01 01 01 1B BD BD EF 8C 10 8B 15 F8 ' +
            '88 27 FB 5C 8C 10 06 F8 88 07 FC 88 EF F7 5C 8C ' +
            '10 06'; // '10 06';
        const font = {
            encoding: 'cmap_encoding',
            tables: {maxp: {version: 0.5, numGlyphs: 2}}
        };
        const opt = {};
        cff.parse(unhex(data), 4, font, opt);
        const topDict = font.tables.cff2.topDict;
        const fontDict1 = topDict._fdArray[0];
        const variationStore = topDict._vstore;
        const privateDict1 = fontDict1._privateDict;

        assert.notEqual(font.tables.cff2, undefined);

        assert.equal(font.encoding, 'cmap_encoding');
        assert.equal(font.nGlyphs, 2);

        assert.deepEqual(topDict.fontMatrix, [0.001, 0, 0, 0.001, 0, 0]);
        assert.equal(topDict.charStrings, 56);
        assert.equal(topDict.vstore, 16);
        assert.equal(topDict.fdSelect, null);

        assert.deepEqual(privateDict1.blueValues, [-20, 20, 472, 18, 35, 15, 105, 15, 10, 20, 40, 20]);
        assert.deepEqual(privateDict1.otherBlues, [-250, 10]);
        assert.deepEqual(privateDict1.familyBlues, [-20, 20, 473, 18, 34, 15, 104, 15, 10, 20, 40, 20]);
        assert.deepEqual(privateDict1.familyOtherBlues, [ -249, 10 ]);
        assert.equal(privateDict1.blueScale, 0.0375);
        assert.equal(privateDict1.blueShift, 7);
        assert.equal(privateDict1.blueFuzz, 0);
        assert.equal(privateDict1.stdHW, 55);
        assert.equal(privateDict1.stdVW, 80);
        assert.deepEqual(privateDict1.stemSnapH, [40, 15]);
        assert.deepEqual(privateDict1.stemSnapV, [80, 10]);
        assert.equal(privateDict1.languageGroup, 0);
        assert.equal(privateDict1.expansionFactor, 0.06);
        assert.deepEqual(privateDict1.vsindex, 0);
        assert.equal(privateDict1.subrs, 114);

        assert.deepEqual(variationStore, {
            itemVariationStore: {
                format: 1,
                itemVariationSubtables: [
                    { deltaSets: [], regionIndexes: [0, 1] }
                ],
                variationRegions: [
                    {
                        regionAxes: [
                            { startCoord: -1.0, peakCoord: -0.5, endCoord: 0.0 },
                        ]
                    },
                    {
                        regionAxes: [
                            { startCoord: -1.0, peakCoord: -1.0, endCoord: -0.5 }
                        ]
                    }
                ]
            }
        });

        assert.deepEqual(font.glyphs.get(0).path, font.glyphs.get(1).path);
        assert.deepEqual(font.glyphs.get(0).path.commands, [
            { type: 'M', x: 50, y: 0 },
            { type: 'L', x: 550, y: 0 },
            { type: 'L', x: 550, y: 500 },
            { type: 'L', x: 50, y: 500 }
        ] );
    });

    it('can handle standard encoding accented characters via endchar', function() {
        const font = loadSync('./test/fonts/AbrilFatface-Regular.otf', { lowMemory: true });
        const glyph13 = font.glyphs.get(13); // the semicolon is combined of comma and period
        const commands = glyph13.path.commands;
        assert.equal(glyph13.isComposite, true);
        assert.equal(commands.length, 15);
        assert.deepEqual(commands[0], { type: 'M', x: 86, y: -156 });
        assert.deepEqual(commands[7], { type: 'C', x: 74, y: -141, x1: 174, y1: -35, x2: 162, y2: -66 });
        assert.deepEqual(commands[9], { type: 'M', x: 36, y: 407 });
        assert.deepEqual(commands[13], { type: 'C', x: 36, y: 407, x1: 66, y1: 495, x2: 36, y2: 456 });
        assert.deepEqual(commands[14], { type: 'Z' });
    });

    it('handles PaintType and StrokeWidth', function() {
        const font = loadSync('./test/fonts/CFF1SingleLinePaintTypeTEST.otf', { lowMemory: true });
        assert.equal(font.tables.cff.topDict.paintType, 2);
        assert.equal(font.tables.cff.topDict.strokeWidth, 50);
        let path;
        const redraw = () => path = font.getPath('10', 0, 0, 12);
        redraw();
        assert.equal(path.commands.filter(c => c.type === 'Z').length, 0);
        assert.equal(path.fill, null);
        assert.equal(path.stroke, 'black');
        assert.equal(path.strokeWidth, 0.6);
        const svg1 = '<path d="M5.44-9.45C4.61-8.12 2.05-9.23 2.05-9.23M4.01-8.80C3.50-3.57 7.36 2.11 5.24-0.27C3.32-2.43 0.34-3.38 0.34-3.38M7.58-2.39L6.47-6.41L10.21-9.33L14.60-7.54L15.25-2.84L11.98-0.60L7.58-2.39" fill="none" stroke="black" stroke-width="0.6"/>';
        assert.equal(path.toSVG(),svg1);
        font.tables.cff.topDict.paintType = 0;
        // redraw
        redraw();
        path = font.getPath('10', 0, 0, 12);
        assert.equal(path.fill, 'black');
        assert.equal(path.stroke, null);
        assert.equal(path.strokeWidth, 1);
        const svg2 = '<path d="M5.44-9.45C4.61-8.12 2.05-9.23 2.05-9.23M4.01-8.80C3.50-3.57 7.36 2.11 5.24-0.27C3.32-2.43 0.34-3.38 0.34-3.38M7.58-2.39L6.47-6.41L10.21-9.33L14.60-7.54L15.25-2.84L11.98-0.60L7.58-2.39"/>';
        assert.equal(path.toSVG(), svg2);
    });
});
