import { getPath, transformPoints } from './tables/glyf.js';
import { copyPoint, copyComponent } from './util.js';
import Glyph from './glyph.js';

/**
 * Part of the code of this class was based on
 * https://github.com/foliojs/fontkit/blob/a5fe0a1834241dbc6eb02beea3b7414c118c5ac9/src/glyph/GlyphVariationProcessor.js
 * Copyright (c) 2014 Devon Govett
 * MIT License
 */

export class VariationProcessor {
    constructor(font) {
        this.font = font;
    }

    /**
     * Returns the coords normalized from the axis ranges to the range from -1 to 1
     */
    getNormalizedCoords(coords) {
        if(!coords) {
            throw Error('Variation coords are required');
        }
        let normalized = [];
        for (let i = 0; i < this.fvar().axes.length; i++) {
            const axis = this.fvar().axes[i];
            const tagValue = coords[axis.tag];
            if (tagValue < axis.defaultValue) {
                normalized.push((tagValue - axis.defaultValue + Number.EPSILON) / (axis.defaultValue - axis.minValue + Number.EPSILON));
            } else {
                normalized.push((tagValue - axis.defaultValue + Number.EPSILON) / (axis.maxValue - axis.defaultValue + Number.EPSILON));
            }
        }

        // if there is an avar table, the normalized value is calculated
        // by interpolating between the two nearest mapped values.
        if (this.avar()) {
            for (let i = 0; i < this.avar().axisSegmentMaps.length; i++) {
                let segment = this.avar().axisSegmentMaps[i];
                for (let j = 0; j < segment.axisValueMaps.length; j++) {
                    let pair = segment.axisValueMaps[j];
                    if (j >= 1 && normalized[i] < pair.fromCoordinate) {
                        let prev = segment.axisValueMaps[j - 1];
                        normalized[i] = ((normalized[i] - prev.fromCoordinate) * (pair.toCoordinate - prev.toCoordinate) + Number.EPSILON) /
                            (pair.fromCoordinate - prev.fromCoordinate + Number.EPSILON) +
                            prev.toCoordinate;
            
                        break;
                    }
                }
            }
        }

        return normalized;
    }

    /**
     * Returns interpolated points if deltas are not provided for all points in a glyph
     */
    interpolatePoints(points, glyphPoints, deltaMap) {
        if (points.length === 0) {
            return;
        }
    
        let pointIndex = 0;
        while (pointIndex < points.length) {
            let firstPoint = pointIndex;
    
            // find the end point of the contour
            let endPoint = pointIndex;
            let point = points[endPoint];
            while (!point.lastPointOfContour) {
                point = points[++endPoint];
            }
    
            // find the first point that has a delta
            while (pointIndex <= endPoint && !deltaMap[pointIndex]) {
                pointIndex++;
            }
    
            if (pointIndex > endPoint) {
                continue;
            }
    
            let firstDelta = pointIndex;
            let curDelta = pointIndex;
            pointIndex++;
    
            while (pointIndex <= endPoint) {
                // find the next point with a delta, and interpolate intermediate points
                if (deltaMap[pointIndex]) {
                    this.deltaInterpolate(curDelta + 1, pointIndex - 1, curDelta, pointIndex, glyphPoints, points);
                    curDelta = pointIndex;
                }
        
                pointIndex++;
            }
    
            // shift contour if we only have a single delta
            if (curDelta === firstDelta) {
                this.deltaShift(firstPoint, endPoint, curDelta, glyphPoints, points);
            } else {
                // otherwise, handle the remaining points at the end and beginning of the contour
                this.deltaInterpolate(curDelta + 1, endPoint, curDelta, firstDelta, glyphPoints, points);
        
                if (firstDelta > 0) {
                    this.deltaInterpolate(firstPoint, firstDelta - 1, curDelta, firstDelta, glyphPoints, points);
                }
            }
    
            pointIndex = endPoint + 1;
        }
    }

