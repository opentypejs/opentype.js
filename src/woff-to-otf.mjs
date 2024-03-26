// CAUTION this is a dependency cycle, but since the dependencies are
// on execution time of woff_to_otf it only looks statically like a problem.
// still, maybe parseWOFFTableEntries and uncompressTable should not be
// in opentype.js or maybe woff_to_otf could move into opentype.js
import {  // eslint-disable-line
    parseWOFFTableEntries,
    uncompressTable
} from './opentype.mjs';

import parse from './parse.mjs';
import { encode } from './types.mjs';

// I looked at
//   https://github.com/hanikesn/woff2otf
//   and https://github.com/mondeja/woff2otf
// but I'm doing it using opentype.js infrastructure.
function woff_to_otf(buffer) {
    if (buffer.constructor !== ArrayBuffer)
        buffer = new Uint8Array(buffer).buffer;
    const data = new DataView(buffer, 0)
        , out = []
        , signature = parse.getTag(data, 0)
        ;

    if (signature !== 'wOFF')
        throw new Error(`TYPE ERROR signature must be wOFF but is: "${signature}"`);

    const flavor = parse.getTag(data, 4)
        , numTables = parse.getUShort(data, 12)
        , tableEntries = parseWOFFTableEntries(data, numTables)
        , max = []
        ;
    for (let n = 0; n < 64; n++) {
        if (Math.pow(2, n) > numTables)
            break;
        max.splice(0, Infinity, n, 2 ** n);
    }
    const searchRange = max[1] * 16
        , entrySelector = max[0]
        , rangeShift = numTables * 16 - searchRange
        ;

    out.push(
        ...encode.TAG(flavor)
        , ...encode.USHORT(numTables)
        , ...encode.USHORT(searchRange)
        , ...encode.USHORT(entrySelector)
        , ...encode.USHORT(rangeShift)
    );
    let offset = out.length + numTables * 16;

    for (let i=0; i<numTables; i++) {
        const tableEntry = tableEntries[i];
        out.push(
            ...encode.TAG(tableEntry.tag)
            , ...encode.ULONG(tableEntry.checksum)
            , ...encode.ULONG(offset)
            , ...encode.ULONG(tableEntry.length)
        );
        tableEntry.outOffset = offset;
        offset += tableEntry.length;
        if ((offset % 4) !== 0)
            offset += 4 - (offset % 4);
    }
    const initialData = new Uint8Array(out.length)
        , buffers = [initialData]
        ;
    for (let i=0,l=out.length; i<l; i++)
        initialData[i] = out[i];

    for (let i=0; i<numTables; i++) {
        const tableEntry = tableEntries[i]
            , table = uncompressTable(data, tableEntry) // => {data: view, offset: 0};
            , offset = tableEntry.outOffset + tableEntry.length
            , padding = (offset % 4) !== 0
                ? 4 - (offset % 4)
                : 0
            ;
        buffers.push(
            new Uint8Array(table.data.buffer, table.offset, tableEntry.length)
            , new Uint8Array(padding)
        );
    }
    const result = new Uint8Array(buffers.reduce((accum, buffer)=>accum+buffer.byteLength, 0));
    buffers.reduce((offset, buffer)=>{
        result.set(buffer, offset);
        return offset + buffer.byteLength;
    }, 0);
    return result.buffer;
}

export {
    woff_to_otf
};
