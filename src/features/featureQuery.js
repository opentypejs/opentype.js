/**
 * Query a feature by some of it's properties to lookup a glyph substitution.
 */

import { ContextParams } from '../tokenizer';
import { isTashkeelArabicChar } from '../char';

// DEFAULT TEXT BASE DIRECTION
let BASE_DIR = 'ltr';

/**
 * Create feature query instance
 * @param {Font} font opentype font instance
 * @param {string} baseDir text base direction
 */
function FeatureQuery(font, baseDir) {
    this.font = font;
    this.features = {};
    BASE_DIR = !!baseDir ? baseDir : BASE_DIR;
}

/**
 * Create a new feature lookup
 * @param {string} tag feature tag
 * @param {feature} feature reference to feature at gsub table
 * @param {FeatureLookups} feature lookups associated with this feature
 * @param {string} script gsub script tag
 */
function Feature(tag, feature, featureLookups, script) {
    this.tag = tag;
    this.featureRef = feature;
    this.lookups = featureLookups.lookups;
    this.script = script;
}

/**
 * Create a coverage table lookup
 * @param {any} coverageTable gsub coverage table
 */
function Coverage(coverageTable) {
    this.table = coverageTable;
}

/**
 * Create a ligature set lookup
 * @param {any} ligatureSets gsub ligature set
 */
function LigatureSets(ligatureSets) {
    this.ligatureSets = ligatureSets;
}

/**
 * Lookup a glyph ligature
 * @param {ContextParams} contextParams context params to lookup
 * @param {number} ligSetIndex ligature set index at ligature sets
 */
LigatureSets.prototype.lookup = function (contextParams, ligSetIndex) {
    const ligatureSet = this.ligatureSets[ligSetIndex];
    const matchComponents = (components, indexes) => {
        if (components.length > indexes.length) return null;
        for (let c = 0; c < components.length; c++) {
            const component = components[c];
            const index = indexes[c];
            if (component !== index) return false;
        }
        return true;
    };
    for (let s = 0; s < ligatureSet.length; s++) {
        const ligSetItem = ligatureSet[s];
        const lookaheadIndexes = contextParams.lookahead.map(
            token => token.activeState.value
        );
        if (BASE_DIR === 'rtl') lookaheadIndexes.reverse();
        const componentsMatch = matchComponents(
            ligSetItem.components, lookaheadIndexes
        );
        if (componentsMatch) return ligSetItem;
    }
    return null;
};

/**
 * Create a feature substitution
 * @param {any} lookups a reference to gsub lookups
 * @param {Lookuptable} lookupTable a feature lookup table
 * @param {any} subtable substitution table
 */
function Substitution(lookups, lookupTable, subtable) {
    this.lookups = lookups;
    this.subtable = subtable;
    this.lookupTable = lookupTable;
    if (subtable.hasOwnProperty('coverage')) {
        this.coverage = new Coverage(
            subtable.coverage
        );
    }
    if (subtable.hasOwnProperty('inputCoverage')) {
        this.inputCoverage = subtable.inputCoverage.map(
            table => new Coverage(table)
        );
    }
    if (subtable.hasOwnProperty('backtrackCoverage')) {
        this.backtrackCoverage = subtable.backtrackCoverage.map(
            table => new Coverage(table)
        );
    }
    if (subtable.hasOwnProperty('lookaheadCoverage')) {
        this.lookaheadCoverage = subtable.lookaheadCoverage.map(
            table => new Coverage(table)
        );
    }
    if (subtable.hasOwnProperty('ligatureSets')) {
        this.ligatureSets = new LigatureSets(subtable.ligatureSets);
    }
}

/**
 * Create a lookup table lookup
 * @param {number} index table index at gsub lookups
 * @param {any} lookups a reference to gsub lookups
 */
function LookupTable(index, lookups) {
    this.index = index;
    this.subtables = lookups[index].subtables.map(
        subtable => new Substitution(
            lookups, lookups[index], subtable
        )
    );
}

function FeatureLookups(lookups, lookupListIndexes) {
    this.lookups = lookupListIndexes.map(
        index => new LookupTable(index, lookups)
    );
}

/**
 * Lookup a lookup table subtables
 * @param {ContextParams} contextParams context params to lookup
 */
LookupTable.prototype.lookup = function (contextParams) {
    let substitutions = [];
    for (let i = 0; i < this.subtables.length; i++) {
        const subsTable = this.subtables[i];
        let substitution = subsTable.lookup(contextParams);
        if (substitution !== null || substitution.length) {
            substitutions = substitutions.concat(substitution);
        }
    }
    return substitutions;
};

/**
 * Handle a single substitution - format 2
 * @param {ContextParams} contextParams context params to lookup
 */
