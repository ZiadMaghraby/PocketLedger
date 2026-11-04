import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, transaction } from '../src/core.js';
import { annualReport } from '../src/reports.js';
const entry = (date, amount, type = 'expense') => transaction({ date, amount, type, description: 'Test record', category: 'Other' });
test('annual totals include all twelve months and exclude adjacent years', () => {
  const state = { ...emptyState(), transactions: [entry('2026-01-01', '100', 'income'), entry('2026-12-31', '25'), entry('2025-12-31', '800'), entry('2027-01-01', '900')] };
  const report = annualReport(state, 2026);
  assert.equal(report.months.length, 12); assert.equal(report.income, 10000); assert.equal(report.expense, 2500); assert.equal(report.balance, 7500); assert.equal(report.savingsRate, 75);
  assert.equal(report.months[0].count, 1); assert.equal(report.months[11].count, 1);
});
test('months with no income do not invent a savings rate', () => {
  const report = annualReport({ ...emptyState(), transactions: [entry('2026-02-01', '10')] }, 2026);
  assert.equal(report.savingsRate, null); assert.equal(report.months[1].savingsRate, null); assert.equal(report.balance, -1000);
});
test('overspending reports a negative rate and leap-day spending remains in February', () => {
  const report = annualReport({ ...emptyState(), transactions: [entry('2024-02-01', '100', 'income'), entry('2024-02-29', '125')] }, 2024);
  assert.equal(report.months[1].expense, 12500); assert.equal(report.savingsRate, -25);
});
test('invalid report years are rejected', () => {
  for (const year of [0, 1899, 10000, 2026.5, NaN, '2026']) assert.throws(() => annualReport(emptyState(), year));
});
