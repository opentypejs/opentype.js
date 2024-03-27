import { tinf_uncompress as inflate } from './tiny-inflate@1.0.3.esm.js';

function isBrowser() {
    return (
        typeof window !== 'undefined' ||
        typeof WorkerGlobalScope !== 'undefined'
    );
}

function isNode() {
    return (
        typeof window === 'undefined' &&
        typeof global === 'object' &&
        typeof process === 'object'
    );
}

function checkArgument(expression, message) {
    if (!expression) {
        throw message;
    }
}

// Check if 2 arrays of primitives are equal.
function arraysEqual(ar1, ar2) {
    const n = ar1.length;
    if (n !== ar2.length) { return false; }
    for (let i = 0; i < n; i++) {
        if (ar1[i] !== ar2[i]) { return false; }
    }
    return true;
}

// Check if 2 objects are equal
function objectsEqual(obj1, obj2) {
    const val1 = Object.values(obj1);
    const val2 = Object.values(obj2);
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    return arraysEqual(val1, val2) && arraysEqual(keys1, keys2);
}

/**
 * [GZIP File Format Specification](https://datatracker.ietf.org/doc/html/rfc1952#section-2.3)
 * @param {Uint8Array} buf
 * @returns {boolean}
 */
function isGzip(buf) {
    return buf[0] === 31 && buf[1] === 139 && buf[2] === 8;
}

/**
 * [GZIP File Format Specification](https://datatracker.ietf.org/doc/html/rfc1952#section-2.3)
 * @param {Uint8Array} gzip
 * @returns {Uint8Array}
 */
function unGzip(gzip) {
    const data = new DataView(gzip.buffer, gzip.byteOffset, gzip.byteLength);

    let start = 10;
    const end = gzip.byteLength - 8;
    const flg = data.getInt8(3);
    // FEXTRA
    if (flg & 0b00000100) {
        start += 2 + data.getUint16(start, true);
    }
    // FNAME
    if (flg & 0b00001000) {
        while (start < end) if (gzip[start++] === 0) break;
    }
    // FCOMMENT
    if (flg & 0b00010000) {
        while (start < end) if (gzip[start++] === 0) break;
    }
    // FHCRC
    if (flg & 0b00000010) {
        start += 2;
    }

    if (start >= end) throw new Error('Can\'t find compressed blocks');

    const isize = data.getUint32(data.byteLength - 4, true);

    return inflate(gzip.subarray(start, end), new Uint8Array(isize));
}

export { isBrowser, isNode, checkArgument, arraysEqual, objectsEqual, isGzip, unGzip };