function singleSubstitutionFormat2(contextParams) {
    let glyphIndex = contextParams.current.activeState.value;
    glyphIndex = Array.isArray(glyphIndex) ? glyphIndex[0] : glyphIndex;
    let substituteIndex = this.coverage.lookup(glyphIndex);
    if (substituteIndex === -1) return [];
    return [this.subtable.substitute[substituteIndex]];
}

/**
 * Lookup a list of coverage tables
 * @param {any} coverageList a list of coverage tables
 * @param {any} contextParams context params to lookup
 */
function lookupCoverageList(coverageList, contextParams) {
    let lookupList = [];
    for (let i = 0; i < coverageList.length; i++) {
        const coverage = coverageList[i];
        let glyphIndex = contextParams.current.activeState.value;
        glyphIndex = Array.isArray(glyphIndex) ? glyphIndex[0] : glyphIndex;
        const lookupIndex = coverage.lookup(glyphIndex);
        if (lookupIndex !== -1) {
            lookupList.push(lookupIndex);
        }
    }
    if (lookupList.length !== coverageList.length) return -1;
    return lookupList;
}

/**
 * Handle chaining context substitution - format 3
 * @param {any} contextParams context params to lookup
 */
function chainingSubstitutionFormat3(contextParams) {
    const lookupsCount = (
        this.inputCoverage.length +
        this.lookaheadCoverage.length +
        this.backtrackCoverage.length
    );
    if (contextParams.context.length < lookupsCount) return [];
    // INPUT LOOKUP //
    let inputLookups = lookupCoverageList(
        this.inputCoverage, contextParams
    );
    if (inputLookups === -1) return [];
    // LOOKAHEAD LOOKUP //
    const lookaheadOffset = this.inputCoverage.length - 1;
    if (contextParams.lookahead.length < this.lookaheadCoverage.length) return [];
    let lookaheadContext = contextParams.lookahead.slice(lookaheadOffset);
    while (lookaheadContext.length && isTashkeelArabicChar(lookaheadContext[0].char)) {
        lookaheadContext.shift();
    }
    const lookaheadParams = new ContextParams(lookaheadContext, 0);
    let lookaheadLookups = lookupCoverageList(
        this.lookaheadCoverage, lookaheadParams
    );
    // BACKTRACK LOOKUP //
    let backtrackContext = [].concat(contextParams.backtrack);
    backtrackContext.reverse();
    while (backtrackContext.length && isTashkeelArabicChar(backtrackContext[0].char)) {
        backtrackContext.shift();
    }
    if (backtrackContext.length < this.backtrackCoverage.length) return [];
    const backtrackParams = new ContextParams(backtrackContext, 0);
    let backtrackLookups = lookupCoverageList(
        this.backtrackCoverage, backtrackParams
    );
    const contextRulesMatch = (
        inputLookups.length === this.inputCoverage.length &&
        lookaheadLookups.length === this.lookaheadCoverage.length &&
        backtrackLookups.length === this.backtrackCoverage.length
    );
    let substitutions = [];
    if (contextRulesMatch) {
        let lookupRecords = this.subtable.lookupRecords;
        for (let i = 0; i < lookupRecords.length; i++) {
            const lookupRecord = lookupRecords[i];
            for (let j = 0; j < inputLookups.length; j++) {
                const inputContext = new ContextParams([contextParams.get(j)], 0);
                let lookupIndex = lookupRecord.lookupListIndex;
                const lookupTable = new LookupTable(lookupIndex, this.lookups);
                let lookup = lookupTable.lookup(inputContext);
                substitutions = substitutions.concat(lookup);
            }
        }
    }
    return substitutions;
}

/**
 * Handle ligature substitution - format 1
 * @param {any} contextParams context params to lookup
 */
function ligatureSubstitutionFormat1(contextParams) {
    // COVERAGE LOOKUP //
    let glyphIndex = contextParams.current.activeState.value;
    let ligSetIndex = this.coverage.lookup(glyphIndex);
    if (ligSetIndex === -1) return [];
    // COMPONENTS LOOKUP * note that components is logically ordered
    let ligGlyphs = this.ligatureSets.lookup(contextParams, ligSetIndex);
    return ligGlyphs ? [ligGlyphs] : [];
}

/**
 * [ LOOKUP TYPES ]
 * -------------------------------
 * Single                        1;
 * Multiple                      2;
 * Alternate                     3;
 * Ligature                      4;
 * Context                       5;
 * ChainingContext               6;
 * ExtensionSubstitution         7;
 * ReverseChainingContext        8;
 * -------------------------------
 * @param {any} contextParams context params to lookup
 */