    deltaInterpolate(p1, p2, ref1, ref2, glyphPoints, points) {
        if (p1 > p2) {
            return;
        }

        let iterable = ['x', 'y'];
        for (let i = 0; i < iterable.length; i++) {
            let k = iterable[i];
            if (glyphPoints[ref1][k] > glyphPoints[ref2][k]) {
                var p = ref1;
                ref1 = ref2;
                ref2 = p;
            }

            let in1 = glyphPoints[ref1][k];
            let in2 = glyphPoints[ref2][k];
            let out1 = points[ref1][k];
            let out2 = points[ref2][k];

            // If the reference points have the same coordinate but different
            // delta, inferred delta is zero.  Otherwise interpolate.
            if (in1 !== in2 || out1 === out2) {
                let scale = in1 === in2 ? 0 : (out2 - out1) / (in2 - in1);

                for (let p = p1; p <= p2; p++) {
                    let out = glyphPoints[p][k];

                    if (out <= in1) {
                        out += out1 - in1;
                    } else if (out >= in2) {
                        out += out2 - in2;
                    } else {
                        out = out1 + (out - in1) * scale;
                    }

                    points[p][k] = out;
                }
            }
        }
    }

    deltaShift(p1, p2, ref, glyphPoints, points) {
        let deltaX = points[ref].x - glyphPoints[ref].x;
        let deltaY = points[ref].y - glyphPoints[ref].y;

        if (deltaX === 0 && deltaY === 0) {
            return;
        }

        for (let p = p1; p <= p2; p++) {
            if (p !== ref) {
                points[p].x += deltaX;
                points[p].y += deltaY;
            }
        }
    }

    transformComponents(glyph, transformedPoints, coords, tuplePoints, header, factor) {
        let pointsIndex = 0;
        for(let c = 0; c < glyph.components.length; c++) {
            const component = glyph.components[c];
            const componentGlyph = this.font.glyphs.get(component.glyphIndex);
            const componentTransform = copyComponent(component);
            const deltaIndex = tuplePoints.indexOf(c);
            if(deltaIndex > -1) {
                componentTransform.dx += Math.round(header.deltas[deltaIndex] * factor);
                componentTransform.dy += Math.round(header.deltasY[deltaIndex] * factor);
            }
            const transformedComponentPoints = transformPoints(this.getTransform(componentGlyph, coords), componentTransform);
            transformedPoints.splice(pointsIndex, transformedComponentPoints.length, ...transformedComponentPoints);
            pointsIndex += componentGlyph.points.length;
        }
    }

