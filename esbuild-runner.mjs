import * as esbuild from 'esbuild'
import Path from 'node:path';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';

import semver from 'semver';

import createCommandLineArgumentsHandler from './buildLib/commandLineHelper.mjs';
import swcPlugin from './buildLib/esbuild-plugin-swc.mjs';

/**
 * @file This file coodrdinates the build process for opentype.js between esbuild and swc.
 */

function getScriptPath(){
    try{
        return import.meta.url;
    }catch(e){
        return __filename||null;
    }
}

function getScriptDirectory(){
    try{
        return Path.dirname(import.meta.url);
    }catch(e){
        return __dirname||null;
    }
}

const resolveFileFromPackage = (function(){
    return ((new Function("try{return import.meta.resolve;}catch(e){return null}"))()||createRequire(getScriptPath()).resolve);
})();

function readKeyFromPackageJson(key,pkg) {
    let resolvedPath;
    if(typeof pkg == "undefined" || pkg == null){
        let currentDir = getScriptDirectory;
        let relativePath = "package.json";
        resolvedPath = Path.resolve(currentDir, relativePath);

        function countSeparators(str) {
            let count = 0;
            for(let i = 0; i < str.length; i++) {
                if(str[i] == Path.sep)
                    count++;
            }
            return count;
        }

        while(!existsSync(resolvedPath)){
            if(countSeparators(resolvedPath) <= 1){
                throw new Error("Could not find package.json file");
            }
            relativePath = Path.join("..", relativePath);
            resolvedPath = Path.resolve(currentDir, relativePath);
        }
    }else{
        resolvedPath = resolveFileFromPackage(Path.join(pkg,"package.json"));
        if(!resolvedPath||!existsSync(resolvedPath)){
            throw new Error("Could not find package.json file");
        }
    }

    const packageJson = JSON.parse(readFileSync(resolvedPath, 'utf8'));
    const keys = key.split(".");
    let value = packageJson;
    for(let i = 0; i < keys.length; i++) {
        value = value[keys[i]];
        if(value === undefined)
            return null;
    }
    return value;
}

function convertToEsbuildTarget(swcTargets) {
    const esbuildTargets = [];
    const targetKeys = Object.keys(swcTargets);
    for(let i = 0; i < targetKeys.length; i++) {
        if(targetKeys[i] == "android")
            continue;
        esbuildTargets.push(`${targetKeys[i]}${swcTargets[targetKeys[i]]}`);
    }
    return esbuildTargets;
}

const parseArgs = createCommandLineArgumentsHandler({
    "input":{
        type: "string",
        shortKey: true,
        propertySyntax: true
    },
    "output":{
        type: "string",
        shortKey: true,
        propertySyntax: true
    },
    "externals":{
        type: "json",
        shortKey: false,
        propertySyntax: false
    },
    "target":{
        type: "string",
        shortKey: true,
        propertySyntax: true,
        default: "es2015"
    },
    "global_name": {
        type: "string",
        shortKey: false,
        propertySyntax: true
    },
    "footer": {
        type: "string",
        shortKey: false,
        propertySyntax: true
    },
    "watch": {
        type: "boolean",
        shortKey: true,
        propertySyntax: false,
        default: false
    },
    "servedir": {
        type: "string",
        shortKey: false,
        propertySyntax: true
    },
    "minify": {
        type: "boolean",
        shortKey: true,
        propertySyntax: false,
        default: false
    },
    "sourcemap": {
        type: "boolean",
        shortKey: true,
        propertySyntax: false,
        default: false
    },
    "module": {
        type: "boolean",
        shortKey: true,
        propertySyntax: false,
        default: false
    },
    "debug": {
        type: "boolean",
        shortKey: false,
        propertySyntax: false,
        default: false
    }
});
const params = parseArgs();

