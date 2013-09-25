/*jslint nomen:true */
/*global _*/
(function () {
    'use strict';

    var root = this;

    var openType = {};

    var _;
    if (typeof require !== 'undefined') {
        _ = require('./underscore.js');
    } else {
        _ = this._;
    }

    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = openType;
        }
        exports.openType = openType;
    } else {
        root.openType = openType;
    }

    // Precondition function that checks if the given predicate is true.
    // If not, it will log an error message to the console.
    function checkArgument(predicate, message) {
        if (!predicate) {
            throw new Error(message);
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


    function getByte(dataView, offset) {
        return dataView.getUint8(offset);
    }

    function getUShort(dataView, offset) {
        return dataView.getUint16(offset, false);
    }

    function getShort(dataView, offset) {
        return dataView.getInt16(offset, false);
    }

    function getULong(dataView, offset) {
        return dataView.getUint32(offset, false);
    }

    function getFixed(dataView, offset) {
        return -1;
    }

    function getLongDateTime(dataView, offset) {
        var v1, v2;
        v1 = dataView.getUint32(offset, false);
        v2 = dataView.getUint32(offset + 1, false);
        return [v1, v2];
    }

    function getTag(dataView, offset) {
        var tag = '', i;
        for (i = offset; i < offset + 4; i += 1) {
            tag += String.fromCharCode(dataView.getInt8(i));
        }
        return tag;
    }

    var dataTypes = {
        byte: getByte,
        uShort: getUShort,
        short: getShort,
        uLong: getULong,
        fixed: getFixed,
        longDateTime: getLongDateTime,
        tag: getTag
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

    Parser.prototype.parseByte = function () {
        var v = getByte(this.dataView, this.offset + this.relativeOffset);
        this.relativeOffset += 1;
        return v;
    };

    Parser.prototype.parseUShort = function () {
        var v = getUShort(this.dataView, this.offset + this.relativeOffset);
        this.relativeOffset += 2;
        return v;
    };

    Parser.prototype.parseShort = function () {
        var v = getShort(this.dataView, this.offset + this.relativeOffset);
        this.relativeOffset += 2;
        return v;
    };

    Parser.prototype.parseULong = function () {
        var v = getULong(this.dataView, this.offset + this.relativeOffset);
        this.relativeOffset += 4;
        return v;
    };

    Parser.prototype.skip = function (type, amount) {
        if (typeof amount === 'undefined') amount = 1;
        this.relativeOffset += typeOffsets[type] * amount;
    };

    // Return true if the value at the given bit index is set.
    function isBitSet(b, bitIndex) {
        return ((b >> bitIndex) & 1) === 1;
    }

    // Parse all the glyphs according to the offsets from the `loca` table.
    function parseGlyfTable(data, start, loca) {
        var glyphs, i, offset, nextOffset;
        glyphs = [];
        // The last element of the loca table is invalid.
        for (i = 0; i < loca.length - 1; i += 1) {
            offset = loca[i];
            nextOffset = loca[i + 1];
            if (offset !== nextOffset) {
                glyphs.push(parseGlyph(data, start + offset));
            } else {
                glyphs.push({});
            }
        }
        return glyphs;
    }

    // Parse an OpenType glyph (described in the glyf table).
    // Due to the complexity of the parsing we can't define the glyf table declaratively.
    // The offset is the absolute byte offset of the glyph: the base of the glyph table + the relative offset of the glyph.
    // http://www.microsoft.com/typography/otspec/glyf.htm
    function parseGlyph(data, start) {
        var p, glyph, flag, i, j;
        p = new Parser(data, start);
        glyph = {};
        glyph.numberOfContours = p.parseShort();
        glyph.xMin = p.parseShort();
        glyph.yMin = p.parseShort();
        glyph.xMax = p.parseShort();
        glyph.yMax = p.parseShort();
        if (glyph.numberOfContours > 0) {
            // This glyph is not a composite.
            var endPointIndices = glyph.endPointIndices = [];
            for (i = 0; i < glyph.numberOfContours; i += 1) {
                endPointIndices.push(p.parseUShort());
            }

            glyph.instructionLength = p.parseUShort();
            glyph.instructions = [];
            for (i = 0; i < glyph.instructionLength; i += 1) {
                glyph.instructions.push(p.parseByte());
            }

            var numberOfCoordinates = endPointIndices[endPointIndices.length - 1] + 1;
            var flags = [];
            for (i = 0; i < numberOfCoordinates; i++) {
                flag = p.parseByte();
                flags.push(flag);
                // If bit 3 is set, we repeat this flag n times, where n is the next byte.
                if (isBitSet(flag, 3)) {
                    var repeatCount = p.parseByte();
                    for (j = 0; j < repeatCount; j += 1) {
                        flags.push(flag);
                        i++;
                    }
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
        } else if (glyph.numberOfContours === 0) {
            glyph.points = [];
        } else {
            // TODO Support composite glyphs
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
    // version where offsets are stored as uLongs. The `head` table specifies which version to use
    // (under indexToLocFormat).
    // https://www.microsoft.com/typography/OTSPEC/loca.htm
    function parseLocaTable(data, start, numGlyphs, shortVersion) {
        var p = new Parser(data, start);
        var parseFn = shortVersion ? p.parseUShort : p.parseULong;
        // There is an extra entry after the last index element to compute the length of the last glyph.
        // That's why we use numGlyphs + 1.
        var glyphOffsets = [];
        for (var i = 0; i < numGlyphs + 1; i++) {
            var glyphOffset = parseFn.call(p);
            if (shortVersion) {
                // The short table version stores the actual offset divided by 2.
                glyphOffset *= 2;
            }
            glyphOffsets.push(glyphOffset);
        }
        return glyphOffsets;
    }


    // Parse the `cmap` table. This table stores the mappings from characters to glyphs.
    // There are many available formats, but we only support the Windows format 4.
    // https://www.microsoft.com/typography/OTSPEC/cmap.htm
    function parseCmapTable(data, start) {
        var version, numTables, offset, platformId, encodingId, format, length, language, segCount,
            ranges, i, idRangeOffset;
        version = getUShort(data, start);
        console.assert(version === 0);

        // The cmap table can contain many sub-tables, each with their own format.
        // We're only interested in a "platform 1" table. This is a Windows format.
        numTables = getUShort(data, start + 2);
        offset = -1;
        for (i = 0; i < numTables; i++) {
            platformId = getUShort(data, start + 4 + (i * 8));
            encodingId = getUShort(data, start + 4 + (i * 8) + 2);
            if (platformId === 3 && (encodingId === 1 || encodingId === 0)) {
                offset = getULong(data, start + 4 + (i * 8) + 4);
                break;
            }
        }
        if (offset === -1) {
            throw new Error("Could not find supported cmap encoding.");
        }

        var p = new Parser(data, start + offset);
        format = p.parseUShort();
        console.assert(format == 4);
        // Length in bytes of the sub-tables.
        length = p.parseUShort();
        language = p.parseUShort();
        // segCount is stored x 2.
        segCount = p.parseUShort() / 2;
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
            ranges[i].length = ranges[i].end - ranges[i].start;
        }
        for (i = 0; i < segCount; i += 1) {
            ranges[i].idDelta = p.parseShort();
        }
        for (i = 0; i < segCount; i += 1) {
            idRangeOffset = p.parseUShort();
            if (idRangeOffset === 0) continue;
            ranges[i].ids = [];
            for (var j = 0; j < ranges[i].length; j++) {
                ranges[i].ids[j] = getUShort(data, start + p.relativeOffset + idRangeOffset);
                idRangeOffset += 2;
            }
            ranges[i].idDelta = p.parseUShort();
        }

        return ranges;
    }

    openType.Font = function () {
        this.glyphs = [];
    };

    openType.Font.prototype.characterToGlyphIndex = function (s) {
        var ranges = this.cmap;
        var code = s.charCodeAt(0);
        var l = 0, r = ranges.length - 1;
        while (l < r) {
            var c = (l + r + 1) >> 1;
            if (code < ranges[c].start) {
                r = c - 1;
            } else {
                l = c;
            }
        }
        if (ranges[l].start <= code && code <= ranges[l].end) {
            return (ranges[l].idDelta + (ranges[l].ids ?
                ranges[l].ids[code - ranges[l].start] : code)) & 0xFFFF;
        }
        return 0;
    };

    // Get a path representing the text.
    openType.Font.prototype.getPath = function (text) {
        var self = this;
        var glyphIndices = _.map(text, function (c) {
            return self.characterToGlyphIndex(c);
        });
        var glyphs = _.map(glyphIndices, function (i) {
            return self.glyphs[i] || self.glyphs[0];
        });
        var x = 0;
        var paths = _.map(glyphs, function (glyph) {
            var p = openType.glyphToPath(glyph, x);
            if (glyph.xMax && glyph.xMin) {
                x += glyph.xMax - glyph.xMin + 300;
            } else {
                x += 1000;
            }
            return p;
        });
        var path = new Path();
        _.each(paths, function (p) {
            path.commands.push.apply(path.commands, p.commands);
        });
        return path;
    };


    // Parse the OpenType file (as a buffer) and returns a Font object.
    openType.parseFont = function (buffer) {
        var data, numTables, i, p, tag, offset, length, cmap, glyfOffset, locaOffset, magicNumber, unitsPerEm,
            indexToLocFormat, numGlyphs, glyf, loca;
        // OpenType fonts use big endian byte ordering.
        // We can't rely on typed array view types, because they operate with the endianness of the host computer.
        // Instead we use DataViews where we can specify endianness.

        var font = new openType.Font();

        data = new DataView(buffer, 0);
        numTables = getUShort(data, 4);

        // Offset into the table records.
        p = 12;
        for (i = 0; i < numTables; i += 1) {
            tag = getTag(data, p);
            offset = getULong(data, p + 8);
            length = getULong(data, p + 12);
            switch (tag) {
                case 'cmap':
                    font.cmap = parseCmapTable(data, offset);
                    break;
                case 'glyf':
                    glyfOffset = offset;
                    break;
                case 'loca':
                    locaOffset = offset;
                    break;
                case 'head':
                    // We're only interested in some values from the header.
                    magicNumber = getULong(data, offset + 12);
                    checkArgument(magicNumber === 0x5F0F3CF5, 'Font header has wrong magic number.');
                    unitsPerEm = getUShort(data, offset + 18);
                    indexToLocFormat = getUShort(data, offset + 50);
                    break;
                case 'maxp':
                    // We're only interested in the number of glyphs.
                    numGlyphs = getUShort(data, offset + 4);
                    break;
            }
            p += 16;
        }

        if (glyfOffset && locaOffset) {
            var shortVersion = indexToLocFormat === 0;
            loca = parseLocaTable(data, locaOffset, numGlyphs, shortVersion);
            font.glyphs = parseGlyfTable(data, glyfOffset, loca);
        }

        return font;
    };

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
    openType.glyphToPath = function (glyph, tx, ty) {
        var path, contours, pt, firstPt, prevPt, midPt, curvePt;
        if (typeof tx === 'undefined') {
            tx = 0;
        }
        if (typeof ty === 'undefined') {
            ty = 0;
        }
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
                        path.moveTo(tx + pt.x, ty - pt.y);
                        curvePt = null;
                    } else {
                        midPt = { x: (prevPt.x + pt.x) / 2, y: (prevPt.y + pt.y) / 2 };
                        curvePt = midPt;
                        path.moveTo(tx + midPt.x, ty - midPt.y);
                    }
                } else {
                    if (prevPt.onCurve && pt.onCurve) {
                        // This is a straight line.
                        path.lineTo(tx + pt.x, ty - pt.y);
                    } else if (prevPt.onCurve && !pt.onCurve) {
                        curvePt = pt;
                    } else if (!prevPt.onCurve && !pt.onCurve) {
                        midPt = { x: (prevPt.x + pt.x) / 2, y: (prevPt.y + pt.y) / 2 };
                        path.quadraticCurveTo(tx + prevPt.x, ty - prevPt.y, tx + midPt.x, ty - midPt.y);
                        curvePt = pt;
                    } else if (!prevPt.onCurve && pt.onCurve) {
                        // Previous point off-curve, this point on-curve.
                        path.quadraticCurveTo(tx + curvePt.x, ty - curvePt.y, tx + pt.x, ty - pt.y);
                        curvePt = null;
                    } else {
                        throw new Error("Invalid state.");
                    }
                }

            }
            // Connect the last and first points
            if (curvePt) {
                path.quadraticCurveTo(tx + curvePt.x, ty - curvePt.y, tx + firstPt.x, ty - firstPt.y);
            } else {
                path.lineTo(tx + firstPt.x, ty - firstPt.y);
            }
        });
        path.closePath();
        return path;
    };

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

    openType.drawGlyphPoints = function (glyph, ctx) {
        _.each(glyph.points, function (pt) {
            if (pt.onCurve) {
                ctx.fillStyle = 'blue';
            } else {
                ctx.fillStyle = 'red';
            }
            ellipse(ctx, pt.x, -pt.y, 60, 60);
        });
    };

    openType.drawGlyphBox = function (glyph, ctx) {
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 5;
        line(ctx, glyph.xMin, -10000, glyph.xMin, 10000);
        line(ctx, glyph.xMax, -10000, glyph.xMax, 10000);
        line(ctx, -10000, -glyph.yMin, 10000, -glyph.yMin);
        line(ctx, -10000, -glyph.yMax, 10000, -glyph.yMax);
    };

    // Create a canvas and adds it to the document.
    // Returns the 2d drawing context.
    openType.createCanvas = function (size, glyphIndex) {
        var canvasId = 'c' + glyphIndex;
        var html = '<div class="wrapper" style="width:' + size + 'px"><canvas id="' + canvasId + '" width="' + size + '" height="' + size + '"></canvas><span>' + glyphIndex + '</span></div>';
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

}).call(this);
