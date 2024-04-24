import assert from 'assert';
import { unhex } from './testutil.js';
import opentype, { parse } from '../src/opentype.js';
import cff1filePlugin from '../src/plugins/opentypejs.plugin.cff1file.js';
import type1Plugin from '../src/plugins/opentypejs.plugin.type1.js';
import { cff1data } from './tables/cff.js';
import { readFileSync } from 'fs';
const loadSync = (url, opt) => parse(readFileSync(url), opt);

describe('plugins.js', function() {
    describe(' opentypejs.plugin.cff1file.js', function() {
        it('parses a standalone CFF1 file', function() {
            assert.throws(() => {
                parse(unhex(cff1data).buffer);
            }, 'Font doesn\'t contain TrueType, CFF or CFF2 outlines');
            
            opentype.plugins.push(cff1filePlugin);
            const font = parse(unhex(cff1data).buffer);

            assert.equal(font.tables.cff.topDict.familyName, 'fn');
            assert.deepEqual(font.glyphs.glyphs[1].name, 'bumps');
        });
    });

    describe('opentypejs.plugin.type1.js', function() {
        const extensions = ['ps','pfa','pfb'];
        for(const ext of extensions) {
            it(`parses a .${ext} file`, function() {
                opentype.plugins.push(type1Plugin);
                const font = loadSync(`./test/fonts/Vibur.${ext}`);
                assert.equal(font.names.windows.fullName.en, 'Vibur');
                assert.equal(Object.keys(font._hmtxTableData).length, 249);
                assert.deepEqual(font.tables.cff.topDict.fontBBox, [-1437, -792, 2210, 1960]);
                assert.deepEqual(font.tables.head, {xMin: -792, xMax: 1960, yMin: -792, yMax: 2210});
                assert.deepEqual(font.tables.hhea, {descender: -792, ascender: 2210});
                opentype.plugins.length = 0;
            });
        }
    });
});