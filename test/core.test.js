import test from 'node:test';
import assert from 'node:assert/strict';
import { cents, validDate, transaction, parseCSV, previewCSV, emptyState, validateState, monthly } from '../src/core.js';
const header = 'date,description,type,category,amount\n';
const input = { date: '2026-11-01', description: 'Groceries', type: 'expense', category: 'Food', amount: '12.34' };
test('decimal conversion preserves cents without floating point multiplication errors', () => {
  assert.equal(cents('0.29'), 29); assert.equal(cents(' 100.1 '), 10010); assert.equal(cents('999999999.99'), 99999999999);
  for (const value of ['0', '-1', '1.234', '1e3', '1,000', 'Infinity', '', '1000000000', 'NaN']) assert.throws(() => cents(value));
});
test('calendar validation handles leap years, malformed and nonexistent dates', () => {
  for (const date of ['2024-02-29', '2026-11-01', '1900-01-01']) assert.equal(validDate(date), true);
  for (const date of ['2026-02-29', '1900-02-29', '2026-04-31', '2026-13-01', '2026-00-00', '1', null, '1899-12-31']) assert.equal(validDate(date), false);
});
test('transaction validation rejects invalid fields and trims descriptions', () => {
  assert.equal(transaction({ ...input, description: '  Lunch  ' }).description, 'Lunch');
  for (const patch of [{ description: ' ' }, { description: 'x'.repeat(161) }, { date: '2026-02-30' }, { type: 'transfer' }, { category: 'Unknown' }, { amount: '-3' }]) assert.throws(() => transaction({ ...input, ...patch }));
});
test('CSV parser handles BOM, CRLF, escaped quotes, commas, multiline fields and blanks', () => {
  assert.deepEqual(parseCSV('\uFEFFa,b\r\n"hello, ""world""","line1\nline2"\r\n\r\n'), [['a', 'b'], ['hello, "world"', 'line1\nline2']]);
  assert.deepEqual(parseCSV('a,b\n"",'), [['a', 'b']]);
});
test('CSV rejects malformed quoting and oversized input', () => {
  for (const text of ['a,"unfinished', 'a,"closed"tail', 'un"quoted,b']) assert.throws(() => parseCSV(text));
  assert.throws(() => parseCSV('x'.repeat(2_000_001)));
  assert.throws(() => parseCSV('a\n'.repeat(5002)));
});
test('import allows rearranged headers and preserves quoted descriptions', () => {
  const result = previewCSV('amount,category,type,description,date\n12.34,Food,expense,"Lunch, with friends",2026-11-01');
  assert.equal(result.entries[0].amount, 1234); assert.equal(result.entries[0].description, 'Lunch, with friends'); assert.deepEqual(result.errors, []);
});
test('import detects duplicates within file and against current workspace', () => {
  const row = '2026-11-01,Groceries,expense,Food,12.34\n';
  const result = previewCSV(header + row + row, [transaction(input)]);
  assert.equal(result.entries.length, 0); assert.equal(result.duplicates, 2);
});
test('import reports invalid records without mutating current records', () => {
  const current = [transaction(input)], before = JSON.stringify(current);
  const result = previewCSV(header + '2026-11-01,Rent,expense,Housing,500\n2026-02-30,Bad date,expense,Other,10\n2026-11-01,Bad amount,expense,Other,-5\nwrong,columns', current);
  assert.equal(result.entries.length, 1); assert.equal(result.errors.length, 3); assert.equal(JSON.stringify(current), before);
});
test('import requires all headers exactly once', () => {
  for (const text of ['', 'date,description,type,amount', 'date,date,type,category,amount', header.replace('amount', 'value')]) assert.throws(() => previewCSV(text));
});
test('monthly summaries exclude adjacent months and income from category expenses', () => {
  const state = emptyState(); state.transactions = [transaction(input), transaction({ ...input, amount: '50', type: 'income' }), transaction({ ...input, date: '2026-10-31', amount: '100' })];
  state.budgets['2026-11'] = { Food: 2000 };
  const summary = monthly(state, '2026-11'); assert.equal(summary.income, 5000); assert.equal(summary.expense, 1234); assert.equal(summary.balance, 3766); assert.equal(summary.categories.find(c => c.category === 'Food').limit, 2000);
  assert.equal(monthly(state, '2026-12').expense, 0);
});
test('backup validation accepts a full round trip with exact money', () => {
  const state = { ...emptyState(), transactions: [transaction(input)], budgets: { '2026-11': { Food: 10000 } } };
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(state))), state);
});
test('backup validation rejects corrupt amounts, IDs, currencies and budgets', () => {
  const t = transaction(input);
  for (const state of [null, {}, { ...emptyState(), currency: 'INVALID' }, { ...emptyState(), transactions: [t, t] }, { ...emptyState(), transactions: [{ ...t, amount: 1.5 }] }, { ...emptyState(), budgets: { '2026-13': { Food: 1 } } }, { ...emptyState(), budgets: { '2026-11': { Food: 0 } } }, { ...emptyState(), budgets: { '2026-11': { Unknown: 10 } } }]) assert.throws(() => validateState(state));
});
