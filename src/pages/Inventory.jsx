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

export function Inventory({ inventory, setInventory, isManager }) {
  const [tab,setTab]=useState("raw");
  const [search,setSearch]=useState("");
  const [showAdd,setShowAdd]=useState(false);
  const [showIn,setShowIn]=useState(null);
  const [showOut,setShowOut]=useState(null);
  const [adjQty,setAdjQty]=useState(0);
  const blank={name:"",cat:"",unit:"pcs",stock:0,min:0,supplier:"",price:0,date:todayStr()};
  const [form,setForm]=useState(blank);

  const rawF=inventory.rawMaterials.filter(i=>!search||i.name.toLowerCase().includes(search.toLowerCase())||i.cat.toLowerCase().includes(search.toLowerCase()));
  const lowStock=inventory.rawMaterials.filter(i=>i.stock<i.min);

  const save=()=>{ setInventory(inv=>({...inv,rawMaterials:[...inv.rawMaterials,{...form,id:Date.now(),stock:Number(form.stock),min:Number(form.min),price:Number(form.price)}]})); setForm(blank); setShowAdd(false); };
  const doIn=()=>{ setInventory(inv=>({...inv,rawMaterials:inv.rawMaterials.map(r=>r.id===showIn.id?{...r,stock:r.stock+Number(adjQty)}:r)})); setShowIn(null); setAdjQty(0); };
  const doOut=()=>{ if(Number(adjQty)>showOut.stock)return alert("Insufficient stock!"); setInventory(inv=>({...inv,rawMaterials:inv.rawMaterials.map(r=>r.id===showOut.id?{...r,stock:r.stock-Number(adjQty)}:r)})); setShowOut(null); setAdjQty(0); };

  const catColors={Structural:T.blue,Fabric:T.purple,Mesh:T.teal,Mechanism:T.orange,Hardware:T.sub};

  return (
    <div>
      <SectionTitle>Inventory Management</SectionTitle>

      {lowStock.length>0&&<div style={{background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",borderRadius:12,padding:"12px 18px",marginBottom:20}}>
        <div style={{fontSize:12,fontWeight:600,color:T.red,marginBottom:8}}> {lowStock.length} ITEMS BELOW MINIMUM STOCK</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{lowStock.map(i=><span key={i.id} style={{padding:"3px 10px",background:"rgba(248,113,113,.12)",border:"1px solid rgba(248,113,113,.2)",borderRadius:6,fontSize:11,color:T.red}}>{i.name} ({i.stock}/{i.min})</span>)}</div>
      </div>}

      {/* Tabs */}
      <div style={{display:"flex",gap:4,marginBottom:20,background:T.surf,borderRadius:12,padding:4,width:"fit-content"}}>
        {[["raw","Raw Materials"],["finished","Finished Goods"]].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)} style={{padding:"7px 20px",borderRadius:9,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,background:tab===v?T.amber:"transparent",color:tab===v?"#0f172a":T.sub}}>{l}</button>
        ))}
      </div>

      {tab==="raw"&&(
        <div>
          <div style={{display:"flex",gap:10,marginBottom:14}}>
            <div style={{flex:1}}><SearchBar value={search} onChange={setSearch} placeholder="Search items or category..." /></div>
            {!isManager&&<PrimaryBtn onClick={()=>setShowAdd(true)}>+ Add Item</PrimaryBtn>}
          </div>
          <GlassCard style={{padding:0}}>
            <Table headers={["Item","Category","Stock","Min Stock","Status","Supplier","Last Price","Actions"]}>
              {rawF.map(item=>{
                const low=item.stock<item.min;
                const pct=Math.min(item.stock/item.min,1);
                return (
                  <TR key={item.id} highlight={low}>
                    <TD bold color={T.text}>{item.name}</TD>
                    <TD><Pill label={item.cat} color={catColors[item.cat]||T.sub} /></TD>
                    <TD bold color={low?T.red:T.green}>{item.stock} {item.unit}</TD>
                    <TD color={T.muted}>{item.min} {item.unit}</TD>
                    <TD>
                      <div style={{width:60,height:6,background:"rgba(255,255,255,.08)",borderRadius:3,overflow:"hidden"}}>
                        <div style={{width:`${pct*100}%`,height:"100%",background:low?T.red:T.green,borderRadius:3}} />
                      </div>
                    </TD>
                    <TD color={T.muted}>{item.supplier}</TD>
                    <TD color={T.amber}>{item.price}/{item.unit}</TD>
                    <TD nowrap>
                      {!isManager&&<div style={{display:"flex",gap:6}}>
                        <button onClick={()=>{setShowIn(item);setAdjQty(0)}} style={{padding:"4px 10px",background:"rgba(34,197,94,.12)",border:"1px solid rgba(34,197,94,.2)",borderRadius:7,color:T.green,cursor:"pointer",fontSize:11}}>+ IN</button>
                        <button onClick={()=>{setShowOut(item);setAdjQty(0)}} style={{padding:"4px 10px",background:"rgba(251,146,60,.12)",border:"1px solid rgba(251,146,60,.2)",borderRadius:7,color:T.orange,cursor:"pointer",fontSize:11}}> OUT</button>
                      </div>}
                    </TD>
                  </TR>
                );
              })}
            </Table>
          </GlassCard>
        </div>
      )}

      {tab==="finished"&&(
        <GlassCard style={{padding:0}}>
          <Table headers={["Product","Variant","In Stock","Reserved","Available","Prod. Date"]}>
            {inventory.finishedGoods.map(fg=>(
              <TR key={fg.id}>
                <TD bold color={T.text}>{fg.name}</TD>
                <TD color={T.sub}>{fg.variant}</TD>
                <TD bold color={T.blue}>{fg.qty}</TD>
                <TD color={T.orange}>{fg.reserved}</TD>
                <TD bold color={fg.qty-fg.reserved>0?T.green:T.red}>{fg.qty-fg.reserved}</TD>
                <TD color={T.muted}>{fg.prod}</TD>
              </TR>
            ))}
          </Table>
        </GlassCard>
      )}

      {showAdd&&<Modal title="Add Raw Material" onClose={()=>setShowAdd(false)}>
        <Field label="Item Name *"><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></Field>
        <FormRow cols={2} ><Field label="Category"><input value={form.cat} onChange={e=>setForm(f=>({...f,cat:e.target.value}))} placeholder="Fabric, Structural" /></Field><Field label="Unit"><select value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))}>{["pcs","meters","kg","sets","packs","rolls"].map(u=><option key={u}>{u}</option>)}</select></Field></FormRow>
        <FormRow cols={2}><Field label="Current Stock"><input type="number" value={form.stock} onChange={e=>setForm(f=>({...f,stock:e.target.value}))} /></Field><Field label="Minimum Stock"><input type="number" value={form.min} onChange={e=>setForm(f=>({...f,min:e.target.value}))} /></Field></FormRow>
        <Field label="Supplier Name"><input value={form.supplier} onChange={e=>setForm(f=>({...f,supplier:e.target.value}))} /></Field>
        <div style={{marginTop:12}}><Field label="Last Purchase Price (Rs.)"><input type="number" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} /></Field></div>
        <div style={{display:"flex",gap:10,marginTop:20}}><PrimaryBtn onClick={save}>Save Item</PrimaryBtn><GhostBtn onClick={()=>setShowAdd(false)}>Cancel</GhostBtn></div>
      </Modal>}

      {showIn&&<Modal title={`Stock IN - ${showIn.name}`} onClose={()=>setShowIn(null)}>
        <div style={{background:"rgba(34,197,94,.08)",border:"1px solid rgba(34,197,94,.15)",borderRadius:10,padding:"12px 16px",marginBottom:16}}>
          <div style={{fontSize:12,color:T.muted}}>Current Stock</div>
          <div style={{fontSize:20,fontWeight:700,color:T.green,fontFamily:"'Space Grotesk',sans-serif"}}>{showIn.stock} {showIn.unit}</div>
        </div>
        <Field label={`Quantity to Add (${showIn.unit})`}><input type="number" value={adjQty} onChange={e=>setAdjQty(e.target.value)} /></Field>
        <div style={{marginTop:10,fontSize:12,color:T.sub}}>New stock: <b style={{color:T.green}}>{Number(showIn.stock)+Number(adjQty)} {showIn.unit}</b></div>
        <div style={{display:"flex",gap:10,marginTop:20}}><PrimaryBtn onClick={doIn} color={T.green}>Confirm Stock In</PrimaryBtn><GhostBtn onClick={()=>setShowIn(null)}>Cancel</GhostBtn></div>
      </Modal>}

      {showOut&&<Modal title={`Stock OUT - ${showOut.name}`} onClose={()=>setShowOut(null)}>
        <div style={{background:"rgba(251,146,60,.08)",border:"1px solid rgba(251,146,60,.15)",borderRadius:10,padding:"12px 16px",marginBottom:16}}>
          <div style={{fontSize:12,color:T.muted}}>Current Stock</div>
          <div style={{fontSize:20,fontWeight:700,color:T.orange,fontFamily:"'Space Grotesk',sans-serif"}}>{showOut.stock} {showOut.unit}</div>
        </div>
        <Field label={`Quantity to Deduct (${showOut.unit})`}><input type="number" value={adjQty} onChange={e=>setAdjQty(e.target.value)} /></Field>
        <div style={{marginTop:10,fontSize:12,color:T.sub}}>Remaining: <b style={{color:Number(adjQty)>showOut.stock?T.red:T.orange}}>{Number(showOut.stock)-Number(adjQty)} {showOut.unit}</b></div>
        <div style={{display:"flex",gap:10,marginTop:20}}><PrimaryBtn onClick={doOut} color={T.orange}>Confirm Stock Out</PrimaryBtn><GhostBtn onClick={()=>setShowOut(null)}>Cancel</GhostBtn></div>
      </Modal>}
    </div>
  );
}



