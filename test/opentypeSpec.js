'use strict';

var assert = require('assert');
var mocha = require('mocha');
var describe = mocha.describe;
var it = mocha.it;
var opentype = require('../src/opentype.js');

describe('OpenType.js', function() {
    it('can load a TrueType font', function() {
        var font = opentype.loadSync('./fonts/Roboto-Black.ttf');
        assert.deepEqual(font.names.fontFamily, {en: 'Roboto Bk'});
        assert.equal(font.unitsPerEm, 2048);
        assert.equal(font.glyphs.length, 1037);
        var aGlyph = font.charToGlyph('A');
        assert.equal(aGlyph.name, 'A');
        assert.equal(aGlyph.unicode, 65);
        assert.equal(aGlyph.path.commands.length, 18);
    });

    it('can load a OpenType/CFF font', function() {
        var font = opentype.loadSync('./fonts/FiraSansOT-Medium.otf');
        assert.deepEqual(font.names.fontFamily, {en: 'Fira Sans OT Medium'});
        assert.equal(font.unitsPerEm, 1000);
        assert.equal(font.glyphs.length, 1151);
        var aGlyph = font.charToGlyph('A');
        assert.equal(aGlyph.name, 'A');
        assert.equal(aGlyph.unicode, 65);
        assert.equal(aGlyph.path.commands.length, 14);
    });
});
