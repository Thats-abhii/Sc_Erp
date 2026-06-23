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

export function Leads({ leads, setLeads, orders, setOrders, payments, setPayments, followups, setFollowups, salesmen=SALESMEN, partners, setPartners, isManager, smartInventory, setSmartInventory }) {
  const [search,setSearch]=useState("");
  const [fStatus,setFStatus]=useState("All");
  const [fSource,setFSource]=useState("All");
  const [fSM,setFSM]=useState("All");
  const [showAdd,setShowAdd]=useState(false);
  const [showDetail,setShowDetail]=useState(null);
  const [showCall,setShowCall]=useState(null);
  const [showConvert,setShowConvert]=useState(null);
  const [showRejected,setShowRejected]=useState(false);
  const [reassignRejected,setReassignRejected]=useState(null);
  const [orderMeasurements,setOrderMeasurements]=useState([]);
  const [paymentEditLead,setPaymentEditLead]=useState(null);
  const [editId,setEditId]=useState(null);
  const [saving,setSaving]=useState(false);
  const [converting,setConverting]=useState(false);
  const defaultSalesmanId=salesmen[0]?.id||"";
  const blankLead={name:"",mobile:"",alt:"",email:"",source:"Google Ads",product:PRODUCTS[0],location:"",budget:"",salesman:defaultSalesmanId,status:"New",priority:"Warm",notes:""};
  const [form,setForm]=useState(blankLead);
  const [callLog,setCallLog]=useState({outcome:"Answered",notes:"",nextDate:todayStr()});
  const [paymentEditForm,setPaymentEditForm]=useState({status:"No Paid",paid:""});

  const activeLeads=leads.filter(l=>l.status!=="Rejected");
  const rejectedLeads=sortLeadsNewest(leads.filter(l=>l.status==="Rejected"));
  const filtered=sortLeadsNewest(activeLeads.filter(l=>{
    const q=search.toLowerCase();
    return (!q||l.name.toLowerCase().includes(q)||l.mobile.includes(q)||l.location.toLowerCase().includes(q))
      &&(fStatus==="All"||l.status===fStatus)
      &&(fSource==="All"||l.source===fSource)
      &&(fSM==="All"||sameId(l.salesman,fSM));
  }));
  const linkedRequest=lead=>partners?.find(p=>p.id===lead.channelPartnerId)?.requests?.find(r=>r.id===lead.partnerRequestId);
  const leadQuote=lead=>lead.quotation||linkedRequest(lead)?.quotation||null;
  const leadPaid=lead=>leadPaidFromOrders(lead,orders,payments)||Number(linkedRequest(lead)?.paid||0);
  const leadBalance=lead=>{
    const quote=leadQuote(lead);
    const order=orders.find(o=>o.id===lead.paymentOrderId||o.leadId===lead.id);
    return order?leadBalanceFromOrders(lead,orders,payments):(quote?Math.max(Number(quote.amount||0)-leadPaid(lead),0):0);
  };
  const leadPaymentStatus=lead=>{
    const order=orders.find(o=>o.id===lead.paymentOrderId||o.leadId===lead.id);
    const total=Number(order?.final ?? leadQuote(lead)?.amount ?? lead.budget ?? 0);
    return paymentStatusFromAmounts(leadPaid(lead),total);
  };
  const openLeadEdit=lead=>{
    const quotation=leadQuote(lead);
    const total=Number(quotation?.amount||lead.budget||0);
    const paid=leadPaid(lead);
    const status=lead.paymentStatus||(paid<=0?"No Paid":paid>=total?"Fully Paid":"Partially Paid");
    setForm({...lead,quotation:lead.quotation||quotation});
    setPaymentEditForm({status,paid:status==="Fully Paid"?total:status==="No Paid"?0:paid});
    setEditId(lead.id);
    setShowAdd(true);
  };
  const rejectLead=lead=>{
    if(!confirm(`Move ${lead.name} to Rejected Leads?`))return;
    const stamp=new Date().toISOString();
    setLeads(ls=>ls.map(l=>l.id===lead.id?{...l,status:"Rejected",rejectedAt:stamp,updated:todayStr(),updatedAt:stamp}:l));
    if(lead.channelPartnerId&&lead.partnerRequestId){
      setPartners?.(ps=>ps.map(p=>p.id===lead.channelPartnerId?{...p,requests:(p.requests||[]).map(r=>r.id===lead.partnerRequestId?{...r,status:"Rejected By Management",leadStatus:"Rejected"}:r)}:p));
    }
    setFollowups?.(fs=>fs.filter(f=>f.leadId!==lead.id));
    setShowDetail(d=>d&&d.id===lead.id?{...d,status:"Rejected",rejectedAt:stamp,updated:todayStr()}:d);
  };
  const reassignRejectedLead=()=>{
    if(!reassignRejected?.salesman)return alert("Select salesman");
    const stamp=new Date().toISOString();
    setLeads(ls=>ls.map(l=>{
      if(l.id!==reassignRejected.lead.id)return l;
      const linkedReq=linkedRequest(l);
      const cpDraftMeasurement=l.measurement||linkedReq?.measurement||null;
      const {rejectedAt,contactDone,svDone,measurement,quotation,paymentMarked,paymentStatus,paymentPaid,paymentBalance,paymentOrderId,followupReason,cpAccepted,cpAcceptedAt,cpAcceptedDate,...rest}=l;
      return {...rest,status:"New",salesman:reassignRejected.salesman,notes:l.notes||"",cpDraftMeasurement,reassignedAt:stamp,assignedAt:stamp,updated:todayStr(),updatedAt:stamp};
    }));
    const lead=reassignRejected.lead;
    if(lead.channelPartnerId&&lead.partnerRequestId){
      setPartners?.(ps=>ps.map(p=>p.id===lead.channelPartnerId?{...p,requests:(p.requests||[]).map(r=>{
        if(r.id!==lead.partnerRequestId)return r;
        const {quotation,cpAccepted,cpAcceptedAt,cpAcceptedDate,...safe}=r;
        return {...safe,quotationAmount:0,paid:0,balance:0,status:"Reassigned - Salesman Visit Pending",leadStatus:"New",stage:"Salesman Visit Pending",pdfReady:false};
      })}:p));
    }
    setReassignRejected(null);
    setShowRejected(false);
  };

  const save=()=>{
    if(saving)return;
    const mobileError=validateMobile(form.mobile);
    const emailError=validateEmail(form.email);
    if(!form.name)return alert("Name is required");
    if(mobileError)return alert(mobileError);
    if(emailError)return alert(emailError);
    const normalizedMobile=normalizeMobile(form.mobile);
    const duplicate=customerDuplicate({leads,orders,partners,mobile:normalizedMobile,email:form.email,excludeLeadId:editId||""});
    if(duplicate){ duplicateAudit("Lead Management",duplicateMsg(duplicate),{mobile:normalizedMobile,email:form.email}); return alert(duplicateMsg(duplicate)); }
    const key=`lead:${normalizedMobile}:${String(form.email||"").toLowerCase()}`;
    if(!editId&&onceKeyActive(key))return alert("Processing... duplicate submit blocked");
    setSaving(true);
    if(editId){
      const quotation=leadQuote(form)||form.quotation;
      const total=Number(quotation?.amount||form.budget||0);
      const shouldUpdatePayment=!!quotation;
      const paid=shouldUpdatePayment?(paymentEditForm.status==="Fully Paid"?total:(paymentEditForm.status==="No Paid"?0:Number(paymentEditForm.paid||0))):0;
      if(shouldUpdatePayment&&paid>total){ setSaving(false); return alert("Paid amount cannot be more than quotation amount"); }
      const balance=Math.max(total-paid,0);
      const linkedOrder=orders.find(o=>o.id===form.paymentOrderId||o.leadId===editId);
      const orderId=form.paymentOrderId||linkedOrder?.id;
      const paymentPatch=shouldUpdatePayment?{paymentMarked:true,paymentStatus:paymentEditForm.status,paymentPaid:paid,paymentBalance:balance}:{};
      setLeads(ls=>ls.map(l=>l.id===editId?{...l,...form,...paymentPatch,mobile:normalizedMobile,updated:todayStr(),updatedAt:new Date().toISOString()}:l));
      if(shouldUpdatePayment&&orderId){
        setOrders(os=>os.map(o=>o.id===orderId?{...o,advance:paid,balance}:o));
        setPayments(ps=>{
          const existing=ps.find(p=>p.orderId===orderId);
          if(paid<=0)return ps.filter(p=>p.orderId!==orderId);
          if(existing)return ps.map(p=>p.orderId===orderId?{...p,amount:paid,mode:paymentEditForm.status,notes:"Updated from lead edit"}:p);
          return [...ps,{id:`PAY${Date.now()}`,orderId,date:todayStr(),amount:paid,mode:paymentEditForm.status,notes:"Added from lead edit"}];
        });
      }
      if(shouldUpdatePayment&&form.channelPartnerId&&form.partnerRequestId){
        setPartners?.(ps=>ps.map(p=>p.id===form.channelPartnerId?{...p,requests:(p.requests||[]).map(r=>r.id===form.partnerRequestId?{...r,paid,balance,status:orderId?(paid>0?"Order Confirmed":"Quotation Sent"):(paid>0?"Payment Updated":"Quotation Sent")}:r)}:p));
      }
    } else {
      const nid=`L${String(leads.length+1).padStart(3,"0")}`;
      const now=new Date().toISOString();
      setLeads(ls=>[...ls,{...form,mobile:normalizedMobile,id:nid,created:todayStr(),updated:todayStr(),createdAt:now,updatedAt:now,assignedAt:now,createdBy:"Management"}]);
      auditLog({event:"Created",source:"Lead Management",recordType:"Lead",recordId:nid,mobile:normalizedMobile});
    }
    setForm(blankLead);setShowAdd(false);setEditId(null);setPaymentEditForm({status:"No Paid",paid:""});
    setSaving(false);
  };

  const logCall=()=>{
    if(!showCall)return;
    setFollowups(fs=>[...fs,{id:`FU${Date.now()}`,leadId:showCall.id,smId:showCall.salesman,date:todayStr(),time:new Date().toTimeString().slice(0,5),type:"Call",outcome:"Completed",action:callLog.notes,next:callLog.nextDate,notes:callLog.notes}]);
    setLeads(ls=>ls.map(l=>l.id===showCall.id?{...l,updated:todayStr(),updatedAt:new Date().toISOString(),status:callLog.outcome==="Interested"?"Contacted":l.status}:l));
    setShowCall(null);setCallLog({outcome:"Answered",notes:"",nextDate:todayStr()});
    alert("Call logged & follow-up created ");
  };

  const openOrderApproval=lead=>{
    const quotation=leadQuote(lead);
    if(!quotation)return alert("Quotation is required before production order");
    if(!lead.paymentMarked)return alert("Payment status must be marked before production order");
    const windows=measurementWindows(lead).map((w,i)=>({...w,label:w.label||`Window ${i+1}`,qty:Number(w.qty||1)}));
    if(!windows.length)return alert("Measurement is required before production order");
    setOrderMeasurements(windows);
    setShowConvert({...lead,quotation,paymentPaid:leadPaid(lead),paymentBalance:leadBalance(lead)});
  };
  const updateOrderMeasurement=(idx,patch)=>setOrderMeasurements(rows=>rows.map((w,i)=>i===idx?{...w,...patch}:w));
  const applyOrderInventoryChoice=(idx,value,type)=>{
    const opt=inventoryChoiceOptions(smartInventory,type).find(o=>o.value===value);
    if(!opt)return;
    updateOrderMeasurement(idx,{inventoryChoice:value,color:opt.color,material:opt.material,code:opt.code});
  };
  const applyOrderInventoryCode=(idx,value,type)=>{
    const opt=inventoryCodeOptions(smartInventory,type).find(o=>o.value===value);
    if(!opt)return;
    updateOrderMeasurement(idx,{inventoryChoice:opt.material,color:opt.color,material:opt.material,code:opt.value});
  };
  const mergeCutPiecesLocal=lengths=>{
    const map={};
    (lengths||[]).forEach(l=>{
      const size=round2(ftFromSize(l.size));
      if(size>0)map[size]=(map[size]||0)+Number(l.qty||0);
    });
    return Object.entries(map).map(([size,qty])=>({size:fmtFt(size),qty})).filter(l=>l.qty>0).sort((a,b)=>ftFromSize(a.size)-ftFromSize(b.size));
  };
  const matchText=(...parts)=>parts.filter(Boolean).join(" ").toLowerCase();
  const pickMeshMaterialForProduct=(product,inv)=>{
    const text=matchText(product.color,product.material,product.name,product.code);
    const list=inv.meshComponents||[];
    const profiles=list.filter(i=>(i.item||"").toLowerCase().includes("aluminium profile"));
    return profiles.find(i=>text.includes((i.code||"").toLowerCase()))
      || profiles.find(i=>text.includes("white")&&(i.item||"").toLowerCase().includes("white"))
      || profiles.find(i=>text.includes("brown")&&(i.item||"").toLowerCase().includes("brown"))
      || profiles.find(i=>text.includes("black")&&(i.item||"").toLowerCase().includes("black"))
      || profiles[0]
      || list[0];
  };
  const pickBlindRollForProduct=(product,inv)=>{
    const text=matchText(product.color,product.material,product.name,product.code);
    return (inv.blindRolls||[]).find(r=>text.includes((r.code||"").toLowerCase()))
      || (inv.blindRolls||[]).find(r=>text.includes((r.shade||"").toLowerCase()))
      || (inv.blindRolls||[])[0];
  };
  const meshRequirementFt=product=>{
    const h=Number(product.heightFt||0);
    const w=Number(product.widthFt||0);
    const q=Number(product.qty||1);
    if(h>0&&w>0)return round2((h+w)*2*q);
    const sq=Number(product.sqft||String(product.size||"").replace(/[^0-9.]/g,"")||0);
    return round2(sq>0?Math.sqrt(sq)*4:12*q);
  };
  const consumeInventoryForOrder=(order)=>{
    if(!setSmartInventory||!smartInventory)return order;
    const inv={...smartInventory};
    const consumptions={};
    const movements=[...(inv.movements||[])];
    inv.meshComponents=[...(inv.meshComponents||[])];
    inv.blindRolls=[...(inv.blindRolls||[])];
    (order.products||[]).forEach((product,idx)=>{
      const productType=(product.type||product.name||"").toLowerCase();
      const key=`${order.id}-${idx}`;
      if(productType.includes("mesh")){
        const material=pickMeshMaterialForProduct(product,inv);
        if(!material)return;
        const materialIndex=inv.meshComponents.findIndex(i=>i.id===material.id);
        let remaining=meshRequirementFt(product);
        const requiredFt=remaining;
        const cutUses=[];
        const cutRemainders=[];
        let availableCuts=(material.lengths||[]).flatMap(l=>Array.from({length:Number(l.qty||0)},()=>ftFromSize(l.size))).filter(n=>n>0).sort((a,b)=>b-a);
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
        if(Number(material.full||0)<fullUsed)return;
        const leftoverFt=round2(Math.max((fullUsed*fullLength)-remaining,0));
        const reusableCutFt=leftoverFt>=2?leftoverFt:0;
        const wasteFt=leftoverFt>0&&leftoverFt<2?leftoverFt:0;
        const cutGrouped=mergeCutPiecesLocal(cutUses.map(size=>({size:fmtFt(size),qty:1})));
        let lengths=mergeCutPiecesLocal(material.lengths||[]);
        cutGrouped.forEach(use=>{
          let left=Number(use.qty||0);
          lengths=lengths.map(l=>{
            if(ftFromSize(l.size)!==ftFromSize(use.size)||left<=0)return l;
            const take=Math.min(Number(l.qty||0),left);
            left-=take;
            return {...l,qty:Number(l.qty||0)-take};
          }).filter(l=>Number(l.qty||0)>0);
        });
        if(cutRemainders.length)lengths=mergeCutPiecesLocal([...lengths,...cutRemainders.map(size=>({size:fmtFt(size),qty:1}))]);
        if(reusableCutFt)lengths=mergeCutPiecesLocal([...lengths,{size:fmtFt(reusableCutFt),qty:1}]);
        const remainingFull=Number(material.full||0)-fullUsed;
        inv.meshComponents[materialIndex]={...material,full:remainingFull,lengths,cut:lengths.reduce((s,l)=>s+Number(l.qty||0),0)};
        consumptions[key]={job:{id:key,orderId:order.id},kind:"mesh",materialId:material.id,materialName:material.item,requiredFt,cutGrouped,cutRemainders:mergeCutPiecesLocal(cutRemainders.map(size=>({size:fmtFt(size),qty:1}))),fullUsed,fullLength,leftoverFt,reusableCutFt,wasteFt,afterFull:remainingFull,consumedAt:new Date().toISOString()};
        movements.unshift({id:Date.now()+idx,kind:"mesh",date:todayStr(),orderId:order.id,material:material.item,usedFt:requiredFt,cutUsed:cutGrouped,cutRemainders,fullUsed,fullLength,remainingFull,reusableCutFt,wasteFt,text:`${material.item} consumed for ${order.id}: ${fmtFt(requiredFt)} used`});
      } else {
        const roll=pickBlindRollForProduct(product,inv);
        if(!roll)return;
        const rollIndex=inv.blindRolls.findIndex(r=>r.id===roll.id);
        const requiredSqft=Number(product.actualSqft||product.sqft||String(product.size||"").replace(/[^0-9.]/g,"")||0);
        const usedMetres=round2(requiredSqft*0.092903);
        const beforeMetres=Number(roll.remainingMetres ?? (Number(roll.rolls||0)*Number(roll.metres||0)));
        const remainingMetres=round2(Math.max(beforeMetres-usedMetres,0));
        const metresPerRoll=Number(roll.metres||30);
        inv.blindRolls[rollIndex]={...roll,remainingMetres,rolls:Math.ceil(remainingMetres/Math.max(metresPerRoll,1))};
        consumptions[key]={job:{id:key,orderId:order.id},kind:"blind",materialId:roll.id,materialName:roll.name,usedSqft:requiredSqft,usedMetres,remainingMetres,consumedAt:new Date().toISOString()};
        movements.unshift({id:Date.now()+idx,kind:"blinds",date:todayStr(),orderId:order.id,material:roll.name,usedSqft:requiredSqft,usedMetres,remainingMetres,text:`${roll.name} consumed for ${order.id}: ${requiredSqft} SQFT / ${usedMetres} m used`});
      }
    });
    setSmartInventory({...inv,movements:movements.slice(0,30)});
    return {...order,inventoryConsumptions:consumptions};
  };
  const convertToOrder=lead=>{
    if(converting)return;
    if(lead.paymentOrderId||orders.some(o=>o.leadId===lead.id)){ duplicateAudit("Lead Management Order",`Order already exists for lead ${lead.id}`,{leadId:lead.id}); return alert("Order already exists for this customer/lead"); }
    if(onceKeyActive(`convert-order:${lead.id}`))return alert("Processing... duplicate order creation blocked");
    const quotation=leadQuote(lead)||lead.quotation;
    if(!quotation)return alert("Quotation is required before production order");
    if(!orderMeasurements.length)return alert("Measurement is required");
    const nid=`ORD-${String(orders.length+1).padStart(3,"0")}`;
    const amount=Number(quotation.amount||0);
    const paid=Number(lead.paymentPaid||leadPaid(lead)||0);
    const balance=Math.max(amount-paid,0);
    const productionProduct=quotation.productType||quotedProductType(lead);
    const measurementError=validateMeasurementRows(orderMeasurements);
    if(measurementError)return alert(measurementError);
    setConverting(true);
    const quoteLines=quoteLineItems(lead,{...quotation,productType:productionProduct});
    const orderPayload={id:nid,leadId:lead.id,customer:lead.name,mobile:lead.mobile,products:orderMeasurements.map((raw,i)=>{ const w=enrichMeasurementLine(raw); const qLine=quoteLines[i]||{}; return {name:qLine.productType||productionProduct,type:lead.measurement?.type||"Blind",sourceLeadProduct:lead.product,size:`Actual ${w.sqft} SQFT / Billing ${w.chargeableSqft} SQFT`,qty:Number(w.qty||1),unitPrice:Number(qLine.rate||quotation.rate||0),total:Number(qLine.amount ?? (w.chargeableSqft*Number(quotation.rate||0))),window:w.label||`Window ${i+1}`,height:w.height,width:w.width,heightUnit:w.heightUnit,widthUnit:w.widthUnit,heightFt:w.heightFt,widthFt:w.widthFt,sqft:w.sqft,actualSqft:w.sqft,chargeableSqft:w.chargeableSqft,billingSqft:w.chargeableSqft,color:w.color,material:w.material,code:w.code}; }),discount:Number(quotation.discount||0),discountType:"percent",gst:Number(quotation.gst||0),gstAmount:Number(quotation.gstAmount||0),taxable:Number(quotation.taxable||0),final:amount,advance:paid,balance,delivery:"",install:true,installer:"",status:"Approval Pending",approval:"Pending",created:todayStr(),createdAt:new Date().toISOString()};
    setOrders(os=>{
      if(os.some(o=>o.leadId===lead.id||o.id===nid||(normalizeMobile(o.mobile)===normalizeMobile(lead.mobile)&&o.status==="Approval Pending"))){
        duplicateAudit("Lead Management Order",`Duplicate production order blocked for lead ${lead.id}`,{leadId:lead.id,mobile:lead.mobile});
        return os;
      }
      return [...os,consumeInventoryForOrder(orderPayload)];
    });
    if(paid>0)setPayments(ps=>[...ps,{id:`PAY${Date.now()}`,orderId:nid,date:todayStr(),amount:paid,mode:lead.paymentStatus||"Payment",notes:"Payment linked during management production approval"}]);
    setLeads(ls=>ls.map(l=>l.id===lead.id?{...l,status:"Converted",paymentOrderId:nid,updated:todayStr(),updatedAt:new Date().toISOString()}:l));
    if(lead.channelPartnerId&&lead.partnerRequestId){
      setPartners?.(ps=>ps.map(p=>p.id===lead.channelPartnerId?{...p,requests:(p.requests||[]).map(r=>r.id===lead.partnerRequestId?{...r,orderId:nid,status:"Order Sent For Approval",stage:"Approval Pending"}:r)}:p));
    }
    setShowConvert(null);setConverting(false);alert(`Order ${nid} created `);
  };
  const openPaymentEdit=lead=>{
    const quotation=leadQuote(lead)||lead.quotation;
    const total=Number(quotation?.amount||lead.budget||0);
    const paid=leadPaid(lead);
    const status=lead.paymentStatus||(paid<=0?"No Paid":paid>=total?"Fully Paid":"Partially Paid");
    setPaymentEditLead({...lead,quotation});
    setPaymentEditForm({status,paid:status==="Fully Paid"?total:status==="No Paid"?0:paid});
  };
  const savePaymentEdit=()=>{
    if(!paymentEditLead)return;
    const total=Number(paymentEditLead.quotation?.amount||paymentEditLead.budget||0);
    const paid=paymentEditForm.status==="Fully Paid"?total:(paymentEditForm.status==="No Paid"?0:Number(paymentEditForm.paid||0));
    if(paid>total)return alert("Paid amount cannot be more than order amount");
    const balance=Math.max(total-paid,0);
    const orderId=paymentEditLead.paymentOrderId;
    setLeads(ls=>ls.map(l=>l.id===paymentEditLead.id?{...l,paymentMarked:true,paymentStatus:paymentEditForm.status,paymentPaid:paid,paymentBalance:balance,updated:todayStr(),updatedAt:new Date().toISOString()}:l));
    if(orderId){
      setOrders(os=>os.map(o=>o.id===orderId?{...o,advance:paid,balance}:o));
      setPayments(ps=>{
        const existing=ps.find(p=>p.orderId===orderId);
        if(paid<=0)return ps.filter(p=>p.orderId!==orderId);
        if(existing)return ps.map(p=>p.orderId===orderId?{...p,amount:paid,mode:paymentEditForm.status,notes:"Updated by management"}:p);
        return [...ps,{id:`PAY${Date.now()}`,orderId,date:todayStr(),amount:paid,mode:paymentEditForm.status,notes:"Added by management"}];
      });
    }
    if(paymentEditLead.channelPartnerId&&paymentEditLead.partnerRequestId){
      setPartners?.(ps=>ps.map(p=>p.id===paymentEditLead.channelPartnerId?{...p,requests:(p.requests||[]).map(r=>r.id===paymentEditLead.partnerRequestId?{...r,paid,balance,status:orderId?(paid>0?"Order Confirmed":"Quotation Sent"):(paid>0?"Payment Updated":"Quotation Sent")}:r)}:p));
    }
    setShowDetail(d=>d&&d.id===paymentEditLead.id?{...d,paymentMarked:true,paymentStatus:paymentEditForm.status,paymentPaid:paid,paymentBalance:balance,updated:todayStr()}:d);
    setPaymentEditLead(null);
  };

  return (
    <div>
      <SectionTitle action={!isManager&&<PrimaryBtn onClick={()=>{setForm(blankLead);setEditId(null);setPaymentEditForm({status:"No Paid",paid:""});setShowAdd(true)}}>+ Add Lead</PrimaryBtn>}>
        Lead Management <span style={{fontSize:14,fontWeight:400,color:T.muted}}>({filtered.length})</span>
      </SectionTitle>
      <div style={{display:"flex",justifyContent:"flex-end",margin:"-10px 0 14px"}}>
        <GhostBtn onClick={()=>setShowRejected(true)}>Rejected Leads ({rejectedLeads.length})</GhostBtn>
      </div>

      {/* Filters */}
      <GlassCard style={{marginBottom:16,padding:"14px 18px"}}>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <div style={{flex:"1 1 200px"}}><SearchBar value={search} onChange={setSearch} placeholder="Search name, mobile, location..." /></div>
          <div style={{minWidth:130}}>
            <FilterSelect value={fStatus} onChange={setFStatus} options={[{v:"All",l:"All Status"},...["New","Contacted","Site Visit Scheduled","Quoted","Negotiation","Converted","Lost","On Hold"].map(s=>({v:s,l:s}))]} />
          </div>
          <div style={{minWidth:120}}>
            <FilterSelect value={fSource} onChange={setFSource} options={[{v:"All",l:"All Sources"},...["Google Ads","JustDial","Referral","Walk-in","Social Media","CP","Other"].map(s=>({v:s,l:s}))]} />
          </div>
          {!isManager&&<div style={{minWidth:130}}>
            <FilterSelect value={fSM} onChange={setFSM} options={[{v:"All",l:"All Salesmen"},...salesmen.map(s=>({v:s.id,l:s.name}))]} />
          </div>}
        </div>
      </GlassCard>

      <GlassCard style={{padding:0}}>
        <Table headers={["ID","Customer","Product","Source","Salesman","Status","Quotation","Updated","Actions"]}>
          {filtered.map(l=>{
            const quotation=leadQuote(l);
            const paid=quotation?leadPaid(l):0;
            const remaining=quotation?Math.max(Number(quotation.amount||0)-paid,0):0;
            return (
            <TR key={l.id}>
              <TD mono color={T.muted}>{l.id}</TD>
              <TD>
                <div style={{fontWeight:500,color:T.text}}>{l.name}</div>
                <div style={{fontSize:11,color:T.muted,marginTop:2}}>{l.mobile} | {l.location}</div>
              </TD>
              <TD><span style={{fontSize:12,color:T.sub}}>{l.product}</span></TD>
              <TD><Pill label={l.source} color={l.source==="Google Ads"?T.blue:l.source==="JustDial"?T.orange:l.source==="Referral"?T.purple:l.source==="Walk-in"?T.teal:T.sub} /></TD>
              <TD>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:smColor(l.salesman),flexShrink:0}} />
                  <span style={{fontSize:12,color:T.sub}}>{smName(l.salesman,salesmen).split(" ")[0]}</span>
                </div>
              </TD>
              <TD><StatusPill s={l.status} /></TD>
              <TD>{quotation?<div style={{display:"grid",gap:4,fontSize:12}}><div><b style={{color:T.green}}>{inr(quotation.amount||0)}</b> <GhostBtn small onClick={()=>openQuotationPdf({...l,quotation},quotation)}>PDF</GhostBtn></div><div style={{color:T.sub}}>Paid: <b style={{color:paid>0?T.teal:T.muted}}>{inr(paid)}</b></div><div style={{color:T.sub}}>Left: <b style={{color:remaining>0?T.red:T.green}}>{inr(remaining)}</b></div></div>:<span style={{fontSize:12,color:T.muted}}>Not quoted</span>}</TD>
              <TD color={T.muted} nowrap>{l.updated}</TD>
              <TD nowrap>
                <div style={{display:"flex",gap:6}}>
                  {!isManager&&<><EditBtn onClick={()=>openLeadEdit(l)} />
                  {!l.paymentOrderId&&!orders.some(o=>o.leadId===l.id)&&<button onClick={()=>rejectLead(l)} style={{background:`${T.red}18`,border:`1px solid ${T.red}33`,borderRadius:7,padding:"4px 8px",color:T.red,cursor:"pointer",fontSize:11,fontWeight:700}} title="Reject Lead">Rejected</button>}
                  {quotation&&l.paymentMarked&&!l.paymentOrderId&&<button onClick={()=>openOrderApproval(l)} style={{background:`${T.purple}22`,border:`1px solid ${T.purple}33`,borderRadius:7,padding:"4px 8px",color:T.purple,cursor:"pointer",fontSize:11}} title="Send to Production">Order</button>}</>}
                </div>
              </TD>
            </TR>
          );})}
        </Table>
        {filtered.length===0&&<div style={{textAlign:"center",padding:48,color:T.muted,fontSize:13}}>No leads found</div>}
      </GlassCard>

      {/* Add/Edit Modal */}
      {showAdd&&(
        <Modal title={editId?"Edit Lead":"Add New Lead"} onClose={()=>{setShowAdd(false);setEditId(null);setPaymentEditForm({status:"No Paid",paid:""});}} wide>
          <FormRow cols={2}>
            <Field label="Customer Name *"><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Full name" /></Field>
            <Field label="Mobile Number *"><input value={form.mobile} onChange={e=>setForm(f=>({...f,mobile:e.target.value}))} placeholder="+91 XXXXX XXXXX" /></Field>
          </FormRow>
          <FormRow cols={2}>
            <Field label="Alternate Number"><input value={form.alt} onChange={e=>setForm(f=>({...f,alt:e.target.value}))} /></Field>
            <Field label="Email"><input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} /></Field>
          </FormRow>
          <FormRow cols={2}>
            <Field label="Lead Source"><select value={form.source} onChange={e=>setForm(f=>({...f,source:e.target.value}))}>{["Google Ads","JustDial","Referral","Walk-in","Social Media","CP","Other"].map(s=><option key={s}>{s}</option>)}</select></Field>
            <Field label="Product Interested"><select value={form.product} onChange={e=>setForm(f=>({...f,product:e.target.value}))}>{PRODUCTS.map(p=><option key={p}>{p}</option>)}</select></Field>
          </FormRow>
          <FormRow cols={2}>
            <Field label="Location / Area"><input value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} placeholder="Area, City" /></Field>
            <Field label="Budget (Rs.)"><input type="number" value={form.budget||""} onChange={e=>setForm(f=>({...f,budget:Number(e.target.value)}))} /></Field>
          </FormRow>
          <FormRow cols={3}>
            <Field label="Assigned Salesman"><select value={form.salesman} onChange={e=>setForm(f=>({...f,salesman:e.target.value}))}>{salesmen.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
            <Field label="Status"><select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>{["New","Contacted","Site Visit Scheduled","Quoted","Negotiation","Converted","Lost","On Hold"].map(s=><option key={s}>{s}</option>)}</select></Field>
            <Field label="Priority"><select value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}>{["Hot","Warm","Cold"].map(s=><option key={s}>{s}</option>)}</select></Field>
          </FormRow>
          <Field label="Notes"><textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} placeholder="Any additional details..." /></Field>
          {editId&&leadQuote(form)&&(()=>{
            const quotation=leadQuote(form);
            const total=Number(quotation?.amount||form.budget||0);
            const paid=paymentEditForm.status==="Fully Paid"?total:(paymentEditForm.status==="No Paid"?0:Number(paymentEditForm.paid||0));
            const left=Math.max(total-paid,0);
            return <div style={{marginTop:16,border:`1px solid ${T.border}`,borderRadius:10,padding:14,background:T.cardHi}}>
              <div style={{fontSize:12,fontWeight:800,color:T.muted,marginBottom:10}}>EDIT PAYMENT</div>
              <div style={{fontSize:13,color:T.sub,marginBottom:12}}>
                Quotation Amount: <b style={{color:T.text}}>{inr(total)}</b> | Paid: <b style={{color:paid>0?T.green:T.muted}}>{inr(paid)}</b> | Left: <b style={{color:left>0?T.red:T.green}}>{inr(left)}</b>
              </div>
              <FormRow cols={2}>
                <Field label="Payment Status"><select value={paymentEditForm.status} onChange={e=>setPaymentEditForm(f=>({...f,status:e.target.value,paid:e.target.value==="Fully Paid"?total:e.target.value==="No Paid"?0:f.paid}))}>{["No Paid","Partially Paid","Fully Paid"].map(s=><option key={s}>{s}</option>)}</select></Field>
                <Field label="How Much Paid"><input type="number" disabled={paymentEditForm.status!=="Partially Paid"} value={paymentEditForm.status==="Fully Paid"?total:paymentEditForm.status==="No Paid"?0:paymentEditForm.paid} onChange={e=>setPaymentEditForm(f=>({...f,paid:e.target.value}))} /></Field>
              </FormRow>
            </div>;
          })()}
          <div style={{display:"flex",gap:10,marginTop:20}}>
            <PrimaryBtn onClick={save} disabled={saving}>{saving?"Processing...":editId?"Update Lead":"Save Lead"}</PrimaryBtn>
            <GhostBtn onClick={()=>{setShowAdd(false);setEditId(null);setPaymentEditForm({status:"No Paid",paid:""});}}>Cancel</GhostBtn>
          </div>
        </Modal>
      )}

      {/* Detail Modal */}
      {showDetail&&(
        <Modal title={`Lead - ${showDetail.id}`} onClose={()=>setShowDetail(null)} wide>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
            {[["Customer",showDetail.name],["Mobile",showDetail.mobile],["Email",showDetail.email||""],["Location",showDetail.location],["Source",showDetail.source],["Product",showDetail.product],["Budget",showDetail.budget?inr(showDetail.budget):""],["Salesman",smName(showDetail.salesman,salesmen)],["Status",showDetail.status],["Priority",showDetail.priority],["Created",showDetail.created],["Updated",showDetail.updated]].map(([k,v])=>(
              <div key={k} style={{background:"rgba(255,255,255,.04)",borderRadius:10,padding:"10px 14px"}}>
                <div style={{fontSize:11,color:T.muted,marginBottom:3,textTransform:"uppercase",letterSpacing:.4}}>{k}</div>
                <div style={{fontSize:13,color:T.text,fontWeight:500}}>{v}</div>
              </div>
            ))}
          </div>
          {showDetail.notes&&<div style={{background:"rgba(245,158,11,.07)",border:"1px solid rgba(245,158,11,.2)",borderRadius:10,padding:"10px 14px",marginBottom:20}}>
            <div style={{fontSize:11,color:T.amber,marginBottom:4,fontWeight:600}}>NOTES</div>
            <div style={{fontSize:13,color:T.sub}}>{showDetail.notes}</div>
          </div>}
          {showDetail.quotation&&<div style={{background:T.cardHi,border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 14px",marginBottom:20}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:11,color:T.muted,marginBottom:4,fontWeight:700}}>PAYMENT DETAILS</div>
              <div style={{fontSize:13,color:T.sub}}>Order Amount: <b style={{color:T.text}}>{inr(showDetail.quotation.amount||0)}</b>{isSalesRecognized(showDetail,orders,payments)&&<> | Status: <b style={{color:T.blue}}>{leadPaymentStatus(showDetail)}</b> | Collected: <b style={{color:T.green}}>{inr(leadPaid(showDetail))}</b> | Left: <b style={{color:leadBalance(showDetail)>0?T.red:T.green}}>{inr(leadBalance(showDetail))}</b></>}</div>
              </div>
            </div>
          </div>}
          <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:12}}>Follow-up Timeline</div>
          {followups.filter(f=>f.leadId===showDetail.id).length===0
            ? <div style={{fontSize:13,color:T.muted}}>No follow-ups logged yet.</div>
            : followups.filter(f=>f.leadId===showDetail.id).map(f=>(
              <div key={f.id} style={{display:"flex",gap:12,marginBottom:12}}>
                <div style={{width:2,background:`${T.teal}44`,borderRadius:1,flexShrink:0}} />
                <div style={{padding:"6px 0"}}>
                  <div style={{fontSize:12,color:T.teal,fontWeight:600}}>{f.date} {f.time} | {f.type}</div>
                  <div style={{fontSize:13,color:T.sub,marginTop:2}}>{f.notes||f.action||"No notes"}</div>
                </div>
              </div>
            ))
          }
        </Modal>
      )}

      {paymentEditLead&&(
        <Modal title="Edit Payment Details" onClose={()=>setPaymentEditLead(null)}>
          <div style={{background:T.cardHi,border:`1px solid ${T.border}`,borderRadius:8,padding:12,marginBottom:14,fontSize:13,color:T.sub}}>
            Order Amount: <b style={{color:T.text}}>{inr(paymentEditLead.quotation?.amount||paymentEditLead.budget||0)}</b> | Payment Left: <b style={{color:T.red}}>{inr(Math.max(Number(paymentEditLead.quotation?.amount||paymentEditLead.budget||0)-(paymentEditForm.status==="Fully Paid"?Number(paymentEditLead.quotation?.amount||paymentEditLead.budget||0):(paymentEditForm.status==="No Paid"?0:Number(paymentEditForm.paid||0))),0))}</b>
          </div>
          <FormRow cols={2}>
            <Field label="Payment Status"><select value={paymentEditForm.status} onChange={e=>setPaymentEditForm(f=>({...f,status:e.target.value,paid:e.target.value==="Fully Paid"?(paymentEditLead.quotation?.amount||paymentEditLead.budget||0):e.target.value==="No Paid"?0:f.paid}))}>{["No Paid","Partially Paid","Fully Paid"].map(s=><option key={s}>{s}</option>)}</select></Field>
            <Field label="How Much Paid"><input type="number" disabled={paymentEditForm.status!=="Partially Paid"} value={paymentEditForm.status==="Fully Paid"?(paymentEditLead.quotation?.amount||paymentEditLead.budget||0):paymentEditForm.status==="No Paid"?0:paymentEditForm.paid} onChange={e=>setPaymentEditForm(f=>({...f,paid:e.target.value}))} /></Field>
          </FormRow>
          <div style={{display:"flex",gap:10,marginTop:18}}><PrimaryBtn onClick={savePaymentEdit}>Save Payment</PrimaryBtn><GhostBtn onClick={()=>setPaymentEditLead(null)}>Cancel</GhostBtn></div>
        </Modal>
      )}
      {showRejected&&<Modal title="Rejected Leads" onClose={()=>setShowRejected(false)} wide>
        <GlassCard style={{padding:0}}>
          <Table headers={["Lead","Customer","Product","Salesman","Rejected Date","Action"]}>
            {rejectedLeads.map(l=><TR key={l.id}>
              <TD mono>{l.id}</TD>
              <TD bold>{l.name}<div style={{fontSize:11,color:T.muted}}>{l.mobile} | {l.location}</div></TD>
              <TD>{l.product}</TD>
              <TD>{smName(l.salesman,salesmen)||"-"}</TD>
              <TD color={T.muted}>{l.rejectedAt?new Date(l.rejectedAt).toLocaleDateString("en-IN"):l.updated}</TD>
              <TD><PrimaryBtn small onClick={()=>setReassignRejected({lead:l,salesman:l.salesman||salesmen[0]?.id||""})}>Reassign Lead</PrimaryBtn></TD>
            </TR>)}
          </Table>
          {rejectedLeads.length===0&&<div style={{padding:32,textAlign:"center",color:T.muted,fontSize:13}}>No rejected leads.</div>}
        </GlassCard>
      </Modal>}
      {reassignRejected&&<Modal title={`Reassign ${reassignRejected.lead.name}`} onClose={()=>setReassignRejected(null)}>
        <Field label="Select Salesman"><select value={reassignRejected.salesman} onChange={e=>setReassignRejected(r=>({...r,salesman:e.target.value}))}><option value="">Select salesman</option>{salesmen.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <div style={{display:"flex",gap:10,marginTop:18}}><PrimaryBtn onClick={reassignRejectedLead}>Reassign As New Lead</PrimaryBtn><GhostBtn onClick={()=>setReassignRejected(null)}>Cancel</GhostBtn></div>
      </Modal>}

      {/* Convert Modal */}
      {showConvert&&(
        <Modal title="Send Order To Production Approval" onClose={()=>setShowConvert(null)} wide>
          <div style={{background:"rgba(167,139,250,.08)",border:"1px solid rgba(167,139,250,.2)",borderRadius:12,padding:"16px 18px",marginBottom:20}}>
            <div style={{fontSize:13,fontWeight:600,color:T.text}}>{showConvert.name}</div>
            <div style={{fontSize:12,color:T.muted,marginTop:4}}>{showConvert.product} | Quoted {inr(showConvert.quotation?.amount||0)} | Paid {inr(showConvert.paymentPaid||0)}</div>
          </div>
          <p style={{fontSize:13,color:T.sub,marginBottom:16,lineHeight:1.6}}>Use the quoted measurements below, or correct height, width, quantity, color and material before sending to Production. Production will still start only after approval in the Production tab.</p>
          <div style={{display:"grid",gap:10,marginBottom:18}}>
            {orderMeasurements.map((w,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"1.2fr repeat(8,1fr)",gap:8,alignItems:"end",border:`1px solid ${T.border}`,borderRadius:8,padding:10}}>
              <Field label="Window"><input value={w.label||""} onChange={e=>updateOrderMeasurement(i,{label:e.target.value})} /></Field>
              <Field label="Height"><input type="number" min="0.01" step="0.01" value={w.height||""} onChange={e=>updateOrderMeasurement(i,{height:e.target.value})} /></Field>
              <Field label="Height Unit"><select value={normalizeUnit(w.heightUnit||w.unit)} onChange={e=>updateOrderMeasurement(i,{heightUnit:e.target.value})}>{MEASUREMENT_UNITS.map(u=><option key={u}>{u}</option>)}</select></Field>
              <Field label="Width"><input type="number" min="0.01" step="0.01" value={w.width||""} onChange={e=>updateOrderMeasurement(i,{width:e.target.value})} /></Field>
              <Field label="Width Unit"><select value={normalizeUnit(w.widthUnit||w.unit)} onChange={e=>updateOrderMeasurement(i,{widthUnit:e.target.value})}>{MEASUREMENT_UNITS.map(u=><option key={u}>{u}</option>)}</select></Field>
              <Field label="Qty"><input type="number" min="1" value={w.qty||1} onChange={e=>updateOrderMeasurement(i,{qty:e.target.value})} /></Field>
              <Field label="Color / Material / Code"><select value={w.inventoryChoice||""} onChange={e=>applyOrderInventoryChoice(i,e.target.value,showConvert.measurement?.type||showConvert.product)}><option value="">Select inventory material...</option>{inventoryChoiceOptions(smartInventory,showConvert.measurement?.type||showConvert.product).map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
              <Field label="Selected Code"><select value={w.code||""} onChange={e=>applyOrderInventoryCode(i,e.target.value,showConvert.measurement?.type||showConvert.product)}><option value="">Select password code...</option>{inventoryCodeOptions(smartInventory,showConvert.measurement?.type||showConvert.product).map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
              <Field label="Billing SQFT"><input disabled value={lineChargeableSqft(w)} /></Field>
            </div>)}
          </div>
          <div style={{display:"flex",gap:10}}>
            <PrimaryBtn disabled={converting} onClick={()=>convertToOrder(showConvert)} color={T.purple}>{converting?"Processing...":"Send For Production Approval"}</PrimaryBtn>
            <GhostBtn onClick={()=>setShowConvert(null)}>Cancel</GhostBtn>
          </div>
        </Modal>
      )}
    </div>
  );
}



