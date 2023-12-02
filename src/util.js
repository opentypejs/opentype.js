function isBrowser() {
    return (
        typeof window !== 'undefined' ||
        typeof WorkerGlobalScope !== 'undefined'
    );
}

function isNode() {
    return (
        typeof window === 'undefined' &&
        typeof global === 'object' &&
        typeof process === 'object'
    );
}

function checkArgument(expression, message) {
    if (!expression) {
        throw message;
    }
}

// Check if 2 arrays of primitives are equal.
function arraysEqual(ar1, ar2) {
    const n = ar1.length;
    if (n !== ar2.length) { return false; }
    for (let i = 0; i < n; i++) {
        if (ar1[i] !== ar2[i]) { return false; }
    }
    return true;
}

// Check if 2 objects are equal
function objectsEqual(obj1, obj2) {
    const val1 = Object.values(obj1);
    const val2 = Object.values(obj2);
    const keys1 = Object.values(obj1);
    const keys2 = Object.values(obj2);

    return arraysEqual(val1, val2) && arraysEqual(keys1, keys2);
}

export { isBrowser, isNode, checkArgument, arraysEqual, objectsEqual };
