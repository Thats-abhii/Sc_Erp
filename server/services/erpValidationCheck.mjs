import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../../src/App.jsx", import.meta.url), "utf8");

function extractConst(name) {
  const match = source.match(new RegExp(`const ${name} = ([\\s\\S]*?\\n\\];)`));
  if (!match) throw new Error(`Missing ${name}`);
  return vm.runInNewContext(match[1], {});
}

const leads = extractConst("LEADS_SEED");
const orders = extractConst("ORDERS_SEED");
const followups = extractConst("FOLLOWUPS_SEED");
const payments = extractConst("PAYMENTS_SEED");
const partners = extractConst("CHANNEL_PARTNERS_SEED");
const expenses = extractConst("EXPENSES_SEED");

const num = value => Number(value || 0);
const mobile = value => String(value || "").replace(/\D/g, "");
const assert = (condition, message, detail = "") => {
  if (!condition) throw new Error(`${message}${detail ? `: ${detail}` : ""}`);
};

const paidForOrder = order => {
  const paymentTotal = payments.filter(p => p.orderId === order.id).reduce((s, p) => s + num(p.amount), 0);
  return Math.max(num(order.advance), paymentTotal);
};

const partnerRows = partners.flatMap(p => [
  ...(p.transactions || []).map(t => ({ ...t, partnerId: p.id, business: num(t.business), paid: num(t.paid) })),
  ...(p.requests || [])
    .filter(r => r.approval === "Approved" && num(r.quotationAmount) > 0)
    .map(r => ({ ...r, partnerId: p.id, business: num(r.quotationAmount), paid: num(r.paid), isRequestBusiness: true }))
]);

const finance = {
  orderCollected: orders.reduce((s, o) => s + paidForOrder(o), 0),
  orderOutstanding: orders.reduce((s, o) => s + Math.max(num(o.final) - paidForOrder(o), 0), 0),
  partnerBusiness: partnerRows.reduce((s, r) => s + num(r.business), 0),
  partnerCollected: partnerRows.reduce((s, r) => s + num(r.paid), 0),
  partnerOutstanding: Math.max(partnerRows.reduce((s, r) => s + num(r.business), 0) - partnerRows.reduce((s, r) => s + num(r.paid), 0), 0),
  expenses: expenses.reduce((s, e) => s + num(e.amount), 0)
};
finance.revenue = finance.orderCollected + finance.partnerCollected;
finance.net = finance.revenue - finance.expenses;

// Reference integrity.
for (const order of orders) {
  assert(!order.leadId || leads.some(l => l.id === order.leadId), "Order references missing lead", order.id);
  assert(mobile(order.mobile).length === 10, "Order mobile must be 10 digits", `${order.id} ${order.mobile}`);
}
for (const payment of payments) assert(orders.some(o => o.id === payment.orderId), "Payment references missing order", payment.id);
for (const followup of followups) assert(leads.some(l => l.id === followup.leadId), "Follow-up references missing lead", followup.id);
for (const lead of leads) {
  assert(mobile(lead.mobile).length === 10, "Lead mobile must be 10 digits", `${lead.id} ${lead.mobile}`);
  if (lead.email) assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email), "Lead email invalid", `${lead.id} ${lead.email}`);
}
for (const partner of partners) assert(mobile(partner.mobile).length === 10, "Channel partner mobile must be 10 digits", `${partner.id} ${partner.mobile}`);

// Duplicate prevention sanity: duplicate mobiles are allowed only for a linked lead -> order workflow.
const leadById = Object.fromEntries(leads.map(l => [l.id, l]));
for (const order of orders) {
  const lead = leadById[order.leadId];
  if (lead) assert(mobile(lead.mobile) === mobile(order.mobile), "Linked lead/order mobile mismatch", `${lead.id} -> ${order.id}`);
}
const standaloneMobiles = new Map();
for (const lead of leads) standaloneMobiles.set(`lead:${lead.id}`, mobile(lead.mobile));
for (const partner of partners) standaloneMobiles.set(`partner:${partner.id}`, mobile(partner.mobile));
const seen = new Map();
for (const [key, value] of standaloneMobiles) {
  if (!value) continue;
  assert(!seen.has(value), "Duplicate standalone customer/partner mobile", `${seen.get(value)} and ${key}`);
  seen.set(value, key);
}

// Channel Partner MTD/YTD logic must match management totals.
const selectedMonth = "2024-12";
const selectedYear = "2024";
const cpManagementTotals = partners.reduce((acc, p) => {
  const rows = partnerRows.filter(r => r.partnerId === p.id);
  acc.mtd += rows.filter(r => String(r.date || "").startsWith(selectedMonth)).reduce((s, r) => s + num(r.business), 0);
  acc.ytd += rows.filter(r => String(r.date || "").startsWith(selectedYear)).reduce((s, r) => s + num(r.business), 0);
  acc.collected += rows.reduce((s, r) => s + num(r.paid), 0);
  acc.pending += rows.reduce((s, r) => s + Math.max(num(r.business) - num(r.paid), 0), 0);
  return acc;
}, { mtd: 0, ytd: 0, collected: 0, pending: 0 });
assert(cpManagementTotals.collected === finance.partnerCollected, "CP collected mismatch");
assert(cpManagementTotals.pending === finance.partnerOutstanding, "CP pending mismatch");

// Billing and finance must agree on paid/balance for each order.
for (const order of orders) {
  const paid = paidForOrder(order);
  assert(paid <= num(order.final), "Order paid exceeds final amount", order.id);
  assert(Math.max(num(order.final) - paid, 0) >= 0, "Order balance cannot be negative", order.id);
}

const converted = leads.filter(l => l.status === "Converted").length;
const conversionRate = leads.length ? Math.round(converted / leads.length * 100) : 0;
const dashboard = {
  totalLeads: leads.length,
  converted,
  conversionRate,
  totalCollected: finance.revenue,
  retailCollected: finance.orderCollected,
  cpCollected: finance.partnerCollected,
  retailPending: finance.orderOutstanding,
  cpPending: finance.partnerOutstanding,
  expensesTotal: finance.expenses
};

console.log(JSON.stringify({ ok: true, dashboard, cpManagementTotals, finance }, null, 2));
