// Run-time checking of preconditions.

'use strict';

// Precondition function that checks if the given predicate is true.
// If not, it will log an error message to the console.
exports.argument = function (predicate, message) {
    if (!predicate) {
        throw new Error(message);
    }
};
