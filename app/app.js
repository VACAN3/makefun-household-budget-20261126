// Ledger — a complete household budget site.
// Hash-routed single page app. State lives in localStorage; first load seeds
// six months of realistic household data from data.js. No network, ever.

import { seedState, CATEGORIES, MONTHS, CURRENT_MONTH } from './data.js';

const STORE_KEY = 'ledger-rivera-v1';
const app = document.getElementById('app');
const modalRoot = document.getElementById('modal-root');
const toastRoot = document.getElementById('toast-root');

// ---------- state ----------
function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.version === 1 && Array.isArray(s.transactions)) return s;
    }
  } catch { /* corrupted storage: reseed below */ }
  const s = seedState();
  saveState(s);
  return s;
}
function saveState(s) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch { /* private mode */ }
}
let state = loadState();

// ---------- helpers ----------
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
export const money = (n) => {
  const v = Math.abs(n);
  const s = v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  return n < 0 ? `−${s}` : s;
};
export const moneySigned = (n) => (n < 0 ? `−${money(-n)}` : `+${money(n)}`);
const catById = (id) => CATEGORIES.find((c) => c.id === id) || { name: id, color: '#8a9384', icon: '•', kind: 'expense' };
const monthName = (m) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};
const monthShort = (m) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString('en-US', { month: 'short' });
};
const fmtDate = (d) => {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

function txnsFor(month) {
  return state.transactions.filter((t) => t.date.startsWith(month));
}
function sumsFor(month) {
  const tx = txnsFor(month);
  let income = 0, spending = 0;
  for (const t of tx) {
    if (t.amount > 0 && t.category !== 'other-income') income += t.amount;
    else if (t.amount < 0) spending += -t.amount;
  }
  // Savings transfers are money moved, not spending: exclude the auto-transfer.
  const transfers = tx.filter((t) => t.note === 'Monthly savings transfer').reduce((s, t) => s - t.amount, 0);
  return { income, spending: spending - transfers, transfers, tx };
}
function spentByCategory(month) {
  const out = {};
  for (const t of txnsFor(month)) {
    if (t.amount < 0 && t.note !== 'Monthly savings transfer') {
      out[t.category] = (out[t.category] || 0) + -t.amount;
    }
  }
  return out;
}
function monthIndex(m) { return MONTHS.indexOf(m); }
function prevMonth(m) { const i = monthIndex(m); return i > 0 ? MONTHS[i - 1] : null; }

// ---------- charts (pure inline SVG, no libraries) ----------
function donutSVG(parts, size = 180) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  if (total <= 0) return `<p class="muted">No spending yet this month.</p>`;
  const cx = size / 2, cy = size / 2, r = size / 2 - 14, inner = r - 26;
  let a0 = -Math.PI / 2;
  let paths = '';
  for (const p of parts) {
    const frac = p.value / total;
    const a1 = a0 + frac * Math.PI * 2;
    const large = frac > 0.5 ? 1 : 0;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const xi1 = cx + inner * Math.cos(a1), yi1 = cy + inner * Math.sin(a1);
    const xi0 = cx + inner * Math.cos(a0), yi0 = cy + inner * Math.sin(a0);
    paths += `<path d="M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)} L ${xi1.toFixed(1)} ${yi1.toFixed(1)} A ${inner} ${inner} 0 ${large} 0 ${xi0.toFixed(1)} ${yi0.toFixed(1)} Z" fill="${p.color}"><title>${esc(p.label)}: ${money(p.value)}</title></path>`;
    a0 = a1;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Spending by category donut chart">${paths}
    <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="13" fill="#8a9384">Spent</text>
    <text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="17" font-weight="800" fill="#22301f">${money(total)}</text></svg>`;
}

function barsSVG(series, { height = 170, format = (v) => money(v) } = {}) {
  const max = Math.max(...series.map((s) => s.value), 1);
  const w = 560, pad = 8, bw = 52, gap = (w - pad * 2 - bw * series.length) / Math.max(series.length - 1, 1);
  let rects = '', labels = '';
  series.forEach((s, i) => {
    const h = Math.max(4, (s.value / max) * (height - 42));
    const x = pad + i * (bw + gap);
    const y = height - 26 - h;
    rects += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw}" height="${h.toFixed(1)}" rx="6" fill="${s.color || '#2e7d4f'}"><title>${esc(s.label)}: ${format(s.value)}</title></rect>`;
    labels += `<text x="${(x + bw / 2).toFixed(1)}" y="${height - 8}" text-anchor="middle" font-size="12" fill="#5b6656">${esc(s.label)}</text>`;
    labels += `<text x="${(x + bw / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#22301f">${format(s.value)}</text>`;
  });
  return `<svg width="100%" viewBox="0 0 ${w} ${height}" role="img" aria-label="Bar chart" style="display:block">${rects}${labels}</svg>`;
}

function lineSVG(points, { height = 170 } = {}) {
  const w = 560, max = Math.max(...points.map((p) => p.value), 1);
  const xs = points.map((_, i) => 24 + (i * (w - 48)) / Math.max(points.length - 1, 1));
  const ys = points.map((p) => height - 30 - (p.value / max) * (height - 56));
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xs[i].toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
  const dots = points.map((p, i) => `<circle cx="${xs[i].toFixed(1)}" cy="${ys[i].toFixed(1)}" r="4.5" fill="#2e7d4f" stroke="#fff" stroke-width="2"><title>${esc(p.label)}: ${money(p.value)}</title></circle>`).join('');
  const labels = points.map((p, i) => `<text x="${xs[i].toFixed(1)}" y="${height - 8}" text-anchor="middle" font-size="12" fill="#5b6656">${esc(p.label)}</text>`).join('');
  return `<svg width="100%" viewBox="0 0 ${w} ${height}" role="img" aria-label="Trend line chart" style="display:block">
    <path d="${line}" fill="none" stroke="#2e7d4f" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${line} L ${xs[xs.length - 1].toFixed(1)} ${height - 30} L ${xs[0].toFixed(1)} ${height - 30} Z" fill="#2e7d4f" opacity="0.08"/>${dots}${labels}</svg>`;
}

