import assert  from 'assert';
import { Path } from '../src/opentype';

describe('path.js', function() {
    let emptyPath;
    let testPath1;
    let testPath2;

    global.document = {
        createElementNS: function (namespace, tagName) {
            return {
                tagName,
                getAttribute: function (name) {
                    return this[name] ? this[name].toString() : undefined;
                },
                setAttribute: function (name, value) {
                    this[name] = value;
                }
            };
        }
    };

    beforeEach(function() {
        emptyPath = new Path();

        testPath1 = new Path();
        testPath1.moveTo(1, 2);
        testPath1.lineTo(3, 4);
        testPath1.curveTo(5, 6, 7, 8, 9, 10);
        testPath1.quadTo(11, 12, 13, 14, 15, 16);
        testPath1.close();

        testPath2 = new Path(); // two squares
        testPath2.moveTo(0, 50);
        testPath2.lineTo(0, 250);
        testPath2.lineTo(50, 250);
        testPath2.lineTo(100, 250);
        testPath2.lineTo(150, 250);
        testPath2.lineTo(200, 250);
        testPath2.lineTo(200, 50);
        testPath2.lineTo(0, 50);
        testPath2.close();
        testPath2.moveTo(250, 50);
        testPath2.lineTo(250, 250);
        testPath2.lineTo(300, 250);
        testPath2.lineTo(350, 250);
        testPath2.lineTo(400, 250);
        testPath2.lineTo(450, 250);
        testPath2.lineTo(450, 50);
        testPath2.lineTo(250, 50);
        testPath2.close();
    });

    it('should set path commands correctly', function() {
        const expectedCommands =  [
            { type: 'M', x: 1, y: 2 },
            { type: 'L', x: 3, y: 4 },
            { type: 'C', x1: 5, y1: 6, x2: 7, y2: 8, x: 9, y: 10 },
            { type: 'Q', x1: 11, y1: 12, x: 13, y: 14 },
            { type: 'Z' }
        ];
        const svg = 'M1 2L3 4C5 6 7 8 9 10Q11 12 13 14Z';
        assert.deepEqual(testPath1.commands, expectedCommands);
        assert.deepEqual(Path.fromSVG(svg, {flipY: false}).commands, expectedCommands);
    });

    it('should return a streamlined SVG path (no commas, no additional spaces, only absolute commands)', function() {
        const input = 'M1,2 L 3 4Z M  .5 6.7 L 8 9 l 2,1 m1 1 c 1 2,3 4 5, 6q-7.8-9.0 -1.011 12 m-13.99-28 h 13 15 V 17 19 v21 23 25 H27 V28 zzzZZzzz';
        const expectedSVG = 'M1 2L3 4ZM0.50 6.70L8 9L10 10M11 11C12 13 14 15 16 17Q8.20 8 14.99 29M1 1L14 1L29 1L29 17L29 19L29 40L29 63L29 88L27 88L27 28Z';
        const path = Path.fromSVG(input, {flipY: false});
        assert.deepEqual(path.toPathData({flipY: false}), expectedSVG);
    });

    it('should accept integer or correct fallback for decimalPlaces backwards compatibility', function() {
        const expectedResult = 'M0.58 0.75L1.76-1.25';
        const expectedResult2 = 'M0.575 0.750L1.757-1.254';
        const path = new Path();
        path.moveTo(0.575, 0.75);
        path.lineTo(1.7567, -1.2543);
        assert.equal(path.toPathData({flipY: false}), expectedResult);
        assert.equal(path.toPathData({optimize: true, flipY: false}), expectedResult);
        assert.equal(path.toPathData(3), expectedResult2);
    });

    it('should not optimize SVG paths if parameter is set falsy', function() {
        const unoptimizedResult = 'M0 50L0 250L50 250L100 250L150 250L200 250L200 50L0 50ZM250 50L250 250L300 250L350 250L400 250L450 250L450 50L250 50Z';
        assert.equal(testPath2.toPathData({optimize: false, flipY: false}), unoptimizedResult);
    });

    it('should optimize SVG paths if path closing point matches starting point', function() {
        const optimizedResult = 'M0 250L50 250L100 250L150 250L200 250L200 50L0 50ZM250 250L300 250L350 250L400 250L450 250L450 50L250 50Z';
        assert.equal(testPath2.toPathData({flipY: false}), optimizedResult);
        assert.equal(testPath2.toPathData({optimize: true, flipY: false}), optimizedResult);
    });

    it('should optimize SVG paths if they include unnecessary lineTo commands', function() {
        const path = (new Path()).fromSVG(
            'M199 97 L 199 97 L 313 97 L 313 97 Q 396 97 444 61 L 444 61 L 444 61 Q 493 25 493 -36 L 493 -36 L 493 -36' +
            'Q 493 -108 428 -151 L 428 -151 L 428 -151 Q 363 -195 255 -195 L 255 -195 L 255 -195 Q 150 -195 90 -156 Z'
        );
        const expectedPath = 'M199 97L313 97Q396 97 444 61Q493 25 493-36Q493-108 428-151Q363-195 255-195Q150-195 90-156Z';
        const expectedResult = '<path d="' + expectedPath + '"/>';
        assert.equal(path.toSVG({optimize: true}), expectedResult);
        assert.equal(path.toDOMElement({optimize: true}).getAttribute('d'), expectedPath);
    });

    it('should calculate flipY from bounding box if set to true', function() {
        const jNormal = 'M25 772C130 725 185 680 185 528L185 33L93 33L93 534C93 647 60 673-9 705ZM204-150' +
            'C204-185 177-212 139-212C101-212 75-185 75-150C75-114 101-87 139-87C177-87 204-114 204-150Z';
        const jUpsideDown = 'M25-212C130-165 185-120 185 32L185 527L93 527L93 26C93-87 60-113-9-145ZM204 710' +
            'C204 745 177 772 139 772C101 772 75 745 75 710C75 674 101 647 139 647C177 647 204 674 204 710Z';
        const path = Path.fromSVG(jNormal);
        assert.equal(path.toPathData({flipY: false}), jUpsideDown);
        assert.equal(path.toPathData(), jNormal);
    });

    it('should handle scaling and offset', function() {
        const inputPath = 'M0 1L2 0L3 0L5 1L5 5L0 5Z';
        const expectedPath = 'M1 4.50L6 2L8.50 2L13.50 4.50L13.50 14.50L1 14.50Z';
        const path = Path.fromSVG(inputPath, { x: 1, y: 2, scale: 2.5 });
        assert.equal(path.toPathData(), expectedPath);
    });

    it('should apply fill and stroke for toSVG()', function() {
        assert.equal(emptyPath.toSVG(), '<path d=""/>');
        emptyPath.fill = '#ffaa00';
        assert.equal(emptyPath.toSVG(), '<path d="" fill="#ffaa00"/>');
        emptyPath.stroke = '#0000ff';
        assert.equal(emptyPath.toSVG(), '<path d="" fill="#ffaa00" stroke="#0000ff" stroke-width="1"/>');
        emptyPath.strokeWidth = 2;
        assert.equal(emptyPath.toSVG(), '<path d="" fill="#ffaa00" stroke="#0000ff" stroke-width="2"/>');
        emptyPath.fill = null;
        assert.equal(emptyPath.toSVG(), '<path d="" fill="none" stroke="#0000ff" stroke-width="2"/>');
        emptyPath.fill = 'black';
        assert.equal(emptyPath.toSVG(), '<path d="" stroke="#0000ff" stroke-width="2"/>');
    });

    it('should apply fill and stroke for toDOMElement()', function() {
        // in browser context these wouldn't be undefined, but we're only mocking it
        assert.equal(emptyPath.toDOMElement().getAttribute('fill'), undefined);
        assert.equal(emptyPath.toDOMElement().getAttribute('stroke'), undefined);
        assert.equal(emptyPath.toDOMElement().getAttribute('stroke-width'), undefined);

        emptyPath.fill = '#ffaa00';
        assert.equal(emptyPath.toDOMElement().getAttribute('fill'), '#ffaa00');
        emptyPath.stroke = '#0000ff';
        assert.equal(emptyPath.toDOMElement().getAttribute('stroke'), '#0000ff');
        assert.equal(emptyPath.toDOMElement().getAttribute('stroke-width'), '1');
        emptyPath.strokeWidth = 2;
        assert.equal(emptyPath.toDOMElement().getAttribute('stroke-width'), '2');
        emptyPath.fill = null;
        assert.equal(emptyPath.toDOMElement().getAttribute('fill'), 'none');
        emptyPath.fill = 'black';
        assert.equal(emptyPath.toDOMElement().getAttribute('fill'), undefined);
    });

    after(() => {
        delete global.document;
    });
});
