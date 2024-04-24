export const plugins = [];

/**
 * Plugins are registered by pushing them to the opentype.plugins array.
 * They need to export any supported entry point names as functions, which will be passed a returnData object
 * and different params depending on the entry point, which should be documented.
 * 
 * The returnData object is shared by all plugins handling the same entry point and can be used to return
 * data which can be handled by the code following an entry point. Data can also be mutated on any references
 * to arrays or objects passed via the params.
 * What returnData is expected/supported by each entry point should be documented as well.
 * An entry point function returning a falsy value for returnData signals that it has not handled that entry point.
 */

/**
 * checks if any registered plugin covers the given entry point and data
 * @param {string} entryPoint - name of an entry point from where the plugin is called
 * @param {Object} params - object of parameters to pass on to the plugin entry point
 * @returns {Object|boolean} returnData object if the entry point was handled successfully by at least one plugin, false if not
 */
export function applyPlugins(entryPoint, params) {
    let handled = false;
    let returnData = {};
    for(const plugin of plugins) {
        if(typeof plugin[entryPoint] !== 'function') continue;
        const pluginReturnData = plugin[entryPoint](returnData, params);
        if(typeof pluginReturnData === 'object') {
            returnData = Object.assign({}, returnData, pluginReturnData);
        }
        if(!!pluginReturnData) handled = true;
    }
    return handled ? returnData : false;
}
