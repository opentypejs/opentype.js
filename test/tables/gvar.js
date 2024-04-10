import assert from 'assert';
import { hex, unhex } from '../testutil.js';
import { parse } from '../../src/opentype.js';
import { readFileSync } from 'fs';
const loadSync = (url, opt) => parse(readFileSync(url), opt);

describe('tables/gvar.js', function() {
    const fonts = {
        gvarTest1: loadSync('./test/fonts/TestGVAROne.ttf'),
        gvarTest2: loadSync('./test/fonts/TestGVARTwo.ttf'),
        gvarTest3: loadSync('./test/fonts/TestGVARThree.ttf'),
        gvarTest4: loadSync('./test/fonts/TestGVARFour.ttf'),
        // Licensing for TestGVAREight and TestGVARNine is not clear,
        // so we can't include them
        // gvarTest8: loadSync('./test/fonts/TestGVAREight.ttf'),
        // gvarTest9: loadSync('./test/fonts/TestGVARNine.ttf'),
        gvarTestComp: loadSync('./test/fonts/TestGVAR-Composite-0.ttf'),
        gvarTestCompMissing: loadSync('./test/fonts/TestGVAR-Composite-Missing.ttf'),
    };
    it('correctly parses the glyph variations table', function() {
        // tests for all fonts
        for(const fontName in fonts) {
            const font = fonts[fontName];
            assert.deepEqual(font.tables.gvar.version, [1,0]);
            assert.equal(font.tables.gvar.sharedTuples.find(t => t.length !== font.tables.fvar.axes.length), undefined);
            assert.deepEqual(Object.keys(font.tables.gvar.glyphVariations), Object.keys(font.glyphs.glyphs));
        };
        
        [1,2,3].forEach(n => {
            const font = fonts[`gvarTest${n}`];
            assert.deepEqual(font.tables.gvar.sharedTuples, [[-1],[1]]);
            assert.deepEqual(font.tables.gvar.glyphVariations[0].headers[0].deltas,
                [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                    0,0,0,0,1,1,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,
                    0,0,0,0,0,0,0,0,0,0,0,0,0]);
            assert.deepEqual(font.tables.gvar.glyphVariations[0].headers[0].deltasY,
                [-1,0,0,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,0,0,-1,-1,0,0,-1,-1,0,0,0,
                    0,0,0,0,0,0,0,0,0,-1,-1,0,0,0,0,0,0,0,0,0,0,0,0,-1,-1,0,0,0,0,
                    0,0,0,0,0,0,0,0,-1,-1,0,0,-1,-1,-1,-1,-1,-1,0,0,0,0,0]);
            assert.deepEqual(font.tables.gvar.glyphVariations[0].headers[1].deltas,
                [-2,-2,-10,-10,-4,-8,-8,-4,-5,-5,-7,-7,-4,-8,-8,-5,-5,-6,-6,-7,-7,
                    -5,-5,-4,-4,-8,-8,-7,-7,-4,-4,-6,-6,-8,-8,-4,-4,-5,-5,-4,-5,
                    -5,-5,-5,-4,-8,-8,-6,-6,-4,-4,-8,-8,-6,-6,-8,-8,-4,-4,-5,-5,
                    -4,-4,-8,-8,-5,-7,-8,-8,-4,-4,-6,-4,0,-12,0,0]);
            assert.deepEqual(font.tables.gvar.glyphVariations[0].headers[1].deltasY,
                [23,0,0,23,18,18,16,16,17,17,17,17,14,14,12,12,13,13,13,13,13,13,12,
                    12,11,11,9,9,10,10,10,10,8,8,7,7,8,8,9,9,6,5,5,6,7,7,6,6,4,4,4,
                    4,3,3,2,2,2,2,2,2,3,3,21,21,21,21,19,19,18,18,19,19,21,0,0,0,0]);

            assert.deepEqual(font.tables.gvar.glyphVariations[13].headers[0].deltas,
                [0,12,0,15,15,4,4,15,15,-12,-12,-7,-7,-12,-12,-12,-12,-4,13,-12,-12,
                    15,15,24,-12,0,23,23,26,8,-8,3,0,-3,12,0,-3,-12,12,25,11,-8,-7,
                    -12,-23,-23,-23,-23,-9,-20,-4,4,-4,-1,-8,16,19,20,0,-2,0,1,8,16,
                    17,12,11,-13,-13,13,13,7,7,-20,-20,8,8,-16,-16,0,-14,-19,-20,-24,
                    -4,-5,-4,-23,-22,-28,-24,-4,-13,-13,13,13,16,16,-8,-8,20,20,-8,
                    -8,-13,-13,13,13,8,8,-16,-16,16,16,-8,-8,0,0,0,0]);
            assert.deepEqual(font.tables.gvar.glyphVariations[13].headers[0].deltasY,
                [0,-23,-32,4,8,8,-27,-27,-8,-8,-27,-27,8,8,-4,-13,-24,4,1,35,-12,-12,
                    35,19,-12,-47,-26,-8,-6,8,-16,-26,-27,-36,20,20,-5,0,-31,-15,-3,
                    0,-6,-16,-16,20,-8,-12,-27,-24,4,3,16,0,-12,-19,-32,-4,0,-10,-4,
                    -3,-12,8,9,20,4,-8,-43,-43,-8,-12,-28,-28,-12,-35,-2,-2,-35,-12,
                    6,8,5,4,-7,-8,-8,-4,-3,-12,-14,-32,-3,-39,-39,-3,-35,-2,-2,-35,
                    -12,-28,-28,-12,8,-28,-28,8,-18,-8,-8,-18,-18,-8,-8,-18,0,0,0,0]);
            assert.deepEqual(font.tables.gvar.glyphVariations[13].headers[1].deltas,
                [16,8,-14,-20,-20,0,0,-20,-20,20,20,4,4,20,20,11,-4,0,21,20,20,-20,
                    -20,-8,19,0,-6,-16,-6,0,28,16,4,-19,-31,16,29,27,4,-4,-15,24,30,
                    35,0,0,26,39,13,-4,-28,-5,8,8,27,8,-2,-15,16,12,20,7,11,9,10,12,
                    17,35,35,-35,-35,-12,-12,35,35,0,0,15,15,-16,-7,0,0,11,-4,-10,
                    -20,4,7,11,6,0,35,35,-35,-35,-16,-16,-1,-1,-35,-35,12,12,35,35,
                    -35,-35,-35,-35,15,15,-16,-16,34,34,0,0,0,0]);
            assert.deepEqual(font.tables.gvar.glyphVariations[13].headers[1].deltasY,
                [-35,16,11,5,-31,-31,12,12,0,0,12,12,-31,-31,-16,-4,11,-35,-50,-47,
                    -27,-27,-43,-37,-23,0,1,-19,-21,-23,0,7,12,-24,-42,-42,-10,-11,
                    12,14,-15,-20,-12,0,0,-42,-28,-19,-7,4,-31,-42,-47,-37,-23,-16,
                    -12,-23,-24,-39,-24,-7,-5,-32,-42,-47,-40,-35,28,28,-35,-19,35,
                    35,-19,-8,-1,-1,-8,-24,-32,-43,-43,-19,-22,-7,-23,-24,-21,-16,
                    -7,0,-43,23,23,-43,-8,-1,-1,-8,-19,35,35,-19,-31,35,35,-31,5,0,
                    0,5,5,0,0,5,0,0,0,0]);
        });
        
        [1,3].forEach(n => {
            const font = fonts[`gvarTest${n}`];
            assert.deepEqual(font.tables.gvar.glyphVariations[0].sharedPoints, []);
        });
        
        [2].forEach(n => {
            const font = fonts[`gvarTest${n}`];
            assert.deepEqual(font.tables.gvar.glyphVariations[0].sharedPoints, [
                0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
                21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
                41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60,
                61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76
            ]);
        });

        [4].forEach(n => {
            const font = fonts[`gvarTest${n}`];
            assert.deepEqual(font.tables.gvar.sharedTuples, [
                [ 1, -0.63201904296875 ], [ 1, -1 ], [ 1, 0 ], [ 0, -0.63201904296875 ], [ 0,-1 ]
            ]);
        });
        
        ['Comp','CompMissing'].forEach(n => {
            const font = fonts[`gvarTest${n}`];
            assert.deepEqual(font.tables.gvar.sharedTuples, [[-1]]);
        });

    });
});