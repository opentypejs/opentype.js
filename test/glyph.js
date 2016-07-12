/* jshint mocha: true */

'use strict';

var assert = require('assert');
var opentype = require('../src/opentype.js');

describe('glyph.js', function() {
    describe('lazy loading', function() {
        var font;
        var glyph;

        before(function() {
            font = opentype.loadSync('./fonts/Roboto-Black.ttf');
            glyph = font.charToGlyph('A');
        });

        it('lazily loads xMin', function() {
            assert.equal(glyph.xMin, 5);
        });

        it('lazily loads xMax', function() {
            assert.equal(glyph.xMax, 1319);
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
});
