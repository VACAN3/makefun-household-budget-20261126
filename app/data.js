// Ledger seed data — the Rivera household.
//
// Six months of believable household numbers, generated deterministically
// from fixed seeds so every first visit shows the same family. Nothing
// here ever changes after load: the household's edits live in
// localStorage, and this file stays the pristine starting point.

// ---------- small deterministic random source ----------
export function makeRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export const MONTHS = [
  '2026-06', '2026-07', '2026-08',
  '2026-09', '2026-10', '2026-11',
];
export const CURRENT_MONTH = '2026-11';

// ---------- categories: [id, label, colour, emoji, kind] ----------
const CATEGORY_ROWS = [
  ['groceries', 'Groceries', '#2e7d4f', '🛒', 'expense'],
  ['dining', 'Dining Out', '#d97706', '🍽️', 'expense'],
  ['housing', 'Housing', '#6d28d9', '🏠', 'expense'],
  ['utilities', 'Utilities', '#0284c7', '💡', 'expense'],
  ['transport', 'Transport', '#dc2626', '🚗', 'expense'],
  ['kids', 'Kids & School', '#db2777', '🧒', 'expense'],
  ['health', 'Health', '#059669', '🩺', 'expense'],
  ['entertainment', 'Entertainment', '#7c3aed', '🎬', 'expense'],
  ['shopping', 'Shopping', '#ea580c', '🛍️', 'expense'],
  ['subscriptions', 'Subscriptions', '#0891b2', '🔁', 'expense'],
  ['pets', 'Pets', '#65a30d', '🐾', 'expense'],
  ['education', 'Education', '#4f46e5', '📚', 'expense'],
  ['paycheck', 'Paycheck', '#15803d', '💼', 'income'],
  ['freelance', 'Freelance', '#15803d', '💻', 'income'],
  ['other-income', 'Other Income', '#15803d', '✉️', 'income'],
];
export const CATEGORIES = CATEGORY_ROWS.map(
  ([id, name, color, icon, kind]) => ({ id, name, color, icon, kind }),
);

// ---------- accounts: [id, label, institution, type, opening balance] ----------
const ACCOUNT_ROWS = [
  ['checking', 'Everyday Checking', 'Meridian Bank ··4821', 'checking', 4862.10],
  ['savings', 'Family Savings', 'Meridian Bank ··9034', 'savings', 18430.0],
  ['credit', 'Sapphire Credit Card', 'Chase ··1177', 'credit', -1284.55],
  ['cash', 'Cash Wallet', 'On hand', 'cash', 120.0],
];
export const ACCOUNTS = ACCOUNT_ROWS.map(
  ([id, name, bank, type, balance]) => ({ id, name, bank, type, balance }),
);

// ---------- monthly budget targets (November 2026 is the live month) ----------
const BUDGET_ROWS = [
  ['groceries', 900], ['dining', 320], ['housing', 1850], ['utilities', 400],
  ['transport', 380], ['kids', 1250], ['health', 200], ['entertainment', 150],
  ['shopping', 250], ['subscriptions', 85], ['pets', 90], ['education', 120],
];
export const BUDGETS = Object.fromEntries(BUDGET_ROWS);

// ---------- rollover: unspent October money carried into November ----------
const ROLLOVER_ROWS = [
  ['groceries', 42.18], ['dining', 0], ['housing', 0], ['utilities', 18.44],
  ['transport', 61.2], ['kids', 0], ['health', 74.1], ['entertainment', 23.5],
  ['shopping', 0], ['subscriptions', 0], ['pets', 12.75], ['education', 40.0],
];
export const ROLLOVER = Object.fromEntries(ROLLOVER_ROWS);

