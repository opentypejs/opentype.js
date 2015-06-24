'use strict';

var assert = require('assert');
var mocha = require('mocha');
var describe = mocha.describe;
var it = mocha.it;
var testutil = require('../testutil.js');
var loca = require('../../src/tables/loca.js');

describe('tables/loca.js', function() {
    it('can parse the short version', function() {
        var data = testutil.unhex('DEAD BEEF 0010 0100 80CE');
        assert.deepEqual([32, 512, 2 * 0x80ce], loca.parse(data, 4, 2, true));
    });

    it('can parse the long version', function() {
        var data = testutil.unhex('DEADBEEF 00000010 00000100 ABCD5678');
        assert.deepEqual([0x10, 0x100, 0xabcd5678], loca.parse(data, 4, 2, false));
    });
});
