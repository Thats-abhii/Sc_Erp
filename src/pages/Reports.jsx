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

export function Reports({ leads, orders, payments, expenses, followups, channelPartners }) {
  const money=financeTotals({payments,orders,expenses,channelPartners});
  const rev=money.revenue;
  const exp=money.expenseTotal;
  const convRate=leads.length>0?Math.round(leads.filter(l=>l.status==="Converted").length/leads.length*100):0;

  const srcPerf=["Google Ads","JustDial","Referral","Walk-in","Social Media","CP"].map(src=>({
    src, leads:leads.filter(l=>l.source===src).length, conv:leads.filter(l=>l.source===src&&l.status==="Converted").length,
  }));

  const expByCat=expenses.reduce((acc,e)=>({...acc,[e.cat]:(acc[e.cat]||0)+e.amount}),{});
  const expList=Object.entries(expByCat).map(([k,v])=>({k,v})).sort((a,b)=>b.v-a.v);

  return (
    <div>
      <SectionTitle>Reports & Analytics</SectionTitle>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
        <StatKPI label="Total Leads" value={leads.length} accent={T.blue} icon="" />
        <StatKPI label="Conversion Rate" value={`${convRate}%`} accent={convRate>25?T.green:T.orange} icon="" />
        <StatKPI label="Total Revenue" value={inr(rev)} sub={`${inr(money.partnerCollected)} partners + ${inr(money.orderCollected)} orders`} accent={T.green} icon="" />
        <StatKPI label="Net Profit" value={inr(money.net)} accent={money.net>=0?T.green:T.red} icon="" />
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        {/* P&L */}
        <GlassCard>
          <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:16}}>P & L Summary</div>
          {[["Direct Order Collection",money.orderCollected,T.green,1],["Channel Partner Collection",money.partnerCollected,T.teal,1],["Raw Material Cost",expByCat["Raw Material"]||0,T.red,-1],["Labor",expByCat["Labor"]||0,T.red,-1],["Logistics",expByCat["Logistics"]||0,T.red,-1],["Utilities",expByCat["Utilities"]||0,T.red,-1],].map(([l,v,c,sign])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:`1px solid ${T.border}`,fontSize:13}}>
              <span style={{color:T.sub}}>{l}</span>
              <span style={{fontWeight:600,color:c}}>{sign>0?"+ ":" "}{inr(v)}</span>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",paddingTop:12,fontSize:15,fontWeight:700}}>
            <span style={{color:T.text}}>Net Profit / Loss</span>
            <span style={{fontFamily:"'Space Grotesk',sans-serif",color:money.net>=0?T.green:T.red}}>{inr(money.net)}</span>
          </div>
        </GlassCard>

        {/* Expenses Breakdown */}
        <GlassCard>
          <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:16}}>Expense Breakdown</div>
          {expList.map(({k,v})=>{
            const pct=exp>0?Math.round(v/exp*100):0;
            const c={Raw:T.orange,Labor:T.purple,Logistics:T.teal,Utilities:T.blue,Marketing:T.amber}[k.split(" ")[0]]||T.sub;
            return (
              <div key={k} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}><span style={{color:T.sub}}>{k}</span><span style={{color:c,fontWeight:600}}>{inr(v)} ({pct}%)</span></div>
                <div style={{height:4,background:"rgba(255,255,255,.07)",borderRadius:2,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:c,borderRadius:2}} /></div>
              </div>
            );
          })}
        </GlassCard>
      </div>

      {/* Source Performance */}
      <GlassCard style={{padding:0}}>
        <div style={{padding:"16px 20px",fontSize:13,fontWeight:600,color:T.text,borderBottom:`1px solid ${T.border}`}}>Lead Source Performance</div>
        <Table headers={["Source","Total Leads","Converted","Conversion Rate","Quality"]}>
          {srcPerf.map(s=>{
            const rate=s.leads>0?Math.round(s.conv/s.leads*100):0;
            return (
              <TR key={s.src}>
                <TD bold color={T.text}>{s.src}</TD>
                <TD>{s.leads}</TD>
                <TD bold color={T.green}>{s.conv}</TD>
                <TD>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:60,height:4,background:"rgba(255,255,255,.07)",borderRadius:2,overflow:"hidden"}}><div style={{width:`${rate}%`,height:"100%",background:T.teal}} /></div>
                    <span style={{fontSize:12,color:T.sub}}>{rate}%</span>
                  </div>
                </TD>
                <TD><Pill label={rate>30?"High ROI":rate>15?"Medium":"Low"} color={rate>30?T.green:rate>15?T.amber:T.red} /></TD>
              </TR>
            );
          })}
        </Table>
      </GlassCard>
    </div>
  );
}



