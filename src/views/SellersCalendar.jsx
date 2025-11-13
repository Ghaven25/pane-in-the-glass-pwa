// src/views/SellersCalendar.jsx
import React from "react";
import AdminHybridBadge from "../ui/AdminHybridBadge.jsx";

/* ===== storage helpers ===== */
const read = (k, fb) => { try { return JSON.parse(localStorage.getItem(k) ?? JSON.stringify(fb)); } catch { return fb; } };
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const getUser        = () => { try { return JSON.parse(localStorage.getItem("pane_user") || "null"); } catch { return null; } };
const readUsers      = () => read("users_seed", []);
const readAvail      = () => read("availability", []);  // [{userEmail, role:'seller'|'hybrid'|'worker', day:'Mon'...'Sun', hours:'9-3'}]
const writeAvail     = (rows) => write("availability", rows);

/* ===== date helpers ===== */
const startOfDay = (d) => { const x=new Date(d); x.setHours(0,0,0,0); return x; };
const addDays = (d,n)=> { const x=new Date(d); x.setDate(x.getDate()+n); return x; };
const toISODate = d => startOfDay(d).toISOString().slice(0,10);
const fmtColHeader = d => d.toLocaleDateString([], { weekday:'short', month:'short', day:'numeric' });
const shortDow = d => d.toLocaleDateString([], { weekday:'short' }).slice(0,3);

/* ===== UI helpers ===== */
const sellerListFilter = (u)=> u && (u.role==='seller' || u.role==='hybrid');

/* Read from seller OR hybrid so admin sees prior hours */
function readHoursForAny(userEmail, roles, dowShort){
  const rows = readAvail();
  const hit = rows.find(r=> r.userEmail===userEmail && roles.includes(r.role) && r.day===dowShort);
  return hit?.hours || "";
}

/* Always write seller-hours from this view to 'seller' bucket */
function setHoursForSeller(userEmail, dowShort, hours){
  const all = readAvail();
  const idx = all.findIndex(r=>r.userEmail===userEmail && r.role==='seller' && r.day===dowShort);
  if(idx===-1){
    all.push({ userEmail, role:'seller', day:dowShort, hours:(hours||"").trim() });
  }else{
    all[idx] = { ...all[idx], hours:(hours||"").trim() };
  }
  writeAvail(all);
}

export default function SellersCalendar(){
  const me = getUser();
  const myEmail = me?.email || "";

  /* days = rolling 14 */
  const days = React.useMemo(()=>{
    const t = startOfDay(new Date());
    return Array.from({length:14}, (_,i)=> addDays(t,i));
  },[]);

  // Build seller list; if admin, inject yourself as a virtual “hybrid” row if missing
  const users = React.useMemo(()=>{
    const arr = readUsers().filter(sellerListFilter);
    if (me?.role === 'admin' && myEmail && !arr.some(u=>u.email===myEmail)) {
      arr.unshift({ email: myEmail, name: me.name || 'Admin', role: 'hybrid' });
    }
    return arr;
  }, [me, myEmail]);

  // Only self-edit
  const isLockedCell = (email) => email !== myEmail;

  const onEdit = (email, dateObj, val)=>{
    if(email !== myEmail) return;
    const dow = shortDow(dateObj);
    setHoursForSeller(email, dow, val);
  };

  const showName = (localStorage.getItem('admin_show_name_on_cal') !== 'false');

  return (
    <div className="grid">
      {me?.role === "admin" && <AdminHybridBadge />}

      <div className="card">
        <h2 className="section-title">Sellers Calendar (Rolling 2 Weeks)</h2>
        <div style={{ overflowX:"auto" }}>
          <table className="table" style={{ minWidth: 1200 }}>
            <thead>
              <tr>
                <th style={{width:220}}>Seller</th>
                {days.map(d=>(
                  <th key={d.toISOString()}>{fmtColHeader(d)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length===0 && (
                <tr><td colSpan={1+days.length} style={{color:'var(--muted)'}}>No sellers.</td></tr>
              )}

              {users.map(u=>{
                const isMe = (u.email===myEmail);
                const displayName = (isMe && me?.role==='admin' && showName) ? `${u.name} (Admin)` : u.name;

                return (
                  <tr key={u.email}>
                    <td style={{fontWeight: isMe ? 700 : 500}}>
                      {displayName}{isMe ? " (You)" : ""}
                    </td>

                    {days.map(d=>{
                      const short = shortDow(d);
                      // READ from either 'seller' or 'hybrid' so admin sees existing hours
                      const value = readHoursForAny(u.email, ['seller','hybrid'], short);
                      const locked = isLockedCell(u.email);
                      return (
                        <td key={u.email+toISODate(d)}>
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