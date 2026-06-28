import { Router } from "express";
import { query } from "../db/pool.js";

export const crmRouter = Router();

const moduleTables = {
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

const stateTables = {
  smartInventory: "sc_smart_inventory_state",
  inventory: "sc_inventory_state"
};

const tableNames = [...Object.values(moduleTables), ...Object.values(stateTables)];

async function ensureCrmTables() {
  await query(`
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
}

const getTable = resource => moduleTables[resource] || stateTables[resource] || "";

const recordId = (resource, body = {}) => String(body.id ?? body.record_id ?? body.orderId ?? body.invoiceNo ?? body.code ?? `${resource}-${Date.now()}`);

crmRouter.use(async (_req, _res, next) => {
  try {
    await ensureCrmTables();
    next();
  } catch (error) {
    next(error);
  }
});

crmRouter.get("/status", async (_req, res, next) => {
  try {
    const result = {};
    for (const table of tableNames) {
      const rows = await query(`select count(*)::int as count, max(updated_at) as last_updated from ${table}`);
      result[table] = rows[0];
    }
    res.json({ ok: true, database: "connected", tables: result });
  } catch (error) {
    next(error);
  }
});

crmRouter.get("/:resource", async (req, res, next) => {
  try {
    const table = getTable(req.params.resource);
    if (!table) return res.status(404).json({ error: "Unknown CRM resource" });
    const rows = await query(`select record_id, data, updated_at from ${table} order by updated_at desc, record_id asc`);
    if (stateTables[req.params.resource]) return res.json(rows[0]?.data || {});
    res.json(rows.map(row => ({ record_id: row.record_id, ...row.data, updated_at: row.updated_at })));
  } catch (error) {
    next(error);
  }
});

crmRouter.post("/:resource", async (req, res, next) => {
  try {
    const table = getTable(req.params.resource);
    if (!table) return res.status(404).json({ error: "Unknown CRM resource" });
    const id = stateTables[req.params.resource] ? "state" : recordId(req.params.resource, req.body);
    const rows = await query(
      `insert into ${table} (record_id, data, updated_at)
       values ($1, $2::jsonb, now())
       on conflict (record_id) do update set data = excluded.data, updated_at = now()
       returning record_id, data, updated_at`,
      [id, JSON.stringify(req.body || {})]
    );
    res.status(201).json({ ok: true, record: rows[0] });
  } catch (error) {
    next(error);
  }
});

crmRouter.patch("/:resource/:id", async (req, res, next) => {
  try {
    const table = moduleTables[req.params.resource];
    if (!table) return res.status(404).json({ error: "Unknown CRM resource" });
    const rows = await query(
      `update ${table}
       set data = data || $2::jsonb, updated_at = now()
       where record_id = $1
       returning record_id, data, updated_at`,
      [req.params.id, JSON.stringify(req.body || {})]
    );
    if (!rows[0]) return res.status(404).json({ error: "Record not found" });
    res.json({ ok: true, record: rows[0] });
  } catch (error) {
    next(error);
  }
});

crmRouter.delete("/:resource/:id", async (req, res, next) => {
  try {
    const table = moduleTables[req.params.resource];
    if (!table) return res.status(404).json({ error: "Unknown CRM resource" });
    const rows = await query(`delete from ${table} where record_id = $1 returning record_id`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Record not found" });
    res.json({ ok: true, deleted: rows[0].record_id });
  } catch (error) {
    next(error);
  }
});
