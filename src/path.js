// Geometric objects

'use strict';

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

exports.Path = Path;
