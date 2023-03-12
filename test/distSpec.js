import assert from 'assert';
import { parse as parseBufferMod } from '../dist/opentype.module.js';
import { parse as parseBufferModMin } from '../dist/opentype.module.min.js';
import { readFileSync } from 'fs';
import { createRequire } from 'module'; 
const require = createRequire(import.meta.url);

describe('opentype.js dist', function () {
    const dist_matrix = [
        [require('../dist/opentype.cjs').parse, '.cjs'],
        [require('../dist/opentype.min.cjs').parse, '.min.cjs'],
        [parseBufferMod, '.module.js'],
        [parseBufferModMin, '.module.min.js'],
    ]

    for (const [parse, ext] of dist_matrix) {
        for (const lowMemory in [true, false]) {
            it('can work with the ' + ext + ' distribution in lowMemory=' + lowMemory, function () {
                const font = parse(readFileSync('./test/fonts/Roboto-Black.ttf'), { lowMemory });
                assert.deepEqual(font.names.macintosh.fontFamily, { en: 'Roboto Black' });
                assert.deepEqual(font.names.windows.fontFamily, { en: 'Roboto Black' });
                assert.equal(font.unitsPerEm, 2048);
                assert.equal(font.glyphs.length, lowMemory ? 0 : 1294);
            });
        }
    }
});