Substitution.prototype.lookup = function (contextParams) {
    const substitutions = [];
    const lookupType = this.lookupTable.lookupType;
    const substFormat = this.subtable.substFormat;
    if (lookupType === 1 && substFormat === 2) {
        let substitution = singleSubstitutionFormat2.call(this, contextParams);
        if (substitution.length > 0) {
            substitutions.push({ id: 12, substitution });
        }
    }
    if (lookupType === 6 && substFormat === 3) {
        const substitution = chainingSubstitutionFormat3.call(this, contextParams);
        if (substitution.length > 0) {
            substitutions.push({ id: 63, substitution });
        }
    }
    if (lookupType === 4 && substFormat === 1) {
        const substitution = ligatureSubstitutionFormat1.call(this, contextParams);
        if (substitution.length > 0) {
            substitutions.push({ id: 41, substitution });
        }
    }
    return substitutions;
};

/**
 * Lookup a coverage table
 * @param {number} glyphIndex to lookup
 */
Coverage.prototype.lookup = function (glyphIndex) {
    if (!glyphIndex) return -1;
    switch (this.table.format) {
        case 1:
            return this.table.glyphs.indexOf(glyphIndex);

        case 2:
            let ranges = this.table.ranges;
            for (let i = 0; i < ranges.length; i++) {
                const range = ranges[i];
                if (glyphIndex >= range.start && glyphIndex <= range.end) {
                    let offset = glyphIndex - range.start;
                    return range.index + offset;
                }
            }
            break;
        default:
            return -1; // not found
    }
    return -1;
};

/**
 * Lookup a feature for a substitution or more
 * @param {any} contextParams context params to lookup
 */
Feature.prototype.lookup = function(contextParams) {
    let lookups = [];
    for (let i = 0; i < this.lookups.length; i++) {
        const lookupTable = this.lookups[i];
        let lookup = lookupTable.lookup(contextParams);
        if (lookup !== null || lookup.length) {
            lookups = lookups.concat(lookup);
        }
    }
    return lookups;
};

/**
 * Get feature indexes of a specific script
 * @param {string} scriptTag script tag
 */
FeatureQuery.prototype.getScriptFeaturesIndexes = function(scriptTag) {
    if (!scriptTag) return [];
    const tables = this.font.tables;
    if (!tables.gsub) return [];
    const scripts = this.font.tables.gsub.scripts;
    for (let i = 0; i < scripts.length; i++) {
        const script = scripts[i];
        if (script.tag === scriptTag) {
            let defaultLangSys = script.script.defaultLangSys;
            return defaultLangSys.featureIndexes;
        } else {
            let langSysRecords = script.langSysRecords;
            if (!!langSysRecords) {
                for (let j = 0; j < langSysRecords.length; j++) {
                    const langSysRecord = langSysRecords[j];
                    if (langSysRecord.tag === scriptTag) {
                        let langSys = langSysRecord.langSys;
                        return langSys.featureIndexes;
                    }
                }
            }
        }
    }
    return [];
};

/**
 * Map a feature tag to a gsub feature
 * @param {any} features gsub features
 * @param {*} scriptTag script tag
 */
FeatureQuery.prototype.mapTagsToFeatures = function (features, scriptTag) {
    let tags = {};
    for (let i = 0; i < features.length; i++) {
        const feature = features[i].feature;
        const tag = features[i].tag;
        const lookups = this.font.tables.gsub.lookups;
        const featureLookups = new FeatureLookups(lookups, feature.lookupListIndexes);
        tags[tag] = new Feature(tag, feature, featureLookups, scriptTag);
    }
    this.features[scriptTag].tags = tags;
};

/**
 * Get features of a specific script
 * @param {string} scriptTag script tag
 */
FeatureQuery.prototype.getScriptFeatures = function (scriptTag) {
    let features = this.features[scriptTag];
    if (this.features.hasOwnProperty(scriptTag)) return features;
    const featuresIndexes = this.getScriptFeaturesIndexes(scriptTag);
    if (!featuresIndexes) return null;
    const gsub = this.font.tables.gsub;
    features = featuresIndexes.map(index => gsub.features[index]);
    this.features[scriptTag] = features;
    this.mapTagsToFeatures(features, scriptTag);
    return features;
};

/**
 * Query a feature by it's properties
 * @param {any} query an object that describes the properties of a query
 */
FeatureQuery.prototype.getFeature = function (query) {
    if (!this.font) return { FAIL: `No font was found`};
    if (!this.features.hasOwnProperty(query.script)) {
        this.getScriptFeatures(query.script);
    }
    return this.features[query.script].tags[query.tag] || null;
};

export default FeatureQuery;
export { Feature };
