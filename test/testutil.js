'use strict';

var unhex = function(str) {
    str = str.split(' ').join('');
    var len = str.length / 2;
    var data = new DataView(new ArrayBuffer(len), 0);
    for (var i = 0; i < len; i++) {
        data.setUint8(i, parseInt(str.slice(i * 2, i * 2 + 2), 16));
    }

    return data;
};

exports.unhex = unhex;
