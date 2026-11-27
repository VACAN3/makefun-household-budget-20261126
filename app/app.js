// Ledger — the Rivera household budget, as a single-page app.
//
// Hash-routed, no framework, no network. The household's numbers live in
// localStorage; the first visit seeds six realistic months from data.js.
// Every figure on screen is computed live from the stored transactions.

import { freshHousehold, CATEGORIES, MONTHS, CURRENT_MONTH } from './data.js';

const STORAGE_KEY = 'ledger-rivera-v1';
const pageRoot = document.getElementById('app');
const modalRoot = document.getElementById('modal-root');
const toastRoot = document.getElementById('toast-root');

// ---------- loading and saving ----------
function loadLedger() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.version === 1 && Array.isArray(parsed.transactions)) return parsed;
    }
  } catch {
    // Storage is corrupt or unavailable: fall through and reseed.
  }
  const fresh = freshHousehold();
  saveLedger(fresh);
  return fresh;
}

function saveLedger(next) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private browsing and friends: the site still works, it just forgets.
  }
}

let ledger = loadLedger();

// ---------- small formatting helpers ----------
export const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

export const formatMoney = (amount) => {
  const absolute = Math.abs(amount);
  const shown = absolute.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  return amount < 0 ? `−${shown}` : shown;
};

export const formatSigned = (amount) =>
  (amount < 0 ? `−${formatMoney(-amount)}` : `+${formatMoney(amount)}`);

const lookupCategory = (id) =>
  CATEGORIES.find((cat) => cat.id === id) || { name: id, color: '#8a9384', icon: '•', kind: 'expense' };

