// The `CFF` table contains the glyph outlines in PostScript format.
// https://www.microsoft.com/typography/OTSPEC/cff.htm
// http://download.microsoft.com/download/8/0/1/801a191c-029d-4af3-9642-555f6fe514ee/cff.pdf
// http://download.microsoft.com/download/8/0/1/801a191c-029d-4af3-9642-555f6fe514ee/type2.pdf

'use strict';

var encode = require('../types').encode;
var encoding = require('../encoding');
var _glyph = require('../glyph');
var parse = require('../parse');
var path = require('../path');
var table = require('../table');

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
        index = encoding.cffStandardStrings[index];
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

var TOP_DICT_META = [
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
    {name: 'fontMatrix', op: 1207, type: ['real', 'real', 'real', 'real', 'real', 'real'], value: [0.001, 0, 0, 0.001, 0, 0]},
    {name: 'uniqueId', op: 13, type: 'number'},
    {name: 'fontBBox', op: 5, type: ['number', 'number', 'number', 'number'], value: [0, 0, 0, 0]},
    {name: 'strokeWidth', op: 1208, type: 'number', value: 0},
    {name: 'xuid', op: 14, type: [], value: null},
    {name: 'charset', op: 15, type: 'offset', value: 0},
    {name: 'encoding', op: 16, type: 'offset', value: 0},
    {name: 'charStrings', op: 17, type: 'offset', value: 0},
    {name: 'private', op: 18, type: ['number', 'offset'], value: [0, 0]}];

// Parse the CFF top dictionary. A CFF table can contain multiple fonts, each with their own top dictionary.
// The top dictionary contains the essential metadata for the font, together with the private dictionary.
function parseCFFTopDict(data, strings) {
    var dict;
    dict = parseCFFDict(data, 0, data.byteLength);
    return interpretDict(dict, TOP_DICT_META, strings);
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
    return new encoding.CffEncoding(encoding, charset);
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
    glyph = new _glyph.CffGlyph(font, index);
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
    font.tables.cff = {};
    header = parseCFFHeader(data, start);
    nameIndex = parseCFFIndex(data, header.endOffset, parse.bytesToString);
    topDictIndex = parseCFFIndex(data, nameIndex.endOffset);
    stringIndex = parseCFFIndex(data, topDictIndex.endOffset, parse.bytesToString);
    globalSubrIndex = parseCFFIndex(data, stringIndex.endOffset);
    font.gsubrs = globalSubrIndex.objects;
    font.gsubrsBias = calcCFFSubroutineBias(font.gsubrs);

    var topDictData = new DataView(new Uint8Array(topDictIndex.objects[0]).buffer);
    topDict = parseCFFTopDict(topDictData, stringIndex.objects);
    font.tables.cff.topDict = topDict;

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
        font.cffEncoding = new encoding.CffEncoding(encoding.cffStandardEncoding, charset);
    } else if (topDict.encoding === 1) { // Expert encoding
        font.cffEncoding = new encoding.CffEncoding(encoding.cffExpertEncoding, charset);
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

// Encode the CFF header as a list of bytes.
// This always returns the same value;
function encodeHeader() {
    return [
        1, // Major version 1
        0, // Minor version 0
        4, // This is a 4-byte header
        1  // 1-byte offsets
    ];
}

// Encode the list of font names as a list of bytes.
function encodeNameIndex(fontNames) {
    var encodedNames = fontNames.map(function (v) { return encode.NAME(v); });
    return encode.INDEX(encodedNames);
}

// Custom equals function that can also check lists.
function equals(a, b) {
    if (a === b) {
        return true;
    } else if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) {
            return false;
        }
        for (var i = 0; i < a.length; i += 1) {
            if (!equals(a[i], b[i])) {
                return false;
            }
        }
        return true;
    } else {
        return false;
    }
}

// Encode the global font attributes as a list of bytes.
function encodeTopDictIndex(m, strings) {
    var d, i, entry, value;
    d = [];
    for (i = 0; i < TOP_DICT_META.length; i += 1) {
        entry = TOP_DICT_META[i];
        value = m[entry.name];
        if (value !== undefined && !equals(value, entry.value)) {
            // Operand comes before operator.
            console.log(entry.op, encode.OPERATOR(entry.op), encode.OPERAND(value, entry.type, strings));
            d = d.concat(encode.OPERAND(value, entry.type, strings));
            d = d.concat(encode.OPERATOR(entry.op));
        }
    }
    return encode.INDEX([d]);
}

function encodeStringIndex(strings) {
    var encodedStrings = strings.map(function (v) { return encode.STRING(v); });
    return encode.INDEX(encodedStrings);
}

function encodeGlobalSubrIndex() {
    // Currently we don't use subroutines.
    return encode.INDEX([]);
}

function encodeEncodings() {
    var d = [];
    d.push(0); // Encoding format 0 (apart from .notdef).
    d.push(1); // Encode 1 glyph.
    d.push(1); // First charset element maps to first glyph.
    return d;
}

function encodeCharsets(strings) {
    var d = [];
    d.push(0); // Charset format 0
    d.push(encode.SID('A', strings));
    return d;
}

