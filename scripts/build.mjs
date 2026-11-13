// Construit docs/ (GitHub Pages) : la page web, son script et le favori.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'docs');
fs.mkdirSync(out, { recursive: true });
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = `v${pkg.version} (${new Date().toISOString().slice(0, 10)})`;

const common = {
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['chrome100'],
  charset: 'ascii',
  legalComments: 'none',
  define: { __VERSION__: JSON.stringify(version) },
  write: false,
};

const [page, bm] = await Promise.all([
  build({ ...common, entryPoints: [path.join(root, 'src/page.js')] }),
  build({ ...common, entryPoints: [path.join(root, 'src/bookmarklet.js')] }),
]);

const pageJs = page.outputFiles[0].text;
// esbuild laisse les accents dans les expressions régulières : on les échappe
// pour que l'URL du favori reste en ASCII pur.
let bmJs = bm.outputFiles[0].text.trim()
  .replace(/[^\x00-\x7f]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
// Une URL javascript: est décodée (%XX) avant exécution et les retours à la
// ligne sont supprimés par le navigateur : on échappe ce qui doit l'être.
const bmUrl = 'javascript:' + bmJs
  .replace(/%/g, '%25')
  .replace(/\r/g, '%0D')
  .replace(/\n/g, '%0A')
  .replace(/\t/g, '%09')
  .replace(/#/g, '%23');

fs.writeFileSync(path.join(out, 'app.js'), pageJs);
fs.writeFileSync(path.join(out, 'bookmarklet.js'), bmJs + '\n');
fs.writeFileSync(path.join(out, 'bookmarklet.txt'), bmUrl);
fs.writeFileSync(
  path.join(out, 'index.html'),
  fs.readFileSync(path.join(root, 'web/index.html'), 'utf8').replace(/__VERSION__/g, version),
);
fs.writeFileSync(path.join(out, '.nojekyll'), '');

const kb = (s) => `${(Buffer.byteLength(s) / 1024).toFixed(0)} KB`;
console.log(`Fuseau ${version}`);
console.log(`  docs/app.js          ${kb(pageJs)}`);
console.log(`  docs/bookmarklet.txt ${kb(bmUrl)}`);
