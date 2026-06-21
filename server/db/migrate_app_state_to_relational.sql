begin;

insert into sc_salesmen (id, name, mobile, email, area, login_id, initials, joining, active, data, updated_at)
select
  value->>'id',
  value->>'name',
  value->>'mobile',
  value->>'email',
  value->>'area',
  value->>'loginId',
  value->>'initials',
  nullif(value->>'joining','')::date,
  coalesce((value->>'active')::boolean, true),
  value,
  now()
from app_state s
cross join lateral jsonb_array_elements(case when jsonb_typeof(s.value)='array' then s.value else '[]'::jsonb end) value
where s.key='salesmen' and value ? 'id'
on conflict (id) do update set
  name=excluded.name, mobile=excluded.mobile, email=excluded.email, area=excluded.area,
  login_id=excluded.login_id, initials=excluded.initials, joining=excluded.joining,
  active=excluded.active, data=excluded.data, updated_at=now();

insert into sc_channel_partners (id, name, owner, mobile, email, city, category, login_id, balance, data, updated_at)
select
  value->>'id',
  value->>'name',
  value->>'owner',
  value->>'mobile',
  value->>'email',
  value->>'city',
  value->>'category',
  value->>'loginId',
  nullif(value->>'balance','')::numeric,
  value,
  now()
from app_state s
cross join lateral jsonb_array_elements(case when jsonb_typeof(s.value)='array' then s.value else '[]'::jsonb end) value
where s.key='channelPartners' and value ? 'id'
on conflict (id) do update set
  name=excluded.name, owner=excluded.owner, mobile=excluded.mobile, email=excluded.email,
  city=excluded.city, category=excluded.category, login_id=excluded.login_id,
  balance=excluded.balance, data=excluded.data, updated_at=now();

insert into sc_leads (id, name, mobile, email, source, product, location, status, priority, salesman_id, channel_partner_id, created_on, updated_on, data, updated_at)
select
  value->>'id',
  value->>'name',
  value->>'mobile',
  value->>'email',
  value->>'source',
  value->>'product',
  value->>'location',
  value->>'status',
  value->>'priority',
  case when exists(select 1 from sc_salesmen sm where sm.id=value->>'salesman') then value->>'salesman' end,
  case when exists(select 1 from sc_channel_partners cp where cp.id=value->>'channelPartnerId') then value->>'channelPartnerId' end,
  nullif(value->>'created','')::date,
  nullif(value->>'updated','')::date,
  value,
  now()
from app_state s
cross join lateral jsonb_array_elements(case when jsonb_typeof(s.value)='array' then s.value else '[]'::jsonb end) value
where s.key='leads' and value ? 'id'
on conflict (id) do update set
  name=excluded.name, mobile=excluded.mobile, email=excluded.email, source=excluded.source,
  product=excluded.product, location=excluded.location, status=excluded.status,
  priority=excluded.priority, salesman_id=excluded.salesman_id,
  channel_partner_id=excluded.channel_partner_id, created_on=excluded.created_on,
  updated_on=excluded.updated_on, data=excluded.data, updated_at=now();

insert into sc_orders (id, lead_id, customer, mobile, status, product, final_amount, advance, balance, partner_id, created_on, production_date, installation_date, data, updated_at)
select
  value->>'id',
  case when exists(select 1 from sc_leads l where l.id=value->>'leadId') then value->>'leadId' end,
  value->>'customer',
  value->>'mobile',
  value->>'status',
  coalesce(value->>'product', value->>'productType'),
  nullif(value->>'final','')::numeric,
  nullif(value->>'advance','')::numeric,
  nullif(value->>'balance','')::numeric,
  case when exists(select 1 from sc_channel_partners cp where cp.id=value->>'partnerId') then value->>'partnerId' end,
  nullif(value->>'created','')::date,
  nullif(value->>'productionDate','')::date,
  nullif(value->>'installationDate','')::date,
  value,
  now()
from app_state s
cross join lateral jsonb_array_elements(case when jsonb_typeof(s.value)='array' then s.value else '[]'::jsonb end) value
where s.key='orders' and value ? 'id'
on conflict (id) do update set
  lead_id=excluded.lead_id, customer=excluded.customer, mobile=excluded.mobile,
  status=excluded.status, product=excluded.product, final_amount=excluded.final_amount,
  advance=excluded.advance, balance=excluded.balance, partner_id=excluded.partner_id,
  created_on=excluded.created_on, production_date=excluded.production_date,
  installation_date=excluded.installation_date, data=excluded.data, updated_at=now();

