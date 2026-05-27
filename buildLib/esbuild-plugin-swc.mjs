/*
This file's license:

MIT License

Copyright (c) 2021 sanyuan et al.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/**
 * @file This file contains the esbuild plugin for SWC
 */

import { transform, transformSync } from '@swc/core';
import path from 'node:path';
import process from 'node:process';
import fs from 'node:fs/promises';

function assignDeep(target, source) {
    for (const key in source) {
        if (source[key] instanceof Object && !(source[key] instanceof Function)) {
            if (!target[key]) {
                target[key] = {};
            }
            assignDeep(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    }
    return target;
}

export default function swcPlugin(options, isAsync) {
    options = options ?? {};
    isAsync = isAsync ?? true;
    return {
        name: 'esbuild:swc',
        setup(builder) {
            builder.onResolve({ filter: /\.(m?[tj]s)$/ }, (args) => {
                const fullPath = path.resolve(args.resolveDir, args.path);
                return {
                    path: fullPath,
                };
            });
            builder.onLoad({ filter: /\.(m?[tj]s)$/ }, async (args) => {
                const code = await fs.readFile(args.path, 'utf-8');
                const isTS = args.path.endsWith('.ts');
                const initialOptions = {
                    jsc: {
                        parser: {
                            syntax: isTS ? 'typescript' : 'ecmascript',
                        }
                    },
                    filename: args.path,
                    sourceMaps: true,
                    sourceFileName: path.relative(options.root,args.path)
                };
                const finalOptions = assignDeep(assignDeep({}, initialOptions), options);
                let result;
                if (isAsync) {
                    result = await transform(code, finalOptions);
                }else{
                    result = transformSync(code, finalOptions);
                }
                return {
                    contents: result.code+(finalOptions.sourceMaps?`\n//# sourceMappingURL=data:application/json;base64,${Buffer.from(result.map).toString('base64')}`:''),
                    loader: 'js'
                };
            });
        }
    }
}