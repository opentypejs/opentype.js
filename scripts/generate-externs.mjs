#!/usr/bin/env node

/**
 * Generate Closure externs for opentype.js from source JSDoc comments.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import * as acorn from 'acorn';
import { simple as walkSimple } from 'acorn-walk';
import commentParser from 'comment-parser';

const parseComments = commentParser;
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(ROOT, 'src');
const EXTERNS_PATH = path.join(ROOT, 'externs', 'opentype.js');
const ENTRY_FILE = path.join(SRC_DIR, 'opentype.mjs');

/**
 * Entry point for the extern generation script.
 *
 * Reads source files, determines public API symbols, and writes externs.
 */
async function main() {
  const sourceFiles = await collectSourceFiles(SRC_DIR);
  const fileInfos = await Promise.all(sourceFiles.map(parseSourceFile));
  const exportedSymbols = collectExportedSymbols(fileInfos, ENTRY_FILE);
  const opentypeAssignmentsSet = new Set(
    fileInfos.flatMap((fi) => (fi.opentypeAssignments || []).map((a) => a.memberName))
  );

  const {
    publicLocalNames,
    publicTopLevelNames,
    publicOpentypePaths,
    localNameToOpentypePaths,
  } = buildPublicSymbolInfo(fileInfos, exportedSymbols, ENTRY_FILE, opentypeAssignmentsSet);

  const { docs: localDocs, protoDocs } = buildLocalDocs(
    fileInfos,
    exportedSymbols,
    opentypeAssignmentsSet,
    publicLocalNames,
    publicTopLevelNames,
    publicOpentypePaths,
    localNameToOpentypePaths
  );

  const missingDocs = exportedSymbols
    .filter((symbol) => !symbol.exportedName.startsWith('_'))
    .filter((symbol) => !localDocs.has(symbol.localName))
    .map((symbol) => `${symbol.exportedName} (local: ${symbol.localName})`);

  if (missingDocs.length > 0) {
    throw new Error(
      `Missing JSDoc comments for public symbols exported by ${path.relative(ROOT, ENTRY_FILE)}:\n` +
      missingDocs.join('\n')
    );
  }

  const entries = buildExternEntries(localDocs, protoDocs, exportedSymbols, publicOpentypePaths);
  const externSource = renderExternSource(entries);
  await fs.writeFile(EXTERNS_PATH, externSource, 'utf8');
  console.log(`Wrote ${path.relative(ROOT, EXTERNS_PATH)}`);
}

/**
 * Collect all `.mjs` files recursively from the source directory.
 *
 * @param {string} directory
 * @returns {Promise<string[]>}
 */
async function collectSourceFiles(directory) {
  const dirents = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const dirent of dirents) {
    const resolved = path.join(directory, dirent.name);
    if (dirent.isDirectory()) {
      files.push(...await collectSourceFiles(resolved));
    } else if (dirent.isFile() && resolved.endsWith('.mjs')) {
      files.push(resolved);
    }
  }

  return files;
}

/**
 * Parse a source file and collect AST metadata used for extern generation.
 *
 * @param {string} filePath
 * @returns {Promise<object>}
 */
