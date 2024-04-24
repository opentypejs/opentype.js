import assert from 'assert';
import { unhex } from './testutil.js';
import opentype, { parse } from '../src/opentype.js';
import cff1filePlugin from '../src/plugins/opentypejs.plugin.cff1file.js';
import { cff1data } from './tables/cff.js';

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
});