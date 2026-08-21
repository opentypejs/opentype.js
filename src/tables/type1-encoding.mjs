// Encoding helpers for Type 1 fonts.
//
// `standardEncodingNames` is the Adobe StandardEncoding vector (code -> glyph
// name), reused from the CFF standard encoding already shipped by opentype.js.
//
// `aglNameToUnicode` is a compact Adobe Glyph List resolver: it maps a glyph
// name to a Unicode code point using (1) the algorithmic `uniXXXX`/`uXXXXXX`
// conventions, (2) a curated table of the names used by real-world Type 1
// fonts (StandardEncoding, ISO Latin-1, WinAnsi and common typographic
// glyphs), and (3) name-suffix stripping (e.g. `a.sc` -> `a`). Names it cannot
// resolve simply have no Unicode mapping; they remain reachable by name via
// `font.nameToGlyphIndex()`.

import { cffStandardEncoding } from '../encoding.mjs';

const standardEncodingNames = cffStandardEncoding;

// Curated glyph-name -> Unicode code point table. Kept intentionally focused on
// the glyphs that appear in Type 1 fonts rather than the full ~4300-entry AGL.
const AGL = {
    space: 0x20, exclam: 0x21, quotedbl: 0x22, numbersign: 0x23, dollar: 0x24,
    percent: 0x25, ampersand: 0x26, quotesingle: 0x27, quoteright: 0x2019,
    parenleft: 0x28, parenright: 0x29, asterisk: 0x2a, plus: 0x2b, comma: 0x2c,
    hyphen: 0x2d, period: 0x2e, slash: 0x2f,
    zero: 0x30, one: 0x31, two: 0x32, three: 0x33, four: 0x34, five: 0x35,
    six: 0x36, seven: 0x37, eight: 0x38, nine: 0x39,
    colon: 0x3a, semicolon: 0x3b, less: 0x3c, equal: 0x3d, greater: 0x3e,
    question: 0x3f, at: 0x40,
    bracketleft: 0x5b, backslash: 0x5c, bracketright: 0x5d, asciicircum: 0x5e,
    underscore: 0x5f, quoteleft: 0x2018, grave: 0x60,
    braceleft: 0x7b, bar: 0x7c, braceright: 0x7d, asciitilde: 0x7e,
    // Latin-1 punctuation and symbols
    exclamdown: 0xa1, cent: 0xa2, sterling: 0xa3, currency: 0xa4, yen: 0xa5,
    brokenbar: 0xa6, section: 0xa7, dieresis: 0xa8, copyright: 0xa9,
    ordfeminine: 0xaa, guillemotleft: 0xab, logicalnot: 0xac, registered: 0xae,
    macron: 0xaf, degree: 0xb0, plusminus: 0xb1, acute: 0xb4, mu: 0xb5,
    paragraph: 0xb6, periodcentered: 0xb7, cedilla: 0xb8, ordmasculine: 0xba,
    guillemotright: 0xbb, onequarter: 0xbc, onehalf: 0xbd, threequarters: 0xbe,
    questiondown: 0xbf, multiply: 0xd7, divide: 0xf7,
    twosuperior: 0xb2, threesuperior: 0xb3, onesuperior: 0xb9,
    // Typographic
    quotesinglbase: 0x201a, florin: 0x192, quotedblbase: 0x201e,
    ellipsis: 0x2026, dagger: 0x2020, daggerdbl: 0x2021, circumflex: 0x2c6,
    perthousand: 0x2030, Scaron: 0x160, guilsinglleft: 0x2039, OE: 0x152,
    quotedblleft: 0x201c, quotedblright: 0x201d, bullet: 0x2022, endash: 0x2013,
    emdash: 0x2014, tilde: 0x2dc, trademark: 0x2122, scaron: 0x161,
    guilsinglright: 0x203a, oe: 0x153, Ydieresis: 0x178, fraction: 0x2044,
    fi: 0xfb01, fl: 0xfb02, ff: 0xfb00, ffi: 0xfb03, ffl: 0xfb04,
    minus: 0x2212, dotlessi: 0x131, dotlessj: 0x237,
    breve: 0x2d8, dotaccent: 0x2d9, ring: 0x2da, ogonek: 0x2db,
    hungarumlaut: 0x2dd, caron: 0x2c7,
    Euro: 0x20ac, euro: 0x20ac,
    // Uppercase accented Latin
    Agrave: 0xc0, Aacute: 0xc1, Acircumflex: 0xc2, Atilde: 0xc3, Adieresis: 0xc4,
    Aring: 0xc5, AE: 0xc6, Ccedilla: 0xc7, Egrave: 0xc8, Eacute: 0xc9,
    Ecircumflex: 0xca, Edieresis: 0xcb, Igrave: 0xcc, Iacute: 0xcd,
    Icircumflex: 0xce, Idieresis: 0xcf, Eth: 0xd0, Ntilde: 0xd1, Ograve: 0xd2,
    Oacute: 0xd3, Ocircumflex: 0xd4, Otilde: 0xd5, Odieresis: 0xd6, Oslash: 0xd8,
    Ugrave: 0xd9, Uacute: 0xda, Ucircumflex: 0xdb, Udieresis: 0xdc, Yacute: 0xdd,
    Thorn: 0xde, germandbls: 0xdf,
    // Lowercase accented Latin
    agrave: 0xe0, aacute: 0xe1, acircumflex: 0xe2, atilde: 0xe3, adieresis: 0xe4,
    aring: 0xe5, ae: 0xe6, ccedilla: 0xe7, egrave: 0xe8, eacute: 0xe9,
    ecircumflex: 0xea, edieresis: 0xeb, igrave: 0xec, iacute: 0xed,
    icircumflex: 0xee, idieresis: 0xef, eth: 0xf0, ntilde: 0xf1, ograve: 0xf2,
    oacute: 0xf3, ocircumflex: 0xf4, otilde: 0xf5, odieresis: 0xf6, oslash: 0xf8,
    ugrave: 0xf9, uacute: 0xfa, ucircumflex: 0xfb, udieresis: 0xfc, yacute: 0xfd,
    thorn: 0xfe, ydieresis: 0xff,
    // Latin Extended-A commonly present
    Lslash: 0x141, lslash: 0x142, Scommaaccent: 0x218, scommaaccent: 0x219,
    Zacute: 0x179, zacute: 0x17a, Zdotaccent: 0x17b, zdotaccent: 0x17c,
    Zcaron: 0x17d, zcaron: 0x17e, Cacute: 0x106, cacute: 0x107,
    Ccaron: 0x10c, ccaron: 0x10d, Dcaron: 0x10e, dcaron: 0x10f,
    Ecaron: 0x11a, ecaron: 0x11b, Nacute: 0x143, nacute: 0x144,
    Ncaron: 0x147, ncaron: 0x148, Rcaron: 0x158, rcaron: 0x159,
    Sacute: 0x15a, sacute: 0x15b, Tcaron: 0x164, tcaron: 0x165,
    Uring: 0x16e, uring: 0x16f, Gbreve: 0x11e, gbreve: 0x11f,
    Idotaccent: 0x130, Scedilla: 0x15e, scedilla: 0x15f,
    Amacron: 0x100, amacron: 0x101, Emacron: 0x112, emacron: 0x113,
    Imacron: 0x12a, imacron: 0x12b, Omacron: 0x14c, omacron: 0x14d,
    Umacron: 0x16a, umacron: 0x16b, Aogonek: 0x104, aogonek: 0x105,
    Eogonek: 0x118, eogonek: 0x119, Lacute: 0x139, lacute: 0x13a,
    Dcroat: 0x110, dcroat: 0x111
};

