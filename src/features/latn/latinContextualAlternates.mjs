/**
 * Apply Latin contextual alternates (calt) to a range of tokens.
 *
 * Unlike ligature processing, calt rules in cursive fonts routinely check
 * across word boundaries — e.g. "use initial form when preceded by a space"
 * or "use final form when followed by a space or end-of-text".  The standard
 * latinWord range only spans a single word, so backtrack for the first letter
 * and lookahead for the last letter are empty, and those rules never fire.
 *
 * This module builds ContextParams from the *full* token stream, using each
 * range token's absolute index in that stream.
 *
 * OpenType ordering: each lookup in the calt feature list must be applied to
 * the entire glyph string before the next lookup starts.  Fonts like Playwrite
 * use a two-stage calt: early lookups (e.g. 40, 44) select ini/med/fin forms,
 * and a later lookup (e.g. 48) expands those forms into [glyph, stroke-connector]
 * pairs by checking what already-substituted glyph follows.  Applying all
 * lookups at once per position (the naive approach) breaks the second stage
 * because the lookahead still has the pre-substitution glyph IDs.
 */

import { ContextParams } from '../../tokenizer.mjs';
import { SubstitutionAction } from '../featureQuery.mjs';
import applySubstitution from '../applySubstitution.mjs';

/**
 * Apply calt to every token in `range`, using the full token stream as context.
 * Each lookup in the feature is applied to all positions before the next lookup
 * starts, matching the OpenType specification's required ordering.
 * @param {ContextRange} range a latinWord context range
 */
function latinContextualAlternates(range) {
    const script = 'latn';
    const allTokens = this.tokenizer.tokens;
    const rangeTokens = this.tokenizer.getRangeTokens(range);

    const feature = this.query.getFeature({ tag: 'calt', script });
    if (!feature || feature.FAIL) return;
    const lookupTables = this.query.getFeatureLookups(feature);

    for (let l = 0; l < lookupTables.length; l++) {
        // Rebuild the full-text glyph-index array from current token state at
        // the start of each lookup pass so this pass sees all changes from
        // prior passes.  For multi-glyph tokens (array value) use the first
        // glyph for context matching; getTextGlyphs expands the full sequence.
        let fullContext = allTokens.map(token => {
            const v = token.activeState.value;
            return Array.isArray(v) ? v[0] : v;
        });

        for (let i = 0; i < rangeTokens.length; i++) {
            const fullIndex = range.startIndex + i;
            const contextParams = new ContextParams(fullContext, fullIndex);

            const action = this.query.applyLookupTableAtPosition(lookupTables[l], 'calt', contextParams);
            if (action instanceof SubstitutionAction) {
                applySubstitution(action, allTokens, fullIndex);
                // Reflect the change so subsequent positions in this pass see
                // the updated glyph.
                fullContext = allTokens.map(token => {
                    const v = token.activeState.value;
                    return Array.isArray(v) ? v[0] : v;
                });
            }
        }
    }
}

export default latinContextualAlternates;