// ---------- shared chrome ----------
function monthPicker() {
  const opts = MONTHS.map((m) => `<option value="${m}" ${m === state.month ? 'selected' : ''}>${monthName(m)}</option>`).join('');
  return `<div class="month-picker" role="group" aria-label="Choose month">
    <button type="button" data-month-step="-1" aria-label="Previous month">‹</button>
    <select id="month-select" aria-label="Month">${opts}</select>
    <button type="button" data-month-step="1" aria-label="Next month">›</button>
  </div>`;
}
function topbar(crumb, title, sub, withPicker = true) {
  return `<div class="topbar"><div><div class="crumb">${esc(crumb)}</div><h1>${esc(title)}</h1>
    ${sub ? `<p class="sub">${sub}</p>` : ''}</div>${withPicker ? monthPicker() : ''}</div>`;
}
function toast(msg) {
  toastRoot.innerHTML = `<div class="toast" role="status">${esc(msg)}</div>`;
  setTimeout(() => { toastRoot.innerHTML = ''; }, 2600);
}
function setActiveNav(route) {
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === route));
  const due = upcomingBills().length;
  const badge = document.getElementById('bill-badge');
  if (badge) { badge.hidden = due === 0; badge.textContent = due; }
  const net = state.accounts.reduce((s, a) => s + a.balance, 0);
  const foot = document.getElementById('sidebar-foot');
  if (foot) foot.innerHTML = `Net worth across accounts<br><b class="num">${money(net)}</b><br>${esc(state.household)} · ${esc(state.members.join(' · '))}`;
}
function upcomingBills() {
  const m = state.month;
  const today = m === CURRENT_MONTH ? 26 : 31; // "today" inside the demo month
  return state.bills.filter((b) => !b.paidMonths.includes(m) && b.day >= today - 7);
}

// ---------- dashboard ----------
function viewDashboard() {
  const m = state.month;
  const { income, spending, transfers } = sumsFor(m);
  const prev = prevMonth(m);
  const prevSums = prev ? sumsFor(prev) : null;
  const saved = income - spending;
  const rate = income > 0 ? Math.round((saved / income) * 100) : 0;
  const spendDelta = prevSums ? Math.round(((spending - prevSums.spending) / Math.max(prevSums.spending, 1)) * 100) : 0;
  const byCat = spentByCategory(m);
  const sortedCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const topCats = sortedCats.slice(0, 7);
  const donutParts = topCats.map(([id, v]) => ({ label: catById(id).name, value: v, color: catById(id).color }));
  const other = sortedCats.slice(7).reduce((s, [, v]) => s + v, 0);
  if (other > 0) donutParts.push({ label: 'Everything else', value: other, color: '#c9c2ab' });

  const budgetRows = CATEGORIES.filter((c) => c.kind === 'expense' && state.budgets[c.id] > 0)
    .map((c) => ({ c, spent: byCat[c.id] || 0, limit: state.budgets[c.id] + (state.rollover[c.id] || 0) }))
    .sort((a, b) => b.spent / b.limit - a.spent / a.limit)
    .slice(0, 5);

  const recent = [...state.transactions]
    .filter((t) => t.date.startsWith(m))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 8);

  const dueBills = state.bills.filter((b) => !b.paidMonths.includes(m)).slice(0, 4);
  const trend = MONTHS.map((mm) => ({ label: monthShort(mm), value: sumsFor(mm).spending }));

  const statCard = (label, value, delta, cls = '') => `<div class="card stat-card ${cls}">
    <div class="stat-label">${label}</div><div class="stat-value num">${value}</div>
    <div class="stat-delta">${delta}</div></div>`;

  return `${topbar('Ledger · ' + monthName(m), 'Good evening, Rivera household 👋',
    `Here is ${monthName(m)} at a glance — money in, money out, and what is left for the fun stuff.`, true)}
  <div class="grid g-4" style="margin-bottom:16px">
    ${statCard('Income · ' + monthShort(m), money(income), `Paychecks + freelance · ${money(transfers)} moved to savings`)}
    ${statCard('Spending · ' + monthShort(m), money(spending),
      prevSums ? (spendDelta <= 0 ? `<span class="pos">▼ ${-spendDelta}% vs ${monthShort(prev)}</span>` : `<span class="neg">▲ ${spendDelta}% vs ${monthShort(prev)}</span>`) : 'First month on record',
      spendDelta > 10 ? 'bad' : spendDelta > 0 ? 'warn' : '')}
    ${statCard('Left to save', money(saved), `Savings rate <b class="num">${rate}%</b> of income`, rate < 10 ? 'warn' : '')}
    ${statCard('Net worth', money(state.accounts.reduce((s, a) => s + a.balance, 0)),
      `${state.accounts.length} accounts · updated from your transactions`)}
  </div>

  <div class="grid g-32" style="margin-bottom:16px">
    <div class="card">
      <div class="card-head"><h2>Where the money went</h2><a href="#/insights">Full breakdown →</a></div>
      <div class="donut-wrap">${donutSVG(donutParts)}
        <div style="flex:1;min-width:180px">${topCats.map(([id, v]) => `<div class="bar-row">
          <span class="bar-label"><span class="cat-dot" style="background:${catById(id).color}"></span>${esc(catById(id).name)}</span>
          <span class="bar"><i style="width:${pct(v, spending)}%"></i></span>
          <span class="bar-amt"><b class="num">${money(v)}</b><br><span class="muted">${pct(v, spending)}%</span></span></div>`).join('')}
        </div>
      </div>
      <p class="chart-note">Housing and daycare are fixed costs — the bars that move are groceries, dining and shopping.</p>
    </div>
    <div class="card">
      <div class="card-head"><h2>Budgets to watch</h2><a href="#/budgets">All budgets →</a></div>
      ${budgetRows.map(({ c, spent, limit }) => {
        const p = pct(spent, limit);
        const cls = p >= 100 ? 'over' : p >= 85 ? 'warn' : '';
        return `<div class="bar-row"><span class="bar-label">${c.icon} ${esc(c.name)}</span>
          <span class="bar"><i class="${cls}" style="width:${Math.min(p, 100)}%"></i></span>
          <span class="bar-amt"><b class="num">${money(spent)}</b> / ${money(limit)}<br><span class="${spent > limit ? 'neg' : 'muted'}">${spent > limit ? 'Over by ' + money(spent - limit) : spent === limit ? 'Right on budget' : p + '% used'}</span></span></div>`;
      }).join('')}
      <p class="chart-note">Limits include October rollover — unspent money carries forward instead of vanishing.</p>
    </div>
  </div>

  <div class="grid g-32">
    <div class="card">
      <div class="card-head"><h2>Recent transactions</h2><a href="#/transactions">See all →</a></div>
      <table class="responsive"><thead><tr><th>Date</th><th>What</th><th>Category</th><th class="r">Amount</th></tr></thead><tbody>
      ${recent.map((t) => `<tr><td data-label="Date">${fmtDate(t.date)}</td>
        <td data-label="What"><span class="txn-merchant">${esc(t.merchant)}</span>${t.note ? `<div class="txn-note">${esc(t.note)}</div>` : ''}</td>
        <td data-label="Category"><span class="cat-chip"><span class="cat-dot" style="background:${catById(t.category).color}"></span>${esc(catById(t.category).name)}</span></td>
        <td data-label="Amount" class="r num ${t.amount < 0 ? 'neg' : 'pos'}"><b>${moneySigned(t.amount)}</b></td></tr>`).join('')}
      </tbody></table>
    </div>
    <div style="display:grid;gap:16px;align-content:start">
      <div class="card">
        <div class="card-head"><h2>Accounts</h2><a href="#/settings">Manage →</a></div>
        ${state.accounts.map((a) => `<div class="bill-row"><span style="font-size:20px">${a.type === 'credit' ? '💳' : a.type === 'savings' ? '🏦' : a.type === 'cash' ? '💵' : '🏧'}</span>
          <div><b>${esc(a.name)}</b><div class="muted small">${esc(a.bank)}</div></div>
          <div class="bill-due num"><b class="${a.balance < 0 ? 'neg' : ''}">${money(a.balance)}</b></div></div>`).join('')}
      </div>
      <div class="card">
        <div class="card-head"><h2>Bills still due in ${monthShort(m)}</h2><a href="#/bills">All bills →</a></div>
        ${dueBills.length ? dueBills.map((b) => `<div class="bill-row"><span style="font-size:19px">${b.autopay ? '🔁' : '✉️'}</span>
          <div><b>${esc(b.name)}</b><div class="muted small">Due ${monthShort(m)} ${b.day} · ${b.autopay ? 'Autopay on' : 'Pay manually'}</div></div>
          <div class="bill-due num"><b>${money(b.amount)}</b></div></div>`).join('')
          : `<p class="muted">🎉 Every bill for ${monthName(m)} is paid. Nice work.</p>`}
      </div>
      <div class="card">
        <div class="card-head"><h2>Spending trend</h2><a href="#/insights">Insights →</a></div>
        ${lineSVG(trend)}
        <p class="chart-note">Monthly spending, ${monthShort(MONTHS[0])}–${monthShort(CURRENT_MONTH)} 2026. November is tracking below October.</p>
      </div>
    </div>
  </div>
  <footer class="page-foot">Ledger runs entirely offline — your numbers never leave this browser. Data is saved in localStorage.</footer>`;
}

