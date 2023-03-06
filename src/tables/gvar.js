// The `gvar` table stores information on how to modify glyf outlines across the variation space
// https://learn.microsoft.com/en-us/typography/opentype/spec/gvar

// import check from '../check.js';
// import parse from '../parse.js';
// import table from '../table.js';

function makeGvarTable() {
    console.warn('Writing of gvar tables is not yet supported.');
}

function parseGvarTable(/*data, start, names*/) {
    console.warn('Parsing of gvar tables is not yet supported.');
}

export default { make: makeGvarTable, parse: parseGvarTable };
