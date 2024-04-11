// The `fvar` table stores font variation axes and instances.
// https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6fvar.html

import check from '../check.js';
import parse from '../parse.js';
import table from '../table.js';
import { getNameByID } from './name.js';

function makeFvarAxis(n, axis) {
    return [
        {name: 'tag_' + n, type: 'TAG', value: axis.tag},
        {name: 'minValue_' + n, type: 'FIXED', value: axis.minValue << 16},
        {name: 'defaultValue_' + n, type: 'FIXED', value: axis.defaultValue << 16},
        {name: 'maxValue_' + n, type: 'FIXED', value: axis.maxValue << 16},
        {name: 'flags_' + n, type: 'USHORT', value: 0},
        {name: 'nameID_' + n, type: 'USHORT', value: axis.axisNameID}
    ];
}

function parseFvarAxis(data, start, names) {
    const axis = {};
    const p = new parse.Parser(data, start);
    axis.tag = p.parseTag();
    axis.minValue = p.parseFixed();
    axis.defaultValue = p.parseFixed();
    axis.maxValue = p.parseFixed();
    p.skip('uShort', 1);  // reserved for flags; no values defined
    const axisNameID = p.parseUShort();
    axis.axisNameID = axisNameID;
    axis.name = getNameByID(names, axisNameID);
    return axis;
}

function makeFvarInstance(n, inst, axes, optionalFields = {}) {
    const fields = [
        {name: 'nameID_' + n, type: 'USHORT', value: inst.subfamilyNameID},
        {name: 'flags_' + n, type: 'USHORT', value: 0}
    ];

    for (let i = 0; i < axes.length; ++i) {
        const axisTag = axes[i].tag;
        fields.push({
            name: 'axis_' + n + ' ' + axisTag,
            type: 'FIXED',
            value: inst.coordinates[axisTag] << 16
        });
    }

    if (optionalFields && optionalFields.postScriptNameID) {
        fields.push({
            name: 'postScriptNameID_',
            type: 'USHORT',
            value: inst.postScriptNameID !== undefined? inst.postScriptNameID : 0xFFFF
        });
    }

    return fields;
}

function parseFvarInstance(data, start, axes, names, instanceSize) {
    const inst = {};
    const p = new parse.Parser(data, start);
    const subfamilyNameID = p.parseUShort();
    inst.subfamilyNameID = subfamilyNameID;
    inst.name = getNameByID(names, subfamilyNameID, [2, 17]);
    p.skip('uShort', 1);  // reserved for flags; no values defined

    inst.coordinates = {};
    for (let i = 0; i < axes.length; ++i) {
        inst.coordinates[axes[i].tag] = p.parseFixed();
    }

    if (p.relativeOffset === instanceSize) {
        inst.postScriptNameID = undefined;
        inst.postScriptName = undefined;
        return inst;
    }

    const postScriptNameID = p.parseUShort();
    inst.postScriptNameID = postScriptNameID == 0xFFFF ? undefined : postScriptNameID;
    inst.postScriptName = inst.postScriptNameID !== undefined ? getNameByID(names, postScriptNameID, [6]) : '';

    return inst;
}

function makeFvarTable(fvar, names) {
    
    const result = new table.Table('fvar', [
        {name: 'version', type: 'ULONG', value: 0x10000},
        {name: 'offsetToData', type: 'USHORT', value: 0},
        {name: 'countSizePairs', type: 'USHORT', value: 2},
        {name: 'axisCount', type: 'USHORT', value: fvar.axes.length},
        {name: 'axisSize', type: 'USHORT', value: 20},
        {name: 'instanceCount', type: 'USHORT', value: fvar.instances.length},
        {name: 'instanceSize', type: 'USHORT', value: 4 + fvar.axes.length * 4}
    ]);
    result.offsetToData = result.sizeOf();

    for (let i = 0; i < fvar.axes.length; i++) {
        result.fields = result.fields.concat(makeFvarAxis(i, fvar.axes[i], names));
    }

    const optionalFields = {};

    // first loop over instances: find out if at least one has postScriptNameID defined
    for (let j = 0; j < fvar.instances.length; j++) {
        if(fvar.instances[j].postScriptNameID !== undefined) {
            result.instanceSize += 2;
            optionalFields.postScriptNameID = true;
            break;
        }
    }

    // second loop over instances: find out if at least one has postScriptNameID defined
    for (let j = 0; j < fvar.instances.length; j++) {
        result.fields = result.fields.concat(makeFvarInstance(
            j,
            fvar.instances[j],
            fvar.axes,
            optionalFields
        ));
    }

    return result;
}

function parseFvarTable(data, start, names) {
    const p = new parse.Parser(data, start);
    const tableVersion = p.parseULong();
    check.argument(tableVersion === 0x00010000, 'Unsupported fvar table version.');
    const offsetToData = p.parseOffset16();
    // Skip countSizePairs.
    p.skip('uShort', 1);
    const axisCount = p.parseUShort();
    const axisSize = p.parseUShort();
    const instanceCount = p.parseUShort();
    const instanceSize = p.parseUShort();

    const axes = [];
    for (let i = 0; i < axisCount; i++) {
        axes.push(parseFvarAxis(data, start + offsetToData + i * axisSize, names));
    }

    const instances = [];
    const instanceStart = start + offsetToData + axisCount * axisSize;
    for (let j = 0; j < instanceCount; j++) {
        instances.push(parseFvarInstance(data, instanceStart + j * instanceSize, axes, names, instanceSize));
    }

    return {axes: axes, instances: instances};
}

export default { make: makeFvarTable, parse: parseFvarTable };
