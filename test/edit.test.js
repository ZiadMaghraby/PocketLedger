import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, transaction, updateTransaction, monthly } from '../src/core.js';
const input = { date: '2026-11-01', description: 'Lunch', category: 'Food', type: 'expense', amount: '10.00' };
test('editing replaces a transaction without duplicating it or losing its identity', () => {
  const state = { ...emptyState(), transactions: [transaction(input, 'one'), transaction(input, 'two')] };
  const before = JSON.stringify(state);
  const next = updateTransaction(state, 'one', { ...input, description: 'Corrected lunch', amount: '0.29' });
  assert.equal(next.transactions.length, 2);
  assert.equal(next.transactions[0].id, 'one'); assert.equal(next.transactions[0].amount, 29);
  assert.equal(next.transactions[1], state.transactions[1]); assert.equal(JSON.stringify(state), before);
  assert.equal(monthly(next, '2026-11').expense, 1029);
});
test('moving a transaction to another month updates both summaries', () => {
  const state = { ...emptyState(), transactions: [transaction(input, 'one')] };
  const next = updateTransaction(state, 'one', { ...input, date: '2026-12-01', type: 'income', category: 'Other' });
  assert.equal(monthly(next, '2026-11').expense, 0);
  assert.equal(monthly(next, '2026-12').income, 1000);
});
test('invalid edits and missing records do not modify saved state', () => {
  const state = { ...emptyState(), transactions: [transaction(input, 'one')] };
  const before = JSON.stringify(state);
  assert.throws(() => updateTransaction(state, 'missing', input));
  assert.throws(() => updateTransaction(state, 'one', { ...input, amount: '-5' }));
  assert.equal(JSON.stringify(state), before);
});
