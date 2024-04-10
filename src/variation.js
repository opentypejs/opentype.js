import { getPath } from './tables/glyf.js';

/**
 * Part of the code in the getTransform() and interpolateDeltas() methods was based on
 * https://github.com/foliojs/fontkit/blob/a5fe0a1834241dbc6eb02beea3b7414c118c5ac9/src/glyph/GlyphVariationProcessor.js
 * Copyright (c) 2014 Devon Govett
 * MIT License
 */

export class VariationManager {
    constructor(font) {
        this.font = font;
        this.activateDefaultVariation();
    }

    /**
     * Tries to determine the default instance and sets its variation data as the font.defaultRenderOptions.
     * If not defaultInstance can be determined, the default coordinates of all axes are used.
     */
    activateDefaultVariation() {
        const defaultInstance = this.getDefaultInstanceIndex();
        if (defaultInstance > -1) {
            this.set(defaultInstance);
        } else {
            this.set(this.getDefaultCoordinates());
        }
    }

    /**
     * Returns the coordinates made up of all the axes' default values
     * @returns {Object}
     */
    getDefaultCoordinates() {
        return this.fvar().axes.reduce((acc, axis) => {
            acc[axis.tag] = axis.defaultValue;
            return acc;
        }, {});
    }

    /**
     * Gets the index of the default variation instance or -1 if not able to determine
     * @returns {integer}
     */
    getDefaultInstanceIndex() {
        const defaultCoordinates = this.getDefaultCoordinates();
        
        let defaultInstanceIndex = this.getInstanceIndex(defaultCoordinates);
        
        if (defaultInstanceIndex < 0) {
            defaultInstanceIndex = this.fvar().instances.findIndex(instance => instance.name?.en === 'Regular');
        }

        return defaultInstanceIndex;
    }

    /**
     * Gets the index of the variation instance matching the coordinates object or -1 if not able to determine
     * @param {integer|Object} coordinates An object with axis tags as keys and variation values as values} index 
     * @returns {integer}
     */
    getInstanceIndex(coordinates) {
        return this.fvar().instances.findIndex(instance =>
            Object.keys(coordinates).every(axis =>
                instance.coordinates[axis] === coordinates[axis]
            )
        );
    }

    /**
     * Gets a variation instance by its zero-based index
     * @param {integer} index 
     * @returns {Object}
     */
    getInstance(index) {
        return this.fvar().instances?.[index];
    }

    /**
     * Set the variation coordinates to use by default for rendering in the font.defaultRenderOptions
     * @param {integer|Object} instanceIdOrObject Either the zero-based index of a variation instance or an object with axis tags as keys and variation values as values
     */
    set(instanceIdOrObject) {
        let variationData;
        if(Number.isInteger(instanceIdOrObject)) {
            const instance = this.getInstance(instanceIdOrObject);
            if (!instance) {
                throw Error(`Invalid instance index ${instanceIdOrObject}`);
            }
            variationData = {...instance.coordinates};
        } else {
            variationData = instanceIdOrObject;
        }
        this.font.defaultRenderOptions = Object.assign({}, this.font.defaultRenderOptions, {variation: variationData});
    }

    /**
     * Returns the variation coordinates currently set in the font.defaultRenderOptions
     * @returns {Object}
     */
    get() {
        return Object.assign({}, this.font.defaultRenderOptions.variation);
    }

    getNormalizedPoints(glyph, coords) {
        if(!glyph.points || !glyph.points.length) return [];

        let points = [];
        for (var i = 0; i < this.fvar().axes.length; i++) {
            const axis = this.fvar().axes[i];
            const tagValue = coords[axis.tag];
            if (tagValue < axis.defaultValue) {
                points.push((tagValue - axis.defaultValue + Number.EPSILON) / (axis.defaultValue - axis.minValue + Number.EPSILON));
            } else {
                points.push((tagValue - axis.defaultValue + Number.EPSILON) / (axis.maxValue - axis.defaultValue + Number.EPSILON));
            }
        }

        return points;
    }

