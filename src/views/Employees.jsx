import React, { useEffect, useMemo, useState } from "react";

/* -------- storage helpers -------- */
function readUsers() {
  try { return JSON.parse(localStorage.getItem("users_seed") || "[]"); } catch { return []; }
}
function writeUsers(rows) {
  localStorage.setItem("users_seed", JSON.stringify(rows));
  // keep current user in sync if they changed their own record
  try {
    const me = JSON.parse(localStorage.getItem("pane_user") || "null");
    if (!me) return;
    const fresh = rows.find(u => u.email?.toLowerCase() === me.email?.toLowerCase());
    if (fresh) localStorage.setItem("pane_user", JSON.stringify(fresh));
  } catch {}
}

const ROLES = {
  workers: "worker",
  salesmen: "seller",
  admins: "admin",
  hybrids: "hybrid",
};

export default function Employees() {
  const [users, setUsers] = useState(readUsers());
  const [tab, setTab] = useState("workers"); // workers | salesmen | admins | hybrids

  useEffect(() => {
    setUsers(readUsers());
  }, []);

  const lists = useMemo(() => {
    return {
      workers: users.filter(u => u.role === "worker"),
      salesmen: users.filter(u => u.role === "seller"),
      admins:  users.filter(u => u.role === "admin"),
      hybrids: users.filter(u => u.role === "hybrid"),
    };
  }, [users]);

  /* -------- add forms (one per tab) -------- */
  const [forms, setForms] = useState({
    workers:  { name:"", email:"", pin:"", phone:"", address:"", notes:"" },
    salesmen: { name:"", email:"", pin:"", phone:"", address:"", notes:"" },
    admins:   { name:"", email:"", pin:"", phone:"", address:"", notes:"" },
    hybrids:  { name:"", email:"", pin:"", phone:"", address:"", notes:"" },
  });

  const onFormChange = (k, field, val) => {
    setForms(f => ({ ...f, [k]: { ...f[k], [field]: val } }));
  };

  const addUser = (k) => {
    const role = ROLES[k];
    const f = forms[k];
    const email = (f.email || "").trim().toLowerCase();
    const name  = (f.name  || "").trim();
    const pin   = (f.pin   || "").trim();

    if (!name || !email || !pin) {
      alert("Name, email, and PIN are required."); 
      return;
    }
    const exists = users.some(u => (u.email || "").toLowerCase() === email);
    if (exists) {
      alert("That email already exists. Use a different email or delete the old user first.");
      return;
    }
    const next = [
      ...users,
      {
        id: cryptoRandom(),
        role,
        name,
        email,
        pin,
        phone: (f.phone || "").trim(),
        address: (f.address || "").trim(),
        notes: (f.notes || "").trim(),
      }
    ];
    writeUsers(next);
    setUsers(next);
    setForms(fm => ({ ...fm, [k]: { name:"", email:"", pin:"", phone:"", address:"", notes:"" }}));
  };

  const removeUser = (email) => {
    if (!confirm("Remove this user?")) return;
    const next = users.filter(u => (u.email || "").toLowerCase() !== (email || "").toLowerCase());
    writeUsers(next);
    setUsers(next);
  };

  /* simple id generator for new rows */
  function cryptoRandom() {
    try {
      const a = new Uint32Array(4);
      crypto.getRandomValues(a);
      return Array.from(a).map(x => x.toString(16)).join("");
    } catch {
      return String(Date.now());
    }
  }

  const Section = ({ kind, title, addLabel }) => {
    const rows = lists[kind];
    const f = forms[kind];

    return (
      <div className="card">
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8}}>
          <h2 className="section-title" style={{margin:0}}>{title}</h2>
          <button className="btn" onClick={()=>addUser(kind)}>{addLabel}</button>
        </div>

        {/* Add form */}
        <div className="grid" style={{marginBottom:12}}>
          <div className="row">
            <div style={{flex:1}}>
              <label>Name*</label>
              <input value={f.name} onChange={e=>onFormChange(kind,"name",e.target.value)} />
            </div>
            <div style={{flex:1}}>
              <label>Email*</label>
              <input value={f.email} onChange={e=>onFormChange(kind,"email",e.target.value)} inputMode="email" autoCapitalize="none" />
            </div>
          </div>
          <div className="row">
            <div style={{flex:1}}>
              <label>PIN*</label>
              <input value={f.pin} onChange={e=>onFormChange(kind,"pin",e.target.value)} maxLength={6} inputMode="numeric" />
            </div>
            <div style={{flex:1}}>
              <label>Phone</label>
              <input value={f.phone} onChange={e=>onFormChange(kind,"phone",e.target.value)} inputMode="tel" />
            </div>
          </div>
          <label>Address</label>
          <input value={f.address} onChange={e=>onFormChange(kind,"address",e.target.value)} placeholder="Street, City, ST" />
          <label>Notes</label>
          <textarea rows={2} value={f.notes} onChange={e=>onFormChange(kind,"notes",e.target.value)} />
        </div>

        {/* Table */}
        <table className="table">
          <thead>
            <tr>
              <th style={{width:160}}>Name</th>
              <th style={{width:220}}>Email</th>
              <th style={{width:110}}>PIN</th>
              <th style={{width:140}}>Phone</th>
              <th>Address</th>
              <th style={{width:220}}>Notes</th>
              <th style={{width:90}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} style={{color:"#64748b"}}>None yet.</td></tr>
            )}
            {rows.map(u=>(
              <tr key={u.email}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td><code>{u.pin}</code></td>
                <td>{u.phone || "-"}</td>
                <td>{u.address || "-"}</td>
                <td style={{fontSize:12, color:"#334155"}}>{u.notes || "-"}</td>
                <td>
                  <button className="btn outline" onClick={()=>removeUser(u.email)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="grid">
      {/* tabs */}
      <div className="card" style={{padding:"8px 12px"}}>
        <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
          <button className={chipCls(tab==="workers")}  onClick={()=>setTab("workers")}>Workers</button>
          <button className={chipCls(tab==="salesmen")} onClick={()=>setTab("salesmen")}>Salesmen</button>
          <button className={chipCls(tab==="admins")}   onClick={()=>setTab("admins")}>Admins</button>
          <button className={chipCls(tab==="hybrids")}  onClick={()=>setTab("hybrids")}>Hybrids</button>
        </div>
      </div>

      {tab === "workers"  && <Section kind="workers"  title="Workers"  addLabel="Add Worker" />}
      {tab === "salesmen" && <Section kind="salesmen" title="Salesmen" addLabel="Add Salesman" />}
      {tab === "admins"   && <Section kind="admins"   title="Admins"   addLabel="Add Admin" />}
      {tab === "hybrids"  && <Section kind="hybrids"  title="Hybrids"  addLabel="Add Hybrid" />}
    </div>
  );
}

/* tiny pill button look using existing header.css tokens */
function chipCls(active){
  return active
    ? "btn outline"  // reuse styling for convenience
    : "tab";
}