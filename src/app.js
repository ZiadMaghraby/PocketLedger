import { CATEGORIES, cents, transaction, monthly, emptyState, validateState, previewCSV } from './core.js';
const $ = selector => document.querySelector(selector), KEY = 'pocketledger.v1';
const today = new Date();
const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
let state = emptyState(), storageBlocked = false, pending = null;
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function notify(text, error = false) { $('#message').hidden = false; $('#message').textContent = text; $('#message').classList.toggle('error', error); }
try { const saved = localStorage.getItem(KEY); if (saved !== null) state = validateState(JSON.parse(saved)); }
catch { storageBlocked = true; notify('Stored data could not be read. Your original data has not been overwritten. Restore a valid backup to continue.', true); }
function save(next, restoring = false) {
  if (storageBlocked && !restoring) throw new Error('Restore a valid backup before changing this workspace.');
  validateState(next);
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { throw new Error('This browser could not save your changes. Check storage permissions or free space.'); }
  state = next; storageBlocked = false; render();
}
const money = value => new Intl.NumberFormat('en', { style: 'currency', currency: state.currency }).format(value / 100);
$('#month').value = localDate.slice(0, 7);
$('#entry-category').innerHTML = CATEGORIES.map(c => `<option>${c}</option>`).join('');
function render() {
  const summary = monthly(state, $('#month').value);
  $('#currency').value = state.currency;
  $('#net').textContent = money(summary.balance); $('#income').textContent = money(summary.income); $('#expense').textContent = money(summary.expense);
  const planned = summary.categories.filter(c => c.limit || c.spent);
  $('#budget-list').innerHTML = planned.length ? planned.map(c => `<div class="budget-item"><div><strong>${c.category}</strong><span>${money(c.spent)} <small>/ ${c.limit ? money(c.limit) : 'No budget'}</small></span></div><progress max="${c.limit || Math.max(c.spent, 1)}" value="${Math.min(c.spent, c.limit || c.spent)}" aria-label="${c.category} spending" class="${c.limit && c.spent > c.limit ? 'over' : ''}"></progress><small>${c.limit ? (c.spent > c.limit ? `${money(c.spent - c.limit)} over budget` : `${money(c.limit - c.spent)} remaining`) : 'Set a budget to track your progress'}</small></div>`).join('') : '<div class="empty compact"><h3>A plan for every category.</h3><p>Set your first budget to start tracking spending.</p></div>';
  const spending = summary.categories.filter(c => c.spent).sort((a, b) => b.spent - a.spent);
  const colors = ['#276e5c', '#d89754', '#7891a4', '#a789b0', '#bf705d', '#8a9b62', '#c2b47e', '#7a858c'];
  let cursor = 0;
  const stops = spending.map((c, i) => { const start = cursor; cursor += c.spent / summary.expense * 100; return `${colors[i]} ${start}% ${cursor}%`; });
  $('#spending-chart').innerHTML = `<div class="donut" role="img" aria-label="${summary.expense ? 'Expense distribution; values listed below' : 'No expenses this month'}" style="--ring:${stops.length ? `conic-gradient(${stops.join(',')})` : 'var(--line)'}"><div><small>TOTAL SPENT</small><strong>${money(summary.expense)}</strong></div></div>`;
  $('#spending-list').innerHTML = spending.map((c, i) => `<div class="legend"><span><i style="background:${colors[i]}"></i>${c.category}</span><strong>${Math.round(c.spent / summary.expense * 100)}%</strong></div>`).join('') || '<p class="muted center">Your spending breakdown will appear here.</p>';
  const query = $('#search').value.trim().toLowerCase();
  const visible = summary.entries.filter(t => `${t.description} ${t.category}`.toLowerCase().includes(query)).sort((a, b) => b.date.localeCompare(a.date));
  $('#count').textContent = summary.entries.length;
  $('#rows').innerHTML = visible.map(t => `<tr><td>${t.date}</td><td class="description">${escape(t.description)}</td><td><span class="tag">${t.category}</span></td><td class="amount ${t.type}">${t.type === 'income' ? '+' : '−'}${money(t.amount)}</td><td><button class="delete quiet" data-id="${escape(t.id)}" aria-label="Delete ${escape(t.description)}">×</button></td></tr>`).join('');
  if (!visible.length && summary.entries.length) $('#rows').innerHTML = '<tr><td colspan="5" class="center muted">No transactions match your search.</td></tr>';
  $('#empty').hidden = summary.entries.length > 0;
  $('#demo').hidden = state.transactions.length > 0 || Object.keys(state.budgets).length > 0 || storageBlocked;
}
$('#month').onchange = () => { if (!/^\d{4}-(0[1-9]|1[0-2])$/.test($('#month').value)) $('#month').value = localDate.slice(0, 7); render(); };
$('#search').oninput = render;
$('#currency').onchange = () => {
  const currency = $('#currency').value;
  if ((state.transactions.length || Object.keys(state.budgets).length) && !confirm('This changes the currency label only. Amounts are not converted. Continue?')) { render(); return; }
  try { save({ ...state, currency }); notify('Currency updated. Amounts were not converted.'); } catch (e) { render(); notify(e.message, true); }
};
document.querySelectorAll('[data-close]').forEach(button => button.onclick = () => button.closest('dialog').close());
$('#add-open').onclick = () => { $('#entry-form').reset(); $('#entry-form [name=date]').value = localDate; $('#entry-form .form-error').textContent = ''; $('#entry-dialog').showModal(); };
$('#entry-form').onsubmit = event => {
  event.preventDefault();
  try { const entry = transaction(Object.fromEntries(new FormData(event.target))); save({ ...state, transactions: [...state.transactions, entry] }); $('#entry-dialog').close(); notify('Transaction saved.'); }
  catch (error) { $('#entry-form .form-error').textContent = error.message; }
};
$('#rows').onclick = event => {
  const button = event.target.closest('[data-id]'); if (!button || !confirm('Delete this transaction? This cannot be undone.')) return;
  try { save({ ...state, transactions: state.transactions.filter(t => t.id !== button.dataset.id) }); notify('Transaction deleted.'); } catch (error) { notify(error.message, true); }
};
$('#budget-open').onclick = () => {
  const limits = state.budgets[$('#month').value] ?? {};
  $('#budget-fields').innerHTML = CATEGORIES.map(c => `<label>${c}<input name="${c}" inputmode="decimal" placeholder="No budget" value="${limits[c] ? (limits[c] / 100).toFixed(2) : ''}"></label>`).join('');
  $('#budget-form .form-error').textContent = ''; $('#budget-dialog').showModal();
};
$('#budget-form').onsubmit = event => {
  event.preventDefault();
  try { const limits = {}; for (const [key, value] of new FormData(event.target)) if (value.trim()) limits[key] = cents(value); save({ ...state, budgets: { ...state.budgets, [$('#month').value]: limits } }); $('#budget-dialog').close(); notify('Monthly budgets saved.'); }
  catch (error) { $('#budget-form .form-error').textContent = error.message; }
};
$('#import-open').onclick = () => { pending = null; $('#csv').value = ''; $('#preview').textContent = ''; $('#import-confirm').disabled = true; $('#import-dialog').showModal(); };
let importSequence = 0;
$('#csv').onchange = async () => {
  const sequence = ++importSequence; pending = null; $('#import-confirm').disabled = true;
  const file = $('#csv').files[0]; if (!file) return;
  try {
    if (file.size > 2_000_000) throw new Error('CSV files must be smaller than 2 MB.');
    const content = await file.text(); if (sequence !== importSequence) return;
    pending = previewCSV(content, state.transactions);
    $('#preview').innerHTML = `<p><strong>${pending.entries.length} new transactions</strong> · ${pending.duplicates} duplicates skipped · ${pending.errors.length} errors</p>${pending.errors.length ? `<ul class="form-error">${pending.errors.slice(0, 10).map(e => `<li>${escape(e)}</li>`).join('')}</ul>` : `<ul>${pending.entries.slice(0, 5).map(t => `<li>${t.date} · ${escape(t.description)} · ${money(t.amount)}</li>`).join('')}</ul>`}`;
    $('#import-confirm').disabled = !pending.entries.length || pending.errors.length > 0;
  } catch (error) { $('#preview').textContent = error.message; }
};
$('#import-confirm').onclick = () => {
  if (!pending || pending.errors.length || !pending.entries.length) return;
  try { const count = pending.entries.length; save({ ...state, transactions: [...state.transactions, ...pending.entries] }); pending = null; $('#import-dialog').close(); notify(`${count} transactions imported. Select their month to view them.`); }
  catch (error) { $('#preview').textContent = error.message; }
};
$('#backup').onclick = () => {
  if (storageBlocked) { notify('Stored data could not be read. Export is disabled to avoid presenting an empty backup as your data.', true); return; }
  const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `pocketledger-${localDate}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$('#restore').onchange = async () => {
  try {
    const file = $('#restore').files[0]; if (!file) return; if (file.size > 20_000_000) throw new Error('Backup must be smaller than 20 MB.');
    const next = validateState(JSON.parse(await file.text()));
    if (!confirm(`Replace this workspace with ${next.transactions.length} transactions from the backup? Export your current data first if you need it.`)) return;
    save(next, true); notify('Backup restored.');
  } catch (error) { notify(`Restore failed: ${error.message}`, true); } finally { $('#restore').value = ''; }
};
$('#demo').onclick = () => {
  if (state.transactions.length || Object.keys(state.budgets).length) return;
  const month = $('#month').value;
  try {
    const entries = [['01', 'Salary', 'income', 'Other', '28000'], ['02', 'Apartment rent', 'expense', 'Housing', '6500'], ['04', 'Weekly groceries', 'expense', 'Food', '1240.50'], ['06', 'Metro and rides', 'expense', 'Transport', '380'], ['08', 'Coffee with friends', 'expense', 'Entertainment', '260'], ['10', 'Fresh market', 'expense', 'Food', '780'], ['12', 'A new pair of shoes', 'expense', 'Shopping', '1450']].map(([day, description, type, category, amount]) => transaction({ date: `${month}-${day}`, description, type, category, amount }));
    save({ ...state, transactions: entries, budgets: { [month]: { Housing: 700000, Food: 400000, Transport: 150000, Shopping: 200000, Entertainment: 100000 } } }); notify('Sample data loaded. These are fictional records; delete them before tracking your own finances.');
  } catch (error) { notify(error.message, true); }
};
// Avoid overwriting changes from another tab with stale in-memory records.
window.addEventListener('storage', event => { if (event.key === KEY || event.key === null) { storageBlocked = true; notify('This workspace changed in another tab. Reload this page before making changes.', true); } });
render();
