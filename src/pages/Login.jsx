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

export function LoginScreen({ onLogin }) {
  const [salesLogin,setSalesLogin]=useState({loginId:"",password:""});
  const [partnerLogin,setPartnerLogin]=useState({loginId:"",password:""});
  const [managementLogin,setManagementLogin]=useState({loginId:"",password:""});
  const [productionLogin,setProductionLogin]=useState({loginId:"",password:""});
  const [salesError,setSalesError]=useState("");
  const [partnerError,setPartnerError]=useState("");
  const [managementError,setManagementError]=useState("");
  const [productionError,setProductionError]=useState("");
  const [loggingIn,setLoggingIn]=useState("");
  const loginPath=window.location.pathname.toLowerCase();
  const loginPortal=window.SMART_COVERING_LOGIN_PORTAL||
    (loginPath.includes("salesman")
      ? "salesman"
      : loginPath.includes("channel-partner")||loginPath.includes("channelpartner")
        ? "channelPartner"
        : loginPath.includes("production")
          ? "production"
          : "management");
  const [loginModal,setLoginModal]=useState(null);
  const entityIdFromUser=user=>{
    if(user?.linkedEntityId===null||user?.linkedEntityId===undefined||user?.linkedEntityId==="")return null;
    return /^\d+$/.test(String(user.linkedEntityId))?Number(user.linkedEntityId):user.linkedEntityId;
  };
  const submitBackendLogin=async (e, form, backendRole, appRole, setError, loadingKey) => {
    e.preventDefault();
    if(loggingIn)return;
    setError("");
    setLoggingIn(loadingKey);
    try {
      const data=await loginToBackend({loginId:form.loginId,password:form.password,role:backendRole});
      setLoginModal(null);
      onLogin(appRole,entityIdFromUser(data.user),"");
    } catch (error) {
      setError(error.message||"Invalid login ID or password");
      setLoggingIn("");
    }
  };
  const LoginButton=({ color, loadingKey, children })=>{
    const loading = loggingIn && (!loadingKey || loggingIn===loadingKey);
    return (
    <PrimaryBtn color={color} disabled={Boolean(loggingIn)}>
      {loading ? <><ButtonSpinner /> Checking...</> : children}
    </PrimaryBtn>
    );
  };
  const submitManagement=e=>submitBackendLogin(e,managementLogin,"management","management",setManagementError,"management");
  const submitSalesman=e=>submitBackendLogin(e,salesLogin,"salesman","salesman",setSalesError,"salesman");
  const submitPartner=e=>submitBackendLogin(e,partnerLogin,"channel_partner","channelPartner",setPartnerError,"partner");
  const submitProduction=e=>submitBackendLogin(e,productionLogin,"production","productionTeam",setProductionError,"production");
  const openLogin=type=>{
    setLoginModal(type);
    setSalesError("");
    setPartnerError("");
    setManagementError("");
    setProductionError("");
  };
  const portal=loginPortal==="salesman"
    ? {title:"Salesman Login", initial:"S", sub:"Enter your assigned salesman login ID and password", form:salesLogin, setForm:setSalesLogin, error:salesError, submit:submitSalesman, button:"Login as Salesman", color:T.purple, idPlaceholder:"Salesman Login ID"}
    : loginPortal==="channelPartner"
      ? {title:"Channel Partner Login", initial:"CP", sub:"Submit new order requests and track order/payment status", form:partnerLogin, setForm:setPartnerLogin, error:partnerError, submit:submitPartner, button:"Login as Channel Partner", color:T.blue, idPlaceholder:"Partner Login ID"}
      : loginPortal==="production"
        ? {title:"Production Team Login", initial:"P", sub:"Production stage update access", form:productionLogin, setForm:setProductionLogin, error:productionError, submit:submitProduction, button:"Login as Production", color:T.green, idPlaceholder:"Production Login ID"}
        : null;
  if(portal)return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:420}}>
        <div style={{textAlign:"center",marginBottom:34}}>
          <div style={{width:112,height:98,background:"#050505",border:"3px solid #f8fafc",borderRadius:18,boxShadow:"inset 0 0 0 2px rgba(255,255,255,.7)",display:"flex",alignItems:"center",justifyContent:"center",padding:10,margin:"0 auto 12px",overflow:"hidden"}}>
            <img src={BRAND.logo} alt={`${BRAND.name} logo`} style={{width:"100%",height:"100%",objectFit:"contain",display:"block"}} onError={e=>{e.currentTarget.style.display="none";}} />
          </div>
          <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:26,fontWeight:800,color:T.text,margin:"0 0 6px"}}>{portal.title}</h1>
          <p style={{fontSize:13,color:T.muted}}>{portal.sub}</p>
        </div>
        <form onSubmit={portal.submit} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,boxShadow:"0 24px 60px rgba(15,23,42,.10)",padding:22}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
            <div style={{width:44,height:44,borderRadius:8,background:`${portal.color}14`,border:`1px solid ${portal.color}33`,color:portal.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,flexShrink:0}}>{portal.initial}</div>
            <div>
              <div style={{fontWeight:800,fontSize:16,color:T.text}}>{portal.title}</div>
            </div>
          </div>
          <div style={{display:"grid",gap:10}}>
            <input value={portal.form.loginId} onChange={e=>portal.setForm(f=>({...f,loginId:e.target.value}))} placeholder={portal.idPlaceholder} autoComplete="username" />
            <input type="password" value={portal.form.password} onChange={e=>portal.setForm(f=>({...f,password:e.target.value}))} placeholder="Password" autoComplete="current-password" />
            {portal.error&&<div style={{fontSize:12,color:T.red}}>{portal.error}</div>}
            <LoginButton color={portal.color}>{portal.button}</LoginButton>
          </div>
        </form>
      </div>
    </div>
  );
  const popup=loginModal==="salesman"
    ? {title:"Salesman Login", initial:"S", sub:"Enter salesman login ID and password", form:salesLogin, setForm:setSalesLogin, error:salesError, submit:submitSalesman, button:"Login as Salesman", color:T.purple, idPlaceholder:"Salesman Login ID"}
    : loginModal==="partner"
      ? {title:"Channel Partner Login", initial:"CP", sub:"Submit orders and track payment/dispatch", form:partnerLogin, setForm:setPartnerLogin, error:partnerError, submit:submitPartner, button:"Login as Channel Partner", color:T.blue, idPlaceholder:"Partner Login ID"}
      : loginModal==="production"
        ? {title:"Production Login", initial:"P", sub:"Production stage update access", form:productionLogin, setForm:setProductionLogin, error:productionError, submit:submitProduction, button:"Login as Production", color:T.green, idPlaceholder:"Production Login ID"}
        : null;
  return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:20,position:"relative"}}>
      <div style={{position:"absolute",top:18,right:20,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
        <button onClick={()=>openLogin("salesman")} style={{border:`1px solid ${T.border}`,background:T.card,color:T.text,borderRadius:8,padding:"9px 13px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 8px 18px rgba(15,23,42,.05)"}}>Salesman Login</button>
        <button onClick={()=>openLogin("partner")} style={{border:`1px solid ${T.blue}33`,background:`${T.blue}12`,color:T.blue,borderRadius:8,padding:"9px 13px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 8px 18px rgba(15,23,42,.05)"}}>Channel Partner</button>
        <button onClick={()=>openLogin("production")} style={{border:`1px solid ${T.green}33`,background:`${T.green}12`,color:T.green,borderRadius:8,padding:"9px 13px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 8px 18px rgba(15,23,42,.05)"}}>Production Login</button>
      </div>
      <div style={{width:"100%",maxWidth:390}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{width:112,height:98,background:"#050505",border:"3px solid #f8fafc",borderRadius:18,boxShadow:"inset 0 0 0 2px rgba(255,255,255,.7)",display:"flex",alignItems:"center",justifyContent:"center",padding:10,margin:"0 auto 12px",overflow:"hidden"}}>
            <img src={BRAND.logo} alt={`${BRAND.name} logo`} style={{width:"100%",height:"100%",objectFit:"contain",display:"block"}} onError={e=>{e.currentTarget.style.display="none";}} />
          </div>
          <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:28,fontWeight:700,color:T.text,margin:"0 0 6px"}}>{BRAND.appName}</h1>
          <p style={{fontSize:13,color:T.muted}}>Window Blinds & Mosquito Mesh Manufacturing</p>
          <p style={{fontSize:11,color:T.muted,marginTop:3}}>{BRAND.website}</p>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <form onSubmit={submitManagement} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,boxShadow:"0 24px 60px rgba(15,23,42,.10)",padding:18,display:"grid",gap:10}}>
          <div style={{
            width:"100%",padding:"14px 18px",
            background:T.blue,
            border:"none",borderRadius:8,fontFamily:"inherit",
            display:"flex",alignItems:"center",gap:14,
            transition:"transform .1s,opacity .15s",
          }}>
            <div style={{width:42,height:42,borderRadius:8,background:"rgba(255,255,255,.16)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,flexShrink:0}}>M</div>
            <div style={{textAlign:"left"}}>
              <div style={{fontWeight:700,fontSize:15,color:"#fff"}}>Management Login</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,.75)",marginTop:1}}>Manage leads, follow-ups and reports</div>
            </div>
          </div>
          <input value={managementLogin.loginId} onChange={e=>setManagementLogin(f=>({...f,loginId:e.target.value}))} placeholder="Management Login ID" autoComplete="username" />
          <input type="password" value={managementLogin.password} onChange={e=>setManagementLogin(f=>({...f,password:e.target.value}))} placeholder="Password" autoComplete="current-password" />
          {managementError&&<div style={{fontSize:12,color:T.red}}>{managementError}</div>}
          <LoginButton color={T.blue} loadingKey="management">Login as Management</LoginButton>
          </form>
        </div>

      </div>
      {popup&&<div style={{position:"fixed",inset:0,background:"rgba(15,23,42,.35)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}} onClick={()=>setLoginModal(null)}>
        <form onSubmit={popup.submit} onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:390,background:T.card,border:`1px solid ${T.border}`,borderRadius:10,boxShadow:"0 24px 60px rgba(15,23,42,.18)",padding:22}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:14,alignItems:"flex-start",marginBottom:18}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:42,height:42,borderRadius:8,background:`${popup.color}14`,border:`1px solid ${popup.color}33`,color:popup.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,flexShrink:0}}>{popup.initial}</div>
              <div>
                <div style={{fontWeight:800,fontSize:16,color:T.text}}>{popup.title}</div>
                <div style={{fontSize:12,color:T.muted,marginTop:2}}>{popup.sub}</div>
              </div>
            </div>
            <button type="button" onClick={()=>setLoginModal(null)} style={{border:0,background:T.cardHi,borderRadius:8,width:30,height:30,cursor:"pointer",color:T.muted,fontSize:16}}>x</button>
          </div>
          <div style={{display:"grid",gap:10}}>
            <input value={popup.form.loginId} onChange={e=>popup.setForm(f=>({...f,loginId:e.target.value}))} placeholder={popup.idPlaceholder} autoComplete="username" />
            <input type="password" value={popup.form.password} onChange={e=>popup.setForm(f=>({...f,password:e.target.value}))} placeholder="Password" autoComplete="current-password" />
            {popup.error&&<div style={{fontSize:12,color:T.red}}>{popup.error}</div>}
            <LoginButton color={popup.color}>{popup.button}</LoginButton>
          </div>
        </form>
      </div>}
    </div>
  );
}


