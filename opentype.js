/*jslint nomen:true */
/*global _*/
(function () {
    'use strict';

    // Precondition function that checks if the given predicate is true.
    // If not, it will log an error message to the console.
    function checkArgument(predicate, message) {
        if (!predicate) {
            console.log("ERROR:", message);
        }
    }

    var Path = function () {
        this.commands = [];
        this.fill = 'black';
        this.stroke = null;
        this.strokeWidth = 1;
    };

    Path.prototype.moveTo = function (x, y) {
        this.commands.push({type: 'M', x: x, y: y});
    };

    Path.prototype.lineTo = function (x, y) {
        this.commands.push({type: 'L', x: x, y: y});
    };

    Path.prototype.curveTo = Path.prototype.bezierCurveTo = function (x1, y1, x2, y2, x, y) {
        this.commands.push({type: 'C', x1: x1, y1: y1, x2: x2, y2: y2, x: x, y: y});
    };

    Path.prototype.quadTo = Path.prototype.quadraticCurveTo = function (x1, y1, x, y) {
        this.commands.push({type: 'Q', x1: x1, y1: y1, x: x, y: y});
    };

    Path.prototype.close = Path.prototype.closePath = function () {
        this.commands.push({type: 'Z'});
    };

    // Draw the path to a 2D context.
    Path.prototype.draw = function (ctx) {
        var i, cmd;
        ctx.beginPath();
        for (i = 0; i < this.commands.length; i += 1) {
            cmd = this.commands[i];
            if (cmd.type === 'M') {
                ctx.moveTo(cmd.x, cmd.y);
            } else if (cmd.type === 'L') {
                ctx.lineTo(cmd.x, cmd.y);
            } else if (cmd.type === 'C') {
                ctx.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
            } else if (cmd.type === 'Q') {
                ctx.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y);
            } else if (cmd.type === 'Z') {
                ctx.closePath();
            }
        }
        if (this.fill) {
            ctx.fillStyle = this.fill;
            ctx.fill();
        }
        if (this.stroke) {
            ctx.strokeStyle = this.stroke;
            ctx.lineWidth = this.strokeWidth;
            ctx.stroke();
        }
    };

    var dataTypes = {
        byte: function (dataView, offset) {
            return dataView.getUint8(offset);
        },
        uShort: function (dataView, offset) {
            return dataView.getUint16(offset, false);
        },
        short: function (dataView, offset) {
            return dataView.getInt16(offset, false);
        },
        uLong: function (dataView, offset) {
            return dataView.getUint32(offset, false);
        },
        fixed: function (dataView, offset) {
            return -1;
        },
        longDateTime: function (dataView, offset) {
            var v1, v2;
            v1 = dataView.getUint32(offset, false);
            v2 = dataView.getUint32(offset + 1, false);
            return [v1, v2];
        },
        tag: function (dataView, offset) {
            var tag = '';
            _.each(_.range(offset, offset + 4), function (i) {
                var b = dataView.getInt8(i);
                tag += String.fromCharCode(b);
            });
            return tag;
        }
    };

    var typeOffsets = {
        byte: 1,
        uShort: 2,
        short: 2,
        uLong: 4,
        fixed: 4,
        longDateTime: 8,
        tag: 4
    };

    // The offset table is the first table in the OpenType font file. It contains information to parse the table records.
    // http://www.microsoft.com/typography/otspec/otff.htm
    var offsetTable = [
        // Version number for the entire font. Should be 0x00010000 for version 1.0.
        { name: 'sfntVersion', type: 'fixed' },
        // Number of tables.
        { name: 'numTables', type: 'uShort' },
        // (Maximum power of 2 <= numTables) x 16.
        { name: 'searchRange', type: 'uShort' },
        // Log2(maximum power of 2 <= numTables).
        { name: 'entrySelector', type: 'uShort' },
        // NumTables x 16-searchRange.
        { name: 'rangeShift', type: 'uShort' }
    ];

    // A table record contains the name, position and checksum of an OpenType table.
    // In other words, a table record works like an index: it can be used to locate the table data.
    // There are numTables table records in the file.
    var tableRecord = [
        // 4-byte identifier of the table.
        { name: 'tag', type: 'tag' },
        // Checksum for this table.
        { name: 'checksum', type: 'uLong' },
        // Offset from beginning of TrueType font file, in bytes.
        { name: 'offset', type: 'uLong' },
        // Length of this table, in bytes.
        { name: 'length', type: 'uLong' }
    ];

    // The font header gives global information about the font.
    // http://www.microsoft.com/typography/otspec/head.htm
    var fontHeaderTable = [
        // 0x00010000 for version 1.0.
        { name: 'tableVersionNumber', type: 'fixed' },
        // Revision number set by the font manufacturer.
        {name: 'fontRevision', type: 'fixed' },
        // Checksum for the entire font.
        { name: 'checkSumAdjustment', type: 'uLong' },
        // Set to 0x5F0F3CF5.
        { name: 'magicNumber', type: 'uLong' },
        // A set of important flags.
        // bit 0: Baseline for font is at y = 0.
        // bit 1: The left sidebearing point is at x = 0.
        // bit 2: Instructions may depend on point size.
        // bit 3: Force ppem to integer values for all internal scaler math. M
        //        May use fractional ppem sizes if this bit is clear.
        // bit 4: Instructions may alter the advance width (the advance widths might not scale linearly).
        // bit 5-10: Not implemented in OpenType.
        // bit 11: Font data is "lossless" as a result of having been compressed with the Agfa MicroType Express engine.
        // bit 12: Font converted (produce compatible metrics)
        // bit 13: Font optimized for ClearType.
        // bit 14: Last Resort font. Glyphs encoded in the cmap subtables are generic symbolic representations of
        //         code point ranges.
        // bit 15: Reserved, set to 0.
        { name: 'flags', type: 'uShort' },
        // Units per em square. Should be a power of 2 for fonts with TrueType outlines.
        { name: 'unitsPerEm', type: 'uShort' },
        // Date / time the font was created.
        { name: 'created', type: 'longDateTime' },
        // Date / time the font was modified.
        { name: 'modified', type: 'longDateTime' },
        // Minimum X position for all glyph bounding boxes.
        { name: 'xMin', type: 'short' },
        // Minimum Y position for all glyph bounding boxes.
        { name: 'yMin', type: 'short' },
        // Maximum X position for all glyph bounding boxes.
        { name: 'xMax', type: 'short' },
        // Maximum Y position for all glyph bounding boxes.
        { name: 'yMax', type: 'short' },
        // Bit field specifying font style.
        // bit 0: Bold
        // bit 1: Italic
        // bit 2: Underline
        // bit 3: Outline
        // bit 4: Shadow
        // bit 5: Condensed
        // bit 6: Extended
        // bit 7-15: Reserved (set to 0)
        { name: 'macStyle', type: 'uShort' },
        // Smallest readable size in pixels.
        { name: 'lowestRecPPEM', type: 'uShort' },
        // Deprecated (set to 2).
        { name: 'fontDirectionHint', type: 'short' },
        // Format of the loca table: 0 for the short version, 1 for the long version.
        { name: 'indexToLocFormat', type: 'short' },
        // 0 for current format.
        { name: 'glyphDataFormat', type: 'short' }
    ];

    // This table establishes the memory requirements for this font.
    // It is important because it stores the number of glyphs in the font.
    // http://www.microsoft.com/typography/otspec/maxp.htm
    var maximumProfileTable = [
        // Version of the table. version 0.4 is for CFF data, version 1.0 is for TrueType data.
        { name: 'version', type: 'fixed' },
        //The number of glyphs in the font.
        { name: 'numGlyphs', type: 'uShort' }
    ];

    // Header of the "character to glyph mapping" table.
    // http://www.microsoft.com/typography/otspec/cmap.htm
    var cmapHeader = [
        // Table version number (0).
        { name: 'version', type: 'uShort' },
        // Number of encoding tables that follow.
        { name: 'numTables', type: 'uShort' }
    ];

    // Encoding record in the cmap table.
    var cmapEncodingRecord = [
        // Platform ID.
        { name: 'platformId', type: 'uShort' },
        // Platform-specific encoding ID.
        { name: 'encodingId', type: 'uShort' },
        // Byte offset from beginning of table to the sub-table for this encoding.
        { name: 'offset', type: 'uLong' }
    ];

    // This table describes the glyphs in the font in the TrueType outline format.
    // http://www.microsoft.com/typography/otspec/glyf.htm
    var glyfData = [
        // If positive or zero, this is a single glyph. If negative, this is a composite glyph.
        { name: 'numberOfContours', type: 'short' },
        // Minimum X position for coordinate data.
        { name: 'xMin', type: 'short' },
        // Minimum Y position for coordinate data.
        { name: 'yMin', type: 'short' },
        // Maximum X position for coordinate data.
        { name: 'xMax', type: 'short' },
        // Maximum Y position for coordinate data.
        { name: 'yMax', type: 'short' }
    ];

    // Find the table record with the specified tag in the list of table records.
    function findTableRecord(tableRecords, tagName) {
        var tableRecord = _.findWhere(tableRecords, {tag: tagName});
        checkArgument(tableRecord, 'Could not find table record ' + tagName);
        return tableRecord;
    }

    // Parse the table at the given offset with the given format.
    // The offset can also be a table record.
    function parseTable(dataView, offset, tableFormat) {
        offset = offset.offset ? offset.offset : offset;
        var obj = {};
        var relativeOffset = 0;
        _.each(tableFormat, function (field) {
            var parseFn = dataTypes[field.type];
            obj[field.name] = parseFn(dataView, offset + relativeOffset);
            relativeOffset += typeOffsets[field.type];
        });
        obj['_offset'] = offset;
        obj['_length'] = relativeOffset;
        return obj;
    }

    // A stateful parser that changes the offset whenever a value is retrieved.
    var Parser = function (dataView, offset) {
        this.dataView = dataView;
        this.offset = offset;
        this.relativeOffset = 0;
    };

    Parser.prototype.parse = function (type) {
        var parseFn = dataTypes[type];
        var v = parseFn(this.dataView, this.offset + this.relativeOffset);
        this.relativeOffset += typeOffsets[type];
        return v;
    };

    // Call the given function `count` times with the value of the counter.
    function repeat(count, fn) {
        for (var i = 0; i < count; i++) {
            fn(i);
        }
    }

    // Return true if the value at the given bit index is set.
    function isBitSet(b, bitIndex) {
        return ((b >> bitIndex) & 1) === 1;
    }

    // Parse an OpenType glyph (described in the glyf table).
    // Due to the complexity of the parsing we can't define the glyf table declaratively.
    // The offset is the absolute byte offset of the glyph: the base of the glyph table + the relative offset of the glyph.
    // http://www.microsoft.com/typography/otspec/glyf.htm
    function parseGlyph(dataView, offset, relativeOffset) {
        var i;
        var flag;
        offset = offset | offset.offset;
        offset += relativeOffset;
        // The glyf header can be parsed regularly.
        var glyph = parseTable(dataView, offset, glyfData);
        var p = new Parser(dataView, offset + glyph._length);
        if (glyph.numberOfContours >= 0) {
            // This glyph is not a composite.
            var endPointIndices = _.map(_.range(glyph.numberOfContours), function (i) {
                return p.parse('uShort');
            });
            glyph.endPointIndices = endPointIndices;
            glyph.instructionLength = p.parse('uShort');

            glyph.instructions = _.map(_.range(glyph.instructionLength), function (i) {
                return p.parse('byte');
            });

            var numberOfCoordinates = endPointIndices[endPointIndices.length - 1] + 1;
            var flags = [];
            for (i = 0; i < numberOfCoordinates; i++) {
                flag = p.parse('byte');
                flags.push(flag);
                // If bit 3 is set, we repeat this flag n times, where n is the next byte.
                if (isBitSet(flag, 3)) {
                    var repeatCount = p.parse('byte');
                    repeat(repeatCount, function () {
                        flags.push(flag);
                        i++;
                    });
                }
            }
            checkArgument(flags.length === numberOfCoordinates, 'Bad flags.');

            if (endPointIndices.length > 0) {
                var points = [];
                // X/Y coordinates are relative to the previous point, except for the first point which is relative to 0,0.
                if (numberOfCoordinates > 0) {
                    for (i = 0; i < numberOfCoordinates; i++) {
                        flag = flags[i];
                        var point = {};
                        point.onCurve = isBitSet(flag, 0);
                        point.lastPointOfContour = _.contains(endPointIndices, i);
                        points.push(point);
                    }
                    var px = 0;
                    for (i = 0; i < numberOfCoordinates; i++) {
                        flag = flags[i];
                        point = points[i];
                        point.x = _parseGlyphCoordinate(p, flag, px, 1, 4);
                        px = point.x;
                    }

                    var py = 0;
                    for (i = 0; i < numberOfCoordinates; i++) {
                        flag = flags[i];
                        point = points[i];
                        point.y = _parseGlyphCoordinate(p, flag, py, 2, 5);
                        py = point.y;
                    }
                }
                glyph.points = points;
            } else {
                glyph.points = [];
            }
        }
        // Add the number of bytes parsed from the stateful parser to the glyph's object length.
        glyph._length += p.relativeOffset;
        return glyph;
    }


    // Parse the coordinate data for a glyph.
    function _parseGlyphCoordinate(p, flag, previousValue, shortVectorBit, sameBit) {
        var v;
        if (isBitSet(flag, shortVectorBit)) {
            // The coordinate is 1 byte long.
            v = p.parse('byte');
            // The `same` bit is re-used for short values to signify the sign of the value.
            if (!isBitSet(flag, sameBit)) {
                v = -v;
            }
            v = previousValue + v;
        } else {
            //  The coordinate is 2 bytes long.
            // If the `same` bit is set, the coordinate is the same as the previous coordinate.
            if (isBitSet(flag, sameBit)) {
                v = previousValue;
            } else {
                // Parse the coordinate as a signed 16-bit delta value.
                v = previousValue + p.parse('short');
            }
        }
        return v;
    }


    // Parse the `loca` table. This table stores the offsets to the locations of the glyphs in the font,
    // relative to the beginning of the glyphData table.
    // The number of glyphs stored in the `loca` table is specified in the `maxp` table (under numGlyphs)
    // The loca table has two versions: a short version where offsets are stored as uShorts, and a long
    // version where offsets are stored as uLongs. The `head` table specifies which version to use (under indexToLocFormat).
    function parseLocaTable(dataView, offset, numGlyphs, offsetType) {
        offset = offset | offset.offset;
        checkArgument(offsetType === 'uShort' || offsetType === 'uLong', 'offsetType is not uShort or uLong.');
        var p = new Parser(dataView, offset);
        // There is an extra entry after the last index element to compute the length of the last glyph.
        // That's why we use numGlyphs + 1.
        var glyphOffsets = [];
        for (var i = 0; i < numGlyphs + 1; i++) {
            var glyphOffset = p.parse(offsetType);
            if (offsetType === 'uShort') {
                // The short table stores the actual offset divided by 2.
                glyphOffset *= 2;
            }
            glyphOffsets.push(glyphOffset);
        }
        return glyphOffsets;
    }


    // Parse the OpenType file (as a buffer) and returns a Font object.
    function parseFont(buffer) {
        // OpenType fonts use big endian byte ordering.
        // We can't rely on typed array view types, because they operate with the endianness of the host computer.
        // Instead we use DataViews where we can specify endianness.

        var font = {glyphs: {}};

        var dataView = new DataView(buffer, 0);

        var offset = 0;

        var tOffsetTable = parseTable(dataView, offset, offsetTable);
        offset += tOffsetTable._length;

        var tableRecords = [];
        for (var i = 0; i < tOffsetTable.numTables; i += 1) {
            var tr = parseTable(dataView, offset, tableRecord);
            offset += tr._length;
            tableRecords.push(tr);
        }

        tableRecords = _.sortBy(tableRecords, function (tr) {
            return tr.offset;
        });

        var trCmap = findTableRecord(tableRecords, 'cmap');
        var tCmapHeader = parseTable(dataView, trCmap, cmapHeader);

        var cmapOffset = trCmap.offset + tCmapHeader._length;
        var cmapEncodingRecords = _.map(_.range(tCmapHeader.numTables), function (i) {
            var t = parseTable(dataView, cmapOffset, cmapEncodingRecord);
            cmapOffset += t._length;
            console.log("FORMAT", t.platformId, t.encodingId, t.offset, dataTypes.uShort(dataView, trCmap.offset + t.offset));
            return t;
        });

        // To get the glyphs:
        // 1. Parse the 'head' table to know if the 'loca' table is in long or short format. (using indexToLocFormat)
        var trHead = findTableRecord(tableRecords, 'head');
        var tHead = parseTable(dataView, trHead, fontHeaderTable);
        checkArgument(tHead.magicNumber === 0x5F0F3CF5, 'Font header has wrong magic number.');

        // 2. Parse the 'maxp' table to find out the number of glyphs.
        var trMaximumProfile = findTableRecord(tableRecords, 'maxp');
        var tMaximumProfile = parseTable(dataView, trMaximumProfile, maximumProfileTable);

        // 3. Parse the 'loca' table to find the offsets of the glyphs.
        var trIndexToLocation = findTableRecord(tableRecords, 'loca');
        var tableFormat = tHead.indexToLocFormat === 0 ? 'uShort' : 'uLong';
        var relativeGlyphOffsets = parseLocaTable(dataView, trIndexToLocation, tMaximumProfile.numGlyphs, tableFormat);

        // TODO Remove
        relativeGlyphOffsets = relativeGlyphOffsets.slice(0, 100);

        // 4. For each glyph, use parseGlyph with the relative offsets from the `loca` table.
        var trGlyf = findTableRecord(tableRecords, 'glyf');
        _.each(relativeGlyphOffsets, function (relativeOffset, glyphIndex) {
            font.glyphs[glyphIndex] = parseGlyph(dataView, trGlyf.offset, relativeOffset);
        });
        return font;

    }

    // Split the glyph into contours.
    function getContours(glyph) {
        var contours = [];
        var currentContour = [];
        for (var i = 0; i < glyph.points.length; i++) {
            var pt = glyph.points[i];
            currentContour.push(pt);
            if (pt.lastPointOfContour) {
                contours.push(currentContour);
                currentContour = [];
            }
        }
        console.assert(_.isEmpty(currentContour));
        return contours;
    }

    // Convert the glyph to a Path we can draw on a Canvas context.
    function glyphToPath(glyph) {
        var path, contours, pt, firstPt, prevPt, nextPt, midPt, curvePt;
        path = new Path();
        if (!glyph.points) return path;
        contours = getContours(glyph);

        _.each(contours, function (contour) {
            firstPt = contour[0];
            curvePt = null;
            for (var i = 0; i < contour.length; i++) {
                pt = contour[i];
                prevPt = i === 0 ? contour[contour.length - 1] : contour[i - 1];

                if (i === 0) {
                    // This is the first point of the contour.
                    if (pt.onCurve) {
                        path.moveTo(pt.x, -pt.y);
                        // console.log("M" + pt.x + "," + pt.y);
                    } else {
                        midPt = { x: (prevPt.x + pt.x) / 2, y: (prevPt.y + pt.y) / 2 };
                        path.moveTo(midPt.x, -midPt.y);
                        // console.log("M" + pt.x + "," + pt.y);
                    }
                    curvePt = null;
                } else {
                    if (prevPt.onCurve && pt.onCurve) {
                        // This is a straight line.
                        console.assert(curvePt === null);
                        path.lineTo(pt.x, -pt.y);
                        // console.log("L" + pt.x + " " + pt.y);
                    } else if (prevPt.onCurve && !pt.onCurve) {
                        console.assert(curvePt === null);
                        curvePt = pt;
                    } else if (!prevPt.onCurve && !pt.onCurve) {
                        console.assert(curvePt !== null);
                        midPt = { x: (prevPt.x + pt.x) / 2, y: (prevPt.y + pt.y) / 2 };
                        path.quadraticCurveTo(prevPt.x, -prevPt.y, midPt.x, -midPt.y);
                        // console.log("Q" + prevPt.x + "," + prevPt.y + " " + midPt.x + "," + midPt.y);
                        curvePt = pt;
                    } else if (!prevPt.onCurve && pt.onCurve) {
                        console.assert(curvePt !== null);
                        // Previous point off-curve, this point on-curve.
                        path.quadraticCurveTo(curvePt.x, -curvePt.y, pt.x, -pt.y);
                        // console.log("Q" + curvePt.x + "," + curvePt.y + " " + pt.x + "," + pt.y);
                        curvePt = null;
                    } else {
                        console.assert(false, "Shouldn't be here.");
                    }
                }

            }
            // Connect the last and first points
            if (curvePt) {
                path.quadraticCurveTo(curvePt.x, -curvePt.y, firstPt.x, -firstPt.y);
                // console.log("Q" + curvePt.x + "," + curvePt.y + " " + firstPt.x + "," + firstPt.y);
            } else {
                path.lineTo(firstPt.x, -firstPt.y);
                // console.log("L" + firstPt.x + " " + firstPt.y);
            }
        });
        path.closePath();
        return path;
    }

    function line(ctx, x1, y1, x2, y2) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    var ellipse = function (ctx, cx, cy, w, h) {
        var kappa = 0.5522848;
        var ox = (w / 2) * kappa; // control point offset horizontal
        var oy = (h / 2) * kappa; // control point offset vertical
        var left = cx - w / 2;
        var top = cy - h / 2;
        var right = cx + w / 2;
        var bottom = cy + h / 2;
        ctx.beginPath();
        ctx.moveTo(left, cy);
        ctx.bezierCurveTo(left, cy - oy, cx - ox, top, cx, top);
        ctx.bezierCurveTo(cx + ox, top, right, cy - oy, right, cy);
        ctx.bezierCurveTo(right, cy + oy, cx + ox, bottom, cx, bottom);
        ctx.bezierCurveTo(cx - ox, bottom, left, cy + oy, left, cy);
        ctx.closePath();
        ctx.fill();
    };

    function drawGlyphPoints(glyph, ctx, size) {
        _.each(glyph.points, function (pt) {
            if (pt.onCurve) {
                ctx.fillStyle = 'blue';
            } else {
                ctx.fillStyle = 'red';
            }
            ellipse(ctx, pt.x, -pt.y, 60, 60);
        });
    }

    function drawGlyphBox(glyph, ctx) {
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 5;
        line(ctx, glyph.xMin, -10000, glyph.xMin, 10000);
        line(ctx, glyph.xMax, -10000, glyph.xMax, 10000);
        line(ctx, -10000, -glyph.yMin, 10000, -glyph.yMin);
        line(ctx, -10000, -glyph.yMax, 10000, -glyph.yMax);
    }

    // Create a canvas and adds it to the document.
    // Returns the 2d drawing context.
    function createCanvas(size, glyphIndex) {
        var canvasId = 'c' + glyphIndex;
        var html = '<div class="cwrap" style="width:' + size +'px"><canvas id="' + canvasId + '" width="' + size + '" height="' + size + '"></canvas><span>' + glyphIndex + '</span></div>';
        var body = document.getElementsByTagName('body')[0];
        var wrap = document.createElement('div');
        wrap.innerHTML = html;
        body.appendChild(wrap);
        var canvas = document.getElementById(canvasId);
        var ctx = canvas.getContext('2d');
        ctx.translate(size / 2, size / 2);
        ctx.scale(size / 6144, size / 6144);
        return ctx;
    }

    var req = new XMLHttpRequest();
    req.open('get', 'Roboto-Black.ttf', true);
    req.responseType = 'arraybuffer';
    req.onload = function (e) {
        var arrayBuffer = req.response;
        var font = parseFont(arrayBuffer);
        _.each(font.glyphs, function (glyph, i) {
            var size = 100;
            var ctx = createCanvas(size, i);
            var path = glyphToPath(glyph);
            path.draw(ctx);
            drawGlyphPoints(glyph, ctx, size);
            drawGlyphBox(glyph, ctx);
        });
    };
    req.send(null);
})();
