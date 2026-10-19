import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, escapeAttr, safeUrl, toNumber, round1 } from '../js/utils/escape.js';

test('escapeHtml neutraliza etiquetas y comillas', () => {
  assert.equal(
    escapeHtml('<img src=x onerror="alert(1)">'),
    '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'
  );
  assert.equal(escapeHtml("O'Reilly & hijos"), 'O&#39;Reilly &amp; hijos');
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
});

test('escapeAttr es equivalente a escapeHtml', () => {
  assert.equal(escapeAttr('" onmouseover="x'), '&quot; onmouseover=&quot;x');
});

test('safeUrl bloquea javascript: y permite rutas/http', () => {
  assert.equal(safeUrl('javascript:alert(1)'), '');
  assert.equal(safeUrl('https://example.com/a.webp'), 'https://example.com/a.webp');
  assert.equal(safeUrl('./assets/a.webp'), './assets/a.webp');
  assert.equal(safeUrl('assets/a.webp'), 'assets/a.webp');
  assert.equal(safeUrl('data:image/png;base64,abc'), 'data:image/png;base64,abc');
  assert.equal(safeUrl('', 'fallback.webp'), 'fallback.webp');
});

test('toNumber y round1 son tolerantes a valores inválidos', () => {
  assert.equal(toNumber('12.5'), 12.5);
  assert.equal(toNumber('x', 7), 7);
  assert.equal(round1(12.345), 12.3);
});
