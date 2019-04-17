import assert  from 'assert';
import { loadSync } from '../src/opentype';

describe('glyph.js', function() {
    describe('lazy loading', function() {
        let font;
        let glyph;

        before(function() {
            font = loadSync('./fonts/Roboto-Black.ttf');
            glyph = font.charToGlyph('A');
        });

        it('lazily loads xMin', function() {
            assert.equal(glyph.xMin, -3);
        });

        it('lazily loads xMax', function() {
            assert.equal(glyph.xMax, 1399);
        });

        it('lazily loads yMin', function() {
            assert.equal(glyph.yMin, 0);
        });

        it('lazily loads yMax', function() {
            assert.equal(glyph.yMax, 1456);
        });

        it('lazily loads numberOfContours', function() {
            assert.equal(glyph.numberOfContours, 2);
        });
    });

    describe('bounding box', function() {
        let trueTypeFont;
        let openTypeFont;

        before(function() {
            trueTypeFont = loadSync('./fonts/Roboto-Black.ttf');
            openTypeFont = loadSync('./fonts/FiraSansMedium.woff');
        });

        it('calculates a box for a linear shape', function() {
            const glyph = trueTypeFont.charToGlyph('A');
            const box = glyph.getBoundingBox();
            assert.equal(box.x1, -3);
            assert.equal(box.y1, 0);
            assert.equal(box.x2, 1399);
            assert.equal(box.y2, 1456);
        });

        it('calculates a box for a quadratic shape', function() {
            const glyph = trueTypeFont.charToGlyph('Q');
            const box = glyph.getBoundingBox();
            assert.equal(box.x1, 72);
            assert.equal(box.y1, -266);
            assert.equal(box.x2, 1345);
            assert.equal(box.y2, 1476);
        });

        it('calculates a box for a bezier shape', function() {
            const glyph = openTypeFont.charToGlyph('Q');
            const box = glyph.getBoundingBox();
            assert.equal(box.x1, 62);
            assert.equal(box.y1, -103);
            assert.equal(box.x2, 688);
            assert.equal(box.y2, 701);
        });
    });
});

describe('glyph.js on low memory mode', function() {
    let opt = {lowMemory: true};

    describe('lazy loading', function() {
        let font;
        let glyph;

        before(function() {
            font = loadSync('./fonts/Roboto-Black.ttf', opt);
            glyph = font.charToGlyph('A');
        });

        it('lazily loads xMin', function() {
            assert.equal(glyph.xMin, -3);
        });

        it('lazily loads xMax', function() {
            assert.equal(glyph.xMax, 1399);
        });

        it('lazily loads yMin', function() {
            assert.equal(glyph.yMin, 0);
        });

        it('lazily loads yMax', function() {
            assert.equal(glyph.yMax, 1456);
        });

        it('lazily loads numberOfContours', function() {
            assert.equal(glyph.numberOfContours, 2);
        });
    });

    describe('bounding box', function() {
        let trueTypeFont;
        let openTypeFont;

        before(function() {
            trueTypeFont = loadSync('./fonts/Roboto-Black.ttf', opt);
            openTypeFont = loadSync('./fonts/FiraSansMedium.woff', opt);
        });

        it('calculates a box for a linear shape', function() {
            const glyph = trueTypeFont.charToGlyph('A');
            const box = glyph.getBoundingBox();
            assert.equal(box.x1, -3);
            assert.equal(box.y1, 0);
            assert.equal(box.x2, 1399);
            assert.equal(box.y2, 1456);
        });

        it('calculates a box for a quadratic shape', function() {
            const glyph = trueTypeFont.charToGlyph('Q');
            const box = glyph.getBoundingBox();
            assert.equal(box.x1, 72);
            assert.equal(box.y1, -266);
            assert.equal(box.x2, 1345);
            assert.equal(box.y2, 1476);
        });

        it('calculates a box for a bezier shape', function() {
            const glyph = openTypeFont.charToGlyph('Q');
            const box = glyph.getBoundingBox();
            assert.equal(box.x1, 62);
            assert.equal(box.y1, -103);
            assert.equal(box.x2, 688);
            assert.equal(box.y2, 701);
        });
    });
});
