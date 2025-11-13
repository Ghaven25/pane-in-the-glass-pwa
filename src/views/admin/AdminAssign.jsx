// src/views/admin/AdminAssign.jsx
import React, { useEffect, useMemo, useState } from 'react'

/** ---------- storage helpers ---------- */
function readSales(){ try{ return JSON.parse(localStorage.getItem('sales')||'[]') }catch{ return [] } }
function writeSales(rows){ localStorage.setItem('sales', JSON.stringify(rows)) }

function readAvail(){ try{ return JSON.parse(localStorage.getItem('availability')||'[]') }catch{ return [] } }

function readUsers(){ try{ return JSON.parse(localStorage.getItem('users_seed')||'[]') }catch{ return [] } }

function readAssignments(){ try{ return JSON.parse(localStorage.getItem('assignments')||'[]') }catch{ return [] } }
function writeAssignments(rows){ localStorage.setItem('assignments', JSON.stringify(rows)) }

function readNeighborhoods(){ try{ return JSON.parse(localStorage.getItem('neighborhoodAssignments')||'[]') }catch{ return [] } }
function writeNeighborhoods(rows){ localStorage.setItem('neighborhoodAssignments', JSON.stringify(rows)) }

/** NEW: worker completion records (from worker app) */
function readJobFinishes(){ try{ return JSON.parse(localStorage.getItem('jobFinishes')||'[]') }catch{ return [] } }

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

/** ---------- date helpers ---------- */
const fmtDateOnly = (t) => {
  if(!t) return '-'
  const d = typeof t === 'number' ? new Date(t) : new Date(String(t))
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString([], {month:'short', day:'numeric'})
}

function isFuture(ts){
  if(!ts) return false
  const val = new Date(ts).getTime()
  if (Number.isNaN(val)) return false
  return val > Date.now()
}

/** Smart-ish parser for freeform "When" */
function parseSmartWhen(s){
  if(!s) return null;

  // 1) native parse first
  let d = new Date(s);
  if(!Number.isNaN(d.getTime())) return d;

  // 2) "Nov 1 / 1:20-3" etc.
  const monthRx = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*/i;
  const dayRx   = /\b([0-2]?\d|3[01])\b/;
  const timeRx  = /(\d{1,2}(?::\d{2})?)(?:\s*([ap]m))?/i;

  const monthMatch = s.match(monthRx);
  const dayMatch   = s.match(dayRx);
  const timeMatch  = s.match(timeRx);

  if(monthMatch && dayMatch){
    const month = monthMatch[0];
    const day   = dayMatch[1];
    const year  = new Date().getFullYear();

    let timeStr = "00:00";
    let ampmStr = null;

    if(timeMatch){
      const raw  = timeMatch[1];
      ampmStr    = timeMatch[2] || null;
      const [hh, mm = "00"] = raw.includes(":") ? raw.split(":") : [raw, "00"];

      const hNum      = parseInt(hh, 10);
      const assumePM  = !ampmStr && hNum >= 1 && hNum <= 8; // canvassing assumption
      timeStr         = `${hh}:${mm}`;

      d = new Date(`${month} ${day}, ${year} ${timeStr} ${assumePM ? "PM" : (ampmStr ? ampmStr.toUpperCase() : "")}`.trim());
    } else {
      d = new Date(`${month} ${day}, ${year} 00:00`);
    }

    if(!Number.isNaN(d.getTime())){
      const now = new Date();
      const tenMonthsMs = 1000*60*60*24*30*10;
      if(d.getTime() + tenMonthsMs < now.getTime()){
        d = new Date(`${month} ${day}, ${year+1} ${timeStr} ${ampmStr ? ampmStr.toUpperCase() : ''}`.trim());
      }
      if(!Number.isNaN(d.getTime())) return d;
    }
  }
  return null;
}

/** Rolling 7-day window for headers */
function getRollingHeaderDays(){
  const out = []
  const now = new Date()
  for(let i=0;i<7;i++){
    const d = new Date(now)
    d.setDate(now.getDate()+i)
    const key = d.toLocaleDateString([], { weekday:'short' }).slice(0,3)
    const label = `${key} ${d.toLocaleDateString([], { month:'short', day:'numeric' })}`
    out.push({ key, label })
  }
  return out
}

/** ---------- availability helpers ---------- */
function getWeeklyHours(email, role){
  const all = readAvail()
  const mine = all.filter(a => a.userEmail === email && a.role === role)
  const map = {}
  for (const d of DAYS){
    map[d] = mine.find(m=>m.day===d)?.hours || ''
  }
  return map
}

/** ---------- reminders (simple) ---------- */
function pushReminder(title, body){
  try{
    if (!('Notification' in window)) { alert(body); return }
    if (Notification.permission === 'granted'){
      new Notification(title, { body })
    } else if (Notification.permission !== 'denied'){
      Notification.requestPermission().then(perm=>{
        if (perm === 'granted') new Notification(title, { body })
        else alert(body)
      })
    } else {
      alert(body)
    }
  }catch{
    alert(body)
  }
}
function nextShift(email, role){
  const week = getWeeklyHours(email, role)
  const rolling = getRollingHeaderDays()
  for (const d of rolling){
    const hours = (week[d.key]||'').trim()
    if (hours && hours.toLowerCase()!=='off'){
      return `${d.label}, ${hours}`
    }
  }
  return null
}

/** ---------- UI helpers ---------- */
const cellCenter = {
  padding: "6px 8px",
  textAlign: "center",
  verticalAlign: "middle",
  fontSize: "11px"
};
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
};
const quiet = { fontSize: 11, color: 'var(--muted)' }
const quietMono = { ...quiet, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }
const badge = (tone="gray") => ({
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  background: tone==="green" ? "var(--ok-bg)" : tone==="amber" ? "var(--warn-bg)" : "var(--muted-bg)",
  color: tone==="green" ? "var(--ok-fg)" : tone==="amber" ? "var(--warn-fg)" : "var(--muted)",
});

/** =======================================================================
 *  AdminAssign
 *  ======================================================================= */
