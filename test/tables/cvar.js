import assert from 'assert';
import { hex, unhex } from '../testutil.js';
import { parse } from '../../src/opentype.js';
import { readFileSync } from 'fs';
const loadSync = (url, opt) => parse(readFileSync(url), opt);

describe('tables/gvar.js', function() {
    const fonts = {
        cvarTest1: loadSync('./test/fonts/TestCVARGVAROne.ttf'),
        cvarTest2: loadSync('./test/fonts/TestCVARGVARTwo.ttf'),
    };
    it('correctly parses the tuple variation store', function() {
        // tests for all fonts
        for(const fontName in fonts) {
            const font = fonts[fontName];
            assert.deepEqual(font.tables.cvar.version, [1,0]);
            assert.equal(font.tables.cvar.headers.length, 11);
            assert.equal(font.tables.cvar.headers[0].peakTuple.length, font.tables.fvar.axes.length);
        };
    });

    
    [1].forEach(n => {
        const font = fonts[`cvarTest${n}`];
        assert.deepEqual(font.tables.cvar.headers[10].flags,
            {embeddedPeakTuple: true, intermediateRegion: false, privatePointNumbers: true});
        assert.deepEqual(font.tables.cvar.headers.map(h => h.privatePoints),
            Array(11).fill([65,66,67,85,87,93]));
        assert.deepEqual(font.tables.cvar.headers.map(h => h.deltas),
        [
            [8,-8,8,-11,0,-1], [-2,8,-7,11,0,1], [56,-24,42,6,-10,-4],
            [-44,-66,-39,-28,-39,-22], [22,100,36,19,36,19], [8,0,8,-43,-49,-32],
            [-8,0,-8,11,9,1], [-80,0,-90,-6,-47,4], [-16,0,-21,28,39,22],
            [-46,0,-22,-19,35,-19], [2,0,7,-11,-9,-1]
        ]);
    });
    [2].forEach(n => {
        const font = fonts[`cvarTest${n}`];
        assert.deepEqual(font.tables.cvar.headers[10].flags,
            {embeddedPeakTuple: true, intermediateRegion: false, privatePointNumbers: false});
        assert.deepEqual(font.tables.cvar.headers.map(h => h.deltas.length),
            Array(11).fill(font.tables.cvt.length));
    });
});