export function ChannelPartners({ partners, setPartners, leads=[], orders=[], setLeads, setOrders, salesmen=SALESMEN, isManager }) {
  const [selectedMonth,setSelectedMonth]=useState("2024-12");
  const [selectedYear,setSelectedYear]=useState("2024");
  const [partnerSearch,setPartnerSearch]=useState("");
  const [selected,setSelected]=useState(null);
  const [showPartner,setShowPartner]=useState(false);
  const [showBusiness,setShowBusiness]=useState(false);
  const [editingBusiness,setEditingBusiness]=useState(null);
  const [approval,setApproval]=useState(null);
  const [savingPartner,setSavingPartner]=useState(false);
  const [savingApproval,setSavingApproval]=useState(false);
  const blankPartner={name:"",owner:"",mobile:"",city:"",category:"Dealer",loginId:"",password:""};
  const blankBusiness={partnerId:"",date:todayStr(),project:"",business:"",paid:"",status:"Part Paid"};
  const blankApproval={salesman:salesmen[0]?.id||"",measurementDate:todayStr(),productionDate:"",installationDate:""};
  const [partnerForm,setPartnerForm]=useState(blankPartner);
  const [businessForm,setBusinessForm]=useState(blankBusiness);
  const [approvalForm,setApprovalForm]=useState(blankApproval);
  const EditActionBtn=({children,onClick})=><EditBtn onClick={onClick}>{children}</EditBtn>;

  const summarize=p=>{
    const tx=p.transactions||[];
    const rq=requestBusinessRows(p);
    const mtd=tx.filter(t=>t.date?.startsWith(selectedMonth)).reduce((s,t)=>s+Number(t.business||0),0);
    const requestMtd=rq.filter(t=>t.date?.startsWith(selectedMonth)).reduce((s,t)=>s+Number(t.business||0),0);
    const ytd=tx.filter(t=>t.date?.startsWith(selectedYear)).reduce((s,t)=>s+Number(t.business||0),0);
    const requestYtd=rq.filter(t=>t.date?.startsWith(selectedYear)).reduce((s,t)=>s+Number(t.business||0),0);
    const totalBusiness=tx.reduce((s,t)=>s+Number(t.business||0),0)+rq.reduce((s,t)=>s+Number(t.business||0),0);
    const totalPaid=tx.reduce((s,t)=>s+Number(t.paid||0),0)+rq.reduce((s,t)=>s+Number(t.paid||0),0);
    const pending=Math.max(totalBusiness-totalPaid,0);
    return { mtd:mtd+requestMtd,ytd:ytd+requestYtd,totalBusiness,totalPaid,pending };
  };
  const hasPendingRequest=p=>(p.requests||[]).some(r=>r.approval==="Pending"||r.status==="Pending Management Approval");
  const pendingRequestCount=p=>(p.requests||[]).filter(r=>r.approval==="Pending"||r.status==="Pending Management Approval").length;
  const visibleOrderRequests=p=>(p.requests||[]).filter(r=>r.approval==="Pending"||r.status==="Pending Management Approval");
  const requestBusinessRows=p=>(p.requests||[]).filter(r=>r.approval==="Approved"&&Number(r.quotationAmount||0)>0).map(r=>{
    const business=Number(r.quotationAmount||0);
    const paid=Number(r.paid||0);
    const status=r.orderId?"Production Started":paid>=business?"Paid":paid>0?"Part Paid":"No Paid";
    return {...r,date:r.date,project:r.project,business,paid,status,isRequestBusiness:true};
  });
  const totals=partners.reduce((acc,p)=>{ const s=summarize(p); acc.mtd+=s.mtd; acc.ytd+=s.ytd; acc.collected+=s.totalPaid; acc.pending+=s.pending; return acc; },{mtd:0,ytd:0,collected:0,pending:0});
  const pendingPartners=partners.filter(hasPendingRequest);
  const cpRequestSummary=req=>{
    const windows=(req.windows||req.measurement?.windows||[]).map((raw,i)=>enrichMeasurementLine({...raw,label:raw.label||`Window ${i+1}`}));
    return {
      windows,
      qty:windows.reduce((sum,w)=>sum+Number(w.qty||1),0),
      actualSqft:round2(windows.reduce((sum,w)=>sum+Number(w.sqft||0),0)),
      billingSqft:round2(windows.reduce((sum,w)=>sum+Number(w.chargeableSqft||w.sqft||0),0))
    };
  };
  const partnerMatches=p=>{
    const q=partnerSearch.trim().toLowerCase();
    if(!q)return true;
    const txText=(p.transactions||[]).map(t=>`${t.project} ${t.status} ${t.date}`).join(" ");
    const reqText=(p.requests||[]).map(r=>`${r.project} ${r.customer} ${r.mobile} ${r.product} ${r.status}`).join(" ");
    return `${p.name} ${p.owner} ${p.mobile} ${p.city} ${p.category} ${p.loginId||""} ${txText} ${reqText}`.toLowerCase().includes(q);
  };
  const filteredPartners=partners.filter(partnerMatches);

  const openAddPartner=()=>{ setPartnerForm(blankPartner); setSelected(null); setShowPartner(true); };
  const openEditPartner=p=>{ setPartnerForm({name:p.name,owner:p.owner,mobile:p.mobile,city:p.city,category:p.category,loginId:p.loginId||"",password:p.password||""}); setSelected(p); setShowPartner(true); };
  const savePartner=async ()=>{
    if(savingPartner)return;
    if(!partnerForm.name||!partnerForm.owner)return alert("Partner name and owner are required");
    const mobileError=validateMobile(partnerForm.mobile);
    if(mobileError)return alert(mobileError);
    if(!partnerForm.loginId||!partnerForm.password)return alert("Partner login ID and password are required");
    if(partners.some(p=>p.id!==selected?.id&&p.loginId?.toLowerCase()===partnerForm.loginId.trim().toLowerCase()))return alert("This partner login ID is already used");
    const duplicate=customerDuplicate({leads,orders,partners,mobile:partnerForm.mobile,excludePartnerId:selected?.id||""});
    if(duplicate){ duplicateAudit("Channel Partner",duplicateMsg(duplicate),{mobile:partnerForm.mobile}); return alert(duplicateMsg(duplicate)); }
    const key=`partner:${normalizeMobile(partnerForm.mobile)}:${partnerForm.loginId.trim().toLowerCase()}`;
    if(!selected&&onceKeyActive(key))return alert("Processing... duplicate channel partner blocked");
    setSavingPartner(true);
    const id=selected?.id||`CP${Date.now()}`;
    try {
      await createBackendAccessUser({name:partnerForm.name.trim(),loginId:partnerForm.loginId.trim(),password:partnerForm.password.trim(),role:"channel_partner",linkedEntityId:id});
    } catch (error) {
      setSavingPartner(false);
      return alert(error.message||"Could not create channel partner login");
    }
    const {password, ...safePayload}={...partnerForm,mobile:normalizeMobile(partnerForm.mobile),loginId:partnerForm.loginId.trim()};
    if(selected)setPartners(ps=>ps.map(p=>p.id===selected.id?{...p,...safePayload}:p));
    else {
      setPartners(ps=>[...ps,{...safePayload,id,transactions:[],requests:[],createdAt:new Date().toISOString(),createdBy:"Management"}]);
      auditLog({event:"Created",source:"Channel Partner",recordType:"Channel Partner",recordId:id,mobile:safePayload.mobile});
    }
    setSelected(null); setShowPartner(false); setPartnerForm(blankPartner);
    setSavingPartner(false);
  };
  const changePartnerPassword=async (partner)=>{
    const next=prompt(`Enter new password for ${partner.name}`, "");
    if(!next)return;
    try {
      await createBackendAccessUser({name:partner.name,loginId:partner.loginId,password:next,role:"channel_partner",linkedEntityId:partner.id});
    } catch (error) {
      return alert(error.message||"Could not update channel partner password");
    }
    const forcedLogoutAt=Date.now();
    setPartners(ps=>ps.map(p=>p.id===partner.id?{...p,password:"",forcedLogoutAt}:p));
    if(selected?.id===partner.id)setSelected(p=>({...p,password:"",forcedLogoutAt}));
    alert("Password changed. Any logged-in session for this channel partner will be logged out and old password will not work.");
  };
  const openAcceptRequest=(partner,req)=>{
    setApproval({partner,req});
    setApprovalForm({salesman:salesmen[0]?.id||1,measurementDate:todayStr(),productionDate:"",installationDate:""});
  };
  const acceptRequest=()=>{
    if(savingApproval)return;
    if(!approval)return;
    const {partner,req}=approval;
    const mobileError=validateMobile(req.mobile);
    if(mobileError)return alert(mobileError);
    const existing=customerDuplicate({leads,orders,partners,mobile:req.mobile,excludePartnerId:partner.id,excludeRequestId:req.id});
    if(existing&&existing.ref!==req.id){ duplicateAudit("Channel Partner Request Accept",duplicateMsg(existing),{requestId:req.id,mobile:req.mobile}); return alert(duplicateMsg(existing)); }
    if(onceKeyActive(`accept-request:${req.id}`))return alert("Processing... duplicate approval blocked");
    setSavingApproval(true);
    const leadId=req.leadId||`LCP${Date.now().toString().slice(-6)}`;
    const windows=req.windows||[];
    const measurement={type:req.product?.toLowerCase().includes("mesh")?"Mesh":"Blind",windows,budget:null,notes:req.notes};
    const schedule={measurementDate:approvalForm.measurementDate,productionDate:approvalForm.productionDate,installationDate:approvalForm.installationDate,salesman:approvalForm.salesman};
    setPartners(ps=>ps.map(p=>{
      if(p.id!==partner.id)return p;
      return {...p,requests:(p.requests||[]).map(r=>r.id===req.id?{...r,leadId,approval:"Approved",status:"Accepted - Assign Salesman",leadStatus:"New",measurement,...schedule}:r)};
    }));
    if(!req.leadId){ const stamp=new Date().toISOString(); setLeads?.(ls=>ls.some(l=>l.partnerRequestId===req.id||normalizeMobile(l.mobile)===normalizeMobile(req.mobile))?ls:[...ls,{id:leadId,name:req.customer,mobile:normalizeMobile(req.mobile),alt:"",email:"",source:"CP",product:req.product,location:req.project,budget:null,salesman:approvalForm.salesman,status:"New",priority:"Warm",created:todayStr(),updated:todayStr(),createdAt:stamp,updatedAt:stamp,assignedAt:stamp,createdBy:"Management",notes:`Channel Partner: ${partner.name}. ${req.notes||""}`,channelPartnerId:partner.id,channelPartnerName:partner.name,partnerRequestId:req.id,measurement,...schedule}]); }
    auditLog({event:"Approved",source:"Channel Partner",recordType:"Order Request",recordId:req.id,mobile:normalizeMobile(req.mobile)});
    setApproval(null);
    setSavingApproval(false);
  };
  const rejectRequest=(partner,req)=>{
    if(!confirm("Reject this channel partner request?"))return;
    setPartners(ps=>ps.map(p=>p.id===partner.id?{...p,requests:(p.requests||[]).map(r=>r.id===req.id?{...r,approval:"Rejected",status:"Rejected"}:r)}:p));
  };
  const editRequestPayment=(partner,req)=>{
    if(!req.quotationAmount)return alert("Quotation is not generated yet");
    const paid=Number(prompt("Edit paid amount", req.paid||0)||0);
    if(paid<0)return;
    const capped=Math.min(paid,Number(req.quotationAmount||0));
    const balance=Math.max(Number(req.quotationAmount||0)-capped,0);
    const nextStatus=req.orderId?(capped>0?"Order Confirmed":"Quotation Sent"):(capped>0?"Payment Updated":"Quotation Sent");
    setPartners(ps=>ps.map(p=>{
      if(p.id!==partner.id)return p;
      const updated={...p,requests:(p.requests||[]).map(r=>r.id===req.id?{...r,paid:capped,balance,status:nextStatus}:r)};
      if(selected?.id===p.id)setSelected(updated);
      return updated;
    }));
    if(req.leadId)setLeads?.(ls=>ls.map(l=>l.id===req.leadId?{...l,paymentMarked:capped>0,paymentPaid:capped,paymentBalance:balance,paymentStatus:capped>=Number(req.quotationAmount||0)?"Fully Paid":capped>0?"Partially Paid":"No Paid",updated:todayStr()}:l));
    if(req.orderId)setOrders?.(os=>os.map(o=>o.id===req.orderId?{...o,advance:capped,balance}:o));
  };
  const confirmPaidRequest=(partner,req)=>{
    alert("Please create the production order from Lead Management > Order after checking the measurement.");
  };
  const openAddBusiness=partnerId=>{ setEditingBusiness(null); setBusinessForm({...blankBusiness,partnerId:partnerId||partners[0]?.id||"",date:selectedMonth?`${selectedMonth}-01`:todayStr()}); setShowBusiness(true); };
  const openEditBusiness=(partner,entry)=>{
    setEditingBusiness(entry);
    setBusinessForm({partnerId:partner.id,date:entry.date,project:entry.project,business:String(entry.business||""),paid:String(entry.paid||""),status:entry.status||"Part Paid"});
    setShowBusiness(true);
  };
  const saveBusiness=()=>{
    if(!businessForm.partnerId||!businessForm.project||!businessForm.business)return alert("Partner, project and business amount are required");
    const entry={...businessForm,id:editingBusiness?.id||`CPB${Date.now()}`,business:Number(businessForm.business||0),paid:Number(businessForm.paid||0)};
    setPartners(ps=>ps.map(p=>{
      if(p.id!==businessForm.partnerId)return p;
      const transactions=editingBusiness
        ? (p.transactions||[]).map(t=>t.id===editingBusiness.id?entry:t)
        : [...(p.transactions||[]),entry];
      const updated={...p,transactions};
      if(selected?.id===p.id)setSelected(updated);
      return updated;
    }));
    setEditingBusiness(null); setShowBusiness(false); setBusinessForm(blankBusiness);
  };

  return (
    <div>
      <SectionTitle action={!isManager&&<div style={{display:"flex",gap:10}}><GhostBtn onClick={()=>openAddBusiness()}>+ Add Business</GhostBtn><PrimaryBtn onClick={openAddPartner}>+ Channel Partner</PrimaryBtn></div>}>Channel Partners</SectionTitle>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:18}}>
        <StatKPI label="MTD Business" value={inr(totals.mtd)} sub={`month: ${selectedMonth}`} accent={T.blue} />
        <StatKPI label="YTD Business" value={inr(totals.ytd)} sub={`year: ${selectedYear}`} accent={T.green} />
        <StatKPI label="Collected Amount" value={inr(totals.collected)} sub="received from partners" accent={T.teal} />
        <StatKPI label="Pending Balance" value={inr(totals.pending)} sub="partner receivables" accent={T.red} />
      </div>

      <GlassCard style={{marginBottom:18}}>
        <div style={{display:"grid",gridTemplateColumns:"180px 160px minmax(260px,1fr)",gap:14,alignItems:"end"}}>
          <Field label="MTD Month"><input type="month" value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} /></Field>
          <Field label="YTD Year"><input value={selectedYear} onChange={e=>setSelectedYear(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="2024" /></Field>
          <Field label="Search Channel Partner"><input value={partnerSearch} onChange={e=>setPartnerSearch(e.target.value)} placeholder="Search name, owner, mobile, city, login ID..." /></Field>
        </div>
      </GlassCard>
      {pendingPartners.length>0&&<div style={{marginBottom:18,padding:"12px 16px",borderRadius:8,background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.22)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
        <div style={{fontSize:13,fontWeight:800,color:T.red}}>{pendingPartners.length} channel partner{pendingPartners.length>1?"s":""} requested order approval</div>
        <div style={{fontSize:12,color:T.sub}}>{pendingPartners.map(p=>`${p.name} (${pendingRequestCount(p)})`).join(", ")}</div>
      </div>}

      <GlassCard style={{padding:0}}>
        <Table headers={["Partner","Owner","Category","MTD","YTD","Collected","Pending","Action"]}>
          {filteredPartners.map(p=>{
            const s=summarize(p);
            const pendingRequests=pendingRequestCount(p);
            return (
              <TR key={p.id} tone={pendingRequests?"red":"green"}>
                <TD><div style={{fontWeight:700,color:T.text,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>{p.name}{pendingRequests>0&&<Pill label={`${pendingRequests} New Request${pendingRequests>1?"s":""}`} color={T.red} />}</div><div style={{fontSize:11,color:T.muted}}>{p.id} - {p.city}</div></TD>
                <TD>{p.owner}<div style={{fontSize:11,color:T.muted}}>{p.mobile}</div></TD>
                <TD><Pill label={p.category} color={T.blue} /></TD>
                <TD color={T.blue} bold>{inr(s.mtd)}</TD>
                <TD color={T.green} bold>{inr(s.ytd)}</TD>
                <TD color={T.teal} bold>{inr(s.totalPaid)}</TD>
                <TD color={T.red} bold>{inr(s.pending)}</TD>
                <TD nowrap>
                  <div style={{display:"flex",gap:8}}>
                    <GhostBtn small onClick={()=>setSelected(p)}>View</GhostBtn>
                    {!isManager&&<EditActionBtn onClick={()=>openEditPartner(p)}>Edit</EditActionBtn>}
                  </div>
                </TD>
              </TR>
            );
          })}
        </Table>
        {filteredPartners.length===0&&<div style={{padding:34,textAlign:"center",fontSize:13,color:T.muted}}>No channel partner found for this search.</div>}
      </GlassCard>

      {selected&&!showPartner&&<Modal title={`${selected.name} - Business Details`} onClose={()=>setSelected(null)} wide>
        <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",marginBottom:14}}>
          <div style={{fontSize:12,color:T.muted}}>Login ID: <b style={{color:T.text}}>{selected.loginId}</b> | Password: <b style={{color:T.text}}>hidden for security</b></div>
          {!isManager&&<PrimaryBtn small color={T.blue} onClick={()=>changePartnerPassword(selected)}>Change Password</PrimaryBtn>}
        </div>
        <Table headers={["Date","Project","Business","Paid","Pending","Action"]}>
          {[...(selected.transactions||[]),...requestBusinessRows(selected)].map(t=><TR key={t.id}><TD>{t.date}</TD><TD bold>{t.project}{t.isRequestBusiness&&<div style={{fontSize:11,color:T.muted}}>{t.customer} | {t.mobile} | {t.product} | {(t.windows||[]).length} window(s)</div>}</TD><TD>{inr(t.business)}</TD><TD color={Number(t.paid||0)>0?T.green:T.red}>{inr(t.paid)}</TD><TD color={Number(t.business)-Number(t.paid)>0?T.red:T.green} bold>{inr(Math.max(Number(t.business)-Number(t.paid),0))}</TD><TD><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{t.isRequestBusiness?<EditActionBtn onClick={()=>editRequestPayment(selected,t)}>Edit</EditActionBtn>:!isManager&&<EditActionBtn onClick={()=>openEditBusiness(selected,t)}>Edit</EditActionBtn>}</div></TD></TR>)}
        </Table>
        <div style={{fontSize:13,fontWeight:800,color:T.text,margin:"18px 0 10px"}}>Order Requests</div>
        <Table headers={["Date","Project","Business","Paid","Pending","Status","Request","Action"]}>
          {visibleOrderRequests(selected).map(r=><TR key={r.id}><TD>{r.date}</TD><TD bold>{r.project}<div style={{fontSize:11,color:T.muted}}>{r.customer} | {r.mobile} | {r.product} | {(r.windows||[]).length} window(s)</div></TD><TD bold color={T.orange}>Waiting for approval</TD><TD color={T.red} bold>{inr(0)}</TD><TD color={T.orange} bold>Pending quote</TD><TD><Pill label={r.status} color={T.orange} /></TD><TD><GhostBtn small onClick={()=>openCpRequestPdf(selected,r)}>PDF</GhostBtn></TD><TD><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><PrimaryBtn small onClick={()=>openAcceptRequest(selected,r)}>Accept</PrimaryBtn><DangerBtn small onClick={()=>rejectRequest(selected,r)}>Reject</DangerBtn></div></TD></TR>)}
        </Table>
        {visibleOrderRequests(selected).length===0&&<div style={{padding:32,textAlign:"center",fontSize:13,color:T.muted}}>No pending order request for approval.</div>}
      </Modal>}

      {approval&&(()=>{ const summary=cpRequestSummary(approval.req); return <Modal title="Review Channel Partner Order Request" onClose={()=>setApproval(null)} wide>
        <div style={{background:T.cardHi,border:`1px solid ${T.border}`,borderRadius:8,padding:12,marginBottom:14,fontSize:13,color:T.sub}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start",flexWrap:"wrap"}}>
            <div>
              <b style={{color:T.text,fontSize:15}}>{approval.req.customer}</b>
              <div style={{marginTop:4}}>{approval.req.mobile} | {approval.req.project} | {approval.req.product}</div>
              <div style={{marginTop:4}}>Channel Partner: <b style={{color:T.text}}>{approval.partner.name}</b> | Request: <b style={{color:T.text}}>{approval.req.id}</b></div>
            </div>
            <GhostBtn small onClick={()=>openCpRequestPdf(approval.partner,approval.req)}>Print / Save PDF</GhostBtn>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
          <StatKPI label="Windows" value={summary.windows.length} accent={T.blue} />
          <StatKPI label="Total Qty" value={summary.qty} accent={T.teal} />
          <StatKPI label="Actual SQFT" value={summary.actualSqft} accent={T.orange} />
          <StatKPI label="Billing SQFT" value={summary.billingSqft} accent={T.green} />
        </div>
        <GlassCard style={{padding:0,marginBottom:14}}>
          <Table headers={["Window","Height","Width","Qty","Actual SQFT","Billing SQFT","Material / Color / Code"]}>
            {summary.windows.map((w,i)=><TR key={i}><TD bold>{w.label||`Window ${i+1}`}</TD><TD>{w.height||"-"} {w.heightUnit||"Feet"}</TD><TD>{w.width||"-"} {w.widthUnit||"Feet"}</TD><TD>{w.qty||1}</TD><TD>{w.sqft||0}</TD><TD bold color={T.green}>{w.chargeableSqft||w.sqft||0}</TD><TD>{w.material||"-"} / {w.color||"-"} / {w.code||"-"}</TD></TR>)}
          </Table>
        </GlassCard>
        <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:8,padding:12,marginBottom:14,fontSize:13,color:"#92400e"}}>
          Check the above CP-filled order form first. After this, assign salesman and dates.
        </div>
        <Field label="Assign Salesman"><select value={approvalForm.salesman} onChange={e=>setApprovalForm(f=>({...f,salesman:e.target.value}))}>{salesmen.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <FormRow cols={3}>
          <Field label="Measurement Date"><input type="date" value={approvalForm.measurementDate} onChange={e=>setApprovalForm(f=>({...f,measurementDate:e.target.value}))} /></Field>
          <Field label="Production Date"><input type="date" value={approvalForm.productionDate} onChange={e=>setApprovalForm(f=>({...f,productionDate:e.target.value}))} /></Field>
          <Field label="Installation Date"><input type="date" value={approvalForm.installationDate} onChange={e=>setApprovalForm(f=>({...f,installationDate:e.target.value}))} /></Field>
        </FormRow>
        <div style={{display:"flex",gap:10,marginTop:18}}><GhostBtn onClick={()=>openCpRequestPdf(approval.partner,approval.req)}>View Request PDF</GhostBtn><PrimaryBtn onClick={acceptRequest} disabled={savingApproval}>{savingApproval?"Processing...":"Accept & Send To Lead Management"}</PrimaryBtn><GhostBtn onClick={()=>setApproval(null)}>Cancel</GhostBtn></div>
      </Modal>; })()}

      {showPartner&&<Modal title={selected?"Edit Channel Partner":"Add Channel Partner"} onClose={()=>{setShowPartner(false);setSelected(null);}}>
        <Field label="Partner Name"><input value={partnerForm.name} onChange={e=>setPartnerForm(f=>({...f,name:e.target.value}))} /></Field>
        <FormRow cols={2}><Field label="Owner"><input value={partnerForm.owner} onChange={e=>setPartnerForm(f=>({...f,owner:e.target.value}))} /></Field><Field label="Mobile"><input value={partnerForm.mobile} onChange={e=>setPartnerForm(f=>({...f,mobile:e.target.value}))} /></Field></FormRow>
        <FormRow cols={2}><Field label="City / Area"><input value={partnerForm.city} onChange={e=>setPartnerForm(f=>({...f,city:e.target.value}))} /></Field><Field label="Category"><select value={partnerForm.category} onChange={e=>setPartnerForm(f=>({...f,category:e.target.value}))}>{["Dealer","Architect","Interior Designer","Builder","Contractor"].map(c=><option key={c}>{c}</option>)}</select></Field></FormRow>
        <FormRow cols={2}><Field label="Login ID"><input value={partnerForm.loginId} onChange={e=>setPartnerForm(f=>({...f,loginId:e.target.value}))} /></Field><Field label="Password"><input type="text" value={partnerForm.password} onChange={e=>setPartnerForm(f=>({...f,password:e.target.value}))} /></Field></FormRow>
        <div style={{display:"flex",gap:10,marginTop:18}}><PrimaryBtn onClick={savePartner} disabled={savingPartner}>{savingPartner?"Processing...":"Save Partner"}</PrimaryBtn><GhostBtn onClick={()=>{setShowPartner(false);setSelected(null);}}>Cancel</GhostBtn></div>
      </Modal>}

      {showBusiness&&<Modal title={editingBusiness?"Edit Channel Partner Business":"Add Channel Partner Business"} onClose={()=>{setShowBusiness(false);setEditingBusiness(null);}}>
        <Field label="Channel Partner"><select value={businessForm.partnerId} onChange={e=>setBusinessForm(f=>({...f,partnerId:e.target.value}))}><option value="">Select partner</option>{filteredPartners.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <FormRow cols={2}><Field label="Date"><input type="date" value={businessForm.date} onChange={e=>setBusinessForm(f=>({...f,date:e.target.value}))} /></Field><Field label="Status"><select value={businessForm.status} onChange={e=>setBusinessForm(f=>({...f,status:e.target.value}))}>{["Part Paid","Paid","Pending"].map(s=><option key={s}>{s}</option>)}</select></Field></FormRow>
        <Field label="Project / Order"><input value={businessForm.project} onChange={e=>setBusinessForm(f=>({...f,project:e.target.value}))} /></Field>
        <FormRow cols={2}><Field label="Business Amount"><input type="number" value={businessForm.business} onChange={e=>setBusinessForm(f=>({...f,business:e.target.value}))} /></Field><Field label="Paid Amount"><input type="number" value={businessForm.paid} onChange={e=>setBusinessForm(f=>({...f,paid:e.target.value}))} /></Field></FormRow>
        <div style={{display:"flex",gap:10,marginTop:18}}><PrimaryBtn onClick={saveBusiness}>{editingBusiness?"Update Business":"Save Business"}</PrimaryBtn><GhostBtn onClick={()=>{setShowBusiness(false);setEditingBusiness(null);}}>Cancel</GhostBtn></div>
      </Modal>}
    </div>
  );
}


