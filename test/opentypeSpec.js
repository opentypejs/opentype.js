'use strict';

var assert = require('assert');
var mocha = require('mocha');
var describe = mocha.describe;
var it = mocha.it;
var opentype = require('../src/opentype.js');

describe('OpenType.js', function() {
if (0){
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
}

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

        assert.equal(old_llist[1].lookupType,
                     new_llist[0].lookupType);
        assert.equal(old_llist[1].subtables.length,
                     new_llist[0].subtables.length);
        for (var j=0; j < new_llist[0].subtables.length; j++){
            assert.equal(old_llist[1].subtables[j].pairSet.length,
                         new_llist[0].subtables[j].pairSet.length);
        }
    });

if (0){
    it('can parse OpenType GPOS tables', function() {
        var font = opentype.loadSync('./fonts/FiraSansOT-Medium_gpos.otf');
        assert.notEqual(font.tables.gpos, undefined);
        var llist = font.tables.gpos.lookupList;
        assert.equal(llist.length, 2);
        assert.equal(llist[0].lookupType, 1);

        assert.equal(llist[1].lookupType, 2);
        assert.equal(llist[1].subtables.length, 3);
        var pairsets=llist[1].subtables[0].pairsets;
        assert.equal(pairsets.length, 1145); //This looks wrong!
    });
}
});
