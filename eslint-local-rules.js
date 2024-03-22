'use strict';

module.exports = {
  'ban-concat': {
    meta: {
      type: 'suggestion',
      schema: [],
    },
    create(context) {
      return {
        CallExpression(node) {
          if (
            (
              node.callee.property &&
              node.callee.property.name === 'concat' &&
              node.callee?.object?.name !== 'Buffer'
            ) || (
              node.callee?.object?.property?.name === 'concat' &&
              node.callee?.object?.object?.type === 'ArrayExpression'
            )
          ) {
            context.report({node, message: 'Use obj.push(...data) instead of obj = obj.concat(data)'})
          }
        },
      }
    },
  },
  'ban-foreach': {
    meta: {
      type: 'suggestion',
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
  'import-extensions': {
    meta: {
      type: 'problem',
      schema: []
    },
    create(context) {
      const checkImportPath = (node) => {
        const importPath = node.source.value;
        const isRelative = importPath.startsWith('.') || importPath.startsWith('/');
        const extensionMissing = require('path').extname(importPath) === '';
        if (!isRelative || !extensionMissing) {
          return;
        }
        context.report({
          node: node.source,
          message: 'Import paths require a file extension to work in browser module context'
        });
      };

      return {
        ImportDeclaration: checkImportPath
      };
    },
  }
};