function hex(bytes) {
    var values = [];
    for (var i = 0; i < bytes.length; i++) {
        var b = bytes[i];
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
    var len = str.length / 2;
    var data = new DataView(new ArrayBuffer(len), 0);
    for (var i = 0; i < len; i++) {
        data.setUint8(i, parseInt(str.slice(i * 2, i * 2 + 2), 16));
    }

    return data;
}

function unhexArray(str) {
    return Array.prototype.slice.call(new Uint8Array(unhex(str).buffer));
}

export { hex, unhex, unhexArray };
