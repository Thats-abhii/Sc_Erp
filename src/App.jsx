import { useState, useEffect, useRef } from "react";
import * as Shared from "./shared/erpShared.jsx";
import { SimpleDashboard, SalesmanDashboard, ChannelPartnerPortal } from "./pages/Dashboard.jsx";
import { ChannelPartners, Leads } from "./pages/Customers.jsx";
import { InventoryDashboard } from "./pages/Inventory.jsx";
import { ProductionBoard } from "./pages/Production.jsx";
import { BillingSession, Payments } from "./pages/Invoices.jsx";
import { PurchaseSession } from "./pages/Vendors.jsx";
import { DailyExpenses } from "./pages/Expenses.jsx";
import { FollowUps, Reports } from "./pages/Reports.jsx";
import { Salesmen } from "./pages/Employees.jsx";
import { LoginScreen } from "./pages/Login.jsx";
import { SmartAssistant } from "./pages/SmartAssistant.jsx";
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

// 
// MODULE: LEADS
// 
// 
// MODULE: FOLLOW-UPS
// 
// 
// MODULE: ORDERS
// 
// 
// MODULE: PRODUCTION
// 
// 
// MODULE: INVENTORY
// 
// 
// MODULE: SALESMEN
// 
function createSmartInventorySeed(){
  return {
    blindRolls:[],
    blindComponents:[],
    meshComponents:[],
    meshHardware:[],
    movements:[]
  };
}
const ftFromSize = size => Number(String(size||"").replace(/[^0-9.]/g,""))||0;
const fmtFt = n => `${Math.round(Number(n||0)*100)/100} ft`;
const inventoryChoiceOptions = (smartInventory, type="Blind") => {
  const isMesh=String(type||"").toLowerCase().includes("mesh");
  if(isMesh){
    return (smartInventory?.meshComponents||[])
      .filter(i=>Number(i.full||0)>0||(i.lengths||[]).some(l=>Number(l.qty||0)>0))
      .map(i=>{
        const color=(i.item||"").match(/white|brown|black|grey|gray|ivory|charcoal|beige/i)?.[0]||"Mesh";
        return {value:i.item,label:i.item,color,material:i.item,code:i.code};
      });
  }
  return (smartInventory?.blindRolls||[])
    .filter(r=>Number(r.remainingMetres ?? (Number(r.rolls||0)*Number(r.metres||0)))>0)
    .map(r=>({value:r.name,label:r.name,color:r.shade,material:r.name,code:r.code}));
};
const inventoryCodeOptions = (smartInventory, type="Blind") => inventoryChoiceOptions(smartInventory,type)
  .filter(o=>o.code)
  .map(o=>({value:o.code,label:o.code,material:o.material,color:o.color}));

// 
// MODULE: PAYMENTS
// 
// 
// MODULE: REPORTS
// 
// 
// MODULE: NOTIFICATIONS
// 
// 
// LOGIN SCREEN
// 
// 
// SIDEBAR NAV
// 
const NAV=[
  {id:"dashboard",  icon:"", label:"Dashboard"},
  {id:"channelPartners", icon:"", label:"Channel Partners"},
  {id:"inventoryDashboard", icon:"", label:"Inventory"},
  {id:"production", icon:"", label:"Production"},
  {id:"billing", icon:"", label:"Billing"},
  {id:"purchase", icon:"", label:"Purchase"},
  {id:"dailyExpenses", icon:"", label:"Expenses"},
  {id:"leads",      icon:"", label:"Lead Management"},
  {id:"followups",  icon:"", label:"Follow-ups"},
  {id:"salesmen",   icon:"", label:"Performance"},
  {id:"reports",    icon:"", label:"Reports"},
];

