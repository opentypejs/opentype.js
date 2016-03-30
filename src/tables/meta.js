// The `GPOS` table contains kerning pairs, among other things.
// https://www.microsoft.com/typography/OTSPEC/gpos.htm

'use strict';

var types = require('../types');
var decode = types.decode;
var check = require('../check');
var parse = require('../parse');
var table = require('../table');

// Parse the metadata `meta` table.
// https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6meta.html
function parseMetaTable(data, start, additionalTags) {
    var supportedTags = ['dlng', 'slng'];
    if (additionalTags) {
        supportedTags = supportedTags.concat(additionalTags);
    }

    var p = new parse.Parser(data, start);
    var tableVersion = p.parseULong();
    check.argument(tableVersion === 1, 'Unsupported META table version.');
    p.parseULong(); // flags - currently unused and set to 0
    p.parseULong(); // tableOffset
    var numDataMaps = p.parseULong();

    var tags = [];
    for (var i = 0; i < numDataMaps; i++) {
        var tag = p.parseTag();

        // Skip non-supported tags (like 'appl' or 'bild')
        if (supportedTags.indexOf(tag) === -1) {
            continue;
        }

        var dataOffset = p.parseULong();
        var dataLength = p.parseULong();
        var text = decode.UTF8(data, dataOffset, dataLength);

        tags.push({
            tag: tag,
            data: text
        });
    }

    return tags;
}

function makeMetaTable(tags) {
    var stringPool = '';
    var stringPoolOffset = 16 + tags.length * 12;

    var result = new table.Table('meta', [
        {name: 'version', type: 'ULONG', value: 1},
        {name: 'flags', type: 'ULONG', value: 0},
        {name: 'offset', type: 'ULONG', value: stringPoolOffset},
        {name: 'numTags', type: 'ULONG', value: tags.length}
    ]);

    for (var i = 0; i < tags.length; ++i) {
        var pos = stringPool.length;
        stringPool += tags[i].data;

        result.fields.push({name: 'tag ' + i, type: 'TAG', value: tags[i].tag});
        result.fields.push({name: 'offset ' + i, type: 'ULONG', value: stringPoolOffset + pos});
        result.fields.push({name: 'length ' + i, type: 'ULONG', value: tags[i].data.length});
    }

    result.fields.push({name: 'stringPool', type: 'CHARARRAY', value: stringPool});

    return result;
}

exports.parse = parseMetaTable;
exports.make = makeMetaTable;
