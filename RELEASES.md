0.7.3 (July 18, 2017)
=====================
* Fix "Object x already has key" error in Safari (thanks @neiltron!).
* Fixed a bug where Font.getPaths() didn't pass options (thanks @keeslinp!).

0.7.2 (June 7, 2017)
====================
* WOFF fonts with cvt tables now parse correctly.
* Migrated to ES6 modules and let/const.
* Use Rollup to bundle the JavaScript.

0.7.1 (Apr 25, 2017)
====================
* Auto-generated glyph IDs (CID-keyed fonts) are now prefixed with "gid", e.g. "gid42".
* Fix ligature substitution for fonts with coverage table format 2.
* Better error messages when no valid cmap is found.

0.7.0 (Apr 25, 2017)
====================
* Add font hinting (thanks @axkibe!)
* Add support for CID-keyed fonts, thanks to @tshinnic.
* TrueType fonts with signature 'true' or 'typ1' are also supported.
* Fixing rounding issues.
* Add GSUB and kern output in font-inspector.
* Add font loading error callback.
* Dev server turns browser caching off.
* Add encoding support for variation adjustment deltas (thanks @brawer!).

0.6.9 (Jan 17, 2017)
====================
* Add ligature rendering (thanks @fpirsch!)

0.6.8 (Jan 9, 2017)
=========================
* Add a `getBoundingBox` method to the `Path` and `Glyph` objects.

0.6.7 (Jan 5, 2017)
=========================
* Add basic support for Mac OS X format kern tables.

0.6.6 (October 25, 2016)
=========================
* Add support for letter-spacing and tracking (thanks @lachmanski!).
* Fixed a bug in the nameToGlyph function.

0.6.5 (September 9, 2016)
=========================
* GSUB reading and writing by @fpirsch. This is still missing a user-friendly API.
* Add support for cmap table format 12, which enables support for Unicode characters outside of the 0x0 - 0xFFFF range.
* Better API documentation using [JSDoc](http://usejsdoc.org/).
* Accessing xMin/... metrics works before path load. 

0.6.4 (June 30, 2016)
=========================
* Add X/Y scale options to compute a streched path of a glyph.
* Correct reading/writing of font timestamps.
* examples/generate-font-node.js now generates "full" Latin font.
* Add OS/2 value options for weight, width and fsSelection.

0.6.3 (May 10, 2016)
=========================
* Wrapped parseBuffer in a try/catch so it doesn't throw exceptions. Thanks @rBurgett!
* Fix a leaking global variable. Thanks @cuixiping!

0.6.2 (March 11, 2016)
=========================
* Improve table writing to support nested subtables. Thanks @fpirsch!

0.6.1 (February 20, 2016)
=========================
* Left side bearing is now correctly reported.
* Simplified code for including ascender / descender values.

0.6.0 (December 1, 2015)
========================
* Improvements to font writing: generated fonts now work properly on OS X.
* When creating a new font, ascender and descender are now required.

0.5.1 (October 26, 2015)
========================
* Add `Font.getPaths()` which returns a list of paths.

0.5.0 (October 6, 2015)
=======================
* Read support for WOFF.

0.4.11 (September 27, 2015)
===========================
* Fix issue with loading of TrueType composite glyphs.
* Fix issue with missing hmtx values.
* Sensible getMetrics() values for empty glyphs (e.g. space).

0.4.10 (July 30, 2015)
======================
* Add loadSync method for Node.js.
* Unit tests for basic types and tables.
* Implement MACSTRING codec.
* Support multilingual names.
* Handle names of font variation axes and instances.

0.4.9 (June 23, 2015)
=====================
* Improve memory usage by deferring glyph / path loading. Thanks @Pomax!
* Put examples in the "examples" directory. Use the local web server to see them.

0.4.8 (June 3, 2015)
====================
* Fix an issue with writing out fonts that have an UPM != 1000.

0.4.6 (March 26, 2015)
======================
* Fix issues with exporting/subsetting TrueType fonts.
* Improve validness of exported fonts.
* Empty paths (think: space) no longer contain a single closePath command.
* Fix issues with exporting fonts with TrueType half-point values.
* Expose the internal byte parsing algorithms as opentype._parse.

0.4.5 (March 10, 2015)
======================
* Add support for writing quad curves.
* Add support for CFF flex operators.
* Close CFF subpaths.

0.4.4 (Dec 8, 2014)
===================
* Solve issues with Browserify.

0.4.3 (Nov 26, 2014)
====================
* Un-break node.js support.

0.4.2 (Nov 24, 2014)
====================
* 2x speedup when writing fonts, thanks @louisremi!

0.4.1 (Nov 10, 2014)
====================
* Fix bug that prevented `npm install`.

0.4.0 (Nov 10, 2014)
====================
* Add support for font writing.

0.3.0 (Jun 10, 2014)
====================
* Support for GPOS kerning, which works in both PostScript and OpenType.
* Big performance improvements.
* The font and glyph inspector can visually debug a font.

0.2.0 (Feb 7, 2014)
===================
* Support for reading PostScript fonts.

0.1.0 (Sep 27, 2013)
====================
* Initial release.
* Supports reading TrueType CFF fonts.
