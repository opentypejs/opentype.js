import process from 'node:process';

/**
 * @file This file handles parsing command line arguments for any custom build tools used in building opentype.js
 */

export default function createCommandLineArgumentsHandler(validArguments) {
    const validTypes = ['json', 'string', 'number', 'boolean'];
    const argumentInfo = {};
    const shortArgsMap = {};
    const defaultTemplate = {};
    {
        const inputKeys = Object.keys(validArguments);
        for(let i = 0; i < inputKeys.length; i++) {
            const key = inputKeys[i];
            const firstCode = key[0].charCodeAt(0);
            if((firstCode < 65 || firstCode > 90) && (firstCode < 97 || firstCode > 122))
                continue; 
            const argument = validArguments[key];
            if(argument.type && validTypes.includes(argument.type)){
                argumentInfo[key] = {};
                argumentInfo[key].type = argument.type;
                argumentInfo[key].hasShortKey = argument.shortKey??(argument.type === 'boolean');
                argumentInfo[key].takesParameter = (argument.type !== 'boolean'? true : argument.takesParameter??false);
                argumentInfo[key].acceptsPropertySyntax = argument.propertySyntax;
                if(argument.default){
                    defaultTemplate[key] = argument.default;
                }
            }
        }
        validArguments = null;
    }
    const argumentKeys = Object.keys(argumentInfo);
    for(let i = 0; i < argumentKeys.length; i++) {
        const key = argumentKeys[i];
        if(!argumentInfo[key].hasShortKey)
            continue;
        let shortKey = null;
        let shortKeyCandidate = key[0].toLowerCase();
        for(let j = 0; j < 26; j++){
            if(!shortArgsMap[shortKeyCandidate]){
                shortArgsMap[shortKeyCandidate] = key;
                shortKey = shortKeyCandidate;
                break;
            }else if(!shortArgsMap[shortKeyCandidate.toUpperCase()]){
                shortArgsMap[shortKeyCandidate.toUpperCase()] = key;
                shortKey = shortKeyCandidate.toUpperCase();
                break;
            }
            shortKeyCandidate = String.fromCharCode(((shortKeyCandidate.charCodeAt(0)-95)%26)+96);
            console.log(shortKeyCandidate);
        }
        if(!shortKey)
            throw new Error(`Could not assign short key for argument: ${key}`);
    }

    function checkForSplitValue(value, args, index){
        if(value[0] == "'"){
            return value[value.length-1] !== "'";
        }else if(value[0] == '"'){
            return value[value.length-1] !== '"';
        }
        return false;
    }

    function parseBooleanArgument(key, args, index, options, value){
        if(value !== null && !argumentInfo[key].takesParameter){
            throw new Error(`Invalid option: ${key}`);
        }else if(value === null && !argumentInfo[key].takesParameter){
            options[key] = true;
            return 0;
        }else if(argumentInfo[key].takesParameter){
            let increment = 0;
            if(value === null && args.length > index+1){
                value = args[index+1];
                increment = 1;
            }else if(value === null){
                throw new Error(`Invalid option: ${key}`);
            }else if(checkForSplitValue(value)){
                do{
                    if(args.length <= index+increment)
                        throw new Error(`Unclosed option value: ${key}`);
                    value += ' ' + args[index+1];
                    increment++;
                }while(checkForSplitValue(value));
                value = value.slice(1,-1);
            }
            options[key] = value;
            return increment;
        }else{
            throw new Error(`Invalid option: ${key}`);
        }
    }

    function parseNumberArgument(key, args, index, options, value){
        let increment = 0;
        if(value === null && args.length > index+1){
            value = args[index+1];
            increment = 1;
        }
        if(value === null)
            throw new Error(`Invalid option: ${key}`);
        if(checkForSplitValue(value))
            throw new Error(`Unclosed option value: ${key}`);
        if(value.startsWith("0x")){
            options[key] = parseInt(value.slice(2), 16);
        }else if(value.startsWith("0o")){
            options[key] = parseInt(value.slice(2), 8);
        }else if(value.startsWith("0b")){
            options[key] = parseInt(value.slice(2), 2);
        }else{
            if(value.startsWith("0d")){
                options[key]=parseInt(value.slice(2),10);
            } else options[key] = parseFloat(value);
        }
        return increment;
    }

    function parseStringArgument(key, args, index, options, value){
        let increment = 0;
        if(value === null && args.length > index+1){
            value = args[index+1];
            increment = 1;
        }
        if(value === null)
            throw new Error(`Invalid option: ${key}`);
        if(checkForSplitValue(value)){
            do{
                if(args.length <= index+increment)
                    throw new Error(`Unclosed option value: ${key}`);
                value += ' ' + args[index+1];
                increment++;
            }while(checkForSplitValue(value));
            value = value.slice(1,-1);
        }
        options[key] = value;
        return increment;
    }

    function parseJsonArgument(key, args, index, options, value){
        let increment = 0;
        if(value === null && args.length > index+1){
            value = args[index+1];
            increment = 1;
        }
        if(value === null)
            throw new Error(`Invalid option: ${key}`);
        if(checkForSplitValue(value)){
            do{
                if(args.length <= index+increment)
                    throw new Error(`Unclosed option value: ${key}`);
                value += ' ' + args[index+1];
                increment++;
            }while(checkForSplitValue(value));
            value = value.slice(1,-1);
        }
        options[key] = JSON.parse(value.replaceAll("'", "\""));
        return increment;
    }


    return function() {
        const args = process.argv.slice(2);
        const parsedArgs = {args: [], options: Object.assign({}, defaultTemplate)};

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg.startsWith('--')) {
                const longArg = arg.slice(2);
                let key = longArg;
                let value = null;
                if (!argumentInfo[key.replace(/-/g, '_')]) {
                    let splitproperty = longArg.split("=");
                    if (splitproperty.length > 1) {
                        key = splitproperty[0];
                        value = splitproperty[1];
                    }else{
                        throw new Error(`Invalid option: ${key}`);
                    }
                    if(!argumentInfo[key])
                        throw new Error(`Invalid option: ${key}`);
                    if(!argumentInfo[key].acceptsPropertySyntax)
                        throw new Error(`Invalid property syntax for option: ${key}`);
                }
                if(key.indexOf('_') !== -1)
                    throw new Error(`Invalid option: ${key}`);
                key = key.replace(/-/g, '_');
                switch(argumentInfo[key].type) {
                    case 'boolean':
                        i += parseBooleanArgument(key, args, i, parsedArgs.options, value);
                        break;
                    case 'number':
                        i += parseNumberArgument(key, args, i, parsedArgs.options, value);
                        break;
                    case 'string':
                        i += parseStringArgument(key, args, i, parsedArgs.options, value);
                        break;
                    case 'json':
                        i += parseJsonArgument(key, args, i, parsedArgs.options, value);
                        break;
                }
            } else if (arg.startsWith('-')) {
                const shortArg = arg.slice(1);
                for (let j = 0; j < shortArg.length; j++) {
                    const key = shortArgsMap[shortArg[j]];
                    if (!key) {
                        throw new Error(`Invalid option: ${shortArg[j]}`);
                    }
                    if(argumentInfo[key].type === 'boolean'){
                        i += parseBooleanArgument(key, args, i, parsedArgs.options, null);
                    }else if(j > 0 || shortArg.length > 1){
                        throw new Error(`Invalid option: ${shortArg}`);
                    }else{
                        switch(argumentInfo[key].type) {
                            case 'number':
                                i += parseNumberArgument(key, args, i, parsedArgs.options, null);
                                break;
                            case 'string':
                                i += parseStringArgument(key, args, i, parsedArgs.options, null);
                                break;
                            case 'json':
                                i += parseJsonArgument(key, args, i, parsedArgs.options, null);
                                break;
                        }
                    }
                }
            }else{
                parsedArgs.args.push(arg);
            }
        }

        return parsedArgs;
    }
};