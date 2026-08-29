/**
 * Generates two fonts whose `cmap` carries a Unicode sub-table *and* a Macintosh one, which is
 * how most of the macOS system faces are built.
 *
 *   TestCmapPreference.ttf  (0,3) format 4 mapping 'A' to glyph 1
 *                           (1,0) format 4 mapping 'A' to glyph 2
 *
 *     Both parse, so which glyph comes back says which sub-table was chosen — and nothing else.
 *
 *   TestCmapMacFormat0.ttf  (0,3) format 4 mapping 'A' to glyph 1
 *                           (1,0) format 0, the 8-bit Macintosh table
 *
 *     Choosing the Macintosh one here also decodes it against the *first* directory record's
 *     platform and encoding rather than its own, which is a TypeError rather than a wrong glyph.
 *
 * The Macintosh record is second in both, because the directory is walked from the end: a fixture
 * with it first would pass whatever the preference rule was.
 *
 * Usage: node test/generate-cmap-preference-fonts.mjs
 */

import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
    u16, u32, i16, pad, tag, calcChecksum,
    makeHead, makeHhea, makeMaxp, makeOS2, makeName, makeHmtx, makePost,
} from './font-generation-helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CHAR = 0x41; // 'A'
const NUM_GLYPHS = 3; // .notdef, plus one square per sub-table so they are tellable apart

/** A square at each of two sizes, so the glyph a lookup returns is identifiable by its bbox. */
function makeGlyf() {
    const square = (size) => [
        ...i16(1),
        ...i16(0), ...i16(0), ...i16(size), ...i16(size),
        ...u16(3),
        ...u16(0),
        ...u16(0x01), ...u16(0x01), ...u16(0x01), ...u16(0x01),
        ...u16(0), ...u16(size), ...u16(0), ...i16(-size),
        ...u16(size), ...u16(0), ...i16(-size), ...u16(0),
    ];
    return { notdef: [...i16(0), ...i16(0), ...i16(0), ...i16(0), ...i16(0)],
             one: square(500), two: square(250) };
}

/** A format 4 sub-table mapping one code point to one glyph. */
function format4(charCode, glyphId) {
    const segCount = 2;
    const entrySelector = Math.floor(Math.log2(segCount));
    const sub = [
        ...u16(4), ...u16(0), ...u16(0),
        ...u16(segCount * 2),
        ...u16(2 * Math.pow(2, entrySelector)), ...u16(entrySelector), ...u16(2 * segCount - 2 * Math.pow(2, entrySelector)),
        ...u16(charCode), ...u16(0xFFFF),
        ...u16(0),
        ...u16(charCode), ...u16(0xFFFF),
        ...i16(glyphId - charCode), ...i16(1),
        ...u16(0), ...u16(0),
    ];
    sub[2] = (sub.length >> 8) & 0xff;
    sub[3] = sub.length & 0xff;
    return sub;
}

/** The 8-bit Macintosh table: 256 glyph ids indexed by byte. */
function format0(charCode, glyphId) {
    const glyphIdArray = new Array(256).fill(0);
    glyphIdArray[charCode] = glyphId;
    return [...u16(0), ...u16(262), ...u16(0), ...glyphIdArray];
}

/** A cmap whose records are laid out in the order given, each record's sub-table appended. */
function makeCmapWith(records) {
    const header = 4 + records.length * 8;
    const out = [...u16(0), ...u16(records.length)];
    let cursor = header;
    const bodies = [];
    for (const r of records) {
        out.push(...u16(r.platformId), ...u16(r.encodingId), ...u32(cursor));
        cursor += r.subtable.length;
        bodies.push(...r.subtable);
    }
    return [...out, ...bodies];
}

function assemble(cmap, familyName) {
    const glyf = makeGlyf();
    const glyphs = [glyf.notdef, glyf.one, glyf.two].map((g) => pad([...g]));
    const offsets = [];
    let at = 0;
    const glyfTable = [];
    for (const g of glyphs) { offsets.push(at); glyfTable.push(...g); at += g.length; }
    offsets.push(at);

    const tables = {
        cmap,
        glyf: glyfTable,
        head: makeHead({ indexToLocFormat: 1 }),
        hhea: makeHhea(NUM_GLYPHS),
        hmtx: makeHmtx(NUM_GLYPHS),
        loca: offsets.flatMap((o) => u32(o)),
        maxp: makeMaxp(NUM_GLYPHS),
        name: makeName(familyName),
        'OS/2': makeOS2(),
        post: makePost(),
    };

    const tags = Object.keys(tables).sort();
    const numTables = tags.length;
    const entrySelector = Math.floor(Math.log2(numTables));
    const searchRange = Math.pow(2, entrySelector) * 16;
    const out = [
        ...u32(0x00010000), ...u16(numTables),
        ...u16(searchRange), ...u16(entrySelector), ...u16(numTables * 16 - searchRange),
    ];
    let offset = 12 + numTables * 16;
    const bodies = [];
    for (const t of tags) {
        const bytes = pad([...tables[t]]);
        out.push(...tag(t.padEnd(4)), ...u32(calcChecksum(bytes)), ...u32(offset), ...u32(tables[t].length));
        offset += bytes.length;
        bodies.push(...bytes);
    }
    return Uint8Array.from([...out, ...bodies]);
}

const both4 = makeCmapWith([
    { platformId: 0, encodingId: 3, subtable: format4(CHAR, 1) },
    { platformId: 1, encodingId: 0, subtable: format4(CHAR, 2) },
]);
const macFormat0 = makeCmapWith([
    { platformId: 0, encodingId: 3, subtable: format4(CHAR, 1) },
    { platformId: 1, encodingId: 0, subtable: format0(CHAR, 2) },
]);

writeFileSync(join(__dirname, 'fonts', 'TestCmapPreference.ttf'), assemble(both4, 'CmapPreference'));
writeFileSync(join(__dirname, 'fonts', 'TestCmapMacFormat0.ttf'), assemble(macFormat0, 'CmapMacFormat0'));
console.log('wrote test/fonts/TestCmapPreference.ttf and TestCmapMacFormat0.ttf');
