// The `vhea` table contains information for vertical layout.
// https://learn.microsoft.com/en-us/typography/opentype/spec/vhea

import parse from '../parse.mjs';
import table from '../table.mjs';

// Parse the vertical header `vhea` table
function parseVheaTable(data, start) {
    const vhea = {};
    const p = new parse.Parser(data, start);
    vhea.version = p.parseVersion();
    vhea.ascent = p.parseShort(); // v1.0
    vhea.vertTypoAscender = vhea.ascent; // v1.1
    vhea.descent = p.parseShort(); // v1.0
    vhea.vertTypoDescender = vhea.descent; // v1.1
    vhea.lineGap = p.parseShort(); // v1.0
    vhea.vertTypoLineGap = vhea.lineGap; // v1.1
    vhea.advanceHeightMax = p.parseUShort();
    vhea.minTopSideBearing = p.parseShort();
    vhea.minBottomSideBearing = p.parseShort();
    vhea.yMaxExtent = p.parseShort();
    vhea.caretSlopeRise = p.parseShort();
    vhea.caretSlopeRun = p.parseShort();
    vhea.caretOffset = p.parseShort();
    p.relativeOffset += 8;
    vhea.metricDataFormat = p.parseShort();
    vhea.numOfLongVerMetrics = p.parseUShort();
    return vhea;
}

function makeVheaTable(options) {
    return new table.Table('vhea', [
        {name: 'version', type: 'FIXED', value: 0x00010000},
        {name: 'ascent', type: 'FWORD', value: 0},
        {name: 'descent', type: 'FWORD', value: 0},
        {name: 'lineGap', type: 'FWORD', value: 0},
        {name: 'advanceHeightMax', type: 'UFWORD', value: 0},
        {name: 'minTopSideBearing', type: 'FWORD', value: 0},
        {name: 'minBottomSideBearing', type: 'FWORD', value: 0},
        {name: 'yMaxExtent', type: 'FWORD', value: 0},
        {name: 'caretSlopeRise', type: 'SHORT', value: 1},
        {name: 'caretSlopeRun', type: 'SHORT', value: 0},
        {name: 'caretOffset', type: 'SHORT', value: 0},
        {name: 'reserved1', type: 'SHORT', value: 0},
        {name: 'reserved2', type: 'SHORT', value: 0},
        {name: 'reserved3', type: 'SHORT', value: 0},
        {name: 'reserved4', type: 'SHORT', value: 0},
        {name: 'metricDataFormat', type: 'SHORT', value: 0},
        {name: 'numOfLongVerMetrics', type: 'USHORT', value: 0}
    ], options);
}

export default { parse: parseVheaTable, make: makeVheaTable };
