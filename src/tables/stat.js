// The `STAT` table stores information on design attributes for font-style variants
// https://learn.microsoft.com/en-us/typography/opentype/spec/STAT

import check from '../check.js';
import { default as parse, Parser } from '../parse.js';
import table from '../table.js';

const axisRecordStruct = {
    tag: Parser.tag,
    nameID: Parser.uShort,
    ordering: Parser.uShort
};

const axisValueParsers = new Array(5);

// https://learn.microsoft.com/en-us/typography/opentype/otspec191alpha/STAT_delta#axis-value-table-format-1
axisValueParsers[1] = function axisValueParser1() {
    return {
        axisIndex: this.parseUShort(),
        flags: this.parseUShort(),
        valueNameID: this.parseUShort(),
        value: this.parseFixed()
    };
};

// https://learn.microsoft.com/en-us/typography/opentype/otspec191alpha/STAT_delta#axis-value-table-format-2
axisValueParsers[2] = function axisValueParser2() {
    return {
        axisIndex: this.parseUShort(),
        flags: this.parseUShort(),
        valueNameID: this.parseUShort(),
        nominalValue: this.parseFixed(),
        rangeMinValue: this.parseFixed(),
        rangeMaxValue: this.parseFixed()
    };
};

// https://learn.microsoft.com/en-us/typography/opentype/otspec191alpha/STAT_delta#axis-value-table-format-3
axisValueParsers[3] = function axisValueParser3() {
    return {
        axisIndex: this.parseUShort(),
        flags: this.parseUShort(),
        valueNameID: this.parseUShort(),
        value: this.parseFixed(),
        linkedValue: this.parseFixed()
    };

};

// https://learn.microsoft.com/en-us/typography/opentype/otspec191alpha/STAT_delta#axis-value-table-format-4
axisValueParsers[4] = function axisValueParser4() {
    const axisCount = this.parseUShort();
    return {
        flags: this.parseUShort(),
        valueNameID: this.parseUShort(),
        axisValues: this.parseList(axisCount, function() {
            return {
                axisIndex: this.parseUShort(),
                value: this.parseFixed()
            };
        })
    };
};

function parseSTATAxisValue() {
    const valueTableFormat = this.parseUShort();
    const axisValueParser = axisValueParsers[valueTableFormat];
    const formatStub = {
        format: valueTableFormat
    };
    if (axisValueParser === undefined) {
        console.warn(`Unknown axis value table format ${valueTableFormat}`);
        return formatStub;
    }
    return Object.assign(formatStub, this.parseStruct(axisValueParser.bind(this)));
}

function parseSTATTable(data, start, fvar) {
    if (!start) {
        start = 0;
    }

    const p = new parse.Parser(data, start);
    const tableVersionMajor = p.parseUShort();
    const tableVersionMinor = p.parseUShort();

    if (tableVersionMajor !== 1) {
        console.warn(`Unsupported STAT table version ${tableVersionMajor}.${tableVersionMinor}`);
    }
    const version = [
        tableVersionMajor, tableVersionMinor
    ];

    const designAxisSize = p.parseUShort();
    const designAxisCount = p.parseUShort();
    const designAxesOffset = p.parseOffset32();
    const axisValueCount = p.parseUShort();
    const offsetToAxisValueOffsets = p.parseOffset32();
    const elidedFallbackNameID = (tableVersionMajor > 1 || tableVersionMinor > 0) ? p.parseUShort() : undefined;

    if (fvar !== undefined) {
        check.argument(designAxisCount >= fvar.axes.length, 'STAT axis count must be greater than or equal to fvar axis count');
    }

    if (axisValueCount > 0) {
        check.argument(designAxisCount >= 0, 'STAT axis count must be greater than 0 if STAT axis value count is greater than 0');
    }

    const axes = [];
    for (let i = 0; i < designAxisCount; i++) {
        p.offset = start + designAxesOffset;
        p.relativeOffset = i * designAxisSize;
        axes.push(p.parseStruct(axisRecordStruct));
    }

    p.offset = start;
    p.relativeOffset = offsetToAxisValueOffsets;

    const valueOffsets = p.parseUShortList(axisValueCount);
    const values = [];
    for (let i = 0; i < axisValueCount; i++) {
        p.offset = start + offsetToAxisValueOffsets;
        p.relativeOffset = valueOffsets[i];
        values.push(parseSTATAxisValue.apply(p));
    }

    return {
        version,
        axes,
        values,
        elidedFallbackNameID
    };
}

const axisValueMakers = new Array(5);

// https://learn.microsoft.com/en-us/typography/opentype/otspec191alpha/STAT_delta#axis-value-table-format-1
axisValueMakers[1] = function axisValueMaker1(n, table) {
    return [
        {name: `format${n}`, type: 'USHORT', value: 1},
        {name: `axisIndex${n}`, type: 'USHORT', value: table.axisIndex},
        {name: `flags${n}`, type: 'USHORT', value: table.flags},
        {name: `valueNameID${n}`, type: 'USHORT', value: table.valueNameID},
        {name: `value${n}`, type: 'FLOAT', value: table.value}
    ];
};