export default function AdminAssign(){
  const [sales, setSales] = useState(readSales())
  const [assignments, setAssignments] = useState(readAssignments())
  const [neigh, setNeigh] = useState(
    (readNeighborhoods() || []).filter(n => typeof n.day === 'string' || typeof n.day === 'undefined')
  )
  const [finishes, setFinishes] = useState(readJobFinishes())
  const users = readUsers()
  // Normalize roles to lowercase for all users
  const normalizedUsers = users.map(u => ({
    ...u,
    role: typeof u.role === 'string' ? u.role.toLowerCase() : u.role
  }));

  // --- New edit toggles ---
  const [editUnassigned, setEditUnassigned] = useState(false)
  const [editSalesmanSnap, setEditSalesmanSnap] = useState(false)
  const [editWorkerSnap, setEditWorkerSnap] = useState(false)

  // --- Add Customer form state ---
  const [addCustomer, setAddCustomer] = useState({
    name: "",
    sellerEmail: "",
    phone: "",
    address: "",
    price: "",
    notes: ""
  })

  // --- Add Worker form state ---
  const [addWorker, setAddWorker] = useState({
    name: "",
    email: ""
  })

  // workers list now includes worker, hybrid, AND admin
  const workers  = useMemo(
    () => normalizedUsers.filter(u =>
      u.role === 'worker' ||
      u.role === 'hybrid' ||
      u.role === 'admin'
    ),
    [normalizedUsers]
  )
  // salesmen (seller, hybrid, admin)
  const salesmen = useMemo(
    () => normalizedUsers.filter(u =>
      u.role === 'seller' ||
      u.role === 'hybrid' ||
      u.role === 'admin'
    ),
    [normalizedUsers]
  )

  useEffect(()=>{
    setSales(readSales())
    setAssignments(readAssignments())
    setNeigh(readNeighborhoods())
    setFinishes(readJobFinishes())
  },[])

  /** keep finishes live */
  useEffect(()=>{
    function onStorage(e){
      if(e.key === 'jobFinishes'){
        setFinishes(readJobFinishes())
      }
    }
    window.addEventListener('storage', onStorage)
    const t = setInterval(()=> setFinishes(readJobFinishes()), 15000)
    return ()=>{ window.removeEventListener('storage', onStorage); clearInterval(t) }
  },[])

  /** ---------------- UNASSIGNED ---------------- */
  const unassigned = useMemo(
    () => sales.filter(s => s.status === 'unassigned' || !s.status),
    [sales]
  )

  /** ---------------- ASSIGN / OFFER FORM ---------------- */
  const [form, setForm] = useState({
    saleId: '',
    worker1: '',
    worker2: '',
    when: ''
  })

  const doAssign = ()=>{
    if (!form.saleId || !form.worker1 || !form.worker2){
      alert('Pick a customer and two workers.'); return
    }
    const allSales = readSales()
    const idx = allSales.findIndex(s => String(s.id) === String(form.saleId))
    if (idx === -1){ alert('Customer not found.'); return }

    const w1 = users.find(u=>u.email===form.worker1)
    const w2 = users.find(u=>u.email===form.worker2)

    allSales[idx] = {
      ...allSales[idx],
      status: 'assigned',
      assignedTo: `${w1?.name||form.worker1} & ${w2?.name||form.worker2}`,
      when: form.when || ''
    }
    writeSales(allSales)
    setSales(allSales)

    // Only update assignments; do not add to neighborhoods or trigger futureUnified updates for neighborhoods
    const nextA = [
      ...readAssignments(),
      {
        id: Date.now(),
        saleId: form.saleId,
        workerEmail: form.worker1,
        worker2Email: form.worker2,
        when: form.when || '',
        status: 'assigned',
        createdAt: Date.now()
      }
    ]
    writeAssignments(nextA)
    setAssignments(nextA)

    setForm({ saleId:'', worker1:'', worker2:'', when:'' })
    alert('Assigned.')
  }

  const doOffer = ()=>{
    if (!form.saleId || !form.worker1 || !form.worker2){
      alert('Pick a customer and two workers.'); return
    }
    const allSales = readSales()
    const idx = allSales.findIndex(s => String(s.id) === String(form.saleId))
    if (idx === -1){ alert('Customer not found.'); return }

    allSales[idx] = {
      ...allSales[idx],
      status: 'offered',
      assignedTo: undefined,
      when: form.when || ''
    }
    writeSales(allSales)
    setSales(allSales)

    const nextA = [
      ...readAssignments(),
      {
        id: Date.now(),
        saleId: form.saleId,
        workerEmail: form.worker1,
        worker2Email: form.worker2,
        when: form.when || '',
        status: 'offered',
        offeredTo: [form.worker1, form.worker2],
        createdAt: Date.now()
      }
    ]
    writeAssignments(nextA)
    setAssignments(nextA)

    setForm({ saleId:'', worker1:'', worker2:'', when:'' })
    alert('Offered to selected workers.')
  }

  /** ---------------- SNAPSHOTS ---------------- */
  const salesmanSnapshot = useMemo(()=>{
    return salesmen.map(sman=>{
      const mine = sales.filter(x=>x.sellerEmail===sman.email)
      const names = mine.map(x=>x.name).filter(Boolean)
      return {
        ...sman,
        weekHours: getWeeklyHours(sman.email, 'seller'),
        soldCount: mine.length,
        soldNames: names
      }
    })
  }, [salesmen, sales])

  const workerSnapshot = useMemo(()=>{
    return workers.map(w=>{
      const now = new Date();
      const myA = assignments.filter(a=>{
        const d = parseSmartWhen(a.when);
        return (a.workerEmail===w.email || a.worker2Email===w.email) && (!d || d >= now);
      });
      const customers = myA.map(a=>{
        const sale = sales.find(s=>String(s.id)===String(a.saleId))
        return sale?.name || '(customer)'
      }).filter(Boolean)
      const whens = myA.map(a=>a.when).filter(Boolean)
      return {
        ...w,
        isScheduled: myA.some(a=>a.status==='assigned') ? 'Yes' : 'No',
        customers, whens,
        weekHours: getWeeklyHours(w.email, 'worker')
      }
    })
  }, [workers, assignments, sales])

  const todayLabel = new Date().toLocaleDateString([], {
    weekday:'long', month:'short', day:'numeric', year:'numeric'
  })

  /** ---------------- ASSIGN NEIGHBORHOOD ---------------- */
  const [hoodSeller,setHoodSeller] = useState("")
  const [hoodName,setHoodName] = useState("")
  const [hoodDay,setHoodDay] = useState("")
  const [hoodNotes,setHoodNotes] = useState("")

  function addNeighborhood(){
    if(!hoodSeller || !hoodName){
      alert("need seller + neighborhood name");
      return;
    }
    const sellerUser = users.find(u=>u.email===hoodSeller);
    const newRow = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      sellerEmail: hoodSeller,
      sellerName: sellerUser?.name || hoodSeller,
      neighborhood: hoodName,
      day: hoodDay,
      notes: hoodNotes,
      assignedAt: Date.now()
    };
    const next = [...readNeighborhoods(), newRow];
    writeNeighborhoods(next);
    setNeigh(next);

    setHoodSeller("");
    setHoodName("");
    setHoodDay("");
    setHoodNotes("");
  }

  /** ---------------- UNIFIED DATA (Future vs Past) ---------------- */
  const unifiedAll = useMemo(()=>{
    const jobs = assignments
      .filter(a=>a.status==='assigned')
      .map(a=>{
        const s = sales.find(x=> String(x.id)===String(a.saleId))
        const whenStr = a.when || "-"
        return {
          kind: "JOB",
          id: a.id,                     // assignment id
          saleId: s?.id,
          when: whenStr,
          whenDate: parseSmartWhen(whenStr),
          salesmanEmail: s?.sellerEmail || "",
          salesmanName:  s?.sellerName  || s?.sellerEmail || "-",
          street: s?.address || "",
          notes:  s?.notes || "",
          customerName: s?.name || "",  // for sold names
          price: s?.price ?? null,
          paidFlag: s?.paid ?? undefined,
        }
      })

    const routes = (neigh||[]).map(n=>{
      const whenStr = n.day || "-"
      return {
        kind: "ROUTE",
        id: n.id,
        when: whenStr,
        whenDate: parseSmartWhen(whenStr),
        salesmanEmail: n.sellerEmail || "",
        salesmanName:  n.sellerName  || n.sellerEmail || "-",
        street: n.neighborhood || "",
        notes:  n.notes || "",
      }
    })

    return [...jobs, ...routes]
  }, [assignments, sales, neigh])

  const nowTs = Date.now()
  const futureUnified = useMemo(()=>{
    return unifiedAll
      .filter(r=>{
        if(r.whenDate) return r.whenDate.getTime() >= nowTs
        return true
      })
      .sort((a,b)=>{
        const at = a.whenDate ? a.whenDate.getTime() : Infinity
        const bt = b.whenDate ? b.whenDate.getTime() : Infinity
        return at - bt
      })
  }, [unifiedAll, nowTs])

  const pastUnified = useMemo(()=>{
    return unifiedAll
      .filter(r=> r.whenDate && r.whenDate.getTime() < nowTs)
      .sort((a,b)=> b.whenDate.getTime() - a.whenDate.getTime())
  }, [unifiedAll, nowTs])

  /** --------- Edit toggles + patching usable for FUTURE and PAST --------- */
  const [editFuture, setEditFuture] = useState(false)
  const [editPast, setEditPast] = useState(false)

// small label helper
function eToPaidLabel(p){ return p ? 'Paid' : 'Unpaid' }

// upsert a worker-finish record (stores worked/paid)
function upsertFinish(assignmentId, patch){
  const list = readJobFinishes()
  const i = list.findIndex(f => String(f.assignmentId) === String(assignmentId))
  if(i >= 0){
    list[i] = { ...list[i], ...patch }
  } else {
    list.push({
      assignmentId,
      finishedAt: new Date().toISOString(),
      worked: true,
      ...patch
    })
  }
  localStorage.setItem('jobFinishes', JSON.stringify(list))
  setFinishes(list)
}

