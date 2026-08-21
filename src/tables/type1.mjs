// The `Type1` font support (PostScript Type 1, PFA and PFB).
// This is a self-contained module: it detects and parses Type 1 fonts and
// returns a fully wired opentype.js `Font`, reusing the existing `Path`,
// `Glyph`, `CmapEncoding` and `GlyphNames` primitives so that a parsed
// PFA/PFB behaves exactly like a parsed TTF/OTF (glyphs, charToGlyph,
// getPath, and OTF export via `font.toArrayBuffer()` all work).
//
// The Type 1 charstring interpreter and eexec/charstring decryption are
// ported from the KeyFont project (https://github.com/KeyPDF/KeyFont),
// which is MIT licensed, and adapted to build opentype.js `Path` objects.

import Font from '../font.mjs';
import Glyph from '../glyph.mjs';
import Path from '../path.mjs';
import glyphset from '../glyphset.mjs';
import { CmapEncoding, GlyphNames, cffStandardEncoding } from '../encoding.mjs';
import { standardEncodingNames, aglNameToUnicode } from './type1-encoding.mjs';

// Type 1 charstring operators (a subset shared with the Type 2/CFF charstrings).
const CHARSTRING_OPERATOR_MAP = {
    1: 'hstem', 3: 'vstem', 4: 'vmoveto', 5: 'rlineto', 6: 'hlineto', 7: 'vlineto',
    8: 'rrcurveto', 10: 'callsubr', 11: 'return', 14: 'endchar', 18: 'hstemhm',
    19: 'hintmask', 20: 'cntrmask', 21: 'rmoveto', 22: 'hmoveto', 23: 'vstemhm',
    24: 'rcurveline', 25: 'rlinecurve', 26: 'vvcurveto', 27: 'hhcurveto',
    28: 'shortint', 29: 'callgsubr', 30: 'vhcurveto', 31: 'hvcurveto', 13: 'hsbw',
    9: 'closepath'
};

const CHARSTRING_ESCAPE_MAP = {
    0: 'dotsection', 1: 'vstem3', 2: 'hstem3', 6: 'seac', 7: 'sbw',
    12: 'div', 16: 'callothersubr', 17: 'pop', 33: 'setcurrentpoint',
    34: 'hflex', 35: 'flex', 36: 'hflex1', 37: 'flex1'
};

// ---------------------------------------------------------------------------
// Byte / string helpers
// ---------------------------------------------------------------------------

function bytesToLatin1(bytes) {
    let out = '';
    // Chunk to avoid stack overflows with String.fromCharCode.apply on big fonts.
    for (let i = 0; i < bytes.length; i += 8192) {
        out += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + 8192, bytes.length)));
    }
    return out;
}

function isAsciiHexSection(text) {
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        if (code === 9 || code === 10 || code === 13 || code === 32) continue;
        if ((code >= 48 && code <= 57) || (code >= 65 && code <= 70) || (code >= 97 && code <= 102)) continue;
        return false;
    }
    return true;
}

function hexStringToBytes(text) {
    const clean = text.replace(/[^0-9A-Fa-f]/g, '');
    const evenLength = clean.length & ~1;
    const bytes = new Uint8Array(evenLength / 2);
    for (let i = 0; i < evenLength; i += 2) {
        bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16) & 0xFF;
    }
    return bytes;
}

// ---------------------------------------------------------------------------
// eexec / charstring decryption (Type 1 spec, section 7)
// ---------------------------------------------------------------------------

function eexecDecryptBytes(data) {
    const c1 = 52845;
    const c2 = 22719;
    let r = 55665;
    const out = [];
    for (let i = 0; i < data.length; i++) {
        const cipher = data[i];
        const plain = cipher ^ (r >> 8);
        if (i >= 4) out.push(plain);
        r = ((cipher + r) * c1 + c2) & 0xFFFF;
    }
    return new Uint8Array(out);
}

function looksLikeDecryptedEexec(bytes) {
    if (!(bytes instanceof Uint8Array) || !bytes.length) return false;
    const sample = Math.min(bytes.length, 256);
    if (!sample) return false;
    const preview = bytesToLatin1(bytes.subarray(0, sample));
    return /\/Private|\/Subrs|dup\s+\d+\s+/.test(preview);
}