// ---------- savings goals: [id, name, emoji, target, saved, deadline, note] ----------
const GOAL_ROWS = [
  ['g-emergency', 'Emergency Fund', '🛟', 10000, 7400, '2027-06-30', 'Six months of essentials, for peace of mind.'],
  ['g-vacation', 'Summer Vacation — Oregon Coast', '🏖️', 3500, 1850, '2027-06-01', 'A week by the sea with Leo. Flights booked in March.'],
  ['g-car', 'New Car Down Payment', '🚙', 8000, 2300, '2027-09-30', 'Replace the 2014 Civic before winter 2027.'],
  ['g-college', "Leo's College Fund", '🎓', 25000, 4100, '2038-08-01', '$150 a month, every month, no exceptions.'],
  ['g-kitchen', 'Kitchen Renovation', '🍳', 6000, 900, '2027-12-31', 'New counters and a dishwasher that actually drains.'],
];
export const GOALS = GOAL_ROWS.map(
  ([id, name, emoji, target, saved, deadline, note]) =>
    ({ id, name, emoji, target, saved, deadline, note }),
);

// ---------- recurring bills ----------
// paidMonths: every month, except power and water which stop at October.
const ALL_SIX = MONTHS;
const THROUGH_OCT = MONTHS.slice(0, 5);
const BILL_ROWS = [
  ['b-rent', 'Rent — Maple Court Apt 4B', 1850, 1, 'housing', true, ALL_SIX],
  ['b-daycare', 'Little Oaks Daycare', 980, 3, 'kids', true, ALL_SIX],
  ['b-gym', 'Northside Gym — family plan', 58, 5, 'health', true, ALL_SIX],
  ['b-netflix', 'Netflix Premium', 15.49, 8, 'subscriptions', true, ALL_SIX],
  ['b-spotify', 'Spotify Family', 16.99, 11, 'subscriptions', true, ALL_SIX],
  ['b-electric', 'City Power & Light', 132, 12, 'utilities', false, THROUGH_OCT],
  ['b-internet', 'Fiber Internet 500 Mbps', 79, 15, 'utilities', true, ALL_SIX],
  ['b-insurance', 'Car Insurance — Geico', 142, 18, 'transport', true, ALL_SIX],
  ['b-water', 'Water & Sewer', 64, 20, 'utilities', false, THROUGH_OCT],
  ['b-phone', 'Mobile — two lines', 112, 22, 'utilities', true, ALL_SIX],
];
export const BILLS = BILL_ROWS.map(
  ([id, name, amount, day, category, autopay, paidMonths]) =>
    ({ id, name, amount, day, category, autopay, paidMonths }),
);

