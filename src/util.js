function isBrowser() {
    return typeof window !== 'undefined';
}

function isNode() {
    return typeof window === 'undefined';
}

function nodeBufferToArrayBuffer(buffer) {
    const ab = new ArrayBuffer(buffer.length);
    const view = new Uint8Array(ab);
    for (let i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }

    return ab;
}

function arrayBufferToNodeBuffer(ab) {
    const buffer = new Buffer(ab.byteLength);
    const view = new Uint8Array(ab);
    for (let i = 0; i < buffer.length; ++i) {
        buffer[i] = view[i];
    }

    return buffer;
}

function checkArgument(expression, message) {
    if (!expression) {
        throw message;
    }
}

function isHighSurrogate(code) {
    return code >= 0xD800 && code <= 0xDBFF;
}

function isLowSurrogate(code) {
    return code >= 0xDC00 && code <= 0xDFFF;
}

function getFirstCodePoint(s) {
    if (s.length > 1 && isHighSurrogate(s.charCodeAt(0)) && isLowSurrogate(s.charCodeAt(1))) {
        return 0x10000 + ((s.charCodeAt(0) & 0x03FF) << 10) + (s.charCodeAt(1) & 0x03FF);
    }
    return s.charCodeAt(0);
}

export {
    isBrowser,
    isNode,
    nodeBufferToArrayBuffer,
    arrayBufferToNodeBuffer,
    checkArgument,
    isHighSurrogate,
    isLowSurrogate,
    getFirstCodePoint
};