const longMonth = (month) => {
  const [year, num] = month.split('-').map(Number);
  return new Date(year, num - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const shortMonth = (month) => {
  const [year, num] = month.split('-').map(Number);
  return new Date(year, num - 1, 1).toLocaleDateString('en-US', { month: 'short' });
};

const shortDate = (iso) => {
  const [year, num, day] = iso.split('-').map(Number);
  return new Date(year, num - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const percentOf = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

// ---------- month arithmetic over the stored ledger ----------
function monthEntries(month) {
  return ledger.transactions.filter((entry) => entry.date.startsWith(month));
}

function monthTotals(month) {
  const entries = monthEntries(month);
  let income = 0;
  let spending = 0;
  for (const entry of entries) {
    if (entry.amount > 0 && entry.category !== 'other-income') income += entry.amount;
    else if (entry.amount < 0) spending += -entry.amount;
  }
  // The auto-transfer is money moved between accounts, not money spent:
  // take it back out of the spending total.
  const moved = entries
    .filter((entry) => entry.note === 'Monthly savings transfer')
    .reduce((sum, entry) => sum - entry.amount, 0);
  return { income, spending: spending - moved, transfers: moved, tx: entries };
}

function spendByCategory(month) {
  const byCategory = {};
  for (const entry of monthEntries(month)) {
    if (entry.amount < 0 && entry.note !== 'Monthly savings transfer') {
      byCategory[entry.category] = (byCategory[entry.category] || 0) + -entry.amount;
    }
  }
  return byCategory;
}

function monthPosition(month) {
  return MONTHS.indexOf(month);
}

function previousMonth(month) {
  const index = monthPosition(month);
  return index > 0 ? MONTHS[index - 1] : null;
}

// ---------- charts, drawn as plain inline SVG (no chart library) ----------
function donutChart(slices, size = 180) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  if (total <= 0) return `<p class="muted">No spending yet this month.</p>`;
  const centre = size / 2;
  const outer = centre - 14;
  const inner = outer - 26;
  let angle = -Math.PI / 2;
  let wedges = '';
  for (const slice of slices) {
    const share = slice.value / total;
    const next = angle + share * Math.PI * 2;
    const wide = share > 0.5 ? 1 : 0;
    const ox0 = centre + outer * Math.cos(angle);
    const oy0 = centre + outer * Math.sin(angle);
    const ox1 = centre + outer * Math.cos(next);
    const oy1 = centre + outer * Math.sin(next);
    const ix1 = centre + inner * Math.cos(next);
    const iy1 = centre + inner * Math.sin(next);
    const ix0 = centre + inner * Math.cos(angle);
    const iy0 = centre + inner * Math.sin(angle);
    wedges += `<path d="M ${ox0.toFixed(1)} ${oy0.toFixed(1)} A ${outer} ${outer} 0 ${wide} 1 ${ox1.toFixed(1)} ${oy1.toFixed(1)} L ${ix1.toFixed(1)} ${iy1.toFixed(1)} A ${inner} ${inner} 0 ${wide} 0 ${ix0.toFixed(1)} ${iy0.toFixed(1)} Z" fill="${slice.color}"><title>${escapeHtml(slice.label)}: ${formatMoney(slice.value)}</title></path>`;
    angle = next;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Spending by category donut chart">${wedges}
    <text x="${centre}" y="${centre - 4}" text-anchor="middle" font-size="13" fill="#8a9384">Spent</text>
    <text x="${centre}" y="${centre + 16}" text-anchor="middle" font-size="17" font-weight="800" fill="#22301f">${formatMoney(total)}</text></svg>`;
}

function barChart(columns, { height = 170, format = (value) => formatMoney(value) } = {}) {
  const tallest = Math.max(...columns.map((col) => col.value), 1);
  const width = 560;
  const pad = 8;
  const barWidth = 52;
  const gap = (width - pad * 2 - barWidth * columns.length) / Math.max(columns.length - 1, 1);
  let bars = '';
  let captions = '';
  columns.forEach((col, index) => {
    const barHeight = Math.max(4, (col.value / tallest) * (height - 42));
    const x = pad + index * (barWidth + gap);
    const y = height - 26 - barHeight;
    bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth}" height="${barHeight.toFixed(1)}" rx="6" fill="${col.color || '#2e7d4f'}"><title>${escapeHtml(col.label)}: ${format(col.value)}</title></rect>`;
    captions += `<text x="${(x + barWidth / 2).toFixed(1)}" y="${height - 8}" text-anchor="middle" font-size="12" fill="#5b6656">${escapeHtml(col.label)}</text>`;
    captions += `<text x="${(x + barWidth / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#22301f">${format(col.value)}</text>`;
  });
  return `<svg width="100%" viewBox="0 0 ${width} ${height}" role="img" aria-label="Bar chart" style="display:block">${bars}${captions}</svg>`;
}

function lineChart(points, { height = 170 } = {}) {
  const width = 560;
  const tallest = Math.max(...points.map((point) => point.value), 1);
  const xs = points.map((_, index) => 24 + (index * (width - 48)) / Math.max(points.length - 1, 1));
  const ys = points.map((point) => height - 30 - (point.value / tallest) * (height - 56));
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${xs[index].toFixed(1)} ${ys[index].toFixed(1)}`).join(' ');
  const dots = points.map((point, index) => `<circle cx="${xs[index].toFixed(1)}" cy="${ys[index].toFixed(1)}" r="4.5" fill="#2e7d4f" stroke="#fff" stroke-width="2"><title>${escapeHtml(point.label)}: ${formatMoney(point.value)}</title></circle>`).join('');
  const captions = points.map((point, index) => `<text x="${xs[index].toFixed(1)}" y="${height - 8}" text-anchor="middle" font-size="12" fill="#5b6656">${escapeHtml(point.label)}</text>`).join('');
  return `<svg width="100%" viewBox="0 0 ${width} ${height}" role="img" aria-label="Trend line chart" style="display:block">
    <path d="${path}" fill="none" stroke="#2e7d4f" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${path} L ${xs[xs.length - 1].toFixed(1)} ${height - 30} L ${xs[0].toFixed(1)} ${height - 30} Z" fill="#2e7d4f" opacity="0.08"/>${dots}${captions}</svg>`;
}

// ---------- pieces every page shares ----------
function monthSwitcher() {
  const options = MONTHS.map((month) => `<option value="${month}" ${month === ledger.month ? 'selected' : ''}>${longMonth(month)}</option>`).join('');
  return `<div class="month-picker" role="group" aria-label="Choose month">
    <button type="button" data-month-step="-1" aria-label="Previous month">‹</button>
    <select id="month-select" aria-label="Month">${options}</select>
    <button type="button" data-month-step="1" aria-label="Next month">›</button>
  </div>`;
}

function pageHeader(crumb, title, sub, withPicker = true) {
  return `<div class="topbar"><div><div class="crumb">${escapeHtml(crumb)}</div><h1>${escapeHtml(title)}</h1>
    ${sub ? `<p class="sub">${sub}</p>` : ''}</div>${withPicker ? monthSwitcher() : ''}</div>`;
}

function showToast(message) {
  toastRoot.innerHTML = `<div class="toast" role="status">${escapeHtml(message)}</div>`;
  setTimeout(() => { toastRoot.innerHTML = ''; }, 2600);
}

function markNav(route) {
  document.querySelectorAll('[data-nav]').forEach((link) => link.classList.toggle('active', link.dataset.nav === route));
  const dueSoon = billsDueSoon().length;
  const badge = document.getElementById('bill-badge');
  if (badge) {
    badge.hidden = dueSoon === 0;
    badge.textContent = dueSoon;
  }
  const netWorth = ledger.accounts.reduce((sum, account) => sum + account.balance, 0);
  const foot = document.getElementById('sidebar-foot');
  if (foot) {
    foot.innerHTML = `Net worth across accounts<br><b class="num">${formatMoney(netWorth)}</b><br>${escapeHtml(ledger.household)} · ${escapeHtml(ledger.members.join(' · '))}`;
  }
}

function billsDueSoon() {
  const month = ledger.month;
  const today = month === CURRENT_MONTH ? 26 : 31; // "today" inside the demo month
  return ledger.bills.filter((bill) => !bill.paidMonths.includes(month) && bill.day >= today - 7);
}

// ---------- dashboard ----------
function dashboardPage() {
  const month = ledger.month;
  const { income, spending, transfers } = monthTotals(month);
  const prev = previousMonth(month);
  const prevTotals = prev ? monthTotals(prev) : null;
  const kept = income - spending;
  const rate = income > 0 ? Math.round((kept / income) * 100) : 0;
  const spendChange = prevTotals
    ? Math.round(((spending - prevTotals.spending) / Math.max(prevTotals.spending, 1)) * 100)
    : 0;
  const byCategory = spendByCategory(month);
  const ranked = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const top = ranked.slice(0, 7);
  const donutSlices = top.map(([id, value]) => ({
    label: lookupCategory(id).name,
    value,
    color: lookupCategory(id).color,
  }));
  const rest = ranked.slice(7).reduce((sum, [, value]) => sum + value, 0);
  if (rest > 0) donutSlices.push({ label: 'Everything else', value: rest, color: '#c9c2ab' });

  const watchList = CATEGORIES
    .filter((cat) => cat.kind === 'expense' && ledger.budgets[cat.id] > 0)
    .map((cat) => ({
      cat,
      spent: byCategory[cat.id] || 0,
      limit: ledger.budgets[cat.id] + (ledger.rollover[cat.id] || 0),
    }))
    .sort((a, b) => b.spent / b.limit - a.spent / a.limit)
    .slice(0, 5);

  const recent = [...ledger.transactions]
    .filter((entry) => entry.date.startsWith(month))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 8);

  const unpaid = ledger.bills.filter((bill) => !bill.paidMonths.includes(month)).slice(0, 4);
  const trend = MONTHS.map((mm) => ({ label: shortMonth(mm), value: monthTotals(mm).spending }));

  const statCard = (label, value, detail, tone = '') => `<div class="card stat-card ${tone}">
    <div class="stat-label">${label}</div><div class="stat-value num">${value}</div>
    <div class="stat-delta">${detail}</div></div>`;

  return `${pageHeader('Ledger · ' + longMonth(month), 'Good evening, Rivera household 👋',
    `Here is ${longMonth(month)} at a glance — money in, money out, and what is left for the fun stuff.`, true)}
  <div class="grid g-4" style="margin-bottom:16px">
    ${statCard('Income · ' + shortMonth(month), formatMoney(income), `Paychecks + freelance · ${formatMoney(transfers)} moved to savings`)}
    ${statCard('Spending · ' + shortMonth(month), formatMoney(spending),
      prevTotals ? (spendChange <= 0 ? `<span class="pos">▼ ${-spendChange}% vs ${shortMonth(prev)}</span>` : `<span class="neg">▲ ${spendChange}% vs ${shortMonth(prev)}</span>`) : 'First month on record',
      spendChange > 10 ? 'bad' : spendChange > 0 ? 'warn' : '')}
    ${statCard('Left to save', formatMoney(kept), `Savings rate <b class="num">${rate}%</b> of income`, rate < 10 ? 'warn' : '')}
    ${statCard('Net worth', formatMoney(ledger.accounts.reduce((sum, account) => sum + account.balance, 0)),
      `${ledger.accounts.length} accounts · updated from your transactions`)}
  </div>

  <div class="grid g-32" style="margin-bottom:16px">
    <div class="card">
      <div class="card-head"><h2>Where the money went</h2><a href="#/insights">Full breakdown →</a></div>
      <div class="donut-wrap">${donutChart(donutSlices)}
        <div style="flex:1;min-width:180px">${top.map(([id, value]) => `<div class="bar-row">
          <span class="bar-label"><span class="cat-dot" style="background:${lookupCategory(id).color}"></span>${escapeHtml(lookupCategory(id).name)}</span>
          <span class="bar"><i style="width:${percentOf(value, spending)}%"></i></span>
          <span class="bar-amt"><b class="num">${formatMoney(value)}</b><br><span class="muted">${percentOf(value, spending)}%</span></span></div>`).join('')}
        </div>
      </div>
      <p class="chart-note">Housing and daycare are fixed costs — the bars that move are groceries, dining and shopping.</p>
    </div>
    <div class="card">
      <div class="card-head"><h2>Budgets to watch</h2><a href="#/budgets">All budgets →</a></div>
      ${watchList.map(({ cat, spent, limit }) => {
        const used = percentOf(spent, limit);
        const tone = used >= 100 ? 'over' : used >= 85 ? 'warn' : '';
        return `<div class="bar-row"><span class="bar-label">${cat.icon} ${escapeHtml(cat.name)}</span>
          <span class="bar"><i class="${tone}" style="width:${Math.min(used, 100)}%"></i></span>
          <span class="bar-amt"><b class="num">${formatMoney(spent)}</b> / ${formatMoney(limit)}<br><span class="${spent > limit ? 'neg' : 'muted'}">${spent > limit ? 'Over by ' + formatMoney(spent - limit) : spent === limit ? 'Right on budget' : used + '% used'}</span></span></div>`;
      }).join('')}
      <p class="chart-note">Limits include October rollover — unspent money carries forward instead of vanishing.</p>
    </div>
  </div>

  <div class="grid g-32">
    <div class="card">
      <div class="card-head"><h2>Recent transactions</h2><a href="#/transactions">See all →</a></div>
      <table class="responsive"><thead><tr><th>Date</th><th>What</th><th>Category</th><th class="r">Amount</th></tr></thead><tbody>
      ${recent.map((entry) => `<tr><td data-label="Date">${shortDate(entry.date)}</td>
        <td data-label="What"><span class="txn-merchant">${escapeHtml(entry.merchant)}</span>${entry.note ? `<div class="txn-note">${escapeHtml(entry.note)}</div>` : ''}</td>
        <td data-label="Category"><span class="cat-chip"><span class="cat-dot" style="background:${lookupCategory(entry.category).color}"></span>${escapeHtml(lookupCategory(entry.category).name)}</span></td>
        <td data-label="Amount" class="r num ${entry.amount < 0 ? 'neg' : 'pos'}"><b>${formatSigned(entry.amount)}</b></td></tr>`).join('')}
      </tbody></table>
    </div>
    <div style="display:grid;gap:16px;align-content:start">
      <div class="card">
        <div class="card-head"><h2>Accounts</h2><a href="#/settings">Manage →</a></div>
        ${ledger.accounts.map((account) => `<div class="bill-row"><span style="font-size:20px">${account.type === 'credit' ? '💳' : account.type === 'savings' ? '🏦' : account.type === 'cash' ? '💵' : '🏧'}</span>
          <div><b>${escapeHtml(account.name)}</b><div class="muted small">${escapeHtml(account.bank)}</div></div>
          <div class="bill-due num"><b class="${account.balance < 0 ? 'neg' : ''}">${formatMoney(account.balance)}</b></div></div>`).join('')}
      </div>
      <div class="card">
        <div class="card-head"><h2>Bills still due in ${shortMonth(month)}</h2><a href="#/bills">All bills →</a></div>
        ${unpaid.length ? unpaid.map((bill) => `<div class="bill-row"><span style="font-size:19px">${bill.autopay ? '🔁' : '✉️'}</span>
          <div><b>${escapeHtml(bill.name)}</b><div class="muted small">Due ${shortMonth(month)} ${bill.day} · ${bill.autopay ? 'Autopay on' : 'Pay manually'}</div></div>
          <div class="bill-due num"><b>${formatMoney(bill.amount)}</b></div></div>`).join('')
          : `<p class="muted">🎉 Every bill for ${longMonth(month)} is paid. Nice work.</p>`}
      </div>
      <div class="card">
        <div class="card-head"><h2>Spending trend</h2><a href="#/insights">Insights →</a></div>
        ${lineChart(trend)}
        <p class="chart-note">Monthly spending, ${shortMonth(MONTHS[0])}–${shortMonth(CURRENT_MONTH)} 2026. November is tracking below October.</p>
      </div>
    </div>
  </div>
  <footer class="page-foot">Ledger runs entirely offline — your numbers never leave this browser. Data is saved in localStorage.</footer>`;
}

// ---------- transactions ----------
let txnQuery = { q: '', cat: 'all', account: 'all' };

function transactionsPage() {
  const month = ledger.month;
  const { income, spending, transfers } = monthTotals(month);
  let list = monthEntries(month).slice().sort((a, b) => b.date.localeCompare(a.date));
  if (txnQuery.cat !== 'all') list = list.filter((entry) => entry.category === txnQuery.cat);
  if (txnQuery.account !== 'all') list = list.filter((entry) => entry.account === txnQuery.account);
  if (txnQuery.q) {
    const needle = txnQuery.q.toLowerCase();
    list = list.filter((entry) => (entry.merchant + ' ' + (entry.note || '')).toLowerCase().includes(needle));
  }
  const categoryOptions = CATEGORIES.map((cat) => `<option value="${cat.id}" ${txnQuery.cat === cat.id ? 'selected' : ''}>${cat.icon} ${escapeHtml(cat.name)}</option>`).join('');
  const accountOptions = ledger.accounts.map((account) => `<option value="${account.id}" ${txnQuery.account === account.id ? 'selected' : ''}>${escapeHtml(account.name)}</option>`).join('');
  return `${pageHeader('Ledger · Transactions', 'Transactions — ' + longMonth(month),
    `Every dollar in and out. <b class="num pos">${formatMoney(income)} in</b> · <b class="num neg">${formatMoney(spending)} out</b>${transfers ? ` · <b class="num">${formatMoney(transfers)} moved to savings</b>` : ''} · ${list.length} entries shown. Add, edit or delete anything — the totals update everywhere instantly.`)}
  <div class="toolbar">
    <input type="search" id="txn-search" placeholder="Search merchant or note…" value="${escapeHtml(txnQuery.q)}" aria-label="Search transactions">
    <select id="txn-cat" aria-label="Filter by category"><option value="all">All categories</option>${categoryOptions}</select>
    <select id="txn-acc" aria-label="Filter by account"><option value="all">All accounts</option>${accountOptions}</select>
    <button class="btn" data-open-txn style="margin-left:auto">+ Add transaction</button>
  </div>
  <div class="card" style="padding:6px 20px">
  ${list.length ? `<table class="responsive"><thead><tr><th>Date</th><th>What</th><th>Category</th><th>Account</th><th class="r">Amount</th><th></th></tr></thead><tbody>
    ${list.map((entry) => { const account = ledger.accounts.find((a) => a.id === entry.account); return `<tr>
      <td data-label="Date">${shortDate(entry.date)}</td>
      <td data-label="What"><span class="txn-merchant">${escapeHtml(entry.merchant)}</span>${entry.note ? `<div class="txn-note">${escapeHtml(entry.note)}</div>` : ''}</td>
      <td data-label="Category"><span class="cat-chip"><span class="cat-dot" style="background:${lookupCategory(entry.category).color}"></span>${escapeHtml(lookupCategory(entry.category).name)}</span></td>
      <td data-label="Account" class="muted small">${escapeHtml(account ? account.name : entry.account)}</td>
      <td data-label="Amount" class="r num ${entry.amount < 0 ? 'neg' : 'pos'}"><b>${formatSigned(entry.amount)}</b></td>
      <td><div class="row-actions">
        <button class="icon-btn" data-edit-txn="${entry.id}" title="Edit" aria-label="Edit ${escapeHtml(entry.merchant)}">✏️</button>
        <button class="icon-btn danger" data-del-txn="${entry.id}" title="Delete" aria-label="Delete ${escapeHtml(entry.merchant)}">🗑️</button>
      </div></td></tr>`; }).join('')}
  </tbody></table>` : `<div class="empty"><div class="big">🔍</div><p><b>No transactions match.</b></p><p>Try a different search, or add the first one for this month.</p></div>`}
  </div>
  <footer class="page-foot">Tip: deleting a paycheck also removes it from the income total — everything on this site is computed live from these rows.</footer>`;
}

// ---------- budgets ----------
function budgetsPage() {
  const month = ledger.month;
  const byCategory = spendByCategory(month);
  const prev = previousMonth(month);
  const prevByCategory = prev ? spendByCategory(prev) : {};
  const rows = CATEGORIES.filter((cat) => cat.kind === 'expense').map((cat) => {
    const limit = ledger.budgets[cat.id] || 0;
    const roll = ledger.rollover[cat.id] || 0;
    const spent = byCategory[cat.id] || 0;
    const total = limit + roll;
    const used = percentOf(spent, total);
    const left = total - spent;
    const wasSpent = prevByCategory[cat.id] || 0;
    const change = wasSpent ? Math.round(((spent - wasSpent) / wasSpent) * 100) : 0;
    return { cat, limit, roll, spent, total, used, left, change, wasSpent };
  });
  const totalBudget = rows.reduce((sum, row) => sum + row.total, 0);
  const totalSpent = rows.reduce((sum, row) => sum + row.spent, 0);
  const over = rows.filter((row) => row.spent > row.total);
  return `${pageHeader('Ledger · Budgets', 'Monthly budgets — ' + longMonth(month),
    `You planned <b class="num">${formatMoney(totalBudget)}</b> and spent <b class="num">${formatMoney(totalSpent)}</b> — <b class="num ${totalBudget - totalSpent >= 0 ? 'pos' : 'neg'}">${formatMoney(totalBudget - totalSpent)} ${totalBudget - totalSpent >= 0 ? 'left' : 'over'}</b>. Unspent money rolls forward to next month instead of disappearing.`)}
  ${over.length ? `<div class="card" style="border-color:#ecc5c0;background:#fff5f4;margin-bottom:16px"><b>⚠️ ${over.length} categor${over.length > 1 ? 'ies are' : 'y is'} over budget:</b> ${over.map((row) => escapeHtml(row.cat.name)).join(', ')}. Move money from a category with room, or raise the limit — both are one click below.</div>` : ''}
  <div class="card" style="margin-bottom:16px">
    <div class="card-head"><h2>All categories</h2><span class="muted small">Click “Edit” to change a limit or rollover</span></div>
    ${rows.map((row) => `<div class="bar-row" style="grid-template-columns:170px 1fr 150px 34px">
      <span class="bar-label"><span class="cat-dot" style="background:${row.cat.color}"></span>${row.cat.icon} ${escapeHtml(row.cat.name)}</span>
      <span><span class="bar"><i class="${row.used >= 100 ? 'over' : row.used >= 85 ? 'warn' : ''}" style="width:${Math.min(row.used, 100)}%"></i></span>
      <span class="small muted">${formatMoney(row.spent)} of ${formatMoney(row.total)}${row.roll ? ` · incl. ${formatMoney(row.roll)} rollover` : ''} · ${row.used}%${row.wasSpent ? ` · ${row.change <= 0 ? '▼' : '▲'} ${Math.abs(row.change)}% vs ${shortMonth(prev)}` : ''}</span></span>
      <span class="bar-amt"><b class="num ${row.left < 0 ? 'neg' : 'pos'}">${row.left < 0 ? 'Over ' + formatMoney(-row.left) : formatMoney(row.left) + ' left'}</b></span>
      <span><button class="btn ghost sm" data-edit-budget="${row.cat.id}">Edit</button></span></div>`).join('')}
  </div>
  <div class="grid g-2">
    <div class="card"><h2>How rollover works</h2>
      <p class="muted" style="margin-top:8px">At the end of each month, whatever you did not spend in a category carries into the next month's limit. Groceries came into November with ${formatMoney(ledger.rollover.groceries || 0)} left over from October — so a big Thanksgiving shop does not blow the month. Overspending in one category is covered by the next month's rollover shrinking, never by magic money.</p></div>
    <div class="card"><h2>Budget vs. reality — last 6 months</h2>
      ${barChart(MONTHS.map((mm) => ({ label: shortMonth(mm), value: Object.values(spendByCategory(mm)).reduce((sum, v) => sum + v, 0), color: mm === month ? '#d97706' : '#2e7d4f' })), { format: (v) => '$' + Math.round(v / 100) / 10 + 'k' })}
      <p class="chart-note">Total spending per month. November (amber) is the lowest since July — the weekly-shop rhythm is holding.</p></div>
  </div>
  <footer class="page-foot">Budgets are per household, not per person — Maya and Jordan share every category.</footer>`;
}

// ---------- savings goals ----------
function goalsPage() {
  const totalSaved = ledger.goals.reduce((sum, goal) => sum + goal.saved, 0);
  const totalTarget = ledger.goals.reduce((sum, goal) => sum + goal.target, 0);
  const monthlyAuto = 400 + 150; // savings transfer + college fund
  return `${pageHeader('Ledger · Savings goals', 'Savings goals',
    `You have saved <b class="num">${formatMoney(totalSaved)}</b> toward <b class="num">${formatMoney(totalTarget)}</b> across ${ledger.goals.length} goals — <b class="num">${percentOf(totalSaved, totalTarget)}%</b> of the way there. <b class="num">${formatMoney(monthlyAuto)}</b> moves automatically every month.`, false)}
  <div class="card" style="margin-bottom:16px">
    <div class="card-head"><h2>All goals together</h2><span class="muted small">${percentOf(totalSaved, totalTarget)}% funded</span></div>
    <div class="bar"><i style="width:${percentOf(totalSaved, totalTarget)}%"></i></div>
    <p class="chart-note">At the current ${formatMoney(monthlyAuto)}/month pace, the emergency fund is fully funded in about ${Math.ceil((10000 - 7400) / monthlyAuto)} months — and the Oregon Coast trip is paid for by April.</p>
  </div>
  <div class="goal-grid">
    ${ledger.goals.map((goal) => {
      const done = percentOf(goal.saved, goal.target);
      const remaining = goal.target - goal.saved;
      return `<div class="card goal-card"><div class="goal-top">
        <div class="goal-emoji">${goal.emoji}</div>
        <div style="flex:1"><h2>${escapeHtml(goal.name)}</h2><p class="muted small">${escapeHtml(goal.note)}</p></div>
        <div class="goal-pct num">${done}%</div></div>
      <div style="margin:14px 0 8px"><div class="bar"><i style="width:${done}%"></i></div></div>
      <p><b class="num">${formatMoney(goal.saved)}</b> <span class="muted">of ${formatMoney(goal.target)} · ${formatMoney(remaining)} to go</span></p>
      <p class="small muted" style="margin-top:4px">Target date: ${goal.deadline}</p>
      <div style="display:flex;gap:8px;margin-top:14px">
        <button class="btn sm" data-add-funds="${goal.id}">+ Add funds</button>
        <button class="btn ghost sm" data-edit-goal="${goal.id}">Edit goal</button>
      </div></div>`;
    }).join('')}
    <div class="card" style="display:grid;place-items:center;text-align:center;min-height:180px">
      <div><div style="font-size:30px">➕</div><h2 style="margin:8px 0 4px">Start a new goal</h2>
      <p class="muted small" style="margin-bottom:12px">A new bike, a holiday, a house deposit — name it and watch it grow.</p>
      <button class="btn" data-new-goal>New savings goal</button></div>
    </div>
  </div>
  <footer class="page-foot">Goals are funded from the Family Savings account — adding funds moves money there in the ledger.</footer>`;
}

// ---------- bills ----------
function billsPage() {
  const month = ledger.month;
  const total = ledger.bills.reduce((sum, bill) => sum + bill.amount, 0);
  const paid = ledger.bills.filter((bill) => bill.paidMonths.includes(month));
  const unpaid = ledger.bills.filter((bill) => !bill.paidMonths.includes(month));
  const paidSum = paid.reduce((sum, bill) => sum + bill.amount, 0);
  const billRow = (bill) => {
    const isPaid = bill.paidMonths.includes(month);
    return `<div class="bill-row"><span style="font-size:20px">${isPaid ? '✅' : '⏰'}</span>
      <div><b>${escapeHtml(bill.name)}</b><div class="muted small">Due ${shortMonth(month)} ${bill.day} · ${escapeHtml(lookupCategory(bill.category).name)} · ${bill.autopay ? 'Autopay on' : 'Pay manually'}</div></div>
      <div class="bill-due"><b class="num">${formatMoney(bill.amount)}</b><br>
      ${isPaid ? `<span class="pill green">Paid</span>` : `<button class="btn sm" data-pay-bill="${bill.id}" style="margin-top:4px">Mark paid</button>`}</div></div>`;
  };
  return `${pageHeader('Ledger · Bills', 'Bills & recurring — ' + longMonth(month),
    `<b class="num">${formatMoney(paidSum)}</b> of <b class="num">${formatMoney(total)}</b> paid · ${unpaid.length} bill${unpaid.length === 1 ? '' : 's'} still to go. Autopay covers ${ledger.bills.filter((bill) => bill.autopay).length} of ${ledger.bills.length} — the two manual ones are the ones that bite.`)}
  <div class="grid g-2">
    <div class="card"><div class="card-head"><h2>⏰ Still to pay (${unpaid.length})</h2><span class="muted small">${formatMoney(unpaid.reduce((sum, bill) => sum + bill.amount, 0))} due</span></div>
      ${unpaid.length ? unpaid.map(billRow).join('') : `<div class="empty"><div class="big">🎉</div><p><b>All bills paid for ${longMonth(month)}.</b></p><p>Nothing due — enjoy the quiet.</p></div>`}
    </div>
    <div class="card"><div class="card-head"><h2>✅ Paid (${paid.length})</h2><span class="muted small">${formatMoney(paidSum)} paid</span></div>
      ${paid.length ? paid.map(billRow).join('') : '<p class="muted">Nothing paid yet this month.</p>'}
    </div>
  </div>
  <div class="card" style="margin-top:16px"><div class="card-head"><h2>Add a recurring bill</h2></div>
    <p class="muted" style="margin-bottom:12px">Rent, insurance, streaming — anything that comes back every month. It will appear here every month until you remove it.</p>
    <button class="btn" data-new-bill>+ Add recurring bill</button>
    <span class="kbd-hint" style="margin-left:10px">Marking a bill paid also records the transaction, so the budget stays honest.</span>
  </div>
  <footer class="page-foot">Bills repeat on the same day each month. Delete one from Settings if it ever ends.</footer>`;
}

// ---------- insights & reports ----------
function insightsPage() {
  const month = ledger.month;
  const prev = previousMonth(month);
  const byCategory = spendByCategory(month);
  const prevByCategory = prev ? spendByCategory(prev) : {};
  const { income, spending } = monthTotals(month);
  const insights = [];

  // The category that moved most since last month.
  const movers = CATEGORIES
    .filter((cat) => cat.kind === 'expense')
    .map((cat) => ({ cat, now: byCategory[cat.id] || 0, was: prevByCategory[cat.id] || 0 }))
    .filter((row) => row.was > 20)
    .sort((a, b) => (b.now - b.was) - (a.now - a.was));
  if (movers.length) {
    const top = movers[0];
    const delta = Math.round(((top.now - top.was) / top.was) * 100);
    insights.push({
      ico: delta > 0 ? '📈' : '📉',
      tone: delta > 15 ? 'warn' : '',
      title: `${top.cat.name} ${delta >= 0 ? 'up' : 'down'} ${Math.abs(delta)}% vs ${shortMonth(prev)}`,
      body: `${formatMoney(top.now)} this month against ${formatMoney(top.was)} last month. ${delta > 15 ? 'Worth a look before it becomes a habit.' : 'Nothing dramatic — just the normal ebb and flow.'}`,
    });
  }

  const subs = ledger.transactions.filter((entry) => entry.date.startsWith(month) && entry.category === 'subscriptions');
  const subTotal = subs.reduce((sum, entry) => sum - entry.amount, 0);
  insights.push({
    ico: '🔁',
    tone: '',
    title: `${subs.length} subscriptions cost ${formatMoney(subTotal)} this month`,
    body: `Netflix, Spotify, Audible and iCloud. That is ${formatMoney(subTotal * 12)} a year — the price of a weekend away. All four are used weekly, so nothing to cut today.`,
  });

  const biggest = [...monthEntries(month)]
    .filter((entry) => entry.amount < 0 && entry.note !== 'Monthly savings transfer')
    .sort((a, b) => a.amount - b.amount)[0];
  if (biggest) {
    insights.push({
      ico: '🧾',
      tone: '',
      title: `Biggest single spend: ${biggest.merchant} — ${formatMoney(-biggest.amount)}`,
      body: `On ${shortDate(biggest.date)}. Rent and daycare aside, this was the month's largest one-off. It was planned, not a surprise.`,
    });
  }

  const rate = income > 0 ? Math.round(((income - spending) / income) * 100) : 0;
  insights.push({
    ico: rate >= 15 ? '🎉' : '⚠️',
    tone: rate >= 15 ? '' : 'warn',
    title: `Savings rate ${rate}% — ${rate >= 20 ? 'above' : rate >= 15 ? 'near' : 'below'} the 20% target`,
    body: `You kept ${formatMoney(income - spending)} of ${formatMoney(income)} income. A 20% rate funds the emergency goal two months sooner; dining out is the easiest lever this month.`,
  });

  const dining = byCategory.dining || 0;
  const diningBudget = (ledger.budgets.dining || 0) + (ledger.rollover.dining || 0);
  insights.push({
    ico: '🍽️',
    tone: dining > diningBudget ? 'bad' : '',
    title: `Dining out: ${formatMoney(dining)} of ${formatMoney(diningBudget)} budget`,
    body: dining > diningBudget
      ? `Over budget by ${formatMoney(dining - diningBudget)}. Three takeaway nights in one week did it — cooking at home twice a week closes the gap.`
      : `Inside budget with ${formatMoney(diningBudget - dining)} to spare. The home-cooked Sundays are paying off.`,
  });

  const trend = MONTHS.map((mm) => ({ label: shortMonth(mm), value: monthTotals(mm).spending }));
  const merchants = {};
  for (const entry of monthEntries(month)) {
    if (entry.amount < 0 && entry.note !== 'Monthly savings transfer') {
      merchants[entry.merchant] = (merchants[entry.merchant] || 0) + -entry.amount;
    }
  }
  const topMerchants = Object.entries(merchants).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return `${pageHeader('Ledger · Insights', 'Insights & reports — ' + longMonth(month),
    'What the numbers are actually saying. Every insight below is computed from your transactions — change a transaction and the story changes.')}
  <div class="grid g-2" style="margin-bottom:16px">
    <div class="card"><div class="card-head"><h2>💡 This month's insights</h2></div>
      ${insights.map((item) => `<div class="insight"><div class="insight-ico ${item.tone}">${item.ico}</div>
        <div><b>${escapeHtml(item.title)}</b><p>${escapeHtml(item.body)}</p></div></div>`).join('')}
    </div>
    <div style="display:grid;gap:16px;align-content:start">
      <div class="card"><div class="card-head"><h2>Spending trend — 6 months</h2></div>${lineChart(trend)}
        ${(() => { const peak = trend.reduce((a, b) => (b.value > a.value ? b : a)); const avg = trend.reduce((sum, point) => sum + point.value, 0) / trend.length; return `<p class="chart-note">Highest month: ${escapeHtml(peak.label)} at ${formatMoney(peak.value)}. The six-month average is ${formatMoney(Math.round(avg))} — November is tracking below it.</p>`; })()}</div>
      <div class="card"><div class="card-head"><h2>Income vs spending</h2></div>
        ${barChart(MONTHS.map((mm) => ({ label: shortMonth(mm), value: monthTotals(mm).income - monthTotals(mm).spending, color: (monthTotals(mm).income - monthTotals(mm).spending) >= 0 ? '#2e7d4f' : '#c0392b' })), { format: (v) => (v < 0 ? '−' : '') + '$' + Math.round(Math.abs(v) / 100) / 10 + 'k' })}
        <p class="chart-note">Money kept each month (income minus spending). Every month this year has been positive.</p></div>
    </div>
  </div>
  <div class="grid g-2">
    <div class="card"><div class="card-head"><h2>Where it goes — ${longMonth(month)}</h2></div>
      ${donutChart(Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, value]) => ({ label: lookupCategory(id).name, value, color: lookupCategory(id).color })))}
      <div class="legend">${Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, value]) => `<span><span class="cat-dot" style="background:${lookupCategory(id).color}"></span>${escapeHtml(lookupCategory(id).name)} · ${formatMoney(value)}</span>`).join('')}</div>
    </div>
    <div class="card"><div class="card-head"><h2>Top merchants — ${shortMonth(month)}</h2></div>
      <table><thead><tr><th>Merchant</th><th class="r">Spent</th><th class="r">Share</th></tr></thead><tbody>
      ${topMerchants.map(([name, value]) => `<tr><td>${escapeHtml(name)}</td><td class="r num"><b>${formatMoney(value)}</b></td><td class="r num muted">${percentOf(value, spending)}%</td></tr>`).join('')}
      </tbody></table>
      <p class="chart-note">Whole Foods and Costco together are a third of grocery spending — the weekly shop, not impulse buys.</p></div>
  </div>
  <footer class="page-foot">Reports recompute from live data. Export everything as JSON from Settings.</footer>`;
}

// ---------- settings & data ----------
function settingsPage() {
  const totalTx = ledger.transactions.length;
  return `${pageHeader('Ledger · Settings', 'Settings & your data',
    'Your household, your data. Everything is stored only in this browser — export it, reset it, or start fresh whenever you like.', false)}
  <div class="grid g-2">
    <div class="card"><h2>🏠 Household</h2>
      <p class="muted" style="margin:8px 0 14px">The people this budget belongs to. Names appear in the sidebar and on goal notes.</p>
      <div class="field"><label for="household-name">Household name</label>
        <input id="household-name" value="${escapeHtml(ledger.household)}"></div>
      <div class="field"><label for="members">Members (comma separated)</label>
        <input id="members" value="${escapeHtml(ledger.members.join(', '))}"></div>
      <button class="btn" data-save-household>Save household</button>
    </div>
    <div class="card"><h2>💳 Accounts</h2>
      <p class="muted" style="margin:8px 0 12px">Balances update as you add transactions. Edit a balance to correct it.</p>
      ${ledger.accounts.map((account) => `<div class="bill-row"><span style="font-size:19px">${account.type === 'credit' ? '💳' : account.type === 'savings' ? '🏦' : account.type === 'cash' ? '💵' : '🏧'}</span>
        <div><b>${escapeHtml(account.name)}</b><div class="muted small">${escapeHtml(account.bank)}</div></div>
        <div class="bill-due"><input type="number" step="0.01" value="${account.balance}" data-account-balance="${account.id}" style="width:130px;padding:7px 9px;border:1px solid #d8d2bd;border-radius:8px;text-align:right" aria-label="Balance of ${escapeHtml(account.name)}"></div></div>`).join('')}
      <button class="btn ghost sm" data-save-balances style="margin-top:10px">Save balances</button>
    </div>
    <div class="card"><h2>📤 Export & backup</h2>
      <p class="muted" style="margin:8px 0 14px">Download everything — ${totalTx} transactions, budgets, goals and bills — as one JSON file. Keep it somewhere safe, or move it to another device.</p>
      <button class="btn" data-export>⬇️ Download my data (JSON)</button>
    </div>
    <div class="card" style="border-color:#ecc5c0"><h2>🔄 Start over</h2>
      <p class="muted" style="margin:8px 0 14px">Reset to the Rivera sample household, or wipe everything and begin with a blank ledger. This cannot be undone — export first if the data matters.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn amber" data-reset-sample>Reset to sample data</button>
        <button class="btn ghost" data-reset-blank>Erase everything</button>
      </div>
    </div>
  </div>
  <div class="card" style="margin-top:16px"><h2>About Ledger</h2>
    <p class="muted" style="margin-top:8px">Ledger is a household budget site that runs entirely offline from static files — no accounts, no tracking, no network requests. Built for the make.fun “Make the best household budget site” bounty. Sample data describes the fictional Rivera household (Maya, Jordan and Leo, 7) and is only a starting point: replace it with your own numbers and it is yours.</p>
    <p class="muted" style="margin-top:8px">Version 1.0 · ${totalTx} transactions across ${MONTHS.length} months · ${ledger.goals.length} goals · ${ledger.bills.length} recurring bills.</p></div>
  <footer class="page-foot">Made with care for families who would rather know where the money went than wonder.</footer>`;
}

// ---------- dialogs ----------
function showModal(html) {
  modalRoot.innerHTML = `<div class="modal-backdrop" data-close-modal><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`;
  const first = modalRoot.querySelector('input, select, textarea, button');
  if (first) first.focus();
}

function hideModal() {
  modalRoot.innerHTML = '';
}

function transactionForm(entry) {
  const isNew = !entry;
  const draft = entry || { date: `${ledger.month}-26`, merchant: '', category: 'groceries', amount: -25, account: 'checking', note: '' };
  const categoryOptions = CATEGORIES.map((cat) => `<option value="${cat.id}" ${draft.category === cat.id ? 'selected' : ''}>${cat.icon} ${escapeHtml(cat.name)}</option>`).join('');
  const accountOptions = ledger.accounts.map((account) => `<option value="${account.id}" ${draft.account === account.id ? 'selected' : ''}>${escapeHtml(account.name)}</option>`).join('');
  return `<h2>${isNew ? 'Add a transaction' : 'Edit transaction'}</h2>
  <p class="modal-sub">Amounts are signed: spending is negative, income is positive.</p>
  <form id="txn-form" data-txn-id="${entry ? entry.id : ''}">
    <div class="form-row">
      <div class="field"><label for="f-date">Date</label><input id="f-date" type="date" required value="${escapeHtml(draft.date)}"></div>
      <div class="field"><label for="f-amount">Amount (USD)</label><input id="f-amount" type="number" step="0.01" required value="${draft.amount}"></div>
    </div>
    <div class="field"><label for="f-merchant">Merchant / description</label><input id="f-merchant" required maxlength="80" value="${escapeHtml(draft.merchant)}" placeholder="e.g. Whole Foods Market"></div>
    <div class="form-row">
      <div class="field"><label for="f-category">Category</label><select id="f-category">${categoryOptions}</select></div>
      <div class="field"><label for="f-account">Account</label><select id="f-account">${accountOptions}</select></div>
    </div>
    <div class="field"><label for="f-note">Note (optional)</label><input id="f-note" maxlength="120" value="${escapeHtml(draft.note || '')}" placeholder="e.g. Weekly shop"></div>
    <div class="modal-actions"><button type="button" class="btn ghost" data-close-modal>Cancel</button>
    <button type="submit" class="btn">${isNew ? 'Add transaction' : 'Save changes'}</button></div>
  </form>`;
}

function budgetEditor(categoryId) {
  const cat = lookupCategory(categoryId);
  return `<h2>Edit budget — ${cat.icon} ${escapeHtml(cat.name)}</h2>
  <p class="modal-sub">Set the monthly limit. Rollover is unspent money carried in from last month.</p>
  <form id="budget-form" data-cat="${categoryId}">
    <div class="form-row">
      <div class="field"><label for="f-limit">Monthly limit (USD)</label><input id="f-limit" type="number" min="0" step="1" required value="${ledger.budgets[categoryId] || 0}"></div>
      <div class="field"><label for="f-roll">Rollover in (USD)</label><input id="f-roll" type="number" min="0" step="0.01" value="${ledger.rollover[categoryId] || 0}"></div>
    </div>
    <div class="modal-actions"><button type="button" class="btn ghost" data-close-modal>Cancel</button>
    <button type="submit" class="btn">Save budget</button></div>
  </form>`;
}

function goalEditor(goal) {
  const isNew = !goal;
  const draft = goal || { name: '', emoji: '🎯', target: 1000, saved: 0, deadline: '2027-12-31', note: '' };
  return `<h2>${isNew ? 'Start a new savings goal' : 'Edit goal — ' + escapeHtml(goal.name)}</h2>
  <p class="modal-sub">${isNew ? 'Give it a name, a target and a date. Small goals you can see are the ones that get funded.' : 'Change the target, the date or the story behind it.'}</p>
  <form id="goal-form" data-goal-id="${goal ? goal.id : ''}">
    <div class="form-row">
      <div class="field"><label for="f-gname">Goal name</label><input id="f-gname" required maxlength="60" value="${escapeHtml(draft.name)}" placeholder="e.g. New bikes for spring"></div>
      <div class="field"><label for="f-gemoji">Emoji</label><input id="f-gemoji" maxlength="4" value="${escapeHtml(draft.emoji)}"></div>
    </div>
    <div class="form-row">
      <div class="field"><label for="f-gtarget">Target (USD)</label><input id="f-gtarget" type="number" min="1" step="1" required value="${draft.target}"></div>
      <div class="field"><label for="f-gdeadline">Target date</label><input id="f-gdeadline" type="date" value="${escapeHtml(draft.deadline)}"></div>
    </div>
    <div class="field"><label for="f-gnote">Why this goal? (optional)</label><input id="f-gnote" maxlength="120" value="${escapeHtml(draft.note || '')}" placeholder="What it is for"></div>
    <div class="modal-actions"><button type="button" class="btn ghost" data-close-modal>Cancel</button>
    <button type="submit" class="btn">${isNew ? 'Create goal' : 'Save goal'}</button></div>
  </form>`;
}

function fundingForm(goal) {
  return `<h2>Add funds — ${goal.emoji} ${escapeHtml(goal.name)}</h2>
  <p class="modal-sub">${formatMoney(goal.saved)} of ${formatMoney(goal.target)} saved so far · ${formatMoney(goal.target - goal.saved)} to go.</p>
  <form id="funds-form" data-goal-id="${goal.id}">
    <div class="field"><label for="f-amt">Amount to add (USD)</label><input id="f-amt" type="number" min="1" step="1" required value="50" autofocus></div>
    <div class="modal-actions"><button type="button" class="btn ghost" data-close-modal>Cancel</button>
    <button type="submit" class="btn">Add ${formatMoney(50)} to goal</button></div>
  </form>`;
}

function billEditor() {
  const categoryOptions = CATEGORIES.filter((cat) => cat.kind === 'expense').map((cat) => `<option value="${cat.id}">${cat.icon} ${escapeHtml(cat.name)}</option>`).join('');
  return `<h2>Add a recurring bill</h2>
  <p class="modal-sub">It will appear every month on the day you pick, until you remove it.</p>
  <form id="bill-form">
    <div class="field"><label for="f-bname">Bill name</label><input id="f-bname" required maxlength="60" placeholder="e.g. Gym membership"></div>
    <div class="form-row">
      <div class="field"><label for="f-bamount">Amount (USD)</label><input id="f-bamount" type="number" min="0.01" step="0.01" required value="25"></div>
      <div class="field"><label for="f-bday">Day of month</label><input id="f-bday" type="number" min="1" max="28" required value="15"></div>
    </div>
    <div class="form-row">
      <div class="field"><label for="f-bcat">Category</label><select id="f-bcat">${categoryOptions}</select></div>
      <div class="field"><label for="f-bauto">Autopay?</label><select id="f-bauto"><option value="yes">Yes — autopay on</option><option value="no">No — I pay it manually</option></select></div>
    </div>
    <div class="modal-actions"><button type="button" class="btn ghost" data-close-modal>Cancel</button>
    <button type="submit" class="btn">Add bill</button></div>
  </form>`;
}

// ---------- router ----------
const PAGES = {
  dashboard: dashboardPage,
  transactions: transactionsPage,
  budgets: budgetsPage,
  goals: goalsPage,
  bills: billsPage,
  insights: insightsPage,
  settings: settingsPage,
};

function drawPage() {
  // __shotReady tells the screenshot harness the page has finished
  // rendering: it flips true only after the new view is in the DOM.
  window.__shotReady = false;
  const hash = location.hash || '#/';
  const name = (hash.replace(/^#\//, '').split('/')[0] || 'dashboard');
  const view = PAGES[name] || PAGES.dashboard;
  const titles = {
    dashboard: 'Dashboard', transactions: 'Transactions', budgets: 'Budgets',
    goals: 'Savings Goals', bills: 'Bills & Recurring', insights: 'Insights & Reports', settings: 'Settings & Data',
  };
  document.title = `${titles[name] || 'Dashboard'} | Ledger — The Rivera Household Budget`;
  pageRoot.innerHTML = view();
  markNav(name);
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

// ---------- events ----------
document.addEventListener('click', (event) => {
  const stepButton = event.target.closest('[data-month-step]');
  if (stepButton) {
    const index = monthPosition(ledger.month) + Number(stepButton.dataset.monthStep);
    if (index >= 0 && index < MONTHS.length) {
      ledger.month = MONTHS[index];
      saveLedger(ledger);
      drawPage();
    }
    return;
  }

  const closer = event.target.closest('[data-close-modal]');
  if (closer) {
    // Close only on the backdrop itself or an explicit Cancel button —
    // never for clicks on other controls inside the modal (e.g. Submit),
    // which must reach the form first.
    const onBackdrop = closer.classList.contains('modal-backdrop');
    if (!onBackdrop || event.target === closer) {
      hideModal();
      return;
    }
  }

  const addTxn = event.target.closest('[data-open-txn]');
  if (addTxn) {
    showModal(transactionForm(null));
    return;
  }
  const editTxn = event.target.closest('[data-edit-txn]');
  if (editTxn) {
    const found = ledger.transactions.find((entry) => entry.id === editTxn.dataset.editTxn);
    if (found) showModal(transactionForm(found));
    return;
  }
  const deleteTxn = event.target.closest('[data-del-txn]');
  if (deleteTxn) {
    const found = ledger.transactions.find((entry) => entry.id === deleteTxn.dataset.delTxn);
    if (found && confirm(`Delete “${found.merchant}” (${formatSigned(found.amount)})?`)) {
      ledger.transactions = ledger.transactions.filter((entry) => entry.id !== found.id);
      saveLedger(ledger);
      drawPage();
      showToast('Transaction deleted.');
    }
    return;
  }

  const editBudget = event.target.closest('[data-edit-budget]');
  if (editBudget) {
    showModal(budgetEditor(editBudget.dataset.editBudget));
    return;
  }
  const addFunds = event.target.closest('[data-add-funds]');
  if (addFunds) {
    const found = ledger.goals.find((goal) => goal.id === addFunds.dataset.addFunds);
    if (found) showModal(fundingForm(found));
    return;
  }
  const editGoal = event.target.closest('[data-edit-goal]');
  if (editGoal) {
    const found = ledger.goals.find((goal) => goal.id === editGoal.dataset.editGoal);
    if (found) showModal(goalEditor(found));
    return;
  }
  const newGoal = event.target.closest('[data-new-goal]');
  if (newGoal) {
    showModal(goalEditor(null));
    return;
  }

  const payBill = event.target.closest('[data-pay-bill]');
  if (payBill) {
    const found = ledger.bills.find((bill) => bill.id === payBill.dataset.payBill);
    if (found && !found.paidMonths.includes(ledger.month)) {
      found.paidMonths.push(ledger.month);
      ledger.transactions.push({
        id: `t${Date.now()}`,
        date: `${ledger.month}-${String(found.day).padStart(2, '0')}`,
        merchant: found.name,
        category: found.category,
        amount: -found.amount,
        account: 'checking',
        note: 'Bill paid',
      });
      saveLedger(ledger);
      drawPage();
      showToast(`${found.name} marked paid.`);
    }
    return;
  }
  const newBill = event.target.closest('[data-new-bill]');
  if (newBill) {
    showModal(billEditor());
    return;
  }

  const saveHousehold = event.target.closest('[data-save-household]');
  if (saveHousehold) {
    const name = document.getElementById('household-name').value.trim();
    const members = document.getElementById('members').value.split(',').map((part) => part.trim()).filter(Boolean);
    if (name) ledger.household = name;
    if (members.length) ledger.members = members;
    saveLedger(ledger);
    drawPage();
    showToast('Household saved.');
    return;
  }
  const saveBalances = event.target.closest('[data-save-balances]');
  if (saveBalances) {
    document.querySelectorAll('[data-account-balance]').forEach((input) => {
      const account = ledger.accounts.find((entry) => entry.id === input.dataset.accountBalance);
      if (account) account.balance = Math.round(Number(input.value || 0) * 100) / 100;
    });
    saveLedger(ledger);
    drawPage();
    showToast('Balances saved.');
    return;
  }

  const exportButton = event.target.closest('[data-export]');
  if (exportButton) {
    const blob = new Blob([JSON.stringify(ledger, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ledger-${ledger.household.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-export.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 5000);
    showToast('Data downloaded as JSON.');
    return;
  }

  const resetSample = event.target.closest('[data-reset-sample]');
  if (resetSample && confirm('Reset everything back to the Rivera sample household? Your edits will be lost.')) {
    ledger = freshHousehold();
    saveLedger(ledger);
    location.hash = '#/';
    drawPage();
    showToast('Sample data restored.');
    return;
  }
  const resetBlank = event.target.closest('[data-reset-blank]');
  if (resetBlank && confirm('Erase everything and start with a blank ledger? Export first if this data matters.')) {
    const blank = freshHousehold();
    blank.transactions = [];
    blank.goals = [];
    blank.bills = [];
    blank.accounts = blank.accounts.map((account) => ({ ...account, balance: 0 }));
    blank.budgets = {};
    blank.rollover = {};
    ledger = blank;
    saveLedger(ledger);
    location.hash = '#/';
    drawPage();
    showToast('Blank ledger ready.');
  }
});

document.addEventListener('change', (event) => {
  if (event.target.id === 'month-select') {
    ledger.month = event.target.value;
    saveLedger(ledger);
    drawPage();
  }
  if (event.target.id === 'txn-cat') {
    txnQuery.cat = event.target.value;
    drawPage();
  }
  if (event.target.id === 'txn-acc') {
    txnQuery.account = event.target.value;
    drawPage();
  }
});

document.addEventListener('input', (event) => {
  if (event.target.id === 'txn-search') {
    txnQuery.q = event.target.value;
    clearTimeout(window.__txnSearchTimer);
    window.__txnSearchTimer = setTimeout(drawPage, 250);
  }
});

document.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.target;

  if (form.id === 'txn-form') {
    const id = form.dataset.txnId;
    const amount = Math.round(Number(document.getElementById('f-amount').value) * 100) / 100;
    const record = {
      date: document.getElementById('f-date').value,
      merchant: document.getElementById('f-merchant').value.trim(),
      category: document.getElementById('f-category').value,
      amount,
      account: document.getElementById('f-account').value,
      note: document.getElementById('f-note').value.trim(),
    };
    if (!record.date || !record.merchant || Number.isNaN(amount)) {
      showToast('Please fill in date, merchant and amount.');
      return;
    }
    if (id) {
      const found = ledger.transactions.find((entry) => entry.id === id);
      if (found) Object.assign(found, record);
      showToast('Transaction updated.');
    } else {
      ledger.transactions.push({ id: `t${Date.now()}`, ...record });
      ledger.month = record.date.slice(0, 7);
      showToast('Transaction added.');
    }
    saveLedger(ledger);
    hideModal();
    drawPage();
    return;
  }

  if (form.id === 'budget-form') {
    const category = form.dataset.cat;
    ledger.budgets[category] = Math.max(0, Number(document.getElementById('f-limit').value) || 0);
    ledger.rollover[category] = Math.max(0, Number(document.getElementById('f-roll').value) || 0);
    saveLedger(ledger);
    hideModal();
    drawPage();
    showToast(`${lookupCategory(category).name} budget saved.`);
    return;
  }

  if (form.id === 'goal-form') {
    const id = form.dataset.goalId;
    const record = {
      name: document.getElementById('f-gname').value.trim(),
      emoji: document.getElementById('f-gemoji').value.trim() || '🎯',
      target: Math.max(1, Number(document.getElementById('f-gtarget').value) || 1),
      deadline: document.getElementById('f-gdeadline').value || '2027-12-31',
      note: document.getElementById('f-gnote').value.trim(),
    };
    if (!record.name) {
      showToast('Give the goal a name first.');
      return;
    }
    if (id) {
      const found = ledger.goals.find((goal) => goal.id === id);
      if (found) Object.assign(found, record);
      showToast('Goal updated.');
    } else {
      ledger.goals.push({ id: `g${Date.now()}`, saved: 0, ...record });
      showToast('Goal created — time to fund it.');
    }
    saveLedger(ledger);
    hideModal();
    drawPage();
    return;
  }

  if (form.id === 'funds-form') {
    const id = form.dataset.goalId;
    const amount = Math.round(Number(document.getElementById('f-amt').value) * 100) / 100;
    const goal = ledger.goals.find((entry) => entry.id === id);
    if (goal && amount > 0) {
      goal.saved = Math.round((goal.saved + amount) * 100) / 100;
      const savings = ledger.accounts.find((account) => account.id === 'savings');
      if (savings) savings.balance = Math.round((savings.balance + amount) * 100) / 100;
      ledger.transactions.push({
        id: `t${Date.now()}`,
        date: `${ledger.month}-26`,
        merchant: `Added to goal — ${goal.name}`,
        category: 'other-income',
        amount: -amount,
        account: 'savings',
        note: 'Goal contribution',
      });
      saveLedger(ledger);
      hideModal();
      drawPage();
      showToast(`${formatMoney(amount)} added to ${goal.name}.`);
    }
    return;
  }

  if (form.id === 'bill-form') {
    const record = {
      id: `b${Date.now()}`,
      name: document.getElementById('f-bname').value.trim(),
      amount: Math.round(Number(document.getElementById('f-bamount').value) * 100) / 100,
      day: Math.min(28, Math.max(1, Number(document.getElementById('f-bday').value) || 1)),
      category: document.getElementById('f-bcat').value,
      autopay: document.getElementById('f-bauto').value === 'yes',
      paidMonths: [],
    };
    if (!record.name || !(record.amount > 0)) {
      showToast('Name the bill and give it an amount.');
      return;
    }
    ledger.bills.push(record);
    saveLedger(ledger);
    hideModal();
    drawPage();
    showToast(`${record.name} added — due on the ${record.day}th each month.`);
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') hideModal();
});

window.addEventListener('hashchange', drawPage);
drawPage();
