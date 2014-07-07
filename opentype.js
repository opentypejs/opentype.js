!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.opentype=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){

},{}],2:[function(_dereq_,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],3:[function(_dereq_,module,exports){
'use strict';

// Draw a line on the given context from point `x1,y1` to point `x2,y2`.
function line(ctx, x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

exports.line = line;

},{}],4:[function(_dereq_,module,exports){
(function (process){
// opentype.js
// https://github.com/nodebox/opentype.js
// (c) 2014 Frederik De Bleser
// opentype.js may be freely distributed under the MIT license.

/* global module, DataView, XMLHttpRequest, require, ArrayBuffer, Uint8Array */

'use strict';

var draw = _dereq_('./draw');
var parse = _dereq_('./parse');
var path = _dereq_('./path');

// The exported object / namespace.
var opentype = {};

// Precondition function that checks if the given predicate is true.
// If not, it will log an error message to the console.
function checkArgument(predicate, message) {
    if (!predicate) {
        throw new Error(message);
    }
}

// Encoding objects /////////////////////////////////////////////////////

var cffStandardStrings = [
    '.notdef', 'space', 'exclam', 'quotedbl', 'numbersign', 'dollar', 'percent', 'ampersand', 'quoteright',
    'parenleft', 'parenright', 'asterisk', 'plus', 'comma', 'hyphen', 'period', 'slash', 'zero', 'one', 'two',
    'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'colon', 'semicolon', 'less', 'equal', 'greater',
    'question', 'at', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S',
    'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'bracketleft', 'backslash', 'bracketright', 'asciicircum', 'underscore',
    'quoteleft', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
    'u', 'v', 'w', 'x', 'y', 'z', 'braceleft', 'bar', 'braceright', 'asciitilde', 'exclamdown', 'cent', 'sterling',
    'fraction', 'yen', 'florin', 'section', 'currency', 'quotesingle', 'quotedblleft', 'guillemotleft',
    'guilsinglleft', 'guilsinglright', 'fi', 'fl', 'endash', 'dagger', 'daggerdbl', 'periodcentered', 'paragraph',
    'bullet', 'quotesinglbase', 'quotedblbase', 'quotedblright', 'guillemotright', 'ellipsis', 'perthousand',
    'questiondown', 'grave', 'acute', 'circumflex', 'tilde', 'macron', 'breve', 'dotaccent', 'dieresis', 'ring',
    'cedilla', 'hungarumlaut', 'ogonek', 'caron', 'emdash', 'AE', 'ordfeminine', 'Lslash', 'Oslash', 'OE',
    'ordmasculine', 'ae', 'dotlessi', 'lslash', 'oslash', 'oe', 'germandbls', 'onesuperior', 'logicalnot', 'mu',
    'trademark', 'Eth', 'onehalf', 'plusminus', 'Thorn', 'onequarter', 'divide', 'brokenbar', 'degree', 'thorn',
    'threequarters', 'twosuperior', 'registered', 'minus', 'eth', 'multiply', 'threesuperior', 'copyright',
    'Aacute', 'Acircumflex', 'Adieresis', 'Agrave', 'Aring', 'Atilde', 'Ccedilla', 'Eacute', 'Ecircumflex',
    'Edieresis', 'Egrave', 'Iacute', 'Icircumflex', 'Idieresis', 'Igrave', 'Ntilde', 'Oacute', 'Ocircumflex',
    'Odieresis', 'Ograve', 'Otilde', 'Scaron', 'Uacute', 'Ucircumflex', 'Udieresis', 'Ugrave', 'Yacute',
    'Ydieresis', 'Zcaron', 'aacute', 'acircumflex', 'adieresis', 'agrave', 'aring', 'atilde', 'ccedilla', 'eacute',
    'ecircumflex', 'edieresis', 'egrave', 'iacute', 'icircumflex', 'idieresis', 'igrave', 'ntilde', 'oacute',
    'ocircumflex', 'odieresis', 'ograve', 'otilde', 'scaron', 'uacute', 'ucircumflex', 'udieresis', 'ugrave',
    'yacute', 'ydieresis', 'zcaron', 'exclamsmall', 'Hungarumlautsmall', 'dollaroldstyle', 'dollarsuperior',
    'ampersandsmall', 'Acutesmall', 'parenleftsuperior', 'parenrightsuperior', '266 ff', 'onedotenleader',
    'zerooldstyle', 'oneoldstyle', 'twooldstyle', 'threeoldstyle', 'fouroldstyle', 'fiveoldstyle', 'sixoldstyle',
    'sevenoldstyle', 'eightoldstyle', 'nineoldstyle', 'commasuperior', 'threequartersemdash', 'periodsuperior',
    'questionsmall', 'asuperior', 'bsuperior', 'centsuperior', 'dsuperior', 'esuperior', 'isuperior', 'lsuperior',
    'msuperior', 'nsuperior', 'osuperior', 'rsuperior', 'ssuperior', 'tsuperior', 'ff', 'ffi', 'ffl',
    'parenleftinferior', 'parenrightinferior', 'Circumflexsmall', 'hyphensuperior', 'Gravesmall', 'Asmall',
    'Bsmall', 'Csmall', 'Dsmall', 'Esmall', 'Fsmall', 'Gsmall', 'Hsmall', 'Ismall', 'Jsmall', 'Ksmall', 'Lsmall',
    'Msmall', 'Nsmall', 'Osmall', 'Psmall', 'Qsmall', 'Rsmall', 'Ssmall', 'Tsmall', 'Usmall', 'Vsmall', 'Wsmall',
    'Xsmall', 'Ysmall', 'Zsmall', 'colonmonetary', 'onefitted', 'rupiah', 'Tildesmall', 'exclamdownsmall',
    'centoldstyle', 'Lslashsmall', 'Scaronsmall', 'Zcaronsmall', 'Dieresissmall', 'Brevesmall', 'Caronsmall',
    'Dotaccentsmall', 'Macronsmall', 'figuredash', 'hypheninferior', 'Ogoneksmall', 'Ringsmall', 'Cedillasmall',
    'questiondownsmall', 'oneeighth', 'threeeighths', 'fiveeighths', 'seveneighths', 'onethird', 'twothirds',
    'zerosuperior', 'foursuperior', 'fivesuperior', 'sixsuperior', 'sevensuperior', 'eightsuperior', 'ninesuperior',
    'zeroinferior', 'oneinferior', 'twoinferior', 'threeinferior', 'fourinferior', 'fiveinferior', 'sixinferior',
    'seveninferior', 'eightinferior', 'nineinferior', 'centinferior', 'dollarinferior', 'periodinferior',
    'commainferior', 'Agravesmall', 'Aacutesmall', 'Acircumflexsmall', 'Atildesmall', 'Adieresissmall',
    'Aringsmall', 'AEsmall', 'Ccedillasmall', 'Egravesmall', 'Eacutesmall', 'Ecircumflexsmall', 'Edieresissmall',
    'Igravesmall', 'Iacutesmall', 'Icircumflexsmall', 'Idieresissmall', 'Ethsmall', 'Ntildesmall', 'Ogravesmall',
    'Oacutesmall', 'Ocircumflexsmall', 'Otildesmall', 'Odieresissmall', 'OEsmall', 'Oslashsmall', 'Ugravesmall',
    'Uacutesmall', 'Ucircumflexsmall', 'Udieresissmall', 'Yacutesmall', 'Thornsmall', 'Ydieresissmall', '001.000',
    '001.001', '001.002', '001.003', 'Black', 'Bold', 'Book', 'Light', 'Medium', 'Regular', 'Roman', 'Semibold'];

var cffStandardEncoding = [
    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    '', '', '', '', 'space', 'exclam', 'quotedbl', 'numbersign', 'dollar', 'percent', 'ampersand', 'quoteright',
    'parenleft', 'parenright', 'asterisk', 'plus', 'comma', 'hyphen', 'period', 'slash', 'zero', 'one', 'two',
    'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'colon', 'semicolon', 'less', 'equal', 'greater',
    'question', 'at', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S',
    'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'bracketleft', 'backslash', 'bracketright', 'asciicircum', 'underscore',
    'quoteleft', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
    'u', 'v', 'w', 'x', 'y', 'z', 'braceleft', 'bar', 'braceright', 'asciitilde', '', '', '', '', '', '', '', '',
    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    'exclamdown', 'cent', 'sterling', 'fraction', 'yen', 'florin', 'section', 'currency', 'quotesingle',
    'quotedblleft', 'guillemotleft', 'guilsinglleft', 'guilsinglright', 'fi', 'fl', '', 'endash', 'dagger',
    'daggerdbl', 'periodcentered', '', 'paragraph', 'bullet', 'quotesinglbase', 'quotedblbase', 'quotedblright',
    'guillemotright', 'ellipsis', 'perthousand', '', 'questiondown', '', 'grave', 'acute', 'circumflex', 'tilde',
    'macron', 'breve', 'dotaccent', 'dieresis', '', 'ring', 'cedilla', '', 'hungarumlaut', 'ogonek', 'caron',
    'emdash', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'AE', '', 'ordfeminine', '', '', '',
    '', 'Lslash', 'Oslash', 'OE', 'ordmasculine', '', '', '', '', '', 'ae', '', '', '', 'dotlessi', '', '',
    'lslash', 'oslash', 'oe', 'germandbls'];

var cffExpertEncoding = [
    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    '', '', '', '', 'space', 'exclamsmall', 'Hungarumlautsmall', '', 'dollaroldstyle', 'dollarsuperior',
    'ampersandsmall', 'Acutesmall', 'parenleftsuperior', 'parenrightsuperior', 'twodotenleader', 'onedotenleader',
    'comma', 'hyphen', 'period', 'fraction', 'zerooldstyle', 'oneoldstyle', 'twooldstyle', 'threeoldstyle',
    'fouroldstyle', 'fiveoldstyle', 'sixoldstyle', 'sevenoldstyle', 'eightoldstyle', 'nineoldstyle', 'colon',
    'semicolon', 'commasuperior', 'threequartersemdash', 'periodsuperior', 'questionsmall', '', 'asuperior',
    'bsuperior', 'centsuperior', 'dsuperior', 'esuperior', '', '', 'isuperior', '', '', 'lsuperior', 'msuperior',
    'nsuperior', 'osuperior', '', '', 'rsuperior', 'ssuperior', 'tsuperior', '', 'ff', 'fi', 'fl', 'ffi', 'ffl',
    'parenleftinferior', '', 'parenrightinferior', 'Circumflexsmall', 'hyphensuperior', 'Gravesmall', 'Asmall',
    'Bsmall', 'Csmall', 'Dsmall', 'Esmall', 'Fsmall', 'Gsmall', 'Hsmall', 'Ismall', 'Jsmall', 'Ksmall', 'Lsmall',
    'Msmall', 'Nsmall', 'Osmall', 'Psmall', 'Qsmall', 'Rsmall', 'Ssmall', 'Tsmall', 'Usmall', 'Vsmall', 'Wsmall',
    'Xsmall', 'Ysmall', 'Zsmall', 'colonmonetary', 'onefitted', 'rupiah', 'Tildesmall', '', '', '', '', '', '', '',
    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    'exclamdownsmall', 'centoldstyle', 'Lslashsmall', '', '', 'Scaronsmall', 'Zcaronsmall', 'Dieresissmall',
    'Brevesmall', 'Caronsmall', '', 'Dotaccentsmall', '', '', 'Macronsmall', '', '', 'figuredash', 'hypheninferior',
    '', '', 'Ogoneksmall', 'Ringsmall', 'Cedillasmall', '', '', '', 'onequarter', 'onehalf', 'threequarters',
    'questiondownsmall', 'oneeighth', 'threeeighths', 'fiveeighths', 'seveneighths', 'onethird', 'twothirds', '',
    '', 'zerosuperior', 'onesuperior', 'twosuperior', 'threesuperior', 'foursuperior', 'fivesuperior',
    'sixsuperior', 'sevensuperior', 'eightsuperior', 'ninesuperior', 'zeroinferior', 'oneinferior', 'twoinferior',
    'threeinferior', 'fourinferior', 'fiveinferior', 'sixinferior', 'seveninferior', 'eightinferior',
    'nineinferior', 'centinferior', 'dollarinferior', 'periodinferior', 'commainferior', 'Agravesmall',
    'Aacutesmall', 'Acircumflexsmall', 'Atildesmall', 'Adieresissmall', 'Aringsmall', 'AEsmall', 'Ccedillasmall',
    'Egravesmall', 'Eacutesmall', 'Ecircumflexsmall', 'Edieresissmall', 'Igravesmall', 'Iacutesmall',
    'Icircumflexsmall', 'Idieresissmall', 'Ethsmall', 'Ntildesmall', 'Ogravesmall', 'Oacutesmall',
    'Ocircumflexsmall', 'Otildesmall', 'Odieresissmall', 'OEsmall', 'Oslashsmall', 'Ugravesmall', 'Uacutesmall',
    'Ucircumflexsmall', 'Udieresissmall', 'Yacutesmall', 'Thornsmall', 'Ydieresissmall'];

var standardNames = [
    '.notdef', '.null', 'nonmarkingreturn', 'space', 'exclam', 'quotedbl', 'numbersign', 'dollar', 'percent',
    'ampersand', 'quotesingle', 'parenleft', 'parenright', 'asterisk', 'plus', 'comma', 'hyphen', 'period', 'slash',
    'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'colon', 'semicolon', 'less',
    'equal', 'greater', 'question', 'at', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O',
    'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'bracketleft', 'backslash', 'bracketright',
    'asciicircum', 'underscore', 'grave', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o',
    'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'braceleft', 'bar', 'braceright', 'asciitilde',
    'Adieresis', 'Aring', 'Ccedilla', 'Eacute', 'Ntilde', 'Odieresis', 'Udieresis', 'aacute', 'agrave',
    'acircumflex', 'adieresis', 'atilde', 'aring', 'ccedilla', 'eacute', 'egrave', 'ecircumflex', 'edieresis',
    'iacute', 'igrave', 'icircumflex', 'idieresis', 'ntilde', 'oacute', 'ograve', 'ocircumflex', 'odieresis',
    'otilde', 'uacute', 'ugrave', 'ucircumflex', 'udieresis', 'dagger', 'degree', 'cent', 'sterling', 'section',
    'bullet', 'paragraph', 'germandbls', 'registered', 'copyright', 'trademark', 'acute', 'dieresis', 'notequal',
    'AE', 'Oslash', 'infinity', 'plusminus', 'lessequal', 'greaterequal', 'yen', 'mu', 'partialdiff', 'summation',
    'product', 'pi', 'integral', 'ordfeminine', 'ordmasculine', 'Omega', 'ae', 'oslash', 'questiondown',
    'exclamdown', 'logicalnot', 'radical', 'florin', 'approxequal', 'Delta', 'guillemotleft', 'guillemotright',
    'ellipsis', 'nonbreakingspace', 'Agrave', 'Atilde', 'Otilde', 'OE', 'oe', 'endash', 'emdash', 'quotedblleft',
    'quotedblright', 'quoteleft', 'quoteright', 'divide', 'lozenge', 'ydieresis', 'Ydieresis', 'fraction',
    'currency', 'guilsinglleft', 'guilsinglright', 'fi', 'fl', 'daggerdbl', 'periodcentered', 'quotesinglbase',
    'quotedblbase', 'perthousand', 'Acircumflex', 'Ecircumflex', 'Aacute', 'Edieresis', 'Egrave', 'Iacute',
    'Icircumflex', 'Idieresis', 'Igrave', 'Oacute', 'Ocircumflex', 'apple', 'Ograve', 'Uacute', 'Ucircumflex',
    'Ugrave', 'dotlessi', 'circumflex', 'tilde', 'macron', 'breve', 'dotaccent', 'ring', 'cedilla', 'hungarumlaut',
    'ogonek', 'caron', 'Lslash', 'lslash', 'Scaron', 'scaron', 'Zcaron', 'zcaron', 'brokenbar', 'Eth', 'eth',
    'Yacute', 'yacute', 'Thorn', 'thorn', 'minus', 'multiply', 'onesuperior', 'twosuperior', 'threesuperior',
    'onehalf', 'onequarter', 'threequarters', 'franc', 'Gbreve', 'gbreve', 'Idotaccent', 'Scedilla', 'scedilla',
    'Cacute', 'cacute', 'Ccaron', 'ccaron', 'dcroat'];

function CmapEncoding(cmap) {
    this.cmap = cmap;
}

CmapEncoding.prototype.charToGlyphIndex = function (s) {
    var ranges, code, l, c, r;
    ranges = this.cmap;
    code = s.charCodeAt(0);
    l = 0;
    r = ranges.length - 1;
    while (l < r) {
        c = (l + r + 1) >> 1;
        if (code < ranges[c].start) {
            r = c - 1;
        } else {
            l = c;
        }
    }
    if (ranges[l].start <= code && code <= ranges[l].end) {
        return (ranges[l].idDelta + (ranges[l].ids ? ranges[l].ids[code - ranges[l].start] : code)) & 0xFFFF;
    }
    return 0;
};

function CffEncoding(encoding, charset) {
    this.encoding = encoding;
    this.charset = charset;
}

CffEncoding.prototype.charToGlyphIndex = function (s) {
    var code, charName;
    code = s.charCodeAt(0);
    charName = this.encoding[code];
    return this.charset.indexOf(charName);
};

// GlyphNames object //////////////////////////////////////////////////////////
function GlyphNames(post) {
    var i;
    switch (post.version) {
    case 1:
        this.names = standardNames.slice();
        break;
    case 2:
        this.names = new Array(post.numberOfGlyphs);
        for (i = 0; i < post.numberOfGlyphs; i++) {
            if (post.glyphNameIndex[i] < standardNames.length) {
                this.names[i] = standardNames[post.glyphNameIndex[i]];
            } else {
                this.names[i] = post.names[post.glyphNameIndex[i] - standardNames.length];
            }
        }
        break;
    case 2.5:
        this.names = new Array(post.numberOfGlyphs);
        for (i = 0; i < post.numberOfGlyphs; i++) {
            this.names[i] = standardNames[i + post.glyphNameIndex[i]];
        }
        break;
    }
}

GlyphNames.prototype.nameToGlyphIndex = function (name) {
    return this.names.indexOf(name);
};

GlyphNames.prototype.glyphIndexToName = function (gid) {
    return this.names[gid];
};

// Glyph object /////////////////////////////////////////////////////////

// A Glyph is an individual mark that often corresponds to a character.
// Some glyphs, such as ligatures, are a combination of many characters.
// Glyphs are the basic building blocks of a font.
//
// The `Glyph` class is an abstract object that contains utility methods for drawing the path and its points.
// Concrete classes are `TrueTypeGlyph` and `CffGlyph` that implement `getPath`.
function Glyph() {
}

// Draw the glyph on the given context.
//
// ctx - The drawing context.
// x - Horizontal position of the glyph. (default: 0)
// y - Vertical position of the *baseline* of the glyph. (default: 0)
// fontSize - Font size, in pixels (default: 72).
Glyph.prototype.draw = function (ctx, x, y, fontSize) {
    this.getPath(x, y, fontSize).draw(ctx);
};

// Draw the points of the glyph.
// On-curve points will be drawn in blue, off-curve points will be drawn in red.
//
// ctx - The drawing context.
// x - Horizontal position of the glyph. (default: 0)
// y - Vertical position of the *baseline* of the glyph. (default: 0)
// fontSize - Font size, in pixels (default: 72).
Glyph.prototype.drawPoints = function (ctx, x, y, fontSize) {

    function drawCircles(l, x, y, scale) {
        var j, PI_SQ = Math.PI * 2;
        ctx.beginPath();
        for (j = 0; j < l.length; j += 1) {
            ctx.moveTo(x + (l[j].x * scale), y + (-l[j].y * scale));
            ctx.arc(x + (l[j].x * scale), y + (-l[j].y * scale), 2, 0, PI_SQ, false);
        }
        ctx.closePath();
        ctx.fill();
    }

    var scale, points, i, pt, blueCircles, redCircles, path, cmd;
    x = x !== undefined ? x : 0;
    y = y !== undefined ? y : 0;
    fontSize = fontSize !== undefined ? fontSize : 24;
    scale = 1 / this.font.unitsPerEm * fontSize;

    blueCircles = [];
    redCircles = [];
    if (this.points) {
        points = this.points;
        for (i = 0; i < points.length; i += 1) {
            pt = points[i];
            if (pt.onCurve) {
                blueCircles.push(pt);
            } else {
                redCircles.push(pt);
            }
        }
    } else {
        path = this.path;
        for (i = 0; i < path.commands.length; i += 1) {
            cmd = path.commands[i];
            if (cmd.x !== undefined) {
                blueCircles.push({x: cmd.x, y: -cmd.y});
            }
            if (cmd.x1 !== undefined) {
                redCircles.push({x: cmd.x1, y: -cmd.y1});
            }
            if (cmd.x2 !== undefined) {
                redCircles.push({x: cmd.x2, y: -cmd.y2});
            }
        }
    }

    ctx.fillStyle = 'blue';
    drawCircles(blueCircles, x, y, scale);
    ctx.fillStyle = 'red';
    drawCircles(redCircles, x, y, scale);
};

// Draw lines indicating important font measurements.
// Black lines indicate the origin of the coordinate system (point 0,0).
// Blue lines indicate the glyph bounding box.
// Green line indicates the advance width of the glyph.
//
// ctx - The drawing context.
// x - Horizontal position of the glyph. (default: 0)
// y - Vertical position of the *baseline* of the glyph. (default: 0)
// fontSize - Font size, in pixels (default: 72).
Glyph.prototype.drawMetrics = function (ctx, x, y, fontSize) {
    var scale;
    x = x !== undefined ? x : 0;
    y = y !== undefined ? y : 0;
    fontSize = fontSize !== undefined ? fontSize : 24;
    scale = 1 / this.font.unitsPerEm * fontSize;
    ctx.lineWidth = 1;
    // Draw the origin
    ctx.strokeStyle = 'black';
    draw.line(ctx, x, -10000, x, 10000);
    draw.line(ctx, -10000, y, 10000, y);
    // Draw the glyph box
    ctx.strokeStyle = 'blue';
    draw.line(ctx, x + (this.xMin * scale), -10000, x + (this.xMin * scale), 10000);
    draw.line(ctx, x + (this.xMax * scale), -10000, x + (this.xMax * scale), 10000);
    draw.line(ctx, -10000, y + (-this.yMin * scale), 10000, y + (-this.yMin * scale));
    draw.line(ctx, -10000, y + (-this.yMax * scale), 10000, y + (-this.yMax * scale));
    // Draw the advance width
    ctx.strokeStyle = 'green';
    draw.line(ctx, x + (this.advanceWidth * scale), -10000, x + (this.advanceWidth * scale), 10000);
};

// A concrete implementation of glyph for TrueType outline data.
function TrueTypeGlyph(font, index) {
    Glyph.call(this);
    this.font = font;
    this.index = index;
    this.numberOfContours = 0;
    this.xMin = this.yMin = this.xMax = this.yMax = 0;
    this.advanceWidth = 0;
    this.points = [];
}

TrueTypeGlyph.prototype = new Glyph();
TrueTypeGlyph.prototype.constructor = TrueTypeGlyph;

// Split the glyph into contours.
TrueTypeGlyph.prototype.getContours = function () {
    var contours, currentContour, i, pt;
    contours = [];
    currentContour = [];
    for (i = 0; i < this.points.length; i += 1) {
        pt = this.points[i];
        currentContour.push(pt);
        if (pt.lastPointOfContour) {
            contours.push(currentContour);
            currentContour = [];
        }
    }
    checkArgument(currentContour.length === 0, 'There are still points left in the current contour.');
    return contours;
};

// Convert the glyph to a Path we can draw on a drawing context.
//
// x - Horizontal position of the glyph. (default: 0)
// y - Vertical position of the *baseline* of the glyph. (default: 0)
// fontSize - Font size, in pixels (default: 72).
TrueTypeGlyph.prototype.getPath = function (x, y, fontSize) {
    var scale, p, contours, i, realFirstPoint, j, contour, pt, firstPt,
        prevPt, midPt, curvePt, lastPt;
    x = x !== undefined ? x : 0;
    y = y !== undefined ? y : 0;
    fontSize = fontSize !== undefined ? fontSize : 72;
    scale = 1 / this.font.unitsPerEm * fontSize;
    p = new path.Path();
    if (!this.points) {
        return p;
    }
    contours = this.getContours();
    for (i = 0; i < contours.length; i += 1) {
        contour = contours[i];
        firstPt = contour[0];
        lastPt = contour[contour.length - 1];
        if (firstPt.onCurve) {
            curvePt = null;
            // The first point will be consumed by the moveTo command,
            // so skip it in the loop.
            realFirstPoint = true;
        } else {
            if (lastPt.onCurve) {
                // If the first point is off-curve and the last point is on-curve,
                // start at the last point.
                firstPt = lastPt;
            } else {
                // If both first and last points are off-curve, start at their middle.
                firstPt = { x: (firstPt.x + lastPt.x) / 2, y: (firstPt.y + lastPt.y) / 2 };
            }
            curvePt = firstPt;
            // The first point is synthesized, so don't skip the real first point.
            realFirstPoint = false;
        }
        p.moveTo(x + (firstPt.x * scale), y + (-firstPt.y * scale));

        for (j = realFirstPoint ? 1 : 0; j < contour.length; j += 1) {
            pt = contour[j];
            prevPt = j === 0 ? firstPt : contour[j - 1];
            if (prevPt.onCurve && pt.onCurve) {
                // This is a straight line.
                p.lineTo(x + (pt.x * scale), y + (-pt.y * scale));
            } else if (prevPt.onCurve && !pt.onCurve) {
                curvePt = pt;
            } else if (!prevPt.onCurve && !pt.onCurve) {
                midPt = { x: (prevPt.x + pt.x) / 2, y: (prevPt.y + pt.y) / 2 };
                p.quadraticCurveTo(x + (prevPt.x * scale), y + (-prevPt.y * scale), x + (midPt.x * scale), y + (-midPt.y * scale));
                curvePt = pt;
            } else if (!prevPt.onCurve && pt.onCurve) {
                // Previous point off-curve, this point on-curve.
                p.quadraticCurveTo(x + (curvePt.x * scale), y + (-curvePt.y * scale), x + (pt.x * scale), y + (-pt.y * scale));
                curvePt = null;
            } else {
                throw new Error('Invalid state.');
            }
        }
        if (firstPt !== lastPt) {
            // Connect the last and first points
            if (curvePt) {
                p.quadraticCurveTo(x + (curvePt.x * scale), y + (-curvePt.y * scale), x + (firstPt.x * scale), y + (-firstPt.y * scale));
            } else {
                p.lineTo(x + (firstPt.x * scale), y + (-firstPt.y * scale));
            }
        }
    }
    p.closePath();
    return p;
};

// A concrete implementation of glyph for TrueType outline data.
function CffGlyph(font, index) {
    Glyph.call(this);
    this.font = font;
    this.index = index;
    this.numberOfContours = 0;
    this.xMin = this.yMin = this.xMax = this.yMax = 0;
    this.advanceWidth = font.defaultWidthX;
    this.path = null;
}

CffGlyph.prototype = new Glyph();
CffGlyph.prototype.constructor = CffGlyph;

// Convert the glyph to a Path we can draw on a drawing context.
//
// x - Horizontal position of the glyph. (default: 0)
// y - Vertical position of the *baseline* of the glyph. (default: 0)
// fontSize - Font size, in pixels (default: 72).
CffGlyph.prototype.getPath = function (x, y, fontSize) {
    var scale, newPath, i, cmd;
    x = x !== undefined ? x : 0;
    y = y !== undefined ? y : 0;
    fontSize = fontSize !== undefined ? fontSize : 72;
    scale = 1 / this.font.unitsPerEm * fontSize;
    newPath = new path.Path();
    for (i = 0; i < this.path.commands.length; i += 1) {
        cmd = this.path.commands[i];
        if (cmd.type === 'M') {
            newPath.moveTo(x + (cmd.x * scale), y + (cmd.y * scale));
        } else if (cmd.type === 'L') {
            newPath.lineTo(x + (cmd.x * scale), y + (cmd.y * scale));
        } else if (cmd.type === 'C') {
            newPath.bezierCurveTo(x + (cmd.x1 * scale), y + (cmd.y1 * scale),
                x + (cmd.x2 * scale), y + (cmd.y2 * scale),
                x + (cmd.x * scale), y + (cmd.y * scale));
        } else if (cmd.type === 'Q') {
            newPath.quadraticCurveTo(x + (cmd.x1 * scale), y + (cmd.y1 * scale),
                x + (cmd.x * scale), y + (cmd.y * scale));
        } else if (cmd.type === 'Z') {
            newPath.closePath();
        }
    }
    return newPath;
};

// Font object //////////////////////////////////////////////////////////

// A Font represents a loaded OpenType font file.
// It contains a set of glyphs and methods to draw text on a drawing context,
// or to get a path representing the text.
function Font() {
    this.supported = true;
    this.glyphs = [];
    this.encoding = null;
    this.tables = {};
}

// Convert the given character to a single glyph index.
// Note that this function assumes that there is a one-to-one mapping between
// the given character and a glyph; for complex scripts this might not be the case.
Font.prototype.charToGlyphIndex = function (s) {
    return this.encoding.charToGlyphIndex(s);
};

// Convert the given character to a single Glyph object.
// Note that this function assumes that there is a one-to-one mapping between
// the given character and a glyph; for complex scripts this might not be the case.
Font.prototype.charToGlyph = function (c) {
    var glyphIndex, glyph;
    glyphIndex = this.charToGlyphIndex(c);
    glyph = this.glyphs[glyphIndex];
    if (!glyph) {
        glyph = this.glyphs[0]; // .notdef
    }
    return glyph;
};

// Convert the given text to a list of Glyph objects.
// Note that there is no strict one-to-one mapping between characters and
// glyphs, so the list of returned glyphs can be larger or smaller than the
// length of the given string.
Font.prototype.stringToGlyphs = function (s) {
    var i, c, glyphs;
    glyphs = [];
    for (i = 0; i < s.length; i += 1) {
        c = s[i];
        glyphs.push(this.charToGlyph(c));
    }
    return glyphs;
};

Font.prototype.nameToGlyphIndex = function (name) {
    return this.glyphNames.nameToGlyphIndex(name);
};

Font.prototype.nameToGlyph = function (name) {
    var glyphIndex, glyph;
    glyphIndex = this.nametoGlyphIndex(name);
    glyph = this.glyphs[glyphIndex];
    if (!glyph) {
        glyph = this.glyphs[0]; // .notdef
    }
    return glyph;
};

Font.prototype.glyphIndexToName = function (gid) {
    if (this.glyphNames.glyphIndexToName) {
        return '';
    }
    return this.glyphNames.glyphIndexToName(gid);
};

// Retrieve the value of the kerning pair between the left glyph (or its index)
// and the right glyph (or its index). If no kerning pair is found, return 0.
// The kerning value gets added to the advance width when calculating the spacing
// between glyphs.
Font.prototype.getKerningValue = function (leftGlyph, rightGlyph) {
    leftGlyph = leftGlyph.index || leftGlyph;
    rightGlyph = rightGlyph.index || rightGlyph;
    var gposKerning = this.getGposKerningValue;
    return gposKerning ? gposKerning(leftGlyph, rightGlyph) :
        (this.kerningPairs[leftGlyph + ',' + rightGlyph] || 0);
};

// Helper function that invokes the given callback for each glyph in the given text.
// The callback gets `(glyph, x, y, fontSize, options)`.
Font.prototype.forEachGlyph = function (text, x, y, fontSize, options, callback) {
    var kerning, fontScale, glyphs, i, glyph, kerningValue;
    if (!this.supported) {
        return;
    }
    x = x !== undefined ? x : 0;
    y = y !== undefined ? y : 0;
    fontSize = fontSize !== undefined ? fontSize : 72;
    options = options || {};
    kerning = options.kerning === undefined ? true : options.kerning;
    fontScale = 1 / this.unitsPerEm * fontSize;
    glyphs = this.stringToGlyphs(text);
    for (i = 0; i < glyphs.length; i += 1) {
        glyph = glyphs[i];
        callback(glyph, x, y, fontSize, options);
        if (glyph.advanceWidth) {
            x += glyph.advanceWidth * fontScale;
        }
        if (kerning && i < glyphs.length - 1) {
            kerningValue = this.getKerningValue(glyph, glyphs[i + 1]);
            x += kerningValue * fontScale;
        }
    }
};

// Create a Path object that represents the given text.
//
// text - The text to create.
// x - Horizontal position of the beginning of the text. (default: 0)
// y - Vertical position of the *baseline* of the text. (default: 0)
// fontSize - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`. (default: 72)
// Options is an optional object that contains:
// - kerning - Whether to take kerning information into account. (default: true)
//
// Returns a Path object.
Font.prototype.getPath = function (text, x, y, fontSize, options) {
    var fullPath = new path.Path();
    this.forEachGlyph(text, x, y, fontSize, options, function (glyph, x, y, fontSize) {
        var path = glyph.getPath(x, y, fontSize);
        fullPath.extend(path);
    });
    return fullPath;
};

// Draw the text on the given drawing context.
//
// ctx - A 2D drawing context, like Canvas.
// text - The text to create.
// x - Horizontal position of the beginning of the text. (default: 0)
// y - Vertical position of the *baseline* of the text. (default: 0)
// fontSize - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`. (default: 72)
// Options is an optional object that contains:
// - kerning - Whether to take kerning information into account. (default: true)
Font.prototype.draw = function (ctx, text, x, y, fontSize, options) {
    this.getPath(text, x, y, fontSize, options).draw(ctx);
};

// Draw the points of all glyphs in the text.
// On-curve points will be drawn in blue, off-curve points will be drawn in red.
//
// ctx - A 2D drawing context, like Canvas.
// text - The text to create.
// x - Horizontal position of the beginning of the text. (default: 0)
// y - Vertical position of the *baseline* of the text. (default: 0)
// fontSize - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`. (default: 72)
// Options is an optional object that contains:
// - kerning - Whether to take kerning information into account. (default: true)
Font.prototype.drawPoints = function (ctx, text, x, y, fontSize, options) {
    this.forEachGlyph(text, x, y, fontSize, options, function (glyph, x, y, fontSize) {
        glyph.drawPoints(ctx, x, y, fontSize);
    });
};

// Draw lines indicating important font measurements for all glyphs in the text.
// Black lines indicate the origin of the coordinate system (point 0,0).
// Blue lines indicate the glyph bounding box.
// Green line indicates the advance width of the glyph.
//
// ctx - A 2D drawing context, like Canvas.
// text - The text to create.
// x - Horizontal position of the beginning of the text. (default: 0)
// y - Vertical position of the *baseline* of the text. (default: 0)
// fontSize - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`. (default: 72)
// Options is an optional object that contains:
// - kerning - Whether to take kerning information into account. (default: true)
Font.prototype.drawMetrics = function (ctx, text, x, y, fontSize, options) {
    this.forEachGlyph(text, x, y, fontSize, options, function (glyph, x, y, fontSize) {
        glyph.drawMetrics(ctx, x, y, fontSize);
    });
};

// OpenType format parsing //////////////////////////////////////////////

// Parse the coordinate data for a glyph.
function parseGlyphCoordinate(p, flag, previousValue, shortVectorBitMask, sameBitMask) {
    var v;
    if (flag & shortVectorBitMask) {
        // The coordinate is 1 byte long.
        v = p.parseByte();
        // The `same` bit is re-used for short values to signify the sign of the value.
        if (!(flag & sameBitMask)) {
            v = -v;
        }
        v = previousValue + v;
    } else {
        //  The coordinate is 2 bytes long.
        // If the `same` bit is set, the coordinate is the same as the previous coordinate.
        if (flag & sameBitMask) {
            v = previousValue;
        } else {
            // Parse the coordinate as a signed 16-bit delta value.
            v = previousValue + p.parseShort();
        }
    }
    return v;
}

// Parse an OpenType glyph (described in the glyf table).
// http://www.microsoft.com/typography/otspec/glyf.htm
function parseGlyph(data, start, index, font) {
    var p, glyph, flag, i, j, flags,
        endPointIndices, numberOfCoordinates, repeatCount, points, point, px, py,
        component, moreComponents, arg1, arg2, scale, xScale, yScale, scale01, scale10;
    p = new parse.Parser(data, start);
    glyph = new TrueTypeGlyph(font, index);
    glyph.numberOfContours = p.parseShort();
    glyph.xMin = p.parseShort();
    glyph.yMin = p.parseShort();
    glyph.xMax = p.parseShort();
    glyph.yMax = p.parseShort();
    if (glyph.numberOfContours > 0) {
        // This glyph is not a composite.
        endPointIndices = glyph.endPointIndices = [];
        for (i = 0; i < glyph.numberOfContours; i += 1) {
            endPointIndices.push(p.parseUShort());
        }

        glyph.instructionLength = p.parseUShort();
        glyph.instructions = [];
        for (i = 0; i < glyph.instructionLength; i += 1) {
            glyph.instructions.push(p.parseByte());
        }

        numberOfCoordinates = endPointIndices[endPointIndices.length - 1] + 1;
        flags = [];
        for (i = 0; i < numberOfCoordinates; i += 1) {
            flag = p.parseByte();
            flags.push(flag);
            // If bit 3 is set, we repeat this flag n times, where n is the next byte.
            if (flag & 8) {
                repeatCount = p.parseByte();
                for (j = 0; j < repeatCount; j += 1) {
                    flags.push(flag);
                    i += 1;
                }
            }
        }
        checkArgument(flags.length === numberOfCoordinates, 'Bad flags.');

        if (endPointIndices.length > 0) {
            points = [];
            // X/Y coordinates are relative to the previous point, except for the first point which is relative to 0,0.
            if (numberOfCoordinates > 0) {
                for (i = 0; i < numberOfCoordinates; i += 1) {
                    flag = flags[i];
                    point = {};
                    point.onCurve = !!(flag & 1);
                    point.lastPointOfContour = endPointIndices.indexOf(i) >= 0;
                    points.push(point);
                }
                px = 0;
                for (i = 0; i < numberOfCoordinates; i += 1) {
                    flag = flags[i];
                    point = points[i];
                    point.x = parseGlyphCoordinate(p, flag, px, 2, 16);
                    px = point.x;
                }

                py = 0;
                for (i = 0; i < numberOfCoordinates; i += 1) {
                    flag = flags[i];
                    point = points[i];
                    point.y = parseGlyphCoordinate(p, flag, py, 4, 32);
                    py = point.y;
                }
            }
            glyph.points = points;
        } else {
            glyph.points = [];
        }
    } else if (glyph.numberOfContours === 0) {
        glyph.points = [];
    } else {
        glyph.isComposite = true;
        glyph.points = [];
        glyph.components = [];
        moreComponents = true;
        while (moreComponents) {
            component = {};
            flags = p.parseUShort();
            component.glyphIndex = p.parseUShort();
            if (flags & 1) {
                // The arguments are words
                arg1 = p.parseShort();
                arg2 = p.parseShort();
                component.dx = arg1;
                component.dy = arg2;
            } else {
                // The arguments are bytes
                arg1 = p.parseChar();
                arg2 = p.parseChar();
                component.dx = arg1;
                component.dy = arg2;
            }
            if (flags & 8) {
                // We have a scale
                // TODO parse in 16-bit signed fixed number with the low 14 bits of fraction (2.14).
                scale = p.parseShort();
            } else if (flags & 64) {
                // We have an X / Y scale
                xScale = p.parseShort();
                yScale = p.parseShort();
            } else if (flags & 128) {
                // We have a 2x2 transformation
                xScale = p.parseShort();
                scale01 = p.parseShort();
                scale10 = p.parseShort();
                yScale = p.parseShort();
            }

            glyph.components.push(component);
            moreComponents = !!(flags & 32);
        }
    }
    return glyph;
}

// Transform an array of points and return a new array.
function transformPoints(points, dx, dy) {
    var newPoints, i, pt, newPt;
    newPoints = [];
    for (i = 0; i < points.length; i += 1) {
        pt = points[i];
        newPt = {
            x: pt.x + dx,
            y: pt.y + dy,
            onCurve: pt.onCurve,
            lastPointOfContour: pt.lastPointOfContour
        };
        newPoints.push(newPt);
    }
    return newPoints;
}

// Parse all the glyphs according to the offsets from the `loca` table.
function parseGlyfTable(data, start, loca, font) {
    var glyphs, i, j, offset, nextOffset, glyph,
        component, componentGlyph, transformedPoints;
    glyphs = [];
    // The last element of the loca table is invalid.
    for (i = 0; i < loca.length - 1; i += 1) {
        offset = loca[i];
        nextOffset = loca[i + 1];
        if (offset !== nextOffset) {
            glyphs.push(parseGlyph(data, start + offset, i, font));
        } else {
            glyphs.push(new TrueTypeGlyph(font, i));
        }
    }
    // Go over the glyphs again, resolving the composite glyphs.
    for (i = 0; i < glyphs.length; i += 1) {
        glyph = glyphs[i];
        if (glyph.isComposite) {
            for (j = 0; j < glyph.components.length; j += 1) {
                component = glyph.components[j];
                componentGlyph = glyphs[component.glyphIndex];
                if (componentGlyph.points) {
                    transformedPoints = transformPoints(componentGlyph.points, component.dx, component.dy);
                    glyph.points.push.apply(glyph.points, transformedPoints);
                }
            }
        }
    }

    return glyphs;
}

// Parse the `loca` table. This table stores the offsets to the locations of the glyphs in the font,
// relative to the beginning of the glyphData table.
// The number of glyphs stored in the `loca` table is specified in the `maxp` table (under numGlyphs)
// The loca table has two versions: a short version where offsets are stored as uShorts, and a long
// version where offsets are stored as uLongs. The `head` table specifies which version to use
// (under indexToLocFormat).
// https://www.microsoft.com/typography/OTSPEC/loca.htm
function parseLocaTable(data, start, numGlyphs, shortVersion) {
    var p, parseFn, glyphOffsets, glyphOffset, i;
    p = new parse.Parser(data, start);
    parseFn = shortVersion ? p.parseUShort : p.parseULong;
    // There is an extra entry after the last index element to compute the length of the last glyph.
    // That's why we use numGlyphs + 1.
    glyphOffsets = [];
    for (i = 0; i < numGlyphs + 1; i += 1) {
        glyphOffset = parseFn.call(p);
        if (shortVersion) {
            // The short table version stores the actual offset divided by 2.
            glyphOffset *= 2;
        }
        glyphOffsets.push(glyphOffset);
    }
    return glyphOffsets;
}


// Parse the `cmap` table. This table stores the mappings from characters to glyphs.
// There are many available formats, but we only support the Windows format 4.
// This function returns a `CmapEncoding` object or null if no supported format could be found.
// https://www.microsoft.com/typography/OTSPEC/cmap.htm
function parseCmapTable(data, start) {
    var version, numTables, offset, platformId, encodingId, format, segCount,
        ranges, i, j, parserOffset, idRangeOffset, p;
    var cmap = {};
    cmap.version = version = parse.getUShort(data, start);
    checkArgument(version === 0, 'cmap table version should be 0.');

    // The cmap table can contain many sub-tables, each with their own format.
    // We're only interested in a "platform 3" table. This is a Windows format.
    cmap.numtables = numTables = parse.getUShort(data, start + 2);
    offset = -1;
    for (i = 0; i < numTables; i += 1) {
        platformId = parse.getUShort(data, start + 4 + (i * 8));
        encodingId = parse.getUShort(data, start + 4 + (i * 8) + 2);
        if (platformId === 3 && (encodingId === 1 || encodingId === 0)) {
            offset = parse.getULong(data, start + 4 + (i * 8) + 4);
            break;
        }
    }
    if (offset === -1) {
        // There is no cmap table in the font that we support, so return null.
        // This font will be marked as unsupported.
        return null;
    }

    p = new parse.Parser(data, start + offset);
    cmap.format = format = p.parseUShort();
    checkArgument(format === 4, 'Only format 4 cmap tables are supported.');
    // Length in bytes of the sub-tables.
    // Skip length and language;
    p.skip('uShort', 2);
    // segCount is stored x 2.
    cmap.segCount = segCount = p.parseUShort() >> 1;
    // Skip searchRange, entrySelector, rangeShift.
    p.skip('uShort', 3);
    ranges = [];
    for (i = 0; i < segCount; i += 1) {
        ranges[i] = { end: p.parseUShort() };
    }
    // Skip a padding value.
    p.skip('uShort');
    for (i = 0; i < segCount; i += 1) {
        ranges[i].start = p.parseUShort();
        ranges[i].length = ranges[i].end - ranges[i].start + 1;
    }
    for (i = 0; i < segCount; i += 1) {
        ranges[i].idDelta = p.parseShort();
    }
    for (i = 0; i < segCount; i += 1) {
        parserOffset = p.offset + p.relativeOffset;
        idRangeOffset = p.parseUShort();
        if (idRangeOffset > 0) {
            ranges[i].ids = [];
            for (j = 0; j < ranges[i].length; j += 1) {
                ranges[i].ids[j] = parse.getUShort(data, parserOffset + idRangeOffset);
                idRangeOffset += 2;
            }
        }
    }
    cmap.segments = ranges;
    return cmap;
}

// Parse a `CFF` INDEX array.
// An index array consists of a list of offsets, then a list of objects at those offsets.
function parseCFFIndex(data, start, conversionFn) {
    var offsets, objects, count, endOffset, offsetSize, objectOffset, pos, i, value;
    offsets = [];
    objects = [];
    count = parse.getCard16(data, start);
    if (count !== 0) {
        offsetSize = parse.getByte(data, start + 2);
        objectOffset = start + ((count + 1) * offsetSize) + 2;
        pos = start + 3;
        for (i = 0; i < count + 1; i += 1) {
            offsets.push(parse.getOffset(data, pos, offsetSize));
            pos += offsetSize;
        }
        // The total size of the index array is 4 header bytes + the value of the last offset.
        endOffset = objectOffset + offsets[count];
    } else {
        endOffset = start + 2;
    }
    for (i = 0; i < offsets.length - 1; i += 1) {
        value = parse.getBytes(data, objectOffset + offsets[i], objectOffset + offsets[i + 1]);
        if (conversionFn) {
            value = conversionFn(value);
        }
        objects.push(value);
    }
    return {objects: objects, startOffset: start, endOffset: endOffset};
}

// Parse a `CFF` DICT real value.
function parseFloatOperand(parser) {
    var s, eof, lookup, b, n1, n2;
    s = '';
    eof = 15;
    lookup = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', 'E', 'E-', null, '-'];
    while (true) {
        b = parser.parseByte();
        n1 = b >> 4;
        n2 = b & 15;

        if (n1 === eof) {
            break;
        }
        s += lookup[n1];

        if (n2 === eof) {
            break;
        }
        s += lookup[n2];
    }
    return parseFloat(s);
}

// Parse a `CFF` DICT operand.
function parseOperand(parser, b0) {
    var b1, b2, b3, b4;
    if (b0 === 28) {
        b1 = parser.parseByte();
        b2 = parser.parseByte();
        return b1 << 8 | b2;
    }
    if (b0 === 29) {
        b1 = parser.parseByte();
        b2 = parser.parseByte();
        b3 = parser.parseByte();
        b4 = parser.parseByte();
        return b1 << 24 | b2 << 16 | b3 << 8 | b4;
    }
    if (b0 === 30) {
        return parseFloatOperand(parser);
    }
    if (b0 >= 32 && b0 <= 246) {
        return b0 - 139;
    }
    if (b0 >= 247 && b0 <= 250) {
        b1 = parser.parseByte();
        return (b0 - 247) * 256 + b1 + 108;
    }
    if (b0 >= 251 && b0 <= 254) {
        b1 = parser.parseByte();
        return -(b0 - 251) * 256 - b1 - 108;
    }
    throw new Error('Invalid b0 ' + b0);
}

// Convert the entries returned by `parseDict` to a proper dictionary.
// If a value is a list of one, it is unpacked.
function entriesToObject(entries) {
    var o, key, values, i, value;
    o = {};
    for (i = 0; i < entries.length; i += 1) {
        key = entries[i][0];
        values = entries[i][1];
        if (values.length === 1) {
            value = values[0];
        } else {
            value = values;
        }
        if (o.hasOwnProperty(key)) {
            throw new Error('Object ' + o + ' already has key ' + key);
        }
        o[key] = value;
    }
    return o;
}

// Parse a `CFF` DICT object.
// A dictionary contains key-value pairs in a compact tokenized format.
function parseCFFDict(data, start, size) {
    var parser, entries, operands, op;
    start = start !== undefined ? start : 0;
    parser = new parse.Parser(data, start);
    entries = [];
    operands = [];
    size = size !== undefined ? size : data.length;

    while (parser.relativeOffset < size) {
        op = parser.parseByte();
        // The first byte for each dict item distinguishes between operator (key) and operand (value).
        // Values <= 21 are operators.
        if (op <= 21) {
            // Two-byte operators have an initial escape byte of 12.
            if (op === 12) {
                op = 1200 + parser.parseByte();
            }
            entries.push([op, operands]);
            operands = [];
        } else {
            // Since the operands (values) come before the operators (keys), we store all operands in a list
            // until we encounter an operator.
            operands.push(parseOperand(parser, op));
        }
    }
    return entriesToObject(entries);
}

// Given a String Index (SID), return the value of the string.
// Strings below index 392 are standard CFF strings and are not encoded in the font.
function getCFFString(strings, index) {
    if (index <= 391) {
        index = cffStandardStrings[index];
    } else {
        index = strings[index - 391];
    }
    return index;
}

// Interpret a dictionary and return a new dictionary with readable keys and values for missing entries.
// This function takes `meta` which is a list of objects containing `operand`, `name` and `default`.
function interpretDict(dict, meta, strings) {
    var i, m, value, newDict;
    newDict = {};
    // Because we also want to include missing values, we start out from the meta list
    // and lookup values in the dict.
    for (i = 0; i < meta.length; i += 1) {
        m = meta[i];
        value = dict[m.op];
        if (value === undefined) {
            value = m.value !== undefined ? m.value : null;
        }
        if (m.type === 'SID') {
            value = getCFFString(strings, value);
        }
        newDict[m.name] = value;
    }
    return newDict;
}

// Parse the CFF header.
function parseCFFHeader(data, start) {
    var header = {};
    header.formatMajor = parse.getCard8(data, start);
    header.formatMinor = parse.getCard8(data, start + 1);
    header.size = parse.getCard8(data, start + 2);
    header.offsetSize = parse.getCard8(data, start + 3);
    header.startOffset = start;
    header.endOffset = start + 4;
    return header;
}

// Parse the CFF top dictionary. A CFF table can contain multiple fonts, each with their own top dictionary.
// The top dictionary contains the essential metadata for the font, together with the private dictionary.
function parseCFFTopDict(data, strings) {
    var dict, meta;
    meta = [
        {name: 'version', op: 0, type: 'SID'},
        {name: 'notice', op: 1, type: 'SID'},
        {name: 'copyright', op: 1200, type: 'SID'},
        {name: 'fullName', op: 2, type: 'SID'},
        {name: 'familyName', op: 3, type: 'SID'},
        {name: 'weight', op: 4, type: 'SID'},
        {name: 'isFixedPitch', op: 1201, type: 'number', value: 0},
        {name: 'italicAngle', op: 1202, type: 'number', value: 0},
        {name: 'underlinePosition', op: 1203, type: 'number', value: -100},
        {name: 'underlineThickness', op: 1204, type: 'number', value: 50},
        {name: 'paintType', op: 1205, type: 'number', value: 0},
        {name: 'charstringType', op: 1206, type: 'number', value: 2},
        {name: 'fontMatrix', op: 1207, type: ['number', 'number', 'number', 'number'], value: [0.001, 0, 0, 0.001, 0, 0]},
        {name: 'uniqueId', op: 13, type: 'number'},
        {name: 'fontBBox', op: 5, type: ['number', 'number', 'number', 'number'], value: [0, 0, 0, 0]},
        {name: 'strokeWidth', op: 1208, type: 'number', value: 0},
        {name: 'xuid', op: 14, type: []},
        {name: 'charset', op: 15, type: 'offset', value: 0},
        {name: 'encoding', op: 16, type: 'offset', value: 0},
        {name: 'charStrings', op: 17, type: 'number', value: 0},
        {name: 'private', op: 18, type: ['number', 'offset'], value: [0, 0]}
    ];
    dict = parseCFFDict(data, 0, data.byteLength);
    return interpretDict(dict, meta, strings);
}

// Parse the CFF private dictionary. We don't fully parse out all the values, only the ones we need.
function parseCFFPrivateDict(data, start, size, strings) {
    var dict, meta;
    meta = [
        {name: 'subrs', op: 19, type: 'offset', value: 0},
        {name: 'defaultWidthX', op: 20, type: 'number', value: 0},
        {name: 'nominalWidthX', op: 21, type: 'number', value: 0}
    ];
    dict = parseCFFDict(data, start, size);
    return interpretDict(dict, meta, strings);
}

// Parse the CFF charset table, which contains internal names for all the glyphs.
// This function will return a list of glyph names.
// See Adobe TN #5176 chapter 13, "Charsets".
function parseCFFCharset(data, start, nGlyphs, strings) {
    var parser, format, charset, i, sid, count;
    parser = new parse.Parser(data, start);
    // The .notdef glyph is not included, so subtract 1.
    nGlyphs -= 1;
    charset = ['.notdef'];

    format = parser.parseCard8();
    if (format === 0) {
        for (i = 0; i < nGlyphs; i += 1) {
            sid = parser.parseSID();
            charset.push(getCFFString(strings, sid));
        }
    } else if (format === 1) {
        while (charset.length <= nGlyphs) {
            sid = parser.parseSID();
            count = parser.parseCard8();
            for (i = 0; i <= count; i += 1) {
                charset.push(getCFFString(strings, sid));
                sid += 1;
            }
        }
    } else if (format === 2) {
        while (charset.length <= nGlyphs) {
            sid = parser.parseSID();
            count = parser.parseCard16();
            for (i = 0; i <= count; i += 1) {
                charset.push(getCFFString(strings, sid));
                sid += 1;
            }
        }
    } else {
        throw new Error('Unknown charset format ' + format);
    }

    return charset;
}

// Parse the CFF encoding data. Only one encoding can be specified per font.
// See Adobe TN #5176 chapter 12, "Encodings".
function parseCFFEncoding(data, start, charset) {
    var encoding, parser, format, nCodes, i, code, nRanges, first, nLeft, j;
    encoding = {};
    parser = new parse.Parser(data, start);
    format = parser.parseCard8();
    if (format === 0) {
        nCodes = parser.parseCard8();
        for (i = 0; i < nCodes; i += 1) {
            code = parser.parseCard8();
            encoding[code] = i;
        }
    } else if (format === 1) {
        nRanges = parser.parseCard8();
        code = 1;
        for (i = 0; i < nRanges; i += 1) {
            first = parser.parseCard8();
            nLeft = parser.parseCard8();
            for (j = first; j <= first + nLeft; j += 1) {
                encoding[j] = code;
                code += 1;
            }
        }
    } else {
        throw new Error('Unknown encoding format ' + format);
    }
    return new CffEncoding(encoding, charset);
}

// Take in charstring code and return a Glyph object.
// The encoding is described in the Type 2 Charstring Format
// https://www.microsoft.com/typography/OTSPEC/charstr2.htm
function parseCFFCharstring(code, font, index) {
    var p, glyph, stack, nStems, haveWidth, width, x, y, c1x, c1y, c2x, c2y, v;
    p = new path.Path();
    stack = [];
    nStems = 0;
    haveWidth = false;
    width = font.nominalWidthX;
    x = y = 0;

    function parseStems() {
        var hasWidthArg;
        // The number of stem operators on the stack is always even.
        // If the value is uneven, that means a width is specified.
        hasWidthArg = stack.length % 2 !== 0;
        if (hasWidthArg && !haveWidth) {
            width = stack.shift() + font.nominalWidthX;
        }
        nStems += stack.length >> 1;
        stack.length = 0;
        haveWidth = true;
    }

    function parse(code) {
        var i, b1, b2, b3, b4, codeIndex, subrCode;
        i = 0;
        while (i < code.length) {
            v = code[i];
            i += 1;
            switch (v) {
            case 1: // hstem
                parseStems();
                break;
            case 3: // vstem
                parseStems();
                break;
            case 4: // vmoveto
                if (stack.length > 1 && !haveWidth) {
                    width = stack.shift() + font.nominalWidthX;
                    haveWidth = true;
                }
                y += stack.pop();
                p.moveTo(x, -y);
                break;
            case 5: // rlineto
                while (stack.length > 0) {
                    x += stack.shift();
                    y += stack.shift();
                    p.lineTo(x, -y);
                }
                break;
            case 6: // hlineto
                while (stack.length > 0) {
                    x += stack.shift();
                    p.lineTo(x, -y);
                    if (stack.length === 0) {
                        break;
                    }
                    y += stack.shift();
                    p.lineTo(x, -y);
                }
                break;
            case 7: // vlineto
                while (stack.length > 0) {
                    y += stack.shift();
                    p.lineTo(x, -y);
                    if (stack.length === 0) {
                        break;
                    }
                    x += stack.shift();
                    p.lineTo(x, -y);
                }
                break;
            case 8: // rrcurveto
                while (stack.length > 0) {
                    c1x = x + stack.shift();
                    c1y = y + stack.shift();
                    c2x = c1x + stack.shift();
                    c2y = c1y + stack.shift();
                    x = c2x + stack.shift();
                    y = c2y + stack.shift();
                    p.curveTo(c1x, -c1y, c2x, -c2y, x, -y);
                }
                break;
            case 10: // callsubr
                codeIndex = stack.pop() + font.subrsBias;
                subrCode = font.subrs[codeIndex];
                if (subrCode) {
                    parse(subrCode);
                }
                break;
            case 11: // return
                return;
            case 12: // escape
                v = code[i];
                i += 1;
                break;
            case 14: // endchar
                if (stack.length > 0 && !haveWidth) {
                    width = stack.shift() + font.nominalWidthX;
                    haveWidth = true;
                }
                p.closePath();
                break;
            case 18: // hstemhm
                parseStems();
                break;
            case 19: // hintmask
            case 20: // cntrmask
                parseStems();
                i += (nStems + 7) >> 3;
                break;
            case 21: // rmoveto
                if (stack.length > 2 && !haveWidth) {
                    width = stack.shift() + font.nominalWidthX;
                    haveWidth = true;
                }
                y += stack.pop();
                x += stack.pop();
                p.moveTo(x, -y);
                break;
            case 22: // hmoveto
                if (stack.length > 1 && !haveWidth) {
                    width = stack.shift() + font.nominalWidthX;
                    haveWidth = true;
                }
                x += stack.pop();
                p.moveTo(x, -y);
                break;
            case 23: // vstemhm
                parseStems();
                break;
            case 24: // rcurveline
                while (stack.length > 2) {
                    c1x = x + stack.shift();
                    c1y = y + stack.shift();
                    c2x = c1x + stack.shift();
                    c2y = c1y + stack.shift();
                    x = c2x + stack.shift();
                    y = c2y + stack.shift();
                    p.curveTo(c1x, -c1y, c2x, -c2y, x, -y);
                }
                x += stack.shift();
                y += stack.shift();
                p.lineTo(x, -y);
                break;
            case 25: // rlinecurve
                while (stack.length > 6) {
                    x += stack.shift();
                    y += stack.shift();
                    p.lineTo(x, -y);
                }
                c1x = x + stack.shift();
                c1y = y + stack.shift();
                c2x = c1x + stack.shift();
                c2y = c1y + stack.shift();
                x = c2x + stack.shift();
                y = c2y + stack.shift();
                p.curveTo(c1x, -c1y, c2x, -c2y, x, -y);
                break;
            case 26: // vvcurveto
                if (stack.length % 2) {
                    x += stack.shift();
                }
                while (stack.length > 0) {
                    c1x = x;
                    c1y = y + stack.shift();
                    c2x = c1x + stack.shift();
                    c2y = c1y + stack.shift();
                    x = c2x;
                    y = c2y + stack.shift();
                    p.curveTo(c1x, -c1y, c2x, -c2y, x, -y);
                }
                break;
            case 27: // hhcurveto
                if (stack.length % 2) {
                    y += stack.shift();
                }
                while (stack.length > 0) {
                    c1x = x + stack.shift();
                    c1y = y;
                    c2x = c1x + stack.shift();
                    c2y = c1y + stack.shift();
                    x = c2x + stack.shift();
                    y = c2y;
                    p.curveTo(c1x, -c1y, c2x, -c2y, x, -y);
                }
                break;
            case 28: // shortint
                b1 = code[i];
                b2 = code[i + 1];
                stack.push(((b1 << 24) | (b2 << 16)) >> 16);
                i += 2;
                break;
            case 29: // callgsubr
                codeIndex = stack.pop() + font.gsubrsBias;
                subrCode = font.gsubrs[codeIndex];
                if (subrCode) {
                    parse(subrCode);
                }
                break;
            case 30: // vhcurveto
                while (stack.length > 0) {
                    c1x = x;
                    c1y = y + stack.shift();
                    c2x = c1x + stack.shift();
                    c2y = c1y + stack.shift();
                    x = c2x + stack.shift();
                    y = c2y + (stack.length === 1 ? stack.shift() : 0);
                    p.curveTo(c1x, -c1y, c2x, -c2y, x, -y);
                    if (stack.length === 0) {
                        break;
                    }
                    c1x = x + stack.shift();
                    c1y = y;
                    c2x = c1x + stack.shift();
                    c2y = c1y + stack.shift();
                    y = c2y + stack.shift();
                    x = c2x + (stack.length === 1 ? stack.shift() : 0);
                    p.curveTo(c1x, -c1y, c2x, -c2y, x, -y);
                }
                break;
            case 31: // hvcurveto
                while (stack.length > 0) {
                    c1x = x + stack.shift();
                    c1y = y;
                    c2x = c1x + stack.shift();
                    c2y = c1y + stack.shift();
                    y = c2y + stack.shift();
                    x = c2x + (stack.length === 1 ? stack.shift() : 0);
                    p.curveTo(c1x, -c1y, c2x, -c2y, x, -y);
                    if (stack.length === 0) {
                        break;
                    }
                    c1x = x;
                    c1y = y + stack.shift();
                    c2x = c1x + stack.shift();
                    c2y = c1y + stack.shift();
                    x = c2x + stack.shift();
                    y = c2y + (stack.length === 1 ? stack.shift() : 0);
                    p.curveTo(c1x, -c1y, c2x, -c2y, x, -y);
                }
                break;
            default:
                if (v < 32) {
                    throw new Error('Glyph ' + index + ': unknown operator ' + v);
                } else if (v < 247) {
                    stack.push(v - 139);
                } else if (v < 251) {
                    b1 = code[i];
                    i += 1;
                    stack.push((v - 247) * 256 + b1 + 108);
                } else if (v < 255) {
                    b1 = code[i];
                    i += 1;
                    stack.push(-(v - 251) * 256 - b1 - 108);
                } else {
                    b1 = code[i];
                    b2 = code[i + 1];
                    b3 = code[i + 2];
                    b4 = code[i + 3];
                    i += 4;
                    stack.push(((b1 << 24) | (b2 << 16) | (b3 << 8) | b4) / 65536);
                }
            }
        }
    }

    parse(code);
    glyph = new CffGlyph(font, index);
    glyph.path = p;
    glyph.advanceWidth = width;
    return glyph;
}

// Subroutines are encoded using the negative half of the number space.
// See type 2 chapter 4.7 "Subroutine operators".
function calcCFFSubroutineBias(subrs) {
    var bias;
    if (subrs.length < 1240) {
        bias = 107;
    } else if (subrs.length < 33900) {
        bias = 1131;
    } else {
        bias = 32768;
    }
    return bias;
}

// Parse the `CFF` table, which contains the glyph outlines in PostScript format.
function parseCFFTable(data, start, font) {
    var header, nameIndex, topDictIndex, stringIndex, globalSubrIndex, topDict, privateDictOffset, privateDict,
        subrOffset, subrIndex, charString, charStringsIndex, charset, i;
    header = parseCFFHeader(data, start);
    nameIndex = parseCFFIndex(data, header.endOffset, parse.bytesToString);
    topDictIndex = parseCFFIndex(data, nameIndex.endOffset);
    stringIndex = parseCFFIndex(data, topDictIndex.endOffset, parse.bytesToString);
    globalSubrIndex = parseCFFIndex(data, stringIndex.endOffset);
    font.gsubrs = globalSubrIndex.objects;
    font.gsubrsBias = calcCFFSubroutineBias(font.gsubrs);

    var topDictData = new DataView(new Uint8Array(topDictIndex.objects[0]).buffer);
    topDict = parseCFFTopDict(topDictData, stringIndex.objects);

    privateDictOffset = start + topDict['private'][1];
    privateDict = parseCFFPrivateDict(data, privateDictOffset, topDict['private'][0], stringIndex.objects);
    font.defaultWidthX = privateDict.defaultWidthX;
    font.nominalWidthX = privateDict.nominalWidthX;

    subrOffset = privateDictOffset + privateDict.subrs;
    subrIndex = parseCFFIndex(data, subrOffset);
    font.subrs = subrIndex.objects;
    font.subrsBias = calcCFFSubroutineBias(font.subrs);

    // Offsets in the top dict are relative to the beginning of the CFF data, so add the CFF start offset.
    charStringsIndex = parseCFFIndex(data, start + topDict.charStrings);
    font.nGlyphs = charStringsIndex.objects.length;

    charset = parseCFFCharset(data, start + topDict.charset, font.nGlyphs, stringIndex.objects);
    if (topDict.encoding === 0) { // Standard encoding
        font.cffEncoding = new CffEncoding(cffStandardEncoding, charset);
    } else if (topDict.encoding === 1) { // Expert encoding
        font.cffEncoding = new CffEncoding(cffExpertEncoding, charset);
    } else {
        font.cffEncoding = parseCFFEncoding(data, start + topDict.encoding, charset);
    }
    // Prefer the CMAP encoding to the CFF encoding.
    font.encoding = font.encoding || font.cffEncoding;

    font.glyphs = [];
    for (i = 0; i < font.nGlyphs; i += 1) {
        charString = charStringsIndex.objects[i];
        font.glyphs.push(parseCFFCharstring(charString, font, i));
    }
}

// Parse the header `head` table
// https://www.microsoft.com/typography/OTSPEC/head.htm
function parseHeadTable(data, start) {
    var head = {},
        p = new parse.Parser(data, start);
    head.version = p.parseVersion();
    head.fontRevision = Math.round(p.parseFixed() * 1000) / 1000;
    head.checkSumAdjustment = p.parseULong();
    head.magicNumber = p.parseULong();
    checkArgument(head.magicNumber === 0x5F0F3CF5, 'Font header has wrong magic number.');
    head.flags = p.parseUShort();
    head.unitsPerEm = p.parseUShort();
    head.created = p.parseLongDateTime();
    head.modified = p.parseLongDateTime();
    head.xMin = p.parseShort();
    head.yMin = p.parseShort();
    head.xMax = p.parseShort();
    head.yMax = p.parseShort();
    head.macStyle = p.parseUShort();
    head.lowestRecPPEM = p.parseUShort();
    head.fontDirectionHint = p.parseShort();
    head.indexToLocFormat = p.parseShort();     // 50
    head.glyphDataFormat = p.parseShort();
    return head;
}

// Parse the horizontal header `hhea` table
// https://www.microsoft.com/typography/OTSPEC/hhea.htm
function parseHheaTable(data, start) {
    var hhea = {},
        p = new parse.Parser(data, start);
    hhea.version = p.parseVersion();
    hhea.ascender = p.parseShort();
    hhea.descender = p.parseShort();
    hhea.lineGap = p.parseShort();
    hhea.advanceWidthMax = p.parseUShort();
    hhea.minLeftSideBearing = p.parseShort();
    hhea.minRightSideBearing = p.parseShort();
    hhea.xMaxExtent = p.parseShort();
    hhea.caretSlopeRise = p.parseShort();
    hhea.caretSlopeRun = p.parseShort();
    hhea.caretOffset = p.parseShort();
    p.relativeOffset += 8;
    hhea.metricDataFormat = p.parseShort();
    hhea.numberOfHMetrics = p.parseUShort();
    return hhea;
}

// Parse the maximum profile `maxp` table
// https://www.microsoft.com/typography/OTSPEC/maxp.htm
function parseMaxpTable(data, start) {
    var maxp = {},
        p = new parse.Parser(data, start);
    maxp.version = p.parseVersion();
    maxp.numGlyphs = p.parseUShort();
    if (maxp.majorVersion === 1) {
        maxp.maxPoints = p.parseUShort();
        maxp.maxContours = p.parseUShort();
        maxp.maxCompositePoints = p.parseUShort();
        maxp.maxCompositeContours = p.parseUShort();
        maxp.maxZones = p.parseUShort();
        maxp.maxTwilightPoints = p.parseUShort();
        maxp.maxStorage = p.parseUShort();
        maxp.maxFunctionDefs = p.parseUShort();
        maxp.maxInstructionDefs = p.parseUShort();
        maxp.maxStackElements = p.parseUShort();
        maxp.maxSizeOfInstructions = p.parseUShort();
        maxp.maxComponentElements = p.parseUShort();
        maxp.maxComponentDepth = p.parseUShort();
    }
    return maxp;
}

// NameIDs for the name table.
var nameTableNames = [
    'copyright',              // 0
    'fontFamily',             // 1
    'fontSubfamily',          // 2
    'uniqueID',               // 3
    'fullName',               // 4
    'version',                // 5
    'postScriptName',         // 6
    'trademark',              // 7
    'manufacturer',           // 8
    'designer',               // 9
    'description',            // 10
    'vendorURL',              // 11
    'designerURL',            // 12
    'licence',                // 13
    'licenceURL',             // 14
    'reserved',               // 15
    'preferredFamily',        // 16
    'preferredSubfamily',     // 17
    'compatibleFullName',     // 18
    'sampleText',             // 19
    'postScriptFindFontName', // 20
    'wwsFamily',              // 21
    'wwsSubfamily'            // 22
];

// Parse the naming `name` table
// https://www.microsoft.com/typography/OTSPEC/name.htm
// Only Windows Unicode English names are supported.
// Format 1 additional fields are not supported
function parseNameTable(data, start) {
    var name = {},
        p = new parse.Parser(data, start);
    name.format = p.parseUShort();
    var count = p.parseUShort(),
        stringOffset = p.offset + p.parseUShort();
    var platformID, encodingID, languageID, nameID, property, byteLength,
        offset, str, i, j, codePoints;
    var unknownCount = 0;
    for(i = 0; i < count; i++) {
        platformID = p.parseUShort();
        encodingID = p.parseUShort();
        languageID = p.parseUShort();
        nameID = p.parseUShort();
        property = nameTableNames[nameID];
        byteLength = p.parseUShort();
        offset = p.parseUShort();
        // platformID - encodingID - languageID standard combinations :
        // 1 - 0 - 0 : Macintosh, Roman, English
        // 3 - 1 - 0x409 : Windows, Unicode BMP (UCS-2), en-US
        if (platformID === 3 && encodingID === 1 && languageID === 0x409) {
            codePoints = [];
            var length = byteLength/2;
            for(j = 0; j < length; j++, offset += 2) {
                codePoints[j] = parse.getShort(data, stringOffset+offset);
            }
            str = String.fromCharCode.apply(null, codePoints);
            if (property) {
                name[property] = str;
            }
            else {
                unknownCount++;
                name['unknown'+unknownCount] = str;
            }
        }

    }
    if (name.format === 1) {
        name.langTagCount = p.parseUShort();
    }
    return name;
}

// Parse the OS/2 and Windows metrics `OS/2` table
// https://www.microsoft.com/typography/OTSPEC/os2.htm
function parseOS2Table(data, start) {
    var os2 = {},
        p = new parse.Parser(data, start);
    os2.version = p.parseUShort();
    os2.xAvgCharWidth = p.parseShort();
    os2.usWeightClass = p.parseUShort();
    os2.usWidthClass = p.parseUShort();
    os2.fsType = p.parseUShort();
    os2.ySubscriptXSize = p.parseShort();
    os2.ySubscriptYSize = p.parseShort();
    os2.ySubscriptXOffset = p.parseShort();
    os2.ySubscriptYOffset = p.parseShort();
    os2.ySuperscriptXSize = p.parseShort();
    os2.ySuperscriptYSize = p.parseShort();
    os2.ySuperscriptXOffset = p.parseShort();
    os2.ySuperscriptYOffset = p.parseShort();
    os2.yStrikeoutSize = p.parseShort();
    os2.yStrikeoutPosition = p.parseShort();
    os2.sFamilyClass = p.parseShort();
    os2.panose = [];
    for(var i = 0; i < 10; i++) {
        os2.panose[i] = p.parseByte();
    }
    os2.ulUnicodeRange1 = p.parseULong();
    os2.ulUnicodeRange2 = p.parseULong();
    os2.ulUnicodeRange3 = p.parseULong();
    os2.ulUnicodeRange4 = p.parseULong();
    os2.achVendID = String.fromCharCode(p.parseByte(), p.parseByte(), p.parseByte(), p.parseByte());
    os2.fsSelection = p.parseUShort();
    os2.usFirstCharIndex = p.parseUShort();
    os2.usLastCharIndex = p.parseUShort();
    os2.sTypoAscender = p.parseShort();
    os2.sTypoDescender = p.parseShort();
    os2.sTypoLineGap = p.parseShort();
    os2.usWinAscent = p.parseUShort();
    os2.usWinDescent = p.parseUShort();
    if (os2.version >= 1) {
        os2.ulCodePageRange1 = p.parseULong();
        os2.ulCodePageRange2 = p.parseULong();
    }
    if (os2.version >= 2) {
        os2.sxHeight = p.parseShort();
        os2.sCapHeight = p.parseShort();
        os2.usDefaultChar = p.parseUShort();
        os2.usBreakChar = p.parseUShort();
        os2.usMaxContent = p.parseUShort();
    }
    return os2;
}

// Parse the PostScript `post` table
// https://www.microsoft.com/typography/OTSPEC/post.htm
function parsePostTable(data, start) {
    var post = {},
        p = new parse.Parser(data, start),
        i, nameLength;
    post.version = p.parseVersion();
    post.italicAngle = p.parseFixed();
    post.underlinePosition = p.parseShort();
    post.underlineThickness = p.parseShort();
    post.isFixedPitch = p.parseULong();
    post.minMemType42 = p.parseULong();
    post.maxMemType42 = p.parseULong();
    post.minMemType1 = p.parseULong();
    post.maxMemType1 = p.parseULong();
    switch (post.version) {
    case 1:
        post.names = standardNames.slice();
        break;
    case 2:
        post.numberOfGlyphs = p.parseUShort();
        post.glyphNameIndex = new Array(post.numberOfGlyphs);
        for (i = 0; i < post.numberOfGlyphs; i++) {
            post.glyphNameIndex[i] = p.parseUShort();
        }
        post.names = [];
        for (i = 0; i < post.numberOfGlyphs; i++) {
            if (post.glyphNameIndex[i] >= standardNames.length) {
                nameLength = p.parseChar();
                post.names.push(p.parseString(nameLength));
            }
        }
        break;
    case 2.5:
        post.numberOfGlyphs = p.parseUShort();
        post.offset = new Array(post.numberOfGlyphs);
        for (i = 0; i < post.numberOfGlyphs; i++) {
            post.offset = p.parseChar();
        }
        break;
    }
    return post;
}

// Parse the `hmtx` table, which contains the horizontal metrics for all glyphs.
// This function augments the glyph array, adding the advanceWidth and leftSideBearing to each glyph.
// https://www.microsoft.com/typography/OTSPEC/hmtx.htm
function parseHmtxTable(data, start, numMetrics, numGlyphs, glyphs) {
    var p, i, glyph, advanceWidth, leftSideBearing;
    p = new parse.Parser(data, start);
    for (i = 0; i < numGlyphs; i += 1) {
        // If the font is monospaced, only one entry is needed. This last entry applies to all subsequent glyphs.
        if (i < numMetrics) {
            advanceWidth = p.parseUShort();
            leftSideBearing = p.parseShort();
        }
        glyph = glyphs[i];
        glyph.advanceWidth = advanceWidth;
        glyph.leftSideBearing = leftSideBearing;
    }
}

// Parse the `kern` table which contains kerning pairs.
// Note that some fonts use the GPOS OpenType layout table to specify kerning.
// https://www.microsoft.com/typography/OTSPEC/kern.htm
function parseKernTable(data, start) {
    var pairs, p, tableVersion, nTables, subTableVersion, nPairs,
        i, leftIndex, rightIndex, value;
    pairs = {};
    p = new parse.Parser(data, start);
    tableVersion = p.parseUShort();
    checkArgument(tableVersion === 0, 'Unsupported kern table version.');
    nTables = p.parseUShort();
    subTableVersion = p.parseUShort();
    checkArgument(subTableVersion === 0, 'Unsupported kern sub-table version.');
    // Skip subTableLength, subTableCoverage
    p.skip('uShort', 2);
    nPairs = p.parseUShort();
    // Skip searchRange, entrySelector, rangeShift.
    p.skip('uShort', 3);
    for (i = 0; i < nPairs; i += 1) {
        leftIndex = p.parseUShort();
        rightIndex = p.parseUShort();
        value = p.parseShort();
        pairs[leftIndex + ',' + rightIndex] = value;
    }
    return pairs;
}

// Parse ScriptList and FeatureList tables of GPOS, GSUB, GDEF, BASE, JSTF tables.
// These lists are unused by now, this function is just the basis for a real parsing.
function parseTaggedListTable(data, start) {
    var p = new parse.Parser(data, start),
        n = p.parseUShort(),
        list = [];
    for (var i = 0; i < n; i++) {
        list[p.parseTag()] = { offset: p.parseUShort() };
    }
    return list;
}

// Parse a coverage table in a GSUB, GPOS or GDEF table.
// Format 1 is a simple list of glyph ids,
// Format 2 is a list of ranges. It is expanded in a list of glyphs, maybe not the best idea.
function parseCoverageTable(data, start) {
    var p = new parse.Parser(data, start),
        format = p.parseUShort(),
        count =  p.parseUShort();
    if (format === 1) {
        return p.parseUShortList(count);
    }
    else if (format === 2) {
        var i, begin, end, index, coverage = [];
        for (; count--;) {
            begin = p.parseUShort();
            end = p.parseUShort();
            index = p.parseUShort();
            for (i = begin; i <= end; i++) {
                coverage[index++] = i;
            }
        }
        return coverage;
    }
}

// Parse a Class Definition Table in a GSUB, GPOS or GDEF table.
// Returns a function that gets a class value from a glyph ID.
function parseClassDefTable(data, start) {
    var p = new parse.Parser(data, start),
        format = p.parseUShort();
    if (format === 1) {
        // Format 1 specifies a range of consecutive glyph indices, one class per glyph ID.
        var startGlyph = p.parseUShort(),
            glyphCount = p.parseUShort(),
            classes = p.parseUShortList(glyphCount);
        return function(glyphID) {
            return classes[glyphID - startGlyph] || 0;
        };
    }
    else if (format === 2) {
        // Format 2 defines multiple groups of glyph indices that belong to the same class.
        var rangeCount = p.parseUShort(),
            startGlyphs = [],
            endGlyphs = [],
            classValues = [];
        for (var i = 0; i < rangeCount; i++) {
            startGlyphs[i] = p.parseUShort();
            endGlyphs[i] = p.parseUShort();
            classValues[i] = p.parseUShort();
        }
        return function(glyphID) {
            var l, c, r;
            l = 0;
            r = startGlyphs.length - 1;
            while (l < r) {
                c = (l + r + 1) >> 1;
                if (glyphID < startGlyphs[c]) {
                    r = c - 1;
                } else {
                    l = c;
                }
            }
            if (startGlyphs[l] <= glyphID && glyphID <= endGlyphs[l]) {
                return classValues[l] || 0;
            }
            return 0;
        };
    }
}

// Parse a pair adjustment positioning subtable, format 1 or format 2
// The subtable is returned in the form of a lookup function.
function parsePairPosSubTable(data, start) {
    var p = new parse.Parser(data, start);
    var format, coverageOffset, coverage, valueFormat1, valueFormat2,
        sharedPairSets, firstGlyph, secondGlyph, value1, value2;
    // This part is common to format 1 and format 2 subtables
    format = p.parseUShort();
    coverageOffset = p.parseUShort();
    coverage = parseCoverageTable(data, start+coverageOffset);
    // valueFormat 4: XAdvance only, 1: XPlacement only, 0: no ValueRecord for second glyph
    // Only valueFormat1=4 and valueFormat2=0 is supported.
    valueFormat1 = p.parseUShort();
    valueFormat2 = p.parseUShort();
    if (valueFormat1 !== 4 || valueFormat2 !== 0) return;
    sharedPairSets = {};
    if (format === 1) {
        // Pair Positioning Adjustment: Format 1
        var pairSetCount, pairSetOffsets, pairSetOffset, sharedPairSet, pairValueCount, pairSet;
        pairSetCount = p.parseUShort();
        pairSet = [];
        // Array of offsets to PairSet tables-from beginning of PairPos subtable-ordered by Coverage Index
        pairSetOffsets = p.parseOffset16List(pairSetCount);
        for (firstGlyph = 0; firstGlyph < pairSetCount; firstGlyph++) {
            pairSetOffset = pairSetOffsets[firstGlyph];
            sharedPairSet = sharedPairSets[pairSetOffset];
            if (!sharedPairSet) {
                // Parse a pairset table in a pair adjustment subtable format 1
                sharedPairSet = {};
                p.relativeOffset = pairSetOffset;
                pairValueCount = p.parseUShort();
                for (; pairValueCount--;) {
                    secondGlyph = p.parseUShort();
                    if (valueFormat1) value1 = p.parseShort();
                    if (valueFormat2) value2 = p.parseShort();
                    // We only support valueFormat1 = 4 and valueFormat2 = 0,
                    // so value1 is the XAdvance and value2 is empty.
                    sharedPairSet[secondGlyph] = value1;
                }
            }
            pairSet[coverage[firstGlyph]] = sharedPairSet;
        }
        return function(leftGlyph, rightGlyph) {
            var pairs = pairSet[leftGlyph];
            if (pairs) return pairs[rightGlyph];
        };
    }
    else if (format === 2) {
        // Pair Positioning Adjustment: Format 2
        var classDef1Offset, classDef2Offset, class1Count, class2Count, i, j,
            getClass1, getClass2, kerningMatrix, kerningRow, covered;
        classDef1Offset = p.parseUShort();
        classDef2Offset = p.parseUShort();
        class1Count = p.parseUShort();
        class2Count = p.parseUShort();
        getClass1 = parseClassDefTable(data, start+classDef1Offset);
        getClass2 = parseClassDefTable(data, start+classDef2Offset);

        // Parse kerning values by class pair.
        kerningMatrix = [];
        for (i = 0; i < class1Count; i++) {
            kerningRow = kerningMatrix[i] = [];
            for (j = 0; j < class2Count; j++) {
                if (valueFormat1) value1 = p.parseShort();
                if (valueFormat2) value2 = p.parseShort();
                // We only support valueFormat1 = 4 and valueFormat2 = 0,
                // so value1 is the XAdvance and value2 is empty.
                kerningRow[j] = value1;
            }
        }

        // Convert coverage list to a hash
        covered = {};
        for(i = 0; i < coverage.length; i++) covered[coverage[i]] = 1;

        // Get the kerning value for a specific glyph pair.
        return function(leftGlyph, rightGlyph) {
            if (!covered[leftGlyph]) return 0;
            var class1 = getClass1(leftGlyph),
                class2 = getClass2(rightGlyph),
                kerningRow = kerningMatrix[class1];
            return kerningRow ? kerningRow[class2] : 0;
        };
    }
}

// Parse a LookupTable (present in of GPOS, GSUB, GDEF, BASE, JSTF tables).
function parseLookupTable(data, start) {
    var p = new parse.Parser(data, start);
    var table, lookupType, lookupFlag, useMarkFilteringSet, subTableCount, subTableOffsets, subtables, i;
    lookupType = p.parseUShort();
    lookupFlag = p.parseUShort();
    useMarkFilteringSet = lookupFlag & 0x10;
    subTableCount = p.parseUShort();
    subTableOffsets = p.parseOffset16List(subTableCount);
    table = {
        lookupType: lookupType,
        lookupFlag: lookupFlag,
        markFilteringSet: useMarkFilteringSet ? p.parseUShort() : -1
    };
    // LookupType 2, Pair adjustment
    if (lookupType === 2) {
        subtables = [];
        for (i = 0; i < subTableCount; i++) {
            subtables.push(parsePairPosSubTable(data, start + subTableOffsets[i]));
        }
        // Return a function which finds the kerning values in the subtables.
        table.getKerningValue = function(leftGlyph, rightGlyph) {
            for (var i = subtables.length; i--;) {
                var value = subtables[i](leftGlyph, rightGlyph);
                if (value !== undefined) return value;
            }
            return 0;
        };
    }
    return table;
}

// Parse the `GPOS` table which contains, among other things, kerning pairs.
// https://www.microsoft.com/typography/OTSPEC/gpos.htm
function parseGposTable(data, start, font) {
    var p, tableVersion, lookupListOffset, scriptList, i, featureList, lookupCount,
        lookupTableOffsets, lookupListAbsoluteOffset, table;

    p = new parse.Parser(data, start);
    tableVersion = p.parseFixed();
    checkArgument(tableVersion === 1, 'Unsupported GPOS table version.');

    // ScriptList and FeatureList - ignored for now
    scriptList = parseTaggedListTable(data, start+p.parseUShort());
    // 'kern' is the feature we are looking for.
    featureList = parseTaggedListTable(data, start+p.parseUShort());

    // LookupList
    lookupListOffset = p.parseUShort();
    p.relativeOffset = lookupListOffset;
    lookupCount = p.parseUShort();
    lookupTableOffsets = p.parseOffset16List(lookupCount);
    lookupListAbsoluteOffset = start + lookupListOffset;
    for (i = 0; i < lookupCount; i++) {
        table = parseLookupTable(data, lookupListAbsoluteOffset + lookupTableOffsets[i]);
        if (table.lookupType === 2 && !font.getGposKerningValue) font.getGposKerningValue = table.getKerningValue;
    }
}

// File loaders /////////////////////////////////////////////////////////

// Convert a Node.js Buffer to an ArrayBuffer
function toArrayBuffer(buffer) {
    var i,
        arrayBuffer = new ArrayBuffer(buffer.length),
        data = new Uint8Array(arrayBuffer);

    for (i = 0; i < buffer.length; i += 1) {
        data[i] = buffer[i];
    }

    return arrayBuffer;
}

function loadFromFile(path, callback) {
    var fs = _dereq_('fs');
    fs.readFile(path, function (err, buffer) {
        if (err) {
            return callback(err.message);
        }

        callback(null, toArrayBuffer(buffer));
    });
}

function loadFromUrl(url, callback) {
    var request = new XMLHttpRequest();
    request.open('get', url, true);
    request.responseType = 'arraybuffer';
    request.onload = function () {
        if (request.status !== 200) {
            return callback('Font could not be loaded: ' + request.statusText);
        }
        return callback(null, request.response);
    };
    request.send();
}

// Public API ///////////////////////////////////////////////////////////

// Parse the OpenType file data (as an ArrayBuffer) and return a Font object.
// If the file could not be parsed (most likely because it contains Postscript outlines)
// we return an empty Font object with the `supported` flag set to `false`.
opentype.parse = function (buffer) {
    var font, data, version, numTables, i, p, tag, offset, hmtxOffset, glyfOffset, locaOffset,
        cffOffset, kernOffset, gposOffset, indexToLocFormat, numGlyphs, loca,
        shortVersion;
    // OpenType fonts use big endian byte ordering.
    // We can't rely on typed array view types, because they operate with the endianness of the host computer.
    // Instead we use DataViews where we can specify endianness.

    font = new Font();
    data = new DataView(buffer, 0);

    version = parse.getFixed(data, 0);
    if (version === 1.0) {
        font.outlinesFormat = 'truetype';
    } else {
        version = parse.getTag(data, 0);
        if (version === 'OTTO') {
            font.outlinesFormat = 'cff';
        } else {
            throw new Error('Unsupported OpenType version ' + version);
        }
    }

    numTables = parse.getUShort(data, 4);

    // Offset into the table records.
    p = 12;
    for (i = 0; i < numTables; i += 1) {
        tag = parse.getTag(data, p);
        offset = parse.getULong(data, p + 8);
        switch (tag) {
        case 'cmap':
            font.tables.cmap = parseCmapTable(data, offset);
            font.encoding = new CmapEncoding(font.tables.cmap.segments);
            if (!font.encoding) {
                font.supported = false;
            }
            break;
        case 'head':
            font.tables.head = parseHeadTable(data, offset);
            font.unitsPerEm = font.tables.head.unitsPerEm;
            indexToLocFormat = font.tables.head.indexToLocFormat;
            break;
        case 'hhea':
            font.tables.hhea = parseHheaTable(data, offset);
            font.ascender = font.tables.hhea.ascender;
            font.descender = font.tables.hhea.descender;
            font.numberOfHMetrics = font.tables.hhea.numberOfHMetrics;
            break;
        case 'hmtx':
            hmtxOffset = offset;
            break;
        case 'maxp':
            font.tables.maxp = parseMaxpTable(data, offset);
            font.numGlyphs = numGlyphs = font.tables.maxp.numGlyphs;
            break;
        case 'name':
             font.tables.name = parseNameTable(data, offset);
            break;
        case 'OS/2':
            font.tables.os2 = parseOS2Table(data, offset);
            break;
        case 'post':
            font.tables.post = parsePostTable(data, offset);
            font.glyphNames = new GlyphNames(font.tables.post);
            break;
        case 'glyf':
            glyfOffset = offset;
            break;
        case 'loca':
            locaOffset = offset;
            break;
        case 'CFF ':
            cffOffset = offset;
            break;
        case 'kern':
            kernOffset = offset;
            break;
        case 'GPOS':
            gposOffset = offset;
            break;
        }
        p += 16;
    }

    if (glyfOffset && locaOffset) {
        shortVersion = indexToLocFormat === 0;
        loca = parseLocaTable(data, locaOffset, numGlyphs, shortVersion);
        font.glyphs = parseGlyfTable(data, glyfOffset, loca, font);
        parseHmtxTable(data, hmtxOffset, font.numberOfHMetrics, font.numGlyphs, font.glyphs);
    } else if (cffOffset) {
        parseCFFTable(data, cffOffset, font);
    } else {
        font.supported = false;
    }

    if (font.supported) {
        if (kernOffset) {
            font.kerningPairs = parseKernTable(data, kernOffset);
        } else {
            font.kerningPairs = {};
        }
        if (gposOffset) {
            parseGposTable(data, gposOffset, font);
        }
    }

    return font;
};

// Asynchronously load the font from a URL or a filesystem. When done, call the callback
// with two arguments `(err, font)`. The `err` will be null on success,
// the `font` is a Font object.
//
// We use the node.js callback convention so that
// opentype.js can integrate with frameworks like async.js.
opentype.load = function (url, callback) {
    var loader = typeof process === 'undefined' || !process.browser ? loadFromFile : loadFromUrl;
    loader(url, function (err, arrayBuffer) {
        if (err) {
            return callback(err);
        }
        var font = opentype.parse(arrayBuffer);
        if (!font.supported) {
            return callback('Font is not supported (is this a Postscript font?)');
        }
        return callback(null, font);
    });
};

// Module support ///////////////////////////////////////////////////////

module.exports = opentype;

}).call(this,_dereq_("FWaASH"))
},{"./draw":3,"./parse":5,"./path":6,"FWaASH":2,"fs":1}],5:[function(_dereq_,module,exports){
// Parsing utility functions

'use strict';

// Retrieve an unsigned byte from the DataView.
exports.getByte = function getByte(dataView, offset) {
    return dataView.getUint8(offset);
};

exports.getCard8 = exports.getByte;

// Retrieve an unsigned 16-bit short from the DataView.
// The value is stored in big endian.
exports.getUShort = function (dataView, offset) {
    return dataView.getUint16(offset, false);
};

exports.getCard16 = exports.getUShort;

// Retrieve a signed 16-bit short from the DataView.
// The value is stored in big endian.
exports.getShort = function (dataView, offset) {
    return dataView.getInt16(offset, false);
};

// Retrieve an unsigned 32-bit long from the DataView.
// The value is stored in big endian.
exports.getULong = function (dataView, offset) {
    return dataView.getUint32(offset, false);
};

// Retrieve a 32-bit signed fixed-point number (16.16) from the DataView.
// The value is stored in big endian.
exports.getFixed = function (dataView, offset) {
    var decimal, fraction;
    decimal = dataView.getInt16(offset, false);
    fraction = dataView.getUint16(offset + 2, false);
    return decimal + fraction / 65535;
};

// Retrieve a 4-character tag from the DataView.
// Tags are used to identify tables.
exports.getTag = function (dataView, offset) {
    var tag = '', i;
    for (i = offset; i < offset + 4; i += 1) {
        tag += String.fromCharCode(dataView.getInt8(i));
    }
    return tag;
};

// Retrieve an offset from the DataView.
// Offsets are 1 to 4 bytes in length, depending on the offSize argument.
exports.getOffset = function (dataView, offset, offSize) {
    var i, v;
    v = 0;
    for (i = 0; i < offSize; i += 1) {
        v <<= 8;
        v += dataView.getUint8(offset + i);
    }
    return v;
};

// Retrieve a number of bytes from start offset to the end offset from the DataView.
exports.getBytes = function (dataView, startOffset, endOffset) {
    var bytes, i;
    bytes = [];
    for (i = startOffset; i < endOffset; i += 1) {
        bytes.push(dataView.getUint8(i));
    }
    return bytes;
};

// Convert the list of bytes to a string.
exports.bytesToString = function (bytes) {
    var s, i;
    s = '';
    for (i = 0; i < bytes.length; i += 1) {
        s += String.fromCharCode(bytes[i]);
    }
    return s;
};

var typeOffsets = {
    byte: 1,
    uShort: 2,
    short: 2,
    uLong: 4,
    fixed: 4,
    longDateTime: 8,
    tag: 4
};

// A stateful parser that changes the offset whenever a value is retrieved.
// The data is a DataView.
function Parser(data, offset) {
    this.data = data;
    this.offset = offset;
    this.relativeOffset = 0;
}

Parser.prototype.parseByte = function () {
    var v = this.data.getUint8(this.offset + this.relativeOffset);
    this.relativeOffset += 1;
    return v;
};

Parser.prototype.parseChar = function () {
    var v = this.data.getInt8(this.offset + this.relativeOffset);
    this.relativeOffset += 1;
    return v;
};

Parser.prototype.parseCard8 = Parser.prototype.parseByte;

Parser.prototype.parseUShort = function () {
    var v = this.data.getUint16(this.offset + this.relativeOffset);
    this.relativeOffset += 2;
    return v;
};
Parser.prototype.parseCard16 = Parser.prototype.parseUShort;
Parser.prototype.parseSID = Parser.prototype.parseUShort;
Parser.prototype.parseOffset16 = Parser.prototype.parseUShort;

Parser.prototype.parseShort = function () {
    var v = this.data.getInt16(this.offset + this.relativeOffset);
    this.relativeOffset += 2;
    return v;
};

Parser.prototype.parseULong = function () {
    var v = exports.getULong(this.data, this.offset + this.relativeOffset);
    this.relativeOffset += 4;
    return v;
};

Parser.prototype.parseFixed = function () {
    var v = exports.getFixed(this.data, this.offset + this.relativeOffset);
    this.relativeOffset += 4;
    return v;
};

Parser.prototype.parseOffset16List =
Parser.prototype.parseUShortList = function (count) {
    var offsets = new Array(count),
        dataView = this.data,
        offset = this.offset + this.relativeOffset;
    for (var i = 0; i < count; i++) {
        offsets[i] = exports.getUShort(dataView, offset);
        offset += 2;
    }
    this.relativeOffset += count * 2;
    return offsets;
};

Parser.prototype.parseString = function (length) {
    var dataView = this.data,
        offset = this.offset + this.relativeOffset,
        string = '';
    this.relativeOffset += length;
    for (var i = 0; i < length; i++) {
        string += String.fromCharCode(dataView.getUint8(offset + i));
    }
    return string;
};

Parser.prototype.parseTag = function () {
    return this.parseString(4);
};

// LONGDATETIME is a 64-bit integer.
// JavaScript and unix timestamps traditionally use 32 bits, so we
// only take the last 32 bits.
Parser.prototype.parseLongDateTime = function() {
    var v = exports.getULong(this.data, this.offset + this.relativeOffset + 4);
    this.relativeOffset += 8;
    return v;
};

Parser.prototype.parseFixed = function() {
    var v = exports.getULong(this.data, this.offset + this.relativeOffset);
    this.relativeOffset += 4;
    return v / 65536;
};

Parser.prototype.parseVersion = function() {
    var major = exports.getUShort(this.data, this.offset + this.relativeOffset);
    // How to interpret the minor version is very vague in the spec. 0x5000 is 5, 0x1000 is 1
    // This returns the correct number if minor = 0xN000 where N is 0-9
    var minor = exports.getUShort(this.data, this.offset + this.relativeOffset + 2);
    this.relativeOffset += 4;
    return major + minor / 0x1000 / 10;
};

Parser.prototype.skip = function (type, amount) {
    if (amount === undefined) {
        amount = 1;
    }
    this.relativeOffset += typeOffsets[type] * amount;
};

exports.Parser = Parser;

},{}],6:[function(_dereq_,module,exports){
// Geometric objects

'use strict';

// A bézier path containing a set of path commands similar to a SVG path.
// Paths can be drawn on a context using `draw`.
function Path() {
    this.commands = [];
    this.fill = 'black';
    this.stroke = null;
    this.strokeWidth = 1;
}

Path.prototype.moveTo = function (x, y) {
    this.commands.push({type: 'M', x: x, y: y});
};

Path.prototype.lineTo = function (x, y) {
    this.commands.push({type: 'L', x: x, y: y});
};

Path.prototype.curveTo = Path.prototype.bezierCurveTo = function (x1, y1, x2, y2, x, y) {
    this.commands.push({type: 'C', x1: x1, y1: y1, x2: x2, y2: y2, x: x, y: y});
};

Path.prototype.quadTo = Path.prototype.quadraticCurveTo = function (x1, y1, x, y) {
    this.commands.push({type: 'Q', x1: x1, y1: y1, x: x, y: y});
};

Path.prototype.close = Path.prototype.closePath = function () {
    this.commands.push({type: 'Z'});
};

// Add the given path or list of commands to the commands of this path.
Path.prototype.extend = function (pathOrCommands) {
    if (pathOrCommands.commands) {
        pathOrCommands = pathOrCommands.commands;
    }
    Array.prototype.push.apply(this.commands, pathOrCommands);
};

// Draw the path to a 2D context.
Path.prototype.draw = function (ctx) {
    var i, cmd;
    ctx.beginPath();
    for (i = 0; i < this.commands.length; i += 1) {
        cmd = this.commands[i];
        if (cmd.type === 'M') {
            ctx.moveTo(cmd.x, cmd.y);
        } else if (cmd.type === 'L') {
            ctx.lineTo(cmd.x, cmd.y);
        } else if (cmd.type === 'C') {
            ctx.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
        } else if (cmd.type === 'Q') {
            ctx.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y);
        } else if (cmd.type === 'Z') {
            ctx.closePath();
        }
    }
    if (this.fill) {
        ctx.fillStyle = this.fill;
        ctx.fill();
    }
    if (this.stroke) {
        ctx.strokeStyle = this.stroke;
        ctx.lineWidth = this.strokeWidth;
        ctx.stroke();
    }
};

exports.Path = Path;

},{}]},{},[4])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvZmRiL1Byb2plY3RzL29wZW50eXBlLmpzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvZmRiL1Byb2plY3RzL29wZW50eXBlLmpzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L2xpYi9fZW1wdHkuanMiLCIvVXNlcnMvZmRiL1Byb2plY3RzL29wZW50eXBlLmpzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCIvVXNlcnMvZmRiL1Byb2plY3RzL29wZW50eXBlLmpzL3NyYy9kcmF3LmpzIiwiL1VzZXJzL2ZkYi9Qcm9qZWN0cy9vcGVudHlwZS5qcy9zcmMvb3BlbnR5cGUuanMiLCIvVXNlcnMvZmRiL1Byb2plY3RzL29wZW50eXBlLmpzL3NyYy9wYXJzZS5qcyIsIi9Vc2Vycy9mZGIvUHJvamVjdHMvb3BlbnR5cGUuanMvc3JjL3BhdGguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3p0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDek1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIixudWxsLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gRHJhdyBhIGxpbmUgb24gdGhlIGdpdmVuIGNvbnRleHQgZnJvbSBwb2ludCBgeDEseTFgIHRvIHBvaW50IGB4Mix5MmAuXG5mdW5jdGlvbiBsaW5lKGN0eCwgeDEsIHkxLCB4MiwgeTIpIHtcbiAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgY3R4Lm1vdmVUbyh4MSwgeTEpO1xuICAgIGN0eC5saW5lVG8oeDIsIHkyKTtcbiAgICBjdHguc3Ryb2tlKCk7XG59XG5cbmV4cG9ydHMubGluZSA9IGxpbmU7XG4iLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuLy8gb3BlbnR5cGUuanNcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlYm94L29wZW50eXBlLmpzXG4vLyAoYykgMjAxNCBGcmVkZXJpayBEZSBCbGVzZXJcbi8vIG9wZW50eXBlLmpzIG1heSBiZSBmcmVlbHkgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxuXG4vKiBnbG9iYWwgbW9kdWxlLCBEYXRhVmlldywgWE1MSHR0cFJlcXVlc3QsIHJlcXVpcmUsIEFycmF5QnVmZmVyLCBVaW50OEFycmF5ICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGRyYXcgPSByZXF1aXJlKCcuL2RyYXcnKTtcbnZhciBwYXJzZSA9IHJlcXVpcmUoJy4vcGFyc2UnKTtcbnZhciBwYXRoID0gcmVxdWlyZSgnLi9wYXRoJyk7XG5cbi8vIFRoZSBleHBvcnRlZCBvYmplY3QgLyBuYW1lc3BhY2UuXG52YXIgb3BlbnR5cGUgPSB7fTtcblxuLy8gUHJlY29uZGl0aW9uIGZ1bmN0aW9uIHRoYXQgY2hlY2tzIGlmIHRoZSBnaXZlbiBwcmVkaWNhdGUgaXMgdHJ1ZS5cbi8vIElmIG5vdCwgaXQgd2lsbCBsb2cgYW4gZXJyb3IgbWVzc2FnZSB0byB0aGUgY29uc29sZS5cbmZ1bmN0aW9uIGNoZWNrQXJndW1lbnQocHJlZGljYXRlLCBtZXNzYWdlKSB7XG4gICAgaWYgKCFwcmVkaWNhdGUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UpO1xuICAgIH1cbn1cblxuLy8gRW5jb2Rpbmcgb2JqZWN0cyAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG52YXIgY2ZmU3RhbmRhcmRTdHJpbmdzID0gW1xuICAgICcubm90ZGVmJywgJ3NwYWNlJywgJ2V4Y2xhbScsICdxdW90ZWRibCcsICdudW1iZXJzaWduJywgJ2RvbGxhcicsICdwZXJjZW50JywgJ2FtcGVyc2FuZCcsICdxdW90ZXJpZ2h0JyxcbiAgICAncGFyZW5sZWZ0JywgJ3BhcmVucmlnaHQnLCAnYXN0ZXJpc2snLCAncGx1cycsICdjb21tYScsICdoeXBoZW4nLCAncGVyaW9kJywgJ3NsYXNoJywgJ3plcm8nLCAnb25lJywgJ3R3bycsXG4gICAgJ3RocmVlJywgJ2ZvdXInLCAnZml2ZScsICdzaXgnLCAnc2V2ZW4nLCAnZWlnaHQnLCAnbmluZScsICdjb2xvbicsICdzZW1pY29sb24nLCAnbGVzcycsICdlcXVhbCcsICdncmVhdGVyJyxcbiAgICAncXVlc3Rpb24nLCAnYXQnLCAnQScsICdCJywgJ0MnLCAnRCcsICdFJywgJ0YnLCAnRycsICdIJywgJ0knLCAnSicsICdLJywgJ0wnLCAnTScsICdOJywgJ08nLCAnUCcsICdRJywgJ1InLCAnUycsXG4gICAgJ1QnLCAnVScsICdWJywgJ1cnLCAnWCcsICdZJywgJ1onLCAnYnJhY2tldGxlZnQnLCAnYmFja3NsYXNoJywgJ2JyYWNrZXRyaWdodCcsICdhc2NpaWNpcmN1bScsICd1bmRlcnNjb3JlJyxcbiAgICAncXVvdGVsZWZ0JywgJ2EnLCAnYicsICdjJywgJ2QnLCAnZScsICdmJywgJ2cnLCAnaCcsICdpJywgJ2onLCAnaycsICdsJywgJ20nLCAnbicsICdvJywgJ3AnLCAncScsICdyJywgJ3MnLCAndCcsXG4gICAgJ3UnLCAndicsICd3JywgJ3gnLCAneScsICd6JywgJ2JyYWNlbGVmdCcsICdiYXInLCAnYnJhY2VyaWdodCcsICdhc2NpaXRpbGRlJywgJ2V4Y2xhbWRvd24nLCAnY2VudCcsICdzdGVybGluZycsXG4gICAgJ2ZyYWN0aW9uJywgJ3llbicsICdmbG9yaW4nLCAnc2VjdGlvbicsICdjdXJyZW5jeScsICdxdW90ZXNpbmdsZScsICdxdW90ZWRibGxlZnQnLCAnZ3VpbGxlbW90bGVmdCcsXG4gICAgJ2d1aWxzaW5nbGxlZnQnLCAnZ3VpbHNpbmdscmlnaHQnLCAnZmknLCAnZmwnLCAnZW5kYXNoJywgJ2RhZ2dlcicsICdkYWdnZXJkYmwnLCAncGVyaW9kY2VudGVyZWQnLCAncGFyYWdyYXBoJyxcbiAgICAnYnVsbGV0JywgJ3F1b3Rlc2luZ2xiYXNlJywgJ3F1b3RlZGJsYmFzZScsICdxdW90ZWRibHJpZ2h0JywgJ2d1aWxsZW1vdHJpZ2h0JywgJ2VsbGlwc2lzJywgJ3BlcnRob3VzYW5kJyxcbiAgICAncXVlc3Rpb25kb3duJywgJ2dyYXZlJywgJ2FjdXRlJywgJ2NpcmN1bWZsZXgnLCAndGlsZGUnLCAnbWFjcm9uJywgJ2JyZXZlJywgJ2RvdGFjY2VudCcsICdkaWVyZXNpcycsICdyaW5nJyxcbiAgICAnY2VkaWxsYScsICdodW5nYXJ1bWxhdXQnLCAnb2dvbmVrJywgJ2Nhcm9uJywgJ2VtZGFzaCcsICdBRScsICdvcmRmZW1pbmluZScsICdMc2xhc2gnLCAnT3NsYXNoJywgJ09FJyxcbiAgICAnb3JkbWFzY3VsaW5lJywgJ2FlJywgJ2RvdGxlc3NpJywgJ2xzbGFzaCcsICdvc2xhc2gnLCAnb2UnLCAnZ2VybWFuZGJscycsICdvbmVzdXBlcmlvcicsICdsb2dpY2Fsbm90JywgJ211JyxcbiAgICAndHJhZGVtYXJrJywgJ0V0aCcsICdvbmVoYWxmJywgJ3BsdXNtaW51cycsICdUaG9ybicsICdvbmVxdWFydGVyJywgJ2RpdmlkZScsICdicm9rZW5iYXInLCAnZGVncmVlJywgJ3Rob3JuJyxcbiAgICAndGhyZWVxdWFydGVycycsICd0d29zdXBlcmlvcicsICdyZWdpc3RlcmVkJywgJ21pbnVzJywgJ2V0aCcsICdtdWx0aXBseScsICd0aHJlZXN1cGVyaW9yJywgJ2NvcHlyaWdodCcsXG4gICAgJ0FhY3V0ZScsICdBY2lyY3VtZmxleCcsICdBZGllcmVzaXMnLCAnQWdyYXZlJywgJ0FyaW5nJywgJ0F0aWxkZScsICdDY2VkaWxsYScsICdFYWN1dGUnLCAnRWNpcmN1bWZsZXgnLFxuICAgICdFZGllcmVzaXMnLCAnRWdyYXZlJywgJ0lhY3V0ZScsICdJY2lyY3VtZmxleCcsICdJZGllcmVzaXMnLCAnSWdyYXZlJywgJ050aWxkZScsICdPYWN1dGUnLCAnT2NpcmN1bWZsZXgnLFxuICAgICdPZGllcmVzaXMnLCAnT2dyYXZlJywgJ090aWxkZScsICdTY2Fyb24nLCAnVWFjdXRlJywgJ1VjaXJjdW1mbGV4JywgJ1VkaWVyZXNpcycsICdVZ3JhdmUnLCAnWWFjdXRlJyxcbiAgICAnWWRpZXJlc2lzJywgJ1pjYXJvbicsICdhYWN1dGUnLCAnYWNpcmN1bWZsZXgnLCAnYWRpZXJlc2lzJywgJ2FncmF2ZScsICdhcmluZycsICdhdGlsZGUnLCAnY2NlZGlsbGEnLCAnZWFjdXRlJyxcbiAgICAnZWNpcmN1bWZsZXgnLCAnZWRpZXJlc2lzJywgJ2VncmF2ZScsICdpYWN1dGUnLCAnaWNpcmN1bWZsZXgnLCAnaWRpZXJlc2lzJywgJ2lncmF2ZScsICdudGlsZGUnLCAnb2FjdXRlJyxcbiAgICAnb2NpcmN1bWZsZXgnLCAnb2RpZXJlc2lzJywgJ29ncmF2ZScsICdvdGlsZGUnLCAnc2Nhcm9uJywgJ3VhY3V0ZScsICd1Y2lyY3VtZmxleCcsICd1ZGllcmVzaXMnLCAndWdyYXZlJyxcbiAgICAneWFjdXRlJywgJ3lkaWVyZXNpcycsICd6Y2Fyb24nLCAnZXhjbGFtc21hbGwnLCAnSHVuZ2FydW1sYXV0c21hbGwnLCAnZG9sbGFyb2xkc3R5bGUnLCAnZG9sbGFyc3VwZXJpb3InLFxuICAgICdhbXBlcnNhbmRzbWFsbCcsICdBY3V0ZXNtYWxsJywgJ3BhcmVubGVmdHN1cGVyaW9yJywgJ3BhcmVucmlnaHRzdXBlcmlvcicsICcyNjYgZmYnLCAnb25lZG90ZW5sZWFkZXInLFxuICAgICd6ZXJvb2xkc3R5bGUnLCAnb25lb2xkc3R5bGUnLCAndHdvb2xkc3R5bGUnLCAndGhyZWVvbGRzdHlsZScsICdmb3Vyb2xkc3R5bGUnLCAnZml2ZW9sZHN0eWxlJywgJ3NpeG9sZHN0eWxlJyxcbiAgICAnc2V2ZW5vbGRzdHlsZScsICdlaWdodG9sZHN0eWxlJywgJ25pbmVvbGRzdHlsZScsICdjb21tYXN1cGVyaW9yJywgJ3RocmVlcXVhcnRlcnNlbWRhc2gnLCAncGVyaW9kc3VwZXJpb3InLFxuICAgICdxdWVzdGlvbnNtYWxsJywgJ2FzdXBlcmlvcicsICdic3VwZXJpb3InLCAnY2VudHN1cGVyaW9yJywgJ2RzdXBlcmlvcicsICdlc3VwZXJpb3InLCAnaXN1cGVyaW9yJywgJ2xzdXBlcmlvcicsXG4gICAgJ21zdXBlcmlvcicsICduc3VwZXJpb3InLCAnb3N1cGVyaW9yJywgJ3JzdXBlcmlvcicsICdzc3VwZXJpb3InLCAndHN1cGVyaW9yJywgJ2ZmJywgJ2ZmaScsICdmZmwnLFxuICAgICdwYXJlbmxlZnRpbmZlcmlvcicsICdwYXJlbnJpZ2h0aW5mZXJpb3InLCAnQ2lyY3VtZmxleHNtYWxsJywgJ2h5cGhlbnN1cGVyaW9yJywgJ0dyYXZlc21hbGwnLCAnQXNtYWxsJyxcbiAgICAnQnNtYWxsJywgJ0NzbWFsbCcsICdEc21hbGwnLCAnRXNtYWxsJywgJ0ZzbWFsbCcsICdHc21hbGwnLCAnSHNtYWxsJywgJ0lzbWFsbCcsICdKc21hbGwnLCAnS3NtYWxsJywgJ0xzbWFsbCcsXG4gICAgJ01zbWFsbCcsICdOc21hbGwnLCAnT3NtYWxsJywgJ1BzbWFsbCcsICdRc21hbGwnLCAnUnNtYWxsJywgJ1NzbWFsbCcsICdUc21hbGwnLCAnVXNtYWxsJywgJ1ZzbWFsbCcsICdXc21hbGwnLFxuICAgICdYc21hbGwnLCAnWXNtYWxsJywgJ1pzbWFsbCcsICdjb2xvbm1vbmV0YXJ5JywgJ29uZWZpdHRlZCcsICdydXBpYWgnLCAnVGlsZGVzbWFsbCcsICdleGNsYW1kb3duc21hbGwnLFxuICAgICdjZW50b2xkc3R5bGUnLCAnTHNsYXNoc21hbGwnLCAnU2Nhcm9uc21hbGwnLCAnWmNhcm9uc21hbGwnLCAnRGllcmVzaXNzbWFsbCcsICdCcmV2ZXNtYWxsJywgJ0Nhcm9uc21hbGwnLFxuICAgICdEb3RhY2NlbnRzbWFsbCcsICdNYWNyb25zbWFsbCcsICdmaWd1cmVkYXNoJywgJ2h5cGhlbmluZmVyaW9yJywgJ09nb25la3NtYWxsJywgJ1JpbmdzbWFsbCcsICdDZWRpbGxhc21hbGwnLFxuICAgICdxdWVzdGlvbmRvd25zbWFsbCcsICdvbmVlaWdodGgnLCAndGhyZWVlaWdodGhzJywgJ2ZpdmVlaWdodGhzJywgJ3NldmVuZWlnaHRocycsICdvbmV0aGlyZCcsICd0d290aGlyZHMnLFxuICAgICd6ZXJvc3VwZXJpb3InLCAnZm91cnN1cGVyaW9yJywgJ2ZpdmVzdXBlcmlvcicsICdzaXhzdXBlcmlvcicsICdzZXZlbnN1cGVyaW9yJywgJ2VpZ2h0c3VwZXJpb3InLCAnbmluZXN1cGVyaW9yJyxcbiAgICAnemVyb2luZmVyaW9yJywgJ29uZWluZmVyaW9yJywgJ3R3b2luZmVyaW9yJywgJ3RocmVlaW5mZXJpb3InLCAnZm91cmluZmVyaW9yJywgJ2ZpdmVpbmZlcmlvcicsICdzaXhpbmZlcmlvcicsXG4gICAgJ3NldmVuaW5mZXJpb3InLCAnZWlnaHRpbmZlcmlvcicsICduaW5laW5mZXJpb3InLCAnY2VudGluZmVyaW9yJywgJ2RvbGxhcmluZmVyaW9yJywgJ3BlcmlvZGluZmVyaW9yJyxcbiAgICAnY29tbWFpbmZlcmlvcicsICdBZ3JhdmVzbWFsbCcsICdBYWN1dGVzbWFsbCcsICdBY2lyY3VtZmxleHNtYWxsJywgJ0F0aWxkZXNtYWxsJywgJ0FkaWVyZXNpc3NtYWxsJyxcbiAgICAnQXJpbmdzbWFsbCcsICdBRXNtYWxsJywgJ0NjZWRpbGxhc21hbGwnLCAnRWdyYXZlc21hbGwnLCAnRWFjdXRlc21hbGwnLCAnRWNpcmN1bWZsZXhzbWFsbCcsICdFZGllcmVzaXNzbWFsbCcsXG4gICAgJ0lncmF2ZXNtYWxsJywgJ0lhY3V0ZXNtYWxsJywgJ0ljaXJjdW1mbGV4c21hbGwnLCAnSWRpZXJlc2lzc21hbGwnLCAnRXRoc21hbGwnLCAnTnRpbGRlc21hbGwnLCAnT2dyYXZlc21hbGwnLFxuICAgICdPYWN1dGVzbWFsbCcsICdPY2lyY3VtZmxleHNtYWxsJywgJ090aWxkZXNtYWxsJywgJ09kaWVyZXNpc3NtYWxsJywgJ09Fc21hbGwnLCAnT3NsYXNoc21hbGwnLCAnVWdyYXZlc21hbGwnLFxuICAgICdVYWN1dGVzbWFsbCcsICdVY2lyY3VtZmxleHNtYWxsJywgJ1VkaWVyZXNpc3NtYWxsJywgJ1lhY3V0ZXNtYWxsJywgJ1Rob3Juc21hbGwnLCAnWWRpZXJlc2lzc21hbGwnLCAnMDAxLjAwMCcsXG4gICAgJzAwMS4wMDEnLCAnMDAxLjAwMicsICcwMDEuMDAzJywgJ0JsYWNrJywgJ0JvbGQnLCAnQm9vaycsICdMaWdodCcsICdNZWRpdW0nLCAnUmVndWxhcicsICdSb21hbicsICdTZW1pYm9sZCddO1xuXG52YXIgY2ZmU3RhbmRhcmRFbmNvZGluZyA9IFtcbiAgICAnJywgJycsICcnLCAnJywgJycsICcnLCAnJywgJycsICcnLCAnJywgJycsICcnLCAnJywgJycsICcnLCAnJywgJycsICcnLCAnJywgJycsICcnLCAnJywgJycsICcnLCAnJywgJycsICcnLCAnJyxcbiAgICAnJywgJycsICcnLCAnJywgJ3NwYWNlJywgJ2V4Y2xhbScsICdxdW90ZWRibCcsICdudW1iZXJzaWduJywgJ2RvbGxhcicsICdwZXJjZW50JywgJ2FtcGVyc2FuZCcsICdxdW90ZXJpZ2h0JyxcbiAgICAncGFyZW5sZWZ0JywgJ3BhcmVucmlnaHQnLCAnYXN0ZXJpc2snLCAncGx1cycsICdjb21tYScsICdoeXBoZW4nLCAncGVyaW9kJywgJ3NsYXNoJywgJ3plcm8nLCAnb25lJywgJ3R3bycsXG4gICAgJ3RocmVlJywgJ2ZvdXInLCAnZml2ZScsICdzaXgnLCAnc2V2ZW4nLCAnZWlnaHQnLCAnbmluZScsICdjb2xvbicsICdzZW1pY29sb24nLCAnbGVzcycsICdlcXVhbCcsICdncmVhdGVyJyxcbiAgICAncXVlc3Rpb24nLCAnYXQnLCAnQScsICdCJywgJ0MnLCAnRCcsICdFJywgJ0YnLCAnRycsICdIJywgJ0knLCAnSicsICdLJywgJ0wnLCAnTScsICdOJywgJ08nLCAnUCcsICdRJywgJ1InLCAnUycsXG4gICAgJ1QnLCAnVScsICdWJywgJ1cnLCAnWCcsICdZJywgJ1onLCAnYnJhY2tldGxlZnQnLCAnYmFja3NsYXNoJywgJ2JyYWNrZXRyaWdodCcsICdhc2NpaWNpcmN1bScsICd1bmRlcnNjb3JlJyxcbiAgICAncXVvdGVsZWZ0JywgJ2EnLCAnYicsICdjJywgJ2QnLCAnZScsICdmJywgJ2cnLCAnaCcsICdpJywgJ2onLCAnaycsICdsJywgJ20nLCAnbicsICdvJywgJ3AnLCAncScsICdyJywgJ3MnLCAndCcsXG4gICAgJ3UnLCAndicsICd3JywgJ3gnLCAneScsICd6JywgJ2JyYWNlbGVmdCcsICdiYXInLCAnYnJhY2VyaWdodCcsICdhc2NpaXRpbGRlJywgJycsICcnLCAnJywgJycsICcnLCAnJywgJycsICcnLFxuICAgICcnLCAnJywgJycsICcnLCAnJywgJycsICcnLCAnJywgJycsICcnLCAnJywgJycsICcnLCAnJywgJycsICcnLCAnJywgJycsICcnLCAnJywgJycsICcnLCAnJywgJycsICcnLCAnJyxcbiAgICAnZXhjbGFtZG93bicsICdjZW50JywgJ3N0ZXJsaW5nJywgJ2ZyYWN0aW9uJywgJ3llbicsICdmbG9yaW4nLCAnc2VjdGlvbicsICdjdXJyZW5jeScsICdxdW90ZXNpbmdsZScsXG4gICAgJ3F1b3RlZGJsbGVmdCcsICdndWlsbGVtb3RsZWZ0JywgJ2d1aWxzaW5nbGxlZnQnLCAnZ3VpbHNpbmdscmlnaHQnLCAnZmknLCAnZmwnLCAnJywgJ2VuZGFzaCcsICdkYWdnZXInLFxuICAgICdkYWdnZXJkYmwnLCAncGVyaW9kY2VudGVyZWQnLCAnJywgJ3BhcmFncmFwaCcsICdidWxsZXQnLCAncXVvdGVzaW5nbGJhc2UnLCAncXVvdGVkYmxiYXNlJywgJ3F1b3RlZGJscmlnaHQnLFxuICAgICdndWlsbGVtb3RyaWdodCcsICdlbGxpcHNpcycsICdwZXJ0aG91c2FuZCcsICcnLCAncXVlc3Rpb25kb3duJywgJycsICdncmF2ZScsICdhY3V0ZScsICdjaXJjdW1mbGV4JywgJ3RpbGRlJyxcbiAgICAnbWFjcm9uJywgJ2JyZXZlJywgJ2RvdGFjY2VudCcsICdkaWVyZXNpcycsICcnLCAncmluZycsICdjZWRpbGxhJywgJycsICdodW5nYXJ1bWxhdXQnLCAnb2dvbmVrJywgJ2Nhcm9uJyxcbiAgICAnZW1kYXNoJywgJycsICcnLCAnJywgJycsICcnLCAnJywgJycsICcnLCAnJywgJycsICcnLCAnJywgJycsICcnLCAnJywgJycsICdBRScsICcnLCAnb3JkZmVtaW5pbmUnLCAnJywgJycsICcnLFxuICAgICcnLCAnTHNsYXNoJywgJ09zbGFzaCcsICdPRScsICdvcmRtYXNjdWxpbmUnLCAnJywgJycsICcnLCAnJywgJycsICdhZScsICcnLCAnJywgJycsICdkb3RsZXNzaScsICcnLCAnJyxcbiAgICAnbHNsYXNoJywgJ29zbGFzaCcsICdvZScsICdnZXJtYW5kYmxzJ107XG5cbnZhciBjZmZFeHBlcnRFbmNvZGluZyA9IFtcbiAgICAnJywgJycsICcnLCAnJywgJycsICcnLCAnJywgJycsICcnLCAnJywgJycsICcnLCAnJywgJycsICcnLCAnJywgJycsICcnLCAnJywgJycsICcnLCAnJywgJycsICcnLCAnJywgJycsICcnLCAnJyxcbiAgICAnJywgJycsICcnLCAnJywgJ3NwYWNlJywgJ2V4Y2xhbXNtYWxsJywgJ0h1bmdhcnVtbGF1dHNtYWxsJywgJycsICdkb2xsYXJvbGRzdHlsZScsICdkb2xsYXJzdXBlcmlvcicsXG4gICAgJ2FtcGVyc2FuZHNtYWxsJywgJ0FjdXRlc21hbGwnLCAncGFyZW5sZWZ0c3VwZXJpb3InLCAncGFyZW5yaWdodHN1cGVyaW9yJywgJ3R3b2RvdGVubGVhZGVyJywgJ29uZWRvdGVubGVhZGVyJyxcbiAgICAnY29tbWEnLCAnaHlwaGVuJywgJ3BlcmlvZCcsICdmcmFjdGlvbicsICd6ZXJvb2xkc3R5bGUnLCAnb25lb2xkc3R5bGUnLCAndHdvb2xkc3R5bGUnLCAndGhyZWVvbGRzdHlsZScsXG4gICAgJ2ZvdXJvbGRzdHlsZScsICdmaXZlb2xkc3R5bGUnLCAnc2l4b2xkc3R5bGUnLCAnc2V2ZW5vbGRzdHlsZScsICdlaWdodG9sZHN0eWxlJywgJ25pbmVvbGRzdHlsZScsICdjb2xvbicsXG4gICAgJ3NlbWljb2xvbicsICdjb21tYXN1cGVyaW9yJywgJ3RocmVlcXVhcnRlcnNlbWRhc2gnLCAncGVyaW9kc3VwZXJpb3InLCAncXVlc3Rpb25zbWFsbCcsICcnLCAnYXN1cGVyaW9yJyxcbiAgICAnYnN1cGVyaW9yJywgJ2NlbnRzdXBlcmlvcicsICdkc3VwZXJpb3InLCAnZXN1cGVyaW9yJywgJycsICcnLCAnaXN1cGVyaW9yJywgJycsICcnLCAnbHN1cGVyaW9yJywgJ21zdXBlcmlvcicsXG4gICAgJ25zdXBlcmlvcicsICdvc3VwZXJpb3InLCAnJywgJycsICdyc3VwZXJpb3InLCAnc3N1cGVyaW9yJywgJ3RzdXBlcmlvcicsICcnLCAnZmYnLCAnZmknLCAnZmwnLCAnZmZpJywgJ2ZmbCcsXG4gICAgJ3BhcmVubGVmdGluZmVyaW9yJywgJycsICdwYXJlbnJpZ2h0aW5mZXJpb3InLCAnQ2lyY3VtZmxleHNtYWxsJywgJ2h5cGhlbnN1cGVyaW9yJywgJ0dyYXZlc21hbGwnLCAnQXNtYWxsJyxcbiAgICAnQnNtYWxsJywgJ0NzbWFsbCcsICdEc21hbGwnLCAnRXNtYWxsJywgJ0ZzbWFsbCcsICdHc21hbGwnLCAnSHNtYWxsJywgJ0lzbWFsbCcsICdKc21hbGwnLCAnS3NtYWxsJywgJ0xzbWFsbCcsXG4gICAgJ01zbWFsbCcsICdOc21hbGwnLCAnT3NtYWxsJywgJ1BzbWFsbCcsICdRc21hbGwnLCAnUnNtYWxsJywgJ1NzbWFsbCcsICdUc21hbGwnLCAnVXNtYWxsJywgJ1ZzbWFsbCcsICdXc21hbGwnLFxuICAgICdYc21hbGwnLCAnWXNtYWxsJywgJ1pzbWFsbCcsICdjb2xvbm1vbmV0YXJ5JywgJ29uZWZpdHRlZCcsICdydXBpYWgnLCAnVGlsZGVzbWFsbCcsICcnLCAnJywgJycsICcnLCAnJywgJycsICcnLFxuICAgICcnLCAnJywgJycsICcnLCAnJywgJycsICcnLCAnJywgJycsICcnLCAnJywgJycsICcnLCAnJywgJycsICcnLCAnJywgJycsICcnLCAnJywgJycsICcnLCAnJywgJycsICcnLCAnJywgJycsXG4gICAgJ2V4Y2xhbWRvd25zbWFsbCcsICdjZW50b2xkc3R5bGUnLCAnTHNsYXNoc21hbGwnLCAnJywgJycsICdTY2Fyb25zbWFsbCcsICdaY2Fyb25zbWFsbCcsICdEaWVyZXNpc3NtYWxsJyxcbiAgICAnQnJldmVzbWFsbCcsICdDYXJvbnNtYWxsJywgJycsICdEb3RhY2NlbnRzbWFsbCcsICcnLCAnJywgJ01hY3JvbnNtYWxsJywgJycsICcnLCAnZmlndXJlZGFzaCcsICdoeXBoZW5pbmZlcmlvcicsXG4gICAgJycsICcnLCAnT2dvbmVrc21hbGwnLCAnUmluZ3NtYWxsJywgJ0NlZGlsbGFzbWFsbCcsICcnLCAnJywgJycsICdvbmVxdWFydGVyJywgJ29uZWhhbGYnLCAndGhyZWVxdWFydGVycycsXG4gICAgJ3F1ZXN0aW9uZG93bnNtYWxsJywgJ29uZWVpZ2h0aCcsICd0aHJlZWVpZ2h0aHMnLCAnZml2ZWVpZ2h0aHMnLCAnc2V2ZW5laWdodGhzJywgJ29uZXRoaXJkJywgJ3R3b3RoaXJkcycsICcnLFxuICAgICcnLCAnemVyb3N1cGVyaW9yJywgJ29uZXN1cGVyaW9yJywgJ3R3b3N1cGVyaW9yJywgJ3RocmVlc3VwZXJpb3InLCAnZm91cnN1cGVyaW9yJywgJ2ZpdmVzdXBlcmlvcicsXG4gICAgJ3NpeHN1cGVyaW9yJywgJ3NldmVuc3VwZXJpb3InLCAnZWlnaHRzdXBlcmlvcicsICduaW5lc3VwZXJpb3InLCAnemVyb2luZmVyaW9yJywgJ29uZWluZmVyaW9yJywgJ3R3b2luZmVyaW9yJyxcbiAgICAndGhyZWVpbmZlcmlvcicsICdmb3VyaW5mZXJpb3InLCAnZml2ZWluZmVyaW9yJywgJ3NpeGluZmVyaW9yJywgJ3NldmVuaW5mZXJpb3InLCAnZWlnaHRpbmZlcmlvcicsXG4gICAgJ25pbmVpbmZlcmlvcicsICdjZW50aW5mZXJpb3InLCAnZG9sbGFyaW5mZXJpb3InLCAncGVyaW9kaW5mZXJpb3InLCAnY29tbWFpbmZlcmlvcicsICdBZ3JhdmVzbWFsbCcsXG4gICAgJ0FhY3V0ZXNtYWxsJywgJ0FjaXJjdW1mbGV4c21hbGwnLCAnQXRpbGRlc21hbGwnLCAnQWRpZXJlc2lzc21hbGwnLCAnQXJpbmdzbWFsbCcsICdBRXNtYWxsJywgJ0NjZWRpbGxhc21hbGwnLFxuICAgICdFZ3JhdmVzbWFsbCcsICdFYWN1dGVzbWFsbCcsICdFY2lyY3VtZmxleHNtYWxsJywgJ0VkaWVyZXNpc3NtYWxsJywgJ0lncmF2ZXNtYWxsJywgJ0lhY3V0ZXNtYWxsJyxcbiAgICAnSWNpcmN1bWZsZXhzbWFsbCcsICdJZGllcmVzaXNzbWFsbCcsICdFdGhzbWFsbCcsICdOdGlsZGVzbWFsbCcsICdPZ3JhdmVzbWFsbCcsICdPYWN1dGVzbWFsbCcsXG4gICAgJ09jaXJjdW1mbGV4c21hbGwnLCAnT3RpbGRlc21hbGwnLCAnT2RpZXJlc2lzc21hbGwnLCAnT0VzbWFsbCcsICdPc2xhc2hzbWFsbCcsICdVZ3JhdmVzbWFsbCcsICdVYWN1dGVzbWFsbCcsXG4gICAgJ1VjaXJjdW1mbGV4c21hbGwnLCAnVWRpZXJlc2lzc21hbGwnLCAnWWFjdXRlc21hbGwnLCAnVGhvcm5zbWFsbCcsICdZZGllcmVzaXNzbWFsbCddO1xuXG52YXIgc3RhbmRhcmROYW1lcyA9IFtcbiAgICAnLm5vdGRlZicsICcubnVsbCcsICdub25tYXJraW5ncmV0dXJuJywgJ3NwYWNlJywgJ2V4Y2xhbScsICdxdW90ZWRibCcsICdudW1iZXJzaWduJywgJ2RvbGxhcicsICdwZXJjZW50JyxcbiAgICAnYW1wZXJzYW5kJywgJ3F1b3Rlc2luZ2xlJywgJ3BhcmVubGVmdCcsICdwYXJlbnJpZ2h0JywgJ2FzdGVyaXNrJywgJ3BsdXMnLCAnY29tbWEnLCAnaHlwaGVuJywgJ3BlcmlvZCcsICdzbGFzaCcsXG4gICAgJ3plcm8nLCAnb25lJywgJ3R3bycsICd0aHJlZScsICdmb3VyJywgJ2ZpdmUnLCAnc2l4JywgJ3NldmVuJywgJ2VpZ2h0JywgJ25pbmUnLCAnY29sb24nLCAnc2VtaWNvbG9uJywgJ2xlc3MnLFxuICAgICdlcXVhbCcsICdncmVhdGVyJywgJ3F1ZXN0aW9uJywgJ2F0JywgJ0EnLCAnQicsICdDJywgJ0QnLCAnRScsICdGJywgJ0cnLCAnSCcsICdJJywgJ0onLCAnSycsICdMJywgJ00nLCAnTicsICdPJyxcbiAgICAnUCcsICdRJywgJ1InLCAnUycsICdUJywgJ1UnLCAnVicsICdXJywgJ1gnLCAnWScsICdaJywgJ2JyYWNrZXRsZWZ0JywgJ2JhY2tzbGFzaCcsICdicmFja2V0cmlnaHQnLFxuICAgICdhc2NpaWNpcmN1bScsICd1bmRlcnNjb3JlJywgJ2dyYXZlJywgJ2EnLCAnYicsICdjJywgJ2QnLCAnZScsICdmJywgJ2cnLCAnaCcsICdpJywgJ2onLCAnaycsICdsJywgJ20nLCAnbicsICdvJyxcbiAgICAncCcsICdxJywgJ3InLCAncycsICd0JywgJ3UnLCAndicsICd3JywgJ3gnLCAneScsICd6JywgJ2JyYWNlbGVmdCcsICdiYXInLCAnYnJhY2VyaWdodCcsICdhc2NpaXRpbGRlJyxcbiAgICAnQWRpZXJlc2lzJywgJ0FyaW5nJywgJ0NjZWRpbGxhJywgJ0VhY3V0ZScsICdOdGlsZGUnLCAnT2RpZXJlc2lzJywgJ1VkaWVyZXNpcycsICdhYWN1dGUnLCAnYWdyYXZlJyxcbiAgICAnYWNpcmN1bWZsZXgnLCAnYWRpZXJlc2lzJywgJ2F0aWxkZScsICdhcmluZycsICdjY2VkaWxsYScsICdlYWN1dGUnLCAnZWdyYXZlJywgJ2VjaXJjdW1mbGV4JywgJ2VkaWVyZXNpcycsXG4gICAgJ2lhY3V0ZScsICdpZ3JhdmUnLCAnaWNpcmN1bWZsZXgnLCAnaWRpZXJlc2lzJywgJ250aWxkZScsICdvYWN1dGUnLCAnb2dyYXZlJywgJ29jaXJjdW1mbGV4JywgJ29kaWVyZXNpcycsXG4gICAgJ290aWxkZScsICd1YWN1dGUnLCAndWdyYXZlJywgJ3VjaXJjdW1mbGV4JywgJ3VkaWVyZXNpcycsICdkYWdnZXInLCAnZGVncmVlJywgJ2NlbnQnLCAnc3RlcmxpbmcnLCAnc2VjdGlvbicsXG4gICAgJ2J1bGxldCcsICdwYXJhZ3JhcGgnLCAnZ2VybWFuZGJscycsICdyZWdpc3RlcmVkJywgJ2NvcHlyaWdodCcsICd0cmFkZW1hcmsnLCAnYWN1dGUnLCAnZGllcmVzaXMnLCAnbm90ZXF1YWwnLFxuICAgICdBRScsICdPc2xhc2gnLCAnaW5maW5pdHknLCAncGx1c21pbnVzJywgJ2xlc3NlcXVhbCcsICdncmVhdGVyZXF1YWwnLCAneWVuJywgJ211JywgJ3BhcnRpYWxkaWZmJywgJ3N1bW1hdGlvbicsXG4gICAgJ3Byb2R1Y3QnLCAncGknLCAnaW50ZWdyYWwnLCAnb3JkZmVtaW5pbmUnLCAnb3JkbWFzY3VsaW5lJywgJ09tZWdhJywgJ2FlJywgJ29zbGFzaCcsICdxdWVzdGlvbmRvd24nLFxuICAgICdleGNsYW1kb3duJywgJ2xvZ2ljYWxub3QnLCAncmFkaWNhbCcsICdmbG9yaW4nLCAnYXBwcm94ZXF1YWwnLCAnRGVsdGEnLCAnZ3VpbGxlbW90bGVmdCcsICdndWlsbGVtb3RyaWdodCcsXG4gICAgJ2VsbGlwc2lzJywgJ25vbmJyZWFraW5nc3BhY2UnLCAnQWdyYXZlJywgJ0F0aWxkZScsICdPdGlsZGUnLCAnT0UnLCAnb2UnLCAnZW5kYXNoJywgJ2VtZGFzaCcsICdxdW90ZWRibGxlZnQnLFxuICAgICdxdW90ZWRibHJpZ2h0JywgJ3F1b3RlbGVmdCcsICdxdW90ZXJpZ2h0JywgJ2RpdmlkZScsICdsb3plbmdlJywgJ3lkaWVyZXNpcycsICdZZGllcmVzaXMnLCAnZnJhY3Rpb24nLFxuICAgICdjdXJyZW5jeScsICdndWlsc2luZ2xsZWZ0JywgJ2d1aWxzaW5nbHJpZ2h0JywgJ2ZpJywgJ2ZsJywgJ2RhZ2dlcmRibCcsICdwZXJpb2RjZW50ZXJlZCcsICdxdW90ZXNpbmdsYmFzZScsXG4gICAgJ3F1b3RlZGJsYmFzZScsICdwZXJ0aG91c2FuZCcsICdBY2lyY3VtZmxleCcsICdFY2lyY3VtZmxleCcsICdBYWN1dGUnLCAnRWRpZXJlc2lzJywgJ0VncmF2ZScsICdJYWN1dGUnLFxuICAgICdJY2lyY3VtZmxleCcsICdJZGllcmVzaXMnLCAnSWdyYXZlJywgJ09hY3V0ZScsICdPY2lyY3VtZmxleCcsICdhcHBsZScsICdPZ3JhdmUnLCAnVWFjdXRlJywgJ1VjaXJjdW1mbGV4JyxcbiAgICAnVWdyYXZlJywgJ2RvdGxlc3NpJywgJ2NpcmN1bWZsZXgnLCAndGlsZGUnLCAnbWFjcm9uJywgJ2JyZXZlJywgJ2RvdGFjY2VudCcsICdyaW5nJywgJ2NlZGlsbGEnLCAnaHVuZ2FydW1sYXV0JyxcbiAgICAnb2dvbmVrJywgJ2Nhcm9uJywgJ0xzbGFzaCcsICdsc2xhc2gnLCAnU2Nhcm9uJywgJ3NjYXJvbicsICdaY2Fyb24nLCAnemNhcm9uJywgJ2Jyb2tlbmJhcicsICdFdGgnLCAnZXRoJyxcbiAgICAnWWFjdXRlJywgJ3lhY3V0ZScsICdUaG9ybicsICd0aG9ybicsICdtaW51cycsICdtdWx0aXBseScsICdvbmVzdXBlcmlvcicsICd0d29zdXBlcmlvcicsICd0aHJlZXN1cGVyaW9yJyxcbiAgICAnb25laGFsZicsICdvbmVxdWFydGVyJywgJ3RocmVlcXVhcnRlcnMnLCAnZnJhbmMnLCAnR2JyZXZlJywgJ2dicmV2ZScsICdJZG90YWNjZW50JywgJ1NjZWRpbGxhJywgJ3NjZWRpbGxhJyxcbiAgICAnQ2FjdXRlJywgJ2NhY3V0ZScsICdDY2Fyb24nLCAnY2Nhcm9uJywgJ2Rjcm9hdCddO1xuXG5mdW5jdGlvbiBDbWFwRW5jb2RpbmcoY21hcCkge1xuICAgIHRoaXMuY21hcCA9IGNtYXA7XG59XG5cbkNtYXBFbmNvZGluZy5wcm90b3R5cGUuY2hhclRvR2x5cGhJbmRleCA9IGZ1bmN0aW9uIChzKSB7XG4gICAgdmFyIHJhbmdlcywgY29kZSwgbCwgYywgcjtcbiAgICByYW5nZXMgPSB0aGlzLmNtYXA7XG4gICAgY29kZSA9IHMuY2hhckNvZGVBdCgwKTtcbiAgICBsID0gMDtcbiAgICByID0gcmFuZ2VzLmxlbmd0aCAtIDE7XG4gICAgd2hpbGUgKGwgPCByKSB7XG4gICAgICAgIGMgPSAobCArIHIgKyAxKSA+PiAxO1xuICAgICAgICBpZiAoY29kZSA8IHJhbmdlc1tjXS5zdGFydCkge1xuICAgICAgICAgICAgciA9IGMgLSAxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbCA9IGM7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKHJhbmdlc1tsXS5zdGFydCA8PSBjb2RlICYmIGNvZGUgPD0gcmFuZ2VzW2xdLmVuZCkge1xuICAgICAgICByZXR1cm4gKHJhbmdlc1tsXS5pZERlbHRhICsgKHJhbmdlc1tsXS5pZHMgPyByYW5nZXNbbF0uaWRzW2NvZGUgLSByYW5nZXNbbF0uc3RhcnRdIDogY29kZSkpICYgMHhGRkZGO1xuICAgIH1cbiAgICByZXR1cm4gMDtcbn07XG5cbmZ1bmN0aW9uIENmZkVuY29kaW5nKGVuY29kaW5nLCBjaGFyc2V0KSB7XG4gICAgdGhpcy5lbmNvZGluZyA9IGVuY29kaW5nO1xuICAgIHRoaXMuY2hhcnNldCA9IGNoYXJzZXQ7XG59XG5cbkNmZkVuY29kaW5nLnByb3RvdHlwZS5jaGFyVG9HbHlwaEluZGV4ID0gZnVuY3Rpb24gKHMpIHtcbiAgICB2YXIgY29kZSwgY2hhck5hbWU7XG4gICAgY29kZSA9IHMuY2hhckNvZGVBdCgwKTtcbiAgICBjaGFyTmFtZSA9IHRoaXMuZW5jb2RpbmdbY29kZV07XG4gICAgcmV0dXJuIHRoaXMuY2hhcnNldC5pbmRleE9mKGNoYXJOYW1lKTtcbn07XG5cbi8vIEdseXBoTmFtZXMgb2JqZWN0IC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbmZ1bmN0aW9uIEdseXBoTmFtZXMocG9zdCkge1xuICAgIHZhciBpO1xuICAgIHN3aXRjaCAocG9zdC52ZXJzaW9uKSB7XG4gICAgY2FzZSAxOlxuICAgICAgICB0aGlzLm5hbWVzID0gc3RhbmRhcmROYW1lcy5zbGljZSgpO1xuICAgICAgICBicmVhaztcbiAgICBjYXNlIDI6XG4gICAgICAgIHRoaXMubmFtZXMgPSBuZXcgQXJyYXkocG9zdC5udW1iZXJPZkdseXBocyk7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBwb3N0Lm51bWJlck9mR2x5cGhzOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChwb3N0LmdseXBoTmFtZUluZGV4W2ldIDwgc3RhbmRhcmROYW1lcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm5hbWVzW2ldID0gc3RhbmRhcmROYW1lc1twb3N0LmdseXBoTmFtZUluZGV4W2ldXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5uYW1lc1tpXSA9IHBvc3QubmFtZXNbcG9zdC5nbHlwaE5hbWVJbmRleFtpXSAtIHN0YW5kYXJkTmFtZXMubGVuZ3RoXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICBjYXNlIDIuNTpcbiAgICAgICAgdGhpcy5uYW1lcyA9IG5ldyBBcnJheShwb3N0Lm51bWJlck9mR2x5cGhzKTtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHBvc3QubnVtYmVyT2ZHbHlwaHM7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5uYW1lc1tpXSA9IHN0YW5kYXJkTmFtZXNbaSArIHBvc3QuZ2x5cGhOYW1lSW5kZXhbaV1dO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbn1cblxuR2x5cGhOYW1lcy5wcm90b3R5cGUubmFtZVRvR2x5cGhJbmRleCA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubmFtZXMuaW5kZXhPZihuYW1lKTtcbn07XG5cbkdseXBoTmFtZXMucHJvdG90eXBlLmdseXBoSW5kZXhUb05hbWUgPSBmdW5jdGlvbiAoZ2lkKSB7XG4gICAgcmV0dXJuIHRoaXMubmFtZXNbZ2lkXTtcbn07XG5cbi8vIEdseXBoIG9iamVjdCAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuLy8gQSBHbHlwaCBpcyBhbiBpbmRpdmlkdWFsIG1hcmsgdGhhdCBvZnRlbiBjb3JyZXNwb25kcyB0byBhIGNoYXJhY3Rlci5cbi8vIFNvbWUgZ2x5cGhzLCBzdWNoIGFzIGxpZ2F0dXJlcywgYXJlIGEgY29tYmluYXRpb24gb2YgbWFueSBjaGFyYWN0ZXJzLlxuLy8gR2x5cGhzIGFyZSB0aGUgYmFzaWMgYnVpbGRpbmcgYmxvY2tzIG9mIGEgZm9udC5cbi8vXG4vLyBUaGUgYEdseXBoYCBjbGFzcyBpcyBhbiBhYnN0cmFjdCBvYmplY3QgdGhhdCBjb250YWlucyB1dGlsaXR5IG1ldGhvZHMgZm9yIGRyYXdpbmcgdGhlIHBhdGggYW5kIGl0cyBwb2ludHMuXG4vLyBDb25jcmV0ZSBjbGFzc2VzIGFyZSBgVHJ1ZVR5cGVHbHlwaGAgYW5kIGBDZmZHbHlwaGAgdGhhdCBpbXBsZW1lbnQgYGdldFBhdGhgLlxuZnVuY3Rpb24gR2x5cGgoKSB7XG59XG5cbi8vIERyYXcgdGhlIGdseXBoIG9uIHRoZSBnaXZlbiBjb250ZXh0LlxuLy9cbi8vIGN0eCAtIFRoZSBkcmF3aW5nIGNvbnRleHQuXG4vLyB4IC0gSG9yaXpvbnRhbCBwb3NpdGlvbiBvZiB0aGUgZ2x5cGguIChkZWZhdWx0OiAwKVxuLy8geSAtIFZlcnRpY2FsIHBvc2l0aW9uIG9mIHRoZSAqYmFzZWxpbmUqIG9mIHRoZSBnbHlwaC4gKGRlZmF1bHQ6IDApXG4vLyBmb250U2l6ZSAtIEZvbnQgc2l6ZSwgaW4gcGl4ZWxzIChkZWZhdWx0OiA3MikuXG5HbHlwaC5wcm90b3R5cGUuZHJhdyA9IGZ1bmN0aW9uIChjdHgsIHgsIHksIGZvbnRTaXplKSB7XG4gICAgdGhpcy5nZXRQYXRoKHgsIHksIGZvbnRTaXplKS5kcmF3KGN0eCk7XG59O1xuXG4vLyBEcmF3IHRoZSBwb2ludHMgb2YgdGhlIGdseXBoLlxuLy8gT24tY3VydmUgcG9pbnRzIHdpbGwgYmUgZHJhd24gaW4gYmx1ZSwgb2ZmLWN1cnZlIHBvaW50cyB3aWxsIGJlIGRyYXduIGluIHJlZC5cbi8vXG4vLyBjdHggLSBUaGUgZHJhd2luZyBjb250ZXh0LlxuLy8geCAtIEhvcml6b250YWwgcG9zaXRpb24gb2YgdGhlIGdseXBoLiAoZGVmYXVsdDogMClcbi8vIHkgLSBWZXJ0aWNhbCBwb3NpdGlvbiBvZiB0aGUgKmJhc2VsaW5lKiBvZiB0aGUgZ2x5cGguIChkZWZhdWx0OiAwKVxuLy8gZm9udFNpemUgLSBGb250IHNpemUsIGluIHBpeGVscyAoZGVmYXVsdDogNzIpLlxuR2x5cGgucHJvdG90eXBlLmRyYXdQb2ludHMgPSBmdW5jdGlvbiAoY3R4LCB4LCB5LCBmb250U2l6ZSkge1xuXG4gICAgZnVuY3Rpb24gZHJhd0NpcmNsZXMobCwgeCwgeSwgc2NhbGUpIHtcbiAgICAgICAgdmFyIGosIFBJX1NRID0gTWF0aC5QSSAqIDI7XG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgICAgZm9yIChqID0gMDsgaiA8IGwubGVuZ3RoOyBqICs9IDEpIHtcbiAgICAgICAgICAgIGN0eC5tb3ZlVG8oeCArIChsW2pdLnggKiBzY2FsZSksIHkgKyAoLWxbal0ueSAqIHNjYWxlKSk7XG4gICAgICAgICAgICBjdHguYXJjKHggKyAobFtqXS54ICogc2NhbGUpLCB5ICsgKC1sW2pdLnkgKiBzY2FsZSksIDIsIDAsIFBJX1NRLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xuICAgICAgICBjdHguZmlsbCgpO1xuICAgIH1cblxuICAgIHZhciBzY2FsZSwgcG9pbnRzLCBpLCBwdCwgYmx1ZUNpcmNsZXMsIHJlZENpcmNsZXMsIHBhdGgsIGNtZDtcbiAgICB4ID0geCAhPT0gdW5kZWZpbmVkID8geCA6IDA7XG4gICAgeSA9IHkgIT09IHVuZGVmaW5lZCA/IHkgOiAwO1xuICAgIGZvbnRTaXplID0gZm9udFNpemUgIT09IHVuZGVmaW5lZCA/IGZvbnRTaXplIDogMjQ7XG4gICAgc2NhbGUgPSAxIC8gdGhpcy5mb250LnVuaXRzUGVyRW0gKiBmb250U2l6ZTtcblxuICAgIGJsdWVDaXJjbGVzID0gW107XG4gICAgcmVkQ2lyY2xlcyA9IFtdO1xuICAgIGlmICh0aGlzLnBvaW50cykge1xuICAgICAgICBwb2ludHMgPSB0aGlzLnBvaW50cztcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHBvaW50cy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgcHQgPSBwb2ludHNbaV07XG4gICAgICAgICAgICBpZiAocHQub25DdXJ2ZSkge1xuICAgICAgICAgICAgICAgIGJsdWVDaXJjbGVzLnB1c2gocHQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWRDaXJjbGVzLnB1c2gocHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcGF0aCA9IHRoaXMucGF0aDtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHBhdGguY29tbWFuZHMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgIGNtZCA9IHBhdGguY29tbWFuZHNbaV07XG4gICAgICAgICAgICBpZiAoY21kLnggIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGJsdWVDaXJjbGVzLnB1c2goe3g6IGNtZC54LCB5OiAtY21kLnl9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjbWQueDEgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHJlZENpcmNsZXMucHVzaCh7eDogY21kLngxLCB5OiAtY21kLnkxfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoY21kLngyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICByZWRDaXJjbGVzLnB1c2goe3g6IGNtZC54MiwgeTogLWNtZC55Mn0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgY3R4LmZpbGxTdHlsZSA9ICdibHVlJztcbiAgICBkcmF3Q2lyY2xlcyhibHVlQ2lyY2xlcywgeCwgeSwgc2NhbGUpO1xuICAgIGN0eC5maWxsU3R5bGUgPSAncmVkJztcbiAgICBkcmF3Q2lyY2xlcyhyZWRDaXJjbGVzLCB4LCB5LCBzY2FsZSk7XG59O1xuXG4vLyBEcmF3IGxpbmVzIGluZGljYXRpbmcgaW1wb3J0YW50IGZvbnQgbWVhc3VyZW1lbnRzLlxuLy8gQmxhY2sgbGluZXMgaW5kaWNhdGUgdGhlIG9yaWdpbiBvZiB0aGUgY29vcmRpbmF0ZSBzeXN0ZW0gKHBvaW50IDAsMCkuXG4vLyBCbHVlIGxpbmVzIGluZGljYXRlIHRoZSBnbHlwaCBib3VuZGluZyBib3guXG4vLyBHcmVlbiBsaW5lIGluZGljYXRlcyB0aGUgYWR2YW5jZSB3aWR0aCBvZiB0aGUgZ2x5cGguXG4vL1xuLy8gY3R4IC0gVGhlIGRyYXdpbmcgY29udGV4dC5cbi8vIHggLSBIb3Jpem9udGFsIHBvc2l0aW9uIG9mIHRoZSBnbHlwaC4gKGRlZmF1bHQ6IDApXG4vLyB5IC0gVmVydGljYWwgcG9zaXRpb24gb2YgdGhlICpiYXNlbGluZSogb2YgdGhlIGdseXBoLiAoZGVmYXVsdDogMClcbi8vIGZvbnRTaXplIC0gRm9udCBzaXplLCBpbiBwaXhlbHMgKGRlZmF1bHQ6IDcyKS5cbkdseXBoLnByb3RvdHlwZS5kcmF3TWV0cmljcyA9IGZ1bmN0aW9uIChjdHgsIHgsIHksIGZvbnRTaXplKSB7XG4gICAgdmFyIHNjYWxlO1xuICAgIHggPSB4ICE9PSB1bmRlZmluZWQgPyB4IDogMDtcbiAgICB5ID0geSAhPT0gdW5kZWZpbmVkID8geSA6IDA7XG4gICAgZm9udFNpemUgPSBmb250U2l6ZSAhPT0gdW5kZWZpbmVkID8gZm9udFNpemUgOiAyNDtcbiAgICBzY2FsZSA9IDEgLyB0aGlzLmZvbnQudW5pdHNQZXJFbSAqIGZvbnRTaXplO1xuICAgIGN0eC5saW5lV2lkdGggPSAxO1xuICAgIC8vIERyYXcgdGhlIG9yaWdpblxuICAgIGN0eC5zdHJva2VTdHlsZSA9ICdibGFjayc7XG4gICAgZHJhdy5saW5lKGN0eCwgeCwgLTEwMDAwLCB4LCAxMDAwMCk7XG4gICAgZHJhdy5saW5lKGN0eCwgLTEwMDAwLCB5LCAxMDAwMCwgeSk7XG4gICAgLy8gRHJhdyB0aGUgZ2x5cGggYm94XG4gICAgY3R4LnN0cm9rZVN0eWxlID0gJ2JsdWUnO1xuICAgIGRyYXcubGluZShjdHgsIHggKyAodGhpcy54TWluICogc2NhbGUpLCAtMTAwMDAsIHggKyAodGhpcy54TWluICogc2NhbGUpLCAxMDAwMCk7XG4gICAgZHJhdy5saW5lKGN0eCwgeCArICh0aGlzLnhNYXggKiBzY2FsZSksIC0xMDAwMCwgeCArICh0aGlzLnhNYXggKiBzY2FsZSksIDEwMDAwKTtcbiAgICBkcmF3LmxpbmUoY3R4LCAtMTAwMDAsIHkgKyAoLXRoaXMueU1pbiAqIHNjYWxlKSwgMTAwMDAsIHkgKyAoLXRoaXMueU1pbiAqIHNjYWxlKSk7XG4gICAgZHJhdy5saW5lKGN0eCwgLTEwMDAwLCB5ICsgKC10aGlzLnlNYXggKiBzY2FsZSksIDEwMDAwLCB5ICsgKC10aGlzLnlNYXggKiBzY2FsZSkpO1xuICAgIC8vIERyYXcgdGhlIGFkdmFuY2Ugd2lkdGhcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSAnZ3JlZW4nO1xuICAgIGRyYXcubGluZShjdHgsIHggKyAodGhpcy5hZHZhbmNlV2lkdGggKiBzY2FsZSksIC0xMDAwMCwgeCArICh0aGlzLmFkdmFuY2VXaWR0aCAqIHNjYWxlKSwgMTAwMDApO1xufTtcblxuLy8gQSBjb25jcmV0ZSBpbXBsZW1lbnRhdGlvbiBvZiBnbHlwaCBmb3IgVHJ1ZVR5cGUgb3V0bGluZSBkYXRhLlxuZnVuY3Rpb24gVHJ1ZVR5cGVHbHlwaChmb250LCBpbmRleCkge1xuICAgIEdseXBoLmNhbGwodGhpcyk7XG4gICAgdGhpcy5mb250ID0gZm9udDtcbiAgICB0aGlzLmluZGV4ID0gaW5kZXg7XG4gICAgdGhpcy5udW1iZXJPZkNvbnRvdXJzID0gMDtcbiAgICB0aGlzLnhNaW4gPSB0aGlzLnlNaW4gPSB0aGlzLnhNYXggPSB0aGlzLnlNYXggPSAwO1xuICAgIHRoaXMuYWR2YW5jZVdpZHRoID0gMDtcbiAgICB0aGlzLnBvaW50cyA9IFtdO1xufVxuXG5UcnVlVHlwZUdseXBoLnByb3RvdHlwZSA9IG5ldyBHbHlwaCgpO1xuVHJ1ZVR5cGVHbHlwaC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBUcnVlVHlwZUdseXBoO1xuXG4vLyBTcGxpdCB0aGUgZ2x5cGggaW50byBjb250b3Vycy5cblRydWVUeXBlR2x5cGgucHJvdG90eXBlLmdldENvbnRvdXJzID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBjb250b3VycywgY3VycmVudENvbnRvdXIsIGksIHB0O1xuICAgIGNvbnRvdXJzID0gW107XG4gICAgY3VycmVudENvbnRvdXIgPSBbXTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgdGhpcy5wb2ludHMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgcHQgPSB0aGlzLnBvaW50c1tpXTtcbiAgICAgICAgY3VycmVudENvbnRvdXIucHVzaChwdCk7XG4gICAgICAgIGlmIChwdC5sYXN0UG9pbnRPZkNvbnRvdXIpIHtcbiAgICAgICAgICAgIGNvbnRvdXJzLnB1c2goY3VycmVudENvbnRvdXIpO1xuICAgICAgICAgICAgY3VycmVudENvbnRvdXIgPSBbXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBjaGVja0FyZ3VtZW50KGN1cnJlbnRDb250b3VyLmxlbmd0aCA9PT0gMCwgJ1RoZXJlIGFyZSBzdGlsbCBwb2ludHMgbGVmdCBpbiB0aGUgY3VycmVudCBjb250b3VyLicpO1xuICAgIHJldHVybiBjb250b3Vycztcbn07XG5cbi8vIENvbnZlcnQgdGhlIGdseXBoIHRvIGEgUGF0aCB3ZSBjYW4gZHJhdyBvbiBhIGRyYXdpbmcgY29udGV4dC5cbi8vXG4vLyB4IC0gSG9yaXpvbnRhbCBwb3NpdGlvbiBvZiB0aGUgZ2x5cGguIChkZWZhdWx0OiAwKVxuLy8geSAtIFZlcnRpY2FsIHBvc2l0aW9uIG9mIHRoZSAqYmFzZWxpbmUqIG9mIHRoZSBnbHlwaC4gKGRlZmF1bHQ6IDApXG4vLyBmb250U2l6ZSAtIEZvbnQgc2l6ZSwgaW4gcGl4ZWxzIChkZWZhdWx0OiA3MikuXG5UcnVlVHlwZUdseXBoLnByb3RvdHlwZS5nZXRQYXRoID0gZnVuY3Rpb24gKHgsIHksIGZvbnRTaXplKSB7XG4gICAgdmFyIHNjYWxlLCBwLCBjb250b3VycywgaSwgcmVhbEZpcnN0UG9pbnQsIGosIGNvbnRvdXIsIHB0LCBmaXJzdFB0LFxuICAgICAgICBwcmV2UHQsIG1pZFB0LCBjdXJ2ZVB0LCBsYXN0UHQ7XG4gICAgeCA9IHggIT09IHVuZGVmaW5lZCA/IHggOiAwO1xuICAgIHkgPSB5ICE9PSB1bmRlZmluZWQgPyB5IDogMDtcbiAgICBmb250U2l6ZSA9IGZvbnRTaXplICE9PSB1bmRlZmluZWQgPyBmb250U2l6ZSA6IDcyO1xuICAgIHNjYWxlID0gMSAvIHRoaXMuZm9udC51bml0c1BlckVtICogZm9udFNpemU7XG4gICAgcCA9IG5ldyBwYXRoLlBhdGgoKTtcbiAgICBpZiAoIXRoaXMucG9pbnRzKSB7XG4gICAgICAgIHJldHVybiBwO1xuICAgIH1cbiAgICBjb250b3VycyA9IHRoaXMuZ2V0Q29udG91cnMoKTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgY29udG91cnMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgY29udG91ciA9IGNvbnRvdXJzW2ldO1xuICAgICAgICBmaXJzdFB0ID0gY29udG91clswXTtcbiAgICAgICAgbGFzdFB0ID0gY29udG91cltjb250b3VyLmxlbmd0aCAtIDFdO1xuICAgICAgICBpZiAoZmlyc3RQdC5vbkN1cnZlKSB7XG4gICAgICAgICAgICBjdXJ2ZVB0ID0gbnVsbDtcbiAgICAgICAgICAgIC8vIFRoZSBmaXJzdCBwb2ludCB3aWxsIGJlIGNvbnN1bWVkIGJ5IHRoZSBtb3ZlVG8gY29tbWFuZCxcbiAgICAgICAgICAgIC8vIHNvIHNraXAgaXQgaW4gdGhlIGxvb3AuXG4gICAgICAgICAgICByZWFsRmlyc3RQb2ludCA9IHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAobGFzdFB0Lm9uQ3VydmUpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgZmlyc3QgcG9pbnQgaXMgb2ZmLWN1cnZlIGFuZCB0aGUgbGFzdCBwb2ludCBpcyBvbi1jdXJ2ZSxcbiAgICAgICAgICAgICAgICAvLyBzdGFydCBhdCB0aGUgbGFzdCBwb2ludC5cbiAgICAgICAgICAgICAgICBmaXJzdFB0ID0gbGFzdFB0O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBib3RoIGZpcnN0IGFuZCBsYXN0IHBvaW50cyBhcmUgb2ZmLWN1cnZlLCBzdGFydCBhdCB0aGVpciBtaWRkbGUuXG4gICAgICAgICAgICAgICAgZmlyc3RQdCA9IHsgeDogKGZpcnN0UHQueCArIGxhc3RQdC54KSAvIDIsIHk6IChmaXJzdFB0LnkgKyBsYXN0UHQueSkgLyAyIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjdXJ2ZVB0ID0gZmlyc3RQdDtcbiAgICAgICAgICAgIC8vIFRoZSBmaXJzdCBwb2ludCBpcyBzeW50aGVzaXplZCwgc28gZG9uJ3Qgc2tpcCB0aGUgcmVhbCBmaXJzdCBwb2ludC5cbiAgICAgICAgICAgIHJlYWxGaXJzdFBvaW50ID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcC5tb3ZlVG8oeCArIChmaXJzdFB0LnggKiBzY2FsZSksIHkgKyAoLWZpcnN0UHQueSAqIHNjYWxlKSk7XG5cbiAgICAgICAgZm9yIChqID0gcmVhbEZpcnN0UG9pbnQgPyAxIDogMDsgaiA8IGNvbnRvdXIubGVuZ3RoOyBqICs9IDEpIHtcbiAgICAgICAgICAgIHB0ID0gY29udG91cltqXTtcbiAgICAgICAgICAgIHByZXZQdCA9IGogPT09IDAgPyBmaXJzdFB0IDogY29udG91cltqIC0gMV07XG4gICAgICAgICAgICBpZiAocHJldlB0Lm9uQ3VydmUgJiYgcHQub25DdXJ2ZSkge1xuICAgICAgICAgICAgICAgIC8vIFRoaXMgaXMgYSBzdHJhaWdodCBsaW5lLlxuICAgICAgICAgICAgICAgIHAubGluZVRvKHggKyAocHQueCAqIHNjYWxlKSwgeSArICgtcHQueSAqIHNjYWxlKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByZXZQdC5vbkN1cnZlICYmICFwdC5vbkN1cnZlKSB7XG4gICAgICAgICAgICAgICAgY3VydmVQdCA9IHB0O1xuICAgICAgICAgICAgfSBlbHNlIGlmICghcHJldlB0Lm9uQ3VydmUgJiYgIXB0Lm9uQ3VydmUpIHtcbiAgICAgICAgICAgICAgICBtaWRQdCA9IHsgeDogKHByZXZQdC54ICsgcHQueCkgLyAyLCB5OiAocHJldlB0LnkgKyBwdC55KSAvIDIgfTtcbiAgICAgICAgICAgICAgICBwLnF1YWRyYXRpY0N1cnZlVG8oeCArIChwcmV2UHQueCAqIHNjYWxlKSwgeSArICgtcHJldlB0LnkgKiBzY2FsZSksIHggKyAobWlkUHQueCAqIHNjYWxlKSwgeSArICgtbWlkUHQueSAqIHNjYWxlKSk7XG4gICAgICAgICAgICAgICAgY3VydmVQdCA9IHB0O1xuICAgICAgICAgICAgfSBlbHNlIGlmICghcHJldlB0Lm9uQ3VydmUgJiYgcHQub25DdXJ2ZSkge1xuICAgICAgICAgICAgICAgIC8vIFByZXZpb3VzIHBvaW50IG9mZi1jdXJ2ZSwgdGhpcyBwb2ludCBvbi1jdXJ2ZS5cbiAgICAgICAgICAgICAgICBwLnF1YWRyYXRpY0N1cnZlVG8oeCArIChjdXJ2ZVB0LnggKiBzY2FsZSksIHkgKyAoLWN1cnZlUHQueSAqIHNjYWxlKSwgeCArIChwdC54ICogc2NhbGUpLCB5ICsgKC1wdC55ICogc2NhbGUpKTtcbiAgICAgICAgICAgICAgICBjdXJ2ZVB0ID0gbnVsbDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHN0YXRlLicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChmaXJzdFB0ICE9PSBsYXN0UHQpIHtcbiAgICAgICAgICAgIC8vIENvbm5lY3QgdGhlIGxhc3QgYW5kIGZpcnN0IHBvaW50c1xuICAgICAgICAgICAgaWYgKGN1cnZlUHQpIHtcbiAgICAgICAgICAgICAgICBwLnF1YWRyYXRpY0N1cnZlVG8oeCArIChjdXJ2ZVB0LnggKiBzY2FsZSksIHkgKyAoLWN1cnZlUHQueSAqIHNjYWxlKSwgeCArIChmaXJzdFB0LnggKiBzY2FsZSksIHkgKyAoLWZpcnN0UHQueSAqIHNjYWxlKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHAubGluZVRvKHggKyAoZmlyc3RQdC54ICogc2NhbGUpLCB5ICsgKC1maXJzdFB0LnkgKiBzY2FsZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHAuY2xvc2VQYXRoKCk7XG4gICAgcmV0dXJuIHA7XG59O1xuXG4vLyBBIGNvbmNyZXRlIGltcGxlbWVudGF0aW9uIG9mIGdseXBoIGZvciBUcnVlVHlwZSBvdXRsaW5lIGRhdGEuXG5mdW5jdGlvbiBDZmZHbHlwaChmb250LCBpbmRleCkge1xuICAgIEdseXBoLmNhbGwodGhpcyk7XG4gICAgdGhpcy5mb250ID0gZm9udDtcbiAgICB0aGlzLmluZGV4ID0gaW5kZXg7XG4gICAgdGhpcy5udW1iZXJPZkNvbnRvdXJzID0gMDtcbiAgICB0aGlzLnhNaW4gPSB0aGlzLnlNaW4gPSB0aGlzLnhNYXggPSB0aGlzLnlNYXggPSAwO1xuICAgIHRoaXMuYWR2YW5jZVdpZHRoID0gZm9udC5kZWZhdWx0V2lkdGhYO1xuICAgIHRoaXMucGF0aCA9IG51bGw7XG59XG5cbkNmZkdseXBoLnByb3RvdHlwZSA9IG5ldyBHbHlwaCgpO1xuQ2ZmR2x5cGgucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQ2ZmR2x5cGg7XG5cbi8vIENvbnZlcnQgdGhlIGdseXBoIHRvIGEgUGF0aCB3ZSBjYW4gZHJhdyBvbiBhIGRyYXdpbmcgY29udGV4dC5cbi8vXG4vLyB4IC0gSG9yaXpvbnRhbCBwb3NpdGlvbiBvZiB0aGUgZ2x5cGguIChkZWZhdWx0OiAwKVxuLy8geSAtIFZlcnRpY2FsIHBvc2l0aW9uIG9mIHRoZSAqYmFzZWxpbmUqIG9mIHRoZSBnbHlwaC4gKGRlZmF1bHQ6IDApXG4vLyBmb250U2l6ZSAtIEZvbnQgc2l6ZSwgaW4gcGl4ZWxzIChkZWZhdWx0OiA3MikuXG5DZmZHbHlwaC5wcm90b3R5cGUuZ2V0UGF0aCA9IGZ1bmN0aW9uICh4LCB5LCBmb250U2l6ZSkge1xuICAgIHZhciBzY2FsZSwgbmV3UGF0aCwgaSwgY21kO1xuICAgIHggPSB4ICE9PSB1bmRlZmluZWQgPyB4IDogMDtcbiAgICB5ID0geSAhPT0gdW5kZWZpbmVkID8geSA6IDA7XG4gICAgZm9udFNpemUgPSBmb250U2l6ZSAhPT0gdW5kZWZpbmVkID8gZm9udFNpemUgOiA3MjtcbiAgICBzY2FsZSA9IDEgLyB0aGlzLmZvbnQudW5pdHNQZXJFbSAqIGZvbnRTaXplO1xuICAgIG5ld1BhdGggPSBuZXcgcGF0aC5QYXRoKCk7XG4gICAgZm9yIChpID0gMDsgaSA8IHRoaXMucGF0aC5jb21tYW5kcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICBjbWQgPSB0aGlzLnBhdGguY29tbWFuZHNbaV07XG4gICAgICAgIGlmIChjbWQudHlwZSA9PT0gJ00nKSB7XG4gICAgICAgICAgICBuZXdQYXRoLm1vdmVUbyh4ICsgKGNtZC54ICogc2NhbGUpLCB5ICsgKGNtZC55ICogc2NhbGUpKTtcbiAgICAgICAgfSBlbHNlIGlmIChjbWQudHlwZSA9PT0gJ0wnKSB7XG4gICAgICAgICAgICBuZXdQYXRoLmxpbmVUbyh4ICsgKGNtZC54ICogc2NhbGUpLCB5ICsgKGNtZC55ICogc2NhbGUpKTtcbiAgICAgICAgfSBlbHNlIGlmIChjbWQudHlwZSA9PT0gJ0MnKSB7XG4gICAgICAgICAgICBuZXdQYXRoLmJlemllckN1cnZlVG8oeCArIChjbWQueDEgKiBzY2FsZSksIHkgKyAoY21kLnkxICogc2NhbGUpLFxuICAgICAgICAgICAgICAgIHggKyAoY21kLngyICogc2NhbGUpLCB5ICsgKGNtZC55MiAqIHNjYWxlKSxcbiAgICAgICAgICAgICAgICB4ICsgKGNtZC54ICogc2NhbGUpLCB5ICsgKGNtZC55ICogc2NhbGUpKTtcbiAgICAgICAgfSBlbHNlIGlmIChjbWQudHlwZSA9PT0gJ1EnKSB7XG4gICAgICAgICAgICBuZXdQYXRoLnF1YWRyYXRpY0N1cnZlVG8oeCArIChjbWQueDEgKiBzY2FsZSksIHkgKyAoY21kLnkxICogc2NhbGUpLFxuICAgICAgICAgICAgICAgIHggKyAoY21kLnggKiBzY2FsZSksIHkgKyAoY21kLnkgKiBzY2FsZSkpO1xuICAgICAgICB9IGVsc2UgaWYgKGNtZC50eXBlID09PSAnWicpIHtcbiAgICAgICAgICAgIG5ld1BhdGguY2xvc2VQYXRoKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5ld1BhdGg7XG59O1xuXG4vLyBGb250IG9iamVjdCAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbi8vIEEgRm9udCByZXByZXNlbnRzIGEgbG9hZGVkIE9wZW5UeXBlIGZvbnQgZmlsZS5cbi8vIEl0IGNvbnRhaW5zIGEgc2V0IG9mIGdseXBocyBhbmQgbWV0aG9kcyB0byBkcmF3IHRleHQgb24gYSBkcmF3aW5nIGNvbnRleHQsXG4vLyBvciB0byBnZXQgYSBwYXRoIHJlcHJlc2VudGluZyB0aGUgdGV4dC5cbmZ1bmN0aW9uIEZvbnQoKSB7XG4gICAgdGhpcy5zdXBwb3J0ZWQgPSB0cnVlO1xuICAgIHRoaXMuZ2x5cGhzID0gW107XG4gICAgdGhpcy5lbmNvZGluZyA9IG51bGw7XG4gICAgdGhpcy50YWJsZXMgPSB7fTtcbn1cblxuLy8gQ29udmVydCB0aGUgZ2l2ZW4gY2hhcmFjdGVyIHRvIGEgc2luZ2xlIGdseXBoIGluZGV4LlxuLy8gTm90ZSB0aGF0IHRoaXMgZnVuY3Rpb24gYXNzdW1lcyB0aGF0IHRoZXJlIGlzIGEgb25lLXRvLW9uZSBtYXBwaW5nIGJldHdlZW5cbi8vIHRoZSBnaXZlbiBjaGFyYWN0ZXIgYW5kIGEgZ2x5cGg7IGZvciBjb21wbGV4IHNjcmlwdHMgdGhpcyBtaWdodCBub3QgYmUgdGhlIGNhc2UuXG5Gb250LnByb3RvdHlwZS5jaGFyVG9HbHlwaEluZGV4ID0gZnVuY3Rpb24gKHMpIHtcbiAgICByZXR1cm4gdGhpcy5lbmNvZGluZy5jaGFyVG9HbHlwaEluZGV4KHMpO1xufTtcblxuLy8gQ29udmVydCB0aGUgZ2l2ZW4gY2hhcmFjdGVyIHRvIGEgc2luZ2xlIEdseXBoIG9iamVjdC5cbi8vIE5vdGUgdGhhdCB0aGlzIGZ1bmN0aW9uIGFzc3VtZXMgdGhhdCB0aGVyZSBpcyBhIG9uZS10by1vbmUgbWFwcGluZyBiZXR3ZWVuXG4vLyB0aGUgZ2l2ZW4gY2hhcmFjdGVyIGFuZCBhIGdseXBoOyBmb3IgY29tcGxleCBzY3JpcHRzIHRoaXMgbWlnaHQgbm90IGJlIHRoZSBjYXNlLlxuRm9udC5wcm90b3R5cGUuY2hhclRvR2x5cGggPSBmdW5jdGlvbiAoYykge1xuICAgIHZhciBnbHlwaEluZGV4LCBnbHlwaDtcbiAgICBnbHlwaEluZGV4ID0gdGhpcy5jaGFyVG9HbHlwaEluZGV4KGMpO1xuICAgIGdseXBoID0gdGhpcy5nbHlwaHNbZ2x5cGhJbmRleF07XG4gICAgaWYgKCFnbHlwaCkge1xuICAgICAgICBnbHlwaCA9IHRoaXMuZ2x5cGhzWzBdOyAvLyAubm90ZGVmXG4gICAgfVxuICAgIHJldHVybiBnbHlwaDtcbn07XG5cbi8vIENvbnZlcnQgdGhlIGdpdmVuIHRleHQgdG8gYSBsaXN0IG9mIEdseXBoIG9iamVjdHMuXG4vLyBOb3RlIHRoYXQgdGhlcmUgaXMgbm8gc3RyaWN0IG9uZS10by1vbmUgbWFwcGluZyBiZXR3ZWVuIGNoYXJhY3RlcnMgYW5kXG4vLyBnbHlwaHMsIHNvIHRoZSBsaXN0IG9mIHJldHVybmVkIGdseXBocyBjYW4gYmUgbGFyZ2VyIG9yIHNtYWxsZXIgdGhhbiB0aGVcbi8vIGxlbmd0aCBvZiB0aGUgZ2l2ZW4gc3RyaW5nLlxuRm9udC5wcm90b3R5cGUuc3RyaW5nVG9HbHlwaHMgPSBmdW5jdGlvbiAocykge1xuICAgIHZhciBpLCBjLCBnbHlwaHM7XG4gICAgZ2x5cGhzID0gW107XG4gICAgZm9yIChpID0gMDsgaSA8IHMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgYyA9IHNbaV07XG4gICAgICAgIGdseXBocy5wdXNoKHRoaXMuY2hhclRvR2x5cGgoYykpO1xuICAgIH1cbiAgICByZXR1cm4gZ2x5cGhzO1xufTtcblxuRm9udC5wcm90b3R5cGUubmFtZVRvR2x5cGhJbmRleCA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2x5cGhOYW1lcy5uYW1lVG9HbHlwaEluZGV4KG5hbWUpO1xufTtcblxuRm9udC5wcm90b3R5cGUubmFtZVRvR2x5cGggPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHZhciBnbHlwaEluZGV4LCBnbHlwaDtcbiAgICBnbHlwaEluZGV4ID0gdGhpcy5uYW1ldG9HbHlwaEluZGV4KG5hbWUpO1xuICAgIGdseXBoID0gdGhpcy5nbHlwaHNbZ2x5cGhJbmRleF07XG4gICAgaWYgKCFnbHlwaCkge1xuICAgICAgICBnbHlwaCA9IHRoaXMuZ2x5cGhzWzBdOyAvLyAubm90ZGVmXG4gICAgfVxuICAgIHJldHVybiBnbHlwaDtcbn07XG5cbkZvbnQucHJvdG90eXBlLmdseXBoSW5kZXhUb05hbWUgPSBmdW5jdGlvbiAoZ2lkKSB7XG4gICAgaWYgKHRoaXMuZ2x5cGhOYW1lcy5nbHlwaEluZGV4VG9OYW1lKSB7XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZ2x5cGhOYW1lcy5nbHlwaEluZGV4VG9OYW1lKGdpZCk7XG59O1xuXG4vLyBSZXRyaWV2ZSB0aGUgdmFsdWUgb2YgdGhlIGtlcm5pbmcgcGFpciBiZXR3ZWVuIHRoZSBsZWZ0IGdseXBoIChvciBpdHMgaW5kZXgpXG4vLyBhbmQgdGhlIHJpZ2h0IGdseXBoIChvciBpdHMgaW5kZXgpLiBJZiBubyBrZXJuaW5nIHBhaXIgaXMgZm91bmQsIHJldHVybiAwLlxuLy8gVGhlIGtlcm5pbmcgdmFsdWUgZ2V0cyBhZGRlZCB0byB0aGUgYWR2YW5jZSB3aWR0aCB3aGVuIGNhbGN1bGF0aW5nIHRoZSBzcGFjaW5nXG4vLyBiZXR3ZWVuIGdseXBocy5cbkZvbnQucHJvdG90eXBlLmdldEtlcm5pbmdWYWx1ZSA9IGZ1bmN0aW9uIChsZWZ0R2x5cGgsIHJpZ2h0R2x5cGgpIHtcbiAgICBsZWZ0R2x5cGggPSBsZWZ0R2x5cGguaW5kZXggfHwgbGVmdEdseXBoO1xuICAgIHJpZ2h0R2x5cGggPSByaWdodEdseXBoLmluZGV4IHx8IHJpZ2h0R2x5cGg7XG4gICAgdmFyIGdwb3NLZXJuaW5nID0gdGhpcy5nZXRHcG9zS2VybmluZ1ZhbHVlO1xuICAgIHJldHVybiBncG9zS2VybmluZyA/IGdwb3NLZXJuaW5nKGxlZnRHbHlwaCwgcmlnaHRHbHlwaCkgOlxuICAgICAgICAodGhpcy5rZXJuaW5nUGFpcnNbbGVmdEdseXBoICsgJywnICsgcmlnaHRHbHlwaF0gfHwgMCk7XG59O1xuXG4vLyBIZWxwZXIgZnVuY3Rpb24gdGhhdCBpbnZva2VzIHRoZSBnaXZlbiBjYWxsYmFjayBmb3IgZWFjaCBnbHlwaCBpbiB0aGUgZ2l2ZW4gdGV4dC5cbi8vIFRoZSBjYWxsYmFjayBnZXRzIGAoZ2x5cGgsIHgsIHksIGZvbnRTaXplLCBvcHRpb25zKWAuXG5Gb250LnByb3RvdHlwZS5mb3JFYWNoR2x5cGggPSBmdW5jdGlvbiAodGV4dCwgeCwgeSwgZm9udFNpemUsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgdmFyIGtlcm5pbmcsIGZvbnRTY2FsZSwgZ2x5cGhzLCBpLCBnbHlwaCwga2VybmluZ1ZhbHVlO1xuICAgIGlmICghdGhpcy5zdXBwb3J0ZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB4ID0geCAhPT0gdW5kZWZpbmVkID8geCA6IDA7XG4gICAgeSA9IHkgIT09IHVuZGVmaW5lZCA/IHkgOiAwO1xuICAgIGZvbnRTaXplID0gZm9udFNpemUgIT09IHVuZGVmaW5lZCA/IGZvbnRTaXplIDogNzI7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAga2VybmluZyA9IG9wdGlvbnMua2VybmluZyA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IG9wdGlvbnMua2VybmluZztcbiAgICBmb250U2NhbGUgPSAxIC8gdGhpcy51bml0c1BlckVtICogZm9udFNpemU7XG4gICAgZ2x5cGhzID0gdGhpcy5zdHJpbmdUb0dseXBocyh0ZXh0KTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgZ2x5cGhzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIGdseXBoID0gZ2x5cGhzW2ldO1xuICAgICAgICBjYWxsYmFjayhnbHlwaCwgeCwgeSwgZm9udFNpemUsIG9wdGlvbnMpO1xuICAgICAgICBpZiAoZ2x5cGguYWR2YW5jZVdpZHRoKSB7XG4gICAgICAgICAgICB4ICs9IGdseXBoLmFkdmFuY2VXaWR0aCAqIGZvbnRTY2FsZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoa2VybmluZyAmJiBpIDwgZ2x5cGhzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgIGtlcm5pbmdWYWx1ZSA9IHRoaXMuZ2V0S2VybmluZ1ZhbHVlKGdseXBoLCBnbHlwaHNbaSArIDFdKTtcbiAgICAgICAgICAgIHggKz0ga2VybmluZ1ZhbHVlICogZm9udFNjYWxlO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuLy8gQ3JlYXRlIGEgUGF0aCBvYmplY3QgdGhhdCByZXByZXNlbnRzIHRoZSBnaXZlbiB0ZXh0LlxuLy9cbi8vIHRleHQgLSBUaGUgdGV4dCB0byBjcmVhdGUuXG4vLyB4IC0gSG9yaXpvbnRhbCBwb3NpdGlvbiBvZiB0aGUgYmVnaW5uaW5nIG9mIHRoZSB0ZXh0LiAoZGVmYXVsdDogMClcbi8vIHkgLSBWZXJ0aWNhbCBwb3NpdGlvbiBvZiB0aGUgKmJhc2VsaW5lKiBvZiB0aGUgdGV4dC4gKGRlZmF1bHQ6IDApXG4vLyBmb250U2l6ZSAtIEZvbnQgc2l6ZSBpbiBwaXhlbHMuIFdlIHNjYWxlIHRoZSBnbHlwaCB1bml0cyBieSBgMSAvIHVuaXRzUGVyRW0gKiBmb250U2l6ZWAuIChkZWZhdWx0OiA3Milcbi8vIE9wdGlvbnMgaXMgYW4gb3B0aW9uYWwgb2JqZWN0IHRoYXQgY29udGFpbnM6XG4vLyAtIGtlcm5pbmcgLSBXaGV0aGVyIHRvIHRha2Uga2VybmluZyBpbmZvcm1hdGlvbiBpbnRvIGFjY291bnQuIChkZWZhdWx0OiB0cnVlKVxuLy9cbi8vIFJldHVybnMgYSBQYXRoIG9iamVjdC5cbkZvbnQucHJvdG90eXBlLmdldFBhdGggPSBmdW5jdGlvbiAodGV4dCwgeCwgeSwgZm9udFNpemUsIG9wdGlvbnMpIHtcbiAgICB2YXIgZnVsbFBhdGggPSBuZXcgcGF0aC5QYXRoKCk7XG4gICAgdGhpcy5mb3JFYWNoR2x5cGgodGV4dCwgeCwgeSwgZm9udFNpemUsIG9wdGlvbnMsIGZ1bmN0aW9uIChnbHlwaCwgeCwgeSwgZm9udFNpemUpIHtcbiAgICAgICAgdmFyIHBhdGggPSBnbHlwaC5nZXRQYXRoKHgsIHksIGZvbnRTaXplKTtcbiAgICAgICAgZnVsbFBhdGguZXh0ZW5kKHBhdGgpO1xuICAgIH0pO1xuICAgIHJldHVybiBmdWxsUGF0aDtcbn07XG5cbi8vIERyYXcgdGhlIHRleHQgb24gdGhlIGdpdmVuIGRyYXdpbmcgY29udGV4dC5cbi8vXG4vLyBjdHggLSBBIDJEIGRyYXdpbmcgY29udGV4dCwgbGlrZSBDYW52YXMuXG4vLyB0ZXh0IC0gVGhlIHRleHQgdG8gY3JlYXRlLlxuLy8geCAtIEhvcml6b250YWwgcG9zaXRpb24gb2YgdGhlIGJlZ2lubmluZyBvZiB0aGUgdGV4dC4gKGRlZmF1bHQ6IDApXG4vLyB5IC0gVmVydGljYWwgcG9zaXRpb24gb2YgdGhlICpiYXNlbGluZSogb2YgdGhlIHRleHQuIChkZWZhdWx0OiAwKVxuLy8gZm9udFNpemUgLSBGb250IHNpemUgaW4gcGl4ZWxzLiBXZSBzY2FsZSB0aGUgZ2x5cGggdW5pdHMgYnkgYDEgLyB1bml0c1BlckVtICogZm9udFNpemVgLiAoZGVmYXVsdDogNzIpXG4vLyBPcHRpb25zIGlzIGFuIG9wdGlvbmFsIG9iamVjdCB0aGF0IGNvbnRhaW5zOlxuLy8gLSBrZXJuaW5nIC0gV2hldGhlciB0byB0YWtlIGtlcm5pbmcgaW5mb3JtYXRpb24gaW50byBhY2NvdW50LiAoZGVmYXVsdDogdHJ1ZSlcbkZvbnQucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbiAoY3R4LCB0ZXh0LCB4LCB5LCBmb250U2l6ZSwgb3B0aW9ucykge1xuICAgIHRoaXMuZ2V0UGF0aCh0ZXh0LCB4LCB5LCBmb250U2l6ZSwgb3B0aW9ucykuZHJhdyhjdHgpO1xufTtcblxuLy8gRHJhdyB0aGUgcG9pbnRzIG9mIGFsbCBnbHlwaHMgaW4gdGhlIHRleHQuXG4vLyBPbi1jdXJ2ZSBwb2ludHMgd2lsbCBiZSBkcmF3biBpbiBibHVlLCBvZmYtY3VydmUgcG9pbnRzIHdpbGwgYmUgZHJhd24gaW4gcmVkLlxuLy9cbi8vIGN0eCAtIEEgMkQgZHJhd2luZyBjb250ZXh0LCBsaWtlIENhbnZhcy5cbi8vIHRleHQgLSBUaGUgdGV4dCB0byBjcmVhdGUuXG4vLyB4IC0gSG9yaXpvbnRhbCBwb3NpdGlvbiBvZiB0aGUgYmVnaW5uaW5nIG9mIHRoZSB0ZXh0LiAoZGVmYXVsdDogMClcbi8vIHkgLSBWZXJ0aWNhbCBwb3NpdGlvbiBvZiB0aGUgKmJhc2VsaW5lKiBvZiB0aGUgdGV4dC4gKGRlZmF1bHQ6IDApXG4vLyBmb250U2l6ZSAtIEZvbnQgc2l6ZSBpbiBwaXhlbHMuIFdlIHNjYWxlIHRoZSBnbHlwaCB1bml0cyBieSBgMSAvIHVuaXRzUGVyRW0gKiBmb250U2l6ZWAuIChkZWZhdWx0OiA3Milcbi8vIE9wdGlvbnMgaXMgYW4gb3B0aW9uYWwgb2JqZWN0IHRoYXQgY29udGFpbnM6XG4vLyAtIGtlcm5pbmcgLSBXaGV0aGVyIHRvIHRha2Uga2VybmluZyBpbmZvcm1hdGlvbiBpbnRvIGFjY291bnQuIChkZWZhdWx0OiB0cnVlKVxuRm9udC5wcm90b3R5cGUuZHJhd1BvaW50cyA9IGZ1bmN0aW9uIChjdHgsIHRleHQsIHgsIHksIGZvbnRTaXplLCBvcHRpb25zKSB7XG4gICAgdGhpcy5mb3JFYWNoR2x5cGgodGV4dCwgeCwgeSwgZm9udFNpemUsIG9wdGlvbnMsIGZ1bmN0aW9uIChnbHlwaCwgeCwgeSwgZm9udFNpemUpIHtcbiAgICAgICAgZ2x5cGguZHJhd1BvaW50cyhjdHgsIHgsIHksIGZvbnRTaXplKTtcbiAgICB9KTtcbn07XG5cbi8vIERyYXcgbGluZXMgaW5kaWNhdGluZyBpbXBvcnRhbnQgZm9udCBtZWFzdXJlbWVudHMgZm9yIGFsbCBnbHlwaHMgaW4gdGhlIHRleHQuXG4vLyBCbGFjayBsaW5lcyBpbmRpY2F0ZSB0aGUgb3JpZ2luIG9mIHRoZSBjb29yZGluYXRlIHN5c3RlbSAocG9pbnQgMCwwKS5cbi8vIEJsdWUgbGluZXMgaW5kaWNhdGUgdGhlIGdseXBoIGJvdW5kaW5nIGJveC5cbi8vIEdyZWVuIGxpbmUgaW5kaWNhdGVzIHRoZSBhZHZhbmNlIHdpZHRoIG9mIHRoZSBnbHlwaC5cbi8vXG4vLyBjdHggLSBBIDJEIGRyYXdpbmcgY29udGV4dCwgbGlrZSBDYW52YXMuXG4vLyB0ZXh0IC0gVGhlIHRleHQgdG8gY3JlYXRlLlxuLy8geCAtIEhvcml6b250YWwgcG9zaXRpb24gb2YgdGhlIGJlZ2lubmluZyBvZiB0aGUgdGV4dC4gKGRlZmF1bHQ6IDApXG4vLyB5IC0gVmVydGljYWwgcG9zaXRpb24gb2YgdGhlICpiYXNlbGluZSogb2YgdGhlIHRleHQuIChkZWZhdWx0OiAwKVxuLy8gZm9udFNpemUgLSBGb250IHNpemUgaW4gcGl4ZWxzLiBXZSBzY2FsZSB0aGUgZ2x5cGggdW5pdHMgYnkgYDEgLyB1bml0c1BlckVtICogZm9udFNpemVgLiAoZGVmYXVsdDogNzIpXG4vLyBPcHRpb25zIGlzIGFuIG9wdGlvbmFsIG9iamVjdCB0aGF0IGNvbnRhaW5zOlxuLy8gLSBrZXJuaW5nIC0gV2hldGhlciB0byB0YWtlIGtlcm5pbmcgaW5mb3JtYXRpb24gaW50byBhY2NvdW50LiAoZGVmYXVsdDogdHJ1ZSlcbkZvbnQucHJvdG90eXBlLmRyYXdNZXRyaWNzID0gZnVuY3Rpb24gKGN0eCwgdGV4dCwgeCwgeSwgZm9udFNpemUsIG9wdGlvbnMpIHtcbiAgICB0aGlzLmZvckVhY2hHbHlwaCh0ZXh0LCB4LCB5LCBmb250U2l6ZSwgb3B0aW9ucywgZnVuY3Rpb24gKGdseXBoLCB4LCB5LCBmb250U2l6ZSkge1xuICAgICAgICBnbHlwaC5kcmF3TWV0cmljcyhjdHgsIHgsIHksIGZvbnRTaXplKTtcbiAgICB9KTtcbn07XG5cbi8vIE9wZW5UeXBlIGZvcm1hdCBwYXJzaW5nIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuLy8gUGFyc2UgdGhlIGNvb3JkaW5hdGUgZGF0YSBmb3IgYSBnbHlwaC5cbmZ1bmN0aW9uIHBhcnNlR2x5cGhDb29yZGluYXRlKHAsIGZsYWcsIHByZXZpb3VzVmFsdWUsIHNob3J0VmVjdG9yQml0TWFzaywgc2FtZUJpdE1hc2spIHtcbiAgICB2YXIgdjtcbiAgICBpZiAoZmxhZyAmIHNob3J0VmVjdG9yQml0TWFzaykge1xuICAgICAgICAvLyBUaGUgY29vcmRpbmF0ZSBpcyAxIGJ5dGUgbG9uZy5cbiAgICAgICAgdiA9IHAucGFyc2VCeXRlKCk7XG4gICAgICAgIC8vIFRoZSBgc2FtZWAgYml0IGlzIHJlLXVzZWQgZm9yIHNob3J0IHZhbHVlcyB0byBzaWduaWZ5IHRoZSBzaWduIG9mIHRoZSB2YWx1ZS5cbiAgICAgICAgaWYgKCEoZmxhZyAmIHNhbWVCaXRNYXNrKSkge1xuICAgICAgICAgICAgdiA9IC12O1xuICAgICAgICB9XG4gICAgICAgIHYgPSBwcmV2aW91c1ZhbHVlICsgdjtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyAgVGhlIGNvb3JkaW5hdGUgaXMgMiBieXRlcyBsb25nLlxuICAgICAgICAvLyBJZiB0aGUgYHNhbWVgIGJpdCBpcyBzZXQsIHRoZSBjb29yZGluYXRlIGlzIHRoZSBzYW1lIGFzIHRoZSBwcmV2aW91cyBjb29yZGluYXRlLlxuICAgICAgICBpZiAoZmxhZyAmIHNhbWVCaXRNYXNrKSB7XG4gICAgICAgICAgICB2ID0gcHJldmlvdXNWYWx1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFBhcnNlIHRoZSBjb29yZGluYXRlIGFzIGEgc2lnbmVkIDE2LWJpdCBkZWx0YSB2YWx1ZS5cbiAgICAgICAgICAgIHYgPSBwcmV2aW91c1ZhbHVlICsgcC5wYXJzZVNob3J0KCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHY7XG59XG5cbi8vIFBhcnNlIGFuIE9wZW5UeXBlIGdseXBoIChkZXNjcmliZWQgaW4gdGhlIGdseWYgdGFibGUpLlxuLy8gaHR0cDovL3d3dy5taWNyb3NvZnQuY29tL3R5cG9ncmFwaHkvb3RzcGVjL2dseWYuaHRtXG5mdW5jdGlvbiBwYXJzZUdseXBoKGRhdGEsIHN0YXJ0LCBpbmRleCwgZm9udCkge1xuICAgIHZhciBwLCBnbHlwaCwgZmxhZywgaSwgaiwgZmxhZ3MsXG4gICAgICAgIGVuZFBvaW50SW5kaWNlcywgbnVtYmVyT2ZDb29yZGluYXRlcywgcmVwZWF0Q291bnQsIHBvaW50cywgcG9pbnQsIHB4LCBweSxcbiAgICAgICAgY29tcG9uZW50LCBtb3JlQ29tcG9uZW50cywgYXJnMSwgYXJnMiwgc2NhbGUsIHhTY2FsZSwgeVNjYWxlLCBzY2FsZTAxLCBzY2FsZTEwO1xuICAgIHAgPSBuZXcgcGFyc2UuUGFyc2VyKGRhdGEsIHN0YXJ0KTtcbiAgICBnbHlwaCA9IG5ldyBUcnVlVHlwZUdseXBoKGZvbnQsIGluZGV4KTtcbiAgICBnbHlwaC5udW1iZXJPZkNvbnRvdXJzID0gcC5wYXJzZVNob3J0KCk7XG4gICAgZ2x5cGgueE1pbiA9IHAucGFyc2VTaG9ydCgpO1xuICAgIGdseXBoLnlNaW4gPSBwLnBhcnNlU2hvcnQoKTtcbiAgICBnbHlwaC54TWF4ID0gcC5wYXJzZVNob3J0KCk7XG4gICAgZ2x5cGgueU1heCA9IHAucGFyc2VTaG9ydCgpO1xuICAgIGlmIChnbHlwaC5udW1iZXJPZkNvbnRvdXJzID4gMCkge1xuICAgICAgICAvLyBUaGlzIGdseXBoIGlzIG5vdCBhIGNvbXBvc2l0ZS5cbiAgICAgICAgZW5kUG9pbnRJbmRpY2VzID0gZ2x5cGguZW5kUG9pbnRJbmRpY2VzID0gW107XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBnbHlwaC5udW1iZXJPZkNvbnRvdXJzOyBpICs9IDEpIHtcbiAgICAgICAgICAgIGVuZFBvaW50SW5kaWNlcy5wdXNoKHAucGFyc2VVU2hvcnQoKSk7XG4gICAgICAgIH1cblxuICAgICAgICBnbHlwaC5pbnN0cnVjdGlvbkxlbmd0aCA9IHAucGFyc2VVU2hvcnQoKTtcbiAgICAgICAgZ2x5cGguaW5zdHJ1Y3Rpb25zID0gW107XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBnbHlwaC5pbnN0cnVjdGlvbkxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICBnbHlwaC5pbnN0cnVjdGlvbnMucHVzaChwLnBhcnNlQnl0ZSgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG51bWJlck9mQ29vcmRpbmF0ZXMgPSBlbmRQb2ludEluZGljZXNbZW5kUG9pbnRJbmRpY2VzLmxlbmd0aCAtIDFdICsgMTtcbiAgICAgICAgZmxhZ3MgPSBbXTtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG51bWJlck9mQ29vcmRpbmF0ZXM7IGkgKz0gMSkge1xuICAgICAgICAgICAgZmxhZyA9IHAucGFyc2VCeXRlKCk7XG4gICAgICAgICAgICBmbGFncy5wdXNoKGZsYWcpO1xuICAgICAgICAgICAgLy8gSWYgYml0IDMgaXMgc2V0LCB3ZSByZXBlYXQgdGhpcyBmbGFnIG4gdGltZXMsIHdoZXJlIG4gaXMgdGhlIG5leHQgYnl0ZS5cbiAgICAgICAgICAgIGlmIChmbGFnICYgOCkge1xuICAgICAgICAgICAgICAgIHJlcGVhdENvdW50ID0gcC5wYXJzZUJ5dGUoKTtcbiAgICAgICAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgcmVwZWF0Q291bnQ7IGogKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICBmbGFncy5wdXNoKGZsYWcpO1xuICAgICAgICAgICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNoZWNrQXJndW1lbnQoZmxhZ3MubGVuZ3RoID09PSBudW1iZXJPZkNvb3JkaW5hdGVzLCAnQmFkIGZsYWdzLicpO1xuXG4gICAgICAgIGlmIChlbmRQb2ludEluZGljZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcG9pbnRzID0gW107XG4gICAgICAgICAgICAvLyBYL1kgY29vcmRpbmF0ZXMgYXJlIHJlbGF0aXZlIHRvIHRoZSBwcmV2aW91cyBwb2ludCwgZXhjZXB0IGZvciB0aGUgZmlyc3QgcG9pbnQgd2hpY2ggaXMgcmVsYXRpdmUgdG8gMCwwLlxuICAgICAgICAgICAgaWYgKG51bWJlck9mQ29vcmRpbmF0ZXMgPiAwKSB7XG4gICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IG51bWJlck9mQ29vcmRpbmF0ZXM7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICBmbGFnID0gZmxhZ3NbaV07XG4gICAgICAgICAgICAgICAgICAgIHBvaW50ID0ge307XG4gICAgICAgICAgICAgICAgICAgIHBvaW50Lm9uQ3VydmUgPSAhIShmbGFnICYgMSk7XG4gICAgICAgICAgICAgICAgICAgIHBvaW50Lmxhc3RQb2ludE9mQ29udG91ciA9IGVuZFBvaW50SW5kaWNlcy5pbmRleE9mKGkpID49IDA7XG4gICAgICAgICAgICAgICAgICAgIHBvaW50cy5wdXNoKHBvaW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcHggPSAwO1xuICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBudW1iZXJPZkNvb3JkaW5hdGVzOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgZmxhZyA9IGZsYWdzW2ldO1xuICAgICAgICAgICAgICAgICAgICBwb2ludCA9IHBvaW50c1tpXTtcbiAgICAgICAgICAgICAgICAgICAgcG9pbnQueCA9IHBhcnNlR2x5cGhDb29yZGluYXRlKHAsIGZsYWcsIHB4LCAyLCAxNik7XG4gICAgICAgICAgICAgICAgICAgIHB4ID0gcG9pbnQueDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBweSA9IDA7XG4gICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IG51bWJlck9mQ29vcmRpbmF0ZXM7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICBmbGFnID0gZmxhZ3NbaV07XG4gICAgICAgICAgICAgICAgICAgIHBvaW50ID0gcG9pbnRzW2ldO1xuICAgICAgICAgICAgICAgICAgICBwb2ludC55ID0gcGFyc2VHbHlwaENvb3JkaW5hdGUocCwgZmxhZywgcHksIDQsIDMyKTtcbiAgICAgICAgICAgICAgICAgICAgcHkgPSBwb2ludC55O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGdseXBoLnBvaW50cyA9IHBvaW50cztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGdseXBoLnBvaW50cyA9IFtdO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChnbHlwaC5udW1iZXJPZkNvbnRvdXJzID09PSAwKSB7XG4gICAgICAgIGdseXBoLnBvaW50cyA9IFtdO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGdseXBoLmlzQ29tcG9zaXRlID0gdHJ1ZTtcbiAgICAgICAgZ2x5cGgucG9pbnRzID0gW107XG4gICAgICAgIGdseXBoLmNvbXBvbmVudHMgPSBbXTtcbiAgICAgICAgbW9yZUNvbXBvbmVudHMgPSB0cnVlO1xuICAgICAgICB3aGlsZSAobW9yZUNvbXBvbmVudHMpIHtcbiAgICAgICAgICAgIGNvbXBvbmVudCA9IHt9O1xuICAgICAgICAgICAgZmxhZ3MgPSBwLnBhcnNlVVNob3J0KCk7XG4gICAgICAgICAgICBjb21wb25lbnQuZ2x5cGhJbmRleCA9IHAucGFyc2VVU2hvcnQoKTtcbiAgICAgICAgICAgIGlmIChmbGFncyAmIDEpIHtcbiAgICAgICAgICAgICAgICAvLyBUaGUgYXJndW1lbnRzIGFyZSB3b3Jkc1xuICAgICAgICAgICAgICAgIGFyZzEgPSBwLnBhcnNlU2hvcnQoKTtcbiAgICAgICAgICAgICAgICBhcmcyID0gcC5wYXJzZVNob3J0KCk7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50LmR4ID0gYXJnMTtcbiAgICAgICAgICAgICAgICBjb21wb25lbnQuZHkgPSBhcmcyO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBUaGUgYXJndW1lbnRzIGFyZSBieXRlc1xuICAgICAgICAgICAgICAgIGFyZzEgPSBwLnBhcnNlQ2hhcigpO1xuICAgICAgICAgICAgICAgIGFyZzIgPSBwLnBhcnNlQ2hhcigpO1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudC5keCA9IGFyZzE7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50LmR5ID0gYXJnMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChmbGFncyAmIDgpIHtcbiAgICAgICAgICAgICAgICAvLyBXZSBoYXZlIGEgc2NhbGVcbiAgICAgICAgICAgICAgICAvLyBUT0RPIHBhcnNlIGluIDE2LWJpdCBzaWduZWQgZml4ZWQgbnVtYmVyIHdpdGggdGhlIGxvdyAxNCBiaXRzIG9mIGZyYWN0aW9uICgyLjE0KS5cbiAgICAgICAgICAgICAgICBzY2FsZSA9IHAucGFyc2VTaG9ydCgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChmbGFncyAmIDY0KSB7XG4gICAgICAgICAgICAgICAgLy8gV2UgaGF2ZSBhbiBYIC8gWSBzY2FsZVxuICAgICAgICAgICAgICAgIHhTY2FsZSA9IHAucGFyc2VTaG9ydCgpO1xuICAgICAgICAgICAgICAgIHlTY2FsZSA9IHAucGFyc2VTaG9ydCgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChmbGFncyAmIDEyOCkge1xuICAgICAgICAgICAgICAgIC8vIFdlIGhhdmUgYSAyeDIgdHJhbnNmb3JtYXRpb25cbiAgICAgICAgICAgICAgICB4U2NhbGUgPSBwLnBhcnNlU2hvcnQoKTtcbiAgICAgICAgICAgICAgICBzY2FsZTAxID0gcC5wYXJzZVNob3J0KCk7XG4gICAgICAgICAgICAgICAgc2NhbGUxMCA9IHAucGFyc2VTaG9ydCgpO1xuICAgICAgICAgICAgICAgIHlTY2FsZSA9IHAucGFyc2VTaG9ydCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBnbHlwaC5jb21wb25lbnRzLnB1c2goY29tcG9uZW50KTtcbiAgICAgICAgICAgIG1vcmVDb21wb25lbnRzID0gISEoZmxhZ3MgJiAzMik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGdseXBoO1xufVxuXG4vLyBUcmFuc2Zvcm0gYW4gYXJyYXkgb2YgcG9pbnRzIGFuZCByZXR1cm4gYSBuZXcgYXJyYXkuXG5mdW5jdGlvbiB0cmFuc2Zvcm1Qb2ludHMocG9pbnRzLCBkeCwgZHkpIHtcbiAgICB2YXIgbmV3UG9pbnRzLCBpLCBwdCwgbmV3UHQ7XG4gICAgbmV3UG9pbnRzID0gW107XG4gICAgZm9yIChpID0gMDsgaSA8IHBvaW50cy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICBwdCA9IHBvaW50c1tpXTtcbiAgICAgICAgbmV3UHQgPSB7XG4gICAgICAgICAgICB4OiBwdC54ICsgZHgsXG4gICAgICAgICAgICB5OiBwdC55ICsgZHksXG4gICAgICAgICAgICBvbkN1cnZlOiBwdC5vbkN1cnZlLFxuICAgICAgICAgICAgbGFzdFBvaW50T2ZDb250b3VyOiBwdC5sYXN0UG9pbnRPZkNvbnRvdXJcbiAgICAgICAgfTtcbiAgICAgICAgbmV3UG9pbnRzLnB1c2gobmV3UHQpO1xuICAgIH1cbiAgICByZXR1cm4gbmV3UG9pbnRzO1xufVxuXG4vLyBQYXJzZSBhbGwgdGhlIGdseXBocyBhY2NvcmRpbmcgdG8gdGhlIG9mZnNldHMgZnJvbSB0aGUgYGxvY2FgIHRhYmxlLlxuZnVuY3Rpb24gcGFyc2VHbHlmVGFibGUoZGF0YSwgc3RhcnQsIGxvY2EsIGZvbnQpIHtcbiAgICB2YXIgZ2x5cGhzLCBpLCBqLCBvZmZzZXQsIG5leHRPZmZzZXQsIGdseXBoLFxuICAgICAgICBjb21wb25lbnQsIGNvbXBvbmVudEdseXBoLCB0cmFuc2Zvcm1lZFBvaW50cztcbiAgICBnbHlwaHMgPSBbXTtcbiAgICAvLyBUaGUgbGFzdCBlbGVtZW50IG9mIHRoZSBsb2NhIHRhYmxlIGlzIGludmFsaWQuXG4gICAgZm9yIChpID0gMDsgaSA8IGxvY2EubGVuZ3RoIC0gMTsgaSArPSAxKSB7XG4gICAgICAgIG9mZnNldCA9IGxvY2FbaV07XG4gICAgICAgIG5leHRPZmZzZXQgPSBsb2NhW2kgKyAxXTtcbiAgICAgICAgaWYgKG9mZnNldCAhPT0gbmV4dE9mZnNldCkge1xuICAgICAgICAgICAgZ2x5cGhzLnB1c2gocGFyc2VHbHlwaChkYXRhLCBzdGFydCArIG9mZnNldCwgaSwgZm9udCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZ2x5cGhzLnB1c2gobmV3IFRydWVUeXBlR2x5cGgoZm9udCwgaSkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vIEdvIG92ZXIgdGhlIGdseXBocyBhZ2FpbiwgcmVzb2x2aW5nIHRoZSBjb21wb3NpdGUgZ2x5cGhzLlxuICAgIGZvciAoaSA9IDA7IGkgPCBnbHlwaHMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgZ2x5cGggPSBnbHlwaHNbaV07XG4gICAgICAgIGlmIChnbHlwaC5pc0NvbXBvc2l0ZSkge1xuICAgICAgICAgICAgZm9yIChqID0gMDsgaiA8IGdseXBoLmNvbXBvbmVudHMubGVuZ3RoOyBqICs9IDEpIHtcbiAgICAgICAgICAgICAgICBjb21wb25lbnQgPSBnbHlwaC5jb21wb25lbnRzW2pdO1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudEdseXBoID0gZ2x5cGhzW2NvbXBvbmVudC5nbHlwaEluZGV4XTtcbiAgICAgICAgICAgICAgICBpZiAoY29tcG9uZW50R2x5cGgucG9pbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyYW5zZm9ybWVkUG9pbnRzID0gdHJhbnNmb3JtUG9pbnRzKGNvbXBvbmVudEdseXBoLnBvaW50cywgY29tcG9uZW50LmR4LCBjb21wb25lbnQuZHkpO1xuICAgICAgICAgICAgICAgICAgICBnbHlwaC5wb2ludHMucHVzaC5hcHBseShnbHlwaC5wb2ludHMsIHRyYW5zZm9ybWVkUG9pbnRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZ2x5cGhzO1xufVxuXG4vLyBQYXJzZSB0aGUgYGxvY2FgIHRhYmxlLiBUaGlzIHRhYmxlIHN0b3JlcyB0aGUgb2Zmc2V0cyB0byB0aGUgbG9jYXRpb25zIG9mIHRoZSBnbHlwaHMgaW4gdGhlIGZvbnQsXG4vLyByZWxhdGl2ZSB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZSBnbHlwaERhdGEgdGFibGUuXG4vLyBUaGUgbnVtYmVyIG9mIGdseXBocyBzdG9yZWQgaW4gdGhlIGBsb2NhYCB0YWJsZSBpcyBzcGVjaWZpZWQgaW4gdGhlIGBtYXhwYCB0YWJsZSAodW5kZXIgbnVtR2x5cGhzKVxuLy8gVGhlIGxvY2EgdGFibGUgaGFzIHR3byB2ZXJzaW9uczogYSBzaG9ydCB2ZXJzaW9uIHdoZXJlIG9mZnNldHMgYXJlIHN0b3JlZCBhcyB1U2hvcnRzLCBhbmQgYSBsb25nXG4vLyB2ZXJzaW9uIHdoZXJlIG9mZnNldHMgYXJlIHN0b3JlZCBhcyB1TG9uZ3MuIFRoZSBgaGVhZGAgdGFibGUgc3BlY2lmaWVzIHdoaWNoIHZlcnNpb24gdG8gdXNlXG4vLyAodW5kZXIgaW5kZXhUb0xvY0Zvcm1hdCkuXG4vLyBodHRwczovL3d3dy5taWNyb3NvZnQuY29tL3R5cG9ncmFwaHkvT1RTUEVDL2xvY2EuaHRtXG5mdW5jdGlvbiBwYXJzZUxvY2FUYWJsZShkYXRhLCBzdGFydCwgbnVtR2x5cGhzLCBzaG9ydFZlcnNpb24pIHtcbiAgICB2YXIgcCwgcGFyc2VGbiwgZ2x5cGhPZmZzZXRzLCBnbHlwaE9mZnNldCwgaTtcbiAgICBwID0gbmV3IHBhcnNlLlBhcnNlcihkYXRhLCBzdGFydCk7XG4gICAgcGFyc2VGbiA9IHNob3J0VmVyc2lvbiA/IHAucGFyc2VVU2hvcnQgOiBwLnBhcnNlVUxvbmc7XG4gICAgLy8gVGhlcmUgaXMgYW4gZXh0cmEgZW50cnkgYWZ0ZXIgdGhlIGxhc3QgaW5kZXggZWxlbWVudCB0byBjb21wdXRlIHRoZSBsZW5ndGggb2YgdGhlIGxhc3QgZ2x5cGguXG4gICAgLy8gVGhhdCdzIHdoeSB3ZSB1c2UgbnVtR2x5cGhzICsgMS5cbiAgICBnbHlwaE9mZnNldHMgPSBbXTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbnVtR2x5cGhzICsgMTsgaSArPSAxKSB7XG4gICAgICAgIGdseXBoT2Zmc2V0ID0gcGFyc2VGbi5jYWxsKHApO1xuICAgICAgICBpZiAoc2hvcnRWZXJzaW9uKSB7XG4gICAgICAgICAgICAvLyBUaGUgc2hvcnQgdGFibGUgdmVyc2lvbiBzdG9yZXMgdGhlIGFjdHVhbCBvZmZzZXQgZGl2aWRlZCBieSAyLlxuICAgICAgICAgICAgZ2x5cGhPZmZzZXQgKj0gMjtcbiAgICAgICAgfVxuICAgICAgICBnbHlwaE9mZnNldHMucHVzaChnbHlwaE9mZnNldCk7XG4gICAgfVxuICAgIHJldHVybiBnbHlwaE9mZnNldHM7XG59XG5cblxuLy8gUGFyc2UgdGhlIGBjbWFwYCB0YWJsZS4gVGhpcyB0YWJsZSBzdG9yZXMgdGhlIG1hcHBpbmdzIGZyb20gY2hhcmFjdGVycyB0byBnbHlwaHMuXG4vLyBUaGVyZSBhcmUgbWFueSBhdmFpbGFibGUgZm9ybWF0cywgYnV0IHdlIG9ubHkgc3VwcG9ydCB0aGUgV2luZG93cyBmb3JtYXQgNC5cbi8vIFRoaXMgZnVuY3Rpb24gcmV0dXJucyBhIGBDbWFwRW5jb2RpbmdgIG9iamVjdCBvciBudWxsIGlmIG5vIHN1cHBvcnRlZCBmb3JtYXQgY291bGQgYmUgZm91bmQuXG4vLyBodHRwczovL3d3dy5taWNyb3NvZnQuY29tL3R5cG9ncmFwaHkvT1RTUEVDL2NtYXAuaHRtXG5mdW5jdGlvbiBwYXJzZUNtYXBUYWJsZShkYXRhLCBzdGFydCkge1xuICAgIHZhciB2ZXJzaW9uLCBudW1UYWJsZXMsIG9mZnNldCwgcGxhdGZvcm1JZCwgZW5jb2RpbmdJZCwgZm9ybWF0LCBzZWdDb3VudCxcbiAgICAgICAgcmFuZ2VzLCBpLCBqLCBwYXJzZXJPZmZzZXQsIGlkUmFuZ2VPZmZzZXQsIHA7XG4gICAgdmFyIGNtYXAgPSB7fTtcbiAgICBjbWFwLnZlcnNpb24gPSB2ZXJzaW9uID0gcGFyc2UuZ2V0VVNob3J0KGRhdGEsIHN0YXJ0KTtcbiAgICBjaGVja0FyZ3VtZW50KHZlcnNpb24gPT09IDAsICdjbWFwIHRhYmxlIHZlcnNpb24gc2hvdWxkIGJlIDAuJyk7XG5cbiAgICAvLyBUaGUgY21hcCB0YWJsZSBjYW4gY29udGFpbiBtYW55IHN1Yi10YWJsZXMsIGVhY2ggd2l0aCB0aGVpciBvd24gZm9ybWF0LlxuICAgIC8vIFdlJ3JlIG9ubHkgaW50ZXJlc3RlZCBpbiBhIFwicGxhdGZvcm0gM1wiIHRhYmxlLiBUaGlzIGlzIGEgV2luZG93cyBmb3JtYXQuXG4gICAgY21hcC5udW10YWJsZXMgPSBudW1UYWJsZXMgPSBwYXJzZS5nZXRVU2hvcnQoZGF0YSwgc3RhcnQgKyAyKTtcbiAgICBvZmZzZXQgPSAtMTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbnVtVGFibGVzOyBpICs9IDEpIHtcbiAgICAgICAgcGxhdGZvcm1JZCA9IHBhcnNlLmdldFVTaG9ydChkYXRhLCBzdGFydCArIDQgKyAoaSAqIDgpKTtcbiAgICAgICAgZW5jb2RpbmdJZCA9IHBhcnNlLmdldFVTaG9ydChkYXRhLCBzdGFydCArIDQgKyAoaSAqIDgpICsgMik7XG4gICAgICAgIGlmIChwbGF0Zm9ybUlkID09PSAzICYmIChlbmNvZGluZ0lkID09PSAxIHx8IGVuY29kaW5nSWQgPT09IDApKSB7XG4gICAgICAgICAgICBvZmZzZXQgPSBwYXJzZS5nZXRVTG9uZyhkYXRhLCBzdGFydCArIDQgKyAoaSAqIDgpICsgNCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAob2Zmc2V0ID09PSAtMSkge1xuICAgICAgICAvLyBUaGVyZSBpcyBubyBjbWFwIHRhYmxlIGluIHRoZSBmb250IHRoYXQgd2Ugc3VwcG9ydCwgc28gcmV0dXJuIG51bGwuXG4gICAgICAgIC8vIFRoaXMgZm9udCB3aWxsIGJlIG1hcmtlZCBhcyB1bnN1cHBvcnRlZC5cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcCA9IG5ldyBwYXJzZS5QYXJzZXIoZGF0YSwgc3RhcnQgKyBvZmZzZXQpO1xuICAgIGNtYXAuZm9ybWF0ID0gZm9ybWF0ID0gcC5wYXJzZVVTaG9ydCgpO1xuICAgIGNoZWNrQXJndW1lbnQoZm9ybWF0ID09PSA0LCAnT25seSBmb3JtYXQgNCBjbWFwIHRhYmxlcyBhcmUgc3VwcG9ydGVkLicpO1xuICAgIC8vIExlbmd0aCBpbiBieXRlcyBvZiB0aGUgc3ViLXRhYmxlcy5cbiAgICAvLyBTa2lwIGxlbmd0aCBhbmQgbGFuZ3VhZ2U7XG4gICAgcC5za2lwKCd1U2hvcnQnLCAyKTtcbiAgICAvLyBzZWdDb3VudCBpcyBzdG9yZWQgeCAyLlxuICAgIGNtYXAuc2VnQ291bnQgPSBzZWdDb3VudCA9IHAucGFyc2VVU2hvcnQoKSA+PiAxO1xuICAgIC8vIFNraXAgc2VhcmNoUmFuZ2UsIGVudHJ5U2VsZWN0b3IsIHJhbmdlU2hpZnQuXG4gICAgcC5za2lwKCd1U2hvcnQnLCAzKTtcbiAgICByYW5nZXMgPSBbXTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgc2VnQ291bnQ7IGkgKz0gMSkge1xuICAgICAgICByYW5nZXNbaV0gPSB7IGVuZDogcC5wYXJzZVVTaG9ydCgpIH07XG4gICAgfVxuICAgIC8vIFNraXAgYSBwYWRkaW5nIHZhbHVlLlxuICAgIHAuc2tpcCgndVNob3J0Jyk7XG4gICAgZm9yIChpID0gMDsgaSA8IHNlZ0NvdW50OyBpICs9IDEpIHtcbiAgICAgICAgcmFuZ2VzW2ldLnN0YXJ0ID0gcC5wYXJzZVVTaG9ydCgpO1xuICAgICAgICByYW5nZXNbaV0ubGVuZ3RoID0gcmFuZ2VzW2ldLmVuZCAtIHJhbmdlc1tpXS5zdGFydCArIDE7XG4gICAgfVxuICAgIGZvciAoaSA9IDA7IGkgPCBzZWdDb3VudDsgaSArPSAxKSB7XG4gICAgICAgIHJhbmdlc1tpXS5pZERlbHRhID0gcC5wYXJzZVNob3J0KCk7XG4gICAgfVxuICAgIGZvciAoaSA9IDA7IGkgPCBzZWdDb3VudDsgaSArPSAxKSB7XG4gICAgICAgIHBhcnNlck9mZnNldCA9IHAub2Zmc2V0ICsgcC5yZWxhdGl2ZU9mZnNldDtcbiAgICAgICAgaWRSYW5nZU9mZnNldCA9IHAucGFyc2VVU2hvcnQoKTtcbiAgICAgICAgaWYgKGlkUmFuZ2VPZmZzZXQgPiAwKSB7XG4gICAgICAgICAgICByYW5nZXNbaV0uaWRzID0gW107XG4gICAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgcmFuZ2VzW2ldLmxlbmd0aDsgaiArPSAxKSB7XG4gICAgICAgICAgICAgICAgcmFuZ2VzW2ldLmlkc1tqXSA9IHBhcnNlLmdldFVTaG9ydChkYXRhLCBwYXJzZXJPZmZzZXQgKyBpZFJhbmdlT2Zmc2V0KTtcbiAgICAgICAgICAgICAgICBpZFJhbmdlT2Zmc2V0ICs9IDI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgY21hcC5zZWdtZW50cyA9IHJhbmdlcztcbiAgICByZXR1cm4gY21hcDtcbn1cblxuLy8gUGFyc2UgYSBgQ0ZGYCBJTkRFWCBhcnJheS5cbi8vIEFuIGluZGV4IGFycmF5IGNvbnNpc3RzIG9mIGEgbGlzdCBvZiBvZmZzZXRzLCB0aGVuIGEgbGlzdCBvZiBvYmplY3RzIGF0IHRob3NlIG9mZnNldHMuXG5mdW5jdGlvbiBwYXJzZUNGRkluZGV4KGRhdGEsIHN0YXJ0LCBjb252ZXJzaW9uRm4pIHtcbiAgICB2YXIgb2Zmc2V0cywgb2JqZWN0cywgY291bnQsIGVuZE9mZnNldCwgb2Zmc2V0U2l6ZSwgb2JqZWN0T2Zmc2V0LCBwb3MsIGksIHZhbHVlO1xuICAgIG9mZnNldHMgPSBbXTtcbiAgICBvYmplY3RzID0gW107XG4gICAgY291bnQgPSBwYXJzZS5nZXRDYXJkMTYoZGF0YSwgc3RhcnQpO1xuICAgIGlmIChjb3VudCAhPT0gMCkge1xuICAgICAgICBvZmZzZXRTaXplID0gcGFyc2UuZ2V0Qnl0ZShkYXRhLCBzdGFydCArIDIpO1xuICAgICAgICBvYmplY3RPZmZzZXQgPSBzdGFydCArICgoY291bnQgKyAxKSAqIG9mZnNldFNpemUpICsgMjtcbiAgICAgICAgcG9zID0gc3RhcnQgKyAzO1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgY291bnQgKyAxOyBpICs9IDEpIHtcbiAgICAgICAgICAgIG9mZnNldHMucHVzaChwYXJzZS5nZXRPZmZzZXQoZGF0YSwgcG9zLCBvZmZzZXRTaXplKSk7XG4gICAgICAgICAgICBwb3MgKz0gb2Zmc2V0U2l6ZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBUaGUgdG90YWwgc2l6ZSBvZiB0aGUgaW5kZXggYXJyYXkgaXMgNCBoZWFkZXIgYnl0ZXMgKyB0aGUgdmFsdWUgb2YgdGhlIGxhc3Qgb2Zmc2V0LlxuICAgICAgICBlbmRPZmZzZXQgPSBvYmplY3RPZmZzZXQgKyBvZmZzZXRzW2NvdW50XTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBlbmRPZmZzZXQgPSBzdGFydCArIDI7XG4gICAgfVxuICAgIGZvciAoaSA9IDA7IGkgPCBvZmZzZXRzLmxlbmd0aCAtIDE7IGkgKz0gMSkge1xuICAgICAgICB2YWx1ZSA9IHBhcnNlLmdldEJ5dGVzKGRhdGEsIG9iamVjdE9mZnNldCArIG9mZnNldHNbaV0sIG9iamVjdE9mZnNldCArIG9mZnNldHNbaSArIDFdKTtcbiAgICAgICAgaWYgKGNvbnZlcnNpb25Gbikge1xuICAgICAgICAgICAgdmFsdWUgPSBjb252ZXJzaW9uRm4odmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIG9iamVjdHMucHVzaCh2YWx1ZSk7XG4gICAgfVxuICAgIHJldHVybiB7b2JqZWN0czogb2JqZWN0cywgc3RhcnRPZmZzZXQ6IHN0YXJ0LCBlbmRPZmZzZXQ6IGVuZE9mZnNldH07XG59XG5cbi8vIFBhcnNlIGEgYENGRmAgRElDVCByZWFsIHZhbHVlLlxuZnVuY3Rpb24gcGFyc2VGbG9hdE9wZXJhbmQocGFyc2VyKSB7XG4gICAgdmFyIHMsIGVvZiwgbG9va3VwLCBiLCBuMSwgbjI7XG4gICAgcyA9ICcnO1xuICAgIGVvZiA9IDE1O1xuICAgIGxvb2t1cCA9IFsnMCcsICcxJywgJzInLCAnMycsICc0JywgJzUnLCAnNicsICc3JywgJzgnLCAnOScsICcuJywgJ0UnLCAnRS0nLCBudWxsLCAnLSddO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgIGIgPSBwYXJzZXIucGFyc2VCeXRlKCk7XG4gICAgICAgIG4xID0gYiA+PiA0O1xuICAgICAgICBuMiA9IGIgJiAxNTtcblxuICAgICAgICBpZiAobjEgPT09IGVvZikge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgcyArPSBsb29rdXBbbjFdO1xuXG4gICAgICAgIGlmIChuMiA9PT0gZW9mKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBzICs9IGxvb2t1cFtuMl07XG4gICAgfVxuICAgIHJldHVybiBwYXJzZUZsb2F0KHMpO1xufVxuXG4vLyBQYXJzZSBhIGBDRkZgIERJQ1Qgb3BlcmFuZC5cbmZ1bmN0aW9uIHBhcnNlT3BlcmFuZChwYXJzZXIsIGIwKSB7XG4gICAgdmFyIGIxLCBiMiwgYjMsIGI0O1xuICAgIGlmIChiMCA9PT0gMjgpIHtcbiAgICAgICAgYjEgPSBwYXJzZXIucGFyc2VCeXRlKCk7XG4gICAgICAgIGIyID0gcGFyc2VyLnBhcnNlQnl0ZSgpO1xuICAgICAgICByZXR1cm4gYjEgPDwgOCB8IGIyO1xuICAgIH1cbiAgICBpZiAoYjAgPT09IDI5KSB7XG4gICAgICAgIGIxID0gcGFyc2VyLnBhcnNlQnl0ZSgpO1xuICAgICAgICBiMiA9IHBhcnNlci5wYXJzZUJ5dGUoKTtcbiAgICAgICAgYjMgPSBwYXJzZXIucGFyc2VCeXRlKCk7XG4gICAgICAgIGI0ID0gcGFyc2VyLnBhcnNlQnl0ZSgpO1xuICAgICAgICByZXR1cm4gYjEgPDwgMjQgfCBiMiA8PCAxNiB8IGIzIDw8IDggfCBiNDtcbiAgICB9XG4gICAgaWYgKGIwID09PSAzMCkge1xuICAgICAgICByZXR1cm4gcGFyc2VGbG9hdE9wZXJhbmQocGFyc2VyKTtcbiAgICB9XG4gICAgaWYgKGIwID49IDMyICYmIGIwIDw9IDI0Nikge1xuICAgICAgICByZXR1cm4gYjAgLSAxMzk7XG4gICAgfVxuICAgIGlmIChiMCA+PSAyNDcgJiYgYjAgPD0gMjUwKSB7XG4gICAgICAgIGIxID0gcGFyc2VyLnBhcnNlQnl0ZSgpO1xuICAgICAgICByZXR1cm4gKGIwIC0gMjQ3KSAqIDI1NiArIGIxICsgMTA4O1xuICAgIH1cbiAgICBpZiAoYjAgPj0gMjUxICYmIGIwIDw9IDI1NCkge1xuICAgICAgICBiMSA9IHBhcnNlci5wYXJzZUJ5dGUoKTtcbiAgICAgICAgcmV0dXJuIC0oYjAgLSAyNTEpICogMjU2IC0gYjEgLSAxMDg7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBiMCAnICsgYjApO1xufVxuXG4vLyBDb252ZXJ0IHRoZSBlbnRyaWVzIHJldHVybmVkIGJ5IGBwYXJzZURpY3RgIHRvIGEgcHJvcGVyIGRpY3Rpb25hcnkuXG4vLyBJZiBhIHZhbHVlIGlzIGEgbGlzdCBvZiBvbmUsIGl0IGlzIHVucGFja2VkLlxuZnVuY3Rpb24gZW50cmllc1RvT2JqZWN0KGVudHJpZXMpIHtcbiAgICB2YXIgbywga2V5LCB2YWx1ZXMsIGksIHZhbHVlO1xuICAgIG8gPSB7fTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgZW50cmllcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICBrZXkgPSBlbnRyaWVzW2ldWzBdO1xuICAgICAgICB2YWx1ZXMgPSBlbnRyaWVzW2ldWzFdO1xuICAgICAgICBpZiAodmFsdWVzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZXNbMF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlcztcbiAgICAgICAgfVxuICAgICAgICBpZiAoby5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ09iamVjdCAnICsgbyArICcgYWxyZWFkeSBoYXMga2V5ICcgKyBrZXkpO1xuICAgICAgICB9XG4gICAgICAgIG9ba2V5XSA9IHZhbHVlO1xuICAgIH1cbiAgICByZXR1cm4gbztcbn1cblxuLy8gUGFyc2UgYSBgQ0ZGYCBESUNUIG9iamVjdC5cbi8vIEEgZGljdGlvbmFyeSBjb250YWlucyBrZXktdmFsdWUgcGFpcnMgaW4gYSBjb21wYWN0IHRva2VuaXplZCBmb3JtYXQuXG5mdW5jdGlvbiBwYXJzZUNGRkRpY3QoZGF0YSwgc3RhcnQsIHNpemUpIHtcbiAgICB2YXIgcGFyc2VyLCBlbnRyaWVzLCBvcGVyYW5kcywgb3A7XG4gICAgc3RhcnQgPSBzdGFydCAhPT0gdW5kZWZpbmVkID8gc3RhcnQgOiAwO1xuICAgIHBhcnNlciA9IG5ldyBwYXJzZS5QYXJzZXIoZGF0YSwgc3RhcnQpO1xuICAgIGVudHJpZXMgPSBbXTtcbiAgICBvcGVyYW5kcyA9IFtdO1xuICAgIHNpemUgPSBzaXplICE9PSB1bmRlZmluZWQgPyBzaXplIDogZGF0YS5sZW5ndGg7XG5cbiAgICB3aGlsZSAocGFyc2VyLnJlbGF0aXZlT2Zmc2V0IDwgc2l6ZSkge1xuICAgICAgICBvcCA9IHBhcnNlci5wYXJzZUJ5dGUoKTtcbiAgICAgICAgLy8gVGhlIGZpcnN0IGJ5dGUgZm9yIGVhY2ggZGljdCBpdGVtIGRpc3Rpbmd1aXNoZXMgYmV0d2VlbiBvcGVyYXRvciAoa2V5KSBhbmQgb3BlcmFuZCAodmFsdWUpLlxuICAgICAgICAvLyBWYWx1ZXMgPD0gMjEgYXJlIG9wZXJhdG9ycy5cbiAgICAgICAgaWYgKG9wIDw9IDIxKSB7XG4gICAgICAgICAgICAvLyBUd28tYnl0ZSBvcGVyYXRvcnMgaGF2ZSBhbiBpbml0aWFsIGVzY2FwZSBieXRlIG9mIDEyLlxuICAgICAgICAgICAgaWYgKG9wID09PSAxMikge1xuICAgICAgICAgICAgICAgIG9wID0gMTIwMCArIHBhcnNlci5wYXJzZUJ5dGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVudHJpZXMucHVzaChbb3AsIG9wZXJhbmRzXSk7XG4gICAgICAgICAgICBvcGVyYW5kcyA9IFtdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gU2luY2UgdGhlIG9wZXJhbmRzICh2YWx1ZXMpIGNvbWUgYmVmb3JlIHRoZSBvcGVyYXRvcnMgKGtleXMpLCB3ZSBzdG9yZSBhbGwgb3BlcmFuZHMgaW4gYSBsaXN0XG4gICAgICAgICAgICAvLyB1bnRpbCB3ZSBlbmNvdW50ZXIgYW4gb3BlcmF0b3IuXG4gICAgICAgICAgICBvcGVyYW5kcy5wdXNoKHBhcnNlT3BlcmFuZChwYXJzZXIsIG9wKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGVudHJpZXNUb09iamVjdChlbnRyaWVzKTtcbn1cblxuLy8gR2l2ZW4gYSBTdHJpbmcgSW5kZXggKFNJRCksIHJldHVybiB0aGUgdmFsdWUgb2YgdGhlIHN0cmluZy5cbi8vIFN0cmluZ3MgYmVsb3cgaW5kZXggMzkyIGFyZSBzdGFuZGFyZCBDRkYgc3RyaW5ncyBhbmQgYXJlIG5vdCBlbmNvZGVkIGluIHRoZSBmb250LlxuZnVuY3Rpb24gZ2V0Q0ZGU3RyaW5nKHN0cmluZ3MsIGluZGV4KSB7XG4gICAgaWYgKGluZGV4IDw9IDM5MSkge1xuICAgICAgICBpbmRleCA9IGNmZlN0YW5kYXJkU3RyaW5nc1tpbmRleF07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaW5kZXggPSBzdHJpbmdzW2luZGV4IC0gMzkxXTtcbiAgICB9XG4gICAgcmV0dXJuIGluZGV4O1xufVxuXG4vLyBJbnRlcnByZXQgYSBkaWN0aW9uYXJ5IGFuZCByZXR1cm4gYSBuZXcgZGljdGlvbmFyeSB3aXRoIHJlYWRhYmxlIGtleXMgYW5kIHZhbHVlcyBmb3IgbWlzc2luZyBlbnRyaWVzLlxuLy8gVGhpcyBmdW5jdGlvbiB0YWtlcyBgbWV0YWAgd2hpY2ggaXMgYSBsaXN0IG9mIG9iamVjdHMgY29udGFpbmluZyBgb3BlcmFuZGAsIGBuYW1lYCBhbmQgYGRlZmF1bHRgLlxuZnVuY3Rpb24gaW50ZXJwcmV0RGljdChkaWN0LCBtZXRhLCBzdHJpbmdzKSB7XG4gICAgdmFyIGksIG0sIHZhbHVlLCBuZXdEaWN0O1xuICAgIG5ld0RpY3QgPSB7fTtcbiAgICAvLyBCZWNhdXNlIHdlIGFsc28gd2FudCB0byBpbmNsdWRlIG1pc3NpbmcgdmFsdWVzLCB3ZSBzdGFydCBvdXQgZnJvbSB0aGUgbWV0YSBsaXN0XG4gICAgLy8gYW5kIGxvb2t1cCB2YWx1ZXMgaW4gdGhlIGRpY3QuXG4gICAgZm9yIChpID0gMDsgaSA8IG1ldGEubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgbSA9IG1ldGFbaV07XG4gICAgICAgIHZhbHVlID0gZGljdFttLm9wXTtcbiAgICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHZhbHVlID0gbS52YWx1ZSAhPT0gdW5kZWZpbmVkID8gbS52YWx1ZSA6IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG0udHlwZSA9PT0gJ1NJRCcpIHtcbiAgICAgICAgICAgIHZhbHVlID0gZ2V0Q0ZGU3RyaW5nKHN0cmluZ3MsIHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBuZXdEaWN0W20ubmFtZV0gPSB2YWx1ZTtcbiAgICB9XG4gICAgcmV0dXJuIG5ld0RpY3Q7XG59XG5cbi8vIFBhcnNlIHRoZSBDRkYgaGVhZGVyLlxuZnVuY3Rpb24gcGFyc2VDRkZIZWFkZXIoZGF0YSwgc3RhcnQpIHtcbiAgICB2YXIgaGVhZGVyID0ge307XG4gICAgaGVhZGVyLmZvcm1hdE1ham9yID0gcGFyc2UuZ2V0Q2FyZDgoZGF0YSwgc3RhcnQpO1xuICAgIGhlYWRlci5mb3JtYXRNaW5vciA9IHBhcnNlLmdldENhcmQ4KGRhdGEsIHN0YXJ0ICsgMSk7XG4gICAgaGVhZGVyLnNpemUgPSBwYXJzZS5nZXRDYXJkOChkYXRhLCBzdGFydCArIDIpO1xuICAgIGhlYWRlci5vZmZzZXRTaXplID0gcGFyc2UuZ2V0Q2FyZDgoZGF0YSwgc3RhcnQgKyAzKTtcbiAgICBoZWFkZXIuc3RhcnRPZmZzZXQgPSBzdGFydDtcbiAgICBoZWFkZXIuZW5kT2Zmc2V0ID0gc3RhcnQgKyA0O1xuICAgIHJldHVybiBoZWFkZXI7XG59XG5cbi8vIFBhcnNlIHRoZSBDRkYgdG9wIGRpY3Rpb25hcnkuIEEgQ0ZGIHRhYmxlIGNhbiBjb250YWluIG11bHRpcGxlIGZvbnRzLCBlYWNoIHdpdGggdGhlaXIgb3duIHRvcCBkaWN0aW9uYXJ5LlxuLy8gVGhlIHRvcCBkaWN0aW9uYXJ5IGNvbnRhaW5zIHRoZSBlc3NlbnRpYWwgbWV0YWRhdGEgZm9yIHRoZSBmb250LCB0b2dldGhlciB3aXRoIHRoZSBwcml2YXRlIGRpY3Rpb25hcnkuXG5mdW5jdGlvbiBwYXJzZUNGRlRvcERpY3QoZGF0YSwgc3RyaW5ncykge1xuICAgIHZhciBkaWN0LCBtZXRhO1xuICAgIG1ldGEgPSBbXG4gICAgICAgIHtuYW1lOiAndmVyc2lvbicsIG9wOiAwLCB0eXBlOiAnU0lEJ30sXG4gICAgICAgIHtuYW1lOiAnbm90aWNlJywgb3A6IDEsIHR5cGU6ICdTSUQnfSxcbiAgICAgICAge25hbWU6ICdjb3B5cmlnaHQnLCBvcDogMTIwMCwgdHlwZTogJ1NJRCd9LFxuICAgICAgICB7bmFtZTogJ2Z1bGxOYW1lJywgb3A6IDIsIHR5cGU6ICdTSUQnfSxcbiAgICAgICAge25hbWU6ICdmYW1pbHlOYW1lJywgb3A6IDMsIHR5cGU6ICdTSUQnfSxcbiAgICAgICAge25hbWU6ICd3ZWlnaHQnLCBvcDogNCwgdHlwZTogJ1NJRCd9LFxuICAgICAgICB7bmFtZTogJ2lzRml4ZWRQaXRjaCcsIG9wOiAxMjAxLCB0eXBlOiAnbnVtYmVyJywgdmFsdWU6IDB9LFxuICAgICAgICB7bmFtZTogJ2l0YWxpY0FuZ2xlJywgb3A6IDEyMDIsIHR5cGU6ICdudW1iZXInLCB2YWx1ZTogMH0sXG4gICAgICAgIHtuYW1lOiAndW5kZXJsaW5lUG9zaXRpb24nLCBvcDogMTIwMywgdHlwZTogJ251bWJlcicsIHZhbHVlOiAtMTAwfSxcbiAgICAgICAge25hbWU6ICd1bmRlcmxpbmVUaGlja25lc3MnLCBvcDogMTIwNCwgdHlwZTogJ251bWJlcicsIHZhbHVlOiA1MH0sXG4gICAgICAgIHtuYW1lOiAncGFpbnRUeXBlJywgb3A6IDEyMDUsIHR5cGU6ICdudW1iZXInLCB2YWx1ZTogMH0sXG4gICAgICAgIHtuYW1lOiAnY2hhcnN0cmluZ1R5cGUnLCBvcDogMTIwNiwgdHlwZTogJ251bWJlcicsIHZhbHVlOiAyfSxcbiAgICAgICAge25hbWU6ICdmb250TWF0cml4Jywgb3A6IDEyMDcsIHR5cGU6IFsnbnVtYmVyJywgJ251bWJlcicsICdudW1iZXInLCAnbnVtYmVyJ10sIHZhbHVlOiBbMC4wMDEsIDAsIDAsIDAuMDAxLCAwLCAwXX0sXG4gICAgICAgIHtuYW1lOiAndW5pcXVlSWQnLCBvcDogMTMsIHR5cGU6ICdudW1iZXInfSxcbiAgICAgICAge25hbWU6ICdmb250QkJveCcsIG9wOiA1LCB0eXBlOiBbJ251bWJlcicsICdudW1iZXInLCAnbnVtYmVyJywgJ251bWJlciddLCB2YWx1ZTogWzAsIDAsIDAsIDBdfSxcbiAgICAgICAge25hbWU6ICdzdHJva2VXaWR0aCcsIG9wOiAxMjA4LCB0eXBlOiAnbnVtYmVyJywgdmFsdWU6IDB9LFxuICAgICAgICB7bmFtZTogJ3h1aWQnLCBvcDogMTQsIHR5cGU6IFtdfSxcbiAgICAgICAge25hbWU6ICdjaGFyc2V0Jywgb3A6IDE1LCB0eXBlOiAnb2Zmc2V0JywgdmFsdWU6IDB9LFxuICAgICAgICB7bmFtZTogJ2VuY29kaW5nJywgb3A6IDE2LCB0eXBlOiAnb2Zmc2V0JywgdmFsdWU6IDB9LFxuICAgICAgICB7bmFtZTogJ2NoYXJTdHJpbmdzJywgb3A6IDE3LCB0eXBlOiAnbnVtYmVyJywgdmFsdWU6IDB9LFxuICAgICAgICB7bmFtZTogJ3ByaXZhdGUnLCBvcDogMTgsIHR5cGU6IFsnbnVtYmVyJywgJ29mZnNldCddLCB2YWx1ZTogWzAsIDBdfVxuICAgIF07XG4gICAgZGljdCA9IHBhcnNlQ0ZGRGljdChkYXRhLCAwLCBkYXRhLmJ5dGVMZW5ndGgpO1xuICAgIHJldHVybiBpbnRlcnByZXREaWN0KGRpY3QsIG1ldGEsIHN0cmluZ3MpO1xufVxuXG4vLyBQYXJzZSB0aGUgQ0ZGIHByaXZhdGUgZGljdGlvbmFyeS4gV2UgZG9uJ3QgZnVsbHkgcGFyc2Ugb3V0IGFsbCB0aGUgdmFsdWVzLCBvbmx5IHRoZSBvbmVzIHdlIG5lZWQuXG5mdW5jdGlvbiBwYXJzZUNGRlByaXZhdGVEaWN0KGRhdGEsIHN0YXJ0LCBzaXplLCBzdHJpbmdzKSB7XG4gICAgdmFyIGRpY3QsIG1ldGE7XG4gICAgbWV0YSA9IFtcbiAgICAgICAge25hbWU6ICdzdWJycycsIG9wOiAxOSwgdHlwZTogJ29mZnNldCcsIHZhbHVlOiAwfSxcbiAgICAgICAge25hbWU6ICdkZWZhdWx0V2lkdGhYJywgb3A6IDIwLCB0eXBlOiAnbnVtYmVyJywgdmFsdWU6IDB9LFxuICAgICAgICB7bmFtZTogJ25vbWluYWxXaWR0aFgnLCBvcDogMjEsIHR5cGU6ICdudW1iZXInLCB2YWx1ZTogMH1cbiAgICBdO1xuICAgIGRpY3QgPSBwYXJzZUNGRkRpY3QoZGF0YSwgc3RhcnQsIHNpemUpO1xuICAgIHJldHVybiBpbnRlcnByZXREaWN0KGRpY3QsIG1ldGEsIHN0cmluZ3MpO1xufVxuXG4vLyBQYXJzZSB0aGUgQ0ZGIGNoYXJzZXQgdGFibGUsIHdoaWNoIGNvbnRhaW5zIGludGVybmFsIG5hbWVzIGZvciBhbGwgdGhlIGdseXBocy5cbi8vIFRoaXMgZnVuY3Rpb24gd2lsbCByZXR1cm4gYSBsaXN0IG9mIGdseXBoIG5hbWVzLlxuLy8gU2VlIEFkb2JlIFROICM1MTc2IGNoYXB0ZXIgMTMsIFwiQ2hhcnNldHNcIi5cbmZ1bmN0aW9uIHBhcnNlQ0ZGQ2hhcnNldChkYXRhLCBzdGFydCwgbkdseXBocywgc3RyaW5ncykge1xuICAgIHZhciBwYXJzZXIsIGZvcm1hdCwgY2hhcnNldCwgaSwgc2lkLCBjb3VudDtcbiAgICBwYXJzZXIgPSBuZXcgcGFyc2UuUGFyc2VyKGRhdGEsIHN0YXJ0KTtcbiAgICAvLyBUaGUgLm5vdGRlZiBnbHlwaCBpcyBub3QgaW5jbHVkZWQsIHNvIHN1YnRyYWN0IDEuXG4gICAgbkdseXBocyAtPSAxO1xuICAgIGNoYXJzZXQgPSBbJy5ub3RkZWYnXTtcblxuICAgIGZvcm1hdCA9IHBhcnNlci5wYXJzZUNhcmQ4KCk7XG4gICAgaWYgKGZvcm1hdCA9PT0gMCkge1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbkdseXBoczsgaSArPSAxKSB7XG4gICAgICAgICAgICBzaWQgPSBwYXJzZXIucGFyc2VTSUQoKTtcbiAgICAgICAgICAgIGNoYXJzZXQucHVzaChnZXRDRkZTdHJpbmcoc3RyaW5ncywgc2lkKSk7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGZvcm1hdCA9PT0gMSkge1xuICAgICAgICB3aGlsZSAoY2hhcnNldC5sZW5ndGggPD0gbkdseXBocykge1xuICAgICAgICAgICAgc2lkID0gcGFyc2VyLnBhcnNlU0lEKCk7XG4gICAgICAgICAgICBjb3VudCA9IHBhcnNlci5wYXJzZUNhcmQ4KCk7XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDw9IGNvdW50OyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICBjaGFyc2V0LnB1c2goZ2V0Q0ZGU3RyaW5nKHN0cmluZ3MsIHNpZCkpO1xuICAgICAgICAgICAgICAgIHNpZCArPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChmb3JtYXQgPT09IDIpIHtcbiAgICAgICAgd2hpbGUgKGNoYXJzZXQubGVuZ3RoIDw9IG5HbHlwaHMpIHtcbiAgICAgICAgICAgIHNpZCA9IHBhcnNlci5wYXJzZVNJRCgpO1xuICAgICAgICAgICAgY291bnQgPSBwYXJzZXIucGFyc2VDYXJkMTYoKTtcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPD0gY291bnQ7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgIGNoYXJzZXQucHVzaChnZXRDRkZTdHJpbmcoc3RyaW5ncywgc2lkKSk7XG4gICAgICAgICAgICAgICAgc2lkICs9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gY2hhcnNldCBmb3JtYXQgJyArIGZvcm1hdCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNoYXJzZXQ7XG59XG5cbi8vIFBhcnNlIHRoZSBDRkYgZW5jb2RpbmcgZGF0YS4gT25seSBvbmUgZW5jb2RpbmcgY2FuIGJlIHNwZWNpZmllZCBwZXIgZm9udC5cbi8vIFNlZSBBZG9iZSBUTiAjNTE3NiBjaGFwdGVyIDEyLCBcIkVuY29kaW5nc1wiLlxuZnVuY3Rpb24gcGFyc2VDRkZFbmNvZGluZyhkYXRhLCBzdGFydCwgY2hhcnNldCkge1xuICAgIHZhciBlbmNvZGluZywgcGFyc2VyLCBmb3JtYXQsIG5Db2RlcywgaSwgY29kZSwgblJhbmdlcywgZmlyc3QsIG5MZWZ0LCBqO1xuICAgIGVuY29kaW5nID0ge307XG4gICAgcGFyc2VyID0gbmV3IHBhcnNlLlBhcnNlcihkYXRhLCBzdGFydCk7XG4gICAgZm9ybWF0ID0gcGFyc2VyLnBhcnNlQ2FyZDgoKTtcbiAgICBpZiAoZm9ybWF0ID09PSAwKSB7XG4gICAgICAgIG5Db2RlcyA9IHBhcnNlci5wYXJzZUNhcmQ4KCk7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBuQ29kZXM7IGkgKz0gMSkge1xuICAgICAgICAgICAgY29kZSA9IHBhcnNlci5wYXJzZUNhcmQ4KCk7XG4gICAgICAgICAgICBlbmNvZGluZ1tjb2RlXSA9IGk7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGZvcm1hdCA9PT0gMSkge1xuICAgICAgICBuUmFuZ2VzID0gcGFyc2VyLnBhcnNlQ2FyZDgoKTtcbiAgICAgICAgY29kZSA9IDE7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBuUmFuZ2VzOyBpICs9IDEpIHtcbiAgICAgICAgICAgIGZpcnN0ID0gcGFyc2VyLnBhcnNlQ2FyZDgoKTtcbiAgICAgICAgICAgIG5MZWZ0ID0gcGFyc2VyLnBhcnNlQ2FyZDgoKTtcbiAgICAgICAgICAgIGZvciAoaiA9IGZpcnN0OyBqIDw9IGZpcnN0ICsgbkxlZnQ7IGogKz0gMSkge1xuICAgICAgICAgICAgICAgIGVuY29kaW5nW2pdID0gY29kZTtcbiAgICAgICAgICAgICAgICBjb2RlICs9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gZW5jb2RpbmcgZm9ybWF0ICcgKyBmb3JtYXQpO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IENmZkVuY29kaW5nKGVuY29kaW5nLCBjaGFyc2V0KTtcbn1cblxuLy8gVGFrZSBpbiBjaGFyc3RyaW5nIGNvZGUgYW5kIHJldHVybiBhIEdseXBoIG9iamVjdC5cbi8vIFRoZSBlbmNvZGluZyBpcyBkZXNjcmliZWQgaW4gdGhlIFR5cGUgMiBDaGFyc3RyaW5nIEZvcm1hdFxuLy8gaHR0cHM6Ly93d3cubWljcm9zb2Z0LmNvbS90eXBvZ3JhcGh5L09UU1BFQy9jaGFyc3RyMi5odG1cbmZ1bmN0aW9uIHBhcnNlQ0ZGQ2hhcnN0cmluZyhjb2RlLCBmb250LCBpbmRleCkge1xuICAgIHZhciBwLCBnbHlwaCwgc3RhY2ssIG5TdGVtcywgaGF2ZVdpZHRoLCB3aWR0aCwgeCwgeSwgYzF4LCBjMXksIGMyeCwgYzJ5LCB2O1xuICAgIHAgPSBuZXcgcGF0aC5QYXRoKCk7XG4gICAgc3RhY2sgPSBbXTtcbiAgICBuU3RlbXMgPSAwO1xuICAgIGhhdmVXaWR0aCA9IGZhbHNlO1xuICAgIHdpZHRoID0gZm9udC5ub21pbmFsV2lkdGhYO1xuICAgIHggPSB5ID0gMDtcblxuICAgIGZ1bmN0aW9uIHBhcnNlU3RlbXMoKSB7XG4gICAgICAgIHZhciBoYXNXaWR0aEFyZztcbiAgICAgICAgLy8gVGhlIG51bWJlciBvZiBzdGVtIG9wZXJhdG9ycyBvbiB0aGUgc3RhY2sgaXMgYWx3YXlzIGV2ZW4uXG4gICAgICAgIC8vIElmIHRoZSB2YWx1ZSBpcyB1bmV2ZW4sIHRoYXQgbWVhbnMgYSB3aWR0aCBpcyBzcGVjaWZpZWQuXG4gICAgICAgIGhhc1dpZHRoQXJnID0gc3RhY2subGVuZ3RoICUgMiAhPT0gMDtcbiAgICAgICAgaWYgKGhhc1dpZHRoQXJnICYmICFoYXZlV2lkdGgpIHtcbiAgICAgICAgICAgIHdpZHRoID0gc3RhY2suc2hpZnQoKSArIGZvbnQubm9taW5hbFdpZHRoWDtcbiAgICAgICAgfVxuICAgICAgICBuU3RlbXMgKz0gc3RhY2subGVuZ3RoID4+IDE7XG4gICAgICAgIHN0YWNrLmxlbmd0aCA9IDA7XG4gICAgICAgIGhhdmVXaWR0aCA9IHRydWU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2UoY29kZSkge1xuICAgICAgICB2YXIgaSwgYjEsIGIyLCBiMywgYjQsIGNvZGVJbmRleCwgc3VickNvZGU7XG4gICAgICAgIGkgPSAwO1xuICAgICAgICB3aGlsZSAoaSA8IGNvZGUubGVuZ3RoKSB7XG4gICAgICAgICAgICB2ID0gY29kZVtpXTtcbiAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgIHN3aXRjaCAodikge1xuICAgICAgICAgICAgY2FzZSAxOiAvLyBoc3RlbVxuICAgICAgICAgICAgICAgIHBhcnNlU3RlbXMoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMzogLy8gdnN0ZW1cbiAgICAgICAgICAgICAgICBwYXJzZVN0ZW1zKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDQ6IC8vIHZtb3ZldG9cbiAgICAgICAgICAgICAgICBpZiAoc3RhY2subGVuZ3RoID4gMSAmJiAhaGF2ZVdpZHRoKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpZHRoID0gc3RhY2suc2hpZnQoKSArIGZvbnQubm9taW5hbFdpZHRoWDtcbiAgICAgICAgICAgICAgICAgICAgaGF2ZVdpZHRoID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgeSArPSBzdGFjay5wb3AoKTtcbiAgICAgICAgICAgICAgICBwLm1vdmVUbyh4LCAteSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDU6IC8vIHJsaW5ldG9cbiAgICAgICAgICAgICAgICB3aGlsZSAoc3RhY2subGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB4ICs9IHN0YWNrLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIHkgKz0gc3RhY2suc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgcC5saW5lVG8oeCwgLXkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNjogLy8gaGxpbmV0b1xuICAgICAgICAgICAgICAgIHdoaWxlIChzdGFjay5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHggKz0gc3RhY2suc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgcC5saW5lVG8oeCwgLXkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RhY2subGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB5ICs9IHN0YWNrLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIHAubGluZVRvKHgsIC15KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDc6IC8vIHZsaW5ldG9cbiAgICAgICAgICAgICAgICB3aGlsZSAoc3RhY2subGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB5ICs9IHN0YWNrLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIHAubGluZVRvKHgsIC15KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0YWNrLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgeCArPSBzdGFjay5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBwLmxpbmVUbyh4LCAteSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA4OiAvLyBycmN1cnZldG9cbiAgICAgICAgICAgICAgICB3aGlsZSAoc3RhY2subGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBjMXggPSB4ICsgc3RhY2suc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgYzF5ID0geSArIHN0YWNrLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGMyeCA9IGMxeCArIHN0YWNrLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGMyeSA9IGMxeSArIHN0YWNrLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIHggPSBjMnggKyBzdGFjay5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICB5ID0gYzJ5ICsgc3RhY2suc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgcC5jdXJ2ZVRvKGMxeCwgLWMxeSwgYzJ4LCAtYzJ5LCB4LCAteSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAxMDogLy8gY2FsbHN1YnJcbiAgICAgICAgICAgICAgICBjb2RlSW5kZXggPSBzdGFjay5wb3AoKSArIGZvbnQuc3VicnNCaWFzO1xuICAgICAgICAgICAgICAgIHN1YnJDb2RlID0gZm9udC5zdWJyc1tjb2RlSW5kZXhdO1xuICAgICAgICAgICAgICAgIGlmIChzdWJyQ29kZSkge1xuICAgICAgICAgICAgICAgICAgICBwYXJzZShzdWJyQ29kZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAxMTogLy8gcmV0dXJuXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgY2FzZSAxMjogLy8gZXNjYXBlXG4gICAgICAgICAgICAgICAgdiA9IGNvZGVbaV07XG4gICAgICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAxNDogLy8gZW5kY2hhclxuICAgICAgICAgICAgICAgIGlmIChzdGFjay5sZW5ndGggPiAwICYmICFoYXZlV2lkdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgd2lkdGggPSBzdGFjay5zaGlmdCgpICsgZm9udC5ub21pbmFsV2lkdGhYO1xuICAgICAgICAgICAgICAgICAgICBoYXZlV2lkdGggPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwLmNsb3NlUGF0aCgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAxODogLy8gaHN0ZW1obVxuICAgICAgICAgICAgICAgIHBhcnNlU3RlbXMoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMTk6IC8vIGhpbnRtYXNrXG4gICAgICAgICAgICBjYXNlIDIwOiAvLyBjbnRybWFza1xuICAgICAgICAgICAgICAgIHBhcnNlU3RlbXMoKTtcbiAgICAgICAgICAgICAgICBpICs9IChuU3RlbXMgKyA3KSA+PiAzO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAyMTogLy8gcm1vdmV0b1xuICAgICAgICAgICAgICAgIGlmIChzdGFjay5sZW5ndGggPiAyICYmICFoYXZlV2lkdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgd2lkdGggPSBzdGFjay5zaGlmdCgpICsgZm9udC5ub21pbmFsV2lkdGhYO1xuICAgICAgICAgICAgICAgICAgICBoYXZlV2lkdGggPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB5ICs9IHN0YWNrLnBvcCgpO1xuICAgICAgICAgICAgICAgIHggKz0gc3RhY2sucG9wKCk7XG4gICAgICAgICAgICAgICAgcC5tb3ZlVG8oeCwgLXkpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAyMjogLy8gaG1vdmV0b1xuICAgICAgICAgICAgICAgIGlmIChzdGFjay5sZW5ndGggPiAxICYmICFoYXZlV2lkdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgd2lkdGggPSBzdGFjay5zaGlmdCgpICsgZm9udC5ub21pbmFsV2lkdGhYO1xuICAgICAgICAgICAgICAgICAgICBoYXZlV2lkdGggPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB4ICs9IHN0YWNrLnBvcCgpO1xuICAgICAgICAgICAgICAgIHAubW92ZVRvKHgsIC15KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMjM6IC8vIHZzdGVtaG1cbiAgICAgICAgICAgICAgICBwYXJzZVN0ZW1zKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDI0OiAvLyByY3VydmVsaW5lXG4gICAgICAgICAgICAgICAgd2hpbGUgKHN0YWNrLmxlbmd0aCA+IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgYzF4ID0geCArIHN0YWNrLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGMxeSA9IHkgKyBzdGFjay5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBjMnggPSBjMXggKyBzdGFjay5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBjMnkgPSBjMXkgKyBzdGFjay5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICB4ID0gYzJ4ICsgc3RhY2suc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgeSA9IGMyeSArIHN0YWNrLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIHAuY3VydmVUbyhjMXgsIC1jMXksIGMyeCwgLWMyeSwgeCwgLXkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB4ICs9IHN0YWNrLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgeSArPSBzdGFjay5zaGlmdCgpO1xuICAgICAgICAgICAgICAgIHAubGluZVRvKHgsIC15KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMjU6IC8vIHJsaW5lY3VydmVcbiAgICAgICAgICAgICAgICB3aGlsZSAoc3RhY2subGVuZ3RoID4gNikge1xuICAgICAgICAgICAgICAgICAgICB4ICs9IHN0YWNrLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIHkgKz0gc3RhY2suc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgcC5saW5lVG8oeCwgLXkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjMXggPSB4ICsgc3RhY2suc2hpZnQoKTtcbiAgICAgICAgICAgICAgICBjMXkgPSB5ICsgc3RhY2suc2hpZnQoKTtcbiAgICAgICAgICAgICAgICBjMnggPSBjMXggKyBzdGFjay5zaGlmdCgpO1xuICAgICAgICAgICAgICAgIGMyeSA9IGMxeSArIHN0YWNrLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgeCA9IGMyeCArIHN0YWNrLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgeSA9IGMyeSArIHN0YWNrLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgcC5jdXJ2ZVRvKGMxeCwgLWMxeSwgYzJ4LCAtYzJ5LCB4LCAteSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDI2OiAvLyB2dmN1cnZldG9cbiAgICAgICAgICAgICAgICBpZiAoc3RhY2subGVuZ3RoICUgMikge1xuICAgICAgICAgICAgICAgICAgICB4ICs9IHN0YWNrLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHdoaWxlIChzdGFjay5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGMxeCA9IHg7XG4gICAgICAgICAgICAgICAgICAgIGMxeSA9IHkgKyBzdGFjay5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBjMnggPSBjMXggKyBzdGFjay5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBjMnkgPSBjMXkgKyBzdGFjay5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICB4ID0gYzJ4O1xuICAgICAgICAgICAgICAgICAgICB5ID0gYzJ5ICsgc3RhY2suc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgcC5jdXJ2ZVRvKGMxeCwgLWMxeSwgYzJ4LCAtYzJ5LCB4LCAteSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAyNzogLy8gaGhjdXJ2ZXRvXG4gICAgICAgICAgICAgICAgaWYgKHN0YWNrLmxlbmd0aCAlIDIpIHtcbiAgICAgICAgICAgICAgICAgICAgeSArPSBzdGFjay5zaGlmdCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB3aGlsZSAoc3RhY2subGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBjMXggPSB4ICsgc3RhY2suc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgYzF5ID0geTtcbiAgICAgICAgICAgICAgICAgICAgYzJ4ID0gYzF4ICsgc3RhY2suc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgYzJ5ID0gYzF5ICsgc3RhY2suc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgeCA9IGMyeCArIHN0YWNrLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIHkgPSBjMnk7XG4gICAgICAgICAgICAgICAgICAgIHAuY3VydmVUbyhjMXgsIC1jMXksIGMyeCwgLWMyeSwgeCwgLXkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMjg6IC8vIHNob3J0aW50XG4gICAgICAgICAgICAgICAgYjEgPSBjb2RlW2ldO1xuICAgICAgICAgICAgICAgIGIyID0gY29kZVtpICsgMV07XG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaCgoKGIxIDw8IDI0KSB8IChiMiA8PCAxNikpID4+IDE2KTtcbiAgICAgICAgICAgICAgICBpICs9IDI7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDI5OiAvLyBjYWxsZ3N1YnJcbiAgICAgICAgICAgICAgICBjb2RlSW5kZXggPSBzdGFjay5wb3AoKSArIGZvbnQuZ3N1YnJzQmlhcztcbiAgICAgICAgICAgICAgICBzdWJyQ29kZSA9IGZvbnQuZ3N1YnJzW2NvZGVJbmRleF07XG4gICAgICAgICAgICAgICAgaWYgKHN1YnJDb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcnNlKHN1YnJDb2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDMwOiAvLyB2aGN1cnZldG9cbiAgICAgICAgICAgICAgICB3aGlsZSAoc3RhY2subGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBjMXggPSB4O1xuICAgICAgICAgICAgICAgICAgICBjMXkgPSB5ICsgc3RhY2suc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgYzJ4ID0gYzF4ICsgc3RhY2suc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgYzJ5ID0gYzF5ICsgc3RhY2suc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgeCA9IGMyeCArIHN0YWNrLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIHkgPSBjMnkgKyAoc3RhY2subGVuZ3RoID09PSAxID8gc3RhY2suc2hpZnQoKSA6IDApO1xuICAgICAgICAgICAgICAgICAgICBwLmN1cnZlVG8oYzF4LCAtYzF5LCBjMngsIC1jMnksIHgsIC15KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0YWNrLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYzF4ID0geCArIHN0YWNrLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGMxeSA9IHk7XG4gICAgICAgICAgICAgICAgICAgIGMyeCA9IGMxeCArIHN0YWNrLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGMyeSA9IGMxeSArIHN0YWNrLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIHkgPSBjMnkgKyBzdGFjay5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICB4ID0gYzJ4ICsgKHN0YWNrLmxlbmd0aCA9PT0gMSA/IHN0YWNrLnNoaWZ0KCkgOiAwKTtcbiAgICAgICAgICAgICAgICAgICAgcC5jdXJ2ZVRvKGMxeCwgLWMxeSwgYzJ4LCAtYzJ5LCB4LCAteSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAzMTogLy8gaHZjdXJ2ZXRvXG4gICAgICAgICAgICAgICAgd2hpbGUgKHN0YWNrLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgYzF4ID0geCArIHN0YWNrLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGMxeSA9IHk7XG4gICAgICAgICAgICAgICAgICAgIGMyeCA9IGMxeCArIHN0YWNrLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGMyeSA9IGMxeSArIHN0YWNrLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIHkgPSBjMnkgKyBzdGFjay5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICB4ID0gYzJ4ICsgKHN0YWNrLmxlbmd0aCA9PT0gMSA/IHN0YWNrLnNoaWZ0KCkgOiAwKTtcbiAgICAgICAgICAgICAgICAgICAgcC5jdXJ2ZVRvKGMxeCwgLWMxeSwgYzJ4LCAtYzJ5LCB4LCAteSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdGFjay5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGMxeCA9IHg7XG4gICAgICAgICAgICAgICAgICAgIGMxeSA9IHkgKyBzdGFjay5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBjMnggPSBjMXggKyBzdGFjay5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBjMnkgPSBjMXkgKyBzdGFjay5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICB4ID0gYzJ4ICsgc3RhY2suc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgeSA9IGMyeSArIChzdGFjay5sZW5ndGggPT09IDEgPyBzdGFjay5zaGlmdCgpIDogMCk7XG4gICAgICAgICAgICAgICAgICAgIHAuY3VydmVUbyhjMXgsIC1jMXksIGMyeCwgLWMyeSwgeCwgLXkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgaWYgKHYgPCAzMikge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0dseXBoICcgKyBpbmRleCArICc6IHVua25vd24gb3BlcmF0b3IgJyArIHYpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodiA8IDI0Nykge1xuICAgICAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHYgLSAxMzkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodiA8IDI1MSkge1xuICAgICAgICAgICAgICAgICAgICBiMSA9IGNvZGVbaV07XG4gICAgICAgICAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgc3RhY2sucHVzaCgodiAtIDI0NykgKiAyNTYgKyBiMSArIDEwOCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh2IDwgMjU1KSB7XG4gICAgICAgICAgICAgICAgICAgIGIxID0gY29kZVtpXTtcbiAgICAgICAgICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgICAgICAgICBzdGFjay5wdXNoKC0odiAtIDI1MSkgKiAyNTYgLSBiMSAtIDEwOCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYjEgPSBjb2RlW2ldO1xuICAgICAgICAgICAgICAgICAgICBiMiA9IGNvZGVbaSArIDFdO1xuICAgICAgICAgICAgICAgICAgICBiMyA9IGNvZGVbaSArIDJdO1xuICAgICAgICAgICAgICAgICAgICBiNCA9IGNvZGVbaSArIDNdO1xuICAgICAgICAgICAgICAgICAgICBpICs9IDQ7XG4gICAgICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goKChiMSA8PCAyNCkgfCAoYjIgPDwgMTYpIHwgKGIzIDw8IDgpIHwgYjQpIC8gNjU1MzYpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHBhcnNlKGNvZGUpO1xuICAgIGdseXBoID0gbmV3IENmZkdseXBoKGZvbnQsIGluZGV4KTtcbiAgICBnbHlwaC5wYXRoID0gcDtcbiAgICBnbHlwaC5hZHZhbmNlV2lkdGggPSB3aWR0aDtcbiAgICByZXR1cm4gZ2x5cGg7XG59XG5cbi8vIFN1YnJvdXRpbmVzIGFyZSBlbmNvZGVkIHVzaW5nIHRoZSBuZWdhdGl2ZSBoYWxmIG9mIHRoZSBudW1iZXIgc3BhY2UuXG4vLyBTZWUgdHlwZSAyIGNoYXB0ZXIgNC43IFwiU3Vicm91dGluZSBvcGVyYXRvcnNcIi5cbmZ1bmN0aW9uIGNhbGNDRkZTdWJyb3V0aW5lQmlhcyhzdWJycykge1xuICAgIHZhciBiaWFzO1xuICAgIGlmIChzdWJycy5sZW5ndGggPCAxMjQwKSB7XG4gICAgICAgIGJpYXMgPSAxMDc7XG4gICAgfSBlbHNlIGlmIChzdWJycy5sZW5ndGggPCAzMzkwMCkge1xuICAgICAgICBiaWFzID0gMTEzMTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBiaWFzID0gMzI3Njg7XG4gICAgfVxuICAgIHJldHVybiBiaWFzO1xufVxuXG4vLyBQYXJzZSB0aGUgYENGRmAgdGFibGUsIHdoaWNoIGNvbnRhaW5zIHRoZSBnbHlwaCBvdXRsaW5lcyBpbiBQb3N0U2NyaXB0IGZvcm1hdC5cbmZ1bmN0aW9uIHBhcnNlQ0ZGVGFibGUoZGF0YSwgc3RhcnQsIGZvbnQpIHtcbiAgICB2YXIgaGVhZGVyLCBuYW1lSW5kZXgsIHRvcERpY3RJbmRleCwgc3RyaW5nSW5kZXgsIGdsb2JhbFN1YnJJbmRleCwgdG9wRGljdCwgcHJpdmF0ZURpY3RPZmZzZXQsIHByaXZhdGVEaWN0LFxuICAgICAgICBzdWJyT2Zmc2V0LCBzdWJySW5kZXgsIGNoYXJTdHJpbmcsIGNoYXJTdHJpbmdzSW5kZXgsIGNoYXJzZXQsIGk7XG4gICAgaGVhZGVyID0gcGFyc2VDRkZIZWFkZXIoZGF0YSwgc3RhcnQpO1xuICAgIG5hbWVJbmRleCA9IHBhcnNlQ0ZGSW5kZXgoZGF0YSwgaGVhZGVyLmVuZE9mZnNldCwgcGFyc2UuYnl0ZXNUb1N0cmluZyk7XG4gICAgdG9wRGljdEluZGV4ID0gcGFyc2VDRkZJbmRleChkYXRhLCBuYW1lSW5kZXguZW5kT2Zmc2V0KTtcbiAgICBzdHJpbmdJbmRleCA9IHBhcnNlQ0ZGSW5kZXgoZGF0YSwgdG9wRGljdEluZGV4LmVuZE9mZnNldCwgcGFyc2UuYnl0ZXNUb1N0cmluZyk7XG4gICAgZ2xvYmFsU3VickluZGV4ID0gcGFyc2VDRkZJbmRleChkYXRhLCBzdHJpbmdJbmRleC5lbmRPZmZzZXQpO1xuICAgIGZvbnQuZ3N1YnJzID0gZ2xvYmFsU3VickluZGV4Lm9iamVjdHM7XG4gICAgZm9udC5nc3VicnNCaWFzID0gY2FsY0NGRlN1YnJvdXRpbmVCaWFzKGZvbnQuZ3N1YnJzKTtcblxuICAgIHZhciB0b3BEaWN0RGF0YSA9IG5ldyBEYXRhVmlldyhuZXcgVWludDhBcnJheSh0b3BEaWN0SW5kZXgub2JqZWN0c1swXSkuYnVmZmVyKTtcbiAgICB0b3BEaWN0ID0gcGFyc2VDRkZUb3BEaWN0KHRvcERpY3REYXRhLCBzdHJpbmdJbmRleC5vYmplY3RzKTtcblxuICAgIHByaXZhdGVEaWN0T2Zmc2V0ID0gc3RhcnQgKyB0b3BEaWN0Wydwcml2YXRlJ11bMV07XG4gICAgcHJpdmF0ZURpY3QgPSBwYXJzZUNGRlByaXZhdGVEaWN0KGRhdGEsIHByaXZhdGVEaWN0T2Zmc2V0LCB0b3BEaWN0Wydwcml2YXRlJ11bMF0sIHN0cmluZ0luZGV4Lm9iamVjdHMpO1xuICAgIGZvbnQuZGVmYXVsdFdpZHRoWCA9IHByaXZhdGVEaWN0LmRlZmF1bHRXaWR0aFg7XG4gICAgZm9udC5ub21pbmFsV2lkdGhYID0gcHJpdmF0ZURpY3Qubm9taW5hbFdpZHRoWDtcblxuICAgIHN1YnJPZmZzZXQgPSBwcml2YXRlRGljdE9mZnNldCArIHByaXZhdGVEaWN0LnN1YnJzO1xuICAgIHN1YnJJbmRleCA9IHBhcnNlQ0ZGSW5kZXgoZGF0YSwgc3Vick9mZnNldCk7XG4gICAgZm9udC5zdWJycyA9IHN1YnJJbmRleC5vYmplY3RzO1xuICAgIGZvbnQuc3VicnNCaWFzID0gY2FsY0NGRlN1YnJvdXRpbmVCaWFzKGZvbnQuc3VicnMpO1xuXG4gICAgLy8gT2Zmc2V0cyBpbiB0aGUgdG9wIGRpY3QgYXJlIHJlbGF0aXZlIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIENGRiBkYXRhLCBzbyBhZGQgdGhlIENGRiBzdGFydCBvZmZzZXQuXG4gICAgY2hhclN0cmluZ3NJbmRleCA9IHBhcnNlQ0ZGSW5kZXgoZGF0YSwgc3RhcnQgKyB0b3BEaWN0LmNoYXJTdHJpbmdzKTtcbiAgICBmb250Lm5HbHlwaHMgPSBjaGFyU3RyaW5nc0luZGV4Lm9iamVjdHMubGVuZ3RoO1xuXG4gICAgY2hhcnNldCA9IHBhcnNlQ0ZGQ2hhcnNldChkYXRhLCBzdGFydCArIHRvcERpY3QuY2hhcnNldCwgZm9udC5uR2x5cGhzLCBzdHJpbmdJbmRleC5vYmplY3RzKTtcbiAgICBpZiAodG9wRGljdC5lbmNvZGluZyA9PT0gMCkgeyAvLyBTdGFuZGFyZCBlbmNvZGluZ1xuICAgICAgICBmb250LmNmZkVuY29kaW5nID0gbmV3IENmZkVuY29kaW5nKGNmZlN0YW5kYXJkRW5jb2RpbmcsIGNoYXJzZXQpO1xuICAgIH0gZWxzZSBpZiAodG9wRGljdC5lbmNvZGluZyA9PT0gMSkgeyAvLyBFeHBlcnQgZW5jb2RpbmdcbiAgICAgICAgZm9udC5jZmZFbmNvZGluZyA9IG5ldyBDZmZFbmNvZGluZyhjZmZFeHBlcnRFbmNvZGluZywgY2hhcnNldCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9udC5jZmZFbmNvZGluZyA9IHBhcnNlQ0ZGRW5jb2RpbmcoZGF0YSwgc3RhcnQgKyB0b3BEaWN0LmVuY29kaW5nLCBjaGFyc2V0KTtcbiAgICB9XG4gICAgLy8gUHJlZmVyIHRoZSBDTUFQIGVuY29kaW5nIHRvIHRoZSBDRkYgZW5jb2RpbmcuXG4gICAgZm9udC5lbmNvZGluZyA9IGZvbnQuZW5jb2RpbmcgfHwgZm9udC5jZmZFbmNvZGluZztcblxuICAgIGZvbnQuZ2x5cGhzID0gW107XG4gICAgZm9yIChpID0gMDsgaSA8IGZvbnQubkdseXBoczsgaSArPSAxKSB7XG4gICAgICAgIGNoYXJTdHJpbmcgPSBjaGFyU3RyaW5nc0luZGV4Lm9iamVjdHNbaV07XG4gICAgICAgIGZvbnQuZ2x5cGhzLnB1c2gocGFyc2VDRkZDaGFyc3RyaW5nKGNoYXJTdHJpbmcsIGZvbnQsIGkpKTtcbiAgICB9XG59XG5cbi8vIFBhcnNlIHRoZSBoZWFkZXIgYGhlYWRgIHRhYmxlXG4vLyBodHRwczovL3d3dy5taWNyb3NvZnQuY29tL3R5cG9ncmFwaHkvT1RTUEVDL2hlYWQuaHRtXG5mdW5jdGlvbiBwYXJzZUhlYWRUYWJsZShkYXRhLCBzdGFydCkge1xuICAgIHZhciBoZWFkID0ge30sXG4gICAgICAgIHAgPSBuZXcgcGFyc2UuUGFyc2VyKGRhdGEsIHN0YXJ0KTtcbiAgICBoZWFkLnZlcnNpb24gPSBwLnBhcnNlVmVyc2lvbigpO1xuICAgIGhlYWQuZm9udFJldmlzaW9uID0gTWF0aC5yb3VuZChwLnBhcnNlRml4ZWQoKSAqIDEwMDApIC8gMTAwMDtcbiAgICBoZWFkLmNoZWNrU3VtQWRqdXN0bWVudCA9IHAucGFyc2VVTG9uZygpO1xuICAgIGhlYWQubWFnaWNOdW1iZXIgPSBwLnBhcnNlVUxvbmcoKTtcbiAgICBjaGVja0FyZ3VtZW50KGhlYWQubWFnaWNOdW1iZXIgPT09IDB4NUYwRjNDRjUsICdGb250IGhlYWRlciBoYXMgd3JvbmcgbWFnaWMgbnVtYmVyLicpO1xuICAgIGhlYWQuZmxhZ3MgPSBwLnBhcnNlVVNob3J0KCk7XG4gICAgaGVhZC51bml0c1BlckVtID0gcC5wYXJzZVVTaG9ydCgpO1xuICAgIGhlYWQuY3JlYXRlZCA9IHAucGFyc2VMb25nRGF0ZVRpbWUoKTtcbiAgICBoZWFkLm1vZGlmaWVkID0gcC5wYXJzZUxvbmdEYXRlVGltZSgpO1xuICAgIGhlYWQueE1pbiA9IHAucGFyc2VTaG9ydCgpO1xuICAgIGhlYWQueU1pbiA9IHAucGFyc2VTaG9ydCgpO1xuICAgIGhlYWQueE1heCA9IHAucGFyc2VTaG9ydCgpO1xuICAgIGhlYWQueU1heCA9IHAucGFyc2VTaG9ydCgpO1xuICAgIGhlYWQubWFjU3R5bGUgPSBwLnBhcnNlVVNob3J0KCk7XG4gICAgaGVhZC5sb3dlc3RSZWNQUEVNID0gcC5wYXJzZVVTaG9ydCgpO1xuICAgIGhlYWQuZm9udERpcmVjdGlvbkhpbnQgPSBwLnBhcnNlU2hvcnQoKTtcbiAgICBoZWFkLmluZGV4VG9Mb2NGb3JtYXQgPSBwLnBhcnNlU2hvcnQoKTsgICAgIC8vIDUwXG4gICAgaGVhZC5nbHlwaERhdGFGb3JtYXQgPSBwLnBhcnNlU2hvcnQoKTtcbiAgICByZXR1cm4gaGVhZDtcbn1cblxuLy8gUGFyc2UgdGhlIGhvcml6b250YWwgaGVhZGVyIGBoaGVhYCB0YWJsZVxuLy8gaHR0cHM6Ly93d3cubWljcm9zb2Z0LmNvbS90eXBvZ3JhcGh5L09UU1BFQy9oaGVhLmh0bVxuZnVuY3Rpb24gcGFyc2VIaGVhVGFibGUoZGF0YSwgc3RhcnQpIHtcbiAgICB2YXIgaGhlYSA9IHt9LFxuICAgICAgICBwID0gbmV3IHBhcnNlLlBhcnNlcihkYXRhLCBzdGFydCk7XG4gICAgaGhlYS52ZXJzaW9uID0gcC5wYXJzZVZlcnNpb24oKTtcbiAgICBoaGVhLmFzY2VuZGVyID0gcC5wYXJzZVNob3J0KCk7XG4gICAgaGhlYS5kZXNjZW5kZXIgPSBwLnBhcnNlU2hvcnQoKTtcbiAgICBoaGVhLmxpbmVHYXAgPSBwLnBhcnNlU2hvcnQoKTtcbiAgICBoaGVhLmFkdmFuY2VXaWR0aE1heCA9IHAucGFyc2VVU2hvcnQoKTtcbiAgICBoaGVhLm1pbkxlZnRTaWRlQmVhcmluZyA9IHAucGFyc2VTaG9ydCgpO1xuICAgIGhoZWEubWluUmlnaHRTaWRlQmVhcmluZyA9IHAucGFyc2VTaG9ydCgpO1xuICAgIGhoZWEueE1heEV4dGVudCA9IHAucGFyc2VTaG9ydCgpO1xuICAgIGhoZWEuY2FyZXRTbG9wZVJpc2UgPSBwLnBhcnNlU2hvcnQoKTtcbiAgICBoaGVhLmNhcmV0U2xvcGVSdW4gPSBwLnBhcnNlU2hvcnQoKTtcbiAgICBoaGVhLmNhcmV0T2Zmc2V0ID0gcC5wYXJzZVNob3J0KCk7XG4gICAgcC5yZWxhdGl2ZU9mZnNldCArPSA4O1xuICAgIGhoZWEubWV0cmljRGF0YUZvcm1hdCA9IHAucGFyc2VTaG9ydCgpO1xuICAgIGhoZWEubnVtYmVyT2ZITWV0cmljcyA9IHAucGFyc2VVU2hvcnQoKTtcbiAgICByZXR1cm4gaGhlYTtcbn1cblxuLy8gUGFyc2UgdGhlIG1heGltdW0gcHJvZmlsZSBgbWF4cGAgdGFibGVcbi8vIGh0dHBzOi8vd3d3Lm1pY3Jvc29mdC5jb20vdHlwb2dyYXBoeS9PVFNQRUMvbWF4cC5odG1cbmZ1bmN0aW9uIHBhcnNlTWF4cFRhYmxlKGRhdGEsIHN0YXJ0KSB7XG4gICAgdmFyIG1heHAgPSB7fSxcbiAgICAgICAgcCA9IG5ldyBwYXJzZS5QYXJzZXIoZGF0YSwgc3RhcnQpO1xuICAgIG1heHAudmVyc2lvbiA9IHAucGFyc2VWZXJzaW9uKCk7XG4gICAgbWF4cC5udW1HbHlwaHMgPSBwLnBhcnNlVVNob3J0KCk7XG4gICAgaWYgKG1heHAubWFqb3JWZXJzaW9uID09PSAxKSB7XG4gICAgICAgIG1heHAubWF4UG9pbnRzID0gcC5wYXJzZVVTaG9ydCgpO1xuICAgICAgICBtYXhwLm1heENvbnRvdXJzID0gcC5wYXJzZVVTaG9ydCgpO1xuICAgICAgICBtYXhwLm1heENvbXBvc2l0ZVBvaW50cyA9IHAucGFyc2VVU2hvcnQoKTtcbiAgICAgICAgbWF4cC5tYXhDb21wb3NpdGVDb250b3VycyA9IHAucGFyc2VVU2hvcnQoKTtcbiAgICAgICAgbWF4cC5tYXhab25lcyA9IHAucGFyc2VVU2hvcnQoKTtcbiAgICAgICAgbWF4cC5tYXhUd2lsaWdodFBvaW50cyA9IHAucGFyc2VVU2hvcnQoKTtcbiAgICAgICAgbWF4cC5tYXhTdG9yYWdlID0gcC5wYXJzZVVTaG9ydCgpO1xuICAgICAgICBtYXhwLm1heEZ1bmN0aW9uRGVmcyA9IHAucGFyc2VVU2hvcnQoKTtcbiAgICAgICAgbWF4cC5tYXhJbnN0cnVjdGlvbkRlZnMgPSBwLnBhcnNlVVNob3J0KCk7XG4gICAgICAgIG1heHAubWF4U3RhY2tFbGVtZW50cyA9IHAucGFyc2VVU2hvcnQoKTtcbiAgICAgICAgbWF4cC5tYXhTaXplT2ZJbnN0cnVjdGlvbnMgPSBwLnBhcnNlVVNob3J0KCk7XG4gICAgICAgIG1heHAubWF4Q29tcG9uZW50RWxlbWVudHMgPSBwLnBhcnNlVVNob3J0KCk7XG4gICAgICAgIG1heHAubWF4Q29tcG9uZW50RGVwdGggPSBwLnBhcnNlVVNob3J0KCk7XG4gICAgfVxuICAgIHJldHVybiBtYXhwO1xufVxuXG4vLyBOYW1lSURzIGZvciB0aGUgbmFtZSB0YWJsZS5cbnZhciBuYW1lVGFibGVOYW1lcyA9IFtcbiAgICAnY29weXJpZ2h0JywgICAgICAgICAgICAgIC8vIDBcbiAgICAnZm9udEZhbWlseScsICAgICAgICAgICAgIC8vIDFcbiAgICAnZm9udFN1YmZhbWlseScsICAgICAgICAgIC8vIDJcbiAgICAndW5pcXVlSUQnLCAgICAgICAgICAgICAgIC8vIDNcbiAgICAnZnVsbE5hbWUnLCAgICAgICAgICAgICAgIC8vIDRcbiAgICAndmVyc2lvbicsICAgICAgICAgICAgICAgIC8vIDVcbiAgICAncG9zdFNjcmlwdE5hbWUnLCAgICAgICAgIC8vIDZcbiAgICAndHJhZGVtYXJrJywgICAgICAgICAgICAgIC8vIDdcbiAgICAnbWFudWZhY3R1cmVyJywgICAgICAgICAgIC8vIDhcbiAgICAnZGVzaWduZXInLCAgICAgICAgICAgICAgIC8vIDlcbiAgICAnZGVzY3JpcHRpb24nLCAgICAgICAgICAgIC8vIDEwXG4gICAgJ3ZlbmRvclVSTCcsICAgICAgICAgICAgICAvLyAxMVxuICAgICdkZXNpZ25lclVSTCcsICAgICAgICAgICAgLy8gMTJcbiAgICAnbGljZW5jZScsICAgICAgICAgICAgICAgIC8vIDEzXG4gICAgJ2xpY2VuY2VVUkwnLCAgICAgICAgICAgICAvLyAxNFxuICAgICdyZXNlcnZlZCcsICAgICAgICAgICAgICAgLy8gMTVcbiAgICAncHJlZmVycmVkRmFtaWx5JywgICAgICAgIC8vIDE2XG4gICAgJ3ByZWZlcnJlZFN1YmZhbWlseScsICAgICAvLyAxN1xuICAgICdjb21wYXRpYmxlRnVsbE5hbWUnLCAgICAgLy8gMThcbiAgICAnc2FtcGxlVGV4dCcsICAgICAgICAgICAgIC8vIDE5XG4gICAgJ3Bvc3RTY3JpcHRGaW5kRm9udE5hbWUnLCAvLyAyMFxuICAgICd3d3NGYW1pbHknLCAgICAgICAgICAgICAgLy8gMjFcbiAgICAnd3dzU3ViZmFtaWx5JyAgICAgICAgICAgIC8vIDIyXG5dO1xuXG4vLyBQYXJzZSB0aGUgbmFtaW5nIGBuYW1lYCB0YWJsZVxuLy8gaHR0cHM6Ly93d3cubWljcm9zb2Z0LmNvbS90eXBvZ3JhcGh5L09UU1BFQy9uYW1lLmh0bVxuLy8gT25seSBXaW5kb3dzIFVuaWNvZGUgRW5nbGlzaCBuYW1lcyBhcmUgc3VwcG9ydGVkLlxuLy8gRm9ybWF0IDEgYWRkaXRpb25hbCBmaWVsZHMgYXJlIG5vdCBzdXBwb3J0ZWRcbmZ1bmN0aW9uIHBhcnNlTmFtZVRhYmxlKGRhdGEsIHN0YXJ0KSB7XG4gICAgdmFyIG5hbWUgPSB7fSxcbiAgICAgICAgcCA9IG5ldyBwYXJzZS5QYXJzZXIoZGF0YSwgc3RhcnQpO1xuICAgIG5hbWUuZm9ybWF0ID0gcC5wYXJzZVVTaG9ydCgpO1xuICAgIHZhciBjb3VudCA9IHAucGFyc2VVU2hvcnQoKSxcbiAgICAgICAgc3RyaW5nT2Zmc2V0ID0gcC5vZmZzZXQgKyBwLnBhcnNlVVNob3J0KCk7XG4gICAgdmFyIHBsYXRmb3JtSUQsIGVuY29kaW5nSUQsIGxhbmd1YWdlSUQsIG5hbWVJRCwgcHJvcGVydHksIGJ5dGVMZW5ndGgsXG4gICAgICAgIG9mZnNldCwgc3RyLCBpLCBqLCBjb2RlUG9pbnRzO1xuICAgIHZhciB1bmtub3duQ291bnQgPSAwO1xuICAgIGZvcihpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcbiAgICAgICAgcGxhdGZvcm1JRCA9IHAucGFyc2VVU2hvcnQoKTtcbiAgICAgICAgZW5jb2RpbmdJRCA9IHAucGFyc2VVU2hvcnQoKTtcbiAgICAgICAgbGFuZ3VhZ2VJRCA9IHAucGFyc2VVU2hvcnQoKTtcbiAgICAgICAgbmFtZUlEID0gcC5wYXJzZVVTaG9ydCgpO1xuICAgICAgICBwcm9wZXJ0eSA9IG5hbWVUYWJsZU5hbWVzW25hbWVJRF07XG4gICAgICAgIGJ5dGVMZW5ndGggPSBwLnBhcnNlVVNob3J0KCk7XG4gICAgICAgIG9mZnNldCA9IHAucGFyc2VVU2hvcnQoKTtcbiAgICAgICAgLy8gcGxhdGZvcm1JRCAtIGVuY29kaW5nSUQgLSBsYW5ndWFnZUlEIHN0YW5kYXJkIGNvbWJpbmF0aW9ucyA6XG4gICAgICAgIC8vIDEgLSAwIC0gMCA6IE1hY2ludG9zaCwgUm9tYW4sIEVuZ2xpc2hcbiAgICAgICAgLy8gMyAtIDEgLSAweDQwOSA6IFdpbmRvd3MsIFVuaWNvZGUgQk1QIChVQ1MtMiksIGVuLVVTXG4gICAgICAgIGlmIChwbGF0Zm9ybUlEID09PSAzICYmIGVuY29kaW5nSUQgPT09IDEgJiYgbGFuZ3VhZ2VJRCA9PT0gMHg0MDkpIHtcbiAgICAgICAgICAgIGNvZGVQb2ludHMgPSBbXTtcbiAgICAgICAgICAgIHZhciBsZW5ndGggPSBieXRlTGVuZ3RoLzI7XG4gICAgICAgICAgICBmb3IoaiA9IDA7IGogPCBsZW5ndGg7IGorKywgb2Zmc2V0ICs9IDIpIHtcbiAgICAgICAgICAgICAgICBjb2RlUG9pbnRzW2pdID0gcGFyc2UuZ2V0U2hvcnQoZGF0YSwgc3RyaW5nT2Zmc2V0K29mZnNldCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdHIgPSBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KG51bGwsIGNvZGVQb2ludHMpO1xuICAgICAgICAgICAgaWYgKHByb3BlcnR5KSB7XG4gICAgICAgICAgICAgICAgbmFtZVtwcm9wZXJ0eV0gPSBzdHI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB1bmtub3duQ291bnQrKztcbiAgICAgICAgICAgICAgICBuYW1lWyd1bmtub3duJyt1bmtub3duQ291bnRdID0gc3RyO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICB9XG4gICAgaWYgKG5hbWUuZm9ybWF0ID09PSAxKSB7XG4gICAgICAgIG5hbWUubGFuZ1RhZ0NvdW50ID0gcC5wYXJzZVVTaG9ydCgpO1xuICAgIH1cbiAgICByZXR1cm4gbmFtZTtcbn1cblxuLy8gUGFyc2UgdGhlIE9TLzIgYW5kIFdpbmRvd3MgbWV0cmljcyBgT1MvMmAgdGFibGVcbi8vIGh0dHBzOi8vd3d3Lm1pY3Jvc29mdC5jb20vdHlwb2dyYXBoeS9PVFNQRUMvb3MyLmh0bVxuZnVuY3Rpb24gcGFyc2VPUzJUYWJsZShkYXRhLCBzdGFydCkge1xuICAgIHZhciBvczIgPSB7fSxcbiAgICAgICAgcCA9IG5ldyBwYXJzZS5QYXJzZXIoZGF0YSwgc3RhcnQpO1xuICAgIG9zMi52ZXJzaW9uID0gcC5wYXJzZVVTaG9ydCgpO1xuICAgIG9zMi54QXZnQ2hhcldpZHRoID0gcC5wYXJzZVNob3J0KCk7XG4gICAgb3MyLnVzV2VpZ2h0Q2xhc3MgPSBwLnBhcnNlVVNob3J0KCk7XG4gICAgb3MyLnVzV2lkdGhDbGFzcyA9IHAucGFyc2VVU2hvcnQoKTtcbiAgICBvczIuZnNUeXBlID0gcC5wYXJzZVVTaG9ydCgpO1xuICAgIG9zMi55U3Vic2NyaXB0WFNpemUgPSBwLnBhcnNlU2hvcnQoKTtcbiAgICBvczIueVN1YnNjcmlwdFlTaXplID0gcC5wYXJzZVNob3J0KCk7XG4gICAgb3MyLnlTdWJzY3JpcHRYT2Zmc2V0ID0gcC5wYXJzZVNob3J0KCk7XG4gICAgb3MyLnlTdWJzY3JpcHRZT2Zmc2V0ID0gcC5wYXJzZVNob3J0KCk7XG4gICAgb3MyLnlTdXBlcnNjcmlwdFhTaXplID0gcC5wYXJzZVNob3J0KCk7XG4gICAgb3MyLnlTdXBlcnNjcmlwdFlTaXplID0gcC5wYXJzZVNob3J0KCk7XG4gICAgb3MyLnlTdXBlcnNjcmlwdFhPZmZzZXQgPSBwLnBhcnNlU2hvcnQoKTtcbiAgICBvczIueVN1cGVyc2NyaXB0WU9mZnNldCA9IHAucGFyc2VTaG9ydCgpO1xuICAgIG9zMi55U3RyaWtlb3V0U2l6ZSA9IHAucGFyc2VTaG9ydCgpO1xuICAgIG9zMi55U3RyaWtlb3V0UG9zaXRpb24gPSBwLnBhcnNlU2hvcnQoKTtcbiAgICBvczIuc0ZhbWlseUNsYXNzID0gcC5wYXJzZVNob3J0KCk7XG4gICAgb3MyLnBhbm9zZSA9IFtdO1xuICAgIGZvcih2YXIgaSA9IDA7IGkgPCAxMDsgaSsrKSB7XG4gICAgICAgIG9zMi5wYW5vc2VbaV0gPSBwLnBhcnNlQnl0ZSgpO1xuICAgIH1cbiAgICBvczIudWxVbmljb2RlUmFuZ2UxID0gcC5wYXJzZVVMb25nKCk7XG4gICAgb3MyLnVsVW5pY29kZVJhbmdlMiA9IHAucGFyc2VVTG9uZygpO1xuICAgIG9zMi51bFVuaWNvZGVSYW5nZTMgPSBwLnBhcnNlVUxvbmcoKTtcbiAgICBvczIudWxVbmljb2RlUmFuZ2U0ID0gcC5wYXJzZVVMb25nKCk7XG4gICAgb3MyLmFjaFZlbmRJRCA9IFN0cmluZy5mcm9tQ2hhckNvZGUocC5wYXJzZUJ5dGUoKSwgcC5wYXJzZUJ5dGUoKSwgcC5wYXJzZUJ5dGUoKSwgcC5wYXJzZUJ5dGUoKSk7XG4gICAgb3MyLmZzU2VsZWN0aW9uID0gcC5wYXJzZVVTaG9ydCgpO1xuICAgIG9zMi51c0ZpcnN0Q2hhckluZGV4ID0gcC5wYXJzZVVTaG9ydCgpO1xuICAgIG9zMi51c0xhc3RDaGFySW5kZXggPSBwLnBhcnNlVVNob3J0KCk7XG4gICAgb3MyLnNUeXBvQXNjZW5kZXIgPSBwLnBhcnNlU2hvcnQoKTtcbiAgICBvczIuc1R5cG9EZXNjZW5kZXIgPSBwLnBhcnNlU2hvcnQoKTtcbiAgICBvczIuc1R5cG9MaW5lR2FwID0gcC5wYXJzZVNob3J0KCk7XG4gICAgb3MyLnVzV2luQXNjZW50ID0gcC5wYXJzZVVTaG9ydCgpO1xuICAgIG9zMi51c1dpbkRlc2NlbnQgPSBwLnBhcnNlVVNob3J0KCk7XG4gICAgaWYgKG9zMi52ZXJzaW9uID49IDEpIHtcbiAgICAgICAgb3MyLnVsQ29kZVBhZ2VSYW5nZTEgPSBwLnBhcnNlVUxvbmcoKTtcbiAgICAgICAgb3MyLnVsQ29kZVBhZ2VSYW5nZTIgPSBwLnBhcnNlVUxvbmcoKTtcbiAgICB9XG4gICAgaWYgKG9zMi52ZXJzaW9uID49IDIpIHtcbiAgICAgICAgb3MyLnN4SGVpZ2h0ID0gcC5wYXJzZVNob3J0KCk7XG4gICAgICAgIG9zMi5zQ2FwSGVpZ2h0ID0gcC5wYXJzZVNob3J0KCk7XG4gICAgICAgIG9zMi51c0RlZmF1bHRDaGFyID0gcC5wYXJzZVVTaG9ydCgpO1xuICAgICAgICBvczIudXNCcmVha0NoYXIgPSBwLnBhcnNlVVNob3J0KCk7XG4gICAgICAgIG9zMi51c01heENvbnRlbnQgPSBwLnBhcnNlVVNob3J0KCk7XG4gICAgfVxuICAgIHJldHVybiBvczI7XG59XG5cbi8vIFBhcnNlIHRoZSBQb3N0U2NyaXB0IGBwb3N0YCB0YWJsZVxuLy8gaHR0cHM6Ly93d3cubWljcm9zb2Z0LmNvbS90eXBvZ3JhcGh5L09UU1BFQy9wb3N0Lmh0bVxuZnVuY3Rpb24gcGFyc2VQb3N0VGFibGUoZGF0YSwgc3RhcnQpIHtcbiAgICB2YXIgcG9zdCA9IHt9LFxuICAgICAgICBwID0gbmV3IHBhcnNlLlBhcnNlcihkYXRhLCBzdGFydCksXG4gICAgICAgIGksIG5hbWVMZW5ndGg7XG4gICAgcG9zdC52ZXJzaW9uID0gcC5wYXJzZVZlcnNpb24oKTtcbiAgICBwb3N0Lml0YWxpY0FuZ2xlID0gcC5wYXJzZUZpeGVkKCk7XG4gICAgcG9zdC51bmRlcmxpbmVQb3NpdGlvbiA9IHAucGFyc2VTaG9ydCgpO1xuICAgIHBvc3QudW5kZXJsaW5lVGhpY2tuZXNzID0gcC5wYXJzZVNob3J0KCk7XG4gICAgcG9zdC5pc0ZpeGVkUGl0Y2ggPSBwLnBhcnNlVUxvbmcoKTtcbiAgICBwb3N0Lm1pbk1lbVR5cGU0MiA9IHAucGFyc2VVTG9uZygpO1xuICAgIHBvc3QubWF4TWVtVHlwZTQyID0gcC5wYXJzZVVMb25nKCk7XG4gICAgcG9zdC5taW5NZW1UeXBlMSA9IHAucGFyc2VVTG9uZygpO1xuICAgIHBvc3QubWF4TWVtVHlwZTEgPSBwLnBhcnNlVUxvbmcoKTtcbiAgICBzd2l0Y2ggKHBvc3QudmVyc2lvbikge1xuICAgIGNhc2UgMTpcbiAgICAgICAgcG9zdC5uYW1lcyA9IHN0YW5kYXJkTmFtZXMuc2xpY2UoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgY2FzZSAyOlxuICAgICAgICBwb3N0Lm51bWJlck9mR2x5cGhzID0gcC5wYXJzZVVTaG9ydCgpO1xuICAgICAgICBwb3N0LmdseXBoTmFtZUluZGV4ID0gbmV3IEFycmF5KHBvc3QubnVtYmVyT2ZHbHlwaHMpO1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgcG9zdC5udW1iZXJPZkdseXBoczsgaSsrKSB7XG4gICAgICAgICAgICBwb3N0LmdseXBoTmFtZUluZGV4W2ldID0gcC5wYXJzZVVTaG9ydCgpO1xuICAgICAgICB9XG4gICAgICAgIHBvc3QubmFtZXMgPSBbXTtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHBvc3QubnVtYmVyT2ZHbHlwaHM7IGkrKykge1xuICAgICAgICAgICAgaWYgKHBvc3QuZ2x5cGhOYW1lSW5kZXhbaV0gPj0gc3RhbmRhcmROYW1lcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBuYW1lTGVuZ3RoID0gcC5wYXJzZUNoYXIoKTtcbiAgICAgICAgICAgICAgICBwb3N0Lm5hbWVzLnB1c2gocC5wYXJzZVN0cmluZyhuYW1lTGVuZ3RoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgY2FzZSAyLjU6XG4gICAgICAgIHBvc3QubnVtYmVyT2ZHbHlwaHMgPSBwLnBhcnNlVVNob3J0KCk7XG4gICAgICAgIHBvc3Qub2Zmc2V0ID0gbmV3IEFycmF5KHBvc3QubnVtYmVyT2ZHbHlwaHMpO1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgcG9zdC5udW1iZXJPZkdseXBoczsgaSsrKSB7XG4gICAgICAgICAgICBwb3N0Lm9mZnNldCA9IHAucGFyc2VDaGFyKCk7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHJldHVybiBwb3N0O1xufVxuXG4vLyBQYXJzZSB0aGUgYGhtdHhgIHRhYmxlLCB3aGljaCBjb250YWlucyB0aGUgaG9yaXpvbnRhbCBtZXRyaWNzIGZvciBhbGwgZ2x5cGhzLlxuLy8gVGhpcyBmdW5jdGlvbiBhdWdtZW50cyB0aGUgZ2x5cGggYXJyYXksIGFkZGluZyB0aGUgYWR2YW5jZVdpZHRoIGFuZCBsZWZ0U2lkZUJlYXJpbmcgdG8gZWFjaCBnbHlwaC5cbi8vIGh0dHBzOi8vd3d3Lm1pY3Jvc29mdC5jb20vdHlwb2dyYXBoeS9PVFNQRUMvaG10eC5odG1cbmZ1bmN0aW9uIHBhcnNlSG10eFRhYmxlKGRhdGEsIHN0YXJ0LCBudW1NZXRyaWNzLCBudW1HbHlwaHMsIGdseXBocykge1xuICAgIHZhciBwLCBpLCBnbHlwaCwgYWR2YW5jZVdpZHRoLCBsZWZ0U2lkZUJlYXJpbmc7XG4gICAgcCA9IG5ldyBwYXJzZS5QYXJzZXIoZGF0YSwgc3RhcnQpO1xuICAgIGZvciAoaSA9IDA7IGkgPCBudW1HbHlwaHM7IGkgKz0gMSkge1xuICAgICAgICAvLyBJZiB0aGUgZm9udCBpcyBtb25vc3BhY2VkLCBvbmx5IG9uZSBlbnRyeSBpcyBuZWVkZWQuIFRoaXMgbGFzdCBlbnRyeSBhcHBsaWVzIHRvIGFsbCBzdWJzZXF1ZW50IGdseXBocy5cbiAgICAgICAgaWYgKGkgPCBudW1NZXRyaWNzKSB7XG4gICAgICAgICAgICBhZHZhbmNlV2lkdGggPSBwLnBhcnNlVVNob3J0KCk7XG4gICAgICAgICAgICBsZWZ0U2lkZUJlYXJpbmcgPSBwLnBhcnNlU2hvcnQoKTtcbiAgICAgICAgfVxuICAgICAgICBnbHlwaCA9IGdseXBoc1tpXTtcbiAgICAgICAgZ2x5cGguYWR2YW5jZVdpZHRoID0gYWR2YW5jZVdpZHRoO1xuICAgICAgICBnbHlwaC5sZWZ0U2lkZUJlYXJpbmcgPSBsZWZ0U2lkZUJlYXJpbmc7XG4gICAgfVxufVxuXG4vLyBQYXJzZSB0aGUgYGtlcm5gIHRhYmxlIHdoaWNoIGNvbnRhaW5zIGtlcm5pbmcgcGFpcnMuXG4vLyBOb3RlIHRoYXQgc29tZSBmb250cyB1c2UgdGhlIEdQT1MgT3BlblR5cGUgbGF5b3V0IHRhYmxlIHRvIHNwZWNpZnkga2VybmluZy5cbi8vIGh0dHBzOi8vd3d3Lm1pY3Jvc29mdC5jb20vdHlwb2dyYXBoeS9PVFNQRUMva2Vybi5odG1cbmZ1bmN0aW9uIHBhcnNlS2VyblRhYmxlKGRhdGEsIHN0YXJ0KSB7XG4gICAgdmFyIHBhaXJzLCBwLCB0YWJsZVZlcnNpb24sIG5UYWJsZXMsIHN1YlRhYmxlVmVyc2lvbiwgblBhaXJzLFxuICAgICAgICBpLCBsZWZ0SW5kZXgsIHJpZ2h0SW5kZXgsIHZhbHVlO1xuICAgIHBhaXJzID0ge307XG4gICAgcCA9IG5ldyBwYXJzZS5QYXJzZXIoZGF0YSwgc3RhcnQpO1xuICAgIHRhYmxlVmVyc2lvbiA9IHAucGFyc2VVU2hvcnQoKTtcbiAgICBjaGVja0FyZ3VtZW50KHRhYmxlVmVyc2lvbiA9PT0gMCwgJ1Vuc3VwcG9ydGVkIGtlcm4gdGFibGUgdmVyc2lvbi4nKTtcbiAgICBuVGFibGVzID0gcC5wYXJzZVVTaG9ydCgpO1xuICAgIHN1YlRhYmxlVmVyc2lvbiA9IHAucGFyc2VVU2hvcnQoKTtcbiAgICBjaGVja0FyZ3VtZW50KHN1YlRhYmxlVmVyc2lvbiA9PT0gMCwgJ1Vuc3VwcG9ydGVkIGtlcm4gc3ViLXRhYmxlIHZlcnNpb24uJyk7XG4gICAgLy8gU2tpcCBzdWJUYWJsZUxlbmd0aCwgc3ViVGFibGVDb3ZlcmFnZVxuICAgIHAuc2tpcCgndVNob3J0JywgMik7XG4gICAgblBhaXJzID0gcC5wYXJzZVVTaG9ydCgpO1xuICAgIC8vIFNraXAgc2VhcmNoUmFuZ2UsIGVudHJ5U2VsZWN0b3IsIHJhbmdlU2hpZnQuXG4gICAgcC5za2lwKCd1U2hvcnQnLCAzKTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgblBhaXJzOyBpICs9IDEpIHtcbiAgICAgICAgbGVmdEluZGV4ID0gcC5wYXJzZVVTaG9ydCgpO1xuICAgICAgICByaWdodEluZGV4ID0gcC5wYXJzZVVTaG9ydCgpO1xuICAgICAgICB2YWx1ZSA9IHAucGFyc2VTaG9ydCgpO1xuICAgICAgICBwYWlyc1tsZWZ0SW5kZXggKyAnLCcgKyByaWdodEluZGV4XSA9IHZhbHVlO1xuICAgIH1cbiAgICByZXR1cm4gcGFpcnM7XG59XG5cbi8vIFBhcnNlIFNjcmlwdExpc3QgYW5kIEZlYXR1cmVMaXN0IHRhYmxlcyBvZiBHUE9TLCBHU1VCLCBHREVGLCBCQVNFLCBKU1RGIHRhYmxlcy5cbi8vIFRoZXNlIGxpc3RzIGFyZSB1bnVzZWQgYnkgbm93LCB0aGlzIGZ1bmN0aW9uIGlzIGp1c3QgdGhlIGJhc2lzIGZvciBhIHJlYWwgcGFyc2luZy5cbmZ1bmN0aW9uIHBhcnNlVGFnZ2VkTGlzdFRhYmxlKGRhdGEsIHN0YXJ0KSB7XG4gICAgdmFyIHAgPSBuZXcgcGFyc2UuUGFyc2VyKGRhdGEsIHN0YXJ0KSxcbiAgICAgICAgbiA9IHAucGFyc2VVU2hvcnQoKSxcbiAgICAgICAgbGlzdCA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIGxpc3RbcC5wYXJzZVRhZygpXSA9IHsgb2Zmc2V0OiBwLnBhcnNlVVNob3J0KCkgfTtcbiAgICB9XG4gICAgcmV0dXJuIGxpc3Q7XG59XG5cbi8vIFBhcnNlIGEgY292ZXJhZ2UgdGFibGUgaW4gYSBHU1VCLCBHUE9TIG9yIEdERUYgdGFibGUuXG4vLyBGb3JtYXQgMSBpcyBhIHNpbXBsZSBsaXN0IG9mIGdseXBoIGlkcyxcbi8vIEZvcm1hdCAyIGlzIGEgbGlzdCBvZiByYW5nZXMuIEl0IGlzIGV4cGFuZGVkIGluIGEgbGlzdCBvZiBnbHlwaHMsIG1heWJlIG5vdCB0aGUgYmVzdCBpZGVhLlxuZnVuY3Rpb24gcGFyc2VDb3ZlcmFnZVRhYmxlKGRhdGEsIHN0YXJ0KSB7XG4gICAgdmFyIHAgPSBuZXcgcGFyc2UuUGFyc2VyKGRhdGEsIHN0YXJ0KSxcbiAgICAgICAgZm9ybWF0ID0gcC5wYXJzZVVTaG9ydCgpLFxuICAgICAgICBjb3VudCA9ICBwLnBhcnNlVVNob3J0KCk7XG4gICAgaWYgKGZvcm1hdCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gcC5wYXJzZVVTaG9ydExpc3QoY291bnQpO1xuICAgIH1cbiAgICBlbHNlIGlmIChmb3JtYXQgPT09IDIpIHtcbiAgICAgICAgdmFyIGksIGJlZ2luLCBlbmQsIGluZGV4LCBjb3ZlcmFnZSA9IFtdO1xuICAgICAgICBmb3IgKDsgY291bnQtLTspIHtcbiAgICAgICAgICAgIGJlZ2luID0gcC5wYXJzZVVTaG9ydCgpO1xuICAgICAgICAgICAgZW5kID0gcC5wYXJzZVVTaG9ydCgpO1xuICAgICAgICAgICAgaW5kZXggPSBwLnBhcnNlVVNob3J0KCk7XG4gICAgICAgICAgICBmb3IgKGkgPSBiZWdpbjsgaSA8PSBlbmQ7IGkrKykge1xuICAgICAgICAgICAgICAgIGNvdmVyYWdlW2luZGV4KytdID0gaTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY292ZXJhZ2U7XG4gICAgfVxufVxuXG4vLyBQYXJzZSBhIENsYXNzIERlZmluaXRpb24gVGFibGUgaW4gYSBHU1VCLCBHUE9TIG9yIEdERUYgdGFibGUuXG4vLyBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCBnZXRzIGEgY2xhc3MgdmFsdWUgZnJvbSBhIGdseXBoIElELlxuZnVuY3Rpb24gcGFyc2VDbGFzc0RlZlRhYmxlKGRhdGEsIHN0YXJ0KSB7XG4gICAgdmFyIHAgPSBuZXcgcGFyc2UuUGFyc2VyKGRhdGEsIHN0YXJ0KSxcbiAgICAgICAgZm9ybWF0ID0gcC5wYXJzZVVTaG9ydCgpO1xuICAgIGlmIChmb3JtYXQgPT09IDEpIHtcbiAgICAgICAgLy8gRm9ybWF0IDEgc3BlY2lmaWVzIGEgcmFuZ2Ugb2YgY29uc2VjdXRpdmUgZ2x5cGggaW5kaWNlcywgb25lIGNsYXNzIHBlciBnbHlwaCBJRC5cbiAgICAgICAgdmFyIHN0YXJ0R2x5cGggPSBwLnBhcnNlVVNob3J0KCksXG4gICAgICAgICAgICBnbHlwaENvdW50ID0gcC5wYXJzZVVTaG9ydCgpLFxuICAgICAgICAgICAgY2xhc3NlcyA9IHAucGFyc2VVU2hvcnRMaXN0KGdseXBoQ291bnQpO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oZ2x5cGhJRCkge1xuICAgICAgICAgICAgcmV0dXJuIGNsYXNzZXNbZ2x5cGhJRCAtIHN0YXJ0R2x5cGhdIHx8IDA7XG4gICAgICAgIH07XG4gICAgfVxuICAgIGVsc2UgaWYgKGZvcm1hdCA9PT0gMikge1xuICAgICAgICAvLyBGb3JtYXQgMiBkZWZpbmVzIG11bHRpcGxlIGdyb3VwcyBvZiBnbHlwaCBpbmRpY2VzIHRoYXQgYmVsb25nIHRvIHRoZSBzYW1lIGNsYXNzLlxuICAgICAgICB2YXIgcmFuZ2VDb3VudCA9IHAucGFyc2VVU2hvcnQoKSxcbiAgICAgICAgICAgIHN0YXJ0R2x5cGhzID0gW10sXG4gICAgICAgICAgICBlbmRHbHlwaHMgPSBbXSxcbiAgICAgICAgICAgIGNsYXNzVmFsdWVzID0gW107XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmFuZ2VDb3VudDsgaSsrKSB7XG4gICAgICAgICAgICBzdGFydEdseXBoc1tpXSA9IHAucGFyc2VVU2hvcnQoKTtcbiAgICAgICAgICAgIGVuZEdseXBoc1tpXSA9IHAucGFyc2VVU2hvcnQoKTtcbiAgICAgICAgICAgIGNsYXNzVmFsdWVzW2ldID0gcC5wYXJzZVVTaG9ydCgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmdW5jdGlvbihnbHlwaElEKSB7XG4gICAgICAgICAgICB2YXIgbCwgYywgcjtcbiAgICAgICAgICAgIGwgPSAwO1xuICAgICAgICAgICAgciA9IHN0YXJ0R2x5cGhzLmxlbmd0aCAtIDE7XG4gICAgICAgICAgICB3aGlsZSAobCA8IHIpIHtcbiAgICAgICAgICAgICAgICBjID0gKGwgKyByICsgMSkgPj4gMTtcbiAgICAgICAgICAgICAgICBpZiAoZ2x5cGhJRCA8IHN0YXJ0R2x5cGhzW2NdKSB7XG4gICAgICAgICAgICAgICAgICAgIHIgPSBjIC0gMTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsID0gYztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc3RhcnRHbHlwaHNbbF0gPD0gZ2x5cGhJRCAmJiBnbHlwaElEIDw9IGVuZEdseXBoc1tsXSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjbGFzc1ZhbHVlc1tsXSB8fCAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH07XG4gICAgfVxufVxuXG4vLyBQYXJzZSBhIHBhaXIgYWRqdXN0bWVudCBwb3NpdGlvbmluZyBzdWJ0YWJsZSwgZm9ybWF0IDEgb3IgZm9ybWF0IDJcbi8vIFRoZSBzdWJ0YWJsZSBpcyByZXR1cm5lZCBpbiB0aGUgZm9ybSBvZiBhIGxvb2t1cCBmdW5jdGlvbi5cbmZ1bmN0aW9uIHBhcnNlUGFpclBvc1N1YlRhYmxlKGRhdGEsIHN0YXJ0KSB7XG4gICAgdmFyIHAgPSBuZXcgcGFyc2UuUGFyc2VyKGRhdGEsIHN0YXJ0KTtcbiAgICB2YXIgZm9ybWF0LCBjb3ZlcmFnZU9mZnNldCwgY292ZXJhZ2UsIHZhbHVlRm9ybWF0MSwgdmFsdWVGb3JtYXQyLFxuICAgICAgICBzaGFyZWRQYWlyU2V0cywgZmlyc3RHbHlwaCwgc2Vjb25kR2x5cGgsIHZhbHVlMSwgdmFsdWUyO1xuICAgIC8vIFRoaXMgcGFydCBpcyBjb21tb24gdG8gZm9ybWF0IDEgYW5kIGZvcm1hdCAyIHN1YnRhYmxlc1xuICAgIGZvcm1hdCA9IHAucGFyc2VVU2hvcnQoKTtcbiAgICBjb3ZlcmFnZU9mZnNldCA9IHAucGFyc2VVU2hvcnQoKTtcbiAgICBjb3ZlcmFnZSA9IHBhcnNlQ292ZXJhZ2VUYWJsZShkYXRhLCBzdGFydCtjb3ZlcmFnZU9mZnNldCk7XG4gICAgLy8gdmFsdWVGb3JtYXQgNDogWEFkdmFuY2Ugb25seSwgMTogWFBsYWNlbWVudCBvbmx5LCAwOiBubyBWYWx1ZVJlY29yZCBmb3Igc2Vjb25kIGdseXBoXG4gICAgLy8gT25seSB2YWx1ZUZvcm1hdDE9NCBhbmQgdmFsdWVGb3JtYXQyPTAgaXMgc3VwcG9ydGVkLlxuICAgIHZhbHVlRm9ybWF0MSA9IHAucGFyc2VVU2hvcnQoKTtcbiAgICB2YWx1ZUZvcm1hdDIgPSBwLnBhcnNlVVNob3J0KCk7XG4gICAgaWYgKHZhbHVlRm9ybWF0MSAhPT0gNCB8fCB2YWx1ZUZvcm1hdDIgIT09IDApIHJldHVybjtcbiAgICBzaGFyZWRQYWlyU2V0cyA9IHt9O1xuICAgIGlmIChmb3JtYXQgPT09IDEpIHtcbiAgICAgICAgLy8gUGFpciBQb3NpdGlvbmluZyBBZGp1c3RtZW50OiBGb3JtYXQgMVxuICAgICAgICB2YXIgcGFpclNldENvdW50LCBwYWlyU2V0T2Zmc2V0cywgcGFpclNldE9mZnNldCwgc2hhcmVkUGFpclNldCwgcGFpclZhbHVlQ291bnQsIHBhaXJTZXQ7XG4gICAgICAgIHBhaXJTZXRDb3VudCA9IHAucGFyc2VVU2hvcnQoKTtcbiAgICAgICAgcGFpclNldCA9IFtdO1xuICAgICAgICAvLyBBcnJheSBvZiBvZmZzZXRzIHRvIFBhaXJTZXQgdGFibGVzLWZyb20gYmVnaW5uaW5nIG9mIFBhaXJQb3Mgc3VidGFibGUtb3JkZXJlZCBieSBDb3ZlcmFnZSBJbmRleFxuICAgICAgICBwYWlyU2V0T2Zmc2V0cyA9IHAucGFyc2VPZmZzZXQxNkxpc3QocGFpclNldENvdW50KTtcbiAgICAgICAgZm9yIChmaXJzdEdseXBoID0gMDsgZmlyc3RHbHlwaCA8IHBhaXJTZXRDb3VudDsgZmlyc3RHbHlwaCsrKSB7XG4gICAgICAgICAgICBwYWlyU2V0T2Zmc2V0ID0gcGFpclNldE9mZnNldHNbZmlyc3RHbHlwaF07XG4gICAgICAgICAgICBzaGFyZWRQYWlyU2V0ID0gc2hhcmVkUGFpclNldHNbcGFpclNldE9mZnNldF07XG4gICAgICAgICAgICBpZiAoIXNoYXJlZFBhaXJTZXQpIHtcbiAgICAgICAgICAgICAgICAvLyBQYXJzZSBhIHBhaXJzZXQgdGFibGUgaW4gYSBwYWlyIGFkanVzdG1lbnQgc3VidGFibGUgZm9ybWF0IDFcbiAgICAgICAgICAgICAgICBzaGFyZWRQYWlyU2V0ID0ge307XG4gICAgICAgICAgICAgICAgcC5yZWxhdGl2ZU9mZnNldCA9IHBhaXJTZXRPZmZzZXQ7XG4gICAgICAgICAgICAgICAgcGFpclZhbHVlQ291bnQgPSBwLnBhcnNlVVNob3J0KCk7XG4gICAgICAgICAgICAgICAgZm9yICg7IHBhaXJWYWx1ZUNvdW50LS07KSB7XG4gICAgICAgICAgICAgICAgICAgIHNlY29uZEdseXBoID0gcC5wYXJzZVVTaG9ydCgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWVGb3JtYXQxKSB2YWx1ZTEgPSBwLnBhcnNlU2hvcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlRm9ybWF0MikgdmFsdWUyID0gcC5wYXJzZVNob3J0KCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIFdlIG9ubHkgc3VwcG9ydCB2YWx1ZUZvcm1hdDEgPSA0IGFuZCB2YWx1ZUZvcm1hdDIgPSAwLFxuICAgICAgICAgICAgICAgICAgICAvLyBzbyB2YWx1ZTEgaXMgdGhlIFhBZHZhbmNlIGFuZCB2YWx1ZTIgaXMgZW1wdHkuXG4gICAgICAgICAgICAgICAgICAgIHNoYXJlZFBhaXJTZXRbc2Vjb25kR2x5cGhdID0gdmFsdWUxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBhaXJTZXRbY292ZXJhZ2VbZmlyc3RHbHlwaF1dID0gc2hhcmVkUGFpclNldDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZnVuY3Rpb24obGVmdEdseXBoLCByaWdodEdseXBoKSB7XG4gICAgICAgICAgICB2YXIgcGFpcnMgPSBwYWlyU2V0W2xlZnRHbHlwaF07XG4gICAgICAgICAgICBpZiAocGFpcnMpIHJldHVybiBwYWlyc1tyaWdodEdseXBoXTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgZWxzZSBpZiAoZm9ybWF0ID09PSAyKSB7XG4gICAgICAgIC8vIFBhaXIgUG9zaXRpb25pbmcgQWRqdXN0bWVudDogRm9ybWF0IDJcbiAgICAgICAgdmFyIGNsYXNzRGVmMU9mZnNldCwgY2xhc3NEZWYyT2Zmc2V0LCBjbGFzczFDb3VudCwgY2xhc3MyQ291bnQsIGksIGosXG4gICAgICAgICAgICBnZXRDbGFzczEsIGdldENsYXNzMiwga2VybmluZ01hdHJpeCwga2VybmluZ1JvdywgY292ZXJlZDtcbiAgICAgICAgY2xhc3NEZWYxT2Zmc2V0ID0gcC5wYXJzZVVTaG9ydCgpO1xuICAgICAgICBjbGFzc0RlZjJPZmZzZXQgPSBwLnBhcnNlVVNob3J0KCk7XG4gICAgICAgIGNsYXNzMUNvdW50ID0gcC5wYXJzZVVTaG9ydCgpO1xuICAgICAgICBjbGFzczJDb3VudCA9IHAucGFyc2VVU2hvcnQoKTtcbiAgICAgICAgZ2V0Q2xhc3MxID0gcGFyc2VDbGFzc0RlZlRhYmxlKGRhdGEsIHN0YXJ0K2NsYXNzRGVmMU9mZnNldCk7XG4gICAgICAgIGdldENsYXNzMiA9IHBhcnNlQ2xhc3NEZWZUYWJsZShkYXRhLCBzdGFydCtjbGFzc0RlZjJPZmZzZXQpO1xuXG4gICAgICAgIC8vIFBhcnNlIGtlcm5pbmcgdmFsdWVzIGJ5IGNsYXNzIHBhaXIuXG4gICAgICAgIGtlcm5pbmdNYXRyaXggPSBbXTtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGNsYXNzMUNvdW50OyBpKyspIHtcbiAgICAgICAgICAgIGtlcm5pbmdSb3cgPSBrZXJuaW5nTWF0cml4W2ldID0gW107XG4gICAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgY2xhc3MyQ291bnQ7IGorKykge1xuICAgICAgICAgICAgICAgIGlmICh2YWx1ZUZvcm1hdDEpIHZhbHVlMSA9IHAucGFyc2VTaG9ydCgpO1xuICAgICAgICAgICAgICAgIGlmICh2YWx1ZUZvcm1hdDIpIHZhbHVlMiA9IHAucGFyc2VTaG9ydCgpO1xuICAgICAgICAgICAgICAgIC8vIFdlIG9ubHkgc3VwcG9ydCB2YWx1ZUZvcm1hdDEgPSA0IGFuZCB2YWx1ZUZvcm1hdDIgPSAwLFxuICAgICAgICAgICAgICAgIC8vIHNvIHZhbHVlMSBpcyB0aGUgWEFkdmFuY2UgYW5kIHZhbHVlMiBpcyBlbXB0eS5cbiAgICAgICAgICAgICAgICBrZXJuaW5nUm93W2pdID0gdmFsdWUxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ29udmVydCBjb3ZlcmFnZSBsaXN0IHRvIGEgaGFzaFxuICAgICAgICBjb3ZlcmVkID0ge307XG4gICAgICAgIGZvcihpID0gMDsgaSA8IGNvdmVyYWdlLmxlbmd0aDsgaSsrKSBjb3ZlcmVkW2NvdmVyYWdlW2ldXSA9IDE7XG5cbiAgICAgICAgLy8gR2V0IHRoZSBrZXJuaW5nIHZhbHVlIGZvciBhIHNwZWNpZmljIGdseXBoIHBhaXIuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbihsZWZ0R2x5cGgsIHJpZ2h0R2x5cGgpIHtcbiAgICAgICAgICAgIGlmICghY292ZXJlZFtsZWZ0R2x5cGhdKSByZXR1cm4gMDtcbiAgICAgICAgICAgIHZhciBjbGFzczEgPSBnZXRDbGFzczEobGVmdEdseXBoKSxcbiAgICAgICAgICAgICAgICBjbGFzczIgPSBnZXRDbGFzczIocmlnaHRHbHlwaCksXG4gICAgICAgICAgICAgICAga2VybmluZ1JvdyA9IGtlcm5pbmdNYXRyaXhbY2xhc3MxXTtcbiAgICAgICAgICAgIHJldHVybiBrZXJuaW5nUm93ID8ga2VybmluZ1Jvd1tjbGFzczJdIDogMDtcbiAgICAgICAgfTtcbiAgICB9XG59XG5cbi8vIFBhcnNlIGEgTG9va3VwVGFibGUgKHByZXNlbnQgaW4gb2YgR1BPUywgR1NVQiwgR0RFRiwgQkFTRSwgSlNURiB0YWJsZXMpLlxuZnVuY3Rpb24gcGFyc2VMb29rdXBUYWJsZShkYXRhLCBzdGFydCkge1xuICAgIHZhciBwID0gbmV3IHBhcnNlLlBhcnNlcihkYXRhLCBzdGFydCk7XG4gICAgdmFyIHRhYmxlLCBsb29rdXBUeXBlLCBsb29rdXBGbGFnLCB1c2VNYXJrRmlsdGVyaW5nU2V0LCBzdWJUYWJsZUNvdW50LCBzdWJUYWJsZU9mZnNldHMsIHN1YnRhYmxlcywgaTtcbiAgICBsb29rdXBUeXBlID0gcC5wYXJzZVVTaG9ydCgpO1xuICAgIGxvb2t1cEZsYWcgPSBwLnBhcnNlVVNob3J0KCk7XG4gICAgdXNlTWFya0ZpbHRlcmluZ1NldCA9IGxvb2t1cEZsYWcgJiAweDEwO1xuICAgIHN1YlRhYmxlQ291bnQgPSBwLnBhcnNlVVNob3J0KCk7XG4gICAgc3ViVGFibGVPZmZzZXRzID0gcC5wYXJzZU9mZnNldDE2TGlzdChzdWJUYWJsZUNvdW50KTtcbiAgICB0YWJsZSA9IHtcbiAgICAgICAgbG9va3VwVHlwZTogbG9va3VwVHlwZSxcbiAgICAgICAgbG9va3VwRmxhZzogbG9va3VwRmxhZyxcbiAgICAgICAgbWFya0ZpbHRlcmluZ1NldDogdXNlTWFya0ZpbHRlcmluZ1NldCA/IHAucGFyc2VVU2hvcnQoKSA6IC0xXG4gICAgfTtcbiAgICAvLyBMb29rdXBUeXBlIDIsIFBhaXIgYWRqdXN0bWVudFxuICAgIGlmIChsb29rdXBUeXBlID09PSAyKSB7XG4gICAgICAgIHN1YnRhYmxlcyA9IFtdO1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgc3ViVGFibGVDb3VudDsgaSsrKSB7XG4gICAgICAgICAgICBzdWJ0YWJsZXMucHVzaChwYXJzZVBhaXJQb3NTdWJUYWJsZShkYXRhLCBzdGFydCArIHN1YlRhYmxlT2Zmc2V0c1tpXSkpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFJldHVybiBhIGZ1bmN0aW9uIHdoaWNoIGZpbmRzIHRoZSBrZXJuaW5nIHZhbHVlcyBpbiB0aGUgc3VidGFibGVzLlxuICAgICAgICB0YWJsZS5nZXRLZXJuaW5nVmFsdWUgPSBmdW5jdGlvbihsZWZ0R2x5cGgsIHJpZ2h0R2x5cGgpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSBzdWJ0YWJsZXMubGVuZ3RoOyBpLS07KSB7XG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlID0gc3VidGFibGVzW2ldKGxlZnRHbHlwaCwgcmlnaHRHbHlwaCk7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gdGFibGU7XG59XG5cbi8vIFBhcnNlIHRoZSBgR1BPU2AgdGFibGUgd2hpY2ggY29udGFpbnMsIGFtb25nIG90aGVyIHRoaW5ncywga2VybmluZyBwYWlycy5cbi8vIGh0dHBzOi8vd3d3Lm1pY3Jvc29mdC5jb20vdHlwb2dyYXBoeS9PVFNQRUMvZ3Bvcy5odG1cbmZ1bmN0aW9uIHBhcnNlR3Bvc1RhYmxlKGRhdGEsIHN0YXJ0LCBmb250KSB7XG4gICAgdmFyIHAsIHRhYmxlVmVyc2lvbiwgbG9va3VwTGlzdE9mZnNldCwgc2NyaXB0TGlzdCwgaSwgZmVhdHVyZUxpc3QsIGxvb2t1cENvdW50LFxuICAgICAgICBsb29rdXBUYWJsZU9mZnNldHMsIGxvb2t1cExpc3RBYnNvbHV0ZU9mZnNldCwgdGFibGU7XG5cbiAgICBwID0gbmV3IHBhcnNlLlBhcnNlcihkYXRhLCBzdGFydCk7XG4gICAgdGFibGVWZXJzaW9uID0gcC5wYXJzZUZpeGVkKCk7XG4gICAgY2hlY2tBcmd1bWVudCh0YWJsZVZlcnNpb24gPT09IDEsICdVbnN1cHBvcnRlZCBHUE9TIHRhYmxlIHZlcnNpb24uJyk7XG5cbiAgICAvLyBTY3JpcHRMaXN0IGFuZCBGZWF0dXJlTGlzdCAtIGlnbm9yZWQgZm9yIG5vd1xuICAgIHNjcmlwdExpc3QgPSBwYXJzZVRhZ2dlZExpc3RUYWJsZShkYXRhLCBzdGFydCtwLnBhcnNlVVNob3J0KCkpO1xuICAgIC8vICdrZXJuJyBpcyB0aGUgZmVhdHVyZSB3ZSBhcmUgbG9va2luZyBmb3IuXG4gICAgZmVhdHVyZUxpc3QgPSBwYXJzZVRhZ2dlZExpc3RUYWJsZShkYXRhLCBzdGFydCtwLnBhcnNlVVNob3J0KCkpO1xuXG4gICAgLy8gTG9va3VwTGlzdFxuICAgIGxvb2t1cExpc3RPZmZzZXQgPSBwLnBhcnNlVVNob3J0KCk7XG4gICAgcC5yZWxhdGl2ZU9mZnNldCA9IGxvb2t1cExpc3RPZmZzZXQ7XG4gICAgbG9va3VwQ291bnQgPSBwLnBhcnNlVVNob3J0KCk7XG4gICAgbG9va3VwVGFibGVPZmZzZXRzID0gcC5wYXJzZU9mZnNldDE2TGlzdChsb29rdXBDb3VudCk7XG4gICAgbG9va3VwTGlzdEFic29sdXRlT2Zmc2V0ID0gc3RhcnQgKyBsb29rdXBMaXN0T2Zmc2V0O1xuICAgIGZvciAoaSA9IDA7IGkgPCBsb29rdXBDb3VudDsgaSsrKSB7XG4gICAgICAgIHRhYmxlID0gcGFyc2VMb29rdXBUYWJsZShkYXRhLCBsb29rdXBMaXN0QWJzb2x1dGVPZmZzZXQgKyBsb29rdXBUYWJsZU9mZnNldHNbaV0pO1xuICAgICAgICBpZiAodGFibGUubG9va3VwVHlwZSA9PT0gMiAmJiAhZm9udC5nZXRHcG9zS2VybmluZ1ZhbHVlKSBmb250LmdldEdwb3NLZXJuaW5nVmFsdWUgPSB0YWJsZS5nZXRLZXJuaW5nVmFsdWU7XG4gICAgfVxufVxuXG4vLyBGaWxlIGxvYWRlcnMgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbi8vIENvbnZlcnQgYSBOb2RlLmpzIEJ1ZmZlciB0byBhbiBBcnJheUJ1ZmZlclxuZnVuY3Rpb24gdG9BcnJheUJ1ZmZlcihidWZmZXIpIHtcbiAgICB2YXIgaSxcbiAgICAgICAgYXJyYXlCdWZmZXIgPSBuZXcgQXJyYXlCdWZmZXIoYnVmZmVyLmxlbmd0aCksXG4gICAgICAgIGRhdGEgPSBuZXcgVWludDhBcnJheShhcnJheUJ1ZmZlcik7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgYnVmZmVyLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIGRhdGFbaV0gPSBidWZmZXJbaV07XG4gICAgfVxuXG4gICAgcmV0dXJuIGFycmF5QnVmZmVyO1xufVxuXG5mdW5jdGlvbiBsb2FkRnJvbUZpbGUocGF0aCwgY2FsbGJhY2spIHtcbiAgICB2YXIgZnMgPSByZXF1aXJlKCdmcycpO1xuICAgIGZzLnJlYWRGaWxlKHBhdGgsIGZ1bmN0aW9uIChlcnIsIGJ1ZmZlcikge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyLm1lc3NhZ2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgY2FsbGJhY2sobnVsbCwgdG9BcnJheUJ1ZmZlcihidWZmZXIpKTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gbG9hZEZyb21VcmwodXJsLCBjYWxsYmFjaykge1xuICAgIHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgcmVxdWVzdC5vcGVuKCdnZXQnLCB1cmwsIHRydWUpO1xuICAgIHJlcXVlc3QucmVzcG9uc2VUeXBlID0gJ2FycmF5YnVmZmVyJztcbiAgICByZXF1ZXN0Lm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHJlcXVlc3Quc3RhdHVzICE9PSAyMDApIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjaygnRm9udCBjb3VsZCBub3QgYmUgbG9hZGVkOiAnICsgcmVxdWVzdC5zdGF0dXNUZXh0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgcmVxdWVzdC5yZXNwb25zZSk7XG4gICAgfTtcbiAgICByZXF1ZXN0LnNlbmQoKTtcbn1cblxuLy8gUHVibGljIEFQSSAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG4vLyBQYXJzZSB0aGUgT3BlblR5cGUgZmlsZSBkYXRhIChhcyBhbiBBcnJheUJ1ZmZlcikgYW5kIHJldHVybiBhIEZvbnQgb2JqZWN0LlxuLy8gSWYgdGhlIGZpbGUgY291bGQgbm90IGJlIHBhcnNlZCAobW9zdCBsaWtlbHkgYmVjYXVzZSBpdCBjb250YWlucyBQb3N0c2NyaXB0IG91dGxpbmVzKVxuLy8gd2UgcmV0dXJuIGFuIGVtcHR5IEZvbnQgb2JqZWN0IHdpdGggdGhlIGBzdXBwb3J0ZWRgIGZsYWcgc2V0IHRvIGBmYWxzZWAuXG5vcGVudHlwZS5wYXJzZSA9IGZ1bmN0aW9uIChidWZmZXIpIHtcbiAgICB2YXIgZm9udCwgZGF0YSwgdmVyc2lvbiwgbnVtVGFibGVzLCBpLCBwLCB0YWcsIG9mZnNldCwgaG10eE9mZnNldCwgZ2x5Zk9mZnNldCwgbG9jYU9mZnNldCxcbiAgICAgICAgY2ZmT2Zmc2V0LCBrZXJuT2Zmc2V0LCBncG9zT2Zmc2V0LCBpbmRleFRvTG9jRm9ybWF0LCBudW1HbHlwaHMsIGxvY2EsXG4gICAgICAgIHNob3J0VmVyc2lvbjtcbiAgICAvLyBPcGVuVHlwZSBmb250cyB1c2UgYmlnIGVuZGlhbiBieXRlIG9yZGVyaW5nLlxuICAgIC8vIFdlIGNhbid0IHJlbHkgb24gdHlwZWQgYXJyYXkgdmlldyB0eXBlcywgYmVjYXVzZSB0aGV5IG9wZXJhdGUgd2l0aCB0aGUgZW5kaWFubmVzcyBvZiB0aGUgaG9zdCBjb21wdXRlci5cbiAgICAvLyBJbnN0ZWFkIHdlIHVzZSBEYXRhVmlld3Mgd2hlcmUgd2UgY2FuIHNwZWNpZnkgZW5kaWFubmVzcy5cblxuICAgIGZvbnQgPSBuZXcgRm9udCgpO1xuICAgIGRhdGEgPSBuZXcgRGF0YVZpZXcoYnVmZmVyLCAwKTtcblxuICAgIHZlcnNpb24gPSBwYXJzZS5nZXRGaXhlZChkYXRhLCAwKTtcbiAgICBpZiAodmVyc2lvbiA9PT0gMS4wKSB7XG4gICAgICAgIGZvbnQub3V0bGluZXNGb3JtYXQgPSAndHJ1ZXR5cGUnO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZlcnNpb24gPSBwYXJzZS5nZXRUYWcoZGF0YSwgMCk7XG4gICAgICAgIGlmICh2ZXJzaW9uID09PSAnT1RUTycpIHtcbiAgICAgICAgICAgIGZvbnQub3V0bGluZXNGb3JtYXQgPSAnY2ZmJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5zdXBwb3J0ZWQgT3BlblR5cGUgdmVyc2lvbiAnICsgdmVyc2lvbik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBudW1UYWJsZXMgPSBwYXJzZS5nZXRVU2hvcnQoZGF0YSwgNCk7XG5cbiAgICAvLyBPZmZzZXQgaW50byB0aGUgdGFibGUgcmVjb3Jkcy5cbiAgICBwID0gMTI7XG4gICAgZm9yIChpID0gMDsgaSA8IG51bVRhYmxlczsgaSArPSAxKSB7XG4gICAgICAgIHRhZyA9IHBhcnNlLmdldFRhZyhkYXRhLCBwKTtcbiAgICAgICAgb2Zmc2V0ID0gcGFyc2UuZ2V0VUxvbmcoZGF0YSwgcCArIDgpO1xuICAgICAgICBzd2l0Y2ggKHRhZykge1xuICAgICAgICBjYXNlICdjbWFwJzpcbiAgICAgICAgICAgIGZvbnQudGFibGVzLmNtYXAgPSBwYXJzZUNtYXBUYWJsZShkYXRhLCBvZmZzZXQpO1xuICAgICAgICAgICAgZm9udC5lbmNvZGluZyA9IG5ldyBDbWFwRW5jb2RpbmcoZm9udC50YWJsZXMuY21hcC5zZWdtZW50cyk7XG4gICAgICAgICAgICBpZiAoIWZvbnQuZW5jb2RpbmcpIHtcbiAgICAgICAgICAgICAgICBmb250LnN1cHBvcnRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2hlYWQnOlxuICAgICAgICAgICAgZm9udC50YWJsZXMuaGVhZCA9IHBhcnNlSGVhZFRhYmxlKGRhdGEsIG9mZnNldCk7XG4gICAgICAgICAgICBmb250LnVuaXRzUGVyRW0gPSBmb250LnRhYmxlcy5oZWFkLnVuaXRzUGVyRW07XG4gICAgICAgICAgICBpbmRleFRvTG9jRm9ybWF0ID0gZm9udC50YWJsZXMuaGVhZC5pbmRleFRvTG9jRm9ybWF0O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2hoZWEnOlxuICAgICAgICAgICAgZm9udC50YWJsZXMuaGhlYSA9IHBhcnNlSGhlYVRhYmxlKGRhdGEsIG9mZnNldCk7XG4gICAgICAgICAgICBmb250LmFzY2VuZGVyID0gZm9udC50YWJsZXMuaGhlYS5hc2NlbmRlcjtcbiAgICAgICAgICAgIGZvbnQuZGVzY2VuZGVyID0gZm9udC50YWJsZXMuaGhlYS5kZXNjZW5kZXI7XG4gICAgICAgICAgICBmb250Lm51bWJlck9mSE1ldHJpY3MgPSBmb250LnRhYmxlcy5oaGVhLm51bWJlck9mSE1ldHJpY3M7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnaG10eCc6XG4gICAgICAgICAgICBobXR4T2Zmc2V0ID0gb2Zmc2V0O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ21heHAnOlxuICAgICAgICAgICAgZm9udC50YWJsZXMubWF4cCA9IHBhcnNlTWF4cFRhYmxlKGRhdGEsIG9mZnNldCk7XG4gICAgICAgICAgICBmb250Lm51bUdseXBocyA9IG51bUdseXBocyA9IGZvbnQudGFibGVzLm1heHAubnVtR2x5cGhzO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ25hbWUnOlxuICAgICAgICAgICAgIGZvbnQudGFibGVzLm5hbWUgPSBwYXJzZU5hbWVUYWJsZShkYXRhLCBvZmZzZXQpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ09TLzInOlxuICAgICAgICAgICAgZm9udC50YWJsZXMub3MyID0gcGFyc2VPUzJUYWJsZShkYXRhLCBvZmZzZXQpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3Bvc3QnOlxuICAgICAgICAgICAgZm9udC50YWJsZXMucG9zdCA9IHBhcnNlUG9zdFRhYmxlKGRhdGEsIG9mZnNldCk7XG4gICAgICAgICAgICBmb250LmdseXBoTmFtZXMgPSBuZXcgR2x5cGhOYW1lcyhmb250LnRhYmxlcy5wb3N0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdnbHlmJzpcbiAgICAgICAgICAgIGdseWZPZmZzZXQgPSBvZmZzZXQ7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnbG9jYSc6XG4gICAgICAgICAgICBsb2NhT2Zmc2V0ID0gb2Zmc2V0O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ0NGRiAnOlxuICAgICAgICAgICAgY2ZmT2Zmc2V0ID0gb2Zmc2V0O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2tlcm4nOlxuICAgICAgICAgICAga2Vybk9mZnNldCA9IG9mZnNldDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdHUE9TJzpcbiAgICAgICAgICAgIGdwb3NPZmZzZXQgPSBvZmZzZXQ7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBwICs9IDE2O1xuICAgIH1cblxuICAgIGlmIChnbHlmT2Zmc2V0ICYmIGxvY2FPZmZzZXQpIHtcbiAgICAgICAgc2hvcnRWZXJzaW9uID0gaW5kZXhUb0xvY0Zvcm1hdCA9PT0gMDtcbiAgICAgICAgbG9jYSA9IHBhcnNlTG9jYVRhYmxlKGRhdGEsIGxvY2FPZmZzZXQsIG51bUdseXBocywgc2hvcnRWZXJzaW9uKTtcbiAgICAgICAgZm9udC5nbHlwaHMgPSBwYXJzZUdseWZUYWJsZShkYXRhLCBnbHlmT2Zmc2V0LCBsb2NhLCBmb250KTtcbiAgICAgICAgcGFyc2VIbXR4VGFibGUoZGF0YSwgaG10eE9mZnNldCwgZm9udC5udW1iZXJPZkhNZXRyaWNzLCBmb250Lm51bUdseXBocywgZm9udC5nbHlwaHMpO1xuICAgIH0gZWxzZSBpZiAoY2ZmT2Zmc2V0KSB7XG4gICAgICAgIHBhcnNlQ0ZGVGFibGUoZGF0YSwgY2ZmT2Zmc2V0LCBmb250KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmb250LnN1cHBvcnRlZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmIChmb250LnN1cHBvcnRlZCkge1xuICAgICAgICBpZiAoa2Vybk9mZnNldCkge1xuICAgICAgICAgICAgZm9udC5rZXJuaW5nUGFpcnMgPSBwYXJzZUtlcm5UYWJsZShkYXRhLCBrZXJuT2Zmc2V0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvbnQua2VybmluZ1BhaXJzID0ge307XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGdwb3NPZmZzZXQpIHtcbiAgICAgICAgICAgIHBhcnNlR3Bvc1RhYmxlKGRhdGEsIGdwb3NPZmZzZXQsIGZvbnQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZvbnQ7XG59O1xuXG4vLyBBc3luY2hyb25vdXNseSBsb2FkIHRoZSBmb250IGZyb20gYSBVUkwgb3IgYSBmaWxlc3lzdGVtLiBXaGVuIGRvbmUsIGNhbGwgdGhlIGNhbGxiYWNrXG4vLyB3aXRoIHR3byBhcmd1bWVudHMgYChlcnIsIGZvbnQpYC4gVGhlIGBlcnJgIHdpbGwgYmUgbnVsbCBvbiBzdWNjZXNzLFxuLy8gdGhlIGBmb250YCBpcyBhIEZvbnQgb2JqZWN0LlxuLy9cbi8vIFdlIHVzZSB0aGUgbm9kZS5qcyBjYWxsYmFjayBjb252ZW50aW9uIHNvIHRoYXRcbi8vIG9wZW50eXBlLmpzIGNhbiBpbnRlZ3JhdGUgd2l0aCBmcmFtZXdvcmtzIGxpa2UgYXN5bmMuanMuXG5vcGVudHlwZS5sb2FkID0gZnVuY3Rpb24gKHVybCwgY2FsbGJhY2spIHtcbiAgICB2YXIgbG9hZGVyID0gdHlwZW9mIHByb2Nlc3MgPT09ICd1bmRlZmluZWQnIHx8ICFwcm9jZXNzLmJyb3dzZXIgPyBsb2FkRnJvbUZpbGUgOiBsb2FkRnJvbVVybDtcbiAgICBsb2FkZXIodXJsLCBmdW5jdGlvbiAoZXJyLCBhcnJheUJ1ZmZlcikge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZm9udCA9IG9wZW50eXBlLnBhcnNlKGFycmF5QnVmZmVyKTtcbiAgICAgICAgaWYgKCFmb250LnN1cHBvcnRlZCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCdGb250IGlzIG5vdCBzdXBwb3J0ZWQgKGlzIHRoaXMgYSBQb3N0c2NyaXB0IGZvbnQ/KScpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCBmb250KTtcbiAgICB9KTtcbn07XG5cbi8vIE1vZHVsZSBzdXBwb3J0IC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxubW9kdWxlLmV4cG9ydHMgPSBvcGVudHlwZTtcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJGV2FBU0hcIikpIiwiLy8gUGFyc2luZyB1dGlsaXR5IGZ1bmN0aW9uc1xuXG4ndXNlIHN0cmljdCc7XG5cbi8vIFJldHJpZXZlIGFuIHVuc2lnbmVkIGJ5dGUgZnJvbSB0aGUgRGF0YVZpZXcuXG5leHBvcnRzLmdldEJ5dGUgPSBmdW5jdGlvbiBnZXRCeXRlKGRhdGFWaWV3LCBvZmZzZXQpIHtcbiAgICByZXR1cm4gZGF0YVZpZXcuZ2V0VWludDgob2Zmc2V0KTtcbn07XG5cbmV4cG9ydHMuZ2V0Q2FyZDggPSBleHBvcnRzLmdldEJ5dGU7XG5cbi8vIFJldHJpZXZlIGFuIHVuc2lnbmVkIDE2LWJpdCBzaG9ydCBmcm9tIHRoZSBEYXRhVmlldy5cbi8vIFRoZSB2YWx1ZSBpcyBzdG9yZWQgaW4gYmlnIGVuZGlhbi5cbmV4cG9ydHMuZ2V0VVNob3J0ID0gZnVuY3Rpb24gKGRhdGFWaWV3LCBvZmZzZXQpIHtcbiAgICByZXR1cm4gZGF0YVZpZXcuZ2V0VWludDE2KG9mZnNldCwgZmFsc2UpO1xufTtcblxuZXhwb3J0cy5nZXRDYXJkMTYgPSBleHBvcnRzLmdldFVTaG9ydDtcblxuLy8gUmV0cmlldmUgYSBzaWduZWQgMTYtYml0IHNob3J0IGZyb20gdGhlIERhdGFWaWV3LlxuLy8gVGhlIHZhbHVlIGlzIHN0b3JlZCBpbiBiaWcgZW5kaWFuLlxuZXhwb3J0cy5nZXRTaG9ydCA9IGZ1bmN0aW9uIChkYXRhVmlldywgb2Zmc2V0KSB7XG4gICAgcmV0dXJuIGRhdGFWaWV3LmdldEludDE2KG9mZnNldCwgZmFsc2UpO1xufTtcblxuLy8gUmV0cmlldmUgYW4gdW5zaWduZWQgMzItYml0IGxvbmcgZnJvbSB0aGUgRGF0YVZpZXcuXG4vLyBUaGUgdmFsdWUgaXMgc3RvcmVkIGluIGJpZyBlbmRpYW4uXG5leHBvcnRzLmdldFVMb25nID0gZnVuY3Rpb24gKGRhdGFWaWV3LCBvZmZzZXQpIHtcbiAgICByZXR1cm4gZGF0YVZpZXcuZ2V0VWludDMyKG9mZnNldCwgZmFsc2UpO1xufTtcblxuLy8gUmV0cmlldmUgYSAzMi1iaXQgc2lnbmVkIGZpeGVkLXBvaW50IG51bWJlciAoMTYuMTYpIGZyb20gdGhlIERhdGFWaWV3LlxuLy8gVGhlIHZhbHVlIGlzIHN0b3JlZCBpbiBiaWcgZW5kaWFuLlxuZXhwb3J0cy5nZXRGaXhlZCA9IGZ1bmN0aW9uIChkYXRhVmlldywgb2Zmc2V0KSB7XG4gICAgdmFyIGRlY2ltYWwsIGZyYWN0aW9uO1xuICAgIGRlY2ltYWwgPSBkYXRhVmlldy5nZXRJbnQxNihvZmZzZXQsIGZhbHNlKTtcbiAgICBmcmFjdGlvbiA9IGRhdGFWaWV3LmdldFVpbnQxNihvZmZzZXQgKyAyLCBmYWxzZSk7XG4gICAgcmV0dXJuIGRlY2ltYWwgKyBmcmFjdGlvbiAvIDY1NTM1O1xufTtcblxuLy8gUmV0cmlldmUgYSA0LWNoYXJhY3RlciB0YWcgZnJvbSB0aGUgRGF0YVZpZXcuXG4vLyBUYWdzIGFyZSB1c2VkIHRvIGlkZW50aWZ5IHRhYmxlcy5cbmV4cG9ydHMuZ2V0VGFnID0gZnVuY3Rpb24gKGRhdGFWaWV3LCBvZmZzZXQpIHtcbiAgICB2YXIgdGFnID0gJycsIGk7XG4gICAgZm9yIChpID0gb2Zmc2V0OyBpIDwgb2Zmc2V0ICsgNDsgaSArPSAxKSB7XG4gICAgICAgIHRhZyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGRhdGFWaWV3LmdldEludDgoaSkpO1xuICAgIH1cbiAgICByZXR1cm4gdGFnO1xufTtcblxuLy8gUmV0cmlldmUgYW4gb2Zmc2V0IGZyb20gdGhlIERhdGFWaWV3LlxuLy8gT2Zmc2V0cyBhcmUgMSB0byA0IGJ5dGVzIGluIGxlbmd0aCwgZGVwZW5kaW5nIG9uIHRoZSBvZmZTaXplIGFyZ3VtZW50LlxuZXhwb3J0cy5nZXRPZmZzZXQgPSBmdW5jdGlvbiAoZGF0YVZpZXcsIG9mZnNldCwgb2ZmU2l6ZSkge1xuICAgIHZhciBpLCB2O1xuICAgIHYgPSAwO1xuICAgIGZvciAoaSA9IDA7IGkgPCBvZmZTaXplOyBpICs9IDEpIHtcbiAgICAgICAgdiA8PD0gODtcbiAgICAgICAgdiArPSBkYXRhVmlldy5nZXRVaW50OChvZmZzZXQgKyBpKTtcbiAgICB9XG4gICAgcmV0dXJuIHY7XG59O1xuXG4vLyBSZXRyaWV2ZSBhIG51bWJlciBvZiBieXRlcyBmcm9tIHN0YXJ0IG9mZnNldCB0byB0aGUgZW5kIG9mZnNldCBmcm9tIHRoZSBEYXRhVmlldy5cbmV4cG9ydHMuZ2V0Qnl0ZXMgPSBmdW5jdGlvbiAoZGF0YVZpZXcsIHN0YXJ0T2Zmc2V0LCBlbmRPZmZzZXQpIHtcbiAgICB2YXIgYnl0ZXMsIGk7XG4gICAgYnl0ZXMgPSBbXTtcbiAgICBmb3IgKGkgPSBzdGFydE9mZnNldDsgaSA8IGVuZE9mZnNldDsgaSArPSAxKSB7XG4gICAgICAgIGJ5dGVzLnB1c2goZGF0YVZpZXcuZ2V0VWludDgoaSkpO1xuICAgIH1cbiAgICByZXR1cm4gYnl0ZXM7XG59O1xuXG4vLyBDb252ZXJ0IHRoZSBsaXN0IG9mIGJ5dGVzIHRvIGEgc3RyaW5nLlxuZXhwb3J0cy5ieXRlc1RvU3RyaW5nID0gZnVuY3Rpb24gKGJ5dGVzKSB7XG4gICAgdmFyIHMsIGk7XG4gICAgcyA9ICcnO1xuICAgIGZvciAoaSA9IDA7IGkgPCBieXRlcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICBzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0pO1xuICAgIH1cbiAgICByZXR1cm4gcztcbn07XG5cbnZhciB0eXBlT2Zmc2V0cyA9IHtcbiAgICBieXRlOiAxLFxuICAgIHVTaG9ydDogMixcbiAgICBzaG9ydDogMixcbiAgICB1TG9uZzogNCxcbiAgICBmaXhlZDogNCxcbiAgICBsb25nRGF0ZVRpbWU6IDgsXG4gICAgdGFnOiA0XG59O1xuXG4vLyBBIHN0YXRlZnVsIHBhcnNlciB0aGF0IGNoYW5nZXMgdGhlIG9mZnNldCB3aGVuZXZlciBhIHZhbHVlIGlzIHJldHJpZXZlZC5cbi8vIFRoZSBkYXRhIGlzIGEgRGF0YVZpZXcuXG5mdW5jdGlvbiBQYXJzZXIoZGF0YSwgb2Zmc2V0KSB7XG4gICAgdGhpcy5kYXRhID0gZGF0YTtcbiAgICB0aGlzLm9mZnNldCA9IG9mZnNldDtcbiAgICB0aGlzLnJlbGF0aXZlT2Zmc2V0ID0gMDtcbn1cblxuUGFyc2VyLnByb3RvdHlwZS5wYXJzZUJ5dGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHYgPSB0aGlzLmRhdGEuZ2V0VWludDgodGhpcy5vZmZzZXQgKyB0aGlzLnJlbGF0aXZlT2Zmc2V0KTtcbiAgICB0aGlzLnJlbGF0aXZlT2Zmc2V0ICs9IDE7XG4gICAgcmV0dXJuIHY7XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLnBhcnNlQ2hhciA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdiA9IHRoaXMuZGF0YS5nZXRJbnQ4KHRoaXMub2Zmc2V0ICsgdGhpcy5yZWxhdGl2ZU9mZnNldCk7XG4gICAgdGhpcy5yZWxhdGl2ZU9mZnNldCArPSAxO1xuICAgIHJldHVybiB2O1xufTtcblxuUGFyc2VyLnByb3RvdHlwZS5wYXJzZUNhcmQ4ID0gUGFyc2VyLnByb3RvdHlwZS5wYXJzZUJ5dGU7XG5cblBhcnNlci5wcm90b3R5cGUucGFyc2VVU2hvcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHYgPSB0aGlzLmRhdGEuZ2V0VWludDE2KHRoaXMub2Zmc2V0ICsgdGhpcy5yZWxhdGl2ZU9mZnNldCk7XG4gICAgdGhpcy5yZWxhdGl2ZU9mZnNldCArPSAyO1xuICAgIHJldHVybiB2O1xufTtcblBhcnNlci5wcm90b3R5cGUucGFyc2VDYXJkMTYgPSBQYXJzZXIucHJvdG90eXBlLnBhcnNlVVNob3J0O1xuUGFyc2VyLnByb3RvdHlwZS5wYXJzZVNJRCA9IFBhcnNlci5wcm90b3R5cGUucGFyc2VVU2hvcnQ7XG5QYXJzZXIucHJvdG90eXBlLnBhcnNlT2Zmc2V0MTYgPSBQYXJzZXIucHJvdG90eXBlLnBhcnNlVVNob3J0O1xuXG5QYXJzZXIucHJvdG90eXBlLnBhcnNlU2hvcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHYgPSB0aGlzLmRhdGEuZ2V0SW50MTYodGhpcy5vZmZzZXQgKyB0aGlzLnJlbGF0aXZlT2Zmc2V0KTtcbiAgICB0aGlzLnJlbGF0aXZlT2Zmc2V0ICs9IDI7XG4gICAgcmV0dXJuIHY7XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLnBhcnNlVUxvbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHYgPSBleHBvcnRzLmdldFVMb25nKHRoaXMuZGF0YSwgdGhpcy5vZmZzZXQgKyB0aGlzLnJlbGF0aXZlT2Zmc2V0KTtcbiAgICB0aGlzLnJlbGF0aXZlT2Zmc2V0ICs9IDQ7XG4gICAgcmV0dXJuIHY7XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLnBhcnNlRml4ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHYgPSBleHBvcnRzLmdldEZpeGVkKHRoaXMuZGF0YSwgdGhpcy5vZmZzZXQgKyB0aGlzLnJlbGF0aXZlT2Zmc2V0KTtcbiAgICB0aGlzLnJlbGF0aXZlT2Zmc2V0ICs9IDQ7XG4gICAgcmV0dXJuIHY7XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLnBhcnNlT2Zmc2V0MTZMaXN0ID1cblBhcnNlci5wcm90b3R5cGUucGFyc2VVU2hvcnRMaXN0ID0gZnVuY3Rpb24gKGNvdW50KSB7XG4gICAgdmFyIG9mZnNldHMgPSBuZXcgQXJyYXkoY291bnQpLFxuICAgICAgICBkYXRhVmlldyA9IHRoaXMuZGF0YSxcbiAgICAgICAgb2Zmc2V0ID0gdGhpcy5vZmZzZXQgKyB0aGlzLnJlbGF0aXZlT2Zmc2V0O1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xuICAgICAgICBvZmZzZXRzW2ldID0gZXhwb3J0cy5nZXRVU2hvcnQoZGF0YVZpZXcsIG9mZnNldCk7XG4gICAgICAgIG9mZnNldCArPSAyO1xuICAgIH1cbiAgICB0aGlzLnJlbGF0aXZlT2Zmc2V0ICs9IGNvdW50ICogMjtcbiAgICByZXR1cm4gb2Zmc2V0cztcbn07XG5cblBhcnNlci5wcm90b3R5cGUucGFyc2VTdHJpbmcgPSBmdW5jdGlvbiAobGVuZ3RoKSB7XG4gICAgdmFyIGRhdGFWaWV3ID0gdGhpcy5kYXRhLFxuICAgICAgICBvZmZzZXQgPSB0aGlzLm9mZnNldCArIHRoaXMucmVsYXRpdmVPZmZzZXQsXG4gICAgICAgIHN0cmluZyA9ICcnO1xuICAgIHRoaXMucmVsYXRpdmVPZmZzZXQgKz0gbGVuZ3RoO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgc3RyaW5nICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoZGF0YVZpZXcuZ2V0VWludDgob2Zmc2V0ICsgaSkpO1xuICAgIH1cbiAgICByZXR1cm4gc3RyaW5nO1xufTtcblxuUGFyc2VyLnByb3RvdHlwZS5wYXJzZVRhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5wYXJzZVN0cmluZyg0KTtcbn07XG5cbi8vIExPTkdEQVRFVElNRSBpcyBhIDY0LWJpdCBpbnRlZ2VyLlxuLy8gSmF2YVNjcmlwdCBhbmQgdW5peCB0aW1lc3RhbXBzIHRyYWRpdGlvbmFsbHkgdXNlIDMyIGJpdHMsIHNvIHdlXG4vLyBvbmx5IHRha2UgdGhlIGxhc3QgMzIgYml0cy5cblBhcnNlci5wcm90b3R5cGUucGFyc2VMb25nRGF0ZVRpbWUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdiA9IGV4cG9ydHMuZ2V0VUxvbmcodGhpcy5kYXRhLCB0aGlzLm9mZnNldCArIHRoaXMucmVsYXRpdmVPZmZzZXQgKyA0KTtcbiAgICB0aGlzLnJlbGF0aXZlT2Zmc2V0ICs9IDg7XG4gICAgcmV0dXJuIHY7XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLnBhcnNlRml4ZWQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdiA9IGV4cG9ydHMuZ2V0VUxvbmcodGhpcy5kYXRhLCB0aGlzLm9mZnNldCArIHRoaXMucmVsYXRpdmVPZmZzZXQpO1xuICAgIHRoaXMucmVsYXRpdmVPZmZzZXQgKz0gNDtcbiAgICByZXR1cm4gdiAvIDY1NTM2O1xufTtcblxuUGFyc2VyLnByb3RvdHlwZS5wYXJzZVZlcnNpb24gPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbWFqb3IgPSBleHBvcnRzLmdldFVTaG9ydCh0aGlzLmRhdGEsIHRoaXMub2Zmc2V0ICsgdGhpcy5yZWxhdGl2ZU9mZnNldCk7XG4gICAgLy8gSG93IHRvIGludGVycHJldCB0aGUgbWlub3IgdmVyc2lvbiBpcyB2ZXJ5IHZhZ3VlIGluIHRoZSBzcGVjLiAweDUwMDAgaXMgNSwgMHgxMDAwIGlzIDFcbiAgICAvLyBUaGlzIHJldHVybnMgdGhlIGNvcnJlY3QgbnVtYmVyIGlmIG1pbm9yID0gMHhOMDAwIHdoZXJlIE4gaXMgMC05XG4gICAgdmFyIG1pbm9yID0gZXhwb3J0cy5nZXRVU2hvcnQodGhpcy5kYXRhLCB0aGlzLm9mZnNldCArIHRoaXMucmVsYXRpdmVPZmZzZXQgKyAyKTtcbiAgICB0aGlzLnJlbGF0aXZlT2Zmc2V0ICs9IDQ7XG4gICAgcmV0dXJuIG1ham9yICsgbWlub3IgLyAweDEwMDAgLyAxMDtcbn07XG5cblBhcnNlci5wcm90b3R5cGUuc2tpcCA9IGZ1bmN0aW9uICh0eXBlLCBhbW91bnQpIHtcbiAgICBpZiAoYW1vdW50ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgYW1vdW50ID0gMTtcbiAgICB9XG4gICAgdGhpcy5yZWxhdGl2ZU9mZnNldCArPSB0eXBlT2Zmc2V0c1t0eXBlXSAqIGFtb3VudDtcbn07XG5cbmV4cG9ydHMuUGFyc2VyID0gUGFyc2VyO1xuIiwiLy8gR2VvbWV0cmljIG9iamVjdHNcblxuJ3VzZSBzdHJpY3QnO1xuXG4vLyBBIGLDqXppZXIgcGF0aCBjb250YWluaW5nIGEgc2V0IG9mIHBhdGggY29tbWFuZHMgc2ltaWxhciB0byBhIFNWRyBwYXRoLlxuLy8gUGF0aHMgY2FuIGJlIGRyYXduIG9uIGEgY29udGV4dCB1c2luZyBgZHJhd2AuXG5mdW5jdGlvbiBQYXRoKCkge1xuICAgIHRoaXMuY29tbWFuZHMgPSBbXTtcbiAgICB0aGlzLmZpbGwgPSAnYmxhY2snO1xuICAgIHRoaXMuc3Ryb2tlID0gbnVsbDtcbiAgICB0aGlzLnN0cm9rZVdpZHRoID0gMTtcbn1cblxuUGF0aC5wcm90b3R5cGUubW92ZVRvID0gZnVuY3Rpb24gKHgsIHkpIHtcbiAgICB0aGlzLmNvbW1hbmRzLnB1c2goe3R5cGU6ICdNJywgeDogeCwgeTogeX0pO1xufTtcblxuUGF0aC5wcm90b3R5cGUubGluZVRvID0gZnVuY3Rpb24gKHgsIHkpIHtcbiAgICB0aGlzLmNvbW1hbmRzLnB1c2goe3R5cGU6ICdMJywgeDogeCwgeTogeX0pO1xufTtcblxuUGF0aC5wcm90b3R5cGUuY3VydmVUbyA9IFBhdGgucHJvdG90eXBlLmJlemllckN1cnZlVG8gPSBmdW5jdGlvbiAoeDEsIHkxLCB4MiwgeTIsIHgsIHkpIHtcbiAgICB0aGlzLmNvbW1hbmRzLnB1c2goe3R5cGU6ICdDJywgeDE6IHgxLCB5MTogeTEsIHgyOiB4MiwgeTI6IHkyLCB4OiB4LCB5OiB5fSk7XG59O1xuXG5QYXRoLnByb3RvdHlwZS5xdWFkVG8gPSBQYXRoLnByb3RvdHlwZS5xdWFkcmF0aWNDdXJ2ZVRvID0gZnVuY3Rpb24gKHgxLCB5MSwgeCwgeSkge1xuICAgIHRoaXMuY29tbWFuZHMucHVzaCh7dHlwZTogJ1EnLCB4MTogeDEsIHkxOiB5MSwgeDogeCwgeTogeX0pO1xufTtcblxuUGF0aC5wcm90b3R5cGUuY2xvc2UgPSBQYXRoLnByb3RvdHlwZS5jbG9zZVBhdGggPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5jb21tYW5kcy5wdXNoKHt0eXBlOiAnWid9KTtcbn07XG5cbi8vIEFkZCB0aGUgZ2l2ZW4gcGF0aCBvciBsaXN0IG9mIGNvbW1hbmRzIHRvIHRoZSBjb21tYW5kcyBvZiB0aGlzIHBhdGguXG5QYXRoLnByb3RvdHlwZS5leHRlbmQgPSBmdW5jdGlvbiAocGF0aE9yQ29tbWFuZHMpIHtcbiAgICBpZiAocGF0aE9yQ29tbWFuZHMuY29tbWFuZHMpIHtcbiAgICAgICAgcGF0aE9yQ29tbWFuZHMgPSBwYXRoT3JDb21tYW5kcy5jb21tYW5kcztcbiAgICB9XG4gICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkodGhpcy5jb21tYW5kcywgcGF0aE9yQ29tbWFuZHMpO1xufTtcblxuLy8gRHJhdyB0aGUgcGF0aCB0byBhIDJEIGNvbnRleHQuXG5QYXRoLnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24gKGN0eCkge1xuICAgIHZhciBpLCBjbWQ7XG4gICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgIGZvciAoaSA9IDA7IGkgPCB0aGlzLmNvbW1hbmRzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIGNtZCA9IHRoaXMuY29tbWFuZHNbaV07XG4gICAgICAgIGlmIChjbWQudHlwZSA9PT0gJ00nKSB7XG4gICAgICAgICAgICBjdHgubW92ZVRvKGNtZC54LCBjbWQueSk7XG4gICAgICAgIH0gZWxzZSBpZiAoY21kLnR5cGUgPT09ICdMJykge1xuICAgICAgICAgICAgY3R4LmxpbmVUbyhjbWQueCwgY21kLnkpO1xuICAgICAgICB9IGVsc2UgaWYgKGNtZC50eXBlID09PSAnQycpIHtcbiAgICAgICAgICAgIGN0eC5iZXppZXJDdXJ2ZVRvKGNtZC54MSwgY21kLnkxLCBjbWQueDIsIGNtZC55MiwgY21kLngsIGNtZC55KTtcbiAgICAgICAgfSBlbHNlIGlmIChjbWQudHlwZSA9PT0gJ1EnKSB7XG4gICAgICAgICAgICBjdHgucXVhZHJhdGljQ3VydmVUbyhjbWQueDEsIGNtZC55MSwgY21kLngsIGNtZC55KTtcbiAgICAgICAgfSBlbHNlIGlmIChjbWQudHlwZSA9PT0gJ1onKSB7XG4gICAgICAgICAgICBjdHguY2xvc2VQYXRoKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRoaXMuZmlsbCkge1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gdGhpcy5maWxsO1xuICAgICAgICBjdHguZmlsbCgpO1xuICAgIH1cbiAgICBpZiAodGhpcy5zdHJva2UpIHtcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gdGhpcy5zdHJva2U7XG4gICAgICAgIGN0eC5saW5lV2lkdGggPSB0aGlzLnN0cm9rZVdpZHRoO1xuICAgICAgICBjdHguc3Ryb2tlKCk7XG4gICAgfVxufTtcblxuZXhwb3J0cy5QYXRoID0gUGF0aDtcbiJdfQ==
(4)
});