async function build(params) {
    const swcConfig = {
        "jsc": {
            "loose": true,
            "externalHelpers": true,
            "transform": {
                "optimizer": {
                  "simplify": true
                }
            },
            "minify": {
                "compress": {
                    "arguments": true,
                    "booleans_as_integers": true,
                    "ecma": 5,
                    "arrows": true,
                    "booleans": true,
                    "collapse_vars": true,
                    "comparisons": true,
                    "conditionals": true,
                    "dead_code": true,
                    "defaults": true,
                    "directives": true,
                    "drop_console": false,
                    "drop_debugger": true,
                    "evaluate": true,
                    "hoist_funs": false,
                    "hoist_props": true,
                    "hoist_vars": false,
                    "if_return": true,
                    "inline": true,
                    "join_vars": true,
                    "keep_classnames": false,
                    "keep_fargs": false,
                    "keep_infinity": false,
                    "loops": true,
                    "negate_iife": true,
                    "passes": 0,
                    "properties": true,
                    "pure_getters": "",
                    "reduce_funcs": false,
                    "reduce_vars": true,
                    "sequences": true,
                    "side_effects": true,
                    "switches": true,
                    "top_retain": "",
                    "toplevel": true,
                    "typeofs": true,
                    "unsafe": false,
                    "unsafe_arrows": false,
                    "unsafe_comps": false,
                    "unsafe_Function": false,
                    "unsafe_math": false,
                    "unsafe_symbols": false,
                    "unsafe_methods": false,
                    "unsafe_proto": false,
                    "unsafe_regexp": false,
                    "unsafe_undefined": false,
                    "unused": true
                },
                "mangle": false
            }
        },
        "rootMode": "root",
        "root": Path.dirname(params.options.input??params.options.args[0]),
        "sourceMaps": params.options.sourcemap??false,
        "inlineSourcesContent": true,
        "isModule": true,
        "minify": params.options.minify??false
    };
    let esbuildTarget;
    {
        //These are the targets for a compatibility build that should work with all browsers in use today, even in embedded devices.
        //These are loaded from the minimumSupportedTargets key in the package.json file.
        const compatTargets = readKeyFromPackageJson("minimumSupportedTargets");
        const installedCoreJsVersion = readKeyFromPackageJson("version","core-js");
        if(!semver.satisfies(installedCoreJsVersion, readKeyFromPackageJson("devDependencies.core-js"))){
            throw new Error("Please update your dependencies, the core-js version installed does not match the version specified in the package.json file.");
        }
        swcConfig.env = {
            "bugfixes": true,
            "mode": "usage",
            "coreJs": installedCoreJsVersion
        };
        if(params.options.target == "compat") {
            swcConfig.env.targets = compatTargets;
            swcConfig.jsc.minify.compress.ecma = 3;
            esbuildTarget = convertToEsbuildTarget(compatTargets);
            //esbuild does not officialy support es3 but outputs es3 compatable code when you specifiy es5 as the target.
            esbuildTarget.push("es5");
        }else{
            swcConfig.jsc.target = params.options.target??'es2015';
            esbuildTarget = params.options.target??'es2015';
        }
    }
    try {
        let outputBaseName = Path.basename(params.options.output??params.options.args[params.options.args.length-1]);
        let outputDir = Path.dirname(params.options.output??params.options.args[params.options.args.length-1]);
        console.log(outputDir);
        const options = {
            entryPoints: [params.options.input??params.options.args[0]],
            bundle: true,
            define: { DEBUG: (params.options.debug??false)+'' },
            minify: params.options.minify??false,
            format: (params.options.module??false?'esm':'iife'),
            conditions: [],
            external: params.options.externals??[],
            globalName: params.options.global_name??undefined,
            plugins: [swcPlugin(swcConfig)],
            target: esbuildTarget,
            sourcemap: params.options.sourcemap??false,
            outdir: outputDir,
            outExtension: {
                '.js': outputBaseName.slice(outputBaseName.indexOf("."))
            }
        };
        if(params.options.footer){
            options.footer = {};
            options.footer.js = params.options.footer;
        }
        if(params.options.watch){
            if(options.footer?.js){
                options.footer.js = options.footer.js+";new EventSource('/esbuild').addEventListener('change', () => location.reload());";
            }
            let ctx = await esbuild.context(options);
            await ctx.watch();
            let { host, port } = await ctx.serve({
                servedir: params.options.servedir
            });
            console.log(`Serving on http://${host}:${port}`);
        }else{
            await esbuild.build(options);
            console.log('Build complete');
        }
    } catch (error) {
        console.error('Build failed:\n', error);
    }
}

build(params);