async function parseSourceFile(filePath) {
  const code = await fs.readFile(filePath, 'utf8');
  const comments = [];
  const ast = acorn.parse(code, {
    sourceType: 'module',
    ecmaVersion: 'latest',
    onComment: comments,
  });

  const exports = [];
  const declarations = new Map();
  const prototypeAssignments = [];
  const opentypeAssignments = [];
  const imports = [];
  const defaultExportProperties = [];

  function isPrototypeMemberAssignment(node) {
    return node.type === 'AssignmentExpression' &&
      node.left.type === 'MemberExpression' &&
      !node.left.computed &&
      node.left.object.type === 'MemberExpression' &&
      !node.left.object.computed &&
      node.left.object.property.type === 'Identifier' &&
      node.left.object.property.name === 'prototype' &&
      node.left.object.object.type === 'Identifier' &&
      node.left.property.type === 'Identifier';
  }

  function getOpentypeMemberPath(memberExpr) {
    const parts = [];
    let cur = memberExpr;

    while (cur && cur.type === 'MemberExpression') {
      if (cur.property.type === 'Identifier') {
        parts.unshift(cur.property.name);
      } else if (cur.property.type === 'Literal' && typeof cur.property.value === 'string') {
        parts.unshift(cur.property.value);
      } else {
        return null;
      }
      cur = cur.object;
    }

    if (cur && cur.type === 'Identifier' && cur.name === 'opentype') {
      return parts.join('.');
    }
    return null;
  }

  walkSimple(ast, {
    FunctionDeclaration(node) {
      if (node.id && node.id.name) {
        declarations.set(node.id.name, node);
      }
    },
    ClassDeclaration(node) {
      if (node.id && node.id.name) {
        declarations.set(node.id.name, node);
      }
    },
    VariableDeclaration(node) {
      for (const decl of node.declarations) {
        if (decl.id && decl.id.type === 'Identifier' && decl.init) {
          const name = decl.id.name;
          if (decl.init.type === 'FunctionExpression' || decl.init.type === 'ClassExpression') {
            declarations.set(name, node);
          }
        }
      }
    },
    AssignmentExpression(node) {
      if (isPrototypeMemberAssignment(node)) {
        const className = node.left.object.object.name;
        const memberName = node.left.property.name;
        prototypeAssignments.push({
          className,
          memberName,
          key: `${className}.prototype.${memberName}`,
          node,
        });
      } else if (node.left && node.left.type === 'MemberExpression') {
        const path = getOpentypeMemberPath(node.left);
        if (path) {
          opentypeAssignments.push({ memberName: path, node });
        }
      }
    },
    ImportDeclaration(node) {
      const src = node.source && node.source.value;
      for (const specifier of node.specifiers || []) {
        if (specifier.type === 'ImportDefaultSpecifier') {
          imports.push({ localName: specifier.local.name, importedName: 'default', source: src });
        } else if (specifier.type === 'ImportSpecifier') {
          imports.push({ localName: specifier.local.name, importedName: specifier.imported.name, source: src });
        } else if (specifier.type === 'ImportNamespaceSpecifier') {
          imports.push({ localName: specifier.local.name, importedName: '*', source: src });
        }
      }
    },
    ExportNamedDeclaration(node) {
      if (node.declaration) {
        if (node.declaration.type === 'FunctionDeclaration' && node.declaration.id) {
          exports.push({ localName: node.declaration.id.name, exportedName: node.declaration.id.name });
        } else if (node.declaration.type === 'ClassDeclaration' && node.declaration.id) {
          exports.push({ localName: node.declaration.id.name, exportedName: node.declaration.id.name });
        }
      }
      for (const specifier of node.specifiers || []) {
        if (specifier.local && specifier.exported) {
          exports.push({ localName: specifier.local.name, exportedName: specifier.exported.name });
        }
      }
    },
    ExportDefaultDeclaration(node) {
      if (node.declaration && node.declaration.type === 'Identifier') {
        exports.push({ localName: node.declaration.name, exportedName: 'default' });
      } else if (node.declaration && node.declaration.type === 'ObjectExpression') {
        for (const prop of node.declaration.properties || []) {
          if (prop.type !== 'Property') continue;
          const key = prop.key.type === 'Identifier'
            ? prop.key.name
            : (prop.key.type === 'Literal' ? String(prop.key.value) : null);
          let localName = null;
          if (prop.value && prop.value.type === 'Identifier') {
            localName = prop.value.name;
          }
          if (key) defaultExportProperties.push({ name: key, localName });
        }
      }
    },
  });

  return {
    filePath,
    code,
    comments,
    exports,
    declarations,
    prototypeAssignments,
    opentypeAssignments,
    imports,
    defaultExportProperties,
  };
}

/**
 * Resolve a relative import source to an absolute file path.
 *
 * @param {string} baseFilePath
 * @param {string} source
 * @returns {string}
 */
function resolveImportSource(baseFilePath, source) {
  if (source.startsWith('.')) {
    let resolved = path.resolve(path.dirname(baseFilePath), source);
    if (!path.extname(resolved)) {
      resolved += '.mjs';
    }
    return resolved;
  }
  return source;
}

/**
 * Build metadata for public symbols and their runtime namespace paths.
 *
 * @param {Array<object>} fileInfos
 * @param {Array<object>} exportedSymbols
 * @param {string} entryFile
 * @param {Set<string>} opentypeAssignmentsSet
 * @returns {object}
 */