export function InventoryDashboard({ smartInventory, setSmartInventory }) {
  const inv=smartInventory||createSmartInventorySeed();
  const [view,setView]=useState("blinds");
  const [openLengths,setOpenLengths]=useState(null);
  const [inventoryModal,setInventoryModal]=useState(null);
  const [sectionModal,setSectionModal]=useState(null);
  const blankInv={kind:"blinds",section:"rolls",name:"",item:"",detail:"",shade:"",code:"",rolls:"",metres:"",qty:"",unit:"pcs",full:"",fullLengthFt:12,cut:"",lengthsText:""};
  const [inventoryForm,setInventoryForm]=useState(blankInv);
  const parseLengths=text=>(text||"").split(",").map(x=>x.trim()).filter(Boolean).map(x=>{ const [size,qty]=x.split(":").map(p=>p?.trim()); return {size:size||"",qty:Number(qty||0)}; }).filter(x=>x.size);
  const lengthsText=lengths=>(lengths||[]).map(l=>`${l.size}:${l.qty}`).join(", ");
  const updateInv=patch=>setSmartInventory(si=>({...si,...(typeof patch==="function"?patch(si):patch)}));
  const openAddInventory=kind=>{ setView(kind); setInventoryForm({...blankInv,kind,section:kind==="mesh"?"materials":"rolls",unit:kind==="mesh"?"lengths":"pcs"}); setInventoryModal({mode:"add",kind}); };
  const addForSection=(kind,section)=>{ setView(kind); setInventoryForm({...blankInv,kind,section,unit:kind==="mesh"&&section==="materials"?"lengths":"pcs"}); setInventoryModal({mode:"add",kind,section}); };
  const openEditInventory=(kind,section,row)=>{ setInventoryForm({...blankInv,...row,kind,section,name:row.name||row.item||"",lengthsText:lengthsText(row.lengths)}); setInventoryModal({mode:"edit",kind,section,id:row.id}); };
  const audit=(text,kind)=>updateInv(si=>({movements:[{id:Date.now(),text,kind,date:todayStr()},...(si.movements||[])].slice(0,20)}));
  const saveInventory=()=>{
    const f=inventoryForm; const id=inventoryModal?.id||`inv${Date.now()}`; const label=(f.item||f.name).trim();
    if(!label)return alert("Inventory name is required"); if(!f.code.trim())return alert("Password code is required");
    setSmartInventory(si=>{
      const next={...si};
      if(f.kind==="blinds"&&f.section==="rolls"){
        const row={id,name:label,code:f.code.trim(),shade:f.shade.trim(),rolls:Number(f.rolls||0),metres:Number(f.metres||0)};
        next.blindRolls=inventoryModal?.mode==="edit"?si.blindRolls.map(x=>x.id===id?row:x):[...si.blindRolls,row];
      }
      if(f.kind==="blinds"&&f.section==="components"){
        const row={id,item:label,detail:f.detail.trim(),qty:Number(f.qty||0),unit:f.unit||"pcs",code:f.code.trim(),reserved:Number(f.reserved||0)};
        next.blindComponents=inventoryModal?.mode==="edit"?si.blindComponents.map(x=>x.id===id?row:x):[...si.blindComponents,row];
      }
      if(f.kind==="mesh"&&f.section==="materials"){
        const row={id,item:label,code:f.code.trim(),full:Number(f.full||0),fullLengthFt:Number(f.fullLengthFt||12),lengths:parseLengths(f.lengthsText),cut:Number(f.cut||0),unit:f.unit||"lengths",reserved:Number(f.reserved||0)};
        next.meshComponents=inventoryModal?.mode==="edit"?si.meshComponents.map(x=>x.id===id?row:x):[...si.meshComponents,row];
      }
      if(f.kind==="mesh"&&f.section==="hardware"){
        const row={id,item:label,qty:Number(f.qty||0),unit:f.unit||"pcs",code:f.code.trim(),reserved:Number(f.reserved||0)};
        next.meshHardware=inventoryModal?.mode==="edit"?si.meshHardware.map(x=>x.id===id?row:x):[...si.meshHardware,row];
      }
      next.movements=[{id:Date.now(),text:`${inventoryModal?.mode==="edit"?"Edited":"Added"} ${label}`,kind:f.kind,date:todayStr()},...(si.movements||[])].slice(0,20);
      return next;
    });
    setInventoryModal(null); setInventoryForm(blankInv);
  };
  const removeInventory=(key,id,label,kind=view)=>{ if(!confirm(`Remove ${label}?`))return; setSmartInventory(si=>({...si,[key]:si[key].filter(x=>x.id!==id),movements:[{id:Date.now(),text:`Removed ${label}`,kind,date:todayStr()},...(si.movements||[])].slice(0,20)})); };
  const RowActions=({onEdit,onRemove})=><div style={{display:"flex",gap:6,justifyContent:"flex-end",flexWrap:"wrap"}}><GhostBtn small onClick={onEdit}>Edit</GhostBtn><DangerBtn small onClick={onRemove}>Remove</DangerBtn></div>;
  const sectionOptions=view==="blinds"?[{section:"rolls",label:"Fabric Rolls",sub:"Fabric roll stock",color:T.purple},{section:"components",label:"Blind Components",sub:"Blind hardware and accessories",color:T.blue}]:[{section:"materials",label:"Mesh Hardware",sub:"Profiles, mesh rolls and cut pieces",color:T.teal},{section:"hardware",label:"Mesh Material",sub:"Handles, spline and small parts",color:T.green}];
  const activeAudit=(inv.movements||[]).filter(a=>a.kind===view).slice(0,4);
  const stockBar=(available,total,color)=> <div style={{height:7,background:"#eef2f7",borderRadius:99,overflow:"hidden",marginTop:5}}><div style={{height:"100%",width:`${Math.max(4,Math.min(100,(available/Math.max(total,1))*100))}%`,background:color,borderRadius:99}} /></div>;

  return <div>
    <SectionTitle action={<PrimaryBtn small color={view==="mesh"?T.teal:T.purple} onClick={()=>openAddInventory(view)}>{view==="mesh"?"+ Add Mesh Inventory":"+ Add Blinds Inventory"}</PrimaryBtn>}>Inventory</SectionTitle>
    <div style={{background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,padding:14,marginBottom:16,boxShadow:"0 8px 20px rgba(15,23,42,.04)",display:"flex",justifyContent:"space-between",gap:14,alignItems:"center",flexWrap:"wrap"}}>
      <div><div style={{fontSize:17,fontWeight:800,color:T.text,fontFamily:"'Space Grotesk',sans-serif"}}>{view==="blinds"?"Blinds Inventory":"Mesh Inventory"}</div><div style={{fontSize:12,color:T.muted,marginTop:4}}>Smart stock, cut pieces, reserved quantity and consumption history.</div></div>
    <div style={{display:"inline-flex",gap:4,padding:4,border:`1px solid ${T.border}`,borderRadius:8,background:T.card}}>{[["blinds","Blinds Inventory"],["mesh","Mesh Inventory"]].map(([id,label])=><button key={id} onClick={()=>setView(id)} style={{border:0,borderRadius:6,padding:"9px 14px",fontSize:12,fontWeight:700,cursor:"pointer",background:view===id?T.blue:"transparent",color:view===id?"#fff":T.sub}}>{label}</button>)}</div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(220px,1fr))",gap:12,marginBottom:16}}>{sectionOptions.map(opt=><button key={opt.section} onClick={()=>setSectionModal({...opt,kind:view})} style={{border:`1px solid ${opt.color}33`,background:`${opt.color}12`,borderRadius:8,padding:"16px 18px",textAlign:"left",cursor:"pointer",fontFamily:"inherit",boxShadow:"0 8px 18px rgba(15,23,42,.04)"}}><div style={{fontSize:16,fontWeight:900,color:opt.color,fontFamily:"'Space Grotesk',sans-serif"}}>{opt.label}</div><div style={{fontSize:12,color:T.sub,marginTop:4}}>Open inventory list</div></button>)}</div>
    <div style={{background:"#fff",border:`1px dashed ${T.border}`,borderRadius:8,padding:22,textAlign:"center",color:T.muted,fontSize:13}}>Select a section above to open its inventory records in a popup window.</div>
    <div style={{marginTop:16,background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,padding:14}}>
      <div style={{fontSize:13,fontWeight:800,color:T.text,marginBottom:10}}>Recent Inventory Activity</div>
      {activeAudit.length?activeAudit.map(a=><div key={a.id} style={{padding:"10px 0",borderTop:`1px solid ${T.border}`,fontSize:12}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}>
          <div style={{fontWeight:800,color:T.text}}>{a.orderId?`Production Order ${a.orderId}`:a.text}</div>
          <div style={{color:T.muted}}>{a.date}</div>
        </div>
        {a.orderId&&<div style={{marginTop:6,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:8,color:T.sub}}>
          <div><b style={{color:T.text}}>Material:</b> {a.material}</div>
          {a.kind==="blinds"?<>
            <div><b style={{color:T.text}}>Used:</b> {a.usedSqft} SQFT / {a.usedMetres} m</div>
            <div><b style={{color:T.text}}>Remaining roll:</b> {a.remainingMetres} m</div>
            <div><b style={{color:T.green}}>Reusable cut:</b> Not applicable</div>
            <div><b style={{color:T.red}}>Waste:</b> No aluminium waste</div>
          </>:<>
            <div><b style={{color:T.text}}>Used:</b> {fmtFt(a.usedFt)}</div>
            <div><b style={{color:T.text}}>From cut:</b> {a.cutUsed?.length?a.cutUsed.map(l=>`${l.size} x ${l.qty}`).join(", "):"None"}</div>
            <div><b style={{color:T.text}}>From full:</b> {a.fullUsed||0} x {a.fullLength||12} ft</div>
            <div><b style={{color:T.text}}>Remaining full:</b> {a.remainingFull}</div>
            <div><b style={{color:T.green}}>Reusable cut:</b> {a.reusableCutFt?fmtFt(a.reusableCutFt):"None"}</div>
            <div><b style={{color:T.red}}>Waste:</b> {a.wasteFt?fmtFt(a.wasteFt):"No waste"}</div>
          </>}
        </div>}
      </div>):<div style={{fontSize:12,color:T.muted}}>No recent changes in this inventory.</div>}
    </div>
    {sectionModal&&<Modal title={`${sectionModal.label} Inventory`} onClose={()=>setSectionModal(null)} wide><div style={{fontSize:13,color:T.sub,marginBottom:14}}>{sectionModal.sub}</div><div style={{overflowX:"auto",paddingBottom:4}}>
      {sectionModal.kind==="blinds"&&sectionModal.section==="rolls"&&<Table headers={["Roll / Fabric","Password Code","Shade","Roll QTY","Reserved","Metre / Roll","Remaining Metres","Action"]}>{inv.blindRolls.map(r=>{ const rem=Number(r.remainingMetres ?? (Number(r.rolls||0)*Number(r.metres||0))); return <TR key={r.id}><TD bold>{r.name}</TD><TD><Code>{r.code}</Code></TD><TD>{r.shade}</TD><TD bold color={T.blue}>{r.rolls}</TD><TD>{r.reserved||0}</TD><TD>{r.metres} m</TD><TD bold color={rem<=5?T.red:T.green}>{round2(rem)} m</TD><TD><RowActions onEdit={()=>openEditInventory("blinds","rolls",r)} onRemove={()=>removeInventory("blindRolls",r.id,r.name,"blinds")} /></TD></TR>; })}</Table>}
      {sectionModal.kind==="blinds"&&sectionModal.section==="components"&&<Table headers={["Component","Details","QTY","Reserved","Usable","Password Code","Action"]}>{inv.blindComponents.map(i=><TR key={i.id}><TD bold>{i.item}</TD><TD color={T.muted}>{i.detail}</TD><TD bold>{i.qty} {i.unit}</TD><TD>{i.reserved||0}</TD><TD>{Math.max(Number(i.qty||0)-Number(i.reserved||0),0)} {i.unit}{stockBar(Math.max(Number(i.qty||0)-Number(i.reserved||0),0),i.qty,T.blue)}</TD><TD><Code>{i.code}</Code></TD><TD><RowActions onEdit={()=>openEditInventory("blinds","components",i)} onRemove={()=>removeInventory("blindComponents",i.id,i.item,"blinds")} /></TD></TR>)}</Table>}
      {sectionModal.kind==="mesh"&&sectionModal.section==="materials"&&<><Table headers={["Material","Password Code","Full Stock","Cut Pieces","Reserved","Usable","Action"]}>{inv.meshComponents.map(i=><TR key={i.id}><TD bold>{i.item}</TD><TD><Code>{i.code}</Code></TD><TD bold color={T.green}>{i.full} {i.unit}<div style={{fontSize:11,color:T.muted}}>{i.fullLengthFt||12} ft each</div></TD><TD>{i.lengths?.length?<button onClick={()=>setOpenLengths(openLengths===i.item?null:i.item)} style={{border:`1px solid ${T.border}`,borderRadius:6,background:T.cardHi,padding:"6px 10px",fontSize:12,fontWeight:700,color:T.blue,cursor:"pointer"}}>{openLengths===i.item?"Hide":"Check"} pieces</button>:<span style={{color:T.muted}}>No cut pieces</span>}</TD><TD>{i.reserved||0}</TD><TD>{Math.max(Number(i.full||0)-Number(i.reserved||0),0)} {i.unit}{stockBar(Math.max(Number(i.full||0)-Number(i.reserved||0),0),i.full,T.teal)}</TD><TD><RowActions onEdit={()=>openEditInventory("mesh","materials",i)} onRemove={()=>removeInventory("meshComponents",i.id,i.item,"mesh")} /></TD></TR>)}</Table>{openLengths&&<div style={{padding:16,borderTop:`1px solid ${T.border}`}}><div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:10}}>{openLengths} - Cut Piece Inventory</div><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{inv.meshComponents.find(i=>i.item===openLengths)?.lengths.map(l=><span key={l.size} style={{fontSize:12,fontWeight:600,color:T.sub,border:`1px solid ${T.border}`,borderRadius:6,padding:"6px 9px",background:T.cardHi}}>{l.size}: <b style={{color:T.blue}}>{l.qty}</b></span>)}</div></div>}</>}
      {sectionModal.kind==="mesh"&&sectionModal.section==="hardware"&&<Table headers={["Hardware","Total QTY","Reserved","Usable","Unit","Password Code","Action"]}>{inv.meshHardware.map(i=><TR key={i.id}><TD bold>{i.item}</TD><TD bold color={T.blue}>{i.qty}</TD><TD>{i.reserved||0}</TD><TD>{Math.max(Number(i.qty||0)-Number(i.reserved||0),0)}{stockBar(Math.max(Number(i.qty||0)-Number(i.reserved||0),0),i.qty,T.green)}</TD><TD>{i.unit}</TD><TD><Code>{i.code}</Code></TD><TD><RowActions onEdit={()=>openEditInventory("mesh","hardware",i)} onRemove={()=>removeInventory("meshHardware",i.id,i.item,"mesh")} /></TD></TR>)}</Table>}
    </div></Modal>}
    {inventoryModal&&<Modal title={`${inventoryModal.mode==="edit"?"Edit":"Add"} ${inventoryForm.kind==="mesh"?"Mesh":"Blinds"} Inventory`} onClose={()=>setInventoryModal(null)} wide><div style={{background:"#f8fafc",border:`1px solid ${T.border}`,borderRadius:8,padding:12,marginBottom:14}}><div style={{fontSize:12,fontWeight:800,color:T.muted,marginBottom:8}}>Section</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{(inventoryForm.kind==="mesh"?[["materials","Mesh Material"],["hardware","Mesh Hardware"]]:[["rolls","Blind Fabric Roll"],["components","Blind Component"]]).map(([section,label])=><button key={section} onClick={()=>setInventoryForm(f=>({...f,section}))} style={{border:`1px solid ${inventoryForm.section===section?T.blue:T.border}`,background:inventoryForm.section===section?T.blue:"#fff",color:inventoryForm.section===section?"#fff":T.sub,borderRadius:7,padding:"8px 12px",fontSize:12,fontWeight:800,cursor:"pointer"}}>{label}</button>)}</div></div><div style={{display:"grid",gap:12}}><FormRow cols={2}><Field label="Name"><input value={inventoryForm.name||inventoryForm.item} onChange={e=>setInventoryForm(f=>({...f,name:e.target.value,item:e.target.value}))} /></Field><Field label="Password Code"><input value={inventoryForm.code} onChange={e=>setInventoryForm(f=>({...f,code:e.target.value}))} /></Field></FormRow>{inventoryForm.kind==="blinds"&&inventoryForm.section==="rolls"&&<><Field label="Shade / Colour"><input value={inventoryForm.shade} onChange={e=>setInventoryForm(f=>({...f,shade:e.target.value}))} /></Field><FormRow cols={2}><Field label="Roll Quantity"><input type="number" value={inventoryForm.rolls} onChange={e=>setInventoryForm(f=>({...f,rolls:e.target.value}))} /></Field><Field label="Metre / Roll"><input type="number" value={inventoryForm.metres} onChange={e=>setInventoryForm(f=>({...f,metres:e.target.value}))} /></Field></FormRow></>}{inventoryForm.kind==="blinds"&&inventoryForm.section==="components"&&<><Field label="Details"><input value={inventoryForm.detail} onChange={e=>setInventoryForm(f=>({...f,detail:e.target.value}))} /></Field><FormRow cols={2}><Field label="Quantity"><input type="number" value={inventoryForm.qty} onChange={e=>setInventoryForm(f=>({...f,qty:e.target.value}))} /></Field><Field label="Unit"><input value={inventoryForm.unit} onChange={e=>setInventoryForm(f=>({...f,unit:e.target.value}))} /></Field></FormRow></>}{inventoryForm.kind==="mesh"&&inventoryForm.section==="materials"&&<><FormRow cols={4}><Field label="Full Stock"><input type="number" value={inventoryForm.full} onChange={e=>setInventoryForm(f=>({...f,full:e.target.value}))} /></Field><Field label="Full Length Ft"><input type="number" value={inventoryForm.fullLengthFt||12} onChange={e=>setInventoryForm(f=>({...f,fullLengthFt:e.target.value}))} /></Field><Field label="Unit"><input value={inventoryForm.unit} onChange={e=>setInventoryForm(f=>({...f,unit:e.target.value}))} /></Field><Field label="Cut Earlier"><input type="number" value={inventoryForm.cut} onChange={e=>setInventoryForm(f=>({...f,cut:e.target.value}))} /></Field></FormRow><Field label="Cut Pieces"><input value={inventoryForm.lengthsText} onChange={e=>setInventoryForm(f=>({...f,lengthsText:e.target.value}))} placeholder="7 ft:14, 6.5 ft:9, 5 ft:7" /></Field></>}{inventoryForm.kind==="mesh"&&inventoryForm.section==="hardware"&&<FormRow cols={2}><Field label="Quantity"><input type="number" value={inventoryForm.qty} onChange={e=>setInventoryForm(f=>({...f,qty:e.target.value}))} /></Field><Field label="Unit"><input value={inventoryForm.unit} onChange={e=>setInventoryForm(f=>({...f,unit:e.target.value}))} /></Field></FormRow>}</div><div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:18}}><GhostBtn onClick={()=>setInventoryModal(null)}>Cancel</GhostBtn><PrimaryBtn onClick={saveInventory}>{inventoryModal.mode==="edit"?"Save Changes":"Add Inventory"}</PrimaryBtn></div></Modal>}
  </div>;
}

