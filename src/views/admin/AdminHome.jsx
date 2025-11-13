// src/views/admin/AdminHome.jsx
import React, { useEffect, useMemo, useState } from "react"

/* ========== storage helpers ========== */
const read = (k, fb) => { try { return JSON.parse(localStorage.getItem(k) ?? JSON.stringify(fb)); } catch { return fb; } }
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v))

const readSales            = () => read("sales", [])
const writeSales           = (rows) => write("sales", rows)
const readAssignments      = () => read("assignments", [])
const writeAssignments     = (rows) => write("assignments", rows)
const readUsers            = () => read("users_seed", [])
const readNeighborhoods    = () => read("neighborhoodAssignments", [])
const writeNeighborhoods   = (rows) => write("neighborhoodAssignments", rows)

/* ========== tiny utils ========== */
const money = (n)=> (isFinite(+n) ? `$${(+n).toFixed(2)}` : "-")
const fmtDateOnly = (t) => {
  if (t === null || t === undefined || t === "") return "-";
  const d = parseLocalDateTime(t);
  if (!d) return "-";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

/* ========== LOCAL-TIME DATE HELPERS (no UTC / toISOString) ========== */
const todayLocalYMD = () => {
  const d = new Date();
  d.setHours(0,0,0,0);
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const da = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${da}`;
};
const toYMD = (d) => {
  if (!(d instanceof Date) || isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const da = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${da}`;
};
const toHM = (d) => {
  if (!(d instanceof Date) || isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2,"0");
  const mm = String(d.getMinutes()).padStart(2,"0");
  return `${hh}:${mm}`;
};

/** Parse strings or numbers into a LOCAL Date (Houston). Returns Date or null. */
function parseLocalDateTime(input) {
  if (input === null || input === undefined || input === "") return null;
  if (typeof input === "number") {
    const ms = input < 1e12 ? input * 1000 : input; // support seconds or milliseconds
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  const s = String(input).trim();

  // ISO-like / date-only: YYYY-MM-DD or with time
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?$/);
  if (m) {
    const y = +m[1], mo = +m[2], da = +m[3], hh = +(m[4] ?? 0), mm = +(m[5] ?? 0);
    const d = new Date(y, mo - 1, da, hh, mm, 0, 0); // LOCAL time
    return isNaN(d.getTime()) ? null : d;
  }

  // Extended ISO with seconds and optional timezone (treat as LOCAL wall time)
  // Examples handled: 2025-11-11T12:45:00Z, 2025-11-11 12:45:00-05:00, 2025-11-11T12:45:00.000+0000
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/i);
  if (m2) {
    const y = +m2[1], mo = +m2[2], da = +m2[3], hh = +m2[4], mm = +m2[5], ss = +(m2[6] ?? 0);
    const d = new Date(y, mo - 1, da, hh, mm, ss, 0); // LOCAL time, ignore timezone suffix
    return isNaN(d.getTime()) ? null : d;
  }

  // Month-name smart parse (LOCAL)
  const monthNames = ["jan","feb","mar","apr","may","jun","jul","aug","sep","sept","oct","nov","dec"];
  const monthRx = new RegExp(`\\b(${monthNames.join("|")})[a-z]*\\b`, "i");
  const dayRx   = /\b([0-2]?\d|3[01])\b/;
  const timeRx  = /(\d{1,2})(?::(\d{2}))?\s*([ap]m)?/i;

  const monthMatch = s.match(monthRx);
  const dayMatch   = s.match(dayRx);
  const timeMatch  = s.match(timeRx);

  if (monthMatch && dayMatch) {
    const token = monthMatch[1].toLowerCase();
    const monthIndex = ["jan","feb","mar","apr","may","jun","jul","aug","sep","sept","oct","nov","dec"].indexOf(token);
    const dayNum     = +dayMatch[1];
    let year         = new Date().getFullYear();

    let hh = 0, mm = 0;
    if (timeMatch) {
      hh = +timeMatch[1]; mm = +(timeMatch[2] ?? 0);
      const ap = (timeMatch[3] || "").toLowerCase();
      const assumePM = !ap && hh >= 1 && hh <= 8;
      if (ap === "pm" || assumePM) { if (hh < 12) hh += 12; }
      else if (ap === "am" && hh === 12) { hh = 0; }
    }

    let d = new Date(year, monthIndex, dayNum, hh, mm, 0, 0);
    if (!isNaN(d.getTime())) {
      const now = new Date();
      const tenMonthsMs = 1000*60*60*24*30*10;
      if (d.getTime() + tenMonthsMs < now.getTime()) {
        d = new Date(year + 1, monthIndex, dayNum, hh, mm, 0, 0);
      }
      return d;
    }
  }

  // Fallback: native Date then recompose as LOCAL
  const naive = new Date(s);
  if (!isNaN(naive.getTime())) {
    return new Date(
      naive.getFullYear(),
      naive.getMonth(),
      naive.getDate(),
      naive.getHours(),
      naive.getMinutes(),
      naive.getSeconds(),
      naive.getMilliseconds()
    );
  }
  return null;
}

/** Back-compat helpers used below */
const toLocalDateStr = (v) => {
  const d = parseLocalDateTime(v);
  return d ? toYMD(d) : "";
};
const toLocalHM = (v) => {
  const d = parseLocalDateTime(v);
  return d ? toHM(d) : "";
};
function toLocalISO(dateStr) {
  if (!dateStr) return todayLocalYMD();
  const d = parseLocalDateTime(dateStr);
  return d ? toYMD(d) : todayLocalYMD();
}

/* ========== centered cell styles ========== */
const cellCenter = {
  padding: "8px 10px",
  textAlign: "center",
  verticalAlign: "middle",
}
const inputCenter = {
  width: "100%",
  padding: "6px 8px",
  border: "1px solid var(--border)",
  borderRadius: 8,
  outline: "none",
  background: "var(--card)",
  color: "var(--text)",
  fontWeight: 600,
  textAlign: "center",
}


