import assert from 'assert';
import { unhex, unhexArray } from '../testutil.mjs';
import gpos, { subsetGposImplemented } from '../../src/tables/gpos.mjs';
import { parse } from '../../src/opentype.mjs';
import { readFileSync } from 'fs';
const loadSync = (url, opt) => parse(readFileSync(url), opt);

// Helper that builds a minimal GPOS table to test a lookup subtable.
function parseLookup(lookupType, subTableData) {
    const data = unhex('00010000 000A 000C 000E' +   // header
        '0000' +                                        // ScriptTable - 0 scripts
        '0000' +                                        // FeatureListTable - 0 features
        '0001 0004' +                                   // LookupListTable - 1 lookup table
        '000' + lookupType + '0000 0001 0008' +         // Lookup table - 1 subtable
        subTableData);                                  // sub table start offset: 0x1a
    return gpos.parse(data).lookups[0].subtables[0];
}

function makeLookup(lookupType, data) {
    return gpos.make({
        version: 1,
        scripts: [],
        features: [],
        lookups: [{
            lookupType: lookupType,
            lookupFlag: 0,
            subtables: [data]
        }]
    }).encode().slice(0x1a);                             // sub table start offset: 0x1a
}

describe('tables/gpos.mjs', function() {
    //// Header ///////////////////////////////////////////////////////////////
    it('can parse a GPOS header', function() {
        const data = unhex(
            '00010000 000A 000C 000E' +     // header
            '0000' +                        // ScriptTable - 0 scripts
            '0000' +                        // FeatureListTable - 0 features
            '0000'                          // LookupListTable - 0 lookups
        );
        assert.deepEqual(gpos.parse(data), { version: 1, scripts: [], features: [], lookups: [] });
    });

    it('can parse a GPOS header with null pointers', function() {
        const data = unhex(
            '00010000 0000 0000 0000'
        );
        assert.deepEqual(gpos.parse(data), { version: 1, scripts: [], features: [], lookups: [] });
    });

    //// Lookup type 1 ////////////////////////////////////////////////////////
    it('can parse lookup1 SinglePosFormat1', function() {
        // https://docs.microsoft.com/en-us/typography/opentype/spec/gpos#example-2-singleposformat1-subtable
        const data = '0001 0008 0002   FFB0 0002 0001   01B3 01BC 0000';
        assert.deepEqual(parseLookup(1, data), {
            posFormat: 1,
            coverage: {
                format: 2,
                ranges: [{ start: 0x1b3, end: 0x1bc, index: 0 }]
            },
            value: { yPlacement: -80 }
        });
    });

    it('can parse lookup1 SinglePosFormat1 with ValueFormat Table and ValueRecord', function() {
        // https://docs.microsoft.com/fr-fr/typography/opentype/spec/gpos#example-14-valueformat-table-and-valuerecord
        const data = '0001 000E 0099   0050 00D2 0018 0020   0002 0001 00C8 00D1 0000   000B 000F 0001 5540   000B 000F 0001 5540';
        assert.deepEqual(parseLookup(1, data), {
            posFormat: 1,
            coverage: {
                format: 2,
                ranges: [{ start: 0xc8, end: 0xd1, index: 0 }]
            },
            value: {
                xPlacement: 80,             // 0x50
                yAdvance: 210,              // 0xd2
                xPlaDevice: undefined,      // not supported yet
                yAdvDevice: undefined       // not supported yet
            }
        });
    });

    it('can parse lookup1 SinglePosFormat2', function() {
        // https://docs.microsoft.com/en-us/typography/opentype/spec/gpos#example-3-singleposformat2-subtable
        const data = '0002 0014 0005 0003   0032 0032   0019 0019  000A 000A   0001 0003 004F 0125 0129';
        assert.deepEqual(parseLookup(1, data), {
            posFormat: 2,
            coverage: {
                format: 1,
                glyphs: [0x4f, 0x125, 0x129]
            },
            values: [
                { xPlacement: 50, xAdvance: 50 },
                { xPlacement: 25, xAdvance: 25 },
                { xPlacement: 10, xAdvance: 10 }
            ]
        });
    });

    //// Lookup type 2 ////////////////////////////////////////////////////////
    it('can parse lookup2 PairPosFormat1', function() {
        // https://docs.microsoft.com/en-us/typography/opentype/spec/gpos#example-4-pairposformat1-subtable
        const data = '0001 001E 0004 0001 0002 000E 0016   0001 0059 FFE2 FFEC 0001 0059 FFD8 FFE7   0001 0002 002D 0031';
        assert.deepEqual(parseLookup(2, data), {
            posFormat: 1,
            coverage: {
                format: 1,
                glyphs: [0x2d, 0x31]
            },
            valueFormat1: 4,
            valueFormat2: 1,
            pairSets: [
                [{ secondGlyph: 0x59, value1: { xAdvance: -30 }, value2: { xPlacement: -20 } }],
                [{ secondGlyph: 0x59, value1: { xAdvance: -40 }, value2: { xPlacement: -25 } }]
            ]
        });
    });

    it('can parse lookup2 PairPosFormat2', function() {
        // https://docs.microsoft.com/en-us/typography/opentype/spec/gpos#example-5-pairposformat2-subtable
        const data = '0002 0018 0004 0000 0022 0032 0002 0002 0000 0000 0000 FFCE   0001 0003 0046 0047 0049   0002 0002 0046 0047 0001 0049 0049 0001   0002 0001 006A 006B 0001';
        assert.deepEqual(parseLookup(2, data), {
            posFormat: 2,
            coverage: {
                format: 1,
                glyphs: [0x46, 0x47, 0x49]
            },
            valueFormat1: 4,
            valueFormat2: 0,
            classDef1: {
                format: 2,
                ranges: [
                    { start: 0x46, end: 0x47, classId: 1 },
                    { start: 0x49, end: 0x49, classId: 1 }
                ]
            },
            classDef2: {
                format: 2,
                ranges: [
                    { start: 0x6a, end: 0x6b, classId: 1 }
                ]
            },
            class1Count: 2,
            class2Count: 2,
            classRecords: [
                [
                    { value1: { xAdvance: 0 }, value2: undefined },
                    { value1: { xAdvance: 0 }, value2: undefined }
                ],
                [
                    { value1: { xAdvance: 0 }, value2: undefined },
                    { value1: { xAdvance: -50 }, value2: undefined }
                ]
            ]
        });
    });
    
    //// Lookup type 2: Pair Position Adjustment //////////////////////////////////
    it('can write lookup2 for pair positioning', function() {
        // The substance of the test is taken from the example on the Microsoft website linked below,
        // however the order (and subsequently offsets) are edited to match the output of the function.
        // https://learn.microsoft.com/en-us/typography/opentype/spec/gpos#example-4-pairposformat1-subtable
        const expectedData = unhexArray(
            '0001' + // PosFormat
            '000E' + // Coverage offset (edited)
            '0004 0001 0002' + // ValueFormat1 + ValueFormat2 + PairSetCount
            '0016 001E' + // PairSet offsets (edited)
            '0001 0002 002D 0031' + // Coverage table
            '0001 0059 FFE2 FFEC' + // PairSet 1
            '0001 0059 FFD8 FFE7' // PairSet 2
        );
        assert.deepEqual(makeLookup(2, {
            posFormat: 1,
            valueFormat1: 4,
            valueFormat2: 1,
            coverage: {
                format: 1,
                glyphs: [0x2d, 0x31] // Glyph IDs for "P" and "T"
            },
            pairSets: [
                [
                    {
                        secondGlyph: 0x59, // Glyph ID for lowercase "o"
                        value1: { xAdvance: -30 }, // Adjustments for the pair "Po"
                        value2: { xPlacement: -20 }
                    }
                ],
                [
                    {
                        secondGlyph: 0x59, // Glyph ID for lowercase "o"
                        value1: { xAdvance: -40 }, // Adjustments for the pair "To"
                        value2: { xPlacement: -25 }
                    }
                ]
            ],
        }), expectedData);
    });

    //// Lookup type 2: Pair Position Adjustment with Classes ///////////////////////
    it('can write lookup2 for class-based pair positioning', function() {
        // https://learn.microsoft.com/en-us/typography/opentype/spec/gpos#example-5-pairposformat2-subtable
        const expectedData = unhexArray('0002 0018 0004 0000 0022 0032 0002 0002   0000 0000   0000 FFCE   0001 0003 0046 0047 0049   0002 0002 0046 0047 0001 0049 0049 0001   0002 0001 006A 006B 0001');
        assert.deepEqual(makeLookup(2, {
            posFormat: 2,
            valueFormat1: 4,
            valueFormat2: 0,
            coverage: {
                format: 1,
                glyphs: [0x46, 0x47, 0x49] // Glyph IDs for "v", "w", "y"
            },
            classDef1: {
                format: 2,
                ranges: [
                    { start: 0x46, end: 0x47, classId: 1 },
                    { start: 0x49, end: 0x49, classId: 1 }
                ]
            },
            classDef2: {
                format: 2,
                ranges: [
                    { start: 0x6A, end: 0x6B, classId: 1 } // Glyph IDs for "period" and "comma"
                ]
            },
            classRecords: [
                [
                    {
                        value1: { xAdvance: 0 },
                        value2: { xAdvance: 0 },
                    },
                    {
                        value1: { xAdvance: 0 },
                        value2: { xAdvance: 0 },
                    }
                ],
                [
                    {
                        value1: { xAdvance: 0 },
                        value2: { xAdvance: 0 },
                    },
                    {
                        value1: { xAdvance: -50 },
                        value2: { xAdvance: 0	},
                    }
                ]
            ]
        }), expectedData);
    });

    it('can write tables that are read as identical to the original', function() {
        // This font is used because it includes both "format 1" and "format 2" subtables.
        const font = loadSync('./test/fonts/Roboto-Black.ttf');
        // Gasp table is currently broken, this line can be removed once that bug is fixed.
        // See: https://github.com/opentypejs/opentype.js/pull/739
        font.tables.gasp = undefined;

        // Not all GPOS features are supported yet, so we need to subset the table.
        const gpos = subsetGposImplemented(font.tables.gpos);
        const gpos2 = subsetGposImplemented(parse(font.toArrayBuffer()).tables.gpos);
        assert.deepStrictEqual(gpos, gpos2);
    });

    it('can convert from `kern` table to GPOS table, when GPOS does not exist', function() {
        // This font contains both a `kern` and a `GPOS` table.
        const font = loadSync('./test/fonts/Vibur.woff');
        let font2 = loadSync('./test/fonts/Vibur.woff');
        font2.tables.gpos = undefined;
        font2 = parse(font2.toArrayBuffer());

        const kern1 = font.getKerningValue(font.charToGlyph('T'), font.charToGlyph('i'));
        const kern2 = font2.getKerningValue(font2.charToGlyph('T'), font2.charToGlyph('i'));

        assert.notStrictEqual(kern1, 0);
        assert.strictEqual(kern1, kern2);
    });

});
