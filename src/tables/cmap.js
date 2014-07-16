// The `cmap` table stores the mappings from characters to glyphs.
// https://www.microsoft.com/typography/OTSPEC/cmap.htm

'use strict';

var check = require('../check');
var parse = require('../parse');


// Parse the `cmap` table. This table stores the mappings from characters to glyphs.
// There are many available formats, but we only support the Windows format 4.
// This function returns a `CmapEncoding` object or null if no supported format could be found.
function parseCmapTable(data, start) {
    var version, numTables, offset, platformId, encodingId, format, segCount,
        ranges, i, j, parserOffset, idRangeOffset, p, offsetBound;
    var cmap = {};
    cmap.version = version = parse.getUShort(data, start);
    check.argument(version === 0, 'cmap table version should be 0.');

    // The cmap table can contain many sub-tables, each with their own format.
    // We're only interested in a "platform 3" table. This is a Windows format.
    cmap.numtables = numTables = parse.getUShort(data, start + 2);
    offset = -1;
    for (i = 0; i < numTables; i += 1) {
        platformId = parse.getUShort(data, start + 4 + (i * 8));
        encodingId = parse.getUShort(data, start + 4 + (i * 8) + 2);
        if (platformId === 3 && (encodingId === 1 || encodingId === 0)) {
            offset = parse.getULong(data, start + 4 + (i * 8) + 4);
            break;
        }
    }
    if (offset === -1) {
        // There is no cmap table in the font that we support, so return null.
        // This font will be marked as unsupported.
        return null;
    }

    p = new parse.Parser(data, start + offset);
    cmap.format = format = p.parseUShort();
    check.argument(format === 4, 'Only format 4 cmap tables are supported.');
    // Length in bytes of the sub-tables.
    cmap.length = p.parseUShort();
    cmap.language = p.parseUShort();
    // segCount is stored x 2.
    cmap.segCount = segCount = p.parseUShort() >> 1;
    // Skip searchRange, entrySelector, rangeShift.
    p.skip('uShort', 3);
    ranges = [];
    for (i = 0; i < segCount; i += 1) {
        ranges[i] = { end: p.parseUShort() };
    }
    // Skip a padding value.
    p.skip('uShort');
    for (i = 0; i < segCount; i += 1) {
        ranges[i].start = p.parseUShort();
        ranges[i].length = ranges[i].end - ranges[i].start + 1;
    }
    for (i = 0; i < segCount; i += 1) {
        ranges[i].idDelta = p.parseShort();
    }
    offsetBound = p.offset + cmap.length;
    for (i = 0; i < segCount; i += 1) {
        parserOffset = p.offset + p.relativeOffset;
        idRangeOffset = p.parseUShort();
        parserOffset += idRangeOffset;
        if (idRangeOffset > 0) {
            ranges[i].ids = [];
            if (parserOffset >= offsetBound) break;
            for (j = 0; j < ranges[i].length; j += 1) {
                ranges[i].ids[j] = parse.getUShort(data, parserOffset);
                parserOffset += 2;
            }
        }
    }
    cmap.segments = ranges;
    return cmap;
}

exports.parse = parseCmapTable;
