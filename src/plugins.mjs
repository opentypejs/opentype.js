export const plugins = [];

/**
 * checks if any registered plugin covers the given entry point and data
 * @param {string} entryPoint - name of an entry point from where the plugin is called
 * @param {opentype.Font} font - the font object
 * @param {...*} var_args - variable number of arguments depending on the entry point
 * @returns {boolean} - true if the entry point was handled successfully by at least one plugin, false if not
 */
export function checkPlugin(entryPoint, font) {
    let handled = false;
    let returnData = {};
    for(const plugin of plugins) {
        if(typeof plugin[entryPoint] !== 'function') continue;
        const pluginReturnData = plugin[entryPoint](font, returnData, ...Array.prototype.slice.call(arguments, 2));
        if(typeof pluginReturnData === 'object') {
            returnData = Object.assign({}, returnData, pluginReturnData);
        }
        if(!!pluginReturnData) handled = true;
    }

    return handled ? returnData : false;
}
