import { useState, useEffect, useRef } from "react";
import * as Shared from "../shared/erpShared.jsx";
const {
  SALESMEN,
  PRODUCTS,
  MIN_BILLING_SQFT,
  RAW_MAT,
  FINISHED,
  BOM_MAP,
  EXPENSE_CATEGORIES,
  API_BASE,
  APP_STATE_SECRET,
  APP_STATE_HEADERS,
  fetchSharedAppState,
  saveSharedAppState,
  authRequest,
  isAuthExpiredError,
  loginToBackend,
  logoutFromBackend,
  getBackendUser,
  createBackendAccessUser,
  changeOwnBackendPassword,
  inr,
  todayStr,
  csvCell,
  downloadCsv,
  inDateRange,
  smName,
  smColor,
  leadSortTime,
  sortLeadsNewest,
  normalizeMobile,
  validateMobile,
  validateEmail,
  validateSalesmanEmail,
  validatePersonName,
  customerDuplicate,
  duplicateMsg,
  dedupeOrders,
  auditLog,
  duplicateAudit,
  transientSubmitKeys,
  onceKeyActive,
  leadFollowupReason,
  unifiedFollowups,
  T,
  SMART_COVERING_LOGO,
  QUOTATION_LOGO_BASE64,
  logoAssetUrl,
  logoFallbackUrls,
  logoImgHtml,
  imageUrlToDataUrl,
  quotationLogoHtml,
  BRAND,
  QUOTATION_COMPANY,
  HSN_REQUIRED_MESSAGE,
  GST_DUPLICATE_MESSAGE,
  normalizeGstin,
  normalizePartyName,
  hasHsn,
  firstPresent,
  COMPANY_STATE,
  GST_STATE_BY_CODE,
  GST_STATE_OPTIONS,
  normalizeStateName,
  stateFromGstin,
  stateCodeFromState,
  gstStateMismatch,
  resolveState,
  gstTaxKind,
  taxRatesForStates,
  sameId,
  byId,
  partnerTransactions,
  partnerBusinessRows,
  paidForOrder,
  leadPaidFromOrders,
  leadBalanceFromOrders,
  isSalesRecognized,
  paymentStatusFromAmounts,
  financeTotals,
  MEASUREMENT_UNITS,
  normalizeUnit,
  toFeet,
  round2,
  enrichMeasurementLine,
  measurementDisplay,
  validateMeasurementRows,
  productionTrackLabel,
  measurementWindows,
  lineAreaSqft,
  lineChargeableSqft,
  leadAreaSqft,
  leadChargeableSqft,
  quotedProductType,
  quoteLineRate,
  quoteLineItems,
  quoteTotals,
  pdfPrintScript,
  wirePdfPrintButton,
  openQuotationPdf,
  openCpRequestPdf,
  billTotals,
  billTaxDetails,
  openBillPdf,
  css,
  GlassCard,
  Pill,
  statusMeta,
  priorityMeta,
  StatusPill,
  PrimaryBtn,
  ButtonSpinner,
  GhostBtn,
  DangerBtn,
  SuccessBtn,
  EditBtn,
  Code,
  Divider,
  Modal,
  FormRow,
  Field,
  StatKPI,
  SectionTitle,
  Table,
  TR,
  TD,
  BarChart,
  FunnelBar,
  SearchBar,
  FilterSelect,
  Avatar
} = Shared;

