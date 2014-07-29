// The `cmap` table stores the mappings from characters to glyphs.
// https://www.microsoft.com/typography/OTSPEC/cmap.htm

'use strict';

var check = require('../check');
var encode = require('../types').encode;
var parse = require('../parse');
var table = require('../table');

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

function CmapTable() {
    this.segments = [];
}

CmapTable.prototype = new table.Table('cmap', [
    {name: 'version', type: 'USHORT', value: 0},
    {name: 'numTables', type: 'USHORT', value: 1},
    {name: 'platformID', type: 'USHORT', value: 3},
    {name: 'encodingID', type: 'USHORT', value: 1},
    {name: 'offset', type: 'ULONG', value: 12},
    {name: 'format', type: 'USHORT', value: 4},
    {name: 'length', type: 'USHORT', value: 0},
    {name: 'language', type: 'USHORT', value: 0},
    {name: 'segCountX2', type: 'USHORT', value: 0},
    {name: 'searchRange', type: 'USHORT', value: 0},
    {name: 'entrySelector', type: 'USHORT', value: 0},
    {name: 'rangeShift', type: 'USHORT', value: 0}]);

CmapTable.prototype.addSegment = function (code) {
    var index = this.segments.length + 1;
    this.segments.push({
        end: code,
        start: code,
        delta: -(code - index),
        offset: 0,
        glyphId: index
    });
};

CmapTable.prototype.addTerminatorSegment = function () {
    this.segments.push({
        end: 0xFFFF,
        start: 0xFFFF,
        delta: 1,
        offset: 0
    });
};

CmapTable.prototype.encode = function () {
    var segCount;
    segCount = this.segments.length;
    this.segCountX2 = segCount * 2;
    this.searchRange = Math.pow(Math.floor(Math.log(segCount) / Math.log(2)), 2) * 2;
    this.entrySelector = Math.log(this.searchRange / 2) / Math.log(2);
    this.rangeShift = this.segCountX2 - this.searchRange;

    // Set up parallel segment arrays.
    var endCounts = [],
        startCounts = [],
        idDeltas = [],
        idRangeOffsets = [],
        glyphIds = [];

    for (var i = 0; i < segCount; i += 1) {
        var segment = this.segments[i];
        endCounts = endCounts.concat(encode.USHORT(segment.end));
        startCounts = startCounts.concat(encode.USHORT(segment.start));
        idDeltas = idDeltas.concat(encode.SHORT(segment.delta));
        idRangeOffsets = idRangeOffsets.concat(encode.USHORT(segment.offset));
        if (segment.glyphId !== undefined) {
            glyphIds = glyphIds.concat(encode.USHORT(segment.glyphId));
        }
    }
    var d = encode.TABLE(this);
    d = d.concat(endCounts);
    d = d.concat(encode.USHORT(0)); // reservedPad field
    d = d.concat(startCounts);
    d = d.concat(idDeltas);
    d = d.concat(idRangeOffsets);
    d = d.concat(glyphIds);
    return d;
};

exports.parse = parseCmapTable;
exports.Table = CmapTable;
