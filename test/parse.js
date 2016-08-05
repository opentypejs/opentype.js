/* jshint mocha: true */

'use strict';

var assert = require('assert');
var testutil = require('./testutil');
var Parser = require('../src/parse').Parser;

describe('parse.js', function() {

    describe('parseUShortList', function() {
        it('can parse an empty list', function() {
            var p = new Parser(testutil.unhex('0000'), 0);
            assert.deepEqual(p.parseUShortList(), []);
        });

        it('can parse a list', function() {
            var p = new Parser(testutil.unhex('0003 1234 DEAD BEEF'), 0);
            assert.deepEqual(p.parseUShortList(), [0x1234, 0xdead, 0xbeef]);
        });

        it('can parse a list of predefined length', function() {
            var p = new Parser(testutil.unhex('1234 DEAD BEEF 5678 9ABC'), 2);
            assert.deepEqual(p.parseUShortList(3), [0xdead, 0xbeef, 0x5678]);
        });
    });

    describe('parseList', function() {
        it('can parse a list of values', function() {
            var data = '0003 12 34 56 78 9A BC';
            var p = new Parser(testutil.unhex(data), 0);
            assert.deepEqual(p.parseList(Parser.uShort), [0x1234, 0x5678, 0x9abc]);
            assert.equal(p.relativeOffset, 8);
        });

        it('can parse a list of values of predefined length', function() {
            var data = '12 34 56 78 9A BC';
            var p = new Parser(testutil.unhex(data), 0);
            assert.deepEqual(p.parseList(3, Parser.uShort), [0x1234, 0x5678, 0x9abc]);
            assert.equal(p.relativeOffset, 6);
        });
    });

    describe('parseRecordList', function() {
        it('can parse a list of records', function() {
            var data = '0002 12 34 56 78 9A BC';
            var p = new Parser(testutil.unhex(data), 0);
            assert.deepEqual(p.parseRecordList({ a: Parser.byte, b: Parser.uShort }), [
                { a: 0x12, b: 0x3456 },
                { a: 0x78, b: 0x9abc }
            ]);
            assert.equal(p.relativeOffset, 8);
        });

        it('can parse an empty list of records', function() {
            var data = '0000';
            var p = new Parser(testutil.unhex(data), 0);
            assert.deepEqual(p.parseRecordList({ a: Parser.byte, b: Parser.uShort }), []);
            assert.equal(p.relativeOffset, 2);
        });

        it('can parse a list of records of predefined length', function() {
            var data = '12 34 56 78 9A BC';
            var p = new Parser(testutil.unhex(data), 0);
            assert.deepEqual(p.parseRecordList(2, { a: Parser.byte, b: Parser.uShort }), [
                { a: 0x12, b: 0x3456 },
                { a: 0x78, b: 0x9abc }
            ]);
            assert.equal(p.relativeOffset, 6);
        });
    });

    describe('parseListOfLists', function() {
        it('can parse a list of lists of 16-bit integers', function() {
            var data = '0003 0008 000E 0016' +      // 3 lists
                '0002 1234 5678' +                  // list 1
                '0003 DEAD BEEF FADE' +             // list 2
                '0001 9876';                        // list 3
            var p = new Parser(testutil.unhex(data), 0);
            assert.deepEqual(p.parseListOfLists(), [
                [0x1234, 0x5678],
                [0xdead, 0xbeef, 0xfade],
                [0x9876]
            ]);
        });

        it('can parse an empty list of lists', function() {
            var p = new Parser(testutil.unhex('0000'), 0);
            assert.deepEqual(p.parseListOfLists(), []);
        });

        it('can parse list of empty lists', function() {
            var p = new Parser(testutil.unhex('0001 0004 0000'), 0);
            assert.deepEqual(p.parseListOfLists(), [[]]);
        });

        it('can parse a list of lists of records', function() {
            var data = '0002 0006 0012' +                   // 2 lists
                '0002 0006 0009 12 34 56 78 9A BC' +        // list 1
                '0001 0004 DE F0 12';                       // list 2

            var p = new Parser(testutil.unhex(data), 0);
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
            var data = '0004 1234' +                // coverageOffset + filler
                '0001 0005 0038 003B 0041 0042 004A';
            var p = new Parser(testutil.unhex(data), 4);
            assert.deepEqual(p.parseCoverage(), {
                format: 1,
                glyphs: [0x38, 0x3b, 0x41, 0x42, 0x4a]
            });
            assert.equal(p.relativeOffset, 14);
        });

        it('should parse a CoverageFormat2 table', function() {
            // https://www.microsoft.com/typography/OTSPEC/chapter2.htm Example 6
            var data = '0004 1234' +                // coverageOffset + filler
                '0002 0001 004E 0057 0000';
            var p = new Parser(testutil.unhex(data), 4);
            assert.deepEqual(p.parseCoverage(), {
                format: 2,
                ranges: [{ start: 0x4e, end: 0x57, index: 0 }]
            });
            assert.equal(p.relativeOffset, 10);
        });
    });

    describe('parseClassDef', function() {
        it('should parse a ClassDefFormat1 table', function() {
            // https://www.microsoft.com/typography/OTSPEC/chapter2.htm Example 7
            var data = '0001 0032 001A' +
                '0000 0001 0000 0001 0000 0001 0002 0001 0000 0002 0001 0001 0000' +
                '0000 0000 0002 0002 0000 0000 0001 0000 0000 0000 0000 0002 0001';
            var p = new Parser(testutil.unhex(data), 0);
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
            // https://www.microsoft.com/typography/OTSPEC/chapter2.htm Example 8
            var data = '0002 0003 0030 0031 0002 0040 0041 0003 00D2 00D3 0001';
            var p = new Parser(testutil.unhex(data), 0);
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
            var data = '0004 1234' +                // coverageOffset + filler
                '0003 68616E69 0014 6B616E61 0018 6C61746E 001C' +  // Example 1
                '0000 0000 0000 0000' +                             // 2 empty Script Tables
                '000A 0001 55524420 0016' +                         // Example 2
                '0000 FFFF 0003 0000 0001 0002' +                   // DefLangSys
                '0000 0003 0003 0000 0001 0002';                    // UrduLangSys
            var p = new Parser(testutil.unhex(data), 0);
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
            var data = '0004 0000' +                                // table offset + filler
                '0003 6C696761 0014 6C696761 001A 6C696761 0022' +  // feature list
                // There is an error in the online example, count is 3 for the 3rd feature.
                '0000 0001 0000   0000 0002 0000 0001   0000 0003 0000 0001 0002';
            var p = new Parser(testutil.unhex(data), 0);
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
            var data = '0004 0000' +                    // table offset + filler
                '0003 0008 0010 0018' +                 // lookup list
                '0004 000C 0001 0018' +                 // FfiFi lookup
                '0004 000C 0001 0028' +                 // FflFlFf lookup
                '0004 000C 0001 0038' +                 // Eszet lookup
                '1234 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000' +
                '5678 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000' +
                '9ABC';
            var lookupTableParsers = [0, 0, 0, 0, Parser.uShort];
            var p = new Parser(testutil.unhex(data), 0);
            assert.deepEqual(p.parseLookupList(lookupTableParsers), [
                { lookupType: 4, lookupFlag: 0x000c, subtables: [0x1234], markFilteringSet: undefined },
                { lookupType: 4, lookupFlag: 0x000c, subtables: [0x5678], markFilteringSet: undefined },
                { lookupType: 4, lookupFlag: 0x000c, subtables: [0x9abc], markFilteringSet: undefined },
            ]);
            assert.equal(p.relativeOffset, 2);
        });
    });
});