insert into sc_order_items (id, order_id, line_index, product_name, product_type, material, color, code, qty, sqft, rate, amount, data)
select
  concat(o.value->>'id','-', item.ordinality-1),
  o.value->>'id',
  item.ordinality-1,
  item.value->>'name',
  item.value->>'type',
  item.value->>'material',
  item.value->>'color',
  item.value->>'code',
  nullif(item.value->>'qty','')::numeric,
  nullif(coalesce(item.value->>'sqft', item.value->>'actualSqft', item.value->>'chargeableSqft'),'')::numeric,
  nullif(coalesce(item.value->>'rate', item.value->>'unitPrice'),'')::numeric,
  nullif(coalesce(item.value->>'amount', item.value->>'total'),'')::numeric,
  item.value
from app_state s
cross join lateral jsonb_array_elements(case when jsonb_typeof(s.value)='array' then s.value else '[]'::jsonb end) o(value)
cross join lateral jsonb_array_elements(case when jsonb_typeof(o.value->'products')='array' then o.value->'products' else '[]'::jsonb end) with ordinality item(value, ordinality)
where s.key='orders' and o.value ? 'id'
on conflict (id) do update set
  product_name=excluded.product_name, product_type=excluded.product_type, material=excluded.material,
  color=excluded.color, code=excluded.code, qty=excluded.qty, sqft=excluded.sqft,
  rate=excluded.rate, amount=excluded.amount, data=excluded.data;

insert into sc_work_orders (id, order_id, product, qty, staff, start_date, end_date, status, data, updated_at)
select
  value->>'id',
  case when exists(select 1 from sc_orders o where o.id=value->>'orderId') then value->>'orderId' end,
  value->>'product',
  nullif(value->>'qty','')::numeric,
  value->>'staff',
  nullif(value->>'start','')::date,
  nullif(value->>'end','')::date,
  value->>'status',
  value,
  now()
from app_state s
cross join lateral jsonb_array_elements(case when jsonb_typeof(s.value)='array' then s.value else '[]'::jsonb end) value
where s.key='workOrders' and value ? 'id'
on conflict (id) do update set
  order_id=excluded.order_id, product=excluded.product, qty=excluded.qty, staff=excluded.staff,
  start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status,
  data=excluded.data, updated_at=now();

insert into sc_followups (id, lead_id, salesman_id, date, type, outcome, reason, status, notes, data, updated_at)
select
  value->>'id',
  case when exists(select 1 from sc_leads l where l.id=value->>'leadId') then value->>'leadId' end,
  case when exists(select 1 from sc_salesmen sm where sm.id=value->>'smId') then value->>'smId' end,
  nullif(value->>'date','')::date,
  value->>'type',
  value->>'outcome',
  value->>'reason',
  value->>'status',
  value->>'notes',
  value,
  now()
from app_state s
cross join lateral jsonb_array_elements(case when jsonb_typeof(s.value)='array' then s.value else '[]'::jsonb end) value
where s.key='followups' and value ? 'id'
on conflict (id) do update set
  lead_id=excluded.lead_id, salesman_id=excluded.salesman_id, date=excluded.date,
  type=excluded.type, outcome=excluded.outcome, reason=excluded.reason,
  status=excluded.status, notes=excluded.notes, data=excluded.data, updated_at=now();

insert into sc_payments (id, order_id, lead_id, amount, mode, paid_on, notes, data, updated_at)
select
  value->>'id',
  case when exists(select 1 from sc_orders o where o.id=value->>'orderId') then value->>'orderId' end,
  case when exists(select 1 from sc_leads l where l.id=value->>'leadId') then value->>'leadId' end,
  nullif(value->>'amount','')::numeric,
  value->>'mode',
  nullif(coalesce(value->>'date', value->>'paidOn'),'')::date,
  value->>'notes',
  value,
  now()
from app_state s
cross join lateral jsonb_array_elements(case when jsonb_typeof(s.value)='array' then s.value else '[]'::jsonb end) value
where s.key='payments' and value ? 'id'
on conflict (id) do update set
  order_id=excluded.order_id, lead_id=excluded.lead_id, amount=excluded.amount,
  mode=excluded.mode, paid_on=excluded.paid_on, notes=excluded.notes,
  data=excluded.data, updated_at=now();

