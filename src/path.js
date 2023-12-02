// Geometric objects

import BoundingBox from './bbox.js';

/**
 * A bézier path containing a set of path commands similar to a SVG path.
 * Paths can be drawn on a context using `draw`.
 * @exports opentype.Path
 * @class
 * @constructor
 */
function Path() {
    this.commands = [];
    this.fill = 'black';
    this.stroke = null;
    this.strokeWidth = 1;
}

const decimalRoundingCache = {};

function roundDecimal(float, places) {
    const integerPart = Math.floor(float);
    const decimalPart = float - integerPart;

    if (!decimalRoundingCache[places]) {
        decimalRoundingCache[places] = {};
    }

    if (decimalRoundingCache[places][decimalPart] !== undefined) {
        const roundedDecimalPart = decimalRoundingCache[places][decimalPart];
        return integerPart + roundedDecimalPart;
    }
    
    const roundedDecimalPart = +(Math.round(decimalPart + 'e+' + places) + 'e-' + places);
    decimalRoundingCache[places][decimalPart] = roundedDecimalPart;

    return integerPart + roundedDecimalPart;
}

function optimizeCommands(commands) {
    // separate subpaths
    let subpaths = [[]];
    for (let i = 0; i < commands.length; i += 1) {
        const subpath = subpaths[subpaths.length - 1];
        const cmd = commands[i];
        const firstCommand = subpath[0];
        const secondCommand = subpath[1];
        const previousCommand = subpath[subpath.length - 1];
        subpath.push(cmd);
        if (cmd.type === 'Z') {
            // When closing at the same position as the path started,
            // remove unnecessary line command
            if (
                firstCommand &&
                secondCommand &&
                previousCommand &&
                firstCommand.type === 'M' &&
                secondCommand.type === 'L' &&
                previousCommand.type === 'L' &&
                previousCommand.x === firstCommand.x &&
                previousCommand.y === firstCommand.y
            ) {
                subpath.shift();
                subpath[0].type = 'M';
            }

            if (i + 1 < commands.length) {
                subpaths.push([]);
            }
        } else if (cmd.type === 'L') {
            // remove lines that lead to the same position as the previous command
            if (previousCommand && previousCommand.x === cmd.x && previousCommand.y === cmd.y) {
                subpath.pop();
            }
        }
    }
    commands = [].concat.apply([], subpaths); // flatten again
    return commands;
}

/**
 * Returns options merged with the default options for parsing SVG data
 * @param {object} options (optional)
 */
function createSVGParsingOptions(options) {
    const defaultOptions = {
        decimalPlaces: 2,
        optimize: true,
        flipY: true,
        flipYBase: undefined,
        scale: 1,
        x: 0,
        y: 0
    };
    const newOptions = Object.assign({}, defaultOptions, options);
    return newOptions;
}

/**
 * Returns options merged with the default options for outputting SVG data
 * @param {object} options (optional)
 */
function createSVGOutputOptions(options) {
    // accept number for backwards compatibility
    // and in that case set flipY to false
    if (parseInt(options) === options) {
        options = { decimalPlaces: options, flipY: false };
    }
    const defaultOptions = {
        decimalPlaces: 2,
        optimize: true,
        flipY: true,
        flipYBase: undefined
    };
    const newOptions = Object.assign({}, defaultOptions, options);
    return newOptions;
}

/**
 * Sets the path data from an SVG path element or path notation
 * @param  {string|SVGPathElement}
 * @param  {object}
 */
