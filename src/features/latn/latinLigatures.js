/**
 * Apply Latin ligature feature to a range of tokens
 */

import { applyFeatureToRange } from '../commonFeatureUtils.js';

/**
 * Apply Latin required ligatures to a context range
 * @param {ContextRange} range a range of tokens
 */
function latinRequiredLigature(range) {
    applyFeatureToRange.apply(this, ['latn', 'rlig', range]);
}

/**
 * Apply Latin ligatures to a context range
 * @param {ContextRange} range a range of tokens
 */
function latinLigature(range) {
    applyFeatureToRange.apply(this, ['latn', 'liga', range]);
}

export default latinLigature;
export { latinRequiredLigature, latinLigature };
