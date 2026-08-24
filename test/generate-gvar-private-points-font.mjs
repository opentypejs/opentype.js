/**
 * Generates a minimal variable TrueType font whose 'gvar' table exercises a
 * specific edge case in the packed point number encoding: a glyph that has a
 * non-empty *shared* point number set, plus a tuple variation that uses
 * *private* point numbers encoded with a packed count of 0.
 *
 * Per the OpenType spec, a packed point count of 0 means "deltas are
 * provided for all of the glyph's points" - it does NOT mean "no private
 * points, fall back to the shared set".
 * https://learn.microsoft.com/en-us/typography/opentype/spec/otvarcommonformats#packed-point-numbers
 *
 * The 'test' glyph is a single-contour quad with 4 on-curve points. Its gvar
 * entry has 3 tuple variations, all peaking at the single 'wght' axis's
 * maximum value (so all three apply with factor 1 at that instance):
 *   - tuples 0 and 1 both use the *shared* point set {0,1,2,3} (all 4 real
 *     points). They're deliberately duplicated so that the shared-point
 *     selection below unambiguously prefers this set over the trivial
 *     1-byte "all points" encoding (which would otherwise "win" whenever a
 *     point set is only used once, since it costs the same either way).
 *   - tuple 2 uses *private* point numbers with a packed count of 0 ("all
 *     points": the 4 real points plus 4 phantom points).
 *
 * Usage: node test/generate-gvar-private-points-font.mjs
 * Output: test/fonts/TestGVAR-PrivatePointsZero.ttf
 */

import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
    u16, u32, i16, tag,
    makeHead, makeHhea, makeMaxp, makeOS2, makeName, makeHmtx, makeCmap, makePost,
    assembleFont,
} from './font-generation-helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// A run of point/delta values ≤ 127, encoded as a single byte-encoded run
// (the shared point numbers, tuple point counts and deltas below all fit
// this, so a general-purpose packer isn't needed).
function byteOf(v) { return v < 0 ? v + 0x100 : v; }

// --- glyf / loca: glyph 0 is an empty .notdef, glyph 1 ('test') is a
// single-contour quad with 4 on-curve points ---

const testPoints = [[100, 100], [500, 100], [500, 500], [100, 500]];

function makeQuadGlyf(points) {
    const xs = points.map(p => p[0]);
    const ys = points.map(p => p[1]);
    const deltas = points.map((p, i) => i === 0 ? p : [p[0] - points[i - 1][0], p[1] - points[i - 1][1]]);
    return [
        ...i16(1),                                     // numberOfContours
        ...i16(Math.min(...xs)), ...i16(Math.min(...ys)),
        ...i16(Math.max(...xs)), ...i16(Math.max(...ys)),
        ...u16(points.length - 1),                    // endPtsOfContours[0]
        ...u16(0),                                      // instructionLength
        ...points.map(() => 1),                        // flags: ON_CURVE_POINT for every point
        ...deltas.flatMap(([dx]) => i16(dx)),           // xCoordinates
        ...deltas.flatMap(([, dy]) => i16(dy)),         // yCoordinates
    ];
}

const notdefGlyf = [];
const testGlyf = makeQuadGlyf(testPoints);

// Packs a list of glyph data byte-lengths into a 'loca'-style short-format
// offset array (cumulative byte offsets, stored divided by 2). 'gvar' uses
// the exact same scheme for its own per-glyph offsets.
function shortOffsets(lengths) {
    const offsets = [0];
    for (const len of lengths) offsets.push(offsets[offsets.length - 1] + len);
    return offsets.flatMap(o => u16(o / 2));
}

// --- fvar: a single 'wght' axis, 0 (default) to 1000 ---

function makeFvar() {
    return [
        ...u32(0x00010000), // version
        ...u16(16),          // offsetToData (fvar header size)
        ...u16(2),            // countSizePairs
        ...u16(1),             // axisCount
        ...u16(20),             // axisSize
        ...u16(0),               // instanceCount
        ...u16(8),                // instanceSize
        ...tag('wght'),
        ...u32(0),                 // minValue = 0.0
        ...u32(0),                  // defaultValue = 0.0
        ...u32(1000 << 16),          // maxValue = 1000.0
        ...u16(0),                    // flags
        ...u16(256),                   // axisNameID (unreferenced; not required to resolve)
    ];
}

