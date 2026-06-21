create extension if not exists pgcrypto;

create table if not exists sc_salesmen (
  id text primary key,
  name text,
  mobile text,
  email text,
  area text,
  login_id text,
  initials text,
  joining date,
  active boolean not null default true,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sc_channel_partners (
  id text primary key,
  name text,
  owner text,
  mobile text,
  email text,
  city text,
  category text,
  login_id text,
  balance numeric(14,2),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sc_leads (
  id text primary key,
  name text,
  mobile text,
  email text,
  source text,
  product text,
  location text,
  status text,
  priority text,
  salesman_id text references sc_salesmen(id) on delete set null,
  channel_partner_id text references sc_channel_partners(id) on delete set null,
  created_on date,
  updated_on date,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sc_orders (
  id text primary key,
  lead_id text references sc_leads(id) on delete set null,
  customer text,
  mobile text,
  status text,
  product text,
  final_amount numeric(14,2),
  advance numeric(14,2),
  balance numeric(14,2),
  partner_id text references sc_channel_partners(id) on delete set null,
  created_on date,
  production_date date,
  installation_date date,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sc_order_items (
  id text primary key,
  order_id text not null references sc_orders(id) on delete cascade,
  line_index integer not null,
  product_name text,
  product_type text,
  material text,
  color text,
  code text,
  qty numeric(14,2),
  sqft numeric(14,2),
  rate numeric(14,2),
  amount numeric(14,2),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique(order_id, line_index)
);

create table if not exists sc_work_orders (
  id text primary key,
  order_id text references sc_orders(id) on delete set null,
  product text,
  qty numeric(14,2),
  staff text,
  start_date date,
  end_date date,
  status text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sc_followups (
  id text primary key,
  lead_id text references sc_leads(id) on delete set null,
  salesman_id text references sc_salesmen(id) on delete set null,
  date date,
  type text,
  outcome text,
  reason text,
  status text,
  notes text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sc_payments (
  id text primary key,
  order_id text references sc_orders(id) on delete set null,
  lead_id text references sc_leads(id) on delete set null,
  amount numeric(14,2),
  mode text,
  paid_on date,
  notes text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sc_bills (
  id text primary key,
  order_id text references sc_orders(id) on delete set null,
  invoice_no text,
  bill_type text,
  bill_date date,
  amount numeric(14,2),
  taxable numeric(14,2),
  gst_amount numeric(14,2),
  cgst_rate numeric(6,2),
  sgst_rate numeric(6,2),
  igst_rate numeric(6,2),
  customer_gstin text,
  customer_state text,
  supplier_state text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sc_purchases (
  id text primary key,
  vendor text,
  vendor_gstin text,
  vendor_state text,
  customer_state text,
  invoice_no text,
  invoice_date date,
  amount numeric(14,2),
  taxable numeric(14,2),
  gst_amount numeric(14,2),
  paid numeric(14,2),
  balance numeric(14,2),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sc_purchase_items (
  id text primary key,
  purchase_id text not null references sc_purchases(id) on delete cascade,
  line_index integer not null,
  item text,
  hsn text,
  qty numeric(14,2),
  rate numeric(14,2),
  amount numeric(14,2),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique(purchase_id, line_index)
);

create table if not exists sc_expenses (
  id text primary key,
  category text,
  expense_date date,
  description text,
  reason text,
  amount numeric(14,2),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sc_inventory_items (
  id text primary key,
  source text not null,
  kind text,
  section text,
  name text,
  item text,
  code text,
  category text,
  unit text,
  stock numeric(14,2),
  qty numeric(14,2),
  min_stock numeric(14,2),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sc_inventory_movements (
  id text primary key,
  kind text,
  movement_date date,
  text text,
  order_id text references sc_orders(id) on delete set null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sc_channel_partner_requests (
  id text primary key,
  partner_id text not null references sc_channel_partners(id) on delete cascade,
  order_id text references sc_orders(id) on delete set null,
  lead_id text references sc_leads(id) on delete set null,
  request_date date,
  customer text,
  mobile text,
  product text,
  approval text,
  stage text,
  quotation_amount numeric(14,2),
  paid numeric(14,2),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sc_reassignment_logs (
  id text primary key,
  log_date text,
  old_salesman text,
  new_salesman text,
  lead_count integer,
  admin text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sc_app_audit_logs (
  id text primary key,
  event text,
  source text,
  record_type text,
  record_id text,
  actor text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sc_leads_salesman on sc_leads(salesman_id);
create index if not exists idx_sc_leads_cp on sc_leads(channel_partner_id);
create index if not exists idx_sc_orders_lead on sc_orders(lead_id);
create index if not exists idx_sc_orders_partner on sc_orders(partner_id);
create index if not exists idx_sc_followups_lead on sc_followups(lead_id);
create index if not exists idx_sc_payments_order on sc_payments(order_id);
create index if not exists idx_sc_bills_order on sc_bills(order_id);
create index if not exists idx_sc_cp_requests_partner on sc_channel_partner_requests(partner_id);
create index if not exists idx_sc_inventory_source_kind on sc_inventory_items(source, kind, section);
