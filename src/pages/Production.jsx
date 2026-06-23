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

export function Production({ workOrders, setWorkOrders, inventory, setInventory, orders, isManager }) {
  const [showAdd,setShowAdd]=useState(false);
  const [showBOM,setShowBOM]=useState(null);
  const [saving,setSaving]=useState(false);
  const blank={orderId:"",product:PRODUCTS[0],qty:1,staff:"",start:todayStr(),end:"",status:"Pending"};
  const [form,setForm]=useState(blank);

  const save=()=>{
    if(saving)return;
    if(!form.orderId)return alert("Order reference is required");
    if(workOrders.some(w=>w.orderId===form.orderId&&w.product===form.product&&w.status!=="Cancelled"))return alert("Production work order already exists for this order/product");
    if(onceKeyActive(`workorder:${form.orderId}:${form.product}`))return alert("Processing... duplicate work order blocked");
    setSaving(true);
    const id=`WO-${String(workOrders.length+1).padStart(3,"0")}`;
    setWorkOrders(ws=>[...ws,{...form,id,qty:Number(form.qty),bom:BOM_MAP[form.product]||[],createdAt:new Date().toISOString(),createdBy:"Management"}]);
    auditLog({event:"Created",source:"Production",recordType:"Work Order",recordId:id,orderId:form.orderId});
    setShowAdd(false); setSaving(false);
  };

  const complete=wo=>{
    const bomItems=BOM_MAP[wo.product]||[];
    for(const b of bomItems){ const item=inventory.rawMaterials.find(r=>r.id===b.id); if(item&&item.stock<b.qty*wo.qty)return alert(`Insufficient: ${item.name} needs ${b.qty*wo.qty} but only ${item.stock} available!`); }
    setInventory(inv=>({...inv,rawMaterials:inv.rawMaterials.map(r=>{ const b=bomItems.find(bb=>bb.id===r.id); return b?{...r,stock:r.stock-b.qty*wo.qty}:r; }),finishedGoods:inv.finishedGoods.map(fg=>fg.name.toLowerCase().includes(wo.product.toLowerCase().split(" ")[0].toLowerCase())?{...fg,qty:fg.qty+wo.qty}:fg)}));
    setWorkOrders(ws=>ws.map(w=>w.id===wo.id?{...w,status:"Completed"}:w));
    alert(`WO ${wo.id} completed! Raw materials deducted `);
  };

  const statusOrder=["Pending","In Progress","QC Check","Completed"];

  return (
    <div>
      <SectionTitle action={!isManager&&<PrimaryBtn onClick={()=>setShowAdd(true)}>+ New Work Order</PrimaryBtn>}>Production / Work Orders</SectionTitle>

      {/* BOM Quick Ref */}
      <GlassCard style={{marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:12}}> Bill of Materials  Quick Reference</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {PRODUCTS.map(p=>(
            <button key={p} onClick={()=>setShowBOM(p)} style={{padding:"6px 12px",background:"rgba(20,184,166,.1)",border:"1px solid rgba(20,184,166,.2)",borderRadius:8,color:T.teal,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}> {p.split(" ").slice(0,2).join(" ")}</button>
          ))}
        </div>
      </GlassCard>

      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {workOrders.map(wo=>{
          const order=orders.find(o=>o.id===wo.orderId);
          const over=wo.end&&wo.end<todayStr()&&wo.status!=="Completed";
          const bomItems=wo.bom||[];
          return (
            <GlassCard key={wo.id} style={{borderColor:over?"rgba(248,113,113,.3)":T.border}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,flexWrap:"wrap"}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6,flexWrap:"wrap"}}>
                    <span style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,color:T.teal,fontSize:15}}>{wo.id}</span>
                    <StatusPill s={wo.status} />
                    {over&&<Pill label="OVERDUE" color={T.red} />}
                    {wo.orderId&&<span style={{fontSize:11,color:T.muted}}> {wo.orderId}{order?` (${order.customer})`:""}</span>}
                  </div>
                  <div style={{fontWeight:600,fontSize:15,color:T.text,marginBottom:4}}>{wo.product} <span style={{color:T.amber}}>{wo.qty} units</span></div>
                  <div style={{fontSize:12,color:T.muted}}> {wo.staff||"Unassigned"} | Start: {wo.start} | Due: {wo.end||""}</div>
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                  {!isManager&&<>
                    <select value={wo.status} onChange={e=>setWorkOrders(ws=>ws.map(w=>w.id===wo.id?{...w,status:e.target.value}:w))} style={{padding:"6px 10px",borderRadius:9,fontSize:12,width:"auto"}}>
                      {statusOrder.map(s=><option key={s}>{s}</option>)}
                    </select>
                    {wo.status!=="Completed"&&<SuccessBtn small onClick={()=>complete(wo)}> Complete</SuccessBtn>}
                  </>}
                </div>
              </div>
              {bomItems.length>0&&(
                <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${T.border}`}}>
                  <div style={{fontSize:11,color:T.muted,marginBottom:8,fontWeight:600,textTransform:"uppercase",letterSpacing:.4}}>Materials Required</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {bomItems.map((b,i)=>{
                      const item=inventory.rawMaterials.find(r=>r.id===b.id);
                      const needed=b.qty*wo.qty;
                      const ok=item&&item.stock>=needed;
                      return <span key={i} style={{padding:"4px 10px",borderRadius:6,fontSize:11,background:ok?"rgba(34,197,94,.1)":"rgba(248,113,113,.1)",border:`1px solid ${ok?"rgba(34,197,94,.2)":"rgba(248,113,113,.2)"}`,color:ok?T.green:T.red}}>{item?.name||`Item ${b.id}`}: {needed}{b.u} {ok?"":""}</span>;
                    })}
                  </div>
                </div>
              )}
            </GlassCard>
          );
        })}
        {workOrders.length===0&&<div style={{textAlign:"center",padding:60,color:T.muted}}>No work orders yet</div>}
      </div>

      {showBOM&&(
        <Modal title={`BOM - ${showBOM}`} onClose={()=>setShowBOM(null)}>
          <p style={{fontSize:13,color:T.muted,marginBottom:16}}>Raw materials per unit of <b style={{color:T.text}}>{showBOM}</b>:</p>
          {(BOM_MAP[showBOM]||[]).map((b,i)=>{ const item=inventory.rawMaterials.find(r=>r.id===b.id); return (
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${T.border}`,fontSize:13}}>
              <span style={{color:T.sub}}>{item?.name||`Item ${b.id}`}</span>
              <span style={{fontWeight:600,color:T.amber}}>{b.qty} {b.u}</span>
            </div>
          );})}
          {(!BOM_MAP[showBOM]||BOM_MAP[showBOM].length===0)&&<div style={{color:T.muted,fontSize:13}}>No BOM defined.</div>}
        </Modal>
      )}

      {showAdd&&(
        <Modal title="New Work Order" onClose={()=>setShowAdd(false)}>
          <Field label="Linked Order ID"><input value={form.orderId} onChange={e=>setForm(f=>({...f,orderId:e.target.value}))} placeholder="ORD-XXX" /></Field>
          <div style={{marginTop:12}}><Field label="Product"><select value={form.product} onChange={e=>setForm(f=>({...f,product:e.target.value}))}>{PRODUCTS.map(p=><option key={p}>{p}</option>)}</select></Field></div>
          <FormRow cols={2} ><Field label="Quantity"><input type="number" value={form.qty} onChange={e=>setForm(f=>({...f,qty:e.target.value}))} /></Field><Field label="Assigned Staff"><input value={form.staff} onChange={e=>setForm(f=>({...f,staff:e.target.value}))} placeholder="Staff name(s)" /></Field></FormRow>
          <FormRow cols={2}><Field label="Start Date"><input type="date" value={form.start} onChange={e=>setForm(f=>({...f,start:e.target.value}))} /></Field><Field label="Expected End"><input type="date" value={form.end} onChange={e=>setForm(f=>({...f,end:e.target.value}))} /></Field></FormRow>
          <div style={{display:"flex",gap:10,marginTop:20}}><PrimaryBtn onClick={save} disabled={saving}>{saving?"Processing...":"Create Work Order"}</PrimaryBtn><GhostBtn onClick={()=>setShowAdd(false)}>Cancel</GhostBtn></div>
        </Modal>
      )}
    </div>
  );
}



