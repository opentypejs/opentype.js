import assert  from 'assert';
import { parse, Glyph, Path } from '../src/opentype.js';
import { readFileSync } from 'fs';
const loadSync = (url, opt) => parse(readFileSync(url), opt);

describe('glyph.js', function() {
    describe('lazy loading', function() {
        let font;
        let glyph;

        before(function() {
            font = loadSync('./test/fonts/Roboto-Black.ttf');
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
            trueTypeFont = loadSync('./test/fonts/Roboto-Black.ttf');
            openTypeFont = loadSync('./test/fonts/FiraSansMedium.woff');
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

    describe('new Glyph', function() {
        let glyph = new Glyph({
            name: 'Test Glyph',
            unicode: 65,
            unicodes: [65, 66],
            path: new Path(),
            advanceWidth: 400,
            leftSideBearing: -100
        });

        it('verifies that the options have all been set', function() {
            assert.equal(glyph.name, 'Test Glyph');
            assert.equal(glyph.unicode, 65);
            assert.equal(glyph.advanceWidth, 400);
            assert.equal(glyph.leftSideBearing, -100);
            assert.deepEqual(glyph.unicodes, [65, 66]);
        });
    });

    describe('SVG handling', function() {
        it('should flip the path Y coordinates when generating or parsing SVG paths', function() {
            const font = loadSync('./test/fonts/FiraSansMedium.woff');
            const glyph = font.charToGlyph('j');
            const svgPath = glyph.toPathData();
            const svgMarkup = glyph.toSVG();
            const expectedPath = 'M25 772C130 725 185 680 185 528L185 33L93 33L93 534C93 647 60 673-9 705ZM204-150' +
                'C204-185 177-212 139-212C101-212 75-185 75-150C75-114 101-87 139-87C177-87 204-114 204-150Z';
            assert.equal(
                svgPath,
                expectedPath
            );
            assert.equal(
                svgMarkup,
                '<path d="' + expectedPath + '"/>'
            );
            // we can't test toDOMElement() in node context!

            const trianglePathUp = 'M318 230L182 230L250 93Z';
            const trianglePathDown = 'M318 320L182 320L250 457Z';
            const flipOption = {
                minY: font.ascender,
                maxY: font.ascender,
                flipY: true,
                flipYBase: font.ascender + font.descender
            };
            glyph.fromSVG(trianglePathUp, flipOption);
            assert.equal(glyph.path.toPathData({flipY: false}), trianglePathDown);
            assert.equal(glyph.toPathData(flipOption), trianglePathUp);
        });

        it('should not throw an error during optimization for paths with few points', function() {
            const textToRender = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ffffiThe king said: เป็นคนใจดีสำหรับทุกคน because ความรักคือทุกสิ่งThe king said: ائتوني به أستخلصه لنفسيBe kind, هناش الإ ءيش نم عزن الو ، هناز الإ ءيش يف قفرلا ناك امفลลฤๅ';
            assert.doesNotThrow(function() {
                const font = loadSync('./test/fonts/Jomhuria-Regular.ttf');
                const glyphs = font.stringToGlyphs(textToRender);
                for (let i = 0; i < glyphs.length; i++) {
                    const glyph = glyphs[i];
                    glyph.path.toSVG();
                }
            });
        });
    });

    describe('component transformation', function() {
        // @TODO test components more thoroughly,
        // maybe move to a separate glyf test file
        
        const changaVarFont = loadSync('./test/fonts/Changa-VariableFont_wght.ttf');

        it('handles 2x2 transform correctly',function() {
            const glyph = changaVarFont.charToGlyph('+');
            assert.deepEqual(glyph.toPathData(), 'M91 284L440 284L440 342L91 342ZM236 487L236 138L294 138L294 487Z');
        });
    });
});

describe('glyph.js on low memory mode', function() {
    let opt = {lowMemory: true};

    describe('lazy loading', function() {
        let font;
        let glyph;

        before(function() {
            font = loadSync('./test/fonts/Roboto-Black.ttf', opt);
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
            trueTypeFont = loadSync('./test/fonts/Roboto-Black.ttf', opt);
            openTypeFont = loadSync('./test/fonts/FiraSansMedium.woff', opt);
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
