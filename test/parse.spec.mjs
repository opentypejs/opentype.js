import assert from 'assert';
import { unhex } from './testutil.mjs';
import { Parser } from '../src/parse.mjs';

describe('parse.mjs', function() {
    // interpret hex as signed integer
    const signed = hex => {
        const bitLength = hex.toString(16).length * 4;
        const mask = 1 << (bitLength - 1);
        const maxUnsigned = (1 << bitLength) - 1;
        return (hex & mask) ? -(~hex & maxUnsigned) - 1 : hex;
    };    

    describe('parseUShortList', function() {
        it('can parse an empty list', function() {
            const p = new Parser(unhex('0000'), 0);
            assert.deepEqual(p.parseUShortList(), []);
        });

        it('can parse a list', function() {
            const p = new Parser(unhex('0003 1234 DEAD BEEF'), 0);
            assert.deepEqual(p.parseUShortList(), [0x1234, 0xdead, 0xbeef]);
        });

        it('can parse a list of predefined length', function() {
            const p = new Parser(unhex('1234 DEAD BEEF 5678 9ABC'), 2);
            assert.deepEqual(p.parseUShortList(3), [0xdead, 0xbeef, 0x5678]);
        });
    });

    describe('parseList', function() {
        it('can parse a list of values', function() {
            const data = '0003 12 34 56 78 9A BC';
            const p = new Parser(unhex(data), 0);
            assert.deepEqual(p.parseList(Parser.uShort), [0x1234, 0x5678, 0x9abc]);
            assert.equal(p.relativeOffset, 8);
        });

        it('can parse a list of values of predefined length', function() {
            const data = '12 34 56 78 9A BC';
            const p = new Parser(unhex(data), 0);
            assert.deepEqual(p.parseList(3, Parser.uShort), [0x1234, 0x5678, 0x9abc]);
            assert.equal(p.relativeOffset, 6);
        });
    });

    describe('parseRecordList', function() {
        it('can parse a list of records', function() {
            const data = '0002 12 34 56 78 9A BC';
            const p = new Parser(unhex(data), 0);
            assert.deepEqual(p.parseRecordList({ a: Parser.byte, b: Parser.uShort }), [
                { a: 0x12, b: 0x3456 },
                { a: 0x78, b: 0x9abc }
            ]);
            assert.equal(p.relativeOffset, 8);
        });

        it('can parse an empty list of records', function() {
            const data = '0000';
            const p = new Parser(unhex(data), 0);
            assert.deepEqual(p.parseRecordList({ a: Parser.byte, b: Parser.uShort }), []);
            assert.equal(p.relativeOffset, 2);
        });

        it('can parse a list of records of predefined length', function() {
            const data = '12 34 56 78 9A BC';
            const p = new Parser(unhex(data), 0);
            assert.deepEqual(p.parseRecordList(2, { a: Parser.byte, b: Parser.uShort }), [
                { a: 0x12, b: 0x3456 },
                { a: 0x78, b: 0x9abc }
            ]);
            assert.equal(p.relativeOffset, 6);
        });
    });

    describe('parseListOfLists', function() {
        it('can parse a list of lists of 16-bit integers', function() {
            const data = '0003 0008 000E 0016' +      // 3 lists
                '0002 1234 5678' +                  // list 1
                '0003 DEAD BEEF FADE' +             // list 2
                '0001 9876';                        // list 3
            const p = new Parser(unhex(data), 0);
            assert.deepEqual(p.parseListOfLists(), [
                [0x1234, 0x5678],
                [0xdead, 0xbeef, 0xfade],
                [0x9876]
            ]);
        });

        it('can parse an empty list of lists', function() {
            const p = new Parser(unhex('0000'), 0);
            assert.deepEqual(p.parseListOfLists(), []);
        });

        it('can parse list of empty lists', function() {
            const p = new Parser(unhex('0001 0004 0000'), 0);
            assert.deepEqual(p.parseListOfLists(), [[]]);
        });

        it('can parse a list of lists of records', function() {
            const data = '0002 0006 0012' +                   // 2 lists
                '0002 0006 0009 12 34 56 78 9A BC' +        // list 1
                '0001 0004 DE F0 12';                       // list 2

            const p = new Parser(unhex(data), 0);
            function parseRecord() {
                return { a: p.parseByte(), b: p.parseUShort() };
            }

            assert.deepEqual(p.parseListOfLists(parseRecord), [
                [{ a: 0x12, b: 0x3456 }, { a: 0x78, b: 0x9abc }],
                [{ a: 0xde, b: 0xf012 }]
            ]);
        });
    });

    describe('parseCoverage', function() {
        it('should parse a CoverageFormat1 table', function() {
            // https://www.microsoft.com/typography/OTSPEC/chapter2.htm Example 5
            const data = '0004 1234' +                // coverageOffset + filler
                '0001 0005 0038 003B 0041 0042 004A';
            const p = new Parser(unhex(data), 4);
            assert.deepEqual(p.parseCoverage(), {
                format: 1,
                glyphs: [0x38, 0x3b, 0x41, 0x42, 0x4a]
            });
            assert.equal(p.relativeOffset, 14);
        });

        it('should parse a CoverageFormat2 table', function() {
            // https://www.microsoft.com/typography/OTSPEC/chapter2.htm Example 6
            const data = '0004 1234' +                // coverageOffset + filler
                '0002 0001 004E 0057 0000';
            const p = new Parser(unhex(data), 4);
            assert.deepEqual(p.parseCoverage(), {
                format: 2,
                ranges: [{ start: 0x4e, end: 0x57, index: 0 }]
            });
            assert.equal(p.relativeOffset, 10);
        });
    });

    describe('parseClassDef', function() {
        it('should parse a ClassDefFormat1 table', function() {
            // https://docs.microsoft.com/en-us/typography/opentype/spec/chapter2#example-7-classdefformat1-table-class-array
            const data = '0001 0032 001A' +
                '0000 0001 0000 0001 0000 0001 0002 0001 0000 0002 0001 0001 0000' +
                '0000 0000 0002 0002 0000 0000 0001 0000 0000 0000 0000 0002 0001';
            const p = new Parser(unhex(data), 0);
            assert.deepEqual(p.parseClassDef(), {
                format: 1,
                startGlyph: 0x32,
                classes: [
                    0, 1, 0, 1, 0, 1, 2, 1, 0, 2, 1, 1, 0,
                    0, 0, 2, 2, 0, 0, 1, 0, 0, 0, 0, 2, 1
                ]
            });
            assert.equal(p.relativeOffset, 58);
        });

        it('should parse a ClassDefFormat2 table', function() {
            // https://docs.microsoft.com/en-us/typography/opentype/spec/chapter2#example-8-classdefformat2-table-class-ranges
            const data = '0002 0003 0030 0031 0002 0040 0041 0003 00D2 00D3 0001';
            const p = new Parser(unhex(data), 0);
            assert.deepEqual(p.parseClassDef(), {
                format: 2,
                ranges: [
                    { start: 0x30, end: 0x31, classId: 2 },
                    { start: 0x40, end: 0x41, classId: 3 },
                    { start: 0xd2, end: 0xd3, classId: 1 }
                ]
            });
            assert.equal(p.relativeOffset, 22);
        });
    });

    describe('parseScriptList', function() {
        it('should parse a ScriptList table', function() {
            // https://www.microsoft.com/typography/OTSPEC/chapter2.htm Examples 1 & 2
            const data = '0004 1234' +                // coverageOffset + filler
                '0003 68616E69 0014 6B616E61 0018 6C61746E 001C' +  // Example 1
                '0000 0000 0000 0000' +                             // 2 empty Script Tables
                '000A 0001 55524420 0016' +                         // Example 2
                '0000 FFFF 0003 0000 0001 0002' +                   // DefLangSys
                '0000 0003 0003 0000 0001 0002';                    // UrduLangSys
            const p = new Parser(unhex(data), 0);
            assert.deepEqual(p.parseScriptList(), [
                { tag: 'hani', script: { defaultLangSys: undefined, langSysRecords: [] } },
                { tag: 'kana', script: { defaultLangSys: undefined, langSysRecords: [] } },
                { tag: 'latn', script: {
                    defaultLangSys: {
                        reserved: 0,
                        reqFeatureIndex: 0xffff,
                        featureIndexes: [0, 1, 2]
                    },
                    langSysRecords: [{
                        tag: 'URD ',
                        langSys: {
                            reserved: 0,
                            reqFeatureIndex: 3,
                            featureIndexes: [0, 1, 2]
                        }
                    }]
                } },
            ]);
            assert.equal(p.relativeOffset, 2);
        });
    });

    describe('parseFeatureList', function() {
        it('should parse a FeatureList table', function() {
            // https://www.microsoft.com/typography/OTSPEC/chapter2.htm Example 3
            const data = '0004 0000' +                                // table offset + filler
                '0003 6C696761 0014 6C696761 001A 6C696761 0022' +  // feature list
                // There is an error in the online example, count is 3 for the 3rd feature.
                '0000 0001 0000   0000 0002 0000 0001   0000 0003 0000 0001 0002';
            const p = new Parser(unhex(data), 0);
            assert.deepEqual(p.parseFeatureList(), [
                { tag: 'liga', feature: { featureParams: 0, lookupListIndexes: [0] } },
                { tag: 'liga', feature: { featureParams: 0, lookupListIndexes: [0, 1] } },
                { tag: 'liga', feature: { featureParams: 0, lookupListIndexes: [0, 1, 2] } }
            ]);
            assert.equal(p.relativeOffset, 2);
        });
    });

    describe('parseLookupList', function() {
        it('should parse a LookupList table', function() {
            // https://www.microsoft.com/typography/OTSPEC/chapter2.htm Example 4
            const data = '0004 0000' +                    // table offset + filler
                '0003 0008 0010 0018' +                 // lookup list
                '0004 000C 0001 0018' +                 // FfiFi lookup
                '0004 000C 0001 0028' +                 // FflFlFf lookup
                '0004 000C 0001 0038' +                 // Eszet lookup
                '1234 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000' +
                '5678 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000' +
                '9ABC';
            const lookupTableParsers = [0, 0, 0, 0, Parser.uShort];
            const p = new Parser(unhex(data), 0);
            assert.deepEqual(p.parseLookupList(lookupTableParsers), [
                { lookupType: 4, lookupFlag: 0x000c, subtables: [0x1234], markFilteringSet: undefined },
                { lookupType: 4, lookupFlag: 0x000c, subtables: [0x5678], markFilteringSet: undefined },
                { lookupType: 4, lookupFlag: 0x000c, subtables: [0x9abc], markFilteringSet: undefined },
            ]);
            assert.equal(p.relativeOffset, 2);
        });
    });

    describe('parseDeltaSets', function() {
        it('should parse DeltaSets without the LONG_WORDS flag', function() {
            const data = '0123 4567 891A BCDE FADE C0FF EE0F DEAD BEEF BADA 55DE CADE';
            const p = new Parser(unhex(data), 0);
            assert.deepEqual(p.parseDeltaSets(4, 0x0000, 2), [
                [0x01, 0x23], [0x45, 0x67], [0x89, 0x1A], [0xBC, 0xDE]
            ].map(x => x.map(signed)));
            assert.deepEqual(p.parseDeltaSets(4, 0x0001, 3), [
                [0xFADE, 0xC0, 0xFF], [0xEE0F, 0xDE, 0xAD],
                [0xBEEF, 0xBA, 0xDA], [0x55DE, 0xCA, 0xDE]
            ].map(x => x.map(signed)));
            p.relativeOffset = 0;
            assert.deepEqual(p.parseDeltaSets(4, 0x0002, 4), [
                [0x0123, 0x4567, 0x89, 0x1A], [0xBCDE, 0xFADE, 0xC0, 0xFF],
                [0xEE0F, 0xDEAD, 0xBE, 0xEF], [0xBADA, 0x55DE, 0xCA, 0xDE],
            ].map(x => x.map(signed)));
        });

        it('should parse DeltaSets with the LONG_WORDS flag', function() {
            const data = '0123 4567 891A BCDE FADE C0FF EEEE BA5E DEAD BEEF DEFA CE0F BADA 55E5 0011 2233 2211 2233 2211';
            const p = new Parser(unhex(data), 0);
            assert.deepEqual(p.parseDeltaSets(4, 0x8000, 2), [
                [0x0123, 0x4567], [0x891A, 0xBCDE], [0xFADE, 0xC0FF], [0xEEEE, 0xBA5E]
            ].map(x => x.map(signed)));
            p.relativeOffset = 0;
            assert.deepEqual(p.parseDeltaSets(1, 0x8001, 3), [
                [0x01234567, 0x891A, 0xBCDE ],
            ].map(x => x.map(signed)));
            p.relativeOffset = 28;
            assert.deepEqual(p.parseDeltaSets(1, 0x8002, 3), [
                [0x00112233, 0x22112233, 0x2211],
            ].map(x => x.map(signed)));
        });
    });

    describe('parseVariationRegionList', function() {
        it('should parse a VariationRegionList', function() {
            // https://learn.microsoft.com/en-us/typography/opentype/spec/otvarcommonformats#variation-regions
            const data = '0002 0002 ' + // axisCount: 2, regionCount: 2
                'C000 E000 0000 ' + // variationRegions[0], regionAxes[0]
                'C000 C000 E000 ' + // variationRegions[0], regionAxes[1]
                'C000 C000 E000 ' + // variationRegions[1], regionAxes[0]
                'C000 E000 0000 ';  // variationRegions[1], regionAxes[1]
            const p = new Parser(unhex(data), 0);
            assert.deepEqual(p.parseVariationRegionList(), [
                {
                    regionAxes: [
                        { startCoord: -1.0, peakCoord: -0.5, endCoord: 0.0 },
                        { startCoord: -1.0, peakCoord: -1.0, endCoord: -0.5 }
                    ]
                },
                {
                    regionAxes: [
                        { startCoord: -1.0, peakCoord: -1.0, endCoord: -0.5 },
                        { startCoord: -1.0, peakCoord: -0.5, endCoord: 0.0 }
                    ]
                }
            ]);
            assert.equal(p.relativeOffset, 28);
        });
    });

    describe('parseLongDateTime', function() {
        it('should parse LONGDATETIME values', function() {
            // FIXME: test dates > 2038 once all 64bit are supported
            const date1 = new Date('1904-01-01T00:00:00.000Z').getTime();
            const date2 = new Date('1970-01-01T00:00:00.000Z').getTime();
            const date3 = new Date('2038-12-31T23:59:59.000Z').getTime();
            const hex1 = '00 00 00 00 00 00 00 00';
            const hex2 = '00 00 00 00 7C 25 B0 80';
            const hex3 = '00 00 00 00 FD EE FB 7F';
            const p1 = new Parser(unhex(hex1), 0);
            const p2 = new Parser(unhex(hex2), 0);
            const p3 = new Parser(unhex(hex3), 0);
            assert.equal(new Date(p1.parseLongDateTime() * 1000).getTime(), date1);
            assert.equal(new Date(p2.parseLongDateTime() * 1000).getTime(), date2);
            assert.equal(new Date(p3.parseLongDateTime() * 1000).getTime(), date3);
        });
    });

    describe('font variation data', function() {
        it('should parse packed point numbers', function() {
            let p = new Parser(unhex('00'), 0);
            assert.deepEqual(p.parsePackedPointNumbers(), []);
            p = new Parser(unhex('32 18' + ' 01'.repeat(25) + '18' + ' 05'.repeat(25)), 0);
            assert.deepEqual(p.parsePackedPointNumbers(), [
                1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
                30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150
            ]);
            p = new Parser(unhex(
                '81 22 02 04 01 03 ff' + ' 00 01'.repeat(128) +
                '7f' + ' 01'.repeat(128) +
                '1e' + ' 02'.repeat(31)
            ), 0);
            assert.deepEqual(p.parsePackedPointNumbers(), [
                4, 5, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35,
                36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64,
                65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93,
                94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117,
                118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140,
                141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163,
                164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186,
                187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209,
                210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232,
                233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255,
                256, 257, 258, 259, 260, 261, 262, 263, 264, 266, 268, 270, 272, 274, 276, 278, 280, 282, 284, 286, 288, 290, 292,
                294, 296, 298, 300, 302, 304, 306, 308, 310, 312, 314, 316, 318, 320, 322, 324, 326
            ]);
        });
    });
});