// Resolve a single glyph name (no suffix handling) to a code point.
function resolveBase(name) {
    if (Object.prototype.hasOwnProperty.call(AGL, name)) return AGL[name];
    // uniXXXX (one BMP code point). Multiple code points are ligatures we skip.
    const uni = /^uni([0-9A-Fa-f]{4})$/.exec(name);
    if (uni) return parseInt(uni[1], 16);
    // uXXXX..uXXXXXX (4-6 hex digits).
    const u = /^u([0-9A-Fa-f]{4,6})$/.exec(name);
    if (u) {
        const cp = parseInt(u[1], 16);
        if (cp <= 0x10ffff) return cp;
    }
    // Single-character ASCII names sometimes appear literally.
    if (name.length === 1) {
        const cp = name.charCodeAt(0);
        if (cp >= 0x21 && cp <= 0x7e) return cp;
    }
    return undefined;
}

// Map a glyph name to a Unicode code point, or undefined if unknown.
function aglNameToUnicode(name) {
    if (!name || name === '.notdef') return undefined;
    let base = resolveBase(name);
    if (base !== undefined) return base;
    // Strip an AGL name suffix such as `.sc`, `.oldstyle`, `.alt`.
    const dot = name.indexOf('.');
    if (dot > 0) {
        base = resolveBase(name.slice(0, dot));
        if (base !== undefined) return base;
    }
    return undefined;
}

export { standardEncodingNames, aglNameToUnicode };
