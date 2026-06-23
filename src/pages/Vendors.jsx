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

export function PurchaseSession({ purchases, setPurchases, expenses=[], setExpenses }) {
  const [filter,setFilter]=useState("all");
  const [showAdd,setShowAdd]=useState(false);
  const [editId,setEditId]=useState(null);
  const [exportFrom,setExportFrom]=useState(todayStr().slice(0,7)+"-01");
  const [exportTo,setExportTo]=useState(todayStr());
  const blank={date:todayStr(),vendor:"",vendorGstin:"",invoiceNo:"",invoiceDate:todayStr(),supplierState:COMPANY_STATE,vendorState:COMPANY_STATE,customerState:COMPANY_STATE,place:COMPANY_STATE,category:"Raw Material",item:"",hsn:"",qty:1,unit:"pcs",taxable:"",cgstRate:9,sgstRate:9,igstRate:0,taxType:"Intra-State",paid:""};
  const [form,setForm]=useState(blank);
  const gstinError=gstin=>{
    const raw=String(gstin||"").trim().toUpperCase();
    if(!raw)return "";
    if(raw.length!==15)return "Vendor GSTIN must be exactly 15 characters";
    if(!/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(raw))return "GSTIN format should be like 29ABCDE1234F1Z5";
    return "";
  };
  const applyVendorGstin=value=>{
    const gstin=String(value||"").toUpperCase();
    const party=purchases.find(p=>normalizeGstin(p.vendorGstin)===normalizeGstin(gstin));
    const gstState=stateFromGstin(gstin);
    setForm(f=>{
      const vendorState=resolveState(party?.vendorState,party?.supplierState,gstState,party?.place,f.vendorState);
      const rates=taxRatesForStates(f,vendorState||f.vendorState||COMPANY_STATE,f.customerState||COMPANY_STATE);
      return {...f,vendorGstin:gstin,vendorState:vendorState||f.vendorState,supplierState:vendorState||f.supplierState,place:vendorState||f.place,vendor:party?.vendor||f.vendor,...rates};
    });
  };
  const applyVendorName=value=>{
    const party=purchases.find(p=>normalizePartyName(p.vendor)===normalizePartyName(value));
    setForm(f=>{
      const vendorState=resolveState(party?.vendorState,party?.supplierState,stateFromGstin(party?.vendorGstin),party?.place,f.vendorState);
      const rates=party?taxRatesForStates({...f,...party},vendorState||f.vendorState||COMPANY_STATE,f.customerState||COMPANY_STATE):{};
      return {...f,vendor:value,...(party?{vendorGstin:party.vendorGstin||f.vendorGstin,vendorState,supplierState:vendorState,place:vendorState,...rates}:{})};
    });
  };
  const applyVendorState=value=>{
    const vendorState=resolveState(value)||value;
    setForm(f=>({...f,vendorState,supplierState:vendorState,place:vendorState,...taxRatesForStates(f,vendorState,f.customerState||COMPANY_STATE)}));
  };
  const purchaseTotals=p=>{
    const taxable=Number(p.taxable||0);
    const supplierState=resolveState(p.supplierState,p.vendorState,stateFromGstin(p.vendorGstin),p.place,COMPANY_STATE);
    const customerState=resolveState(p.customerState,COMPANY_STATE);
    const taxType=gstTaxKind(supplierState,customerState);
    const isInter=taxType==="Inter-State";
    const cgstRate=isInter?0:Number(p.cgstRate ?? (p.gstRate?Number(p.gstRate)/2:9));
    const sgstRate=isInter?0:Number(p.sgstRate ?? (p.gstRate?Number(p.gstRate)/2:9));
    const igstRate=isInter?Number(p.igstRate ?? p.gstRate ?? 18):0;
    const gstRate=cgstRate+sgstRate+igstRate;
    const cgst=Math.round(taxable*cgstRate/100);
    const sgst=Math.round(taxable*sgstRate/100);
    const igst=Math.round(taxable*igstRate/100);
    const gstAmount=cgst+sgst+igst;
    const total=taxable+gstAmount;
    const paid=Number(p.paid||0);
    const balance=Math.max(total-paid,0);
    return {taxType,supplierState,customerState,taxable,gstRate,cgstRate,sgstRate,igstRate,gstAmount,cgst,sgst,igst,total,paid,balance};
  };
  const totals=purchases.reduce((acc,p)=>{ const t=purchaseTotals(p); acc.taxable+=t.taxable; acc.gst+=t.gstAmount; acc.total+=t.total; acc.paid+=t.paid; acc.balance+=t.balance; return acc; },{taxable:0,gst:0,total:0,paid:0,balance:0});
  const shown=purchases.filter(p=>{
    const t=purchaseTotals(p);
    if(filter==="all")return true;
    if(filter==="paid")return t.balance<=0;
    if(filter==="pending")return t.balance>0;
    return p.category==="Raw Material";
  });
  const save=()=>{
    if(!form.vendor.trim()||!form.invoiceNo.trim()||!form.item.trim()||!form.taxable)return alert("Vendor, invoice number, item and taxable amount are required");
    if(!hasHsn(form.hsn))return alert(HSN_REQUIRED_MESSAGE);
    if(!resolveState(form.vendorState)||!resolveState(form.customerState))return alert("Supplier State and Customer State are mandatory for GST calculation.");
    const gstError=gstinError(form.vendorGstin);
    if(gstError)return alert(gstError);
    const gstStateError=gstStateMismatch(form.vendorGstin,form.vendorState);
    if(gstStateError)return alert(`Vendor GSTIN state code belongs to ${gstStateError}. Please select the same supplier state before saving the purchase.`);
    const duplicateParty=normalizeGstin(form.vendorGstin)&&purchases.find(p=>p.id!==editId&&normalizeGstin(p.vendorGstin)===normalizeGstin(form.vendorGstin)&&normalizePartyName(p.vendor)!==normalizePartyName(form.vendor));
    if(duplicateParty)return alert(`${GST_DUPLICATE_MESSAGE}\n\nExisting party: ${duplicateParty.vendor}`);
    const t=purchaseTotals(form);
    if(t.taxType!=="Inter-State"&&t.cgstRate+t.sgstRate>18)return alert("CGST + SGST cannot exceed 18%");
    if(t.taxType!=="Inter-State"&&t.cgstRate!==t.sgstRate)return alert("CGST and SGST must be equal");
    if(t.taxType==="Inter-State"&&t.igstRate>18)return alert("IGST cannot exceed 18%");
    const purchaseId=editId||`PUR${Date.now()}`;
    const payload={...form,id:purchaseId,category:"Raw Material",vendor:form.vendor.trim(),vendorGstin:normalizeGstin(form.vendorGstin),supplierState:t.supplierState,vendorState:t.supplierState,customerState:t.customerState,place:t.supplierState,invoiceNo:form.invoiceNo.trim(),item:form.item.trim(),hsn:String(form.hsn||"").trim(),taxable:Number(form.taxable||0),taxType:t.taxType,cgstRate:t.cgstRate,sgstRate:t.sgstRate,igstRate:t.igstRate,gstRate:t.gstRate,paid:Number(form.paid||0),updatedAt:new Date().toISOString()};
    const record=editId?payload:{createdAt:new Date().toISOString(),createdBy:"Management",...payload};
    const total=purchaseTotals(record).total;
    setPurchases(ps=>editId?ps.map(p=>p.id===editId?{...p,...record}:p):[record,...ps]);
    setExpenses?.(es=>{
      const expense={id:`EXP-${purchaseId}`,date:record.date||todayStr(),cat:"Raw Material",name:"Raw Material",amount:total,reason:record.item,desc:record.item,purchaseId,invoiceNo:record.invoiceNo,vendor:record.vendor,gstin:record.vendorGstin,gstAmount:purchaseTotals(record).gstAmount,taxable:purchaseTotals(record).taxable,amountWithGst:total,createdBy:"Purchase",createdAt:record.createdAt||new Date().toISOString()};
      return es.some(e=>e.purchaseId===purchaseId||e.id===expense.id)?es.map(e=>(e.purchaseId===purchaseId||e.id===expense.id)?{...e,...expense}:e):[expense,...es];
    });
    setForm(blank);
    setEditId(null);
    setShowAdd(false);
  };
  const openEdit=p=>{
    const merged={...blank,...p};
    const t=purchaseTotals(merged);
    setEditId(p.id);
    setForm({...merged,taxable:String(p.taxable||""),cgstRate:t.cgstRate,sgstRate:t.sgstRate,igstRate:t.igstRate,gstRate:t.gstRate,paid:String(p.paid||"")});
    setShowAdd(true);
  };
  const exportPurchasesCsv=()=>{
    const rows=purchases.filter(p=>inDateRange(p.invoiceDate||p.date,exportFrom,exportTo)).map(p=>{
      const t=purchaseTotals(p);
      return {
        Purchase_Date:p.date||"",
        Invoice_Date:p.invoiceDate||"",
        Purchase_ID:p.id||"",
        Vendor_Name:p.vendor||"",
        Vendor_GSTIN:p.vendorGstin||"",
        Supplier_State:t.supplierState||p.vendorState||p.place||"",
        Supplier_State_Code:stateCodeFromState(t.supplierState||p.vendorState||p.place),
        Customer_State:t.customerState||COMPANY_STATE,
        Customer_State_Code:stateCodeFromState(t.customerState||COMPANY_STATE),
        Supplier_Invoice_No:p.invoiceNo||"",
        Place_Of_Supply:p.place||"",
        Category:"Raw Material",
        Item_Description:p.item||"",
        HSN_SAC:p.hsn||"",
        Quantity:p.qty||"",
        Unit:p.unit||"",
        Tax_Type:p.taxType||"",
        Amount_Without_GST_Taxable:t.taxable,
        CGST_Percent:t.cgstRate,
        SGST_Percent:t.sgstRate,
        IGST_Percent:t.igstRate,
        Total_GST_Percent:t.gstRate,
        CGST:t.cgst,
        SGST:t.sgst,
        IGST:t.igst,
        Total_GST:t.gstAmount,
        Amount_With_GST:t.total,
        Paid_Amount:t.paid,
        Balance_Amount:t.balance,
        Payment_Status:t.balance<=0?"Paid":"Pending",
        Created_By:p.createdBy||"",
        Created_At:p.createdAt||"",
        Raw_Record:JSON.stringify(p)
      };
    });
    downloadCsv(`smartcovering-purchases-${exportFrom||"all"}-to-${exportTo||"all"}.csv`,rows);
  };
  return <div>
    <SectionTitle action={<PrimaryBtn onClick={()=>{setEditId(null);setForm(blank);setShowAdd(true);}}>+ Add Purchase</PrimaryBtn>}>Purchase</SectionTitle>
    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:14,marginBottom:18}}>
      <StatKPI label="Purchase Value" value={inr(totals.total)} sub="with GST" accent={T.blue} />
      <StatKPI label="Taxable Value" value={inr(totals.taxable)} sub="without GST" accent={T.teal} />
      <StatKPI label="Input GST" value={inr(totals.gst)} sub="CGST + SGST + IGST" accent={T.green} />
      <StatKPI label="Paid" value={inr(totals.paid)} accent={T.purple} />
      <StatKPI label="Balance" value={inr(totals.balance)} accent={T.red} />
    </div>
    <GlassCard style={{marginBottom:18}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
        <div><div style={{fontWeight:800,color:T.text}}>Purchase control</div><div style={{fontSize:12,color:T.muted,marginTop:3}}>Record raw material purchases with GST. Saved purchases also appear automatically in Expenses.</div></div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{[["all","All"],["pending","Pending"],["paid","Paid"],["Raw Material","Raw Material"]].map(([id,label])=><button key={id} onClick={()=>setFilter(id)} style={{border:`1px solid ${filter===id?T.blue:T.border}`,background:filter===id?T.blue:T.cardHi,color:filter===id?"#fff":T.sub,borderRadius:7,padding:"8px 12px",fontSize:12,fontWeight:800,cursor:"pointer"}}>{label}</button>)}</div>
      </div>
    </GlassCard>
    <GlassCard style={{marginBottom:18}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"end",flexWrap:"wrap"}}>
        <div><div style={{fontWeight:800,color:T.text}}>Export purchase CSV</div><div style={{fontSize:12,color:T.muted,marginTop:3}}>Choose invoice date range and download purchase data for CA audit and GST input check.</div></div>
        <div style={{display:"flex",gap:10,alignItems:"end",flexWrap:"wrap"}}>
          <Field label="From"><input type="date" value={exportFrom} onChange={e=>setExportFrom(e.target.value)} /></Field>
          <Field label="To"><input type="date" value={exportTo} onChange={e=>setExportTo(e.target.value)} /></Field>
          <PrimaryBtn onClick={exportPurchasesCsv} color={T.blue}>Export CSV</PrimaryBtn>
        </div>
      </div>
    </GlassCard>
    <GlassCard style={{padding:0}}>
      <Table headers={["Invoice","Vendor","Item","Taxable","GST","Total","Paid","Balance","Status","Action"]}>
        {shown.map(p=>{ const t=purchaseTotals(p); const gstBreakup=t.taxType==="Inter-State"?`IGST ${t.igstRate}%`:`CGST ${t.cgstRate}% + SGST ${t.sgstRate}%`; return <TR key={p.id}><TD bold color={T.blue}>{p.invoiceNo}<div style={{fontSize:11,color:T.muted}}>{p.invoiceDate||p.date}</div></TD><TD bold>{p.vendor}<div style={{fontSize:11,color:T.muted}}>{p.vendorGstin||"-"}</div></TD><TD>{p.item}<div style={{fontSize:11,color:T.muted}}>Raw Material | HSN {p.hsn||"-"}</div></TD><TD bold>{inr(t.taxable)}</TD><TD color={T.green} bold>{inr(t.gstAmount)}<div style={{fontSize:11,color:T.muted}}>{gstBreakup}</div></TD><TD bold color={T.blue}>{inr(t.total)}</TD><TD color={T.purple} bold>{inr(t.paid)}</TD><TD color={t.balance>0?T.red:T.green} bold>{inr(t.balance)}</TD><TD><Pill label={t.balance>0?"Pending":"Paid"} color={t.balance>0?T.red:T.green} /></TD><TD><EditBtn onClick={()=>openEdit(p)}>Edit</EditBtn></TD></TR>; })}
      </Table>
      {shown.length===0&&<div style={{padding:42,textAlign:"center",fontSize:13,color:T.muted}}>No purchase records in this view.</div>}
    </GlassCard>
    {showAdd&&<Modal title={editId?"Edit Purchase":"Add Purchase"} onClose={()=>{setShowAdd(false);setEditId(null);setForm(blank);}} wide>
      <FormRow cols={3}><Field label="Purchase Date"><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} /></Field><Field label="Invoice Date"><input type="date" value={form.invoiceDate} onChange={e=>setForm(f=>({...f,invoiceDate:e.target.value}))} /></Field><Field label="Supplier Invoice No *"><input value={form.invoiceNo} onChange={e=>setForm(f=>({...f,invoiceNo:e.target.value}))} /></Field></FormRow>
      <FormRow cols={4}><Field label="Vendor Name *"><input value={form.vendor} onChange={e=>applyVendorName(e.target.value)} list="purchase-vendor-master" /><datalist id="purchase-vendor-master">{purchases.map(p=><option key={p.id} value={p.vendor}>{p.vendorGstin}</option>)}</datalist></Field><Field label="Vendor GSTIN"><input maxLength={15} value={form.vendorGstin} onChange={e=>applyVendorGstin(e.target.value)} placeholder="29ABCDE1234F1Z5" />{gstinError(form.vendorGstin)&&<div style={{fontSize:11,color:T.red,marginTop:4}}>{gstinError(form.vendorGstin)}</div>}</Field><Field label="Supplier / Vendor State *"><select value={form.vendorState||""} onChange={e=>applyVendorState(e.target.value)}><option value="">Select State</option>{GST_STATE_OPTIONS.map(s=><option key={s.code} value={s.name}>{s.name} ({s.code})</option>)}</select></Field><Field label="Customer State"><input disabled value={form.customerState||COMPANY_STATE} /></Field></FormRow>
      <FormRow cols={4}><Field label="Category"><input disabled value="Raw Material" /></Field><Field label="Item / Description *"><input value={form.item} onChange={e=>setForm(f=>({...f,item:e.target.value}))} /></Field><Field label="HSN / SAC *"><input value={form.hsn} onChange={e=>setForm(f=>({...f,hsn:e.target.value}))} style={!hasHsn(form.hsn)?{borderColor:T.red}:null} /></Field><Field label="Tax Type"><input disabled value={form.taxType||"Intra-State"} /></Field></FormRow>
      <FormRow cols={5}><Field label="Qty"><input type="number" value={form.qty} onChange={e=>setForm(f=>({...f,qty:e.target.value}))} /></Field><Field label="Unit"><input value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))} /></Field><Field label="Taxable Amount *"><input type="number" value={form.taxable} onChange={e=>setForm(f=>({...f,taxable:e.target.value}))} /></Field><Field label="CGST %"><input type="number" disabled={form.taxType==="Inter-State"} value={purchaseTotals(form).cgstRate} onChange={e=>setForm(f=>({...f,cgstRate:e.target.value,sgstRate:e.target.value}))} /></Field><Field label="SGST %"><input type="number" disabled={form.taxType==="Inter-State"} value={purchaseTotals(form).sgstRate} onChange={e=>setForm(f=>({...f,cgstRate:e.target.value,sgstRate:e.target.value}))} /></Field></FormRow>
      <FormRow cols={3}><Field label="IGST %"><input type="number" disabled={form.taxType!=="Inter-State"} value={purchaseTotals(form).igstRate} onChange={e=>setForm(f=>({...f,igstRate:e.target.value}))} /></Field><Field label="Total GST %"><input disabled value={purchaseTotals(form).gstRate} /></Field><Field label="Paid Amount"><input type="number" value={form.paid} onChange={e=>setForm(f=>({...f,paid:e.target.value}))} /></Field></FormRow>
      {(purchaseTotals(form).cgstRate+purchaseTotals(form).sgstRate>18||purchaseTotals(form).igstRate>18)&&<div style={{fontSize:12,color:T.red,marginBottom:10}}>Total GST cannot exceed 18%.</div>}
      {purchaseTotals(form).taxType!=="Inter-State"&&purchaseTotals(form).cgstRate!==purchaseTotals(form).sgstRate&&<div style={{fontSize:12,color:T.red,marginBottom:10}}>CGST and SGST must be equal.</div>}
      <div style={{background:T.cardHi,border:`1px solid ${T.border}`,borderRadius:8,padding:12,marginBottom:14,fontSize:13,color:T.sub}}>Taxable: <b style={{color:T.text}}>{inr(purchaseTotals(form).taxable)}</b> | CGST: <b style={{color:T.green}}>{inr(purchaseTotals(form).cgst)}</b> | SGST: <b style={{color:T.green}}>{inr(purchaseTotals(form).sgst)}</b> | IGST: <b style={{color:T.green}}>{inr(purchaseTotals(form).igst)}</b> | Total GST: <b style={{color:T.green}}>{inr(purchaseTotals(form).gstAmount)}</b> | Total: <b style={{color:T.blue}}>{inr(purchaseTotals(form).total)}</b> | Balance: <b style={{color:purchaseTotals(form).balance>0?T.red:T.green}}>{inr(purchaseTotals(form).balance)}</b></div>
      <div style={{display:"flex",gap:10,marginTop:18}}><SuccessBtn onClick={save}>{editId?"Update Purchase":"Save Purchase"}</SuccessBtn><GhostBtn onClick={()=>{setShowAdd(false);setEditId(null);setForm(blank);}}>Cancel</GhostBtn></div>
    </Modal>}
  </div>;
}