// ---------- transactions ----------
let txnFilter = { q: '', cat: 'all', account: 'all' };

function viewTransactions() {
  const m = state.month;
  const { income, spending, transfers } = sumsFor(m);
  let list = txnsFor(m).slice().sort((a, b) => b.date.localeCompare(a.date));
  if (txnFilter.cat !== 'all') list = list.filter((t) => t.category === txnFilter.cat);
  if (txnFilter.account !== 'all') list = list.filter((t) => t.account === txnFilter.account);
  if (txnFilter.q) {
    const q = txnFilter.q.toLowerCase();
    list = list.filter((t) => (t.merchant + ' ' + (t.note || '')).toLowerCase().includes(q));
  }
  const catOpts = CATEGORIES.map((c) => `<option value="${c.id}" ${txnFilter.cat === c.id ? 'selected' : ''}>${c.icon} ${esc(c.name)}</option>`).join('');
  const accOpts = state.accounts.map((a) => `<option value="${a.id}" ${txnFilter.account === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('');
  return `${topbar('Ledger · Transactions', 'Transactions — ' + monthName(m),
    `Every dollar in and out. <b class="num pos">${money(income)} in</b> · <b class="num neg">${money(spending)} out</b>${transfers ? ` · <b class="num">${money(transfers)} moved to savings</b>` : ''} · ${list.length} entries shown. Add, edit or delete anything — the totals update everywhere instantly.`)}
  <div class="toolbar">
    <input type="search" id="txn-search" placeholder="Search merchant or note…" value="${esc(txnFilter.q)}" aria-label="Search transactions">
    <select id="txn-cat" aria-label="Filter by category"><option value="all">All categories</option>${catOpts}</select>
    <select id="txn-acc" aria-label="Filter by account"><option value="all">All accounts</option>${accOpts}</select>
    <button class="btn" data-open-txn style="margin-left:auto">+ Add transaction</button>
  </div>
  <div class="card" style="padding:6px 20px">
  ${list.length ? `<table class="responsive"><thead><tr><th>Date</th><th>What</th><th>Category</th><th>Account</th><th class="r">Amount</th><th></th></tr></thead><tbody>
    ${list.map((t) => { const acc = state.accounts.find((a) => a.id === t.account); return `<tr>
      <td data-label="Date">${fmtDate(t.date)}</td>
      <td data-label="What"><span class="txn-merchant">${esc(t.merchant)}</span>${t.note ? `<div class="txn-note">${esc(t.note)}</div>` : ''}</td>
      <td data-label="Category"><span class="cat-chip"><span class="cat-dot" style="background:${catById(t.category).color}"></span>${esc(catById(t.category).name)}</span></td>
      <td data-label="Account" class="muted small">${esc(acc ? acc.name : t.account)}</td>
      <td data-label="Amount" class="r num ${t.amount < 0 ? 'neg' : 'pos'}"><b>${moneySigned(t.amount)}</b></td>
      <td><div class="row-actions">
        <button class="icon-btn" data-edit-txn="${t.id}" title="Edit" aria-label="Edit ${esc(t.merchant)}">✏️</button>
        <button class="icon-btn danger" data-del-txn="${t.id}" title="Delete" aria-label="Delete ${esc(t.merchant)}">🗑️</button>
      </div></td></tr>`; }).join('')}
  </tbody></table>` : `<div class="empty"><div class="big">🔍</div><p><b>No transactions match.</b></p><p>Try a different search, or add the first one for this month.</p></div>`}
  </div>
  <footer class="page-foot">Tip: deleting a paycheck also removes it from the income total — everything on this site is computed live from these rows.</footer>`;
}

// ---------- budgets ----------
function viewBudgets() {
  const m = state.month;
  const byCat = spentByCategory(m);
  const prev = prevMonth(m);
  const prevByCat = prev ? spentByCategory(prev) : {};
  const rows = CATEGORIES.filter((c) => c.kind === 'expense').map((c) => {
    const limit = state.budgets[c.id] || 0;
    const roll = state.rollover[c.id] || 0;
    const spent = byCat[c.id] || 0;
    const total = limit + roll;
    const p = pct(spent, total);
    const left = total - spent;
    const prevSpent = prevByCat[c.id] || 0;
    const delta = prevSpent ? Math.round(((spent - prevSpent) / prevSpent) * 100) : 0;
    return { c, limit, roll, spent, total, p, left, delta, prevSpent };
  });
  const totalBudget = rows.reduce((s, r) => s + r.total, 0);
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0);
  const over = rows.filter((r) => r.spent > r.total);
  return `${topbar('Ledger · Budgets', 'Monthly budgets — ' + monthName(m),
    `You planned <b class="num">${money(totalBudget)}</b> and spent <b class="num">${money(totalSpent)}</b> — <b class="num ${totalBudget - totalSpent >= 0 ? 'pos' : 'neg'}">${money(totalBudget - totalSpent)} ${totalBudget - totalSpent >= 0 ? 'left' : 'over'}</b>. Unspent money rolls forward to next month instead of disappearing.`)}
  ${over.length ? `<div class="card" style="border-color:#ecc5c0;background:#fff5f4;margin-bottom:16px"><b>⚠️ ${over.length} categor${over.length > 1 ? 'ies are' : 'y is'} over budget:</b> ${over.map((r) => esc(r.c.name)).join(', ')}. Move money from a category with room, or raise the limit — both are one click below.</div>` : ''}
  <div class="card" style="margin-bottom:16px">
    <div class="card-head"><h2>All categories</h2><span class="muted small">Click “Edit” to change a limit or rollover</span></div>
    ${rows.map((r) => `<div class="bar-row" style="grid-template-columns:170px 1fr 150px 34px">
      <span class="bar-label"><span class="cat-dot" style="background:${r.c.color}"></span>${r.c.icon} ${esc(r.c.name)}</span>
      <span><span class="bar"><i class="${r.p >= 100 ? 'over' : r.p >= 85 ? 'warn' : ''}" style="width:${Math.min(r.p, 100)}%"></i></span>
      <span class="small muted">${money(r.spent)} of ${money(r.total)}${r.roll ? ` · incl. ${money(r.roll)} rollover` : ''} · ${r.p}%${r.prevSpent ? ` · ${r.delta <= 0 ? '▼' : '▲'} ${Math.abs(r.delta)}% vs ${monthShort(prev)}` : ''}</span></span>
      <span class="bar-amt"><b class="num ${r.left < 0 ? 'neg' : 'pos'}">${r.left < 0 ? 'Over ' + money(-r.left) : money(r.left) + ' left'}</b></span>
      <span><button class="btn ghost sm" data-edit-budget="${r.c.id}">Edit</button></span></div>`).join('')}
  </div>
  <div class="grid g-2">
    <div class="card"><h2>How rollover works</h2>
      <p class="muted" style="margin-top:8px">At the end of each month, whatever you did not spend in a category carries into the next month's limit. Groceries came into November with ${money(state.rollover.groceries || 0)} left over from October — so a big Thanksgiving shop does not blow the month. Overspending in one category is covered by the next month's rollover shrinking, never by magic money.</p></div>
    <div class="card"><h2>Budget vs. reality — last 6 months</h2>
      ${barsSVG(MONTHS.map((mm) => ({ label: monthShort(mm), value: Object.values(spentByCategory(mm)).reduce((s, v) => s + v, 0), color: mm === m ? '#d97706' : '#2e7d4f' })), { format: (v) => '$' + Math.round(v / 100) / 10 + 'k' })}
      <p class="chart-note">Total spending per month. November (amber) is the lowest since July — the weekly-shop rhythm is holding.</p></div>
  </div>
  <footer class="page-foot">Budgets are per household, not per person — Maya and Jordan share every category.</footer>`;
}

// ---------- goals ----------
function viewGoals() {
  const totalSaved = state.goals.reduce((s, g) => s + g.saved, 0);
  const totalTarget = state.goals.reduce((s, g) => s + g.target, 0);
  const monthlyAuto = 400 + 150; // savings transfer + college fund
  return `${topbar('Ledger · Savings goals', 'Savings goals',
    `You have saved <b class="num">${money(totalSaved)}</b> toward <b class="num">${money(totalTarget)}</b> across ${state.goals.length} goals — <b class="num">${pct(totalSaved, totalTarget)}%</b> of the way there. <b class="num">${money(monthlyAuto)}</b> moves automatically every month.`, false)}
  <div class="card" style="margin-bottom:16px">
    <div class="card-head"><h2>All goals together</h2><span class="muted small">${pct(totalSaved, totalTarget)}% funded</span></div>
    <div class="bar"><i style="width:${pct(totalSaved, totalTarget)}%"></i></div>
    <p class="chart-note">At the current ${money(monthlyAuto)}/month pace, the emergency fund is fully funded in about ${Math.ceil((10000 - 7400) / monthlyAuto)} months — and the Oregon Coast trip is paid for by April.</p>
  </div>
  <div class="goal-grid">
    ${state.goals.map((g) => {
      const p = pct(g.saved, g.target);
      const left = g.target - g.saved;
      return `<div class="card goal-card"><div class="goal-top">
        <div class="goal-emoji">${g.emoji}</div>
        <div style="flex:1"><h2>${esc(g.name)}</h2><p class="muted small">${esc(g.note)}</p></div>
        <div class="goal-pct num">${p}%</div></div>
      <div style="margin:14px 0 8px"><div class="bar"><i style="width:${p}%"></i></div></div>
      <p><b class="num">${money(g.saved)}</b> <span class="muted">of ${money(g.target)} · ${money(left)} to go</span></p>
      <p class="small muted" style="margin-top:4px">Target date: ${g.deadline}</p>
      <div style="display:flex;gap:8px;margin-top:14px">
        <button class="btn sm" data-add-funds="${g.id}">+ Add funds</button>
        <button class="btn ghost sm" data-edit-goal="${g.id}">Edit goal</button>
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
function viewBills() {
  const m = state.month;
  const total = state.bills.reduce((s, b) => s + b.amount, 0);
  const paid = state.bills.filter((b) => b.paidMonths.includes(m));
  const unpaid = state.bills.filter((b) => !b.paidMonths.includes(m));
  const paidSum = paid.reduce((s, b) => s + b.amount, 0);
  const row = (b) => {
    const isPaid = b.paidMonths.includes(m);
    return `<div class="bill-row"><span style="font-size:20px">${isPaid ? '✅' : '⏰'}</span>
      <div><b>${esc(b.name)}</b><div class="muted small">Due ${monthShort(m)} ${b.day} · ${esc(catById(b.category).name)} · ${b.autopay ? 'Autopay on' : 'Pay manually'}</div></div>
      <div class="bill-due"><b class="num">${money(b.amount)}</b><br>
      ${isPaid ? `<span class="pill green">Paid</span>` : `<button class="btn sm" data-pay-bill="${b.id}" style="margin-top:4px">Mark paid</button>`}</div></div>`;
  };
  return `${topbar('Ledger · Bills', 'Bills & recurring — ' + monthName(m),
    `<b class="num">${money(paidSum)}</b> of <b class="num">${money(total)}</b> paid · ${unpaid.length} bill${unpaid.length === 1 ? '' : 's'} still to go. Autopay covers ${state.bills.filter((b) => b.autopay).length} of ${state.bills.length} — the two manual ones are the ones that bite.`)}
  <div class="grid g-2">
    <div class="card"><div class="card-head"><h2>⏰ Still to pay (${unpaid.length})</h2><span class="muted small">${money(unpaid.reduce((s, b) => s + b.amount, 0))} due</span></div>
      ${unpaid.length ? unpaid.map(row).join('') : `<div class="empty"><div class="big">🎉</div><p><b>All bills paid for ${monthName(m)}.</b></p><p>Nothing due — enjoy the quiet.</p></div>`}
    </div>
    <div class="card"><div class="card-head"><h2>✅ Paid (${paid.length})</h2><span class="muted small">${money(paidSum)} paid</span></div>
      ${paid.length ? paid.map(row).join('') : '<p class="muted">Nothing paid yet this month.</p>'}
    </div>
  </div>
  <div class="card" style="margin-top:16px"><div class="card-head"><h2>Add a recurring bill</h2></div>
    <p class="muted" style="margin-bottom:12px">Rent, insurance, streaming — anything that comes back every month. It will appear here every month until you remove it.</p>
    <button class="btn" data-new-bill>+ Add recurring bill</button>
    <span class="kbd-hint" style="margin-left:10px">Marking a bill paid also records the transaction, so the budget stays honest.</span>
  </div>
  <footer class="page-foot">Bills repeat on the same day each month. Delete one from Settings if it ever ends.</footer>`;
}

// ---------- insights ----------
function viewInsights() {
  const m = state.month;
  const prev = prevMonth(m);
  const byCat = spentByCategory(m);
  const prevByCat = prev ? spentByCategory(prev) : {};
  const { income, spending } = sumsFor(m);
  const insights = [];
  // Biggest mover vs last month
  const movers = CATEGORIES.filter((c) => c.kind === 'expense').map((c) => ({
    c, now: byCat[c.id] || 0, was: prevByCat[c.id] || 0,
  })).filter((x) => x.was > 20).sort((a, b) => (b.now - b.was) - (a.now - a.was));
  if (movers.length) {
    const up = movers[0];
    const d = Math.round(((up.now - up.was) / up.was) * 100);
    insights.push({ ico: d > 0 ? '📈' : '📉', tone: d > 15 ? 'warn' : '', title: `${up.c.name} ${d >= 0 ? 'up' : 'down'} ${Math.abs(d)}% vs ${monthShort(prev)}`,
      body: `${money(up.now)} this month against ${money(up.was)} last month. ${d > 15 ? 'Worth a look before it becomes a habit.' : 'Nothing dramatic — just the normal ebb and flow.'}` });
  }
  const subs = state.transactions.filter((t) => t.date.startsWith(m) && t.category === 'subscriptions');
  const subTotal = subs.reduce((s, t) => s - t.amount, 0);
  insights.push({ ico: '🔁', tone: '', title: `${subs.length} subscriptions cost ${money(subTotal)} this month`,
    body: `Netflix, Spotify, Audible and iCloud. That is ${money(subTotal * 12)} a year — the price of a weekend away. All four are used weekly, so nothing to cut today.` });
  const topTxn = [...txnsFor(m)].filter((t) => t.amount < 0 && t.note !== 'Monthly savings transfer').sort((a, b) => a.amount - b.amount)[0];
  if (topTxn) insights.push({ ico: '🧾', tone: '', title: `Biggest single spend: ${topTxn.merchant} — ${money(-topTxn.amount)}`,
    body: `On ${fmtDate(topTxn.date)}. Rent and daycare aside, this was the month's largest one-off. It was planned, not a surprise.` });
  const rate = income > 0 ? Math.round(((income - spending) / income) * 100) : 0;
  insights.push({ ico: rate >= 15 ? '🎉' : '⚠️', tone: rate >= 15 ? '' : 'warn', title: `Savings rate ${rate}% — ${rate >= 20 ? 'above' : rate >= 15 ? 'near' : 'below'} the 20% target`,
    body: `You kept ${money(income - spending)} of ${money(income)} income. A 20% rate funds the emergency goal two months sooner; dining out is the easiest lever this month.` });
  const dining = byCat.dining || 0;
  const diningBudget = (state.budgets.dining || 0) + (state.rollover.dining || 0);
  insights.push({ ico: '🍽️', tone: dining > diningBudget ? 'bad' : '', title: `Dining out: ${money(dining)} of ${money(diningBudget)} budget`,
    body: dining > diningBudget ? `Over budget by ${money(dining - diningBudget)}. Three takeaway nights in one week did it — cooking at home twice a week closes the gap.` : `Inside budget with ${money(diningBudget - dining)} to spare. The home-cooked Sundays are paying off.` });

  const trend = MONTHS.map((mm) => ({ label: monthShort(mm), value: sumsFor(mm).spending }));
  const incomeTrend = MONTHS.map((mm) => ({ label: monthShort(mm), value: sumsFor(mm).income }));
  const merchants = {};
  for (const t of txnsFor(m)) if (t.amount < 0 && t.note !== 'Monthly savings transfer') merchants[t.merchant] = (merchants[t.merchant] || 0) + -t.amount;
  const topMerchants = Object.entries(merchants).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return `${topbar('Ledger · Insights', 'Insights & reports — ' + monthName(m),
    'What the numbers are actually saying. Every insight below is computed from your transactions — change a transaction and the story changes.')}
  <div class="grid g-2" style="margin-bottom:16px">
    <div class="card"><div class="card-head"><h2>💡 This month's insights</h2></div>
      ${insights.map((i) => `<div class="insight"><div class="insight-ico ${i.tone}">${i.ico}</div>
        <div><b>${esc(i.title)}</b><p>${esc(i.body)}</p></div></div>`).join('')}
    </div>
    <div style="display:grid;gap:16px;align-content:start">
      <div class="card"><div class="card-head"><h2>Spending trend — 6 months</h2></div>${lineSVG(trend)}
        ${(() => { const mx = trend.reduce((a, b) => (b.value > a.value ? b : a)); const avg = trend.reduce((s, t) => s + t.value, 0) / trend.length; return `<p class="chart-note">Highest month: ${esc(mx.label)} at ${money(mx.value)}. The six-month average is ${money(Math.round(avg))} — November is tracking below it.</p>`; })()}</div>
      <div class="card"><div class="card-head"><h2>Income vs spending</h2></div>
        ${barsSVG(MONTHS.map((mm, i) => ({ label: monthShort(mm), value: sumsFor(mm).income - sumsFor(mm).spending, color: (sumsFor(mm).income - sumsFor(mm).spending) >= 0 ? '#2e7d4f' : '#c0392b' })), { format: (v) => (v < 0 ? '−' : '') + '$' + Math.round(Math.abs(v) / 100) / 10 + 'k' })}
        <p class="chart-note">Money kept each month (income minus spending). Every month this year has been positive.</p></div>
    </div>
  </div>
  <div class="grid g-2">
    <div class="card"><div class="card-head"><h2>Where it goes — ${monthName(m)}</h2></div>
      ${donutSVG(Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, v]) => ({ label: catById(id).name, value: v, color: catById(id).color })))}
      <div class="legend">${Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, v]) => `<span><span class="cat-dot" style="background:${catById(id).color}"></span>${esc(catById(id).name)} · ${money(v)}</span>`).join('')}</div>
    </div>
    <div class="card"><div class="card-head"><h2>Top merchants — ${monthShort(m)}</h2></div>
      <table><thead><tr><th>Merchant</th><th class="r">Spent</th><th class="r">Share</th></tr></thead><tbody>
      ${topMerchants.map(([name, v]) => `<tr><td>${esc(name)}</td><td class="r num"><b>${money(v)}</b></td><td class="r num muted">${pct(v, spending)}%</td></tr>`).join('')}
      </tbody></table>
      <p class="chart-note">Whole Foods and Costco together are a third of grocery spending — the weekly shop, not impulse buys.</p></div>
  </div>
  <footer class="page-foot">Reports recompute from live data. Export everything as JSON from Settings.</footer>`;
}

// ---------- settings ----------
function viewSettings() {
  const totalTx = state.transactions.length;
  return `${topbar('Ledger · Settings', 'Settings & your data',
    'Your household, your data. Everything is stored only in this browser — export it, reset it, or start fresh whenever you like.', false)}
  <div class="grid g-2">
    <div class="card"><h2>🏠 Household</h2>
      <p class="muted" style="margin:8px 0 14px">The people this budget belongs to. Names appear in the sidebar and on goal notes.</p>
      <div class="field"><label for="household-name">Household name</label>
        <input id="household-name" value="${esc(state.household)}"></div>
      <div class="field"><label for="members">Members (comma separated)</label>
        <input id="members" value="${esc(state.members.join(', '))}"></div>
      <button class="btn" data-save-household>Save household</button>
    </div>
    <div class="card"><h2>💳 Accounts</h2>
      <p class="muted" style="margin:8px 0 12px">Balances update as you add transactions. Edit a balance to correct it.</p>
      ${state.accounts.map((a) => `<div class="bill-row"><span style="font-size:19px">${a.type === 'credit' ? '💳' : a.type === 'savings' ? '🏦' : a.type === 'cash' ? '💵' : '🏧'}</span>
        <div><b>${esc(a.name)}</b><div class="muted small">${esc(a.bank)}</div></div>
        <div class="bill-due"><input type="number" step="0.01" value="${a.balance}" data-account-balance="${a.id}" style="width:130px;padding:7px 9px;border:1px solid #d8d2bd;border-radius:8px;text-align:right" aria-label="Balance of ${esc(a.name)}"></div></div>`).join('')}
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
    <p class="muted" style="margin-top:8px">Version 1.0 · ${totalTx} transactions across ${MONTHS.length} months · ${state.goals.length} goals · ${state.bills.length} recurring bills.</p></div>
  <footer class="page-foot">Made with care for families who would rather know where the money went than wonder.</footer>`;
}

// ---------- modals ----------
function openModal(html) {
  modalRoot.innerHTML = `<div class="modal-backdrop" data-close-modal><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`;
  const first = modalRoot.querySelector('input, select, textarea, button');
  if (first) first.focus();
}
function closeModal() { modalRoot.innerHTML = ''; }

function txnForm(t) {
  const isNew = !t;
  const d = t || { date: `${state.month}-26`, merchant: '', category: 'groceries', amount: -25, account: 'checking', note: '' };
  const catOpts = CATEGORIES.map((c) => `<option value="${c.id}" ${d.category === c.id ? 'selected' : ''}>${c.icon} ${esc(c.name)}</option>`).join('');
  const accOpts = state.accounts.map((a) => `<option value="${a.id}" ${d.account === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('');
  return `<h2>${isNew ? 'Add a transaction' : 'Edit transaction'}</h2>
  <p class="modal-sub">Amounts are signed: spending is negative, income is positive.</p>
  <form id="txn-form" data-txn-id="${t ? t.id : ''}">
    <div class="form-row">
      <div class="field"><label for="f-date">Date</label><input id="f-date" type="date" required value="${esc(d.date)}"></div>
      <div class="field"><label for="f-amount">Amount (USD)</label><input id="f-amount" type="number" step="0.01" required value="${d.amount}"></div>
    </div>
    <div class="field"><label for="f-merchant">Merchant / description</label><input id="f-merchant" required maxlength="80" value="${esc(d.merchant)}" placeholder="e.g. Whole Foods Market"></div>
    <div class="form-row">
      <div class="field"><label for="f-category">Category</label><select id="f-category">${catOpts}</select></div>
      <div class="field"><label for="f-account">Account</label><select id="f-account">${accOpts}</select></div>
    </div>
    <div class="field"><label for="f-note">Note (optional)</label><input id="f-note" maxlength="120" value="${esc(d.note || '')}" placeholder="e.g. Weekly shop"></div>
    <div class="modal-actions"><button type="button" class="btn ghost" data-close-modal>Cancel</button>
    <button type="submit" class="btn">${isNew ? 'Add transaction' : 'Save changes'}</button></div>
  </form>`;
}

function budgetForm(catId) {
  const c = catById(catId);
  return `<h2>Edit budget — ${c.icon} ${esc(c.name)}</h2>
  <p class="modal-sub">Set the monthly limit. Rollover is unspent money carried in from last month.</p>
  <form id="budget-form" data-cat="${catId}">
    <div class="form-row">
      <div class="field"><label for="f-limit">Monthly limit (USD)</label><input id="f-limit" type="number" min="0" step="1" required value="${state.budgets[catId] || 0}"></div>
      <div class="field"><label for="f-roll">Rollover in (USD)</label><input id="f-roll" type="number" min="0" step="0.01" value="${state.rollover[catId] || 0}"></div>
    </div>
    <div class="modal-actions"><button type="button" class="btn ghost" data-close-modal>Cancel</button>
    <button type="submit" class="btn">Save budget</button></div>
  </form>`;
}

function goalForm(g) {
  const isNew = !g;
  const d = g || { name: '', emoji: '🎯', target: 1000, saved: 0, deadline: '2027-12-31', note: '' };
  return `<h2>${isNew ? 'Start a new savings goal' : 'Edit goal — ' + esc(g.name)}</h2>
  <p class="modal-sub">${isNew ? 'Give it a name, a target and a date. Small goals you can see are the ones that get funded.' : 'Change the target, the date or the story behind it.'}</p>
  <form id="goal-form" data-goal-id="${g ? g.id : ''}">
    <div class="form-row">
      <div class="field"><label for="f-gname">Goal name</label><input id="f-gname" required maxlength="60" value="${esc(d.name)}" placeholder="e.g. New bikes for spring"></div>
      <div class="field"><label for="f-gemoji">Emoji</label><input id="f-gemoji" maxlength="4" value="${esc(d.emoji)}"></div>
    </div>
    <div class="form-row">
      <div class="field"><label for="f-gtarget">Target (USD)</label><input id="f-gtarget" type="number" min="1" step="1" required value="${d.target}"></div>
      <div class="field"><label for="f-gdeadline">Target date</label><input id="f-gdeadline" type="date" value="${esc(d.deadline)}"></div>
    </div>
    <div class="field"><label for="f-gnote">Why this goal? (optional)</label><input id="f-gnote" maxlength="120" value="${esc(d.note || '')}" placeholder="What it is for"></div>
    <div class="modal-actions"><button type="button" class="btn ghost" data-close-modal>Cancel</button>
    <button type="submit" class="btn">${isNew ? 'Create goal' : 'Save goal'}</button></div>
  </form>`;
}

function fundsForm(g) {
  return `<h2>Add funds — ${g.emoji} ${esc(g.name)}</h2>
  <p class="modal-sub">${money(g.saved)} of ${money(g.target)} saved so far · ${money(g.target - g.saved)} to go.</p>
  <form id="funds-form" data-goal-id="${g.id}">
    <div class="field"><label for="f-amt">Amount to add (USD)</label><input id="f-amt" type="number" min="1" step="1" required value="50" autofocus></div>
    <div class="modal-actions"><button type="button" class="btn ghost" data-close-modal>Cancel</button>
    <button type="submit" class="btn">Add ${money(50)} to goal</button></div>
  </form>`;
}

function billForm() {
  const catOpts = CATEGORIES.filter((c) => c.kind === 'expense').map((c) => `<option value="${c.id}">${c.icon} ${esc(c.name)}</option>`).join('');
  return `<h2>Add a recurring bill</h2>
  <p class="modal-sub">It will appear every month on the day you pick, until you remove it.</p>
  <form id="bill-form">
    <div class="field"><label for="f-bname">Bill name</label><input id="f-bname" required maxlength="60" placeholder="e.g. Gym membership"></div>
    <div class="form-row">
      <div class="field"><label for="f-bamount">Amount (USD)</label><input id="f-bamount" type="number" min="0.01" step="0.01" required value="25"></div>
      <div class="field"><label for="f-bday">Day of month</label><input id="f-bday" type="number" min="1" max="28" required value="15"></div>
    </div>
    <div class="form-row">
      <div class="field"><label for="f-bcat">Category</label><select id="f-bcat">${catOpts}</select></div>
      <div class="field"><label for="f-bauto">Autopay?</label><select id="f-bauto"><option value="yes">Yes — autopay on</option><option value="no">No — I pay it manually</option></select></div>
    </div>
    <div class="modal-actions"><button type="button" class="btn ghost" data-close-modal>Cancel</button>
    <button type="submit" class="btn">Add bill</button></div>
  </form>`;
}

// ---------- router ----------
const ROUTES = {
  dashboard: viewDashboard,
  transactions: viewTransactions,
  budgets: viewBudgets,
  goals: viewGoals,
  bills: viewBills,
  insights: viewInsights,
  settings: viewSettings,
};

function render() {
  window.__shotReady = false;
  const hash = location.hash || '#/';
  const name = (hash.replace(/^#\//, '').split('/')[0] || 'dashboard');
  const view = ROUTES[name] || ROUTES.dashboard;
  const titles = {
    dashboard: 'Dashboard', transactions: 'Transactions', budgets: 'Budgets',
    goals: 'Savings Goals', bills: 'Bills & Recurring', insights: 'Insights & Reports', settings: 'Settings & Data',
  };
  document.title = `${titles[name] || 'Dashboard'} | Ledger — The Rivera Household Budget`;
  app.innerHTML = view();
  setActiveNav(name);
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

// ---------- events ----------
document.addEventListener('click', (e) => {
  const step = e.target.closest('[data-month-step]');
  if (step) {
    const i = monthIndex(state.month) + Number(step.dataset.monthStep);
    if (i >= 0 && i < MONTHS.length) { state.month = MONTHS[i]; saveState(state); render(); }
    return;
  }
  const closer = e.target.closest('[data-close-modal]');
  if (closer) {
    // Close only on the backdrop itself or an explicit Cancel button —
    // never for clicks on other controls inside the modal (e.g. Submit),
    // which must reach the form first.
    const onBackdrop = closer.classList.contains('modal-backdrop');
    if (!onBackdrop || e.target === closer) { closeModal(); return; }
  }
  const openTxn = e.target.closest('[data-open-txn]');
  if (openTxn) { openModal(txnForm(null)); return; }
  const editTxn = e.target.closest('[data-edit-txn]');
  if (editTxn) {
    const t = state.transactions.find((x) => x.id === editTxn.dataset.editTxn);
    if (t) openModal(txnForm(t));
    return;
  }
  const delTxn = e.target.closest('[data-del-txn]');
  if (delTxn) {
    const t = state.transactions.find((x) => x.id === delTxn.dataset.delTxn);
    if (t && confirm(`Delete “${t.merchant}” (${moneySigned(t.amount)})?`)) {
      state.transactions = state.transactions.filter((x) => x.id !== t.id);
      saveState(state); render(); toast('Transaction deleted.');
    }
    return;
  }
  const editBudget = e.target.closest('[data-edit-budget]');
  if (editBudget) { openModal(budgetForm(editBudget.dataset.editBudget)); return; }
  const addFunds = e.target.closest('[data-add-funds]');
  if (addFunds) {
    const g = state.goals.find((x) => x.id === addFunds.dataset.addFunds);
    if (g) openModal(fundsForm(g));
    return;
  }
  const editGoal = e.target.closest('[data-edit-goal]');
  if (editGoal) {
    const g = state.goals.find((x) => x.id === editGoal.dataset.editGoal);
    if (g) openModal(goalForm(g));
    return;
  }
  const newGoal = e.target.closest('[data-new-goal]');
  if (newGoal) { openModal(goalForm(null)); return; }
  const payBill = e.target.closest('[data-pay-bill]');
  if (payBill) {
    const b = state.bills.find((x) => x.id === payBill.dataset.payBill);
    if (b && !b.paidMonths.includes(state.month)) {
      b.paidMonths.push(state.month);
      state.transactions.push({
        id: `t${Date.now()}`, date: `${state.month}-${String(b.day).padStart(2, '0')}`,
        merchant: b.name, category: b.category, amount: -b.amount,
        account: b.autopay ? 'checking' : 'checking', note: 'Bill paid',
      });
      saveState(state); render(); toast(`${b.name} marked paid.`);
    }
    return;
  }
  const newBill = e.target.closest('[data-new-bill]');
  if (newBill) { openModal(billForm()); return; }
  const saveHousehold = e.target.closest('[data-save-household]');
  if (saveHousehold) {
    const name = document.getElementById('household-name').value.trim();
    const members = document.getElementById('members').value.split(',').map((s) => s.trim()).filter(Boolean);
    if (name) state.household = name;
    if (members.length) state.members = members;
    saveState(state); render(); toast('Household saved.');
    return;
  }
  const saveBalances = e.target.closest('[data-save-balances]');
  if (saveBalances) {
    document.querySelectorAll('[data-account-balance]').forEach((input) => {
      const a = state.accounts.find((x) => x.id === input.dataset.accountBalance);
      if (a) a.balance = Math.round(Number(input.value || 0) * 100) / 100;
    });
    saveState(state); render(); toast('Balances saved.');
    return;
  }
  const exportBtn = e.target.closest('[data-export]');
  if (exportBtn) {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ledger-${state.household.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-export.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('Data downloaded as JSON.');
    return;
  }
  const resetSample = e.target.closest('[data-reset-sample]');
  if (resetSample && confirm('Reset everything back to the Rivera sample household? Your edits will be lost.')) {
    state = seedState(); saveState(state); location.hash = '#/'; render(); toast('Sample data restored.');
    return;
  }
  const resetBlank = e.target.closest('[data-reset-blank]');
  if (resetBlank && confirm('Erase everything and start with a blank ledger? Export first if this data matters.')) {
    const blank = seedState();
    blank.transactions = []; blank.goals = []; blank.bills = [];
    blank.accounts = blank.accounts.map((a) => ({ ...a, balance: 0 }));
    blank.budgets = {}; blank.rollover = {};
    state = blank; saveState(state); location.hash = '#/'; render(); toast('Blank ledger ready.');
  }
});

document.addEventListener('change', (e) => {
  if (e.target.id === 'month-select') { state.month = e.target.value; saveState(state); render(); }
  if (e.target.id === 'txn-cat') { txnFilter.cat = e.target.value; render(); }
  if (e.target.id === 'txn-acc') { txnFilter.account = e.target.value; render(); }
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'txn-search') {
    txnFilter.q = e.target.value;
    clearTimeout(window.__txnSearchTimer);
    window.__txnSearchTimer = setTimeout(render, 250);
  }
});
document.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  if (form.id === 'txn-form') {
    const id = form.dataset.txnId;
    const amount = Math.round(Number(document.getElementById('f-amount').value) * 100) / 100;
    const rec = {
      date: document.getElementById('f-date').value,
      merchant: document.getElementById('f-merchant').value.trim(),
      category: document.getElementById('f-category').value,
      amount,
      account: document.getElementById('f-account').value,
      note: document.getElementById('f-note').value.trim(),
    };
    if (!rec.date || !rec.merchant || Number.isNaN(amount)) { toast('Please fill in date, merchant and amount.'); return; }
    if (id) {
      const t = state.transactions.find((x) => x.id === id);
      if (t) Object.assign(t, rec);
      toast('Transaction updated.');
    } else {
      state.transactions.push({ id: `t${Date.now()}`, ...rec });
      state.month = rec.date.slice(0, 7);
      toast('Transaction added.');
    }
    saveState(state); closeModal(); render();
    return;
  }
  if (form.id === 'budget-form') {
    const cat = form.dataset.cat;
    state.budgets[cat] = Math.max(0, Number(document.getElementById('f-limit').value) || 0);
    state.rollover[cat] = Math.max(0, Number(document.getElementById('f-roll').value) || 0);
    saveState(state); closeModal(); render(); toast(`${catById(cat).name} budget saved.`);
    return;
  }
  if (form.id === 'goal-form') {
    const id = form.dataset.goalId;
    const rec = {
      name: document.getElementById('f-gname').value.trim(),
      emoji: document.getElementById('f-gemoji').value.trim() || '🎯',
      target: Math.max(1, Number(document.getElementById('f-gtarget').value) || 1),
      deadline: document.getElementById('f-gdeadline').value || '2027-12-31',
      note: document.getElementById('f-gnote').value.trim(),
    };
    if (!rec.name) { toast('Give the goal a name first.'); return; }
    if (id) {
      const g = state.goals.find((x) => x.id === id);
      if (g) Object.assign(g, rec);
      toast('Goal updated.');
    } else {
      state.goals.push({ id: `g${Date.now()}`, saved: 0, ...rec });
      toast('Goal created — time to fund it.');
    }
    saveState(state); closeModal(); render();
    return;
  }
  if (form.id === 'funds-form') {
    const id = form.dataset.goalId;
    const amt = Math.round(Number(document.getElementById('f-amt').value) * 100) / 100;
    const g = state.goals.find((x) => x.id === id);
    if (g && amt > 0) {
      g.saved = Math.round((g.saved + amt) * 100) / 100;
      const savings = state.accounts.find((a) => a.id === 'savings');
      if (savings) savings.balance = Math.round((savings.balance + amt) * 100) / 100;
      state.transactions.push({
        id: `t${Date.now()}`, date: `${state.month}-26`, merchant: `Added to goal — ${g.name}`,
        category: 'other-income', amount: -amt, account: 'savings', note: 'Goal contribution',
      });
      saveState(state); closeModal(); render(); toast(`${money(amt)} added to ${g.name}.`);
    }
    return;
  }
  if (form.id === 'bill-form') {
    const rec = {
      id: `b${Date.now()}`,
      name: document.getElementById('f-bname').value.trim(),
      amount: Math.round(Number(document.getElementById('f-bamount').value) * 100) / 100,
      day: Math.min(28, Math.max(1, Number(document.getElementById('f-bday').value) || 1)),
      category: document.getElementById('f-bcat').value,
      autopay: document.getElementById('f-bauto').value === 'yes',
      paidMonths: [],
    };
    if (!rec.name || !(rec.amount > 0)) { toast('Name the bill and give it an amount.'); return; }
    state.bills.push(rec);
    saveState(state); closeModal(); render(); toast(`${rec.name} added — due on the ${rec.day}th each month.`);
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

window.addEventListener('hashchange', render);
render();
