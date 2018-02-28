import assert from 'assert';
import { unhex } from '../testutil';
import gpos from '../../src/tables/gpos';

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

describe('tables/gpos.js', function() {
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
});
