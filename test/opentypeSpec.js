'use strict';

var assert = require('assert');
var mocha = require('mocha');
var describe = mocha.describe;
var it = mocha.it;
var opentype = require('../src/opentype.js');

describe('OpenType.js', function() {
    it('can load a TrueType font', function() {
        var font = opentype.loadSync('./fonts/Roboto-Black.ttf');
        assert.equal(font.familyName, 'Roboto Bk');
        assert.equal(font.unitsPerEm, 2048);
        assert.equal(font.glyphs.length, 1037);
        var aGlyph = font.charToGlyph('A');
        assert.equal(aGlyph.name, 'A');
        assert.equal(aGlyph.unicode, 65);
        assert.equal(aGlyph.path.commands.length, 18);
    });

    it('can load a OpenType/CFF font', function() {
        var font = opentype.loadSync('./fonts/FiraSansOT-Medium.otf');
        assert.equal(font.familyName, 'Fira Sans OT Medium');
        assert.equal(font.unitsPerEm, 1000);
        assert.equal(font.glyphs.length, 1151);
        var aGlyph = font.charToGlyph('A');
        assert.equal(aGlyph.name, 'A');
        assert.equal(aGlyph.unicode, 65);
        assert.equal(aGlyph.path.commands.length, 14);
    });

    it('can parse OpenType GPOS tables', function() {
        var font = opentype.loadSync('./fonts/FiraSansOT-Medium_gpos.otf');
        assert.notEqual(font.tables.gpos, undefined);
        var llist = font.tables.gpos.lookupList;
        assert.equal(llist.length, 2);
        assert.equal(llist[0].lookupType, 1);
        assert.equal(llist[1].lookupType, 2);
        assert.equal(llist[1].subtables.length, 3);

        var pairsets=llist[1].subtables[0].pairSet;
        assert.equal(pairsets.length, 1145);
        assert.equal(pairsets[7]["476"], -5);
        assert.equal(pairsets[7]["508"], -25);
        assert.equal(pairsets[7]["1069"], -20);
    });
});