// https://learn.microsoft.com/en-us/typography/opentype/otspec191alpha/STAT_delta#axis-value-table-format-2
axisValueMakers[2] = function axisValueMaker2(n, table) {
    return [
        {name: `format${n}`, type: 'USHORT', value: 2},
        {name: `axisIndex${n}`, type: 'USHORT', value: table.axisIndex},
        {name: `flags${n}`, type: 'USHORT', value: table.flags},
        {name: `valueNameID${n}`, type: 'USHORT', value: table.valueNameID},
        {name: `nominalValue${n}`, type: 'FLOAT', value: table.nominalValue},
        {name: `rangeMinValue${n}`, type: 'FLOAT', value: table.rangeMinValue},
        {name: `rangeMaxValue${n}`, type: 'FLOAT', value: table.rangeMaxValue}
    ];
};

// https://learn.microsoft.com/en-us/typography/opentype/otspec191alpha/STAT_delta#axis-value-table-format-3
axisValueMakers[3] = function axisValueMaker3(n, table) {
    return [
        {name: `format${n}`, type: 'USHORT', value: 3},
        {name: `axisIndex${n}`, type: 'USHORT', value: table.axisIndex},
        {name: `flags${n}`, type: 'USHORT', value: table.flags},
        {name: `valueNameID${n}`, type: 'USHORT', value: table.valueNameID},
        {name: `value${n}`, type: 'FLOAT', value: table.value},
        {name: `linkedValue${n}`, type: 'FLOAT', value: table.linkedValue}
    ];
};

// https://learn.microsoft.com/en-us/typography/opentype/otspec191alpha/STAT_delta#axis-value-table-format-4
axisValueMakers[4] = function axisValueMaker4(n, table) {
    let returnFields = [
        {name: `format${n}`, type: 'USHORT', value: 4},
        {name: `axisCount${n}`, type: 'USHORT', value: table.axisValues.length},
        {name: `flags${n}`, type: 'USHORT', value: table.flags},
        {name: `valueNameID${n}`, type: 'USHORT', value: table.valueNameID}
    ];

    for (let i = 0; i < table.axisValues.length; i++) {
        returnFields = returnFields.concat([
            {name: `format${n}axisIndex${i}`, type: 'USHORT', value: table.axisValues[i].axisIndex},
            {name: `format${n}value${i}`, type: 'FLOAT', value: table.axisValues[i].value},
        ]);
    }

    return returnFields;
};

function makeSTATAxisRecord(n, axis) {
    return new table.Record('axisRecord_' + n, [
        {name: 'axisTag_' + n, type: 'TAG', value: axis.tag},
        {name: 'axisNameID_' + n, type: 'USHORT', value: axis.nameID},
        {name: 'axisOrdering_' + n, type: 'USHORT', value: axis.ordering}
    ]);
}

function makeSTATValueTable(n, tableData) {
    const valueTableFormat = tableData.format;
    const axisValueMaker = axisValueMakers[valueTableFormat];
    check.argument(axisValueMaker !== undefined, `Unknown axis value table format ${valueTableFormat}`);
    const fields = axisValueMaker(n, tableData);
    return new table.Table('axisValueTable_' + n, fields);
}

function makeSTATTable(STAT) {
    const result = new table.Table('STAT', [
        {name: 'majorVersion', type: 'USHORT', value: 1},
        {name: 'minorVersion', type: 'USHORT', value: 2},
        {name: 'designAxisSize', type: 'USHORT', value: 8},
        {name: 'designAxisCount', type: 'USHORT', value: STAT.axes.length},
        {name: 'designAxesOffset', type: 'ULONG', value: 0},
        {name: 'axisValueCount', type: 'USHORT', value: STAT.values.length},
        {name: 'offsetToAxisValueOffsets', type: 'ULONG', value: 0},
        {name: 'elidedFallbackNameID', type: 'USHORT', value: STAT.elidedFallbackNameID},
    ]);

    result.designAxesOffset = result.offsetToAxisValueOffsets = result.sizeOf();

    for (let i = 0; i < STAT.axes.length; i++) {
        const axisRecord = makeSTATAxisRecord(i, STAT.axes[i]);
        result.offsetToAxisValueOffsets += axisRecord.sizeOf();
        result.fields = result.fields.concat(axisRecord.fields);
    }

    const axisValueOffsets = [];
    let axisValueTables = [];
    let axisValueTableOffset = STAT.values.length * 2; // size of the offset array

    for (let j = 0; j < STAT.values.length; j++) {
        const axisValueTable = makeSTATValueTable(j, STAT.values[j]);
        axisValueOffsets.push({
            name: 'offset_' + j,
            type: 'USHORT',
            value: axisValueTableOffset
        });
        axisValueTableOffset += axisValueTable.sizeOf();
        axisValueTables = axisValueTables.concat(axisValueTable.fields);
    }

    result.fields = result.fields.concat(axisValueOffsets);
    result.fields = result.fields.concat(axisValueTables);

    return result;
}

export default { make: makeSTATTable, parse: parseSTATTable };