export function ProductionBoard({ orders, setOrders, partners, setPartners, smartInventory, setSmartInventory, canManageApproval=true, canManageInstallation=true }) {
  const [view,setView]=useState("mesh");
  const [bucket,setBucket]=useState("ongoing");
  const [selectedOngoing,setSelectedOngoing]=useState([]);
  const [selectedCompleted,setSelectedCompleted]=useState([]);
  const [installOrder,setInstallOrder]=useState(null);
  const [installDate,setInstallDate]=useState("");
  const [materialPreview,setMaterialPreview]=useState(null);
  const stages=["Approval","Cutting","Assembling","Quality Check","Completed"];
  const stageRank=stage=>Math.max(0,stages.indexOf(stageMap(stage)));
  const stageMap=stage=>{
    if(stage==="Order Done")return "Cutting";
    if(stage==="Assembly")return "Assembling";
    if(stage==="Quality Check & Finishing")return "Quality Check";
    if(stage==="Packing & Dispatch"||stage==="Installation Pending")return "Completed";
    return stages.includes(stage)?stage:"Approval";
  };
  const productMatches=(name,type)=>{
    const n=(name||"").toLowerCase();
    return type==="mesh"?n.includes("mesh"):n.includes("blind");
  };
  const productTypeMatches=(product,type)=>{
    const t=(product.type||"").toLowerCase();
    if(t)return type==="mesh"?t.includes("mesh"):t.includes("blind");
    return productMatches(product.name,type);
  };
  const allJobs=orders.filter(order=>!order.productionArchived).flatMap(order=>(order.products||[]).map((product,idx)=>{
    const jobId=`${order.id}-${idx}`;
    const itemState=order.itemStates?.[jobId]||{};
    return {
    id:jobId,
    orderId:order.id,
    customer:order.customer,
    product:product.name,
    productType:product.type,
    size:product.size,
    heightFt:product.heightFt,
    widthFt:product.widthFt,
    sqft:product.sqft,
    actualSqft:product.actualSqft,
    chargeableSqft:product.chargeableSqft,
    billingSqft:product.billingSqft,
    color:product.color,
    material:product.material,
    code:product.code,
    window:product.window,
    qty:product.qty,
    inventoryConsumption:order.inventoryConsumptions?.[`${order.id}-${idx}`],
    delivery:order.delivery,
    installationDate:order.installationDate,
    completedAt:order.completedAt,
    completedDate:order.completedDate,
    orderStatus:order.status,
    orderStage:order.productionStage,
    itemStage:itemState.stage,
    approval:itemState.approval||order.approval||"Approved",
    hold:itemState.hold??false,
    type:productTypeMatches(product,"mesh")?"mesh":"blind",
  };
  })).filter(job=>job.type===view);
  const syncPartnerOrder=(orderId,patch)=>{
    setPartners?.(ps=>ps.map(p=>({
      ...p,
      requests:(p.requests||[]).map(r=>r.orderId===orderId?{...r,...patch}:r)
    })));
  };
  const initialStageForJob=job=>{
    if(job.itemStage)return job.itemStage;
    if(job.orderStage)return job.orderStage;
    if(job.orderStatus==="Completed"||job.orderStatus==="Installed"||job.orderStatus==="Closed")return "Completed";
    if(job.orderStatus==="Installation Pending")return "Completed";
    if(job.approval==="Pending")return "Approval";
    return "Cutting";
  };
  const [stageByJob,setStageByJob]=useState({});
  const jobs=allJobs.map(job=>({...job,stage:stageMap(stageByJob[job.id]||initialStageForJob(job)),hold:!!job.hold}));
  const isInstallationCompletedJob=job=>job.itemStage==="Installation Completed"||job.orderStage==="Installation Completed";
  const isCompletedJob=job=>job.stage==="Completed"&&!isInstallationCompletedJob(job);
  const ongoingJobs=jobs.filter(job=>!isCompletedJob(job)&&!isInstallationCompletedJob(job));
  const completedJobs=jobs.filter(isCompletedJob);
  const installationCompletedJobs=jobs.filter(isInstallationCompletedJob);
  const moveJob=(id,stage)=>setStageByJob(map=>({...map,[id]:stage}));
  const updateItemState=(job,patch)=>{
    setOrders?.(os=>os.map(o=>{
      if(o.id!==job.orderId)return o;
      const itemStates={...(o.itemStates||{})};
      const current=itemStates[job.id]||{};
      itemStates[job.id]={...current,...patch,updatedAt:new Date().toISOString()};
      const productIds=(o.products||[]).map((_,idx)=>`${o.id}-${idx}`);
      const allCompleted=productIds.length>0&&productIds.every(id=>stageMap(itemStates[id]?.stage||o.productionStage||"Approval")==="Completed");
      const anyHold=productIds.some(id=>itemStates[id]?.hold);
      const status=anyHold?"On Hold":allCompleted?"Completed":(patch.status==="Approval Pending"?"Approval Pending":"In Production");
      return {...o,itemStates,status,productionStage:allCompleted?"Completed":o.productionStage};
    }));
  };
  const markJobsInstallationCompleted=(selectedJobs)=>{
    const stamp=new Date().toISOString();
    const date=todayStr();
    const selectedByOrder=selectedJobs.reduce((map,job)=>{
      if(!map[job.orderId])map[job.orderId]=new Set();
      map[job.orderId].add(job.id);
      return map;
    },{});
    setOrders?.(os=>os.map(o=>{
      const selectedIds=selectedByOrder[o.id];
      if(!selectedIds)return o;
      const itemStates={...(o.itemStates||{})};
      selectedIds.forEach(id=>{
        itemStates[id]={...(itemStates[id]||{}),stage:"Installation Completed",status:"Installed",installationCompletedDate:date,installationCompletedAt:stamp,updatedAt:stamp};
      });
      const productIds=(o.products||[]).map((_,idx)=>`${o.id}-${idx}`);
      const allInstalled=productIds.length>0&&productIds.every(id=>itemStates[id]?.stage==="Installation Completed");
      return {
        ...o,
        itemStates,
        ...(allInstalled?{status:"Installed",productionStage:"Installation Completed",installationCompletedDate:date,installationCompletedAt:stamp}:{})
      };
    }));
    selectedJobs.forEach(job=>syncPartnerOrder(job.orderId,{status:"Installed",stage:"Installation Completed",trackStatus:"Installation Completed",installationCompletedDate:date,installationCompletedAt:stamp}));
  };
  const setOrderStage=(job,stage,extra={})=>{
    const nextStatus=stage==="Completed"?"Completed":stage==="Approval"?"Approval Pending":"In Production";
    updateItemState(job,{stage,status:nextStatus,...extra});
    syncPartnerOrder(job.orderId,{stage,status:nextStatus,trackStatus:productionTrackLabel(stage,nextStatus,extra.installationDate||job.installationDate),...extra});
    moveJob(job.id,stage);
  };
  const approveJob=job=>{
    if(!job.inventoryConsumption){
      const preview=buildMaterialPreview(job);
      if(preview?.kind==="mesh"&&preview.ok)applyConsumption(preview,false);
    }
    updateItemState(job,{approval:"Approved",stage:"Cutting",status:"In Production",hold:false});
    syncPartnerOrder(job.orderId,{approval:"Approved",stage:"Cutting",status:"In Production",trackStatus:"Cutting"});
    moveJob(job.id,"Cutting");
  };
  const toggleHold=job=>{
    if(!canManageApproval)return alert("Hold can be managed by Management only.");
    if(job.approval==="Pending")return;
    const next=!job.hold;
    const status=next?"On Hold":"In Production";
    updateItemState(job,{hold:next,status});
    syncPartnerOrder(job.orderId,{hold:next,status,trackStatus:next?"On Hold":productionTrackLabel(job.stage,"In Production",job.installationDate)});
  };
  const moveStage=job=>stage=>{
    if(stage==="Approval"){
      if(!canManageApproval)return alert("Approval and Hold can be managed by Management only.");
      return job.approval==="Pending"?approveJob(job):null;
    }
    if(job.approval==="Pending")return alert("Management approval is required before production can start.");
    if(job.hold)return alert("This production order is on Hold. Turn Hold off to continue.");
    if(stageRank(stage)<=stageRank(job.stage))return alert("Production can move forward only. Previous stages cannot be selected.");
    if(stage==="Cutting"&&!job.inventoryConsumption){
      const preview=buildMaterialPreview(job);
      if(preview?.kind==="mesh"&&preview.ok)applyConsumption(preview,false);
    }
    return setOrderStage(job,stage);
  };
  const openInstallDate=job=>{
    if(!canManageInstallation)return alert("Installation date can be managed by Management only.");
    setInstallOrder(job);
    setInstallDate(job.installationDate||todayStr());
  };
  const saveInstallDate=()=>{
    if(!installOrder||!installDate)return alert("Please select installation date");
    setOrderStage(installOrder,"Installation Pending",{installationDate:installDate});
    setInstallOrder(null);
  };
  const completeInstallation=job=>{
    if(!canManageInstallation)return alert("Installation completion can be managed by Management only.");
    if(!confirm("Move this order to Installation Completed bucket?"))return;
    markJobsInstallationCompleted([job]);
    setBucket("installationCompleted");
  };
  const toggleOngoingSelection=job=>{
    setSelectedOngoing(ids=>ids.includes(job.id)?ids.filter(id=>id!==job.id):[...ids,job.id]);
  };
  const moveOngoingToCompleted=()=>{
    const selectedJobs=ongoingJobs.filter(job=>selectedOngoing.includes(job.id));
    const selectedOrders=[...new Set(selectedJobs.map(job=>job.orderId))];
    if(!selectedOrders.length)return alert("Select ongoing production orders to move to completed");
    if(!confirm("Move selected ongoing orders to Completed?"))return;
    setOrders?.(os=>os.map(o=>selectedOrders.includes(o.id)?{...o,productionStage:"Completed",status:"Completed",completedDate:todayStr(),completedAt:new Date().toISOString()}:o));
    selectedOrders.forEach(orderId=>syncPartnerOrder(orderId,{status:"Completed",stage:"Completed",trackStatus:"Completed",completedDate:todayStr(),completedAt:new Date().toISOString()}));
    setSelectedOngoing([]);
    setBucket("completed");
  };
  const toggleCompletedSelection=job=>{
    setSelectedCompleted(ids=>ids.includes(job.id)?ids.filter(id=>id!==job.id):[...ids,job.id]);
  };
  const moveCompletedOut=()=>{
    if(!canManageInstallation)return alert("Installation completion can be managed by Management only.");
    const selectedJobs=completedJobs.filter(job=>selectedCompleted.includes(job.id));
    if(!selectedJobs.length)return alert("Select completed production orders to move to Installation Completed");
    if(!confirm("Move selected completed orders to Installation Completed?"))return;
    markJobsInstallationCompleted(selectedJobs);
    setSelectedCompleted([]);
    setBucket("installationCompleted");
  };
  const stageColor={
    "Approval":T.green,
    "Order Done":T.blue,
    "Cutting":T.orange,
    "Assembling":T.purple,
    "Assembly":T.purple,
    "Quality Check":T.teal,
    "Quality Check & Finishing":T.teal,
    "Packing & Dispatch":T.green,
    "Installation Pending":T.purple,
    "Completed":T.green,
  };
  const requirementFt=job=>{
    const h=Number(job.heightFt||0);
    const w=Number(job.widthFt||0);
    const q=Number(job.qty||1);
    if(h>0&&w>0)return round2((h+w)*2*q);
    const sq=Number(job.sqft||String(job.size||"").replace(/[^0-9.]/g,"")||0);
    return round2(sq>0?Math.sqrt(sq)*4*q:12*q);
  };
  const mergeCutPieces=lengths=>{
    const map={};
    (lengths||[]).forEach(l=>{
      const size=round2(ftFromSize(l.size));
      if(size>0)map[size]=(map[size]||0)+Number(l.qty||0);
    });
    return Object.entries(map).map(([size,qty])=>({size:fmtFt(size),qty})).filter(l=>l.qty>0).sort((a,b)=>ftFromSize(a.size)-ftFromSize(b.size));
  };
  const pickMeshMaterial=job=>{
    const list=smartInventory?.meshComponents||[];
    const text=`${job.color||""} ${job.material||""} ${job.product||""}`.toLowerCase();
    const profile=list.filter(i=>(i.item||"").toLowerCase().includes("aluminium profile"));
    return profile.find(i=>text.includes("white")&&(i.item||"").toLowerCase().includes("white"))
      || profile.find(i=>text.includes("brown")&&(i.item||"").toLowerCase().includes("brown"))
      || profile.find(i=>text.includes("black")&&(i.item||"").toLowerCase().includes("black"))
      || profile[0]
      || list[0];
  };
  const buildMaterialPreview=job=>{
    if(job.type!=="mesh")return {job,kind:"blind",message:"Blind production is tracked in inventory; automatic fabric-roll cutting rules are pending setup.",requiredFt:0,ok:true,materialName:job.material,code:job.code};
    const material=pickMeshMaterial(job);
    if(!material)return {job,kind:"mesh",ok:false,message:"No mesh material found in inventory."};
    let remaining=requirementFt(job);
    const originalRequired=remaining;
    const cutUses=[];
    const cutRemainders=[];
    const availableCuts=(material.lengths||[]).flatMap(l=>Array.from({length:Number(l.qty||0)},()=>ftFromSize(l.size))).filter(n=>n>0).sort((a,b)=>b-a);
    while(remaining>0.05){
      const fit=availableCuts.findIndex(n=>n<=remaining+0.05);
      if(fit<0)break;
      const size=availableCuts.splice(fit,1)[0];
      cutUses.push(size);
      remaining=round2(remaining-size);
    }
    if(remaining>0.05){
      const largerIndex=availableCuts.findLastIndex(n=>n>remaining+0.05);
      if(largerIndex>=0){
        const size=availableCuts.splice(largerIndex,1)[0];
        cutUses.push(size);
        const leftover=round2(size-remaining);
        if(leftover>=2)cutRemainders.push(leftover);
        remaining=0;
      }
    }
    const fullLength=Number(material.fullLengthFt||12);
    const fullUsed=remaining>0.05?Math.ceil(remaining/fullLength):0;
    const fullNeededFt=round2(fullUsed*fullLength);
    const leftoverFt=round2(Math.max(fullNeededFt-remaining,0));
    const reusableCutFt=leftoverFt>=2?leftoverFt:0;
    const wasteFt=leftoverFt>0&&leftoverFt<2?leftoverFt:0;
    const ok=Number(material.full||0)>=fullUsed;
    const cutGrouped=mergeCutPieces(cutUses.map(size=>({size:fmtFt(size),qty:1})));
    const afterFull=Number(material.full||0)-fullUsed;
    const cutRemainderGrouped=mergeCutPieces(cutRemainders.map(size=>({size:fmtFt(size),qty:1})));
    const afterCuts=mergeCutPieces([...(material.lengths||[]),...cutGrouped.map(l=>({size:l.size,qty:-l.qty})),...cutRemainderGrouped,...(reusableCutFt?[{size:fmtFt(reusableCutFt),qty:1}]:[])]);
    return {job,kind:"mesh",ok,materialId:material.id,materialName:material.item,code:job.code||material.code,requiredFt:round2(originalRequired),cutGrouped,cutRemainders:cutRemainderGrouped,fullUsed,fullLength,leftoverFt,reusableCutFt,wasteFt,afterFull,afterCuts,message:ok?"Ready to consume inventory":"Insufficient full-length stock for this order."};
  };
  const openMaterialPreview=job=>setMaterialPreview(buildMaterialPreview(job));
  const updateOrderConsumption=(job,consumption,remove=false)=>{
    setOrders?.(os=>os.map(o=>{
      if(o.id!==job.orderId)return o;
      const inventoryConsumptions={...(o.inventoryConsumptions||{})};
      if(remove)delete inventoryConsumptions[job.id]; else inventoryConsumptions[job.id]=consumption;
      return {...o,inventoryConsumptions};
    }));
  };
  const applyConsumption=(preview,closeModal=true)=>{
    if(!preview?.ok)return alert(preview?.message||"Inventory cannot be consumed");
    if(preview.kind!=="mesh"){ if(closeModal)setMaterialPreview(null); return; }
    setSmartInventory?.(si=>{
      const next={...si};
      let remainingFull=0;
      next.meshComponents=(si.meshComponents||[]).map(item=>{
        if(item.id!==preview.materialId)return item;
        let lengths=mergeCutPieces(item.lengths||[]);
        preview.cutGrouped.forEach(use=>{
          let left=Number(use.qty||0);
          lengths=lengths.map(l=>{
            if(ftFromSize(l.size)!==ftFromSize(use.size)||left<=0)return l;
            const take=Math.min(Number(l.qty||0),left);
            left-=take;
            return {...l,qty:Number(l.qty||0)-take};
          }).filter(l=>Number(l.qty||0)>0);
        });
        if(preview.cutRemainders?.length)lengths=mergeCutPieces([...lengths,...preview.cutRemainders]);
        if(preview.reusableCutFt)lengths=mergeCutPieces([...lengths,{size:fmtFt(preview.reusableCutFt),qty:1}]);
        remainingFull=Number(item.full||0)-Number(preview.fullUsed||0);
        return {...item,full:remainingFull,lengths,cut:lengths.reduce((s,l)=>s+Number(l.qty||0),0)};
      });
      next.movements=[{
        id:Date.now(),
        kind:"mesh",
        date:todayStr(),
        orderId:preview.job.orderId,
        material:preview.materialName,
        usedFt:preview.requiredFt,
        cutUsed:preview.cutGrouped,
        cutRemainders:preview.cutRemainders,
        fullUsed:preview.fullUsed,
        fullLength:preview.fullLength,
        remainingFull,
        reusableCutFt:preview.reusableCutFt,
        wasteFt:preview.wasteFt,
        text:`${preview.materialName} consumed for ${preview.job.orderId}: ${fmtFt(preview.requiredFt)} used`
      },...(si.movements||[])].slice(0,20);
      return next;
    });
    updateOrderConsumption(preview.job,{...preview,consumedAt:new Date().toISOString()});
    if(closeModal)setMaterialPreview(null);
  };
  const confirmConsumption=preview=>applyConsumption(preview,true);
  const restoreConsumption=job=>{
    const c=job.inventoryConsumption;
    if(!c||!confirm("Restore consumed inventory for this production order?"))return;
    setSmartInventory?.(si=>{
      const next={...si};
      next.meshComponents=(si.meshComponents||[]).map(item=>{
        if(item.id!==c.materialId)return item;
        let lengths=mergeCutPieces([...(item.lengths||[]),...(c.cutGrouped||[])]);
        (c.cutRemainders||[]).forEach(rem=>{
          let removed=Number(rem.qty||0);
          lengths=lengths.map(l=>{
            if(ftFromSize(l.size)!==ftFromSize(rem.size)||removed<=0)return l;
            const take=Math.min(Number(l.qty||0),removed);
            removed-=take;
            return {...l,qty:Number(l.qty||0)-take};
          }).filter(l=>Number(l.qty||0)>0);
        });
        if(Number(c.reusableCutFt||0)>0){
          let removed=false;
          lengths=lengths.map(l=>{
            if(!removed&&ftFromSize(l.size)===ftFromSize(fmtFt(c.reusableCutFt))){
              removed=true;
              return {...l,qty:Number(l.qty||0)-1};
            }
            return l;
          }).filter(l=>Number(l.qty||0)>0);
        }
        return {...item,full:Number(item.full||0)+Number(c.fullUsed||0),lengths,cut:lengths.reduce((s,l)=>s+Number(l.qty||0),0)};
      });
      next.movements=[{id:Date.now(),kind:"mesh",date:todayStr(),text:`Restored inventory for ${job.orderId}`},...(si.movements||[])].slice(0,20);
      return next;
    });
    updateOrderConsumption(job,null,true);
  };

  return (
    <div>
      <SectionTitle>Production</SectionTitle>
      <div style={{display:"flex",gap:10,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",marginBottom:18}}>
        <div style={{display:"inline-flex",gap:4,padding:4,border:`1px solid ${T.border}`,borderRadius:8,background:T.card}}>
          {[["ongoing","Ongoing"],["completed","Completed"],["installationCompleted","Installation Completed"]].map(([id,label])=>(
            <button key={id} onClick={()=>setBucket(id)} style={{border:0,borderRadius:6,padding:"9px 16px",fontSize:12,fontWeight:700,cursor:"pointer",background:bucket===id?T.green:"transparent",color:bucket===id?"#fff":T.sub}}>
              {label}
            </button>
          ))}
        </div>
        <div style={{display:"inline-flex",gap:4,padding:4,border:`1px solid ${T.border}`,borderRadius:8,background:T.card}}>
          {[["mesh","Mesh"],["blind","Blind"]].map(([id,label])=>(
            <button key={id} onClick={()=>setView(id)} style={{border:0,borderRadius:6,padding:"9px 16px",fontSize:12,fontWeight:700,cursor:"pointer",background:view===id?T.blue:"transparent",color:view===id?"#fff":T.sub}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {bucket==="ongoing"&&<GlassCard style={{padding:0,overflow:"hidden"}}>
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
          <div><b style={{color:T.text}}>Ongoing Production</b><div style={{fontSize:12,color:T.muted,marginTop:3}}>Select orders here and move them to Completed when production is done.</div></div>
          {canManageApproval&&<PrimaryBtn small color={T.green} onClick={moveOngoingToCompleted}>Move Selected To Completed</PrimaryBtn>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:`72px 1.2fr repeat(${stages.length},minmax(120px,1fr))`,borderBottom:`1px solid ${T.border}`,background:T.cardHi}}>
          <div style={{padding:"12px 14px",fontSize:12,fontWeight:700,color:T.sub}}>{canManageApproval?"Select":"Update"}</div>
          <div style={{padding:"12px 14px",fontSize:12,fontWeight:700,color:T.sub}}>Order</div>
          {stages.map(stage=><div key={stage} style={{padding:"12px 10px",fontSize:12,fontWeight:700,color:stageColor[stage],borderLeft:`1px solid ${T.border}`}}>{stage}</div>)}
        </div>
        {ongoingJobs.map(job=>(
          <div key={job.id} style={{display:"grid",gridTemplateColumns:`72px 1.2fr repeat(${stages.length},minmax(120px,1fr))`,borderBottom:`1px solid ${T.border}`}}>
            <div style={{padding:14,display:"flex",alignItems:"center",justifyContent:"center"}}>
              {canManageApproval?<input type="checkbox" checked={selectedOngoing.includes(job.id)} onChange={()=>toggleOngoingSelection(job)} />:<span style={{fontSize:12,color:T.muted}}>Stage</span>}
            </div>
            <div style={{padding:14}}>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,color:T.text,fontSize:14}}>{job.orderId}</div>
              <div style={{fontSize:12,color:T.sub,marginTop:3}}>{job.customer}</div>
              <div style={{fontSize:12,color:T.muted,marginTop:3}}>{job.product} | {job.size} | Qty {job.qty}</div>
              <div style={{fontSize:11,color:T.muted,marginTop:5}}>Dispatch target: {job.delivery||"Not set"}</div>
              <div style={{fontSize:11,color:T.muted,marginTop:3}}>Installation: {job.installationDate||"Not set"}</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>
                <GhostBtn small onClick={()=>openMaterialPreview(job)}>{job.inventoryConsumption?"View Materials":"Preview Materials"}</GhostBtn>
                {canManageApproval&&job.inventoryConsumption&&<DangerBtn small onClick={()=>restoreConsumption(job)}>Restore Stock</DangerBtn>}
              </div>
            </div>
            {stages.map(stage=>{
              const pendingApproval=stage==="Approval"&&job.approval==="Pending";
              const approvalDone=stage==="Approval"&&job.approval!=="Pending";
              const holdOn=stage==="Approval"&&approvalDone&&job.hold;
              const approvalColor=holdOn?T.red:(approvalDone?T.green:T.red);
              const active=job.stage===stage;
              const color=stage==="Approval"?approvalColor:stageColor[stage];
              const done=stageRank(job.stage)>stageRank(stage);
              const blocked=job.hold&&stage!=="Approval";
              return (
                <button key={stage} disabled={stage==="Approval"&&!canManageApproval} onClick={()=>stage==="Approval"?(approvalDone?toggleHold(job):approveJob(job)):moveStage(job)(stage)} style={{minHeight:92,border:0,borderLeft:`1px solid ${T.border}`,background:active||approvalDone||done?`${color}12`:"transparent",cursor:(blocked||stage==="Approval"&&!canManageApproval)?"not-allowed":"pointer",padding:10,textAlign:"left",opacity:(blocked||stage==="Approval"&&!canManageApproval)?0.72:1}}>
                  <div style={{width:16,height:16,borderRadius:"50%",border:`2px solid ${color}`,background:active||approvalDone||done?color:"#fff",marginBottom:8}} />
                  <div style={{fontSize:11,fontWeight:700,color:active||approvalDone||done?color:T.muted}}>{stage==="Approval"?(approvalDone?(canManageApproval?(holdOn?"Hold ON":"Hold OFF"):"Approval Done"):pendingApproval?(canManageApproval?"Approve":"Approval Pending"):"Approval"):done?"Done":active?"Current Stage":"Move Forward"}</div>
                  {stage==="Completed"&&active&&<div onClick={e=>e.stopPropagation()} style={{display:"grid",gap:6,marginTop:8}}>
                    {canManageInstallation&&<SuccessBtn small onClick={()=>completeInstallation(job)}>Move Completed</SuccessBtn>}
                  </div>}
                </button>
              );
            })}
          </div>
        ))}
        {ongoingJobs.length===0&&<div style={{padding:50,textAlign:"center",color:T.muted,fontSize:13}}>No ongoing {view==="mesh"?"mesh":"blind"} production orders available.</div>}
      </GlassCard>}
      {bucket==="completed"&&<GlassCard style={{padding:0}}>
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
          <div><b style={{color:T.text}}>Completed</b><div style={{fontSize:12,color:T.muted,marginTop:3}}>Select completed production orders and move them after installation is completed.</div></div>
          {canManageInstallation&&<PrimaryBtn small color={T.green} onClick={moveCompletedOut}>Move To Installation Completed</PrimaryBtn>}
        </div>
        <Table headers={["Select","Order","Customer","Product","Size","Installation","Completed"]}>
          {completedJobs.map(job=>(
            <TR key={`done-${job.id}`}>
              <TD>{canManageInstallation?<input type="checkbox" checked={selectedCompleted.includes(job.id)} onChange={()=>toggleCompletedSelection(job)} />:<span style={{fontSize:12,color:T.muted}}>Locked</span>}</TD>
              <TD mono>{job.orderId}</TD>
              <TD bold>{job.customer}</TD>
              <TD>{job.product}</TD>
              <TD>{job.size}</TD>
              <TD>{job.installationDate||"Not set"}</TD>
              <TD><Pill label="Completed" color={T.green} /></TD>
            </TR>
          ))}
        </Table>
        {completedJobs.length===0&&<div style={{padding:32,textAlign:"center",fontSize:13,color:T.muted}}>No completed {view==="mesh"?"mesh":"blind"} production orders.</div>}
      </GlassCard>}
      {bucket==="installationCompleted"&&<GlassCard style={{padding:0}}>
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${T.border}`}}>
          <div><b style={{color:T.text}}>Installation Completed</b><div style={{fontSize:12,color:T.muted,marginTop:3}}>Orders where production and installation are both completed.</div></div>
        </div>
        <Table headers={["Order","Customer","Product","Size","Installation Date","Completed Date","Status"]}>
          {installationCompletedJobs.map(job=>(
            <TR key={`installed-${job.id}`}>
              <TD mono>{job.orderId}</TD>
              <TD bold>{job.customer}</TD>
              <TD>{job.product}</TD>
              <TD>{job.size}</TD>
              <TD>{job.installationDate||"Not set"}</TD>
              <TD>{job.completedDate||job.installationCompletedDate||todayStr()}</TD>
              <TD><Pill label="Installation Completed" color={T.green} /></TD>
            </TR>
          ))}
        </Table>
        {installationCompletedJobs.length===0&&<div style={{padding:32,textAlign:"center",fontSize:13,color:T.muted}}>No installation completed {view==="mesh"?"mesh":"blind"} orders.</div>}
      </GlassCard>}
      {installOrder&&<Modal title={`Set Installation Date - ${installOrder.orderId}`} onClose={()=>setInstallOrder(null)}>
        <div style={{background:T.cardHi,border:`1px solid ${T.border}`,borderRadius:8,padding:12,marginBottom:14,fontSize:13,color:T.sub}}>
          <b style={{color:T.text}}>{installOrder.customer}</b> | {installOrder.product} | {installOrder.size}
        </div>
        <Field label="Installation Date"><input type="date" value={installDate} onChange={e=>setInstallDate(e.target.value)} /></Field>
        <div style={{display:"flex",gap:10,marginTop:18}}><PrimaryBtn onClick={saveInstallDate}>Save Date</PrimaryBtn><GhostBtn onClick={()=>setInstallOrder(null)}>Cancel</GhostBtn></div>
      </Modal>}
      {materialPreview&&<Modal title={`Material Consumption Preview - ${materialPreview.job.orderId}`} onClose={()=>setMaterialPreview(null)} wide>
        <div style={{background:T.cardHi,border:`1px solid ${T.border}`,borderRadius:8,padding:12,marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:800,color:T.muted,marginBottom:8}}>Order Material Details From Management Approved Quotation</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,fontSize:13}}>
            <div><b style={{color:T.text}}>Window:</b> {materialPreview.job.window||materialPreview.job.id}</div>
            <div><b style={{color:T.text}}>Color:</b> {materialPreview.job.color||"-"}</div>
            <div><b style={{color:T.text}}>Material:</b> {materialPreview.job.material||materialPreview.materialName||"-"}</div>
            <div><b style={{color:T.text}}>Password Code:</b> <Code>{materialPreview.job.code||materialPreview.code||"-"}</Code></div>
            <div><b style={{color:T.text}}>Actual SQFT:</b> {materialPreview.job.actualSqft||materialPreview.job.sqft||0}</div>
            <div><b style={{color:T.text}}>Billing SQFT:</b> {materialPreview.job.billingSqft||materialPreview.job.chargeableSqft||materialPreview.job.sqft||0}</div>
          </div>
        </div>
        {materialPreview.kind==="mesh"?<>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:14}}>
            <div style={{background:T.cardHi,border:`1px solid ${T.border}`,borderRadius:8,padding:12}}><div style={{fontSize:11,fontWeight:800,color:T.muted}}>Requirement</div><div style={{fontSize:22,fontWeight:900,color:T.text}}>{fmtFt(materialPreview.requiredFt)}</div></div>
            <div style={{background:T.cardHi,border:`1px solid ${T.border}`,borderRadius:8,padding:12}}><div style={{fontSize:11,fontWeight:800,color:T.muted}}>Material</div><div style={{fontSize:16,fontWeight:900,color:T.blue}}>{materialPreview.materialName}</div></div>
            <div style={{background:T.cardHi,border:`1px solid ${T.border}`,borderRadius:8,padding:12}}><div style={{fontSize:11,fontWeight:800,color:T.muted}}>Status</div><div style={{fontSize:16,fontWeight:900,color:materialPreview.ok?T.green:T.red}}>{materialPreview.message}</div></div>
          </div>
          <Table headers={["Suggested Consumption","Quantity","After Production"]}>
            <TR><TD bold>Cut Pieces</TD><TD>{materialPreview.cutGrouped.length?materialPreview.cutGrouped.map(l=>`${l.size} x ${l.qty}`).join(", "):"No suitable cut piece"}</TD><TD>{materialPreview.afterCuts?.length?materialPreview.afterCuts.map(l=>`${l.size}:${l.qty}`).join(", "):"No cut pieces left"}</TD></TR>
            <TR><TD bold>Full Lengths</TD><TD>{materialPreview.fullUsed} full length(s) of {materialPreview.fullLength} ft</TD><TD>{materialPreview.afterFull} full length(s) remaining</TD></TR>
            <TR><TD bold>Cut Piece Leftover Saved</TD><TD>{materialPreview.cutRemainders?.length?materialPreview.cutRemainders.map(l=>`${l.size} x ${l.qty}`).join(", "):"None"}</TD><TD>{materialPreview.cutRemainders?.length?"Saved back into Cut Piece Inventory":"No larger cut piece trimmed"}</TD></TR>
            <TR><TD bold>Reusable Cut Added</TD><TD>{materialPreview.reusableCutFt?fmtFt(materialPreview.reusableCutFt):"None"}</TD><TD>{materialPreview.reusableCutFt?"Saved into Cut Piece Inventory":"Below reusable size"}</TD></TR>
            <TR><TD bold>Waste / Scrap</TD><TD>{materialPreview.wasteFt?fmtFt(materialPreview.wasteFt):"No waste"}</TD><TD>Leftover below 2 ft is treated as scrap</TD></TR>
          </Table>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:18}}>
            <GhostBtn onClick={()=>setMaterialPreview(null)}>Close</GhostBtn>
            {canManageApproval&&!materialPreview.job.inventoryConsumption&&<SuccessBtn onClick={()=>confirmConsumption(materialPreview)}>Confirm And Consume Stock</SuccessBtn>}
          </div>
        </>:<div style={{fontSize:13,color:T.sub,display:"grid",gap:8}}><div>{materialPreview.message}</div><div><b style={{color:T.text}}>Fabric / Roll:</b> {materialPreview.job.material||materialPreview.materialName||"-"} | <b style={{color:T.text}}>Code:</b> <Code>{materialPreview.job.code||materialPreview.code||"-"}</Code></div></div>}
      </Modal>}
    </div>
  );
}