// ---------- everyday merchants ----------
// [merchant, category, cheapest, priciest, how often it shows up]
const MERCHANT_ROWS = [
  { shop: 'Whole Foods Market', cat: 'groceries', low: 42, high: 148, weight: 2 },
  { shop: 'Trader Joe’s', cat: 'groceries', low: 28, high: 96, weight: 2 },
  { shop: 'Costco Wholesale', cat: 'groceries', low: 88, high: 210, weight: 1 },
  { shop: 'Safeway', cat: 'groceries', low: 24, high: 88, weight: 2 },
  { shop: 'Farmers Market — Saturday', cat: 'groceries', low: 18, high: 54, weight: 2 },
  { shop: 'Chipotle', cat: 'dining', low: 14, high: 32, weight: 3 },
  { shop: 'The Corner Bistro', cat: 'dining', low: 38, high: 74, weight: 3 },
  { shop: 'Pizza Napoli', cat: 'dining', low: 22, high: 46, weight: 2 },
  { shop: 'Sushi Hana', cat: 'dining', low: 48, high: 92, weight: 2 },
  { shop: 'Blue Bottle Coffee', cat: 'dining', low: 6, high: 18, weight: 4 },
  { shop: 'Shell — Fuel', cat: 'transport', low: 32, high: 58, weight: 4 },
  { shop: 'Metro Transit Pass', cat: 'transport', low: 34, high: 34, weight: 1 },
  { shop: 'Uber', cat: 'transport', low: 12, high: 28, weight: 3 },
  { shop: 'Jiffy Lube — Oil Change', cat: 'transport', low: 68, high: 95, weight: 1 },
  { shop: 'CVS Pharmacy', cat: 'health', low: 12, high: 48, weight: 3 },
  { shop: 'Dr. Patel — Pediatric', cat: 'health', low: 35, high: 35, weight: 1 },
  { shop: 'AMC Theatres', cat: 'entertainment', low: 28, high: 52, weight: 2 },
  { shop: 'Bowling Alley — Family Night', cat: 'entertainment', low: 34, high: 48, weight: 1 },
  { shop: 'Target', cat: 'shopping', low: 32, high: 118, weight: 4 },
  { shop: 'Amazon', cat: 'shopping', low: 18, high: 96, weight: 4 },
  { shop: 'Old Navy — Leo', cat: 'shopping', low: 26, high: 64, weight: 2 },
  { shop: 'IKEA', cat: 'shopping', low: 45, high: 160, weight: 1 },
  { shop: 'Petco', cat: 'pets', low: 28, high: 62, weight: 2 },
  { shop: 'Chewy.com', cat: 'pets', low: 34, high: 58, weight: 1 },
  { shop: 'Scholastic Book Fair', cat: 'kids', low: 16, high: 38, weight: 1 },
  { shop: 'Leo’s Soccer Club', cat: 'kids', low: 45, high: 45, weight: 1 },
  { shop: 'Piano Lessons — Ms. Chen', cat: 'kids', low: 120, high: 120, weight: 1 },
  { shop: 'Udemy — Maya’s Course', cat: 'education', low: 24, high: 49, weight: 1 },
  { shop: 'Audible', cat: 'subscriptions', low: 14.95, high: 14.95, weight: 1 },
  { shop: 'iCloud Storage 200GB', cat: 'subscriptions', low: 2.99, high: 2.99, weight: 1 },
  { shop: 'City Power & Light', cat: 'utilities', low: 108, high: 162, weight: 1 },
  { shop: 'Water & Sewer Dept', cat: 'utilities', low: 52, high: 78, weight: 1 },
];

function pickMerchant(draw) {
  const totalWeight = MERCHANT_ROWS.reduce((sum, row) => sum + row.weight, 0);
  let roll = draw() * totalWeight;
  for (const row of MERCHANT_ROWS) {
    roll -= row.weight;
    if (roll <= 0) return row;
  }
  return MERCHANT_ROWS[MERCHANT_ROWS.length - 1];
}

function daysInMonth(month) {
  const [year, num] = month.split('-').map(Number);
  return new Date(year, num, 0).getDate();
}