function decryptEexecSection(bytes) {
    if (!(bytes instanceof Uint8Array) || !bytes.length) return new Uint8Array();
    if (looksLikeDecryptedEexec(bytes)) return bytes;
    const direct = eexecDecryptBytes(bytes);
    if (looksLikeDecryptedEexec(direct)) return direct;
    const maxSkip = Math.min(32, Math.max(0, bytes.length - 4));
    for (let skip = 1; skip <= maxSkip; skip++) {
        const candidate = bytes.slice(skip);
        if (looksLikeDecryptedEexec(candidate)) return candidate;
        const decrypted = eexecDecryptBytes(candidate);
        if (looksLikeDecryptedEexec(decrypted)) return decrypted;
    }
    return direct;
}

function decryptCharStringBytes(data) {
    const c1 = 52845;
    const c2 = 22719;
    let r = 4330;
    const out = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
        const cipher = data[i];
        out[i] = cipher ^ (r >> 8);
        r = ((cipher + r) * c1 + c2) & 0xFFFF;
    }
    return out;
}

// Decode a decrypted charstring byte program into a whitespace-separated
// token string (numbers and operator names).
function decodeCharStringProgram(bytes) {
    if (!bytes || !bytes.length) return '';
    const stack = [];
    const lines = [];
    let hintCount = 0;
    let i = 0;

    function flushOperator(name) {
        const args = stack.splice(0, stack.length);
        const prefix = args.length ? args.join(' ') + ' ' : '';
        lines.push(prefix + name);
    }

    while (i < bytes.length) {
        const b = bytes[i++];
        if (b >= 32 && b <= 246) { stack.push(b - 139); continue; }
        if (b >= 247 && b <= 250) { const b2 = bytes[i++]; stack.push((b - 247) * 256 + b2 + 108); continue; }
        if (b >= 251 && b <= 254) { const b2 = bytes[i++]; stack.push(-(b - 251) * 256 - b2 - 108); continue; }
        if (b === 28) {
            if (i + 1 < bytes.length) {
                const high = bytes[i++];
                const low = bytes[i++];
                let v = (high << 8) | low;
                if (v & 0x8000) v = v - 0x10000;
                stack.push(v);
            }
            continue;
        }
        if (b === 255) {
            if (i + 3 <= bytes.length) {
                const value = (((bytes[i] << 24) >>> 0) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) >>> 0;
                i += 4;
                const signed = value >= 0x80000000 ? value - 0x100000000 : value;
                stack.push(signed);
            }
            continue;
        }
        if (b === 12) {
            const escape = bytes[i++];
            if (escape === 12) {
                if (stack.length >= 2) {
                    const denom = stack.pop();
                    const numer = stack.pop();
                    stack.push(numer / denom);
                }
                continue;
            }
            flushOperator(CHARSTRING_ESCAPE_MAP[escape] || ('esc' + escape));
            continue;
        }
        const opName = CHARSTRING_OPERATOR_MAP[b] || ('op' + b);
        if (opName === 'hstem' || opName === 'vstem' || opName === 'hstemhm' || opName === 'vstemhm') {
            hintCount += Math.floor(stack.length / 2);
        }
        if (opName === 'hintmask' || opName === 'cntrmask') {
            if (stack.length) hintCount += Math.floor(stack.length / 2);
            flushOperator(opName);
            i += Math.ceil(hintCount / 8);
            continue;
        }
        flushOperator(opName);
    }
    if (stack.length) lines.push(stack.join(' '));
    return lines.join('\n');
}

function tokenizeCharStringProgram(text) {
    if (!text) return [];
    return text.split(/\s+/).map(t => t.trim()).filter(Boolean);
}

// ---------------------------------------------------------------------------
// PFB de-segmentation and container normalization
// ---------------------------------------------------------------------------

// Locate the start of embedded PostScript (`%!`) in a wrapped container.
function findEmbeddedType1Start(bytes) {
    const limit = Math.min(bytes.length - 1, 4096);
    for (let i = 0; i < limit; i++) {
        if (bytes[i] === 0x25 && bytes[i + 1] === 0x21) return i;
    }
    return -1;
}

