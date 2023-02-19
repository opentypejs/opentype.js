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

});
