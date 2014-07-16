// The `loca` table stores the offsets to the locations of the glyphs in the font.
// https://www.microsoft.com/typography/OTSPEC/loca.htm

'use strict';

var parse = require('../parse');

// Parse the `loca` table. This table stores the offsets to the locations of the glyphs in the font,
// relative to the beginning of the glyphData table.
// The number of glyphs stored in the `loca` table is specified in the `maxp` table (under numGlyphs)
// The loca table has two versions: a short version where offsets are stored as uShorts, and a long
// version where offsets are stored as uLongs. The `head` table specifies which version to use
// (under indexToLocFormat).
function parseLocaTable(data, start, numGlyphs, shortVersion) {
    var p, parseFn, glyphOffsets, glyphOffset, i;
    p = new parse.Parser(data, start);
    parseFn = shortVersion ? p.parseUShort : p.parseULong;
    // There is an extra entry after the last index element to compute the length of the last glyph.
    // That's why we use numGlyphs + 1.
    glyphOffsets = [];
    for (i = 0; i < numGlyphs + 1; i += 1) {
        glyphOffset = parseFn.call(p);
        if (shortVersion) {
            // The short table version stores the actual offset divided by 2.
            glyphOffset *= 2;
        }
        glyphOffsets.push(glyphOffset);
    }
    return glyphOffsets;
}

exports.parse = parseLocaTable;
