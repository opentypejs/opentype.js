// The GlyphSet object

'use strict';

var _glyph = require('./glyph');

// A GlyphSet represents all glyphs available in the font, but modelled using
// a deferred glyph loader, for retrieving glyphs only once they are absolutely
// necessary, to keep the memory footprint down.
function GlyphSet(font, glyphs) {
    this.font = font;
    this.glyphs = {};
    if (Array.isArray(glyphs)) {
        for (var i = 0; i < glyphs.length; i++) {
            this.glyphs[i] = glyphs[i];
        }
    }

    this.length = (glyphs && glyphs.length) || 0;
}

GlyphSet.prototype.get = function(index) {
    if (typeof this.glyphs[index] === 'function') {
        this.glyphs[index] = this.glyphs[index]();
    }

    return this.glyphs[index];
};

GlyphSet.prototype.push = function(index, loader) {
    this.glyphs[index] = loader;
    this.length++;
};

function glyphLoader(font, index) {
    return new _glyph.Glyph({index: index, font: font});
}

/**
 * Generate a stub glyph that can be filled with all metadata *except*
 * the "points" and "path" properties, which must be loaded only once
 * the glyph's path is actually requested for text shaping.
 */

function ttfGlyphLoader(font, index, parseGlyph, data, position, buildPath) {
    return function() {
        var glyph = new _glyph.Glyph({index: index, font: font});

        glyph.path = function() {
            parseGlyph(glyph, data, position);
            var path = buildPath(font.glyphs, glyph);
            path.unitsPerEm = font.unitsPerEm;
            return path;
        };

        return glyph;
    };
}

function cffGlyphLoader(font, index, parseCFFCharstring, charstring) {
    return function() {
        var glyph = new _glyph.Glyph({index: index, font: font});

        glyph.path = function() {
            var path = parseCFFCharstring(font, glyph, charstring);
            path.unitsPerEm = font.unitsPerEm;
            return path;
        };

        return glyph;
    };
}

exports.GlyphSet = GlyphSet;
exports.glyphLoader = glyphLoader;
exports.ttfGlyphLoader = ttfGlyphLoader;
exports.cffGlyphLoader = cffGlyphLoader;
