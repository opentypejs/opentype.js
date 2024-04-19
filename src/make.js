// Writing utility functions for common formats
import table from './table.js'

export function ItemVariationStore(vstore) {
    const fields = [
        { name: 'format', type: 'USHORT', value: 1 },
        { name: 'variationRegionListOffset', type: 'ULONG', value: 12 },
        { name: 'itemVariationDataCount', type: 'USHORT', value: vstore.itemVariationSubtables.length },
        { name: 'itemVariationDataOffsets', type: 'ULONG', value: 0 },
    ];
    return new table.Record('ItemVariationStore', fields);
}