import assert from 'assert';
import { hex } from '../testutil.js';
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
        // https://learn.microsoft.com/en-us/typography/opentype/spec/cff2#appendix-a-example-cff2-font
        const data =
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
            '10 06';
        const font = {
            encoding: 'cmap_encoding',
            tables: []
        };
        const expectedTopDict = {
            fontMatrix: [0.001, 0, 0, 0.001, 0, 0],
            charStrings: 56,
            fdArray: 68,
            fdSelect: null,
            vstore: 16,
            _subrs: [],
            _subrsBias: 0,
            _defaultWidthX: 0,
            _nominalWidthX: 0
        };
        const opt = {};
        cff.parse(unhex(data), 0, font, opt);
        assert.notEqual(font.tables.cff2, undefined);
        assert.equal(font.encoding, 'cmap_encoding');
        assert.equal(font.nGlyphs, 0);
        assert.equal(font.glyphs.length, 0);
        assert.deepEqual(font.tables.cff2.topDict, expectedTopDict);
    });
});