    /**
     * Returns a transformed copy of a glyph based on the provided variation coordinates, or the glyph itself if no variation was applied
     * @param {opentype.Glyph|integer} glyph Glyph or index of glyph to transform
     * @param {Object} coords Variation coords object (will fall back to variation coords in the defaultRenderOptions)
     * @returns {opentype.Glyh}
     */
    getTransform(glyph, coords) {
        if(Number.isInteger(glyph)) {
            glyph = this.font.glyphs.get(glyph);
        }
        const hasBlend = glyph.getBlendPath;
        const hasPoints = !!(glyph.points && glyph.points.length);
        let transformedGlyph = glyph;
        if (hasBlend || hasPoints) {
            if(!coords) {
                coords = this.font.variation.get();
            }
            const normalizedCoords = this.getNormalizedCoords(coords);
            let transformedPoints;
            if(hasPoints) {
                const variationData = this.gvar() && this.gvar().glyphVariations[glyph.index];
                if(variationData) {
                    const glyphPoints = glyph.points;
                    transformedPoints = glyphPoints.map(copyPoint);
                    const sharedTuples = this.gvar().sharedTuples;
                    const { headers, sharedPoints } = variationData;
        
                    const axisCount = this.fvar().axes.length;
        
                    for(let h = 0; h < headers.length; h++) {
                        const header = headers[h];
                        let factor = 1;
                        for (let a = 0; a < axisCount; a++) {
        
                            const tupleCoords = header.peakTuple ? header.peakTuple : sharedTuples[header.sharedTupleRecordsIndex];
        
                            if (tupleCoords[a] === 0) {
                                continue;
                            }
                        
                            if (normalizedCoords[a] === 0) {
                                factor = 0;
                                break;
                            }
                        
                            if (!header.intermediateStartTuple) {
                                if ((normalizedCoords[a] < Math.min(0, tupleCoords[a])) ||
                                    (normalizedCoords[a] > Math.max(0, tupleCoords[a]))) {
                                    factor = 0;
                                    break;
                                }
                        
                                factor = (factor * normalizedCoords[a] + Number.EPSILON) / (tupleCoords[a] + Number.EPSILON);
                            } else {
                                if ((normalizedCoords[a] < header.intermediateStartTuple[a]) || (normalizedCoords[a] > header.intermediateEndTuple[a])) {
                                    factor = 0;
                                    break;
                                } else if (normalizedCoords[a] < tupleCoords[a]) {
                                    factor = factor * (normalizedCoords[a] - header.intermediateStartTuple[a] + Number.EPSILON) / (tupleCoords[a] - header.intermediateStartTuple[a] + Number.EPSILON);
                                } else {
                                    factor = factor * (header.intermediateEndTuple[a] - normalizedCoords[a] + Number.EPSILON) / (header.intermediateEndTuple[a] - tupleCoords[a] + Number.EPSILON);
                                }
                            }
                        }
        
                        if (factor === 0) {
                            continue;
                        }
        
                        const tuplePoints = header.privatePoints.length ? header.privatePoints: sharedPoints;
        
                        if(glyph.isComposite) {
                            /** @TODO: composite glyphs that are not explicitly targeted in the gvar table
                             ** will not be transformed. It's unclear whether this is the desired behaviour or not,
                            ** @see https://github.com/unicode-org/text-rendering-tests/issues/96
                            */
                            this.transformComponents(glyph, transformedPoints, coords, tuplePoints, header, factor);
                        } else if (tuplePoints.length === 0) {
                            for (let i = 0; i < transformedPoints.length; i++) {
                                const point = transformedPoints[i];
                                transformedPoints[i] = {
                                    x: Math.round(point.x + header.deltas[i] * factor),
                                    y: Math.round(point.y + header.deltasY[i] * factor),
                                    onCurve: point.onCurve,
                                    lastPointOfContour: point.lastPointOfContour
                                };
                            }
                        } else {
                            const interpolatedPoints = transformedPoints.map(copyPoint);            
                            const deltaMap = Array(glyphPoints.length).fill(false);
                            for (let i = 0; i < tuplePoints.length; i++) {
                                let pointIndex = tuplePoints[i];
                                if (pointIndex < glyphPoints.length) {
                                    let point = interpolatedPoints[pointIndex];
                                    deltaMap[pointIndex] = true;
                                    point.x += header.deltas[i] * factor;
                                    point.y += header.deltasY[i] * factor;
                                }
                            }
            
                            this.interpolatePoints(interpolatedPoints, transformedPoints, deltaMap);
            
                            for (let i = 0; i < glyphPoints.length; i++) {
                                let deltaX = interpolatedPoints[i].x - transformedPoints[i].x;
                                let deltaY = interpolatedPoints[i].y - transformedPoints[i].y;
            
                                transformedPoints[i].x = Math.round(transformedPoints[i].x + deltaX);
                                transformedPoints[i].y = Math.round(transformedPoints[i].y + deltaY);
                            }
                        }
                    }
                    
                    transformedGlyph = new Glyph(Object.assign({}, glyph, {points: transformedPoints, path: getPath(transformedPoints)}));
                }
            } else if (hasBlend) {
                const blendPath = glyph.getBlendPath(coords);
                transformedGlyph = new Glyph(Object.assign({}, glyph, {path: blendPath}));
            }
        }

        if(this.font.tables.hvar) {
            glyph._advanceWidth = typeof glyph._advanceWidth !== 'undefined' ? glyph._advanceWidth: glyph.advanceWidth;
            glyph.advanceWidth = transformedGlyph.advanceWidth = Math.round(glyph._advanceWidth + this.getVariableAdjustment(transformedGlyph.index, 'hvar', 'advanceWidth', coords));
            
            glyph._leftSideBearing = typeof glyph._leftSideBearing !== 'undefined' ? glyph._leftSideBearing: glyph.leftSideBearing;
            glyph.leftSideBearing = transformedGlyph.leftSideBearing = Math.round(glyph._leftSideBearing + this.getVariableAdjustment(transformedGlyph.index, 'hvar', 'lsb', coords));
        }

        return transformedGlyph;
    }

