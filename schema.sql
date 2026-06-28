-- DROP old blob tables first
drop table if exists sc_leads cascade;
drop table if exists sc_salesmen cascade;
drop table if exists sc_channel_partners cascade;
drop table if exists sc_orders cascade;
drop table if exists sc_payments cascade;
drop table if exists sc_expenses cascade;
drop table if exists sc_purchases cascade;
drop table if exists sc_bills cascade;
drop table if exists sc_work_orders cascade;

-- LEADS
create table if not exists sc_leads (
  id          text primary key,
  name        text,
  mobile      text,
  email       text,
  source      text,
  product_interest text,
  location    text,
  budget      numeric(12,2),
  salesman_id text,
  status      text default 'New',
  priority    text default 'Warm',
  notes       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- SALESMEN
create table if not exists sc_salesmen (
  id           text primary key,
  name         text,
  mobile       text,
  email        text,
  territory    text,
  joining_date date,
  active       boolean default true,
  login_id     text,
  password     text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- CHANNEL PARTNERS
create table if not exists sc_channel_partners (
  id          text primary key,
  name        text,
  owner       text,
  mobile      text,
  email       text,
  location    text,
  login_id    text,
  password    text,
  active      boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ORDERS
create table if not exists sc_orders (
  id                    text primary key,
  lead_id               text,
  customer_name         text,
  mobile                text,
  items                 jsonb default '[]',
  discount              numeric(12,2) default 0,
  final_amount          numeric(12,2) default 0,
  advance_paid          numeric(12,2) default 0,
  balance_due           numeric(12,2) default 0,
  delivery_date         date,
  installation_required boolean default false,
  installer             text,
  status                text default 'Pending',
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- PAYMENTS
create table if not exists sc_payments (
  id         text primary key,
  order_id   text,
  amount     numeric(12,2),
  mode       text,
  paid_on    date,
  notes      text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- EXPENSES
create table if not exists sc_expenses (
  id          text primary key,
  category    text,
  description text,
  amount      numeric(12,2),
  spent_on    date,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- PURCHASES
create table if not exists sc_purchases (
  id           text primary key,
  supplier     text,
  item_name    text,
  quantity     numeric(12,2),
  unit         text,
  unit_price   numeric(12,2),
  total_amount numeric(12,2),
  purchase_date date,
  notes        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- BILLS
create table if not exists sc_bills (
  id           text primary key,
  vendor       text,
  amount       numeric(12,2),
  due_date     date,
  paid         boolean default false,
  category     text,
  notes        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- WORK ORDERS
create table if not exists sc_work_orders (
  id                      text primary key,
  order_id                text,
  product_name            text,
  quantity                numeric(12,2),
  raw_materials           jsonb default '[]',
  assigned_staff          text,
  start_date              date,
  expected_completion_date date,
  status                  text default 'Pending',
  completed_at            timestamptz,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);