import assert  from 'assert';
import Path from '../src/path.js';

describe('path.js', function() {
    const testPath1 = new Path();
    testPath1.moveTo(1, 2);
    testPath1.lineTo(3, 4);
    testPath1.curveTo(5, 6, 7, 8, 9, 10);
    testPath1.quadTo(11, 12, 13, 14, 15, 16);
    testPath1.close();

    const testPath2 = new Path(); // two squares
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
        assert.deepEqual(Path.fromSVG(svg).commands, expectedCommands);
    });

    it('should return a streamlined SVG path (no commas, no additional spaces, only absolute commands)', function() {
        const input = 'M1,2 L 3 4Z M  .5 6.7 L 8 9 l 2,1 m1 1 c 1 2,3 4 5, 6q-7.8-9.0 -1.011 12 m-13.99-28 h 13 15 V 17 19 v21 23 25 H27 V28 zzzZZzzz';
        const expectedSVG = 'M1 2L3 4ZM0.50 6.70L8 9L10 10M11 11C12 13 14 15 16 17Q8.20 8 14.99 29M1 1L14 1L29 1L29 17L29 19L29 40L29 63L29 88L27 88L27 28Z';
        const path = Path.fromSVG(input);
        assert.deepEqual(path.toPathData(), expectedSVG);
    });

    it('should accept integer or correct fallback for decimalPlaces backwards compatibility', function() {
        const expectedResult = 'M0.58 0.75L1.76-1.25';
        const expectedResult2 = 'M0.575 0.750L1.757-1.254';
        const path = new Path();
        path.moveTo(0.575, 0.75);
        path.lineTo(1.7567, -1.2543);
        assert.equal(path.toPathData(), expectedResult);
        assert.equal(path.toPathData({optimize: true}), expectedResult);
        assert.equal(path.toPathData(3), expectedResult2);
    });

    it('should not optimize SVG paths if parameter is not explicitly truthy', function() {
        const unoptimizedResult = 'M0 50L0 250L50 250L100 250L150 250L200 250L200 50L0 50ZM250 50L250 250L300 250L350 250L400 250L450 250L450 50L250 50Z';
        assert.equal(testPath2.toPathData(), unoptimizedResult);
        assert.equal(testPath2.toPathData({optimize: false}), unoptimizedResult);
    });

    it('should optimize SVG paths if path closing point matches starting point', function() {
        const optimizedResult = 'M0 250L50 250L100 250L150 250L200 250L200 50L0 50ZM250 250L300 250L350 250L400 250L450 250L450 50L250 50Z';
        assert.equal(testPath2.toPathData({optimize: true}), optimizedResult);
    });

    it('should optimize SVG paths if they include unnecessary lineTo commands', function() {
        const path = (new Path()).fromSVG(
            'M199 97 L 199 97 L 313 97 L 313 97 Q 396 97 444 61 L 444 61 L 444 61 Q 493 25 493 -36 L 493 -36 L 493 -36' +
            'Q 493 -108 428 -151 L 428 -151 L 428 -151 Q 363 -195 255 -195 L 255 -195 L 255 -195 Q 150 -195 90 -156 Z'
        );
        const expectedResult = '<path d="M199 97L313 97Q396 97 444 61Q493 25 493-36Q493-108 428-151Q363-195 255-195Q150-195 90-156Z"/>';
        assert.equal(path.toSVG({optimize: true}), expectedResult);
    });
});
