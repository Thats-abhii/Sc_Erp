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

export function Orders({ orders, setOrders, workOrders, setWorkOrders, payments, isManager }) {
  const [fSt,setFSt]=useState("All");
  const [showDetail,setShowDetail]=useState(null);
  const [showAdd,setShowAdd]=useState(false);
  const [saving,setSaving]=useState(false);
  const blank={customer:"",mobile:"",products:[{name:PRODUCTS[0],size:"",qty:1,unitPrice:0,total:0}],discount:0,final:0,advance:0,balance:0,delivery:"",install:false,installer:"",status:"Pending",leadId:""};
  const [form,setForm]=useState(blank);

  const filtered=orders.filter(o=>fSt==="All"||o.status===fSt);

  const calcFinal=f=>{ const sub=f.products.reduce((s,p)=>s+p.total,0); return {sub,final:sub-f.discount,balance:sub-f.discount-f.advance}; };

  const save=()=>{
    if(saving)return;
    if(!form.customer)return alert("Customer name required");
    const mobileError=validateMobile(form.mobile);
    if(mobileError)return alert(mobileError);
    const normalizedMobile=normalizeMobile(form.mobile);
    const existing=orders.find(o=>normalizeMobile(o.mobile)===normalizedMobile);
    if(existing){ duplicateAudit("Order Management",`Order already exists for ${normalizedMobile}`,{existingOrder:existing.id}); return alert(`Customer already exists in Order ${existing.id}`); }
    const key=`order:${normalizedMobile}:${form.products.map(p=>p.name).join("|")}`;
    if(onceKeyActive(key))return alert("Processing... duplicate order blocked");
    setSaving(true);
    const {final,balance}=calcFinal(form);
    const id=`ORD-${String(orders.length+1).padStart(3,"0")}`;
    setOrders(os=>[...os,{...form,mobile:normalizedMobile,id,final,balance,created:todayStr(),createdAt:new Date().toISOString(),createdBy:"Management"}]);
    auditLog({event:"Created",source:"Order Management",recordType:"Order",recordId:id,mobile:normalizedMobile});
    setShowAdd(false);setForm(blank);
    setSaving(false);
  };

  const makeWO=order=>{ setWorkOrders(ws=>[...ws,{id:`WO-${String(workOrders.length+1).padStart(3,"0")}`,orderId:order.id,product:order.products[0]?.name||"Custom",qty:order.products[0]?.qty||1,staff:"To Assign",start:todayStr(),end:order.delivery||todayStr(),status:"Pending",bom:BOM_MAP[order.products[0]?.name]||[]}]); alert("Work Order created "); };

  const getPaid=oid=>payments.filter(p=>p.orderId===oid).reduce((s,p)=>s+p.amount,0);

  const statusList=["All","Pending","In Production","Ready","Delivered","Installed","Closed"];

  return (
    <div>
      <SectionTitle action={!isManager&&<PrimaryBtn onClick={()=>setShowAdd(true)}>+ New Order</PrimaryBtn>}>Order Management</SectionTitle>

      {/* Status Filter Pills */}
      <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>
        {statusList.map(s=>{
          const cnt=orders.filter(o=>s==="All"||o.status===s).length;
          return <button key={s} onClick={()=>setFSt(s)} style={{padding:"6px 14px",borderRadius:99,border:`1px solid ${fSt===s?T.amber:"rgba(255,255,255,.1)"}`,background:fSt===s?`${T.amber}22`:"transparent",color:fSt===s?T.amber:T.sub,cursor:"pointer",fontSize:12,fontWeight:500,transition:"all .15s"}}>{s} ({cnt})</button>
        })}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {filtered.map(o=>{
          const paid=getPaid(o.id);
          const over=o.delivery&&o.delivery<todayStr()&&!["Delivered","Installed","Closed"].includes(o.status);
          return (
            <GlassCard key={o.id} style={{borderColor:over?"rgba(251,146,60,.3)":T.border}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6,flexWrap:"wrap"}}>
                    <span style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,color:T.amber,fontSize:15}}>{o.id}</span>
                    <StatusPill s={o.status} />
                    {o.leadId&&<span style={{fontSize:11,color:T.muted}}> {o.leadId}</span>}
                    {over&&<Pill label="DELIVERY OVERDUE" color={T.orange} />}
                  </div>
                  <div style={{fontWeight:600,fontSize:15,color:T.text,marginBottom:4}}>{o.customer}</div>
                  <div style={{fontSize:12,color:T.muted}}> {o.mobile}</div>
                  <div style={{fontSize:12,color:T.sub,marginTop:4}}>{o.products.map(p=>`${p.name} ${p.qty}`).join(", ")}</div>
                  {o.delivery&&<div style={{fontSize:11,color:T.muted,marginTop:3}}> Delivery: {o.delivery}{o.install&&` |  Installation: ${o.installer||"TBD"}`}</div>}
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:20,fontWeight:700,color:T.text}}>{inr(o.final)}</div>
                  <div style={{fontSize:12,color:T.green,marginTop:4}}>Paid: {inr(paid)}</div>
                  <div style={{fontSize:12,color:T.red}}>Balance: {inr(o.final-paid)}</div>
                </div>
              </div>
              <Divider />
              <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                <GhostBtn small onClick={()=>setShowDetail(o)}>View Details</GhostBtn>
                {!isManager&&<>
                  <select value={o.status} onChange={e=>setOrders(os=>os.map(oo=>oo.id===o.id?{...oo,status:e.target.value}:oo))} style={{padding:"6px 10px",borderRadius:9,fontSize:12,width:"auto",minWidth:130}}>
                    {["Pending","In Production","Ready","Delivered","Installed","Closed"].map(s=><option key={s}>{s}</option>)}
                  </select>
                  {!workOrders.find(w=>w.orderId===o.id)&&<PrimaryBtn small onClick={()=>makeWO(o)} color={T.teal}>+ Work Order</PrimaryBtn>}
                </>}
                <button onClick={()=>alert(` Invoice for ${o.id}\n\nIn production: PDF generated with:\n Company letterhead & GSTIN\n Order details & line items\n Payment terms & balance due\n Digital signature field\n\nPowered by jsPDF + backend service`)} style={{padding:"6px 12px",background:`${T.green}15`,border:`1px solid ${T.green}30`,borderRadius:9,color:T.green,cursor:"pointer",fontSize:12}}> Invoice PDF</button>
                <button onClick={()=>alert(` Quotation for ${o.id}\n\nIn production: formal quotation PDF with validity, terms and conditions`)} style={{padding:"6px 12px",background:`${T.blue}15`,border:`1px solid ${T.blue}30`,borderRadius:9,color:T.blue,cursor:"pointer",fontSize:12}}> Quotation</button>
              </div>
            </GlassCard>
          );
        })}
        {filtered.length===0&&<div style={{textAlign:"center",padding:60,color:T.muted}}>No orders found</div>}
      </div>

      {showDetail&&(
        <Modal title={`Order Details  ${showDetail.id}`} onClose={()=>setShowDetail(null)} wide>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
            {[["Customer",showDetail.customer],["Mobile",showDetail.mobile],["Delivery",showDetail.delivery||""],["Installation",showDetail.install?`Yes | ${showDetail.installer}`:"No"],["Status",showDetail.status],["Created",showDetail.created]].map(([k,v])=>(
              <div key={k} style={{background:"rgba(255,255,255,.04)",borderRadius:10,padding:"10px 14px"}}>
                <div style={{fontSize:11,color:T.muted,marginBottom:3,textTransform:"uppercase",letterSpacing:.4}}>{k}</div>
                <div style={{fontSize:13,color:T.text,fontWeight:500}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:10}}>Products</div>
          <GlassCard style={{marginBottom:16,padding:0}}>
            <Table headers={["Product","Size","Qty","Unit Price","Total"]}>
              {showDetail.products.map((p,i)=>(
                <TR key={i}><TD>{p.name}</TD><TD>{p.size}</TD><TD bold color={T.amber}>{p.qty}</TD><TD>{inr(p.unitPrice)}</TD><TD bold>{inr(p.total)}</TD></TR>
              ))}
            </Table>
          </GlassCard>
          <div style={{display:"flex",justifyContent:"flex-end",gap:20,fontSize:13}}>
            <span style={{color:T.muted}}>Discount: <b style={{color:T.red}}>-{inr(showDetail.discount)}</b></span>
            <span style={{color:T.muted}}>Total: <b style={{color:T.text,fontFamily:"'Space Grotesk',sans-serif",fontSize:16}}>{inr(showDetail.final)}</b></span>
          </div>
          <div style={{fontSize:13,fontWeight:600,color:T.text,margin:"16px 0 10px"}}>Payment History</div>
          {payments.filter(p=>p.orderId===showDetail.id).map(p=>(
            <div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.border}`,fontSize:13}}>
              <span style={{color:T.sub}}>{p.date} | {p.mode}</span>
              <span style={{fontWeight:600,color:T.green}}>{inr(p.amount)}</span>
            </div>
          ))}
          {payments.filter(p=>p.orderId===showDetail.id).length===0&&<div style={{fontSize:13,color:T.muted}}>No payments recorded yet.</div>}
        </Modal>
      )}

      {showAdd&&(
        <Modal title="New Order" onClose={()=>setShowAdd(false)} wide>
          <FormRow cols={2}>
            <Field label="Customer Name *"><input value={form.customer} onChange={e=>setForm(f=>({...f,customer:e.target.value}))} /></Field>
            <Field label="Mobile"><input value={form.mobile} onChange={e=>setForm(f=>({...f,mobile:e.target.value}))} /></Field>
          </FormRow>
          <FormRow cols={2}>
            <Field label="Delivery Date"><input type="date" value={form.delivery} onChange={e=>setForm(f=>({...f,delivery:e.target.value}))} /></Field>
            <div style={{display:"flex",alignItems:"center",gap:8,paddingTop:22}}><input type="checkbox" id="inst" checked={form.install} onChange={e=>setForm(f=>({...f,install:e.target.checked}))} style={{width:"auto"}} /><label htmlFor="inst" style={{textTransform:"none",letterSpacing:0}}>Installation Required</label></div>
          </FormRow>
          <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:10}}>Products</div>
          {form.products.map((p,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:10,marginBottom:8}}>
              <select value={p.name} onChange={e=>setForm(f=>({...f,products:f.products.map((pp,ii)=>ii===i?{...pp,name:e.target.value}:pp)}))}>{PRODUCTS.map(pr=><option key={pr}>{pr}</option>)}</select>
              <input placeholder="Size" value={p.size} onChange={e=>setForm(f=>({...f,products:f.products.map((pp,ii)=>ii===i?{...pp,size:e.target.value}:pp)}))} />
              <input type="number" placeholder="Qty" value={p.qty} onChange={e=>{ const q=Number(e.target.value);setForm(f=>({...f,products:f.products.map((pp,ii)=>ii===i?{...pp,qty:q,total:q*pp.unitPrice}:pp)})); }} />
              <input type="number" placeholder="Unit Price " value={p.unitPrice} onChange={e=>{ const up=Number(e.target.value);setForm(f=>({...f,products:f.products.map((pp,ii)=>ii===i?{...pp,unitPrice:up,total:up*pp.qty}:pp)})); }} />
            </div>
          ))}
          <button onClick={()=>setForm(f=>({...f,products:[...f.products,{name:PRODUCTS[0],size:"",qty:1,unitPrice:0,total:0}]}))} style={{background:"none",border:"none",color:T.teal,cursor:"pointer",fontSize:12,padding:"4px 0",fontFamily:"inherit"}}>+ Add Product Line</button>
          <FormRow cols={3} ><Field label="Discount ()"><input type="number" value={form.discount} onChange={e=>setForm(f=>({...f,discount:Number(e.target.value)}))} /></Field><Field label="Advance Paid ()"><input type="number" value={form.advance} onChange={e=>setForm(f=>({...f,advance:Number(e.target.value)}))} /></Field><Field label="Status"><select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>{["Pending","In Production"].map(s=><option key={s}>{s}</option>)}</select></Field></FormRow>
          <div style={{background:"rgba(245,158,11,.07)",border:"1px solid rgba(245,158,11,.2)",borderRadius:10,padding:"10px 14px",fontSize:12,color:T.sub}}>
            Subtotal: {inr(form.products.reduce((s,p)=>s+p.total,0))} | After Discount: {inr(form.products.reduce((s,p)=>s+p.total,0)-form.discount)} | Balance: {inr(form.products.reduce((s,p)=>s+p.total,0)-form.discount-form.advance)}
          </div>
          <div style={{display:"flex",gap:10,marginTop:20}}><PrimaryBtn onClick={save} disabled={saving}>{saving?"Processing...":"Save Order"}</PrimaryBtn><GhostBtn onClick={()=>setShowAdd(false)}>Cancel</GhostBtn></div>
        </Modal>
      )}
    </div>
  );
}


