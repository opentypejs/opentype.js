// opentype.js 0.0.1
// https://github.com/nodebox/opentype.js
// (c) 2013 Frederik De Bleser
// opentype.js may be freely distributed under the MIT license.

/*jslint bitwise: true */
/*global module,define,DataView,XMLHttpRequest */
(function () {
    'use strict';

    var root, opentype, typeOffsets;

    // Establish the root object, `window` in the browser or `exports` on the server.
    root = this;

    // The exported object / namespace.
    opentype = {};

    // Precondition function that checks if the given predicate is true.
    // If not, it will log an error message to the console.
    function checkArgument(predicate, message) {
        if (!predicate) {
            throw new Error(message);
        }
    }

    // Path /////////////////////////////////////////////////////////////////

    // A bézier path containing a set of path commands similar to a SVG path.
    // Paths can be drawn on a context using `draw`.
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

    // Add the given path or list of commands to the commands of this path.
    Path.prototype.extend = function (pathOrCommands) {
        if (pathOrCommands.commands) {
            pathOrCommands = pathOrCommands.commands;
        }
        Array.prototype.push.apply(this.commands, pathOrCommands);
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

    // Draw a line on the given context from point `x1,y1` to point `x2,y2`.
    function line(ctx, x1, y1, x2, y2) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    // Parsing utility functions ////////////////////////////////////////////

    // Retrieve an unsigned byte from the DataView.
    function getByte(dataView, offset) {
        return dataView.getUint8(offset);
    }

    // Retrieve an unsigned 16-bit short from the DataView.
    // The value is stored in big endian.
    function getUShort(dataView, offset) {
        return dataView.getUint16(offset, false);
    }

    // Retrieve a signed 16-bit short from the DataView.
    // The value is stored in big endian.
    function getShort(dataView, offset) {
        return dataView.getInt16(offset, false);
    }

    // Retrieve an unsigned 32-bit long from the DataView.
    // The value is stored in big endian.
    function getULong(dataView, offset) {
        return dataView.getUint32(offset, false);
    }

    // Retrieve a 32-bit signed fixed-point number (16.16) from the DataView.
    // The value is stored in big endian.
    function getFixed(dataView, offset) {
        var decimal, fraction;
        decimal = dataView.getInt16(offset, false);
        fraction = dataView.getUint16(offset + 2, false);
        return decimal + fraction / 65535;
    }

    // Retrieve a date-time from the DataView.
    function getLongDateTime(dataView, offset) {
        var v1, v2;
        v1 = dataView.getUint32(offset, false);
        v2 = dataView.getUint32(offset + 1, false);
        return [v1, v2];
    }

    // Retrieve a 4-character tag from the DataView.
    // Tags are used to identify tables.
    function getTag(dataView, offset) {
        var tag = '', i;
        for (i = offset; i < offset + 4; i += 1) {
            tag += String.fromCharCode(dataView.getInt8(i));
        }
        return tag;
    }

    typeOffsets = {
        byte: 1,
        uShort: 2,
        short: 2,
        uLong: 4,
        fixed: 4,
        longDateTime: 8,
        tag: 4
    };

    // Return true if the value at the given bit index is set.
    function isBitSet(b, bitIndex) {
        return ((b >> bitIndex) & 1) === 1;
    }

    // A stateful parser that changes the offset whenever a value is retrieved.
    function Parser(dataView, offset) {
        this.dataView = dataView;
        this.offset = offset;
        this.relativeOffset = 0;
    }

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

    // Glyph object /////////////////////////////////////////////////////////

    // A Glyph is an individual mark that often corresponds to a character.
    // Some glyphs, such as ligatures, are a combination of many characters.
    // Glyphs are the basic building blocks of a font.
    function Glyph(font, index) {
        this.font = font;
        this.index = index;
        this.numberOfContours = 0;
        this.xMin = this.yMin = this.xMax = this.yMax = 0;
        this.points = [];
    }

    // Split the glyph into contours.
    Glyph.prototype.getContours = function () {
        var contours, currentContour, i, pt;
        contours = [];
        currentContour = [];
        for (i = 0; i < this.points.length; i += 1) {
            pt = this.points[i];
            currentContour.push(pt);
            if (pt.lastPointOfContour) {
                contours.push(currentContour);
                currentContour = [];
            }
        }
        checkArgument(currentContour.length === 0, "There are still points left in the current contour.");
        return contours;
    };

    // Convert the glyph to a Path we can draw on a drawing context.
    //
    // x - Horizontal position of the glyph. (default: 0)
    // y - Vertical position of the *baseline* of the glyph. (default: 0)
    // fontSize - Font size, in pixels (default: 72).
    Glyph.prototype.getPath = function (x, y, fontSize) {
        var scale, path, contours, i, j, contour, pt, firstPt, prevPt, midPt, curvePt;
        x = x !== undefined ? x : 0;
        y = y !== undefined ? y : 0;
        fontSize = fontSize !== undefined ? fontSize : 72;
        scale = 1 / this.font.unitsPerEm * fontSize;
        path = new Path();
        if (!this.points) {
            return path;
        }
        contours = this.getContours();
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
                        path.moveTo(x + (pt.x * scale), y + (-pt.y * scale));
                        curvePt = null;
                    } else {
                        midPt = { x: (prevPt.x + pt.x) / 2, y: (prevPt.y + pt.y) / 2 };
                        curvePt = midPt;
                        path.moveTo(x + (midPt.x * scale), y + (-midPt.y * scale));
                    }
                } else {
                    if (prevPt.onCurve && pt.onCurve) {
                        // This is a straight line.
                        path.lineTo(x + (pt.x * scale), y + (-pt.y * scale));
                    } else if (prevPt.onCurve && !pt.onCurve) {
                        curvePt = pt;
                    } else if (!prevPt.onCurve && !pt.onCurve) {
                        midPt = { x: (prevPt.x + pt.x) / 2, y: (prevPt.y + pt.y) / 2 };
                        path.quadraticCurveTo(x + (prevPt.x * scale), y + (-prevPt.y * scale), x + (midPt.x * scale), y + (-midPt.y * scale));
                        curvePt = pt;
                    } else if (!prevPt.onCurve && pt.onCurve) {
                        // Previous point off-curve, this point on-curve.
                        path.quadraticCurveTo(x + (curvePt.x * scale), y + (-curvePt.y * scale), x + (pt.x * scale), y + (-pt.y * scale));
                        curvePt = null;
                    } else {
                        throw new Error("Invalid state.");
                    }
                }

            }
            // Connect the last and first points
            if (curvePt) {
                path.quadraticCurveTo(x + (curvePt.x * scale), y + (-curvePt.y * scale), x + (firstPt.x * scale), y + (-firstPt.y * scale));
            } else {
                path.lineTo(x + (firstPt.x * scale), y + (-firstPt.y * scale));
            }
        }
        path.closePath();
        return path;
    };

    // Draw the glyph on the given context.
    //
    // ctx - The drawing context.
    // x - Horizontal position of the glyph. (default: 0)
    // y - Vertical position of the *baseline* of the glyph. (default: 0)
    // fontSize - Font size, in pixels (default: 72).
    Glyph.prototype.draw = function (ctx, x, y, fontSize) {
        this.getPath(x, y, fontSize).draw(ctx);
    };

    // Draw the points of the glyph.
    // On-curve points will be drawn in blue, off-curve points will be drawn in red.
    //
    // ctx - The drawing context.
    // x - Horizontal position of the glyph. (default: 0)
    // y - Vertical position of the *baseline* of the glyph. (default: 0)
    // fontSize - Font size, in pixels (default: 72).
    Glyph.prototype.drawPoints = function (ctx, x, y, fontSize) {

        function drawCircles(l, x, y, scale) {
            var j, PI_SQ = Math.PI * 2;
            ctx.beginPath();
            for (j = 0; j < l.length; j += 1) {
                ctx.moveTo(x + (l[j].x * scale), y + (-l[j].y * scale));
                ctx.arc(x + (l[j].x * scale), y + (-l[j].y * scale), 2, 0, PI_SQ, false);
            }
            ctx.closePath();
            ctx.fill();
        }

        var scale, points, i, pt, blueCircles, redCircles;
        x = x !== undefined ? x : 0;
        y = y !== undefined ? y : 0;
        fontSize = fontSize !== undefined ? fontSize : 24;
        scale = 1 / this.font.unitsPerEm * fontSize;
        points = this.points;
        if (!points) {
            return;
        }

        blueCircles = [];
        redCircles = [];
        for (i = 0; i < points.length; i += 1) {
            pt = points[i];
            if (pt.onCurve) {
                blueCircles.push(pt);
            } else {
                redCircles.push(pt);
            }
        }

        ctx.fillStyle = 'blue';
        drawCircles(blueCircles, x, y, scale);
        ctx.fillStyle = 'red';
        drawCircles(redCircles, x, y, scale);
    };

    // Draw lines indicating important font measurements.
    // Black lines indicate the origin of the coordinate system (point 0,0).
    // Blue lines indicate the glyph bounding box.
    // Green line indicates the advance width of the glyph.
    //
    // ctx - The drawing context.
    // x - Horizontal position of the glyph. (default: 0)
    // y - Vertical position of the *baseline* of the glyph. (default: 0)
    // fontSize - Font size, in pixels (default: 72).
    Glyph.prototype.drawMetrics = function (ctx, x, y, fontSize) {
        var scale;
        x = x !== undefined ? x : 0;
        y = y !== undefined ? y : 0;
        fontSize = fontSize !== undefined ? fontSize : 24;
        scale = 1 / this.font.unitsPerEm * fontSize;
        ctx.lineWidth = 1;
        // Draw the origin
        ctx.strokeStyle = 'black';
        line(ctx, x, -10000, x, 10000);
        line(ctx, -10000, y, 10000, y);
        // Draw the glyph box
        ctx.strokeStyle = 'blue';
        line(ctx, x + (this.xMin * scale), -10000, x + (this.xMin * scale), 10000);
        line(ctx, x + (this.xMax * scale), -10000, x + (this.xMax * scale), 10000);
        line(ctx, -10000, y + (-this.yMin * scale), 10000, y + (-this.yMin * scale));
        line(ctx, -10000, y + (-this.yMax * scale), 10000, y + (-this.yMax * scale));
        // Draw the advance width
        ctx.strokeStyle = 'green';
        line(ctx, x + (this.advanceWidth * scale), -10000, x + (this.advanceWidth * scale), 10000);
    };

    // Font object //////////////////////////////////////////////////////////

    // A Font represents a loaded OpenType font file.
    // It contains a set of glyphs and methods to draw text on a drawing context,
    // or to get a path representing the text.
    function Font() {
        this.supported = true;
        this.glyphs = [];
    }

    // Convert the given character to a single glyph index.
    // Note that this function assumes that there is a one-to-one mapping between
    // the given character and a glyph; for complex scripts this might not be the case.
    Font.prototype.charToGlyphIndex = function (s) {
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

    // Convert the given character to a single Glyph object.
    // Note that this function assumes that there is a one-to-one mapping between
    // the given character and a glyph; for complex scripts this might not be the case.
    Font.prototype.charToGlyph = function (c) {
        var glyphIndex, glyph;
        glyphIndex = this.charToGlyphIndex(c);
        glyph = this.glyphs[glyphIndex];
        checkArgument(glyph !== undefined, 'Could not find glyph for character ' + c + ' glyph index ' + glyphIndex);
        return glyph;
    };

    // Convert the given text to a list of Glyph objects.
    // Note that there is no strict one-to-one mapping between characters and
    // glyphs, so the list of returned glyphs can be larger or smaller than the
    // length of the given string.
    Font.prototype.stringToGlyphs = function (s) {
        var i, c, glyphs;
        glyphs = [];
        for (i = 0; i < s.length; i += 1) {
            c = s[i];
            glyphs.push(this.charToGlyph(c));
        }
        return glyphs;
    };

    // Retrieve the value of the kerning pair between the left glyph (or its index)
    // and the right glyph (or its index). If no kerning pair is found, return 0.
    // The kerning value gets added to the advance width when calculating the spacing
    // between glyphs.
    Font.prototype.getKerningValue = function (leftGlyph, rightGlyph) {
        leftGlyph = leftGlyph.index || leftGlyph;
        rightGlyph = rightGlyph.index || rightGlyph;
        return this.kerningPairs[leftGlyph + ',' + rightGlyph] || 0;
    };

    // Helper function that invokes the given callback for each glyph in the given text.
    // The callback gets `(glyph, x, y, fontSize, options)`.
    Font.prototype._eachGlyph = function(text, x, y, fontSize, options, callback) {
        var kerning, fontScale, glyphs, i, glyph, kerningValue;
        if (!this.supported) {
            return;
        }
        x = x !== undefined ? x : 0;
        y = y !== undefined ? y : 0;
        fontSize = fontSize !== undefined ? fontSize : 72;
        options = options || {};
        kerning = options.kerning === undefined ? true : options.kerning;
        fontScale = 1 / this.unitsPerEm * fontSize;
        glyphs = this.stringToGlyphs(text);
        for (i = 0; i < glyphs.length; i += 1) {
            glyph = glyphs[i];
            callback(glyph, x, y, fontSize, options);
            if (glyph.advanceWidth) {
                x += glyph.advanceWidth * fontScale;
            }
            if (kerning && i < glyphs.length - 1) {
                kerningValue = this.getKerningValue(glyph, glyphs[i + 1]);
                x += kerningValue * fontScale;
            }
        }
    };

    // Create a Path object that represents the given text.
    //
    // text - The text to create.
    // x - Horizontal position of the beginning of the text. (default: 0)
    // y - Vertical position of the *baseline* of the text. (default: 0)
    // fontSize - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`. (default: 72)
    // Options is an optional object that contains:
    // - kerning - Whether to take kerning information into account. (default: true)
    //
    // Returns a Path object.
    Font.prototype.getPath = function (text, x, y, fontSize, options) {
        var fullPath = new Path();
        this._eachGlyph(text, x, y, fontSize, options, function(glyph, x, y, fontSize) {
            var path = glyph.getPath(x, y, fontSize);
            fullPath.extend(path);
        });
        return fullPath;
    };

    // Draw the text on the given drawing context.
    //
    // ctx - A 2D drawing context, like Canvas.
    // text - The text to create.
    // x - Horizontal position of the beginning of the text. (default: 0)
    // y - Vertical position of the *baseline* of the text. (default: 0)
    // fontSize - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`. (default: 72)
    // Options is an optional object that contains:
    // - kerning - Whether to take kerning information into account. (default: true)
    Font.prototype.draw = function (ctx, text, x, y, fontSize, options) {
        this.getPath(text, x, y, fontSize, options).draw(ctx);
    };

    // Draw the points of all glyphs in the text.
    // On-curve points will be drawn in blue, off-curve points will be drawn in red.
    //
    // ctx - A 2D drawing context, like Canvas.
    // text - The text to create.
    // x - Horizontal position of the beginning of the text. (default: 0)
    // y - Vertical position of the *baseline* of the text. (default: 0)
    // fontSize - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`. (default: 72)
    // Options is an optional object that contains:
    // - kerning - Whether to take kerning information into account. (default: true)
    Font.prototype.drawPoints = function (ctx, text, x, y, fontSize, options) {
        this._eachGlyph(text, x, y, fontSize, options, function (glyph, x, y, fontSize) {
            glyph.drawPoints(ctx, x, y, fontSize);
        });
    };

    // Draw lines indicating important font measurements for all glyphs in the text.
    // Black lines indicate the origin of the coordinate system (point 0,0).
    // Blue lines indicate the glyph bounding box.
    // Green line indicates the advance width of the glyph.
    //
    // ctx - A 2D drawing context, like Canvas.
    // text - The text to create.
    // x - Horizontal position of the beginning of the text. (default: 0)
    // y - Vertical position of the *baseline* of the text. (default: 0)
    // fontSize - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`. (default: 72)
    // Options is an optional object that contains:
    // - kerning - Whether to take kerning information into account. (default: true)
    Font.prototype.drawMetrics = function (ctx, text, x, y, fontSize, options) {
        this._eachGlyph(text, x, y, fontSize, options, function (glyph, x, y, fontSize) {
            glyph.drawMetrics(ctx, x, y, fontSize);
        });
    };

    // OpenType format parsing //////////////////////////////////////////////

    // Parse the coordinate data for a glyph.
    function parseGlyphCoordinate(p, flag, previousValue, shortVectorBit, sameBit) {
        var v;
        if (isBitSet(flag, shortVectorBit)) {
            // The coordinate is 1 byte long.
            v = p.parseByte();
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
                v = previousValue + p.parseShort();
            }
        }
        return v;
    }

    // Parse an OpenType glyph (described in the glyf table).
    // Due to the complexity of the parsing we can't define the glyf table declaratively.
    // The offset is the absolute byte offset of the glyph: the base of the glyph table + the relative offset of the glyph.
    // http://www.microsoft.com/typography/otspec/glyf.htm
    function parseGlyph(data, start, index, font) {
        var p, glyph, flag, i, j, flags,
            endPointIndices, numberOfCoordinates, repeatCount, points, point, px, py,
            component, moreComponents, arg1, arg2, scale, xScale, yScale, scale01, scale10;
        p = new Parser(data, start);
        glyph = new Glyph(font, index);
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
    function parseGlyfTable(data, start, loca, font) {
        var glyphs, i, j, offset, nextOffset, glyph,
            component, componentGlyph, transformedPoints;
        glyphs = [];
        // The last element of the loca table is invalid.
        for (i = 0; i < loca.length - 1; i += 1) {
            offset = loca[i];
            nextOffset = loca[i + 1];
            if (offset !== nextOffset) {
                glyphs.push(parseGlyph(data, start + offset, i, font));
            } else {
                glyphs.push(new Glyph(font, i));
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

    // File loaders /////////////////////////////////////////////////////////

    var fs;

    function loadFromFile(path, callback) {
        fs = fs || require('fs');
        fs.readFile(path, function (err, buffer) {
            if (err) {
                return callback(err.message);
            }

            callback(null, toArrayBuffer(buffer));
        });
    }

    function loadFromUrl(url, callback) {
        var request = new XMLHttpRequest();
        request.open('get', url, true);
        request.responseType = 'arraybuffer';
        request.onload = function() {
            if (request.status !== 200) {
                return callback('Font could not be loaded: ' + request.statusText);
            }
            return callback(null, request.response);
        };
        request.send();
    }

    // Convert a Node.js Buffer to an ArrayBuffer
    function toArrayBuffer(buffer) {
        var arrayBuffer = new ArrayBuffer(buffer.length),
            data = new Uint8Array(arrayBuffer);

        for (var i = 0; i < buffer.length; ++i) {
            data[i] = buffer[i];
        }

        return arrayBuffer;
    }

    // Public API ///////////////////////////////////////////////////////////

    // Parse the OpenType file data (as an ArrayBuffer) and return a Font object.
    // If the file could not be parsed (most likely because it contains Postscript outlines)
    // we return an empty Font object with the `supported` flag set to `false`.
    opentype.parse = function (buffer) {
        var font, data, version, numTables, i, p, tag, offset, hmtxOffset, glyfOffset, locaOffset,
            kernOffset, magicNumber, indexToLocFormat, numGlyphs, loca, shortVersion;
        // OpenType fonts use big endian byte ordering.
        // We can't rely on typed array view types, because they operate with the endianness of the host computer.
        // Instead we use DataViews where we can specify endianness.

        font = new Font();
        data = new DataView(buffer, 0);

        version = getFixed(data, 0);
        checkArgument(version === 1.0, 'Unsupported OpenType version ' + version);

        numTables = getUShort(data, 4);

        // Offset into the table records.
        p = 12;
        for (i = 0; i < numTables; i += 1) {
            tag = getTag(data, p);
            offset = getULong(data, p + 8);
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
            font.glyphs = parseGlyfTable(data, glyfOffset, loca, font);
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

    // Asynchronously load the font from a URL or a filesystem. When done, call the callback
    // with two arguments `(err, font)`. The `err` will be null on success,
    // the `font` is a Font object.
    //
    // We use the node.js callback convention so that
    // opentype.js can integrate with frameworks like async.js.
    opentype.load = function(url, callback) {
        var loader = typeof module !== 'undefined' && module.exports ? loadFromFile : loadFromUrl;
        loader(url, function (err, arrayBuffer) {
            if (err) {
                return callback(err);
            }
            var font = opentype.parse(arrayBuffer);
            if (!font.supported) {
                return callback('Font is not supported (is this a Postscript font?)');
            }
            return callback(null, font);
        });
    };

    // Module support ///////////////////////////////////////////////////////

    if (typeof define === 'function' && define.amd) {
        // AMD / RequireJS
        define([], function () {
          return opentype;
        });
    } else if (typeof module === 'object' && module.exports) {
        // node.js
        module.exports = opentype;
    } else {
        // Included directly via a <script> tag.
        root.opentype = opentype;
    }

}.bind(this)());
