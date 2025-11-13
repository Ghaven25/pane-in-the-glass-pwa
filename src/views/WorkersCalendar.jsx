// src/views/WorkersCalendar.jsx
import React from "react";
import AdminHybridBadge from "../ui/AdminHybridBadge.jsx";

/* ===== storage helpers ===== */
const read = (k, fb) => { try { return JSON.parse(localStorage.getItem(k) ?? JSON.stringify(fb)); } catch { return fb; } };
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const getUser        = () => { try { return JSON.parse(localStorage.getItem("pane_user") || "null"); } catch { return null; } };
const readUsers      = () => read("users_seed", []);
const readAvail      = () => read("availability", []);  // [{userEmail, role:'worker'|'seller'|'hybrid', day:'Mon'...'Sun', hours:'9-3'}]
const writeAvail     = (rows) => write("availability", rows);
const readAssignments= () => read("assignments", []);
const readSales      = () => read("sales", []);

/* ===== date helpers ===== */
const startOfDay = (d) => { const x=new Date(d); x.setHours(0,0,0,0); return x; };
const addDays = (d,n)=> { const x=new Date(d); x.setDate(x.getDate()+n); return x; };
const toISODate = d => startOfDay(d).toISOString().slice(0,10);
const fmtColHeader = d => d.toLocaleDateString([], { weekday:'short', month:'short', day:'numeric' });
const shortDow = d => d.toLocaleDateString([], { weekday:'short' }).slice(0,3);

/* ===== UI helpers ===== */
const workerListFilter = (u)=> u && (u.role==='worker' || u.role==='hybrid');

/* Read hours for any of the allowed roles (so admin “hybrid” hours show up) */
function readHoursForAny(userEmail, roles, dowShort){
  const rows = readAvail();
  const hit = rows.find(r=> r.userEmail===userEmail && roles.includes(r.role) && r.day===dowShort);
  return hit?.hours || "";
}

/* Always write worker-hours from this view to 'worker' bucket */
function setHoursForWorker(userEmail, dowShort, hours){
  const all = readAvail();
  const idx = all.findIndex(r=>r.userEmail===userEmail && r.role==='worker' && r.day===dowShort);
  if(idx===-1){
    all.push({ userEmail, role:'worker', day:dowShort, hours:(hours||"").trim() });
  }else{
    all[idx] = { ...all[idx], hours:(hours||"").trim() };
  }
  writeAvail(all);
}

