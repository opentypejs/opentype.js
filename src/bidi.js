/**
 * Infer bidirectional properties for a given text and apply
 * the corresponding layout rules.
 */

import Tokenizer, { ContextParams } from './tokenizer.js';
import FeatureQuery, { SubstitutionAction } from './features/featureQuery.js';
import arabicWordCheck from './features/arab/contextCheck/arabicWord.js';
import arabicSentenceCheck from './features/arab/contextCheck/arabicSentence.js';
import arabicPresentationForms from './features/arab/arabicPresentationForms.js';
import arabicRequiredLigatures from './features/arab/arabicRequiredLigatures.js';
import latinWordCheck from './features/latn/contextCheck/latinWord.js';
import { latinRequiredLigature, latinLigature } from './features/latn/latinLigatures.js';
import thaiWordCheck from './features/thai/contextCheck/thaiWord.js';
import unicodeVariationSequenceCheck from './features/unicode/contextCheck/variationSequenceCheck.js';
import unicodeVariationSequences from './features/unicode/variationSequences.js';
import applySubstitution from './features/applySubstitution.js';

/**
 * Create Bidi. features
 * @param {string} baseDir text base direction. value either 'ltr' or 'rtl'
 */
function Bidi(baseDir) {
    this.baseDir = baseDir || 'ltr';
    this.tokenizer = new Tokenizer();
    this.featuresTags = {};
}

/**
 * Sets Bidi text
 * @param {string} text a text input
 */
Bidi.prototype.setText = function (text) {
    this.text = text;
};

/**
 * Store essential context checks:
 * arabic word check for applying gsub features
 * arabic sentence check for adjusting arabic layout
 */
Bidi.prototype.contextChecks = ({
    latinWordCheck,
    arabicWordCheck,
    arabicSentenceCheck,
    thaiWordCheck,
    unicodeVariationSequenceCheck
});

/**
 * Register arabic word check
 */
function registerContextChecker(checkId) {
    const check = this.contextChecks[`${checkId}Check`];
    return this.tokenizer.registerContextChecker(
        checkId, check.startCheck, check.endCheck
    );
}

/**
 * Perform pre tokenization procedure then
 * tokenize text input
 */
function tokenizeText() {
    registerContextChecker.call(this, 'latinWord');
    registerContextChecker.call(this, 'arabicWord');
    registerContextChecker.call(this, 'arabicSentence');
    registerContextChecker.call(this, 'thaiWord');
    registerContextChecker.call(this, 'unicodeVariationSequence');
    return this.tokenizer.tokenize(this.text);
}

/**
 * Reverse arabic sentence layout
 * TODO: check base dir before applying adjustments - priority low
 */
function reverseArabicSentences() {
    const ranges = this.tokenizer.getContextRanges('arabicSentence');
    for(let i = 0; i < ranges.length; i++) {
        const range = ranges[i];
        let rangeTokens = this.tokenizer.getRangeTokens(range);
        this.tokenizer.replaceRange(
            range.startIndex,
            range.endOffset,
            rangeTokens.reverse()
        );
    }
}

/**
 * Register supported features tags
 * @param {script} script script tag
 * @param {Array} tags features tags list
 */
Bidi.prototype.registerFeatures = function (script, tags) {
    const supportedTags = tags.filter(
        tag => this.query.supports({script, tag})
    );
    if (!Object.prototype.hasOwnProperty.call(this.featuresTags, script)) {
        this.featuresTags[script] = supportedTags;
    } else {
        this.featuresTags[script] =
        this.featuresTags[script].concat(supportedTags);
    }
};

/**
 * Apply GSUB features
 * @param {Array} tagsList a list of features tags
 * @param {string} script a script tag
 * @param {Font} font opentype font instance
 */
Bidi.prototype.applyFeatures = function (font, features) {
    if (!font) throw new Error(
        'No valid font was provided to apply features'
    );
    if (!this.font) this.font = font;
    if (!this.query) this.query = new FeatureQuery(font);
    for (let f = 0; f < features.length; f++) {
        const feature = features[f];
        if (!this.query.supports({script: feature.script})) continue;
        this.registerFeatures(feature.script, feature.tags);
    }
};

/**
 * Register a state modifier
 * @param {string} modifierId state modifier id
 * @param {function} condition a predicate function that returns true or false
 * @param {function} modifier a modifier function to set token state
 */
