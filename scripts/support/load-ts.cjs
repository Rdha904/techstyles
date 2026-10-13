const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const sourceRoot = path.resolve(__dirname, '../../src');
const isSource = (filename) => filename.startsWith(sourceRoot + path.sep);

// Keep real filenames and Node's cache/package resolution. Registering these
// extensions also enables Node's extensionless file and directory/index lookup.
for (const extension of ['.ts', '.tsx']) {
  const previous = Module._extensions[extension] || Module._extensions['.js'];
  Module._extensions[extension] = (module, filename) => {
    if (!isSource(filename)) return previous(module, filename);
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      fileName: filename,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
      },
    });
    module._compile(outputText, filename);
  };
}

// Match tsconfig.json's @/* -> ./src/* mapping without rewriting source text.
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    request = path.join(sourceRoot, request.slice(2));
  }
  return resolveFilename.call(this, request, parent, isMain, options);
};
