// src/views/admin/AdminPast.jsx
import React, { useEffect, useMemo, useState } from "react";

/* ========== storage helpers ========== */
const read = (k, fb) => { try { return JSON.parse(localStorage.getItem(k) ?? JSON.stringify(fb)); } catch { return fb; } };
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const readSales = () => read("sales", []);
const writeSales = (rows) => write("sales", rows);
const readAssignments = () => read("assignments", []);
const writeAssignments = (rows) => write("assignments", rows);
const readUsers = () => read("users_seed", []);
const readNeighborhoods = () => read("neighborhoods", []);
const writeNeighborhoods = (rows) => write("neighborhoods", rows);
const readPayouts = () => read("payouts", []);

const money = (n) => (isFinite(+n) ? `$${(+n).toFixed(2)}` : "-");
const fmtDateOnly = (t) => {
  if (!t) return "-";
  const d = new Date(t);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};
function toLocalISO(dateStr) {
  if (!dateStr) return new Date().toISOString().slice(0, 10);
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}
function parseSmartWhen(s) {
  if (!s) return null;
  let d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;
  return null;
}
const cellCenter = { padding: "8px 10px", textAlign: "center", verticalAlign: "middle" };
const inputCenter = { width: "100%", padding: "6px 8px", border: "1px solid var(--border)", borderRadius: 8, outline: "none", background: "var(--card)", color: "var(--text)", fontWeight: 600, textAlign: "center" };

