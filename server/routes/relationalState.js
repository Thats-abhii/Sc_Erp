import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

export const relationalStateRouter = Router();

relationalStateRouter.use(requireAuth);

const text = value => value == null ? null : String(value);
const numberOrNull = value => value === "" || value == null || Number.isNaN(Number(value)) ? null : Number(value);
const dateOrNull = value => value ? String(value).slice(0, 10) : null;
const boolOrTrue = value => value == null ? true : Boolean(value);

async function upsert(table, id, data, columns = {}) {
  if (!id) return null;
  const names = ["id", ...Object.keys(columns), "data", "updated_at"];
  const values = [String(id), ...Object.values(columns), JSON.stringify(data ?? {}), new Date()];
  const placeholders = names.map((_, index) => `$${index + 1}`).join(", ");
  const updates = names
    .filter(name => name !== "id")
    .map(name => `${name}=excluded.${name}`)
    .join(", ");
  const rows = await query(
    `insert into ${table} (${names.join(", ")}) values (${placeholders})
     on conflict (id) do update set ${updates}
     returning data`,
    values
  );
  return rows[0]?.data;
}

async function replaceChildren(table, fkColumn, fkValue, children, mapper) {
  if (!fkValue) return;
  await query(`delete from ${table} where ${fkColumn} = $1`, [String(fkValue)]);
  for (const [index, row] of (children || []).entries()) {
    const mapped = mapper(row, index);
    await upsert(table, mapped.id, row, mapped.columns);
  }
}

async function readRows(table) {
  const rows = await query(`select data from ${table} order by created_at asc nulls last, id asc`);
  return rows.map(row => row.data).filter(Boolean);
}

async function readInventory() {
  const rows = await query("select source, section, data from sc_inventory_items order by created_at asc nulls last, id asc");
  const legacy = { rawMaterials: [], finishedGoods: [] };
  const smart = { blindRolls: [], blindComponents: [], meshComponents: [], meshHardware: [], movements: [] };
  for (const row of rows) {
    if (row.source === "inventory" && row.section === "rawMaterials") legacy.rawMaterials.push(row.data);
    if (row.source === "inventory" && row.section === "finishedGoods") legacy.finishedGoods.push(row.data);
    if (row.source === "smartInventory" && smart[row.section]) smart[row.section].push(row.data);
  }
  const movements = await query("select data from sc_inventory_movements order by created_at asc nulls last, id asc");
  smart.movements = movements.map(row => row.data).filter(Boolean);
  return { inventory: legacy, smartInventory: smart };
}

relationalStateRouter.get("/", async (_req, res, next) => {
  try {
    const inventory = await readInventory();
    res.json({
      state: {
        leads: await readRows("sc_leads"),
        orders: await readRows("sc_orders"),
        followups: await readRows("sc_followups"),
        payments: await readRows("sc_payments"),
        salesmen: await readRows("sc_salesmen"),
        channelPartners: await readRows("sc_channel_partners"),
        bills: await readRows("sc_bills"),
        purchases: await readRows("sc_purchases"),
        smartInventory: inventory.smartInventory,
        inventory: inventory.inventory,
        workOrders: await readRows("sc_work_orders"),
        expenses: await readRows("sc_expenses"),
        reassignmentLogs: await readRows("sc_reassignment_logs"),
        auditLogs: await readRows("sc_app_audit_logs")
      }
    });
  } catch (error) {
    next(error);
  }
});

