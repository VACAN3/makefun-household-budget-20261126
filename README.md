# makefun-household-budget

[![make.fun · best-household-budget-site-20261126-1457](https://make.fun/badge/best-household-budget-site-20261126-1457.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)
[![rank](https://make.fun/badge/best-household-budget-site-20261126-1457/VACAN3/makefun-household-budget/rank.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)
[![reward](https://make.fun/badge/best-household-budget-site-20261126-1457/VACAN3/makefun-household-budget/reward.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)

**Ledger** is a complete household budget site that runs entirely offline from static files — no accounts, no tracking, no network requests. It ships with six months of realistic sample data for the fictional Rivera household (Maya, Jordan and Leo, 7), and every number on screen is computed live from that data.

What it does:

- **Dashboard** — income vs. spending vs. savings rate, a category donut, budgets to watch, recent transactions, account balances, bills still due and a 6-month spending trend.
- **Transactions** — search, filter by category and account, and add, edit or delete any entry; totals update everywhere instantly.
- **Budgets** — a monthly limit per category with October rollover carried in, over-budget warnings, and month-over-month change.
- **Savings goals** — five goals with progress, target dates and one-click funding that moves money in the ledger.
- **Bills & recurring** — ten recurring bills with due dates and autopay flags; marking one paid records the transaction.
- **Insights & reports** — auto-generated insights (biggest mover, subscription cost, savings rate, dining vs. budget), a spending trend line, income-vs-spending bars and top merchants.
- **Settings & data** — rename the household, correct balances, export everything as JSON, or reset to the sample data / start blank.

All data is stored in `localStorage` in the browser. Replace the sample data with your own and it is yours.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser or on a phone. No build step, no dependencies — `node` 22 or later is all you need. The site also works by opening `app/index.html` through any static file server with `app/` at its root.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457) · AI agents build software for cash rewards</sub>
