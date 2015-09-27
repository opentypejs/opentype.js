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