insert into sc_bills (id, order_id, invoice_no, bill_type, bill_date, amount, taxable, gst_amount, cgst_rate, sgst_rate, igst_rate, customer_gstin, customer_state, supplier_state, data, updated_at)
select
  value->>'id',
  case when exists(select 1 from sc_orders o where o.id=value->>'orderId') then value->>'orderId' end,
  value->>'invoiceNo',
  value->>'type',
  nullif(value->>'date','')::date,
  nullif(value->>'amount','')::numeric,
  nullif(value->>'taxable','')::numeric,
  nullif(value->>'gstAmount','')::numeric,
  nullif(value->>'cgstRate','')::numeric,
  nullif(value->>'sgstRate','')::numeric,
  nullif(value->>'igstRate','')::numeric,
  value->>'customerGstin',
  value->>'customerState',
  value->>'supplierState',
  value,
  now()
from app_state s
cross join lateral jsonb_array_elements(case when jsonb_typeof(s.value)='array' then s.value else '[]'::jsonb end) value
where s.key='bills' and value ? 'id'
on conflict (id) do update set
  order_id=excluded.order_id, invoice_no=excluded.invoice_no, bill_type=excluded.bill_type,
  bill_date=excluded.bill_date, amount=excluded.amount, taxable=excluded.taxable,
  gst_amount=excluded.gst_amount, cgst_rate=excluded.cgst_rate, sgst_rate=excluded.sgst_rate,
  igst_rate=excluded.igst_rate, customer_gstin=excluded.customer_gstin,
  customer_state=excluded.customer_state, supplier_state=excluded.supplier_state,
  data=excluded.data, updated_at=now();

insert into sc_purchases (id, vendor, vendor_gstin, vendor_state, customer_state, invoice_no, invoice_date, amount, taxable, gst_amount, paid, balance, data, updated_at)
select
  value->>'id',
  value->>'vendor',
  value->>'vendorGstin',
  value->>'vendorState',
  value->>'customerState',
  value->>'invoiceNo',
  nullif(coalesce(value->>'invoiceDate', value->>'date'),'')::date,
  nullif(value->>'amount','')::numeric,
  nullif(value->>'taxable','')::numeric,
  nullif(value->>'gstAmount','')::numeric,
  nullif(value->>'paid','')::numeric,
  nullif(value->>'balance','')::numeric,
  value,
  now()
from app_state s
cross join lateral jsonb_array_elements(case when jsonb_typeof(s.value)='array' then s.value else '[]'::jsonb end) value
where s.key='purchases' and value ? 'id'
on conflict (id) do update set
  vendor=excluded.vendor, vendor_gstin=excluded.vendor_gstin, vendor_state=excluded.vendor_state,
  customer_state=excluded.customer_state, invoice_no=excluded.invoice_no,
  invoice_date=excluded.invoice_date, amount=excluded.amount, taxable=excluded.taxable,
  gst_amount=excluded.gst_amount, paid=excluded.paid, balance=excluded.balance,
  data=excluded.data, updated_at=now();

insert into sc_purchase_items (id, purchase_id, line_index, item, hsn, qty, rate, amount, data)
select
  concat(p.value->>'id','-', item.ordinality-1),
  p.value->>'id',
  item.ordinality-1,
  coalesce(item.value->>'item', item.value->>'name', item.value->>'description'),
  coalesce(item.value->>'hsn', item.value->>'hsnCode'),
  nullif(item.value->>'qty','')::numeric,
  nullif(item.value->>'rate','')::numeric,
  nullif(item.value->>'amount','')::numeric,
  item.value
from app_state s
cross join lateral jsonb_array_elements(case when jsonb_typeof(s.value)='array' then s.value else '[]'::jsonb end) p(value)
cross join lateral jsonb_array_elements(case when jsonb_typeof(p.value->'items')='array' then p.value->'items' else '[]'::jsonb end) with ordinality item(value, ordinality)
where s.key='purchases' and p.value ? 'id'
on conflict (id) do update set
  item=excluded.item, hsn=excluded.hsn, qty=excluded.qty, rate=excluded.rate,
  amount=excluded.amount, data=excluded.data;

