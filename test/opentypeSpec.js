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

    it('can generate an OpenType/CFF font', function() {
        var font = opentype.loadSync('./fonts/FiraSansOT-Medium.otf');
        assert.notEqual(font.tables.gpos, undefined);
        assert.notEqual(font.tables.gpos.lookupList, undefined);
        font.toBuffer();
    });

    it('can preserve OTF GPOS table fields', function() {
        //Load original font
        var font = opentype.loadSync('./fonts/FiraSansOT-Medium.otf');
        assert.notEqual(font.tables, undefined);
        assert.notEqual(font.tables.gpos, undefined);
        assert.notEqual(font.tables.gpos.lookupList, undefined);

        //keep copies of the values of the fields we'll ckeck for persistance
        var old_llist = font.tables.gpos.lookupList;

        //export the font
        var buffer = font.toBuffer();

        //load the generated font
        var newfont = opentype.parse(buffer);
        assert.notEqual(newfont.tables, undefined);
        assert.notEqual(newfont.tables.gpos, undefined);
        assert.notEqual(newfont.tables.gpos.lookupList, undefined);

        //verify if the regenearted tables still hold the correct values
        var new_llist = newfont.tables.gpos.lookupList;
        assert.equal(old_llist.length,
                     new_llist.length);
        for (var i=0; i < old_llist.length; i++){
            assert.equal(old_llist[i].lookupType,
                         new_llist[i].lookupType);
            assert.equal(old_llist[i].subtables.length,
                         new_llist[i].subtables.length);
            for (var j=0; j < old_llist[i].subtables.length; j++){
                assert.equal(old_llist[i].subtables[j].pairSet.length,
                             new_llist[i].subtables[j].pairSet.length);
            }
        }
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
