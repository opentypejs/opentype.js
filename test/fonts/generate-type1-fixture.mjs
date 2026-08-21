// Generates the deterministic Type 1 test fixtures `TestType1.pfa` and
// `TestType1.pfb` used by test/type1.mjs. The font is authored from scratch
// (no third-party outlines) so it is safe to redistribute under this repo's
// MIT license. Glyphs have intentionally simple, known geometry:
//   .notdef  - 200x700 box outline
//   space    - blank, width 500
//   A        - closed rectangle (M,L,L,L,Z)  advanceWidth 700
//   B        - two curves + close                 advanceWidth 650
//
// Run: node test/fonts/generate-type1-fixture.mjs

import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Type 1 charstring number/operator encoder --------------------------------
const OPS = {
    hsbw: 13, rlineto: 5, rrcurveto: 8, hmoveto: 22, vmoveto: 4, rmoveto: 21,
    hlineto: 6, vlineto: 7, closepath: 9, endchar: 14, callsubr: 10, return: 11
};

function encodeNumber(v) {
    v = Math.round(v);
    if (v >= -107 && v <= 107) return [v + 139];
    if (v >= 108 && v <= 1131) { v -= 108; return [(v >> 8) + 247, v & 0xff]; }
    if (v >= -1131 && v <= -108) { v = -v - 108; return [(v >> 8) + 251, v & 0xff]; }
    return [255, (v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff];
}

// Build a charstring from tokens (numbers or operator names).
function charstring(tokens) {
    const out = [];
    for (const t of tokens) {
        if (typeof t === 'number') out.push(...encodeNumber(t));
        else out.push(OPS[t]);
    }
    return Uint8Array.from(out);
}

// --- Encryption ---------------------------------------------------------------
function encrypt(plain, r, discard) {
    const c1 = 52845, c2 = 22719;
    const out = new Uint8Array(plain.length + discard);
    // discard bytes: arbitrary non-whitespace salt
    const buf = new Uint8Array(out.length);
    for (let i = 0; i < discard; i++) buf[i] = 0x41 + (i % 20);
    for (let i = 0; i < plain.length; i++) buf[discard + i] = plain[i];
    for (let i = 0; i < buf.length; i++) {
        const p = buf[i];
        const cipher = p ^ (r >> 8);
        out[i] = cipher & 0xff;
        r = ((out[i] + r) * c1 + c2) & 0xffff;
    }
    return out;
}

const lenIV = 4;
function encChar(cs) { return encrypt(cs, 4330, lenIV); }

// --- Glyph programs -----------------------------------------------------------
const glyphs = {
    '.notdef': charstring([0, 300, 'hsbw', 50, 0, 'rmoveto', 200, 0, 'rlineto', 0, 700, 'rlineto', -200, 0, 'rlineto', 'closepath', 'endchar']),
    'space': charstring([0, 500, 'hsbw', 'endchar']),
    // A: rectangle 100..600 x, 0..700 y
    'A': charstring([0, 700, 'hsbw', 100, 0, 'rmoveto', 500, 0, 'rlineto', 0, 700, 'rlineto', -500, 0, 'rlineto', 'closepath', 'endchar']),
    // B: a shape using two rrcurveto segments then close
    'B': charstring([0, 650, 'hsbw', 100, 0, 'rmoveto', 200, 0, 200, 200, 0, 200, 'rrcurveto', -200, 200, -200, 0, -200, -200, 'rrcurveto', 'closepath', 'endchar'])
};

const glyphOrder = ['.notdef', 'space', 'A', 'B'];

// --- Assemble the private (eexec) section ------------------------------------
function latin1Bytes(str) {
    const b = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) b[i] = str.charCodeAt(i) & 0xff;
    return b;
}

function concat(arrays) {
    const total = arrays.reduce((s, a) => s + a.length, 0);
    const out = new Uint8Array(total);
    let pos = 0;
    for (const a of arrays) { out.set(a, pos); pos += a.length; }
    return out;
}

const privateParts = [];
privateParts.push(latin1Bytes(
    'dup /Private 8 dict dup begin\n' +
    '/RD {string currentfile exch readstring pop} executeonly def\n' +
    '/ND {noaccess def} executeonly def\n' +
    '/lenIV 4 def\n' +
    '/CharStrings ' + glyphOrder.length + ' dict dup begin\n'));
for (const name of glyphOrder) {
    const enc = encChar(glyphs[name]);
    privateParts.push(latin1Bytes('/' + name + ' ' + enc.length + ' RD '));
    privateParts.push(enc);
    privateParts.push(latin1Bytes(' ND\n'));
}
privateParts.push(latin1Bytes('end\nend\nreadonly put\nnoaccess put\n'));
const privatePlain = concat(privateParts);
const eexecBinary = encrypt(privatePlain, 55665, 4);

// --- Clear-text header --------------------------------------------------------
let encodingLines = '/Encoding 256 array\n0 1 255 {1 index exch /.notdef put} for\n';
const encMap = { 32: 'space', 65: 'A', 66: 'B' };
for (const code of Object.keys(encMap)) encodingLines += 'dup ' + code + ' /' + encMap[code] + ' put\n';
encodingLines += 'readonly def\n';

const header =
    '%!FontType1-1.0: TestType1 001.001\n' +
    '11 dict begin\n' +
    '/FontInfo 6 dict dup begin\n' +
    '/FullName (TestType1 Regular) def\n' +
    '/FamilyName (TestType1) def\n' +
    '/Weight (Regular) def\n' +
    '/Notice (Test fixture, MIT licensed) def\n' +
    '/ItalicAngle 0 def\n' +
    '/isFixedPitch false def\n' +
    'end def\n' +
    '/FontName /TestType1 def\n' +
    '/FontMatrix [0.001 0 0 0.001 0 0] def\n' +
    '/FontBBox {0 -200 700 800} def\n' +
    '/PaintType 0 def\n' +
    '/FontType 1 def\n' +
    encodingLines +
    'currentfile eexec\n';

const trailer = '\n' + '0'.repeat(512).replace(/(.{64})/g, '$1\n') + '\ncleartomark\n';

// --- Write PFA (eexec as ASCII hex) ------------------------------------------
function toHex(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i++) {
        s += bytes[i].toString(16).padStart(2, '0');
        if ((i + 1) % 32 === 0) s += '\n';
    }
    return s + '\n';
}
const pfa = concat([latin1Bytes(header), latin1Bytes(toHex(eexecBinary)), latin1Bytes(trailer)]);
fs.writeFileSync(path.join(__dirname, 'TestType1.pfa'), Buffer.from(pfa));

// --- Write PFB (segmented binary) --------------------------------------------
function pfbSegment(type, data) {
    if (type === 3) return Uint8Array.from([0x80, 0x03]);
    const len = data.length;
    const head = Uint8Array.from([0x80, type, len & 0xff, (len >> 8) & 0xff, (len >> 16) & 0xff, (len >> 24) & 0xff]);
    return concat([head, data]);
}
const pfb = concat([
    pfbSegment(1, latin1Bytes(header)),
    pfbSegment(2, eexecBinary),
    pfbSegment(1, latin1Bytes(trailer)),
    pfbSegment(3)
]);
fs.writeFileSync(path.join(__dirname, 'TestType1.pfb'), Buffer.from(pfb));

console.log('Wrote TestType1.pfa (' + pfa.length + ' bytes) and TestType1.pfb (' + pfb.length + ' bytes)');
