import assert from 'assert';
import { parse } from '../../src/opentype.js';
import { readFileSync } from 'fs';
const loadSync = (url, opt) => parse(readFileSync(url), opt);

describe('tables/cvar.js', function() {
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
            assert.deepEqual(font.variation.process.getCvarTransform(), font.tables.cvt);
            assert.deepEqual(font.variation.process.getCvarTransform({wght: 142, wdth: 80, opsz: 36}), 
                [760, 10, 714, 0, 714, 10, 536, 10, 0, 0, 0, -10, 0, -10, -250, -10]
                .concat(Array(49).fill(0))
                .concat([80, 129, 84])
                .concat(Array(17).fill(0))
                .concat([38, 0, 61, 0, 0, 0, 0, 0, 33])
                .concat(Array(26).fill(0))
            );
        };

        [1].forEach(n => {
            const font = fonts[`cvarTest${n}`];
            assert.deepEqual(font.tables.cvar.headers.map(h => h.privatePoints),
                Array(11).fill([65,66,67,85,87,93]));
            assert.deepEqual(font.tables.cvar.headers.map(h => h.deltas.length),
            Array(11).fill(120));
        });
        [2].forEach(n => {
            const font = fonts[`cvarTest${n}`];
            assert.deepEqual(font.tables.cvar.sharedPoints, [65, 66, 67, 85, 87, 93]);
            assert.deepEqual(font.tables.cvar.headers.map(h => h.privatePoints),
                Array(11).fill([]));
            assert.deepEqual(font.tables.cvar.headers.map(h => h.deltas.length),
                Array(11).fill(font.tables.cvt.length));
        });
    });
});