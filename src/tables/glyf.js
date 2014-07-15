// The `glyf` table describes the glyphs in TrueType outline format.
// http://www.microsoft.com/typography/otspec/glyf.htm

'use strict';

var check = require('../check');
var _glyph = require('../glyph');
var parse = require('../parse');

// Parse the coordinate data for a glyph.
function parseGlyphCoordinate(p, flag, previousValue, shortVectorBitMask, sameBitMask) {
    var v;
    if (flag & shortVectorBitMask) {
        // The coordinate is 1 byte long.
        v = p.parseByte();
        // The `same` bit is re-used for short values to signify the sign of the value.
        if (!(flag & sameBitMask)) {
            v = -v;
        }
        v = previousValue + v;
    } else {
        //  The coordinate is 2 bytes long.
        // If the `same` bit is set, the coordinate is the same as the previous coordinate.
        if (flag & sameBitMask) {
            v = previousValue;
        } else {
            // Parse the coordinate as a signed 16-bit delta value.
            v = previousValue + p.parseShort();
        }
    }
    return v;
}

// Parse a TrueType glyph.
function parseGlyph(data, start, index, font) {
    var p, glyph, flag, i, j, flags,
        endPointIndices, numberOfCoordinates, repeatCount, points, point, px, py,
        component, moreComponents, arg1, arg2, scale, xScale, yScale, scale01, scale10;
    p = new parse.Parser(data, start);
    glyph = new _glyph.TrueTypeGlyph(font, index);
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
            if (flag & 8) {
                repeatCount = p.parseByte();
                for (j = 0; j < repeatCount; j += 1) {
                    flags.push(flag);
                    i += 1;
                }
            }
        }
        check.argument(flags.length === numberOfCoordinates, 'Bad flags.');

        if (endPointIndices.length > 0) {
            points = [];
            // X/Y coordinates are relative to the previous point, except for the first point which is relative to 0,0.
            if (numberOfCoordinates > 0) {
                for (i = 0; i < numberOfCoordinates; i += 1) {
                    flag = flags[i];
                    point = {};
                    point.onCurve = !!(flag & 1);
                    point.lastPointOfContour = endPointIndices.indexOf(i) >= 0;
                    points.push(point);
                }
                px = 0;
                for (i = 0; i < numberOfCoordinates; i += 1) {
                    flag = flags[i];
                    point = points[i];
                    point.x = parseGlyphCoordinate(p, flag, px, 2, 16);
                    px = point.x;
                }

                py = 0;
                for (i = 0; i < numberOfCoordinates; i += 1) {
                    flag = flags[i];
                    point = points[i];
                    point.y = parseGlyphCoordinate(p, flag, py, 4, 32);
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
            if (flags & 1) {
                // The arguments are words
                arg1 = p.parseShort();
                arg2 = p.parseShort();
                component.dx = arg1;
                component.dy = arg2;
            } else {
                // The arguments are bytes
                arg1 = p.parseChar();
                arg2 = p.parseChar();
                component.dx = arg1;
                component.dy = arg2;
            }
            if (flags & 8) {
                // We have a scale
                // TODO parse in 16-bit signed fixed number with the low 14 bits of fraction (2.14).
                scale = p.parseShort();
            } else if (flags & 64) {
                // We have an X / Y scale
                xScale = p.parseShort();
                yScale = p.parseShort();
            } else if (flags & 128) {
                // We have a 2x2 transformation
                xScale = p.parseShort();
                scale01 = p.parseShort();
                scale10 = p.parseShort();
                yScale = p.parseShort();
            }

            glyph.components.push(component);
            moreComponents = !!(flags & 32);
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
            glyphs.push(new _glyph.TrueTypeGlyph(font, i));
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

exports.parse = parseGlyfTable;