Path.prototype.fromSVG = function(pathData, options = {}) {
    if (typeof SVGPathElement !== 'undefined' && pathData instanceof SVGPathElement) {
        pathData = pathData.getAttribute('d');
    }

    // set/merge default options
    options = createSVGParsingOptions(options);

    this.commands = [];

    // TODO: a generator function could possibly increase performance and reduce memory usage,
    // but our current build process doesn't allow to use those yet.
    const number = '0123456789';
    const supportedCommands = 'MmLlQqCcZzHhVv';
    const unsupportedCommands = 'SsTtAa';
    const sign = '-+';

    let command = {};
    let buffer = [''];

    let isUnexpected = false;

    function parseBuffer(buffer) {
        return buffer.filter(b => b.length).map(b => {
            let float = parseFloat(b);
            if (options.decimalPlaces || options.decimalPlaces === 0) {
                float = roundDecimal(float, options.decimalPlaces);
            }
            return float;
        });
    }

    function makeRelative(buffer) {
        if (!this.commands.length) {
            return buffer;
        }
        const lastCommand = this.commands[this.commands.length - 1];
        for (let i = 0; i < buffer.length; i++) {
            buffer[i] += lastCommand[i & 1 ? 'y' : 'x'];
        }
        return buffer;
    }

    function applyCommand() {
        // ignore empty commands
        if (command.type === undefined) {
            return;
        }
        const commandType = command.type.toUpperCase();
        const relative = commandType !== 'Z' && command.type.toUpperCase() !== command.type;
        let parsedBuffer = parseBuffer(buffer);
        buffer = [''];
        if (!parsedBuffer.length && commandType !== 'Z') {
            return;
        }
        if (relative && commandType !== 'H' && commandType !== 'V') {
            parsedBuffer = makeRelative.apply(this, [parsedBuffer]);
        }

        const currentX = this.commands.length ? this.commands[this.commands.length - 1].x || 0 : 0;
        const currentY = this.commands.length ? this.commands[this.commands.length - 1].y || 0 : 0;

        switch (commandType) {
            case 'M':
                this.moveTo(...parsedBuffer);
                break;
            case 'L':
                this.lineTo(...parsedBuffer);
                break;
            case 'V':
                // multiple values interpreted as consecutive commands
                for (let i = 0; i < parsedBuffer.length; i++) {
                    let offset = 0;
                    if (relative) {
                        offset = this.commands.length ? (this.commands[this.commands.length - 1].y || 0) : 0;
                    }
                    this.lineTo(currentX, parsedBuffer[i] + offset);
                }
                break;
            case 'H':
                // multiple values interpreted as consecutive commands
                for (let i = 0; i < parsedBuffer.length; i++) {
                    let offset = 0;
                    if (relative) {
                        offset = this.commands.length ? (this.commands[this.commands.length - 1].x || 0) : 0;
                    }
                    this.lineTo(parsedBuffer[i] + offset, currentY);
                }
                break;
            case 'C':
                this.bezierCurveTo(...parsedBuffer);
                break;
            case 'Q':
                this.quadraticCurveTo(...parsedBuffer);
                break;
            case 'Z':
                if (this.commands.length < 1 || this.commands[this.commands.length - 1].type !== 'Z') {
                    this.close();
                }
                break;
        }

        if (this.commands.length) {
            for (const prop in this.commands[this.commands.length - 1]) {
                if (this.commands[this.commands.length - 1][prop] === undefined) {
                    this.commands[this.commands.length - 1][prop] = 0;
                }
            }
        }
    }

    for (let i = 0; i < pathData.length; i++) {
        const token = pathData.charAt(i);
        const lastBuffer = buffer[buffer.length - 1];
        if (number.indexOf(token) > -1) {
            buffer[buffer.length - 1] += token;
        } else if (sign.indexOf(token) > -1) {
            if (!command.type && !this.commands.length) {
                command.type = 'L';
            }

            if (token === '-') {
                if (!command.type || lastBuffer.indexOf('-') > 0) {
                    isUnexpected = true;
                } else if (lastBuffer.length) {
                    buffer.push('-');
                } else {
                    buffer[buffer.length - 1] = token;
                }
            } else {
                if (!command.type || lastBuffer.length > 0) {
                    isUnexpected = true;
                } else {
                    continue;
                }
            }
        } else if (supportedCommands.indexOf(token) > -1) {
            if (command.type) {
                applyCommand.apply(this);
                command = { type: token };
            } else {
                command.type = token;
            }
        } else if (unsupportedCommands.indexOf(token) > -1) {
            // TODO: try to interpolate commands not directly supported?
            throw new Error('Unsupported path command: ' + token + '. Currently supported commands are ' + supportedCommands.split('').join(', ') + '.');
        } else if (' ,\t\n\r\f\v'.indexOf(token) > -1) {
            buffer.push('');
        } else if (token === '.') {
            if (!command.type || lastBuffer.indexOf(token) > -1) {
                isUnexpected = true;
            } else {
                buffer[buffer.length - 1] += token;
            }
        } else {
            isUnexpected = true;
        }

        if (isUnexpected) {
            throw new Error('Unexpected character: ' + token + ' at offset ' + i);
        }
    }
    applyCommand.apply(this);

    if (options.optimize) {
        this.commands = optimizeCommands(this.commands);
    }

    const flipY = options.flipY;
    let flipYBase = options.flipYBase;
    if (flipY === true && options.flipYBase === undefined) {
        const boundingBox = this.getBoundingBox();
        flipYBase = boundingBox.y1 + boundingBox.y2;
    }
    // apply x/y offset, flipping and scaling
    for (const i in this.commands) {
        const cmd = this.commands[i];
        for (const prop in cmd) {
            if (['x', 'x1', 'x2'].includes(prop)) {
                this.commands[i][prop] = options.x + cmd[prop] * options.scale;
            } else if (['y', 'y1', 'y2'].includes(prop)) {
                this.commands[i][prop] = options.y + (flipY ? flipYBase - cmd[prop] : cmd[prop]) * options.scale;
            }
        }
    }

    return this;
};

/**
 * Generates a new Path() from an SVG path element or path notation
 * @param  {string|SVGPathElement}
 * @param  {object}
 */