export function BillingSession({ orders, setOrders, payments=[], setPayments, bills, setBills, leads=[], setLeads, partners=[], setPartners }) {
  const [filter,setFilter]=useState("billable");
  const [billOrder,setBillOrder]=useState(null);
  const [payOrder,setPayOrder]=useState(null);
  const [savingBill,setSavingBill]=useState(false);
  const [exportFrom,setExportFrom]=useState(todayStr().slice(0,7)+"-01");
  const [exportTo,setExportTo]=useState(todayStr());
  const [billForm,setBillForm]=useState({invoiceNo:"",date:todayStr(),supplierState:COMPANY_STATE,customerState:COMPANY_STATE,customerGstin:"",customerAddress:"",place:COMPANY_STATE,hsn:"",notes:"",taxType:"Intra-State",cgstRate:9,sgstRate:9,igstRate:0});
  const [payForm,setPayForm]=useState({paid:""});
  const knownParties=()=>{
    const rows=[
      ...bills.map(b=>({gstin:b.customerGstin,name:orders.find(o=>o.id===b.orderId)?.customer,address:b.customerAddress,state:b.customerState,place:b.place})),
      ...orders.map(o=>({gstin:o.customerGstin,name:o.customer,address:o.address,state:o.customerState,place:o.place})),
      ...leads.map(l=>({gstin:l.customerGstin||l.gstin,name:l.name,address:l.location,state:l.customerState,place:l.place}))
    ].filter(p=>p.name||p.gstin);
    return rows;
  };
  const partyByGstin=gstin=>knownParties().find(p=>normalizeGstin(p.gstin)===normalizeGstin(gstin));
  const partyByName=name=>knownParties().find(p=>normalizePartyName(p.name)===normalizePartyName(name));
  const billGstinError=gstin=>{
    const raw=String(gstin||"").trim().toUpperCase();
    if(!raw)return "";
    if(raw.length!==15)return "Customer GSTIN must be exactly 15 characters";
    if(!/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(raw))return "GSTIN format should be like 29ABCDE1234F1Z5";
    return "";
  };
  const applyCustomerGstin=value=>{
    const gstin=String(value||"").toUpperCase();
    const party=partyByGstin(gstin);
    const gstState=stateFromGstin(gstin);
    setBillForm(f=>{
      const customerState=resolveState(party?.state,gstState,party?.place,f.customerState);
      const rates=taxRatesForStates(f, f.supplierState||COMPANY_STATE, customerState||f.customerState||COMPANY_STATE);
      return {...f,customerGstin:gstin,customerState:customerState||f.customerState,place:customerState||f.place,customerAddress:party?.address||f.customerAddress,...rates};
    });
  };
  const applyCustomerState=value=>{
    const customerState=resolveState(value)||value;
    setBillForm(f=>({...f,customerState,place:customerState,...taxRatesForStates(f,f.supplierState||COMPANY_STATE,customerState)}));
  };
  const billFor=orderId=>bills.find(b=>b.orderId===orderId);
  const paidFor=o=>paidForOrder(o,payments);
  const billableOrders=orders.filter(o=>Number(o.final||0)>0);
  const shown=billableOrders.filter(o=>{ const b=billFor(o.id); return filter==="billable"?!b:filter==="billed"?b?.type==="GST Bill":filter==="cash"?b?.type==="Cash No Bill":true; });
  const totals=billableOrders.reduce((acc,o)=>{ const b=billFor(o.id); acc.total+=Number(o.final||0); if(b?.type==="GST Bill")acc.billed+=Number(o.final||0); if(b?.type==="Cash No Bill")acc.cash+=Number(o.final||0); if(!b)acc.pending+=Number(o.final||0); return acc; },{total:0,billed:0,cash:0,pending:0});
  const openBill=order=>{
    const party=partyByName(order.customer)||{};
    setBillOrder(order);
    const gstin=normalizeGstin(party.gstin||order.customerGstin);
    const customerState=resolveState(party.state,stateFromGstin(gstin),order.customerState,party.place,order.place,COMPANY_STATE);
    const rates=taxRatesForStates({},COMPANY_STATE,customerState);
    setBillForm({invoiceNo:`SC/${new Date().getFullYear()}/${String(bills.length+1).padStart(4,"0")}`,date:todayStr(),supplierState:COMPANY_STATE,customerState,customerGstin:gstin,customerAddress:party.address||order.address||"",place:customerState,hsn:firstPresent(order.hsn,...(order.products||[]).map(p=>p.hsn)),notes:"",...rates});
  };
  const saveBill=()=>{
    if(savingBill)return;
    if(!billOrder)return;
    if(bills.some(b=>b.orderId===billOrder.id&&b.type==="GST Bill"))return alert("Bill already generated for this order");
    if(onceKeyActive(`bill:${billOrder.id}:gst`))return alert("Processing... duplicate bill blocked");
    if(!hasHsn(billForm.hsn))return alert(HSN_REQUIRED_MESSAGE);
    if(!resolveState(billForm.supplierState)||!resolveState(billForm.customerState))return alert("Supplier State and Customer State are mandatory for GST calculation.");
    const gstError=billGstinError(billForm.customerGstin);
    if(gstError)return alert(gstError);
    const gstStateError=gstStateMismatch(billForm.customerGstin,billForm.customerState);
    if(gstStateError)return alert(`Customer GSTIN state code belongs to ${gstStateError}. Please select the same customer state before generating the bill.`);
    const tax=billTaxDetails({...billOrder,advance:paidFor(billOrder)},billForm);
    if(tax.taxType!=="Inter-State"&&tax.cgstRate+tax.sgstRate>18)return alert("CGST + SGST cannot exceed 18%");
    if(tax.taxType!=="Inter-State"&&tax.cgstRate!==tax.sgstRate)return alert("CGST and SGST must be equal");
    if(tax.taxType==="Inter-State"&&tax.igstRate>18)return alert("IGST cannot exceed 18%");
    setSavingBill(true);
    const record={...billForm,id:`BILL${Date.now()}`,orderId:billOrder.id,type:"GST Bill",amount:tax.final,taxType:tax.taxType,cgstRate:tax.cgstRate,sgstRate:tax.sgstRate,igstRate:tax.igstRate,gstRate:tax.gstRate,gstAmount:tax.gstAmount,cgst:tax.cgst,sgst:tax.sgst,igst:tax.igst,created:todayStr()};
    setBills(bs=>[...bs.filter(b=>b.orderId!==billOrder.id),record]);
    auditLog({event:"Created",source:"Billing",recordType:"GST Bill",recordId:record.id,orderId:billOrder.id});
    openBillPdf(billOrder,record);
    setBillOrder(null);
    setSavingBill(false);
  };
  const markCash=order=>{
    if(!confirm(`Mark ${order.id} as Cash / No Bill?`))return;
    if(bills.some(b=>b.orderId===order.id&&b.type==="Cash No Bill"))return alert("Cash / No Bill record already exists for this order");
    if(onceKeyActive(`bill:${order.id}:cash`))return alert("Processing... duplicate cash billing blocked");
    setBills(bs=>[...bs.filter(b=>b.orderId!==order.id),{id:`CASH${Date.now()}`,orderId:order.id,type:"Cash No Bill",amount:Number(order.final||0),created:todayStr(),notes:"Cash work without GST bill"}]);
  };
  const openPaymentEdit=order=>{
    setPayOrder(order);
    setPayForm({paid:String(Number(order.advance||0))});
  };
  const savePaymentEdit=()=>{
    if(!payOrder)return;
    const paid=Number(payForm.paid||0);
    const total=Number(payOrder.final||0);
    if(paid<0)return alert("Paid amount cannot be negative");
    if(paid>total)return alert("Paid amount cannot be more than order value");
    const balance=Math.max(total-paid,0);
    setOrders(os=>os.map(o=>o.id===payOrder.id?{...o,advance:paid,balance}:o));
    setPayments?.(ps=>{
      const existing=ps.find(p=>p.orderId===payOrder.id);
      if(paid<=0)return ps.filter(p=>p.orderId!==payOrder.id);
      if(existing)return ps.map(p=>p.orderId===payOrder.id?{...p,amount:paid,date:todayStr(),mode:p.mode||"Payment",notes:"Updated from billing"}:p);
      return [...ps,{id:`PAY${Date.now()}`,orderId:payOrder.id,date:todayStr(),amount:paid,mode:"Payment",notes:"Added from billing"}];
    });
    const status=paid<=0?"No Paid":paid>=total?"Fully Paid":"Partially Paid";
    setLeads?.(ls=>ls.map(l=>l.id===payOrder.leadId?{...l,paymentMarked:true,paymentStatus:status,paymentPaid:paid,paymentBalance:balance,updated:todayStr(),updatedAt:new Date().toISOString()}:l));
    setPartners?.(ps=>ps.map(p=>({...p,requests:(p.requests||[]).map(r=>r.orderId===payOrder.id||r.leadId===payOrder.leadId?{...r,paid,balance,status:paid>0?"Payment Updated":"Payment Pending"}:r)})));
    setPayOrder(null);
  };
  const exportBillingCsv=()=>{
    const rows=billableOrders
      .filter(o=>inDateRange(o.created||billFor(o.id)?.created,exportFrom,exportTo))
      .map(o=>{
        const bill=billFor(o.id);
        const isGstBill=bill?.type==="GST Bill";
        const isCash=bill?.type==="Cash No Bill";
        const totals=isGstBill?billTaxDetails({...o,advance:paidFor(o)},bill):billTotals({...o,advance:paidFor(o)});
        const lineRows=(o.products||[]).map((p,i)=>[
          `${i+1}. ${p.name||""}`,
          p.window?`Window: ${p.window}`:"",
          p.size?`Size: ${p.size}`:"",
          p.qty?`Qty: ${p.qty}`:"",
          p.unitPrice?`Rate: ${p.unitPrice}`:"",
          p.total?`Amount: ${p.total}`:"",
          p.color?`Color: ${p.color}`:"",
          p.material?`Material: ${p.material}`:"",
          p.code?`Code: ${p.code}`:""
        ].filter(Boolean).join(" | "));
        return {
          Order_Date:o.created||"",
          Bill_Record_Date:bill?.created||"",
          Invoice_Date:bill?.date||"",
          Order_ID:o.id,
          Lead_ID:o.leadId||"",
          Customer_Name:o.customer||"",
          Mobile:o.mobile||"",
          Product_Summary:(o.products||[]).map(p=>p.name).join(" | "),
          Product_Line_Details:lineRows.join(" || "),
          Gross_Amount_Without_Discount:totals.gross,
          Discount_Amount:totals.discount,
          Amount_Without_GST_Taxable:totals.taxable,
          Tax_Type:isGstBill?totals.taxType:"",
          CGST_Percent:isGstBill?totals.cgstRate:0,
          SGST_Percent:isGstBill?totals.sgstRate:0,
          IGST_Percent:isGstBill?totals.igstRate:0,
          Total_GST_Percent:isGstBill?totals.gstRate:0,
          GST_Percent:isGstBill?totals.gstRate:0,
          CGST:isGstBill?totals.cgst:0,
          SGST:isGstBill?totals.sgst:0,
          IGST:isGstBill?totals.igst:0,
          GST_Amount:isGstBill?totals.gstAmount:0,
          Amount_With_GST:isGstBill?totals.final:0,
          Cash_No_Bill_Amount:isCash?totals.final:0,
          Final_Order_Amount:totals.final,
          Paid_Amount:totals.paid,
          Balance_Amount:totals.balance,
          Payment_Status:totals.paid<=0?"No Paid":totals.balance>0?"Partially Paid":"Fully Paid",
          Billing_Status:bill?.type||"Pending",
          Invoice_No:bill?.invoiceNo||"",
          Customer_GSTIN:bill?.customerGstin||"",
          Supplier_State:bill?.supplierState||COMPANY_STATE,
          Customer_State:bill?.customerState||bill?.place||"",
          Customer_State_Code:stateCodeFromState(bill?.customerState||bill?.place),
          Customer_Address:bill?.customerAddress||"",
          Place_Of_Supply:bill?.place||"",
          HSN_SAC:bill?.hsn||"",
          Order_Status:o.status||"",
          Production_Stage:o.productionStage||"",
          Installation_Required:o.install?"Yes":"No",
          Installer:o.installer||"",
          Delivery_Date:o.delivery||"",
          Cash_Details:isCash?(bill?.notes||"Cash work without GST bill"):"",
          Internal_Notes:bill?.notes||"",
          Created_At:o.createdAt||""
        };
      });
    downloadCsv(`smartcovering-billing-${exportFrom||"all"}-to-${exportTo||"all"}.csv`,rows);
  };
  return (
    <div>
      <SectionTitle>Billing Session</SectionTitle>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:18}}>
        <StatKPI label="Total Order Value" value={inr(totals.total)} accent={T.blue} />
        <StatKPI label="GST Bills Generated" value={inr(totals.billed)} accent={T.green} />
        <StatKPI label="Cash / No Bill" value={inr(totals.cash)} accent={T.orange} />
        <StatKPI label="Pending Billing" value={inr(totals.pending)} accent={T.red} />
      </div>
      <GlassCard style={{marginBottom:18}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
          <div><div style={{fontWeight:800,color:T.text}}>Invoice control</div><div style={{fontSize:12,color:T.muted,marginTop:3}}>Generate GST bill PDFs, or mark selected work as cash/no-bill for internal tracking.</div></div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{[["billable","Pending"],["billed","Billed"],["cash","Cash / No Bill"],["all","All"]].map(([id,label])=><button key={id} onClick={()=>setFilter(id)} style={{border:`1px solid ${filter===id?T.blue:T.border}`,background:filter===id?T.blue:T.cardHi,color:filter===id?"#fff":T.sub,borderRadius:7,padding:"8px 12px",fontSize:12,fontWeight:800,cursor:"pointer"}}>{label}</button>)}</div>
        </div>
      </GlassCard>
      <GlassCard style={{marginBottom:18}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"end",flexWrap:"wrap"}}>
          <div><div style={{fontWeight:800,color:T.text}}>Export billing CSV</div><div style={{fontSize:12,color:T.muted,marginTop:3}}>Choose date range and download billing data for audit.</div></div>
          <div style={{display:"flex",gap:10,alignItems:"end",flexWrap:"wrap"}}>
            <Field label="From"><input type="date" value={exportFrom} onChange={e=>setExportFrom(e.target.value)} /></Field>
            <Field label="To"><input type="date" value={exportTo} onChange={e=>setExportTo(e.target.value)} /></Field>
          <PrimaryBtn onClick={exportBillingCsv} color={T.blue}>Export CSV</PrimaryBtn>
          </div>
        </div>
      </GlassCard>
      <GlassCard style={{padding:0}}>
        <Table headers={["Order","Customer","Products","Order Value","Paid","Balance","Payment","Billing Status","Action"]}>
          {shown.map(o=>{ const status=billFor(o.id); const t=billTotals({...o,advance:paidFor(o)}); return <TR key={o.id}><TD bold color={T.amber}>{o.id}<div style={{fontSize:11,color:T.muted}}>{o.created||""}</div></TD><TD bold>{o.customer}<div style={{fontSize:11,color:T.muted}}>{o.mobile}</div></TD><TD>{(o.products||[]).map(p=>p.name).join(", ")}</TD><TD bold color={T.green}>{inr(t.final)}</TD><TD color={T.teal} bold>{inr(t.paid)}</TD><TD color={t.balance>0?T.red:T.green} bold>{inr(t.balance)}</TD><TD><GhostBtn small onClick={()=>openPaymentEdit(o)}>Edit Payment</GhostBtn></TD><TD><Pill label={status?.type||"Pending"} color={status?.type==="GST Bill"?T.green:status?.type==="Cash No Bill"?T.orange:T.red} /></TD><TD><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{status?.type==="GST Bill"?<GhostBtn small onClick={()=>openBillPdf(o,status)}>Download PDF</GhostBtn>:<><PrimaryBtn small onClick={()=>openBill(o)}>Generate Bill</PrimaryBtn><GhostBtn small onClick={()=>markCash(o)}>Cash / No Bill</GhostBtn></>}</div></TD></TR>; })}
        </Table>
        {shown.length===0&&<div style={{padding:42,textAlign:"center",fontSize:13,color:T.muted}}>No orders in this billing view.</div>}
      </GlassCard>
      {billOrder&&<Modal title={`Generate Bill - ${billOrder.id}`} onClose={()=>setBillOrder(null)} wide>
        <div style={{background:T.cardHi,border:`1px solid ${T.border}`,borderRadius:8,padding:12,marginBottom:14,fontSize:13,color:T.sub}}>Order Value: <b style={{color:T.text}}>{inr(billTaxDetails({...billOrder,advance:paidFor(billOrder)},billForm).final)}</b> | Paid: <b style={{color:T.green}}>{inr(paidFor(billOrder))}</b> | Balance: <b style={{color:T.red}}>{inr(billTaxDetails({...billOrder,advance:paidFor(billOrder)},billForm).balance)}</b></div>
        <FormRow cols={4}><Field label="Invoice No"><input value={billForm.invoiceNo} onChange={e=>setBillForm(f=>({...f,invoiceNo:e.target.value}))} /></Field><Field label="Invoice Date"><input type="date" value={billForm.date} onChange={e=>setBillForm(f=>({...f,date:e.target.value}))} /></Field><Field label="Supplier State"><input disabled value={billForm.supplierState||COMPANY_STATE} /></Field><Field label="Customer State *"><select value={billForm.customerState||""} onChange={e=>applyCustomerState(e.target.value)}><option value="">Select State</option>{GST_STATE_OPTIONS.map(s=><option key={s.code} value={s.name}>{s.name} ({s.code})</option>)}</select></Field></FormRow>
        <FormRow cols={3}><Field label="Customer GSTIN"><input maxLength={15} value={billForm.customerGstin} onChange={e=>applyCustomerGstin(e.target.value)} placeholder="Optional for B2C" list="billing-party-gstin-master" /><datalist id="billing-party-gstin-master">{knownParties().map((p,i)=><option key={i} value={normalizeGstin(p.gstin)}>{p.name}</option>)}</datalist>{billGstinError(billForm.customerGstin)&&<div style={{fontSize:11,color:T.red,marginTop:4}}>{billGstinError(billForm.customerGstin)}</div>}</Field><Field label="HSN / SAC *"><input value={billForm.hsn} onChange={e=>setBillForm(f=>({...f,hsn:e.target.value}))} placeholder="Enter applicable HSN/SAC" style={!hasHsn(billForm.hsn)?{borderColor:T.red}:null} /></Field><Field label="Tax Type"><input disabled value={billForm.taxType||"Intra-State"} /></Field></FormRow>
        <FormRow cols={4}><Field label="CGST %"><input type="number" disabled={billForm.taxType==="Inter-State"} value={billTaxDetails({...billOrder,advance:paidFor(billOrder)},billForm).cgstRate} onChange={e=>setBillForm(f=>({...f,cgstRate:e.target.value,sgstRate:e.target.value}))} /></Field><Field label="SGST %"><input type="number" disabled={billForm.taxType==="Inter-State"} value={billTaxDetails({...billOrder,advance:paidFor(billOrder)},billForm).sgstRate} onChange={e=>setBillForm(f=>({...f,cgstRate:e.target.value,sgstRate:e.target.value}))} /></Field><Field label="IGST %"><input type="number" disabled={billForm.taxType!=="Inter-State"} value={billTaxDetails({...billOrder,advance:paidFor(billOrder)},billForm).igstRate} onChange={e=>setBillForm(f=>({...f,igstRate:e.target.value}))} /></Field><Field label="Total GST %"><input disabled value={billTaxDetails({...billOrder,advance:paidFor(billOrder)},billForm).gstRate} /></Field></FormRow>
        {(billTaxDetails({...billOrder,advance:paidFor(billOrder)},billForm).cgstRate+billTaxDetails({...billOrder,advance:paidFor(billOrder)},billForm).sgstRate>18||billTaxDetails({...billOrder,advance:paidFor(billOrder)},billForm).igstRate>18)&&<div style={{fontSize:12,color:T.red,marginBottom:10}}>Total GST cannot exceed 18%.</div>}
        {billTaxDetails({...billOrder,advance:paidFor(billOrder)},billForm).taxType!=="Inter-State"&&billTaxDetails({...billOrder,advance:paidFor(billOrder)},billForm).cgstRate!==billTaxDetails({...billOrder,advance:paidFor(billOrder)},billForm).sgstRate&&<div style={{fontSize:12,color:T.red,marginBottom:10}}>CGST and SGST must be equal.</div>}
        <div style={{background:T.cardHi,border:`1px solid ${T.border}`,borderRadius:8,padding:12,marginBottom:14,fontSize:13,color:T.sub}}>Taxable: <b style={{color:T.text}}>{inr(billTaxDetails({...billOrder,advance:paidFor(billOrder)},billForm).taxable)}</b> | CGST: <b style={{color:T.green}}>{inr(billTaxDetails({...billOrder,advance:paidFor(billOrder)},billForm).cgst)}</b> | SGST: <b style={{color:T.green}}>{inr(billTaxDetails({...billOrder,advance:paidFor(billOrder)},billForm).sgst)}</b> | IGST: <b style={{color:T.green}}>{inr(billTaxDetails({...billOrder,advance:paidFor(billOrder)},billForm).igst)}</b> | Total GST: <b style={{color:T.green}}>{inr(billTaxDetails({...billOrder,advance:paidFor(billOrder)},billForm).gstAmount)}</b></div>
        <Field label="Customer Address"><textarea rows={2} value={billForm.customerAddress} onChange={e=>setBillForm(f=>({...f,customerAddress:e.target.value}))} /></Field>
        <Field label="Internal Notes"><textarea rows={2} value={billForm.notes} onChange={e=>setBillForm(f=>({...f,notes:e.target.value}))} /></Field>
        <div style={{display:"flex",gap:10,marginTop:18}}><SuccessBtn onClick={saveBill} disabled={savingBill}>{savingBill?"Processing...":"Generate & Download PDF"}</SuccessBtn><GhostBtn onClick={()=>setBillOrder(null)}>Cancel</GhostBtn></div>
      </Modal>}
      {payOrder&&<Modal title={`Edit Payment - ${payOrder.id}`} onClose={()=>setPayOrder(null)}>
        <div style={{background:T.cardHi,border:`1px solid ${T.border}`,borderRadius:8,padding:12,marginBottom:14,fontSize:13,color:T.sub}}>
          Order Value: <b style={{color:T.text}}>{inr(payOrder.final)}</b> | Remaining after edit: <b style={{color:T.red}}>{inr(Math.max(Number(payOrder.final||0)-Number(payForm.paid||0),0))}</b>
        </div>
        <Field label="How much paid"><input type="number" value={payForm.paid} onChange={e=>setPayForm({paid:e.target.value})} /></Field>
        <div style={{display:"flex",gap:10,marginTop:18}}><SuccessBtn onClick={savePaymentEdit}>Update Payment</SuccessBtn><GhostBtn onClick={()=>setPayOrder(null)}>Cancel</GhostBtn></div>
      </Modal>}
    </div>
  );
}



