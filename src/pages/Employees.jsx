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

export function Salesmen({ leads, setLeads, followups, setFollowups, orders, payments, salesmen, setSalesmen, reassignLogs=[], setReassignLogs }) {
  const [sel,setSel]=useState(null);
  const blankSalesman={name:"",mobile:"",area:"",email:"",loginId:"",password:""};
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState(blankSalesman);
  const [reassign,setReassign]=useState(null);
  const [reassignFilter,setReassignFilter]=useState("All");
  const [bulkTarget,setBulkTarget]=useState("");
  const addSalesman=async ()=>{
    const nameError=validatePersonName(form.name);
    if(nameError)return alert(nameError);
    const mobileError=validateMobile(form.mobile);
    if(mobileError)return alert(mobileError);
    const emailError=validateSalesmanEmail(form.email);
    if(emailError)return alert(emailError);
    if(!form.loginId.trim()||!form.password.trim())return alert("Login ID and password are required");
    if(salesmen.some(s=>s.loginId?.toLowerCase()===form.loginId.trim().toLowerCase()))return alert("This login ID is already used");
    const initials=form.name.split(" ").filter(Boolean).map(p=>p[0]).join("").slice(0,2).toUpperCase()||"SM";
    const colors=[T.blue,T.green,T.orange,T.purple,T.teal,T.amber,T.red];
    const id=Date.now();
    try {
      await createBackendAccessUser({name:form.name.trim(),loginId:form.loginId.trim(),password:form.password.trim(),role:"salesman",linkedEntityId:id});
    } catch (error) {
      return alert(error.message||"Could not create salesman login");
    }
    setSalesmen(list=>[...list,{...form,name:form.name.trim(),mobile:normalizeMobile(form.mobile),email:form.email.trim().toLowerCase(),loginId:form.loginId.trim(),password:"",id,initials,joining:todayStr(),color:colors[list.length%colors.length]}]);
    setForm(blankSalesman);
    setShowAdd(false);
  };
  const removeSalesman=(e,id)=>{
    e.stopPropagation();
    const salesman=salesmen.find(s=>sameId(s.id,id));
    if(!salesman)return;
    const owned=leads.filter(l=>sameId(l.salesman,id));
    const active=salesmen.filter(s=>s.id!==id);
    if(!active.length)return alert("Please add another active salesman before removing this salesman.");
    if(!owned.length){
      if(!confirm("Remove this salesman login? No leads are assigned to this salesman."))return;
      setSalesmen(list=>list.filter(s=>s.id!==id));
      if(sel?.id===id)setSel(null);
      return;
    }
    const firstTarget=active[0].id;
    setBulkTarget(String(firstTarget));
    setReassign({
      salesman,
      assignments:owned.reduce((acc,l)=>({...acc,[l.id]:firstTarget}),{}),
      selected:owned.map(l=>l.id),
    });
  };
  const reassignLeadReason=lead=>{
    const quoteAmount=Number(lead.quotation?.amount||0);
    const paid=Number(lead.paymentPaid||0);
    if(isSalesRecognized(lead,orders,payments)&&Math.max(Number(lead.paymentBalance ?? (quoteAmount-paid)),0)>0)return "Payment Pending";
    if(lead.quotation&&!lead.paymentOrderId)return "Quotation Pending";
    if(leadFollowupReason(lead))return "Follow-up Pending";
    if(lead.svDone||lead.status==="Site Visit Scheduled")return "Site Visit Done";
    if(!lead.paymentOrderId&&lead.status!=="Converted")return "Order Not Closed";
    if(lead.channelPartnerId||lead.source==="CP")return "Channel Partner Leads";
    return "Active Lead";
  };
  const reassignFilterMatch=lead=>{
    if(reassignFilter==="All")return true;
    if(reassignFilter==="Payment Pending"){
      const quoteAmount=Number(lead.quotation?.amount||0);
      const paid=Number(lead.paymentPaid||0);
      return isSalesRecognized(lead,orders,payments)&&Math.max(Number(lead.paymentBalance ?? (quoteAmount-paid)),0)>0;
    }
    if(reassignFilter==="Quotation Pending")return !!lead.quotation&&!lead.paymentOrderId;
    if(reassignFilter==="Follow-up Pending")return !!leadFollowupReason(lead);
    if(reassignFilter==="Site Visit Done")return !!lead.svDone||lead.status==="Site Visit Scheduled";
    if(reassignFilter==="Order Not Closed")return !lead.paymentOrderId&&lead.status!=="Converted";
    if(reassignFilter==="Channel Partner Leads")return !!lead.channelPartnerId||lead.source==="CP";
    return true;
  };
  const setReassignTarget=(leadId,target)=>setReassign(r=>({...r,assignments:{...r.assignments,[leadId]:target}}));
  const toggleReassignLead=leadId=>setReassign(r=>{
    const selected=r.selected.includes(leadId)?r.selected.filter(id=>id!==leadId):[...r.selected,leadId];
    return {...r,selected};
  });
  const applyBulkReassign=ids=>setReassign(r=>{
    if(!bulkTarget)return r;
    const next={...r.assignments};
    ids.forEach(id=>next[id]=bulkTarget);
    return {...r,assignments:next,selected:[...new Set([...r.selected,...ids])]};
  });
  const completeReassignment=()=>{
    const oldId=reassign.salesman.id;
    const owned=leads.filter(l=>sameId(l.salesman,oldId));
    const missing=owned.filter(l=>!reassign.assignments[l.id]||sameId(reassign.assignments[l.id],oldId));
    if(missing.length)return alert("Please assign every lead to another salesman before removing.");
    const logRows=owned.reduce((acc,l)=>{
      const target=reassign.assignments[l.id];
      acc[target]=(acc[target]||0)+1;
      return acc;
    },{});
    const now=new Date().toLocaleString("en-IN");
    const logs=Object.entries(logRows).map(([target,count])=>({
      id:`RAL${Date.now()}-${target}`,
      date:now,
      admin:"Management",
      oldSalesman:reassign.salesman.name,
      newSalesman:smName(target,salesmen),
      count
    }));
    const stamp=new Date().toISOString();
    setLeads(ls=>ls.map(l=>sameId(l.salesman,oldId)?{...l,salesman:reassign.assignments[l.id],updated:todayStr(),updatedAt:stamp,reassignedAt:stamp,assignedAt:stamp,reassignmentHistory:[...(l.reassignmentHistory||[]),{date:now,from:reassign.salesman.name,to:smName(reassign.assignments[l.id],salesmen),admin:"Management"}]}:l));
    setFollowups?.(fs=>fs.map(f=>{
      const lead=owned.find(l=>l.id===f.leadId);
      return lead?{...f,smId:reassign.assignments[lead.id]}:f;
    }));
    setSalesmen(list=>list.filter(s=>!sameId(s.id,oldId)));
    const nextLogs=[...logs,...reassignLogs].slice(0,40);
    setReassignLogs?.(nextLogs);
    if(sameId(sel?.id,oldId))setSel(null);
    setReassign(null);
    alert(`Reassigned ${owned.length} lead(s) and removed ${reassign.salesman.name}.`);
  };
  const changePassword=async (e,salesman)=>{
    e.stopPropagation();
    const next=prompt(`Enter new password for ${salesman.name}`, "");
    if(!next)return;
    try {
      await createBackendAccessUser({name:salesman.name,loginId:salesman.loginId,password:next,role:"salesman",linkedEntityId:salesman.id});
    } catch (error) {
      return alert(error.message||"Could not update salesman password");
    }
    const forcedLogoutAt=Date.now();
    setSalesmen(list=>list.map(s=>sameId(s.id,salesman.id)?{...s,password:"",forcedLogoutAt}:s));
    if(sameId(sel?.id,salesman.id))setSel(s=>({...s,password:"",forcedLogoutAt}));
    alert("Password changed. Any logged-in session for this salesman will be logged out and old password will not work.");
  };
  const calcSalesmanMetrics=s=>{
    const sLeads=sortLeadsNewest(leads.filter(l=>sameId(l.salesman,s.id)));
    const converted=sLeads.filter(l=>l.status==="Converted");
    const contacted=sLeads.filter(l=>l.contactDone||["Contacted","Site Visit Scheduled","Quoted","Converted"].includes(l.status)).length;
    const siteVisits=sLeads.filter(l=>l.svDone||["Site Visit Scheduled","Quoted","Converted"].includes(l.status)).length;
    const measured=sLeads.filter(l=>l.measurement||l.measurements?.length).length;
    const quoted=sLeads.filter(l=>l.quotation).length;
    const recognizedSales=sLeads.filter(l=>isSalesRecognized(l,orders,payments));
    const quotedTotal=recognizedSales.reduce((sum,l)=>sum+Number(l.quotation?.amount||0),0);
    const collected=recognizedSales.reduce((sum,l)=>sum+leadPaidFromOrders(l,orders,payments),0);
    const pending=recognizedSales.reduce((sum,l)=>{
      const quotedAmount=Number(l.quotation?.amount||0);
      const paid=leadPaidFromOrders(l,orders,payments);
      const balance=leadBalanceFromOrders(l,orders,payments)||Math.max(quotedAmount-paid,0);
      return sum+Math.max(balance,0);
    },0);
    const paidLeads=recognizedSales.filter(l=>l.paymentMarked&&leadPaidFromOrders(l,orders,payments)>0).length;
    const openFollowups=unifiedFollowups(sLeads,followups,salesmen).filter(f=>sameId(f.smId,s.id)).length;
    const completedFollowups=followups.filter(f=>sameId(f.smId,s.id)&&f.outcome==="Completed").length;
    const productionOrders=orders.filter(o=>sLeads.some(l=>l.id===o.leadId)).length;
    const rate=sLeads.length>0?Math.round(converted.length/sLeads.length*100):0;
    return {sLeads,converted,contacted,siteVisits,measured,quoted,quotedTotal,collected,pending,paidLeads,openFollowups,completedFollowups,productionOrders,rate};
  };
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:18}}>
        <SectionTitle>Salesman Management</SectionTitle>
        <PrimaryBtn onClick={()=>setShowAdd(true)} color={T.blue}>+ Add Salesman</PrimaryBtn>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:16}}>
        {salesmen.map(s=>{
          const m=calcSalesmanMetrics(s);
          return (
            <GlassCard key={s.id} style={{cursor:"pointer"}} onClick={()=>setSel(s)}>
              <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
                <Avatar name={s.name} size={44} color={s.color} />
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:15,fontWeight:700,color:T.text}}>{s.name}</div>
                  <div style={{fontSize:12,color:T.muted,marginTop:2}}>{s.area}</div>
                  <div style={{fontSize:11,color:T.sub,marginTop:2}}>Login ID: {s.loginId}</div>
                </div>
                <GhostBtn onClick={e=>changePassword(e,s)}>Change Password</GhostBtn>
                <GhostBtn onClick={e=>removeSalesman(e,s.id)}>Remove</GhostBtn>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:20,fontWeight:700,fontFamily:"'Space Grotesk',sans-serif",color:s.color}}>{m.rate}%</div>
                  <div style={{fontSize:10,color:T.muted}}>conv. rate</div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:8,marginBottom:14}}>
                {[
                  ["Assigned",m.sLeads.length,T.blue],
                  ["Contacted",m.contacted,T.orange],
                  ["SV Done",m.siteVisits,T.teal],
                  ["Quoted",m.quoted,T.purple],
                  ["Converted",m.converted.length,T.green],
                  ["Collected",inr(m.collected),T.green],
                  ["Pending",inr(m.pending),T.red],
                  ["Sales",inr(m.quotedTotal),s.color]
                ].map(([l,v,c])=>(
                  <div key={l} style={{background:"rgba(255,255,255,.04)",borderRadius:10,padding:"8px 6px",textAlign:"center"}}>
                    <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:14,fontWeight:700,color:c,whiteSpace:"nowrap"}}>{v}</div>
                    <div style={{fontSize:10,color:T.muted,marginTop:2}}>{l}</div>
                  </div>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>
      {reassignLogs.length>0&&<GlassCard style={{marginTop:16,padding:0}}>
        <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,fontSize:13,fontWeight:800,color:T.text}}>Reassignment Audit</div>
        <Table headers={["Date / Time","Old Salesman","New Salesman","Leads","Admin"]}>
          {reassignLogs.slice(0,6).map(log=><TR key={log.id}><TD color={T.sub}>{log.date}</TD><TD bold>{log.oldSalesman}</TD><TD bold>{log.newSalesman}</TD><TD>{log.count}</TD><TD>{log.admin}</TD></TR>)}
        </Table>
      </GlassCard>}

      {showAdd&&<Modal title="Add Salesman" onClose={()=>setShowAdd(false)}>
        <FormRow cols={2}>
          <Field label="Salesman Name"><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></Field>
          <Field label="Mobile"><input value={form.mobile} maxLength={10} inputMode="numeric" placeholder="10 digit mobile number" onChange={e=>setForm(f=>({...f,mobile:e.target.value.replace(/\D/g,"").slice(0,10)}))} /></Field>
        </FormRow>
        <FormRow cols={2}>
          <Field label="Area"><input value={form.area} onChange={e=>setForm(f=>({...f,area:e.target.value}))} /></Field>
          <Field label="Email"><input type="email" value={form.email} placeholder="name@gmail.com or name@smartcovering.in" onChange={e=>setForm(f=>({...f,email:e.target.value}))} /></Field>
        </FormRow>
        <FormRow cols={2}>
          <Field label="Login ID"><input value={form.loginId} onChange={e=>setForm(f=>({...f,loginId:e.target.value}))} placeholder="example: amit" /></Field>
          <Field label="Password"><input type="text" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Give this to salesman" /></Field>
        </FormRow>
        <div style={{display:"flex",gap:10,marginTop:20}}><PrimaryBtn onClick={addSalesman} color={T.blue}>Save Salesman</PrimaryBtn><GhostBtn onClick={()=>setShowAdd(false)}>Cancel</GhostBtn></div>
      </Modal>}
      {reassign&&(()=>{ 
        const owned=sortLeadsNewest(leads.filter(l=>sameId(l.salesman,reassign.salesman.id)));
        const visible=sortLeadsNewest(owned.filter(reassignFilterMatch));
        const active=salesmen.filter(s=>s.id!==reassign.salesman.id);
        const assignedCount=owned.filter(l=>reassign.assignments[l.id]&&!sameId(reassign.assignments[l.id],reassign.salesman.id)).length;
        const filters=["All","Payment Pending","Quotation Pending","Follow-up Pending","Site Visit Done","Order Not Closed","Channel Partner Leads"];
        return <Modal title={`Reassign Leads - ${reassign.salesman.name}`} onClose={()=>setReassign(null)} wide>
          <div style={{background:T.cardHi,border:`1px solid ${T.border}`,borderRadius:8,padding:12,marginBottom:14,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10}}>
            <div><div style={{fontSize:11,fontWeight:800,color:T.muted}}>Total Leads</div><div style={{fontSize:22,fontWeight:900,color:T.text}}>{owned.length}</div></div>
            <div><div style={{fontSize:11,fontWeight:800,color:T.muted}}>Ready To Transfer</div><div style={{fontSize:22,fontWeight:900,color:T.green}}>{assignedCount}</div></div>
            <div><div style={{fontSize:11,fontWeight:800,color:T.muted}}>Selected Rows</div><div style={{fontSize:22,fontWeight:900,color:T.blue}}>{reassign.selected.length}</div></div>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",marginBottom:14}}>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {filters.map(f=><button key={f} onClick={()=>setReassignFilter(f)} style={{border:`1px solid ${reassignFilter===f?T.blue:T.border}`,background:reassignFilter===f?T.blue:"#fff",color:reassignFilter===f?"#fff":T.sub,borderRadius:7,padding:"7px 10px",fontSize:12,fontWeight:800,cursor:"pointer"}}>{f}</button>)}
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <select value={bulkTarget} onChange={e=>setBulkTarget(e.target.value)} style={{width:190,padding:"8px 10px"}}>
                {active.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <GhostBtn onClick={()=>setReassign(r=>({...r,selected:visible.map(l=>l.id)}))}>Select Visible</GhostBtn>
              <PrimaryBtn onClick={()=>applyBulkReassign(reassign.selected.length?reassign.selected:visible.map(l=>l.id))} color={T.blue}>Assign Selected</PrimaryBtn>
            </div>
          </div>
          <GlassCard style={{padding:0,maxHeight:420,overflowY:"auto",marginBottom:14}}>
            <Table headers={["Select","Lead","Status","Reason","Transfer To"]}>
              {visible.map(l=>{
                const quoteAmount=Number(l.quotation?.amount||0);
              const paid=leadPaidFromOrders(l,orders,payments);
              const pending=isSalesRecognized(l,orders,payments)?(leadBalanceFromOrders(l,orders,payments)||Math.max(Number(l.paymentBalance ?? (quoteAmount-paid)),0)):0;
                return <TR key={l.id}>
                  <TD><input type="checkbox" checked={reassign.selected.includes(l.id)} onChange={()=>toggleReassignLead(l.id)} style={{width:"auto"}} /></TD>
                  <TD bold>{l.name}<div style={{fontSize:11,color:T.muted}}>{l.id} | {l.mobile} | {l.source||"Salesman"}</div></TD>
                  <TD><StatusPill s={l.status} /><div style={{fontSize:11,color:T.muted,marginTop:4}}>Quote {quoteAmount?inr(quoteAmount):"-"} | Pending {pending?inr(pending):"-"}</div></TD>
                  <TD><Pill label={reassignLeadReason(l)} color={T.sub} /></TD>
                  <TD><select value={reassign.assignments[l.id]||""} onChange={e=>setReassignTarget(l.id,e.target.value)} style={{minWidth:190,padding:"8px 10px"}}>{active.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></TD>
                </TR>;
              })}
              {!visible.length&&<TR><TD colSpan={5} color={T.muted}>No leads in this filter.</TD></TR>}
            </Table>
          </GlassCard>
          <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{fontSize:12,color:T.sub}}>Removal will complete only after all {owned.length} lead(s) are assigned to another active salesman. Follow-ups and pending work will move with the lead.</div>
            <div style={{display:"flex",gap:10}}><GhostBtn onClick={()=>setReassign(null)}>Cancel</GhostBtn><PrimaryBtn color={T.red} onClick={completeReassignment}>Transfer Leads & Remove</PrimaryBtn></div>
          </div>
        </Modal>;
      })()}
      {sel&&<Modal title={`${sel.name}  Full Profile`} onClose={()=>setSel(null)} wide>
        {(()=>{ const m=calcSalesmanMetrics(sel); return <>
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20,padding:"16px 20px",background:"rgba(255,255,255,.04)",borderRadius:14}}>
          <Avatar name={sel.name} size={54} color={sel.color} />
          <div>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:18,fontWeight:700,color:T.text}}>{sel.name}</div>
            <div style={{fontSize:13,color:T.muted,marginTop:2}}>{sel.mobile} | {sel.email}</div>
            <div style={{fontSize:12,color:T.sub,marginTop:2}}>{sel.area} | Joined {sel.joining} | Login ID: {sel.loginId} | Password: hidden for security</div>
            <div style={{marginTop:10}}><PrimaryBtn small color={T.blue} onClick={e=>changePassword(e,sel)}>Change Password</PrimaryBtn></div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:16}}>
          <StatKPI label="Assigned Leads" value={m.sLeads.length} color={T.blue} />
          <StatKPI label="Quoted Leads" value={m.quoted} color={T.purple} />
          <StatKPI label="Total Sales" value={inr(m.quotedTotal)} color={sel.color} />
          <StatKPI label="Collected" value={inr(m.collected)} color={T.green} />
          <StatKPI label="Pending" value={inr(m.pending)} color={T.red} />
          <StatKPI label="Open Follow-ups" value={m.openFollowups} color={T.sub} />
        </div>
        <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:10}}>Assigned Leads</div>
        <GlassCard style={{padding:0,marginBottom:0,maxHeight:320,overflowY:"auto"}}>
          <Table headers={["Lead ID","Customer","Product","Status","Quotation","Paid","Pending"]}>
            {m.sLeads.map(l=>{
              const quoted=Number(l.quotation?.amount||0);
              const recognized=isSalesRecognized(l,orders,payments);
              const paid=recognized?leadPaidFromOrders(l,orders,payments):0;
              const pending=recognized?(leadBalanceFromOrders(l,orders,payments)||Math.max(Number(l.paymentBalance ?? (quoted-paid)),0)):0;
              return <TR key={l.id}><TD mono color={T.muted}>{l.id}</TD><TD bold color={T.text}>{l.name}</TD><TD color={T.sub}>{l.product}</TD><TD><StatusPill s={l.status} /></TD><TD bold color={quoted?T.blue:T.muted}>{quoted?inr(quoted):"Not quoted"}</TD><TD color={paid?T.green:T.muted}>{paid?inr(paid):"-"}</TD><TD color={pending?T.red:T.muted}>{pending?inr(pending):"-"}</TD></TR>;
            })}
            {!m.sLeads.length&&<TR><TD colSpan={7} color={T.muted}>No leads assigned to this salesman yet.</TD></TR>}
          </Table>
        </GlassCard>
        </>; })()}
      </Modal>}
    </div>
  );
}