// patchSaleHistory removed (Past Sales section gone)
  function patchUnified(row, field, value){
    if(row.kind === "JOB"){
      // job writes back to sales (seller/street/notes) and assignments (when)
      if(field === "when"){
        const nextA = readAssignments().map(a => a.id===row.id ? {...a, when:value} : a)
        writeAssignments(nextA); setAssignments(nextA)
      } else if(field === "salesman"){
        const nextS = readSales().map(s=>{
          if(String(s.id)!==String(row.saleId)) return s
          const u = users.find(x=>x.email===value)
          return {...s, sellerEmail:value, sellerName:u?.name||value}
        })
        writeSales(nextS); setSales(nextS)
      } else if(field === "street"){
        const nextS = readSales().map(s => String(s.id)===String(row.saleId) ? {...s, address:value} : s)
        writeSales(nextS); setSales(nextS)
      } else if(field === "notes"){
        const nextS = readSales().map(s => String(s.id)===String(row.saleId) ? {...s, notes:value} : s)
        writeSales(nextS); setSales(nextS)
      }
    } else {
      // ROUTE: writes to neighborhoodAssignments
      if(field === "when"){
        const nextN = readNeighborhoods().map(n => n.id===row.id ? {...n, day:value} : n)
        writeNeighborhoods(nextN); setNeigh(nextN)
      } else if(field === "salesman"){
        const nextN = readNeighborhoods().map(n=>{
          if(n.id!==row.id) return n
          const u = users.find(x=>x.email===value)
          return {...n, sellerEmail:value, sellerName:u?.name||value}
        })
        writeNeighborhoods(nextN); setNeigh(nextN)
      } else if(field === "street"){
        const nextN = readNeighborhoods().map(n => n.id===row.id ? {...n, neighborhood:value} : n)
        writeNeighborhoods(nextN); setNeigh(nextN)
      } else if(field === "notes"){
        const nextN = readNeighborhoods().map(n => n.id===row.id ? {...n, notes:value} : n)
        writeNeighborhoods(nextN); setNeigh(nextN)
      }
    }
  }

  function deleteUnified(row){
    if(row.kind === "JOB"){
      const nextA = readAssignments().filter(a => a.id !== row.id)
      writeAssignments(nextA); setAssignments(nextA)
    } else {
      const nextN = readNeighborhoods().filter(n => n.id !== row.id)
      writeNeighborhoods(nextN); setNeigh(nextN)
    }
  }

  // tick to slide rows future→past without reload
  useEffect(()=>{
    const t = setInterval(()=> setAssignments(a => a), 45000)
    return ()=> clearInterval(t)
  },[])

  /** ---------- helpers for "Customers Sold" in Past Neighborhoods ---------- */
  function startOfDay(ts){
    const d = new Date(ts); d.setHours(0,0,0,0); return d.getTime()
  }
  function endOfDay(ts){
    const d = new Date(ts); d.setHours(23,59,59,999); return d.getTime()
  }
  function soldForRow(row){
    // JOB: 1 customer, the job's own sale
    if(row.kind === 'JOB'){
      const name = row.customerName || '(customer)'
      return { count: name ? 1 : 0, names: name ? [name] : [] }
    }
    // ROUTE: heuristic — sales by same salesman on same day
    if(row.kind === 'ROUTE' && row.whenDate){
      const dayStart = startOfDay(row.whenDate)
      const dayEnd   = endOfDay(row.whenDate)
      const todaysSales = readSales().filter(s =>
        s.sellerEmail === row.salesmanEmail &&
        s.createdAt &&
        Number(new Date(s.createdAt).getTime()) >= dayStart &&
        Number(new Date(s.createdAt).getTime()) <= dayEnd
      )
      const names = todaysSales.map(s => s.name).filter(Boolean)
      return { count: names.length, names }
    }
    return { count: 0, names: [] }
  }

  // Past Sale History (admin) section removed

  return (
    <div className="grid" style={{ marginTop: -52 }}>
      {/* ================= UNASSIGNED CUSTOMERS + ASSIGN/OFFER FORM ================= */}
      <div className="section-block" style={{borderTop: '4px solid var(--accent)', padding: '16px', marginBottom: 32, marginTop: 0}}>
        <div style={{background: '#f3f4f6', boxShadow: '0 2px 8px #e5e7eb', borderRadius: 8, padding: '10px 20px', marginBottom: 18, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <h2 className="section-title" style={{margin:0, fontWeight:700, fontSize:'1.35em'}}>Unassigned Customers</h2>
          <button className="btn outline" onClick={()=>{
            setEditUnassigned(v=>!v)
            if(editUnassigned){
              setSales(readSales())
            }
          }}>
            {editUnassigned ? "Done" : "Edit"}
          </button>
        </div>
        <div style={{margin: '0 0 16px 0', textAlign: 'center', color: '#a3a3a3', fontWeight: 600, fontSize: 14, letterSpacing: 1}}>
          — UNASSIGNED CUSTOMERS START —
        </div>
        <div style={{display:'flex', flexWrap:'wrap', gap:16, marginBottom:24}}>
          {unassigned.length===0 && (
            <div style={{color:'#64748b', fontSize:13, flex:'1 1 100%'}}>No unassigned customers.</div>
          )}
          {unassigned.map(s=>(
            <div className="card" key={s.id} style={{minWidth:260, maxWidth:340, flex:'1 1 260px', display:'flex', flexDirection:'column', gap:4, border:'1px solid #e5e7eb', borderRadius:10, boxShadow:'0 1px 8px #e5e7eb'}}>
              <div style={{fontWeight:700, fontSize:16, marginBottom:2}}>{s.name}</div>
              <div><span style={quiet}>Salesman:</span> {s.sellerName}</div>
              <div><span style={quiet}>Phone:</span> {s.phone || '-'}</div>
              <div><span style={quiet}>Address:</span> {s.address || '-'}</div>
              <div><span style={quiet}>Price:</span> {s.price ? `$${s.price}` : '-'}</div>
              <div><span style={quiet}>Notes:</span> {s.notes || '-'}</div>
              <div><span style={quiet}>Date:</span> {fmtDateOnly(s.createdAt)}</div>
              {editUnassigned && (
                <div style={{marginTop:8, display:'flex', gap:8}}>
                  <button
                    className="btn outline"
                    style={{fontSize:11, padding:"4px 6px", lineHeight:1, color:"var(--accent)"}}
                    onClick={()=>{
                      if(window.confirm("Are you sure?")){
                        const next = readSales().filter(x=>String(x.id)!==String(s.id))
                        writeSales(next)
                        setSales(next)
                      }
                    }}
                  >
                    Delete
                  </button>
                  <button
                    className="btn outline"
                    style={{fontSize:11, padding:"4px 6px", lineHeight:1, color:"var(--danger)"}}
                    onClick={()=>{
                      if(window.confirm("Permanently delete this customer row? This cannot be undone.")){
                        const next = readSales().filter(x=>String(x.id)!==String(s.id))
                        writeSales(next)
                        setSales(next)
                      }
                    }}
                  >
                    Delete Row
                  </button>
                </div>
              )}
            </div>
          ))}
          {editUnassigned && (
            <div className="card" style={{minWidth:260, maxWidth:340, flex:'1 1 260px', display:'flex', flexDirection:'column', gap:4, border:'1px dashed #cbd5e1', borderRadius:10, background:'#fafafa', boxShadow:'0 1px 8px #e5e7eb'}}>
              <input
                value={addCustomer.name}
                onChange={e=>setAddCustomer({...addCustomer, name:e.target.value})}
                style={inputCenter}
                placeholder="Name"
              />
              <select
                value={addCustomer.sellerEmail}
                onChange={e=>setAddCustomer({...addCustomer, sellerEmail:e.target.value})}
                style={inputCenter}
              >
                <option value="">Salesman</option>
                {normalizedUsers.filter(u=>u.role==='seller'||u.role==='hybrid'||u.role==='admin').map(u=>(
                  <option key={u.email} value={u.email}>{u.name||u.email}</option>
                ))}
              </select>
              <input
                value={addCustomer.phone}
                onChange={e=>setAddCustomer({...addCustomer, phone:e.target.value})}
                style={inputCenter}
                placeholder="Phone"
              />
              <input
                value={addCustomer.address}
                onChange={e=>setAddCustomer({...addCustomer, address:e.target.value})}
                style={inputCenter}
                placeholder="Address"
              />
              <input
                type="number"
                value={addCustomer.price}
                onChange={e=>setAddCustomer({...addCustomer, price:e.target.value})}
                style={inputCenter}
                placeholder="Price"
              />
              <input
                value={addCustomer.notes}
                onChange={e=>setAddCustomer({...addCustomer, notes:e.target.value})}
                style={inputCenter}
                placeholder="Notes"
              />
              <button
                className="btn outline"
                style={{marginTop:8}}
                onClick={()=>{
                  // Validate
                  if(!addCustomer.name || !addCustomer.sellerEmail){
                    alert("Name and Salesman required"); return;
                  }
                  const sellerUser = users.find(u=>u.email===addCustomer.sellerEmail);
                  const newRec = {
                    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
                    name: addCustomer.name,
                    sellerEmail: addCustomer.sellerEmail,
                    sellerName: sellerUser?.name || addCustomer.sellerEmail,
                    phone: addCustomer.phone,
                    address: addCustomer.address,
                    price: addCustomer.price,
                    notes: addCustomer.notes,
                    status: "unassigned",
                    createdAt: Date.now()
                  };
                  const next = [...readSales(), newRec];
                  writeSales(next);
                  setSales(next);
                  setAddCustomer({ name: "", sellerEmail: "", phone: "", address: "", price: "", notes: "" });
                }}
              >
                Add Customer
              </button>
            </div>
          )}
        </div>
        <div style={{margin: '0 0 24px 0', textAlign: 'center', color: '#a3a3a3', fontWeight: 600, fontSize: 14, letterSpacing: 1}}>
          
        </div>
        <div className="grid" style={{marginTop:-30, marginBottom: 0}}>
          <div className="row" style={{display:'flex', flexWrap:'wrap', gap:16}}>
            <div style={{flex:2, minWidth:220}}>
              <label>Select Customer</label>
              <select
                value={form.saleId}
                onChange={e=>setForm({...form, saleId:e.target.value})}
                style={inputCenter}
              >
                <option value="">—</option>
                {unassigned.map(s=>(
                  <option key={s.id} value={s.id}>
                    {s.name} • {s.address}
                  </option>
                ))}
              </select>
            </div>
            <div style={{flex:2, minWidth:220}}>
              <label>Worker 1</label>
              <select
                value={form.worker1}
                onChange={e=>setForm({...form, worker1:e.target.value})}
                style={inputCenter}
              >
                <option value="">—</option>
                {normalizedUsers.filter(w=>w.role==='worker'||w.role==='hybrid'||w.role==='admin').map(w=>(
                  <option key={w.email} value={w.email}>
                    {w.name || w.email}
                  </option>
                ))}
              </select>
            </div>
            <div style={{flex:2, minWidth:220}}>
              <label>Worker 2</label>
              <select
                value={form.worker2}
                onChange={e=>setForm({...form, worker2:e.target.value})}
                style={inputCenter}
              >
                <option value="">—</option>
                {normalizedUsers.filter(w=>w.role==='worker'||w.role==='hybrid'||w.role==='admin').map(w=>(
                  <option key={w.email} value={w.email}>
                    {w.name || w.email}
                  </option>
                ))}
              </select>
            </div>
            <div style={{flex:2, minWidth:220}}>
              <label>Date &amp; Time</label>
              <div style={{display:'flex', gap:6}}>
                <input
                  type="date"
                  value={form.when && form.when.includes('T') ? form.when.split('T')[0] : ""}
                  onChange={e=>{
                    const date = e.target.value
                    const time = form.when && form.when.includes('T') ? form.when.split('T')[1] : ""
                    setForm({...form, when: date && time ? `${date}T${time}` : date})
                  }}
                  style={inputCenter}
                  placeholder="Date"
                />
                <input
                  type="time"
                  value={form.when && form.when.includes('T') ? form.when.split('T')[1] : ""}
                  onChange={e=>{
                    const time = e.target.value
                    const date = form.when && form.when.includes('T') ? form.when.split('T')[0] : form.when
                    setForm({...form, when: date && time ? `${date}T${time}` : date})
                  }}
                  style={inputCenter}
                  placeholder="Time"
                />
              </div>
            </div>
          </div>
          <div className="toolbar" style={{display:'flex', gap:8, justifyContent:'center', marginTop:12}}>
            <button className="btn" onClick={doAssign}>Assign</button>
            <button className="btn outline" onClick={doOffer}>Offer to Workers</button>
          </div>
        </div>
      </div>
      <div style={{margin:'32px 0 0 0', textAlign:'center', color:'#a3a3a3', fontWeight:600, fontSize:14, letterSpacing:1}}>
        {/* Divider after section */}
        
      </div>

      {/* ================= SALESMAN SNAPSHOT ================= */}
      <div className="section-block" style={{borderTop: '4px solid var(--accent)', padding: '16px', marginBottom: 32, marginTop: 0}}>
        <div style={{background: '#f3f4f6', boxShadow: '0 2px 8px #e5e7eb', borderRadius: 8, padding: '10px 20px', marginBottom: 18, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <h2 className="section-title" style={{margin:0, fontWeight:700, fontSize:'1.35em'}}>Salesman Snapshot</h2>
          <button className="btn outline" onClick={()=>{
            setEditSalesmanSnap(v=>!v)
            if(editSalesmanSnap){
              setSales(readSales())
              setAssignments(readAssignments())
              setNeigh(readNeighborhoods())
            }
          }}>
            {editSalesmanSnap ? "Done" : "Edit"}
          </button>
        </div>
        <div style={{margin: '0 0 16px 0', textAlign: 'center', color: '#a3a3a3', fontWeight: 600, fontSize: 14, letterSpacing: 1}}>
          — SALESMAN SNAPSHOT START —
        </div>
        <div style={{display:'flex', flexWrap:'wrap', gap:16, marginBottom:24}}>
          {salesmanSnapshot.length===0 && (
            <div style={{color:'#64748b', fontSize:13, flex:'1 1 100%'}}>No salesmen.</div>
          )}
          {salesmanSnapshot.map(s=>(
            <div className="card" key={s.email} style={{minWidth:260, maxWidth:360, flex:'1 1 260px', display:'flex', flexDirection:'column', gap:4, border:'1px solid #e5e7eb', borderRadius:10, boxShadow:'0 1px 8px #e5e7eb', paddingBottom:10}}>
              {editSalesmanSnap ? (
                <>
                  <input
                    type="text"
                    value={(() => {
                      const allUsers = readUsers()
                      const idx = allUsers.findIndex(u=>u.email===s.email)
                      if(idx>=0 && typeof allUsers[idx].name === 'string') {
                        return allUsers[idx].name
                      }
                      return s.name || ''
                    })()}
                    style={inputCenter}
                    placeholder="Salesman Name"
                    onChange={e=>{
                      const val = e.target.value
                      const allUsers = readUsers()
                      const idx = allUsers.findIndex(u=>u.email===s.email)
                      if(idx>=0){
                        let user = {...allUsers[idx]}
                        user.name = val
                        allUsers[idx] = user
                        localStorage.setItem('users_seed', JSON.stringify(allUsers))
                        setSales(readSales())
                        setAssignments(readAssignments())
                      }
                    }}
                  />
                  <input
                    type="text"
                    value={(() => {
                      const allUsers = readUsers()
                      const idx = allUsers.findIndex(u=>u.email===s.email)
                      if(idx>=0 && allUsers[idx].salesmanSnapshot && typeof allUsers[idx].salesmanSnapshot.soldNames === 'string') {
                        return allUsers[idx].salesmanSnapshot.soldNames
                      }
                      return s.soldNames?.join(', ') || ''
                    })()}
                    style={inputCenter}
                    placeholder="Names, comma-separated"
                    onChange={e=>{
                      const val = e.target.value
                      const allUsers = readUsers()
                      const idx = allUsers.findIndex(u=>u.email===s.email)
                      if(idx>=0){
                        let user = {...allUsers[idx]}
                        user.salesmanSnapshot = {...(user.salesmanSnapshot||{}), soldNames: val}
                        allUsers[idx] = user
                        localStorage.setItem('users_seed', JSON.stringify(allUsers))
                        setSales(readSales())
                        setAssignments(readAssignments())
                      }
                    }}
                  />
                  <input
                    type="number"
                    value={(() => {
                      const allUsers = readUsers()
                      const idx = allUsers.findIndex(u=>u.email===s.email)
                      if(idx>=0 && allUsers[idx].salesmanSnapshot && typeof allUsers[idx].salesmanSnapshot.soldCount !== 'undefined') {
                        return allUsers[idx].salesmanSnapshot.soldCount
                      }
                      return s.soldCount || 0
                    })()}
                    min={0}
                    style={{...inputCenter, marginTop: 4}}
                    onChange={e=>{
                      const val = parseInt(e.target.value,10)
                      const allUsers = readUsers()
                      const idx = allUsers.findIndex(u=>u.email===s.email)
                      if(idx>=0){
                        let user = {...allUsers[idx]}
                        user.salesmanSnapshot = {...(user.salesmanSnapshot||{}), soldCount: val}
                        allUsers[idx] = user
                        localStorage.setItem('users_seed', JSON.stringify(allUsers))
                        setSales(readSales())
                        setAssignments(readAssignments())
                      }
                    }}
                    placeholder="Sold count"
                  />
                  <div style={{marginTop:8, fontWeight:600, marginBottom:2}}>Weekly Hours</div>
                  <div style={{display:'flex', flexWrap:'wrap', gap:4}}>
                    {getRollingHeaderDays().map(d=>(
                      <div key={d.label} style={{flex:'1 1 80px'}}>
                        <div style={quiet}>{d.label}</div>
                        <input
                          value={s.weekHours[d.key]||""}
                          onChange={e=>{
                            const avail = readAvail()
                            const idx = avail.findIndex(a=>a.userEmail===s.email && a.role==='seller' && a.day===d.key)
                            let nextAvail
                            if(idx>=0){
                              nextAvail = [...avail]
                              nextAvail[idx] = {...nextAvail[idx], hours:e.target.value}
                            } else {
                              nextAvail = [...avail, {userEmail:s.email, role:'seller', day:d.key, hours:e.target.value}]
                            }
                            localStorage.setItem('availability', JSON.stringify(nextAvail))
                            setSales(readSales())
                            setAssignments(readAssignments())
                          }}
                          style={inputCenter}
                          placeholder="Hours"
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    className="btn outline"
                    style={{marginTop:8}}
                    onClick={()=>{
                      const nxt = nextShift(s.email,'seller')
                      pushReminder(
                        'Next Shift',
                        nxt ? `${s.name} — ${nxt}` : `${s.name}: no upcoming hours found.`
                      )
                    }}
                  >
                    Remind
                  </button>
                </>
              ) : (
                <>
                  <div style={{fontWeight:700, fontSize:16}}>{s.name}</div>
                  <div>
                    <span style={quiet}>Customers sold:</span>{" "}
                    {(() => {
                      const allUsers = readUsers()
                      const idx = allUsers.findIndex(u=>u.email===s.email)
                      let soldNames = null
                      if(idx>=0 && allUsers[idx].salesmanSnapshot && typeof allUsers[idx].salesmanSnapshot.soldNames === 'string') {
                        soldNames = allUsers[idx].salesmanSnapshot.soldNames
                      }
                      const showNames = soldNames || (s.soldNames?.join(', ') || '')
                      return (
                        <>
                          <span style={{fontWeight:700}}>
                            {(() => {
                              if(idx>=0 && allUsers[idx].salesmanSnapshot && typeof allUsers[idx].salesmanSnapshot.soldCount !== 'undefined') {
                                return allUsers[idx].salesmanSnapshot.soldCount
                              }
                              return s.soldCount || 0
                            })()}
                          </span>
                          {showNames && (
                            <div style={quiet}>
                              {showNames}
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>
                  <div style={{marginTop:8, fontWeight:600, marginBottom:2}}>Weekly Hours</div>
                  <div style={{display:'flex', flexWrap:'wrap', gap:4}}>
                    {getRollingHeaderDays().map(d=>(
                      <div key={d.label} style={{flex:'1 1 80px'}}>
                        <div style={quiet}>{d.label}</div>
                        <div style={{fontSize:13, fontFamily:'monospace'}}>{s.weekHours[d.key]||'-'}</div>
                      </div>
                    ))}
                  </div>
                  <button
                    className="btn outline"
                    style={{marginTop:8}}
                    onClick={()=>{
                      const nxt = nextShift(s.email,'seller')
                      pushReminder(
                        'Next Shift',
                        nxt ? `${s.name} — ${nxt}` : `${s.name}: no upcoming hours found.`
                      )
                    }}
                  >
                    Remind
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        <div style={{margin: '0 0 24px 0', textAlign: 'center', color: '#a3a3a3', fontWeight: 600, fontSize: 14, letterSpacing: 1}}>
          
        </div>
      </div>

      {/* ================= WORKER SNAPSHOT ================= */}
      <div className="section-block" style={{borderTop: '4px solid var(--accent)', padding: '16px', marginBottom: 32, marginTop: 0}}>
        <div style={{background: '#f3f4f6', boxShadow: '0 2px 8px #e5e7eb', borderRadius: 8, padding: '10px 20px', marginBottom: 18, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <h2 className="section-title" style={{margin:0, fontWeight:700, fontSize:'1.35em'}}>Worker Snapshot</h2>
          <button className="btn outline" onClick={()=>{
            setEditWorkerSnap(v=>!v)
            if(editWorkerSnap){
              setAssignments(readAssignments())
              setSales(readSales())
            }
          }}>
            {editWorkerSnap ? "Done" : "Edit"}
          </button>
        </div>
        <div style={{margin: '0 0 16px 0', textAlign: 'center', color: '#a3a3a3', fontWeight: 600, fontSize: 14, letterSpacing: 1}}>
          — WORKER SNAPSHOT START —
        </div>
        <div style={{display:'flex', flexWrap:'wrap', gap:16, marginBottom:24}}>
          {workerSnapshot.length===0 && (
            <div style={{color:'#64748b', fontSize:13, flex:'1 1 100%'}}>No workers.</div>
          )}
          {workerSnapshot.map(w=>(
            <div className="card" key={w.email} style={{minWidth:260, maxWidth:360, flex:'1 1 260px', display:'flex', flexDirection:'column', gap:4, border:'1px solid #e5e7eb', borderRadius:10, boxShadow:'0 1px 8px #e5e7eb', paddingBottom:10}}>
              {editWorkerSnap ? (
                <>
                  <input
                    type="text"
                    value={(() => {
                      const allUsers = readUsers()
                      const idx = allUsers.findIndex(u=>u.email===w.email)
                      if(idx>=0 && typeof allUsers[idx].name === 'string') {
                        return allUsers[idx].name
                      }
                      return w.name || ''
                    })()}
                    style={inputCenter}
                    placeholder="Worker Name"
                    onChange={e=>{
                      const val = e.target.value
                      const allUsers = readUsers()
                      const idx = allUsers.findIndex(u=>u.email===w.email)
                      if(idx>=0){
                        let user = {...allUsers[idx]}
                        user.name = val
                        allUsers[idx] = user
                        localStorage.setItem('users_seed', JSON.stringify(allUsers))
                        writeAssignments(readAssignments())
                        setAssignments(readAssignments())
                      }
                    }}
                  />
                  <input
                    type="text"
                    value={(() => {
                      const allUsers = readUsers()
                      const idx = allUsers.findIndex(u=>u.email===w.email)
                      if(idx>=0 && typeof allUsers[idx].workerSnapshot === 'object' && typeof allUsers[idx].workerSnapshot.isScheduled === 'string') {
                        return allUsers[idx].workerSnapshot.isScheduled
                      }
                      return w.isScheduled || (w.customers?.length>0 ? 'Yes':'No')
                    })()}
                    style={inputCenter}
                    placeholder="Scheduled?"
                    onChange={e=>{
                      const val = e.target.value
                      const allUsers = readUsers()
                      const idx = allUsers.findIndex(u=>u.email===w.email)
                      if(idx>=0){
                        let user = {...allUsers[idx]}
                        user.workerSnapshot = {...(user.workerSnapshot||{}), isScheduled: val}
                        allUsers[idx] = user
                        localStorage.setItem('users_seed', JSON.stringify(allUsers))
                        writeAssignments(readAssignments())
                        setAssignments(readAssignments())
                      }
                    }}
                  />
                  <input
                    type="text"
                    value={(() => {
                      const allUsers = readUsers()
                      const idx = allUsers.findIndex(u=>u.email===w.email)
                      if(idx>=0 && allUsers[idx].workerSnapshot && typeof allUsers[idx].workerSnapshot.customers === 'string') {
                        return allUsers[idx].workerSnapshot.customers
                      }
                      return w.customers?.join(', ') || ''
                    })()}
                    style={inputCenter}
                    placeholder="Customers"
                    onChange={e=>{
                      const val = e.target.value
                      const allUsers = readUsers()
                      const idx = allUsers.findIndex(u=>u.email===w.email)
                      if(idx>=0){
                        let user = {...allUsers[idx]}
                        user.workerSnapshot = {...(user.workerSnapshot||{}), customers: val}
                        allUsers[idx] = user
                        localStorage.setItem('users_seed', JSON.stringify(allUsers))
                        writeAssignments(readAssignments())
                        setAssignments(readAssignments())
                      }
                    }}
                  />
                  <input
                    type="text"
                    value={(() => {
                      const allUsers = readUsers()
                      const idx = allUsers.findIndex(u=>u.email===w.email)
                      if(idx>=0 && allUsers[idx].workerSnapshot && typeof allUsers[idx].workerSnapshot.whens === 'string') {
                        return allUsers[idx].workerSnapshot.whens
                      }
                      return w.whens?.join(' • ') || ''
                    })()}
                    style={inputCenter}
                    placeholder="When(s)"
                    onChange={e=>{
                      const val = e.target.value
                      const allUsers = readUsers()
                      const idx = allUsers.findIndex(u=>u.email===w.email)
                      if(idx>=0){
                        let user = {...allUsers[idx]}
                        user.workerSnapshot = {...(user.workerSnapshot||{}), whens: val}
                        allUsers[idx] = user
                        localStorage.setItem('users_seed', JSON.stringify(allUsers))
                        writeAssignments(readAssignments())
                        setAssignments(readAssignments())
                      }
                    }}
                  />
                  <div style={{marginTop:8, fontWeight:600, marginBottom:2}}>Weekly Hours</div>
                  <div style={{display:'flex', flexWrap:'wrap', gap:4}}>
                    {getRollingHeaderDays().map(d=>(
                      <div key={d.label} style={{flex:'1 1 80px'}}>
                        <div style={quiet}>{d.label}</div>
                        <input
                          value={w.weekHours[d.key]||""}
                          onChange={e=>{
                            const avail = readAvail()
                            const idx = avail.findIndex(a=>a.userEmail===w.email && a.role==='worker' && a.day===d.key)
                            let nextAvail
                            if(idx>=0){
                              nextAvail = [...avail]
                              nextAvail[idx] = {...nextAvail[idx], hours:e.target.value}
                            } else {
                              nextAvail = [...avail, {userEmail:w.email, role:'worker', day:d.key, hours:e.target.value}]
                            }
                            localStorage.setItem('availability', JSON.stringify(nextAvail))
                            writeAssignments(readAssignments())
                            setAssignments(readAssignments())
                          }}
                          style={inputCenter}
                          placeholder="Hours"
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    className="btn outline"
                    style={{marginTop:8}}
                    onClick={()=>{
                      const nxt = nextShift(w.email,'worker')
                      pushReminder(
                        'Next Shift',
                        nxt ? `${w.name} — ${nxt}` : `${w.name}: no upcoming hours found.`
                      )
                    }}
                  >
                    Remind
                  </button>
                </>
              ) : (
                <>
                  <div style={{fontWeight:700, fontSize:16}}>{w.name}</div>
                  <div>
                    <span style={quiet}>Scheduled:</span>{" "}
                    <span style={badge(w.customers?.length>0 ? 'green' : 'amber')}>
                      {w.customers?.length>0 ? 'Yes':'No'}
                    </span>
                  </div>
                  <div>
                    <span style={quiet}>Customers:</span> {w.customers?.length>0 ? w.customers.join(', ') : '-'}
                  </div>
                  <div>
                    <span style={quiet}>When(s):</span>{" "}
                    {(() => {
                      const fmt = w.whens?.length>0 ? w.whens.map(d => {
                        const date = new Date(d);
                        if(isNaN(date)) return d;
                        return date.toLocaleString('en-US', {
                          month:'short', day:'numeric', hour:'numeric', minute:'2-digit'
                        });
                      }).join(' • ') : '-';
                      return fmt;
                    })()}
                  </div>
                  <div style={{marginTop:8, fontWeight:600, marginBottom:2}}>Weekly Hours</div>
                  <div style={{display:'flex', flexWrap:'wrap', gap:4}}>
                    {getRollingHeaderDays().map(d=>(
                      <div key={d.label} style={{flex:'1 1 80px'}}>
                        <div style={quiet}>{d.label}</div>
                        <div style={{fontSize:13, fontFamily:'monospace'}}>{w.weekHours[d.key]||'-'}</div>
                      </div>
                    ))}
                  </div>
                  <button
                    className="btn outline"
                    style={{marginTop:8}}
                    onClick={()=>{
                      const nxt = nextShift(w.email,'worker')
                      pushReminder(
                        'Next Shift',
                        nxt ? `${w.name} — ${nxt}` : `${w.name}: no upcoming hours found.`
                      )
                    }}
                  >
                    Remind
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        <div style={{margin: '0 0 24px 0', textAlign: 'center', color: '#a3a3a3', fontWeight: 600, fontSize: 14, letterSpacing: 1}}>
          
        </div>
      </div>

      {/* ================= ASSIGN NEIGHBORHOOD ================= */}
      <div className="section-block" style={{borderTop: '4px solid var(--accent)', padding: '16px', marginBottom: 32, marginTop: 0}}>
        <div style={{background: '#f3f4f6', boxShadow: '0 2px 8px #e5e7eb', borderRadius: 8, padding: '10px 20px', marginBottom: 18, display:'flex', alignItems:'center'}}>
          <h2 className="section-title" style={{margin:0, fontWeight:700, fontSize:'1.35em'}}>Assign Neighborhood</h2>
        </div>
        <div style={{margin: '0 0 16px 0', textAlign: 'center', color: '#a3a3a3', fontWeight: 600, fontSize: 14, letterSpacing: 1}}>
          — ASSIGN NEIGHBORHOOD START —
        </div>
        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',
          gap:12
        }}>
          <div>
            <div style={{fontSize:12, fontWeight:600, marginBottom:4}}>Seller</div>
            <select
              style={inputCenter}
              value={hoodSeller}
              onChange={e=>setHoodSeller(e.target.value)}
            >
              <option value="">Choose seller…</option>
              {normalizedUsers
                .filter(u=>u.role==='seller' || u.role==='hybrid' || u.role==='admin')
                .map(u=>(
                  <option key={u.email} value={u.email}>{u.name}</option>
                ))}
            </select>
          </div>
          <div>
            <div style={{fontSize:12, fontWeight:600, marginBottom:4}}>
              Neighborhood / Route Name
            </div>
            <input
              style={inputCenter}
              placeholder="River Oaks / Spring Trails..."
              value={hoodName}
              onChange={e=>setHoodName(e.target.value)}
            />
          </div>
          <div>
            <div style={{fontSize:12, fontWeight:600, marginBottom:4}}>
              Day / Time Window
            </div>
            <div style={{display:'flex', gap:6}}>
              <input
                type="date"
                style={inputCenter}
                placeholder="Date"
                value={hoodDay && hoodDay.includes('T') ? hoodDay.split('T')[0] : ""}
                onChange={e=>{
                  const date = e.target.value
                  const time = hoodDay && hoodDay.includes('T') ? hoodDay.split('T')[1] : ""
                  setHoodDay(date && time ? `${date}T${time}` : date)
                }}
              />
              <input
                type="time"
                style={inputCenter}
                placeholder="Time"
                value={hoodDay && hoodDay.includes('T') ? hoodDay.split('T')[1] : ""}
                onChange={e=>{
                  const time = e.target.value
                  const date = hoodDay && hoodDay.includes('T') ? hoodDay.split('T')[0] : hoodDay
                  setHoodDay(date && time ? `${date}T${time}` : date)
                }}
              />
            </div>
          </div>
          <div>
            <div style={{fontSize:12, fontWeight:600, marginBottom:4}}>Notes</div>
            <input
              style={inputCenter}
              placeholder="Meet at Starbucks lot / HOA ok'd"
              value={hoodNotes}
              onChange={e=>setHoodNotes(e.target.value)}
            />
          </div>
        </div>
        <div style={{display:'flex', justifyContent:'center'}}>
          <button
            className="btn"
            style={{marginTop:12}}
            onClick={addNeighborhood}
          >
            Save Neighborhood
          </button>
        </div>
        <div style={{margin: '24px 0 0 0', textAlign: 'center', color: '#a3a3a3', fontWeight: 600, fontSize: 14, letterSpacing: 1}}>
          
        </div>
      </div>

      {/* ================= FUTURE NEIGHBORHOOD (Unified) ================= */}
      <div className="section-block" style={{borderTop: '4px solid var(--accent)', padding: '16px', marginBottom: 32, marginTop: 0}}>
        <div style={{background: '#f3f4f6', boxShadow: '0 2px 8px #e5e7eb', borderRadius: 8, padding: '10px 20px', marginBottom: 18, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <h2 className="section-title" style={{margin:0, fontWeight:700, fontSize:'1.35em'}}>Future Neighborhood</h2>
          <button className="btn outline" onClick={()=>{
            setEditFuture(v=>!v)
            if(editFuture){
              setNeigh(readNeighborhoods())
              setAssignments(readAssignments())
              setSales(readSales())
            }
          }}>
            {editFuture ? "Done" : "Edit"}
          </button>
        </div>
        <div style={{margin: '0 0 16px 0', textAlign: 'center', color: '#a3a3a3', fontWeight: 600, fontSize: 14, letterSpacing: 1}}>
          — FUTURE NEIGHBORHOOD START —
        </div>
        <div style={{display:'flex', flexWrap:'wrap', gap:16, marginBottom:24}}>
          {futureUnified.length===0 && (
            <div style={{color:'var(--muted)', fontSize:13, flex:'1 1 100%'}}>Nothing scheduled yet.</div>
          )}
          {futureUnified.map(row=>(
            <div className="card" key={`${row.kind}-${row.id}`} style={{minWidth:260, maxWidth:360, flex:'1 1 260px', display:'flex', flexDirection:'column', gap:4, border:'1px solid #e5e7eb', borderRadius:10, boxShadow:'0 1px 8px #e5e7eb', paddingBottom:10}}>
              {editFuture ? (
                <>
                  <div>
                    <span style={quiet}>When / Day:</span>
                    <div style={{display:'flex', gap:6}}>
                      <input
                        type="date"
                        value={typeof row.when === 'string' && row.when.includes('T') ? row.when.split('T')[0] : ""}
                        onChange={e=>{
                          const date = e.target.value
                          const time = typeof row.when === 'string' && row.when.includes('T') ? row.when.split('T')[1] : ""
                          patchUnified(row, "when", date && time ? `${date}T${time}` : date)
                        }}
                        style={inputCenter}
                        placeholder="Date"
                      />
                      <input
                        type="time"
                        value={typeof row.when === 'string' && row.when.includes('T') ? row.when.split('T')[1] : ""}
                        onChange={e=>{
                          const time = e.target.value
                          const date = typeof row.when === 'string' && row.when.includes('T') ? row.when.split('T')[0] : row.when
                          patchUnified(row, "when", date && time ? `${date}T${time}` : date)
                        }}
                        style={inputCenter}
                        placeholder="Time"
                      />
                    </div>
                  </div>
                  <div>
                    <span style={quiet}>Salesman:</span>
                    <select
                      value={row.salesmanEmail || ""}
                      onChange={(e)=>patchUnified(row, "salesman", e.target.value)}
                      style={inputCenter}
                    >
                      <option value="">—</option>
                      {salesmen.map(u=>(
                        <option key={u.email} value={u.email}>{u.name||u.email}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span style={quiet}>Street:</span>
                    <input
                      value={row.street || ""}
                      onChange={(e)=>patchUnified(row, "street", e.target.value)}
                      placeholder="123 Main St / Midtown"
                      style={inputCenter}
                    />
                  </div>
                  <div>
                    <span style={quiet}>Notes:</span>
                    <input
                      value={row.notes || ""}
                      onChange={(e)=>patchUnified(row, "notes", e.target.value)}
                      placeholder="Gate code 1234; meet at cul-de-sac"
                      style={inputCenter}
                    />
                  </div>
                  <button
                    className="btn outline"
                    style={{fontSize:11, padding:"4px 6px", marginTop:8, lineHeight:1, color:"var(--accent)", alignSelf:'flex-start'}}
                    onClick={()=>{
                      if(window.confirm("Delete this row?")){
                        deleteUnified(row)
                      }
                    }}
                  >
                    Delete
                  </button>
                </>
              ) : (
                <>
                  <div><span style={quiet}>When / Day:</span> {row.when || "-"}</div>
                  <div><span style={quiet}>Salesman:</span> {row.salesmanName || "-"}</div>
                  <div><span style={quiet}>Street:</span> {row.street || "-"}</div>
                  <div><span style={quiet}>Notes:</span> {row.notes || "-"}</div>
                </>
              )}
            </div>
          ))}
                {editFuture && (
                  <div className="card" style={{minWidth:260, maxWidth:360, flex:'1 1 260px', display:'flex', flexDirection:'column', gap:4, border:'1px dashed #cbd5e1', borderRadius:10, background:'#fafafa', boxShadow:'0 1px 8px #e5e7eb'}}>
                    <FutureAddRow
                      salesmen={salesmen}
                      onAdd={row => {
                        const next = [...readNeighborhoods(), row]
                        writeNeighborhoods(next)
                        setNeigh(next)
                      }}
                    />
                  </div>
                )}
        </div>
        <div style={{fontSize:12, color:'var(--muted)', marginTop:8, lineHeight:1.4, textAlign:'center'}}>
          Tip: Use an ISO datetime (e.g., <code>2025-11-07T16:00</code>) for <strong>When</strong> to guarantee correct future→past movement.
        </div>
        <div style={{margin: '24px 0 0 0', textAlign: 'center', color: '#a3a3a3', fontWeight: 600, fontSize: 14, letterSpacing: 1}}>
          
        </div>
      </div>

      {/* ================= PAST NEIGHBORHOOD (Unified) ================= */}
      <div className="section-block" style={{borderTop: '4px solid var(--accent)', padding: '16px', marginBottom: 32, marginTop: 0}}>
        <div style={{background: '#f3f4f6', boxShadow: '0 2px 8px #e5e7eb', borderRadius: 8, padding: '10px 20px', marginBottom: 18, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <h2 className="section-title" style={{margin:0, fontWeight:700, fontSize:'1.35em'}}>Past Neighborhood</h2>
          <button className="btn outline" onClick={()=>{
            setEditPast(v=>!v)
            if(editPast){
              setNeigh(readNeighborhoods())
              setAssignments(readAssignments())
              setSales(readSales())
            }
          }}>
            {editPast ? "Done" : "Edit"}
          </button>
        </div>
        <div style={{margin: '0 0 16px 0', textAlign: 'center', color: '#a3a3a3', fontWeight: 600, fontSize: 14, letterSpacing: 1}}>
          — PAST NEIGHBORHOOD START —
        </div>
        <div style={{display:'flex', flexWrap:'wrap', gap:16, marginBottom:24}}>
          {pastUnified.length===0 && (
            <div style={{color:'var(--muted)', fontSize:13, flex:'1 1 100%'}}>No past neighborhoods yet.</div>
          )}
          {pastUnified.map(row=>{
            const sold = soldForRow(row)
            return (
              <div className="card" key={`past-${row.kind}-${row.id}`} style={{minWidth:260, maxWidth:360, flex:'1 1 260px', display:'flex', flexDirection:'column', gap:4, border:'1px solid #e5e7eb', borderRadius:10, boxShadow:'0 1px 8px #e5e7eb', paddingBottom:10}}>
                {editPast ? (
                  <>
                    <div>
                      <span style={quiet}>When / Day:</span>
                      <div style={{display:'flex', gap:6}}>
                        <input
                          type="date"
                          value={typeof row.when === 'string' && row.when.includes('T') ? row.when.split('T')[0] : ""}
                          onChange={e=>{
                            const date = e.target.value
                            const time = typeof row.when === 'string' && row.when.includes('T') ? row.when.split('T')[1] : ""
                            patchUnified(row, "when", date && time ? `${date}T${time}` : date)
                          }}
                          style={inputCenter}
                          placeholder="Date"
                        />
                        <input
                          type="time"
                          value={typeof row.when === 'string' && row.when.includes('T') ? row.when.split('T')[1] : ""}
                          onChange={e=>{
                            const time = e.target.value
                            const date = typeof row.when === 'string' && row.when.includes('T') ? row.when.split('T')[0] : row.when
                            patchUnified(row, "when", date && time ? `${date}T${time}` : date)
                          }}
                          style={inputCenter}
                          placeholder="Time"
                        />
                      </div>
                    </div>
                    <div>
                      <span style={quiet}>Salesman:</span>
                      <select
                        value={row.salesmanEmail || ""}
                        onChange={(e)=>patchUnified(row, "salesman", e.target.value)}
                        style={inputCenter}
                      >
                        <option value="">—</option>
                        {salesmen.map(u=>(
                          <option key={u.email} value={u.email}>{u.name||u.email}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span style={quiet}>Street:</span>
                      <input
                        value={row.street || ""}
                        onChange={(e)=>patchUnified(row, "street", e.target.value)}
                        placeholder="123 Main St / Midtown"
                        style={inputCenter}
                      />
                    </div>
                    <div>
                      <span style={quiet}>Notes:</span>
                      <input
                        value={row.notes || ""}
                        onChange={(e)=>patchUnified(row, "notes", e.target.value)}
                        placeholder="Gate code 1234; meet at cul-de-sac"
                        style={inputCenter}
                      />
                    </div>
                    <div>
                      <span style={quiet}>Customers Sold:</span>
                      <input
                        value={sold.names.join(', ')}
                        onChange={()=>{}}
                        style={inputCenter}
                        placeholder="Customers Sold"
                        readOnly
                      />
                    </div>
                    <button
                      className="btn outline"
                      style={{fontSize:11, padding:"4px 6px", marginTop:8, lineHeight:1, color:"var(--accent)", alignSelf:'flex-start'}}
                      onClick={()=>{
                        if(window.confirm("Delete this row?")){
                          deleteUnified(row)
                        }
                      }}
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <>
                    <div><span style={quiet}>When / Day:</span> {row.when || "-"}</div>
                    <div><span style={quiet}>Salesman:</span> {row.salesmanName || "-"}</div>
                    <div><span style={quiet}>Street:</span> {row.street || "-"}</div>
                    <div><span style={quiet}>Notes:</span> {row.notes || "-"}</div>
                    <div>
                      <span style={quiet}>Customers Sold:</span>
                      <span style={{fontWeight:700, marginLeft:4}}>{sold.count}</span>
                      {sold.names.length>0 && (
                        <div style={quiet}>{sold.names.join(', ')}</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
                {editPast && (
                  <div className="card" style={{minWidth:260, maxWidth:360, flex:'1 1 260px', display:'flex', flexDirection:'column', gap:4, border:'1px dashed #cbd5e1', borderRadius:10, background:'#fafafa', boxShadow:'0 1px 8px #e5e7eb'}}>
                    <FutureAddRow
                      salesmen={salesmen}
                      onAdd={row => {
                        const next = [...readNeighborhoods(), row]
                        writeNeighborhoods(next)
                        setNeigh(next)
                      }}
                      isPast
                    />
                  </div>
                )}
        </div>
        <div style={{margin: '24px 0 0 0', textAlign: 'center', color: '#a3a3a3', fontWeight: 600, fontSize: 14, letterSpacing: 1}}>
          — END —
        </div>
      </div>

      {/* ================= PAST SALES ================= */}
      {/* Past Sales section removed as per instructions */}

    </div>
  )
}
// --- Inline Add Row for Future/Past Neighborhood ---
function getHoustonDateTimeNow() {
  // Houston is America/Chicago
  try {
    const now = new Date();
    // Format as YYYY-MM-DD and HH:mm in America/Chicago
    const houston = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
    const pad = n => String(n).padStart(2, '0');
    const yyyy = houston.getFullYear();
    const mm = pad(houston.getMonth()+1);
    const dd = pad(houston.getDate());
    const hh = pad(houston.getHours());
    const min = pad(houston.getMinutes());
    return {
      date: `${yyyy}-${mm}-${dd}`,
      time: `${hh}:${min}`
    };
  } catch {
    // fallback to local
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const yyyy = now.getFullYear();
    const mm = pad(now.getMonth()+1);
    const dd = pad(now.getDate());
    const hh = pad(now.getHours());
    const min = pad(now.getMinutes());
    return {
      date: `${yyyy}-${mm}-${dd}`,
      time: `${hh}:${min}`
    };
  }
}

function FutureAddRow({ salesmen, onAdd, isPast }) {
  const houNow = getHoustonDateTimeNow();
  const [date, setDate] = useState(houNow.date);
  const [time, setTime] = useState(houNow.time);
  const [salesmanEmail, setSalesmanEmail] = useState("");
  const [street, setStreet] = useState("");
  const [notes, setNotes] = useState("");
  const [customersSold, setCustomersSold] = useState(""); // Only for isPast
  return (
    <tr>
      <td style={cellCenter}>
        <div style={{display:'flex', gap:6}}>
          <input
            type="date"
            value={date}
            onChange={e=>setDate(e.target.value)}
            style={inputCenter}
            placeholder="Date"
          />
          <input
            type="time"
            value={time}
            onChange={e=>setTime(e.target.value)}
            style={inputCenter}
            placeholder="Time"
          />
        </div>
      </td>
      <td style={cellCenter}>
        <select
          value={salesmanEmail}
          onChange={e=>setSalesmanEmail(e.target.value)}
          style={inputCenter}
        >
          <option value="">Add Salesman</option>
          {salesmen.map(u=>(
            <option key={u.email} value={u.email}>{u.name||u.email}</option>
          ))}
        </select>
      </td>
      <td style={cellCenter}>
        <input
          value={street}
          onChange={e=>setStreet(e.target.value)}
          style={inputCenter}
          placeholder="Add Street"
        />
      </td>
      <td style={cellCenter}>
        <input
          value={notes}
          onChange={e=>setNotes(e.target.value)}
          style={inputCenter}
          placeholder="Add Notes"
        />
      </td>
      {isPast && (
        <td style={cellCenter}>
          <input
            value={customersSold}
            onChange={e=>setCustomersSold(e.target.value)}
            style={inputCenter}
            placeholder="Customers Sold (optional)"
          />
        </td>
      )}
      <td style={cellCenter}>
        <button
          className="btn outline"
          onClick={()=>{
            if(!date || !time || !salesmanEmail || !street){
              alert("Date, Time, Salesman, and Street required"); return;
            }
            const when = date && time ? `${date}T${time}` : date;
            const newRow = {
              id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
              sellerEmail: salesmanEmail,
              sellerName: salesmen.find(u=>u.email===salesmanEmail)?.name||salesmanEmail,
              neighborhood: street,
              day: when,
              notes: notes,
              assignedAt: Date.now()
            }
            // Only attach customersSold if provided and isPast
            if(isPast && customersSold && customersSold.trim().length>0){
              newRow.customersSold = customersSold.trim();
            }
            onAdd(newRow)
            setDate(houNow.date); setTime(houNow.time); setSalesmanEmail(""); setStreet(""); setNotes(""); setCustomersSold("");
          }}
        >
          Add Row
        </button>
      </td>
    </tr>
  )
}

// PastSalesAddRow removed (Past Sales section gone)