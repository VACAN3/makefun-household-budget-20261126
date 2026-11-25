// Seed data for the Rivera household budget.
// Everything is generated deterministically from a fixed seed, so the site
// shows the same realistic household on every first load. All edits the
// household makes are saved to localStorage and never touch this file.

// ---------- deterministic PRNG ----------
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const MONTHS = ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];
export const CURRENT_MONTH = '2026-11';

export const CATEGORIES = [
  { id: 'groceries', name: 'Groceries', color: '#2e7d4f', icon: '🛒', kind: 'expense' },
  { id: 'dining', name: 'Dining Out', color: '#d97706', icon: '🍽️', kind: 'expense' },
  { id: 'housing', name: 'Housing', color: '#6d28d9', icon: '🏠', kind: 'expense' },
  { id: 'utilities', name: 'Utilities', color: '#0284c7', icon: '💡', kind: 'expense' },
  { id: 'transport', name: 'Transport', color: '#dc2626', icon: '🚗', kind: 'expense' },
  { id: 'kids', name: 'Kids & School', color: '#db2777', icon: '🧒', kind: 'expense' },
  { id: 'health', name: 'Health', color: '#059669', icon: '🩺', kind: 'expense' },
  { id: 'entertainment', name: 'Entertainment', color: '#7c3aed', icon: '🎬', kind: 'expense' },
  { id: 'shopping', name: 'Shopping', color: '#ea580c', icon: '🛍️', kind: 'expense' },
  { id: 'subscriptions', name: 'Subscriptions', color: '#0891b2', icon: '🔁', kind: 'expense' },
  { id: 'pets', name: 'Pets', color: '#65a30d', icon: '🐾', kind: 'expense' },
  { id: 'education', name: 'Education', color: '#4f46e5', icon: '📚', kind: 'expense' },
  { id: 'paycheck', name: 'Paycheck', color: '#15803d', icon: '💼', kind: 'income' },
  { id: 'freelance', name: 'Freelance', color: '#15803d', icon: '💻', kind: 'income' },
  { id: 'other-income', name: 'Other Income', color: '#15803d', icon: '✉️', kind: 'income' },
];

export const ACCOUNTS = [
  { id: 'checking', name: 'Everyday Checking', bank: 'Meridian Bank ··4821', type: 'checking', balance: 4862.10 },
  { id: 'savings', name: 'Family Savings', bank: 'Meridian Bank ··9034', type: 'savings', balance: 18430.0 },
  { id: 'credit', name: 'Sapphire Credit Card', bank: 'Chase ··1177', type: 'credit', balance: -1284.55 },
  { id: 'cash', name: 'Cash Wallet', bank: 'On hand', type: 'cash', balance: 120.0 },
];

// Monthly budget targets (November 2026 is the live month).
export const BUDGETS = {
  groceries: 900, dining: 320, housing: 1850, utilities: 400, transport: 380,
  kids: 1250, health: 200, entertainment: 150, shopping: 250,
  subscriptions: 85, pets: 90, education: 120,
};

// Rollover: unspent money from October that carries into November, per category.
export const ROLLOVER = {
  groceries: 42.18, dining: 0, housing: 0, utilities: 18.44, transport: 61.2,
  kids: 0, health: 74.1, entertainment: 23.5, shopping: 0,
  subscriptions: 0, pets: 12.75, education: 40.0,
};

export const GOALS = [
  { id: 'g-emergency', name: 'Emergency Fund', emoji: '🛟', target: 10000, saved: 7400, deadline: '2027-06-30', note: 'Six months of essentials, for peace of mind.' },
  { id: 'g-vacation', name: 'Summer Vacation — Oregon Coast', emoji: '🏖️', target: 3500, saved: 1850, deadline: '2027-06-01', note: 'A week by the sea with Leo. Flights booked in March.' },
  { id: 'g-car', name: 'New Car Down Payment', emoji: '🚙', target: 8000, saved: 2300, deadline: '2027-09-30', note: 'Replace the 2014 Civic before winter 2027.' },
  { id: 'g-college', name: "Leo's College Fund", emoji: '🎓', target: 25000, saved: 4100, deadline: '2038-08-01', note: '$150 a month, every month, no exceptions.' },
  { id: 'g-kitchen', name: 'Kitchen Renovation', emoji: '🍳', target: 6000, saved: 900, deadline: '2027-12-31', note: 'New counters and a dishwasher that actually drains.' },
];

