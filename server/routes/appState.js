import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { saveCollection } from "../db/saveCollection.js";

export const appStateRouter = Router();

const collectionTables = {
  leads: "sc_leads",
  orders: "sc_orders",
  followups: "sc_followups",
  payments: "sc_payments",
  salesmen: "sc_salesmen",
  channelPartners: "sc_channel_partners",
  bills: "sc_bills",
  purchases: "sc_purchases",
  workOrders: "sc_work_orders",
  expenses: "sc_expenses",
  reassignmentLogs: "sc_reassignment_logs",
  auditLogs: "sc_app_audit_logs"
};

const objectTables = {
  smartInventory: "sc_smart_inventory_state",
  inventory: "sc_inventory_state"
};

const allowedKeys = new Set([...Object.keys(collectionTables), ...Object.keys(objectTables)]);

let moduleTablesReady = false;

async function ensureModuleTables() {
  if (moduleTablesReady) return;
  await query(`
    create table if not exists app_state (
      key text primary key,
      value jsonb not null default 'null'::jsonb,
      updated_at timestamptz not null default now()
    );
    create table if not exists sc_smart_inventory_state (
      record_id text primary key default 'state',
      data jsonb not null default '{}'::jsonb,
      updated_at timestamptz not null default now()
    );
    create table if not exists sc_inventory_state (
      record_id text primary key default 'state',
      data jsonb not null default '{}'::jsonb,
      updated_at timestamptz not null default now()
    );
    create table if not exists sc_reassignment_logs (
      record_id text primary key,
      data jsonb not null default '{}'::jsonb,
      updated_at timestamptz not null default now()
    );
    create table if not exists sc_app_audit_logs (
      record_id text primary key,
      data jsonb not null default '{}'::jsonb,
      updated_at timestamptz not null default now()
    );
    create table if not exists sc_followups (
      record_id text primary key,
      data jsonb not null default '{}'::jsonb,
      updated_at timestamptz not null default now()
    );
  `);
  moduleTablesReady = true;
}

const camelMap = {
  sc_leads: r => ({ ...r, salesmanId: r.salesman_id, productInterest: r.product_interest }),
  sc_orders: r => ({ ...r, leadId: r.lead_id, customerName: r.customer_name, finalAmount: r.final_amount, advancePaid: r.advance_paid, balanceDue: r.balance_due, deliveryDate: r.delivery_date, installationRequired: r.installation_required }),
  sc_salesmen: r => ({ ...r, joiningDate: r.joining_date, loginId: r.login_id }),
  sc_channel_partners: r => ({ ...r, loginId: r.login_id }),
  sc_payments: r => ({ ...r, orderId: r.order_id, paidOn: r.paid_on }),
  sc_expenses: r => ({ ...r, spentOn: r.spent_on }),
  sc_purchases: r => ({ ...r, itemName: r.item_name, unitPrice: r.unit_price, totalAmount: r.total_amount, purchaseDate: r.purchase_date }),
  sc_bills: r => ({ ...r, dueDate: r.due_date }),
  sc_work_orders: r => ({ ...r, orderId: r.order_id, productName: r.product_name, rawMaterials: r.raw_materials, assignedStaff: r.assigned_staff, startDate: r.start_date, expectedCompletionDate: r.expected_completion_date, completedAt: r.completed_at }),
};

async function readCollection(table) {
  try {
    const rows = await query(`select * from ${table} order by updated_at asc`);
    const remap = camelMap[table];
    return remap ? rows.map(remap) : rows;
  } catch (error) {
    console.error(`readCollection failed for ${table}:`, error.message);
    return [];
  }
}

async function readObject(table) {
  try {
    const rows = await query(`select data from ${table} where record_id = 'state' limit 1`);
    return rows[0]?.data || null;
  } catch (error) {
    console.error(`readObject failed for ${table}:`, error.message);
    return null;
  }
}

async function saveObject(table, value) {
  const rows = await query(
    `insert into ${table} (record_id, data, updated_at)
     values ('state', $1::jsonb, now())
     on conflict (record_id) do update set data = excluded.data, updated_at = now()
     returning record_id, updated_at`,
    [JSON.stringify(value && typeof value === "object" ? value : {})]
  );
  return rows;
}

// For tables that are NOT in saveCollection (followups, reassignmentLogs, auditLogs)
// we fall back to the old blob-based upsert
async function saveBlobCollection(key, table, records) {
  const list = Array.isArray(records) ? records : [];
  const stableId = (record, index) => {
    const explicitId = record?.id ?? record?.orderId ?? record?.invoiceNo ?? record?.code;
    return String(explicitId || `${key}-${index + 1}`);
  };
  const ids = list.map((record, index) => stableId(record, index));

  if (ids.length) {
    await query(`delete from ${table} where not (record_id = any($1::text[]))`, [ids]);
  } else {
    await query(`delete from ${table}`);
  }

  const saved = [];
  for (let index = 0; index < list.length; index++) {
    const record = list[index] || {};
    const recordId = ids[index];
    const rows = await query(
      `insert into ${table} (record_id, data, updated_at)
       values ($1, $2::jsonb, now())
       on conflict (record_id) do update set data = excluded.data, updated_at = now()
       returning record_id, updated_at`,
      [recordId, JSON.stringify(record)]
    );
    saved.push(rows[0]);
  }
  return saved;
}

// Keys handled by structured saveCollection
const structuredKeys = new Set([
  "leads", "salesmen", "channelPartners", "orders",
  "payments", "expenses", "purchases", "bills", "workOrders"
]);

// Keys that still use blob storage (no structured columns yet)
const blobKeys = new Set(["followups", "reassignmentLogs", "auditLogs"]);

appStateRouter.use(requireAuth);

appStateRouter.get("/", async (_req, res, next) => {
  try {
    await ensureModuleTables();
    const state = {};

    for (const [key, table] of Object.entries(collectionTables)) {
      if (blobKeys.has(key)) {
        try {
          const rows = await query(`select data from ${table} order by updated_at asc, record_id asc`);
          state[key] = rows.map((row) => row.data);
        } catch {
          state[key] = [];
        }
      } else {
        state[key] = await readCollection(table);
      }
    }

    for (const [key, table] of Object.entries(objectTables)) {
      state[key] = await readObject(table);
    }

    console.log("Loaded ERP state from Neon", { storage: "module_tables" });
    res.json({ state, storage: "module_tables" });
  } catch (error) {
    console.error("GET /api/app-state failed", error);
    next(error);
  }
});

appStateRouter.put("/", async (req, res, next) => {
  try {
    await ensureModuleTables();
    const entries = Object.entries(req.body?.state || {}).filter(([key]) => allowedKeys.has(key));
    if (!entries.length) return res.status(400).json({ error: "No valid app state keys supplied" });

    const saved = [];
    for (const [key, value] of entries) {

      if (collectionTables[key]) {
        if (structuredKeys.has(key)) {
          const rows = await saveCollection(key, value);
          saved.push({ key, table: collectionTables[key], storage: "structured", count: rows.length });
        } else if (blobKeys.has(key)) {
          const rows = await saveBlobCollection(key, collectionTables[key], value);
          saved.push({ key, table: collectionTables[key], storage: "blob", count: rows.length });
        }
      }

      if (objectTables[key]) {
        await saveObject(objectTables[key], value);
        saved.push({ key, table: objectTables[key], storage: "object", count: 1 });
      }
    }

    console.log("Saved ERP state to Neon module tables", saved);
    res.json({ ok: true, storage: "module_tables", saved });
  } catch (error) {
    console.error("PUT /api/app-state failed", error);
    next(error);
  }
});
