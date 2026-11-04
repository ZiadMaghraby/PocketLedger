import test from 'node:test';
import assert from 'node:assert/strict';
import { transaction, previewCSV, parseCSV } from '../src/core.js';
import { filterTransactions, exportCSV } from '../src/reports.js';
const make = (patch = {}) => transaction({ date: '2026-11-01', description: 'Lunch, "weekly"', type: 'expense', category: 'Food', amount: '0.29', ...patch });
test('filters compose by query, type and category without changing source order', () => {
  const entries = [make(), make({ type: 'income' }), make({ category: 'Other' }), make({ description: 'Breakfast' })];
  const ids = entries.map(t => t.id);
  assert.equal(filterTransactions(entries, { query: ' LUNCH ', type: 'expense', category: 'Food' }).length, 1);
  assert.deepEqual(entries.map(t => t.id), ids);
  assert.throws(() => filterTransactions(entries, { type: 'transfer' }));
});
test('CSV export round-trips quoted, multiline and non-ASCII descriptions with exact cents', () => {
  const entries = [make(), make({ description: 'قهوة\nمع الأصدقاء', amount: '123.45' })];
  const result = previewCSV(exportCSV(entries));
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.entries.map(({ id, ...t }) => t), entries.map(({ id, ...t }) => t));
});
test('spreadsheet formula-like descriptions are exported as text', () => {
  for (const description of ['=1+1', '+1+1', '-1+1', '@SUM(A1)', '＝1+1', '\uFEFF=1+1']) {
    const entry = make({ description });
    assert.equal(parseCSV(exportCSV([entry]))[1][1], "'" + entry.description);
  }
});
test('empty exports contain a valid header and no invented records', () => {
  assert.deepEqual(previewCSV(exportCSV([])), { entries: [], errors: [], duplicates: 0 });
});
