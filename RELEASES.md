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
