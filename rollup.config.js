import jsx from 'acorn-jsx';
import { cwd } from 'process';
import { rollup } from 'rollup';
import { walk } from 'estree-walker';
import del from 'rollup-plugin-delete';
import MagicString from 'magic-string';
import json from '@rollup/plugin-json';
import css from 'rollup-plugin-import-css';
import { babel } from '@rollup/plugin-babel';
import replace from '@rollup/plugin-replace';
import commonjs from '@rollup/plugin-commonjs';
import { renameSync, ensureDirSync } from 'fs-extra';
import { basename, join, extname, resolve, dirname } from 'path';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { createReadStream, createWriteStream, readFileSync } from 'fs';
import Unocss from 'unocss/vite';

const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.mjs', '.d.ts'];
const copies = Object.create(null);
copies['public/eruda.css'] = 'eruda.css';

function copyFile(src, dest) {
  return new Promise((resolve, reject) => {
    const read = createReadStream(src);
    read.on('error', reject);
    const write = createWriteStream(dest);
    write.on('error', reject);
    write.on('finish', resolve);
    read.pipe(write);
  });
}

let nextId = 0;

function getJsxName(node) {
  if (node.type === 'JSXMemberExpression') {
    return `${getJsxName(node.object)}.${getJsxName(node.property)}`;
  }
  return node.name;
}

// Taken from https://github.com/sebastian-software/preppy/blob/master/src/jsxPlugin.js
const preppy = {
  name: 'jsx',

  transform(code) {
    const magicString = new MagicString(code);
    const idsByName = new Map();
    const tree = this.parse(code);
    walk(tree, {
      enter(node) {
        if (node.type === 'JSXOpeningElement' || node.type === 'JSXClosingElement') {
          const name = getJsxName(node.name);
          const tagId = idsByName.get(name) || `PREPPY_JSX_ID_${(nextId += 1)}`;

          // overwrite all JSX tags with artificial tag ids so that we can find them again later
          magicString.overwrite(node.name.start, node.name.end, tagId);
          idsByName.set(name, tagId);
        }
        // do not treat the children as separate identifiers
        else if (node.type === 'JSXMemberExpression') {
          this.skip();
        }
      },
    });

    if (idsByName.size > 0) {
      const usedNamesAndIds = [...idsByName].map(([name, tagId]) => `/*${tagId}*/${name}`);
      magicString.append(`;__PREPPY_JSX_NAMES__(${usedNamesAndIds.join(',')});`);
      return {
        code: magicString.toString(),
        map: magicString.generateMap({
          includeContent: true,
          hires: true,
        }),
      };
    }

    return null;
  },

  renderChunk(code) {
    const replacements = new Map();
    return {
      code: code

        // this finds all injected artificial usages from the transform hook, removes them
        // and collects the new variable names as a side-effect
        .replace(/__PREPPY_JSX_NAMES__\(([^)]*)\);/g, (matchedCall, usedList) => {
          usedList
            .split(',')

            // this extracts the artificial tag id from the comment and the possibly renamed variable
            // name from the variable via two capture groups
            .map((replacementAndVariable) => replacementAndVariable.match(/^\s*?\/\*([^*]*)\*\/\s*?(\S*)$/))
            .filter(Boolean)
            .forEach(([usedEntry, tagId, updatedName]) => replacements.set(tagId, updatedName));

          // clearing out the actual values
          return '';
        })

        // this replaces the artificial tag ids in the actual JSX tags
        .replace(/PREPPY_JSX_ID_\d+/g, (tagId) => replacements.get(tagId)),
      map: null,
    };
  },
};

rollup({
  input: [
    'src/index.ts',
    'src/workers/compiler.ts',
    'src/workers/formatter.ts',
    'src/workers/linter.ts',
    'src/components/repl.tsx',
  ],
  external: ['solid-js', 'solid-js/web', 'solid-js/store', 'monaco-editor'],
  acornInjectPlugins: [jsx()],
  plugins: [
    del({ targets: 'lib/*' }),
    {
      name: 'raw',
      load(id) {
        if (!id.endsWith('?raw')) {
          return;
        }

        return `export default ${JSON.stringify(readFileSync(id.slice(0, -4)).toString())};`;
      },
      resolveId(source, importer) {
        if (source.endsWith('?raw')) {
          if (source.startsWith('./')) {
            return resolve(dirname(importer), source);
          } else if (source.startsWith('/')) {
            return resolve(source.slice(1));
          }
          return source;
        }

        return null;
      },
    },
    nodeResolve({ extensions, exportConditions: ['solid'], preferBuiltins: false }),
    json(),
    css(),
    commonjs(),
    {
      name: 'url',
      load(id) {
        if (!id.endsWith('?url')) {
          return null;
        }

        let url = id.slice(0, -4);

        const ext = extname(url);
        const name = basename(url, ext);

        copies[url] = `./${name}${ext}`;

        return `import ${name}urlImport from "${copies[url]}?url";
export default ${name}urlImport`;
      },
      async generateBundle(outputOptions) {
        const base = outputOptions.dir;
        ensureDirSync(base);

        await Promise.all(
          Object.keys(copies).map(async (name) => {
            const output = copies[name];
            return copyFile(name, join(base, output));
          }),
        );
      },
    },
    replace({
      'process.env.BABEL_TYPES_8_BREAKING': 'true',
      'process.env.NODE_DEBUG': 'false',
      'preventAssignment': true,
    }),
    Unocss(),
    babel({
      extensions: extensions,
      babelHelpers: 'bundled',
      presets: [
        // We don't use dom-expressions to preserve jsx
        ['@babel/preset-typescript', { jsx: 'preserve' }],
      ],
      plugins: ['@babel/plugin-syntax-jsx'],
    }),
    preppy,
  ],
}).then((builder) => {
  builder.write({ dir: 'lib', chunkFileNames: (info) => (info.isEntry ? '[name].jsx' : '[name].js') }).then(() => {
    const basePath = cwd();

    renameSync(resolve(basePath, 'lib/index.js'), resolve(basePath, 'lib/index.jsx'));
    renameSync(resolve(basePath, 'lib/repl.js'), resolve(basePath, 'lib/repl.jsx'));
  });
});
