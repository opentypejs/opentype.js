/**
 * Generates a minimal TrueType Collection (.ttc) holding two member fonts.
 *
 * The point of a collection is that members *share* tables: the file is one
 * pool of tables with several table directories pointing into it. This
 * fixture is built that way rather than as two whole fonts glued together —
 * both members share every table except `name`, which is what makes them
 * distinguishable and what a caller selects on.
 *
 *   member 0: PostScript name "CollectionAlpha"
 *   member 1: PostScript name "CollectionBeta"
 *
 * Sharing matters for the test: if a parser were to assume a member's tables
 * begin where its directory does, member 1 would still parse — it would just
 * read member 0's tables. Pointing both directories at one pool means only a
 * parser that honours the absolute offsets in the records gets the right
 * `name` table for member 1.
 *
 * Usage: node test/generate-collection-font.mjs
 * Output: test/fonts/TestCollection.ttc
 */

import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
    u16, u32, i16, pad, tag, calcChecksum,
    makeHead, makeHhea, makeMaxp, makeOS2, makeName, makeHmtx, makeCmap, makePost,
} from './font-generation-helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MEMBER_NAMES = ['CollectionAlpha', 'CollectionBeta'];

/** Two glyphs: .notdef, and a square mapped to 'A'. */
function makeGlyf() {
    const notdef = [
        ...i16(0),
        ...i16(0), ...i16(0), ...i16(0), ...i16(0),
    ];
    const square = [
        ...i16(1),                                      // numberOfContours
        ...i16(0), ...i16(0), ...i16(500), ...i16(500), // bbox
        ...u16(3),                                      // endPtsOfContours
        ...u16(0),                                      // instructionLength
        0x01, 0x01, 0x01, 0x01,                         // flags: on-curve, x/y as words
        ...i16(0), ...i16(500), ...i16(0), ...i16(-500),   // x deltas
        ...i16(0), ...i16(0), ...i16(500), ...i16(0),      // y deltas
    ];
    return { notdef: pad([...notdef]), square: pad([...square]) };
}

function buildSharedTables() {
    const { notdef, square } = makeGlyf();
    const numGlyphs = 2;
    return {
        'head': makeHead({ indexToLocFormat: 1 }),
        'hhea': makeHhea(numGlyphs),
        'maxp': makeMaxp(numGlyphs),
        'OS/2': makeOS2(),
        'hmtx': makeHmtx(numGlyphs),
        'cmap': makeCmap(0x0041),
        'loca': [0, notdef.length, notdef.length + square.length].flatMap(o => u32(o)),
        'glyf': [...notdef, ...square],
        'post': makePost(),
    };
}

/**
 * Lay out a collection: header, then one directory per member, then the pool.
 * Directory records carry absolute file offsets, so the pool has to be placed
 * before the records that point into it can be written.
 */
function buildCollection() {
    const shared = buildSharedTables();
    const perMember = MEMBER_NAMES.map(name => ({ 'name': makeName(name) }));

    // Every member lists the shared tags plus its own `name`, sorted as the
    // format requires.
    const tagsFor = () => [...Object.keys(shared), 'name'].sort();
    const numTables = tagsFor().length;

    const headerSize = 12 + MEMBER_NAMES.length * 4;
    const directorySize = 12 + numTables * 16;
    const poolStart = headerSize + directorySize * MEMBER_NAMES.length;

    // Place every table once and remember where it landed.
    const pool = [];
    const placed = new Map();
    const place = (key, bytes) => {
        placed.set(key, { offset: poolStart + pool.length, length: bytes.length });
        pool.push(...pad([...bytes]));
    };
    for (const [t, bytes] of Object.entries(shared)) place(t, bytes);
    perMember.forEach((tables, i) => place(`name:${i}`, tables['name']));

    const searchRange = Math.pow(2, Math.floor(Math.log2(numTables))) * 16;
    const entrySelector = Math.floor(Math.log2(numTables));

    const directories = MEMBER_NAMES.map((_, i) => {
        const records = tagsFor().flatMap(t => {
            const key = t === 'name' ? `name:${i}` : t;
            const { offset, length } = placed.get(key);
            const bytes = t === 'name' ? perMember[i]['name'] : shared[t];
            return [
                ...tag(t.padEnd(4, ' ')),
                ...u32(calcChecksum(bytes)),
                ...u32(offset),
                ...u32(length),
            ];
        });
        return [
            ...u32(0x00010000),                 // sfntVersion
            ...u16(numTables),
            ...u16(searchRange),
            ...u16(entrySelector),
            ...u16(numTables * 16 - searchRange),
            ...records,
        ];
    });

    return new Uint8Array([
        ...tag('ttcf'),
        ...u16(1), ...u16(0),                   // version 1.0
        ...u32(MEMBER_NAMES.length),
        ...MEMBER_NAMES.map((_, i) => u32(headerSize + directorySize * i)).flat(),
        ...directories.flat(),
        ...pool,
    ]);
}

const bytes = buildCollection();
const outPath = join(__dirname, 'fonts', 'TestCollection.ttc');
writeFileSync(outPath, bytes);
console.log(`Written ${bytes.length} bytes to ${outPath}`);
