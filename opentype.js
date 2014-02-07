// opentype.js
// https://github.com/nodebox/opentype.js
// (c) 2014 Frederik De Bleser
// opentype.js may be freely distributed under the MIT license.

/*jslint bitwise: true */
/*global module,define,DataView,XMLHttpRequest,require,toArrayBuffer,ArrayBuffer,Uint8Array */
(function () {
    'use strict';

    var root, opentype, getCard8, getCard16, typeOffsets, cffStandardStrings,
        cffStandardEncoding, cffExpertEncoding, fs;

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

    getCard8 = getByte;

    // Retrieve an unsigned 16-bit short from the DataView.
    // The value is stored in big endian.
    function getUShort(dataView, offset) {
        return dataView.getUint16(offset, false);
    }

    getCard16 = getUShort;

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

    // Retrieve an offset from the DataView.
    // Offsets are 1 to 4 bytes in length, depending on the offSize argument.
    function getOffset(dataView, offset, offSize) {
        var i, v;
        v = 0;
        for (i = 0; i < offSize; i += 1) {
            v <<= 8;
            v += dataView.getUint8(offset + i);
        }
        return v;
    }

    // Retrieve a number of bytes from start offset to the end offset from the DataView.
    function getBytes(dataView, startOffset, endOffset) {
        var bytes, i;
        bytes = [];
        for (i = startOffset; i < endOffset; i += 1) {
            bytes.push(dataView.getUint8(i));
        }
        return bytes;
    }

    // Convert the list of bytes to a string.
    function bytesToString(bytes) {
        var s, i;
        s = '';
        for (i = 0; i < bytes.length; i += 1) {
            s += String.fromCharCode(bytes[i]);
        }
        return s;
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
    // The data can be either a DataView or an array of bytes.
    function Parser(data, offset) {
        this.data = data;
        this.isDataView = data.constructor.name === 'DataView';
        this.offset = offset;
        this.relativeOffset = 0;
    }

    Parser.prototype.parseByte = function () {
        var v;
        if (this.isDataView) {
            v = getByte(this.data, this.offset + this.relativeOffset);
        } else {
            v = this.data[this.offset + this.relativeOffset];
        }
        this.relativeOffset += 1;
        return v;
    };
    Parser.prototype.parseCard8 = Parser.prototype.parseByte;

    Parser.prototype.parseUShort = function () {
        var v = getUShort(this.data, this.offset + this.relativeOffset);
        this.relativeOffset += 2;
        return v;
    };
    Parser.prototype.parseCard16 = Parser.prototype.parseUShort;
    Parser.prototype.parseSID = Parser.prototype.parseUShort;

    Parser.prototype.parseShort = function () {
        var v = getShort(this.data, this.offset + this.relativeOffset);
        this.relativeOffset += 2;
        return v;
    };

    Parser.prototype.parseULong = function () {
        var v = getULong(this.data, this.offset + this.relativeOffset);
        this.relativeOffset += 4;
        return v;
    };

    Parser.prototype.skip = function (type, amount) {
        if (amount === undefined) {
            amount = 1;
        }
        this.relativeOffset += typeOffsets[type] * amount;
    };

    // Encoding objects /////////////////////////////////////////////////////

    function CmapEncoding(cmap) {
        this.cmap = cmap;
    }

    CmapEncoding.prototype.charToGlyphIndex = function (s) {
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

    function CffEncoding(encoding, charset) {
        this.encoding = encoding;
        this.charset = charset;
    }

    CffEncoding.prototype.charToGlyphIndex = function (s) {
        var code, charName;
        code = s.charCodeAt(0);
        charName = this.encoding[code];
        return this.charset.indexOf(charName);
    };

    // Glyph object /////////////////////////////////////////////////////////

    // A Glyph is an individual mark that often corresponds to a character.
    // Some glyphs, such as ligatures, are a combination of many characters.
    // Glyphs are the basic building blocks of a font.
    //
    // The `Glyph` class is an abstract object that contains utility methods for drawing the path and its points.
    // Concrete classes are `TrueTypeGlyph` and `CffGlyph` that implement `getPath`.
    function Glyph() {
    }

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

        var scale, points, i, pt, blueCircles, redCircles, path, cmd;
        x = x !== undefined ? x : 0;
        y = y !== undefined ? y : 0;
        fontSize = fontSize !== undefined ? fontSize : 24;
        scale = 1 / this.font.unitsPerEm * fontSize;

        blueCircles = [];
        redCircles = [];
        if (this.points) {
            points = this.points;
            for (i = 0; i < points.length; i += 1) {
                pt = points[i];
                if (pt.onCurve) {
                    blueCircles.push(pt);
                } else {
                    redCircles.push(pt);
                }
            }
        } else {
            path = this.path;
            for (i = 0; i < path.commands.length; i += 1) {
                cmd = path.commands[i];
                if (cmd.x !== undefined) {
                    blueCircles.push({x: cmd.x, y: -cmd.y});
                }
                if (cmd.x1 !== undefined) {
                    redCircles.push({x: cmd.x1, y: -cmd.y1});
                }
                if (cmd.x2 !== undefined) {
                    redCircles.push({x: cmd.x2, y: -cmd.y2});
                }
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

    // A concrete implementation of glyph for TrueType outline data.
    function TrueTypeGlyph(font, index) {
        Glyph.call(this);
        this.font = font;
        this.index = index;
        this.numberOfContours = 0;
        this.xMin = this.yMin = this.xMax = this.yMax = 0;
        this.advanceWidth = 0;
        this.points = [];
    }

    TrueTypeGlyph.prototype = new Glyph();
    TrueTypeGlyph.prototype.constructor = TrueTypeGlyph;

    // Split the glyph into contours.
    TrueTypeGlyph.prototype.getContours = function () {
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
    TrueTypeGlyph.prototype.getPath = function (x, y, fontSize) {
        var scale, path, contours, i, realFirstPoint, j, contour, pt, firstPt,
            prevPt, midPt, curvePt, lastPt;
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
            lastPt = contour[contour.length - 1];
            if (firstPt.onCurve) {
                curvePt = null;
                // The first point will be consumed by the moveTo command,
                // so skip it in the loop.
                realFirstPoint = true;
            } else {
                if (lastPt.onCurve) {
                    // If the first point is off-curve and the last point is on-curve,
                    // start at the last point.
                    firstPt = lastPt;
                } else {
                    // If both first and last points are off-curve, start at their middle.
                    firstPt = { x: (firstPt.x + lastPt.x) / 2, y: (firstPt.y + lastPt.y) / 2 };
                }
                curvePt = firstPt;
                // The first point is synthesized, so don't skip the real first point.
                realFirstPoint = false;
            }
            path.moveTo(x + (firstPt.x * scale), y + (-firstPt.y * scale));

            for (j = realFirstPoint ? 1 : 0; j < contour.length; j += 1) {
                pt = contour[j];
                prevPt = j === 0 ? firstPt : contour[j - 1];
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
            if (firstPt !== lastPt) {
                // Connect the last and first points
                if (curvePt) {
                    path.quadraticCurveTo(x + (curvePt.x * scale), y + (-curvePt.y * scale), x + (firstPt.x * scale), y + (-firstPt.y * scale));
                } else {
                    path.lineTo(x + (firstPt.x * scale), y + (-firstPt.y * scale));
                }
            }
        }
        path.closePath();
        return path;
    };

    // A concrete implementation of glyph for TrueType outline data.
    function CffGlyph(font, index) {
        Glyph.call(this);
        this.font = font;
        this.index = index;
        this.numberOfContours = 0;
        this.xMin = this.yMin = this.xMax = this.yMax = 0;
        this.advanceWidth = font.defaultWidthX;
        this.path = null;
    }

    CffGlyph.prototype = new Glyph();
    CffGlyph.prototype.constructor = CffGlyph;

    // Convert the glyph to a Path we can draw on a drawing context.
    //
    // x - Horizontal position of the glyph. (default: 0)
    // y - Vertical position of the *baseline* of the glyph. (default: 0)
    // fontSize - Font size, in pixels (default: 72).
    CffGlyph.prototype.getPath = function (x, y, fontSize) {
        var scale, newPath, i, cmd;
        x = x !== undefined ? x : 0;
        y = y !== undefined ? y : 0;
        fontSize = fontSize !== undefined ? fontSize : 72;
        scale = 1 / this.font.unitsPerEm * fontSize;
        newPath = new Path();
        for (i = 0; i < this.path.commands.length; i += 1) {
            cmd = this.path.commands[i];
            if (cmd.type === 'M') {
                newPath.moveTo(x + (cmd.x * scale), y + (cmd.y * scale));
            } else if (cmd.type === 'L') {
                newPath.lineTo(x + (cmd.x * scale), y + (cmd.y * scale));
            } else if (cmd.type === 'C') {
                newPath.bezierCurveTo(x + (cmd.x1 * scale), y + (cmd.y1 * scale),
                    x + (cmd.x2 * scale), y + (cmd.y2 * scale),
                    x + (cmd.x * scale), y + (cmd.y * scale));
            } else if (cmd.type === 'Q') {
                newPath.quadraticCurveTo(x + (cmd.x1 * scale), y + (cmd.y1 * scale),
                    x + (cmd.x * scale), y + (cmd.y * scale));
            } else if (cmd.type === 'Z') {
                newPath.closePath();
            }
        }
        return newPath;
    };

    // Font object //////////////////////////////////////////////////////////

    // A Font represents a loaded OpenType font file.
    // It contains a set of glyphs and methods to draw text on a drawing context,
    // or to get a path representing the text.
    function Font() {
        this.supported = true;
        this.glyphs = [];
        this.encoding = null;
    }

    // Convert the given character to a single glyph index.
    // Note that this function assumes that there is a one-to-one mapping between
    // the given character and a glyph; for complex scripts this might not be the case.
    Font.prototype.charToGlyphIndex = function (s) {
        return this.encoding.charToGlyphIndex(s);
    };

    // Convert the given character to a single Glyph object.
    // Note that this function assumes that there is a one-to-one mapping between
    // the given character and a glyph; for complex scripts this might not be the case.
    Font.prototype.charToGlyph = function (c) {
        var glyphIndex, glyph;
        glyphIndex = this.charToGlyphIndex(c);
        glyph = this.glyphs[glyphIndex];
        if (!glyph) {
            glyph = this.glyphs[0]; // .notdef
        }
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
    Font.prototype.forEachGlyph = function (text, x, y, fontSize, options, callback) {
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
        this.forEachGlyph(text, x, y, fontSize, options, function (glyph, x, y, fontSize) {
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
        this.forEachGlyph(text, x, y, fontSize, options, function (glyph, x, y, fontSize) {
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
        this.forEachGlyph(text, x, y, fontSize, options, function (glyph, x, y, fontSize) {
            glyph.drawMetrics(ctx, x, y, fontSize);
        });
    };

    // OpenType format parsing //////////////////////////////////////////////

    cffStandardStrings = [
        '.notdef', 'space', 'exclam', 'quotedbl', 'numbersign', 'dollar', 'percent', 'ampersand', 'quoteright',
        'parenleft', 'parenright', 'asterisk', 'plus', 'comma', 'hyphen', 'period', 'slash', 'zero', 'one', 'two',
        'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'colon', 'semicolon', 'less', 'equal', 'greater',
        'question', 'at', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S',
        'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'bracketleft', 'backslash', 'bracketright', 'asciicircum', 'underscore',
        'quoteleft', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
        'u', 'v', 'w', 'x', 'y', 'z', 'braceleft', 'bar', 'braceright', 'asciitilde', 'exclamdown', 'cent', 'sterling',
        'fraction', 'yen', 'florin', 'section', 'currency', 'quotesingle', 'quotedblleft', 'guillemotleft',
        'guilsinglleft', 'guilsinglright', 'fi', 'fl', 'endash', 'dagger', 'daggerdbl', 'periodcentered', 'paragraph',
        'bullet', 'quotesinglbase', 'quotedblbase', 'quotedblright', 'guillemotright', 'ellipsis', 'perthousand',
        'questiondown', 'grave', 'acute', 'circumflex', 'tilde', 'macron', 'breve', 'dotaccent', 'dieresis', 'ring',
        'cedilla', 'hungarumlaut', 'ogonek', 'caron', 'emdash', 'AE', 'ordfeminine', 'Lslash', 'Oslash', 'OE',
        'ordmasculine', 'ae', 'dotlessi', 'lslash', 'oslash', 'oe', 'germandbls', 'onesuperior', 'logicalnot', 'mu',
        'trademark', 'Eth', 'onehalf', 'plusminus', 'Thorn', 'onequarter', 'divide', 'brokenbar', 'degree', 'thorn',
        'threequarters', 'twosuperior', 'registered', 'minus', 'eth', 'multiply', 'threesuperior', 'copyright',
        'Aacute', 'Acircumflex', 'Adieresis', 'Agrave', 'Aring', 'Atilde', 'Ccedilla', 'Eacute', 'Ecircumflex',
        'Edieresis', 'Egrave', 'Iacute', 'Icircumflex', 'Idieresis', 'Igrave', 'Ntilde', 'Oacute', 'Ocircumflex',
        'Odieresis', 'Ograve', 'Otilde', 'Scaron', 'Uacute', 'Ucircumflex', 'Udieresis', 'Ugrave', 'Yacute',
        'Ydieresis', 'Zcaron', 'aacute', 'acircumflex', 'adieresis', 'agrave', 'aring', 'atilde', 'ccedilla', 'eacute',
        'ecircumflex', 'edieresis', 'egrave', 'iacute', 'icircumflex', 'idieresis', 'igrave', 'ntilde', 'oacute',
        'ocircumflex', 'odieresis', 'ograve', 'otilde', 'scaron', 'uacute', 'ucircumflex', 'udieresis', 'ugrave',
        'yacute', 'ydieresis', 'zcaron', 'exclamsmall', 'Hungarumlautsmall', 'dollaroldstyle', 'dollarsuperior',
        'ampersandsmall', 'Acutesmall', 'parenleftsuperior', 'parenrightsuperior', '266 ff', 'onedotenleader',
        'zerooldstyle', 'oneoldstyle', 'twooldstyle', 'threeoldstyle', 'fouroldstyle', 'fiveoldstyle', 'sixoldstyle',
        'sevenoldstyle', 'eightoldstyle', 'nineoldstyle', 'commasuperior', 'threequartersemdash', 'periodsuperior',
        'questionsmall', 'asuperior', 'bsuperior', 'centsuperior', 'dsuperior', 'esuperior', 'isuperior', 'lsuperior',
        'msuperior', 'nsuperior', 'osuperior', 'rsuperior', 'ssuperior', 'tsuperior', 'ff', 'ffi', 'ffl',
        'parenleftinferior', 'parenrightinferior', 'Circumflexsmall', 'hyphensuperior', 'Gravesmall', 'Asmall',
        'Bsmall', 'Csmall', 'Dsmall', 'Esmall', 'Fsmall', 'Gsmall', 'Hsmall', 'Ismall', 'Jsmall', 'Ksmall', 'Lsmall',
        'Msmall', 'Nsmall', 'Osmall', 'Psmall', 'Qsmall', 'Rsmall', 'Ssmall', 'Tsmall', 'Usmall', 'Vsmall', 'Wsmall',
        'Xsmall', 'Ysmall', 'Zsmall', 'colonmonetary', 'onefitted', 'rupiah', 'Tildesmall', 'exclamdownsmall',
        'centoldstyle', 'Lslashsmall', 'Scaronsmall', 'Zcaronsmall', 'Dieresissmall', 'Brevesmall', 'Caronsmall',
        'Dotaccentsmall', 'Macronsmall', 'figuredash', 'hypheninferior', 'Ogoneksmall', 'Ringsmall', 'Cedillasmall',
        'questiondownsmall', 'oneeighth', 'threeeighths', 'fiveeighths', 'seveneighths', 'onethird', 'twothirds',
        'zerosuperior', 'foursuperior', 'fivesuperior', 'sixsuperior', 'sevensuperior', 'eightsuperior', 'ninesuperior',
        'zeroinferior', 'oneinferior', 'twoinferior', 'threeinferior', 'fourinferior', 'fiveinferior', 'sixinferior',
        'seveninferior', 'eightinferior', 'nineinferior', 'centinferior', 'dollarinferior', 'periodinferior',
        'commainferior', 'Agravesmall', 'Aacutesmall', 'Acircumflexsmall', 'Atildesmall', 'Adieresissmall',
        'Aringsmall', 'AEsmall', 'Ccedillasmall', 'Egravesmall', 'Eacutesmall', 'Ecircumflexsmall', 'Edieresissmall',
        'Igravesmall', 'Iacutesmall', 'Icircumflexsmall', 'Idieresissmall', 'Ethsmall', 'Ntildesmall', 'Ogravesmall',
        'Oacutesmall', 'Ocircumflexsmall', 'Otildesmall', 'Odieresissmall', 'OEsmall', 'Oslashsmall', 'Ugravesmall',
        'Uacutesmall', 'Ucircumflexsmall', 'Udieresissmall', 'Yacutesmall', 'Thornsmall', 'Ydieresissmall', '001.000',
        '001.001', '001.002', '001.003', 'Black', 'Bold', 'Book', 'Light', 'Medium', 'Regular', 'Roman', 'Semibold'];

    cffStandardEncoding = [
        '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
        '', '', '', '', 'space', 'exclam', 'quotedbl', 'numbersign', 'dollar', 'percent', 'ampersand', 'quoteright',
        'parenleft', 'parenright', 'asterisk', 'plus', 'comma', 'hyphen', 'period', 'slash', 'zero', 'one', 'two',
        'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'colon', 'semicolon', 'less', 'equal', 'greater',
        'question', 'at', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S',
        'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'bracketleft', 'backslash', 'bracketright', 'asciicircum', 'underscore',
        'quoteleft', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
        'u', 'v', 'w', 'x', 'y', 'z', 'braceleft', 'bar', 'braceright', 'asciitilde', '', '', '', '', '', '', '', '',
        '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
        'exclamdown', 'cent', 'sterling', 'fraction', 'yen', 'florin', 'section', 'currency', 'quotesingle',
        'quotedblleft', 'guillemotleft', 'guilsinglleft', 'guilsinglright', 'fi', 'fl', '', 'endash', 'dagger',
        'daggerdbl', 'periodcentered', '', 'paragraph', 'bullet', 'quotesinglbase', 'quotedblbase', 'quotedblright',
        'guillemotright', 'ellipsis', 'perthousand', '', 'questiondown', '', 'grave', 'acute', 'circumflex', 'tilde',
        'macron', 'breve', 'dotaccent', 'dieresis', '', 'ring', 'cedilla', '', 'hungarumlaut', 'ogonek', 'caron',
        'emdash', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'AE', '', 'ordfeminine', '', '', '',
        '', 'Lslash', 'Oslash', 'OE', 'ordmasculine', '', '', '', '', '', 'ae', '', '', '', 'dotlessi', '', '',
        'lslash', 'oslash', 'oe', 'germandbls'];

    cffExpertEncoding = [
        '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
        '', '', '', '', 'space', 'exclamsmall', 'Hungarumlautsmall', '', 'dollaroldstyle', 'dollarsuperior',
        'ampersandsmall', 'Acutesmall', 'parenleftsuperior', 'parenrightsuperior', 'twodotenleader', 'onedotenleader',
        'comma', 'hyphen', 'period', 'fraction', 'zerooldstyle', 'oneoldstyle', 'twooldstyle', 'threeoldstyle',
        'fouroldstyle', 'fiveoldstyle', 'sixoldstyle', 'sevenoldstyle', 'eightoldstyle', 'nineoldstyle', 'colon',
        'semicolon', 'commasuperior', 'threequartersemdash', 'periodsuperior', 'questionsmall', '', 'asuperior',
        'bsuperior', 'centsuperior', 'dsuperior', 'esuperior', '', '', 'isuperior', '', '', 'lsuperior', 'msuperior',
        'nsuperior', 'osuperior', '', '', 'rsuperior', 'ssuperior', 'tsuperior', '', 'ff', 'fi', 'fl', 'ffi', 'ffl',
        'parenleftinferior', '', 'parenrightinferior', 'Circumflexsmall', 'hyphensuperior', 'Gravesmall', 'Asmall',
        'Bsmall', 'Csmall', 'Dsmall', 'Esmall', 'Fsmall', 'Gsmall', 'Hsmall', 'Ismall', 'Jsmall', 'Ksmall', 'Lsmall',
        'Msmall', 'Nsmall', 'Osmall', 'Psmall', 'Qsmall', 'Rsmall', 'Ssmall', 'Tsmall', 'Usmall', 'Vsmall', 'Wsmall',
        'Xsmall', 'Ysmall', 'Zsmall', 'colonmonetary', 'onefitted', 'rupiah', 'Tildesmall', '', '', '', '', '', '', '',
        '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
        'exclamdownsmall', 'centoldstyle', 'Lslashsmall', '', '', 'Scaronsmall', 'Zcaronsmall', 'Dieresissmall',
        'Brevesmall', 'Caronsmall', '', 'Dotaccentsmall', '', '', 'Macronsmall', '', '', 'figuredash', 'hypheninferior',
        '', '', 'Ogoneksmall', 'Ringsmall', 'Cedillasmall', '', '', '', 'onequarter', 'onehalf', 'threequarters',
        'questiondownsmall', 'oneeighth', 'threeeighths', 'fiveeighths', 'seveneighths', 'onethird', 'twothirds', '',
        '', 'zerosuperior', 'onesuperior', 'twosuperior', 'threesuperior', 'foursuperior', 'fivesuperior',
        'sixsuperior', 'sevensuperior', 'eightsuperior', 'ninesuperior', 'zeroinferior', 'oneinferior', 'twoinferior',
        'threeinferior', 'fourinferior', 'fiveinferior', 'sixinferior', 'seveninferior', 'eightinferior',
        'nineinferior', 'centinferior', 'dollarinferior', 'periodinferior', 'commainferior', 'Agravesmall',
        'Aacutesmall', 'Acircumflexsmall', 'Atildesmall', 'Adieresissmall', 'Aringsmall', 'AEsmall', 'Ccedillasmall',
        'Egravesmall', 'Eacutesmall', 'Ecircumflexsmall', 'Edieresissmall', 'Igravesmall', 'Iacutesmall',
        'Icircumflexsmall', 'Idieresissmall', 'Ethsmall', 'Ntildesmall', 'Ogravesmall', 'Oacutesmall',
        'Ocircumflexsmall', 'Otildesmall', 'Odieresissmall', 'OEsmall', 'Oslashsmall', 'Ugravesmall', 'Uacutesmall',
        'Ucircumflexsmall', 'Udieresissmall', 'Yacutesmall', 'Thornsmall', 'Ydieresissmall'];

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
    // http://www.microsoft.com/typography/otspec/glyf.htm
    function parseGlyph(data, start, index, font) {
        var p, glyph, flag, i, j, flags,
            endPointIndices, numberOfCoordinates, repeatCount, points, point, px, py,
            component, moreComponents, arg1, arg2, scale, xScale, yScale, scale01, scale10;
        p = new Parser(data, start);
        glyph = new TrueTypeGlyph(font, index);
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
                glyphs.push(new TrueTypeGlyph(font, i));
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
    // This function returns a `CmapEncoding` object or null if no supported format could be found.
    // https://www.microsoft.com/typography/OTSPEC/cmap.htm
    function parseCmapTable(data, start) {
        var version, numTables, offset, platformId, encodingId, format, segCount,
            ranges, i, j, parserOffset, idRangeOffset, p;
        version = getUShort(data, start);
        checkArgument(version === 0, "cmap table version should be 0.");

        // The cmap table can contain many sub-tables, each with their own format.
        // We're only interested in a "platform 3" table. This is a Windows format.
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
        segCount = p.parseUShort() >> 1;
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
            parserOffset = p.offset + p.relativeOffset;
            idRangeOffset = p.parseUShort();
            if (idRangeOffset > 0) {
                ranges[i].ids = [];
                for (j = 0; j < ranges[i].length; j += 1) {
                    ranges[i].ids[j] = getUShort(data, parserOffset + idRangeOffset);
                    idRangeOffset += 2;
                }
            }
        }

        return new CmapEncoding(ranges);
    }

    // Parse a `CFF` INDEX array.
    // An index array consists of a list of offsets, then a list of objects at those offsets.
    function parseCFFIndex(data, start, conversionFn) {
        var offsets, objects, count, endOffset, offsetSize, objectOffset, pos, i, value;
        offsets = [];
        objects = [];
        count = getCard16(data, start);
        if (count !== 0) {
            offsetSize = getByte(data, start + 2);
            objectOffset = start + ((count + 1) * offsetSize) + 2;
            pos = start + 3;
            for (i = 0; i < count + 1; i += 1) {
                offsets.push(getOffset(data, pos, offsetSize));
                pos += offsetSize;
            }
            // The total size of the index array is 4 header bytes + the value of the last offset.
            endOffset = objectOffset + offsets[count];
        } else {
            endOffset = start + 2;
        }
        for (i = 0; i < offsets.length - 1; i += 1) {
            value = getBytes(data, objectOffset + offsets[i], objectOffset + offsets[i + 1]);
            if (conversionFn) {
                value = conversionFn(value);
            }
            objects.push(value);
        }
        return {objects: objects, startOffset: start, endOffset: endOffset};
    }

    // Parse a `CFF` DICT real value.
    function parseFloatOperand(parser) {
        var s, eof, lookup, b, n1, n2;
        s = '';
        eof = 15;
        lookup = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', 'E', 'E-', null, '-'];
        while (true) {
            b = parser.parseByte();
            n1 = b >> 4;
            n2 = b & 15;

            if (n1 === eof) {
                break;
            }
            s += lookup[n1];

            if (n2 === eof) {
                break;
            }
            s += lookup[n2];
        }
        return parseFloat(s);
    }

    // Parse a `CFF` DICT operand.
    function parseOperand(parser, b0) {
        var b1, b2, b3, b4;
        if (b0 === 28) {
            b1 = parser.parseByte();
            b2 = parser.parseByte();
            return b1 << 8 | b2;
        }
        if (b0 === 29) {
            b1 = parser.parseByte();
            b2 = parser.parseByte();
            b3 = parser.parseByte();
            b4 = parser.parseByte();
            return b1 << 24 | b2 << 16 | b3 << 8 | b4;
        }
        if (b0 === 30) {
            return parseFloatOperand(parser);
        }
        if (b0 >= 32 && b0 <= 246) {
            return b0 - 139;
        }
        if (b0 >= 247 && b0 <= 250) {
            b1 = parser.parseByte();
            return (b0 - 247) * 256 + b1 + 108;
        }
        if (b0 >= 251 && b0 <= 254) {
            b1 = parser.parseByte();
            return -(b0 - 251) * 256 - b1 - 108;
        }
        throw new Error('Invalid b0 ' + b0);
    }

    // Convert the entries returned by `parseDict` to a proper dictionary.
    // If a value is a list of one, it is unpacked.
    function entriesToObject(entries) {
        var o, key, values, i, value;
        o = {};
        for (i = 0; i < entries.length; i += 1) {
            key = entries[i][0];
            values = entries[i][1];
            if (values.length === 1) {
                value = values[0];
            } else {
                value = values;
            }
            if (o.hasOwnProperty(key)) {
                throw new Error('Object ' + o + ' already has key ' + key);
            }
            o[key] = value;
        }
        return o;
    }

    // Parse a `CFF` DICT object.
    // A dictionary contains key-value pairs in a compact tokenized format.
    function parseCFFDict(data, start, size) {
        var parser, entries, operands, op;
        start = start !== undefined ? start : 0;
        parser = new Parser(data, start);
        entries = [];
        operands = [];
        size = size !== undefined ? size : data.length;

        while (parser.relativeOffset < size) {
            op = parser.parseByte();
            // The first byte for each dict item distinguishes between operator (key) and operand (value).
            // Values <= 21 are operators.
            if (op <= 21) {
                // Two-byte operators have an initial escape byte of 12.
                if (op === 12) {
                    op = 1200 + parser.parseByte();
                }
                entries.push([op, operands]);
                operands = [];
            } else {
                // Since the operands (values) come before the operators (keys), we store all operands in a list
                // until we encounter an operator.
                operands.push(parseOperand(parser, op));
            }
        }
        return entriesToObject(entries);
    }

    // Given a String Index (SID), return the value of the string.
    // Strings below index 392 are standard CFF strings and are not encoded in the font.
    function getCFFString(strings, index) {
        if (index <= 391) {
            index = cffStandardStrings[index];
        } else {
            index = strings[index - 391];
        }
        return index;
    }

    // Interpret a dictionary and return a new dictionary with readable keys and values for missing entries.
    // This function takes `meta` which is a list of objects containing `operand`, `name` and `default`.
    function interpretDict(dict, meta, strings) {
        var i, m, value, newDict;
        newDict = {};
        // Because we also want to include missing values, we start out from the meta list
        // and lookup values in the dict.
        for (i = 0; i < meta.length; i += 1) {
            m = meta[i];
            value = dict[m.op];
            if (value === undefined) {
                value = m.value !== undefined ? m.value : null;
            }
            if (m.type === 'SID') {
                value = getCFFString(strings, value);
            }
            newDict[m.name] = value;
        }
        return newDict;
    }

    // Parse the CFF header.
    function parseCFFHeader(data, start) {
        var header = {};
        header.formatMajor = getCard8(data, start);
        header.formatMinor = getCard8(data, start + 1);
        header.size = getCard8(data, start + 2);
        header.offsetSize = getCard8(data, start + 3);
        header.startOffset = start;
        header.endOffset = start + 4;
        return header;
    }

    // Parse the CFF top dictionary. A CFF table can contain multiple fonts, each with their own top dictionary.
    // The top dictionary contains the essential metadata for the font, together with the private dictionary.
    function parseCFFTopDict(data, start, strings) {
        var dict, meta;
        meta = [
            {name: 'version', op: 0, type: 'SID'},
            {name: 'notice', op: 1, type: 'SID'},
            {name: 'copyright', op: 1200, type: 'SID'},
            {name: 'fullName', op: 2, type: 'SID'},
            {name: 'familyName', op: 3, type: 'SID'},
            {name: 'weight', op: 4, type: 'SID'},
            {name: 'isFixedPitch', op: 1201, type: 'number', value: 0},
            {name: 'italicAngle', op: 1202, type: 'number', value: 0},
            {name: 'underlinePosition', op: 1203, type: 'number', value: -100},
            {name: 'underlineThickness', op: 1204, type: 'number', value: 50},
            {name: 'paintType', op: 1205, type: 'number', value: 0},
            {name: 'charstringType', op: 1206, type: 'number', value: 2},
            {name: 'fontMatrix', op: 1207, type: ['number', 'number', 'number', 'number'], value: [0.001, 0, 0, 0.001, 0, 0]},
            {name: 'uniqueId', op: 13, type: 'number'},
            {name: 'fontBBox', op: 5, type: ['number', 'number', 'number', 'number'], value: [0, 0, 0, 0]},
            {name: 'strokeWidth', op: 1208, type: 'number', value: 0},
            {name: 'xuid', op: 14, type: []},
            {name: 'charset', op: 15, type: 'offset', value: 0},
            {name: 'encoding', op: 16, type: 'offset', value: 0},
            {name: 'charStrings', op: 17, type: 'number', value: 0},
            {name: 'private', op: 18, type: ['number', 'offset'], value: [0, 0]}
        ];
        dict = parseCFFDict(data, start);
        return interpretDict(dict, meta, strings);
    }

    // Parse the CFF private dictionary. We don't fully parse out all the values, only the ones we need.
    function parseCFFPrivateDict(data, start, size, strings) {
        var dict, meta;
        meta = [
            {name: 'subrs', op: 19, type: 'offset', value: 0},
            {name: 'defaultWidthX', op: 20, type: 'number', value: 0},
            {name: 'nominalWidthX', op: 21, type: 'number', value: 0}
        ];
        dict = parseCFFDict(data, start, size);
        return interpretDict(dict, meta, strings);
    }

    // Parse the CFF charset table, which contains internal names for all the glyphs.
    // This function will return a list of glyph names.
    // See Adobe TN #5176 chapter 13, "Charsets".
    function parseCFFCharset(data, start, nGlyphs, strings) {
        var parser, format, charset, i, sid, count;
        parser = new Parser(data, start);
        // The .notdef glyph is not included, so subtract 1.
        nGlyphs -= 1;
        charset = ['.notdef'];

        format = parser.parseCard8();
        if (format === 0) {
            for (i = 0; i < nGlyphs; i += 1) {
                sid = parser.parseSID();
                charset.push(getCFFString(strings, sid));
            }
        } else if (format === 1) {
            while (charset.length <= nGlyphs) {
                sid = parser.parseSID();
                count = parser.parseCard8();
                for (i = 0; i <= count; i += 1) {
                    charset.push(getCFFString(strings, sid));
                    sid += 1;
                }
            }
        } else if (format === 2) {
            while (charset.length <= nGlyphs) {
                sid = parser.parseSID();
                count = parser.parseCard16();
                for (i = 0; i <= count; i += 1) {
                    charset.push(getCFFString(strings, sid));
                    sid += 1;
                }
            }
        } else {
            throw new Error('Unknown charset format ' + format);
        }

        return charset;
    }

    // Parse the CFF encoding data. Only one encoding can be specified per font.
    // See Adobe TN #5176 chapter 12, "Encodings".
    function parseCFFEncoding(data, start, charset) {
        var encoding, parser, format, nCodes, i, code, nRanges, first, nLeft, j;
        encoding = {};
        parser = new Parser(data, start);
        format = parser.parseCard8();
        if (format === 0) {
            nCodes = parser.parseCard8();
            for (i = 0; i < nCodes; i += 1) {
                code = parser.parseCard8();
                encoding[code] = i;
            }
        } else if (format === 1) {
            nRanges = parser.parseCard8();
            code = 1;
            for (i = 0; i < nRanges; i += 1) {
                first = parser.parseCard8();
                nLeft = parser.parseCard8();
                for (j = first; j <= first + nLeft; j += 1) {
                    encoding[j] = code;
                    code += 1;
                }
            }
        } else {
            throw new Error('Unknown encoding format ' + format);
        }
        return new CffEncoding(encoding, charset);
    }

    // Take in charstring code and return a Glyph object.
    // The encoding is described in the Type 2 Charstring Format
    // https://www.microsoft.com/typography/OTSPEC/charstr2.htm
    function parseCFFCharstring(code, font, index) {
        var path, glyph, stack, nStems, haveWidth, width, x, y, c1x, c1y, c2x, c2y, v;
        path = new Path();
        stack = [];
        nStems = 0;
        haveWidth = false;
        width = font.nominalWidthX;
        x = y = 0;

        function parseStems() {
            var hasWidthArg;
            // The number of stem operators on the stack is always even.
            // If the value is uneven, that means a width is specified.
            hasWidthArg = stack.length % 2 !== 0;
            if (hasWidthArg && !haveWidth) {
                width = stack.shift() + font.nominalWidthX;
            }
            nStems += stack.length >> 1;
            stack.length = 0;
            haveWidth = true;
        }

        function parse(code) {
            var i, b1, b2, b3, b4, codeIndex, subrCode;
            i = 0;
            while (i < code.length) {
                v = code[i];
                i += 1;
                switch (v) {
                case 1: // hstem
                    parseStems();
                    break;
                case 3: // vstem
                    parseStems();
                    break;
                case 4: // vmoveto
                    if (stack.length > 1 && !haveWidth) {
                        width = stack.shift() + font.nominalWidthX;
                        haveWidth = true;
                    }
                    y += stack.pop();
                    path.moveTo(x, -y);
                    break;
                case 5: // rlineto
                    while (stack.length > 0) {
                        x += stack.shift();
                        y += stack.shift();
                        path.lineTo(x, -y);
                    }
                    break;
                case 6: // hlineto
                    while (stack.length > 0) {
                        x += stack.shift();
                        path.lineTo(x, -y);
                        if (stack.length === 0) {
                            break;
                        }
                        y += stack.shift();
                        path.lineTo(x, -y);
                    }
                    break;
                case 7: // vlineto
                    while (stack.length > 0) {
                        y += stack.shift();
                        path.lineTo(x, -y);
                        if (stack.length === 0) {
                            break;
                        }
                        x += stack.shift();
                        path.lineTo(x, -y);
                    }
                    break;
                case 8: // rrcurveto
                    while (stack.length > 0) {
                        c1x = x + stack.shift();
                        c1y = y + stack.shift();
                        c2x = c1x + stack.shift();
                        c2y = c1y + stack.shift();
                        x = c2x + stack.shift();
                        y = c2y + stack.shift();
                        path.curveTo(c1x, -c1y, c2x, -c2y, x, -y);
                    }
                    break;
                case 10: // callsubr
                    codeIndex = stack.pop() + font.subrsBias;
                    subrCode = font.subrs[codeIndex];
                    if (subrCode) {
                        parse(subrCode);
                    }
                    break;
                case 11: // return
                    return;
                case 12: // escape
                    v = code[i];
                    i += 1;
                    break;
                case 14: // endchar
                    if (stack.length > 0 && !haveWidth) {
                        width = stack.shift() + font.nominalWidthX;
                        haveWidth = true;
                    }
                    path.closePath();
                    break;
                case 18: // hstemhm
                    parseStems();
                    break;
                case 19: // hintmask
                case 20: // cntrmask
                    parseStems();
                    i += (nStems + 7) >> 3;
                    break;
                case 21: // rmoveto
                    if (stack.length > 2 && !haveWidth) {
                        width = stack.shift() + font.nominalWidthX;
                        haveWidth = true;
                    }
                    y += stack.pop();
                    x += stack.pop();
                    path.moveTo(x, -y);
                    break;
                case 22: // hmoveto
                    if (stack.length > 1 && !haveWidth) {
                        width = stack.shift() + font.nominalWidthX;
                        haveWidth = true;
                    }
                    x += stack.pop();
                    path.moveTo(x, -y);
                    break;
                case 23: // vstemhm
                    parseStems();
                    break;
                case 24: // rcurveline
                    while (stack.length > 2) {
                        c1x = x + stack.shift();
                        c1y = y + stack.shift();
                        c2x = c1x + stack.shift();
                        c2y = c1y + stack.shift();
                        x = c2x + stack.shift();
                        y = c2y + stack.shift();
                        path.curveTo(c1x, -c1y, c2x, -c2y, x, -y);
                    }
                    x += stack.shift();
                    y += stack.shift();
                    path.lineTo(x, -y);
                    break;
                case 25: // rlinecurve
                    while (stack.length > 6) {
                        x += stack.shift();
                        y += stack.shift();
                        path.lineTo(x, -y);
                    }
                    c1x = x + stack.shift();
                    c1y = y + stack.shift();
                    c2x = c1x + stack.shift();
                    c2y = c1y + stack.shift();
                    x = c2x + stack.shift();
                    y = c2y + stack.shift();
                    path.curveTo(c1x, -c1y, c2x, -c2y, x, -y);
                    break;
                case 26: // vvcurveto
                    if (stack.length % 2) {
                        x += stack.shift();
                    }
                    while (stack.length > 0) {
                        c1x = x;
                        c1y = y + stack.shift();
                        c2x = c1x + stack.shift();
                        c2y = c1y + stack.shift();
                        x = c2x;
                        y = c2y + stack.shift();
                        path.curveTo(c1x, -c1y, c2x, -c2y, x, -y);
                    }
                    break;
                case 27: // hhcurveto
                    if (stack.length % 2) {
                        y += stack.shift();
                    }
                    while (stack.length > 0) {
                        c1x = x + stack.shift();
                        c1y = y;
                        c2x = c1x + stack.shift();
                        c2y = c1y + stack.shift();
                        x = c2x + stack.shift();
                        y = c2y;
                        path.curveTo(c1x, -c1y, c2x, -c2y, x, -y);
                    }
                    break;
                case 28: // shortint
                    b1 = code[i];
                    b2 = code[i + 1];
                    stack.push(((b1 << 24) | (b2 << 16)) >> 16);
                    i += 2;
                    break;
                case 29: // callgsubr
                    codeIndex = stack.pop() + font.gsubrsBias;
                    subrCode = font.gsubrs[codeIndex];
                    if (subrCode) {
                        parse(subrCode);
                    }
                    break;
                case 30: // vhcurveto
                    while (stack.length > 0) {
                        c1x = x;
                        c1y = y + stack.shift();
                        c2x = c1x + stack.shift();
                        c2y = c1y + stack.shift();
                        x = c2x + stack.shift();
                        y = c2y + (stack.length === 1 ? stack.shift() : 0);
                        path.curveTo(c1x, -c1y, c2x, -c2y, x, -y);
                        if (stack.length === 0) {
                            break;
                        }
                        c1x = x + stack.shift();
                        c1y = y;
                        c2x = c1x + stack.shift();
                        c2y = c1y + stack.shift();
                        y = c2y + stack.shift();
                        x = c2x + (stack.length === 1 ? stack.shift() : 0);
                        path.curveTo(c1x, -c1y, c2x, -c2y, x, -y);
                    }
                    break;
                case 31: // hvcurveto
                    while (stack.length > 0) {
                        c1x = x + stack.shift();
                        c1y = y;
                        c2x = c1x + stack.shift();
                        c2y = c1y + stack.shift();
                        y = c2y + stack.shift();
                        x = c2x + (stack.length === 1 ? stack.shift() : 0);
                        path.curveTo(c1x, -c1y, c2x, -c2y, x, -y);
                        if (stack.length === 0) {
                            break;
                        }
                        c1x = x;
                        c1y = y + stack.shift();
                        c2x = c1x + stack.shift();
                        c2y = c1y + stack.shift();
                        x = c2x + stack.shift();
                        y = c2y + (stack.length === 1 ? stack.shift() : 0);
                        path.curveTo(c1x, -c1y, c2x, -c2y, x, -y);
                    }
                    break;
                default:
                    if (v < 32) {
                        throw new Error('Glyph ' + index + ': unknown operator ' + v);
                    } else if (v < 247) {
                        stack.push(v - 139);
                    } else if (v < 251) {
                        b1 = code[i];
                        i += 1;
                        stack.push((v - 247) * 256 + b1 + 108);
                    } else if (v < 255) {
                        b1 = code[i];
                        i += 1;
                        stack.push(-(v - 251) * 256 - b1 - 108);
                    } else {
                        b1 = code[i];
                        b2 = code[i + 1];
                        b3 = code[i + 2];
                        b4 = code[i + 3];
                        i += 4;
                        stack.push(((b1 << 24) | (b2 << 16) | (b3 << 8) | b4) / 65536);
                    }
                }
            }
        }

        parse(code);
        glyph = new CffGlyph(font, index);
        glyph.path = path;
        glyph.advanceWidth = width;
        return glyph;
    }

    // Subroutines are encoded using the negative half of the number space.
    // See type 2 chapter 4.7 "Subroutine operators".
    function calcCFFSubroutineBias(subrs) {
        var bias;
        if (subrs.length < 1240) {
            bias = 107;
        } else if (subrs.length < 33900) {
            bias = 1131;
        } else {
            bias = 32768;
        }
        return bias;
    }

    // Parse the `CFF` table, which contains the glyph outlines in PostScript format.
    function parseCFFTable(data, start, font) {
        var header, nameIndex, topDictIndex, stringIndex, globalSubrIndex, topDict, privateDictOffset, privateDict,
            subrOffset, subrIndex, charString, charStringsIndex, charset, i;
        header = parseCFFHeader(data, start);
        nameIndex = parseCFFIndex(data, header.endOffset, bytesToString);
        topDictIndex = parseCFFIndex(data, nameIndex.endOffset);
        stringIndex = parseCFFIndex(data, topDictIndex.endOffset, bytesToString);
        globalSubrIndex = parseCFFIndex(data, stringIndex.endOffset);
        font.gsubrs = globalSubrIndex.objects;
        font.gsubrsBias = calcCFFSubroutineBias(font.gsubrs);

        topDict = parseCFFTopDict(topDictIndex.objects[0], 0, stringIndex.objects);

        privateDictOffset = start + topDict['private'][1];
        privateDict = parseCFFPrivateDict(data, privateDictOffset, topDict['private'][0], stringIndex.objects);
        font.defaultWidthX = privateDict.defaultWidthX;
        font.nominalWidthX = privateDict.nominalWidthX;

        subrOffset = privateDictOffset + privateDict.subrs;
        subrIndex = parseCFFIndex(data, subrOffset);
        font.subrs = subrIndex.objects;
        font.subrsBias = calcCFFSubroutineBias(font.subrs);

        // Offsets in the top dict are relative to the beginning of the CFF data, so add the CFF start offset.
        charStringsIndex = parseCFFIndex(data, start + topDict.charStrings);
        font.nGlyphs = charStringsIndex.objects.length;

        charset = parseCFFCharset(data, start + topDict.charset, font.nGlyphs, stringIndex.objects);
        if (topDict.encoding === 0) { // Standard encoding
            font.cffEncoding = new CffEncoding(cffStandardEncoding, charset);
        } else if (topDict.encoding === 1) { // Expert encoding
            font.cffEncoding = new CffEncoding(cffExpertEncoding, charset);
        } else {
            font.cffEncoding = parseCFFEncoding(data, start + topDict.encoding, charset);
        }
        // Prefer the CMAP encoding to the CFF encoding.
        font.encoding = font.encoding || font.cffEncoding;

        font.glyphs = [];
        for (i = 0; i < font.nGlyphs; i += 1) {
            charString = charStringsIndex.objects[i];
            font.glyphs.push(parseCFFCharstring(charString, font, i));
        }
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
        request.onload = function () {
            if (request.status !== 200) {
                return callback('Font could not be loaded: ' + request.statusText);
            }
            return callback(null, request.response);
        };
        request.send();
    }

    // Convert a Node.js Buffer to an ArrayBuffer
    function toArrayBuffer(buffer) {
        var i,
            arrayBuffer = new ArrayBuffer(buffer.length),
            data = new Uint8Array(arrayBuffer);

        for (i = 0; i < buffer.length; i += 1) {
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
            cffOffset, kernOffset, magicNumber, indexToLocFormat, numGlyphs, loca, shortVersion;
        // OpenType fonts use big endian byte ordering.
        // We can't rely on typed array view types, because they operate with the endianness of the host computer.
        // Instead we use DataViews where we can specify endianness.

        font = new Font();
        data = new DataView(buffer, 0);

        version = getFixed(data, 0);
        if (version === 1.0) {
            font.outlinesFormat = 'truetype';
        } else {
            version = getTag(data, 0);
            if (version === 'OTTO') {
                font.outlinesFormat = 'cff';
            } else {
                throw new Error('Unsupported OpenType version ' + version);
            }
        }

        numTables = getUShort(data, 4);

        // Offset into the table records.
        p = 12;
        for (i = 0; i < numTables; i += 1) {
            tag = getTag(data, p);
            offset = getULong(data, p + 8);
            switch (tag) {
            case 'cmap':
                font.encoding = parseCmapTable(data, offset);
                if (!font.encoding) {
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
            case 'CFF ':
                cffOffset = offset;
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
        } else if (cffOffset) {
            parseCFFTable(data, cffOffset, font);
            font.kerningPairs = {};
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
    opentype.load = function (url, callback) {
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