function pathToOps(path, width) {
    var ops = [], x, y, i, cmd, dx, dy;
    ops.push(width);
    x = 0;
    y = 0;
    for (i = 0; i < path.commands.length; i += 1) {
        cmd = path.commands[i];
        if (cmd.type === 'M') {
            dx = x - cmd.x;
            dy = y - cmd.y;
            ops.push(dx);
            ops.push(dy);
            ops.push('rmoveto');
            x = cmd.x;
            y = cmd.y;
        } else if (cmd.type === 'L') {
            dx = x - cmd.x;
            dy = y - cmd.y;
            ops.push(dx);
            ops.push(dy);
            ops.push('rlineto');
            x = cmd.x;
            y = cmd.y;
        }
    }
    ops.push('endchar');
    return ops;
}

var OPS = {
    'rmoveto': 21,
    'rlineto': 5,
    'endchar': 14
};

function opsToBytes(ops) {
    var d = [], i, op;
    for (i = 0; i < ops.length; i += 1) {
        op = ops[i];
        if (typeof op === 'string') {
            op = OPS[op];
        }
        d = d.concat(encode.NUMBER(op));
    }
    return d;
}

function encodeCharString(path, width) {
    var ops = pathToOps(path, width);
    console.log(ops);
    return opsToBytes(ops);
}

function encodeCharStringsIndex() {
    // Encode two glyphs: .notdef and A.
    var notdefPath = new path.Path();
    notdefPath.moveTo(0, 0);
    notdefPath.lineTo(0, 500);
    notdefPath.lineTo(300, 500);
    notdefPath.lineTo(300, 0);

    var aPath = new path.Path();
    aPath.moveTo(0, 0);
    aPath.lineTo(150, 500);
    aPath.lineTo(300, 0);
    aPath.moveTo(250, 50);
    aPath.moveTo(150, 450);
    aPath.moveTo(50, 50);

    var notdefBytes = encodeCharString(notdefPath, 400);
    var aBytes = encodeCharString(aPath, 400);
    return encode.INDEX([notdefBytes, aBytes]);
}

function encodePrivateDictIndex() {
    return encode.INDEX([]);
}

function hexDump(bytes) {
    var hexString = bytes.map(function (v) {
        var h =  v.toString(16);
        return h.length === 1 ? '0' + h : h;
    });
    return hexString.join(' ').toUpperCase();
}


function CFFTable() {
}

CFFTable.prototype = new table.Table('CFF ', [
    {name: 'header', type: 'table'},
    {name: 'nameIndex', type: 'table'},
    {name: 'topDictIndex', type: 'table'},
    {name: 'stringIndex', type: 'table'},
    {name: 'globalSubrIndex', type: 'table'},
    {name: 'encodings', type: 'table'},
    {name: 'charsets', type: 'table'},
    {name: 'charStringsIndex', type: 'table'},
    {name: 'privateDictIndex', type: 'table'}
]);

CFFTable.prototype.build = function () {
    var d, strings, attrs, header, nameIndex, topDictIndex, stringIndex,
        globalSubrIndex, encodings, charsets, charStringsIndex,
        privateDictIndex;
    attrs = {
        version: 'Version 1.0',
        fullName: 'Custom Glyph Font',
        familyName: 'Custom',
        weight: 'Roman',
        charset: 0,
        encoding: 0,
        charstrings: 0,
        private: [0, 0]
    };

    strings = [];
    d = [];
    header = encodeHeader();
    nameIndex = encodeNameIndex(['customfont']);
    globalSubrIndex = encodeGlobalSubrIndex();
    encodings = encodeEncodings();
    charsets = encodeCharsets(strings);
    charStringsIndex = encodeCharStringsIndex();
    privateDictIndex = encodePrivateDictIndex();
    topDictIndex = encodeTopDictIndex(attrs, strings);

    // Needs to come at the end, to encode all custom strings used in the font.
    stringIndex = encodeStringIndex(strings);

    var baseOffset = header.length + nameIndex.length + topDictIndex.length + stringIndex.length + globalSubrIndex.length;
    attrs.encoding = baseOffset;
    attrs.charset = attrs.encoding + encodings.length;
    attrs.charStrings = attrs.charset + charsets.length;
    // attrs.private[1] = attrs.charStrings + charStringsIndex.length;
    // Re-encode the Top DICT Index with the correct offsets.
    topDictIndex = encodeTopDictIndex(attrs, strings);

    console.log('Header            ', hexDump(header));
    console.log('Name Index        ', hexDump(nameIndex));
    console.log('Top DICT Index    ', hexDump(topDictIndex));
    console.log('String Index      ', hexDump(stringIndex));
    console.log('Global Subr Index ', hexDump(globalSubrIndex));
    console.log('Encodings         ', hexDump(encodings));
    console.log('Charsets          ', hexDump(charsets));
    console.log('CharStrings Index ', hexDump(charStringsIndex));
    console.log('Private DICT Index', hexDump(privateDictIndex));


    return Array.prototype.concat.call(header,
                                       nameIndex,
                                       topDictIndex,
                                       stringIndex);
};

exports.parse = parseCFFTable;
exports.Table = CFFTable;