// --- gvar: see the module doc comment above for the tuple layout ---

function packPointNumbers(points) {
    // points must be sorted ascending; assumes count and every delta fit in
    // a single byte, which is all this fixture needs.
    const bytes = [points.length, points.length - 1];
    let last = 0;
    for (const p of points) {
        bytes.push(byteOf(p - last));
        last = p;
    }
    return bytes;
}

function packDeltaRun(values) {
    return [values.length - 1, ...values.map(byteOf)];
}

function packDeltas(xs, ys) {
    return [...packDeltaRun(xs), ...packDeltaRun(ys)];
}

const EMBEDDED_PEAK_TUPLE = 0x8000;
const PRIVATE_POINT_NUMBERS = 0x2000;
const PEAK_AT_AXIS_MAX = u16(0x4000); // F2Dot14 for 1.0, the single axis's maximum

function makeTupleHeader(dataSize, flags) {
    return [...u16(dataSize), ...u16(flags), ...PEAK_AT_AXIS_MAX];
}

// tuples 0 and 1: shared points {0,1,2,3} (all 4 real points)
const sharedPointsData = packPointNumbers([0, 1, 2, 3]);
const tuple0Deltas = packDeltas([1, 3, 5, 7], [2, 4, 6, 8]);
const tuple1Deltas = packDeltas([10, 11, 12, 13], [20, 21, 22, 23]);
// tuple 2: private point numbers, packed count 0 ("all points" = 4 real + 4 phantom)
const tuple2Data = [0, ...packDeltas([30, 31, 32, 33, 0, 0, 0, 0], [40, 41, 42, 43, 0, 0, 0, 0])];

const headers = [
    ...makeTupleHeader(tuple0Deltas.length, EMBEDDED_PEAK_TUPLE),
    ...makeTupleHeader(tuple1Deltas.length, EMBEDDED_PEAK_TUPLE),
    ...makeTupleHeader(tuple2Data.length, EMBEDDED_PEAK_TUPLE | PRIVATE_POINT_NUMBERS),
];

const serializedData = [...sharedPointsData, ...tuple0Deltas, ...tuple1Deltas, ...tuple2Data];
const dataOffset = 4 + headers.length; // tupleVariationCount + dataOffset fields + headers
let testGvarData = [
    ...u16(0x8000 | 3), // tupleVariationCount: shared points present, 3 tuples
    ...u16(dataOffset),
    ...headers,
    ...serializedData,
];
if (testGvarData.length % 2 !== 0) testGvarData = [...testGvarData, 0]; // keep offsets even (short format)

function makeGvar(glyphDataArrays) {
    const HEADER_SIZE = 20;
    const offsetsSize = (glyphDataArrays.length + 1) * 2;
    const glyphVariationDataArrayOffset = HEADER_SIZE + offsetsSize;
    return [
        ...u16(1), ...u16(0),            // version 1.0
        ...u16(1),                        // axisCount
        ...u16(0),                         // sharedTupleCount (not used by this fixture)
        ...u32(0),                          // sharedTuplesOffset (NULL, since count is 0)
        ...u16(glyphDataArrays.length),      // glyphCount
        ...u16(0),                            // flags: short (uint16) offsets
        ...u32(glyphVariationDataArrayOffset),
        ...shortOffsets(glyphDataArrays.map(g => g.length)),
        ...glyphDataArrays.flat(),
    ];
}

// --- assemble ---

const glyf = [...notdefGlyf, ...testGlyf];
const loca = shortOffsets([notdefGlyf.length, testGlyf.length]);

const font = assembleFont({
    'head': makeHead(),
    'hhea': makeHhea(2),
    'maxp': makeMaxp(2, { maxPoints: 4, maxContours: 1 }),
    'OS/2': makeOS2(),
    'name': makeName('Test Gvar Private Points'),
    'cmap': makeCmap(0x41), // 'A' -> glyph 1
    'post': makePost(),
    'loca': loca,
    'glyf': glyf,
    'hmtx': makeHmtx(2),
    'fvar': makeFvar(),
    'gvar': makeGvar([notdefGlyf, testGvarData]),
});

const outPath = join(__dirname, 'fonts', 'TestGVAR-PrivatePointsZero.ttf');
writeFileSync(outPath, font);
console.log(`Written ${font.length} bytes to ${outPath}`);