// Convert a segmented PFB into the equivalent raw Type 1 byte stream. Raw
// PFA/PS input is returned unchanged (after skipping any leading wrapper).
function normalizeType1Bytes(bytes) {
    if (!(bytes instanceof Uint8Array) || bytes.length < 6) return bytes;
    if (bytes[0] !== 0x80 || bytes[1] < 1 || bytes[1] > 3) {
        const embeddedStart = findEmbeddedType1Start(bytes);
        return embeddedStart > 0 ? bytes.slice(embeddedStart) : bytes;
    }
    let offset = 0;
    const chunks = [];
    let foundEnd = false;
    let parsedAny = false;
    while (offset + 6 <= bytes.length && bytes[offset] === 0x80) {
        parsedAny = true;
        const type = bytes[offset + 1];
        const length = (bytes[offset + 2] | (bytes[offset + 3] << 8) | (bytes[offset + 4] << 16) | (bytes[offset + 5] << 24)) >>> 0;
        offset += 6;
        if (!length || offset + length > bytes.length) return bytes;
        chunks.push(bytes.slice(offset, offset + length));
        offset += length;
        if (type === 3) { foundEnd = true; break; }
    }
    const trailing = bytes.length - offset;
    const hasTruncatedType3 = trailing === 2 && bytes[offset] === 0x80 && bytes[offset + 1] === 0x03;
    const acceptWithoutType3 = parsedAny && (offset === bytes.length || hasTruncatedType3);
    if (!chunks.length || (!foundEnd && !acceptWithoutType3)) return bytes;
    const total = chunks.reduce((s, c) => s + c.length, 0);
    const merged = new Uint8Array(total);
    let pos = 0;
    for (const c of chunks) { merged.set(c, pos); pos += c.length; }
    return merged;
}

// ---------------------------------------------------------------------------
// Charstring interpreter -> opentype Path
// ---------------------------------------------------------------------------

