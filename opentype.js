//     opentype.js 0.0.1
//     https://github.com/nodebox/opentype.js
//     (c) 2013 Frederik De Bleser
//     opentype.js may be freely distributed under the MIT license.

/*jslint bitwise: true */
/*global exports,DataView,document */
(function (exports) {
    'use strict';

    var opentype, dataTypes, typeOffsets;

    opentype = exports;

    // Precondition function that checks if the given predicate is true.
    // If not, it will log an error message to the console.
    function checkArgument(predicate, message) {
        if (!predicate) {
            throw new Error(message);
        }
    }

    function Path() {
        this.commands = [];
        this.fill = 'black';
        this.stroke = null;
        this.strokeWidth = 1;
    }

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

    Path.prototype.extend = function (pathOrCommands) {
        if (pathOrCommands.commands) {
            pathOrCommands = pathOrCommands.commands;
        }
        this.commands.push.apply(this.commands, pathOrCommands);
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

    Path.prototype.drawPoints = function (ctx) {
        var i, cmd, blueCircles, redCircles;
        blueCircles = [];
        redCircles = [];
        for (i = 0; i < this.commands.length; i += 1) {
            cmd = this.commands[i];
            if (cmd.type === 'M') {
                blueCircles.push(cmd);
            } else if (cmd.type === 'L') {
                blueCircles.push(cmd);
            } else if (cmd.type === 'C') {
                redCircles.push(cmd);
            } else if (cmd.type === 'Q') {
                redCircles.push(cmd);
            }
        }
        function drawCircles(l) {
            var j, PI_SQ = Math.PI * 2;
            ctx.beginPath();
            for (j = 0; j < l.length; j += 1) {
                ctx.moveTo(l[j].x, l[j].y);
                ctx.arc(l[j].x, l[j].y, 2, 0, PI_SQ, false);

            }
            ctx.closePath();
            ctx.fill();
        }

        ctx.fillStyle = 'blue';
        drawCircles(blueCircles);
        ctx.fillStyle = 'red';
        drawCircles(redCircles);
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

    dataTypes = {
        byte: getByte,
        uShort: getUShort,
        short: getShort,
        uLong: getULong,
        fixed: getFixed,
        longDateTime: getLongDateTime,
        tag: getTag
    };


    typeOffsets = {
        byte: 1,
        uShort: 2,
        short: 2,
        uLong: 4,
        fixed: 4,
        longDateTime: 8,
        tag: 4
    };

    // A stateful parser that changes the offset whenever a value is retrieved.
    function Parser(dataView, offset) {
        this.dataView = dataView;
        this.offset = offset;
        this.relativeOffset = 0;
    }

    Parser.prototype.parse = function (type) {
        var parseFn, v;
        parseFn = dataTypes[type];
        v = parseFn(this.dataView, this.offset + this.relativeOffset);
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
        if (amount === undefined) {
            amount = 1;
        }
        this.relativeOffset += typeOffsets[type] * amount;
    };

    // Return true if the value at the given bit index is set.
    function isBitSet(b, bitIndex) {
        return ((b >> bitIndex) & 1) === 1;
    }

    // Parse the coordinate data for a glyph.
    function parseGlyphCoordinate(p, flag, previousValue, shortVectorBit, sameBit) {
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

    // Parse an OpenType glyph (described in the glyf table).
    // Due to the complexity of the parsing we can't define the glyf table declaratively.
    // The offset is the absolute byte offset of the glyph: the base of the glyph table + the relative offset of the glyph.
    // http://www.microsoft.com/typography/otspec/glyf.htm
    function parseGlyph(data, start, index) {
        var p, glyph, flag, i, j, flags,
            endPointIndices, numberOfCoordinates, repeatCount, points, point, px, py,
            component, moreComponents, arg1, arg2, scale, xScale, yScale, scale01, scale10;
        p = new Parser(data, start);
        glyph = {};
        glyph.index = index;
        glyph.numberOfContours = p.parseShort();
        glyph.xMin = p.parseShort();
        glyph.yMin = p.parseShort();
        glyph.xMax = p.parseShort();
        glyph.yMax = p.parseShort();
        if (glyph.numberOfContours > 0) {
            // This glyph is not a composite.
            endPointIndices = glyph.endPointIndices = [];
            for (i = 0; i < glyph.numberOfContours; i += 1) {
                endPointIndices.push(p.parseUShort());
            }

            glyph.instructionLength = p.parseUShort();
            glyph.instructions = [];
            for (i = 0; i < glyph.instructionLength; i += 1) {
                glyph.instructions.push(p.parseByte());
            }

            numberOfCoordinates = endPointIndices[endPointIndices.length - 1] + 1;
            flags = [];
            for (i = 0; i < numberOfCoordinates; i += 1) {
                flag = p.parseByte();
                flags.push(flag);
                // If bit 3 is set, we repeat this flag n times, where n is the next byte.
                if (isBitSet(flag, 3)) {
                    repeatCount = p.parseByte();
                    for (j = 0; j < repeatCount; j += 1) {
                        flags.push(flag);
                        i += 1;
                    }
                }
            }
            checkArgument(flags.length === numberOfCoordinates, 'Bad flags.');

            if (endPointIndices.length > 0) {
                points = [];
                // X/Y coordinates are relative to the previous point, except for the first point which is relative to 0,0.
                if (numberOfCoordinates > 0) {
                    for (i = 0; i < numberOfCoordinates; i += 1) {
                        flag = flags[i];
                        point = {};
                        point.onCurve = isBitSet(flag, 0);
                        point.lastPointOfContour = endPointIndices.indexOf(i) >= 0;
                        points.push(point);
                    }
                    px = 0;
                    for (i = 0; i < numberOfCoordinates; i += 1) {
                        flag = flags[i];
                        point = points[i];
                        point.x = parseGlyphCoordinate(p, flag, px, 1, 4);
                        px = point.x;
                    }

                    py = 0;
                    for (i = 0; i < numberOfCoordinates; i += 1) {
                        flag = flags[i];
                        point = points[i];
                        point.y = parseGlyphCoordinate(p, flag, py, 2, 5);
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
            glyph.isComposite = true;
            glyph.points = [];
            glyph.components = [];
            moreComponents = true;
            while (moreComponents) {
                component = {};
                flags = p.parseUShort();
                component.glyphIndex = p.parseUShort();
                if (isBitSet(flags, 0)) {
                    // The arguments are words
                    arg1 = p.parseShort();
                    arg2 = p.parseShort();
                    component.dx = arg1;
                    component.dy = arg2;
                } else {
                    // The arguments are bytes
                    arg1 = p.parseByte();
                    arg2 = p.parseByte();
                    component.dx = arg1;
                    component.dy = arg2;
                }
                if (isBitSet(flags, 3)) {
                    // We have a scale
                    // TODO parse in 16-bit signed fixed number with the low 14 bits of fraction (2.14).
                    scale = p.parseShort();
                } else if (isBitSet(flags, 6)) {
                    // We have an X / Y scale
                    xScale = p.parseShort();
                    yScale = p.parseShort();
                } else if (isBitSet(flags, 7)) {
                    // We have a 2x2 transformation
                    xScale = p.parseShort();
                    scale01 = p.parseShort();
                    scale10 = p.parseShort();
                    yScale = p.parseShort();
                }

                glyph.components.push(component);
                moreComponents = isBitSet(flags, 5);
            }
        }
        return glyph;
    }

    // Transform an array of points and return a new array.
    function transformPoints(points, dx, dy) {
        var newPoints, i, pt, newPt;
        newPoints = [];
        for (i = 0; i < points.length; i += 1) {
            pt = points[i];
            newPt = {
                x: pt.x + dx,
                y: pt.y + dy,
                onCurve: pt.onCurve,
                lastPointOfContour: pt.lastPointOfContour
            };
            newPoints.push(newPt);
        }
        return newPoints;
    }

    // Parse all the glyphs according to the offsets from the `loca` table.
    function parseGlyfTable(data, start, loca) {
        var glyphs, i, j, offset, nextOffset, glyph,
            component, componentGlyph, transformedPoints;
        glyphs = [];
        // The last element of the loca table is invalid.
        for (i = 0; i < loca.length - 1; i += 1) {
            offset = loca[i];
            nextOffset = loca[i + 1];
            if (offset !== nextOffset) {
                glyphs.push(parseGlyph(data, start + offset, i));
            } else {
                glyphs.push({index: i, numberOfContours: 0, xMin: 0, xMax: 0, yMin: 0, yMax: 0});
            }
        }
        // Go over the glyphs again, resolving the composite glyphs.
        for (i = 0; i < glyphs.length; i += 1) {
            glyph = glyphs[i];
            if (glyph.isComposite) {
                for (j = 0; j < glyph.components.length; j += 1) {
                    component = glyph.components[j];
                    componentGlyph = glyphs[component.glyphIndex];
                    if (componentGlyph.points) {
                        transformedPoints = transformPoints(componentGlyph.points, component.dx, component.dy);
                        glyph.points.push.apply(glyph.points, transformedPoints);
                    }
                }
            }
        }

        return glyphs;
    }

    // Parse the `loca` table. This table stores the offsets to the locations of the glyphs in the font,
    // relative to the beginning of the glyphData table.
    // The number of glyphs stored in the `loca` table is specified in the `maxp` table (under numGlyphs)
    // The loca table has two versions: a short version where offsets are stored as uShorts, and a long
    // version where offsets are stored as uLongs. The `head` table specifies which version to use
    // (under indexToLocFormat).
    // https://www.microsoft.com/typography/OTSPEC/loca.htm
    function parseLocaTable(data, start, numGlyphs, shortVersion) {
        var p, parseFn, glyphOffsets, glyphOffset, i;
        p = new Parser(data, start);
        parseFn = shortVersion ? p.parseUShort : p.parseULong;
        // There is an extra entry after the last index element to compute the length of the last glyph.
        // That's why we use numGlyphs + 1.
        glyphOffsets = [];
        for (i = 0; i < numGlyphs + 1; i += 1) {
            glyphOffset = parseFn.call(p);
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
        var version, numTables, offset, platformId, encodingId, format, segCount,
            ranges, i, j, idRangeOffset, p;
        version = getUShort(data, start);
        checkArgument(version === 0, "cmap table version should be 0.");

        // The cmap table can contain many sub-tables, each with their own format.
        // We're only interested in a "platform 1" table. This is a Windows format.
        numTables = getUShort(data, start + 2);
        offset = -1;
        for (i = 0; i < numTables; i += 1) {
            platformId = getUShort(data, start + 4 + (i * 8));
            encodingId = getUShort(data, start + 4 + (i * 8) + 2);
            if (platformId === 3 && (encodingId === 1 || encodingId === 0)) {
                offset = getULong(data, start + 4 + (i * 8) + 4);
                break;
            }
        }
        if (offset === -1) {
            // There is no cmap table in the font that we support, so return null.
            // This font will be marked as unsupported.
            return null;
        }

        p = new Parser(data, start + offset);
        format = p.parseUShort();
        checkArgument(format === 4, "Only format 4 cmap tables are supported.");
        // Length in bytes of the sub-tables.
        // Skip length and language;
        p.skip('uShort', 2);
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
            if (idRangeOffset > 0) {
                ranges[i].ids = [];
                for (j = 0; j < ranges[i].length; j += 1) {
                    ranges[i].ids[j] = getUShort(data, start + p.relativeOffset + idRangeOffset);
                    idRangeOffset += 2;
                }
                ranges[i].idDelta = p.parseUShort();
            }
        }

        return ranges;
    }

    // Parse the `hmtx` table, which contains the horizontal metrics for all glyphs.
    // This function augments the glyph array, adding the advanceWidth and leftSideBearing to each glyph.
    // https://www.microsoft.com/typography/OTSPEC/hmtx.htm
    function parseHmtxTable(data, start, numMetrics, numGlyphs, glyphs) {
        var p, i, glyph, advanceWidth, leftSideBearing;
        p = new Parser(data, start);
        for (i = 0; i < numGlyphs; i += 1) {
            // If the font is monospaced, only one entry is needed. This last entry applies to all subsequent glyphs.
            if (i < numMetrics) {
                advanceWidth = p.parseUShort();
                leftSideBearing = p.parseShort();
            }
            glyph = glyphs[i];
            glyph.advanceWidth = advanceWidth;
            glyph.leftSideBearing = leftSideBearing;
        }
    }

    // Parse the `kern` table which contains kerning pairs.
    // Note that some fonts use the GPOS OpenType layout table to specify kerning.
    // https://www.microsoft.com/typography/OTSPEC/kern.htm
    function parseKernTable(data, start) {
        var pairs, p, tableVersion, nTables, subTableVersion, nPairs,
            i, leftIndex, rightIndex, value;
        pairs = {};
        p = new Parser(data, start);
        tableVersion = p.parseUShort();
        checkArgument(tableVersion === 0, "Unsupported kern table version.");
        nTables = p.parseUShort();
        checkArgument(nTables === 1, "Unsupported number of kern sub-tables.");
        subTableVersion = p.parseUShort();
        checkArgument(subTableVersion === 0, "Unsupported kern sub-table version.");
        // Skip subTableLength, subTableCoverage
        p.skip('uShort', 2);
        nPairs = p.parseUShort();
        // Skip searchRange, entrySelector, rangeShift.
        p.skip('uShort', 3);
        for (i = 0; i < nPairs; i += 1) {
            leftIndex = p.parseUShort();
            rightIndex = p.parseUShort();
            value = p.parseShort();
            pairs[leftIndex + ',' + rightIndex] = value;
        }
        return pairs;
    }

    opentype.Font = function () {
        this.supported = true;
        this.glyphs = [];
    };

    opentype.Font.prototype.charToGlyphIndex = function (s) {
        var ranges, code, l, c, r;
        ranges = this.cmap;
        code = s.charCodeAt(0);
        l = 0;
        r = ranges.length - 1;
        while (l < r) {
            c = (l + r + 1) >> 1;
            if (code < ranges[c].start) {
                r = c - 1;
            } else {
                l = c;
            }
        }
        if (ranges[l].start <= code && code <= ranges[l].end) {
            return (ranges[l].idDelta + (ranges[l].ids ? ranges[l].ids[code - ranges[l].start] : code)) & 0xFFFF;
        }
        return 0;
    };

    opentype.Font.prototype.charToGlyph = function (c) {
        var glyphIndex, glyph;
        glyphIndex = this.charToGlyphIndex(c);
        glyph = this.glyphs[glyphIndex];
        checkArgument(glyph !== undefined, 'Could not find glyph for character ' + c + ' glyph index ' + glyphIndex);
        return glyph;
    };

    opentype.Font.prototype.stringToGlyphs = function (s) {
        var i, c, glyphs;
        glyphs = [];
        for (i = 0; i < s.length; i += 1) {
            c = s[i];
            glyphs.push(this.charToGlyph(c));
        }
        return glyphs;
    };

    opentype.Font.prototype.getKerningValue = function (leftGlyph, rightGlyph) {
        leftGlyph = leftGlyph.index || leftGlyph;
        rightGlyph = rightGlyph.index || rightGlyph;
        return this.kerningPairs[leftGlyph + ',' + rightGlyph] || 0;
    };

    // Get a path representing the text.
    opentype.Font.prototype.getPath = function (text, options) {
        var x, y, fontSize, kerning, fontScale, glyphs, i, glyph, path, fullPath, kerningValue;
        if (!this.supported) {
            return new Path();
        }
        options = options || {};
        x = options.x || 0;
        y = options.y || 0;
        fontSize = options.fontSize || 72;
        kerning = options.kerning === undefined ? true : options.kerning;
        fontScale = 1 / this.unitsPerEm * fontSize;
        x /= fontScale;
        y /= fontScale;
        glyphs = this.stringToGlyphs(text);
        fullPath = new Path();
        for (i = 0; i < glyphs.length; i += 1) {
            glyph = glyphs[i];
            path = opentype.glyphToPath(glyph, x, y, fontScale);
            fullPath.extend(path);
            if (glyph.advanceWidth) {
                x += glyph.advanceWidth;
            }
            if (kerning && i < glyphs.length - 1) {
                kerningValue = this.getKerningValue(glyph, glyphs[i + 1]);
                x += kerningValue;
            }
        }
        return fullPath;
    };


    // Parse the OpenType file (as a buffer) and returns a Font object.
    opentype.parseFont = function (buffer) {
        var font, data, numTables, i, p, tag, offset, length, hmtxOffset, glyfOffset, locaOffset, kernOffset,
            magicNumber, indexToLocFormat, numGlyphs, glyf, loca, shortVersion;
        // OpenType fonts use big endian byte ordering.
        // We can't rely on typed array view types, because they operate with the endianness of the host computer.
        // Instead we use DataViews where we can specify endianness.

        font = new opentype.Font();

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
                if (!font.cmap) {
                    font.cmap = [];
                    font.supported = false;
                }
                break;
            case 'head':
                // We're only interested in some values from the header.
                magicNumber = getULong(data, offset + 12);
                checkArgument(magicNumber === 0x5F0F3CF5, 'Font header has wrong magic number.');
                font.unitsPerEm = getUShort(data, offset + 18);
                indexToLocFormat = getUShort(data, offset + 50);
                break;
            case 'hhea':
                font.ascender = getShort(data, offset + 4);
                font.descender = getShort(data, offset + 6);
                font.numberOfHMetrics = getUShort(data, offset + 34);
                break;
            case 'hmtx':
                hmtxOffset = offset;
                break;
            case 'maxp':
                // We're only interested in the number of glyphs.
                font.numGlyphs = numGlyphs = getUShort(data, offset + 4);
                break;
            case 'glyf':
                glyfOffset = offset;
                break;
            case 'loca':
                locaOffset = offset;
                break;
            case 'kern':
                kernOffset = offset;
                break;
            }
            p += 16;
        }

        if (glyfOffset && locaOffset) {
            shortVersion = indexToLocFormat === 0;
            loca = parseLocaTable(data, locaOffset, numGlyphs, shortVersion);
            font.glyphs = parseGlyfTable(data, glyfOffset, loca);
            parseHmtxTable(data, hmtxOffset, font.numberOfHMetrics, font.numGlyphs, font.glyphs);
            if (kernOffset) {
                font.kerningPairs = parseKernTable(data, kernOffset);
            } else {
                font.kerningPairs = {};
            }
        } else {
            font.supported = false;
        }

        return font;
    };

    opentype.loadFont = function(pathToFont, success, error) {
        var req = new XMLHttpRequest();
        req.open('get', pathToFont, true);
        req.responseType = 'arraybuffer';
        req.onload = function() {
            var errorMessage;
            if (req.status >= 400) {
                errorMessage = 'Font could not been loaded'
            }
            var arrayBuffer = req.response;
            var font = opentype.parseFont(arrayBuffer);
            if (!font.supported) {
                errorMessage = 'Loaded font is not supported'
            }
            if (errorMessage) {
                error(errorMessage);
            } else {
                success(font)
            }
        };
        req.send();
    }

    // Split the glyph into contours.
    function getContours(glyph) {
        var contours, currentContour, i, pt;
        contours = [];
        currentContour = [];
        for (i = 0; i < glyph.points.length; i += 1) {
            pt = glyph.points[i];
            currentContour.push(pt);
            if (pt.lastPointOfContour) {
                contours.push(currentContour);
                currentContour = [];
            }
        }
        checkArgument(currentContour.length === 0, "There are still points left in the current contour.");
        return contours;
    }

    // Convert the glyph to a Path we can draw on a Canvas context.
    opentype.glyphToPath = function (glyph, tx, ty, scale) {
        var path, contours, i, j, contour, pt, firstPt, prevPt, midPt, curvePt;
        if (tx === undefined) {
            tx = 0;
        }
        if (ty === undefined) {
            ty = 0;
        }
        if (scale === undefined) {
            scale = 1;
        }
        path = new Path();
        if (!glyph.points) {
            return path;
        }
        contours = getContours(glyph);
        for (i = 0; i < contours.length; i += 1) {
            contour = contours[i];
            firstPt = contour[0];
            curvePt = null;
            for (j = 0; j < contour.length; j += 1) {
                pt = contour[j];
                prevPt = j === 0 ? contour[contour.length - 1] : contour[j - 1];

                if (j === 0) {
                    // This is the first point of the contour.
                    if (pt.onCurve) {
                        path.moveTo((tx + pt.x) * scale, (ty - pt.y) * scale);
                        curvePt = null;
                    } else {
                        midPt = { x: (prevPt.x + pt.x) / 2, y: (prevPt.y + pt.y) / 2 };
                        curvePt = midPt;
                        path.moveTo((tx + midPt.x) * scale, (ty - midPt.y) * scale);
                    }
                } else {
                    if (prevPt.onCurve && pt.onCurve) {
                        // This is a straight line.
                        path.lineTo((tx + pt.x) * scale, (ty - pt.y) * scale);
                    } else if (prevPt.onCurve && !pt.onCurve) {
                        curvePt = pt;
                    } else if (!prevPt.onCurve && !pt.onCurve) {
                        midPt = { x: (prevPt.x + pt.x) / 2, y: (prevPt.y + pt.y) / 2 };
                        path.quadraticCurveTo((tx + prevPt.x) * scale, (ty - prevPt.y) * scale, (tx + midPt.x) * scale, (ty - midPt.y) * scale);
                        curvePt = pt;
                    } else if (!prevPt.onCurve && pt.onCurve) {
                        // Previous point off-curve, this point on-curve.
                        path.quadraticCurveTo((tx + curvePt.x) * scale, (ty - curvePt.y) * scale, (tx + pt.x) * scale, (ty - pt.y) * scale);
                        curvePt = null;
                    } else {
                        throw new Error("Invalid state.");
                    }
                }

            }
            // Connect the last and first points
            if (curvePt) {
                path.quadraticCurveTo((tx + curvePt.x) * scale, (ty - curvePt.y) * scale, (tx + firstPt.x) * scale, (ty - firstPt.y) * scale);
            } else {
                path.lineTo((tx + firstPt.x) * scale, (ty - firstPt.y) * scale);
            }
        }
        path.closePath();
        return path;
    };

    function line(ctx, x1, y1, x2, y2) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    function circle(ctx, cx, cy, r) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2, false);
        ctx.closePath();
        ctx.fill();
    }

    opentype.drawGlyphPoints = function (ctx, glyph) {
        var points, i, pt;
        points = glyph.points;
        if (!points) {
            return;
        }
        for (i = 0; i < points.length; i += 1) {
            pt = points[i];
            if (pt.onCurve) {
                ctx.fillStyle = 'blue';
            } else {
                ctx.fillStyle = 'red';
            }
            circle(ctx, pt.x, -pt.y, 40);
        }
    };

    opentype.drawMetrics = function (ctx, glyph) {
        ctx.lineWidth = 10;
        // Draw the origin
        ctx.strokeStyle = 'black';
        line(ctx, 0, -10000, 0, 10000);
        line(ctx, -10000, 0, 10000, 0);
        // Draw the glyph box
        ctx.strokeStyle = 'blue';
        line(ctx, glyph.xMin, -10000, glyph.xMin, 10000);
        line(ctx, glyph.xMax, -10000, glyph.xMax, 10000);
        line(ctx, -10000, -glyph.yMin, 10000, -glyph.yMin);
        line(ctx, -10000, -glyph.yMax, 10000, -glyph.yMax);
        // Draw the advance width
        ctx.strokeStyle = 'green';
        line(ctx, glyph.advanceWidth, -10000, glyph.advanceWidth, 10000);
    };

}(typeof exports === 'undefined' ? this.opentype = {} : exports));
