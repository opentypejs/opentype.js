/**
 * Infer bidirectional properties for a given text and apply
 * the corresponding layout rules.
 */

import Tokenizer from './tokenizer.js';
import FeatureQuery from './features/featureQuery.js';
import arabicWordCheck from './features/arab/contextCheck/arabicWord.js';
import arabicSentenceCheck from './features/arab/contextCheck/arabicSentence.js';
import arabicPresentationForms from './features/arab/arabicPresentationForms.js';
import arabicRequiredLigatures from './features/arab/arabicRequiredLigatures.js';
import latinWordCheck from './features/latn/contextCheck/latinWord.js';
import latinLigature from './features/latn/latinLigatures.js';
import thaiWordCheck from './features/thai/contextCheck/thaiWord.js';
import thaiGlyphComposition from './features/thai/thaiGlyphComposition.js';
import thaiLigatures from './features/thai/thaiLigatures.js';
import thaiRequiredLigatures from './features/thai/thaiRequiredLigatures.js';
import unicodeVariationSequenceCheck from './features/unicode/contextCheck/variationSequenceCheck.js';
import unicodeVariationSequences from './features/unicode/variationSequences.js';

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
 * Apply required arabic ligatures
 */
function applyLatinLigatures() {
    if (!this.hasFeatureEnabled('latn', 'liga')) return;
    checkGlyphIndexStatus.call(this);
    const ranges = this.tokenizer.getContextRanges('latinWord');
    for(let i = 0; i < ranges.length; i++) {
        const range = ranges[i];
        latinLigature.call(this, range);
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
    const ranges = this.tokenizer.getContextRanges('thaiWord');
    for(let i = 0; i < ranges.length; i++) {
        const range = ranges[i];
        if (this.hasFeatureEnabled('thai', 'liga')) thaiLigatures.call(this, range);
        if (this.hasFeatureEnabled('thai', 'rlig')) thaiRequiredLigatures.call(this, range);
        if (this.hasFeatureEnabled('thai', 'ccmp')) thaiGlyphComposition.call(this, range);
    }
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