Path.fromSVG = function(path, options) {
    const newPath = new Path();
    return newPath.fromSVG(path, options);
};

/**
 * @param  {number} x
 * @param  {number} y
 */
Path.prototype.moveTo = function(x, y) {
    this.commands.push({
        type: 'M',
        x: x,
        y: y
    });
};

/**
 * @param  {number} x
 * @param  {number} y
 */
Path.prototype.lineTo = function(x, y) {
    this.commands.push({
        type: 'L',
        x: x,
        y: y
    });
};

/**
 * Draws cubic curve
 * @function
 * curveTo
 * @memberof opentype.Path.prototype
 * @param  {number} x1 - x of control 1
 * @param  {number} y1 - y of control 1
 * @param  {number} x2 - x of control 2
 * @param  {number} y2 - y of control 2
 * @param  {number} x - x of path point
 * @param  {number} y - y of path point
 */

/**
 * Draws cubic curve
 * @function
 * bezierCurveTo
 * @memberof opentype.Path.prototype
 * @param  {number} x1 - x of control 1
 * @param  {number} y1 - y of control 1
 * @param  {number} x2 - x of control 2
 * @param  {number} y2 - y of control 2
 * @param  {number} x - x of path point
 * @param  {number} y - y of path point
 * @see curveTo
 */
Path.prototype.curveTo = Path.prototype.bezierCurveTo = function(x1, y1, x2, y2, x, y) {
    this.commands.push({
        type: 'C',
        x1: x1,
        y1: y1,
        x2: x2,
        y2: y2,
        x: x,
        y: y
    });
};

/**
 * Draws quadratic curve
 * @function
 * quadraticCurveTo
 * @memberof opentype.Path.prototype
 * @param  {number} x1 - x of control
 * @param  {number} y1 - y of control
 * @param  {number} x - x of path point
 * @param  {number} y - y of path point
 */

/**
 * Draws quadratic curve
 * @function
 * quadTo
 * @memberof opentype.Path.prototype
 * @param  {number} x1 - x of control
 * @param  {number} y1 - y of control
 * @param  {number} x - x of path point
 * @param  {number} y - y of path point
 */
Path.prototype.quadTo = Path.prototype.quadraticCurveTo = function(x1, y1, x, y) {
    this.commands.push({
        type: 'Q',
        x1: x1,
        y1: y1,
        x: x,
        y: y
    });
};

/**
 * Closes the path
 * @function closePath
 * @memberof opentype.Path.prototype
 */

/**
 * Close the path
 * @function close
 * @memberof opentype.Path.prototype
 */
Path.prototype.close = Path.prototype.closePath = function() {
    this.commands.push({
        type: 'Z'
    });
};

/**
 * Add the given path or list of commands to the commands of this path.
 * @param  {Array} pathOrCommands - another opentype.Path, an opentype.BoundingBox, or an array of commands.
 */
Path.prototype.extend = function(pathOrCommands) {
    if (pathOrCommands.commands) {
        pathOrCommands = pathOrCommands.commands;
    } else if (pathOrCommands instanceof BoundingBox) {
        const box = pathOrCommands;
        this.moveTo(box.x1, box.y1);
        this.lineTo(box.x2, box.y1);
        this.lineTo(box.x2, box.y2);
        this.lineTo(box.x1, box.y2);
        this.close();
        return;
    }

    Array.prototype.push.apply(this.commands, pathOrCommands);
};

/**
 * Calculate the bounding box of the path.
 * @returns {opentype.BoundingBox}
 */