    getVariableAdjustment(gid, tableName, parameter, coords) {
        coords = coords || this.font.variation.get();

        let outerIndex, innerIndex;
        
        const table = this.font.tables[tableName];
        if(!table) {
            throw Error(`trying to get variation adjustment from non-existent table "${table}"`);
        }
        if(!table.itemVariationStore) {
            throw Error(`trying to get variation adjustment from table "${table}" which does not have an itemVariationStore`);
        }
        const mapSize = table[parameter] && table[parameter].map.length;
        if (mapSize) {
            let i = gid;
            if (i >= mapSize) {
                i = mapSize - 1;
            }
            
            ({outerIndex, innerIndex} = table[parameter].map[i]);
        } else {
            outerIndex = 0;
            innerIndex = gid;
        }
    
        return this.getDelta(table.itemVariationStore, outerIndex, innerIndex, coords);

    }

    getDelta(itemStore, outerIndex, innerIndex, coords) {
        if (outerIndex >= itemStore.itemVariationSubtables.length) {
            return 0;
        }
        
        let varData = itemStore.itemVariationSubtables[outerIndex];
        if (innerIndex >= varData.deltaSets.length) {
            return 0;
        }
        
        let deltaSet = varData.deltaSets[innerIndex];
        let blendVector = this.getBlendVector(itemStore, outerIndex, coords);
        let netAdjustment = 0;
    
        for (let master = 0; master < varData.regionIndexes.length; master++) {
            netAdjustment += deltaSet[master] * blendVector[master];
        }
    
        return netAdjustment;
    }

    getBlendVector(itemStore, itemIndex, coords) {
        if(!coords) {
            coords = this.font.variation.get();
        }
        let varData = itemStore.itemVariationSubtables[itemIndex];

        const normalizedCoords = this.getNormalizedCoords(coords);
        let blendVector = [];
    
        // outer loop steps through master designs to be blended
        for (let master = 0; master < varData.regionIndexes.length; master++) {
            let scalar = 1;
            let regionIndex = varData.regionIndexes[master];
            let axes = itemStore.variationRegions[regionIndex].regionAxes;
    
            // inner loop steps through axes in this region
            for (let j = 0; j < axes.length; j++) {
                let axis = axes[j];
                let axisScalar;
    
                // compute the scalar contribution of this axis
                // ignore invalid ranges
                if (axis.startCoord > axis.peakCoord || axis.peakCoord > axis.endCoord) {
                    axisScalar = 1;
    
                } else if (axis.startCoord < 0 && axis.endCoord > 0 && axis.peakCoord !== 0) {
                    axisScalar = 1;
    
                    // peak of 0 means ignore this axis
                } else if (axis.peakCoord === 0) {
                    axisScalar = 1;
    
                    // ignore this region if coords are out of range
                } else if (normalizedCoords[j] < axis.startCoord || normalizedCoords[j] > axis.endCoord) {
                    axisScalar = 0;
    
                    // calculate a proportional factor
                } else {
                    if (normalizedCoords[j] === axis.peakCoord) {
                        axisScalar = 1;
                    } else if (normalizedCoords[j] < axis.peakCoord) {
                        axisScalar = (normalizedCoords[j] - axis.startCoord + Number.EPSILON) /
                  (axis.peakCoord - axis.startCoord + Number.EPSILON);
                    } else {
                        axisScalar = (axis.endCoord - normalizedCoords[j] + Number.EPSILON) /
                  (axis.endCoord - axis.peakCoord + Number.EPSILON);
                    }
                }
    
                // take product of all the axis scalars
                scalar *= axisScalar;
            }
    
            blendVector[master] = scalar;
        }
    
        return blendVector;
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