function buildPublicSymbolInfo(fileInfos, exportedSymbols, entryFile, opentypeAssignmentsSet) {
  const fileInfoByPath = new Map(fileInfos.map((info) => [path.resolve(info.filePath), info]));
  const entry = fileInfoByPath.get(path.resolve(entryFile));
  if (!entry) {
    throw new Error(`Entry file not found: ${entryFile}`);
  }

  const publicLocalNames = new Set((exportedSymbols || []).map((s) => s.localName));
  const publicTopLevelNames = new Set((exportedSymbols || []).map((s) => (s.exportedName === 'default' ? 'opentype' : s.exportedName)));
  const publicOpentypePaths = new Set();
  const localNameToOpentypePaths = new Map();

  function addLocalPath(localName, pathName) {
    if (!localName) return;
    const paths = localNameToOpentypePaths.get(localName) || [];
    if (!paths.includes(pathName)) {
      paths.push(pathName);
      localNameToOpentypePaths.set(localName, paths);
    }
  }

  for (const symbol of exportedSymbols) {
    if (symbol.exportedName !== 'default') {
      addLocalPath(symbol.localName, `opentype.${symbol.exportedName}`);
    }
  }

  for (const symbol of exportedSymbols) {
    const importEntry = entry.imports.find((imp) => imp.localName === symbol.localName);
    if (!importEntry || importEntry.importedName !== 'default') {
      continue;
    }

    const resolvedSource = resolveImportSource(entry.filePath, importEntry.source);
    const sourceInfo = fileInfoByPath.get(resolvedSource);
    if (!sourceInfo) {
      continue;
    }

    for (const prop of sourceInfo.defaultExportProperties) {
      if (!prop.name) continue;
      const nestedPath = `opentype.${symbol.exportedName}.${prop.name}`;
      publicOpentypePaths.add(nestedPath);
      if (prop.localName) {
        publicLocalNames.add(prop.localName);
        addLocalPath(prop.localName, nestedPath);
        if (prop.name === 'Parser') {
          addLocalPath(prop.localName, `opentype.${symbol.exportedName}`);
        }
      } else {
        addLocalPath(prop.name, nestedPath);
      }
    }
  }

  for (const memberName of opentypeAssignmentsSet) {
    const fullName = memberName.startsWith('opentype.') ? memberName : `opentype.${memberName}`;
    publicOpentypePaths.add(fullName);
    const root = memberName.split('.')[0];
    publicTopLevelNames.add(root);
    const lastSegment = memberName.split('.').slice(-1)[0];
    publicLocalNames.add(lastSegment);
  }

  return { publicLocalNames, publicTopLevelNames, publicOpentypePaths, localNameToOpentypePaths };
}

/**
 * Parse a JSDoc block comment and return the target symbol metadata.
 *
 * @param {string} source
 * @returns {{kind:string,key:string|null,private:boolean}|null}
 */
function parseCommentDoc(source) {
  const parsed = parseComments(source, { trim: true, spacing: 'preserve' });
  if (parsed.length === 0) {
    return null;
  }

  const block = parsed[0];
  const aliasTag = block.tags.find((tag) => tag.tag === 'alias' || tag.tag === 'exports');
  const typedefTag = block.tags.find((tag) => tag.tag === 'typedef');
  const privateTag = block.tags.find((tag) => tag.tag === 'private');

  if (typedefTag && typedefTag.name) {
    return { kind: 'typedef', key: typedefTag.name, private: !!privateTag };
  }

  if (aliasTag && aliasTag.name) {
    return { kind: 'property', key: aliasTag.name, private: !!privateTag };
  }

  const memberofTag = block.tags.find((tag) => tag.tag === 'memberof');
  const functionTag = block.tags.find((tag) => tag.tag === 'function');
  if (memberofTag && memberofTag.name && functionTag && functionTag.name) {
    return { kind: 'property', key: `${memberofTag.name}.${functionTag.name}`, private: !!privateTag };
  }

  return { kind: 'property', key: null, private: !!privateTag };
}

/**
 * Find the closest preceding JSDoc comment for a node.
 *
 * @param {Array<object>} comments
 * @param {string} code
 * @param {number} nodeStart
 * @returns {object|null}
 */