Bidi.prototype.registerModifier = function (modifierId, condition, modifier) {
    this.tokenizer.registerModifier(modifierId, condition, modifier);
};

function getContextParams(tokens, index) {
    const context = tokens.map(token => token.activeState.value);
    return new ContextParams(context, index || 0);
}

/**
 * General method for processing GSUB tables with a specified algorithm:
 * During text processing, a client applies a lookup to each glyph in the string before moving to the next lookup. 
 * A lookup is finished for a glyph after the client locates the target glyph or glyph context and performs a substitution, if specified. 
 * 
 * https://learn.microsoft.com/en-us/typography/opentype/spec/gsub#table-organization
 * 
 * Use this algorithm instead of FeatureQuery.prototype.lookupFeature 
 * 
 * TODO: Support language option
 * TODO: Consider moving this implementation to this.font.substitution (use layout.getFeaturesLookups)
 * 
 * @param {string} script script name
 * @param {array} features list of required features to process 
 */
function applySubstitutions(script, features) {
    const supportedFeatures = features.filter(feature => this.hasFeatureEnabled(script, feature));
    const featuresLookups = this.query.getSubstitutionFeaturesLookups(supportedFeatures, script);
    for (let idx = 0; idx < featuresLookups.length; idx++) {
        const lookupTable = featuresLookups[idx];
        const subtables = this.query.getLookupSubtables(lookupTable);
        // Extract all thai words to apply the lookup feature per feature lookup table order
        const ranges = this.tokenizer.getContextRanges(`${script}Word`); // use a context range name convention: latinWord, arabWord, thaiWord, etc.
        for (let k = 0; k < ranges.length; k++) {
            const range = ranges[k];
            let tokens = this.tokenizer.getRangeTokens(range);
            let contextParams = getContextParams(tokens);
            for (let index = 0; index < contextParams.context.length; index++) {
                contextParams.setCurrentIndex(index);
                for (let s = 0; s < subtables.length; s++) {
                    const subtable = subtables[s];
                    const substType = this.query.getSubstitutionType(lookupTable, subtable);
                    const lookup = this.query.getLookupMethod(lookupTable, subtable);
                    let substitution;
                    switch (substType) {
                        case '11':
                            substitution = lookup(contextParams.current);
                            if (substitution) {
                                applySubstitution.call(this,
                                    new SubstitutionAction({
                                        id: 11, tag: lookupTable.feature, substitution
                                    }),
                                    tokens,
                                    contextParams.index
                                );
                            }
                            break;
                        case '12':
                            substitution = lookup(contextParams.current);
                            if (substitution) {
                                applySubstitution.call(this,
                                    new SubstitutionAction({
                                        id: 12, tag: lookupTable.feature, substitution
                                    }),
                                    tokens,
                                    contextParams.index
                                );
                            }
                            break;
                        case '63':
                            substitution = lookup(contextParams);
                            if (Array.isArray(substitution) && substitution.length) {
                                applySubstitution.call(this,
                                    new SubstitutionAction({
                                        id: 63, tag: lookupTable.feature, substitution
                                    }),
                                    tokens,
                                    contextParams.index
                                );
                            }
                            break;
                        case '41':
                            substitution = lookup(contextParams);
                            if (substitution) {
                                applySubstitution.call(this,
                                    new SubstitutionAction({
                                        id: 41, tag: lookupTable.feature, substitution
                                    }),
                                    tokens,
                                    contextParams.index
                                );
                            }
                            break;
                        case '21':
                            substitution = lookup(contextParams.current);
                            if (Array.isArray(substitution) && substitution.length) {
                                applySubstitution.call(this,
                                    new SubstitutionAction({
                                        id: 21, tag: lookupTable.feature, substitution
                                    }),
                                    tokens,
                                    range.startIndex + index
                                );
                            }
                            break;
                    }
                }
                contextParams = getContextParams(tokens, index);
            }
        }
    }
}

/**
 * Check if 'glyphIndex' is registered
 */
function checkGlyphIndexStatus() {
    if (this.tokenizer.registeredModifiers.indexOf('glyphIndex') === -1) {
        throw new Error(
            'glyphIndex modifier is required to apply ' +
            'arabic presentation features.'
        );
    }
}

/**
 * Apply arabic presentation forms features
 */
