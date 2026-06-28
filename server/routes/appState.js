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
const tableColumnCache = new Map();

async function ensureModuleTables() {
  if (moduleTablesReady) return;
  await query(`
    create table if not exists app_state (key text primary key, value jsonb not null default 'null'::jsonb, updated_at timestamptz not null default now());
    create table if not exists sc_leads (record_id text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
    create table if not exists sc_orders (record_id text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
    create table if not exists sc_followups (record_id text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
    create table if not exists sc_payments (record_id text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
    create table if not exists sc_salesmen (record_id text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
    create table if not exists sc_channel_partners (record_id text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
    create table if not exists sc_bills (record_id text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
    create table if not exists sc_purchases (record_id text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
    create table if not exists sc_work_orders (record_id text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
    create table if not exists sc_expenses (record_id text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
    create table if not exists sc_reassignment_logs (record_id text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
    create table if not exists sc_app_audit_logs (record_id text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
    create table if not exists sc_smart_inventory_state (record_id text primary key default 'state', data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
    create table if not exists sc_inventory_state (record_id text primary key default 'state', data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
  `);
  moduleTablesReady = true;
}

const stableRecordId = (key, record, index) => {
  const explicitId = record?.id ?? record?.orderId ?? record?.invoiceNo ?? record?.code;
  return String(explicitId || `${key}-${index + 1}`);
};

async function tableHasColumn(table, column) {
  const cacheKey = `${table}.${column}`;
  if (tableColumnCache.has(cacheKey)) return tableColumnCache.get(cacheKey);
  const rows = await query(
    `select 1
     from information_schema.columns
     where table_schema = 'public'
       and table_name = $1
       and column_name = $2
     limit 1`,
    [table, column]
  );
  const exists = !!rows[0];
  tableColumnCache.set(cacheKey, exists);
  return exists;
}

async function readCollection(table) {
  try {
    const rows = await query(`select * from ${table} order by updated_at asc`);
    return rows;
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

async function readLegacyAppState() {
  try {
    const rows = await query("select key, value, updated_at from app_state order by key");
    return {
      state: Object.fromEntries(rows.map((row) => [row.key, row.value])),
      updatedAt: Object.fromEntries(rows.map((row) => [row.key, row.updated_at]))
    };
  } catch (error) {
    console.error("Legacy app_state read failed; continuing with module tables", error);
    return { state: {}, updatedAt: {} };
  }
}

async function saveLegacyAppState(key, value) {
  try {
    const rows = await query(
      `insert into app_state (key, value, updated_at)
       values ($1, $2::jsonb, now())
       on conflict (key) do update set value = excluded.value, updated_at = now()
       returning key, updated_at`,
      [key, JSON.stringify(value ?? null)]
    );
    return rows[0];
  } catch (error) {
    console.error(`Legacy app_state save failed for ${key}; module table save will continue`, error);
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

appStateRouter.use(requireAuth);

appStateRouter.get("/", async (_req, res, next) => {
  try {
    await ensureModuleTables();
    const state = {};
    let relationalCount = 0;
    const legacy = await readLegacyAppState();

    for (const [key, table] of Object.entries(collectionTables)) {
      state[key] = await readCollection(table);
      if (!state[key].length && Array.isArray(legacy.state[key])) {
        state[key] = legacy.state[key];
      }
      relationalCount += state[key].length;
    }
    for (const [key, table] of Object.entries(objectTables)) {
      const value = await readObject(table);
      state[key] = value || legacy.state[key];
      if (state[key]) relationalCount += 1;
    }

    if (!relationalCount) {
      return res.json(legacy);
    }

    console.log("Loaded ERP state from Neon", {
      storage: relationalCount ? "module_tables" : "app_state",
      records: relationalCount
    });
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
      await saveLegacyAppState(key, value);

      if (collectionTables[key]) {
        const rows = await saveCollection(key, value);
        saved.push({ key, table: collectionTables[key], count: rows.length });
      }

      if (objectTables[key]) {
        await saveObject(objectTables[key], value);
        saved.push({ key, table: objectTables[key], count: 1 });
      }
    }

    console.log("Saved ERP state to Neon module tables", saved);
    res.json({ ok: true, storage: "module_tables", saved });
  } catch (error) {
    console.error("PUT /api/app-state failed", error);
    next(error);
  }
});