function findJSDocComment(comments, code, nodeStart) {
  const candidates = comments
    .filter((comment) => comment.type === 'Block' && comment.end <= nodeStart && comment.value.startsWith('*'))
    .sort((a, b) => b.end - a.end);

  if (candidates.length === 0) {
    return null;
  }

  const comment = candidates[0];
  const gap = code.slice(comment.end, nodeStart);
  if (/^[\s]*$/.test(gap)) {
    return comment;
  }

  return null;
}

/**
 * Build documentation records for all public local symbols and prototype members.
 *
 * @param {Array<object>} fileInfos
 * @param {Array<object>} exportedSymbols
 * @param {Set<string>} opentypeAssignmentsSet
 * @param {Set<string>} publicLocalNames
 * @param {Set<string>} publicTopLevelNames
 * @param {Set<string>} publicOpentypePaths
 * @param {Map<string,string[]>} localNameToOpentypePaths
 * @returns {{docs:Map<string,object>,protoDocs:Array<object>}}
 */
function buildLocalDocs(
  fileInfos,
  exportedSymbols,
  opentypeAssignmentsSet,
  publicLocalNames,
  publicTopLevelNames,
  publicOpentypePaths,
  localNameToOpentypePaths
) {
  const docs = new Map();
  const protoDocs = [];

  function isNamePublic(name) {
    return (
      publicLocalNames.has(name) ||
      publicTopLevelNames.has(name) ||
      publicOpentypePaths.has(name) ||
      (opentypeAssignmentsSet && opentypeAssignmentsSet.has(name))
    );
  }

  for (const fileInfo of fileInfos) {
    const { code, comments, declarations, prototypeAssignments, filePath } = fileInfo;

    for (const comment of comments) {
      if (comment.type !== 'Block' || !comment.value.startsWith('*')) {
        continue;
      }

      const source = `/*${comment.value}*/`;
      const parsedTag = parseCommentDoc(source);
      if (!parsedTag) continue;

      if (parsedTag.kind === 'typedef') {
        if (!parsedTag.private) {
          docs.set(parsedTag.key, { source, kind: 'typedef', filePath });
        }
        continue;
      }

      if (parsedTag.private) {
        continue;
      }

      if (parsedTag.key) {
        if (parsedTag.key.startsWith('opentype.')) {
          const rest = parsedTag.key.slice('opentype.'.length);
          if (rest.includes('.prototype.')) {
            const cls = rest.split('.prototype.')[0];
            if (!isNamePublic(cls)) continue;
            docs.set(parsedTag.key, { source, filePath });
            protoDocs.push({
              className: cls,
              memberName: rest.split('.prototype.')[1],
              targetName: parsedTag.key,
              comment: source,
            });
          } else {
            const name = rest.split('.')[0];
            if (!isNamePublic(name)) continue;
            docs.set(parsedTag.key, { source, filePath });
          }
        } else {
          docs.set(parsedTag.key, { source, filePath });
          if (parsedTag.key.includes('.prototype.')) {
            protoDocs.push({
              className: parsedTag.key.split('.prototype.')[0],
              memberName: parsedTag.key.split('.prototype.')[1],
              targetName: parsedTag.key,
              comment: source,
            });
          }
        }
      }
    }

    for (const [name, node] of declarations) {
      if (docs.has(name)) continue;
      const comment = findJSDocComment(comments, code, node.start);
      if (!comment) continue;

      const source = `/*${comment.value}*/`;
      const parsedTag = parseCommentDoc(source);
      if (parsedTag && parsedTag.private) continue;

      docs.set(name, { source, localName: name, filePath });
    }

    for (const assignment of prototypeAssignments) {
      if (!isNamePublic(assignment.className)) continue;
      const classPaths = [...new Set(localNameToOpentypePaths.get(assignment.className) || [])];
      const comment = findJSDocComment(comments, code, assignment.node.start);
      const source = comment ? `/*${comment.value}*/` : null;
      let parsedTag = null;
      if (source) {
        parsedTag = parseCommentDoc(source);
        if (parsedTag && parsedTag.private) continue;
      }

      const targets = [];
      if (parsedTag && parsedTag.key && parsedTag.key.includes('.prototype.')) {
        const targetName = parsedTag.key.startsWith('opentype.')
          ? parsedTag.key
          : `opentype.${parsedTag.key}`;
        const rest = targetName.slice('opentype.'.length);
        const cls = rest.split('.prototype.')[0];
        if (isNamePublic(cls)) {
          targets.push(targetName);
        }
      }

      if (classPaths.length > 0) {
        classPaths.sort((a, b) => a.length - b.length);
        targets.push(`${classPaths[0]}.prototype.${assignment.memberName}`);
      }

      if (targets.length === 0) {
        targets.push(`opentype.${assignment.className}.prototype.${assignment.memberName}`);
      }

      for (const targetName of targets) {
        if (docs.has(targetName)) continue;
        if (source) {
          docs.set(targetName, { source, filePath });
        }
        protoDocs.push({
          className: assignment.className,
          memberName: assignment.memberName,
          targetName,
          comment: source,
        });
      }
    }
  }

  for (const [localName, paths] of localNameToOpentypePaths) {
    if (!isNamePublic(localName)) continue;
    const localDoc = docs.get(localName) || docs.get(`opentype.${localName}`);
    if (!localDoc) continue;

    for (const nestedPath of paths) {
      if (docs.has(nestedPath)) continue;
      docs.set(nestedPath, {
        source: localDoc.source,
        filePath: localDoc.filePath,
        kind: localDoc.kind,
      });
    }
  }

  return { docs, protoDocs };
}

