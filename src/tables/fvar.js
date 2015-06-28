// The `fvar` table stores font variation axes and instances.
// https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6fvar.html

// FIXME: Currently, we drop the names of design axes ("Weight") and
// font instances ("Thin Condensed"). In the spec and also in real
// fonts, these are multilingual properties: The font supplies the
// same name in French, English, etc. In the code below, perhaps we
// should replace 'nameID' by 'name', and keep it as dictionary like
// {en: 'Bold', fr: 'Gras'}? Decoding OpenType/TrueType name IDs to
// IETF BCP-47 language tags would be certainly doable, but it will
// need large changes to the 'name' handling of opentype.js.
// Until this is resolved, we can't write back 'fvar' tables when
// writing fonts (if we did, our name IDs would be dangling
// references).  Therefore, the make() function is currently only
// called from test code.
//
// See also https://github.com/nodebox/opentype.js/issues/144.

'use strict';

var check = require('../check');
var parse = require('../parse');
var table = require('../table');

function makeFvarAxis(axis) {
    return new table.Table('fvarAxis', [
        {name: 'tag', type: 'TAG', value: axis.tag},
        {name: 'minValue', type: 'FIXED', value: axis.minValue << 16},
        {name: 'defaultValue', type: 'FIXED', value: axis.defaultValue << 16},
        {name: 'maxValue', type: 'FIXED', value: axis.maxValue << 16},
        {name: 'flags', type: 'USHORT', value: axis.flags},
        {name: 'nameID', type: 'USHORT', value: axis.nameID}
    ]);
}

function parseFvarAxis(data, start) {
    var axis = {};
    var p = new parse.Parser(data, start);
    axis.tag = p.parseTag();
    axis.minValue = p.parseFixed();
    axis.defaultValue = p.parseFixed();
    axis.maxValue = p.parseFixed();
    axis.flags = p.parseUShort();
    axis.nameID = p.parseUShort();
    return axis;
}

function makeFvarInstance(inst, axes) {
    var fields = [
        {name: 'nameID', type: 'USHORT', value: inst.nameID},
        {name: 'flags', type: 'USHORT', value: inst.flags}
    ];

    for (var i = 0; i < axes.length; ++i) {
        var axisTag = axes[i].tag;
        fields.push({
            name: 'axis ' + axisTag,
            type: 'FIXED',
            value: inst.coordinates[axisTag] << 16
        });
    }

    return new table.Table('fvarInstance', fields);
}

function parseFvarInstance(data, start, axes) {
    var inst = {};
    var p = new parse.Parser(data, start);
    inst.nameID = p.parseUShort();
    inst.flags = p.parseUShort();

    inst.coordinates = {};
    for (var i = 0; i < axes.length; ++i) {
        inst.coordinates[axes[i].tag] = p.parseFixed();
    }

    return inst;
}

function makeFvarTable(fvar) {
    var result = new table.Table('fvar', [
        {name: 'version', type: 'ULONG', value: 0x10000},
        {name: 'offsetToData', type: 'USHORT', value: 0},
        {name: 'countSizePairs', type: 'USHORT', value: 2},
        {name: 'axisCount', type: 'USHORT', value: fvar.axes.length},
        {name: 'axisSize', type: 'USHORT', value: 20},
        {name: 'instanceCount', type: 'USHORT', value: fvar.instances.length},
        {name: 'instanceSize', type: 'USHORT', value: 4 + fvar.axes.length * 4}
    ]);
    result.offsetToData = result.sizeOf();

    for (var i = 0; i < fvar.axes.length; i++) {
        result.fields.push({
            name: 'axis ' + i,
            type: 'TABLE',
            value: makeFvarAxis(fvar.axes[i])});
    }

    for (var j = 0; j < fvar.instances.length; j++) {
        result.fields.push({
            name: 'instance ' + j,
            type: 'TABLE',
            value: makeFvarInstance(fvar.instances[j], fvar.axes)
        });
    }

    return result;
}

function parseFvarTable(data, start) {
    var p = new parse.Parser(data, start);
    var tableVersion = p.parseULong();
    check.argument(tableVersion === 0x00010000, 'Unsupported fvar table version.');
    var offsetToData = p.parseOffset16();
    // Skip countSizePairs.
    p.skip('uShort', 1);
    var axisCount = p.parseUShort();
    var axisSize = p.parseUShort();
    var instanceCount = p.parseUShort();
    var instanceSize = p.parseUShort();

    var axes = [];
    for (var i = 0; i < axisCount; i++) {
        axes.push(parseFvarAxis(data, start + offsetToData + i * axisSize));
    }

    var instances = [];
    var instanceStart = start + offsetToData + axisCount * axisSize;
    for (var j = 0; j < instanceCount; j++) {
        instances.push(parseFvarInstance(data, instanceStart + j * instanceSize, axes));
    }

    return {axes:axes, instances:instances};
}

exports.make = makeFvarTable;
exports.parse = parseFvarTable;