// Interpret a tokenized Type 1 charstring, drawing into an opentype `Path`.
// Returns { path, advanceWidth, leftSideBearing, seac }.
function interpretType1CharString(tokens, lookupSubr) {
    const path = new Path();
    const stack = [];
    let cx = 0;
    let cy = 0;
    let sbx = 0;
    let width = 0;
    let open = false;
    let inFlex = false;
    let flexDeltas = [];
    let seac = null;

    const moveTo = (x, y) => {
        if (open) path.close();
        cx = x; cy = y;
        path.moveTo(x, y);
        open = true;
    };
    const lineTo = (x, y) => { cx = x; cy = y; path.lineTo(x, y); };
    const curveTo = (x1, y1, x2, y2, x3, y3) => {
        path.curveTo(x1, y1, x2, y2, x3, y3);
        cx = x3; cy = y3;
    };
    const curveToRel = (dx1, dy1, dx2, dy2, dx3, dy3) => {
        const x1 = cx + dx1, y1 = cy + dy1;
        const x2 = x1 + dx2, y2 = y1 + dy2;
        const x3 = x2 + dx3, y3 = y2 + dy3;
        curveTo(x1, y1, x2, y2, x3, y3);
    };
    const popAll = () => {
        if (!stack.length) return [];
        const args = stack.slice();
        stack.length = 0;
        return args;
    };
    const consumeHCurve = (args) => {
        if (args.length < 4) return [];
        let remaining = args.slice(4);
        let dxc = 0;
        if (remaining.length === 1) { dxc = remaining[0]; remaining = []; }
        curveToRel(args[0], 0, args[1], args[2], dxc, args[3]);
        return remaining;
    };
    const consumeVCurve = (args) => {
        if (args.length < 4) return [];
        let remaining = args.slice(4);
        let dyc = 0;
        if (remaining.length === 1) { dyc = remaining[0]; remaining = []; }
        curveToRel(0, args[0], args[1], args[2], args[3], dyc);
        return remaining;
    };

    const execute = (tokenList, depth) => {
        if (depth > 64) return;
        let idx = 0;
        while (idx < tokenList.length) {
            const tok = tokenList[idx++];
            if (!tok) continue;
            const maybeNumber = parseFloat(tok);
            if (!Number.isNaN(maybeNumber) && /^[-+]?[0-9.]/.test(tok)) {
                stack.push(maybeNumber);
                continue;
            }
            switch (tok) {
                case 'return':
                    return;
                case 'hsbw':
                    width = stack.pop() || 0;
                    sbx = stack.pop() || 0;
                    cx = sbx; cy = 0;
                    stack.length = 0;
                    break;
                case 'sbw':
                    if (stack.length >= 4) {
                        stack.pop();               // wy (vertical advance, unused)
                        width = stack.pop() || 0;  // wx
                        cy = stack.pop() || 0;     // sby
                        sbx = stack.pop() || 0;    // sbx
                    } else if (stack.length >= 2) {
                        width = stack.pop() || 0;
                        sbx = stack.pop() || 0;
                        cy = 0;
                    }
                    cx = sbx;
                    stack.length = 0;
                    break;
                case 'seac': {
                    // Standard Encoding Accented Character: asb adx ady bchar achar
                    const args = popAll();
                    if (args.length >= 5) {
                        seac = { asb: args[0], adx: args[1], ady: args[2], bchar: args[3], achar: args[4] };
                    }
                    break;
                }
                case 'hstem':
                case 'hstem3':
                case 'vstem':
                case 'vstem3':
                case 'dotsection':
                    stack.length = 0;
                    break;
                case 'vmoveto': {
                    let dy;
                    if (!width && stack.length === 2) { width = stack.shift() || 0; dy = stack.pop() || 0; }
                    else dy = stack.pop() || 0;
                    if (inFlex) flexDeltas.push({ dx: 0, dy });
                    else { cy += dy; moveTo(cx, cy); }
                    stack.length = 0;
                    break;
                }
                case 'hmoveto': {
                    let dx;
                    if (!width && stack.length === 2) { width = stack.shift() || 0; dx = stack.pop() || 0; }
                    else dx = stack.pop() || 0;
                    if (inFlex) flexDeltas.push({ dx, dy: 0 });
                    else { cx += dx; moveTo(cx, cy); }
                    stack.length = 0;
                    break;
                }
                case 'rmoveto': {
                    let args = popAll();
                    if (!args.length) break;
                    if (!width && args.length === 3) width = args.shift() || 0;
                    if (inFlex) {
                        for (let i = 0; i + 1 < args.length; i += 2) flexDeltas.push({ dx: args[i], dy: args[i + 1] || 0 });
                    } else {
                        cx += args[0]; cy += args[1] || 0;
                        moveTo(cx, cy);
                    }
                    break;
                }
                case 'hlineto': {
                    let horizontal = true;
                    for (const value of popAll()) {
                        if (horizontal) cx += value; else cy += value;
                        lineTo(cx, cy);
                        horizontal = !horizontal;
                    }
                    break;
                }
                case 'vlineto': {
                    let horizontal = false;
                    for (const value of popAll()) {
                        if (horizontal) cx += value; else cy += value;
                        lineTo(cx, cy);
                        horizontal = !horizontal;
                    }
                    break;
                }
                case 'rlineto': {
                    const args = popAll();
                    for (let i = 0; i + 1 < args.length; i += 2) {
                        cx += args[i]; cy += args[i + 1] || 0;
                        lineTo(cx, cy);
                    }
                    break;
                }
                case 'rrcurveto': {
                    const args = popAll();
                    for (let i = 0; i + 5 < args.length; i += 6) {
                        curveToRel(args[i], args[i + 1], args[i + 2], args[i + 3], args[i + 4], args[i + 5]);
                    }
                    break;
                }
                case 'vhcurveto': {
                    let remaining = popAll();
                    while (remaining.length) {
                        remaining = consumeVCurve(remaining);
                        if (!remaining.length) break;
                        remaining = consumeHCurve(remaining);
                    }
                    break;
                }
                case 'hvcurveto': {
                    let remaining = popAll();
                    while (remaining.length) {
                        remaining = consumeHCurve(remaining);
                        if (!remaining.length) break;
                        remaining = consumeVCurve(remaining);
                    }
                    break;
                }
                case 'callsubr': {
                    const subr = Math.trunc(stack.pop() || 0);
                    // Flex and hint-replacement are driven by the four standard
                    // OtherSubrs, invoked here through the conventional subrs 0-3.
                    if (subr === 1) { inFlex = true; flexDeltas = []; stack.length = 0; }
                    else if (subr === 2 && inFlex) { stack.length = 0; }
                    else if (subr === 0 && inFlex) {
                        const absY = stack.pop();
                        const absX = stack.pop();
                        stack.pop();
                        if (flexDeltas.length === 7) {
                            const d = flexDeltas;
                            const ocx = cx, ocy = cy;
                            const c1x = ocx + d[0].dx + d[1].dx, c1y = ocy + d[0].dy + d[1].dy;
                            const c2x = c1x + d[2].dx, c2y = c1y + d[2].dy;
                            const p3x = c2x + d[3].dx, p3y = c2y + d[3].dy;
                            curveTo(c1x, c1y, c2x, c2y, p3x, p3y);
                            const c3x = p3x + d[4].dx, c3y = p3y + d[4].dy;
                            const c4x = c3x + d[5].dx, c4y = c3y + d[5].dy;
                            const p6x = c4x + d[6].dx, p6y = c4y + d[6].dy;
                            curveTo(c3x, c3y, c4x, c4y, p6x, p6y);
                            if (absX !== undefined && absY !== undefined) { cx = absX; cy = absY; }
                        }
                        inFlex = false;
                        flexDeltas = [];
                        stack.length = 0;
                    } else {
                        const subrTokens = lookupSubr ? lookupSubr(subr) : null;
                        if (subrTokens) execute(subrTokens, depth + 1);
                        else stack.length = 0;
                    }
                    break;
                }
                case 'callothersubr':
                    // The flex/hint OtherSubrs are emulated via callsubr above;
                    // remaining OtherSubr calls leave their arguments for `pop`.
                    break;
                case 'pop':
                    if (stack.length) stack.pop();
                    break;
                case 'setcurrentpoint':
                    stack.length = 0;
                    break;
                case 'closepath':
                    if (open) { path.close(); open = false; }
                    stack.length = 0;
                    break;
                case 'endchar':
                    return;
                default:
                    stack.length = 0;
                    break;
            }
        }
    };

    execute(tokens || [], 0);
    if (open) path.close();
    return { path, advanceWidth: width, leftSideBearing: sbx, seac };
}