export function Payments({ payments, setPayments, orders, expenses, setExpenses, isManager }) {
  const [tab,setTab]=useState("payments");
  const [showAdd,setShowAdd]=useState(false);
  const [showExp,setShowExp]=useState(false);
  const [savingPayment,setSavingPayment]=useState(false);
  const blankP={orderId:"",date:todayStr(),amount:"",mode:"UPI",notes:""};
  const blankE={date:todayStr(),cat:"Raw Material",desc:"",amount:""};
  const [form,setForm]=useState(blankP);
  const [eForm,setEForm]=useState(blankE);

  const rev=payments.reduce((s,p)=>s+p.amount,0);
  const exp=expenses.reduce((s,e)=>s+e.amount,0);
  const profit=rev-exp;
  const pending=orders.reduce((s,o)=>{ const paid=payments.filter(p=>p.orderId===o.id).reduce((ss,p)=>ss+p.amount,0); return s+(o.final-paid); },0);

  const saveP=()=>{
    if(savingPayment)return;
    if(!form.orderId||!form.amount)return alert("Order and amount required");
    if(onceKeyActive(`payment:${form.orderId}:${form.amount}:${form.date}`))return alert("Processing... duplicate payment blocked");
    setSavingPayment(true);
    const id=`PAY${Date.now()}`;
    setPayments(ps=>ps.some(p=>p.orderId===form.orderId&&p.date===form.date&&Number(p.amount)===Number(form.amount))?ps:[...ps,{...form,id,amount:Number(form.amount),createdAt:new Date().toISOString()}]);
    auditLog({event:"Created",source:"Payments",recordType:"Payment",recordId:id,orderId:form.orderId});
    setForm(blankP); setShowAdd(false);
    setSavingPayment(false);
  };
  const saveE=()=>{ if(!form.desc&&!eForm.desc||!eForm.amount)return alert("Description and amount required"); setExpenses(es=>[...es,{...eForm,id:`EXP${Date.now()}`,amount:Number(eForm.amount)}]); setEForm(blankE); setShowExp(false); };

  const catColors={"Raw Material":T.orange,Labor:T.purple,Logistics:T.teal,Utilities:T.blue,Marketing:T.amber,Other:T.sub};

  return (
    <div>
      <SectionTitle>Payments & Accounts</SectionTitle>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
        <StatKPI label="Revenue Collected" value={inr(rev)} accent={T.green} icon="" />
        <StatKPI label="Total Expenses" value={inr(exp)} accent={T.red} icon="" />
        <StatKPI label="Net Profit" value={inr(profit)} accent={profit>=0?T.green:T.red} icon="" />
        <StatKPI label="Pending Balance" value={inr(pending)} sub="from active orders" accent={T.orange} icon="" />
      </div>

      <div style={{display:"flex",gap:4,marginBottom:20,background:T.surf,borderRadius:12,padding:4,width:"fit-content"}}>
        {[["payments","Payments"],["expenses","Expenses"],["outstanding","Outstanding"]].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)} style={{padding:"7px 18px",borderRadius:9,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,background:tab===v?T.amber:"transparent",color:tab===v?"#0f172a":T.sub}}>{l}</button>
        ))}
      </div>

      {tab==="payments"&&<>
        {!isManager&&<div style={{marginBottom:14}}><PrimaryBtn onClick={()=>setShowAdd(true)}>+ Record Payment</PrimaryBtn></div>}
        <GlassCard style={{padding:0}}>
          <Table headers={["Payment ID","Order","Date","Amount","Mode","Notes"]}>
            {payments.map(p=>(
              <TR key={p.id}><TD mono color={T.muted}>{p.id}</TD><TD bold color={T.amber}>{p.orderId}</TD><TD color={T.sub}>{p.date}</TD><TD bold color={T.green}>{inr(p.amount)}</TD><TD><Pill label={p.mode} color={T.blue} /></TD><TD color={T.muted}>{p.notes}</TD></TR>
            ))}
          </Table>
        </GlassCard>
      </>}

      {tab==="expenses"&&<>
        {!isManager&&<div style={{marginBottom:14}}><PrimaryBtn onClick={()=>setShowExp(true)} color={T.red}>+ Add Expense</PrimaryBtn></div>}
        <GlassCard style={{padding:0}}>
          <Table headers={["Date","Category","Description","Amount"]}>
            {expenses.map(e=>(
              <TR key={e.id}><TD color={T.sub}>{e.date}</TD><TD><Pill label={e.cat} color={catColors[e.cat]||T.sub} /></TD><TD color={T.text}>{e.desc}</TD><TD bold color={T.red}>{inr(e.amount)}</TD></TR>
            ))}
          </Table>
        </GlassCard>
        <div style={{marginTop:16,display:"flex",justifyContent:"flex-end",gap:24,fontSize:13,color:T.sub}}>
          {Object.entries(expenses.reduce((acc,e)=>({...acc,[e.cat]:(acc[e.cat]||0)+e.amount}),{})).map(([k,v])=>(
            <span key={k}>{k}: <b style={{color:catColors[k]||T.sub}}>{inr(v)}</b></span>
          ))}
        </div>
      </>}

      {tab==="outstanding"&&<>
        <GlassCard style={{padding:0}}>
          <Table headers={["Order","Customer","Total Value","Collected","Balance Due","Status"]}>
            {orders.filter(o=>{ const paid=payments.filter(p=>p.orderId===o.id).reduce((s,p)=>s+p.amount,0); return paid<o.final; }).map(o=>{
              const paid=payments.filter(p=>p.orderId===o.id).reduce((s,p)=>s+p.amount,0);
              const bal=o.final-paid;
              const pct=Math.round(paid/o.final*100);
              return (
                <TR key={o.id}>
                  <TD bold color={T.amber}>{o.id}</TD>
                  <TD bold color={T.text}>{o.customer}</TD>
                  <TD>{inr(o.final)}</TD>
                  <TD>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <div style={{width:40,height:4,background:"rgba(255,255,255,.1)",borderRadius:2,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:T.green}} /></div>
                      <span style={{color:T.green,fontSize:12}}>{inr(paid)}</span>
                    </div>
                  </TD>
                  <TD bold color={T.red}>{inr(bal)}</TD>
                  <TD><StatusPill s={o.status} /></TD>
                </TR>
              );
            })}
          </Table>
        </GlassCard>
      </>}

      {showAdd&&<Modal title="Record Payment" onClose={()=>setShowAdd(false)}>
        <Field label="Order"><select value={form.orderId} onChange={e=>setForm(f=>({...f,orderId:e.target.value}))}><option value="">Select Order...</option>{orders.map(o=><option key={o.id} value={o.id}>{o.id}  {o.customer}</option>)}</select></Field>
        <FormRow cols={2} ><Field label="Date"><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} /></Field><Field label="Amount (Rs.)"><input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} /></Field></FormRow>
        <FormRow cols={2}><Field label="Mode"><select value={form.mode} onChange={e=>setForm(f=>({...f,mode:e.target.value}))}>{["UPI","Cash","Bank Transfer","Cheque","Card"].map(m=><option key={m}>{m}</option>)}</select></Field><Field label="Notes"><input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} /></Field></FormRow>
        <div style={{display:"flex",gap:10,marginTop:20}}><PrimaryBtn onClick={saveP} color={T.green} disabled={savingPayment}>{savingPayment?"Processing...":"Save Payment"}</PrimaryBtn><GhostBtn onClick={()=>setShowAdd(false)}>Cancel</GhostBtn></div>
      </Modal>}

      {showExp&&<Modal title="Add Expense" onClose={()=>setShowExp(false)}>
        <FormRow cols={2}><Field label="Date"><input type="date" value={eForm.date} onChange={e=>setEForm(f=>({...f,date:e.target.value}))} /></Field><Field label="Category"><select value={eForm.cat} onChange={e=>setEForm(f=>({...f,cat:e.target.value}))}>{EXPENSE_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></Field></FormRow>
        <Field label="Description"><input value={eForm.desc} onChange={e=>setEForm(f=>({...f,desc:e.target.value}))} /></Field>
        <div style={{marginTop:12}}><Field label="Amount (Rs.)"><input type="number" value={eForm.amount} onChange={e=>setEForm(f=>({...f,amount:e.target.value}))} /></Field></div>
        <div style={{display:"flex",gap:10,marginTop:20}}><DangerBtn onClick={saveE}>Save Expense</DangerBtn><GhostBtn onClick={()=>setShowExp(false)}>Cancel</GhostBtn></div>
      </Modal>}
    </div>
  );
}


