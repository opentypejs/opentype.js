import assert from 'assert';
import { parse } from '../../src/opentype.mjs';
import { readFileSync } from 'fs';
const loadSync = (url, opt) => parse(readFileSync(url), opt);

describe('tables/vmtx.mjs', function() {
    const fonts = {
        notoSansJp: loadSync('./test/fonts/NotoSansJP-Medium.ttf'),
        notoSansJpLowMemory: loadSync('./test/fonts/NotoSansJP-Medium.ttf', { lowMemory: true }),
    };

    it('correctly parses the vertical metrics table - high memory', function() {
        // tests for all fonts
        const { notoSansJp } = fonts;

        const a = notoSansJp.charToGlyph('あ');
        assert.equal(a.topSideBearing, 80);
        assert.equal(a.advanceHeight, 1000);
        const aMetrics = a.getMetrics();
        assert.equal(aMetrics.topSideBearing, 80);
        assert.equal(aMetrics.bottomSideBearing, 64);
    });

    it('correctly parses the vertical metrics table - low memory', function() {
        // tests for all fonts
        const { notoSansJpLowMemory } = fonts;

        const a = notoSansJpLowMemory.charToGlyph('あ');
        assert.equal(a.topSideBearing, 80);
        assert.equal(a.advanceHeight, 1000);
        const aMetrics = a.getMetrics();
        assert.equal(aMetrics.topSideBearing, 80);
        assert.equal(aMetrics.bottomSideBearing, 64);
    });
});