// 
// ROOT APP
// 
export default function App() {
  const [role,setRole]=useState(null);
  const [mod,setMod]=useState("dashboard");
  const [collapsed,setCollapsed]=useState(false);
  const formatHeaderClock=()=>new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).replace(/\./g,":").replace(/:/g," : ");
  const [headerClock,setHeaderClock]=useState(formatHeaderClock);

  const [leads,setLeads]=useState([]);
  const [orders,setOrders]=useState([]);
  const [workOrders,setWorkOrders]=useState([]);
  const [followups,setFollowups]=useState([]);
  const [payments,setPayments]=useState([]);
  const [channelPartners,setChannelPartners]=useState([]);
  const [expenses,setExpenses]=useState([]);
  const [inventory,setInventory]=useState({rawMaterials:RAW_MAT,finishedGoods:FINISHED});
  const [smartInventory,setSmartInventory]=useState(createSmartInventorySeed);
  const [bills,setBills]=useState([]);
  const [purchases,setPurchases]=useState([]);
  const [salesmen,setSalesmen]=useState([]);
  const [reassignLogs,setReassignLogs]=useState([]);
  const [activeSalesmanId,setActiveSalesmanId]=useState(null);
  const [activePartnerId,setActivePartnerId]=useState(null);
  const [authPassword,setAuthPassword]=useState("");
  const [sessionLoginAt,setSessionLoginAt]=useState(0);
  const sharedStateReadyRef=useRef(false);
  const sharedStateSaveTimerRef=useRef(null);
  const sessionExpiredNoticeRef=useRef(false);
  const forceLogoutForExpiredSession=(message="Your login session has expired because the password was changed. Please login again with the new password.")=>{
    if(sessionExpiredNoticeRef.current)return;
    sessionExpiredNoticeRef.current=true;
    setRole(null);
    setActiveSalesmanId(null);
    setActivePartnerId(null);
    setAuthPassword("");
    setSessionLoginAt(0);
    setMod("dashboard");
    alert(message);
    setTimeout(()=>{ sessionExpiredNoticeRef.current=false; },1000);
  };
  const isForcedLogoutRecord=(record)=>Number(record?.forcedLogoutAt||0)>Number(sessionLoginAt||0);
  const withoutPassword=row=>{
    const {password, ...safe}=row||{};
    return safe;
  };
  const currentSharedState=()=>({
    leads,
    orders,
    followups,
    payments,
    salesmen:salesmen.map(withoutPassword),
    channelPartners:channelPartners.map(p=>({...withoutPassword(p),requests:p.requests||[]})),
    bills,
    purchases,
    smartInventory,
    inventory,
    workOrders,
    expenses,
    reassignmentLogs:reassignLogs
  });

  useEffect(()=>{
    if(!role){
      sharedStateReadyRef.current=false;
      return;
    }
    let cancelled=false;
    fetchSharedAppState().then(data=>{
      if(cancelled)return;
      const state=data?.state||{};
      const hasBackendState=Object.keys(state).length>0;
      if(Array.isArray(state.leads))setLeads(state.leads);
      if(Array.isArray(state.orders))setOrders(dedupeOrders(state.orders));
      if(Array.isArray(state.followups))setFollowups(state.followups);
      if(Array.isArray(state.payments))setPayments(state.payments);
      if(Array.isArray(state.salesmen))setSalesmen(state.salesmen);
      if(Array.isArray(state.channelPartners))setChannelPartners(state.channelPartners);
      if(Array.isArray(state.bills))setBills(state.bills);
      if(Array.isArray(state.purchases))setPurchases(state.purchases);
      if(state.smartInventory&&typeof state.smartInventory==="object")setSmartInventory(state.smartInventory);
      if(state.inventory&&typeof state.inventory==="object")setInventory(state.inventory);
      if(Array.isArray(state.workOrders))setWorkOrders(state.workOrders);
      if(Array.isArray(state.expenses))setExpenses(state.expenses);
      if(Array.isArray(state.reassignmentLogs))setReassignLogs(state.reassignmentLogs);
      sharedStateReadyRef.current=true;
      if(!hasBackendState)sharedStateReadyRef.current=true;
    }).catch(error=>{
      if(isAuthExpiredError(error))forceLogoutForExpiredSession();
      sharedStateReadyRef.current=false;
    });
    return ()=>{ cancelled=true; };
  },[role]);
  useEffect(()=>{
    if(!sharedStateReadyRef.current)return;
    clearTimeout(sharedStateSaveTimerRef.current);
    sharedStateSaveTimerRef.current=setTimeout(()=>{
      saveSharedAppState(currentSharedState()).catch(error=>{ if(isAuthExpiredError(error))forceLogoutForExpiredSession(); });
    },700);
    return ()=>clearTimeout(sharedStateSaveTimerRef.current);
  },[leads,orders,followups,payments,salesmen,channelPartners,bills,purchases,smartInventory,inventory,workOrders,expenses,reassignLogs]);
  useEffect(()=>{
    if(!role)return;
    const checkSession=()=>{
      getBackendUser().catch(error=>{ if(isAuthExpiredError(error))forceLogoutForExpiredSession(); });
    };
    const timer=setInterval(checkSession,8000);
    return ()=>clearInterval(timer);
  },[role]);
  useEffect(()=>{
    if(role==="salesman"&&activeSalesmanId&&sessionLoginAt){
      const current=salesmen.find(s=>sameId(s.id,activeSalesmanId));
      if(isForcedLogoutRecord(current))forceLogoutForExpiredSession();
    }
    if(role==="channelPartner"&&activePartnerId&&sessionLoginAt){
      const current=channelPartners.find(p=>p.id===activePartnerId);
      if(isForcedLogoutRecord(current))forceLogoutForExpiredSession();
    }
  },[salesmen,channelPartners,role,activeSalesmanId,activePartnerId,sessionLoginAt]);
  useEffect(()=>{
    if(!["salesman","channelPartner"].includes(role)||!sessionLoginAt)return;
    const checkForcedLogout=()=>{
      fetchSharedAppState().then(data=>{
        const state=data?.state||{};
        if(role==="salesman"){
          const current=(state.salesmen||[]).find(s=>sameId(s.id,activeSalesmanId));
          if(isForcedLogoutRecord(current))forceLogoutForExpiredSession();
        }
        if(role==="channelPartner"){
          const current=(state.channelPartners||[]).find(p=>p.id===activePartnerId);
          if(isForcedLogoutRecord(current))forceLogoutForExpiredSession();
        }
      }).catch(error=>{ if(isAuthExpiredError(error))forceLogoutForExpiredSession(); });
    };
    const timer=setInterval(checkForcedLogout,5000);
    checkForcedLogout();
    return ()=>clearInterval(timer);
  },[role,activeSalesmanId,activePartnerId,sessionLoginAt]);
  useEffect(()=>{
    const timer=setInterval(()=>setHeaderClock(formatHeaderClock()),1000);
    return ()=>clearInterval(timer);
  },[]);
  const isSalesman=role==="salesman";
  const isPartner=role==="channelPartner";
  const isProductionTeam=role==="productionTeam";
  const isManager=isSalesman||isPartner||isProductionTeam;
  const activeSalesman=salesmen.find(s=>sameId(s.id,activeSalesmanId));
  const activePartner=channelPartners.find(p=>p.id===activePartnerId);
  const changeOwnPassword=async ()=>{
    const currentPassword=prompt("Enter current password", "");
    if(!currentPassword)return;
    const newPassword=prompt("Enter new password (minimum 8 characters)", "");
    if(!newPassword)return;
    try {
      await changeOwnBackendPassword({currentPassword,newPassword});
      setRole(null);
      setActiveSalesmanId(null);
      setActivePartnerId(null);
      setAuthPassword("");
      setSessionLoginAt(0);
      setMod("dashboard");
      alert("Password changed successfully. Please login again with the new password.");
    } catch (error) {
      alert(error.message||"Could not change password");
    }
  };
  useEffect(()=>{
    if(role==="salesman"&&activeSalesmanId&&authPassword){
      const current=salesmen.find(s=>sameId(s.id,activeSalesmanId));
      if(!current||current.password!==authPassword){
        setRole(null);setActiveSalesmanId(null);setAuthPassword("");setMod("dashboard");
      }
    }
    if(role==="channelPartner"&&activePartnerId&&authPassword){
      const current=channelPartners.find(p=>p.id===activePartnerId);
      if(!current||current.password!==authPassword){
        setRole(null);setActivePartnerId(null);setAuthPassword("");setMod("dashboard");
      }
    }
  },[salesmen,channelPartners,role,activeSalesmanId,activePartnerId,authPassword]);
  const visibleLeads=sortLeadsNewest(isSalesman?leads.filter(l=>sameId(l.salesman,activeSalesmanId)&&l.status!=="Rejected"):leads);
  const activeWorkflowLeads=visibleLeads.filter(l=>l.status!=="Rejected");
  const visibleLeadIds=new Set(activeWorkflowLeads.map(l=>l.id));
  const visibleOrders=isSalesman?orders.filter(o=>visibleLeadIds.has(o.leadId)):orders;
  const visibleOrderIds=new Set(visibleOrders.map(o=>o.id));
  const visiblePayments=isSalesman?payments.filter(p=>visibleOrderIds.has(p.orderId)):payments;
  const visibleFollowups=isSalesman?followups.filter(f=>visibleLeadIds.has(f.leadId)):followups;
  const alertCount=unifiedFollowups(activeWorkflowLeads,visibleFollowups,salesmen).filter(f=>(f.nextDate||todayStr())<todayStr()).length;

  if(!role)return <><style>{css}</style><LoginScreen onLogin={(nextRole,entityId=null,password="")=>{setSessionLoginAt(Date.now());setRole(nextRole);setActiveSalesmanId(nextRole==="salesman"?entityId:null);setActivePartnerId(nextRole==="channelPartner"?entityId:null);setAuthPassword(password);setMod(nextRole==="productionTeam"?"production":"dashboard")}} /></>;

  const GUARD = fn => isManager ? (()=>{}) : fn;
  const visibleNav=isProductionTeam?NAV.filter(item=>item.id==="production"):(isPartner?NAV.filter(item=>item.id==="dashboard"):(isSalesman?NAV.filter(item=>!["channelPartners","inventoryDashboard","production","billing","purchase","dailyExpenses","salesmen","reports"].includes(item.id)):NAV));

  const moduleMap = {
    dashboard: isPartner
      ? <ChannelPartnerPortal partners={channelPartners} setPartners={setChannelPartners} leads={leads} setLeads={setLeads} orders={orders} setOrders={setOrders} payments={payments} bills={bills} activePartnerId={activePartnerId} smartInventory={smartInventory} />
      : isSalesman
      ? <SalesmanDashboard leads={visibleLeads} setLeads={setLeads} orders={orders} setOrders={setOrders} payments={payments} setPayments={setPayments} followups={visibleFollowups} partners={channelPartners} setPartners={setChannelPartners} activeSalesmanId={activeSalesmanId} smartInventory={smartInventory} salesmen={salesmen} />
      : <SimpleDashboard leads={activeWorkflowLeads} orders={visibleOrders} followups={visibleFollowups} payments={visiblePayments} role={role} channelPartners={channelPartners} expenses={expenses} salesmen={salesmen} />,
    channelPartners: <ChannelPartners partners={channelPartners} setPartners={GUARD(setChannelPartners)} leads={leads} orders={orders} setLeads={setLeads} setOrders={setOrders} salesmen={salesmen} isManager={isManager} />,
    inventoryDashboard: <InventoryDashboard smartInventory={smartInventory} setSmartInventory={setSmartInventory} />,
    production: <ProductionBoard orders={visibleOrders} setOrders={setOrders} partners={channelPartners} setPartners={setChannelPartners} smartInventory={smartInventory} setSmartInventory={setSmartInventory} canManageApproval={!isProductionTeam} canManageInstallation={!isProductionTeam} />,
    billing: <BillingSession orders={visibleOrders} setOrders={setOrders} payments={visiblePayments} setPayments={setPayments} bills={bills} setBills={setBills} leads={leads} setLeads={setLeads} partners={channelPartners} setPartners={setChannelPartners} />,
    purchase: <PurchaseSession purchases={purchases} setPurchases={setPurchases} expenses={expenses} setExpenses={setExpenses} />,
    dailyExpenses: <DailyExpenses expenses={expenses} setExpenses={setExpenses} />,
    leads:     <Leads leads={visibleLeads} setLeads={GUARD(setLeads)} orders={orders} setOrders={GUARD(setOrders)} payments={payments} setPayments={GUARD(setPayments)} followups={visibleFollowups} setFollowups={GUARD(setFollowups)} salesmen={salesmen} partners={channelPartners} setPartners={GUARD(setChannelPartners)} isManager={isManager} smartInventory={smartInventory} setSmartInventory={setSmartInventory} />,
    followups: <FollowUps followups={visibleFollowups} setFollowups={GUARD(setFollowups)} leads={activeWorkflowLeads} setLeads={setLeads} salesmen={salesmen} isManager={isManager} canEditReason={isSalesman} />,
    salesmen:  <Salesmen leads={activeWorkflowLeads} setLeads={setLeads} followups={visibleFollowups} setFollowups={setFollowups} orders={visibleOrders} payments={visiblePayments} salesmen={salesmen} setSalesmen={setSalesmen} reassignLogs={reassignLogs} setReassignLogs={setReassignLogs} />,
    reports:   <Reports leads={activeWorkflowLeads} orders={visibleOrders} payments={visiblePayments} expenses={expenses} followups={visibleFollowups} channelPartners={isSalesman?[]:channelPartners} />,
  };

  return (
    <>
      <style>{css}</style>
      <div style={{display:"flex",height:"100vh",overflow:"hidden",fontFamily:"'Inter',sans-serif",background:T.bg}}>

        {/*  SIDEBAR  */}
        <aside style={{
          width: collapsed?64:220,
          background:T.surf,
          borderRight:`1px solid ${T.border}`,
          display:"flex",flexDirection:"column",
          transition:"width .2s ease",
          flexShrink:0,
          overflow:"hidden",
        }}>
          {/* Brand */}
          <div style={{padding:"18px 16px",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${T.border}`,minHeight:65}}>
            <div style={{width:42,height:42,borderRadius:8,background:"#050505",border:"2px solid #f8fafc",boxShadow:"inset 0 0 0 1px rgba(255,255,255,.7)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,overflow:"hidden",padding:4}}>
              <img src={BRAND.logo} alt={`${BRAND.name} logo`} style={{width:"100%",height:"100%",objectFit:"contain"}} onError={e=>{e.currentTarget.replaceWith(document.createTextNode("SC"));}} />
            </div>
            {!collapsed&&<div>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:13,color:T.text,whiteSpace:"nowrap"}}>{BRAND.name}</div>
              <div style={{fontSize:10,color:T.muted,whiteSpace:"nowrap"}}>CRM | {isProductionTeam?"Production":isPartner?"Partner":isSalesman?"Salesman":"Management"}</div>
            </div>}
          </div>

          {/* Nav Items */}
          <nav style={{flex:1,padding:"10px 8px",overflowY:"auto"}}>
            {visibleNav.map(item=>{
              const active=mod===item.id;
              const hasAlert=item.id==="alerts"&&alertCount>0;
              const navAccent=T.amber;
              return (
                <button key={item.id} onClick={()=>setMod(item.id)} style={{
                  width:"100%",display:"flex",alignItems:"center",gap:10,
                  padding:collapsed?"10px 0":"9px 12px",
                  borderRadius:10,border:"none",cursor:"pointer",
                  fontFamily:"inherit",fontSize:12,fontWeight:active?600:400,
                  marginBottom:2,
                  background:active?`${navAccent}18`:"transparent",
                  color:active?navAccent:T.muted,
                  transition:"all .15s",
                  justifyContent:collapsed?"center":"flex-start",
                  position:"relative",
                }}
                onMouseEnter={e=>{ if(!active){e.currentTarget.style.background="rgba(255,255,255,.05)";e.currentTarget.style.color=T.text} }}
                onMouseLeave={e=>{ if(!active){e.currentTarget.style.background="transparent";e.currentTarget.style.color=T.muted} }}
                >
                  {active&&<div style={{position:"absolute",left:0,top:"20%",width:3,height:"60%",background:navAccent,borderRadius:"0 2px 2px 0"}} />}
                  {item.icon&&<span style={{fontSize:14,flexShrink:0}}>{item.icon}</span>}
                  {!collapsed&&<span style={{whiteSpace:"nowrap"}}>{item.label}</span>}
                  {!collapsed&&hasAlert&&<span style={{marginLeft:"auto",background:T.orange,color:"#fff",fontSize:10,borderRadius:99,padding:"1px 6px",fontWeight:700}}>{alertCount}</span>}
                  {collapsed&&hasAlert&&<span style={{position:"absolute",top:6,right:6,width:7,height:7,background:T.orange,borderRadius:"50%"}} />}
                </button>
              );
            })}
          </nav>

          {/* Collapse toggle */}
          <div style={{padding:"12px 8px",borderTop:`1px solid ${T.border}`}}>
            <button onClick={()=>setCollapsed(c=>!c)} style={{
              width:"100%",padding:"8px",borderRadius:10,border:"none",
              background:"rgba(255,255,255,.04)",color:T.muted,cursor:"pointer",
              fontFamily:"inherit",fontSize:12,display:"flex",alignItems:"center",
              justifyContent:collapsed?"center":"flex-start",gap:6,transition:"all .15s",
            }}>{collapsed?"Show":"Collapse"}</button>
          </div>
        </aside>

        {/*  MAIN CONTENT  */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {/* Topbar */}
          <header style={{
            height:78,flexShrink:0,
            background:T.surf,
            borderBottom:`1px solid ${T.border}`,
            display:"flex",alignItems:"center",
            padding:"0 24px",gap:16,
          }}>
            <div style={{flex:1}}>
              <span style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:14,color:T.text}}>
                {visibleNav.find(n=>n.id===mod)?.label}
              </span>
              {isSalesman&&<span style={{marginLeft:10}}><Pill label="SALESMAN VIEW" color={T.purple} /></span>}
              {isPartner&&<span style={{marginLeft:10}}><Pill label="CHANNEL PARTNER VIEW" color={T.blue} /></span>}
              {isProductionTeam&&<span style={{marginLeft:10}}><Pill label="PRODUCTION VIEW" color={T.green} /></span>}
            </div>
            <div style={{display:"flex",alignItems:"stretch",gap:10}}>
              <div style={{width:1,background:T.border}} />
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5,justifyContent:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <Avatar name={isProductionTeam?"Production Team":(isPartner?(activePartner?.name||"Channel Partner"):(isSalesman?(activeSalesman?.name||"Salesman User"):"Management User"))} size={30} color={isProductionTeam?T.green:(isSalesman?(activeSalesman?.color||T.purple):T.blue)} />
                  {!collapsed&&<div>
                    <div style={{fontSize:12,fontWeight:500,color:T.text}}>{isProductionTeam?"Production Team":(isPartner?(activePartner?.name||"Channel Partner"):(isSalesman?(activeSalesman?.name||"Salesman"):"Management"))}</div>
                  </div>}
                  {isManager&&<button onClick={changeOwnPassword} style={{padding:"6px 12px",borderRadius:9,border:`1px solid ${T.border}`,background:"transparent",color:T.muted,cursor:"pointer",fontSize:11,fontFamily:"inherit",transition:"all .15s"}}>Change Password</button>}
                  <button onClick={()=>{logoutFromBackend();setRole(null);setActiveSalesmanId(null);setActivePartnerId(null);setAuthPassword("");setSessionLoginAt(0);setMod("dashboard")}} style={{padding:"6px 14px",borderRadius:9,border:`1px solid ${T.border}`,background:"transparent",color:T.muted,cursor:"pointer",fontSize:11,fontFamily:"inherit",transition:"all .15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,.05)";e.currentTarget.style.color=T.text}}
                  onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=T.muted}}
                  >Logout</button>
                </div>
                <div style={{fontFamily:"'Space Grotesk',monospace",fontSize:18,fontWeight:800,color:T.text,letterSpacing:0,lineHeight:1}}>
                  {headerClock}
                </div>
              </div>
            </div>
          </header>

          {/* Manager Read-only Banner */}
          {isSalesman&&mod!=="dashboard"&&(
            <div style={{background:"#f5f3ff",borderBottom:"1px solid #ddd6fe",padding:"8px 24px",fontSize:12,color:"#6d28d9",display:"flex",alignItems:"center",gap:6}}>
              Salesman view - you can view and update only your assigned leads.
            </div>
          )}
          {isProductionTeam&&(
            <div style={{background:"#ecfdf5",borderBottom:"1px solid #bbf7d0",padding:"8px 24px",fontSize:12,color:"#047857",display:"flex",alignItems:"center",gap:6}}>
              Production view - update cutting, assembling, quality check and completed stages only. Approval, Hold and installation dates are managed by Management.
            </div>
          )}

          {/* Module Content */}
          <main style={{flex:1,overflowY:"auto",padding:24}}>
            {moduleMap[mod]}
          </main>
        </div>
      </div>
      {!isManager&&<SmartAssistant
        leads={activeWorkflowLeads}
        setLeads={setLeads}
        orders={visibleOrders}
        followups={visibleFollowups}
        setFollowups={setFollowups}
        salesmen={salesmen}
        expenses={expenses}
        setExpenses={setExpenses}
        smartInventory={smartInventory}
        role={role}
        canWrite
      />}
    </>
  );
}