export function FollowUps({ followups, setFollowups, leads, setLeads, salesmen=SALESMEN, isManager, canEditReason=false }) {
  const [filter,setFilter]=useState("all");
  const [showAdd,setShowAdd]=useState(false);
  const [saving,setSaving]=useState(false);
  const blank={leadId:leads[0]?.id||"",smId:1,date:todayStr(),time:"10:00",type:"Call",outcome:"Pending",action:"",next:todayStr(),notes:""};
  const [form,setForm]=useState(blank);

  const save=()=>{
    if(saving)return;
    if(!form.leadId)return alert("Lead is required");
    const key=`followup:${form.leadId}:${form.date}:${form.type}`;
    if(onceKeyActive(key))return alert("Processing... duplicate follow-up blocked");
    setSaving(true);
    setFollowups(fs=>[...fs.filter(f=>f.leadId!==form.leadId||f.outcome==="Completed"),{...form,id:`FU${Date.now()}`,smId:Number(form.smId),createdBy:isManager?"Salesman":"Management",createdAt:new Date().toISOString()}]);
    auditLog({event:"Created",source:"Follow-ups",recordType:"Follow-up",leadId:form.leadId});
    setShowAdd(false); setSaving(false);
  };
  const markDone=id=>setFollowups(fs=>fs.map(f=>f.id===id?{...f,outcome:"Completed"}:f));
  const combined=unifiedFollowups(leads,followups,salesmen);
  const categories=["Payment Pending","Quotation Approval Pending","Order Confirmation Pending","Customer Not Responding","Measurement Done but Order Not Closed","Advance Payment Pending","Channel Partner Pending Confirmation"];
  const updateReason=(leadId,reason)=>setLeads?.(ls=>ls.map(l=>l.id===leadId?{...l,followupReason:reason,updated:todayStr()}:l));
  const list=combined.filter(item=>filter==="all"||item.reason===filter).sort((a,b)=>(a.nextDate||"").localeCompare(b.nextDate||""));

  const tabs=[["all","All"],...categories.map(c=>[c,c])];

  return (
    <div>
      <SectionTitle action={!isManager&&<PrimaryBtn onClick={()=>setShowAdd(true)}>+ Log Follow-up</PrimaryBtn>}>Follow-Ups</SectionTitle>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:18}}>
        <StatKPI label="Total Follow-ups" value={combined.length} accent={T.sub} />
        <StatKPI label="Payment Pending" value={combined.filter(i=>i.reason.includes("Payment")).length} accent={T.sub} />
        <StatKPI label="Quotation Pending" value={combined.filter(i=>i.reason==="Quotation Approval Pending").length} accent={T.sub} />
        <StatKPI label="CP Pending" value={combined.filter(i=>i.reason==="Channel Partner Pending Confirmation").length} accent={T.sub} />
      </div>

      <div style={{display:"flex",gap:4,marginBottom:20,background:T.surf,borderRadius:12,padding:4,width:"100%",overflowX:"auto"}}>
        {tabs.map(([v,l])=>{
          const cnt=combined.filter(i=>v==="all"||i.reason===v).length;
          return (
            <button key={v} onClick={()=>setFilter(v)} style={{
              padding:"7px 13px",borderRadius:9,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,transition:"all .15s",whiteSpace:"nowrap",
              background:filter===v?T.amber:"transparent",
              color:filter===v?"#0f172a":T.sub,
            }}>{l} <span style={{opacity:.7}}>({cnt})</span></button>
          );
        })}
      </div>

      <GlassCard style={{padding:0}}>
        <Table headers={["Customer","Contact","Project / Source","Salesman","Reason","Quotation","Pending"]}>
        {list.map(f=>{
          const over=f.nextDate<todayStr();
          return (
            <TR key={f.id}>
              <TD bold>{f.customer}<div style={{fontSize:11,color:T.muted}}>{f.leadId}</div></TD>
              <TD>{f.mobile||"-"}</TD>
              <TD>{f.project}<div style={{fontSize:11,color:T.muted}}>{f.source}</div></TD>
              <TD>{f.salesman}</TD>
              <TD>{canEditReason?<select value={f.reason} onChange={e=>updateReason(f.leadId,e.target.value)} style={{minWidth:190,padding:"6px 8px",fontSize:12}}>{categories.map(c=><option key={c}>{c}</option>)}</select>:<Pill label={f.reason} color={T.sub} />}</TD>
              <TD bold color={f.quoteAmount?T.green:T.muted}>{f.quoteAmount?inr(f.quoteAmount):"-"}</TD>
              <TD bold color={f.pending>0?T.red:T.muted}>{f.pending?inr(f.pending):"-"}</TD>
            </TR>
          );
        })}
        </Table>
        {list.length===0&&<div style={{textAlign:"center",padding:60,color:T.muted,fontSize:13}}>No follow-ups in this view</div>}
      </GlassCard>

      {showAdd&&(
        <Modal title="Log Follow-up" onClose={()=>setShowAdd(false)}>
          <Field label="Lead"><select value={form.leadId} onChange={e=>setForm(f=>({...f,leadId:e.target.value}))}>{leads.map(l=><option key={l.id} value={l.id}>{l.id}  {l.name}</option>)}</select></Field>
          <div style={{marginTop:12}}><Field label="Salesman"><select value={form.smId} onChange={e=>setForm(f=>({...f,smId:e.target.value}))}>{salesmen.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Field></div>
          <FormRow cols={2} ><Field label="Date"><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} /></Field><Field label="Time"><input type="time" value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))} /></Field></FormRow>
          <FormRow cols={2}><Field label="Type"><select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>{["Call","WhatsApp","Visit","Email"].map(s=><option key={s}>{s}</option>)}</select></Field><Field label="Outcome"><select value={form.outcome} onChange={e=>setForm(f=>({...f,outcome:e.target.value}))}>{["Pending","Completed","No Response"].map(s=><option key={s}>{s}</option>)}</select></Field></FormRow>
          <Field label="Notes"><textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} /></Field>
          <div style={{marginTop:12}}><Field label="Next Follow-up Date"><input type="date" value={form.next} onChange={e=>setForm(f=>({...f,next:e.target.value}))} /></Field></div>
          <div style={{display:"flex",gap:10,marginTop:20}}><PrimaryBtn onClick={save} disabled={saving}>{saving?"Processing...":"Save Follow-up"}</PrimaryBtn><GhostBtn onClick={()=>setShowAdd(false)}>Cancel</GhostBtn></div>
        </Modal>
      )}
    </div>
  );
}


