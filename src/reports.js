import { CATEGORIES, monthly } from './core.js';

export function filterTransactions(entries, { query = '', type = '', category = '' } = {}) {
  const needle = query.trim().toLowerCase();
  if (type && !['income', 'expense'].includes(type)) throw new Error('Unknown transaction type.');
  if (category && !CATEGORIES.includes(category)) throw new Error('Unknown category.');
  return entries.filter(t => (!type || t.type === type) && (!category || t.category === category) && `${t.description} ${t.category}`.toLowerCase().includes(needle)).sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}

export function exportCSV(entries) {
  const cell = value => {
    let text = String(value);
    if (/^[\t\r\n]|^\s*[=+@\-＝＋－＠]/u.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  return '\uFEFF' + [['date', 'description', 'type', 'category', 'amount'], ...entries.map(t => [t.date, t.description, t.type, t.category, (t.amount / 100).toFixed(2)])].map(row => row.map(cell).join(',')).join('\r\n') + '\r\n';
}

export function annualReport(state, year) {
  if (!Number.isInteger(year) || year < 1900 || year > 9999) throw new Error('Choose a year from 1900 to 9999.');
  const months = Array.from({ length: 12 }, (_, i) => {
    const month = `${year}-${String(i + 1).padStart(2, '0')}`;
    const { income, expense, balance, entries } = monthly(state, month);
    return { month, income, expense, balance, count: entries.length, savingsRate: income ? balance / income * 100 : null };
  });
  const income = months.reduce((sum, m) => sum + m.income, 0);
  const expense = months.reduce((sum, m) => sum + m.expense, 0);
  return { year, months, income, expense, balance: income - expense, savingsRate: income ? (income - expense) / income * 100 : null };
}
