import { useState, useEffect, useCallback } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES = {
  boss:      { label: "老闆",  emoji: "👔", color: "#f59e0b" },
  warehouse: { label: "出貨端", emoji: "📦", color: "#10b981" },
};

const STATUSES = [
  { id: "collecting",      label: "收單中",   emoji: "📝", color: "#64748b", role: "boss" },
  { id: "paid",            label: "已付款",   emoji: "💰", color: "#f59e0b", role: "boss" },
  { id: "purchasing",      label: "採購中",   emoji: "🛒", color: "#8b5cf6", role: "boss" },
  { id: "warehouse_in",    label: "進倉確認", emoji: "📦", color: "#06b6d4", role: "warehouse" },
  { id: "pending_confirm", label: "待客確認", emoji: "💬", color: "#f97316", role: "warehouse" },
  { id: "storage",         label: "寄倉",     emoji: "🏭", color: "#84cc16", role: "warehouse" },
  { id: "packing",         label: "揀貨包裝", emoji: "📫", color: "#ec4899", role: "warehouse" },
  { id: "shipped",         label: "已出貨",   emoji: "🚚", color: "#10b981", role: "warehouse" },
  { id: "done",            label: "完成",     emoji: "✅", color: "#334155", role: "warehouse" },
];

const ORIGINS = ["香港", "韓國", "日本", "台灣", "其他"];
const SHIP_METHODS = ["7-11", "全家", "宅配"];
const originColor = { 香港:"#ef4444", 韓國:"#3b82f6", 日本:"#f59e0b", 台灣:"#22c55e", 其他:"#6b7280" };
const shipIcon = { "7-11":"🏪", "全家":"🟢", "宅配":"🚛" };

const SAMPLE_CUSTOMERS = [
  { id:"C001", name:"陳小美", phone:"0912-345-678", lineId:"meimei123", shipMethod:"7-11", preferredStore:"台北忠孝門市", freeShipping:true,  notes:"偏好下午配送", createdAt:"2026/01/15" },
  { id:"C002", name:"林大明", phone:"0923-456-789", lineId:"daming_lin", shipMethod:"宅配", preferredStore:"",          freeShipping:false, notes:"",             createdAt:"2026/02/03" },
  { id:"C003", name:"王小華", phone:"0934-567-890", lineId:"xiahua_w",   shipMethod:"全家", preferredStore:"新竹竹北店", freeShipping:true,  notes:"請勿折疊包裝",  createdAt:"2026/03/20" },
];

const SAMPLE_PRODUCTS = [
  { id:"P001", name:"韓國面膜組合",     origin:"韓國", category:"美妝保養", stock:24, price:380, imageUrl:"", notes:"10片裝" },
  { id:"P002", name:"香港老婆餅禮盒",   origin:"香港", category:"零食伴手", stock:8,  price:260, imageUrl:"", notes:"12入" },
  { id:"P003", name:"日本藥妝護膚組",   origin:"日本", category:"美妝保養", stock:15, price:720, imageUrl:"", notes:"含防曬+乳液" },
  { id:"P004", name:"韓國泡麵箱",       origin:"韓國", category:"食品",     stock:3,  price:450, imageUrl:"", notes:"5口味各4包" },
];

const SAMPLE_ORDERS = [
  { id:"ORD-001", customerId:"C001", customer:"陳小美", status:"paid",     items:[{name:"韓國面膜組合",origin:"韓國",productId:"P001"},{name:"香港老婆餅禮盒",origin:"香港",productId:"P002"}], shipMethod:"7-11", freeShipping:true,  logistics:"", notes:"希望盡快出貨", createdAt:"2026/05/10" },
  { id:"ORD-002", customerId:"C002", customer:"林大明", status:"purchasing",items:[{name:"日本藥妝護膚組",origin:"日本",productId:"P003"}],                                                         shipMethod:"宅配", freeShipping:false, logistics:"", notes:"",             createdAt:"2026/05/12" },
  { id:"ORD-003", customerId:"C003", customer:"王小華", status:"collecting",items:[{name:"香港老婆餅禮盒",origin:"香港",productId:"P002"}],                                                         shipMethod:"全家", freeShipping:false, logistics:"", notes:"先匯款再確認",  createdAt:"2026/05/15" },
];

// ─── Storage (localStorage) ──────────────────────────────────────────────────

async function loadData(key) {
  try {
    const local = localStorage.getItem(key);
    return local ? JSON.parse(local) : null;
  } catch { return null; }
}

async function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch(e) { console.error(e); }
}

function exportAllData() {
  const snap = {
    orders:    JSON.parse(localStorage.getItem("orders_v2")    || "[]"),
    customers: JSON.parse(localStorage.getItem("customers_v1") || "[]"),
    products:  JSON.parse(localStorage.getItem("products_v1")  || "[]"),
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(snap, null, 2)], { type: "application/json" });
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob),
    download: `order-backup-${new Date().toISOString().slice(0,10)}.json`
  });
  a.click();
}

