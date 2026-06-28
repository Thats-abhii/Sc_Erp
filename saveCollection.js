// db/saveCollection.js
import { query } from "./pool.js";

// Maps collection key → { table, columns, values extractor }
const collectionMap = {
  leads: {
    table: "sc_leads",
    upsert: (r) => ({
      sql: `insert into sc_leads
              (id, name, mobile, email, source, product_interest, location, budget,
               salesman_id, status, priority, notes, updated_at)
            values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())
            on conflict (id) do update set
              name=excluded.name, mobile=excluded.mobile, email=excluded.email,
              source=excluded.source, product_interest=excluded.product_interest,
              location=excluded.location, budget=excluded.budget,
              salesman_id=excluded.salesman_id, status=excluded.status,
              priority=excluded.priority, notes=excluded.notes, updated_at=now()`,
      params: [
        r.id ?? r.leadId ?? `lead-${Date.now()}`,
        r.name ?? null, r.mobile ?? null, r.email ?? null,
        r.source ?? null, r.productInterest ?? r.product_interest ?? null,
        r.location ?? null, r.budget ? Number(r.budget) : null,
        r.salesmanId ?? r.salesman_id ?? null,
        r.status ?? "New", r.priority ?? "Warm", r.notes ?? null
      ]
    })
  },

  salesmen: {
    table: "sc_salesmen",
    upsert: (r) => ({
      sql: `insert into sc_salesmen
              (id, name, mobile, email, territory, joining_date, active, login_id, password, updated_at)
            values ($1,$2,$3,$4,$5,$6,$7,$8,$9,now())
            on conflict (id) do update set
              name=excluded.name, mobile=excluded.mobile, email=excluded.email,
              territory=excluded.territory, joining_date=excluded.joining_date,
              active=excluded.active, login_id=excluded.login_id,
              password=excluded.password, updated_at=now()`,
      params: [
        r.id ?? `sm-${Date.now()}`,
        r.name ?? null, r.mobile ?? null, r.email ?? null,
        r.territory ?? null, r.joiningDate ?? r.joining_date ?? null,
        r.active !== false,
        r.loginId ?? r.login_id ?? null, r.password ?? null
      ]
    })
  },

  channelPartners: {
    table: "sc_channel_partners",
    upsert: (r) => ({
      sql: `insert into sc_channel_partners
              (id, name, owner, mobile, email, location, login_id, password, active, updated_at)
            values ($1,$2,$3,$4,$5,$6,$7,$8,$9,now())
            on conflict (id) do update set
              name=excluded.name, owner=excluded.owner, mobile=excluded.mobile,
              email=excluded.email, location=excluded.location,
              login_id=excluded.login_id, password=excluded.password,
              active=excluded.active, updated_at=now()`,
      params: [
        r.id ?? r.code ?? `cp-${Date.now()}`,
        r.name ?? null, r.owner ?? null, r.mobile ?? null,
        r.email ?? null, r.location ?? null,
        r.loginId ?? r.login_id ?? null, r.password ?? null,
        r.active !== false
      ]
    })
  },

  orders: {
    table: "sc_orders",
    upsert: (r) => ({
      sql: `insert into sc_orders
              (id, lead_id, customer_name, mobile, items, discount, final_amount,
               advance_paid, balance_due, delivery_date, installation_required,
               installer, status, updated_at)
            values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now())
            on conflict (id) do update set
              lead_id=excluded.lead_id, customer_name=excluded.customer_name,
              mobile=excluded.mobile, items=excluded.items, discount=excluded.discount,
              final_amount=excluded.final_amount, advance_paid=excluded.advance_paid,
              balance_due=excluded.balance_due, delivery_date=excluded.delivery_date,
              installation_required=excluded.installation_required,
              installer=excluded.installer, status=excluded.status, updated_at=now()`,
      params: [
        r.id ?? r.orderId ?? `ord-${Date.now()}`,
        r.leadId ?? r.lead_id ?? null, r.customerName ?? r.customer_name ?? null,
        r.mobile ?? null, JSON.stringify(r.items ?? []),
        Number(r.discount ?? 0), Number(r.finalAmount ?? r.final_amount ?? 0),
        Number(r.advancePaid ?? r.advance_paid ?? 0),
        Number(r.balanceDue ?? r.balance_due ?? 0),
        r.deliveryDate ?? r.delivery_date ?? null,
        !!(r.installationRequired ?? r.installation_required),
        r.installer ?? null, r.status ?? "Pending"
      ]
    })
  },

  payments: {
    table: "sc_payments",
    upsert: (r) => ({
      sql: `insert into sc_payments (id, order_id, amount, mode, paid_on, notes, updated_at)
            values ($1,$2,$3,$4,$5,$6,now())
            on conflict (id) do update set
              order_id=excluded.order_id, amount=excluded.amount, mode=excluded.mode,
              paid_on=excluded.paid_on, notes=excluded.notes, updated_at=now()`,
      params: [
        r.id ?? `pay-${Date.now()}`,
        r.orderId ?? r.order_id ?? null,
        Number(r.amount ?? 0), r.mode ?? null,
        r.paidOn ?? r.paid_on ?? null, r.notes ?? null
      ]
    })
  },

  expenses: {
    table: "sc_expenses",
    upsert: (r) => ({
      sql: `insert into sc_expenses (id, category, description, amount, spent_on, updated_at)
            values ($1,$2,$3,$4,$5,now())
            on conflict (id) do update set
              category=excluded.category, description=excluded.description,
              amount=excluded.amount, spent_on=excluded.spent_on, updated_at=now()`,
      params: [
        r.id ?? `exp-${Date.now()}`,
        r.category ?? null, r.description ?? null,
        Number(r.amount ?? 0), r.spentOn ?? r.spent_on ?? null
      ]
    })
  },

  purchases: {
    table: "sc_purchases",
    upsert: (r) => ({
      sql: `insert into sc_purchases
              (id, supplier, item_name, quantity, unit, unit_price, total_amount, purchase_date, notes, updated_at)
            values ($1,$2,$3,$4,$5,$6,$7,$8,$9,now())
            on conflict (id) do update set
              supplier=excluded.supplier, item_name=excluded.item_name,
              quantity=excluded.quantity, unit=excluded.unit,
              unit_price=excluded.unit_price, total_amount=excluded.total_amount,
              purchase_date=excluded.purchase_date, notes=excluded.notes, updated_at=now()`,
      params: [
        r.id ?? `pur-${Date.now()}`,
        r.supplier ?? null, r.itemName ?? r.item_name ?? null,
        Number(r.quantity ?? 0), r.unit ?? null,
        Number(r.unitPrice ?? r.unit_price ?? 0),
        Number(r.totalAmount ?? r.total_amount ?? 0),
        r.purchaseDate ?? r.purchase_date ?? null, r.notes ?? null
      ]
    })
  },

  bills: {
    table: "sc_bills",
    upsert: (r) => ({
      sql: `insert into sc_bills (id, vendor, amount, due_date, paid, category, notes, updated_at)
            values ($1,$2,$3,$4,$5,$6,$7,now())
            on conflict (id) do update set
              vendor=excluded.vendor, amount=excluded.amount,
              due_date=excluded.due_date, paid=excluded.paid,
              category=excluded.category, notes=excluded.notes, updated_at=now()`,
      params: [
        r.id ?? r.invoiceNo ?? `bill-${Date.now()}`,
        r.vendor ?? null, Number(r.amount ?? 0),
        r.dueDate ?? r.due_date ?? null,
        !!r.paid, r.category ?? null, r.notes ?? null
      ]
    })
  },

  workOrders: {
    table: "sc_work_orders",
    upsert: (r) => ({
      sql: `insert into sc_work_orders
              (id, order_id, product_name, quantity, raw_materials, assigned_staff,
               start_date, expected_completion_date, status, completed_at, updated_at)
            values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now())
            on conflict (id) do update set
              order_id=excluded.order_id, product_name=excluded.product_name,
              quantity=excluded.quantity, raw_materials=excluded.raw_materials,
              assigned_staff=excluded.assigned_staff, start_date=excluded.start_date,
              expected_completion_date=excluded.expected_completion_date,
              status=excluded.status, completed_at=excluded.completed_at, updated_at=now()`,
      params: [
        r.id ?? `wo-${Date.now()}`,
        r.orderId ?? r.order_id ?? null, r.productName ?? r.product_name ?? null,
        Number(r.quantity ?? 0), JSON.stringify(r.rawMaterials ?? r.raw_materials ?? []),
        r.assignedStaff ?? r.assigned_staff ?? null,
        r.startDate ?? r.start_date ?? null,
        r.expectedCompletionDate ?? r.expected_completion_date ?? null,
        r.status ?? "Pending",
        r.completedAt ?? r.completed_at ?? null
      ]
    })
  }
};

export async function saveCollection(key, records) {
  const config = collectionMap[key];
  if (!config) {
    console.warn(`saveCollection: unknown key "${key}", skipping`);
    return [];
  }

  const list = Array.isArray(records) ? records : [];
  const { table, upsert } = config;

  // Delete records no longer in the list
  if (list.length > 0) {
    const ids = list.map((r, i) => {
      const { params } = upsert(r);
      return params[0] ?? `${key}-${i}`;
    });
    await query(`delete from ${table} where id <> all($1::text[])`, [ids]);
  } else {
    await query(`delete from ${table}`);
  }

  // Upsert each record
  const results = [];
  for (const record of list) {
    try {
      const { sql, params } = upsert(record);
      const rows = await query(sql, params);
      results.push(rows[0] ?? { id: params[0] });
    } catch (err) {
      console.error(`saveCollection error in ${table}:`, err.message, record);
    }
  }

  console.log(`✓ saveCollection: ${table} → ${results.length} records saved`);
  return results;
}