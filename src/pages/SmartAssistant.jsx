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

export function SmartAssistant({ leads, setLeads, orders, followups, setFollowups, salesmen, expenses, setExpenses, smartInventory, role, canWrite }) {
  const [open,setOpen]=useState(false);
  const [input,setInput]=useState("");
  const [buttonPos,setButtonPos]=useState({right:26,bottom:26});
  const [drag,setDrag]=useState(null);
  const [suppressClick,setSuppressClick]=useState(false);
  const dragRef=useRef(null);
  const [messages,setMessages]=useState([
    {from:"bot",text:"Ask me about leads, missed follow-ups, production, inventory, expenses, or say: add lead name Rahul mobile 9876543210 product Mesh location Bengaluru salesman Amit."}
  ]);
  const addBot=text=>setMessages(ms=>[...ms,{from:"bot",text}]);
  const addUser=text=>setMessages(ms=>[...ms,{from:"user",text}]);
  const overdue=()=>unifiedFollowups(leads,followups,salesmen).filter(f=>(f.nextDate||f.date||todayStr())<todayStr()&&f.outcome!=="Completed");
  const findSalesman=text=>{
    const lower=text.toLowerCase();
    return salesmen.find(s=>lower.includes(String(s.name||"").toLowerCase())||lower.includes(String(s.loginId||"").toLowerCase()));
  };
  const findLead=text=>{
    const lower=text.toLowerCase();
    const mobile=normalizeMobile(text).slice(-10);
    return leads.find(l=>
      String(l.id||"").toLowerCase()===lower.trim()||
      (mobile&&normalizeMobile(l.mobile)===mobile)||
      lower.includes(String(l.name||"").toLowerCase())
    );
  };
  const extractAfter=(text,label)=>{
    const match=new RegExp(`${label}\\s+([^,;]+?)(?=\\s+(name|mobile|phone|product|location|budget|salesman|source|notes|amount|reason|date|lead|type)\\b|$)`,"i").exec(text);
    return match?.[1]?.trim()||"";
  };
  const parseDate=text=>{
    const lower=text.toLowerCase();
    if(lower.includes("tomorrow")){
      const d=new Date();d.setDate(d.getDate()+1);return d.toISOString().split("T")[0];
    }
    const exact=/\b(\d{4}-\d{2}-\d{2})\b/.exec(text)?.[1];
    return exact||todayStr();
  };
  const addLeadFromChat=text=>{
    if(!canWrite)return "Only Management can add or change ERP records from chatbot.";
    const mobile=normalizeMobile(extractAfter(text,"mobile")||extractAfter(text,"phone")||text).slice(-10);
    const name=extractAfter(text,"name")||text.replace(/add\s+lead|create\s+lead/ig,"").replace(/\bmobile\b.*$/i,"").trim();
    const product=(/blind/i.test(text)?"Blinds":/mesh/i.test(text)?"Mesh":PRODUCTS[0]);
    const location=extractAfter(text,"location");
    const budget=Number((extractAfter(text,"budget")||"").replace(/\D/g,""))||"";
    const source=extractAfter(text,"source")||"Other";
    const salesman=findSalesman(text)||salesmen[0];
    if(!name||name.length<2)return "Please include customer name. Example: add lead name Rahul mobile 9876543210 product Mesh";
    const mobileError=validateMobile(mobile);
    if(mobileError)return mobileError;
    const duplicate=customerDuplicate({leads,orders,mobile});
    if(duplicate)return duplicateMsg(duplicate);
    const now=new Date().toISOString();
    const id=`L${String(leads.length+1).padStart(3,"0")}`;
    setLeads(ls=>[...ls,{id,name,mobile,email:"",alt:"",source,product,location,budget,salesman:salesman?.id||1,status:"New",priority:"Warm",notes:extractAfter(text,"notes"),created:todayStr(),updated:todayStr(),createdAt:now,updatedAt:now,assignedAt:now,createdBy:"Chatbot"}]);
    return `Lead ${id} created for ${name}${salesman?.name?` and assigned to ${salesman.name}`:""}.`;
  };
  const addExpenseFromChat=text=>{
    if(!canWrite)return "Only Management can add expenses from chatbot.";
    const amount=Number((extractAfter(text,"amount")||text).replace(/,/g,"").match(/\d+(\.\d+)?/)?.[0]||0);
    const category=EXPENSE_CATEGORIES.find(c=>text.toLowerCase().includes(c.toLowerCase()))||extractAfter(text,"category")||"Other";
    const reason=extractAfter(text,"reason")||extractAfter(text,"notes")||text.replace(/add\s+expense|expense/ig,"").trim();
    if(!amount)return "Please include expense amount. Example: add expense amount 1200 category Logistics reason delivery diesel";
    setExpenses(es=>[{id:`EXP${Date.now()}`,date:parseDate(text),cat:category,name:category,amount,reason,desc:reason},...es]);
    return `Expense saved: ${category} ${inr(amount)}.`;
  };
  const addFollowupFromChat=text=>{
    if(!canWrite)return "Only Management can add follow-ups from chatbot.";
    const lead=findLead(text);
    if(!lead)return "Please mention lead name, lead ID, or mobile number. Example: add followup lead Rahul tomorrow call";
    const type=/visit/i.test(text)?"Visit":/whatsapp/i.test(text)?"WhatsApp":/email/i.test(text)?"Email":"Call";
    const date=parseDate(text);
    setFollowups(fs=>[...fs.filter(f=>f.leadId!==lead.id||f.outcome==="Completed"),{id:`FU${Date.now()}`,leadId:lead.id,smId:lead.salesman||salesmen[0]?.id||1,date,time:"10:00",type,outcome:"Pending",action:extractAfter(text,"reason")||extractAfter(text,"notes")||`${type} follow-up`,next:date,notes:extractAfter(text,"notes"),createdBy:"Chatbot",createdAt:new Date().toISOString()}]);
    return `Follow-up added for ${lead.name} on ${date}.`;
  };
  const answerQuery=text=>{
    const lower=text.toLowerCase();
    if(/add|create|save/.test(lower)&&/expense/.test(lower))return addExpenseFromChat(text);
    if(/add|create|save/.test(lower)&&/follow/.test(lower))return addFollowupFromChat(text);
    if(/add|create|save/.test(lower)&&/lead/.test(lower))return addLeadFromChat(text);
    if(/miss|missed|overdue|pending follow/.test(lower)){
      const list=overdue();
      if(!list.length)return "No missed follow-ups right now.";
      return `Missed follow-ups: ${list.length}\n`+list.slice(0,8).map(f=>`${f.leadName||leads.find(l=>l.id===f.leadId)?.name||"Lead"} - ${f.nextDate||f.date}`).join("\n");
    }
    if(/lead/.test(lower)){
      const converted=leads.filter(l=>l.status==="Converted").length;
      const fresh=leads.filter(l=>l.created===todayStr()).length;
      return `Leads: ${leads.length}. New today: ${fresh}. Converted: ${converted}. Open: ${leads.filter(l=>!["Converted","Rejected","Lost"].includes(l.status)).length}.`;
    }
    if(/production|order/.test(lower)){
      const prod=orders.filter(o=>["Approval Pending","In Production","Completed","Installed","Closed"].includes(o.status)||o.productionStage).length;
      const pending=orders.filter(o=>o.status==="Approval Pending").length;
      const active=orders.filter(o=>o.status==="In Production"||o.productionStage==="Cutting"||o.productionStage==="Assembling"||o.productionStage==="Quality Check").length;
      return `Production orders: ${prod}. Approval pending: ${pending}. In production: ${active}. Completed: ${orders.filter(o=>o.status==="Completed"||o.productionStage==="Completed").length}.`;
    }
    if(/inventory|stock/.test(lower)){
      const blinds=(smartInventory?.blindRolls||[]).length;
      const mesh=(smartInventory?.meshComponents||[]).length;
      const movements=(smartInventory?.movements||[]).slice(0,5).map(m=>m.text||m.orderId).filter(Boolean);
      return `Inventory: ${blinds} blind items and ${mesh} mesh items. Recent activity: ${movements.length?movements.join("; "):"none"}.`;
    }
    if(/expense|spend|cost/.test(lower)){
      const month=todayStr().slice(0,7);
      const today=expenses.filter(e=>e.date===todayStr()).reduce((s,e)=>s+Number(e.amount||0),0);
      const mtd=expenses.filter(e=>String(e.date||"").startsWith(month)).reduce((s,e)=>s+Number(e.amount||0),0);
      return `Expenses today: ${inr(today)}. This month: ${inr(mtd)}. Total entries: ${expenses.length}.`;
    }
    return "I can help with: leads summary, missed follow-ups, production status, inventory, expenses, add lead, add expense, and add followup.";
  };
  const submit=e=>{
    e.preventDefault();
    const text=input.trim();
    if(!text)return;
    addUser(text);
    setInput("");
    setTimeout(()=>addBot(answerQuery(text)),80);
  };
  const startDrag=e=>{
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setSuppressClick(false);
    dragRef.current={x:e.clientX,y:e.clientY,right:buttonPos.right,bottom:buttonPos.bottom,moved:false};
    setDrag(true);
  };
  const moveDrag=e=>{
    const current=dragRef.current;
    if(!current)return;
    const dx=e.clientX-current.x;
    const dy=e.clientY-current.y;
    const moved=Math.abs(dx)>3||Math.abs(dy)>3;
    const nextRight=Math.max(12,Math.min(window.innerWidth-82,current.right-dx));
    const nextBottom=Math.max(12,Math.min(window.innerHeight-82,current.bottom-dy));
    dragRef.current={...current,moved:current.moved||moved};
    setButtonPos({right:nextRight,bottom:nextBottom});
  };
  const endDrag=e=>{
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    const wasMoved=dragRef.current?.moved;
    dragRef.current=null;
    setSuppressClick(Boolean(wasMoved));
    setDrag(null);
  };
  const panelRight=Math.max(12,Math.min(buttonPos.right,window.innerWidth-440));
  const panelBottom=Math.min(buttonPos.bottom+84,window.innerHeight-120);
  return <>
    <button aria-label="Open SmartCovering Assistant" title="Click and drag Smart Assistant" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onClick={()=>{if(suppressClick){setSuppressClick(false);return;} setOpen(o=>!o);}} style={{position:"fixed",right:buttonPos.right,bottom:buttonPos.bottom,zIndex:1500,width:70,height:70,border:0,borderRadius:"50%",background:"linear-gradient(145deg,#0f766e,#2563eb)",boxShadow:"0 18px 45px rgba(37,99,235,.30), 0 0 0 7px rgba(37,99,235,.10)",cursor:drag?"grabbing":"grab",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",padding:0,touchAction:"none",userSelect:"none"}}>
      <div style={{width:48,height:42,borderRadius:16,background:"#f8fafc",border:"2px solid rgba(255,255,255,.85)",boxShadow:"inset 0 -7px 0 rgba(37,99,235,.10)",position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{position:"absolute",top:-7,left:"50%",width:10,height:10,borderRadius:"50%",background:"#38bdf8",transform:"translateX(-50%)",boxShadow:"0 -8px 0 -3px #0f766e"}} />
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={{width:8,height:8,borderRadius:"50%",background:"#0f172a",boxShadow:"16px 0 0 #0f172a"}} />
        </div>
        <div style={{position:"absolute",bottom:8,left:"50%",width:17,height:5,borderRadius:"0 0 9px 9px",borderBottom:"3px solid #0f766e",transform:"translateX(-50%)"}} />
      </div>
    </button>
    {open&&<div style={{position:"fixed",right:panelRight,bottom:panelBottom,zIndex:1500,width:"min(420px,calc(100vw - 32px))",height:"min(585px,calc(100vh - 132px))",background:T.card,border:`1px solid ${T.border}`,borderRadius:18,boxShadow:"0 30px 90px rgba(15,23,42,.28)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:16,borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:"linear-gradient(135deg,#f8fafc,#eef6ff)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:44,height:38,borderRadius:14,background:"linear-gradient(145deg,#0f766e,#2563eb)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 10px 25px rgba(37,99,235,.22)"}}>
            <div style={{width:28,height:23,borderRadius:9,background:"#fff",position:"relative"}}>
              <span style={{position:"absolute",top:8,left:6,width:5,height:5,borderRadius:"50%",background:"#0f172a",boxShadow:"11px 0 0 #0f172a"}} />
              <span style={{position:"absolute",bottom:5,left:9,width:10,height:3,borderRadius:999,background:"#0f766e"}} />
            </div>
          </div>
          <div><div style={{fontWeight:900,color:T.text}}>SmartCovering Assistant</div><div style={{fontSize:11,color:T.muted}}>{canWrite?"Can check and add ERP records":"Check-only access"}</div></div>
        </div>
        <button onClick={()=>setOpen(false)} style={{border:0,background:T.cardHi,borderRadius:10,width:32,height:32,cursor:"pointer",color:T.muted,fontWeight:800}}>x</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:16,display:"grid",gap:10,alignContent:"start",background:"linear-gradient(180deg,#ffffff,#f8fafc)"}}>
        {messages.map((m,i)=><div key={i} style={{justifySelf:m.from==="user"?"end":"start",maxWidth:"88%",whiteSpace:"pre-line",background:m.from==="user"?T.blue:T.cardHi,color:m.from==="user"?"#fff":T.text,border:`1px solid ${m.from==="user"?T.blue:T.border}`,borderRadius:m.from==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",padding:"10px 12px",fontSize:13,lineHeight:1.45,boxShadow:"0 8px 18px rgba(15,23,42,.06)"}}>{m.text}</div>)}
      </div>
      <form onSubmit={submit} style={{padding:14,borderTop:`1px solid ${T.border}`,display:"flex",gap:8,background:T.card}}>
        <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask or add lead/expense..." style={{flex:1,borderRadius:999,padding:"10px 14px"}} />
        <PrimaryBtn small>Send</PrimaryBtn>
      </form>
    </div>}
  </>;
}


