import assert from 'assert';
import { parse } from '../src/opentype.mjs';
import { readFileSync } from 'fs';

const loadSync = (url) => parse(readFileSync(url));

describe('cmap.mjs', function() {
    it('prefers a Unicode sub-table over a Macintosh one listed after it', function() {
        // Both sub-tables map 'A' and both are format 4, so the glyph identifies the choice.
        const font = loadSync('./test/fonts/TestCmapPreference.ttf');
        assert.equal(font.tables.cmap.format, 4);
        assert.equal(font.charToGlyphIndex('A'), 1);
    });

    it('reads a font whose Macintosh sub-table is the 8-bit format 0', function() {
        // The Macintosh table is reachable, so the bug was choosing it and then decoding it
        // against the first directory record's platform and encoding rather than its own.
        const font = loadSync('./test/fonts/TestCmapMacFormat0.ttf');
        assert.equal(font.tables.cmap.format, 4);
        assert.equal(font.charToGlyphIndex('A'), 1);
    });
});