// ---------------------------------------------------------------------------
// Type1Font: parse the PostScript source into subrs, charstrings and metadata
// ---------------------------------------------------------------------------

class Type1Font {
    constructor(bytes) {
        this.bytes = normalizeType1Bytes(bytes instanceof Uint8Array ? bytes : new Uint8Array());
        this.fontMatrix = [0.001, 0, 0, 0.001, 0, 0];
        this.fontBBox = [-50, -200, 1000, 900];
        this.encoding = standardEncodingNames.slice();
        this.lenIV = 4;
        this.unitsPerEm = 1000;
        this.fontInfo = {};
        this.subrs = new Map();
        this.charStrings = new Map();
        this.charStringOrder = [];
        this.subrTokenCache = new Map();
        this.glyphCache = new Map();
    }

    parse() {
        const text = bytesToLatin1(this.bytes);
        const marker = 'currentfile eexec';
        const start = text.indexOf(marker);
        if (start === -1) throw new Error('Type 1 font is missing its eexec section');
        const header = text.slice(0, start);
        this.parseFontMatrix(header);
        this.parseFontBBox(header);
        this.parseFontInfo(header);
        this.parseEncodingBlock(header);

        let dataStart = start + marker.length;
        while (dataStart < text.length) {
            const code = text.charCodeAt(dataStart);
            if (code === 9 || code === 10 || code === 13 || code === 32) dataStart++;
            else break;
        }
        const clearIdx = text.indexOf('cleartomark', dataStart);
        const end = clearIdx !== -1 ? clearIdx : text.length;
        const encrypted = this.extractEexecBytes(dataStart, end, text);
        this.parseDecrypted(decryptEexecSection(encrypted));
        return this;
    }

