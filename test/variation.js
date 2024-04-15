import assert from 'assert';
import { parse } from '../src/opentype.js';
import { readFileSync } from 'fs';
import exp from 'constants';
const loadSync = (url, opt) => parse(readFileSync(url), opt);

describe('variation.js', function() {
    const fonts = {
        avar: loadSync('./test/fonts/TestAVAR.ttf'),
        hvar: loadSync('./test/fonts/TestHVAROne.otf'),
        hvar2: loadSync('./test/fonts/TestHVARTwo.ttf'),
        zycon: loadSync('./test/fonts/Zycon.ttf'),
        cvar1: loadSync('./test/fonts/TestCVARGVAROne.ttf'),
        cvar2: loadSync('./test/fonts/TestCVARGVARTwo.ttf'),
    };

    it('pads axis tags with spaces for lookup', function() {
        const font = fonts.zycon;
        const untransformedPoints = [
            2026, 1022, 2026, 606, 1437, 17, 1021, 17, 605, 17, 16, 606, 16, 1022, 16, 1438, 605, 2027,
            1021, 2027, 1437, 2027, 2026, 1438, 1976, 1022, 1976, 1418, 1417, 1980, 1021, 1980, 625,
            1980, 66, 1417, 66, 1021, 66, 625, 625, 64, 1021, 64, 1417, 64, 1976, 626, 1586, 1441,
            1378, 1482, 1178, 1418, 1297, 1371, 1297, 1371, 1274, 1334, 1274, 1317, 1274, 1274, 1343,
            1214, 1386, 1214, 1434, 1214, 1494, 1279, 1494, 1326, 1494, 1351, 1474, 1393, 1474, 1393,
            881, 1416, 681, 1485, 484, 1441, 587, 1394, 587, 1394, 562, 1331, 562, 1315, 562, 1265, 635,
            1209, 681, 1209, 718, 1209, 785, 1265, 785, 1304, 785, 1317, 770, 1371, 770, 1371, 1245, 868,
            1245, 868, 1213, 941, 1186, 954, 1159, 967, 1086, 947, 1086, 947, 1027, 1380, 965, 950, 965,
            950, 881, 969, 853, 955, 825, 941, 794, 861, 794, 861, 919, 888, 919, 888, 997, 839, 1033, 839,
            1068, 839, 1142, 885, 1142, 885, 1346, 607, 1294, 577, 1100, 544, 1022, 544, 912, 544, 728, 599,
            698, 614, 727, 529, 914, 422, 1025, 422, 1133, 422, 1321, 546
        ];
        const transformedPoints = untransformedPoints.slice(0, 32)
            .concat([1005, 1980, 983, 1417, 983, 1021, 983, 625, 1005, 64])
            .concat(untransformedPoints.slice(42));
        assert.deepEqual(font.variation.getTransform(15).points.map(p => [p.x, p.y]).flat(), untransformedPoints);
        assert.deepEqual(font.variation.getTransform(15, {M1: 0.48}).points.map(p => [p.x, p.y]).flat(), transformedPoints);
        
        font.variation.set({M1: -0.42});
        assert.deepEqual(font.variation.get(), {
            'M1  ': -0.42,
            'M2  ': 0,
            'T1  ': 0,
            'T2  ': 0,
            'T3  ': 0,
            'T4  ': 0,
        });
    });

    describe('avar', function() {
        it('applies variation limits', function() {
            const font = fonts.avar;
            const expectedFactors = [
                [ -0.9999999999999996 ],
                [ -0.6666666666666665 ],
                [ -0.33333333333333315 ]
            ].concat(Array(9).fill([ 4.440892098500624e-16 ]))
            .concat([
                [ 0.20000000000000032 ],
                [ 0.4000000000000002 ],
                [ 0.6000000000000003 ],
                [ 0.8000000000000002 ],
                [ 1 ]
            ]);
            assert.deepEqual(
                [100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900].map((v) => {
                    font.variation.set({TEST:v});
                    return font.variation.process.getNormalizedCoords();
                }),
                expectedFactors
            );
        });
    });
    
    describe('cvar', function() {
        it('handles cvar data correctly', function() {
            
            ['cvar1','cvar2'].forEach((f) => {
                let font = fonts[f];
                let glyphPos = [];
                assert.equal(
                    font.forEachGlyph('hon', 0, 0, font.unitsPerEm, {}, function(glyph, gX, gY, gFontSize) {
                        glyphPos.push({w: glyph.advanceWidth, lsb: glyph.leftSideBearing, gX, count: glyph.path.commands.length});
                    }),
                    1857
                );
                assert.deepEqual(glyphPos, [
                    {count: 53, w: 635, lsb: 18, gX: 0},
                    {count: 32, w: 577, lsb: 55, gX: 635},
                    {count: 49, w: 645, lsb: 28, gX: 1212},
                ]);
                glyphPos = [];
                font.variation.set({wght: 1000})
                assert.equal(
                    font.forEachGlyph('hon', 0, 0, font.unitsPerEm, {}, function(glyph, gX, gY, gFontSize) {
                        glyphPos.push({w: glyph.advanceWidth, lsb: glyph.leftSideBearing, gX, count: glyph.path.commands.length});
                    }),
                    1857
                );
                assert.deepEqual(glyphPos, [
                    {count: 53, w: 635, lsb: 18, gX: 0},
                    {count: 32, w: 577, lsb: 55, gX: 635},
                    {count: 49, w: 645, lsb: 28, gX: 1212},
                ]);

                font = fonts.hvar2;
                glyphPos = [];
                assert.equal(
                    font.forEachGlyph('AB', 0, 0, font.unitsPerEm, {}, function(glyph, gX, gY, gFontSize) {
                        glyphPos.push({w: glyph.advanceWidth, lsb: glyph.leftSideBearing, gX});
                    }),
                    900
                );
                assert.deepEqual(glyphPos, [
                    {w: 450, lsb: 0, gX: 0},
                    {w: 450, lsb: 0, gX: 450},
                ]);
                glyphPos = [];
                font.variation.set({wght: 1000})
                assert.equal(
                    font.forEachGlyph('AB', 0, 0, font.unitsPerEm, {}, function(glyph, gX, gY, gFontSize) {
                        glyphPos.push({w: glyph.advanceWidth, lsb: glyph.leftSideBearing, gX});
                    }),
                    900
                );
                assert.deepEqual(glyphPos, [
                    {w: 450, lsb: 0, gX: 0},
                    {w: 450, lsb: 0, gX: 450},
                ]);
            });
        });
    });
    
    describe('hvar', function() {
        it('transforms advanceWidth', function() {
            let font = fonts.hvar;
            let glyphPos = [];
            assert.equal(
                font.forEachGlyph('ABC', 0, 0, font.unitsPerEm, {}, function(glyph, gX, gY, gFontSize) {
                    glyphPos.push({w: glyph.advanceWidth, lsb: glyph.leftSideBearing, gX});
                }),
                1656
            );
            assert.deepEqual(glyphPos, [
                {w: 520, lsb: 10, gX: 0},
                {w: 574, lsb: 100, gX: 520},
                {w: 562, lsb: 56, gX: 1094},
            ]);
            glyphPos = [];
            font.variation.set({wght: 1000})
            assert.equal(
                font.forEachGlyph('ABC', 0, 0, font.unitsPerEm, {}, function(glyph, gX, gY, gFontSize) {
                    glyphPos.push({w: glyph.advanceWidth, lsb: glyph.leftSideBearing, gX});
                }),
                1656
            );
            assert.deepEqual(glyphPos, [
                {w: 520, lsb: 10, gX: 0},
                {w: 574, lsb: 100, gX: 520},
                {w: 562, lsb: 56, gX: 1094},
            ]);

            font = fonts.hvar2;
            glyphPos = [];
            assert.equal(
                font.forEachGlyph('AB', 0, 0, font.unitsPerEm, {}, function(glyph, gX, gY, gFontSize) {
                    glyphPos.push({w: glyph.advanceWidth, lsb: glyph.leftSideBearing, gX});
                }),
                900
            );
            assert.deepEqual(glyphPos, [
                {w: 450, lsb: 0, gX: 0},
                {w: 450, lsb: 0, gX: 450},
            ]);
            glyphPos = [];
            font.variation.set({wght: 1000})
            assert.equal(
                font.forEachGlyph('AB', 0, 0, font.unitsPerEm, {}, function(glyph, gX, gY, gFontSize) {
                    glyphPos.push({w: glyph.advanceWidth, lsb: glyph.leftSideBearing, gX});
                }),
                900
            );
            assert.deepEqual(glyphPos, [
                {w: 450, lsb: 0, gX: 0},
                {w: 450, lsb: 0, gX: 450},
            ]);
        });
    });

});