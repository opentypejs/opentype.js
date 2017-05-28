function hex(bytes) {
    const values = [];
    for (let i = 0; i < bytes.length; i++) {
        const b = bytes[i];
        if (b < 16) {
            values.push('0' + b.toString(16));
        } else {
            values.push(b.toString(16));
        }
    }

    return values.join(' ').toUpperCase();
}

function unhex(str) {
    str = str.split(' ').join('');
    const len = str.length / 2;
    const data = new DataView(new ArrayBuffer(len), 0);
    for (let i = 0; i < len; i++) {
        data.setUint8(i, parseInt(str.slice(i * 2, i * 2 + 2), 16));
    }

    return data;
}

function unhexArray(str) {
    return Array.prototype.slice.call(new Uint8Array(unhex(str).buffer));
}

export { hex, unhex, unhexArray };
