import assert from 'assert';
import { parse } from '../src/opentype.mjs';
import { readFileSync } from 'fs';

// DEBUG is normally defined by esbuild at build time; define it for tests.
globalThis.DEBUG = false;

const loadSync = (url, opt) => parse(readFileSync(url), opt);

/**
 * Builds a minimal valid TrueType font binary (ArrayBuffer) with the given
 * fpgm (font program) instructions. Used for tests that need to vary the
 * fpgm at runtime. For static POC fonts, see generate-hinting-dos-fonts.mjs.
 *
 * @param {number[]} fpgmInstructions - byte array of TrueType hinting instructions
 * @returns {ArrayBuffer}
 */
function buildMinimalTTF(fpgmInstructions) {
    // We need these tables for a valid TrueType parse:
    // head, hhea, maxp, OS/2, name, cmap, post, loca, glyf, hmtx, fpgm
    const tables = {};

    // head table (54 bytes)
    tables['head'] = new Uint8Array([
        0x00, 0x01, 0x00, 0x00, // majorVersion=1, minorVersion=0
        0x00, 0x01, 0x00, 0x00, // fontRevision=1.0
        0x00, 0x00, 0x00, 0x00, // checksumAdjustment (placeholder)
        0x5F, 0x0F, 0x3C, 0xF5, // magicNumber
        0x00, 0x0B,             // flags
        0x03, 0xE8,             // unitsPerEm=1000
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // created
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // modified
        0x00, 0x00,             // xMin=0
        0x00, 0x00,             // yMin=0
        0x03, 0xE8,             // xMax=1000
        0x03, 0xE8,             // yMax=1000
        0x00, 0x00,             // macStyle
        0x00, 0x08,             // lowestRecPPEM=8
        0x00, 0x02,             // fontDirectionHint
        0x00, 0x00,             // indexToLocFormat=0 (short)
        0x00, 0x00,             // glyphDataFormat
    ]);

    // hhea table (36 bytes)
    tables['hhea'] = new Uint8Array([
        0x00, 0x01, 0x00, 0x00, // version=1.0
        0x03, 0x20,             // ascender=800
        0xFF, 0x38,             // descender=-200
        0x00, 0x00,             // lineGap=0
        0x02, 0x58,             // advanceWidthMax=600
        0x00, 0x00,             // minLeftSideBearing
        0x00, 0x00,             // minRightSideBearing
        0x02, 0x58,             // xMaxExtent=600
        0x00, 0x01,             // caretSlopeRise
        0x00, 0x00,             // caretSlopeRun
        0x00, 0x00,             // caretOffset
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // reserved
        0x00, 0x00,             // metricDataFormat
        0x00, 0x01,             // numberOfHMetrics=1
    ]);

    // maxp table (32 bytes, TrueType version)
    tables['maxp'] = new Uint8Array([
        0x00, 0x01, 0x00, 0x00, // version=1.0
        0x00, 0x01,             // numGlyphs=1
        0x00, 0x40,             // maxPoints=64
        0x00, 0x01,             // maxContours=1
        0x00, 0x00,             // maxCompositePoints
        0x00, 0x00,             // maxCompositeContours
        0x00, 0x01,             // maxZones=1
        0x00, 0x00,             // maxTwilightPoints
        0x00, 0x10,             // maxStorage=16
        0x00, 0x10,             // maxFunctionDefs=16
        0x00, 0x00,             // maxInstructionDefs
        0x00, 0x40,             // maxStackElements=64
        0x00, 0x00,             // maxSizeOfInstructions
        0x00, 0x00,             // maxComponentElements
        0x00, 0x00,             // maxComponentDepth
    ]);

    // OS/2 table (78 bytes, version 1 minimum)
    const os2 = new Uint8Array(78);
    os2[0] = 0x00; os2[1] = 0x01;
    os2[2] = 0x02; os2[3] = 0x58;
    os2[4] = 0x01; os2[5] = 0x90;
    os2[6] = 0x00; os2[7] = 0x05;
    os2[68] = 0x03; os2[69] = 0x20;
    os2[70] = 0xFF; os2[71] = 0x38;
    os2[74] = 0x03; os2[75] = 0xE8;
    os2[76] = 0x03; os2[77] = 0xE8;
    tables['OS/2'] = os2;

    // name table
    const familyName = encodeUTF16BE('Test');
    const styleName = encodeUTF16BE('Regular');
    const nameRecords = [
        { nameID: 1, string: familyName },
        { nameID: 2, string: styleName },
        { nameID: 4, string: familyName },
        { nameID: 6, string: familyName },
    ];
    const stringOffset = 6 + nameRecords.length * 12;
    const nameData = [];
    push16(nameData, 0);
    push16(nameData, nameRecords.length);
    push16(nameData, stringOffset);
    let strOff = 0;
    for (const rec of nameRecords) {
        push16(nameData, 3);
        push16(nameData, 1);
        push16(nameData, 0x0409);
        push16(nameData, rec.nameID);
        push16(nameData, rec.string.length);
        push16(nameData, strOff);
        strOff += rec.string.length;
    }
    for (const rec of nameRecords) {
        for (let i = 0; i < rec.string.length; i++) nameData.push(rec.string[i]);
    }
    tables['name'] = new Uint8Array(nameData);

    // cmap table - format 4
    const cmapData = [];
    push16(cmapData, 0);
    push16(cmapData, 1);
    push16(cmapData, 3);
    push16(cmapData, 1);
    push32(cmapData, 12);
    push16(cmapData, 4);
    push16(cmapData, 22);
    push16(cmapData, 0);
    push16(cmapData, 2);
    push16(cmapData, 2);
    push16(cmapData, 0);
    push16(cmapData, 0);
    push16(cmapData, 0xFFFF);
    push16(cmapData, 0);
    push16(cmapData, 0xFFFF);
    push16(cmapData, 1);
    push16(cmapData, 0);
    tables['cmap'] = new Uint8Array(cmapData);

    // post table
    tables['post'] = new Uint8Array([
        0x00, 0x03, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
        0xFE, 0x00, 0x00, 0x50,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
    ]);

    // loca table (short format, 1 glyph)
    tables['loca'] = new Uint8Array([0x00, 0x00, 0x00, 0x00]);

    // glyf table - empty
    tables['glyf'] = new Uint8Array(0);

    // hmtx table
    tables['hmtx'] = new Uint8Array([0x02, 0x58, 0x00, 0x00]);

    // fpgm table
    tables['fpgm'] = new Uint8Array(fpgmInstructions);

    // Assemble the font
    const tableNames = Object.keys(tables);
    const numTables = tableNames.length;
    const headerSize = 12 + numTables * 16;

    let offset = headerSize;
    const tableOffsets = {};
    for (const name of tableNames) {
        tableOffsets[name] = offset;
        offset += tables[name].length;
        offset = (offset + 3) & ~3;
    }

    const totalSize = offset;
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    view.setUint32(0, 0x00010000);
    view.setUint16(4, numTables);
    const searchRange = Math.pow(2, Math.floor(Math.log2(numTables))) * 16;
    view.setUint16(6, searchRange);
    view.setUint16(8, Math.floor(Math.log2(numTables)));
    view.setUint16(10, numTables * 16 - searchRange);

    let recordOffset = 12;
    for (const name of tableNames) {
        const tag = name.padEnd(4, ' ');
        for (let i = 0; i < 4; i++) {
            view.setUint8(recordOffset + i, tag.charCodeAt(i));
        }
        view.setUint32(recordOffset + 4, 0);
        view.setUint32(recordOffset + 8, tableOffsets[name]);
        view.setUint32(recordOffset + 12, tables[name].length);
        recordOffset += 16;
    }

    for (const name of tableNames) {
        bytes.set(tables[name], tableOffsets[name]);
    }

    return buffer;
}