export default function AdminPast() {
  const [assignments, setAssignments] = useState(readAssignments());
  const [salesRows, setSalesRows] = useState(readSales());
  const [neighRows, setNeighRows] = useState(readNeighborhoods());
  const [payouts, setPayouts] = useState(readPayouts());
  const users = useMemo(() => readUsers(), []);
  const salesmen = useMemo(() => users.filter(u => ["seller", "hybrid", "admin"].includes(u.role)), [users]);
  const workers = useMemo(() => users.filter(u => ["worker", "hybrid", "admin"].includes(u.role)), [users]);

  // ===== Refresh loops =====
  useEffect(() => { const t = setInterval(() => setAssignments(readAssignments()), 3000); return () => clearInterval(t); }, []);
  useEffect(() => { const t = setInterval(() => setSalesRows(readSales()), 3000); return () => clearInterval(t); }, []);
  useEffect(() => { const t = setInterval(() => setNeighRows(readNeighborhoods()), 3000); return () => clearInterval(t); }, []);
  useEffect(() => {
    const t = setInterval(() => setPayouts(readPayouts()), 3000);
    return () => clearInterval(t);
  }, []);

  // ===== Completed Jobs =====
  const workedJobs = useMemo(() => assignments.filter(a => a.status === "worked"), [assignments]);
  const [editJobs, setEditJobs] = useState(false);
  const [newJob, setNewJob] = useState({
    customer: "",
    phone: "",
    address: "",
    salesmanEmail: "",
    price: "",
    when: toLocalISO(new Date()) + " 12:00",
    workerEmail: "",
    worker2Email: "",
    notes: ""
  });
  function patchJob(id, f, v) { const n = readAssignments().map(a => a.id !== id ? a : { ...a, [f]: v }); writeAssignments(n); setAssignments(n); }
  function handleDeleteJob(id) { if (!window.confirm("Delete this job?")) return; const n = readAssignments().filter(a => a.id !== id); writeAssignments(n); setAssignments(n); }
  function handleAddJob() {
    const newId = Date.now();
    const jobToAdd = {
      id: newId,
      ...newJob,
      status: "worked"
    };
    const n = [...readAssignments(), jobToAdd];
    writeAssignments(n);
    setAssignments(n);
    setNewJob({
      customer: "",
      phone: "",
      address: "",
      salesmanEmail: "",
      price: "",
      when: toLocalISO(new Date()) + " 12:00",
      workerEmail: "",
      worker2Email: "",
      notes: ""
    });
  }

  // ===== Sales History =====
  const [editSales, setEditSales] = useState(false);
  function patchSale(id, f, v) { const n = readSales().map(a => a.id !== id ? a : { ...a, [f]: v }); writeSales(n); setSalesRows(n); }
  function handleAddSale() {
    const newId = Date.now();
    const newSale = { id: newId, customer: "", salesmanEmail: "", phone: "", address: "", price: "", notes: "", status: "", date: toLocalISO(new Date()) };
    const n = [...readSales(), newSale];
    writeSales(n);
    setSalesRows(n);
  }
  function handleDeleteSale(id) { if (!window.confirm("Delete this sale?")) return; const n = readSales().filter(a => a.id !== id); writeSales(n); setSalesRows(n); }

  // ===== Neighborhood History =====
  const [editNeigh, setEditNeigh] = useState(false);
  function patchNeigh(id, f, v) { const n = readNeighborhoods().map(a => a.id !== id ? a : { ...a, [f]: v }); writeNeighborhoods(n); setNeighRows(n); }
  function handleAddNeigh() {
    const newId = Date.now();
    const newNeigh = { id: newId, date: toLocalISO(new Date()), time: "", salesmanEmail: "", streets: "", notes: "" };
    const n = [...readNeighborhoods(), newNeigh];
    writeNeighborhoods(n);
    setNeighRows(n);
  }
  function handleDeleteNeigh(id) { if (!window.confirm("Delete this neighborhood?")) return; const n = readNeighborhoods().filter(a => a.id !== id); writeNeighborhoods(n); setNeighRows(n); }

  // Only use real worked jobs, no placeholders
  const displayWorkedJobs = workedJobs;

  // ===== Past Payouts: state + handlers (MoneyTab-compatible) =====
  const [editPayouts, setEditPayouts] = useState(false);

  function handleDeletePayout(id) {
    if (!window.confirm("Delete this payout?")) return;
    const next = readPayouts().filter(p => (p.id ?? p.name) !== id);
    write("payouts", next);
    setPayouts(next);
  }

  function handleDownloadPayout(p) {
    // MoneyTab saves { id, name, xlsx (base64), periodStartISO, createdAtISO }
    const base64 = p?.xlsx;
    if (!base64) {
      alert("No file data available.");
      return;
    }
    const bytes = atob(base64);
    const buf = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = p.name || "payout.xlsx";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 250);
  }

  return (
    <>
      {/* ========== COMPLETED JOBS ========== */}
      <div className="card">
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <h2 className="section-title">Completed Jobs</h2>
          <button className="btn outline" onClick={()=>setEditJobs(v=>!v)}>{editJobs?"Done":"Edit"}</button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th style={cellCenter}>Customer</th><th style={cellCenter}>Phone</th><th style={cellCenter}>Address</th><th style={cellCenter}>Salesman</th><th style={cellCenter}>Price</th><th style={cellCenter}>Date</th><th style={cellCenter}>Time</th><th style={cellCenter}>Worker 1</th><th style={cellCenter}>Worker 2</th><th style={cellCenter}>Notes</th>{editJobs && <th></th>}
            </tr>
          </thead>
          <tbody>
            {displayWorkedJobs.length === 0 && (
              <tr>
                <td colSpan={editJobs ? 11 : 10} style={{ ...cellCenter, color: "var(--muted)" }}>
                  No worked jobs.
                </td>
              </tr>
            )}
            {displayWorkedJobs.map(a => {
              const d = parseSmartWhen(a.when);
              // Compose date and time values for editing
              let dateVal = "", timeVal = "";
              if (d) {
                dateVal = toLocalISO(d.toISOString().slice(0, 10));
                timeVal = d.toTimeString().slice(0, 5);
              } else if (typeof a.when === "string") {
                // fallback: parse "YYYY-MM-DD HH:MM"
                const m = a.when.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
                if (m) {
                  dateVal = m[1];
                  timeVal = m[2];
                }
              }
              return (
                <tr key={a.id}>
                  <td style={cellCenter}>
                    {editJobs ? (
                      <input
                        style={inputCenter}
                        value={a.customer || ""}
                        onChange={e => patchJob(a.id, "customer", e.target.value)}
                      />
                    ) : (a.customer || "-")}
                  </td>
                  <td style={cellCenter}>
                    {editJobs ? (
                      <input
                        style={inputCenter}
                        value={a.phone || ""}
                        onChange={e => patchJob(a.id, "phone", e.target.value)}
                      />
                    ) : (a.phone || "-")}
                  </td>
                  <td style={cellCenter}>
                    {editJobs ? (
                      <input
                        style={inputCenter}
                        value={a.address || ""}
                        onChange={e => patchJob(a.id, "address", e.target.value)}
                      />
                    ) : (a.address || "-")}
                  </td>
                  <td style={cellCenter}>
                    {editJobs ? (
                      <select
                        style={inputCenter}
                        value={a.salesmanEmail || ""}
                        onChange={e => patchJob(a.id, "salesmanEmail", e.target.value)}
                      >
                        <option value="">—</option>
                        {salesmen.map(u => (
                          <option key={u.email} value={u.email}>
                            {u.name || u.email}
                          </option>
                        ))}
                      </select>
                    ) : (
                      (() => {
                        const u = salesmen.find(u => u.email === a.salesmanEmail);
                        return u ? (u.name || u.email) : (a.salesmanEmail || "-");
                      })()
                    )}
                  </td>
                  <td style={cellCenter}>
                    {editJobs ? (
                      <input
                        style={inputCenter}
                        value={a.price || ""}
                        onChange={e => patchJob(a.id, "price", e.target.value)}
                      />
                    ) : (a.price ? money(a.price) : "-")}
                  </td>
                  <td style={cellCenter}>
                    {editJobs ? (
                      <input
                        type="date"
                        style={inputCenter}
                        value={dateVal || toLocalISO(new Date())}
                        onChange={e => patchJob(a.id, "when", `${e.target.value} ${timeVal || "12:00"}`)}
                      />
                    ) : (fmtDateOnly(a.when))}
                  </td>
                  <td style={cellCenter}>
                    {editJobs ? (
                      <input
                        type="time"
                        style={inputCenter}
                        value={timeVal || ""}
                        onChange={e => patchJob(a.id, "when", `${dateVal || toLocalISO(new Date())} ${e.target.value}`)}
                      />
                    ) : (timeVal || "-")}
                  </td>
                  <td style={cellCenter}>
                    {editJobs ? (
                      <select
                        style={inputCenter}
                        value={a.workerEmail || ""}
                        onChange={e => patchJob(a.id, "workerEmail", e.target.value)}
                      >
                        <option value="">—</option>
                        {workers.map(u => (
                          <option key={u.email} value={u.email}>
                            {u.name || u.email}
                          </option>
                        ))}
                      </select>
                    ) : (
                      (() => {
                        const u = workers.find(u => u.email === a.workerEmail);
                        return u ? (u.name || u.email) : (a.workerEmail || "-");
                      })()
                    )}
                  </td>
                  <td style={cellCenter}>
                    {editJobs ? (
                      <select
                        style={inputCenter}
                        value={a.worker2Email || ""}
                        onChange={e => patchJob(a.id, "worker2Email", e.target.value)}
                      >
                        <option value="">—</option>
                        {workers.map(u => (
                          <option key={u.email} value={u.email}>
                            {u.name || u.email}
                          </option>
                        ))}
                      </select>
                    ) : (
                      (() => {
                        const u = workers.find(u => u.email === a.worker2Email);
                        return u ? (u.name || u.email) : (a.worker2Email || "-");
                      })()
                    )}
                  </td>
                  <td style={cellCenter}>
                    {editJobs ? (
                      <input
                        style={inputCenter}
                        value={a.notes || ""}
                        onChange={e => patchJob(a.id, "notes", e.target.value)}
                      />
                    ) : (a.notes || "-")}
                  </td>
                  {editJobs && (
                    <td style={cellCenter}>
                      <button
                        className="btn outline"
                        style={{ fontSize: 11, padding: "4px 6px" }}
                        onClick={() => handleDeleteJob(a.id)}
                      >
                        delete
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {editJobs && (
              <tr>
                <td>
                  <input
                    style={inputCenter}
                    value={newJob.customer}
                    placeholder="Customer"
                    onChange={e => setNewJob(j => ({ ...j, customer: e.target.value }))}
                  />
                </td>
                <td>
                  <input
                    style={inputCenter}
                    value={newJob.phone}
                    placeholder="Phone"
                    onChange={e => setNewJob(j => ({ ...j, phone: e.target.value }))}
                  />
                </td>
                <td>
                  <input
                    style={inputCenter}
                    value={newJob.address}
                    placeholder="Address"
                    onChange={e => setNewJob(j => ({ ...j, address: e.target.value }))}
                  />
                </td>
                <td>
                  <select
                    style={inputCenter}
                    value={newJob.salesmanEmail}
                    onChange={e => setNewJob(j => ({ ...j, salesmanEmail: e.target.value }))}
                  >
                    <option value="">—</option>
                    {salesmen.map(u => (
                      <option key={u.email} value={u.email}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    style={inputCenter}
                    value={newJob.price}
                    placeholder="Price"
                    onChange={e => setNewJob(j => ({ ...j, price: e.target.value }))}
                  />
                </td>
                <td>
                  <input
                    type="date"
                    style={inputCenter}
                    value={
                      (() => {
                        const m = (newJob.when || "").match(/^(\d{4}-\d{2}-\d{2})/);
                        return m ? m[1] : toLocalISO(new Date());
                      })()
                    }
                    onChange={e => setNewJob(j => {
                      const m = (j.when || "").match(/^\d{4}-\d{2}-\d{2}[ T](\d{2}:\d{2})/);
                      const time = m ? m[1] : "12:00";
                      return { ...j, when: `${e.target.value} ${time}` };
                    })}
                  />
                </td>
                <td>
                  <input
                    type="time"
                    style={inputCenter}
                    value={
                      (() => {
                        const m = (newJob.when || "").match(/^\d{4}-\d{2}-\d{2}[ T](\d{2}:\d{2})/);
                        return m ? m[1] : "12:00";
                      })()
                    }
                    onChange={e => setNewJob(j => {
                      const m = (j.when || "").match(/^(\d{4}-\d{2}-\d{2})/);
                      const date = m ? m[1] : toLocalISO(new Date());
                      return { ...j, when: `${date} ${e.target.value}` };
                    })}
                  />
                </td>
                <td>
                  <select
                    style={inputCenter}
                    value={newJob.workerEmail}
                    onChange={e => setNewJob(j => ({ ...j, workerEmail: e.target.value }))}
                  >
                    <option value="">—</option>
                    {workers.map(u => (
                      <option key={u.email} value={u.email}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    style={inputCenter}
                    value={newJob.worker2Email}
                    onChange={e => setNewJob(j => ({ ...j, worker2Email: e.target.value }))}
                  >
                    <option value="">—</option>
                    {workers.map(u => (
                      <option key={u.email} value={u.email}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    style={inputCenter}
                    value={newJob.notes}
                    placeholder="Notes"
                    onChange={e => setNewJob(j => ({ ...j, notes: e.target.value }))}
                  />
                </td>
                <td style={{textAlign:"center"}}>
                  <button className="btn outline" style={{fontWeight:"bold"}} onClick={handleAddJob}>+ Add Row</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ========== SALES HISTORY ========== */}
      <div className="card" style={{marginTop:32}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <h2 className="section-title">Sales History (All)</h2>
          <button className="btn outline" onClick={()=>setEditSales(v=>!v)}>{editSales?"Done":"Edit"}</button>
        </div>
        <table className="table">
          <thead>
            <tr><th style={cellCenter}>Customer</th><th style={cellCenter}>Salesman</th><th style={cellCenter}>Phone</th><th style={cellCenter}>Address</th><th style={cellCenter}>Price</th><th style={cellCenter}>Notes</th><th style={cellCenter}>Status</th><th style={cellCenter}>Date</th>{editSales && <th></th>}</tr>
          </thead>
          <tbody>
            {salesRows.length===0 && <tr><td colSpan={editSales?9:8} style={{...cellCenter,color:"var(--muted)"}}>No sales history.</td></tr>}
            {salesRows.map(r=>{
              const d = parseSmartWhen(r.date);
              const dateVal = d ? toLocalISO(d.toISOString().slice(0,10)) : toLocalISO(new Date());
              return (
                <tr key={r.id}>
                  <td style={cellCenter}>{editSales?<input style={inputCenter} value={r.customer||""} onChange={e=>patchSale(r.id,"customer",e.target.value)}/>:(r.customer||"-")}</td>
                  <td style={cellCenter}>
                    {editSales ? (
                      <select style={inputCenter} value={r.salesmanEmail||""} onChange={e=>patchSale(r.id,"salesmanEmail",e.target.value)}>
                        <option value="">—</option>
                        {salesmen.map(u=><option key={u.email} value={u.email}>{u.name||u.email}</option>)}
                      </select>
                    ) : (r.salesmanEmail||"-")}
                  </td>
                  <td style={cellCenter}>{editSales?<input style={inputCenter} value={r.phone||""} onChange={e=>patchSale(r.id,"phone",e.target.value)}/>:(r.phone||"-")}</td>
                  <td style={cellCenter}>{editSales?<input style={inputCenter} value={r.address||""} onChange={e=>patchSale(r.id,"address",e.target.value)}/>:(r.address||"-")}</td>
                  <td style={cellCenter}>{editSales?<input style={inputCenter} value={r.price||""} onChange={e=>patchSale(r.id,"price",e.target.value)}/>:(r.price?money(r.price):"-")}</td>
                  <td style={cellCenter}>{editSales?<input style={inputCenter} value={r.notes||""} onChange={e=>patchSale(r.id,"notes",e.target.value)}/>:(r.notes||"-")}</td>
                  <td style={cellCenter}>{editSales?<input style={inputCenter} value={r.status||""} onChange={e=>patchSale(r.id,"status",e.target.value)}/>:(r.status||"-")}</td>
                  <td style={cellCenter}>
                    {editSales ? (
                      <input type="date" style={inputCenter} value={dateVal} onChange={e=>patchSale(r.id,"date",e.target.value)}/>
                    ) : (r.date ? fmtDateOnly(r.date) : "-")}
                  </td>
                  {editSales && <td style={cellCenter}><button className="btn outline" style={{fontSize:11,padding:"4px 6px"}} onClick={()=>handleDeleteSale(r.id)}>delete</button></td>}
                </tr>
              );
            })}
            {editSales && (
              <tr>
                <td><input style={inputCenter} value="" readOnly placeholder="Customer"/></td>
                <td>
                  <select style={inputCenter} disabled>
                    <option>—</option>
                  </select>
                </td>
                <td><input style={inputCenter} value="" readOnly placeholder="Phone"/></td>
                <td><input style={inputCenter} value="" readOnly placeholder="Address"/></td>
                <td><input style={inputCenter} value="" readOnly placeholder="Price"/></td>
                <td><input style={inputCenter} value="" readOnly placeholder="Notes"/></td>
                <td><input style={inputCenter} value="" readOnly placeholder="Status"/></td>
                <td><input type="date" style={inputCenter} value={toLocalISO(new Date())} readOnly/></td>
                <td style={{textAlign:"center"}}>
                  <button className="btn outline" style={{fontWeight:"bold"}} onClick={handleAddSale}>+ Add Row</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ========== NEIGHBORHOOD HISTORY ========== */}
      <div className="card" style={{marginTop:32}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <h2 className="section-title">Neighborhood History (All)</h2>
          <button className="btn outline" onClick={()=>setEditNeigh(v=>!v)}>{editNeigh?"Done":"Edit"}</button>
        </div>
        <table className="table">
          <thead><tr><th style={cellCenter}>Date</th><th style={cellCenter}>Time</th><th style={cellCenter}>Salesman</th><th style={cellCenter}>Street(s)</th><th style={cellCenter}>Notes</th>{editNeigh && <th></th>}</tr></thead>
          <tbody>
            {neighRows.length===0 && <tr><td colSpan={editNeigh?6:5} style={{...cellCenter,color:"var(--muted)"}}>No neighborhood history.</td></tr>}
            {neighRows.map(r=>{
              const d = parseSmartWhen(r.date);
              const dateVal = d ? toLocalISO(d.toISOString().slice(0,10)) : toLocalISO(new Date());
              return (
                <tr key={r.id}>
                  <td style={cellCenter}>
                    {editNeigh ? (
                      <input type="date" style={inputCenter} value={dateVal} onChange={e=>patchNeigh(r.id,"date",e.target.value)}/>
                    ) : (r.date ? fmtDateOnly(r.date) : "-")}
                  </td>
                  <td style={cellCenter}>
                    {editNeigh ? (
                      <input type="time" style={inputCenter} value={r.time||""} onChange={e=>patchNeigh(r.id,"time",e.target.value)}/>
                    ) : (r.time||"-")}
                  </td>
                  <td style={cellCenter}>
                    {editNeigh ? (
                      <select style={inputCenter} value={r.salesmanEmail||""} onChange={e=>patchNeigh(r.id,"salesmanEmail",e.target.value)}>
                        <option value="">—</option>
                        {salesmen.map(u=><option key={u.email} value={u.email}>{u.name||u.email}</option>)}
                      </select>
                    ) : (r.salesmanEmail||"-")}
                  </td>
                  <td style={cellCenter}>{editNeigh?<input style={inputCenter} value={r.streets||""} onChange={e=>patchNeigh(r.id,"streets",e.target.value)}/>:(r.streets||"-")}</td>
                  <td style={cellCenter}>{editNeigh?<input style={inputCenter} value={r.notes||""} onChange={e=>patchNeigh(r.id,"notes",e.target.value)}/>:(r.notes||"-")}</td>
                  {editNeigh && <td style={cellCenter}><button className="btn outline" style={{fontSize:11,padding:"4px 6px"}} onClick={()=>handleDeleteNeigh(r.id)}>delete</button></td>}
                </tr>
              );
            })}
            {editNeigh && (
              <tr>
                <td><input type="date" style={inputCenter} value={toLocalISO(new Date())} readOnly/></td>
                <td><input type="time" style={inputCenter} value="" readOnly/></td>
                <td>
                  <select style={inputCenter} disabled>
                    <option>—</option>
                  </select>
                </td>
                <td><input style={inputCenter} value="" readOnly placeholder="Street(s)"/></td>
                <td><input style={inputCenter} value="" readOnly placeholder="Notes"/></td>
                <td style={{textAlign:"center"}}>
                  <button className="btn outline" style={{fontWeight:"bold"}} onClick={handleAddNeigh}>+ Add Row</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ========== PAST PAYOUTS ========== */}
      <div className="card" style={{marginTop:32}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <h2 className="section-title">Past Payouts</h2>
          <button className="btn outline" onClick={()=>setEditPayouts(v=>!v)}>
            {editPayouts ? "Done" : "Edit"}
          </button>
        </div>
        {payouts.length === 0 ? (
          <p style={{textAlign:"center", color:"var(--muted)"}}>No payouts exported yet.</p>
        ) : (
          <div>
            {payouts.map((p) => (
              <div
                key={p.id || p.name}
                style={{
                  display:"flex",
                  alignItems:"center",
                  justifyContent:"space-between",
                  borderBottom:"1px solid var(--border)",
                  padding:"10px 0"
                }}
              >
                <button
                  className="btn link"
                  style={{
                    padding:0,
                    background:"none",
                    color:"var(--link)",
                    fontWeight:"bold",
                    textDecoration:"underline",
                    minWidth:0,
                    margin:0
                  }}
                  onClick={() => handleDownloadPayout(p)}
                  title="Open Excel export"
                >
                  {p.name || "Pay Period Export"}
                </button>

                {editPayouts && (
                  <button
                    className="btn outline"
                    style={{ fontSize:11, padding:"4px 6px" }}
                    onClick={() => handleDeletePayout(p.id ?? p.name)}
                  >
                    delete
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
