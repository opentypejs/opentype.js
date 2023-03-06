'use strict';

module.exports = {
  'ban-foreach': {
    meta: {
      type: 'suggestion',
      docs: {
        description: 'Use `for()` loops instead of `.forEach()`',
        category: 'Performance',
      },
      schema: [],
    },
    create(context) {
      return {
        CallExpression(node) {
          if (node.callee.property && node.callee.property.name === 'forEach') {
            context.report({node, message: 'Use for() loops instead of .forEach()'})
          }
        },
      }
    },
  },
};