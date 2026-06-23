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

export function Dashboard({ leads, orders, inventory, followups, payments, expenses, workOrders }) {
  const lowStock = inventory.rawMaterials.filter(i=>i.stock<i.min);
  const overdueFU = followups.filter(f=>f.date<todayStr()&&f.outcome!=="Completed");
  const totalRev = payments.reduce((s,p)=>s+p.amount,0);
  const totalExp = expenses.reduce((s,e)=>s+e.amount,0);
  const pending  = orders.reduce((s,o)=>{ const paid=payments.filter(p=>p.orderId===o.id).reduce((ss,p)=>ss+p.amount,0); return s+(o.final-paid); },0);
  const funnelStages = ["New","Contacted","Site Visit Scheduled","Quoted","Negotiation","Converted","Lost"].map(s=>({ name:s, count:leads.filter(l=>l.status===s).length }));
  const maxFunnel = funnelStages[0]?.count||1;
  const sourceData = ["Google Ads","JustDial","Referral","Walk-in","Social Media","CP"].map(s=>({ k:s==="CP"?"CP":s.split(" ")[0], v:leads.filter(l=>l.source===s).length })).filter(d=>d.v>0);
  const smData = SALESMEN.map(s=>({ k:s.name.split(" ")[0], v:leads.filter(l=>sameId(l.salesman,s.id)&&l.status==="Converted").length }));
  const todayFU = followups.filter(f=>f.date===todayStr());

  return (
    <div>
      <div style={{marginBottom:28}}>
        <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:22,fontWeight:700,color:T.text,marginBottom:4}}>Good morning</h1>
        <p style={{fontSize:13,color:T.muted}}>{new Date().toLocaleDateString("en-IN",{weekday:"long",year:"numeric",month:"long",day:"numeric"})} | SmartCovering</p>
      </div>

      {/* Alert Banner */}
      {(lowStock.length>0||overdueFU.length>0) && (
        <div style={{background:`rgba(248,113,113,.1)`,border:`1px solid rgba(248,113,113,.25)`,borderRadius:12,padding:"12px 18px",marginBottom:20,display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:20}}></span>
          <span style={{fontSize:13,color:"#fca5a5"}}>
            {lowStock.length>0&&`${lowStock.length} items below minimum stock`}
            {lowStock.length>0&&overdueFU.length>0&&" | "}
            {overdueFU.length>0&&`${overdueFU.length} overdue follow-ups`}
          </span>
        </div>
      )}

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:20}}>
        <StatKPI label="Total Leads" value={leads.length} sub={`${leads.filter(l=>l.status==="Converted").length} converted`} accent={T.blue} icon="" />
        <StatKPI label="Revenue Collected" value={inr(totalRev)} sub={`${inr(pending)} outstanding`} accent={T.green} icon="" />
        <StatKPI label="Net Profit Est." value={inr(totalRev-totalExp)} sub={`Expenses: ${inr(totalExp)}`} accent={T.amber} icon="" />
        <StatKPI label="Active Orders" value={orders.filter(o=>!["Closed","Delivered","Installed"].includes(o.status)).length} sub={`${orders.length} total orders`} accent={T.purple} icon="" />
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
        <StatKPI label="Follow-ups Today" value={todayFU.length} accent={T.sub} icon="" />
        <StatKPI label="Overdue Follow-ups" value={overdueFU.length} accent={T.sub} icon="" />
        <StatKPI label="Low Stock Items" value={lowStock.length} accent={lowStock.length>0?T.red:T.green} icon="" />
        <StatKPI label="Work Orders Active" value={workOrders.filter(w=>w.status!=="Completed").length} accent={T.orange} icon="" />
      </div>

      {/* Charts Row */}
      <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr 1fr",gap:16,marginBottom:20}}>
        <GlassCard>
          <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:16}}>Lead Funnel</div>
          {funnelStages.map(s=><FunnelBar key={s.name} label={s.name} count={s.count} max={maxFunnel} />)}
        </GlassCard>
        <GlassCard>
          <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:16}}>Leads by Source</div>
          <BarChart data={sourceData} height={130} />
        </GlassCard>
        <GlassCard>
          <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:16}}>Conversions by Salesman</div>
          <BarChart data={smData} height={130} />
        </GlassCard>
      </div>

      {/* Bottom Row */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {/* Today's Follow-ups */}
        <GlassCard>
          <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:14}}>Today's Follow-up Queue</div>
          {followups.filter(f=>f.date<=todayStr()&&f.outcome!=="Completed").slice(0,5).map(f=>{
            const lead=leads.find(l=>l.id===f.leadId);
            const over=f.date<todayStr();
            return (
              <div key={f.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${T.border}`}}>
                <div style={{width:36,height:36,borderRadius:10,background:"rgba(245,158,11,.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
                  {f.type==="Call"?"":f.type==="Visit"?"":f.type==="WhatsApp"?"":""}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:500,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{lead?.name||"Unknown"}</div>
                  <div style={{fontSize:11,color:T.muted}}>{f.time} | {f.type}</div>
                </div>
                {over&&<Pill label="OVERDUE" color={T.sub} />}
              </div>
            );
          })}
          {followups.filter(f=>f.date<=todayStr()&&f.outcome!=="Completed").length===0&&
            <div style={{textAlign:"center",padding:24,color:T.muted,fontSize:13}}>All caught up! </div>}
        </GlassCard>

        {/* Low Stock */}
        <GlassCard>
          <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:14}}> Low Stock Alerts</div>
          {lowStock.length===0
            ? <div style={{textAlign:"center",padding:24,color:T.green,fontSize:13}}>All items adequately stocked</div>
            : lowStock.map(item=>(
              <div key={item.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${T.border}`}}>
                <div>
                  <div style={{fontSize:13,fontWeight:500,color:T.text}}>{item.name}</div>
                  <div style={{fontSize:11,color:T.muted}}>{item.supplier}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:14,fontWeight:700,color:T.red}}>{item.stock} {item.unit}</div>
                  <div style={{fontSize:11,color:T.muted}}>min: {item.min}</div>
                </div>
              </div>
            ))
          }
        </GlassCard>
      </div>
    </div>
  );
}



