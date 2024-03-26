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

// I looked at https://github.com/mondeja/woff2otf/blob/master/src/woff2otf.js
// but I'm using opentype.js infrastructure.
function woff_to_otf(buffer) {
    if (buffer.constructor !== ArrayBuffer)
        buffer = new Uint8Array(buffer).buffer;
    const data = new DataView(buffer, 0)
        , out = []
        , signature = parse.getTag(data, 0)
        ;

    if (signature !== 'wOFF')
        throw new Error(`TYPE ERROR signature must be wOFF but is: "${signature}"`);

    // need flavour??? -> opentype header syff!
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
    let offset = out.length;
    for (let i=0; i<numTables; i++) {
        // This is done in parseWOFFTableEntries already, minus the checksum:
        // tableEntries.push({tag: tag, offset: offset, compression: compression,
        //   compressedLength: compLength, length: origLength});
        // Hence, we just amend the checksum.
        // Maybe, checksum could be added in parseWOFFTableEntries

        // let p = 44; // offset to the first table directory entry.
        const pointerBase = 44 + i * 20;
        // tableDirectoryEntries.push({
        //     tag: parse.getTag(data, pointerBase)
        //   , offset: parse.getULong(data, pointerBase + 4)
        //   , compLength: parse.getULong(data, pointerBase + 8)
        //   , origLength: parse.getULong(data, pointerBase + 12)
        //   , origChecksum: parse.getULong(data, pointerBase + 16)
        // });
        // p += 20;
        tableEntries[i].checksum = parse.getULong(data, pointerBase + 16);
        offset += 4 * 4;
    }
    // offset += numTables * 16;

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
    // const initialData = new Uint8Array(out.length)
    //   , buffers = [initialData]
    //   ;
    // for (let i=0,l=out.length; i<l; i++)
    //     initialData[i] = out[i];

    for (let i=0; i<numTables; i++) {
        const tableEntry = tableEntries[i]
            , table = uncompressTable(data, tableEntry) // => {data: view, offset: 0};
            // FIXME: we should rather just append the bytes to a new buffer
            // no need to parse into an array ...
            , p = new parse.Parser(table.data, table.offset)
            ;


        offset = tableEntry.outOffset + tableEntry.length;
        const padding = (offset % 4) !== 0
            ? 4 - (offset % 4)
            : 0
            ;
            // buffers.push(
            //     new DataView(table.data.buffer, table.offset, tableEntry.length)
            //   , new ArrayBuffer(padding)
            // );
        out.push(
            p.parseByteList(tableEntry.length)
            , Array(padding).fill(0) //  new ArrayBuffer(padding)
        );
    }
    const outFlat = out.flat();

    // const result = new Uint8Array(buffers.reduce((accum, buffer)=>accum+buffer.byteLength, 0));
    // buffers.reduce((offset, buffer)=>{
    //     result.set(buffer, offset)
    //     return offset + buffer.byteLength
    // }, 0)
    // return result.buffer;
    const outArray = new Uint8Array(outFlat.length);
    for (let i=0,l=outFlat.length; i<l; i++)
        outArray[i] = outFlat[i];
    return outArray.buffer;
}

export {
    woff_to_otf
};
