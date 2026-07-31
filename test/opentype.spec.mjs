import assert from 'assert';
import { Font, Path, Glyph, parse } from '../src/opentype.mjs';
import { readFileSync } from 'fs';
const loadSync = (url, opt) => parse(readFileSync(url), opt);

describe('opentype.mjs', function() {
    it('can load a TrueType font', function() {
        const font = loadSync('./test/fonts/Roboto-Black.ttf');
        assert.deepEqual(font.names.macintosh.fontFamily, {en: 'Roboto Black'});
        assert.deepEqual(font.names.windows.fontFamily, {en: 'Roboto Black'});
        assert.equal(font.unitsPerEm, 2048);
        assert.equal(font.glyphs.length, 1294);
        const aGlyph = font.charToGlyph('A');
        assert.equal(aGlyph.unicode, 65);
        assert.equal(aGlyph.path.commands.length, 15);
    });


    it('can load a OpenType/CFF font', function() {
        const font = loadSync('./test/fonts/FiraSansOT-Medium.otf');
        assert.deepEqual(font.names.macintosh.fontFamily, {en: 'Fira Sans OT Medium'});
        assert.deepEqual(font.names.windows.fontFamily, {en: 'Fira Sans OT Medium'});
        assert.equal(font.unitsPerEm, 1000);
        assert.equal(font.glyphs.length, 1151);
        const aGlyph = font.charToGlyph('A');
        assert.equal(aGlyph.name, 'A');
        assert.equal(aGlyph.unicode, 65);
        assert.equal(aGlyph.path.commands.length, 14);
    });

    it('can load a CID-keyed font', function() {
        const font = loadSync('./test/fonts/FDArrayTest257.otf');
        assert.deepEqual(font.names.windows.fontFamily, {en: 'FDArray Test 257'});
        assert.deepEqual(font.tables.cff.topDict.ros, ['Adobe', 'Identity', 0]);
        assert.equal(font.tables.cff.topDict._fdArray.length, 256);
        assert.equal(font.tables.cff.topDict._fdSelect[0], 0);
        assert.equal(font.tables.cff.topDict._fdSelect[42], 41);
        assert.equal(font.tables.cff.topDict._fdSelect[256], 255);
        assert.equal(font.unitsPerEm, 1000);
        assert.equal(font.glyphs.length, 257);
        const aGlyph = font.glyphs.get(2);
        assert.equal(aGlyph.name, 'cid00002');
        assert.equal(aGlyph.unicode, 1);
        assert.equal(aGlyph.path.commands.length, 24);
        assert.deepEqual(font.stringToGlyphIndexes('🌺'), [59]);
    });

    it('can load a WOFF/CFF font', function() {
        const font = loadSync('./test/fonts/FiraSansMedium.woff');
        assert.deepEqual(font.names.macintosh.fontFamily, {en: 'Fira Sans OT'});
        assert.deepEqual(font.names.windows.fontFamily, {en: 'Fira Sans OT'});
        assert.equal(font.unitsPerEm, 1000);
        assert.equal(font.glyphs.length, 1147);
        const aGlyph = font.charToGlyph('A');
        assert.equal(aGlyph.name, 'A');
        assert.equal(aGlyph.unicode, 65);
        assert.equal(aGlyph.path.commands.length, 14);
    });

    it('throws an error when advanceWidth is not set', function() {
        const notdefGlyph = new Glyph({
            name: '.notdef',
            unicode: 0,
            path: new Path()
        });
        const font = new Font({
            familyName: 'MyFont',
            styleName: 'Medium',
            unitsPerEm: 1000,
            ascender: 800,
            descender: -200,
            glyphs: [notdefGlyph]
        });
        assert.throws(function() { font.toArrayBuffer(); }, /advanceWidth is not a number/);
    });
});

// See test/generate-collection-font.mjs for how the fixture is built. Its two
// members share every table except `name`, so a member is only read correctly
// if the absolute offsets in its own directory are honoured.
describe('font collections', function() {
    const COLLECTION = './test/fonts/TestCollection.ttc';

    it('parses the first member when no name is given', function() {
        const font = loadSync(COLLECTION);
        assert.deepEqual(font.names.windows.postScriptName, {en: 'CollectionAlpha'});
        assert.equal(font.unitsPerEm, 1000);
    });

    it('selects a member by PostScript name', function() {
        const alpha = loadSync(COLLECTION, {postscriptName: 'CollectionAlpha'});
        const beta = loadSync(COLLECTION, {postscriptName: 'CollectionBeta'});
        assert.deepEqual(alpha.names.windows.postScriptName, {en: 'CollectionAlpha'});
        assert.deepEqual(beta.names.windows.postScriptName, {en: 'CollectionBeta'});
    });

    it('reads the shared tables from a non-first member', function() {
        // `glyf`, `loca` and `cmap` live once in the file and are pointed at by
        // both directories. A parser that assumed a member's tables followed
        // its directory would read member 0's here and still look correct, so
        // this asserts the outline actually arrives.
        const beta = loadSync(COLLECTION, {postscriptName: 'CollectionBeta'});
        const glyph = beta.charToGlyph('A');
        assert.equal(glyph.index, 1);
        assert.equal(glyph.advanceWidth, 500);
        assert.equal(glyph.path.toPathData(0), 'M0 500L0 0L500 0L500 500Z');
    });

    it('throws and lists the members when the name is not in the collection', function() {
        assert.throws(
            function() { loadSync(COLLECTION, {postscriptName: 'NotInThere'}); },
            /no font named "NotInThere".*CollectionAlpha, CollectionBeta/
        );
    });
});

