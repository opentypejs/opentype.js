import assert from 'assert';
import { parse } from '../../dist/opentype.mjs';
import { readFileSync } from 'fs';
const loadSync = (url, opt) => parse(readFileSync(url), opt);

describe('tables/os2.mjs', function () {
    const font = loadSync('./test/fonts/AbrilFatface-Regular.otf');
    const testData = {
        achVendID: 'TT\x00\x00',
        usWeightClass: 400,
        bFamilyType: 2,
        bSerifStyle: 0,
        bWeight: 5,
        bProportion: 3,
        bContrast: 0,
        bStrokeVariation: 0,
        bArmStyle: 0,
        bLetterform: 2,
        bMidline: 0,
        bXHeight: 3,
    };
    it('can read some OS2 table entries from file', function () {
        for (const k in testData) {
            assert.equal(font.tables.os2[k], testData[k]);
        }
    });
    const font2 = parse(font.toArrayBuffer());
    it('can write some OS2 table entries', function () {
        for (const k in testData) {
            assert.equal(font2.tables.os2[k], testData[k]);
        }
    });
});
