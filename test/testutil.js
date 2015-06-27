'use strict';

var hex = function(bytes) {
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
};

var unhex = function(str) {
    str = str.split(' ').join('');
    var len = str.length / 2;
    var data = new DataView(new ArrayBuffer(len), 0);
    for (var i = 0; i < len; i++) {
        data.setUint8(i, parseInt(str.slice(i * 2, i * 2 + 2), 16));
    }

    return data;
};

exports.hex = hex;
exports.unhex = unhex;
