/**
 * Generates a minimal TrueType font with circular composite glyph references.
 *
 * The font contains 3 glyphs:
 *   0: .notdef — empty simple glyph
 *   1: composite referencing glyph 2
 *   2: composite referencing glyph 1
 *
 * Glyph 1 is mapped to U+0041 ('A') via a format-4 cmap subtable.
 * Loading this font and calling getPath() on glyph 1 or 2 should NOT
 * cause a stack overflow.
 *
 * Usage: node test/generate-circular-ref-font.mjs
 * Output: test/fonts/circular-composite.ttf
 */

import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
    u16, u32, i16, pad,
    makeHead, makeHhea, makeMaxp, makeOS2, makeName, makeHmtx, makeCmap, makePost,
    assembleFont,
} from './font-generation-helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- glyph data (the interesting part of this font) ---

function makeGlyf() {
    // Glyph 0: .notdef — simple empty glyph (0 contours)
    const glyph0 = [
        ...i16(0),                              // numberOfContours = 0
        ...i16(0), ...i16(0), ...i16(0), ...i16(0), // xMin, yMin, xMax, yMax
    ];

    // Glyph 1: composite referencing glyph 2
    // Flags: ARG_1_AND_2_ARE_WORDS (0x0001) | ARGS_ARE_XY_OFFSETS (0x0002) = 0x0003
    const glyph1 = [
        ...i16(-1),                             // numberOfContours = -1 (composite)
        ...i16(0), ...i16(0), ...i16(0), ...i16(0), // bbox
        ...u16(0x0003),                         // flags (no MORE_COMPONENTS)
        ...u16(2),                              // glyphIndex = 2
        ...i16(0), ...i16(0),                   // dx, dy
    ];

    // Glyph 2: composite referencing glyph 1
    const glyph2 = [
        ...i16(-1),                             // numberOfContours = -1 (composite)
        ...i16(0), ...i16(0), ...i16(0), ...i16(0), // bbox
        ...u16(0x0003),                         // flags
        ...u16(1),                              // glyphIndex = 1
        ...i16(0), ...i16(0),                   // dx, dy
    ];

    return { glyph0, glyph1, glyph2 };
}

// --- assemble font ---

function buildFont() {
    const { glyph0, glyph1, glyph2 } = makeGlyf();

    // Pad each glyph to 4-byte boundary for loca offsets
    const g0 = pad([...glyph0]);
    const g1 = pad([...glyph1]);
    const g2 = pad([...glyph2]);

    const glyfData = [...g0, ...g1, ...g2];
    // Long loca format (indexToLocFormat = 1)
    const locaData = [0, g0.length, g0.length + g1.length, g0.length + g1.length + g2.length]
        .flatMap(o => u32(o));

    const numGlyphs = 3;
    return assembleFont({
        'head': makeHead({ indexToLocFormat: 1 }),
        'hhea': makeHhea(numGlyphs),
        'maxp': makeMaxp(numGlyphs),
        'OS/2': makeOS2(),
        'hmtx': makeHmtx(numGlyphs),
        'cmap': makeCmap(0x0041),  // 'A' → glyph 1
        'loca': locaData,
        'glyf': glyfData,
        'name': makeName('CircularTest'),
        'post': makePost(),
    });
}

const fontBytes = buildFont();
const outPath = join(__dirname, 'fonts', 'circular-composite.ttf');
writeFileSync(outPath, fontBytes);
console.log(`Written ${fontBytes.length} bytes to ${outPath}`);