    parseFontMatrix(header) {
        const m = header.match(/\/FontMatrix\s*\[([^\]]+)\]/);
        if (m) {
            const parts = m[1].trim().split(/\s+/).map(Number).filter(Number.isFinite);
            if (parts.length >= 6) this.fontMatrix = parts.slice(0, 6);
        }
        const scale = this.fontMatrix[0];
        this.unitsPerEm = (scale && Math.abs(scale) > 1e-6) ? Math.round(Math.abs(1 / scale)) : 1000;
    }

    parseFontBBox(header) {
        const m = header.match(/\/FontBBox\s*[[{]([^\]}]+)[\]}]/);
        if (m) {
            const parts = m[1].trim().split(/\s+/).map(Number).filter(Number.isFinite);
            if (parts.length >= 4) this.fontBBox = parts.slice(0, 4);
        }
    }

    parseFontInfo(header) {
        const readString = (key) => {
            const m = header.match(new RegExp('\\/' + key + '\\s*\\(([^)]*)\\)'));
            return m ? m[1] : undefined;
        };
        const readName = (key) => {
            const m = header.match(new RegExp('\\/' + key + '\\s*\\/([^\\s]+)'));
            return m ? m[1] : undefined;
        };
        const readNumber = (key) => {
            const m = header.match(new RegExp('\\/' + key + '\\s+(-?[0-9.]+)'));
            return m ? parseFloat(m[1]) : undefined;
        };
        this.fontInfo = {
            fontName: readName('FontName') || readString('FontName'),
            fullName: readString('FullName'),
            familyName: readString('FamilyName'),
            weight: readString('Weight'),
            notice: readString('Notice'),
            version: readString('version'),
            italicAngle: readNumber('ItalicAngle'),
            isFixedPitch: /\/isFixedPitch\s+true/.test(header),
            underlinePosition: readNumber('UnderlinePosition'),
            underlineThickness: readNumber('UnderlineThickness')
        };
    }

    parseEncodingBlock(header) {
        const names = standardEncodingNames.slice();
        if (!/\/Encoding\s+StandardEncoding\b/i.test(header)) {
            const pattern = /dup\s+(\d+)\s*\/([^\s]+)\s+put/g;
            let match;
            while ((match = pattern.exec(header)) !== null) {
                const index = parseInt(match[1], 10);
                if (index >= 0 && index <= 255) names[index] = match[2];
            }
        }
        this.encoding = names;
    }

    extractEexecBytes(start, end, text) {
        const slice = text.slice(start, end);
        if (isAsciiHexSection(slice)) return hexStringToBytes(slice);
        const length = Math.max(0, end - start);
        const out = new Uint8Array(length);
        for (let i = 0; i < length; i++) out[i] = this.bytes[start + i] & 0xFF;
        return out;
    }

    parseDecrypted(bytes) {
        const text = bytesToLatin1(bytes);
        const lenIVMatch = text.match(/\/lenIV\s+(-?\d+)/);
        if (lenIVMatch) {
            const val = parseInt(lenIVMatch[1], 10);
            if (Number.isFinite(val)) this.lenIV = val;
        }
        this.extractSubrs(bytes);
        this.extractCharStrings(bytes);
        if (!this.charStrings.has('.notdef')) {
            this.charStrings.set('.notdef', new Uint8Array());
            this.charStringOrder.unshift('.notdef');
        }
    }

    _isWhitespaceByte(b) {
        return b === 0x00 || b === 0x09 || b === 0x0A || b === 0x0D || b === 0x20;
    }

    _skipWhitespace(bytes, pos) {
        let i = pos;
        while (i < bytes.length && this._isWhitespaceByte(bytes[i])) i++;
        return i;
    }

    _readAsciiToken(bytes, pos) {
        let i = this._skipWhitespace(bytes, pos);
        if (i >= bytes.length) return null;
        const start = i;
        while (i < bytes.length && !this._isWhitespaceByte(bytes[i])) i++;
        return { token: bytesToLatin1(bytes.subarray(start, i)), next: i };
    }

    _findAscii(bytes, needle, start) {
        const n = new Uint8Array(needle.length);
        for (let i = 0; i < needle.length; i++) n[i] = needle.charCodeAt(i) & 0xFF;
        outer: for (let i = Math.max(0, start || 0); i <= bytes.length - n.length; i++) {
            for (let j = 0; j < n.length; j++) if (bytes[i + j] !== n[j]) continue outer;
            return i;
        }
        return -1;
    }

    _decodeChunk(chunk) {
        const decrypted = this.lenIV >= 0 ? decryptCharStringBytes(chunk) : chunk;
        return this.lenIV > 0 ? decrypted.slice(Math.min(this.lenIV, decrypted.length)) : decrypted;
    }

    // Read the binary chunk following an `RD`/`-|` operator: `<len> RD <bytes>`.
    _readBinaryEntry(bytes, pos) {
        const lenTok = this._readAsciiToken(bytes, pos);
        if (!lenTok) return null;
        const opTok = this._readAsciiToken(bytes, lenTok.next);
        if (!opTok) return null;
        const length = parseInt(lenTok.token, 10);
        if (!Number.isFinite(length) || length < 0) return { skipTo: opTok.next };
        if (opTok.token !== 'RD' && opTok.token !== '-|') return { skipTo: opTok.next };
        let dataStart = opTok.next;
        if (dataStart < bytes.length && this._isWhitespaceByte(bytes[dataStart])) dataStart++;
        const dataEnd = dataStart + length;
        if (dataEnd > bytes.length) return null;
        return { chunk: bytes.slice(dataStart, dataEnd), next: dataEnd };
    }

    extractSubrs(bytes) {
        const subrsStart = this._findAscii(bytes, '/Subrs');
        if (subrsStart < 0) return;
        let pos = subrsStart + '/Subrs'.length;
        while (pos < bytes.length) {
            const tok = this._readAsciiToken(bytes, pos);
            if (!tok) break;
            pos = tok.next;
            if (tok.token === '/CharStrings') break;
            if (tok.token !== 'dup') continue;
            const idxTok = this._readAsciiToken(bytes, pos);
            if (!idxTok) break;
            const index = parseInt(idxTok.token, 10);
            const entry = this._readBinaryEntry(bytes, idxTok.next);
            if (!entry) break;
            if (entry.skipTo !== undefined) { pos = entry.skipTo; continue; }
            if (Number.isFinite(index)) this.subrs.set(index, this._decodeChunk(entry.chunk));
            pos = entry.next;
        }
    }

    extractCharStrings(bytes) {
        const csStart = this._findAscii(bytes, '/CharStrings');
        if (csStart < 0) return;
        let pos = csStart + '/CharStrings'.length;
        while (pos < bytes.length) {
            const tok = this._readAsciiToken(bytes, pos);
            if (!tok) break;
            pos = tok.next;
            if (tok.token === 'end') break;
            let glyphToken = tok.token;
            if (glyphToken === 'dup') {
                const nameTok = this._readAsciiToken(bytes, pos);
                if (!nameTok) break;
                glyphToken = nameTok.token;
                pos = nameTok.next;
            }
            if (!glyphToken || glyphToken[0] !== '/') continue;
            const entry = this._readBinaryEntry(bytes, pos);
            if (!entry) break;
            if (entry.skipTo !== undefined) { pos = entry.skipTo; continue; }
            const name = glyphToken.slice(1);
            if (!this.charStrings.has(name)) this.charStringOrder.push(name);
            this.charStrings.set(name, this._decodeChunk(entry.chunk));
            pos = entry.next;
        }
    }

    getSubrTokens(index) {
        if (this.subrTokenCache.has(index)) return this.subrTokenCache.get(index);
        const bytes = this.subrs.get(index);
        const tokens = bytes && bytes.length ? tokenizeCharStringProgram(decodeCharStringProgram(bytes)) : null;
        this.subrTokenCache.set(index, tokens);
        return tokens;
    }

    // Render a glyph by name into an opentype Path (with seac composition).
    renderGlyph(name, depth) {
        if (this.glyphCache.has(name)) return this.glyphCache.get(name);
        const bytes = this.charStrings.get(name);
        let result;
        if (!bytes || !bytes.length) {
            result = { path: new Path(), advanceWidth: 0, leftSideBearing: 0 };
        } else {
            const tokens = tokenizeCharStringProgram(decodeCharStringProgram(bytes));
            result = interpretType1CharString(tokens, idx => this.getSubrTokens(idx));
            if (result.seac && (depth || 0) < 4) {
                result.path = this.composeSeac(result, depth || 0);
            }
        }
        const rendered = { path: result.path, advanceWidth: result.advanceWidth, leftSideBearing: result.leftSideBearing };
        this.glyphCache.set(name, rendered);
        return rendered;
    }

    // Compose an accented glyph from its base and accent per the seac operator.
    composeSeac(result, depth) {
        const s = result.seac;
        const baseName = cffStandardEncoding[s.bchar];
        const accentName = cffStandardEncoding[s.achar];
        const path = new Path();
        if (baseName && this.charStrings.has(baseName)) {
            const base = this.renderGlyph(baseName, depth + 1);
            path.extend(base.path.commands);
        }
        if (accentName && this.charStrings.has(accentName)) {
            const accent = this.renderGlyph(accentName, depth + 1);
            // Offset per the spec: adx - asb + base sidebearing, ady.
            const dx = s.adx - s.asb + result.leftSideBearing;
            const dy = s.ady;
            for (const cmd of accent.path.commands) {
                const c = Object.assign({}, cmd);
                if (c.x !== undefined) { c.x += dx; c.y += dy; }
                if (c.x1 !== undefined) { c.x1 += dx; c.y1 += dy; }
                if (c.x2 !== undefined) { c.x2 += dx; c.y2 += dy; }
                path.commands.push(c);
            }
        }
        return path;
    }
}