// Fixed income and bills first, then a realistic scatter of everyday
// purchases. The draw order is fixed on purpose: the same seed always
// builds the same household, down to the last coffee.
export function buildTransactions() {
  const ledger = [];
  let serial = 1;

  MONTHS.forEach((month, monthIndex) => {
    const draw = makeRandom(202606 + monthIndex * 97);
    const days = daysInMonth(month);
    const on = (day) => `${month}-${String(day).padStart(2, '0')}`;
    const add = (date, merchant, category, amount, account, note) => {
      ledger.push({
        id: `t${serial++}`,
        date,
        merchant,
        category,
        amount: Math.round(amount * 100) / 100,
        account,
        note: note || '',
      });
    };

    // Paychecks — the money coming in.
    add(on(1), 'Northwind Studio — Maya’s Paycheck', 'paycheck', 3400, 'checking');
    add(on(15), 'Northwind Studio — Maya’s Paycheck', 'paycheck', 3400, 'checking');
    add(on(5), 'Harbor Logistics — Jordan’s Paycheck', 'paycheck', 2900, 'checking');
    add(on(20), 'Harbor Logistics — Jordan’s Paycheck', 'paycheck', 2900, 'checking');
    if (draw() > 0.4) {
      const gigDay = 9 + Math.floor(draw() * 12);
      const gigPay = 180 + Math.round(draw() * 420);
      add(on(gigDay), 'Upwork — Maya’s Design Gig', 'freelance', gigPay, 'checking');
    }
    if (draw() > 0.6) {
      const interest = 18 + Math.round(draw() * 22);
      add(on(24), 'Savings Interest — Meridian', 'other-income', interest, 'savings');
    }

    // Fixed bills — the money that has to go out.
    add(on(1), 'Rent — Maple Court Apt 4B', 'housing', -1850, 'checking');
    add(on(3), 'Little Oaks Daycare', 'kids', -980, 'checking');
    add(on(5), 'Northside Gym — family plan', 'health', -58, 'credit');
    add(on(8), 'Netflix Premium', 'subscriptions', -15.49, 'credit');
    add(on(11), 'Spotify Family', 'subscriptions', -16.99, 'credit');
    // Power and water only show as paid transactions in months the bill
    // itself is marked paid — otherwise the Bills page and the ledger
    // would disagree, and marking it paid would count it twice.
    const powerBill = BILLS.find((b) => b.id === 'b-electric');
    if (powerBill.paidMonths.includes(month)) {
      add(on(12), 'City Power & Light', 'utilities', -(108 + Math.round(draw() * 54)), 'checking');
    }
    add(on(15), 'Fiber Internet 500 Mbps', 'utilities', -79, 'checking');
    add(on(18), 'Car Insurance — Geico', 'transport', -142, 'checking');
    const waterBill = BILLS.find((b) => b.id === 'b-water');
    if (waterBill.paidMonths.includes(month)) {
      add(on(20), 'Water & Sewer Dept', 'utilities', -(52 + Math.round(draw() * 26)), 'checking');
    }
    add(on(22), 'Mobile — two lines', 'utilities', -112, 'checking');

    // The weekly grocery shop — the household's real rhythm, so monthly
    // grocery totals stay steady instead of swinging with the scatter.
    const weeklyShops = [
      ['Whole Foods Market', 2],
      ['Trader Joe’s', 9],
      ['Costco Wholesale', 16],
      ['Safeway', 23],
    ];
    for (const [store, anchor] of weeklyShops) {
      const shopDay = Math.min(days, anchor + Math.floor(draw() * 3));
      const shopTotal = -(95 + draw() * 70);
      const shopAccount = draw() > 0.5 ? 'credit' : 'checking';
      add(on(shopDay), store, 'groceries', shopTotal, shopAccount);
    }

    // Savings moves: the auto-transfer, plus the college fund from September.
    add(on(2), 'Auto-transfer to Family Savings', 'other-income', -400, 'checking', 'Monthly savings transfer');
    if (month >= '2026-09') {
      add(on(16), 'Leo’s College Fund — $150', 'kids', -150, 'checking', 'Automatic goal contribution');
    }

    // Everyday scatter: 20–27 purchases a month (groceries are mostly
    // covered by the weekly shop above, so the scatter stays varied).
    const scatterCount = 20 + Math.floor(draw() * 8);
    const busyDays = new Set();
    for (let i = 0; i < scatterCount; i++) {
      const pick = pickMerchant(draw);
      let day = 1 + Math.floor(draw() * days);
      if (busyDays.has(day) && draw() > 0.5) day = 1 + Math.floor(draw() * days);
      busyDays.add(day);
      const spend = pick.low + draw() * (pick.high - pick.low);
      const paidFrom = draw() > 0.55 ? 'credit' : 'checking';
      add(on(day), pick.shop, pick.cat, -Math.round(spend * 100) / 100, paidFrom);
    }
  });

  ledger.sort((a, b) => (a.date < b.date ? 1 : -1));
  return ledger;
}

export function freshHousehold() {
  return {
    version: 1,
    household: 'The Rivera Household',
    members: ['Maya Rivera', 'Jordan Rivera', 'Leo Rivera (7)'],
    accounts: JSON.parse(JSON.stringify(ACCOUNTS)),
    budgets: { ...BUDGETS },
    rollover: { ...ROLLOVER },
    goals: JSON.parse(JSON.stringify(GOALS)),
    bills: JSON.parse(JSON.stringify(BILLS)),
    transactions: buildTransactions(),
    month: CURRENT_MONTH,
  };
}
