import assert from 'assert';
import { objectsEqual } from '../src/util.js';

describe('util.js', function() {
    describe('objectsEqual', function() {
        it('should return true for equal objects', function() {
            assert.equal(objectsEqual({}, {}), true);
            assert.equal(objectsEqual({ foo: 23 }, { foo: 23 }), true);
        });

        it('should return false for unequal objects', function() {
            assert.equal(objectsEqual({}, { foo: 23 }), false);
            assert.equal(objectsEqual({ foo: 23 }, { bar: 23 }), false);
            assert.equal(objectsEqual({ foo: 23 }, { bar: 42 }), false);
            assert.equal(objectsEqual({ foo: 23, bar: 42 }, { foo: 23 }), false);
        });
    });
});