    /**
     * Returns the transformed path commands for a glyph based on the provide variation coordinates
     * @param {opentype.Glyph} glyph 
     * @param {Object} coords 
     * @returns {Array<Object>}
     */
    getTransform(glyph, coords) {
        if(!glyph.points || !glyph.points.length) return [];

        const variationData = this.gvar().glyphVariations[glyph.index];
        if(variationData) {
            const transformedPoints = [...glyph.points];
            const sharedTuples = this.gvar().sharedTuples;
            const { headers, sharedPoints } = variationData;

            const points = this.getNormalizedPoints(glyph, coords);
            const axisCount = this.fvar().axes.length;

            for(let h = 0; h < headers.length; h++) {
                const header = headers[h];
                let factor = 1;
                for (let a = 0; a < axisCount; a++) {

                    const tupleCoords = Object.assign([], sharedTuples[header.sharedTupleRecordsIndex], header.peakTuple);

                    if (tupleCoords[a] === 0) {
                        continue;
                    }
                
                    if (points[a] === 0) {
                        factor = 0;
                        break;
                    }
                
                    if (!header.intermediateStartTuple) {
                        if ((points[a] < Math.min(0, tupleCoords[a])) ||
                            (points[a] > Math.max(0, tupleCoords[a]))) {
                            factor = 0;
                            break;
                        }
                
                        factor = (factor * points[a] + Number.EPSILON) / (tupleCoords[a] + Number.EPSILON);
                    } else {
                        if ((points[a] < header.intermediateStartTuple[a]) || (points[a] > header.intermediateEndTuple[a])) {
                            factor = 0;
                            break;
                        } else if (points[a] < tupleCoords[a]) {
                            factor = factor * (points[a] - header.intermediateStartTuple[a] + Number.EPSILON) / (tupleCoords[a] - header.intermediateStartTuple[a] + Number.EPSILON);
                        } else {
                            factor = factor * (header.intermediateEndTuple[a] - points[a] + Number.EPSILON) / (header.intermediateEndTuple[a] - tupleCoords[a] + Number.EPSILON);
                        }
                    }
                }

                if (factor === 0) {
                    continue;
                }

                const tuplePoints = Object.assign([], sharedPoints, header.privatePoints)
                
                if (tuplePoints.length === 0) {
                    for (let i = 0; i < transformedPoints.length; i++) {
                        const point = transformedPoints[i];
                        // console.log({x: header.deltas[i], y: header.deltasY[i], factor})
                        transformedPoints[i] = {
                            x: point.x + Math.round(header.deltas[i] * factor),
                            y: point.y + Math.round(header.deltasY[i] * factor),
                            onCurve: point.onCurve,
                            lastPointOfContour: point.lastPointOfContour
                        };
                    }
                } else {
                    // @TODO: interpolate points
                    console.warn('missing point interpolation not yet supported');
                }
            }
            
            return getPath(transformedPoints).commands;
        }

        return glyph.path.commands;
    }

    /**
     * Helper method that returns the font's avar table if present
     * @returns {Object|undefined}
     */
    avar() {
        return this.font.tables.avar;
    }

    /**
     * Helper method that returns the font's cvar table if present
     * @returns {Object|undefined}
     */
    cvar() {
        return this.font.tables.cvar;
    }

    /**
     * Helper method that returns the font's fvar table if present
     * @returns {Object|undefined}
     */
    fvar() {
        return this.font.tables.fvar;
    }

    /**
     * Helper method that returns the font's gvar table if present
     * @returns {Object|undefined}
     */
    gvar() {
        return this.font.tables.gvar;
    }

    /**
     * Helper method that returns the font's hvar table if present
     * @returns {Object|undefined}
     */
    hvar() {
        return this.font.tables.hvar;
    }
}