Path.prototype.getBoundingBox = function() {
    const box = new BoundingBox();

    let startX = 0;
    let startY = 0;
    let prevX = 0;
    let prevY = 0;
    for (let i = 0; i < this.commands.length; i++) {
        const cmd = this.commands[i];
        switch (cmd.type) {
            case 'M':
                box.addPoint(cmd.x, cmd.y);
                startX = prevX = cmd.x;
                startY = prevY = cmd.y;
                break;
            case 'L':
                box.addPoint(cmd.x, cmd.y);
                prevX = cmd.x;
                prevY = cmd.y;
                break;
            case 'Q':
                box.addQuad(prevX, prevY, cmd.x1, cmd.y1, cmd.x, cmd.y);
                prevX = cmd.x;
                prevY = cmd.y;
                break;
            case 'C':
                box.addBezier(prevX, prevY, cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
                prevX = cmd.x;
                prevY = cmd.y;
                break;
            case 'Z':
                prevX = startX;
                prevY = startY;
                break;
            default:
                throw new Error('Unexpected path command ' + cmd.type);
        }
    }
    if (box.isEmpty()) {
        box.addPoint(0, 0);
    }
    return box;
};

/**
 * Draw the path to a 2D context.
 * @param {CanvasRenderingContext2D} ctx - A 2D drawing context.
 */
Path.prototype.draw = function(ctx) {
    ctx.beginPath();
    for (let i = 0; i < this.commands.length; i += 1) {
        const cmd = this.commands[i];
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

/**
 * Convert the Path to a string of path data instructions
 * See http://www.w3.org/TR/SVG/paths.html#PathData
 * @param  {object|number} [options={decimalPlaces:2, optimize:true}] - Options object (or amount of decimal places for floating-point values for backwards compatibility)
 * @return {string}
 */
Path.prototype.toPathData = function(options) {
    // set/merge default options
    options = createSVGOutputOptions(options);

    function floatToString(v) {
        const rounded = roundDecimal(v, options.decimalPlaces);
        if (Math.round(v) === rounded) {
            return '' + rounded;
        } else {
            return rounded.toFixed(options.decimalPlaces);
        }
    }

    function packValues() {
        let s = '';
        for (let i = 0; i < arguments.length; i += 1) {
            const v = arguments[i];
            if (v >= 0 && i > 0) {
                s += ' ';
            }

            s += floatToString(v);
        }

        return s;
    }

    let commandsCopy = this.commands;
    if (options.optimize) {
        // apply path optimizations
        commandsCopy = JSON.parse(JSON.stringify(this.commands)); // make a deep clone
        commandsCopy = optimizeCommands(commandsCopy);
    }

    const flipY = options.flipY;
    let flipYBase = options.flipYBase;
    if (flipY === true && flipYBase === undefined) {
        const tempPath = new Path();
        tempPath.extend(commandsCopy);
        const boundingBox = tempPath.getBoundingBox();
        flipYBase = boundingBox.y1 + boundingBox.y2;
    }
    let d = '';
    for (let i = 0; i < commandsCopy.length; i += 1) {
        const cmd = commandsCopy[i];
        if (cmd.type === 'M') {
            d += 'M' + packValues(
                cmd.x,
                flipY ? flipYBase - cmd.y : cmd.y
            );
        } else if (cmd.type === 'L') {
            d += 'L' + packValues(
                cmd.x,
                flipY ? flipYBase - cmd.y : cmd.y
            );
        } else if (cmd.type === 'C') {
            d += 'C' + packValues(
                cmd.x1,
                flipY ? flipYBase - cmd.y1 : cmd.y1,
                cmd.x2,
                flipY ? flipYBase - cmd.y2 : cmd.y2,
                cmd.x,
                flipY ? flipYBase - cmd.y : cmd.y
            );
        } else if (cmd.type === 'Q') {
            d += 'Q' + packValues(
                cmd.x1,
                flipY ? flipYBase - cmd.y1 : cmd.y1,
                cmd.x,
                flipY ? flipYBase - cmd.y : cmd.y
            );
        } else if (cmd.type === 'Z') {
            d += 'Z';
        }
    }

    return d;
};

/**
 * Convert the path to an SVG <path> element, as a string.
 * @param  {object|number} [options={decimalPlaces:2, optimize:true}] - Options object (or amount of decimal places for floating-point values for backwards compatibility)
 * @param  {string} - will be calculated automatically, but can be provided from Glyph's wrapper function
 * @return {string}
 */
Path.prototype.toSVG = function(options, pathData) {
    if (!pathData) {
        pathData = this.toPathData(options);
    }
    let svg = '<path d="';
    svg += pathData;
    svg += '"';
    if (this.fill !== undefined && this.fill !== 'black') {
        if (this.fill === null) {
            svg += ' fill="none"';
        } else {
            svg += ' fill="' + this.fill + '"';
        }
    }

    if (this.stroke) {
        svg += ' stroke="' + this.stroke + '" stroke-width="' + this.strokeWidth + '"';
    }

    svg += '/>';
    return svg;
};

/**
 * Convert the path to a DOM element.
 * @param  {object|number} [options={decimalPlaces:2, optimize:true}] - Options object (or amount of decimal places for floating-point values for backwards compatibility)
 * @param  {string} - will be calculated automatically, but can be provided from Glyph's wrapper functionions object (or amount of decimal places for floating-point values for backwards compatibility)
 * @return {SVGPathElement}
 */
Path.prototype.toDOMElement = function(options, pathData) {
    if (!pathData) {
        pathData = this.toPathData(options);
    }
    const temporaryPath = pathData;
    const newPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    newPath.setAttribute('d', temporaryPath);

    if (this.fill !== undefined && this.fill !== 'black') {
        if (this.fill === null) {
            newPath.setAttribute('fill', 'none');
        } else {
            newPath.setAttribute('fill', this.fill);
        }
    }
    
    if (this.stroke) {
        newPath.setAttribute('stroke', this.stroke);
        newPath.setAttribute('stroke-width', this.strokeWidth);
    }

    return newPath;
};

export default Path;
