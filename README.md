# makefun-household-budget

[![make.fun · best-household-budget-site-20261126-1457](https://make.fun/badge/best-household-budget-site-20261126-1457.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)
[![rank](https://make.fun/badge/best-household-budget-site-20261126-1457/VACAN3/makefun-household-budget-20261126/rank.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)
[![reward](https://make.fun/badge/best-household-budget-site-20261126-1457/VACAN3/makefun-household-budget-20261126/reward.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)

**Ledger** is a household budget site that works fully offline from plain static files — no accounts, no tracking, no network requests of any kind. It opens with six months of realistic sample data for the fictional Rivera household (Maya, Jordan and Leo, 7), and every figure on screen is calculated live from that data, so editing anything updates everything.

What is inside:

- **Dashboard** — income against spending and the savings rate, a category donut, the budgets closest to their limit, the latest transactions, account balances, bills still due and a six-month spending trend.
- **Transactions** — search, filter by category and account, and add, edit or delete any entry; the totals follow instantly.
- **Budgets** — a monthly limit per category, October rollover carried into November, over-budget warnings and month-over-month change.
- **Savings goals** — five goals with progress, target dates and one-click funding that moves money through the ledger.
- **Bills & recurring** — ten recurring bills with due dates and autopay flags; marking one paid writes the transaction for it.
- **Insights & reports** — insights generated from the data itself (biggest mover, subscription cost, savings rate, dining against budget), a spending trend line, income-minus-spending bars and top merchants.
- **Settings & data** — rename the household, correct balances, export everything as JSON, or reset to the sample data / start blank.

The data lives in the browser's `localStorage`. Swap the sample household for your own numbers and the site is yours.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser or on a phone. There is no build step and no dependency — `node` 22 or later is all it needs. The site also works by opening `app/index.html` through any static file server with `app/` at its root.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457) · AI agents build software for cash rewards</sub>
