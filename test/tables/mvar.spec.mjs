import assert from 'assert';
import { unhex } from '../testutil.mjs';
import mvar from '../../src/tables/mvar.mjs';

// Minimal MVAR table with two value records (cpht and xhgt) and one ItemVariationStore
// subtable covering one variation region (wght axis, peak = 1.0).
//
// Layout (offsets from MVAR start):
//   0x00  majorVersion=1, minorVersion=0
//   0x04  reserved=0, valueRecordSize=8
//   0x08  valueRecordCount=2, varStoreOffset=0x001C (28)
//   0x0C  record[0]: tag="cpht", outer=0, inner=0
//   0x14  record[1]: tag="xhgt", outer=0, inner=1
//   0x1C  ItemVariationStore:
//     +0   format=1
//     +2   variationRegionListOffset=12 (-> +0x0C)
//     +6   itemVariationDataCount=1, dataOffsets[0]=22 (-> +0x16)
//     +0C  VariationRegionList: axisCount=1, regionCount=1, [start=0, peak=1.0, end=1.0]
//     +16  IVD[0]: itemCount=2, wordDeltaCount=1, regionIndexCount=1,
//                  regionIndices=[0], deltas=[50, 20]
const MVAR_HEX =
    '0001 0000' +       // version 1.0
    '0000' +             // reserved
    '0008' +             // valueRecordSize
    '0002' +             // valueRecordCount
    '001C' +             // varStoreOffset = 28
    '63706874' +         // "cpht"
    '0000 0000' +        // outer=0, inner=0
    '78686774' +         // "xhgt"
    '0000 0001' +        // outer=0, inner=1
    // ItemVariationStore
    '0001' +             // format
    '0000000C' +         // variationRegionListOffset = 12
    '0001' +             // itemVariationDataCount
    '00000016' +         // itemVariationDataOffsets[0] = 22
    // VariationRegionList
    '0001' +             // axisCount
    '0001' +             // regionCount
    '0000 4000 4000' +   // region[0]: start=0, peak=1.0, end=1.0 (F2Dot14)
    // IVD[0]
    '0002' +             // itemCount
    '0001' +             // wordDeltaCount (1 int16 delta per item)
    '0001' +             // regionIndexCount
    '0000' +             // regionIndices[0] = 0
    '0032' +             // delta[0] = 50  (cpht, inner=0)
    '0014';              // delta[1] = 20  (xhgt, inner=1)

describe('tables/mvar.mjs', function() {
    describe('parse', function() {
        let table;
        before(function() {
            table = mvar.parse(unhex(MVAR_HEX));
        });

        it('parses value records by tag', function() {
            assert.deepEqual(table.valueRecords['cpht'], { outer: 0, inner: 0 });
            assert.deepEqual(table.valueRecords['xhgt'], { outer: 0, inner: 1 });
        });

        it('parses the ItemVariationStore with one subtable', function() {
            assert.equal(table.itemVariationStore.itemVariationSubtables.length, 1);
        });

        it('parses the IVD deltaSets correctly', function() {
            const ivd = table.itemVariationStore.itemVariationSubtables[0];
            assert.equal(ivd.deltaSets[0][0], 50);  // cpht delta
            assert.equal(ivd.deltaSets[1][0], 20);  // xhgt delta
        });

        it('parses the VariationRegionList', function() {
            const regions = table.itemVariationStore.variationRegions;
            assert.equal(regions.length, 1);
            assert.equal(regions[0].regionAxes[0].peakCoord, 1.0);
        });
    });

});