function applyArabicPresentationForms() {
    const script = 'arab';
    if (!Object.prototype.hasOwnProperty.call(this.featuresTags, script)) return;
    checkGlyphIndexStatus.call(this);
    const ranges = this.tokenizer.getContextRanges('arabicWord');
    for(let i = 0; i < ranges.length; i++) {
        const range = ranges[i];
        arabicPresentationForms.call(this, range);
    }
}

/**
 * Apply required arabic ligatures
 */
function applyArabicRequireLigatures() {
    if (!this.hasFeatureEnabled('arab', 'rlig')) return;
    checkGlyphIndexStatus.call(this);
    const ranges = this.tokenizer.getContextRanges('arabicWord');
    for(let i = 0; i < ranges.length; i++) {
        const range = ranges[i];
        arabicRequiredLigatures.call(this, range);
    }
}

/**
 * Apply required and normal latin ligatures
 */
function applyLatinLigatures() {
    const script = 'latn';
    if (!Object.prototype.hasOwnProperty.call(this.featuresTags, script)) return;
    const tags = this.featuresTags[script];
    if ((tags.indexOf('rlig') === -1) && (tags.indexOf('liga') === -1)) return;
    checkGlyphIndexStatus.call(this);
    const ranges = this.tokenizer.getContextRanges('latinWord');

    for(let i = 0; i < ranges.length; i++) {
        const range = ranges[i];

        if (tags.indexOf('rlig') >= 0) {
            latinRequiredLigature.call(this, range);
        }

        if (tags.indexOf('liga') >= 0) {
            latinLigature.call(this, range);
        }
    }
}

function applyUnicodeVariationSequences() {
    const ranges = this.tokenizer.getContextRanges('unicodeVariationSequence');
    for(let i = 0; i < ranges.length; i++) {
        const range = ranges[i];
        unicodeVariationSequences.call(this, range);
    }
}

/**
 * Apply available thai features
 */
function applyThaiFeatures() {
    checkGlyphIndexStatus.call(this);
    applySubstitutions.call(this, 'thai', ['liga', 'rlig', 'ccmp']);
}

/**
 * Check if a context is registered
 * @param {string} contextId context id
 */
Bidi.prototype.checkContextReady = function (contextId) {
    return !!this.tokenizer.getContext(contextId);
};

/**
 * Apply features to registered contexts
 *
 * - A Glyph Composition (ccmp) feature should be always applied
 * https://learn.microsoft.com/en-us/typography/opentype/spec/features_ae#tag-ccmp
 */
Bidi.prototype.applyFeaturesToContexts = function () {
    if (this.checkContextReady('arabicWord')) {
        applyArabicPresentationForms.call(this);
        applyArabicRequireLigatures.call(this);
    }
    if (this.checkContextReady('latinWord')) {
        applyLatinLigatures.call(this);
    }
    if (this.checkContextReady('arabicSentence')) {
        reverseArabicSentences.call(this);
    }
    if (this.checkContextReady('thaiWord')) {
        applyThaiFeatures.call(this);
    }
    if (this.checkContextReady('unicodeVariationSequence')) {
        applyUnicodeVariationSequences.call(this);
    }
};

/**
 * Check whatever feature is successfully enabled for a script
 * @param {string} script
 * @param {string} tag feature name
 * @returns {boolean}
 */
Bidi.prototype.hasFeatureEnabled = function(script, tag) {
    return (this.featuresTags[script] || []).indexOf(tag) !== -1;
};

/**
 * process text input
 * @param {string} text an input text
 */
Bidi.prototype.processText = function(text) {
    if (!this.text || this.text !== text) {
        this.setText(text);
        tokenizeText.call(this);
        this.applyFeaturesToContexts();
    }
};

/**
 * Process a string of text to identify and adjust
 * bidirectional text entities.
 * @param {string} text input text
 */
Bidi.prototype.getBidiText = function (text) {
    this.processText(text);
    return this.tokenizer.getText();
};

/**
 * Get the current state index of each token
 * @param {text} text an input text
 */
Bidi.prototype.getTextGlyphs = function (text) {
    this.processText(text);
    let indexes = [];
    for (let i = 0; i < this.tokenizer.tokens.length; i++) {
        const token = this.tokenizer.tokens[i];
        if (token.state.deleted) continue;
        const index = token.activeState.value;
        indexes.push(Array.isArray(index) ? index[0] : index);
    }
    return indexes;
};

export default Bidi;
