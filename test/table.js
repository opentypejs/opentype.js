import assert from 'assert';
import { unhexArray } from './testutil.js';
import table from '../src/table.js';

describe('table.js', function() {
    it('should make a ScriptList table', function() {
        // https://www.microsoft.com/typography/OTSPEC/chapter2.htm Examples 1 & 2
        const expectedData = unhexArray(
            '0003 68616E69 0014 6B616E61 0020 6C61746E 002E' +  // Example 1 (hani, kana, latn)
            '0004 0000 0000 FFFF 0001 0003' +                   // hani lang sys
            '0004 0000 0000 FFFF 0002 0003 0004' +              // kana lang sys
            '000A 0001 55524420 0016' +                         // Example 2 for latn
            '0000 FFFF 0003 0000 0001 0002' +                   // DefLangSys
            '0000 0003 0003 0000 0001 0002'                     // UrduLangSys
        );

        assert.deepEqual(new table.ScriptList([
            { tag: 'hani', script: {
                defaultLangSys: {
                    reserved: 0,
                    reqFeatureIndex: 0xffff,
                    featureIndexes: [3]
                },
                langSysRecords: [] } },
            { tag: 'kana', script: {
                defaultLangSys: {
                    reserved: 0,
                    reqFeatureIndex: 0xffff,
                    featureIndexes: [3, 4]
                },
                langSysRecords: [] } },
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
        ]).encode(), expectedData);
    });

    it('should make a ClassDefFormat1 table', function() {
        // https://docs.microsoft.com/en-us/typography/opentype/spec/chapter2#example-7-classdefformat1-table-class-array
        const expectedData = unhexArray(
            '0001 0032 001A' +
            '0000 0001 0000 0001 0000 0001 0002 0001 0000 0002 0001 0001 0000' +
            '0000 0000 0002 0002 0000 0000 0001 0000 0000 0000 0000 0002 0001'
        );
        assert.deepEqual(new table.ClassDef({
            format: 1,
            startGlyph: 0x32,
            classes: [
                0, 1, 0, 1, 0, 1, 2, 1, 0, 2, 1, 1, 0,
                0, 0, 2, 2, 0, 0, 1, 0, 0, 0, 0, 2, 1
            ]
        }).encode(), expectedData);
    });

    it('should make a ClassDefFormat2 table', function() {
        // https://docs.microsoft.com/en-us/typography/opentype/spec/chapter2#example-8-classdefformat2-table-class-ranges
        const expectedData = unhexArray(
            '0002 0003 0030 0031 0002 0040 0041 0003 00D2 00D3 0001'
        );

        assert.deepEqual(new table.ClassDef({
            format: 2,
            ranges: [
                { start: 0x30, end: 0x31, classId: 2 },
                { start: 0x40, end: 0x41, classId: 3 },
                { start: 0xd2, end: 0xd3, classId: 1 }
            ]
        }).encode(), expectedData);
    });
});
