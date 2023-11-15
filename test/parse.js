import assert from 'assert';
import { unhex } from './testutil.js';
import { Parser } from '../src/parse.js';

describe('parse.js', function() {
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
            const data = '0123 4567 891A BCDE FADE C0FF EEEE';
            const p = new Parser(unhex(data), 0);
            assert.deepEqual(p.parseDeltaSets(4, 0x0000), [ 0x01, 0x23, 0x45, 0x67 ]);
            assert.deepEqual(p.parseDeltaSets(3, 0x0001), [ 0x891A, 0xBC, 0xDE ]);
            assert.deepEqual(p.parseDeltaSets(3, 0x0002), [ 0xFADE, 0xC0FF, 0xEE]);
        });

        it('should parse DeltaSets with the LONG_WORDS flag', function() {
            const data = '0123 4567 891A BCDE FADE C0FF EEEE BA5E';
            const p = new Parser(unhex(data), 0);
            assert.deepEqual(p.parseDeltaSets(4, 0x8000), [ 0x0123, 0x4567, 0x891A, 0xBCDE ]);
            assert.deepEqual(p.parseDeltaSets(3, 0x8001), [ 0xFADEC0FF, 0xEEEE, 0xBA5E ]);
            p.relativeOffset = 8;
            assert.deepEqual(p.parseDeltaSets(2, 0x8002), [ 0xFADEC0FF, 0xEEEEBA5E ]);
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
});
