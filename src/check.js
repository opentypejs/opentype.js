// Run-time checking of preconditions.

'use strict';

exports.fail = function(message) {
    throw new Error(message);
};

// Precondition function that checks if the given predicate is true.
// If not, it will throw an error.
exports.argument = function(predicate, message) {
    if (!predicate) {
        exports.fail(message);
    }
};

// Precondition function that checks if the given assertion is true.
// If not, it will throw an error.
exports.assert = exports.argument;
