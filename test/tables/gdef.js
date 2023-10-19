import assert from 'assert';
import { unhex } from '../testutil.js';
import gdef from '../../src/tables/gdef.js';

describe('tables/gdef.js', function() {
    const data =
        ' 00 01 00 00 00 0c 00 40 00 78 00 d0 00 02 00 08' +
        ' 00 65 00 65 00 03 00 f2 00 f2 00 01 02 08 02 08' +
        ' 00 01 02 0a 02 0a 00 01 02 1b 02 1b 00 01 02 22' +
        ' 02 22 00 01 03 f3 03 f4 00 02 04 14 04 14 00 03' +
        ' 00 0e 00 05 00 18 00 30 00 20 00 28 00 30 00 02' +
        ' 00 01 00 0f 00 13 00 00 00 03 00 0b 00 0d 00 0e' +
        ' 00 03 00 27 00 28 00 29 00 03 00 04 00 0d 00 0e' +
        ' 00 03 00 18 00 19 00 1a 00 0e 00 05 00 1c 00 24' +
        ' 00 32 00 36 00 44 00 01 00 05 03 ec 03 ed 03 ef' +
        ' 03 f0 03 f1 00 01 00 04 00 01 08 43 00 02 00 06' +
        ' 00 0a 00 01 05 82 00 01 0b 04 00 01 00 1e 00 02' +
        ' 00 06 00 0a 00 01 06 00 00 01 0c 00 00 03 00 08' +
        ' 00 0c 00 10 00 01 04 80 00 01 09 00 00 01 0d 80' +
        ' 00 02 00 05 00 2b 00 2b 00 01 00 2e 00 2e 00 02' +
        ' 00 4a 00 4a 00 04 00 65 00 65 00 01 00 7e 00 7e' +
        ' 00 02';

    const table = {
        version: 1,
        attachList: {
            attachPoints: [
                [11, 13, 14],
                [24, 25, 26],
                [39, 40, 41],
                [4, 13, 14],
                [24, 25, 26]
            ],
            coverage: {
                format: 2,
                ranges: [
                  { end: 19, index: 0, start: 15 }
                ]
            }
        },
        classDef: {
            format: 2,
            ranges: [
                { classId: 3, start: 101, end: 101 },
                { classId: 1, start: 242, end: 242 },
                { classId: 1, start: 520, end: 520 },
                { classId: 1, start: 522, end: 522 },
                { classId: 1, start: 539, end: 539 },
                { classId: 1, start: 546, end: 546 },
                { classId: 2, start: 1011, end: 1012 },
                { classId: 3, start: 1044, end: 1044 }

            ]
        },
        ligCaretList: {
            coverage: {format: 1, glyphs: [1004, 1005, 1007, 1008, 1009]},
            ligGlyphs: [
                  [{coordinate: 2115}],
                  [{coordinate: 1410}, {coordinate: 2820}],
                  [{coordinate: 2304}],
                  [{coordinate: 1536}, {coordinate: 3072}],
                  [{coordinate: 1152}, {coordinate: 2304}, {coordinate: 3456}]
            ]
        },
        markAttachClassDef: {
            format: 2,
            ranges: [
              {classId: 1, start: 43, end: 43},
              {classId: 2, start: 46, end: 46},
              {classId: 4, start: 74, end: 74},
              {classId: 1, start: 101, end: 101},
              {classId: 2, start: 126, end: 126}
           ]
        },
    };

    it('can parse a GDEF table', function() {
        assert.deepEqual(table, gdef.parse(unhex(data)));
    });
});
