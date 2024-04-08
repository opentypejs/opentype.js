import assert  from 'assert';
import { parse, Glyph, Path } from '../src/opentype.js';
import { readFileSync } from 'fs';
import util from './testutil.js';
const loadSync = (url, opt) => parse(readFileSync(url), opt);

const emojiFont = loadSync('./test/fonts/OpenMojiCOLRv0-subset.otf');

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

        it('lazily loads COLR layers on paths', function() {
            const layers = emojiFont.glyphs.get(138).getLayers(emojiFont);
            assert.equal(Array.isArray(layers), true);
            assert.equal(layers.length, 4);
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
            // @TODO: we'll be able to by leveraging the new mock functionality in testutil.js

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

    describe('color glyph drawing/rendering', function() {
        it('draws and renders layers correctly', function() {
            let contextLogs = [];
            const ctx = util.createMockObject(contextLogs, undefined/*, { consoleLog: 'ctx' }*/);
            emojiFont.glyphs.get(138).draw(ctx, 0, 0, 12, {}, emojiFont);
            const expectedProps = [
                'beginPath', 'moveTo', 'lineTo', 'lineTo', 'lineTo', 'lineTo', 'fillStyle', 'fill',
                'beginPath', 'moveTo', 'lineTo', 'lineTo', 'lineTo', 'lineTo', 'fillStyle', 'fill',
                'beginPath', 'moveTo', 'lineTo', 'lineTo', 'lineTo', 'lineTo', 'fillStyle', 'fill',
                'beginPath', 'moveTo', 'lineTo', 'bezierCurveTo', 'lineTo', 'lineTo', 'bezierCurveTo',
                'lineTo', 'lineTo', 'bezierCurveTo', 'lineTo', 'lineTo', 'bezierCurveTo', 'lineTo',
                'moveTo', 'lineTo', 'lineTo', 'lineTo', 'lineTo', 'fillStyle', 'fill',

            ];
            assert.deepEqual(contextLogs.map(log => log.property), expectedProps);
            assert.deepEqual(contextLogs[6], { property: 'fillStyle', value: 'rgba(241, 179, 28, 1)' });
            assert.deepEqual(contextLogs[14], { property: 'fillStyle', value: 'rgba(210, 47, 39, 1)' });
            assert.deepEqual(contextLogs[22], { property: 'fillStyle', value: 'rgba(0, 0, 0, 1)' });
            assert.deepEqual(contextLogs[43], { property: 'fillStyle', value: 'rgba(0, 0, 0, 1)' });
            const layerPath = emojiFont.glyphs.get(3540).getPath(0, 0, 72, {colorFormat: 'hexa'}, emojiFont)._layers[0];
            const layerGlyphPath = emojiFont.glyphs.get(21090).getPath(0, 0, 72, {}, emojiFont);
            assert.deepEqual(layerPath.commands, layerGlyphPath.commands);
            assert.deepEqual(layerPath.fill, '#3f3f3fff');
        });

        it('does not draw layers when options.drawLayers = false', function() {
            let contextLogs = [];
            const ctx = util.createMockObject(contextLogs, undefined/*, { consoleLog: 'ctx' }*/);
            emojiFont.glyphs.get(138).draw(ctx, 0, 0, 12, { drawLayers: false }, emojiFont);
            const expectedProps = [
                'beginPath', 'moveTo', 'lineTo', 'lineTo', 'fillStyle', 'fill',
            ];
            assert.deepEqual(contextLogs.map(log => log.property), expectedProps);
        });

        it('reflects color and palette changes', function() {
            let path = emojiFont.glyphs.get(929).getPath(0, 0, 12, {}, emojiFont);
            emojiFont.palettes.add(emojiFont.palettes.get(0).reverse());
            assert.equal(path._layers.length, 8);
            path = emojiFont.glyphs.get(929).getPath(0, 0, 12, {usePalette: 1, colorFormat: 'hexa'}, emojiFont);
            assert.deepEqual(path._layers.map(p => p.fill), [
                '#c19a65ff', '#00000099', '#61b2e4ff',
            ].concat(Array(5).fill('#fadcbcff')));
            emojiFont.layers.setPaletteIndex(929, 2, 25);
            path = emojiFont.glyphs.get(929).getPath(0, 0, 12, {usePalette: 1, colorFormat: 'hexa'}, emojiFont);
            assert.deepEqual(path._layers[2].fill, '#5c9e31ff');
            emojiFont.palettes.setColor(25, '#ff000099', 1);
            path = emojiFont.glyphs.get(929).getPath(0, 0, 12, {usePalette: 1, colorFormat: 'hexa'}, emojiFont);
            assert.deepEqual(path._layers[2].fill, '#ff000099');
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

        it('lazily loads COLR layers on paths', function() {
            const layers = emojiFont.glyphs.get(138).getLayers(emojiFont);
            assert.equal(Array.isArray(layers), true);
            assert.equal(layers.length, 4);
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
