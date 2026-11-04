export const CATEGORIES = ['Housing', 'Food', 'Transport', 'Shopping', 'Health', 'Entertainment', 'Education', 'Other'];
export const MAX_CENTS = 99999999999;
export function cents(value) {
  const text = String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) throw new Error('Use a positive amount with at most two decimal places.');
  const [whole, fraction = ''] = text.split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(result) || result < 1 || result > MAX_CENTS) throw new Error('Amount must be between 0.01 and 999,999,999.99.');
  return result;
}
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01' || value > '9999-12-31') return false;
  const date = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function transaction(input, id = crypto.randomUUID()) {
  const description = String(input.description ?? '').trim();
  if (!validDate(input.date)) throw new Error('Choose a valid calendar date (1900 or later).');
  if (!description || description.length > 160) throw new Error('Description must contain 1–160 characters.');
  if (!['income', 'expense'].includes(input.type)) throw new Error('Type must be income or expense.');
  if (!CATEGORIES.includes(input.category)) throw new Error('Choose one of the supported categories.');
  return { id, date: input.date, description, type: input.type, category: input.category, amount: cents(input.amount) };
}
export function updateTransaction(state, id, input) {
  const current = state.transactions.find(t => t.id === id);
  if (!current) throw new Error('This transaction no longer exists. Reload and try again.');
  const updated = { ...current, ...transaction(input, id) };
  return { ...state, transactions: state.transactions.map(t => t.id === id ? updated : t) };
}
export function parseCSV(text) {
  if (text.length > 2_000_000) throw new Error('CSV files must be smaller than 2 MB.');
  text = text.replace(/^\uFEFF/, '');
  const rows = []; let row = [], cell = '', quoted = false, closed = false;
  function field() { row.push(cell); cell = ''; closed = false; }
  function line() { field(); if (row.some(v => v.trim() !== '')) rows.push(row); row = []; }
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') { quoted = false; closed = true; }
      else cell += ch;
    } else if (ch === ',') field();
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; line(); }
    else if (ch === '"' && cell === '' && !closed) quoted = true;
    else { if (closed || ch === '"') throw new Error('Malformed CSV quotation.'); cell += ch; }
  }
  if (quoted) throw new Error('CSV contains an unclosed quotation mark.');
  if (cell || row.length || closed) line();
  if (rows.length > 5001) throw new Error('Import at most 5,000 transactions at a time.');
  return rows;
}
export function fingerprint(t) { return JSON.stringify([t.date, t.description, t.type, t.category, t.amount]); }
export function previewCSV(text, existing = []) {
  const rows = parseCSV(text);
  const required = ['date', 'description', 'type', 'category', 'amount'];
  const headers = rows.shift()?.map(v => v.trim().toLowerCase()) ?? [];
  if (headers.length !== 5 || new Set(headers).size !== 5 || required.some(v => !headers.includes(v))) throw new Error('Expected headers: date,description,type,category,amount (in any order).');
  const seen = new Set(existing.map(fingerprint)), entries = [], errors = []; let duplicates = 0;
  rows.forEach((row, index) => {
    try {
      if (row.length !== headers.length) throw new Error('Expected five columns.');
      const input = Object.fromEntries(headers.map((name, i) => [name, row[i].trim()]));
      const entry = transaction(input);
      const key = fingerprint(entry);
      if (seen.has(key)) duplicates++; else { seen.add(key); entries.push(entry); }
    } catch (error) { errors.push(`Record ${index + 1}: ${error.message}`); }
  });
  return { entries, errors, duplicates };
}
export function monthly(state, month) {
  const entries = state.transactions.filter(t => t.date.startsWith(month + '-'));
  const sum = type => entries.filter(t => t.type === type).reduce((n, t) => n + t.amount, 0);
  const income = sum('income'), expense = sum('expense');
  return { entries, income, expense, balance: income - expense, categories: CATEGORIES.map(category => ({ category, spent: entries.filter(t => t.type === 'expense' && t.category === category).reduce((n, t) => n + t.amount, 0), limit: state.budgets[month]?.[category] ?? 0 })) };
}
export const emptyState = () => ({ version: 1, currency: 'EGP', transactions: [], budgets: {} });
export function validateState(state) {
  if (!state || state.version !== 1 || !['EGP', 'USD', 'EUR', 'GBP'].includes(state.currency) || !Array.isArray(state.transactions) || state.transactions.length > 50000 || !state.budgets || typeof state.budgets !== 'object' || Array.isArray(state.budgets)) throw new Error('Unrecognized backup format.');
  const ids = new Set();
  for (const t of state.transactions) {
    if (!t || typeof t.id !== 'string' || !t.id || ids.has(t.id) || !Number.isSafeInteger(t.amount) || t.amount < 1 || t.amount > MAX_CENTS) throw new Error('Invalid transaction data.');
    transaction({ ...t, amount: (t.amount / 100).toFixed(2) }, t.id); ids.add(t.id);
  }
  for (const [month, limits] of Object.entries(state.budgets)) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !limits || typeof limits !== 'object' || Array.isArray(limits)) throw new Error('Invalid budget data.');
    for (const [category, value] of Object.entries(limits)) if (!CATEGORIES.includes(category) || !Number.isSafeInteger(value) || value < 1 || value > MAX_CENTS) throw new Error('Invalid budget amount.');
  }
  return state;
}
