// The `MVAR` table stores variation deltas for global font metrics in variable fonts.
// https://learn.microsoft.com/en-us/typography/opentype/spec/mvar

import parse from '../parse.mjs';
import check from '../check.mjs';

function parseMvarTable(data, start) {
    start = start || 0;
    const p = new parse.Parser(data, start);
    const majorVersion = p.parseUShort();
    const minorVersion = p.parseUShort();
    check.argument(majorVersion === 1 && minorVersion === 0,
        `Unsupported MVAR table version ${majorVersion}.${minorVersion}`);
    p.parseUShort();  // reserved
    const valueRecordSize = p.parseUShort();
    const valueRecordCount = p.parseUShort();
    const varStoreOffset = p.parseOffset16();

    const valueRecords = {};
    for (let i = 0; i < valueRecordCount; i++) {
        const tag = p.parseTag();
        const outer = p.parseUShort();
        const inner = p.parseUShort();
        valueRecords[tag] = { outer, inner };
        if (valueRecordSize > 8) {
            p.relativeOffset += valueRecordSize - 8;
        }
    }

    p.relativeOffset = varStoreOffset;
    const itemVariationStore = p.parseItemVariationStore();

    return { valueRecords, itemVariationStore };
}

function makeMvarTable() {
    console.warn('Writing of mvar tables is not yet supported.');
}

export default { parse: parseMvarTable, make: makeMvarTable };
