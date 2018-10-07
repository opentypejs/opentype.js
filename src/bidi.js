/**
 * Infer bidirectional properties for a given text and apply
 * the corresponding layout rules.
 */

import Tokenizer from './tokenizer';
import arabicWordCheck from './features/arab/contextCheck/arabicWord';
import arabicSentenceCheck from './features/arab/contextCheck/arabicSentence';
import arabicPresentationForms from './features/arab/arabicPresentationForms';
import arabicRequiredLigatures from './features/arab/arabicRequiredLigatures';

/**
 * Create Bidi. features
 * @param {string} baseDir text base direction. value either 'ltr' or 'rtl'
 */
function Bidi(baseDir) {
    this.baseDir = baseDir || 'ltr';
    this.tokenizer = new Tokenizer();
    this.features = [];
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
    arabicWordCheck,
    arabicSentenceCheck
});

/**
 * Register arabic word check
 */
function registerArabicWordCheck() {
    const checks = this.contextChecks.arabicWordCheck;
    return this.tokenizer.registerContextChecker(
        'arabicWord',
        checks.arabicWordStartCheck,
        checks.arabicWordEndCheck
    );
}

/**
 * Register arabic sentence check
 */
function registerArabicSentenceCheck() {
    const checks = this.contextChecks.arabicSentenceCheck;
    return this.tokenizer.registerContextChecker(
        'arabicSentence',
        checks.arabicSentenceStartCheck,
        checks.arabicSentenceEndCheck
    );
}

/**
 * Perform pre tokenization procedure then
 * tokenize text input
 */
function tokenizeText() {
    registerArabicWordCheck.call(this);
    registerArabicSentenceCheck.call(this);
    return this.tokenizer.tokenize(this.text);
}

/**
 * Reverse arabic sentence layout
 * TODO: check base dir before applying adjustments - priority low
 */
function reverseArabicSentences() {
    const ranges = this.tokenizer.getContextRanges('arabicSentence');
    ranges.forEach(range => {
        let rangeTokens = this.tokenizer.getRangeTokens(range);
        this.tokenizer.replaceRange(
            range.startIndex,
            range.endOffset,
            rangeTokens.reverse()
        );
    });
}

/**
 * Subscribe arabic presentation form features
 * @param {feature} feature a feature to apply
 */
Bidi.prototype.subscribeArabicForms = function(feature) {
    this.tokenizer.events.contextEnd.subscribe(
        (contextName, range) => {
            if (contextName === 'arabicWord') {
                return arabicPresentationForms.call(
                    this.tokenizer, range, feature
                );
            }
        }
    );
};

/**
 * Apply Gsub features
 * @param {feature} features a list of features
 */
Bidi.prototype.applyFeatures = function (features) {
    for (let i = 0; i < features.length; i++) {
        const feature = features[i];
        if (feature) {
            const script = feature.script;
            if (!this.features[script]) {
                this.features[script] = {};
            }
            this.features[script][feature.tag] = feature;
        }
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
    if (!this.features.hasOwnProperty('arab')) return;
    checkGlyphIndexStatus.call(this);
    const ranges = this.tokenizer.getContextRanges('arabicWord');
    ranges.forEach(range => {
        arabicPresentationForms.call(this, range);
    });
}

/**
 * Apply required arabic ligatures
 */
function applyArabicRequireLigatures() {
    if (!this.features.hasOwnProperty('arab')) return;
    if (!this.features.arab.hasOwnProperty('rlig')) return;
    checkGlyphIndexStatus.call(this);
    const ranges = this.tokenizer.getContextRanges('arabicWord');
    ranges.forEach(range => {
        arabicRequiredLigatures.call(this, range);
    });
}

/**
 * process text input
 * @param {string} text an input text
 */
Bidi.prototype.processText = function(text) {
    if (!this.text || this.text !== text) {
        this.setText(text);
        tokenizeText.call(this);
        applyArabicPresentationForms.call(this);
        applyArabicRequireLigatures.call(this);
        reverseArabicSentences.call(this);
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
