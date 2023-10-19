import assert from 'assert';
import { Font, Path, Glyph, parse, load} from '../../src/opentype.js';
import { readFileSync } from 'fs';
const loadSync = (url, opt) => parse(readFileSync(url), opt);

describe('tables/gasp.js', function () {
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

});