describe('opentype.js on low memory mode', function() {
    const opt = { lowMemory: true };

    it('can load a TrueType font', function() {
        const font = loadSync('./test/fonts/Roboto-Black.ttf', opt);
        assert.deepEqual(font.names.macintosh.fontFamily, {en: 'Roboto Black'});
        assert.deepEqual(font.names.windows.fontFamily, {en: 'Roboto Black'});
        assert.equal(font.unitsPerEm, 2048);
        assert.equal(font.glyphs.length, 0);
        const aGlyph = font.charToGlyph('A');
        assert.equal(aGlyph.unicode, 65);
        assert.equal(aGlyph.path.commands.length, 15);
    });

    it('can load a OpenType/CFF font', function() {
        const font = loadSync('./test/fonts/FiraSansOT-Medium.otf', opt);
        assert.deepEqual(font.names.macintosh.fontFamily, {en: 'Fira Sans OT Medium'});
        assert.deepEqual(font.names.windows.fontFamily, {en: 'Fira Sans OT Medium'});
        assert.equal(font.unitsPerEm, 1000);
        assert.equal(font.glyphs.length, 0);
        const aGlyph = font.charToGlyph('A');
        assert.equal(aGlyph.name, 'A');
        assert.equal(aGlyph.unicode, 65);
        assert.equal(aGlyph.path.commands.length, 14);
    });

    it('can load a CID-keyed font', function() {
        const font = loadSync('./test/fonts/FDArrayTest257.otf', opt);
        assert.deepEqual(font.names.windows.fontFamily, {en: 'FDArray Test 257'});
        assert.deepEqual(font.tables.cff.topDict.ros, ['Adobe', 'Identity', 0]);
        assert.equal(font.tables.cff.topDict._fdArray.length, 256);
        assert.equal(font.tables.cff.topDict._fdSelect[0], 0);
        assert.equal(font.tables.cff.topDict._fdSelect[42], 41);
        assert.equal(font.tables.cff.topDict._fdSelect[256], 255);
        assert.equal(font.unitsPerEm, 1000);
        assert.equal(font.glyphs.length, 0);
        const aGlyph = font.glyphs.get(2);
        assert.equal(aGlyph.name, 'cid00002');
        assert.equal(aGlyph.unicode, 1);
        assert.equal(aGlyph.path.commands.length, 24);
        assert.deepEqual(font.stringToGlyphIndexes('🌺'), [59]);
    });

    it('can load a WOFF/CFF font', function() {
        const font = loadSync('./test/fonts/FiraSansMedium.woff', opt);
        assert.deepEqual(font.names.macintosh.fontFamily, {en: 'Fira Sans OT'});
        assert.deepEqual(font.names.windows.fontFamily, {en: 'Fira Sans OT'});
        assert.equal(font.unitsPerEm, 1000);
        assert.equal(font.glyphs.length, 0);
        const aGlyph = font.charToGlyph('A');
        assert.equal(aGlyph.name, 'A');
        assert.equal(aGlyph.unicode, 65);
        assert.equal(aGlyph.path.commands.length, 14);
    });

    it('handles a parseBuffer error', function(done, fail) {
        try{
            const font = loadSync('./test/fonts/badfont.otf', opt);
            fail();
        } catch(e) {
            done();
        }
    }, opt);

    it('throws an error when advanceWidth is not set', function() {
        const notdefGlyph = new Glyph({
            name: '.notdef',
            unicode: 0,
            path: new Path()
        });
        const font = new Font({
            familyName: 'MyFont',
            styleName: 'Medium',
            unitsPerEm: 1000,
            ascender: 800,
            descender: -200,
            glyphs: [notdefGlyph]
        });
        assert.throws(function() { font.toArrayBuffer(); }, /advanceWidth is not a number/);
    });

    it('should force unicode undefined for .notdef glyph', function() {
        const nullGlyph = new Glyph({
            name: '.notdef',
            path: new Path()
        });
        const font = new Font({
            familyName: 'TestFont',
            styleName: 'Medium',
            unitsPerEm: 1000,
            ascender: 800,
            descender: -200,
            glyphs: [nullGlyph]
        });
        const ndGlyph = font.glyphs.get(0);
        assert.equal(ndGlyph.name, '.notdef');
        assert.equal(ndGlyph.unicode, undefined);
    });

    it('should correctly set unicode 0 for .null glyph', function() {
        const nullGlyph = new Glyph({
            name: '.null',
            unicode: 0,
            path: new Path()
        });
        const font = new Font({
            familyName: 'TestFont',
            styleName: 'Medium',
            unitsPerEm: 1000,
            ascender: 800,
            descender: -200,
            glyphs: [nullGlyph]
        });
        const ndGlyph = font.glyphs.get(0);
        assert.equal(ndGlyph.name, '.null');
        assert.equal(ndGlyph.unicode, 0);
    });

    it('should force unicode 0 for .null glyph', function() {
        const nullGlyph = new Glyph({
            name: '.null',
            path: new Path()
        });
        const font = new Font({
            familyName: 'TestFont',
            styleName: 'Medium',
            unitsPerEm: 1000,
            ascender: 800,
            descender: -200,
            glyphs: [nullGlyph]
        });
        const ndGlyph = font.glyphs.get(0);
        assert.equal(ndGlyph.name, '.null');
        assert.equal(ndGlyph.unicode, 0);
    });

    it('should not allow unicode 0 for any other glyph', function() {
        assert.throws(() => {
            new Glyph({
                name: 'space',
                unicode: 0,
                path: new Path()
            });
        }, /The unicode value "0" is reserved for the glyph name ".null" and cannot be used by any other glyph./);
    });
});