export const BILLS = [
  { id: 'b-rent', name: 'Rent — Maple Court Apt 4B', amount: 1850, day: 1, category: 'housing', autopay: true, paidMonths: ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'] },
  { id: 'b-daycare', name: 'Little Oaks Daycare', amount: 980, day: 3, category: 'kids', autopay: true, paidMonths: ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'] },
  { id: 'b-gym', name: 'Northside Gym — family plan', amount: 58, day: 5, category: 'health', autopay: true, paidMonths: ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'] },
  { id: 'b-netflix', name: 'Netflix Premium', amount: 15.49, day: 8, category: 'subscriptions', autopay: true, paidMonths: ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'] },
  { id: 'b-spotify', name: 'Spotify Family', amount: 16.99, day: 11, category: 'subscriptions', autopay: true, paidMonths: ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'] },
  { id: 'b-electric', name: 'City Power & Light', amount: 132, day: 12, category: 'utilities', autopay: false, paidMonths: ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10'] },
  { id: 'b-internet', name: 'Fiber Internet 500 Mbps', amount: 79, day: 15, category: 'utilities', autopay: true, paidMonths: ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'] },
  { id: 'b-insurance', name: 'Car Insurance — Geico', amount: 142, day: 18, category: 'transport', autopay: true, paidMonths: ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'] },
  { id: 'b-water', name: 'Water & Sewer', amount: 64, day: 20, category: 'utilities', autopay: false, paidMonths: ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10'] },
  { id: 'b-phone', name: 'Mobile — two lines', amount: 112, day: 22, category: 'utilities', autopay: true, paidMonths: ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'] },
];

// Merchant tables: [merchant, category, min, max, weight] — realistic everyday spending.
const MERCHANTS = [
  ['Whole Foods Market', 'groceries', 42, 148, 2],
  ['Trader Joe\u2019s', 'groceries', 28, 96, 2],
  ['Costco Wholesale', 'groceries', 88, 210, 1],
  ['Safeway', 'groceries', 24, 88, 2],
  ['Farmers Market — Saturday', 'groceries', 18, 54, 2],
  ['Chipotle', 'dining', 14, 32, 3],
  ['The Corner Bistro', 'dining', 38, 74, 3],
  ['Pizza Napoli', 'dining', 22, 46, 2],
  ['Sushi Hana', 'dining', 48, 92, 2],
  ['Blue Bottle Coffee', 'dining', 6, 18, 4],
  ['Shell — Fuel', 'transport', 32, 58, 4],
  ['Metro Transit Pass', 'transport', 34, 34, 1],
  ['Uber', 'transport', 12, 28, 3],
  ['Jiffy Lube — Oil Change', 'transport', 68, 95, 1],
  ['CVS Pharmacy', 'health', 12, 48, 3],
  ['Dr. Patel — Pediatric', 'health', 35, 35, 1],
  ['AMC Theatres', 'entertainment', 28, 52, 2],
  ['Bowling Alley — Family Night', 'entertainment', 34, 48, 1],
  ['Target', 'shopping', 32, 118, 4],
  ['Amazon', 'shopping', 18, 96, 4],
  ['Old Navy — Leo', 'shopping', 26, 64, 2],
  ['IKEA', 'shopping', 45, 160, 1],
  ['Petco', 'pets', 28, 62, 2],
  ['Chewy.com', 'pets', 34, 58, 1],
  ['Scholastic Book Fair', 'kids', 16, 38, 1],
  ['Leo\u2019s Soccer Club', 'kids', 45, 45, 1],
  ['Piano Lessons — Ms. Chen', 'kids', 120, 120, 1],
  ['Udemy — Maya\u2019s Course', 'education', 24, 49, 1],
  ['Audible', 'subscriptions', 14.95, 14.95, 1],
  ['iCloud Storage 200GB', 'subscriptions', 2.99, 2.99, 1],
  ['City Power & Light', 'utilities', 108, 162, 1],
  ['Water & Sewer Dept', 'utilities', 52, 78, 1],
];

function pickWeighted(rnd, table) {
  const total = table.reduce((s, m) => s + m[4], 0);
  let r = rnd() * total;
  for (const m of table) { r -= m[4]; if (r <= 0) return m; }
  return table[table.length - 1];
}

function daysIn(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

// Fixed monthly income + bills, then a realistic scatter of everyday spending.
export function generateTransactions() {
  const txns = [];
  let id = 1;
  MONTHS.forEach((month, mi) => {
    const rnd = mulberry32(202606 + mi * 97);
    const dim = daysIn(month);
    const d = (day) => `${month}-${String(day).padStart(2, '0')}`;
    const push = (date, merchant, category, amount, account, note) => {
      txns.push({ id: `t${id++}`, date, merchant, category, amount: Math.round(amount * 100) / 100, account, note: note || '' });
    };
    // Paychecks (income, positive amounts)
    push(d(1), 'Northwind Studio — Maya\u2019s Paycheck', 'paycheck', 3400, 'checking');
    push(d(15), 'Northwind Studio — Maya\u2019s Paycheck', 'paycheck', 3400, 'checking');
    push(d(5), 'Harbor Logistics — Jordan\u2019s Paycheck', 'paycheck', 2900, 'checking');
    push(d(20), 'Harbor Logistics — Jordan\u2019s Paycheck', 'paycheck', 2900, 'checking');
    if (rnd() > 0.4) push(d(9 + Math.floor(rnd() * 12)), 'Upwork — Maya\u2019s Design Gig', 'freelance', 180 + Math.round(rnd() * 420), 'checking');
    if (rnd() > 0.6) push(d(24), 'Savings Interest — Meridian', 'other-income', 18 + Math.round(rnd() * 22), 'savings');
    // Fixed bills
    push(d(1), 'Rent — Maple Court Apt 4B', 'housing', -1850, 'checking');
    push(d(3), 'Little Oaks Daycare', 'kids', -980, 'checking');
    push(d(5), 'Northside Gym — family plan', 'health', -58, 'credit');
    push(d(8), 'Netflix Premium', 'subscriptions', -15.49, 'credit');
    push(d(11), 'Spotify Family', 'subscriptions', -16.99, 'credit');
    // Electric and water only appear as paid transactions in months the
    // bill is marked paid — otherwise the Bills page and the ledger would
    // disagree, and marking it paid would double-count it.
    const electricPaid = BILLS.find((b) => b.id === 'b-electric').paidMonths.includes(month);
    if (electricPaid) push(d(12), 'City Power & Light', 'utilities', -(108 + Math.round(rnd() * 54)), 'checking');
    push(d(15), 'Fiber Internet 500 Mbps', 'utilities', -79, 'checking');
    push(d(18), 'Car Insurance — Geico', 'transport', -142, 'checking');
    const waterPaid = BILLS.find((b) => b.id === 'b-water').paidMonths.includes(month);
    if (waterPaid) push(d(20), 'Water & Sewer Dept', 'utilities', -(52 + Math.round(rnd() * 26)), 'checking');
    push(d(22), 'Mobile — two lines', 'utilities', -112, 'checking');
    // Weekly grocery shop — the household's real rhythm, so monthly grocery
    // totals stay realistic instead of swinging with the random scatter.
    const shops = [['Whole Foods Market', 2], ['Trader Joe\u2019s', 9], ['Costco Wholesale', 16], ['Safeway', 23]];
    for (const [store, base] of shops) {
      const day = Math.min(dim, base + Math.floor(rnd() * 3));
      push(d(day), store, 'groceries', -(95 + rnd() * 70), rnd() > 0.5 ? 'credit' : 'checking');
    }
    // Savings transfers + goal contributions
    push(d(2), 'Auto-transfer to Family Savings', 'other-income', -400, 'checking', 'Monthly savings transfer');
    if (month >= '2026-09') push(d(16), 'Leo\u2019s College Fund — $150', 'kids', -150, 'checking', 'Automatic goal contribution');
    // Everyday scatter: 20–27 purchases a month (groceries are mostly
    // covered by the weekly shop above, so the scatter stays varied).
    const count = 20 + Math.floor(rnd() * 8);
    const usedDays = new Set();
    for (let i = 0; i < count; i++) {
      const [merchant, cat, lo, hi] = pickWeighted(rnd, MERCHANTS);
      let day = 1 + Math.floor(rnd() * dim);
      if (usedDays.has(day) && rnd() > 0.5) day = 1 + Math.floor(rnd() * dim);
      usedDays.add(day);
      const amount = lo + rnd() * (hi - lo);
      const account = rnd() > 0.55 ? 'credit' : 'checking';
      push(d(day), merchant, cat, -Math.round(amount * 100) / 100, account);
    }
  });
  txns.sort((a, b) => (a.date < b.date ? 1 : -1));
  return txns;
}

export function seedState() {
  return {
    version: 1,
    household: 'The Rivera Household',
    members: ['Maya Rivera', 'Jordan Rivera', 'Leo Rivera (7)'],
    accounts: JSON.parse(JSON.stringify(ACCOUNTS)),
    budgets: { ...BUDGETS },
    rollover: { ...ROLLOVER },
    goals: JSON.parse(JSON.stringify(GOALS)),
    bills: JSON.parse(JSON.stringify(BILLS)),
    transactions: generateTransactions(),
    month: CURRENT_MONTH,
  };
}
