create extension if not exists pgcrypto;

do $$ begin
  create type user_role as enum ('operator', 'manager');
exception when duplicate_object then null; end $$;

alter type user_role add value if not exists 'management';
alter type user_role add value if not exists 'salesman';
alter type user_role add value if not exists 'production';
alter type user_role add value if not exists 'channel_partner';

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  login_id text unique,
  password_hash text not null,
  role user_role not null,
  linked_entity_id text,
  active boolean not null default true,
  session_version integer not null default 0,
  created_at timestamptz not null default now()
);

alter table users add column if not exists login_id text unique;
alter table users add column if not exists linked_entity_id text;
alter table users add column if not exists session_version integer not null default 0;

create table if not exists salesmen (
  id bigserial primary key,
  name text not null,
  mobile text not null unique,
  email text,
  joining_date date,
  territory text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists leads (
  id bigserial primary key,
  name text not null,
  mobile text not null unique,
  alternate_mobile text,
  email text unique,
  source text not null check (source in ('Google Ads','JustDial','Referral','Walk-in','Social Media','Other')),
  product_interest text not null,
  location text,
  budget numeric(12,2),
  salesman_id bigint references salesmen(id),
  status text not null default 'New',
  priority text not null default 'Warm',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists inventory_items (
  id bigserial primary key,
  item_name text not null,
  category text not null,
  unit text not null,
  current_stock numeric(12,2) not null default 0,
  minimum_stock numeric(12,2) not null default 0,
  supplier_name text,
  last_purchase_price numeric(12,2),
  last_purchase_date date,
  created_at timestamptz not null default now()
);

create table if not exists stock_movements (
  id bigserial primary key,
  inventory_item_id bigint not null references inventory_items(id),
  direction text not null check (direction in ('IN','OUT')),
  quantity numeric(12,2) not null check (quantity > 0),
  reason text,
  reference_id text,
  created_at timestamptz not null default now()
);

create table if not exists finished_goods (
  id bigserial primary key,
  product_name text not null,
  variant text,
  unit text not null default 'pcs',
  quantity_in_stock numeric(12,2) not null default 0,
  production_date date,
  reserved_for_orders numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id text primary key default ('ORD-' || upper(substr(gen_random_uuid()::text, 1, 8))),
  lead_id bigint references leads(id),
  customer_name text not null,
  mobile text not null unique,
  items jsonb not null default '[]'::jsonb,
  discount numeric(12,2) not null default 0,
  final_amount numeric(12,2) not null default 0,
  advance_paid numeric(12,2) not null default 0,
  balance_due numeric(12,2) not null default 0,
  delivery_date date,
  installation_required boolean not null default false,
  installer text,
  status text not null default 'Pending',
  created_at timestamptz not null default now()
);

create table if not exists bom_items (
  id bigserial primary key,
  product_name text not null,
  inventory_item_id bigint not null references inventory_items(id),
  quantity numeric(12,2) not null,
  unit text not null
);

create table if not exists work_orders (
  id text primary key default ('WO-' || upper(substr(gen_random_uuid()::text, 1, 8))),
  order_id text references orders(id),
  product_name text not null,
  quantity numeric(12,2) not null,
  raw_materials jsonb not null default '[]'::jsonb,
  assigned_staff text,
  start_date date,
  expected_completion_date date,
  status text not null default 'Pending',
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists ux_work_orders_order_product_active
  on work_orders(order_id, product_name)
  where status <> 'Cancelled';

create table if not exists followups (
  id bigserial primary key,
  lead_id bigint not null references leads(id),
  salesman_id bigint references salesmen(id),
  due_at timestamptz not null,
  type text not null check (type in ('Call','WhatsApp','Visit','Email')),
  outcome text,
  next_action text,
  next_followup_at timestamptz,
  status text not null default 'Pending',
  notes text,
  created_at timestamptz not null default now()
);

create unique index if not exists ux_followups_open_lead
  on followups(lead_id)
  where status <> 'Completed';

create table if not exists payments (
  id bigserial primary key,
  order_id text not null references orders(id),
  paid_on date not null default current_date,
  amount numeric(12,2) not null check (amount > 0),
  mode text not null check (mode in ('Cash','UPI','Bank Transfer','Cheque')),
  notes text,
  created_at timestamptz not null default now()
);

create unique index if not exists ux_payments_order_date_amount
  on payments(order_id, paid_on, amount);

create table if not exists expenses (
  id bigserial primary key,
  spent_on date not null default current_date,
  category text not null,
  description text,
  amount numeric(12,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create table if not exists idempotency_keys (
  key text not null,
  scope text not null,
  request_hash text,
  response_status integer,
  response_body jsonb,
  created_at timestamptz not null default now(),
  primary key (key, scope)
);

create table if not exists audit_logs (
  id bigserial primary key,
  event text not null,
  source text not null,
  actor_id uuid references users(id),
  duplicate_attempt boolean not null default false,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists login_attempts (
  id bigserial primary key,
  login_id text not null,
  role text,
  success boolean not null default false,
  failure_reason text,
  user_id uuid references users(id),
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists app_state (
  key text primary key,
  value jsonb not null default 'null'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists sc_leads (
  record_id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists sc_orders (
  record_id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists sc_followups (
  record_id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists sc_payments (
  record_id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists sc_salesmen (
  record_id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists sc_channel_partners (
  record_id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists sc_bills (
  record_id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists sc_purchases (
  record_id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists sc_work_orders (
  record_id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists sc_expenses (
  record_id text primary key,
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

create index if not exists idx_leads_source on leads(source);
create index if not exists idx_leads_status on leads(status);
create index if not exists idx_followups_due_at on followups(due_at);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_work_orders_expected on work_orders(expected_completion_date);
create unique index if not exists ux_leads_mobile on leads(mobile);
create unique index if not exists ux_leads_email_present on leads(lower(email)) where email is not null and email <> '';
create unique index if not exists ux_orders_mobile on orders(mobile);
create unique index if not exists ux_orders_lead_present on orders(lead_id) where lead_id is not null;
create unique index if not exists ux_salesmen_mobile on salesmen(mobile);
create unique index if not exists ux_salesmen_email_present on salesmen(lower(email)) where email is not null and email <> '';
create index if not exists idx_sc_leads_data_gin on sc_leads using gin (data);
create index if not exists idx_sc_orders_data_gin on sc_orders using gin (data);
create index if not exists idx_sc_payments_data_gin on sc_payments using gin (data);
create index if not exists idx_sc_expenses_data_gin on sc_expenses using gin (data);