function collectExportedSymbols(fileInfos, entryFile) {
  const entry = fileInfos.find((info) => path.resolve(info.filePath) === path.resolve(entryFile));
  if (!entry) {
    throw new Error(`Entry file not found: ${entryFile}`);
  }
  return entry.exports;
}

function buildExternEntries(localDocs, protoDocs, exportedSymbols, publicOpentypePaths) {
  const entries = [];
  const seen = new Set();

  for (const symbol of exportedSymbols) {
    const { localName, exportedName } = symbol;
    const doc = localDocs.get(localName) || localDocs.get(exportedName) || localDocs.get(`opentype.${exportedName}`);
    const name = exportedName === 'default' ? 'opentype' : `opentype.${exportedName}`;

    if (seen.has(name)) {
      continue;
    }
    seen.add(name);

    if (doc) {
      if (doc.kind === 'typedef') {
        entries.push({ kind: 'typedef', name: exportedName, comment: doc.source });
      } else {
        entries.push({ kind: 'property', name, comment: doc.source });
      }
    } else {
      entries.push({ kind: 'property', name, comment: null });
    }
  }

  for (const protoDoc of protoDocs) {
    if (!documentHasPublicClass(protoDoc.className, exportedSymbols, publicOpentypePaths)) {
      continue;
    }
    const targetName = protoDoc.targetName.startsWith('opentype.')
      ? protoDoc.targetName
      : `opentype.${protoDoc.targetName}`;
    if (seen.has(targetName)) {
      continue;
    }
    seen.add(targetName);
    entries.push({ kind: 'property', name: targetName, comment: protoDoc.comment });
  }

  for (const [name, doc] of localDocs) {
    if (name.startsWith('opentype.') && !seen.has(name)) {
      seen.add(name);
      entries.push({ kind: 'property', name, comment: doc.source });
    }
  }

  for (const pathName of publicOpentypePaths) {
    if (!pathName.startsWith('opentype.')) continue;
    if (seen.has(pathName)) continue;
    seen.add(pathName);
    entries.push({ kind: 'property', name: pathName, comment: null });
  }

  return entries;
}

function documentHasPublicClass(className, exportedSymbols, publicOpentypePaths) {
  if (exportedSymbols.some((symbol) => symbol.localName === className)) {
    return true;
  }
  for (const pathName of publicOpentypePaths) {
    if (pathName.endsWith(`.${className}`) || pathName.includes(`.${className}.`)) {
      return true;
    }
  }
  return false;
}

function renderExternSource(entries) {
  const lines = [
    '/**',
    ' * @fileoverview Closure Compiler externs for opentype.js generated from source JSDoc.',
    ' * @externs',
    ' */',
    '',
    '/** @const */',
    'var opentype = {};',
    '',
  ];

  for (const entry of entries) {
    if (entry.kind === 'typedef') {
      lines.push(entry.comment);
      lines.push(`var ${entry.name};`);
      lines.push('');
      continue;
    }

    if (entry.comment) {
      lines.push(entry.comment);
    } else {
      lines.push('/** @type {?} */');
    }
    lines.push(`${entry.name} = function() {};`);
    lines.push('');
  }

  return lines.join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export default main;