function importAllData(file, cb) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const snap = JSON.parse(e.target.result);
      if (snap.orders)    localStorage.setItem("orders_v2",    JSON.stringify(snap.orders));
      if (snap.customers) localStorage.setItem("customers_v1", JSON.stringify(snap.customers));
      if (snap.products)  localStorage.setItem("products_v1",  JSON.stringify(snap.products));
      cb(snap);
    } catch { alert("匯入失敗，請確認檔案格式正確"); }
  };
  reader.readAsText(file);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genOrderId(orders) {
  const max = orders.reduce((m,o)=>Math.max(m, parseInt(o.id.replace("ORD-",""))||0), 0);
  return `ORD-${String(max+1).padStart(3,"0")}`;
}
function genCustomerId(customers) {
  const max = customers.reduce((m,c)=>Math.max(m, parseInt(c.id.replace("C",""))||0), 0);
  return `C${String(max+1).padStart(3,"0")}`;
}
function genProductId(products) {
  const max = products.reduce((m,p)=>Math.max(m, parseInt(p.id.replace("P",""))||0), 0);
  return `P${String(max+1).padStart(3,"0")}`;
}
function today() { return new Date().toLocaleDateString("zh-TW"); }
function exportCSV(orders, method) {
  const rows = orders.filter(o=>o.shipMethod===method && o.status==="packing");
  if (!rows.length) { alert(`目前無「揀貨包裝」狀態的 ${method} 訂單`); return; }
  const csv = [["訂單編號","客戶","出貨方式","商品","物流編號","免運券","備註"],
    ...rows.map(o=>[o.id,o.customer,o.shipMethod,o.items.map(i=>`${i.name}(${i.origin})`).join("、"),o.logistics,o.freeShipping?"是(附60元)":"否",o.notes])
  ].map(r=>r.map(c=>`"${String(c??"").replace(/"/g,'""')}"`).join(",")).join("\n");
  const a = Object.assign(document.createElement("a"),{ href:URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"})), download:`${method}_${new Date().toISOString().slice(0,10)}.csv` });
  a.click();
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = { bg:"#060d1a", surface:"#0b1628", border:"#1a2d4a", muted:"#334155", sub:"#4a6fa5", text:"#e2e8f0", dim:"#64748b" };
const inp = { width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", color:C.text, fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };
const btn = (accent="#f59e0b") => ({ background:`linear-gradient(135deg,${accent},${accent}cc)`, border:"none", borderRadius:10, padding:"9px 18px", color:"#000", fontWeight:800, fontSize:13, cursor:"pointer" });

function Field({ label, children }) {
  return <div><div style={{ color:C.sub, fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>{label}</div>{children}</div>;
}
function Badge({ text, color }) {
  return <span style={{ background:color+"22", color, fontSize:10, fontWeight:700, borderRadius:4, padding:"2px 7px", flexShrink:0 }}>{text}</span>;
}
function Tag({ children, color="#64748b" }) {
  return <span style={{ background:color+"18", color, fontSize:11, borderRadius:6, padding:"2px 8px", fontWeight:600 }}>{children}</span>;
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id:"kanban",   label:"看板",   emoji:"📋" },
  { id:"customers",label:"客戶",   emoji:"👥" },
  { id:"products", label:"商品庫存",emoji:"🗃" },
];

function Nav({ tab, setTab, role, onSwitchRole, onImport }) {
  const roleInfo = ROLES[role];
  return (
    <div style={{ background:"#08111f", borderBottom:`1px solid ${C.border}`, padding:"0 20px", display:"flex", alignItems:"center", gap:0, flexWrap:"wrap" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginRight:24, paddingRight:24, borderRight:`1px solid ${C.border}` }}>
        <span style={{ fontSize:20 }}>📦</span>
        <div>
          <div style={{ color:C.text, fontWeight:900, fontSize:15, letterSpacing:"-0.02em" }}>訂單管理系統</div>
          <span style={{ background:roleInfo.color+"22", color:roleInfo.color, fontSize:10, fontWeight:700, borderRadius:20, padding:"1px 7px" }}>{roleInfo.emoji} {roleInfo.label}</span>
        </div>
      </div>
      {TABS.map(t=>(
        <button key={t.id} onClick={()=>setTab(t.id)} style={{ background:"none", border:"none", borderBottom:`2px solid ${tab===t.id?"#f59e0b":"transparent"}`, padding:"16px 16px 14px", color:tab===t.id?C.text:C.dim, fontWeight:tab===t.id?700:400, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", gap:6, transition:"color 0.15s", fontFamily:"inherit" }}>
          {t.emoji} {t.label}
        </button>
      ))}
      <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
        <button onClick={exportAllData} title="備份資料" style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 10px", color:C.dim, fontSize:12, cursor:"pointer" }}>⬇ 備份</button>
        <label title="從備份還原" style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 10px", color:C.dim, fontSize:12, cursor:"pointer" }}>
          ⬆ 匯入
          <input type="file" accept=".json" style={{ display:"none" }} onChange={e=>{ if(e.target.files[0]) onImport(e.target.files[0]); }} />
        </label>
        <button onClick={onSwitchRole} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 10px", color:C.dim, fontSize:12, cursor:"pointer" }}>切換身份</button>
      </div>
    </div>
  );
}

// ─── Order Kanban ─────────────────────────────────────────────────────────────

function OrderCard({ order, onClick, onDragStart }) {
  const status = STATUSES.find(s=>s.id===order.status);
  return (
    <div draggable onDragStart={()=>onDragStart(order.id)} onClick={()=>onClick(order)}
      style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:11, padding:"12px 13px", cursor:"grab", userSelect:"none", marginBottom:8, transition:"transform 0.15s,box-shadow 0.15s" }}
      onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow=`0 8px 28px rgba(0,0,0,0.5),0 0 0 1px ${status.color}55`; }}
      onMouseLeave={e=>{ e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow=""; }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
        <span style={{ color:"#2d4a70", fontSize:10, fontFamily:"monospace", fontWeight:700 }}>{order.id}</span>
        <span style={{ fontSize:12 }}>{shipIcon[order.shipMethod]} {order.freeShipping&&"🎫"}</span>
      </div>
      <div style={{ color:C.text, fontWeight:800, fontSize:15, marginBottom:8 }}>{order.customer}</div>
      <div style={{ display:"flex", flexDirection:"column", gap:4, marginBottom:8 }}>
        {order.items.map((item,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", gap:6 }}>
            <Badge text={item.origin} color={originColor[item.origin]} />
            <span style={{ color:C.dim, fontSize:12, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.name}</span>
          </div>
        ))}
      </div>
      {order.logistics && <div style={{ background:"#0d1e35", borderRadius:6, padding:"4px 8px", fontSize:10, color:"#38bdf8", fontFamily:"monospace", marginBottom:6 }}>🔗 {order.logistics.substring(0,20)}{order.logistics.length>20&&"…"}</div>}
      {order.notes && <div style={{ color:C.muted, fontSize:11, borderTop:`1px solid ${C.border}`, paddingTop:7, marginTop:4 }}>💬 {order.notes.length>38?order.notes.substring(0,38)+"…":order.notes}</div>}
      <div style={{ color:"#1e3050", fontSize:10, marginTop:8, textAlign:"right" }}>{order.createdAt}</div>
    </div>
  );
}

function KanbanColumn({ status, orders, onDragOver, onDrop, onDragStart, onCardClick, role }) {
  const [over, setOver] = useState(false);
  const canDrop = role==="boss" || status.role==="warehouse";
  return (
    <div style={{ minWidth:228, width:228, flexShrink:0, background:over&&canDrop?"#0d1e35":C.bg, border:`1px solid ${over&&canDrop?status.color+"66":status.color+"22"}`, borderTop:`3px solid ${status.color}`, borderRadius:12, padding:11, display:"flex", flexDirection:"column", transition:"border 0.15s,background 0.15s" }}
      onDragOver={e=>{ e.preventDefault(); setOver(true); }}
      onDragLeave={()=>setOver(false)}
      onDrop={()=>{ setOver(false); if(canDrop) onDrop(status.id); }}>
      <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:12, paddingBottom:10, borderBottom:`1px solid #0f1e34` }}>
        <span style={{ fontSize:14 }}>{status.emoji}</span>
        <span style={{ color:"#cbd5e1", fontWeight:700, fontSize:12 }}>{status.label}</span>
        <span style={{ marginLeft:"auto", background:status.color+"22", color:status.color, fontSize:10, fontWeight:700, borderRadius:20, padding:"2px 8px" }}>{orders.length}</span>
      </div>
      <div style={{ flex:1, minHeight:60 }}>
        {orders.map(o=><OrderCard key={o.id} order={o} onClick={onCardClick} onDragStart={onDragStart} />)}
      </div>
    </div>
  );
}

function OrderModal({ order, orders, customers, products, role, onClose, onSave, onDelete }) {
  const isNew = !order;
  const [form, setForm] = useState(order ? { ...order, items:order.items.map(i=>({...i})) } : {
    id:genOrderId(orders), customerId:"", customer:"", status:"collecting",
    items:[{ name:"", origin:"日本", productId:"" }],
    shipMethod:"7-11", freeShipping:false, logistics:"", notes:"", createdAt:today(),
  });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const isWarehouse = role==="warehouse";

  const handleCustomerSelect = (cid) => {
    const c = customers.find(c=>c.id===cid);
    if (c) setForm(f=>({ ...f, customerId:c.id, customer:c.name, shipMethod:c.shipMethod, freeShipping:c.freeShipping }));
    else set("customerId","");
  };
  const setItem = (i,k,v) => {
    const items=[...form.items]; items[i]={...items[i],[k]:v};
    if (k==="productId") {
      const p=products.find(p=>p.id===v);
      if(p) items[i]={...items[i], name:p.name, origin:p.origin};
    }
    setForm(f=>({...f,items}));
  };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }} onClick={onClose}>
      <div style={{ background:"#0b1628",border:`1px solid ${C.border}`,borderRadius:16,width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto",padding:28,boxShadow:"0 30px 80px rgba(0,0,0,0.7)" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24 }}>
          <div>
            <div style={{ color:C.sub,fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase" }}>{isNew?"新增訂單":form.id}</div>
            <h2 style={{ color:C.text,fontSize:18,fontWeight:800,margin:"4px 0 0" }}>{isNew?"建立訂單":form.customer||"編輯訂單"}</h2>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",color:C.muted,fontSize:24,cursor:"pointer" }}>×</button>
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
          {!isWarehouse && (
            <Field label="客戶">
              <select value={form.customerId} onChange={e=>handleCustomerSelect(e.target.value)} style={inp}>
                <option value="">— 選擇客戶 —</option>
                {customers.map(c=><option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
              </select>
              {form.customerId && (() => { const c=customers.find(c=>c.id===form.customerId); return c ? (
                <div style={{ background:"#0d1e35",borderRadius:8,padding:"8px 12px",marginTop:6,fontSize:12,color:C.dim }}>
                  📱 {c.phone} ｜ {shipIcon[c.shipMethod]} {c.shipMethod}{c.preferredStore&&` · ${c.preferredStore}`} {c.freeShipping&&"｜🎫 有免運券"}
                </div>
              ) : null; })()}
            </Field>
          )}
          <Field label="訂單狀態">
            <select value={form.status} onChange={e=>set("status",e.target.value)} style={inp}>
              {STATUSES.filter(s=>isWarehouse?s.role==="warehouse":true).map(s=><option key={s.id} value={s.id}>{s.emoji} {s.label}</option>)}
            </select>
          </Field>
          {!isWarehouse && (
            <Field label="商品明細">
              {form.items.map((item,i)=>(
                <div key={i} style={{ display:"flex",gap:8,marginBottom:8 }}>
                  <select value={item.productId||""} onChange={e=>setItem(i,"productId",e.target.value)} style={{ ...inp, flex:2 }}>
                    <option value="">— 選商品 —</option>
                    {products.map(p=><option key={p.id} value={p.id}>{p.name} (庫存:{p.stock})</option>)}
                  </select>
                  <select value={item.origin} onChange={e=>setItem(i,"origin",e.target.value)} style={{ ...inp, flex:1 }}>
                    {ORIGINS.map(o=><option key={o}>{o}</option>)}
                  </select>
                  {form.items.length>1 && <button onClick={()=>setForm(f=>({...f,items:f.items.filter((_,idx)=>idx!==i)}))} style={{ background:"#1a2740",border:"none",color:"#ef4444",borderRadius:8,padding:"0 10px",cursor:"pointer",fontSize:18 }}>−</button>}
                </div>
              ))}
              <button onClick={()=>setForm(f=>({...f,items:[...f.items,{name:"",origin:"日本",productId:""}]}))} style={{ background:"#131f35",border:`1px dashed ${C.border}`,color:C.sub,borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:13,width:"100%" }}>＋ 新增商品</button>
            </Field>
          )}
          {!isWarehouse && (
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
              <Field label="出貨方式">
                <select value={form.shipMethod} onChange={e=>set("shipMethod",e.target.value)} style={inp}>
                  {SHIP_METHODS.map(m=><option key={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="備註">
                <input value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="備註..." style={inp} />
              </Field>
            </div>
          )}
          <Field label="物流編號">
            <input value={form.logistics} onChange={e=>set("logistics",e.target.value)} placeholder="出貨後填入物流編號" style={{ ...inp, fontFamily:"monospace" }} />
          </Field>
          {!isWarehouse && (
            <label style={{ display:"flex",alignItems:"center",gap:10,cursor:"pointer" }}>
              <input type="checkbox" checked={form.freeShipping} onChange={e=>set("freeShipping",e.target.checked)} style={{ width:16,height:16,accentColor:"#f59e0b" }} />
              <span style={{ color:"#94a3b8",fontSize:14 }}>🎫 有免運券（出貨時附 60 元硬幣）</span>
            </label>
          )}
        </div>
        <div style={{ display:"flex",gap:8,marginTop:24,justifyContent:"space-between" }}>
          {!isNew&&!isWarehouse && <button onClick={()=>{ if(confirm("確定刪除？")) onDelete(form.id); }} style={{ background:"none",border:"1px solid #ef444444",color:"#ef4444",borderRadius:10,padding:"9px 14px",cursor:"pointer",fontSize:13 }}>刪除</button>}
          <div style={{ display:"flex",gap:8,marginLeft:"auto" }}>
            <button onClick={onClose} style={{ background:"#131f35",border:`1px solid ${C.border}`,color:C.dim,borderRadius:10,padding:"9px 18px",cursor:"pointer",fontSize:14 }}>取消</button>
            <button onClick={()=>{ if(!form.customer&&!isWarehouse){alert("請選擇客戶");return;} onSave(form); }} style={btn()}>儲存</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function KanbanView({ orders, customers, products, role, onOrdersChange }) {
  const [dragging, setDragging] = useState(null);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [filterShip, setFilterShip] = useState("全部");

  const handleDrop = async (statusId) => {
    if (!dragging) return;
    onOrdersChange(orders.map(o=>o.id===dragging?{...o,status:statusId}:o));
    setDragging(null);
  };
  const handleSave = (form) => {
    const exists = orders.find(o=>o.id===form.id);
    onOrdersChange(exists ? orders.map(o=>o.id===form.id?form:o) : [...orders,form]);
    setModal(null);
  };
  const handleDelete = (id) => { onOrdersChange(orders.filter(o=>o.id!==id)); setModal(null); };

  const filtered = orders.filter(o=>{
    const ms = filterShip==="全部"||o.shipMethod===filterShip;
    const mq = !search||o.customer?.includes(search)||o.id?.includes(search)||o.items?.some(i=>i.name?.includes(search));
    return ms&&mq;
  });

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"calc(100vh - 53px)" }}>
      {/* Toolbar */}
      <div style={{ background:"#08111f",borderBottom:`1px solid ${C.border}`,padding:"10px 20px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap" }}>
        <div style={{ display:"flex",gap:0,overflowX:"auto",flex:1 }}>
          {STATUSES.map(s=>{ const cnt=orders.filter(o=>o.status===s.id).length; return (
            <div key={s.id} style={{ padding:"4px 12px",display:"flex",alignItems:"center",gap:5,flexShrink:0,borderRight:`1px solid ${C.border}` }}>
              <span style={{ fontSize:11 }}>{s.emoji}</span>
              <span style={{ color:C.muted,fontSize:11 }}>{s.label}</span>
              <span style={{ background:s.color+"22",color:s.color,fontSize:10,fontWeight:700,borderRadius:20,padding:"1px 6px" }}>{cnt}</span>
            </div>
          ); })}
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 搜尋…" style={{ ...inp,width:160,padding:"6px 10px",fontSize:12 }} />
        <select value={filterShip} onChange={e=>setFilterShip(e.target.value)} style={{ ...inp,width:"auto",padding:"6px 10px",fontSize:12 }}>
          {["全部",...SHIP_METHODS].map(m=><option key={m}>{m}</option>)}
        </select>
        {role==="warehouse" && SHIP_METHODS.slice(0,2).map(m=>(
          <button key={m} onClick={()=>exportCSV(orders,m)} style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 10px",color:C.dim,fontSize:12,cursor:"pointer" }}>⬇ {m}</button>
        ))}
        {role==="boss" && <button onClick={()=>setModal("new")} style={btn()}>＋ 新增訂單</button>}
      </div>
      {/* Board */}
      <div style={{ display:"flex",gap:10,padding:16,overflowX:"auto",alignItems:"flex-start",flex:1,overflowY:"auto" }}>
        {STATUSES.map(status=>(
          <KanbanColumn key={status.id} status={status} orders={filtered.filter(o=>o.status===status.id)} role={role}
            onDragStart={id=>setDragging(id)} onDragOver={()=>{}} onDrop={handleDrop} onCardClick={o=>setModal(o)} />
        ))}
      </div>
      {modal && <OrderModal order={modal==="new"?null:modal} orders={orders} customers={customers} products={products} role={role} onClose={()=>setModal(null)} onSave={handleSave} onDelete={handleDelete} />}
    </div>
  );
}

// ─── Customer Table ───────────────────────────────────────────────────────────

function CustomerModal({ customer, customers, onClose, onSave, onDelete }) {
  const isNew = !customer;
  const [form, setForm] = useState(customer ? {...customer} : {
    id:genCustomerId(customers), name:"", phone:"", lineId:"",
    shipMethod:"7-11", preferredStore:"", freeShipping:false, notes:"", createdAt:today(),
  });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }} onClick={onClose}>
      <div style={{ background:"#0b1628",border:`1px solid ${C.border}`,borderRadius:16,width:"100%",maxWidth:500,padding:28,boxShadow:"0 30px 80px rgba(0,0,0,0.7)" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24 }}>
          <div>
            <div style={{ color:C.sub,fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase" }}>{isNew?"新增客戶":form.id}</div>
            <h2 style={{ color:C.text,fontSize:18,fontWeight:800,margin:"4px 0 0" }}>{isNew?"建立客戶檔案":form.name}</h2>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",color:C.muted,fontSize:24,cursor:"pointer" }}>×</button>
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
            <Field label="姓名"><input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="客戶姓名" style={inp} /></Field>
            <Field label="電話"><input value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="09XX-XXX-XXX" style={inp} /></Field>
          </div>
          <Field label="Line ID"><input value={form.lineId} onChange={e=>set("lineId",e.target.value)} placeholder="Line ID" style={inp} /></Field>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
            <Field label="偏好出貨方式">
              <select value={form.shipMethod} onChange={e=>set("shipMethod",e.target.value)} style={inp}>
                {SHIP_METHODS.map(m=><option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="偏好門市/地址"><input value={form.preferredStore} onChange={e=>set("preferredStore",e.target.value)} placeholder="門市名稱或地址" style={inp} /></Field>
          </div>
          <label style={{ display:"flex",alignItems:"center",gap:10,cursor:"pointer" }}>
            <input type="checkbox" checked={form.freeShipping} onChange={e=>set("freeShipping",e.target.checked)} style={{ width:16,height:16,accentColor:"#f59e0b" }} />
            <span style={{ color:"#94a3b8",fontSize:14 }}>🎫 持有免運券（出貨附 60 元硬幣）</span>
          </label>
          <Field label="備註"><textarea value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="備註..." rows={2} style={{ ...inp,resize:"vertical" }} /></Field>
        </div>
        <div style={{ display:"flex",gap:8,marginTop:24,justifyContent:"space-between" }}>
          {!isNew && <button onClick={()=>{ if(confirm("確定刪除此客戶？")) onDelete(form.id); }} style={{ background:"none",border:"1px solid #ef444444",color:"#ef4444",borderRadius:10,padding:"9px 14px",cursor:"pointer",fontSize:13 }}>刪除</button>}
          <div style={{ display:"flex",gap:8,marginLeft:"auto" }}>
            <button onClick={onClose} style={{ background:"#131f35",border:`1px solid ${C.border}`,color:C.dim,borderRadius:10,padding:"9px 18px",cursor:"pointer",fontSize:14 }}>取消</button>
            <button onClick={()=>{ if(!form.name){alert("請填入姓名");return;} onSave(form); }} style={btn("#10b981")}>儲存</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomersView({ customers, onCustomersChange }) {
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const filtered = customers.filter(c=>!search||c.name.includes(search)||c.id.includes(search)||c.phone?.includes(search)||c.lineId?.includes(search));
  const handleSave = (form) => {
    const exists = customers.find(c=>c.id===form.id);
    onCustomersChange(exists ? customers.map(c=>c.id===form.id?form:c) : [...customers,form]);
    setModal(null);
  };
  const handleDelete = (id) => { onCustomersChange(customers.filter(c=>c.id!==id)); setModal(null); };

  return (
    <div style={{ padding:24 }}>
      <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:20 }}>
        <div><h2 style={{ color:C.text,fontSize:18,fontWeight:800,margin:0 }}>👥 客戶資料庫</h2><div style={{ color:C.dim,fontSize:12,marginTop:2 }}>共 {customers.length} 位客戶</div></div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 搜尋客戶…" style={{ ...inp,width:200,marginLeft:"auto",padding:"7px 11px",fontSize:13 }} />
        <button onClick={()=>setModal("new")} style={btn("#10b981")}>＋ 新增客戶</button>
      </div>

      <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden" }}>
        {/* Header */}
        <div style={{ display:"grid",gridTemplateColumns:"80px 1fr 130px 110px 130px 80px 1fr",gap:0,background:"#0d1e35",borderBottom:`1px solid ${C.border}`,padding:"10px 16px" }}>
          {["客編","姓名","電話","Line ID","出貨偏好","免運券","備註"].map(h=>(
            <div key={h} style={{ color:C.sub,fontSize:11,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase" }}>{h}</div>
          ))}
        </div>
        {filtered.length===0 && <div style={{ padding:40,textAlign:"center",color:C.muted }}>尚無客戶資料</div>}
        {filtered.map((c,i)=>(
          <div key={c.id} onClick={()=>setModal(c)} style={{ display:"grid",gridTemplateColumns:"80px 1fr 130px 110px 130px 80px 1fr",gap:0,padding:"12px 16px",borderBottom:i<filtered.length-1?`1px solid ${C.border}`:"none",cursor:"pointer",transition:"background 0.12s" }}
            onMouseEnter={e=>e.currentTarget.style.background="#0d1e35"}
            onMouseLeave={e=>e.currentTarget.style.background=""}>
            <div style={{ color:"#2d4a70",fontSize:11,fontFamily:"monospace",fontWeight:700,alignSelf:"center" }}>{c.id}</div>
            <div style={{ color:C.text,fontWeight:700,fontSize:14,alignSelf:"center" }}>{c.name}</div>
            <div style={{ color:C.dim,fontSize:13,alignSelf:"center" }}>{c.phone||"—"}</div>
            <div style={{ color:C.dim,fontSize:13,alignSelf:"center" }}>{c.lineId||"—"}</div>
            <div style={{ alignSelf:"center",display:"flex",flexDirection:"column",gap:3 }}>
              <Tag color={c.shipMethod==="7-11"?"#f59e0b":c.shipMethod==="全家"?"#10b981":"#3b82f6"}>{shipIcon[c.shipMethod]} {c.shipMethod}</Tag>
              {c.preferredStore && <span style={{ color:C.dim,fontSize:11 }}>{c.preferredStore}</span>}
            </div>
            <div style={{ alignSelf:"center" }}>{c.freeShipping?<span style={{ color:"#f59e0b",fontSize:16 }}>🎫</span>:<span style={{ color:C.muted,fontSize:13 }}>—</span>}</div>
            <div style={{ color:C.muted,fontSize:12,alignSelf:"center",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{c.notes||"—"}</div>
          </div>
        ))}
      </div>
      {modal && <CustomerModal customer={modal==="new"?null:modal} customers={customers} onClose={()=>setModal(null)} onSave={handleSave} onDelete={handleDelete} />}
    </div>
  );
}

// ─── Product Table ────────────────────────────────────────────────────────────

function ProductModal({ product, products, onClose, onSave, onDelete }) {
  const isNew = !product;
  const [form, setForm] = useState(product ? {...product} : {
    id:genProductId(products), name:"", origin:"日本", category:"",
    stock:0, price:0, imageUrl:"", notes:"",
  });
  const [preview, setPreview] = useState(form.imageUrl||"");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setPreview(ev.target.result); set("imageUrl", ev.target.result); };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }} onClick={onClose}>
      <div style={{ background:"#0b1628",border:`1px solid ${C.border}`,borderRadius:16,width:"100%",maxWidth:520,padding:28,boxShadow:"0 30px 80px rgba(0,0,0,0.7)" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24 }}>
          <div>
            <div style={{ color:C.sub,fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase" }}>{isNew?"新增商品":form.id}</div>
            <h2 style={{ color:C.text,fontSize:18,fontWeight:800,margin:"4px 0 0" }}>{isNew?"新增商品":form.name}</h2>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",color:C.muted,fontSize:24,cursor:"pointer" }}>×</button>
        </div>

        <div style={{ display:"flex",gap:16,marginBottom:16 }}>
          {/* Image upload */}
          <div>
            <div style={{ width:100,height:100,background:"#0d1e35",border:`2px dashed ${C.border}`,borderRadius:10,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",position:"relative" }}
              onClick={()=>document.getElementById("img-upload").click()}>
              {preview ? <img src={preview} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }} /> : <div style={{ textAlign:"center",color:C.muted,fontSize:12 }}>📷<br/>上傳圖片</div>}
            </div>
            <input id="img-upload" type="file" accept="image/*" onChange={handleImage} style={{ display:"none" }} />
            <div style={{ color:C.dim,fontSize:10,textAlign:"center",marginTop:4 }}>點擊上傳</div>
          </div>
          <div style={{ flex:1,display:"flex",flexDirection:"column",gap:12 }}>
            <Field label="商品名稱"><input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="商品名稱" style={inp} /></Field>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
              <Field label="來源地">
                <select value={form.origin} onChange={e=>set("origin",e.target.value)} style={inp}>
                  {ORIGINS.map(o=><option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="分類"><input value={form.category} onChange={e=>set("category",e.target.value)} placeholder="美妝/食品…" style={inp} /></Field>
            </div>
          </div>
        </div>

        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14 }}>
          <Field label="庫存數量">
            <input type="number" value={form.stock} onChange={e=>set("stock",parseInt(e.target.value)||0)} min={0} style={inp} />
          </Field>
          <Field label="售價 (NT$)">
            <input type="number" value={form.price} onChange={e=>set("price",parseInt(e.target.value)||0)} min={0} style={inp} />
          </Field>
        </div>
        <Field label="備註"><input value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="規格、說明…" style={inp} /></Field>

        <div style={{ display:"flex",gap:8,marginTop:24,justifyContent:"space-between" }}>
          {!isNew && <button onClick={()=>{ if(confirm("確定刪除此商品？")) onDelete(form.id); }} style={{ background:"none",border:"1px solid #ef444444",color:"#ef4444",borderRadius:10,padding:"9px 14px",cursor:"pointer",fontSize:13 }}>刪除</button>}
          <div style={{ display:"flex",gap:8,marginLeft:"auto" }}>
            <button onClick={onClose} style={{ background:"#131f35",border:`1px solid ${C.border}`,color:C.dim,borderRadius:10,padding:"9px 18px",cursor:"pointer",fontSize:14 }}>取消</button>
            <button onClick={()=>{ if(!form.name){alert("請填入商品名稱");return;} onSave(form); }} style={btn("#8b5cf6")}>儲存</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductsView({ products, onProductsChange }) {
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [filterOrigin, setFilterOrigin] = useState("全部");
  const filtered = products.filter(p=>{
    const mo = filterOrigin==="全部"||p.origin===filterOrigin;
    const mq = !search||p.name.includes(search)||p.id.includes(search)||p.category?.includes(search);
    return mo&&mq;
  });
  const handleSave = (form) => {
    const exists = products.find(p=>p.id===form.id);
    onProductsChange(exists ? products.map(p=>p.id===form.id?form:p) : [...products,form]);
    setModal(null);
  };
  const handleDelete = (id) => { onProductsChange(products.filter(p=>p.id!==id)); setModal(null); };

  return (
    <div style={{ padding:24 }}>
      <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:20,flexWrap:"wrap" }}>
        <div><h2 style={{ color:C.text,fontSize:18,fontWeight:800,margin:0 }}>🗃 商品庫存</h2><div style={{ color:C.dim,fontSize:12,marginTop:2 }}>共 {products.length} 件商品</div></div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 搜尋商品…" style={{ ...inp,width:180,marginLeft:"auto",padding:"7px 11px",fontSize:13 }} />
        <select value={filterOrigin} onChange={e=>setFilterOrigin(e.target.value)} style={{ ...inp,width:"auto",padding:"7px 10px",fontSize:13 }}>
          {["全部",...ORIGINS].map(o=><option key={o}>{o}</option>)}
        </select>
        <button onClick={()=>setModal("new")} style={btn("#8b5cf6")}>＋ 新增商品</button>
      </div>

      {/* Grid view */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:14 }}>
        {filtered.length===0 && <div style={{ gridColumn:"1/-1",padding:40,textAlign:"center",color:C.muted }}>尚無商品資料</div>}
        {filtered.map(p=>(
          <div key={p.id} onClick={()=>setModal(p)} style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",cursor:"pointer",transition:"transform 0.15s,box-shadow 0.15s" }}
            onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 12px 32px rgba(0,0,0,0.4),0 0 0 1px #8b5cf644"; }}
            onMouseLeave={e=>{ e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow=""; }}>
            {/* Image */}
            <div style={{ height:130,background:"#0d1e35",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",position:"relative" }}>
              {p.imageUrl ? <img src={p.imageUrl} alt={p.name} style={{ width:"100%",height:"100%",objectFit:"cover" }} /> : <div style={{ fontSize:36 }}>📦</div>}
              <div style={{ position:"absolute",top:8,left:8 }}>
                <Badge text={p.origin} color={originColor[p.origin]} />
              </div>
              <div style={{ position:"absolute",top:8,right:8,background:p.stock<=3?"#ef444422":"#10b98122",color:p.stock<=3?"#ef4444":"#10b981",fontSize:11,fontWeight:700,borderRadius:6,padding:"2px 8px" }}>
                庫存 {p.stock}
              </div>
            </div>
            <div style={{ padding:"12px 14px" }}>
              <div style={{ color:"#2d4a70",fontSize:10,fontFamily:"monospace",fontWeight:700,marginBottom:4 }}>{p.id}</div>
              <div style={{ color:C.text,fontWeight:700,fontSize:14,marginBottom:6 }}>{p.name}</div>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                {p.category && <Tag color="#8b5cf6">{p.category}</Tag>}
                <span style={{ color:"#f59e0b",fontWeight:700,fontSize:14,marginLeft:"auto" }}>NT$ {p.price.toLocaleString()}</span>
              </div>
              {p.notes && <div style={{ color:C.muted,fontSize:11,marginTop:8 }}>{p.notes}</div>}
            </div>
          </div>
        ))}
      </div>

      {modal && <ProductModal product={modal==="new"?null:modal} products={products} onClose={()=>setModal(null)} onSave={handleSave} onDelete={handleDelete} />}
    </div>
  );
}

// ─── Role Select ──────────────────────────────────────────────────────────────

function RoleSelect({ onSelect }) {
  return (
    <div style={{ minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:32 }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:52,marginBottom:12 }}>📦</div>
        <h1 style={{ color:C.text,fontSize:28,fontWeight:900,margin:0,letterSpacing:"-0.03em" }}>訂單管理系統</h1>
        <p style={{ color:C.muted,marginTop:8,fontSize:14 }}>請選擇你的身份進入</p>
      </div>
      <div style={{ display:"flex",gap:16,flexWrap:"wrap",justifyContent:"center" }}>
        {Object.entries(ROLES).map(([key,r])=>(
          <button key={key} onClick={()=>onSelect(key)} style={{ background:"linear-gradient(135deg,#0d1e35,#0b1628)",border:`1px solid ${r.color}33`,borderRadius:16,padding:"32px 44px",cursor:"pointer",textAlign:"center",transition:"transform 0.15s,border 0.15s,box-shadow 0.15s",display:"flex",flexDirection:"column",gap:10,alignItems:"center" }}
            onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.boxShadow=`0 20px 48px rgba(0,0,0,0.4),0 0 0 1px ${r.color}55`; e.currentTarget.style.border=`1px solid ${r.color}88`; }}
            onMouseLeave={e=>{ e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow=""; e.currentTarget.style.border=`1px solid ${r.color}33`; }}>
            <span style={{ fontSize:44 }}>{r.emoji}</span>
            <span style={{ color:r.color,fontWeight:800,fontSize:20 }}>{r.label}</span>
            <span style={{ color:C.muted,fontSize:12,maxWidth:150,lineHeight:1.6 }}>
              {key==="boss"?"收單・採購・建立訂單・管理客戶與商品":"入倉・揀貨・出貨・填寫物流編號"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [role, setRole] = useState(null);
  const [tab, setTab] = useState("kanban");
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    const [o, c, p] = await Promise.all([loadData("orders_v2"), loadData("customers_v1"), loadData("products_v1")]);
    if (o) setOrders(o); else setOrders(SAMPLE_ORDERS);
    if (c) setCustomers(c); else setCustomers(SAMPLE_CUSTOMERS);
    if (p) setProducts(p); else setProducts(SAMPLE_PRODUCTS);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleOrders    = async (next) => { setOrders(next);    await saveData("orders_v2",    next); };
  const handleCustomers = async (next) => { setCustomers(next); await saveData("customers_v1", next); };
  const handleProducts  = async (next) => { setProducts(next);  await saveData("products_v1",  next); };

  const handleImport = (file) => {
    importAllData(file, (snap) => {
      if (snap.orders)    setOrders(snap.orders);
      if (snap.customers) setCustomers(snap.customers);
      if (snap.products)  setProducts(snap.products);
      alert("✅ 資料匯入成功！");
    });
  };

  if (!role) return <RoleSelect onSelect={r=>{ setRole(r); setTab("kanban"); }} />;
  if (loading) return <div style={{ minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",color:C.dim,fontSize:16 }}>載入中…</div>;

  return (
    <div style={{ minHeight:"100vh",background:C.bg,fontFamily:"'Noto Sans TC','PingFang TC',sans-serif",color:C.text }}>
      <Nav tab={tab} setTab={setTab} role={role} onSwitchRole={()=>setRole(null)} onImport={handleImport} />
      {tab==="kanban"    && <KanbanView    orders={orders}    customers={customers} products={products} role={role} onOrdersChange={handleOrders} />}
      {tab==="customers" && <CustomersView customers={customers} onCustomersChange={handleCustomers} />}
      {tab==="products"  && <ProductsView  products={products}  onProductsChange={handleProducts} />}
    </div>
  );
}
