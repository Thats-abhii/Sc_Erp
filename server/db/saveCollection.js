// db/saveCollection.js
import { query } from "./pool.js";

const collectionMap = {
  leads: {
    table: "leads",
    upsert: (r) => ({
      sql: `INSERT INTO leads
              (name, mobile, alternate_mobile, email, source, product_interest,
               location, budget, salesman_id, status, priority, notes, updated_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())
            ON CONFLICT (mobile) DO UPDATE SET
              name=excluded.name,
              email=excluded.email,
              source=excluded.source,
              product_interest=excluded.product_interest,
              location=excluded.location,
              budget=excluded.budget,
              salesman_id=excluded.salesman_id,
              status=excluded.status,
              priority=excluded.priority,
              notes=excluded.notes,
              updated_at=now()
            RETURNING *`,
      params: [
        r.name ?? null,
        r.mobile ?? null,
        r.alternateMobile ?? r.alternate_mobile ?? null,
        r.email ?? null,
        r.source ?? "Other",
        r.productInterest ?? r.product_interest ?? null,
        r.location ?? null,
        r.budget ? Number(r.budget) : null,
        r.salesmanId ?? r.salesman_id ?? null,
        r.status ?? "New",
        r.priority ?? "Warm",
        r.notes ?? null
      ]
    })
  },

  salesmen: {
    table: "salesmen",
    upsert: (r) => ({
      sql: `INSERT INTO salesmen
              (name, mobile, email, territory, joining_date, active)
            VALUES ($1,$2,$3,$4,$5,$6)
            ON CONFLICT (mobile) DO UPDATE SET
              name=excluded.name,
              email=excluded.email,
              territory=excluded.territory,
              joining_date=excluded.joining_date,
              active=excluded.active
            RETURNING *`,
      params: [
        r.name ?? null,
        r.mobile ?? null,
        r.email ?? null,
        r.territory ?? null,
        r.joiningDate ?? r.joining_date ?? null,
        r.active !== false
      ]
    })
  },

  orders: {
    table: "orders",
    upsert: (r) => ({
      sql: `INSERT INTO orders
              (customer_name, mobile, items, discount, final_amount,
               advance_paid, balance_due, delivery_date,
               installation_required, installer, status)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            ON CONFLICT (mobile) DO UPDATE SET
              customer_name=excluded.customer_name,
              items=excluded.items,
              discount=excluded.discount,
              final_amount=excluded.final_amount,
              advance_paid=excluded.advance_paid,
              balance_due=excluded.balance_due,
              delivery_date=excluded.delivery_date,
              installation_required=excluded.installation_required,
              installer=excluded.installer,
              status=excluded.status
            RETURNING *`,
      params: [
        r.customerName ?? r.customer_name ?? null,
        r.mobile ?? null,
        JSON.stringify(r.items ?? []),
        Number(r.discount ?? 0),
        Number(r.finalAmount ?? r.final_amount ?? 0),
        Number(r.advancePaid ?? r.advance_paid ?? 0),
        Number(r.balanceDue ?? r.balance_due ?? 0),
        r.deliveryDate ?? r.delivery_date ?? null,
        !!(r.installationRequired ?? r.installation_required),
        r.installer ?? null,
        r.status ?? "Pending"
      ]
    })
  },

  payments: {
    table: "payments",
    upsert: (r) => ({
      sql: `INSERT INTO payments (order_id, amount, mode, paid_on, notes)
            VALUES ($1,$2,$3,$4,$5)
            ON CONFLICT (order_id, paid_on, amount) DO NOTHING
            RETURNING *`,
      params: [
        r.orderId ?? r.order_id ?? null,
        Number(r.amount ?? 0),
        r.mode ?? "Cash",
        r.paidOn ?? r.paid_on ?? null,
        r.notes ?? null
      ]
    })
  },

  expenses: {
    table: "expenses",
    upsert: (r) => ({
      sql: `INSERT INTO expenses (category, description, amount, spent_on)
            VALUES ($1,$2,$3,$4)
            ON CONFLICT DO NOTHING
            RETURNING *`,
      params: [
        r.category ?? null,
        r.description ?? null,
        Number(r.amount ?? 0),
        r.spentOn ?? r.spent_on ?? null
      ]
    })
  },

  workOrders: {
    table: "work_orders",
    upsert: (r) => ({
      sql: `INSERT INTO work_orders
              (product_name, quantity, raw_materials, assigned_staff,
               start_date, expected_completion_date, status, completed_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            ON CONFLICT DO NOTHING
            RETURNING *`,
      params: [
        r.productName ?? r.product_name ?? null,
        Number(r.quantity ?? 0),
        JSON.stringify(r.rawMaterials ?? r.raw_materials ?? []),
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
  const { upsert } = config;
  const results = [];

  for (const record of list) {
    try {
      const { sql, params } = upsert(record);
      const rows = await query(sql, params);
      results.push(rows[0] ?? {});
    } catch (err) {
      console.error(`saveCollection error [${key}]:`, err.message);
    }
  }

  console.log(`✓ saveCollection: ${config.table} → ${results.length} records saved`);
  return results;
}