export default function AdminHome(){
  const [sales, setSales] = useState(readSales())
  const [assignments, setAssignments] = useState(readAssignments())
  const [hoods, setHoods] = useState(readNeighborhoods())

  // one-shot refresh from localStorage (used on mount and on realtime events)
  function refreshFromStorage() {
    setSales(readSales());
    setAssignments(readAssignments());
    setHoods(readNeighborhoods());
  }

  const users = useMemo(()=> readUsers(), [])
  const salesmen = useMemo(()=> users.filter(u =>
    u.role === "seller" || u.role === "hybrid" || u.role === "admin"
  ), [users])
  const workers = useMemo(()=> users.filter(u =>
    u.role === "worker" || u.role === "hybrid" || u.role === "admin"
  ), [users])

  /* live refresh from global "db-refresh" (fired by Header on Supabase changes) */
  useEffect(() => {
    const onRefresh = () => refreshFromStorage();
    window.addEventListener("db-refresh", onRefresh);
    // also refresh once on mount to ensure we have the latest snapshot
    refreshFromStorage();
    return () => window.removeEventListener("db-refresh", onRefresh);
  }, []);

  /* One-time migration: convert any stored date strings into epoch (local) */
  useEffect(() => {
    let changed = false;

    const a0 = readAssignments();
    const a1 = a0.map(a => {
      if (typeof a.when === "string" && a.when) {
        const d = parseLocalDateTime(a.when);
        if (d) { changed = true; return { ...a, when: d.getTime() }; }
      }
      return a;
    });
    if (changed) writeAssignments(a1);

    const h0 = readNeighborhoods();
    const h1 = h0.map(h => {
      if (typeof h.day === "string" && h.day) {
        const d = parseLocalDateTime(h.day);
        if (d) { changed = true; return { ...h, day: d.getTime() }; }
      }
      return h;
    });
    if (changed) writeNeighborhoods(h1);

    const s0 = readSales();
    const s1 = s0.map(s => {
      if (typeof s.createdAt === "string" && s.createdAt) {
        const d = parseLocalDateTime(s.createdAt);
        if (d) { changed = true; return { ...s, createdAt: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0,0,0,0).getTime() }; }
      }
      return s;
    });
    if (changed) writeSales(s1);

    if (changed) refreshFromStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // responsive: switch tables to vertical cards on narrow screens
  const [isNarrow, setIsNarrow] = useState(() => {
    try { return window.matchMedia("(max-width: 720px)").matches; } catch { return false; }
  });
  useEffect(() => {
    try {
      const mq = window.matchMedia("(max-width: 720px)");
      const handler = (e) => setIsNarrow(e.matches);
      if (mq.addEventListener) mq.addEventListener("change", handler);
      else if (mq.addListener) mq.addListener(handler);
      return () => {
        if (mq.removeEventListener) mq.removeEventListener("change", handler);
        else if (mq.removeListener) mq.removeListener(handler);
      };
    } catch {}
  }, []);

  /* ====== RECENT SALES (descending by createdAt) ====== */
  const recentSales = useMemo(()=>{
    return [...sales]
      .sort((a,b)=> (b?.createdAt||0) - (a?.createdAt||0))
      .slice(0, 20)
  }, [sales])

  /* ====== UPCOMING ASSIGNMENTS (future by parsed when) ====== */
  const upcoming = useMemo(()=>{
    const now = Date.now()
    return assignments
      .filter(a=> a.status === "assigned")
      .map(a=>{
        const s = sales.find(x=> String(x.id)===String(a.saleId))
        const d = parseLocalDateTime(a.when || "")
        return {
          ...a,
          _sale: s,
          _whenDate: d,
          _worker1Name: users.find(u=>u.email===a.workerEmail)?.name || a.workerEmail || "-",
          _worker2Name: users.find(u=>u.email===a.worker2Email)?.name || a.worker2Email || "-",
          salesmanName: s?.sellerName || s?.sellerEmail || "-",
          salesmanEmail: s?.sellerEmail || "",
        }
      })
      .filter(a=> !a._whenDate || a._whenDate.getTime() >= now)
      .sort((a,b)=>{
        const at = a._whenDate ? a._whenDate.getTime() : Infinity
        const bt = b._whenDate ? b._whenDate.getTime() : Infinity
        return at - bt
      })
      .slice(0, 30)
  }, [assignments, sales, users])

  /* ====== UPCOMING NEIGHBORHOODS (from neighborhoodAssignments) ====== */
  const upcomingHoods = useMemo(()=>{
    const now = Date.now()
    return (hoods||[])
      .map(h=> ({
        ...h,
        _whenDate: parseLocalDateTime(h.day || h.dateISO || ""),
      }))
      .filter(h=> !h._whenDate || h._whenDate.getTime() >= now)
      .sort((a,b)=>{
        const at = a._whenDate ? a._whenDate.getTime() : Infinity
        const bt = b._whenDate ? b._whenDate.getTime() : Infinity
        return at - bt
      })
      .slice(0, 50)
  }, [hoods])

  /* edit toggles */
  const [editRecent, setEditRecent] = useState(false)
  const [editUpcoming, setEditUpcoming] = useState(false)
  const [editUpcomingHoods, setEditUpcomingHoods] = useState(false)

  /* patch helpers: Sales */
  function patchSale(id, field, value) {
    const next = readSales().map(s => {
      if (String(s.id) !== String(id)) return s;
      if (field === "createdAt") {
        const parsed = parseLocalDateTime(value);
        const stored = parsed
          ? new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0).getTime()
          : s.createdAt;
        return { ...s, createdAt: stored };
      }
      if (field === "status") {
        return { ...s, status: value };
      }
      return { ...s, [field]: value };
    });
    writeSales(next);
    setSales(next);
  }

  /* patch helpers: Assignments */
  function patchAssignment(id, field, value){
    const next = readAssignments().map(a=>{
      if(a.id!==id) return a
      if(field === "when") {
        const parsed = parseLocalDateTime(value)
        const stored = parsed ? parsed.getTime() : a.when
        return {...a, when: stored}
      }
      if(["workerEmail","worker2Email","status","salesmanEmail"].includes(field)){
        return {...a, [field]: value}
      }
      return a
    })
    writeAssignments(next); setAssignments(next)
  }
  function deleteAssignment(id){
    if (!window.confirm("Delete this assignment?")) return;
    const next = readAssignments().filter(a=> a.id !== id)
    writeAssignments(next); setAssignments(next)
  }

  /* patch helpers: Neighborhoods */
  function patchHood(id, field, value){
    const next = readNeighborhoods().map(h=>{
      if(h.id!==id) return h
      if(field==="sellerEmail"){
        const u = users.find(u=>u.email===value)
        return {...h, sellerEmail:value, sellerName:u?.name||value}
      }
      if(field==="neighborhood"){ return {...h, neighborhood:value} }
      if(field==="day") {
        const parsed = parseLocalDateTime(value)
        const stored = parsed ? parsed.getTime() : h.day
        return {...h, day: stored}
      }
      if(field==="notes"){ return {...h, notes:value} }
      return h
    })
    writeNeighborhoods(next); setHoods(next)
  }
  function deleteHood(id){
    if (!window.confirm("Delete this neighborhood?")) return;
    const next = readNeighborhoods().filter(h=> h.id !== id)
    writeNeighborhoods(next); setHoods(next)
  }

  // Add Row States
  const [newSale, setNewSale] = useState({
    name: "",
    sellerEmail: "",
    phone: "",
    address: "",
    price: "",
    notes: "",
    status: "unassigned",
    createdAt: "",
  });
  const [newAssignment, setNewAssignment] = useState({
    when: "",
    salesmanEmail: "",
    customer: "",
    address: "",
    workerEmail: "",
    worker2Email: "",
  });
  const [newHood, setNewHood] = useState({
    day: "",
    sellerEmail: "",
    neighborhood: "",
    notes: "",
  });

  // Add Sale
  function handleAddSale(){
    if (!newSale.name && !newSale.address) return;
    const u = users.find(u=>u.email===newSale.sellerEmail)

    let createdAt;
    if (newSale.createdAt) {
      const parsed = parseLocalDateTime(newSale.createdAt)
      createdAt = parsed
        ? new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0).getTime()
        : Date.now()
    } else {
      const d0 = parseLocalDateTime(`${todayLocalYMD()} 00:00`);
      createdAt = d0 ? d0.getTime() : Date.now();
    }

    const row = {
      ...newSale,
      id: String(Date.now()) + Math.random().toString(36).slice(2,6),
      sellerName: u?.name || "",
      createdAt,
      status: newSale.status || "unassigned",
    }
    const next = [row, ...readSales()]
    writeSales(next); setSales(next)
    setNewSale({
      name: "",
      sellerEmail: "",
      phone: "",
      address: "",
      price: "",
      notes: "",
      status: "unassigned",
      createdAt: "",
    })
  }
  function handleDeleteSale(id){
    if (!window.confirm("Delete this sale?")) return;
    const next = readSales().filter(s=>String(s.id)!==String(id))
    writeSales(next); setSales(next)
  }

  // Add Assignment
  function handleAddAssignment(){
    if (!newAssignment.customer && !newAssignment.address) return;
    // Try to find sale by customer name or address
    const sale = sales.find(s =>
      (newAssignment.customer && s.name === newAssignment.customer) ||
      (newAssignment.address && s.address === newAssignment.address)
    )
    const sEmail = newAssignment.salesmanEmail || sale?.sellerEmail || ""
    const sName = users.find(u=>u.email===sEmail)?.name || ""

    let when = ""
    if (newAssignment.when) {
      const parsed = parseLocalDateTime(newAssignment.when)
      when = parsed ? parsed.getTime() : ""
    }

    const row = {
      id: String(Date.now()) + Math.random().toString(36).slice(2,6),
      when,
      saleId: sale?.id || "",
      status: "assigned",
      workerEmail: newAssignment.workerEmail,
      worker2Email: newAssignment.worker2Email,
      salesmanEmail: sEmail,
      salesmanName: sName,
      // For display only:
      _sale: sale,
      _worker1Name: users.find(u=>u.email===newAssignment.workerEmail)?.name||newAssignment.workerEmail||"-",
      _worker2Name: users.find(u=>u.email===newAssignment.worker2Email)?.name||newAssignment.worker2Email||"-",
    }
    const next = [row, ...readAssignments()]
    writeAssignments(next); setAssignments(next)
    setNewAssignment({
      when: "",
      salesmanEmail: "",
      customer: "",
      address: "",
      workerEmail: "",
      worker2Email: "",
    })
  }

  // Add Neighborhood
  function handleAddHood(){
    if (!newHood.neighborhood) return;
    const u = users.find(u=>u.email===newHood.sellerEmail)

    let day = ""
    if (newHood.day) {
      const parsed = parseLocalDateTime(newHood.day)
      day = parsed ? parsed.getTime() : ""
    }

    const row = {
      id: String(Date.now()) + Math.random().toString(36).slice(2,6),
      day,
      sellerEmail: newHood.sellerEmail,
      sellerName: u?.name || "",
      neighborhood: newHood.neighborhood,
      notes: newHood.notes,
    }
    const next = [row, ...readNeighborhoods()]
    writeNeighborhoods(next); setHoods(next)
    setNewHood({
      day: "",
      sellerEmail: "",
      neighborhood: "",
      notes: "",
    })
  }

  return (
    <div className="grid" style={{ paddingTop: "calc(var(--topbar, 60px) + 40px)" }}>

      {/* ================= RECENT SALES ================= */}
      <div className="card">
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <h2 className="section-title">Recent Sales</h2>
          <button className="btn outline" onClick={()=>setEditRecent(v=>!v)}>
            {editRecent ? "Done" : "Edit"}
          </button>
        </div>
        {!isNarrow ? (
          <table className="table">
            <thead>
              <tr>
                <th style={cellCenter}>Customer</th>
                <th style={cellCenter}>Salesman</th>
                <th style={cellCenter}>Phone</th>
                <th style={cellCenter}>Address</th>
                <th style={cellCenter}>Price</th>
                <th style={cellCenter}>Notes</th>
                <th style={cellCenter}>Status</th>
                <th style={cellCenter}>Date</th>
                {editRecent && <th style={cellCenter}></th>}
              </tr>
            </thead>
            <tbody>
              {recentSales.length===0 && (
                <tr><td colSpan={editRecent?9:8} style={{...cellCenter, color:"var(--muted)"}}>No sales.</td></tr>
              )}
              {recentSales.map((s)=>(
                <tr key={s.id}>
                  <td style={cellCenter}>
                    {editRecent
                      ? <input style={inputCenter} value={s.name||""} onChange={e=>patchSale(s.id,"name",e.target.value)} />
                      : (s.name||"-")}
                  </td>
                  <td style={cellCenter}>
                    {editRecent
                      ? (
                        <select
                          style={inputCenter}
                          value={s.sellerEmail||""}
                          onChange={e=>{
                            const u = users.find(u=>u.email===e.target.value)
                            const next = readSales().map(r=>{
                              if(String(r.id)!==String(s.id)) return r
                              return {...r, sellerEmail:e.target.value, sellerName:u?.name||e.target.value}
                            })
                            writeSales(next); setSales(next)
                          }}
                        >
                          <option value="">—</option>
                          {salesmen.map(u=>(
                            <option key={u.email} value={u.email}>{u.name||u.email}</option>
                          ))}
                        </select>
                      )
                      : `${s.sellerName||"-"}${s.sellerEmail?` (${s.sellerEmail})`:""}`}
                  </td>
                  <td style={cellCenter}>
                    {editRecent
                      ? <input style={inputCenter} value={s.phone||""} onChange={e=>patchSale(s.id,"phone",e.target.value)} />
                      : (s.phone||"-")}
                  </td>
                  <td style={cellCenter}>
                    {editRecent
                      ? <input style={inputCenter} value={s.address||""} onChange={e=>patchSale(s.id,"address",e.target.value)} />
                      : (s.address||"-")}
                  </td>
                  <td style={cellCenter}>
                    {editRecent
                      ? <input style={inputCenter} value={s.price ?? ""} onChange={e=>patchSale(s.id,"price",e.target.value)} />
                      : (s.price ? money(s.price) : "-")}
                  </td>
                  <td style={cellCenter}>
                    {editRecent
                      ? <input style={inputCenter} value={s.notes||""} onChange={e=>patchSale(s.id,"notes",e.target.value)} />
                      : (s.notes||"-")}
                  </td>
                  <td style={cellCenter}>
                    {editRecent
                      ? (
                        <select
                          style={inputCenter}
                          value={s.status || "unassigned"}
                          onChange={e=>patchSale(s.id, "status", e.target.value)}
                        >
                          <option value="unassigned">Unassigned</option>
                          <option value="assigned">Assigned</option>
                          <option value="worked">Worked</option>
                          <option value="contacted">Contacted</option>
                        </select>
                      )
                      : (s.status || "-")}
                  </td>
                  <td style={cellCenter}>
                    {editRecent ? (
                      <input
                        type="date"
                        style={inputCenter}
                        value={s.createdAt ? toYMD(parseLocalDateTime(s.createdAt)) : todayLocalYMD()}
                        onChange={e=>{
                          const dateValue = e.target.value;
                          if (!dateValue) return;
                          const d = parseLocalDateTime(`${dateValue} 00:00`);
                          patchSale(s.id, "createdAt", d ? d.getTime() : undefined);
                        }}
                      />
                    ) : fmtDateOnly(s.createdAt)}
                  </td>
                  {editRecent && (
                    <td style={cellCenter}>
                      <button className="btn outline" style={{fontSize:11, padding:"4px 6px"}} onClick={()=>handleDeleteSale(s.id)}>
                        delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {editRecent && (
                <tr>
                  <td style={cellCenter}>
                    <input
                      style={inputCenter}
                      value={newSale.name}
                      onChange={e=>setNewSale(v=>({...v, name:e.target.value}))}
                      placeholder="Customer"
                    />
                  </td>
                  <td style={cellCenter}>
                    <select
                      style={inputCenter}
                      value={newSale.sellerEmail}
                      onChange={e=>setNewSale(v=>({...v, sellerEmail:e.target.value}))}
                    >
                      <option value="">—</option>
                      {salesmen.map(u=>(
                        <option key={u.email} value={u.email}>{u.name||u.email}</option>
                      ))}
                    </select>
                  </td>
                  <td style={cellCenter}>
                    <input
                      style={inputCenter}
                      value={newSale.phone}
                      onChange={e=>setNewSale(v=>({...v, phone:e.target.value}))}
                      placeholder="Phone"
                    />
                  </td>
                  <td style={cellCenter}>
                    <input
                      style={inputCenter}
                      value={newSale.address}
                      onChange={e=>setNewSale(v=>({...v, address:e.target.value}))}
                      placeholder="Address"
                    />
                  </td>
                  <td style={cellCenter}>
                    <input
                      style={inputCenter}
                      value={newSale.price}
                      onChange={e=>setNewSale(v=>({...v, price:e.target.value}))}
                      placeholder="Price"
                    />
                  </td>
                  <td style={cellCenter}>
                    <input
                      style={inputCenter}
                      value={newSale.notes}
                      onChange={e=>setNewSale(v=>({...v, notes:e.target.value}))}
                      placeholder="Notes"
                    />
                  </td>
                  <td style={cellCenter}>
                    <select
                      style={inputCenter}
                      value={newSale.status || "unassigned"}
                      onChange={e=>setNewSale(v=>({...v, status:e.target.value}))}
                    >
                      <option value="unassigned">Unassigned</option>
                      <option value="assigned">Assigned</option>
                      <option value="worked">Worked</option>
                      <option value="contacted">Contacted</option>
                    </select>
                  </td>
                  <td style={cellCenter}>
                    <input
                      type="date"
                      style={inputCenter}
                      value={newSale.createdAt ? toLocalISO(newSale.createdAt) : todayLocalYMD()}
                      onChange={e=>setNewSale(v=>({...v, createdAt: toLocalISO(e.target.value)}))}
                    />
                  </td>
                  <td style={cellCenter}>
                    <button className="btn outline" style={{fontSize:11, padding:"4px 6px"}} onClick={handleAddSale}>
                      Add Row
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <div>
            {recentSales.length===0 && (
              <div style={{ color:"var(--muted)", padding:"8px 0" }}>No sales.</div>
            )}
            {recentSales.map((s) => (
              <div key={s.id} className="card" style={{ marginBottom: 12 }}>
                <div className="section-title" style={{marginBottom:8}}>
                  {s.name || "Customer"}
                </div>

                <div className="muted" style={{fontSize:12, textTransform:"uppercase", fontWeight:700}}>Salesman</div>
                {editRecent ? (
                  <select
                    style={inputCenter}
                    value={s.sellerEmail||""}
                    onChange={e=>{
                      const u = users.find(u=>u.email===e.target.value)
                      const next = readSales().map(r=>{
                        if(String(r.id)!==String(s.id)) return r
                        return {...r, sellerEmail:e.target.value, sellerName:u?.name||e.target.value}
                      })
                      writeSales(next); setSales(next)
                    }}
                  >
                    <option value="">—</option>
                    {salesmen.map(u=>(
                      <option key={u.email} value={u.email}>{u.name||u.email}</option>
                    ))}
                  </select>
                ) : (
                  <div>{s.sellerName || s.sellerEmail || "-"}</div>
                )}

                <div className="muted" style={{marginTop:10, fontSize:12, textTransform:"uppercase", fontWeight:700}}>Phone</div>
                {editRecent
                  ? <input style={inputCenter} value={s.phone||""} onChange={e=>patchSale(s.id,"phone",e.target.value)} />
                  : <div>{s.phone||"-"}</div>}

                <div className="muted" style={{marginTop:10, fontSize:12, textTransform:"uppercase", fontWeight:700}}>Address</div>
                {editRecent
                  ? <input style={inputCenter} value={s.address||""} onChange={e=>patchSale(s.id,"address",e.target.value)} />
                  : <div>{s.address||"-"}</div>}

                <div className="muted" style={{marginTop:10, fontSize:12, textTransform:"uppercase", fontWeight:700}}>Price</div>
                {editRecent
                  ? <input style={inputCenter} value={s.price ?? ""} onChange={e=>patchSale(s.id,"price",e.target.value)} />
                  : <div>{s.price ? money(s.price) : "-"}</div>}

                <div className="muted" style={{marginTop:10, fontSize:12, textTransform:"uppercase", fontWeight:700}}>Notes</div>
                {editRecent
                  ? <input style={inputCenter} value={s.notes||""} onChange={e=>patchSale(s.id,"notes",e.target.value)} />
                  : <div>{s.notes||"-"}</div>}

                <div className="muted" style={{marginTop:10, fontSize:12, textTransform:"uppercase", fontWeight:700}}>Status</div>
                {editRecent ? (
                  <select
                    style={inputCenter}
                    value={s.status || "unassigned"}
                    onChange={e=>patchSale(s.id, "status", e.target.value)}
                  >
                    <option value="unassigned">Unassigned</option>
                    <option value="assigned">Assigned</option>
                    <option value="worked">Worked</option>
                    <option value="contacted">Contacted</option>
                  </select>
                ) : (
                  <div>{s.status || "-"}</div>
                )}

                <div className="muted" style={{marginTop:10, fontSize:12, textTransform:"uppercase", fontWeight:700}}>Date</div>
                {editRecent ? (
                  <input
                    type="date"
                    style={inputCenter}
                    value={s.createdAt ? toYMD(parseLocalDateTime(s.createdAt)) : todayLocalYMD()}
                    onChange={e=>{
                      const dateValue = e.target.value;
                      if (!dateValue) return;
                      const d = parseLocalDateTime(`${dateValue} 00:00`);
                      patchSale(s.id, "createdAt", d ? d.getTime() : undefined);
                    }}
                  />
                ) : (
                  <div>{fmtDateOnly(s.createdAt)}</div>
                )}

                {editRecent && (
                  <div style={{marginTop:10}}>
                    <button className="btn outline" style={{fontSize:11, padding:"4px 6px"}} onClick={()=>handleDeleteSale(s.id)}>
                      delete
                    </button>
                  </div>
                )}
              </div>
            ))}

            {editRecent && (
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="section-title" style={{marginBottom:8}}>Add Sale</div>

                <div className="muted" style={{fontSize:12, textTransform:"uppercase", fontWeight:700}}>Customer</div>
                <input
                  style={inputCenter}
                  value={newSale.name}
                  onChange={e=>setNewSale(v=>({...v, name:e.target.value}))}
                  placeholder="Customer"
                />

                <div className="muted" style={{marginTop:10, fontSize:12, textTransform:"uppercase", fontWeight:700}}>Salesman</div>
                <select
                  style={inputCenter}
                  value={newSale.sellerEmail}
                  onChange={e=>setNewSale(v=>({...v, sellerEmail:e.target.value}))}
                >
                  <option value="">—</option>
                  {salesmen.map(u=>(
                    <option key={u.email} value={u.email}>{u.name||u.email}</option>
                  ))}
                </select>

                <div className="muted" style={{marginTop:10, fontSize:12, textTransform:"uppercase", fontWeight:700}}>Phone</div>
                <input
                  style={inputCenter}
                  value={newSale.phone}
                  onChange={e=>setNewSale(v=>({...v, phone:e.target.value}))}
                  placeholder="Phone"
                />

                <div className="muted" style={{marginTop:10, fontSize:12, textTransform:"uppercase", fontWeight:700}}>Address</div>
                <input
                  style={inputCenter}
                  value={newSale.address}
                  onChange={e=>setNewSale(v=>({...v, address:e.target.value}))}
                  placeholder="Address"
                />

                <div className="muted" style={{marginTop:10, fontSize:12, textTransform:"uppercase", fontWeight:700}}>Price</div>
                <input
                  style={inputCenter}
                  value={newSale.price}
                  onChange={e=>setNewSale(v=>({...v, price:e.target.value}))}
                  placeholder="Price"
                />

                <div className="muted" style={{marginTop:10, fontSize:12, textTransform:"uppercase", fontWeight:700}}>Notes</div>
                <input
                  style={inputCenter}
                  value={newSale.notes}
                  onChange={e=>setNewSale(v=>({...v, notes:e.target.value}))}
                  placeholder="Notes"
                />

                <div className="muted" style={{marginTop:10, fontSize:12, textTransform:"uppercase", fontWeight:700}}>Status</div>
                <select
                  style={inputCenter}
                  value={newSale.status || "unassigned"}
                  onChange={e=>setNewSale(v=>({...v, status:e.target.value}))}
                >
                  <option value="unassigned">Unassigned</option>
                  <option value="assigned">Assigned</option>
                  <option value="worked">Worked</option>
                  <option value="contacted">Contacted</option>
                </select>

                <div className="muted" style={{marginTop:10, fontSize:12, textTransform:"uppercase", fontWeight:700}}>Date</div>
                <input
                  type="date"
                  style={inputCenter}
                  value={newSale.createdAt ? toLocalISO(newSale.createdAt) : todayLocalYMD()}
                  onChange={e=>setNewSale(v=>({...v, createdAt: toLocalISO(e.target.value)}))}
                />

                <div style={{marginTop:10}}>
                  <button className="btn outline" style={{fontSize:11, padding:"4px 6px"}} onClick={handleAddSale}>
                    Add Row
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================= UPCOMING ASSIGNMENTS ================= */}
      <div className="card" style={{marginTop:16}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <h2 className="section-title">Upcoming Assignments</h2>
          <button className="btn outline" onClick={()=>setEditUpcoming(v=>!v)}>
            {editUpcoming ? "Done" : "Edit"}
          </button>
        </div>
        {!isNarrow ? (
          <table className="table">
            <thead>
              <tr>
                <th style={cellCenter}>Date</th>
                <th style={cellCenter}>Time</th>
                <th style={cellCenter}>Salesman</th>
                <th style={cellCenter}>Customer</th>
                <th style={cellCenter}>Address</th>
                <th style={cellCenter}>Worker 1</th>
                <th style={cellCenter}>Worker 2</th>
                {editUpcoming && <th style={cellCenter}></th>}
              </tr>
            </thead>
            <tbody>
              {upcoming.length===0 && (
                <tr><td colSpan={editUpcoming?8:7} style={{...cellCenter, color:"var(--muted)"}}>No upcoming assignments.</td></tr>
              )}
              {upcoming.map((a)=>{
                let dateVal = "", timeVal = "";
                if (a.when) {
                  const d = parseLocalDateTime(a.when);
                  if (d && !isNaN(d.getTime())) {
                    dateVal = toYMD(d);
                    timeVal = toHM(d);
                  }
                }
                return (
                <tr key={a.id}>
                  <td style={cellCenter}>
                    {editUpcoming
                      ? <input
                          type="date"
                          style={inputCenter}
                          value={dateVal || todayLocalYMD()}
                          onChange={e=>{
                            const newDate = e.target.value;
                            const combined = `${newDate}T${timeVal || "00:00"}`;
                            patchAssignment(a.id, "when", combined);
                          }}
                        />
                      : (a.when ? fmtDateOnly(a.when) : "-")}
                  </td>
                  <td style={cellCenter}>
                    {editUpcoming
                      ? <input
                          type="time"
                          style={inputCenter}
                          value={timeVal}
                          onChange={e=>{
                            const newTime = e.target.value;
                            const combined = `${dateVal || todayLocalYMD()}T${newTime}`;
                            patchAssignment(a.id, "when", combined);
                          }}
                        />
                      : (a.when && timeVal
                          ? parseLocalDateTime(a.when)?.toLocaleTimeString([], {hour:"numeric", minute:"2-digit"})
                          : "-")}
                  </td>
                  <td style={cellCenter}>
                    {editUpcoming
                      ? (
                        <select
                          style={inputCenter}
                          value={a.salesmanEmail||""}
                          onChange={e=>patchAssignment(a.id, "salesmanEmail", e.target.value)}
                        >
                          <option value="">—</option>
                          {salesmen.map(u=>(
                            <option key={u.email} value={u.email}>{u.name||u.email}</option>
                          ))}
                        </select>
                      )
                      : (a.salesmanName || a.salesmanEmail || "-")}
                  </td>
                  <td style={cellCenter}>
                    {editUpcoming
                      ? <input style={inputCenter} value={a._sale?.name || ""} disabled />
                      : (a._sale?.name || a.saleId)}
                  </td>
                  <td style={cellCenter}>
                    {editUpcoming
                      ? <input style={inputCenter} value={a._sale?.address || ""} disabled />
                      : (a._sale?.address || "-")}
                  </td>
                  <td style={cellCenter}>
                    {editUpcoming
                      ? (
                        <select
                          style={inputCenter}
                          value={a.workerEmail||""}
                          onChange={e=>patchAssignment(a.id,"workerEmail",e.target.value)}
                        >
                          <option value="">—</option>
                          {workers.map(u=>(
                            <option key={u.email} value={u.email}>{u.name||u.email}</option>
                          ))}
                        </select>
                      )
                      : (a._worker1Name)}
                  </td>
                  <td style={cellCenter}>
                    {editUpcoming
                      ? (
                        <select
                          style={inputCenter}
                          value={a.worker2Email||""}
                          onChange={e=>patchAssignment(a.id,"worker2Email",e.target.value)}
                        >
                          <option value="">—</option>
                          {workers.map(u=>(
                            <option key={u.email} value={u.email}>{u.name||u.email}</option>
                          ))}
                        </select>
                      )
                      : (a._worker2Name)}
                  </td>
                  {editUpcoming && (
                    <td style={cellCenter}>
                      <button className="btn outline" style={{fontSize:11, padding:"4px 6px"}} onClick={()=>deleteAssignment(a.id)}>
                        delete
                      </button>
                    </td>
                  )}
                </tr>
              )})}
              {editUpcoming && (
                <tr>
                  <td style={cellCenter}>
                    <input
                      type="date"
                      style={inputCenter}
                      value={newAssignment.when
                        ? (()=>{const d=parseLocalDateTime(newAssignment.when);return d?toYMD(d):todayLocalYMD()})()
                        : todayLocalYMD()
                      }
                      onChange={e=>{
                        const d = e.target.value
                        let t = ""
                        if (newAssignment.when) {
                          const parsed = parseLocalDateTime(newAssignment.when)
                          if (parsed && !isNaN(parsed.getTime())) {
                            t = toHM(parsed)
                          }
                        }
                        const combined = `${d}T${t||"00:00"}`;
                        setNewAssignment(v=>({...v, when: combined}))
                      }}
                    />
                  </td>
                  <td style={cellCenter}>
                    <input
                      type="time"
                      style={inputCenter}
                      value={newAssignment.when
                        ? (()=>{const d=parseLocalDateTime(newAssignment.when);return d?toHM(d):""})()
                        : ""
                      }
                      onChange={e=>{
                        const t = e.target.value
                        let d = ""
                        if (newAssignment.when) {
                          const parsed = parseLocalDateTime(newAssignment.when)
                          if (parsed && !isNaN(parsed.getTime())) {
                            d = toYMD(parsed)
                          }
                        }
                        if (!d) d = todayLocalYMD()
                        const combined = `${d}T${t}`;
                        setNewAssignment(v=>({...v, when: combined}))
                      }}
                    />
                  </td>
                  <td style={cellCenter}>
                    <select
                      style={inputCenter}
                      value={newAssignment.salesmanEmail}
                      onChange={e=>setNewAssignment(v=>({...v, salesmanEmail:e.target.value}))}
                    >
                      <option value="">—</option>
                      {salesmen.map(u=>(
                        <option key={u.email} value={u.email}>{u.name||u.email}</option>
                      ))}
                    </select>
                  </td>
                  <td style={cellCenter}>
                    <input
                      style={inputCenter}
                      value={newAssignment.customer}
                      onChange={e=>setNewAssignment(v=>({...v, customer:e.target.value}))}
                      placeholder="Customer"
                    />
                  </td>
                  <td style={cellCenter}>
                    <input
                      style={inputCenter}
                      value={newAssignment.address}
                      onChange={e=>setNewAssignment(v=>({...v, address:e.target.value}))}
                      placeholder="Address"
                    />
                  </td>
                  <td style={cellCenter}>
                    <select
                      style={inputCenter}
                      value={newAssignment.workerEmail}
                      onChange={e=>setNewAssignment(v=>({...v, workerEmail:e.target.value}))}
                    >
                      <option value="">—</option>
                      {workers.map(u=>(
                        <option key={u.email} value={u.email}>{u.name||u.email}</option>
                      ))}
                    </select>
                  </td>
                  <td style={cellCenter}>
                    <select
                      style={inputCenter}
                      value={newAssignment.worker2Email}
                      onChange={e=>setNewAssignment(v=>({...v, worker2Email:e.target.value}))}
                    >
                      <option value="">—</option>
                      {workers.map(u=>(
                        <option key={u.email} value={u.email}>{u.name||u.email}</option>
                      ))}
                    </select>
                  </td>
                  <td style={cellCenter}>
                    <button className="btn outline" style={{fontSize:11, padding:"4px 6px"}} onClick={handleAddAssignment}>
                      Add Row
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <div>
            {upcoming.length===0 && (
              <div style={{ color:"var(--muted)", padding:"8px 0" }}>No upcoming assignments.</div>
            )}
            {upcoming.map((a)=>{
              let dateVal = "", timeVal = "";
              if (a.when) {
                const d = parseLocalDateTime(a.when);
                if (d && !isNaN(d.getTime())) {
                  dateVal = toYMD(d);
                  timeVal = toHM(d);
                }
              }
              return (
                <div key={a.id} className="card" style={{ marginBottom: 12 }}>
                  <div className="section-title" style={{marginBottom:8}}>
                    {a._sale?.name || a.saleId || "Assignment"}
                  </div>

                  <div className="muted" style={{fontSize:12, textTransform:"uppercase", fontWeight:700}}>Date</div>
                  {editUpcoming ? (
                    <input
                      type="date"
                      style={inputCenter}
                      value={dateVal || todayLocalYMD()}
                      onChange={e=>{
                        const newDate = e.target.value;
                        const combined = `${newDate}T${timeVal || "00:00"}`;
                        patchAssignment(a.id, "when", combined);
                      }}
                    />
                  ) : (
                    <div>{a.when ? fmtDateOnly(a.when) : "-"}</div>
                  )}

                  <div className="muted" style={{marginTop:10, fontSize:12, textTransform:"uppercase", fontWeight:700}}>Time</div>
                  {editUpcoming ? (
                    <input
                      type="time"
                      style={inputCenter}
                      value={timeVal}
                      onChange={e=>{
                        const newTime = e.target.value;
                        const combined = `${dateVal || todayLocalYMD()}T${newTime}`;
                        patchAssignment(a.id, "when", combined);
                      }}
                    />
                  ) : (
                    <div>{(a.when && timeVal) ? parseLocalDateTime(a.when)?.toLocaleTimeString([], {hour:"numeric", minute:"2-digit"}) : "-"}</div>
                  )}

                  <div className="muted" style={{marginTop:10, fontSize:12, textTransform:"uppercase", fontWeight:700}}>Salesman</div>
                  {editUpcoming ? (
                    <select
                      style={inputCenter}
                      value={a.salesmanEmail||""}
                      onChange={e=>patchAssignment(a.id, "salesmanEmail", e.target.value)}
                    >
                      <option value="">—</option>
                      {salesmen.map(u=>(
                        <option key={u.email} value={u.email}>{u.name||u.email}</option>
                      ))}
                    </select>
                  ) : (
                    <div>{a.salesmanName || a.salesmanEmail || "-"}</div>
                  )}

                  <div className="muted" style={{marginTop:10, fontSize:12, textTransform:"uppercase", fontWeight:700}}>Customer</div>
                  <div>{a._sale?.name || a.saleId || "-"}</div>

                  <div className="muted" style={{marginTop:10, fontSize:12, textTransform:"uppercase", fontWeight:700}}>Address</div>
                  <div>{a._sale?.address || "-"}</div>

                  <div className="muted" style={{marginTop:10, fontSize:12, textTransform:"uppercase", fontWeight:700}}>Worker 1</div>
                  {editUpcoming ? (
                    <select
                      style={inputCenter}
                      value={a.workerEmail||""}
                      onChange={e=>patchAssignment(a.id,"workerEmail",e.target.value)}
                    >
                      <option value="">—</option>
                      {workers.map(u=>(
                        <option key={u.email} value={u.email}>{u.name||u.email}</option>
                      ))}
                    </select>
                  ) : (
                    <div>{a._worker1Name}</div>
                  )}

                  <div className="muted" style={{marginTop:10, fontSize:12, textTransform:"uppercase", fontWeight:700}}>Worker 2</div>
                  {editUpcoming ? (
                    <select
                      style={inputCenter}
                      value={a.worker2Email||""}
                      onChange={e=>patchAssignment(a.id,"worker2Email",e.target.value)}
                    >
                      <option value="">—</option>
                      {workers.map(u=>(
                        <option key={u.email} value={u.email}>{u.name||u.email}</option>
                      ))}
                    </select>
                  ) : (
                    <div>{a._worker2Name}</div>
                  )}

                  {editUpcoming && (
                    <div style={{marginTop:10}}>
                      <button className="btn outline" style={{fontSize:11, padding:"4px 6px"}} onClick={()=>deleteAssignment(a.id)}>
                        delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {editUpcoming && (
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="section-title" style={{marginBottom:8}}>Add Assignment</div>

                <div className="muted" style={{fontSize:12, textTransform:"uppercase", fontWeight:700}}>Date</div>
                <input
                  type="date"
                  style={inputCenter}
                  value={newAssignment.when
                    ? (()=>{const d=parseLocalDateTime(newAssignment.when);return d?toYMD(d):todayLocalYMD()})()
                    : todayLocalYMD()
                  }
                  onChange={e=>{
                    const d = e.target.value;
                    let t = "";
                    if (newAssignment.when) {
                      const parsed = parseLocalDateTime(newAssignment.when)
                      if (parsed && !isNaN(parsed.getTime())) {
                        t = toHM(parsed)
                      }
                    }
                    const combined = `${d}T${t||"00:00"}`;
                    setNewAssignment(v=>({...v, when: combined}))
                  }}
                />

                <div className="muted" style={{marginTop:10, fontSize:12, textTransform:"uppercase", fontWeight:700}}>Time</div>
                <input
                  type="time"
                  style={inputCenter}
                  value={newAssignment.when
                    ? (()=>{const d=parseLocalDateTime(newAssignment.when);return d?toHM(d):""})()
                    : ""
                  }
                  onChange={e=>{
                    const t = e.target.value;
                    let d = "";
                    if (newAssignment.when) {
                      const parsed = parseLocalDateTime(newAssignment.when)
                      if (parsed && !isNaN(parsed.getTime())) {
                        d = toYMD(parsed)
                      }
                    }
                    if (!d) d = todayLocalYMD()
                    const combined = `${d}T${t}`;
                    setNewAssignment(v=>({...v, when: combined}))
                  }}
                />

                <div className="muted" style={{marginTop:10, fontSize:12, textTransform:"uppercase", fontWeight:700}}>Salesman</div>
                <select
                  style={inputCenter}
                  value={newAssignment.salesmanEmail}
                  onChange={e=>setNewAssignment(v=>({...v, salesmanEmail:e.target.value}))}
                >
                  <option value="">—</option>
                  {salesmen.map(u=>(
                    <option key={u.email} value={u.email}>{u.name||u.email}</option>
                  ))}
                </select>

                <div className="muted" style={{marginTop:10, fontSize:12, textTransform:"uppercase", fontWeight:700}}>Customer</div>
                <input
                  style={inputCenter}
                  value={newAssignment.customer}
                  onChange={e=>setNewAssignment(v=>({...v, customer:e.target.value}))}
                  placeholder="Customer"
                />

                <div className="muted" style={{marginTop:10, fontSize:12, textTransform:"uppercase", fontWeight:700}}>Address</div>
                <input
                  style={inputCenter}
                  value={newAssignment.address}
                  onChange={e=>setNewAssignment(v=>({...v, address:e.target.value}))}
                  placeholder="Address"
                />

                <div className="muted" style={{marginTop:10, fontSize:12, textTransform:"uppercase", fontWeight:700}}>Worker 1</div>
                <select
                  style={inputCenter}
                  value={newAssignment.workerEmail}
                  onChange={e=>setNewAssignment(v=>({...v, workerEmail:e.target.value}))}
                >
                  <option value="">—</option>
                  {workers.map(u=>(
                    <option key={u.email} value={u.email}>{u.name||u.email}</option>
                  ))}
                </select>

                <div className="muted" style={{marginTop:10, fontSize:12, textTransform:"uppercase", fontWeight:700}}>Worker 2</div>
                <select
                  style={inputCenter}
                  value={newAssignment.worker2Email}
                  onChange={e=>setNewAssignment(v=>({...v, worker2Email:e.target.value}))}
                >
                  <option value="">—</option>
                  {workers.map(u=>(
                    <option key={u.email} value={u.email}>{u.name||u.email}</option>
                  ))}
                </select>

                <div style={{marginTop:10}}>
                  <button className="btn outline" style={{fontSize:11, padding:"4px 6px"}} onClick={handleAddAssignment}>
                    Add Row
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================= UPCOMING NEIGHBORHOODS ================= */}
      <div className="card" style={{marginTop:16}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <h2 className="section-title">Upcoming Neighborhoods</h2>
          <button className="btn outline" onClick={()=>setEditUpcomingHoods(v=>!v)}>
            {editUpcomingHoods ? "Done" : "Edit"}
          </button>
        </div>
        {!isNarrow ? (
          <table className="table">
            <thead>
              <tr>
                <th style={cellCenter}>Date</th>
                <th style={cellCenter}>Time</th>
                <th style={cellCenter}>Salesman</th>
                <th style={cellCenter}>Street(s)</th>
                <th style={cellCenter}>Notes</th>
                {editUpcomingHoods && <th style={cellCenter}></th>}
              </tr>
            </thead>
            <tbody>
              {upcomingHoods.length===0 && (
                <tr><td colSpan={editUpcomingHoods?6:5} style={{...cellCenter, color:"var(--muted)"}}>No upcoming neighborhoods.</td></tr>
              )}
              {upcomingHoods.map((h)=>{
                let dateVal = "", timeVal = "";
                if (h.day || h.dateISO) {
                  const d = parseLocalDateTime(h.day || h.dateISO);
                  if (d && !isNaN(d.getTime())) {
                    dateVal = toYMD(d);
                    timeVal = toHM(d);
                  }
                }
                return (
                <tr key={h.id}>
                  <td style={cellCenter}>
                    {editUpcomingHoods
                      ? <input
                          type="date"
                          style={inputCenter}
                          value={dateVal || todayLocalYMD()}
                          onChange={e=>{
                            const newDate = e.target.value;
                            const combined = `${newDate}T${timeVal || "00:00"}`;
                            patchHood(h.id, "day", combined);
                          }}
                        />
                      : ((h.day||h.dateISO) ? fmtDateOnly(h.day||h.dateISO) : "-")}
                  </td>
                  <td style={cellCenter}>
                    {editUpcomingHoods
                      ? <input
                          type="time"
                          style={inputCenter}
                          value={timeVal}
                          onChange={e=>{
                            const newTime = e.target.value;
                            const combined = `${dateVal || todayLocalYMD()}T${newTime}`;
                            patchHood(h.id, "day", combined);
                          }}
                        />
                      : ((h.day||h.dateISO) && timeVal
                          ? parseLocalDateTime(h.day||h.dateISO)?.toLocaleTimeString([], {hour:"numeric", minute:"2-digit"})
                          : "-")}
                  </td>
                  <td style={cellCenter}>
                    {editUpcomingHoods
                      ? (
                        <select
                          style={inputCenter}
                          value={h.sellerEmail||""}
                          onChange={e=>patchHood(h.id,"sellerEmail",e.target.value)}
                        >
                          <option value="">—</option>
                          {salesmen.map(u=>(
                            <option key={u.email} value={u.email}>{u.name||u.email}</option>
                          ))}
                        </select>
                      )
                      : (h.sellerName || h.sellerEmail || "-")}
                  </td>
                  <td style={cellCenter}>
                    {editUpcomingHoods
                      ? <input style={inputCenter} value={h.neighborhood||""} onChange={e=>patchHood(h.id,"neighborhood",e.target.value)} placeholder="Street(s)" />
                      : (h.neighborhood || "-")}
                  </td>
                  <td style={cellCenter}>
                    {editUpcomingHoods
                      ? <input style={inputCenter} value={h.notes||""} onChange={e=>patchHood(h.id,"notes",e.target.value)} placeholder="Meet at HOA lot; gate 1234" />
                      : (h.notes || "-")}
                  </td>
                  {editUpcomingHoods && (
                    <td style={cellCenter}>
                      <button className="btn outline" style={{fontSize:11, padding:"4px 6px"}} onClick={()=>deleteHood(h.id)}>
                        delete
                      </button>
                    </td>
                  )}
                </tr>
              )})}
              {editUpcomingHoods && (
                <tr>
                  <td style={cellCenter}>
                    <input
                      type="date"
                      style={inputCenter}
                      value={newHood.day
                        ? (()=>{const d=parseLocalDateTime(newHood.day);return d?toYMD(d):todayLocalYMD()})()
                        : todayLocalYMD()
                      }
                      onChange={e=>{
                        let t = ""
                        if (newHood.day) {
                          const d = parseLocalDateTime(newHood.day)
                          if (d && !isNaN(d.getTime())) {
                            t = toHM(d)
                          }
                        }
                        const dval = e.target.value
                        const combined = `${dval}T${t||"00:00"}`;
                        setNewHood(v=>({...v, day: combined}))
                      }}
                    />
                  </td>
                  <td style={cellCenter}>
                    <input
                      type="time"
                      style={inputCenter}
                      value={newHood.day
                        ? (()=>{const d=parseLocalDateTime(newHood.day);return d?toHM(d):""})()
                        : ""
                      }
                      onChange={e=>{
                        let dval = ""
                        if (newHood.day) {
                          const d = parseLocalDateTime(newHood.day)
                          if (d && !isNaN(d.getTime())) {
                            dval = toYMD(d)
                          }
                        }
                        if (!dval) dval = todayLocalYMD()
                        const t = e.target.value
                        const combined = `${dval}T${t}`;
                        setNewHood(v=>({...v, day: combined}))
                      }}
                    />
                  </td>
                  <td style={cellCenter}>
                    <select
                      style={inputCenter}
                      value={newHood.sellerEmail}
                      onChange={e=>setNewHood(v=>({...v, sellerEmail:e.target.value}))}
                    >
                      <option value="">—</option>
                      {salesmen.map(u=>(
                        <option key={u.email} value={u.email}>{u.name||u.email}</option>
                      ))}
                    </select>
                  </td>
                  <td style={cellCenter}>
                    <input
                      style={inputCenter}
                      value={newHood.neighborhood}
                      onChange={e=>setNewHood(v=>({...v, neighborhood:e.target.value}))}
                      placeholder="Street(s)"
                    />
                  </td>
                  <td style={cellCenter}>
                    <input
                      style={inputCenter}
                      value={newHood.notes}
                      onChange={e=>setNewHood(v=>({...v, notes:e.target.value}))}
                      placeholder="Notes"
                    />
                  </td>
                  <td style={cellCenter}>
                    <button className="btn outline" style={{fontSize:11, padding:"4px 6px"}} onClick={handleAddHood}>
                      Add Row
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <div>
            {upcomingHoods.length===0 && (
              <div style={{ color:"var(--muted)", padding:"8px 0" }}>No upcoming neighborhoods.</div>
            )}
            {upcomingHoods.map((h)=>{
              let dateVal = "", timeVal = "";
              if (h.day || h.dateISO) {
                const d = parseLocalDateTime(h.day || h.dateISO);
                if (d && !isNaN(d.getTime())) {
                  dateVal = toYMD(d);
                  timeVal = toHM(d);
                }
              }
              return (
                <div key={h.id} className="card" style={{ marginBottom: 12 }}>
                  <div className="section-title" style={{marginBottom:8}}>
                    {h.neighborhood || "Neighborhood"}
                  </div>

                  <div className="muted" style={{fontSize:12, textTransform:"uppercase", fontWeight:700}}>Date</div>
                  {editUpcomingHoods ? (
                    <input
                      type="date"
                      style={inputCenter}
                      value={dateVal || todayLocalYMD()}
                      onChange={e=>{
                        const newDate = e.target.value;
                        const combined = `${newDate}T${timeVal || "00:00"}`;
                        patchHood(h.id, "day", combined);
                      }}
                    />
                  ) : (
                    <div>{(h.day||h.dateISO) ? fmtDateOnly(h.day||h.dateISO) : "-"}</div>
                  )}

                  <div className="muted" style={{marginTop:10, fontSize:12, textTransform:"uppercase", fontWeight:700}}>Time</div>
                  {editUpcomingHoods ? (
                    <input
                      type="time"
                      style={inputCenter}
                      value={timeVal}
                      onChange={e=>{
                        const newTime = e.target.value;
                        const combined = `${dateVal || todayLocalYMD()}T${newTime}`;
                        patchHood(h.id, "day", combined);
                      }}
                    />
                  ) : (
                    <div>{((h.day||h.dateISO) && timeVal) ? parseLocalDateTime(h.day||h.dateISO)?.toLocaleTimeString([], {hour:"numeric", minute:"2-digit"}) : "-"}</div>
                  )}

                  <div className="muted" style={{marginTop:10, fontSize:12, textTransform:"uppercase", fontWeight:700}}>Salesman</div>
                  {editUpcomingHoods ? (
                    <select
                      style={inputCenter}
                      value={h.sellerEmail||""}
                      onChange={e=>patchHood(h.id,"sellerEmail",e.target.value)}
                    >
                      <option value="">—</option>
                      {salesmen.map(u=>(
                        <option key={u.email} value={u.email}>{u.name||u.email}</option>
                      ))}
                    </select>
                  ) : (
                    <div>{h.sellerName || h.sellerEmail || "-"}</div>
                  )}

                  <div className="muted" style={{marginTop:10, fontSize:12, textTransform:"uppercase", fontWeight:700}}>Street(s)</div>
                  {editUpcomingHoods
                    ? <input style={inputCenter} value={h.neighborhood||""} onChange={e=>patchHood(h.id,"neighborhood",e.target.value)} placeholder="Street(s)" />
                    : <div>{h.neighborhood || "-"}</div>}

                  <div className="muted" style={{marginTop:10, fontSize:12, textTransform:"uppercase", fontWeight:700}}>Notes</div>
                  {editUpcomingHoods
                    ? <input style={inputCenter} value={h.notes||""} onChange={e=>patchHood(h.id,"notes",e.target.value)} placeholder="Meet at HOA lot; gate 1234" />
                    : <div>{h.notes || "-"}</div>}

                  {editUpcomingHoods && (
                    <div style={{marginTop:10}}>
                      <button className="btn outline" style={{fontSize:11, padding:"4px 6px"}} onClick={()=>deleteHood(h.id)}>
                        delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {editUpcomingHoods && (
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="section-title" style={{marginBottom:8}}>Add Neighborhood</div>

                <div className="muted" style={{fontSize:12, textTransform:"uppercase", fontWeight:700}}>Date</div>
                <input
                  type="date"
                  style={inputCenter}
                  value={newHood.day
                    ? (()=>{const d=parseLocalDateTime(newHood.day);return d?toYMD(d):todayLocalYMD()})()
                    : todayLocalYMD()
                  }
                  onChange={e=>{
                    let t = ""
                    if (newHood.day) {
                      const d = parseLocalDateTime(newHood.day)
                      if (d && !isNaN(d.getTime())) {
                        t = toHM(d)
                      }
                    }
                    const dval = e.target.value
                    const combined = `${dval}T${t||"00:00"}`;
                    setNewHood(v=>({...v, day: combined}))
                  }}
                />

                <div className="muted" style={{marginTop:10, fontSize:12, textTransform:"uppercase", fontWeight:700}}>Time</div>
                <input
                  type="time"
                  style={inputCenter}
                  value={newHood.day
                    ? (()=>{const d=parseLocalDateTime(newHood.day);return d?toHM(d):""})()
                    : ""
                  }
                  onChange={e=>{
                    let dval = ""
                    if (newHood.day) {
                      const d = parseLocalDateTime(newHood.day)
                      if (d && !isNaN(d.getTime())) {
                        dval = toYMD(d)
                      }
                    }
                    if (!dval) dval = todayLocalYMD()
                    const t = e.target.value
                    const combined = `${dval}T${t}`;
                    setNewHood(v=>({...v, day: combined}))
                  }}
                />

                <div className="muted" style={{marginTop:10, fontSize:12, textTransform:"uppercase", fontWeight:700}}>Salesman</div>
                <select
                  style={inputCenter}
                  value={newHood.sellerEmail}
                  onChange={e=>setNewHood(v=>({...v, sellerEmail:e.target.value}))}
                >
                  <option value="">—</option>
                  {salesmen.map(u=>(
                    <option key={u.email} value={u.email}>{u.name||u.email}</option>
                  ))}
                </select>

                <div className="muted" style={{marginTop:10, fontSize:12, textTransform:"uppercase", fontWeight:700}}>Street(s)</div>
                <input
                  style={inputCenter}
                  value={newHood.neighborhood}
                  onChange={e=>setNewHood(v=>({...v, neighborhood:e.target.value}))}
                  placeholder="Street(s)"
                />

                <div className="muted" style={{marginTop:10, fontSize:12, textTransform:"uppercase", fontWeight:700}}>Notes</div>
                <input
                  style={inputCenter}
                  value={newHood.notes}
                  onChange={e=>setNewHood(v=>({...v, notes:e.target.value}))}
                  placeholder="Notes"
                />

                <div style={{marginTop:10}}>
                  <button className="btn outline" style={{fontSize:11, padding:"4px 6px"}} onClick={handleAddHood}>
                    Add Row
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}