// ---------------------------------------------------------------------------
// Glyph loader and Font assembly
// ---------------------------------------------------------------------------

// A lazy glyph loader analogous to `glyphset.cffGlyphLoader`.
function type1GlyphLoader(font, index, t1, glyphName, unicode) {
    return function() {
        const glyph = new Glyph({ index: index, font: font, name: glyphName });
        if (unicode !== undefined) glyph.addUnicode(unicode);
        const rendered = t1.renderGlyph(glyphName, 0);
        glyph.advanceWidth = rendered.advanceWidth;
        glyph.leftSideBearing = rendered.leftSideBearing;
        rendered.path.unitsPerEm = font.unitsPerEm;
        glyph.path = rendered.path;
        return glyph;
    };
}

function makeFont(t1) {
    const unitsPerEm = t1.unitsPerEm;
    const bbox = t1.fontBBox;
    const ascender = bbox[3] || Math.round(unitsPerEm * 0.8);
    let descender = bbox[1] || -Math.round(unitsPerEm * 0.2);
    if (descender > 0) descender = -descender;

    const familyName = t1.fontInfo.familyName || t1.fontInfo.fullName || t1.fontInfo.fontName || 'Untitled';
    const weight = (t1.fontInfo.weight || '').toLowerCase();
    const styleName = t1.fontInfo.weight || 'Regular';

    const font = new Font({
        familyName: familyName,
        styleName: styleName,
        fullName: t1.fontInfo.fullName || (familyName + ' ' + styleName),
        postScriptName: (t1.fontInfo.fontName || (familyName + styleName)).replace(/\s/g, ''),
        version: t1.fontInfo.version ? ('Version ' + t1.fontInfo.version) : undefined,
        copyright: t1.fontInfo.notice || undefined,
        unitsPerEm: unitsPerEm,
        ascender: ascender,
        descender: descender,
        italicAngle: t1.fontInfo.italicAngle || 0,
        weightClass: weight.indexOf('bold') !== -1 ? 700 : 400,
        glyphNames: []
    });
    font.outlinesFormat = 'type1';
    font.kerningPairs = {};

    // Glyph order: .notdef first, then charstrings in file order.
    const order = t1.charStringOrder.slice();
    const notdefIdx = order.indexOf('.notdef');
    if (notdefIdx > 0) { order.splice(notdefIdx, 1); order.unshift('.notdef'); }
    else if (notdefIdx === -1) order.unshift('.notdef');

    const charset = order.slice();

    // Resolve glyph name -> Unicode via the Adobe Glyph List conventions and
    // build a Unicode cmap map (code point -> glyph index).
    const glyphIndexMap = {};
    const unicodeByIndex = {};
    for (let i = 0; i < order.length; i++) {
        const unicode = aglNameToUnicode(order[i]);
        if (unicode !== undefined) {
            unicodeByIndex[i] = unicode;
            if (glyphIndexMap[unicode] === undefined) glyphIndexMap[unicode] = i;
        }
    }

    font.nGlyphs = font.numGlyphs = order.length;
    font.glyphNames = new GlyphNames({ version: 2, numberOfGlyphs: order.length, glyphNameIndex: [], names: charset });
    font.glyphNames.names = charset;

    const glyphs = new glyphset.GlyphSet(font);
    for (let i = 0; i < order.length; i++) {
        glyphs.push(i, type1GlyphLoader(font, i, t1, order[i], unicodeByIndex[i]));
    }
    font.glyphs = glyphs;

    // Build a real Unicode cmap so that charToGlyph/getPath work natively and
    // OTF export produces a correct cmap subtable.
    const cmap = { version: 0, glyphIndexMap: glyphIndexMap };
    font.tables.cmap = cmap;
    font.encoding = new CmapEncoding(cmap);

    return font;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// Detect a Type 1 font from its first bytes. Returns 'pfb', 'pfa' or false.
function getType1Format(data) {
    let b0, b1, b2;
    if (data instanceof DataView) {
        if (data.byteLength < 2) return false;
        b0 = data.getUint8(0); b1 = data.getUint8(1);
        b2 = data.byteLength > 2 ? data.getUint8(2) : 0;
    } else {
        if (!data || data.length < 2) return false;
        b0 = data[0]; b1 = data[1]; b2 = data.length > 2 ? data[2] : 0;
    }
    // PFB: 0x80 marker followed by a segment type of 1, 2 or 3.
    if (b0 === 0x80 && b1 >= 1 && b1 <= 3) return 'pfb';
    // PFA / raw PostScript Type 1: begins with `%!`.
    if (b0 === 0x25 && b1 === 0x21) return 'pfa';
    // Some PFA files carry a UTF-8 BOM before `%!`.
    if (b0 === 0xEF && b1 === 0xBB && b2 === 0xBF) return 'pfa';
    return false;
}

// Parse a PFA/PFB buffer into a fully wired opentype Font.
function parse(buffer) {
    let bytes;
    if (buffer instanceof Uint8Array) bytes = buffer;
    else if (buffer instanceof ArrayBuffer) bytes = new Uint8Array(buffer);
    else if (buffer && buffer.buffer instanceof ArrayBuffer) bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    else bytes = new Uint8Array(buffer);

    const t1 = new Type1Font(bytes).parse();
    return makeFont(t1);
}

export default { parse, getType1Format };
export { Type1Font, interpretType1CharString, getType1Format };
