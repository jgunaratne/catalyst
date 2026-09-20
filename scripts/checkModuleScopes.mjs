/**
 * Static scope check for both halves of the codebase.
 *
 * A reference to a name that is neither declared in the file, imported/required by it, nor a
 * known global is a guaranteed runtime ReferenceError. Splitting a large script into modules is
 * exactly the operation that strands such references — a variable or helper stays in one file
 * while the code that uses it moves to another — and neither `node --check` (syntax only) nor
 * the DOM-stub smoke test can catch it, because the broken code only throws when the offending
 * line is actually reached.
 *
 * Usage: node scripts/checkModuleScopes.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const acorn = require('acorn');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Globals the browser provides that acorn has no knowledge of. */
const BROWSER_GLOBALS = [
  'window', 'document', 'console', 'navigator', 'location', 'history', 'screen',
  'fetch', 'Headers', 'Request', 'Response', 'AbortController', 'FormData', 'URL',
  'URLSearchParams', 'WebSocket', 'EventSource', 'localStorage', 'sessionStorage',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'requestAnimationFrame', 'cancelAnimationFrame', 'queueMicrotask',
  'Image', 'Audio', 'Event', 'CustomEvent', 'MutationObserver', 'ResizeObserver',
  'IntersectionObserver', 'DOMParser', 'Blob', 'File', 'FileReader', 'devicePixelRatio',
  'getComputedStyle', 'alert', 'confirm', 'prompt', 'performance', 'crypto', 'structuredClone'
];

/** Globals Node provides to CommonJS modules. */
const NODE_GLOBALS = [
  'require', 'module', 'exports', '__dirname', '__filename', 'process', 'Buffer',
  'console', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate',
  'clearImmediate', 'queueMicrotask', 'globalThis', 'URL', 'URLSearchParams', 'fetch',
  'AbortController', 'TextEncoder', 'TextDecoder', 'structuredClone', 'performance', 'crypto'
];

/** Globals from the language itself, present in every environment. */
const LANGUAGE_GLOBALS = [
  'Object', 'Array', 'String', 'Number', 'Boolean', 'Symbol', 'BigInt', 'Math', 'JSON',
  'Date', 'RegExp', 'Error', 'TypeError', 'RangeError', 'SyntaxError', 'ReferenceError',
  'EvalError', 'URIError', 'AggregateError', 'Promise', 'Map', 'Set', 'WeakMap', 'WeakSet',
  'WeakRef', 'Proxy', 'Reflect', 'Intl', 'parseInt', 'parseFloat', 'isNaN', 'isFinite',
  'NaN', 'Infinity', 'undefined', 'encodeURIComponent', 'decodeURIComponent', 'encodeURI',
  'decodeURI', 'globalThis', 'Function', 'ArrayBuffer', 'SharedArrayBuffer', 'DataView',
  'Uint8Array', 'Int8Array', 'Uint16Array', 'Int16Array', 'Uint32Array', 'Int32Array',
  'Float32Array', 'Float64Array', 'BigInt64Array', 'BigUint64Array', 'escape', 'unescape'
];

/** The two source trees to scan, with the globals legal in each. */
const TARGETS = [
  {
    label: 'browser modules (public/js)',
    dir: join(ROOT, 'public', 'js'),
    sourceType: 'module',
    globals: new Set([...LANGUAGE_GLOBALS, ...BROWSER_GLOBALS])
  },
  {
    label: 'server modules (src, server.js)',
    dir: join(ROOT, 'src'),
    extraFiles: [join(ROOT, 'server.js')],
    sourceType: 'script',
    globals: new Set([...LANGUAGE_GLOBALS, ...NODE_GLOBALS])
  }
];

/** Collect the names a binding pattern introduces (handles destructuring and defaults). */
function patternNames(node, out) {
  if (!node) return out;
  switch (node.type) {
    case 'Identifier': out.push(node.name); break;
    case 'ObjectPattern':
      for (const p of node.properties) {
        patternNames(p.type === 'RestElement' ? p.argument : p.value, out);
      }
      break;
    case 'ArrayPattern':
      for (const el of node.elements) patternNames(el, out);
      break;
    case 'AssignmentPattern': patternNames(node.left, out); break;
    case 'RestElement': patternNames(node.argument, out); break;
    default: break;
  }
  return out;
}

const FUNCTION_TYPES = new Set([
  'FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'
]);

/** Walk every child node, invoking visit(node, parent). */
function walk(node, parent, visit) {
  if (!node || typeof node.type !== 'string') return;
  visit(node, parent);
  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') continue;
    const child = node[key];
    if (Array.isArray(child)) {
      for (const c of child) if (c && typeof c.type === 'string') walk(c, node, visit);
    } else if (child && typeof child.type === 'string') {
      walk(child, node, visit);
    }
  }
}

/**
 * Scopes are tracked as a stack of Sets. A reference resolves if any enclosing scope declares
 * it. Declarations are hoisted per scope before references are resolved, so order of use does
 * not produce false positives.
 */
