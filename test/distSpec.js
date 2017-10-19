import assert from 'assert';

describe('opentype.js dist', function() {
    it('can work with the uncompressed distribution', function() {
        var opentype = require('../dist/opentype');
        var font = opentype.loadSync('./fonts/Roboto-Black.ttf');
        assert.deepEqual(font.names.fontFamily, {en: 'Roboto Bk'});
        assert.equal(font.unitsPerEm, 2048);
        assert.equal(font.glyphs.length, 1037);
    });

    it('can work with the compressed dist files', function() {
        var opentype = require('../dist/opentype.min');
        var font = opentype.loadSync('./fonts/Roboto-Black.ttf');
        assert.deepEqual(font.names.fontFamily, {en: 'Roboto Bk'});
        assert.equal(font.unitsPerEm, 2048);
        assert.equal(font.glyphs.length, 1037);
    });
});
