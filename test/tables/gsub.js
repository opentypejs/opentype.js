import assert from 'assert';
import { unhex, unhexArray } from '../testutil.js';
import gsub from '../../src/tables/gsub.js';

// Helper that builds a minimal GSUB table to test a lookup subtable.
function parseLookup(lookupType, subTableData) {
    const data = unhex('00010000 000A 000C 000E' +   // header
        '0000' +                                        // ScriptTable - 0 scripts
        '0000' +                                        // FeatureListTable - 0 features
        '0001 0004' +                                   // LookupListTable - 1 lookup table
        '000' + lookupType + '0000 0001 0008' +         // Lookup table - 1 subtable
        subTableData);                                  // sub table start offset: 0x1a
    return gsub.parse(data).lookups[0].subtables[0];
}

function makeLookup(lookupType, data) {
    return gsub.make({
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

describe('tables/gsub.js', function() {
    //// Header ///////////////////////////////////////////////////////////////
    it('can parse a GSUB header', function() {
        const data = unhex(
            '00010000 000A 000C 000E' +     // header
            '0000' +                        // ScriptTable - 0 scripts
            '0000' +                        // FeatureListTable - 0 features
            '0000'                          // LookupListTable - 0 lookups
        );
        assert.deepEqual(gsub.parse(data), { version: 1, scripts: [], features: [], lookups: [] });
    });

    it('can parse a GSUB header with null pointers', function() {
        const data = unhex(
            '00010000 0000 0000 0000'
        );
        assert.deepEqual(gsub.parse(data), { version: 1, scripts: [], features: [], lookups: [] });
    });

    //// Lookup type 1 ////////////////////////////////////////////////////////
    it('can parse lookup1 substFormat 1', function() {
        // https://www.microsoft.com/typography/OTSPEC/GSUB.htm#EX2
        const data = '0001 0006 00C0   0002 0001 004E 0058 0000';
        assert.deepEqual(parseLookup(1, data), {
            substFormat: 1,
            coverage: {
                format: 2,
                ranges: [{ start: 0x4e, end: 0x58, index: 0 }]
            },
            deltaGlyphId: 0xc0
        });
    });

    it('can parse lookup1 substFormat 2', function() {
        // https://www.microsoft.com/typography/OTSPEC/GSUB.htm#EX3
        const data = '0002 000E 0004 0131 0135 013E 0143   0001 0004 003C 0040 004B 004F';
        assert.deepEqual(parseLookup(1, data), {
            substFormat: 2,
            coverage: {
                format: 1,
                glyphs: [0x3c, 0x40, 0x4b, 0x4f]
            },
            substitute: [0x131, 0x135, 0x13E, 0x143]
        });
    });

    //// Lookup type 2 ////////////////////////////////////////////////////////
    it('can parse lookup2', function() {
        // https://www.microsoft.com/typography/OTSPEC/GSUB.htm#EX4
        const data = '0001 0008 0001 000E   0001 0001 00F1   0003 001A 001A 001D';
        assert.deepEqual(parseLookup(2, data), {
            substFormat: 1,
            coverage: {
                format: 1,
                glyphs: [0xf1]
            },
            sequences: [
                [0x1a, 0x1a, 0x1d]
            ]
        });
    });

    //// Lookup type 3 ////////////////////////////////////////////////////////
    it('can parse lookup3', function() {
        // https://www.microsoft.com/typography/OTSPEC/GSUB.htm#EX5
        const data = '0001 0008 0001 000E   0001 0001 003A   0002 00C9 00CA';
        assert.deepEqual(parseLookup(3, data), {
            substFormat: 1,
            coverage: {
                format: 1,
                glyphs: [0x3a]
            },
            alternateSets: [
                [0xc9, 0xca]
            ]
        });
    });

    //// Lookup type 4 ////////////////////////////////////////////////////////
    it('can parse lookup4', function() {
        // https://www.microsoft.com/typography/OTSPEC/GSUB.htm#EX6
        const data = '0001 000A 0002 0014 0020' +                     // LigatureSubstFormat1
            '0002 0001 0019 001A 0000' +                            // coverage format 2
            '0001 0004 015B 0003 0028 0017' +                       // Ligature set "etc"
            '0002 0006 000E 00F1 0003 001A 001D 00F0 0002 001D';    // Ligature set "ffi" and "fi"
        assert.deepEqual(parseLookup(4, data), {
            substFormat: 1,
            coverage: {
                format: 2,
                ranges: [{ start: 0x19, end: 0x1a, index: 0 }]
            },
            ligatureSets: [
                [
                    { ligGlyph: 0x15B, components: [0x28, 0x17] }
                ],
                [
                    { ligGlyph: 0xf1, components: [0x1a, 0x1d] },
                    { ligGlyph: 0xf0, components: [0x1d] }
                ]
            ]
        });
    });

    //// Lookup type 5 ////////////////////////////////////////////////////////
    it('can parse lookup5 substFormat 1', function() {
        // https://www.microsoft.com/typography/OTSPEC/GSUB.htm#EX7
        const data = '0001 000A 0002 0012 0020' +                 // ContextSubstFormat1
            '0001 0002 0028 005D' +                             // coverage format 1
            '0001 0004 0002 0001 005D 0000 0001' +              // sub rule set "space and dash"
            '0001 0004 0002 0001 0028 0001 0001';               // sub rule set "dash and space"
        assert.deepEqual(parseLookup(5, data), {
            substFormat: 1,
            coverage: {
                format: 1,
                glyphs: [0x28, 0x5d]                                // space, dash
            },
            ruleSets: [
                [{ input: [0x5d], lookupRecords: [{ sequenceIndex: 0, lookupListIndex: 1 }] }],
                [{ input: [0x28], lookupRecords: [{ sequenceIndex: 1, lookupListIndex: 1 }] }]
            ]
        });
    });

    it('can parse lookup5 substFormat 2', function() {
        /* jshint elision: true */
        // https://www.microsoft.com/typography/OTSPEC/GSUB.htm#EX8
        const data = '0002 0010 001C 0004 0000 0000 0032 0040' +          // ContextSubstFormat2
            '0001 0004 0030 0031 0040 0041' +                           // coverage format 1
            '0002 0003 0030 0031 0002 0040 0041 0003 00D2 00D3 0001' +  // class def format 2
            '0001 0004 0002 0001 0001 0001 0001' +                      // sub class set "set marks high"
            '0001 0004 0002 0001 0001 0001 0002';                       // sub class set "set marks very high"
        assert.deepEqual(parseLookup(5, data), {
            substFormat: 2,
            coverage: {
                format: 1,
                glyphs: [0x30, 0x31, 0x40, 0x41]
            },
            classDef: {
                format: 2,
                ranges: [
                    { start: 0x30, end: 0x31, classId: 2 },
                    { start: 0x40, end: 0x41, classId: 3 },
                    { start: 0xd2, end: 0xd3, classId: 1 }
                ]
            },
            classSets: [
                undefined,
                undefined,           // mocha.assert doesn't seem to be happy with undefined here.
                [{ classes: [1], lookupRecords: [{ sequenceIndex: 1, lookupListIndex: 1 }] }],
                [{ classes: [1], lookupRecords: [{ sequenceIndex: 1, lookupListIndex: 2 }] }]
            ]
        });
    });

    it('can parse lookup5 substFormat 3', function() {
        // https://www.microsoft.com/typography/OTSPEC/GSUB.htm#EX9
        // Coverage offsets (0030, 004C, 006E) seem wrong in the example.
        // var data = '0003 0003 0002 0030 004C 006E 0000 0001 0002 0002'
        const data = '0003 0003 0002 0014 0030 0052 0000 0001 0002 0002' +                // ContextSubstFormat3
            '0001 000C 0033 0035 0037 0038 0039 003B 003C 003D 0041 0042 0045 004A' +   // coverage format 1
            '0001 000F 0032 0034 0036 003A 003E 003F 0040 0043 0044 0045 0046 0047 0048 0049 004B' + // coverage format 1
            '0001 0005 0038 003B 0041 0042 004A';                                       // coverage format 1
        assert.deepEqual(parseLookup(5, data), {
            substFormat: 3,
            coverages: [{
                    format: 1,
                    glyphs: [0x33, 0x35, 0x37, 0x38, 0x39, 0x3b, 0x3c, 0x3d, 0x41, 0x42, 0x45, 0x4a]
                },
                {
                    format: 1,
                    glyphs: [0x32, 0x34, 0x36, 0x3a, 0x3e, 0x3f, 0x40, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4b]
                },
                {
                    format: 1,
                    glyphs: [0x38, 0x3b, 0x41, 0x42, 0x4a]
                }],
            lookupRecords: [
                { sequenceIndex: 0, lookupListIndex: 1 },
                { sequenceIndex: 2, lookupListIndex: 2 }
            ]
        });
    });

    //// Lookup type 6 ////////////////////////////////////////////////////////
    it('can parse lookup6 substFormat1', function() {
        // https://docs.microsoft.com/de-de/typography/opentype/spec/gsub#lookuptype-6-chaining-contextual-substitution-subtable
        const data =
            '0001  0008  0001' + // substFormat, coverageOffset, chainSubRuleSetCount
            '000E' +             // chainSubRuleSetOffset
            // coverage table
            '0001  0001  000F' + // coverageFormat, glyphCount, glyphIndex
            // chainSubRuleSet table
            '0001  0004' +       // chainSubRuleCount, chainSubRuleOffset
            // ChainSubRule subtable
            '0001  000E' +       // backtrackGlyphCount, backtrackSequence
            '0001' +             // inputGlyphCount (includes the first glyph)
            '' +                 // inputSequence (starts with second glyph, and we have none)
            '0000' +             // lookaheadGlyphCount
            '' +                 // lookAheadSequence (we have none)
            '0001 0000 0001' // substitutionCount, sequenceIndex, lookupListIndex
        ;
        assert.deepEqual(parseLookup(6, data), {
            substFormat: 1,
            coverage: {
                format: 1,
                glyphs: [0xF]
            },
            chainRuleSets: [
                [{ backtrack: [0xE], input: [], lookahead: [], lookupRecords: [{ sequenceIndex: 0, lookupListIndex: 1 }]}]
            ]
        });
    });

    it('can parse lookup6 substFormat1 with all rule set properties', function() {
        // same as above but with some random values filled in for the empty values
        // to see if it works as intended both ways
        const data =
            '0001  0008  0001' + // substFormat, coverageOffset, chainSubRuleSetCount
            '000E' +             // chainSubRuleSetOffset
            // coverage table
            '0001  0001  000F' + // coverageFormat, glyphCount, glyphIndex
            // chainSubRuleSet table
            '0001  0004' +       // chainSubRuleCount, chainSubRuleOffset
            // ChainSubRule subtable
            '0001  000E' +       // backtrackGlyphCount, backtrackSequence
            '0002' +             // inputGlyphCount (includes the first glyph)
            '0048' +             // inputSequence (starts with second glyph, and we have none)
            '0001' +             // lookaheadGlyphCount
            '0042' +                 // lookAheadSequence (we have none)
            '0001 0000 0001' // substitutionCount, sequenceIndex, lookupListIndex
        ;
        assert.deepEqual(parseLookup(6, data), {
            substFormat: 1,
            coverage: {
                format: 1,
                glyphs: [0xF]
            },
            chainRuleSets: [
                [{ backtrack: [0xE], input: [0x48], lookahead: [0x42], lookupRecords: [{ sequenceIndex: 0, lookupListIndex: 1 }]}]
            ]
        });
    });

    // FIXME: test lookup6 substFormat2 (we already support parsing it!)

    it('can parse lookup6 substFormat3', function() {
        // https://docs.microsoft.com/de-de/typography/opentype/spec/gsub#63-chaining-context-substitution-format-3-coverage-based-glyph-contexts
        // example taken from Inter Regular, with just offsets adapted to the structure when only creating the lookup
        const data =
            '00 03    00 02' +                    // substFormat and backtrackGlyphCount
            '00 18    00 22' +                    // backtrackCoverageOffsets
            '00 01' +                             // inputGlyphCount
            '00 2C' +                             // inputCoverageOffsets
            '00 02' +                             // lookaheadGlyphCount
            '00 32    00 3C' +                    // lookaheadCoverageOffsets
            '00 01' +                             // substitutionCount
            // SubstLookupRecord, see https://docs.microsoft.com/de-de/typography/opentype/spec/gsub#substitution-lookup-record
            '00 00    00 32' +                    // glyphSequenceIndex and lookupListIndex
            // backtrackCoverage tables
            '00 02  00 01  06 82  06 91  00 00' + // coverageFormat, rangeRecordCount, startGlyphID, endGlyphID, startCoverageIndex
            '00 02  00 01  05 05  05 26  00 00' + // and the same for the second entry
            // inputCoverage table
            '00 01  00 01  03 AB' +               // coverageFormat, glyphCount, glyphIndex
            // lookaheadCoverage table
            '00 02  00 01  06 82  06 91  00 00' + // coverageFormat, rangeRecordCount, startGlyphID, endGlyphID, startCoverageIndex
            '00 02 00 01 05 05 05 26 00 00'       // and the same for the second entry
        ;
        assert.deepEqual(parseLookup(6, data), {
            substFormat: 3,
            backtrackCoverage: [
            {
                format: 2,
                ranges: [{ start: 1666, end: 1681, index: 0 }]
            },
            {
                format: 2,
                ranges: [{ start: 1285, end: 1318, index: 0 }]
            }
            ],
            inputCoverage: [{ format: 1, glyphs: [939] }],
            lookaheadCoverage: [{
                format: 2,
                ranges: [{ start: 1666, end: 1681, index: 0 }]
            },
            {
                format: 2,
                ranges: [{ start: 1285, end: 1318, index: 0 }]
            }
            ],
            lookupRecords: [
            {
                sequenceIndex: 0,
                lookupListIndex: 50
            }
            ]
        });
    });

    //// Lookup type 7 ////////////////////////////////////////////////////////
    it('can parse lookup7 subtable format 1', function() {

        const data =
            '00 01' +                    // substFormat
            '00 01' +                    // extensionLookupType
            '00 00 00 08' +              //	extensionOffset
            '0001 0006 00C0   0002 0001 004E 0058 0000' // data equal to that from the lookup1 substFormat 1 test
            ;
        const parsed = parseLookup(7, data);
        assert.deepEqual(parsed, {
            extension: { // object equal to that from the lookup1 substFormat 1 test
                substFormat: 1,
                coverage: {
                    format: 2,
                    ranges: [{ start: 0x4e, end: 0x58, index: 0 }]
                },
                deltaGlyphId: 0xc0
            },
            lookupType: 1,
            substFormat: 1
        });
    });

    //// Lookup type 8 ////////////////////////////////////////////////////////
    it('can parse lookup8', function() {
        // https://www.microsoft.com/typography/OTSPEC/GSUB.htm#EX10
        // In the Microsoft example, the third UShort (BacktrackGlyphCount) is 0000. It should be 0001
        // since there is an offset (NULL) to BacktrackCoverage[0]
        const data = '0001 0068 0001 0000 0001 0026 000C 00A7 00B9 00C5 00D4 00EA 00F2 00FD 010D 011B 012B 013B 0141' + // ReverseChainSingleSubstFormat1
            '0001 001F 00A5 00A9 00AA 00E2 0167 0168 0169 016D 016E 0170 0183' +     // coverage format 1
            '0184 0185 0189 018A 018C019F 01A0 01A1 01A2 01A3 01A4 01A5 01A6' +
            '01A7 01A8 01A9 01AA 01AB 01AC 01EC' +
            '0001 000C 00A6 00B7 00C3 00D2 00E9 00F1 00FC 010C 0119 0129 013A 0140'; // coverage format 1

        const parsed = parseLookup(8, data);
        assert.deepEqual(parsed, {
            substFormat: 1,
            coverage: {
                format: 1,
                glyphs: [0xa6, 0xb7, 0xc3, 0xd2, 0xe9, 0xf1, 0xfc, 0x10c, 0x119, 0x129, 0x13a, 0x140]
            },
            backtrackCoverage: [undefined],
            lookaheadCoverage: [{
                format: 1,
                glyphs: [
                    0xa5, 0xa9, 0xaa, 0xe2, 0x167, 0x168, 0x169, 0x16d, 0x16e, 0x170, 0x183, 0x184, 0x185,
                    0x189, 0x18a, 0x18c, 0x19f, 0x1a0, 0x1a1, 0x1a2, 0x1a3, 0x1a4, 0x1a5, 0x1a6, 0x1a7,
                    0x1a8, 0x1a9, 0x1aa, 0x1ab, 0x1ac, 0x1ec
                ]
            }],
            substitutes: [0xa7, 0xb9, 0xc5, 0xd4, 0xea, 0xf2, 0xfd, 0x10d, 0x11b, 0x12b, 0x13b, 0x141]
        });
    });

    /// Writing ///////////////////////////////////////////////////////////////
    it('should write a simple GSUB table + lookup type 4', function() {
        const expectedData = unhexArray(
            '00 01 00 00 00 0A 00 1E  00 2C 00 01 44 46 4C 54  00 08 00 04 00 00 00 00  FF FF 00 01 00 00 00 01' +
            '6C 69 67 61 00 08 00 00  00 01 00 00 00 01 00 04  00 04 00 00 00 01 00 08  00 01 00 0A 00 02 00 12' +
            '00 2E 00 01 00 02 00 18  00 1A 00 03 00 08 00 10  00 16 04 8A 00 03 00 34  00 34 04 84 00 02 00 18' +
            '04 83 00 02 00 34 00 01  00 04 04 8D 00 02 00 1D'
        );

        const gsubTable = {
            version: 1,
            scripts: [{
                tag: 'DFLT',
                script: {
                    defaultLangSys: {reserved: 0, reqFeatureIndex: 65535, featureIndexes: [0]},
                    langSysRecords: []
                }
            }],
            features: [{tag: 'liga', feature: {featureParams: 0, lookupListIndexes: [0]}}],
            lookups: [{
                lookupType: 4,
                lookupFlag: 0,
                subtables: [{
                    substFormat: 1,
                    coverage: {format: 1, glyphs: [24, 26]},
                    ligatureSets: [
                        [
                            {ligGlyph: 1162, components: [52, 52]},
                            {ligGlyph: 1156, components: [24]},
                            {ligGlyph: 1155, components: [52]}
                        ],
                        [
                            {ligGlyph: 1165, components: [29]}
                        ]
                    ]
                }]
            }]
        };
        assert.deepEqual(gsub.make(gsubTable).encode(), expectedData);
    });

    it('can write a lookup with coverage table format 2', function() {
        // https://docs.microsoft.com/de-de/typography/opentype/spec/chapter2#coverage-table
        // https://docs.microsoft.com/de-de/typography/opentype/spec/gsub#EX6 (extended with two more ranges)

        const expectedData = unhexArray('0001 0006 00C0   0002 0003   0019 001A 0000   004E 0057 0002   0060 0063 000C');
        assert.deepEqual(makeLookup(1, {
            substFormat: 1,
            coverage: {
                format: 2,
                ranges: [
                    { start: 25, end: 26, index: 0 },
                    { start: 78, end: 87, index: 2 },
                    { start: 96, end: 99, index: 12 }
                ]
            },
            deltaGlyphId: 0xc0
        }), expectedData);
    });

    //// Lookup type 1 ////////////////////////////////////////////////////////
    it('can write lookup1 substFormat 1', function() {
        const expectedData = unhexArray('0001 0006 00C0   0001 0004 003C 0040 004B 004F');
        assert.deepEqual(makeLookup(1, {
            substFormat: 1,
            coverage: {
                format: 1,
                glyphs: [0x3c, 0x40, 0x4b, 0x4f]
            },
            deltaGlyphId: 0xc0
        }), expectedData);
    });

    it('can write lookup1 substFormat 2', function() {
        // https://www.microsoft.com/typography/OTSPEC/GSUB.htm#EX3
        const expectedData = unhexArray('0002 000E 0004 0131 0135 013E 0143   0001 0004 003C 0040 004B 004F');
        assert.deepEqual(makeLookup(1, {
            substFormat: 2,
            coverage: {
                format: 1,
                glyphs: [0x3c, 0x40, 0x4b, 0x4f]
            },
            substitute: [0x131, 0x135, 0x13E, 0x143]
        }), expectedData);
    });

    //// Lookup type 2 ////////////////////////////////////////////////////////
    it('can write lookup2', function() {
        // https://www.microsoft.com/typography/OTSPEC/GSUB.htm#EX4
        const expectedData = unhexArray('0001 0008 0001 000E   0001 0001 00F1   0003 001A 001A 001D');
        assert.deepEqual(makeLookup(2, {
            substFormat: 1,
            coverage: {
                format: 1,
                glyphs: [0xf1]
            },
            sequences: [
                [0x1a, 0x1a, 0x1d]
            ]
        }), expectedData);
    });

    //// Lookup type 3 ////////////////////////////////////////////////////////
    it('can write lookup3', function() {
        // https://www.microsoft.com/typography/OTSPEC/GSUB.htm#EX5
        const expectedData = unhexArray('0001 0008 0001 000E   0001 0001 003A   0002 00C9 00CA');
        assert.deepEqual(makeLookup(3, {
            substFormat: 1,
            coverage: {
                format: 1,
                glyphs: [0x3a]
            },
            alternateSets: [
                [0xc9, 0xca]
            ]
        }), expectedData);
    });

    //// Lookup type 4 ////////////////////////////////////////////////////////
    // is already tested above

    //// Lookup type 5 ////////////////////////////////////////////////////////
    it('can write lookup5 substFormat1', function() {
        // https://learn.microsoft.com/en-gb/typography/opentype/spec/gsub#example-7-contextual-substitution-format-1
        const expectedData = unhexArray(
            '0001 000A 0002 0012 0020' +                 // ContextSubstFormat1
            '0001 0002 0028 005D' +                      // coverage format 1
            '0001 0004 0002 0001 005D 0000 0001' +       // sub rule set "space and dash"
            '0001 0004 0002 0001 0028 0001 0001'         // sub rule set "dash and space"
        );

        assert.deepEqual(makeLookup(5, {
            substFormat: 1,
            coverage: {
                format: 1,
                glyphs: [0x28, 0x5d]                                // space, dash
            },
            ruleSets: [
                [{ input: [0x5d], lookupRecords: [{ sequenceIndex: 0, lookupListIndex: 1 }] }],
                [{ input: [0x28], lookupRecords: [{ sequenceIndex: 1, lookupListIndex: 1 }] }]
            ]
        }), expectedData);
    });

    it('can write lookup5 substFormat2', function() {
        // https://learn.microsoft.com/en-gb/typography/opentype/spec/gsub#example-8-contextual-substitution-format-2
        const expectedData = unhexArray(
            // SequenceContextFormat2 SetMarksHighSubtable
            '0002  0010  001C' + // substFormat, SetMarksHighCoverage, SetMarksHighClassDef
            '0004' +             // classSeqRuleSetCount
            '0000  0000  0032 0040' + // classSeqRuleSetOffsets[0]-[3]
            // CoverageFormat1 SetMarksHighCoverage
            '0001  0004' +       // coverageFormat: lists, glyphCount
            '0030' +             // tahGlyphID: glyphArray[0], high base glyph
            '0031' +             // dhahGlyphID: glyphArray[1], high base glyph
            '0040' +             // cafGlyphID:	glyphArray[2], very high base glyph
            '0041' +             // gafGlyphID: glyphArray[3], very high base glyph
            // ClassDefFormat2 SetMarksHighClassDef
            '0002  0003' +       // classFormat: ranges, classRangeCount
            // classRangeRecords[0]:
            // ClassRangeRecords ordered by startGlyphID; record for Class 2, high base glyphs
            '0030' +             // tahGlyphID: Start, first Glyph ID in range
            '0031' +             // dhahGlyphID: End, last Glyph ID in range
            '0002' +             // class
            // classRangeRecords[1]:
            // ClassRangeRecord for Class 3, very high base glyphs
            '0040' +             // cafGlyphID: Start, first Glyph ID in range
            '0041' +             // gafGlyphID: End, last Glyph ID in range
            '0003' +             // class (ClassRange[2] for Class 1, mark gyphs)            )
            // classRangeRecords[2]:
            // ClassRangeRecord for Class 1, mark glyphs
            '00D2' +             // fathatanDefaultGlyphID: Start, first Glyph ID in range default fathatan mark
            '00D3' +             // dammatanDefaultGlyphID: End, last Glyph ID in the range default dammatan mark
            '0001' +             // class
            // ClassSequencRuleSet SetMarksHighSubClassSet2
            '0001' +             // classSeqRuleCount
            '0004' +             // SetMarksHighSubClassRule2: classSeqRuleOffsets[0] (offset to ClassSequenceRule table 0) — ClassSequenceRule tables ordered by preference
            // ClassSequenceRule SetMarksHighSubClassRule2:
            // ClassSequenceRule[0] table definition, Class 2 glyph (high base) glyph followed by a Class 1 glyph (mark)
            '0002' +             // glyphCount
            '0001' +             // seqLookupCount
            '0001' +             // inputSequence[0] — input sequence beginning with the second Class in the input context sequence; Class 1, mark glyphs
            // seqLookupRecords[0]:
            // seqLookupRecords array in design order
            '0001' +             // sequenceIndex — apply substitution to position 2, a mark
            '0001' +             // lookupListIndex
            // ClassSequencRuleSet SetMarksVeryHighSubClassSet3:
            // ClassSequencRuleSet[3] table definition — all contexts that begin with Class 3 glyphs
            '0001' +             // classSeqRuleCount
            '0004' +             // SetMarksVeryHighSubClassRule3: classSeqRuleOffsets[0]
            // ClassSequenceRule: SetMarksVeryHighSubClassRule3
            // ClassSequenceRule[0] table definition — Class 3 glyph (very high base glyph) followed by a Class 1 glyph (mark)
            '0002' +             // glyphCount
            '0001' +             // seqLookupCount
            '0001' +             // inputSequence[0] — input sequence beginning with the second Class in the input context sequence; Class 1, mark glyphs
            // seqLookupRecords[0]:	seqLookupRecords array in design order
            '0001' +             // sequenceIndex — apply substitution to position 2, second glyph class (mark)
            '0002'               // lookupListIndex
        );
        assert.deepEqual(makeLookup(5, {
            substFormat: 2,
            coverage: {
                format: 1,
                glyphs: [0x30, 0x31, 0x40, 0x41]
            },
            classDef: {
                format: 2,
                ranges: [
                    { start: 0x30, end: 0x31, classId: 2 },
                    { start: 0x40, end: 0x41, classId: 3 },
                    { start: 0xD2, end: 0xD3, classId: 1 }
                ]
            },
            classSets: [
                undefined,
                undefined,
                [{ classes: [1], lookupRecords: [{ sequenceIndex: 1, lookupListIndex: 1 }] }],
                [{ classes: [1], lookupRecords: [{ sequenceIndex: 1, lookupListIndex: 2 }] }]
            ]
        }), expectedData);
    });

    it('can write lookup5 substFormat3', function() {
        // https://www.microsoft.com/typography/OTSPEC/GSUB.htm#EX9
        const expectedData = unhexArray(
            '0003 0003 0002 0014 0030 0052 0000 0001 0002 0002' + // ContextSubstFormat3
            '0001 000C 0033 0035 0037 0038 0039 003B 003C 003D 0041 0042 0045 004A' + // coverage format 1
            '0001 000F 0032 0034 0036 003A 003E 003F 0040 0043 0044 0045 0046 0047 0048 0049 004B' + // coverage format 1
            '0001 0005 0038 003B 0041 0042 004A' // coverage format 1
        );
        assert.deepEqual(makeLookup(5, {
            substFormat: 3,
            coverages: [{
                    format: 1,
                    glyphs: [0x33, 0x35, 0x37, 0x38, 0x39, 0x3b, 0x3c, 0x3d, 0x41, 0x42, 0x45, 0x4a]
                },
                {
                    format: 1,
                    glyphs: [0x32, 0x34, 0x36, 0x3a, 0x3e, 0x3f, 0x40, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4b]
                },
                {
                    format: 1,
                    glyphs: [0x38, 0x3b, 0x41, 0x42, 0x4a]
                }],
            lookupRecords: [
                { sequenceIndex: 0, lookupListIndex: 1 },
                { sequenceIndex: 2, lookupListIndex: 2 }
            ]
        }), expectedData);
    });

    //// Lookup type 6 ////////////////////////////////////////////////////////
    it('can write lookup6 substFormat1', function() {
        // https://docs.microsoft.com/de-de/typography/opentype/spec/gsub#lookuptype-6-chaining-contextual-substitution-subtable
        const expectedData = unhexArray(
            '0001  0008  0001' + // substFormat, coverageOffset, chainSubRuleSetCount
            '000E' +             // chainSubRuleSetOffset
            // coverage table
            '0001  0001  000F' + // coverageFormat, glyphCount, glyphIndex
            // chainSubRuleSet table
            '0001  0004' +       // chainSubRuleCount, chainSubRuleOffset
            // ChainSubRule subtable
            '0001  000E' +       // backtrackGlyphCount, backtrackSequence
            '0001' +             // inputGlyphCount (includes the first glyph)
            '' +                 // inputSequence (starts with second glyph, and we have none)
            '0000' +             // lookaheadGlyphCount
            '' +                 // lookAheadSequence (we have none)
            '0001 0000 0001' // substitutionCount, sequenceIndex, lookupListIndex
        );
        assert.deepEqual(makeLookup(6, {
            substFormat: 1,
            coverage: {
                format: 1,
                glyphs: [0xF]
            },
            chainRuleSets: [
                [{ backtrack: [0xE], input: [], lookahead: [], lookupRecords: [{ sequenceIndex: 0, lookupListIndex: 1 }]}]
            ]
        }), expectedData);
    });

    it('can write lookup6 substFormat1 with all rule set properties', function() {
        // same as above but with some random values filled in for the empty values
        // to see if it works as intended both ways
        const expectedData = unhexArray(
            '0001  0008  0001' + // substFormat, coverageOffset, chainSubRuleSetCount
            '000E' +             // chainSubRuleSetOffset
            // coverage table
            '0001  0001  000F' + // coverageFormat, glyphCount, glyphIndex
            // chainSubRuleSet table
            '0001  0004' +       // chainSubRuleCount, chainSubRuleOffset
            // ChainSubRule subtable
            '0001  000E' +       // backtrackGlyphCount, backtrackSequence
            '0002' +             // inputGlyphCount (includes the first glyph)
            '0048' +             // inputSequence (starts with second glyph, and we have none)
            '0001' +             // lookaheadGlyphCount
            '0042' +                 // lookAheadSequence (we have none)
            '0001 0000 0001' // substitutionCount, sequenceIndex, lookupListIndex
        );
        assert.deepEqual(makeLookup(6, {
            substFormat: 1,
            coverage: {
                format: 1,
                glyphs: [0xF]
            },
            chainRuleSets: [
                [{ backtrack: [0xE], input: [0x48], lookahead: [0x42], lookupRecords: [{ sequenceIndex: 0, lookupListIndex: 1 }]}]
            ]
        }), expectedData);
    });

    it('can write lookup6 substFormat3', function() {
        // https://docs.microsoft.com/de-de/typography/opentype/spec/gsub#63-chaining-context-substitution-format-3-coverage-based-glyph-contexts
        // example taken from Inter Regular, with just offsets adapted to the structure when only creating the lookup
        const expectedData = unhexArray(
            '00 03    00 02' +                    // substFormat and backtrackGlyphCount
            '00 18    00 22' +                    // backtrackCoverageOffsets
            '00 01' +                             // inputGlyphCount
            '00 2C' +                             // inputCoverageOffsets
            '00 02' +                             // lookaheadGlyphCount
            '00 32    00 3C' +                    // lookaheadCoverageOffsets
            '00 01' +                             // substitutionCount
            // SubstLookupRecord, see https://docs.microsoft.com/de-de/typography/opentype/spec/gsub#substitution-lookup-record
            '00 00    00 32' +                    // glyphSequenceIndex and lookupListIndex
            // backtrackCoverage tables
            '00 02  00 01  06 82  06 91  00 00' + // coverageFormat, rangeRecordCount, startGlyphID, endGlyphID, startCoverageIndex
            '00 02  00 01  05 05  05 26  00 00' + // and the same for the second entry
            // inputCoverage table
            '00 01  00 01  03 AB' +               // coverageFormat, glyphCount, glyphIndex
            // lookaheadCoverage table
            '00 02  00 01  06 82  06 91  00 00' + // coverageFormat, rangeRecordCount, startGlyphID, endGlyphID, startCoverageIndex
            '00 02 00 01 05 05 05 26 00 00'       // and the same for the second entry
        );
        assert.deepEqual(makeLookup(6, {
            substFormat: 3,
            backtrackCoverage: [
            {
                format: 2,
                ranges: [{ start: 1666, end: 1681, index: 0 }]
            },
            {
                format: 2,
                ranges: [{ start: 1285, end: 1318, index: 0 }]
            }
            ],
            inputCoverage: [{ format: 1, glyphs: [939] }],
            lookaheadCoverage: [{
                format: 2,
                ranges: [{ start: 1666, end: 1681, index: 0 }]
            },
            {
                format: 2,
                ranges: [{ start: 1285, end: 1318, index: 0 }]
            }
            ],
            lookupRecords: [
            {
                sequenceIndex: 0,
                lookupListIndex: 50
            }
            ]
        }), expectedData);
    });
});
