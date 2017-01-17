/* jshint mocha: true */

'use strict';

var assert = require('assert');
var opentype = require('../src/opentype');
var Layout = require('../src/layout');

describe('layout.js', function() {

    var font;
    var layout;
    var notdefGlyph = new opentype.Glyph({
        name: '.notdef',
        unicode: 0,
        path: new opentype.Path()
    });
    var defaultLayoutTable = {
        version: 1,
        scripts: [],
        features: [],
        lookups: []
    };

    var glyphs = [notdefGlyph].concat('abcdefghijklmnopqrstuvwxyz'.split('').map(function(c) {
        return new opentype.Glyph({
            name: c,
            unicode: c.charCodeAt(0),
            path: new opentype.Path()
        });
    }));

    beforeEach(function() {
        font = new opentype.Font({
            familyName: 'MyFont',
            styleName: 'Medium',
            unitsPerEm: 1000,
            ascender: 800,
            descender: -200,
            glyphs: glyphs
        });
        layout = new Layout(font, 'gsub');
        layout.createDefaultTable = function() { return defaultLayoutTable; };
    });

    describe('getTable', function() {
        it('must not always create an empty default layout table', function() {
            assert.equal(layout.getTable(), undefined);
            assert.equal(layout.getTable(false), undefined);
        });

        it('must create an empty default layout table on demand', function() {
            assert.equal(layout.getTable(true), defaultLayoutTable);
        });
    });

    describe('getScriptTable', function() {
        it('must not create a new script table if it does not exist', function() {
            assert.equal(layout.getScriptTable('DFLT'), undefined);
            assert.equal(layout.getScriptTable('DFLT', false), undefined);
        });

        it('must create an new script table only on demand and if it does not exist', function() {
            var scriptTable = layout.getScriptTable('DFLT', true);
            assert.notEqual(scriptTable, undefined);
            assert.notEqual(scriptTable.defaultLangSys, undefined);
            assert.equal(layout.getScriptTable('DFLT', true), scriptTable, 'must create only one instance for each tag');
        });
    });
});