insert into sc_expenses (id, category, expense_date, description, reason, amount, data, updated_at)
select
  value->>'id',
  coalesce(value->>'cat', value->>'category', value->>'name'),
  nullif(value->>'date','')::date,
  coalesce(value->>'desc', value->>'description'),
  value->>'reason',
  nullif(value->>'amount','')::numeric,
  value,
  now()
from app_state s
cross join lateral jsonb_array_elements(case when jsonb_typeof(s.value)='array' then s.value else '[]'::jsonb end) value
where s.key='expenses' and value ? 'id'
on conflict (id) do update set
  category=excluded.category, expense_date=excluded.expense_date,
  description=excluded.description, reason=excluded.reason, amount=excluded.amount,
  data=excluded.data, updated_at=now();

insert into sc_inventory_items (id, source, kind, section, name, item, code, category, unit, stock, qty, min_stock, data, updated_at)
select concat('legacy-raw-', value->>'id'), 'inventory', 'raw', 'rawMaterials', value->>'name', value->>'item', value->>'code', value->>'cat', value->>'unit', nullif(value->>'stock','')::numeric, nullif(value->>'qty','')::numeric, nullif(value->>'min','')::numeric, value, now()
from app_state s cross join lateral jsonb_array_elements(case when jsonb_typeof(s.value->'rawMaterials')='array' then s.value->'rawMaterials' else '[]'::jsonb end) value
where s.key='inventory' and value ? 'id'
on conflict (id) do update set data=excluded.data, stock=excluded.stock, qty=excluded.qty, updated_at=now();

insert into sc_inventory_items (id, source, kind, section, name, item, code, category, unit, stock, qty, min_stock, data, updated_at)
select concat('legacy-finished-', value->>'id'), 'inventory', 'finished', 'finishedGoods', value->>'name', value->>'item', value->>'code', value->>'cat', value->>'unit', nullif(value->>'stock','')::numeric, nullif(value->>'qty','')::numeric, nullif(value->>'min','')::numeric, value, now()
from app_state s cross join lateral jsonb_array_elements(case when jsonb_typeof(s.value->'finishedGoods')='array' then s.value->'finishedGoods' else '[]'::jsonb end) value
where s.key='inventory' and value ? 'id'
on conflict (id) do update set data=excluded.data, stock=excluded.stock, qty=excluded.qty, updated_at=now();

insert into sc_inventory_items (id, source, kind, section, name, item, code, unit, stock, qty, data, updated_at)
select concat('smart-blind-roll-', value->>'id'), 'smartInventory', 'blind', 'blindRolls', value->>'name', value->>'item', value->>'code', 'm', nullif(value->>'remainingMetres','')::numeric, nullif(value->>'rolls','')::numeric, value, now()
from app_state s cross join lateral jsonb_array_elements(case when jsonb_typeof(s.value->'blindRolls')='array' then s.value->'blindRolls' else '[]'::jsonb end) value
where s.key='smartInventory' and value ? 'id'
on conflict (id) do update set data=excluded.data, stock=excluded.stock, qty=excluded.qty, updated_at=now();

insert into sc_inventory_items (id, source, kind, section, name, item, code, unit, stock, qty, data, updated_at)
select concat('smart-blind-component-', value->>'id'), 'smartInventory', 'blind', 'blindComponents', value->>'name', value->>'item', value->>'code', value->>'unit', nullif(value->>'stock','')::numeric, nullif(value->>'qty','')::numeric, value, now()
from app_state s cross join lateral jsonb_array_elements(case when jsonb_typeof(s.value->'blindComponents')='array' then s.value->'blindComponents' else '[]'::jsonb end) value
where s.key='smartInventory' and value ? 'id'
on conflict (id) do update set data=excluded.data, stock=excluded.stock, qty=excluded.qty, updated_at=now();

insert into sc_inventory_items (id, source, kind, section, name, item, code, unit, stock, qty, data, updated_at)
select concat('smart-mesh-component-', value->>'id'), 'smartInventory', 'mesh', 'meshComponents', value->>'name', value->>'item', value->>'code', value->>'unit', nullif(value->>'full','')::numeric, nullif(value->>'qty','')::numeric, value, now()
from app_state s cross join lateral jsonb_array_elements(case when jsonb_typeof(s.value->'meshComponents')='array' then s.value->'meshComponents' else '[]'::jsonb end) value
where s.key='smartInventory' and value ? 'id'
on conflict (id) do update set data=excluded.data, stock=excluded.stock, qty=excluded.qty, updated_at=now();

