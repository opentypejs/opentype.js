import assert from 'assert';
import { parse } from '../../src/opentype.mjs';
import { readFileSync } from 'fs';
const loadSync = (url, opt) => parse(readFileSync(url), opt);

describe('tables/gasp.mjs', function () {
    const font = loadSync('./test/fonts/Roboto-Black.ttf');

    it('can parse gasp table version', function() {
        assert.equal(font.tables.gasp.version, 1);
    });
    it('can parse gasp table numRanges', function() {
        assert.equal(font.tables.gasp.numRanges, 2);
    });

    it('can parse gasp table numRanges 0 rangeMaxPPEM', function() {
        assert.equal(font.tables.gasp.gaspRanges[0].rangeMaxPPEM, 8); // default value
    });
    
    it('can parse gasp table numRanges 0 rangeGaspBehavior', function() {
        assert.equal(font.tables.gasp.gaspRanges[0].rangeGaspBehavior, 0x0002); //GASP_DOGRAY = 0x0002
    });
    
    it('can parse gasp table numRanges 1 rangeMaxPPEM', function() {
        assert.equal(font.tables.gasp.gaspRanges[1].rangeMaxPPEM, 0xFFFF); // default value
    });
    
    it('can parse gasp table numRanges 1 rangeGaspBehavior', function() {
        assert.equal(font.tables.gasp.gaspRanges[1].rangeGaspBehavior, 0x0001 + 0x0002 + 0x0004 + 0x0008); // all flags set = 15
    });

    it('can write tables that are read as identical to the original', function() {
        const font2 = parse(font.toArrayBuffer());
        assert.deepStrictEqual(font.tables.gasp, font2.tables.gasp);
    });

});
