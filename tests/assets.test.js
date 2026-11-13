import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../js/config.js';
import { INITIAL_DATA } from '../js/data/initialData.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function walkJsFiles(dir, prefix = 'js') {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      results.push(...walkJsFiles(join(dir, entry.name), rel));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      results.push(`./${rel}`);
    }
  }
  return results.sort();
}

function parseArrayFromSw(source, constName) {
  const match = source.match(new RegExp(`const\\s+${constName}\\s*=\\s*\\[([\\s\\S]*?)\\];`));
  assert.ok(match, `No se encontró ${constName} en sw.js`);
  return Array.from(match[1].matchAll(/'([^']+)'/g), (m) => m[1]);
}

test('sw.js precachea todos los módulos JS e ilustraciones de rutinas sin rutas rotas', () => {
  const swContent = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  const codeAssets = parseArrayFromSw(swContent, 'CODE_ASSETS');
  const imageAssets = parseArrayFromSw(swContent, 'IMAGE_ASSETS');

  const diskJsFiles = walkJsFiles(join(ROOT, 'js'));
  for (const jsFile of diskJsFiles) {
    assert.ok(codeAssets.includes(jsFile), `Falta en CODE_ASSETS de sw.js: ${jsFile}`);
  }

  for (const routine of Object.values(INITIAL_DATA.routines)) {
    for (const exercise of routine.exercises || []) {
      if (!exercise.image) continue;
      const assetPath = exercise.image.startsWith('./') ? exercise.image : `./${exercise.image}`;
      assert.ok(imageAssets.includes(assetPath), `Falta imagen en IMAGE_ASSETS de sw.js: ${assetPath}`);
    }
  }

  for (const asset of [...codeAssets, ...imageAssets]) {
    if (asset === './') continue;
    const diskPath = join(ROOT, asset.replace(/^\.\//, ''));
    assert.ok(existsSync(diskPath), `Asset inexistente en disco: ${asset}`);
  }
});

test('La versión está sincronizada entre package.json, config.js, sw.js e index.html', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const swContent = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  const indexHtml = readFileSync(join(ROOT, 'index.html'), 'utf8');

  const swMatch = swContent.match(/const\s+CACHE_NAME\s*=\s*'kinetix-v([^']+)'/);
  assert.ok(swMatch, 'No se encontró CACHE_NAME en sw.js');

  assert.equal(CONFIG.APP_VERSION, pkg.version);
  assert.equal(swMatch[1], pkg.version);
  assert.match(indexHtml, new RegExp(`v${pkg.version.replace(/\./g, '\\.')}<`));
  assert.match(indexHtml, new RegExp(`js/app\\.js\\?v=${pkg.version.replace(/\./g, '\\.')}`));
});
