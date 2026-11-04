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
