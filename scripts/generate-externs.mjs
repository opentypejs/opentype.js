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
    fileInfos.flatMap((info) => (info.opentypeAssignments || []).map((assignment) => assignment.memberName))
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
    .filter((symbol) => !(symbol.exportedName.startsWith('_') || symbol.exportedName.startsWith('#')))
    .filter((symbol) => !localDocs.has(symbol.localName))
    .map((symbol) => `${symbol.exportedName} (local: ${symbol.localName})`);

  if (missingDocs.length > 0) {
    throw new Error(
      `Missing JSDoc comments for public symbols exported by ${path.relative(ROOT, ENTRY_FILE)}:` +
      '\n' +
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
/**
 * Recursively collect all `.mjs` source files under a directory.
 * @param {string} directory - Directory to search.
 * @returns {Promise<string[]>} Resolved list of absolute file paths.
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
/**
 * Parse a single source file and extract AST-derived metadata used for
 * extern generation.
 *
 * The returned object contains the raw `code` and parsed `comments`, a list
 * of `exports`, named `declarations`, prototype and `opentypeAssignments`,
 * `imports` and properties related to default exports.
 *
 * @param {string} filePath - Absolute path to the source file.
 * @returns {Promise<object>} Metadata describing the file's AST items.
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

  function isThisMemberAssignment(node) {
    return node.type === 'AssignmentExpression' &&
      node.left.type === 'MemberExpression' &&
      !node.left.computed &&
      node.left.object.type === 'ThisExpression' &&
      node.left.property.type === 'Identifier';
  }

  function collectConstructorAssignments(body, className) {
    if (!body || body.type !== 'BlockStatement') return;
    walkSimple(body, {
      AssignmentExpression(node) {
        if (!isThisMemberAssignment(node)) return;
        prototypeAssignments.push({
          className,
          memberName: node.left.property.name,
          key: `${className}.prototype.${node.left.property.name}`,
          node,
        });
      },
    });
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
      if (node.id?.name) {
        declarations.set(node.id.name, node);
        collectConstructorAssignments(node.body, node.id.name);
      }
    },
    ClassDeclaration(node) {
      if (node.id?.name) {
        declarations.set(node.id.name, node);
      }
      for (const element of node.body.body || []) {
        if (element.type === 'MethodDefinition' && element.kind === 'constructor') {
          collectConstructorAssignments(element.value.body, node.id.name);
        }
      }
    },
    VariableDeclaration(node) {
      for (const decl of node.declarations) {
        if (decl.id?.type === 'Identifier' && decl.init) {
          const name = decl.id.name;
          if (decl.init.type === 'FunctionExpression' || decl.init.type === 'ClassExpression') {
            declarations.set(name, node);
            collectConstructorAssignments(decl.init.body, name);
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
      } else if (node.left?.type === 'MemberExpression') {
        const path = getOpentypeMemberPath(node.left);
        if (path) {
          opentypeAssignments.push({ memberName: path, node });
        }
      }
    },
    ImportDeclaration(node) {
      const src = node.source?.value;
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
        if (node.declaration.type === 'FunctionDeclaration' && node.declaration.id?.name) {
          exports.push({ localName: node.declaration.id.name, exportedName: node.declaration.id.name });
        } else if (node.declaration.type === 'ClassDeclaration' && node.declaration.id?.name) {
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
      if (node.declaration?.type === 'Identifier') {
        exports.push({ localName: node.declaration.name, exportedName: 'default' });
      } else if (node.declaration?.type === 'ObjectExpression') {
        for (const prop of node.declaration.properties || []) {
          if (prop.type !== 'Property') continue;
          const key = prop.key.type === 'Identifier'
            ? prop.key.name
            : (prop.key.type === 'Literal' ? String(prop.key.value) : null);
          let localName = null;
          if (prop.value?.type === 'Identifier') localName = prop.value.name;
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
 * From the parsed file infos, collect the exported symbols declared by the
 * library entry file. Filters out private exports (starting with `_`).
 *
 * @param {Array<object>} fileInfos - Array of parsed file metadata.
 * @param {string} entryFile - Absolute path to the entry file.
 * @returns {Array<{localName:string, exportedName:string}>} Public exports.
 */
function collectExportedSymbols(fileInfos, entryFile) {
  const fileInfoByPath = new Map(fileInfos.map((info) => [path.resolve(info.filePath), info]));
  const entry = fileInfoByPath.get(path.resolve(entryFile));
  if (!entry) {
    throw new Error(`Entry file not found: ${entryFile}`);
  }

  return entry.exports.filter((symbol) => !(symbol.exportedName.startsWith('_') || symbol.exportedName.startsWith('#')));
}

/**
 * Resolve an ES module import specifier to an absolute path when it is a
 * local (relative) import. Non-relative imports are returned unchanged.
 *
 * @param {string} baseFilePath - File that contains the import.
 * @param {string} source - The import source specifier from the AST.
 * @returns {string} Resolved path or original module specifier.
 */
function resolveImportSource(baseFilePath, source) {
  if (!source.startsWith('.')) return source;

  let resolved = path.resolve(path.dirname(baseFilePath), source);
  if (!path.extname(resolved)) resolved += '.mjs';
  return resolved;
}

/**
 * Build sets and maps describing which local symbols correspond to public
 * `opentype.*` paths and which top-level names are exported.
 *
 * @param {Array<object>} fileInfos - Parsed file metadata.
 * @param {Array<object>} exportedSymbols - Symbols exported by the entry.
 * @param {string} entryFile - Entry file path.
 * @param {Set<string>} opentypeAssignmentsSet - Set of member names assigned
 *   on the `opentype` global in the codebase.
 * @returns {{publicLocalNames:Set<string>,publicTopLevelNames:Set<string>,publicOpentypePaths:Set<string>,localNameToOpentypePaths:Map<string,string[]>}}
 */
function buildPublicSymbolInfo(fileInfos, exportedSymbols, entryFile, opentypeAssignmentsSet) {
  const fileInfoByPath = new Map(fileInfos.map((info) => [path.resolve(info.filePath), info]));
  const entry = fileInfoByPath.get(path.resolve(entryFile));
  if (!entry) {
    throw new Error(`Entry file not found: ${entryFile}`);
  }

  const publicLocalNames = new Set(exportedSymbols.map((symbol) => symbol.localName));
  const publicTopLevelNames = new Set(exportedSymbols.map((symbol) =>
    symbol.exportedName === 'default' ? 'opentype' : symbol.exportedName
  ));
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
    if (!importEntry || importEntry.importedName !== 'default') continue;

    const resolvedSource = resolveImportSource(entry.filePath, importEntry.source);
    const sourceInfo = fileInfoByPath.get(resolvedSource);
    if (!sourceInfo) continue;

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
    publicTopLevelNames.add(memberName.split('.')[0]);
    publicLocalNames.add(memberName.split('.').slice(-1)[0]);
  }

  return { publicLocalNames, publicTopLevelNames, publicOpentypePaths, localNameToOpentypePaths };
}

/**
 * Parse a JSDoc comment block and extract a small set of tags the script
 * uses to map docs to symbols (`@alias`, `@typedef`, `@memberof`, etc.).
 *
 * @param {string} source - Raw JSDoc source text (including the JSDoc delimiters).
 * @returns {{kind:string,key:string|null,private:boolean}|null}
 */
function parseCommentDoc(source) {
  const parsed = parseComments(source, { trim: true, spacing: 'preserve' });
  if (parsed.length === 0) return null;

  const block = parsed[0];
  const aliasTag = block.tags.find((tag) => tag.tag === 'alias' || tag.tag === 'exports');
  const typedefTag = block.tags.find((tag) => tag.tag === 'typedef');
  const privateTag = block.tags.find((tag) => tag.tag === 'private');

  if (typedefTag?.name) {
    return { kind: 'typedef', key: typedefTag.name, private: Boolean(privateTag) };
  }

  if (aliasTag?.name) {
    return { kind: 'property', key: aliasTag.name, private: Boolean(privateTag) };
  }

  const memberofTag = block.tags.find((tag) => tag.tag === 'memberof');
  const functionTag = block.tags.find((tag) => tag.tag === 'function');
  if (memberofTag?.name && functionTag?.name) {
    return { kind: 'property', key: `${memberofTag.name}.${functionTag.name}`, private: Boolean(privateTag) };
  }

  return { kind: 'property', key: null, private: Boolean(privateTag) };
}

/**
 * Find the nearest preceding JSDoc block comment for a node start offset.
 * Returns the comment object from Acorn when the gap between comment end
 * and node start contains only whitespace.
 *
 * @param {Array<object>} comments - Acorn onComment array for the file.
 * @param {string} code - Source code text.
 * @param {number} nodeStart - AST node `start` index.
 * @returns {object|null} Matching comment or null.
 */
function findJSDocComment(comments, code, nodeStart) {
  const candidates = comments
    .filter((comment) => comment.type === 'Block' && comment.end <= nodeStart && comment.value.startsWith('*'))
    .sort((a, b) => b.end - a.end);

  if (candidates.length === 0) return null;

  const comment = candidates[0];
  const gap = code.slice(comment.end, nodeStart);
  return /^[\s]*$/.test(gap) ? comment : null;
}

/**
 * Build a map of local documentation blocks and prototype docs from the
 * parsed files. This associates JSDoc comments with public/local symbol
 * names and synthesizes prototype entries when necessary.
 *
 * @param {Array<object>} fileInfos - Parsed file metadata.
 * @param {Array<object>} exportedSymbols - Symbols exported by the entry.
 * @param {Set<string>} opentypeAssignmentsSet - Names assigned to `opentype`.
 * @param {Set<string>} publicLocalNames - Local symbol names considered public.
 * @param {Set<string>} publicTopLevelNames - Top-level exported names.
 * @param {Set<string>} publicOpentypePaths - Known `opentype.*` paths.
 * @param {Map<string,string[]>} localNameToOpentypePaths - Mapping from local
 *   names to nested `opentype.*` paths.
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
      opentypeAssignmentsSet.has(name)
    );
  }

  for (const fileInfo of fileInfos) {
    const { code, comments, declarations, prototypeAssignments, filePath } = fileInfo;

    for (const comment of comments) {
      if (comment.type !== 'Block' || !comment.value.startsWith('*')) continue;

      const source = `/*${comment.value}*/`;
      const parsedTag = parseCommentDoc(source);
      if (!parsedTag || parsedTag.private) continue;

      if (parsedTag.kind === 'typedef') {
        docs.set(parsedTag.key, { source, kind: 'typedef', filePath, private: false });
        continue;
      }

      if (!parsedTag.key) continue;

      if (parsedTag.key.startsWith('opentype.')) {
        const rest = parsedTag.key.slice('opentype.'.length);
        if (rest.includes('.prototype.')) {
          const cls = rest.split('.prototype.')[0];
          if (!isNamePublic(cls)) continue;
          docs.set(parsedTag.key, { source, filePath, private: false });
          protoDocs.push({
            className: cls,
            memberName: rest.split('.prototype.')[1],
            targetName: parsedTag.key,
            comment: source,
          });
        } else {
          const name = rest.split('.')[0];
          if (!isNamePublic(name)) continue;
          docs.set(parsedTag.key, { source, filePath, private: false });
        }
      } else {
        docs.set(parsedTag.key, { source, filePath, private: false });
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

    for (const [name, node] of declarations) {
      if (docs.has(name)) continue;
      const comment = findJSDocComment(comments, code, node.start);
      if (!comment) continue;

      const source = `/*${comment.value}*/`;
      const parsedTag = parseCommentDoc(source);
      if (parsedTag?.private) continue;

      docs.set(name, { source, localName: name, filePath, private: false });
    }

    for (const assignment of prototypeAssignments) {
      if (!isNamePublic(assignment.className)) continue;
      if (assignment.memberName.startsWith('_') || assignment.memberName.startsWith('#')) continue;

      const classPaths = [...new Set(localNameToOpentypePaths.get(assignment.className) || [])];
      const comment = findJSDocComment(comments, code, assignment.node.start);
      const source = comment ? `/*${comment.value}*/` : null;
      const parsedTag = source ? parseCommentDoc(source) : null;
      if (parsedTag?.private) continue;

      const targets = [];
      if (parsedTag?.key?.includes('.prototype.')) {
        const targetName = parsedTag.key.startsWith('opentype.')
          ? parsedTag.key
          : `opentype.${parsedTag.key}`;
        const cls = targetName.slice('opentype.'.length).split('.prototype.')[0];
        if (isNamePublic(cls)) targets.push(targetName);
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
        if (source) docs.set(targetName, { source, filePath, private: false });
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
        private: localDoc.private || false,
      });
    }
  }

  return { docs, protoDocs };
}

/**
 * Create the ordered list of extern entries (typedefs and properties)
 * that will be rendered into the externs file. This function also ensures
 * the entries are deduplicated and filtered by public visibility.
 *
 * @param {Map<string,object>} localDocs - Map of documentation blocks.
 * @param {Array<object>} protoDocs - Prototype member doc descriptors.
 * @param {Array<object>} exportedSymbols - Symbols exported by the entry.
 * @param {Set<string>} publicOpentypePaths - Known `opentype.*` paths.
 * @returns {Array<object>} Entries describing typedefs/properties for output.
 */
function buildExternEntries(localDocs, protoDocs, exportedSymbols, publicOpentypePaths) {
  const entries = [];
  const seen = new Set();

  for (const symbol of exportedSymbols) {
    const { localName, exportedName } = symbol;
    let doc = localDocs.get(localName) || localDocs.get(exportedName) || localDocs.get(`opentype.${exportedName}`);
    const name = exportedName === 'default' ? 'opentype' : `opentype.${exportedName}`;

    if (doc?.private) doc = null;
    if (seen.has(name)) continue;
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
    if (!documentHasPublicClass(protoDoc.className, exportedSymbols, publicOpentypePaths)) continue;
    if (protoDoc.memberName.startsWith('_')||protoDoc.memberName.startsWith('#')) continue;

    const targetName = protoDoc.targetName.startsWith('opentype.')
      ? protoDoc.targetName
      : `opentype.${protoDoc.targetName}`;
    if (seen.has(targetName)) continue;

    seen.add(targetName);
    entries.push({ kind: 'property', name: targetName, comment: protoDoc.comment });
  }

  const usedTypedefs = collectUsedTypedefNames(localDocs, entries);
  for (const [name, doc] of localDocs) {
    if (!doc || doc.private || doc.kind !== 'typedef' || !usedTypedefs.has(name) || seen.has(name)) continue;
    seen.add(name);
    entries.push({ kind: 'typedef', name, comment: doc.source });
  }

  for (const [name, doc] of localDocs) {
    if (!doc || doc.private || !name.startsWith('opentype.') || seen.has(name)) continue;
    const lastComponent = name.split('.').pop();
    if (lastComponent.startsWith('_') || lastComponent.startsWith('#')) continue;
    seen.add(name);
    entries.push({ kind: 'property', name, comment: doc.source });
  }

  for (const pathName of publicOpentypePaths) {
    if (!pathName.startsWith('opentype.') || seen.has(pathName)) continue;
    const lastComponent = pathName.split('.').pop();
    if (lastComponent.startsWith('_') || lastComponent.startsWith('#')) continue;
    seen.add(pathName);
    entries.push({ kind: 'property', name: pathName, comment: null });
  }

  return entries;
}

/**
 * Return true if a class name is present in the exported symbols or if it
 * appears as part of any known public `opentype.*` path.
 *
 * @param {string} className
 * @param {Array<object>} exportedSymbols
 * @param {Set<string>} publicOpentypePaths
 * @returns {boolean}
 */
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

/**
 * Compute the set of typedef names referenced by the collected entry
 * comments. This iteratively expands typedefs referenced by other typedefs.
 *
 * @param {Map<string,object>} localDocs
 * @param {Array<object>} entries
 * @returns {Set<string>} Names of typedefs that are used.
 */
function collectUsedTypedefNames(localDocs, entries) {
  const typedefNames = [...localDocs.keys()].filter((name) => localDocs.get(name)?.kind === 'typedef');
  const used = new Set();
  const sources = entries
    .filter((entry) => entry.comment && entry.kind !== 'typedef')
    .map((entry) => entry.comment);

  let changed = true;
  while (changed) {
    changed = false;
    for (const name of typedefNames) {
      if (used.has(name)) continue;
      const regex = new RegExp(`\\b${escapeRegExp(name)}\\b`);
      if (sources.some((source) => regex.test(source))) {
        used.add(name);
        const doc = localDocs.get(name);
        if (doc?.source) sources.push(doc.source);
        changed = true;
      }
    }
  }

  return used;
}

/**
 * Escape a string so it may be used as a literal in a RegExp constructor.
 * @param {string} value
 * @returns {string}
 */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Render the externs file content from a list of entries. Each `property`
 * entry becomes an assignment function on the `opentype` object; `typedef`
 * entries are emitted as `var` declarations with their original comment.
 *
 * @param {Array<object>} entries
 * @returns {string} File source for externs.
 */
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

  // Helper: strip import()/include() wrappers from type expressions so
  // the externs contain plain type names that Closure can understand.
  function sanitizeComment(comment) {
    if (!comment) return comment;
    // Replace patterns like import('...').Type or include('...').Type -> Type
    comment = comment.replace(/\b(?:import|include)\(\s*['"][^'"]+['"]\s*\)\.([A-Za-z0-9_$\.]+)/g, '$1');
    // Remove bare import('...') or include('...') occurrences
    comment = comment.replace(/\b(?:import|include)\(\s*['"][^'"]+['"]\s*\)/g, '');
    return comment;
  }

  // Emit typedefs first so they are available to subsequent property entries.
  const typedefEntries = entries.filter((e) => e.kind === 'typedef');
  const otherEntries = entries.filter((e) => e.kind !== 'typedef');

  for (const entry of typedefEntries) {
    const comment = sanitizeComment(entry.comment) || '/** @type {?} */';
    lines.push(comment);
    lines.push(`var ${entry.name};`);
    lines.push('');
  }

  for (const entry of otherEntries) {
    if (entry.comment) {
      lines.push(sanitizeComment(entry.comment));
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

/**
 * Default export: run the main generator when invoked programmatically.
 * @returns {Promise<void>}
 */
export default main;
