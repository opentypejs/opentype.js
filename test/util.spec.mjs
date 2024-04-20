import assert from 'assert';
import { arraysEqual } from '../src/util.mjs';

describe('util.mjs', function() {
    describe('arraysEqual', function() {
        it('should return true for equal arrays', function() {
            assert.equal(arraysEqual([], []), true);
            assert.equal(arraysEqual([23], [23]), true);
        });

        it('should return false for unequal objects', function() {
            assert.equal(arraysEqual([], [23]), false);
            assert.equal(arraysEqual([23], [42]), false);
            assert.equal(arraysEqual([23], ["23"]), false);
            assert.equal(arraysEqual([23,42], [23]), false);
        });
    });
});