export function SimpleDashboard({ leads, orders, followups, payments, role, channelPartners, expenses=[], salesmen=SALESMEN }) {
  const [openTask,setOpenTask]=useState(null);
  const [selectedDate,setSelectedDate]=useState(todayStr());
  const money=financeTotals({payments,orders,expenses,channelPartners});
  const converted=leads.filter(l=>l.status==="Converted").length;
  const activeLeads=leads.filter(l=>!l.paymentOrderId&&!orders.some(o=>o.leadId===l.id)).length;
  const smartFollowups=unifiedFollowups(leads,followups);
  const today=todayStr();
  const currentMonth=today.slice(0,7);
  const currentYear=today.slice(0,4);
  const expensesMTD=expenses.filter(e=>String(e.date||"").startsWith(currentMonth)).reduce((s,e)=>s+Number(e.amount||0),0);
  const expensesYTD=expenses.filter(e=>String(e.date||"").startsWith(currentYear)).reduce((s,e)=>s+Number(e.amount||0),0);
  const addDays=(date,days)=>{ const d=new Date(`${date}T12:00:00`); d.setDate(d.getDate()+days); return d.toISOString().split("T")[0]; };
  const dashboardDate=/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)?selectedDate:today;
  const tomorrow=addDays(today,1);
  const hour=new Date().getHours();
  const greeting=hour<12?"Good morning":hour<17?"Good afternoon":hour<21?"Good evening":"Good night";
  const greetingSub=hour<12?"A fresh start for today's leads and follow-ups.":hour<17?"Keep the day's work moving smoothly.":hour<21?"Wrap up pending work and review progress.":"Review the day and get ready for tomorrow.";
  const sky=hour<12
    ? {bg:"#fff7ed",border:"#fed7aa",accent:"#f59e0b",label:"Morning"}
    : hour<17
      ? {bg:"#eff6ff",border:"#bfdbfe",accent:"#2563eb",label:"Afternoon"}
      : hour<21
        ? {bg:"#fff1f2",border:"#fecdd3",accent:"#f97316",label:"Evening"}
        : {bg:"#eef2ff",border:"#c7d2fe",accent:"#4f46e5",label:"Night"};
  const todayLabel=new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  const title=role==="salesman"?"My Sales Dashboard":greeting;
  const leadById=id=>leads.find(l=>l.id===id);
  const isToday=dashboardDate===today;
  const dateLabel=new Date(`${dashboardDate}T00:00:00`).toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"short",year:"numeric"});
  const rollStatus=date=>date<dashboardDate?"Rolled over":(date===dashboardDate?"Today":"Upcoming");
  const isProductionOrder=o=>!!(o.productionStage||["Approval Pending","In Production","Completed","Installed","Closed"].includes(o.status));
  const isProductionCompleted=o=>(o.productionStage==="Completed"||o.status==="Completed")&&o.productionStage!=="Installation Completed"&&!["Installed","Closed"].includes(o.status);
  const isInstallationCompleted=o=>o.productionStage==="Installation Completed";
  const todayFollowups=smartFollowups
    .map(f=>({lead:leadById(f.leadId),followup:f,time:f.nextDate||"",action:f.reason||"Follow-up pending",status:f.status||"Pending",originalDate:f.lastDate||"",dashboardDate}))
    .filter(t=>t.lead);
  const measurementTasks=leads
    .filter(l=>l.status!=="Rejected"&&l.salesman&&!l.measurement&&(l.svDone||l.status==="Site Visit Scheduled"))
    .map(l=>({lead:l,time:l.measurementDate||l.updated||l.created||"",action:"Measurement pending",status:l.svDone||l.status==="Site Visit Scheduled"?"Site visit done":"Site visit pending",originalDate:l.created||"",dashboardDate}));
  const balanceTasks=orders
    .map(o=>{
      const paid=paidForOrder(o,payments);
      return {order:o,lead:leadById(o.leadId),paid,amount:Math.max(Number(o.final||0)-paid,0),status:o.balance>0?"Partially Paid":"Pending Balance",originalDate:o.created,dashboardDate};
    })
    .filter(t=>isProductionOrder(t.order)&&t.amount>0);
  const installationTasks=orders
    .filter(isProductionCompleted)
    .map(o=>({order:o,lead:leadById(o.leadId),action:o.installationDate?"Installation scheduled":"Installation pending",status:o.installationDate?"Scheduled":"Pending",originalDate:o.completedDate||o.created||"",dashboardDate}));
  const completedToday=orders
    .filter(isInstallationCompleted)
    .map(o=>({order:o,lead:leadById(o.leadId),name:o.customer,detail:"Installation completed",date:o.installationCompletedDate||o.completedDate||o.delivery||o.created||"",status:o.status||"Installed"}));
  const completedChart=completedToday.length;
  const remainingChart=todayFollowups.length+measurementTasks.length+balanceTasks.length+installationTasks.length;
  const productionOrders=orders.filter(o=>!["Delivered","Installed","Closed"].includes(o.status)).length;
  const chartTotal=completedChart+remainingChart;
  const completedDeg=chartTotal?Math.round((completedChart/chartTotal)*360):0;
  const cpLeadNotifications=leads.filter(l=>l.source==="CP"&&["New","Contacted","Site Visit Scheduled"].includes(l.status)).slice(0,5);
  const taskGroups={
    followups:{title:"Follow-up",count:todayFollowups.length,color:T.sub,items:todayFollowups},
    measurement:{title:"Measurement Pending",count:measurementTasks.length,color:T.blue,items:measurementTasks},
    balance:{title:"Balance Pending",count:balanceTasks.length,color:T.red,items:balanceTasks},
    installation:{title:"Installation Pending",count:installationTasks.length,color:T.purple,items:installationTasks},
    completed:{title:"Completed",count:completedToday.length,color:T.green,items:completedToday},
  };
  const Sticker=({ id })=>{
    const g=taskGroups[id];
    return (
      <button onClick={()=>setOpenTask(id)} style={{background:"#fff",border:`1px solid ${T.border}`,borderLeft:`5px solid ${g.color}`,borderRadius:10,padding:"16px 18px",textAlign:"left",cursor:"pointer",boxShadow:"0 8px 18px rgba(15,23,42,.05)",fontFamily:"inherit"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
          <div>
            <div style={{fontSize:13,fontWeight:800,color:T.text,marginBottom:5}}>{g.title}</div>
            <div style={{fontSize:12,color:T.muted}}>For {dashboardDate} | click to view</div>
          </div>
          <div style={{width:38,height:38,borderRadius:10,background:`${g.color}14`,color:g.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800}}>{g.count}</div>
        </div>
      </button>
    );
  };
  const Empty=()=> <div style={{fontSize:13,color:T.muted,padding:"10px 0"}}>No pending items.</div>;
  const modalGroup=openTask?taskGroups[openTask]:null;
  const TimeIcon=()=>(
    <div style={{width:58,height:58,borderRadius:18,background:sky.bg,border:`1px solid ${sky.border}`,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden",flexShrink:0}}>
      {hour<21
        ? <div style={{width:28,height:28,borderRadius:"50%",background:sky.accent,boxShadow:`0 0 0 8px ${sky.accent}22,0 0 28px ${sky.accent}55`}} />
        : <div style={{width:30,height:30,borderRadius:"50%",background:sky.accent,boxShadow:`0 0 0 8px ${sky.accent}1f`,position:"relative"}}>
            <div style={{position:"absolute",width:26,height:26,borderRadius:"50%",background:sky.bg,left:9,top:-3}} />
          </div>}
      <div style={{position:"absolute",right:9,bottom:10,width:8,height:8,borderRadius:"50%",background:sky.accent,opacity:.35}} />
      <div style={{position:"absolute",left:10,top:10,width:5,height:5,borderRadius:"50%",background:sky.accent,opacity:.25}} />
    </div>
  );

  return (
    <div>
      <div style={{marginBottom:22}}>
        {role==="salesman"
          ? <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:24,color:T.text,marginBottom:4}}>{title}</h1>
          : <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"center",flexWrap:"wrap",background:`linear-gradient(135deg, ${sky.bg}, #ffffff)`,border:`1px solid ${sky.border}`,borderRadius:12,padding:"16px 18px",boxShadow:"0 10px 28px rgba(15,23,42,.06)"}}>
              <div style={{display:"flex",alignItems:"center",gap:14}}>
                <TimeIcon />
                <div>
                  <div style={{fontSize:11,fontWeight:900,color:sky.accent,textTransform:"uppercase",letterSpacing:.6}}>{sky.label}</div>
                  <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:25,color:T.text,margin:"2px 0 4px"}}>{title}</h1>
                  <div style={{fontSize:13,color:T.sub,fontWeight:700}}>{greetingSub}</div>
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:12,color:T.muted,fontWeight:800}}>Today</div>
                <div style={{fontSize:15,color:T.text,fontWeight:900,marginTop:3}}>{todayLabel}</div>
              </div>
            </div>}
      </div>

      {cpLeadNotifications.length>0&&<GlassCard style={{marginBottom:16,borderColor:"rgba(96,165,250,.28)",background:"rgba(96,165,250,.06)"}}>
        <div style={{fontSize:13,fontWeight:800,color:T.blue,marginBottom:10}}>New Channel Partner Leads</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {cpLeadNotifications.map(l=><span key={l.id} style={{fontSize:12,color:T.text,border:`1px solid ${T.border}`,background:"#fff",borderRadius:8,padding:"7px 10px"}}>{l.name} | {l.channelPartnerName||"CP"} | Assign salesman in Lead Management</span>)}
        </div>
      </GlassCard>}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14,marginBottom:18}}>
        <StatKPI label="Total Leads" value={leads.length} sub={`Active ${activeLeads} + Converted ${converted}`} accent={T.blue} />
        <StatKPI label="Active Leads" value={activeLeads} sub="Active lead" accent={T.amber} />
        <StatKPI label="Converted" value={converted} sub="successful leads" accent={T.green} />
        <StatKPI label="Total Collected" value={inr(money.revenue)} sub="retail + channel partner" accent={T.green} />
        <StatKPI label="Retail Collected" value={inr(money.orderCollected)} sub={`${inr(money.orderOutstanding)} pending`} accent={T.blue} />
        <StatKPI label="CP Collected" value={inr(money.partnerCollected)} sub={`${inr(money.partnerOutstanding)} pending`} accent={T.teal} />
        <StatKPI label="Retail Pending" value={inr(money.orderOutstanding)} sub="direct customer balance" accent={T.orange} />
        <StatKPI label="CP Pending" value={inr(money.partnerOutstanding)} sub="channel partner balance" accent={T.red} />
        <StatKPI label="Expenses MTD" value={inr(expensesMTD)} sub={currentMonth} accent={T.red} />
        <StatKPI label="Expenses YTD" value={inr(expensesYTD)} sub={currentYear} accent={T.purple} />
      </div>

      <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr)",gap:16,alignItems:"start"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14}}>
          {["followups","measurement","balance","installation","completed"].map(id=><Sticker key={id} id={id} />)}
        </div>
      </div>
      {modalGroup&&(
        <Modal title={modalGroup.title} onClose={()=>setOpenTask(null)} wide>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {!modalGroup.items.length&&<Empty />}
            {openTask==="followups"&&modalGroup.items.map(t=>(
              <div key={`${t.lead.id}-${t.time}`} style={{border:`1px solid ${T.border}`,borderRadius:8,padding:12}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:10}}><b>{t.lead.name}</b><span style={{fontSize:12,color:T.muted}}>{t.lead.mobile}</span></div>
                <div style={{fontSize:13,color:T.muted,marginTop:4}}>Lead Type: {t.lead.product} | Reason: <b style={{color:T.text}}>{t.action}</b></div>
                <div style={{fontSize:12,color:T.muted,marginTop:4}}>Pending: <b style={{color:T.text}}>{t.followup?.pending?inr(t.followup.pending):"-"}</b> | Last Follow-Up: {t.originalDate||"-"} | Salesman: {smName(t.lead.salesman,salesmen)||"-"}</div>
                <div style={{fontSize:12,color:T.muted,marginTop:4}}>Contact: {t.lead.mobile} | {t.lead.location||"-"}</div>
              </div>
            ))}
            {openTask==="measurement"&&modalGroup.items.map(t=>(
              <div key={t.lead.id} style={{border:`1px solid ${T.border}`,borderRadius:8,padding:12}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:10}}><b>{t.lead.name}</b><span style={{fontSize:12,color:T.muted}}>{smName(t.lead.salesman,salesmen)||"-"}</span></div>
                <div style={{fontSize:13,color:T.muted,marginTop:4}}>Lead Details: {t.lead.product} | {t.lead.location}</div>
                <div style={{fontSize:12,color:T.muted,marginTop:4}}>Site Visit Status: {t.status} | Measurement Due: {t.time||t.lead.updated||t.lead.created||"-"}</div>
                <div style={{marginTop:8,display:"flex",gap:8,flexWrap:"wrap"}}><Pill label="Measurement Pending" color={T.blue} /></div>
              </div>
            ))}
            {openTask==="balance"&&modalGroup.items.map(t=>(
              <div key={t.order.id} style={{border:`1px solid ${T.border}`,borderRadius:8,padding:12}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:10}}><b>{t.order.customer}</b><span style={{fontSize:13,color:T.red,fontWeight:800}}>Balance {inr(t.amount)}</span></div>
                <div style={{fontSize:13,color:T.muted,marginTop:4}}>Order ID: {t.order.id} | Total: {inr(t.order.final||0)} | Paid: {inr(t.paid||0)}</div>
                <div style={{fontSize:12,color:T.muted,marginTop:4}}>Payment Status: {t.amount>0&&t.paid>0?"Partially Paid":"No Paid"} | Production: {t.order.productionStage||t.order.status}</div>
              </div>
            ))}
            {openTask==="installation"&&modalGroup.items.map(t=>(
              <div key={t.order.id} style={{border:`1px solid ${T.border}`,borderRadius:8,padding:12}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:10}}><b>{t.order.customer}</b><span style={{fontSize:12,color:T.muted}}>{t.order.id}</span></div>
                <div style={{fontSize:13,color:T.muted,marginTop:4}}>Production Completion Date: {t.order.completedDate||"-"} | Installation Date: {t.order.installationDate||"Not scheduled"}</div>
                <div style={{marginTop:8,display:"flex",gap:8,flexWrap:"wrap"}}><Pill label={t.action} color={T.purple} /><Pill label={t.status} color={T.purple} /></div>
              </div>
            ))}
            {openTask==="completed"&&modalGroup.items.map(t=>(
              <div key={t.order.id} style={{border:`1px solid ${T.border}`,borderRadius:8,padding:12}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:10}}><b>{t.name}</b><span style={{fontSize:12,color:T.muted}}>{t.order.id}</span></div>
                <div style={{fontSize:13,color:T.muted,marginTop:4}}>Installation Completion Date: {t.date||"-"} | Final Status: {t.status}</div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}



export function SalesmanDashboard({ leads, setLeads, orders, setOrders, payments, setPayments, followups=[], partners, setPartners, activeSalesmanId, smartInventory, salesmen=SALESMEN }) {
  const [measurementLead,setMeasurementLead]=useState(null);
  const [quoteLead,setQuoteLead]=useState(null);
  const [paymentLead,setPaymentLead]=useState(null);
  const [quoteAfterMeasurementLeadId,setQuoteAfterMeasurementLeadId]=useState(null);
  const blankWindow={label:"Window 1",height:"",heightUnit:"Feet",width:"",widthUnit:"Feet",qty:1,color:"",material:""};
  const blankMeasurement={type:"Blind",windows:[blankWindow],budget:"",notes:""};
  const [measurement,setMeasurement]=useState(blankMeasurement);
  const [quote,setQuote]=useState({rate:"",discount:0,gst:18,notes:""});
  const [paymentForm,setPaymentForm]=useState({status:"Partially Paid",paid:"",notes:""});
  const assigned=sortLeadsNewest(leads.filter(l=>sameId(l.salesman,activeSalesmanId)&&l.status!=="Rejected"));
  const assignedFollowups=unifiedFollowups(assigned,followups,salesmen).filter(f=>sameId(f.smId,activeSalesmanId));
  const followupByLead=assignedFollowups.reduce((acc,f)=>({...acc,[f.leadId]:f}),{});
  const partnerRequestFor=lead=>partners?.find(p=>p.id===lead.channelPartnerId)?.requests?.find(r=>r.id===lead.partnerRequestId);
  const salesmanLeadQuote=lead=>lead.quotation||partnerRequestFor(lead)?.quotation||null;
  const salesmanLeadPaid=lead=>leadPaidFromOrders(lead,orders,payments)||Number(partnerRequestFor(lead)?.paid||0)||Number(lead.paymentPaid||0);
  const salesmanLeadBalance=lead=>{
    const quote=salesmanLeadQuote(lead);
    const order=orders.find(o=>o.id===lead.paymentOrderId||o.leadId===lead.id);
    return order?leadBalanceFromOrders(lead,orders,payments):(quote?Math.max(Number(quote.amount||0)-salesmanLeadPaid(lead),0):0);
  };
  const quotedSales=assigned.filter(l=>salesmanLeadQuote(l));
  const quotedTotal=quotedSales.reduce((s,l)=>s+Number(salesmanLeadQuote(l)?.amount||0),0);
  const collectedTotal=quotedSales.reduce((s,l)=>s+salesmanLeadPaid(l),0);
  const pendingTotal=quotedSales.reduce((s,l)=>s+salesmanLeadBalance(l),0);
  const syncPartnerRequest=(lead,patch)=>{
    if(!lead?.channelPartnerId||!lead?.partnerRequestId)return;
    setPartners?.(ps=>ps.map(p=>p.id===lead.channelPartnerId?{...p,requests:(p.requests||[]).map(r=>r.id===lead.partnerRequestId?{...r,...patch}:r)}:p));
  };
  const isCpQuoteAccepted=lead=>!!lead.channelPartnerId&&(!!lead.cpAccepted||!!partnerRequestFor(lead)?.cpAccepted);
  const canQuoteLead=lead=>!!lead.measurement&&!lead.paymentMarked&&!isCpQuoteAccepted(lead);
  const canMarkPayment=lead=>!!salesmanLeadQuote(lead)&&!lead.paymentMarked&&(!lead.channelPartnerId||isCpQuoteAccepted(lead));
  const updateLead=(id,patch)=>setLeads(ls=>ls.map(l=>l.id===id?{...l,...patch,updated:todayStr(),updatedAt:new Date().toISOString()}:l));
  const markContacted=lead=>{ if(lead.contactDone)return; updateLead(lead.id,{contactDone:true,status:"Contacted"}); };
  const markSv=lead=>{ if(lead.svDone)return; updateLead(lead.id,{svDone:true,status:"Site Visit Scheduled"}); };
  const beginQuote=lead=>{
    const existing=lead.quotation||{};
    const windows=measurementWindows(lead);
    const baseRate=existing.rate||"";
    setQuoteLead(lead);
    setQuote({
      rate:baseRate,
      discount:existing.discount||0,
      gst:existing.gst ?? 18,
      productType:existing.productType||quotedProductType(lead),
      notes:existing.notes||"",
      lineItems:windows.map((w,i)=>({
        label:w.label||`Window ${i+1}`,
        productType:existing.lineItems?.[i]?.productType||existing.productType||quotedProductType(lead),
        rate:existing.lineItems?.[i]?.rate ?? baseRate
      }))
    });
  };
  const openMeasurement=(lead,continueToQuote=false)=>{
    if(lead.measurement&&!lead.channelPartnerId&&!continueToQuote)return;
    const draft=lead.cpDraftMeasurement||partnerRequestFor(lead)?.measurement;
    setMeasurementLead(lead);
    setQuoteAfterMeasurementLeadId(continueToQuote?lead.id:null);
    const sourceMeasurement=lead.measurement||draft;
    setMeasurement(sourceMeasurement?{...sourceMeasurement,budget:sourceMeasurement.budget||lead.budget||"",windows:(sourceMeasurement.windows||[blankWindow]).map((w,i)=>({...w,label:w.label||`Window ${i+1}`}))}:{...blankMeasurement,type:lead.product?.toLowerCase().includes("mesh")?"Mesh":"Blind",windows:[blankWindow]});
  };
  const saveMeasurement=()=>{
    if(!measurementLead)return;
    if(!measurement.budget)return alert("Budget is required");
    const windows=(measurement.windows||[]).map((w,i)=>enrichMeasurementLine({...w,label:w.label||`Window ${i+1}`,qty:Number(w.qty||1)}));
    const measurementError=validateMeasurementRows(windows);
    if(measurementError)return alert(measurementError);
    const updatedLead={...measurementLead,measurement:{...measurement,windows},cpDraftMeasurement:null,budget:Number(measurement.budget),status:"Site Visit Scheduled"};
    updateLead(measurementLead.id,{measurement:updatedLead.measurement,cpDraftMeasurement:null,budget:updatedLead.budget,status:"Site Visit Scheduled"});
    const shouldQuote=quoteAfterMeasurementLeadId===measurementLead.id;
    setMeasurementLead(null); setMeasurement(blankMeasurement); setQuoteAfterMeasurementLeadId(null);
    if(shouldQuote)beginQuote(updatedLead);
  };
  const updateWindow=(idx,patch)=>setMeasurement(m=>({...m,windows:(m.windows||[]).map((w,i)=>i===idx?{...w,...patch}:w)}));
  const applyInventoryChoice=(idx,value)=>{
    const opt=inventoryChoiceOptions(smartInventory,measurement.type).find(o=>o.value===value);
    if(!opt)return;
    updateWindow(idx,{inventoryChoice:value,color:opt.color,material:opt.material,code:opt.code});
  };
  const applyInventoryCode=(idx,value)=>{
    const opt=inventoryCodeOptions(smartInventory,measurement.type).find(o=>o.value===value);
    if(!opt)return;
    updateWindow(idx,{inventoryChoice:opt.material,color:opt.color,material:opt.material,code:opt.value});
  };
  const addWindow=()=>setMeasurement(m=>({...m,windows:[...(m.windows||[]),{...blankWindow,label:`Window ${(m.windows||[]).length+1}` }]}));
  const removeWindow=idx=>setMeasurement(m=>({...m,windows:(m.windows||[]).filter((_,i)=>i!==idx)}));
  const openQuote=lead=>{
    if(!lead.measurement)return alert("Please fill measurement first");
    if(lead.paymentMarked)return alert("Payment is already marked, quotation cannot be revised");
    if(isCpQuoteAccepted(lead))return alert("Channel partner already accepted this quotation, it cannot be revised");
    if(lead.channelPartnerId){
      openMeasurement(lead,true);
      return;
    }
    beginQuote(lead);
  };
  const quoteWindows=quoteLead?measurementWindows(quoteLead):[];
  const updateQuoteLine=(idx,patch)=>setQuote(q=>({...q,lineItems:quoteWindows.map((w,i)=>i===idx?{...(q.lineItems?.[i]||{}),label:w.label||`Window ${i+1}`,...patch}:{...(q.lineItems?.[i]||{}),label:w.label||`Window ${i+1}`})}));
  const applyQuoteRateToAll=()=>setQuote(q=>({...q,lineItems:quoteWindows.map((w,i)=>({...(q.lineItems?.[i]||{}),label:w.label||`Window ${i+1}`,productType:q.lineItems?.[i]?.productType||q.productType||quotedProductType(quoteLead),rate:q.rate}))}));
  const saveQuote=()=>{
    if(!quoteLead)return;
    if(quoteLead.paymentMarked||isCpQuoteAccepted(quoteLead))return alert("This quotation is locked and cannot be revised");
    const lineItems=quoteWindows.map((w,i)=>({...(quote.lineItems?.[i]||{}),label:w.label||`Window ${i+1}`,productType:quote.lineItems?.[i]?.productType||quote.productType||quotedProductType(quoteLead),rate:Number(quote.lineItems?.[i]?.rate||quote.rate||0)}));
    if(lineItems.some(item=>!Number(item.rate)))return alert("Sq ft rate is required for every window/product line");
    const baseQuote={...quote,lineItems,rate:Number(quote.rate||lineItems[0]?.rate||0),productType:quote.productType||quotedProductType(quoteLead)};
    const totals=quoteTotals(quoteLead,baseQuote);
    const quotation={...baseQuote,lineItems:totals.lines.map((line,i)=>({...lineItems[i],sqft:line.chargeableSqft,amount:line.amount})),discount:totals.discountPct,gst:totals.gstPct,gstAmount:totals.gstAmount,taxable:totals.taxable,amount:Math.round(totals.total),date:todayStr(),locked:true};
    updateLead(quoteLead.id,{quotation,status:"Quoted"});
    syncPartnerRequest(quoteLead,{quotation,quotationAmount:quotation.amount,status:"Quotation Sent",leadStatus:"Quoted",pdfReady:true});
    openQuotationPdf({...quoteLead,quotation},quotation);
    setQuoteLead(null); setQuote({rate:"",discount:0,gst:18,notes:"",lineItems:[]});
  };
  const openPayment=lead=>{
    if(lead.paymentMarked)return;
    const quotation=salesmanLeadQuote(lead);
    if(!quotation)return alert("Generate quotation first");
    setPaymentLead({...lead,quotation});
    setPaymentForm({status:"Fully Paid",paid:quotation.amount||"",notes:""});
  };
  const markPaymentDone=()=>{
    const lead=paymentLead;
    if(!lead)return;
    if(lead.paymentMarked)return;
    const quotation=salesmanLeadQuote(lead)||lead.quotation||{};
    const quotedAmount=Number(quotation.amount||0);
    const paidAmount=paymentForm.status==="Fully Paid"?quotedAmount:(paymentForm.status==="No Paid"?0:Number(paymentForm.paid||0));
    if(paidAmount>quotedAmount)return alert("Paid amount cannot be more than quotation amount");
    const balance=Math.max(quotedAmount-paidAmount,0);
    updateLead(lead.id,{quotation,paymentMarked:true,paymentStatus:paymentForm.status,paymentPaid:paidAmount,paymentBalance:balance,status:"Converted"});
    syncPartnerRequest(lead,{paid:paidAmount,balance,status:paidAmount>0?"Payment Updated":"Quotation Sent",stage:paidAmount>0?"Payment Done - Awaiting Management Order":"Payment Pending"});
    setPaymentLead(null);
    setPaymentForm({status:"Partially Paid",paid:"",notes:""});
  };
  const progress=lead=>[
    ["Contacted",lead.contactDone||["Contacted","Site Visit Scheduled","Quoted","Converted"].includes(lead.status)],
    ["SV Done",lead.svDone||["Site Visit Scheduled","Quoted","Converted"].includes(lead.status)],
    ["Measurement",!!lead.measurement],
    ["Quotation",!!salesmanLeadQuote(lead)],
    ["Payment",!!lead.paymentMarked],
  ];

  return (
    <div>
      <SectionTitle>My Salesman Dashboard</SectionTitle>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:14,marginBottom:18}}>
        <StatKPI label="Assigned Leads" value={assigned.length} accent={T.blue} />
        <StatKPI label="Contacted" value={assigned.filter(l=>l.contactDone||l.status==="Contacted").length} accent={T.orange} />
        <StatKPI label="Measurements" value={assigned.filter(l=>l.measurement).length} accent={T.teal} />
        <StatKPI label="Quotations" value={assigned.filter(l=>l.quotation).length} accent={T.purple} />
        <StatKPI label="Follow-ups" value={assignedFollowups.length} accent={T.sub} />
        <StatKPI label="Paid Orders" value={quotedSales.filter(l=>salesmanLeadPaid(l)>0).length} accent={T.green} />
        <StatKPI label="Total Sales" value={inr(quotedTotal)} accent={T.blue} />
        <StatKPI label="Amount Collected" value={inr(collectedTotal)} accent={T.green} />
        <StatKPI label="Amount Pending" value={inr(pendingTotal)} accent={T.red} />
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {assigned.map(lead=>(
          <GlassCard key={lead.id}>
            {(()=>{ const leadFollowup=followupByLead[lead.id]; return <>
            <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"flex-start",flexWrap:"wrap"}}>
              <div>
                <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:16,fontWeight:800,color:T.text}}>{lead.name}</div>
                <div style={{fontSize:12,color:T.muted,marginTop:3}}>{lead.mobile} | {lead.location} | {lead.product}</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:10}}>
                  {progress(lead).map(([label,done])=><Pill key={label} label={label} color={done?T.green:T.muted} />)}
                </div>
              </div>
              <StatusPill s={lead.status} />
            </div>
            {leadFollowup&&<div style={{marginTop:10,padding:"10px 12px",border:`1px solid ${T.border}`,borderRadius:8,background:T.cardHi,fontSize:12,color:T.sub}}>
              <b style={{color:T.text}}>Follow-up:</b> {leadFollowup.reason}
              <span style={{marginLeft:8}}>Pending: <b style={{color:T.text}}>{leadFollowup.pending?inr(leadFollowup.pending):"-"}</b></span>
            </div>}
            {lead.measurement&&<div style={{marginTop:12,padding:12,border:`1px solid ${T.border}`,borderRadius:8,background:T.cardHi,fontSize:12,color:T.sub}}>
              <b style={{color:T.text}}>Measurement:</b> {lead.measurement.type} | {measurementWindows(lead).length} window(s) | {leadAreaSqft(lead)} sq ft
              <div style={{marginTop:6,display:"flex",gap:6,flexWrap:"wrap"}}>{measurementWindows(lead).map((w,i)=><span key={i} style={{border:`1px solid ${T.border}`,borderRadius:6,padding:"4px 8px",background:"#fff"}}>{w.label}: {measurementDisplay(w)} | {w.sqft} SQFT | {w.color}</span>)}</div>
            </div>}
            {salesmanLeadQuote(lead)&&<div style={{marginTop:10,fontSize:12,color:T.sub}}>Quotation: <b style={{color:T.green}}>{inr(salesmanLeadQuote(lead).amount)}</b> | {salesmanLeadQuote(lead).productType||quotedProductType(lead)} | {salesmanLeadQuote(lead).lineItems?.length>1?"multiple rates":`rate ${inr(salesmanLeadQuote(lead).rate)}/sq ft`} | GST {salesmanLeadQuote(lead).gst||0}%</div>}
            {salesmanLeadQuote(lead)&&lead.paymentMarked&&<div style={{marginTop:8,fontSize:12,color:T.sub}}>Payment: <b style={{color:salesmanLeadPaid(lead)>0?T.green:T.red}}>{paymentStatusFromAmounts(salesmanLeadPaid(lead),salesmanLeadQuote(lead)?.amount||0)} | Collected {inr(salesmanLeadPaid(lead))}</b> | <b style={{color:salesmanLeadBalance(lead)>0?T.red:T.green}}>Left {inr(salesmanLeadBalance(lead))}</b></div>}
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:14}}>
              {!lead.contactDone&&<PrimaryBtn small onClick={()=>markContacted(lead)}>Mark Contacted</PrimaryBtn>}
              {!lead.svDone&&<PrimaryBtn small color={T.orange} onClick={()=>markSv(lead)}>Mark SV Done</PrimaryBtn>}
              {!lead.measurement&&<PrimaryBtn small color={T.teal} onClick={()=>openMeasurement(lead)}>Fill Measurement</PrimaryBtn>}
              {lead.channelPartnerId&&lead.measurement&&canQuoteLead(lead)&&<GhostBtn small onClick={()=>openMeasurement(lead,false)}>Edit CP Form</GhostBtn>}
              {canQuoteLead(lead)&&<PrimaryBtn small color={T.purple} onClick={()=>openQuote(lead)}>{lead.quotation?"Revise Quotation":"Generate Quotation"}</PrimaryBtn>}
              {canMarkPayment(lead)&&<SuccessBtn small onClick={()=>openPayment(lead)}>Mark Payment Done</SuccessBtn>}
              {salesmanLeadQuote(lead)&&<GhostBtn small onClick={()=>openQuotationPdf({...lead,quotation:salesmanLeadQuote(lead)},salesmanLeadQuote(lead))}>Download PDF</GhostBtn>}
            </div>
            </>; })()}
          </GlassCard>
        ))}
        {assigned.length===0&&<div style={{textAlign:"center",padding:50,color:T.muted}}>No leads assigned to you.</div>}
      </div>

      {measurementLead&&<Modal title={measurementLead.channelPartnerId?"Review / Edit CP Order Form":"Fill Measurement"} onClose={()=>{setMeasurementLead(null);setQuoteAfterMeasurementLeadId(null);}} wide>
        {measurementLead.channelPartnerId&&<div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:12,marginBottom:14,fontSize:13,color:"#1d4ed8"}}>
          This is the exact form filled by the Channel Partner. Review it, change qty/size/material if required, then continue to quotation.
        </div>}
        <FormRow cols={2}>
          <Field label="Product Type"><select value={measurement.type} onChange={e=>setMeasurement(m=>({...m,type:e.target.value}))}>{["Mesh","Blind"].map(v=><option key={v}>{v}</option>)}</select></Field>
          <Field label="Budget *"><input type="number" value={measurement.budget} onChange={e=>setMeasurement(m=>({...m,budget:e.target.value}))} /></Field>
        </FormRow>
        <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:12}}>
          {(measurement.windows||[]).map((w,idx)=>(
            <div key={idx} style={{border:`1px solid ${T.border}`,borderRadius:8,padding:12,background:T.cardHi}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><b style={{fontSize:13,color:T.text}}>{w.label||`Window ${idx+1}`}</b>{idx>0&&<GhostBtn small onClick={()=>removeWindow(idx)}>Remove</GhostBtn>}</div>
              <FormRow cols={5}>
                <Field label="Window Name"><input value={w.label} onChange={e=>updateWindow(idx,{label:e.target.value})} /></Field>
                <Field label="Height *"><input type="number" min="0.01" step="0.01" value={w.height} onChange={e=>updateWindow(idx,{height:e.target.value})} /></Field>
                <Field label="Height Unit"><select value={normalizeUnit(w.heightUnit||w.unit)} onChange={e=>updateWindow(idx,{heightUnit:e.target.value})}>{MEASUREMENT_UNITS.map(u=><option key={u}>{u}</option>)}</select></Field>
                <Field label="Width *"><input type="number" min="0.01" step="0.01" value={w.width} onChange={e=>updateWindow(idx,{width:e.target.value})} /></Field>
                <Field label="Width Unit"><select value={normalizeUnit(w.widthUnit||w.unit)} onChange={e=>updateWindow(idx,{widthUnit:e.target.value})}>{MEASUREMENT_UNITS.map(u=><option key={u}>{u}</option>)}</select></Field>
              </FormRow>
              <FormRow cols={4}>
                <Field label="Quantity"><input type="number" min="1" value={w.qty} onChange={e=>updateWindow(idx,{qty:e.target.value})} /></Field>
                <Field label="Color / Material / Code *"><select value={w.inventoryChoice||""} onChange={e=>applyInventoryChoice(idx,e.target.value)}><option value="">Select inventory material...</option>{inventoryChoiceOptions(smartInventory,measurement.type).map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
                <Field label="Selected Code *"><select value={w.code||""} onChange={e=>applyInventoryCode(idx,e.target.value)}><option value="">Select password code...</option>{inventoryCodeOptions(smartInventory,measurement.type).map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
                <Field label="SQFT Preview"><input disabled value={lineChargeableSqft(w)} /></Field>
              </FormRow>
            </div>
          ))}
        </div>
        <div style={{marginTop:10}}><GhostBtn onClick={addWindow}>+ Add Window Measurement</GhostBtn></div>
        <div style={{marginTop:12}}><Field label="Notes"><textarea rows={2} value={measurement.notes} onChange={e=>setMeasurement(m=>({...m,notes:e.target.value}))} /></Field></div>
        <div style={{display:"flex",gap:10,marginTop:18}}><PrimaryBtn onClick={saveMeasurement}>{quoteAfterMeasurementLeadId?"Save Form & Continue Quotation":"Lock Measurement"}</PrimaryBtn><GhostBtn onClick={()=>{setMeasurementLead(null);setQuoteAfterMeasurementLeadId(null);}}>Cancel</GhostBtn></div>
      </Modal>}

      {quoteLead&&<Modal title="Generate Quotation" onClose={()=>setQuoteLead(null)} wide>
        <div style={{background:T.cardHi,border:`1px solid ${T.border}`,borderRadius:8,padding:12,marginBottom:14,fontSize:13,color:T.sub}}>Actual Sq ft: <b style={{color:T.text}}>{leadAreaSqft(quoteLead)}</b> | Billing Sq ft: <b style={{color:T.green}}>{leadChargeableSqft(quoteLead)}</b> | Quotation Product: <b style={{color:T.text}}>{quotedProductType(quoteLead)}</b> | Lead Product: {quoteLead.product}</div>
        <FormRow cols={2}>
          <Field label="Default Sq Ft Rate"><input type="number" value={quote.rate} onChange={e=>setQuote(q=>({...q,rate:e.target.value}))} /></Field>
          <Field label="Discount %"><input type="number" value={quote.discount} onChange={e=>setQuote(q=>({...q,discount:e.target.value}))} /></Field>
        </FormRow>
        <FormRow cols={2}>
          <Field label="GST %"><input type="number" value={quote.gst} onChange={e=>setQuote(q=>({...q,gst:e.target.value}))} /></Field>
          <Field label="Product For Quotation"><input value={quote.productType||quotedProductType(quoteLead)} onChange={e=>setQuote(q=>({...q,productType:e.target.value}))} /></Field>
        </FormRow>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,margin:"14px 0 8px"}}>
          <div style={{fontSize:12,fontWeight:800,color:T.muted}}>Window / Product Wise Rates</div>
          <GhostBtn small onClick={applyQuoteRateToAll}>Apply Default Rate To All</GhostBtn>
        </div>
        <div style={{display:"grid",gap:10}}>
          {quoteWindows.map((w,i)=>{
            const line=quote.lineItems?.[i]||{};
            const rate=Number(line.rate||quote.rate||0);
            const amount=lineChargeableSqft(w)*rate;
            return <div key={i} style={{border:`1px solid ${T.border}`,borderRadius:8,padding:12,background:T.cardHi}}>
              <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr 120px 130px",gap:10,alignItems:"end"}}>
                <div style={{fontSize:12,color:T.sub}}><b style={{color:T.text}}>{w.label||`Window ${i+1}`}</b><div style={{marginTop:3}}>{w.material||"-"} | {w.color||"-"} | {lineChargeableSqft(w)} SQFT</div></div>
                <Field label="Product / Material"><input value={line.productType||quote.productType||quotedProductType(quoteLead)} onChange={e=>updateQuoteLine(i,{productType:e.target.value})} /></Field>
                <Field label="Rate / SQFT *"><input type="number" value={line.rate ?? quote.rate ?? ""} onChange={e=>updateQuoteLine(i,{rate:e.target.value})} /></Field>
                <div style={{fontSize:12,color:T.sub,paddingBottom:9}}>Amount: <b style={{color:T.green}}>{inr(amount)}</b></div>
              </div>
            </div>;
          })}
        </div>
        <Field label="Quotation Notes"><textarea rows={3} value={quote.notes} onChange={e=>setQuote(q=>({...q,notes:e.target.value}))} /></Field>
        <div style={{display:"flex",gap:10,marginTop:18}}><PrimaryBtn onClick={saveQuote} color={T.purple}>{quoteLead?.quotation?"Update Revised PDF Quotation":"Generate PDF Quotation"}</PrimaryBtn><GhostBtn onClick={()=>setQuoteLead(null)}>Cancel</GhostBtn></div>
      </Modal>}

      {paymentLead&&<Modal title="Mark Customer Payment" onClose={()=>setPaymentLead(null)}>
        <div style={{background:T.cardHi,border:`1px solid ${T.border}`,borderRadius:8,padding:12,marginBottom:14,fontSize:13,color:T.sub}}>
          Order Amount: <b style={{color:T.text}}>{inr(paymentLead.quotation?.amount||0)}</b> | Payment Left: <b style={{color:T.red}}>{inr(Math.max(Number(paymentLead.quotation?.amount||0)-(paymentForm.status==="Fully Paid"?Number(paymentLead.quotation?.amount||0):(paymentForm.status==="No Paid"?0:Number(paymentForm.paid||0))),0))}</b>
        </div>
        <FormRow cols={2}>
          <Field label="Payment Status"><select value={paymentForm.status} onChange={e=>setPaymentForm(f=>({...f,status:e.target.value,paid:e.target.value==="Fully Paid"?(paymentLead.quotation?.amount||""):e.target.value==="No Paid"?"":f.paid}))}>{["No Paid","Partially Paid","Fully Paid"].map(s=><option key={s}>{s}</option>)}</select></Field>
          <Field label="How Much Paid"><input type="number" disabled={paymentForm.status!=="Partially Paid"} value={paymentForm.status==="Fully Paid"?(paymentLead.quotation?.amount||""):paymentForm.status==="No Paid"?"":paymentForm.paid} onChange={e=>setPaymentForm(f=>({...f,paid:e.target.value}))} /></Field>
        </FormRow>
        <Field label="Payment Notes"><textarea rows={2} value={paymentForm.notes} onChange={e=>setPaymentForm(f=>({...f,notes:e.target.value}))} /></Field>
        <div style={{display:"flex",gap:10,marginTop:18}}><SuccessBtn onClick={markPaymentDone}>Save Payment</SuccessBtn><GhostBtn onClick={()=>setPaymentLead(null)}>Cancel</GhostBtn></div>
      </Modal>}
    </div>
  );
}