/* ===== component ===== */
export default function WorkersCalendar(){
  const me = getUser();
  const myEmail = me?.email || "";

  // If you ever mount this under /admin/*, keep non-admins out
  const path = typeof window !== "undefined" ? (window.location?.pathname || "") : "";
  const adminMode = path.startsWith("/admin");
  if (adminMode && me?.role !== "admin") {
    if (typeof window !== "undefined") window.location.href = "/";
    return null;
  }

  /* days = rolling 14 */
  const days = React.useMemo(()=>{
    const t = startOfDay(new Date());
    return Array.from({length:14}, (_,i)=> addDays(t,i));
  },[]);

  // Build worker list; if admin, inject yourself as a virtual “hybrid” row if missing
  const users = React.useMemo(()=>{
    const arr = readUsers().filter(workerListFilter);
    if (me?.role === 'admin' && myEmail && !arr.some(u=>u.email===myEmail)) {
      arr.unshift({ email: myEmail, name: me.name || 'Admin', role: 'hybrid' });
    }
    return arr;
  }, [me, myEmail]);

  const sales = React.useMemo(()=> readSales(), []);

  /* keep assignments fresh */
  const readAssignmentsLS = ()=> readAssignments();
  const [assignments, setAssignments] = React.useState(readAssignmentsLS());
  React.useEffect(()=>{
    const t = setInterval(()=> setAssignments(readAssignmentsLS()), 1500);
    return ()=> clearInterval(t);
  },[]);

  /* scheduled items by worker weekday */
  const byWorkerWeekday = React.useMemo(()=>{
    const map = new Map(); // key: email|Mon
    const SHORTS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    for(const a of assignments){
      for(const email of [a.workerEmail, a.worker2Email]){
        if(!email) continue;
        const when = (a.when||"").toLowerCase();
        const short = SHORTS.find(s=> when.includes(s.toLowerCase()));
        if(!short) continue;
        const sale = sales.find(s=> String(s.id)===String(a.saleId));
        const key = `${email}|${short}`;
        const arr = map.get(key)||[];
        arr.push({ customer: sale?.name || a.saleId, address: sale?.address || "-", when: a.when || "-" });
        map.set(key, arr);
      }
    }
    return map;
  }, [assignments, sales]);

  /* lock rule: only self can edit; locked if within 2 days or has scheduled job */
  const isLockedCell = (email, dateObj) => {
    if(email !== myEmail) return true;
    const today = startOfDay(new Date());
    const cellDay = startOfDay(dateObj);
    const diffDays = Math.round((cellDay - today) / (24*60*60*1000));
    const within2 = diffDays <= 2 && diffDays >= 0;
    const short = shortDow(dateObj);
    const hasSched = (byWorkerWeekday.get(`${email}|${short}`) || []).length > 0;
    return within2 || hasSched;
  };

  const onEdit = (email, dateObj, val)=>{
    if(email !== myEmail) return;
    if(isLockedCell(email, dateObj)) return;
    const dow = shortDow(dateObj);
    setHoursForWorker(email, dow, val);
  };

  const showName = (localStorage.getItem('admin_show_name_on_cal') !== 'false');

  return (
    <div className="grid">
      {me?.role === "admin" && <AdminHybridBadge />}

      <div className="card">
        <h2 className="section-title">Workers Calendar (Rolling 2 Weeks)</h2>
        <div style={{ overflowX:"auto" }}>
          <table className="table" style={{ minWidth: 1200 }}>
            <thead>
              <tr>
                <th style={{width:220}}>Worker</th>
                {days.map(d=>(
                  <th key={d.toISOString()}>{fmtColHeader(d)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length===0 && (
                <tr><td colSpan={1+days.length} style={{color:'var(--muted)'}}>No workers.</td></tr>
              )}

              {users.map(u=>{
                const isMe = (u.email===myEmail);
                const name = (isMe && me?.role==='admin' && showName) ? `${u.name} (Admin)` : u.name;

                return (
                  <tr key={u.email}>
                    <td style={{fontWeight: isMe ? 700 : 500}}>
                      {name}{isMe ? " (You)" : ""}
                    </td>

                    {days.map(d=>{
                      const short = shortDow(d);
                      // READ from either 'worker' or 'hybrid' so admin sees existing hours
                      const value = readHoursForAny(u.email, ['worker','hybrid'], short);
                      const sched = (byWorkerWeekday.get(`${u.email}|${short}`) || []);
                      const locked = isLockedCell(u.email, d);
                      return (
                        <td key={u.email+toISODate(d)}>
                          <div style={{display:'flex', gap:6, alignItems:'center'}}>
                            {locked && isMe && <span title="Locked"><span role="img" aria-label="locked">🔒</span></span>}
                            <input
                              value={value}
                              onChange={(e)=> onEdit(u.email, d, e.target.value)}
                              placeholder="hours"
                              disabled={locked}
                              style={{
                                width:'100%',
                                padding:'6px 8px',
                                border:'1px solid var(--border)',
                                borderRadius:8,
                                outline:'none',
                                background:'var(--card)',
                                color:'var(--text)',
                                fontWeight: isMe ? 600 : 400
                              }}
                            />
                          </div>

                          {sched.length>0 && (
                            <div style={{marginTop:6, fontSize:12, color:'var(--muted)'}}>
                              {sched.map((s,i)=>(
                                <div key={i}>
                                  • <strong>{s.customer}</strong>{s.address ? ` — ${s.address}` : ""} — {s.when}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}