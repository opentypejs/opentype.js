// The Glyph object

'use strict';

var check = require('./check');
var draw = require('./draw');
var path = require('./path');

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
    draw.line(ctx, x, -10000, x, 10000);
    draw.line(ctx, -10000, y, 10000, y);
    // Draw the glyph box
    ctx.strokeStyle = 'blue';
    draw.line(ctx, x + (this.xMin * scale), -10000, x + (this.xMin * scale), 10000);
    draw.line(ctx, x + (this.xMax * scale), -10000, x + (this.xMax * scale), 10000);
    draw.line(ctx, -10000, y + (-this.yMin * scale), 10000, y + (-this.yMin * scale));
    draw.line(ctx, -10000, y + (-this.yMax * scale), 10000, y + (-this.yMax * scale));
    // Draw the advance width
    ctx.strokeStyle = 'green';
    draw.line(ctx, x + (this.advanceWidth * scale), -10000, x + (this.advanceWidth * scale), 10000);
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
    check.argument(currentContour.length === 0, 'There are still points left in the current contour.');
    return contours;
};

// Convert the glyph to a Path we can draw on a drawing context.
//
// x - Horizontal position of the glyph. (default: 0)
// y - Vertical position of the *baseline* of the glyph. (default: 0)
// fontSize - Font size, in pixels (default: 72).
TrueTypeGlyph.prototype.getPath = function (x, y, fontSize) {
    var scale, p, contours, i, realFirstPoint, j, contour, pt, firstPt,
        prevPt, midPt, curvePt, lastPt;
    x = x !== undefined ? x : 0;
    y = y !== undefined ? y : 0;
    fontSize = fontSize !== undefined ? fontSize : 72;
    scale = 1 / this.font.unitsPerEm * fontSize;
    p = new path.Path();
    if (!this.points) {
        return p;
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
        p.moveTo(x + (firstPt.x * scale), y + (-firstPt.y * scale));

        for (j = realFirstPoint ? 1 : 0; j < contour.length; j += 1) {
            pt = contour[j];
            prevPt = j === 0 ? firstPt : contour[j - 1];
            if (prevPt.onCurve && pt.onCurve) {
                // This is a straight line.
                p.lineTo(x + (pt.x * scale), y + (-pt.y * scale));
            } else if (prevPt.onCurve && !pt.onCurve) {
                curvePt = pt;
            } else if (!prevPt.onCurve && !pt.onCurve) {
                midPt = { x: (prevPt.x + pt.x) / 2, y: (prevPt.y + pt.y) / 2 };
                p.quadraticCurveTo(x + (prevPt.x * scale), y + (-prevPt.y * scale), x + (midPt.x * scale), y + (-midPt.y * scale));
                curvePt = pt;
            } else if (!prevPt.onCurve && pt.onCurve) {
                // Previous point off-curve, this point on-curve.
                p.quadraticCurveTo(x + (curvePt.x * scale), y + (-curvePt.y * scale), x + (pt.x * scale), y + (-pt.y * scale));
                curvePt = null;
            } else {
                throw new Error('Invalid state.');
            }
        }
        if (firstPt !== lastPt) {
            // Connect the last and first points
            if (curvePt) {
                p.quadraticCurveTo(x + (curvePt.x * scale), y + (-curvePt.y * scale), x + (firstPt.x * scale), y + (-firstPt.y * scale));
            } else {
                p.lineTo(x + (firstPt.x * scale), y + (-firstPt.y * scale));
            }
        }
    }
    p.closePath();
    return p;
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
    newPath = new path.Path();
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

exports.Glyph = Glyph;
exports.TrueTypeGlyph = TrueTypeGlyph;
exports.CffGlyph = CffGlyph;
