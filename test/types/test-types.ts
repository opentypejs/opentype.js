/**
 * Type verification test for opentype.js
 *
 * This file is not executed — it only needs to compile.
 * Run: npx tsc --noEmit --strict -p test/types/tsconfig.json
 */

import { Font, Glyph, Path, BoundingBox, parse } from '../../dist/opentype.mjs';
import type { FontOptions, GlyphRenderOptions } from '../../dist/font.mjs';
import type { PathCommand, MoveCommand, LineCommand, CurveCommand, QuadCommand, CloseCommand } from '../../dist/path.mjs';
import type { GlyphOptions } from '../../dist/glyph.mjs';

// === parse() returns Font ===
declare const buffer: ArrayBuffer;
const font: Font = parse(buffer);
const fontWithOpts: Font = parse(buffer, {});

// === Font properties ===
const unitsPerEm: number = font.unitsPerEm;
const ascender: number = font.ascender;
const descender: number = font.descender;
const supported: boolean = font.supported;
const names: any = font.names;
const tables: any = font.tables;

// === Font methods ===
const hasChar: boolean = font.hasChar('A');
const glyphIndex: number = font.charToGlyphIndex('A');
const glyph: Glyph = font.charToGlyph('A');
const glyphIndexes: number[] = font.stringToGlyphIndexes('Hello');
const glyphs: Glyph[] = font.stringToGlyphs('Hello');
const nameIndex: number = font.nameToGlyphIndex('A');
const namedGlyph: Glyph = font.nameToGlyph('A');
const glyphName: string = font.glyphIndexToName(0);
const kerning: number = font.getKerningValue(0, 1);
const advanceWidth: number = font.getAdvanceWidth('Hello');
const englishName: string = font.getEnglishName('fontFamily');
const warnings: string[] = font.validate();
const arrayBuffer: ArrayBuffer = font.toArrayBuffer();

// === Font.getPath returns Path ===
const path: Path = font.getPath('Hello', 0, 0, 72);
const paths: Path[] = font.getPaths('Hello', 0, 0, 72);

// === Font.getPath with render options ===
const options: GlyphRenderOptions = {
    kerning: true,
    hinting: false,
    usePalette: 0,
    drawLayers: true,
    drawSVG: true,
    fill: 'red',
};
const pathWithOpts: Path = font.getPath('Hello', 0, 0, 72, options);

// === Path properties ===
const commands: PathCommand[] = path.commands;
const fill: string | null = path.fill;
const stroke: string | null = path.stroke;
const strokeWidth: number = path.strokeWidth;

// === Path methods ===
path.moveTo(0, 0);
path.lineTo(100, 100);
path.bezierCurveTo(10, 10, 20, 20, 30, 30);
path.curveTo(10, 10, 20, 20, 30, 30);
path.quadraticCurveTo(10, 10, 20, 20);
path.quadTo(10, 10, 20, 20);
path.close();
path.closePath();
const pathData: string = path.toPathData();
const svgString: string = path.toSVG();
const bbox: BoundingBox = path.getBoundingBox();

// === Path.fromSVG ===
const fromSvg: Path = Path.fromSVG('M0 0L100 100Z');

// === PathCommand discriminated union ===
for (const cmd of commands) {
    switch (cmd.type) {
        case 'M': {
            const x: number = cmd.x;
            const y: number = cmd.y;
            break;
        }
        case 'L': {
            const x: number = cmd.x;
            const y: number = cmd.y;
            break;
        }
        case 'C': {
            const x1: number = cmd.x1;
            const y1: number = cmd.y1;
            const x2: number = cmd.x2;
            const y2: number = cmd.y2;
            const x: number = cmd.x;
            const y: number = cmd.y;
            break;
        }
        case 'Q': {
            const x1: number = cmd.x1;
            const y1: number = cmd.y1;
            const x: number = cmd.x;
            const y: number = cmd.y;
            break;
        }
        case 'Z': {
            // Z has no coordinates
            break;
        }
    }
}

// === BoundingBox ===
const box = new BoundingBox();
const x1: number = box.x1;
const y1: number = box.y1;
const x2: number = box.x2;
const y2: number = box.y2;
const isEmpty: boolean = box.isEmpty();
box.addPoint(10, 20);
box.addX(5);
box.addY(15);
box.addBezier(0, 0, 10, 10, 20, 20, 30, 30);
box.addQuad(0, 0, 10, 10, 20, 20);

// === Glyph ===
const glyphBbox: BoundingBox = glyph.getBoundingBox();
const glyphPath: Path = glyph.getPath(0, 0, 72);
const glyphName2: string | null = glyph.name;
const glyphIndex2: number = glyph.index;
const glyphUnicodes: number[] = glyph.unicodes;
const glyphPathData: string = glyph.toPathData();
const glyphSvg: string = glyph.toSVG();

// === FontOptions ===
const fontOpts: FontOptions = {
    familyName: 'Test',
    styleName: 'Regular',
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
};
