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
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    return arraysEqual(val1, val2) && arraysEqual(keys1, keys2);
}

// perform a binary search on an array of objects for a specific key and value
// the array MUST already be sorted by the key in ascending order
// this is way faster than Array.prototype.find()
function binarySearch(array, key, value) {
    let low = 0, high = array.length - 1;
    let result = null;
    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const record = array[mid];
        const recordValue = record[key];
        if (recordValue < value) {
            low = mid + 1;
        } else if (recordValue > value) {
            high = mid - 1;
        } else {
            result = record;
            break;
        }
    }
    return result;
}

function binarySearchIndex(array, key, value) {
    let low = 0, high = array.length - 1;
    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const element = array[mid];
        if (element[key] < value) {
            low = mid + 1;
        } else if (element[key] > value) {
            high = mid - 1;
        } else {
            return mid; // Element found
        }
    }
    return -1; // Element not found
}

function binarySearchInsert(array, key, value) {
    let low = 0, high = array.length;
    const compare = (a, b) => a[key] - b[key];
    while (low < high) {
        const mid = (low + high) >>> 1;
        if (compare(array[mid], value) < 0) low = mid + 1;
        else high = mid;
    }
    array.splice(low, 0, value);

    return low;
}

export { isBrowser, isNode, checkArgument, arraysEqual, objectsEqual, binarySearch, binarySearchIndex, binarySearchInsert };
