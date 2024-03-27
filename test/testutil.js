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

export { hex, unhex, unhexArray, createMockObject };
