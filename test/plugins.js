import assert from 'assert';
import { unhex } from './testutil.js';
import opentype, { parse, GlyphSet } from '../src/opentype.js';
import cff1filePlugin from '../src/plugins/opentypejs.plugin.cff1file.js';
import { cff1data } from './tables/cff.js';
import { createMockObject } from './testutil.js';

describe('plugins.js', function() {
    describe(' opentypejs.plugin.cff1file.js', function() {
        it('parses a standalone CFF1 file', function() {
            // opentype.plugins.push(cff1filePlugin);
            const logs = [];
            const originalConsole = global.console;
            global.console = createMockObject(logs, global.console);
            global.console = originalConsole;
            assert.throws(() => {
                parse(unhex(cff1data).buffer);
            }, 'Font doesn\'t contain TrueType, CFF or CFF2 outlines');
            
            const font = parse(unhex(cff1data).buffer);

            assert.deepEqual(logs, [
                'Standalone CFF1 files are not supported directly, but you can use the plugin "opentypejs.plugin.cff1file"',
                'Font is missing the required table "name"',
            ]);
            console.log(font);
        });
    });
});