function encodeUTF16BE(str) {
    const result = [];
    for (let i = 0; i < str.length; i++) {
        result.push((str.charCodeAt(i) >> 8) & 0xFF);
        result.push(str.charCodeAt(i) & 0xFF);
    }
    return result;
}

function push16(arr, val) {
    arr.push((val >> 8) & 0xFF, val & 0xFF);
}

function push32(arr, val) {
    arr.push((val >> 24) & 0xFF, (val >> 16) & 0xFF, (val >> 8) & 0xFF, val & 0xFF);
}

describe('hintingtt.mjs - CVE: TrueType Hinting VM Infinite Loop', function() {
    this.timeout(5000);

    // --- Tests using pre-built POC fonts (see generate-hinting-dos-fonts.mjs) ---

    it('should not hang on JMPR with negative offset (infinite backward jump)', function() {
        const font = loadSync('./test/fonts/HintingJMPRLoop.ttf');

        // fpgm error is caught internally and sets _errorState=3
        font.hinting.exec(font.glyphs.get(0), 12);
        assert.ok(font.hinting._errorState >= 3, 'should have set error state due to instruction limit');
    });

    it('should not hang on recursive CALL (infinite recursion)', function() {
        const font = loadSync('./test/fonts/HintingRecursiveCALL.ttf');

        font.hinting.exec(font.glyphs.get(0), 12);
        assert.ok(font.hinting._errorState >= 3, 'should have set error state due to call depth');
    });

    it('should not hang on mutual recursion between two functions', function() {
        const font = loadSync('./test/fonts/HintingMutualRecursion.ttf');

        font.hinting.exec(font.glyphs.get(0), 12);
        assert.ok(font.hinting._errorState >= 3, 'should have set error state due to call depth');
    });

    // --- Tests using runtime-generated fonts (for parameterized fpgm programs) ---

    it('should not hang on JMPR with DUP loop', function() {
        // PUSHW[0] -1, DUP, JMPR creates an infinite loop:
        // DUP duplicates -1, JMPR pops -1 and jumps back to DUP, forever
        const fpgm = [
            0xB8,       // PUSHW[0]
            0xFF, 0xFF, // -1 as signed 16-bit
            0x20,       // DUP
            0x1C,       // JMPR
        ];

        const buffer = buildMinimalTTF(fpgm);
        const font = parse(buffer);

        font.hinting.exec(font.glyphs.get(0), 12);
        assert.ok(font.hinting._errorState >= 3, 'should have set error state due to instruction limit');
    });

    it('should not hang on LOOPCALL with huge count', function() {
        // Define function 0 as empty, then LOOPCALL it 32767 times
        const fpgm = [
            0xB0, 0x00,             // PUSHB[0] 0
            0x2C,                   // FDEF
            0x2D,                   // ENDF (empty body)
            0xB9,                   // PUSHW[1] (push two 16-bit values)
            0x7F, 0xFF,             // count = 32767
            0x00, 0x00,             // fn = 0
            0x2A,                   // LOOPCALL
        ];

        const buffer = buildMinimalTTF(fpgm);
        const font = parse(buffer);

        // Should complete quickly because LOOPCALL count is capped to 10000
        font.hinting.exec(font.glyphs.get(0), 12);
        assert.ok(!font.hinting._errorState, 'should complete without setting an error state');
    });

    it('should cap SLOOP to prevent excessive iterations', function() {
        // Set loop to 32767 via SLOOP — should be capped to 10000
        const fpgm = [
            0xB8,             // PUSHW[0]
            0x7F, 0xFF,       // 32767
            0x17,             // SLOOP
        ];

        const buffer = buildMinimalTTF(fpgm);
        const font = parse(buffer);

        font.hinting.exec(font.glyphs.get(0), 12);
        assert.ok(!font.hinting._errorState, 'should complete without setting an error state');
    });

    it('should still allow legitimate font hinting', function() {
        // Define function 0 (pops one value), then call it
        const fpgm = [
            0xB0, 0x00,  // PUSHB[0] 0
            0x2C,         // FDEF
            0x21,         // POP
            0x2D,         // ENDF
            0xB0, 0x42,  // PUSHB[0] 0x42
            0xB0, 0x00,  // PUSHB[0] 0
            0x2B,         // CALL
        ];

        const buffer = buildMinimalTTF(fpgm);
        const font = parse(buffer);

        font.hinting.exec(font.glyphs.get(0), 12);
        assert.ok(!font.hinting._errorState, 'should complete without setting an error state');
    });
});
