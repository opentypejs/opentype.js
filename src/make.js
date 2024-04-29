// Writing utility functions for common formats
import table from './table.js'
import { masks } from './parse.js'
import { sizeOf } from './types.js';

export function ItemVariationStore(vstore, fvar) {
    const variationRegions = vstore.variationRegions;
    const subTables = vstore.itemVariationSubtables;
    const subTableCount = subTables.length;
    const fields = [
        { name: 'format', type: 'USHORT', value: 1 },
        { name: 'variationRegionListOffset', type: 'ULONG', value: 0 },
        { name: 'itemVariationDataCount', type: 'USHORT', value: subTableCount },
    ];

    for(let n = 0; n < subTableCount; n++) {
        fields.push(
            { name: `itemVariationDataOffsets_${n}`, type: 'ULONG', value: 0 },
        )
    }
    
    const t = new table.Record('ItemVariationStore', fields);
    let currentOffset = t.variationRegionListOffset = t.sizeOf();
    
    // VariationRegions List
    const axisCount = fvar.axes.length;
    t.fields.push({ name: 'axisCount', type: 'USHORT', value: axisCount });
    const VariationRegionList = table.recordList('variationRegions', variationRegions, (record, i) => {
        const namePrefix = `VariationRegion_${i}_`;
        const fields = [];
        for(let n = 0; n < axisCount; n++) {
            const fieldNamePrefix = namePrefix + `regionAxes_${n}_`;
            for(const f of ['startCoord', 'peakCoord', 'endCoord']) {
                fields.push({ name: fieldNamePrefix + f, type: 'F2DOT14', value: record.regionAxes[n][f]});
            }
        }
        return fields;
    });

    for(const region of VariationRegionList) {
        t.fields.push(region);
    }

    currentOffset = t.sizeOf();

    // ItemVariationData subtables
    const subTableList = table.recordList('ItemVariationData', subTables, (record, i) => {
        const subTable = ItemVariationData(record, `ItemVariationData_${i}_`);
        t[`itemVariationDataOffsets_${i}`] = currentOffset;
        currentOffset += sizeOf.OBJECT(subTable);
        return subTable;
    });

    
    for(const field of subTableList) {
        // we already have the ItemVariationDataCount in the ItemVariationStore above
        if(field.name === 'ItemVariationDataCount') continue;
        t.fields.push(field);
    }
    
    return t;

}

export function ItemVariationData(ivd, namePrefix) {
    const deltaSetCount = ivd.deltaSets.length;
    const regionCount = ivd.regionIndexes.length;
    const fields = [
        { name: namePrefix +'_itemCount', type: 'USHORT', value: deltaSetCount },
        { name: namePrefix +'_wordDeltaCount', type: 'USHORT', value: 0 },
        { name: namePrefix +'_regionIndexCount', type: 'USHORT', value: regionCount },
    ];

    for(let i = 0; i < regionCount; i++) {
        fields.push(
            { name: namePrefix + `_regionIndexes_${i}`, type: 'USHORT', value: ivd.regionIndexes[i] },
        );
    }
    
    return fields;
}