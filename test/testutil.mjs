function hex(bytes) {
    const values = [];
    for (let i = 0; i < bytes.length; i++) {
        const b = bytes[i];
        if (b < 16) {
            values.push('0' + b.toString(16));
        } else {
            values.push(b.toString(16));
        }
    }

    return values.join(' ').toUpperCase();
}

function unhex(str) {
    str = str.split(' ').join('');
    const len = str.length / 2;
    const data = new DataView(new ArrayBuffer(len), 0);
    for (let i = 0; i < len; i++) {
        data.setUint8(i, parseInt(str.slice(i * 2, i * 2 + 2), 16));
    }

    return data;
}

function unhexArray(str) {
    return Array.prototype.slice.call(new Uint8Array(unhex(str).buffer));
}

// Function to create a logging handler for any mock object
function createDynamicMockHandler(logsArray, options = {}) {
    const { logPropertyAccess = true, logMethodCalls = true, consoleLog = false } = options;
    
    const optionalLog = (data) => {
        if (!consoleLog) return;
        console.log(`[${consoleLog}] ${JSON.stringify(data)}`);
    };

    return {
        get(target, prop, receiver) {
            // Skip logging for symbols to prevent unintended logging of internal properties
            if (typeof prop === 'symbol') {
                return Reflect.get(target, prop, receiver);
            }

            const actualValue = Reflect.get(target, prop, receiver);
            const isFunction = typeof actualValue === 'function';

            // If the accessed property is a function, return a wrapper to catch invocations
            if (isFunction || !Reflect.has(target, prop)) {
                return new Proxy(function() {}, {
                    apply: function(targetFn, thisArg, argumentsList) {
                        // Log method calls with arguments if enabled
                        if (logMethodCalls) {
                            const data = { property: prop, arguments: argumentsList };
                            logsArray.push(data);
                            optionalLog(data);
                        }
                        // If it's a function, invoke the original function
                        if (isFunction) {
                            return Reflect.apply(actualValue, receiver, argumentsList);
                        }
                        // For non-existent functions, there's nothing to invoke, so return undefined
                        return undefined;
                    }
                });
            } else if (logPropertyAccess) {
                // Immediately log non-function property access if logging is enabled
                const data = { property: prop, value: actualValue };
                logsArray.push(data);
                optionalLog(data);
                return actualValue;
            }

            return actualValue;
        },
        set(target, prop, value) {
            // Log property set operations with the value if enabled
            if (logPropertyAccess) {
                const data = { property: prop, value: value };
                logsArray.push(data);
                optionalLog(data);
            }
            return Reflect.set(target, prop, value);
        }
    };
}

function createMockObject(logsArray, baseObject = {}, options = {}) {
    const handler = createDynamicMockHandler(logsArray, options);
    return new Proxy(baseObject, handler);
}