relationalStateRouter.put("/", async (req, res, next) => {
  try {
    const state = req.body?.state || {};
    const saved = [];

    for (const row of state.salesmen || []) {
      saved.push(await upsert("sc_salesmen", row.id, row, {
        name: text(row.name),
        mobile: text(row.mobile),
        email: text(row.email),
        area: text(row.area),
        login_id: text(row.loginId),
        initials: text(row.initials),
        joining: dateOrNull(row.joining),
        active: boolOrTrue(row.active)
      }));
    }

    for (const row of state.channelPartners || []) {
      saved.push(await upsert("sc_channel_partners", row.id, row, {
        name: text(row.name),
        owner: text(row.owner),
        mobile: text(row.mobile),
        email: text(row.email),
        city: text(row.city),
        category: text(row.category),
        login_id: text(row.loginId),
        balance: numberOrNull(row.balance)
      }));
      await replaceChildren("sc_channel_partner_requests", "partner_id", row.id, row.requests || [], (request) => ({
        id: request.id,
        columns: {
          partner_id: text(row.id),
          order_id: text(request.orderId),
          lead_id: text(request.leadId),
          request_date: dateOrNull(request.date),
          customer: text(request.customer),
          mobile: text(request.mobile),
          product: text(request.product),
          approval: text(request.approval),
          stage: text(request.stage),
          quotation_amount: numberOrNull(request.quotationAmount),
          paid: numberOrNull(request.paid)
        }
      }));
    }

    for (const row of state.leads || []) {
      saved.push(await upsert("sc_leads", row.id, row, {
        name: text(row.name),
        mobile: text(row.mobile),
        email: text(row.email),
        source: text(row.source),
        product: text(row.product),
        location: text(row.location),
        status: text(row.status),
        priority: text(row.priority),
        salesman_id: text(row.salesman),
        channel_partner_id: text(row.channelPartnerId),
        created_on: dateOrNull(row.created),
        updated_on: dateOrNull(row.updated)
      }));
    }

    for (const row of state.orders || []) {
      saved.push(await upsert("sc_orders", row.id, row, {
        lead_id: text(row.leadId),
        customer: text(row.customer),
        mobile: text(row.mobile),
        status: text(row.status),
        product: text(row.product || row.productType),
        final_amount: numberOrNull(row.final),
        advance: numberOrNull(row.advance),
        balance: numberOrNull(row.balance),
        partner_id: text(row.partnerId),
        created_on: dateOrNull(row.created),
        production_date: dateOrNull(row.productionDate),
        installation_date: dateOrNull(row.installationDate)
      }));
      await replaceChildren("sc_order_items", "order_id", row.id, row.products || [], (item, index) => ({
        id: `${row.id}-${index}`,
        columns: {
          order_id: text(row.id),
          line_index: index,
          product_name: text(item.name),
          product_type: text(item.type),
          material: text(item.material),
          color: text(item.color),
          code: text(item.code),
          qty: numberOrNull(item.qty),
          sqft: numberOrNull(item.sqft ?? item.actualSqft ?? item.chargeableSqft),
          rate: numberOrNull(item.rate ?? item.unitPrice),
          amount: numberOrNull(item.amount ?? item.total)
        }
      }));
    }

    for (const row of state.workOrders || []) {
      saved.push(await upsert("sc_work_orders", row.id, row, {
        order_id: text(row.orderId),
        product: text(row.product),
        qty: numberOrNull(row.qty),
        staff: text(row.staff),
        start_date: dateOrNull(row.start),
        end_date: dateOrNull(row.end),
        status: text(row.status)
      }));
    }

    for (const row of state.followups || []) {
      saved.push(await upsert("sc_followups", row.id, row, {
        lead_id: text(row.leadId),
        salesman_id: text(row.smId),
        date: dateOrNull(row.date),
        type: text(row.type),
        outcome: text(row.outcome),
        reason: text(row.reason),
        status: text(row.status),
        notes: text(row.notes)
      }));
    }

    for (const row of state.payments || []) {
      saved.push(await upsert("sc_payments", row.id, row, {
        order_id: text(row.orderId),
        lead_id: text(row.leadId),
        amount: numberOrNull(row.amount),
        mode: text(row.mode),
        paid_on: dateOrNull(row.date || row.paidOn),
        notes: text(row.notes)
      }));
    }

    for (const row of state.bills || []) {
      saved.push(await upsert("sc_bills", row.id, row, {
        order_id: text(row.orderId),
        invoice_no: text(row.invoiceNo),
        bill_type: text(row.type),
        bill_date: dateOrNull(row.date),
        amount: numberOrNull(row.amount),
        taxable: numberOrNull(row.taxable),
        gst_amount: numberOrNull(row.gstAmount),
        cgst_rate: numberOrNull(row.cgstRate),
        sgst_rate: numberOrNull(row.sgstRate),
        igst_rate: numberOrNull(row.igstRate),
        customer_gstin: text(row.customerGstin),
        customer_state: text(row.customerState),
        supplier_state: text(row.supplierState)
      }));
    }

    for (const row of state.purchases || []) {
      saved.push(await upsert("sc_purchases", row.id, row, {
        vendor: text(row.vendor),
        vendor_gstin: text(row.vendorGstin),
        vendor_state: text(row.vendorState),
        customer_state: text(row.customerState),
        invoice_no: text(row.invoiceNo),
        invoice_date: dateOrNull(row.invoiceDate || row.date),
        amount: numberOrNull(row.amount),
        taxable: numberOrNull(row.taxable),
        gst_amount: numberOrNull(row.gstAmount),
        paid: numberOrNull(row.paid),
        balance: numberOrNull(row.balance)
      }));
      await replaceChildren("sc_purchase_items", "purchase_id", row.id, row.items || [], (item, index) => ({
        id: `${row.id}-${index}`,
        columns: {
          purchase_id: text(row.id),
          line_index: index,
          item: text(item.item || item.name || item.description),
          hsn: text(item.hsn || item.hsnCode),
          qty: numberOrNull(item.qty),
          rate: numberOrNull(item.rate),
          amount: numberOrNull(item.amount)
        }
      }));
    }

    for (const row of state.expenses || []) {
      saved.push(await upsert("sc_expenses", row.id, row, {
        category: text(row.cat || row.category || row.name),
        expense_date: dateOrNull(row.date),
        description: text(row.desc || row.description),
        reason: text(row.reason),
        amount: numberOrNull(row.amount)
      }));
    }

    const legacyInventory = state.inventory || {};
    for (const row of legacyInventory.rawMaterials || []) {
      saved.push(await upsert("sc_inventory_items", `legacy-raw-${row.id}`, row, {
        source: "inventory",
        kind: "raw",
        section: "rawMaterials",
        name: text(row.name),
        item: text(row.item),
        code: text(row.code),
        category: text(row.cat),
        unit: text(row.unit),
        stock: numberOrNull(row.stock),
        qty: numberOrNull(row.qty),
        min_stock: numberOrNull(row.min)
      }));
    }
    for (const row of legacyInventory.finishedGoods || []) {
      saved.push(await upsert("sc_inventory_items", `legacy-finished-${row.id}`, row, {
        source: "inventory",
        kind: "finished",
        section: "finishedGoods",
        name: text(row.name),
        item: text(row.item),
        code: text(row.code),
        category: text(row.cat),
        unit: text(row.unit),
        stock: numberOrNull(row.stock),
        qty: numberOrNull(row.qty),
        min_stock: numberOrNull(row.min)
      }));
    }

    const smart = state.smartInventory || {};
    const smartGroups = [
      ["blindRolls", "blind", "smart-blind-roll"],
      ["blindComponents", "blind", "smart-blind-component"],
      ["meshComponents", "mesh", "smart-mesh-component"],
      ["meshHardware", "mesh", "smart-mesh-hardware"]
    ];
    for (const [section, kind, prefix] of smartGroups) {
      for (const row of smart[section] || []) {
        saved.push(await upsert("sc_inventory_items", `${prefix}-${row.id}`, row, {
          source: "smartInventory",
          kind,
          section,
          name: text(row.name),
          item: text(row.item),
          code: text(row.code),
          unit: text(row.unit),
          stock: numberOrNull(row.remainingMetres ?? row.full ?? row.stock),
          qty: numberOrNull(row.rolls ?? row.qty),
          min_stock: numberOrNull(row.min)
        }));
      }
    }
    for (const row of smart.movements || []) {
      saved.push(await upsert("sc_inventory_movements", row.id || crypto.randomUUID(), row, {
        kind: text(row.kind),
        movement_date: dateOrNull(row.date),
        text: text(row.text),
        order_id: text(row.orderId)
      }));
    }

    for (const row of state.reassignmentLogs || []) {
      saved.push(await upsert("sc_reassignment_logs", row.id, row, {
        log_date: text(row.date),
        old_salesman: text(row.oldSalesman),
        new_salesman: text(row.newSalesman),
        lead_count: numberOrNull(row.count),
        admin: text(row.admin)
      }));
    }

    for (const row of state.auditLogs || []) {
      saved.push(await upsert("sc_app_audit_logs", row.id || crypto.randomUUID(), row, {
        event: text(row.event),
        source: text(row.source),
        record_type: text(row.recordType),
        record_id: text(row.recordId),
        actor: text(row.actor)
      }));
    }

    res.json({ ok: true, saved: saved.length });
  } catch (error) {
    next(error);
  }
});
