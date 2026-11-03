# PocketLedger

A personal finance dashboard for understanding monthly spending, planning category budgets, and importing transaction CSVs. Built with plain JavaScript, HTML, CSS, and Node's test runner. No runtime dependencies, external fonts, trackers, bank connections, or account setup.

## Run locally

Install Node.js 22 or later, then run:

```sh
npm start
```

Open http://127.0.0.1:4173. Run `npm test` for the automated checks. No dependency installation is needed. Use a consistent URL and port: browser storage belongs to that origin.

## Features

- Monthly income, expenses, and net totals, calculated in integer minor units.
- Category budgets with remaining and overspent amounts.
- Spending distribution, searchable transaction history, and transaction deletion.
- CSV preview with validation and exact duplicate detection before saving.
- JSON backup export and validated restore.
- System light/dark theme, responsive layout, native accessible dialogs, and visible keyboard focus.
- Optional fictional sample data, available only in an empty workspace.

## CSV format

Download `sample.csv` from the import dialog. Column order can vary; all five headers must appear exactly once.

```csv
date,description,type,category,amount
2026-11-04,"Groceries, weekly shop",expense,Food,1240.50
```

Dates use `YYYY-MM-DD`. Types are `income` or `expense`. Categories are Housing, Food, Transport, Shopping, Health, Entertainment, Education, and Other. Amounts must be positive decimals with at most two decimal places, without thousands separators or currency symbols. Imports are limited to 2 MB and 5,000 records. Any invalid record blocks the import; exact duplicates (same date, description, type, category, and amount) are skipped. Two genuinely identical purchases can be entered manually.

All records use one selected currency: EGP, USD, EUR, or GBP. Changing currency only changes its label; it does not perform conversion. Monthly net means recorded income minus recorded expenses, not a bank balance.

## Data and privacy

Records live in this browser's local storage. Nothing is uploaded by the app. Clearing browser data removes the workspace; private browsing and storage restrictions can prevent persistence. Export backups regularly. Backup files contain your financial records in plain JSON: keep them private and never commit them to Git.

An unreadable workspace is preserved and blocked from further writes until a valid backup is restored. A change from another tab blocks writes until reload. Restore replaces the current workspace after confirmation. The app supports up to 50,000 stored transactions and amounts up to 999,999,999.99 per transaction or budget.

The included server binds to localhost and is a development server, not an authenticated multi-user service. For static hosting, serve only `index.html`, `styles.css`, `src/`, and `sample.csv` over HTTPS. There is no cross-device sync or encryption at rest.

## Project structure

- `src/core.js`: money, dates, CSV parsing, validation, and summaries.
- `src/app.js`: dashboard rendering, dialogs, storage, and backup operations.
- `test/`: automated validation and import tests.
- `scripts/serve.js`: restricted local static server.

## Development

Keep changes focused on a user need, include regression tests for data behavior, and run `npm test` before opening a PR. Never use real financial data in fixtures. Potential follow-ups include transaction editing, explicit CSV column mapping, recurring transactions, and accessible annual reports. Each should be scoped and tested as a complete feature.
