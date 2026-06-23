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

export function DailyExpenses({ expenses, setExpenses }) {
  const [showAdd,setShowAdd]=useState(false);
  const [editId,setEditId]=useState(null);
  const blank={date:todayStr(),name:"Raw Material",amount:"",reason:""};
  const [form,setForm]=useState(blank);
  const [exportFrom,setExportFrom]=useState(todayStr().slice(0,7)+"-01");
  const [exportTo,setExportTo]=useState(todayStr());
  const month=todayStr().slice(0,7);
  const mtd=expenses.filter(e=>e.date?.startsWith(month)).reduce((s,e)=>s+Number(e.amount||0),0);
  const today=expenses.filter(e=>e.date===todayStr()).reduce((s,e)=>s+Number(e.amount||0),0);
  const total=expenses.reduce((s,e)=>s+Number(e.amount||0),0);
  const save=()=>{
    if(!form.name.trim()||!form.amount)return alert("Expense name and amount are required");
    const payload={date:form.date||todayStr(),cat:form.name.trim(),desc:form.reason.trim()||form.name.trim(),name:form.name.trim(),amount:Number(form.amount||0),reason:form.reason.trim()};
    setExpenses(es=>editId?es.map(e=>e.id===editId?{...e,...payload}:e):[{id:`EXP${Date.now()}`,...payload},...es]);
    setForm(blank);
    setEditId(null);
    setShowAdd(false);
  };
  const openAdd=()=>{ setEditId(null); setForm(blank); setShowAdd(true); };
  const openEdit=e=>{
    setEditId(e.id);
    setForm({date:e.date||todayStr(),name:e.cat||e.name||"Other",amount:String(e.amount||""),reason:e.reason||e.desc||""});
    setShowAdd(true);
  };
  const exportExpensesCsv=()=>{
    const rows=expenses
      .filter(e=>inDateRange(e.date,exportFrom,exportTo))
      .map(e=>({
        Date:e.date||"",
        Expense_ID:e.id||"",
        Category:e.cat||e.name||"Other",
        Expense_Name:e.name||e.cat||e.desc||"",
        Amount:Number(e.amount||0),
        Reason:e.reason||e.desc||"",
        Description:e.desc||"",
        Payment_Mode:e.mode||e.paymentMode||"",
        Vendor:e.vendor||e.supplier||"",
        Bill_No:e.billNo||e.invoiceNo||e.refNo||"",
        GSTIN:e.gstin||"",
        GST_Amount:Number(e.gstAmount||0),
        Amount_Without_GST:Number(e.taxable||e.amountWithoutGst||e.amount||0)-Number(e.gstAmount||0),
        Amount_With_GST:Number(e.total||e.amountWithGst||e.amount||0),
        Spent_By:e.spentBy||"",
        Created_By:e.createdBy||"",
        Created_At:e.createdAt||"",
        Notes:e.notes||"",
        Raw_Record:JSON.stringify(e)
      }));
    downloadCsv(`smartcovering-expenses-${exportFrom||"all"}-to-${exportTo||"all"}.csv`,rows);
  };
  return <div>
    <SectionTitle action={<PrimaryBtn onClick={openAdd}>+ Add Expense</PrimaryBtn>}>Expenses</SectionTitle>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:18}}>
      <StatKPI label="Expenses MTD" value={inr(mtd)} sub={month} accent={T.red} />
      <StatKPI label="Today Expenses" value={inr(today)} sub={todayStr()} accent={T.orange} />
      <StatKPI label="Total Expenses" value={inr(total)} sub="all recorded" accent={T.purple} />
    </div>
    <GlassCard style={{marginBottom:18}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"end",flexWrap:"wrap"}}>
        <div><div style={{fontWeight:800,color:T.text}}>Export expenses CSV</div><div style={{fontSize:12,color:T.muted,marginTop:3}}>Choose date range and download expenses for CA audit.</div></div>
        <div style={{display:"flex",gap:10,alignItems:"end",flexWrap:"wrap"}}>
          <Field label="From"><input type="date" value={exportFrom} onChange={e=>setExportFrom(e.target.value)} /></Field>
          <Field label="To"><input type="date" value={exportTo} onChange={e=>setExportTo(e.target.value)} /></Field>
          <PrimaryBtn onClick={exportExpensesCsv} color={T.blue}>Export CSV</PrimaryBtn>
        </div>
      </div>
    </GlassCard>
    <GlassCard style={{padding:0}}>
      <Table headers={["Date","Expense Name","Amount","Reason","Action"]}>
        {expenses.map(e=><TR key={e.id}><TD color={T.sub}>{e.date}</TD><TD bold>{e.cat||e.name||e.desc}</TD><TD bold color={T.red}>{inr(e.amount)}</TD><TD color={T.muted}>{e.reason||e.desc||"-"}</TD><TD><EditBtn onClick={()=>openEdit(e)}>Edit</EditBtn></TD></TR>)}
      </Table>
      {expenses.length===0&&<div style={{padding:36,textAlign:"center",fontSize:13,color:T.muted}}>No expenses added yet.</div>}
    </GlassCard>
    {showAdd&&<Modal title={editId?"Edit Expense":"Add Expense"} onClose={()=>{setShowAdd(false);setEditId(null);setForm(blank);}}>
      <Field label="Date"><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} /></Field>
      <div style={{marginTop:12}}><Field label="Name of Expense"><select value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}>{EXPENSE_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></Field></div>
      <div style={{marginTop:12}}><Field label="Amount"><input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} /></Field></div>
      <div style={{marginTop:12}}><Field label="Reason of Expense"><textarea rows={3} value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))} /></Field></div>
      <div style={{display:"flex",gap:10,marginTop:20}}><PrimaryBtn onClick={save} color={T.red}>{editId?"Update Expense":"Save Expense"}</PrimaryBtn><GhostBtn onClick={()=>{setShowAdd(false);setEditId(null);setForm(blank);}}>Cancel</GhostBtn></div>
    </Modal>}
  </div>;
}