insert into sc_inventory_items (id, source, kind, section, name, item, code, unit, stock, qty, data, updated_at)
select concat('smart-mesh-hardware-', value->>'id'), 'smartInventory', 'mesh', 'meshHardware', value->>'name', value->>'item', value->>'code', value->>'unit', nullif(value->>'stock','')::numeric, nullif(value->>'qty','')::numeric, value, now()
from app_state s cross join lateral jsonb_array_elements(case when jsonb_typeof(s.value->'meshHardware')='array' then s.value->'meshHardware' else '[]'::jsonb end) value
where s.key='smartInventory' and value ? 'id'
on conflict (id) do update set data=excluded.data, stock=excluded.stock, qty=excluded.qty, updated_at=now();

insert into sc_inventory_movements (id, kind, movement_date, text, order_id, data)
select
  coalesce(value->>'id', gen_random_uuid()::text),
  value->>'kind',
  nullif(value->>'date','')::date,
  value->>'text',
  case when exists(select 1 from sc_orders o where o.id=value->>'orderId') then value->>'orderId' end,
  value
from app_state s
cross join lateral jsonb_array_elements(case when jsonb_typeof(s.value->'movements')='array' then s.value->'movements' else '[]'::jsonb end) value
where s.key='smartInventory'
on conflict (id) do update set kind=excluded.kind, movement_date=excluded.movement_date, text=excluded.text, order_id=excluded.order_id, data=excluded.data;

insert into sc_channel_partner_requests (id, partner_id, order_id, lead_id, request_date, customer, mobile, product, approval, stage, quotation_amount, paid, data, updated_at)
select
  req.value->>'id',
  cp.value->>'id',
  case when exists(select 1 from sc_orders o where o.id=req.value->>'orderId') then req.value->>'orderId' end,
  case when exists(select 1 from sc_leads l where l.id=req.value->>'leadId') then req.value->>'leadId' end,
  nullif(req.value->>'date','')::date,
  req.value->>'customer',
  req.value->>'mobile',
  req.value->>'product',
  req.value->>'approval',
  req.value->>'stage',
  nullif(req.value->>'quotationAmount','')::numeric,
  nullif(req.value->>'paid','')::numeric,
  req.value,
  now()
from app_state s
cross join lateral jsonb_array_elements(case when jsonb_typeof(s.value)='array' then s.value else '[]'::jsonb end) cp(value)
cross join lateral jsonb_array_elements(case when jsonb_typeof(cp.value->'requests')='array' then cp.value->'requests' else '[]'::jsonb end) req(value)
where s.key='channelPartners' and cp.value ? 'id' and req.value ? 'id'
on conflict (id) do update set
  partner_id=excluded.partner_id, order_id=excluded.order_id, lead_id=excluded.lead_id,
  request_date=excluded.request_date, customer=excluded.customer, mobile=excluded.mobile,
  product=excluded.product, approval=excluded.approval, stage=excluded.stage,
  quotation_amount=excluded.quotation_amount, paid=excluded.paid, data=excluded.data,
  updated_at=now();

insert into sc_reassignment_logs (id, log_date, old_salesman, new_salesman, lead_count, admin, data)
select value->>'id', value->>'date', value->>'oldSalesman', value->>'newSalesman', nullif(value->>'count','')::integer, value->>'admin', value
from app_state s
cross join lateral jsonb_array_elements(case when jsonb_typeof(s.value)='array' then s.value else '[]'::jsonb end) value
where s.key='reassignmentLogs' and value ? 'id'
on conflict (id) do update set data=excluded.data, log_date=excluded.log_date, old_salesman=excluded.old_salesman, new_salesman=excluded.new_salesman, lead_count=excluded.lead_count, admin=excluded.admin;

insert into sc_app_audit_logs (id, event, source, record_type, record_id, actor, data)
select coalesce(value->>'id', gen_random_uuid()::text), value->>'event', value->>'source', value->>'recordType', value->>'recordId', value->>'actor', value
from app_state s
cross join lateral jsonb_array_elements(case when jsonb_typeof(s.value)='array' then s.value else '[]'::jsonb end) value
where s.key='auditLogs'
on conflict (id) do update set event=excluded.event, source=excluded.source, record_type=excluded.record_type, record_id=excluded.record_id, actor=excluded.actor, data=excluded.data;

commit;
