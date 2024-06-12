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
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';

function getNodeModulesDirectoryForPath(currentDir){
    let relativePath = "node_modules";
    let resolvedPath = path.resolve(currentDir, relativePath);

    function countSeparators(str) {
        let count = 0;
        for(let i = 0; i < str.length; i++) {
            if(str[i] == path.sep)
                count++;
        }
        return count;
    }

    while(!existsSync(resolvedPath)){
        if(countSeparators(resolvedPath) <= 1){
            throw new Error("Could not find node_modules directory");
        }
        relativePath = path.join("..", relativePath);
        resolvedPath = path.resolve(currentDir, relativePath);
    }
    return resolvedPath;
}

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
                let fullPath;
                let defaultPath = path.resolve(args.resolveDir, args.path);
                if(args.kind == 'import-statement'){
                    if(existsSync(defaultPath)){
                        fullPath = defaultPath;
                    }else{
                        let nodeModulesPath = getNodeModulesDirectoryForPath(args.resolveDir);
                        fullPath = path.join(nodeModulesPath, args.path);
                    }
                }else{
                    fullPath = defaultPath;
                }
                return {
                    path: fullPath,
                };
            });
            builder.onLoad({ filter: /\.(m?[tj]s)$/ }, async (args) => {
                const code = await fs.readFile(args.path, 'utf-8');
                const isTS = args.path.endsWith('.ts');
                const isCoreJs = args.path.indexOf('core-js') !== -1;
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
                if(isCoreJs){
                    delete finalOptions.env.mode;
                }
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