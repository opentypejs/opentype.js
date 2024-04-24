/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const VerbosityLevel = {
    ERRORS: 0,
    WARNINGS: 1,
    INFOS: 5,
};

const verbosity = VerbosityLevel.WARNINGS;

// Non-fatal warnings.
function warn(msg) {
    if (verbosity >= VerbosityLevel.WARNINGS) {
        console.log(`Warning: ${msg}`);
    }
}

function unreachable(msg) {
    throw new Error(msg);
}

function shadow(obj, prop, value, nonSerializable = false) {
    Object.defineProperty(obj, prop, {
        value,
        enumerable: !nonSerializable,
        configurable: true,
        writable: false,
    });
    return value;
}

function bytesToString(bytes) {
    if (typeof bytes !== 'object' || bytes && bytes.length === undefined) {
        unreachable('Invalid argument for bytesToString');
    }
    const length = bytes.length;
    const MAX_ARGUMENT_COUNT = 8192;
    if (length < MAX_ARGUMENT_COUNT) {
        return String.fromCharCode.apply(null, bytes);
    }
    const strBuf = [];
    for (let i = 0; i < length; i += MAX_ARGUMENT_COUNT) {
        const chunkEnd = Math.min(i + MAX_ARGUMENT_COUNT, length);
        const chunk = bytes.subarray(i, chunkEnd);
        strBuf.push(String.fromCharCode.apply(null, chunk));
    }
    return strBuf.join('');
}

export {
    bytesToString,
    shadow,
    unreachable,
    warn,
};