function enableMockCanvas() {
    if (!global.window) {
        global.window = {};
    }
    if (!global.document) {
        global.document = {};
    }

    window.HTMLCanvasElement = {
        getContext: function () {
            let _fillStyle;
    
            return {
                get fillStyle() {
                    return _fillStyle;
                },
                set fillStyle(value) {
                    const colorMap = {
                        'aliceblue':'#f0f8ff','antiquewhite':'#faebd7','aqua':'#00ffff','aquamarine':'#7fffd4','azure':'#f0ffff',
                        'beige':'#f5f5dc','bisque':'#ffe4c4','black':'#000000','blanchedalmond':'#ffebcd','blue':'#0000ff','blueviolet':'#8a2be2','brown':'#a52a2a','burlywood':'#deb887',
                        'cadetblue':'#5f9ea0','chartreuse':'#7fff00','chocolate':'#d2691e','coral':'#ff7f50','cornflowerblue':'#6495ed','cornsilk':'#fff8dc','crimson':'#dc143c','cyan':'#00ffff',
                        'darkblue':'#00008b','darkcyan':'#008b8b','darkgoldenrod':'#b8860b','darkgray':'#a9a9a9','darkgreen':'#006400','darkkhaki':'#bdb76b','darkmagenta':'#8b008b','darkolivegreen':'#556b2f',
                        'darkorange':'#ff8c00','darkorchid':'#9932cc','darkred':'#8b0000','darksalmon':'#e9967a','darkseagreen':'#8fbc8f','darkslateblue':'#483d8b','darkslategray':'#2f4f4f','darkturquoise':'#00ced1',
                        'darkviolet':'#9400d3','deeppink':'#ff1493','deepskyblue':'#00bfff','dimgray':'#696969','dodgerblue':'#1e90ff',
                        'firebrick':'#b22222','floralwhite':'#fffaf0','forestgreen':'#228b22','fuchsia':'#ff00ff',
                        'gainsboro':'#dcdcdc','ghostwhite':'#f8f8ff','gold':'#ffd700','goldenrod':'#daa520','gray':'#808080','green':'#008000','greenyellow':'#adff2f',
                        'honeydew':'#f0fff0','hotpink':'#ff69b4',
                        'indianred ':'#cd5c5c','indigo':'#4b0082','ivory':'#fffff0','khaki':'#f0e68c',
                        'lavender':'#e6e6fa','lavenderblush':'#fff0f5','lawngreen':'#7cfc00','lemonchiffon':'#fffacd','lightblue':'#add8e6','lightcoral':'#f08080','lightcyan':'#e0ffff','lightgoldenrodyellow':'#fafad2',
                        'lightgrey':'#d3d3d3','lightgreen':'#90ee90','lightpink':'#ffb6c1','lightsalmon':'#ffa07a','lightseagreen':'#20b2aa','lightskyblue':'#87cefa','lightslategray':'#778899','lightsteelblue':'#b0c4de',
                        'lightyellow':'#ffffe0','lime':'#00ff00','limegreen':'#32cd32','linen':'#faf0e6',
                        'magenta':'#ff00ff','maroon':'#800000','mediumaquamarine':'#66cdaa','mediumblue':'#0000cd','mediumorchid':'#ba55d3','mediumpurple':'#9370d8','mediumseagreen':'#3cb371','mediumslateblue':'#7b68ee',
                        'mediumspringgreen':'#00fa9a','mediumturquoise':'#48d1cc','mediumvioletred':'#c71585','midnightblue':'#191970','mintcream':'#f5fffa','mistyrose':'#ffe4e1','moccasin':'#ffe4b5',
                        'navajowhite':'#ffdead','navy':'#000080',
                        'oldlace':'#fdf5e6','olive':'#808000','olivedrab':'#6b8e23','orange':'#ffa500','orangered':'#ff4500','orchid':'#da70d6',
                        'palegoldenrod':'#eee8aa','palegreen':'#98fb98','paleturquoise':'#afeeee','palevioletred':'#d87093','papayawhip':'#ffefd5','peachpuff':'#ffdab9','peru':'#cd853f','pink':'#ffc0cb','plum':'#dda0dd','powderblue':'#b0e0e6','purple':'#800080',
                        'rebeccapurple':'#663399','red':'#ff0000','rosybrown':'#bc8f8f','royalblue':'#4169e1',
                        'saddlebrown':'#8b4513','salmon':'#fa8072','sandybrown':'#f4a460','seagreen':'#2e8b57','seashell':'#fff5ee','sienna':'#a0522d','silver':'#c0c0c0','skyblue':'#87ceeb','slateblue':'#6a5acd','slategray':'#708090','snow':'#fffafa','springgreen':'#00ff7f','steelblue':'#4682b4',
                        'tan':'#d2b48c','teal':'#008080','thistle':'#d8bfd8','tomato':'#ff6347','turquoise':'#40e0d0',
                        'violet':'#ee82ee',
                        'wheat':'#f5deb3','white':'#ffffff','whitesmoke':'#f5f5f5',
                        'yellow':'#ffff00','yellowgreen':'#9acd32'
                    };

                    if (typeof colorMap[value.toLowerCase()] !== 'undefined') {
                        _fillStyle = colorMap[value.toLowerCase()];
                    } else {
                        _fillStyle = '#000000';
                    }
                },
            };
        }
    };

    global.document.createElement = () => window.HTMLCanvasElement;
    window.document = global.document;
}

export { hex, unhex, unhexArray, createMockObject, enableMockCanvas };