export function ChannelPartnerPortal({ partners, setPartners, leads, setLeads, orders, setOrders, payments=[], bills=[], activePartnerId, smartInventory }) {
  const partner=partners.find(p=>p.id===activePartnerId);
  const blankWindow={label:"Window 1",height:"",heightUnit:"Feet",width:"",widthUnit:"Feet",qty:1,color:"",material:""};
  const cpProducts=["Mesh","Blinds"];
  const blank={customer:"",mobile:"",project:"",product:cpProducts[0],notes:"",windows:[blankWindow]};
  const [form,setForm]=useState(blank);
  const [showOrderForm,setShowOrderForm]=useState(false);
  const [savingRequest,setSavingRequest]=useState(false);
  if(!partner)return <GlassCard>Channel partner login not found.</GlassCard>;
  const requests=partner.requests||[];
  const linkedOrder=req=>orders.find(o=>o.id===req.orderId);
  const billFor=orderId=>bills.find(b=>b.orderId===orderId);
  const PartnerPdfAction=({req,linkedLead})=>{
    const order=linkedOrder(req);
    const bill=order?billFor(order.id):null;
    if(bill?.type==="GST Bill")return <GhostBtn small onClick={()=>openBillPdf(order,bill)}>Invoice PDF</GhostBtn>;
    if(req.quotation&&linkedLead)return <GhostBtn small onClick={()=>openQuotationPdf({...linkedLead,quotation:req.quotation},req.quotation)}>Quotation PDF</GhostBtn>;
    return <span style={{fontSize:12,color:T.muted}}>No PDF</span>;
  };
  const orderPaid=req=>{
    const order=linkedOrder(req);
    return order ? paidForOrder(order,payments) : Number(req.paid||0);
  };
  const orderTotal=req=>{
    const order=linkedOrder(req);
    return Number(order?.final??req.quotationAmount??req.amount??0);
  };
  const orderBalance=req=>Math.max(orderTotal(req)-orderPaid(req),0);
  const isCompleted=req=>["Completed","Delivered","Installed","Closed"].includes(linkedOrder(req)?.status);
  const activeRequests=requests.filter(r=>!isCompleted(r));
  const completedRequests=requests.filter(isCompleted);
  const totals=requests.reduce((acc,r)=>{
    const total=orderTotal(r);
    if(total>0){
      acc.business+=total;
      acc.paid+=orderPaid(r);
    }
    return acc;
  },{business:0,paid:0});
  const updateWindow=(idx,patch)=>setForm(f=>({...f,windows:(f.windows||[]).map((w,i)=>i===idx?{...w,...patch}:w)}));
  const applyInventoryChoice=(idx,value)=>{
    const opt=inventoryChoiceOptions(smartInventory,form.product).find(o=>o.value===value);
    if(!opt)return;
    updateWindow(idx,{inventoryChoice:value,color:opt.color,material:opt.material,code:opt.code});
  };
  const applyInventoryCode=(idx,value)=>{
    const opt=inventoryCodeOptions(smartInventory,form.product).find(o=>o.value===value);
    if(!opt)return;
    updateWindow(idx,{inventoryChoice:opt.material,color:opt.color,material:opt.material,code:opt.value});
  };
  const addWindow=()=>setForm(f=>({...f,windows:[...(f.windows||[]),{...blankWindow,label:`Window ${(f.windows||[]).length+1}` }]}));
  const removeWindow=idx=>setForm(f=>({...f,windows:(f.windows||[]).filter((_,i)=>i!==idx)}));
  const addRequest=()=>{
    if(savingRequest)return;
    if(!form.customer||!form.mobile||!form.project)return alert("Customer, mobile and project are required");
    const mobileError=validateMobile(form.mobile);
    if(mobileError)return alert(mobileError);
    const normalizedMobile=normalizeMobile(form.mobile);
    const duplicate=customerDuplicate({leads,orders,partners,mobile:normalizedMobile});
    if(duplicate){ duplicateAudit("Channel Partner Order Request",duplicateMsg(duplicate),{mobile:normalizedMobile,partnerId:partner.id}); return alert(duplicateMsg(duplicate)); }
    if((partner.requests||[]).some(r=>normalizeMobile(r.mobile)===normalizedMobile&&["Pending","Pending Management Approval"].includes(r.approval||r.status)))return alert("Customer already has a pending order request");
    if(onceKeyActive(`cp-request:${partner.id}:${normalizedMobile}:${form.product}:${form.project}`))return alert("Processing... duplicate request blocked");
    setSavingRequest(true);
    const windows=(form.windows||[]).map((w,i)=>enrichMeasurementLine({...w,label:w.label||`Window ${i+1}`,qty:Number(w.qty||1)}));
    const measurementError=validateMeasurementRows(windows);
    if(measurementError){ setSavingRequest(false); return alert(measurementError); }
    const requestId=`CPR${Date.now()}`;
    const measurement={type:form.product.toLowerCase().includes("mesh")?"Mesh":"Blind",windows,budget:Number(form.amount||0),notes:form.notes};
    const request={...form,mobile:normalizedMobile,id:requestId,date:todayStr(),windows,measurement,paid:0,status:"Pending Management Approval",approval:"Pending",stage:"Order Pending",quotationAmount:0,orderId:"",createdAt:new Date().toISOString(),createdBy:"Channel Partner"};
    setPartners(ps=>ps.map(p=>p.id===partner.id?{...p,requests:[...(p.requests||[]),request]}:p));
    auditLog({event:"Created",source:"Channel Partner Order Request",recordType:"Order Request",recordId:requestId,mobile:normalizedMobile,partnerId:partner.id});
    setForm(blank);
    setShowOrderForm(false);
    setSavingRequest(false);
  };
  const acceptQuotedOrder=req=>{
    if(!req.quotationAmount)return alert("Quotation is not generated yet");
    const acceptedAt=new Date().toISOString();
    setPartners(ps=>ps.map(p=>{
      if(p.id!==partner.id)return p;
      return {...p,requests:(p.requests||[]).map(r=>r.id===req.id?{...r,cpAccepted:true,cpAcceptedAt:acceptedAt,cpAcceptedDate:todayStr(),status:"Order Accepted By CP",leadStatus:"CP Approved",stage:"Awaiting Payment From Salesman"}:r)};
    }));
    setLeads?.(ls=>ls.map(l=>l.partnerRequestId===req.id?{
      ...l,
      quotation:l.quotation||req.quotation,
      cpAccepted:true,
      cpAcceptedAt:acceptedAt,
      cpAcceptedDate:todayStr(),
      status:"Quoted",
      updated:todayStr(),
      updatedAt:acceptedAt
    }:l));
  };
  const trackStatus=req=>{
    if(req.status==="Order Pending")return "Order Pending";
    if(req.status==="Quotation Sent"&&!req.cpAccepted)return "Quotation Sent - Awaiting CP Accept";
    if(req.cpAccepted&&!Number(req.paid||0))return "Order Accepted - Payment Pending";
    const order=linkedOrder(req);
    if(order)return productionTrackLabel(order.productionStage||req.stage,order.status,order.installationDate||req.installationDate);
    return req.trackStatus||productionTrackLabel(req.stage,req.status,req.installationDate);
  };
  return (
    <div>
      <SectionTitle action={<PrimaryBtn onClick={()=>setShowOrderForm(true)}>+ New Order</PrimaryBtn>}>Channel Partner Portal</SectionTitle>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:18}}>
        <StatKPI label="Requests" value={requests.length} accent={T.blue} />
        <StatKPI label="Business Amount" value={inr(totals.business)} accent={T.green} />
        <StatKPI label="Paid Amount" value={inr(totals.paid)} accent={T.teal} />
        <StatKPI label="Yet To Pay" value={inr(Math.max(totals.business-totals.paid,0))} accent={T.red} />
      </div>
      {showOrderForm&&<Modal title="New Order Request" onClose={()=>setShowOrderForm(false)} wide>
        <div style={{background:T.cardHi,border:`1px solid ${T.border}`,borderRadius:8,padding:12,marginBottom:14,fontSize:13,color:T.sub}}>Enter any unit you have. The ERP will convert all measurements to SQFT for quotation, billing and reports.</div>
        <FormRow cols={2}><Field label="Customer Name"><input value={form.customer} onChange={e=>setForm(f=>({...f,customer:e.target.value}))} /></Field><Field label="Mobile"><input inputMode="numeric" maxLength={10} value={form.mobile} onChange={e=>setForm(f=>({...f,mobile:e.target.value.replace(/\D/g,"").slice(0,10)}))} placeholder="10 digit mobile number" /></Field></FormRow>
        <Field label="Project / Site"><input value={form.project} onChange={e=>setForm(f=>({...f,project:e.target.value}))} /></Field>
        <Field label="Product"><select value={form.product} onChange={e=>setForm(f=>({...f,product:e.target.value}))}>{cpProducts.map(p=><option key={p}>{p}</option>)}</select></Field>
        <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:12}}>
          {(form.windows||[]).map((w,idx)=>(
            <div key={idx} style={{border:`1px solid ${T.border}`,borderRadius:8,padding:12,background:T.cardHi}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><b style={{fontSize:13,color:T.text}}>{w.label||`Window ${idx+1}`}</b>{idx>0&&<GhostBtn small onClick={()=>removeWindow(idx)}>Remove</GhostBtn>}</div>
              <FormRow cols={5}><Field label="Window Name"><input value={w.label} onChange={e=>updateWindow(idx,{label:e.target.value})} /></Field><Field label="Height"><input type="number" min="0.01" step="0.01" value={w.height} onChange={e=>updateWindow(idx,{height:e.target.value})} /></Field><Field label="Height Unit"><select value={normalizeUnit(w.heightUnit||w.unit)} onChange={e=>updateWindow(idx,{heightUnit:e.target.value})}>{MEASUREMENT_UNITS.map(u=><option key={u}>{u}</option>)}</select></Field><Field label="Width"><input type="number" min="0.01" step="0.01" value={w.width} onChange={e=>updateWindow(idx,{width:e.target.value})} /></Field><Field label="Width Unit"><select value={normalizeUnit(w.widthUnit||w.unit)} onChange={e=>updateWindow(idx,{widthUnit:e.target.value})}>{MEASUREMENT_UNITS.map(u=><option key={u}>{u}</option>)}</select></Field></FormRow>
              <FormRow cols={4}><Field label="Qty"><input type="number" min="1" value={w.qty} onChange={e=>updateWindow(idx,{qty:e.target.value})} /></Field><Field label="Color / Material / Code"><select value={w.inventoryChoice||""} onChange={e=>applyInventoryChoice(idx,e.target.value)}><option value="">Select inventory material...</option>{inventoryChoiceOptions(smartInventory,form.product).map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></Field><Field label="Selected Code"><select value={w.code||""} onChange={e=>applyInventoryCode(idx,e.target.value)}><option value="">Select password code...</option>{inventoryCodeOptions(smartInventory,form.product).map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></Field><Field label="SQFT Preview"><input disabled value={lineChargeableSqft(w)} /></Field></FormRow>
            </div>
          ))}
        </div>
        <div style={{margin:"10px 0 14px"}}><GhostBtn small onClick={addWindow}>+ Add Another Window</GhostBtn></div>
        <Field label="Notes"><input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} /></Field>
        <div style={{display:"flex",gap:10,marginTop:14}}><PrimaryBtn onClick={addRequest} disabled={savingRequest}>{savingRequest?"Processing...":"Submit Request"}</PrimaryBtn><GhostBtn onClick={()=>setShowOrderForm(false)}>Cancel</GhostBtn></div>
      </Modal>}
      <GlassCard style={{padding:0}}>
        <Table headers={["Request","Customer","Product","Dates","Quotation","Paid","Yet To Pay","Track","Action"]}>
          {activeRequests.map(r=>{
            const quote=orderTotal(r);
            const paid=quote?orderPaid(r):0;
            const left=quote?Math.max(quote-paid,0):0;
            const linkedLead=leads?.find(l=>l.id===r.leadId);
            return <TR key={r.id}><TD mono>{r.id}</TD><TD bold>{r.customer}<div style={{fontSize:11,color:T.muted}}>{r.project}</div></TD><TD>{r.product}<div style={{fontSize:11,color:T.muted}}>{(r.windows||[]).length} window(s)</div></TD><TD><div style={{fontSize:11,color:T.sub,lineHeight:1.6}}>Measurement: <b>{r.measurementDate||"-"}</b><br/>Production: <b>{r.productionDate||"-"}</b><br/>Installation: <b>{r.installationDate||"-"}</b></div></TD><TD bold color={quote?T.green:T.orange}>{quote?inr(quote):"Waiting"}</TD><TD color={quote?T.teal:T.muted} bold>{quote?inr(paid):"-"}</TD><TD color={quote?(left>0?T.red:T.green):T.muted} bold>{quote?inr(left):"-"}</TD><TD><Pill label={trackStatus(r)} color={trackStatus(r).includes("Pending")?T.orange:T.blue} /></TD><TD><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{quote>0&&!r.cpAccepted?<PrimaryBtn small onClick={()=>acceptQuotedOrder(r)}>Accept Order</PrimaryBtn>:<span style={{fontSize:12,color:T.muted}}>{r.cpAccepted?"Accepted":"No action"}</span>}<PartnerPdfAction req={r} linkedLead={linkedLead} /></div></TD></TR>;
          })}
        </Table>
        {activeRequests.length===0&&<div style={{padding:32,textAlign:"center",fontSize:13,color:T.muted}}>No active order requests.</div>}
      </GlassCard>
      <div style={{fontSize:14,fontWeight:800,color:T.text,margin:"18px 0 10px"}}>Completed Order Bucket</div>
      <GlassCard style={{padding:0}}>
        <Table headers={["Request","Customer","Product","Paid","Left","Completed Status","Installation Date","PDF"]}>
          {completedRequests.map(r=>{
            const order=linkedOrder(r);
            const linkedLead=leads?.find(l=>l.id===r.leadId);
            return <TR key={r.id}><TD mono>{r.id}</TD><TD bold>{r.customer}<div style={{fontSize:11,color:T.muted}}>{r.project}</div></TD><TD>{r.product}</TD><TD color={T.teal} bold>{inr(orderPaid(r))}</TD><TD color={orderBalance(r)>0?T.red:T.green} bold>{inr(orderBalance(r))}</TD><TD><Pill label={order?.status||r.status||"Accepted"} color={T.green} /></TD><TD>{order?.installationDate||r.installationDate||order?.delivery||"-"}</TD><TD><PartnerPdfAction req={r} linkedLead={linkedLead} /></TD></TR>;
          })}
        </Table>
        {completedRequests.length===0&&<div style={{padding:32,textAlign:"center",fontSize:13,color:T.muted}}>Completed production and installation orders will appear here.</div>}
      </GlassCard>
    </div>
  );
}