function analyze(source, filename, sourceType, globals) {
  const ast = acorn.parse(source, {
    ecmaVersion: 'latest', sourceType, locations: true, allowReturnOutsideFunction: true
  });

  // Map every scope-creating node to the set of names it declares.
  const scopeOf = new Map();
  const parentOf = new Map();

  function ensureScope(node) {
    if (!scopeOf.has(node)) scopeOf.set(node, new Set());
    return scopeOf.get(node);
  }

  function isScopeNode(node) {
    return node === ast || FUNCTION_TYPES.has(node.type) ||
      node.type === 'BlockStatement' || node.type === 'ForStatement' ||
      node.type === 'ForInStatement' || node.type === 'ForOfStatement' ||
      node.type === 'CatchClause';
  }

  function enclosingScope(node) {
    let cur = parentOf.get(node);
    while (cur && !isScopeNode(cur)) cur = parentOf.get(cur);
    return cur || ast;
  }

  // Pass 1: record parents and create scopes.
  walk(ast, null, (node, parent) => {
    parentOf.set(node, parent);
    if (isScopeNode(node)) ensureScope(node);
  });

  // Pass 2: record declarations in the correct scope.
  walk(ast, null, (node) => {
    const scope = enclosingScope(node);
    switch (node.type) {
      case 'ImportDeclaration':
        for (const s of node.specifiers) ensureScope(ast).add(s.local.name);
        break;
      case 'VariableDeclarator': {
        // var hoists to the nearest function scope; let/const stay in the block.
        const decl = parentOf.get(node);
        let target = scope;
        if (decl && decl.kind === 'var') {
          let cur = target;
          while (cur && cur !== ast && !FUNCTION_TYPES.has(cur.type)) cur = enclosingScope(cur);
          target = cur || ast;
        }
        for (const n of patternNames(node.id, [])) ensureScope(target).add(n);
        break;
      }
      case 'FunctionDeclaration':
        if (node.id) ensureScope(enclosingScope(node)).add(node.id.name);
        for (const p of node.params) {
          for (const n of patternNames(p, [])) ensureScope(node).add(n);
        }
        break;
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        if (node.id) ensureScope(node).add(node.id.name);
        for (const p of node.params) {
          for (const n of patternNames(p, [])) ensureScope(node).add(n);
        }
        break;
      case 'ClassDeclaration':
        if (node.id) ensureScope(enclosingScope(node)).add(node.id.name);
        break;
      case 'CatchClause':
        for (const n of patternNames(node.param, [])) ensureScope(node).add(n);
        break;
      default: break;
    }
  });

  function resolves(name, fromNode) {
    let cur = isScopeNode(fromNode) ? fromNode : enclosingScope(fromNode);
    while (cur) {
      const s = scopeOf.get(cur);
      if (s && s.has(name)) return true;
      if (cur === ast) return false;
      cur = enclosingScope(cur);
    }
    return false;
  }

  // Pass 3: find identifier references that resolve nowhere.
  const problems = [];
  const seen = new Set();
  walk(ast, null, (node, parent) => {
    if (node.type !== 'Identifier') return;
    if (!parent) return;
    // Skip positions where an Identifier is a name, not a reference.
    if (parent.type === 'MemberExpression' && parent.property === node && !parent.computed) return;
    if (parent.type === 'Property' && parent.key === node && !parent.computed) return;
    if (parent.type === 'MethodDefinition' && parent.key === node && !parent.computed) return;
    if (parent.type === 'ImportSpecifier' || parent.type === 'ImportDefaultSpecifier' ||
        parent.type === 'ImportNamespaceSpecifier') return;
    if (parent.type === 'ExportSpecifier') return;
    if (parent.type === 'LabeledStatement' || parent.type === 'BreakStatement' ||
        parent.type === 'ContinueStatement') return;
    if (FUNCTION_TYPES.has(parent.type) && parent.id === node) return;
    if (parent.type === 'VariableDeclarator' && parent.id === node) return;
    if (parent.type === 'ClassDeclaration' && parent.id === node) return;

    if (globals.has(node.name)) return;
    if (resolves(node.name, node)) return;

    const key = `${node.name}:${node.loc.start.line}`;
    if (seen.has(key)) return;
    seen.add(key);
    problems.push({ name: node.name, line: node.loc.start.line, file: filename });
  });

  return problems;
}

/** Recursively collect .js files under a directory. */
function collectJsFiles(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries.sort()) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectJsFiles(full));
    } else if (entry.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

let failures = 0;
let scanned = 0;

for (const target of TARGETS) {
  console.log(`\n${target.label}`);
  const files = [...collectJsFiles(target.dir), ...(target.extraFiles || [])];

  for (const full of files) {
    const label = relative(ROOT, full);
    scanned++;
    let problems;
    try {
      problems = analyze(
        readFileSync(full, 'utf8'), label, target.sourceType, target.globals
      );
    } catch (err) {
      console.error(`  PARSE ERROR  ${label}: ${err.message}`);
      failures++;
      continue;
    }
    if (problems.length === 0) {
      console.log(`  ok    ${label}`);
    } else {
      failures += problems.length;
      console.error(`  FAIL  ${label}`);
      for (const p of problems) {
        console.error(`        line ${p.line}: '${p.name}' is not declared, imported, or a known global`);
      }
    }
  }
}

if (failures > 0) {
  console.error(`\nScope check failed: ${failures} unresolved reference(s).`);
  console.error('Each one throws a ReferenceError the moment that line is reached at runtime.');
  process.exit(1);
}
console.log(`\nScope check passed for ${scanned} file(s).`);
