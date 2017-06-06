import assert from 'assert';
import { unhexArray } from './testutil';
import table from '../src/table';

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
});
