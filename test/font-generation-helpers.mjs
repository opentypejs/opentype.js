/**
 * Shared utilities for test font generation scripts.
 *
 * Provides binary encoding helpers, checksum calculation, common OpenType
 * table builders, and a font assembly function used by the generate-*.mjs
 * scripts in this directory.
 */

// --- binary helpers (big-endian) ---

export function u8(v) { return [v & 0xFF]; }
export function u16(v) { return [(v >> 8) & 0xff, v & 0xff]; }
export function u32(v) { return [(v >> 24) & 0xff, (v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff]; }
export function i16(v) { return u16(v < 0 ? v + 0x10000 : v); }
export function i64(v) { return [...u32(0), ...u32(v)]; } // simplified LONGDATETIME
export function tag(s) { return [...s].map(c => c.charCodeAt(0)); }
export function pad(arr) { while (arr.length % 4 !== 0) arr.push(0); return arr; }

export function calcChecksum(bytes) {
    const padded = [...bytes];
    while (padded.length % 4 !== 0) padded.push(0);
    let sum = 0;
    for (let i = 0; i < padded.length; i += 4) {
        sum = (sum + ((padded[i] << 24) | (padded[i+1] << 16) | (padded[i+2] << 8) | padded[i+3])) >>> 0;
    }
    return sum;
}

// --- common table builders ---

export function makeHead({ indexToLocFormat = 0 } = {}) {
    return [
        ...u16(1), ...u16(0),          // majorVersion, minorVersion
        ...u16(1), ...u16(0),          // fontRevision (fixed 1.0)
        ...u32(0),                      // checksumAdjustment (filled later)
        ...u32(0x5F0F3CF5),            // magicNumber
        ...u16(0x000B),                // flags
        ...u16(1000),                  // unitsPerEm
        ...i64(0),                      // created
        ...i64(0),                      // modified
        ...i16(0), ...i16(0),          // xMin, yMin
        ...i16(1000), ...i16(1000),    // xMax, yMax
        ...u16(0),                      // macStyle
        ...u16(8),                      // lowestRecPPEM
        ...i16(2),                      // fontDirectionHint
        ...i16(indexToLocFormat),       // indexToLocFormat
        ...i16(0),                      // glyphDataFormat
    ];
}

export function makeHhea(numHMetrics) {
    return [
        ...u16(1), ...u16(0),          // version 1.0
        ...i16(800),                    // ascender
        ...i16(-200),                  // descender
        ...i16(0),                      // lineGap
        ...u16(1000),                  // advanceWidthMax
        ...i16(0),                      // minLeftSideBearing
        ...i16(0),                      // minRightSideBearing
        ...i16(1000),                  // xMaxExtent
        ...i16(1), ...i16(0),          // caretSlopeRise, caretSlopeRun
        ...i16(0),                      // caretOffset
        ...i16(0), ...i16(0), ...i16(0), ...i16(0), // reserved
        ...i16(0),                      // metricDataFormat
        ...u16(numHMetrics),           // numberOfHMetrics
    ];
}

export function makeMaxp(numGlyphs, { cff = false, ...overrides } = {}) {
    if (cff) {
        return [
            ...u16(0), ...u16(0x5000),     // version 0.5
            ...u16(numGlyphs),
        ];
    }
    const o = overrides;
    return [
        ...u16(1), ...u16(0),                          // version 1.0
        ...u16(numGlyphs),
        ...u16(o.maxPoints ?? 0),
        ...u16(o.maxContours ?? 0),
        ...u16(o.maxCompositePoints ?? 0),
        ...u16(o.maxCompositeContours ?? 0),
        ...u16(o.maxZones ?? 1),
        ...u16(o.maxTwilightPoints ?? 0),
        ...u16(o.maxStorage ?? 0),
        ...u16(o.maxFunctionDefs ?? 0),
        ...u16(o.maxInstructionDefs ?? 0),
        ...u16(o.maxStackElements ?? 0),
        ...u16(o.maxSizeOfInstructions ?? 0),
        ...u16(o.maxComponentElements ?? 0),
        ...u16(o.maxComponentDepth ?? 0),
    ];
}

export function makeOS2() {
    return [
        ...u16(1),                      // version
        ...i16(500),                    // xAvgCharWidth
        ...u16(400),                    // usWeightClass
        ...u16(5),                      // usWidthClass
        ...u16(0),                      // fsType
        ...i16(0), ...i16(0), ...i16(0), ...i16(0), // ySubscript*
        ...i16(0), ...i16(0), ...i16(0), ...i16(0), // ySuperscript*
        ...i16(0), ...i16(0),          // yStrikeout*
        ...i16(0),                      // sFamilyClass
        ...Array(10).fill(0),           // panose
        ...u32(0), ...u32(0), ...u32(0), ...u32(0), // ulUnicodeRange
        ...tag('    '),                 // achVendID
        ...u16(0),                      // fsSelection
        ...u16(0),                      // usFirstCharIndex
        ...u16(0),                      // usLastCharIndex
        ...i16(800),                    // sTypoAscender
        ...i16(-200),                   // sTypoDescender
        ...i16(0),                      // sTypoLineGap
        ...u16(800),                    // usWinAscent
        ...u16(200),                    // usWinDescent
        ...u32(0), ...u32(0),          // ulCodePageRange 1-2
    ];
}

export function makeName(familyName) {
    const names = [
        [0, 'Copyright'],
        [1, familyName],
        [2, 'Regular'],
        [4, familyName],
        [5, 'Version 1.0'],
        [6, familyName],
    ];
    const stringData = [];
    const records = [];
    let offset = 0;
    for (const [nameID, str] of names) {
        const encoded = [...str].flatMap(c => u16(c.charCodeAt(0)));
        records.push([
            ...u16(3),          // platformID (Windows)
            ...u16(1),          // encodingID (Unicode BMP)
            ...u16(0x0409),     // languageID (English US)
            ...u16(nameID),
            ...u16(encoded.length),
            ...u16(offset),
        ]);
        stringData.push(...encoded);
        offset += encoded.length;
    }
    const storageOffset = 6 + records.length * 12;
    return [
        ...u16(0),                      // format
        ...u16(names.length),           // count
        ...u16(storageOffset),          // stringOffset
        ...records.flat(),
        ...stringData,
    ];
}

export function makeHmtx(numGlyphs, advanceWidth = 500) {
    const metrics = [];
    for (let i = 0; i < numGlyphs; i++) {
        metrics.push(...u16(advanceWidth), ...i16(0));
    }
    return metrics;
}

/**
 * Build a format-4 cmap table. If charCode is provided, maps that code point
 * to glyph index 1. Otherwise creates a sentinel-only table (no mappings).
 */
export function makeCmap(charCode) {
    if (charCode === undefined) {
        return [
            ...u16(0), ...u16(1),                       // version, numTables
            ...u16(3), ...u16(1), ...u32(12),           // platformID=3, encodingID=1, offset
            ...u16(4),                                   // format 4
            ...u16(14 + 2 * 5),                         // length (14-byte header + 5 per-segment u16 fields × 1 segment)
            ...u16(0),                                   // language
            ...u16(2),                                   // segCountX2
            ...u16(2), ...u16(0), ...u16(0),            // searchRange, entrySelector, rangeShift
            ...u16(0xFFFF),                              // endCode sentinel
            ...u16(0),                                   // reservedPad
            ...u16(0xFFFF),                              // startCode sentinel
            ...u16(1),                                   // idDelta sentinel
            ...u16(0),                                   // idRangeOffset sentinel
        ];
    }
    const segCount = 2;
    const searchRange = 2 * Math.pow(2, Math.floor(Math.log2(segCount)));
    const entrySelector = Math.floor(Math.log2(segCount));
    const rangeShift = 2 * segCount - searchRange;

    const subtable = [
        ...u16(4),                                       // format
        ...u16(0),                                       // length (patched below)
        ...u16(0),                                       // language
        ...u16(segCount * 2),                            // segCountX2
        ...u16(searchRange), ...u16(entrySelector), ...u16(rangeShift),
        ...u16(charCode), ...u16(0xFFFF),                // endCode
        ...u16(0),                                       // reservedPad
        ...u16(charCode), ...u16(0xFFFF),                // startCode
        ...i16(1 - charCode), ...i16(1),                 // idDelta
        ...u16(0), ...u16(0),                            // idRangeOffset
    ];
    subtable[2] = (subtable.length >> 8) & 0xff;
    subtable[3] = subtable.length & 0xff;

    return [
        ...u16(0), ...u16(1),                            // version, numTables
        ...u16(3), ...u16(1), ...u32(12),                // platformID=3, encodingID=1, offset
        ...subtable,
    ];
}

export function makePost({ underlinePosition = -100, underlineThickness = 50 } = {}) {
    return [
        ...u16(3), ...u16(0),  // version 3.0 (no glyph names)
        ...u32(0),              // italicAngle
        ...i16(underlinePosition),
        ...i16(underlineThickness),
        ...u32(0),              // isFixedPitch
        ...u32(0),              // minMemType42
        ...u32(0),              // maxMemType42
        ...u32(0),              // minMemType1
        ...u32(0),              // maxMemType1
    ];
}

// --- font assembly ---

/**
 * Assembles a complete OpenType/TrueType font file from a table map.
 * @param {Object} tables - Map of tag string to byte array, e.g. { 'head': [...], 'cmap': [...] }
 * @param {Object} [options]
 * @param {string|number} [options.sfVersion] - 'OTTO' for CFF fonts, or a 32-bit number (default 0x00010000 for TrueType)
 * @returns {Uint8Array}
 */
export function assembleFont(tables, { sfVersion = 0x00010000 } = {}) {
    const tags = Object.keys(tables).sort();
    const numTables = tags.length;
    const searchRange = Math.pow(2, Math.floor(Math.log2(numTables))) * 16;
    const entrySelector = Math.floor(Math.log2(numTables));
    const rangeShift = numTables * 16 - searchRange;

    const headerSize = 12 + numTables * 16;
    let dataOffset = headerSize;

    const tableRecords = [];
    const tableData = [];
    for (const t of tags) {
        const data = tables[t];
        const paddedData = pad([...data]);
        tableRecords.push([
            ...tag(t.padEnd(4, ' ')),
            ...u32(calcChecksum(data)),
            ...u32(dataOffset),
            ...u32(data.length),
        ]);
        tableData.push(...paddedData);
        dataOffset += paddedData.length;
    }

    const sfVersionBytes = typeof sfVersion === 'string'
        ? tag(sfVersion)
        : u32(sfVersion);

    const font = [
        ...sfVersionBytes,
        ...u16(numTables),
        ...u16(searchRange),
        ...u16(entrySelector),
        ...u16(rangeShift),
        ...tableRecords.flat(),
        ...tableData,
    ];

    return new Uint8Array(font);
}
