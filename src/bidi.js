/**
 * Infer bidirectional properties for a given text and apply
 * the corresponding layout rules.
 */

import Tokenizer from './tokenizer';
import FeatureQuery from './features/featureQuery';
import arabicWordCheck from './features/arab/contextCheck/arabicWord';
import arabicSentenceCheck from './features/arab/contextCheck/arabicSentence';
import arabicPresentationForms from './features/arab/arabicPresentationForms';
import arabicRequiredLigatures from './features/arab/arabicRequiredLigatures';
import latinWordCheck from './features/latn/contextCheck/latinWord';
import latinLigature from './features/latn/latinLigatures';

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
    if (!this.featuresTags.hasOwnProperty(script)) return;
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
    const script = 'arab';
    if (!this.featuresTags.hasOwnProperty(script)) return;
    const tags = this.featuresTags[script];
    if (tags.indexOf('rlig') === -1) return;
    checkGlyphIndexStatus.call(this);
    const ranges = this.tokenizer.getContextRanges('arabicWord');
    ranges.forEach(range => {
        arabicRequiredLigatures.call(this, range);
    });
}

/**
 * Apply required arabic ligatures
 */
function applyLatinLigatures() {
    const script = 'latn';
    if (!this.featuresTags.hasOwnProperty(script)) return;
    const tags = this.featuresTags[script];
    if (tags.indexOf('liga') === -1) return;
    checkGlyphIndexStatus.call(this);
    const ranges = this.tokenizer.getContextRanges('latinWord');
    ranges.forEach(range => {
        latinLigature.call(this, range);
    });
}

class Bidi {
    /**
     * Create Bidi. features
     * @param {string} baseDir text base direction. value either 'ltr' or 'rtl'
     */
    constructor (baseDir) {
        this.baseDir = baseDir || 'ltr';
        this.tokenizer = new Tokenizer();
        this.featuresTags = {};
    }

    /**
     * Sets Bidi text
     * @param {string} text A text input
     */
    setText(text) {
        this.text = text;
    }

    /**
     * Register supported features tags
     * @param {script} script Script tag
     * @param {Array} tags Features tags list
     */
    registerFeatures(script, tags) {
        const supportedTags = tags.filter(
            tag => this.query.supports({ script, tag })
        );
        if (!this.featuresTags.hasOwnProperty(script)) {
            this.featuresTags[script] = supportedTags;
        } else {
            this.featuresTags[script] =
                this.featuresTags[script].concat(supportedTags);
        }
    }

    /**
     * Apply GSUB features
     * @param {Array} tagsList A list of features tags
     * @param {string} script A script tag
     * @param {Font} font Opentype font instance
     */
    applyFeatures(font, features) {
        if (!font)
            throw new Error(
                'No valid font was provided to apply features'
            );
        if (!this.query)
            this.query = new FeatureQuery(font);
        for (let f = 0; f < features.length; f++) {
            const feature = features[f];
            if (!this.query.supports({ script: feature.script })) continue;
            this.registerFeatures(feature.script, feature.tags);
        }
    }

    /**
     * Register a state modifier
     * @param {string} modifierId State modifier id
     * @param {function} condition A predicate function that returns true or false
     * @param {function} modifier A modifier function to set token state
     */
    registerModifier(modifierId, condition, modifier) {
        this.tokenizer.registerModifier(modifierId, condition, modifier);
    }

    /**
     * Check if a context is registered
     * @param {string} contextId Context id
     */
    checkContextReady(contextId) {
        return !!this.tokenizer.getContext(contextId);
    }

    /**
     * Apply features to registered contexts
     */
    applyFeaturesToContexts() {
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
    }

    /**
     * process text input
     * @param {string} text An input text
     */
    processText(text) {
        if (!this.text || this.text !== text) {
            this.setText(text);
            tokenizeText.call(this);
            this.applyFeaturesToContexts();
        }
    }

    /**
     * Process a string of text to identify and adjust
     * bidirectional text entities.
     * @param {string} text Input text
     */
    getBidiText(text) {
        this.processText(text);
        return this.tokenizer.getText();
    }

    /**
     * Get the current state index of each token
     * @param {text} text An input text
     */
    getTextGlyphs(text) {
        this.processText(text);
        let indexes = [];
        for (let i = 0; i < this.tokenizer.tokens.length; i++) {
            const token = this.tokenizer.tokens[i];
            if (token.state.deleted) continue;
            const index = token.activeState.value;
            indexes.push(Array.isArray(index) ? index[0] : index);
        }
        return indexes;
    }
}

/**
 * Store essential context checks:
 * arabic word check for applying gsub features
 * arabic sentence check for adjusting arabic layout
 */
Bidi.prototype.contextChecks = ({
    latinWordCheck,
    arabicWordCheck,
    arabicSentenceCheck
});

export default Bidi;