export function Alerts({ leads, orders, inventory, followups, workOrders }) {
  const items=[];
  inventory.rawMaterials.filter(i=>i.stock<i.min).forEach(i=>items.push({type:"danger",icon:"",title:"Low Stock Alert",msg:`${i.name}: ${i.stock} ${i.unit} (min: ${i.min})`,time:"Now"}));
  followups.filter(f=>f.date<todayStr()&&f.outcome!=="Completed").forEach(f=>{ const l=leads.find(ll=>ll.id===f.leadId); items.push({type:"warning",icon:"",title:"Overdue Follow-up",msg:`${l?.name||"Unknown"}  was due ${f.date}`,time:f.date}); });
  orders.filter(o=>o.delivery&&o.delivery<todayStr()&&!["Delivered","Installed","Closed"].includes(o.status)).forEach(o=>items.push({type:"warning",icon:"",title:"Delivery Overdue",msg:`${o.id} | ${o.customer} (due ${o.delivery})`,time:o.delivery}));
  workOrders.filter(w=>w.end&&w.end<todayStr()&&w.status!=="Completed").forEach(w=>items.push({type:"danger",icon:"",title:"Work Order Overdue",msg:`${w.id} | ${w.product} ${w.qty}`,time:w.end}));
  leads.filter(l=>l.created===todayStr()&&(l.source==="Google Ads"||l.source==="JustDial"||l.source==="CP")).forEach(l=>items.push({type:"info",icon:"",title:l.source==="CP"?"New Channel Partner Lead":"New Lead Auto-Imported",msg:`${l.name} from ${l.source==="CP"?(l.channelPartnerName||"Channel Partner"):l.source} | ${l.product}`,time:todayStr()}));
  if(items.length===0)items.push({type:"success",icon:"",title:"All Clear!",msg:"No active alerts. Everything looks great!",time:"Now"});

  const styles={danger:{bg:"rgba(248,113,113,.08)",border:"rgba(248,113,113,.2)",title:T.red,dot:T.red},warning:{bg:"rgba(251,146,60,.08)",border:"rgba(251,146,60,.2)",title:T.orange,dot:T.orange},info:{bg:"rgba(96,165,250,.08)",border:"rgba(96,165,250,.2)",title:T.blue,dot:T.blue},success:{bg:"rgba(34,197,94,.08)",border:"rgba(34,197,94,.2)",title:T.green,dot:T.green}};

  return (
    <div>
      <SectionTitle>Alerts & Notifications <span style={{fontSize:13,fontWeight:400,color:T.muted}}>({items.filter(i=>i.type!=="success").length} active)</span></SectionTitle>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:24}}>
        {items.map((a,i)=>{
          const s=styles[a.type];
          return (
            <div key={i} style={{background:s.bg,border:`1px solid ${s.border}`,borderRadius:14,padding:"14px 18px",display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:40,height:40,borderRadius:12,background:s.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{a.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:13,color:s.title,marginBottom:2}}>{a.title}</div>
                <div style={{fontSize:13,color:T.sub}}>{a.msg}</div>
                <div style={{fontSize:11,color:T.muted,marginTop:3}}>{a.time}</div>
              </div>
            </div>
          );
        })}
      </div>

      <GlassCard>
        <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:16}}> Integration & Webhook Status</div>
        {[["Google Ads Webhook","POST /api/webhooks/google-ads","Live | Auto-creates leads from Google Ad forms",T.green],["JustDial Lead API","GET /api/webhooks/justdial","Live | Syncs new enquiries every 5 min",T.green],["PDF Invoice / Quotation","jsPDF + Backend","Active | Generates branded PDFs with GSTIN & letterhead",T.blue],["Duplicate Detection","Built-in","Auto-detects same mobile number across leads",T.teal]].map(([n,ep,desc,c])=>(
          <div key={n} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 0",borderBottom:`1px solid ${T.border}`}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:c,flexShrink:0,boxShadow:`0 0 6px ${c}`}} />
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:500,color:T.text}}>{n}</div>
              <div style={{fontSize:11,color:T.muted,marginTop:2}}>{ep} | {desc}</div>
            </div>
            <Pill label={c===T.green?"Active":"Configured"} color={c} />
          </div>
        ))}
      </GlassCard>
    </div>
  );
}


