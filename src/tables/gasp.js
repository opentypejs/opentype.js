// The `gasp` table contains global information about the font.
// https://learn.microsoft.com/de-de/typography/opentype/spec/gasp

import check from '../check.js';
import parse from '../parse.js';
import table from '../table.js';

//const GASP_SYMMETRIC_GRIDFIT = 0x0004
//const GASP_SYMMETRIC_SMOOTHING = 0x0008
//const GASP_DOGRAY = 0x0002
//const GASP_GRIDFIT = 0x0001

// Parse the `gasp` table
function parseGaspTable(data, start) {
    const gasp = {};
    const p = new parse.Parser(data, start);
    gasp.version = p.parseUShort();
    check.argument(gasp.version <= 0x0001, 'Unsupported gasp table version.');
    gasp.numRanges = p.parseUShort();
    gasp.gaspRanges = [];
    for (let i = 0; i < gasp.numRanges; i++) {
        gasp.gaspRanges[i] = {
            rangeMaxPPEM: p.parseUShort(),
            rangeGaspBehavior: p.parseUShort(),
        };
    }
    return gasp;
}


function makeGaspTable(gasp) {
    const result = new table.Table('gasp', [
        {name: 'version', type: 'USHORT', value: 0x0001},
        {name: 'numRanges', type: 'USHORT', value: gasp.numRanges},
    ]);

    for (let i in gasp.numRanges) {
        result.fields.push({name: 'rangeMaxPPEM', type: 'USHORT', value: gasp.numRanges[i].rangeMaxPPEM});
        result.fields.push({name: 'rangeGaspBehavior', type: 'USHORT', value: gasp.numRanges[i].rangeGaspBehavior});
    }

    return result;
}

export default { parse: parseGaspTable, make: makeGaspTable };

