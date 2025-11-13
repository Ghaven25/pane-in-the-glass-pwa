// src/views/admin/MoneyTab.jsx
import React from "react";
import * as XLSX from "xlsx";
import { requireAdminAccess } from "../../utils/adminTools.js";

/** ===== storage helpers ===== */
const read = (k, fb) => {
  try {
    return JSON.parse(localStorage.getItem(k) ?? JSON.stringify(fb));
  } catch {
    return fb;
  }
};
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const readUsers       = () => read("users_seed", []);
const readSales       = () => read("sales", []);
const readAssignments = () => read("assignments", []);
const readPayouts     = () => read("payouts", []); // [{id,email,name,amount,periodStartISO,createdAtISO}]
const writePayouts    = (rows) => write("payouts", rows);

/** ===== money / date helpers ===== */
const WORKER_RATE = 0.20;
const SELLER_RATE = 0.30;

const money = (n)=>
  Number.isFinite(+n) ? `$${(+n).toFixed(2)}` : "-";

const fmtDate = (t) =>
  t
    ? new Date(t).toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "-";

const fmtDateShort = (t) =>
  t
    ? new Date(t).toLocaleDateString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "-";

function dayStart(d){
  const x = new Date(d);
  x.setHours(0,0,0,0);
  return x;
}

// default pay period start = today @ 00:00
function defPayStart(){
  return dayStart(new Date());
}

function readPayStart(){
  const raw = localStorage.getItem("pay_period_start");
  if(!raw) return defPayStart();
  const d = new Date(raw);
  return isNaN(d.getTime()) ? defPayStart() : dayStart(d);
}

// The pay period is [start ... start+13 days]
function inPayPeriod(ts, start){
  if(!ts) return false;
  const d = new Date(ts);

  const end = new Date(start.getTime() + 13*24*60*60*1000);
  end.setHours(23,59,59,999);

  return d >= start && d <= end;
}

/** Build per-person info helper */
function buildEmployeeInfo({
  users,
  completedAll,
  completedPP,
  payStart,
  salesById,
}){
  // Map each user to their totals
  const infoMap = new Map(); // email -> row

  function ensureUserRow(userEmail){
    if(!infoMap.has(userEmail)){
      const u = users.find(x=>x.email===userEmail);
      infoMap.set(userEmail,{
        id: userEmail,
        name: u?.name || userEmail,
        role: u?.role || "-",

        hoursAll: 0,
        hoursPP: 0,

        jobsAll: 0,
        jobsPP: 0,

        salesAll: 0,
        salesPP: 0,

        workerAll: 0,
        workerPP: 0,

        sellerAll: 0,
        sellerPP: 0,

        earnAll: 0,
        earnPP: 0,

        customersPP: [] // [{custName, price, share}]
      });
    }
    return infoMap.get(userEmail);
  }

  // fallback hours if we don't have durationHours
  const fallbackHrs = 3;
  function jobHours(a){
    if(Number.isFinite(+a.durationHours)) return +a.durationHours;
    return fallbackHrs;
  }

  // Pass 1: worker earnings/jobs/hours (ALL TIME + CURRENT PP)
  for(const a of completedAll){
    const s = salesById.get(String(a.saleId));
    const price = s?.price ? +s.price : (+a.price || 0);

    // worker1
    if(a.workerEmail){
      const row = ensureUserRow(a.workerEmail);
      row.jobsAll  += 1;
      row.hoursAll += jobHours(a);
      if(price){
        const share = price*WORKER_RATE;
        row.workerAll += share;
      }
    }
    // worker2
    if(a.worker2Email){
      const row = ensureUserRow(a.worker2Email);
      row.jobsAll  += 1;
      row.hoursAll += jobHours(a);
      if(price){
        const share = price*WORKER_RATE;
        row.workerAll += share;
      }
    }
  }

  // CURRENT PAY PERIOD for workers
  for(const a of completedPP){
    const s = salesById.get(String(a.saleId));
    const price = s?.price ? +s.price : (+a.price || 0);
    const custName = s?.name || a.saleId;

    // worker1
    if(a.workerEmail){
      const row = ensureUserRow(a.workerEmail);
      row.jobsPP  += 1;
      row.hoursPP += jobHours(a);
      if(price){
        const share = price*WORKER_RATE;
        row.workerPP += share;
        row.customersPP.push({
          custName,
          price,
          share
        });
      }
    }
    // worker2
    if(a.worker2Email){
      const row = ensureUserRow(a.worker2Email);
      row.jobsPP  += 1;
      row.hoursPP += jobHours(a);
      if(price){
        const share = price*WORKER_RATE;
        row.workerPP += share;
        row.customersPP.push({
          custName,
          price,
          share
        });
      }
    }
  }

  // Pass 2: seller earnings/sales counts
  // ALL TIME
  for(const s of salesById.values()){
    const sellerEmail = s?.sellerEmail;
    if(!sellerEmail) continue;
    const row = ensureUserRow(sellerEmail);
    row.salesAll += 1;
    if(s?.price){
      row.sellerAll += (+s.price)*SELLER_RATE;
    }
  }

  // CURRENT PAY PERIOD for sellers
  for(const s of salesById.values()){
    const sellerEmail = s?.sellerEmail;
    if(!sellerEmail) continue;
    const stamp = s.createdAt || s.soldAt || s.created_at;
    if(!inPayPeriod(stamp, payStart)) continue;

    const row = ensureUserRow(sellerEmail);
    row.salesPP += 1;
    if(s?.price){
      const share = (+s.price)*SELLER_RATE;
      row.sellerPP += share;
      row.customersPP.push({
        custName: s.name || "(sold)",
        price: +s.price,
        share
      });
    }
  }

  // finalize earn totals
  const rows = Array.from(infoMap.values()).map(r=>{
    r.earnAll = r.workerAll + r.sellerAll;
    r.earnPP  = r.workerPP + r.sellerPP;
    return r;
  });

  // sort by current pay period earnings DESC
  rows.sort((a,b)=> b.earnPP - a.earnPP);

  return rows;
}

/** ===== component ===== */
export default function MoneyTab(){
  // gate admin
  React.useEffect(() => {
    requireAdminAccess();
  }, []);

  // edit mode UI state (like ReviewNeighborhoods)
  const [editMode, setEditMode] = React.useState(false);
  const [editEmployeeInfo, setEditEmployeeInfo] = React.useState(false);
  const [editMarkPay, setEditMarkPay] = React.useState(false);

  // Editable state for Employee Info and Mark Pay
  const [employeeInfoEditRows, setEmployeeInfoEditRows] = React.useState([]);
  const [employeeInfoEditOrig, setEmployeeInfoEditOrig] = React.useState([]);
  const [markPayEditRows, setMarkPayEditRows] = React.useState([]);
  const [markPayEditOrig, setMarkPayEditOrig] = React.useState([]);

  // state
  const [payStart, setPayStart] = React.useState(readPayStart());
  const [payouts, setPayouts]   = React.useState(readPayouts());

  // raw data
  const [users, setUsers] = React.useState(() => readUsers());
  const [sales, setSales] = React.useState(() => readSales());
  const [jobs, setJobs] = React.useState(() => readAssignments());

  // saleId -> sale
  const saleById = React.useMemo(()=>{
    const m = new Map();
    for(const s of sales){ m.set(String(s.id), s); }
    return m;
  }, [sales]);

  // completed jobs (include jobs marked as done, status "completed"/"done", or isPast for Past tab)
  const completedAll = React.useMemo(() =>
    (jobs || []).filter(a =>
      a && (a.done || a.status === "completed" || a.status === "done" || a.isPast)
    )
  , [jobs]);

  // completed jobs in THIS pay period
  const completedPP  = React.useMemo(()=>{
    return completedAll.filter(a=>{
      const ref = a.doneAt || a.createdAt || a.when || null;
      return inPayPeriod(ref, payStart);
    });
  }, [completedAll, payStart]);

  // build per-person info
  const employeeInfo = React.useMemo(()=>{
    return buildEmployeeInfo({
      users,
      completedAll,
      completedPP,
      payStart,
      salesById: saleById,
    });
  }, [users, completedAll, completedPP, payStart, saleById]);
  // Keep edit rows in sync with latest data when toggling edit mode ON
  React.useEffect(() => {
    if (editEmployeeInfo) {
      setEmployeeInfoEditRows(employeeInfo.map(r=>({...r})));
      setEmployeeInfoEditOrig(employeeInfo.map(r=>({...r})));
    }
  // eslint-disable-next-line
  }, [editEmployeeInfo]);
  React.useEffect(() => {
    if (editMarkPay) {
      setMarkPayEditRows(employeeInfo.map(r=>({...r})));
      setMarkPayEditOrig(employeeInfo.map(r=>({...r})));
    }
  // eslint-disable-next-line
  }, [editMarkPay]);

  // XLSX export for pay period (styled like PaneSnapshot_2025-11-01-5.xlsx)
  const downloadCSV = () => {
    // Sheet columns and keys (for Excel: ALL CAPS for header row)
    const headers = [
      "NAME",
      "ROLE",
      "CUSTOMERS WORKED (W/S)",
      "NAMES WORKED (W/S)",
      "TOTAL HOURS",
      "EARNINGS",
      "WORKER EARNED",
      "SELLER EARNED"
    ];
    // Build data rows
    const data = employeeInfo.map(r => {
      const workerCount = r.jobsPP || 0;
      const sellerCount = r.salesPP || 0;
      const workerNames = r.customersPP
        .filter(c => c.share === c.price * 0.20)
        .map(c => c.custName)
        .join("; ");
      const sellerNames = r.customersPP
        .filter(c => c.share === c.price * 0.30)
        .map(c => c.custName)
        .join("; ");
      const namesWorked = `${workerNames || "-"} / ${sellerNames || "-"}`;
      return [
        r.name,
        r.role,
        `${workerCount}/${sellerCount}`,
        namesWorked,
        r.hoursPP.toFixed(1),
        r.earnPP,
        r.workerPP,
        r.sellerPP
      ];
    });
    // Compose AOAs
    const title = "Pane in the Glass — Pay Period Snapshot";
    const subheader = `Pay Period: ${fmtDateShort(payStart)} – ${fmtDateShort(new Date(payStart.getTime() + 13 * 24 * 60 * 60 * 1000))}`;
    const aoa = [
      [title],
      [subheader],
      [],
      headers,
      ...data.map(row => [
        row[0], row[1], row[2], row[3], row[4],
        row[5], row[6], row[7]
      ])
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    // Merge title and subheader across columns
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }
    ];
    // Set column widths (min width: Name 24, Role 14, others 16–30)
    ws["!cols"] = [
      { wch: 24 }, // Name
      { wch: 14 }, // Role
      { wch: 30 }, // Customers Worked (W/S) - widened from 22 to 30
      { wch: 30 }, // Names Worked
      { wch: 16 }, // Total Hours
      { wch: 18 }, // Earnings
      { wch: 18 }, // Worker Earned
      { wch: 18 }  // Seller Earned
    ];
    // Set row heights for visual spacing: title, subheader, blank, header, then data
    // Header row (row 3) gets extra height for padding
    ws["!rows"] = [{hpt: 28}, {hpt: 22}, {hpt: 8}, {hpt: 30}];
    // --- Styling ---
    // Helper: border style
    const border = {
      top:    { style: "thin", color: { rgb: "D1D5DB" } },
      bottom: { style: "thin", color: { rgb: "D1D5DB" } },
      left:   { style: "thin", color: { rgb: "D1D5DB" } },
      right:  { style: "thin", color: { rgb: "D1D5DB" } }
    };
    // Title row
    for (let c = 0; c < headers.length; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
      if (cell) {
        cell.s = {
          font: { bold: true, sz: 18, color: { rgb: "111827" } },
          alignment: { horizontal: "center", vertical: "center" },
          border
        };
      }
    }
    // Subheader row
    for (let c = 0; c < headers.length; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r: 1, c })];
      if (cell) {
        cell.s = {
          font: { italic: true, sz: 13, color: { rgb: "6B7280" } },
          alignment: { horizontal: "center", vertical: "center" },
          border
        };
      }
    }
    // Header row (row 3) - ALL CAPS, bold, white-on-gray, font size 15, more row height, centered horizontally and vertically
    for (let c = 0; c < headers.length; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r: 3, c })];
      if (cell) {
        cell.s = {
          font: { bold: true, sz: 15, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "E5E7EB" } },
          alignment: { horizontal: "center", vertical: "center" },
          border
        };
      }
    }
    // Data rows: alternating shading, key columns bold, currency right-aligned
    const startRow = 4;
    const numRows = data.length;
    for (let r = 0; r < numRows; r++) {
      const excelRow = startRow + r;
      const shade = r % 2 === 1;
      for (let c = 0; c < headers.length; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r: excelRow, c })];
        if (!cell) continue;
        // Key columns: Name, Role, Total Hours, Earnings
        const isKey = c === 0 || c === 1 || c === 4 || c === 5;
        // Currency columns: Earnings, Worker Earned, Seller Earned
        const isCurrency = c === 5 || c === 6 || c === 7;
        // Set value as currency if needed (with $ and 2 decimals)
        if (isCurrency) {
          cell.t = "s";
          cell.v = money(cell.v);
        }
        cell.s = {
          font: {
            sz: isKey ? 13 : 12,
            bold: isKey,
            color: { rgb: "111827" }
          },
          alignment: {
            horizontal: isCurrency ? "right" : (c === 0 || c === 1 ? "left" : "center"),
            vertical: "center"
          },
          fill: { fgColor: { rgb: shade ? "F9FAFB" : "FFFFFF" } },
          border
        };
      }
    }
    // Write file
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Snapshot");
    XLSX.writeFile(wb, `PaneSnapshot_${payStart.toISOString().slice(0, 10)}.xlsx`, { cellStyles: true });
    // Save Excel file blob to localStorage.payouts so it shows in Past Receipts
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
    const fileEntry = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      name: `PaneSnapshot_${payStart.toISOString().slice(0, 10)}.xlsx`,
      xlsx: wbout,
      createdAtISO: new Date().toISOString(),
      periodStartISO: payStart.toISOString(),
    };
    const existing = readPayouts();
    const updated = [fileEntry, ...existing];
    writePayouts(updated);
    setPayouts(updated);
  };

  // mark individual person as paid for THIS pay period
  function markPaid(person){
    if(!person?.id) return;
    const entry = {
      id: (crypto.randomUUID ? crypto.randomUUID() : (person.id + "-" + Date.now())),
      email: person.id,
      name: person.name,
      amount: +person.earnPP,
      periodStartISO: payStart.toISOString(),
      createdAtISO: new Date().toISOString()
    };
    const next = [entry, ...payouts];
    setPayouts(next);
    writePayouts(next);
  }

  function removePayout(id){
    const next = payouts.filter(p=>p.id !== id);
    setPayouts(next);
    writePayouts(next);
  }

  // pay period picker / reset
  const ppStartStr = payStart.toISOString().slice(0,10);
  const onChangePayStart = (e)=>{
    const val = e.target.value;
    if(!val) return;
    const d = new Date(val + "T00:00:00");
    if(isNaN(d.getTime())) return;
    const start = dayStart(d);
    setPayStart(start);
    localStorage.setItem("pay_period_start", start.toISOString());
  };

  const resetPayStart = ()=>{
    const def = defPayStart();
    localStorage.setItem("pay_period_start", def.toISOString());
    setPayStart(def);
  };

  // Save/cancel for Employee Info
  function handleSaveEmployeeInfo() {
    // Write to assignments
    // Assignments = jobs
    // We update jobs with new values from employeeInfoEditRows
    // For simplicity, update the matching jobs array with new values for name, role, etc.
    // But only update fields that exist on jobs
    // Find jobs by workerEmail or worker2Email, update fields if changed
    // Also update users_seed for name/role
    // We'll update both users and jobs (assignments)
    // Rebuild completedAll, completedPP by updating jobs state
    // Only update name/role on users, and jobs with matching emails
    const updatedUsers = users.map(u=>{
      const edit = employeeInfoEditRows.find(e=>e.id===u.email);
      if (!edit) return u;
      return {
        ...u,
        name: edit.name,
        role: edit.role
      };
    });
    setUsers(updatedUsers);
    write("users_seed", updatedUsers);
    // jobs: only update name/role fields for workerEmail/worker2Email
    const updatedJobs = jobs.map(j=>{
      let changed = false;
      let j2 = {...j};
      if (j.workerEmail) {
        const e = employeeInfoEditRows.find(e=>e.id===j.workerEmail);
        if (e && j2.workerName !== e.name) { j2.workerName = e.name; changed = true; }
      }
      if (j.worker2Email) {
        const e = employeeInfoEditRows.find(e=>e.id===j.worker2Email);
        if (e && j2.worker2Name !== e.name) { j2.worker2Name = e.name; changed = true; }
      }
      // Optionally update other fields if editable (not earnings/hours which are computed)
      return changed ? j2 : j;
    });
    setJobs(updatedJobs);
    write("assignments", updatedJobs);
    setEditEmployeeInfo(false);
    // This will trigger rebuild of completedAll/PP/employeeInfo
  }
  function handleCancelEmployeeInfo() {
    setEmployeeInfoEditRows(employeeInfoEditOrig.map(r=>({...r})));
    setEditEmployeeInfo(false);
  }

  // Save/cancel for Mark Pay
  function handleSaveMarkPay() {
    // Write to payouts
    // We update payouts with new values from markPayEditRows
    // For each person, update the payout values if changed (amount, name, etc)
    // But Mark Pay table doesn't display payouts directly, so we update payouts for this period
    // For this exercise, we'll update the payouts array with new amount/name for matching emails/period
    const periodStartISO = payStart.toISOString();
    const updatedPayouts = payouts.map(p=>{
      const edit = markPayEditRows.find(e=>e.id===p.email && p.periodStartISO===periodStartISO);
      if (!edit) return p;
      return {
        ...p,
        name: edit.name,
        amount: +edit.earnPP
      };
    });
    setPayouts(updatedPayouts);
    write("payouts", updatedPayouts);
    setEditMarkPay(false);
  }
  function handleCancelMarkPay() {
    setMarkPayEditRows(markPayEditOrig.map(r=>({...r})));
    setEditMarkPay(false);
  }

  // shared centered cell style
  const centerCell = {
    padding: "8px 10px",
    verticalAlign: "middle",
    textAlign: "center",
  };

  const payCell = {
    padding: "8px 10px",
    verticalAlign: "middle",
    textAlign: "center",
  };

  return (
    <div className="grid">
      {/* ===== TOP CARD: Money header + Edit Mode UI ===== */}
      <div className="card" style={{ marginTop:"-10px" }}>
        {/* Header row with title + edit mode UI (copied style from ReviewNeighborhoods) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginBottom: 12,
          }}
        >
          {/* top row: title/desc on left, editMode on right */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              width: "100%",
            }}
          >
            {/* LEFT side: Title and description */}
            <div style={{ flex: "1 1 auto" }}>
              <h2 className="section-title" style={{ marginBottom: 4 }}>
                Money (Admin)
              </h2>
              <p
                className="muted"
                style={{
                  fontSize: 13,
                  marginTop: -6,
                  marginBottom: 0,
                  lineHeight: 1.4,
                }}
              >
                View earnings, set pay window, mark payouts.
              </p>
            </div>

            {/* RIGHT side: Edit Mode like ReviewNeighborhoods */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                minWidth: 160,
                marginRight: -60,
              }}
            >
              {/* Checkbox + label */}
              <label
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 1,
                  cursor: "pointer",
                  userSelect: "none",
                  fontSize: 12,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                <input
                  type="checkbox"
                  checked={editMode}
                  onChange={(e) => setEditMode(e.target.checked)}
                  style={{
                    margin: -12,
                    transform: "scale(0.95)",
                  }}
                />
                <span style={{ marginLeft: 2 }}>Edit Mode</span>
              </label>

              {/* The Edit Mode action buttons under the checkbox
                  We keep visibility hidden instead of display none
                  so layout doesn't jump when you click the box */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "flex-start",
                  gap: 8,
                  marginTop: 8,
                  visibility: editMode ? "visible" : "hidden",
                  marginLeft: "-120px",
                }}
              >
                {/* For MoneyTab these aren't wired to anything yet.
                    We include them strictly for consistent UI */}
                <button
                  className="btn"
                  style={{
                    fontSize: 12,
                    lineHeight: 1,
                    padding: "6px 10px",
                  }}
                  onClick={() => {
                    /* placeholder: could add "add manual payout row" later */
                  }}
                >
                  + Add Row
                </button>

                <button
                  className="btn outline"
                  style={{
                    fontSize: 12,
                    lineHeight: 1,
                    padding: "6px 10px",
                    borderColor: "var(--accent)",
                    color: "var(--accent)",
                  }}
                  onClick={() => {
                    /* placeholder: could add "save changes" later */
                    alert("Nothing to save yet here ✅");
                  }}
                >
                  Save All Changes
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* === controls under header (existing Money controls) === */}
        <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
          <label style={{fontWeight:600}}>
            Pay period start:&nbsp;
            <input
              type="date"
              value={ppStartStr}
              onChange={onChangePayStart}
              style={{
                padding:"6px 8px",
                border:"1px solid var(--border)",
                borderRadius:8,
                background:"var(--card)",
                color:"var(--text)"
              }}
            />
          </label>

          <button className="btn outline" onClick={resetPayStart}>
            Reset to next 14 days
          </button>

          <button className="btn" onClick={downloadCSV}>
            Export PP Excel
          </button>
        </div>
        <div style={{fontSize:12, color:'var(--muted)', marginTop:4, lineHeight:1.4}}>
          Pay period = start date through the next 14 days (including today).
        </div>
      </div>

      {/* ===== EMPLOYEE INFO ===== */}
      <div className="card" style={{ paddingTop:'16px', marginTop:'-10px' }}>
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
          <h2 className="section-title" style={{ marginBottom:'4px' }}>Employee Info</h2>
          <button
            className="btn outline"
            style={{
              fontSize:12,
              padding:"4px 10px",
              marginLeft:8,
              marginTop: -4,
              borderColor: editEmployeeInfo ? "var(--accent)" : "#cbd5e1",
              color: editEmployeeInfo ? "var(--accent)" : "#64748b"
            }}
            onClick={()=>setEditEmployeeInfo(e=>!e)}
          >
            {editEmployeeInfo ? "Done" : "Edit"}
          </button>
        </div>
        <div style={{ borderTop:'1px solid #e2e8f0', marginTop:'6px', paddingTop:'6px' }}>
          <table className="table" style={{ tableLayout:'fixed', width:'100%' }}>
            <colgroup>
              <col style={{width:'14%'}} />
              <col style={{width:'8%'}} />
              <col style={{width:'9%'}} />
              <col style={{width:'9%'}} />
              <col style={{width:'10%'}} />
              <col style={{width:'10%'}} />
              <col style={{width:'15%'}} />
              <col style={{width:'25%'}} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ ...centerCell, fontWeight: 700, fontSize: "13.5px", padding: "10px 12px", letterSpacing: "0.25px" }}>Employee</th>
                <th style={{ ...centerCell, fontWeight: 700, fontSize: "13.5px", padding: "10px 12px", letterSpacing: "0.25px" }}>Role</th>
                <th style={{ ...centerCell, fontWeight: 700, fontSize: "13.5px", padding: "10px 12px", letterSpacing: "0.25px" }}>Hours (PP)</th>
                <th style={{ ...centerCell, fontWeight: 700, fontSize: "13.5px", padding: "10px 12px", letterSpacing: "0.25px" }}>Hours (All)</th>
                <th style={{ ...centerCell, fontWeight: 700, fontSize: "13.5px", padding: "10px 12px", letterSpacing: "0.25px" }}>Earnings (PP)</th>
                <th style={{ ...centerCell, fontWeight: 700, fontSize: "13.5px", padding: "10px 12px", letterSpacing: "0.25px" }}>Earnings (All)</th>
                <th style={{ ...centerCell, fontWeight: 700, fontSize: "13.5px", padding: "10px 12px", letterSpacing: "0.25px" }}>Breakdown (PP / All)</th>
                <th style={{ ...centerCell, fontWeight: 700, fontSize: "13.5px", padding: "10px 12px", letterSpacing: "0.25px" }}>Customers (PP)</th>
              </tr>
            </thead>
            <tbody>
              {employeeInfo.length===0 && (
                <tr>
                  <td colSpan={8} style={{...centerCell, color:'#64748b'}}>
                    No employees.
                  </td>
                </tr>
              )}
              {(editEmployeeInfo ? employeeInfoEditRows : employeeInfo).map((r,idx)=>(
                <tr key={r.id}>
                  <td style={{...centerCell, fontWeight:600}}>
                    {editEmployeeInfo
                      ? <input
                          type="text"
                          value={r.name}
                          style={{width:"90%", fontWeight:600, fontSize:13, padding:"4px 6px"}}
                          onChange={e=>{
                            const v = e.target.value;
                            setEmployeeInfoEditRows(rows=>{
                              const copy = [...rows];
                              copy[idx] = {...copy[idx], name:v};
                              return copy;
                            });
                          }}
                        />
                      : r.name}
                  </td>
                  <td style={centerCell}>
                    {editEmployeeInfo
                      ? <input
                          type="text"
                          value={r.role}
                          style={{width:"90%", fontSize:13, padding:"4px 6px"}}
                          onChange={e=>{
                            const v = e.target.value;
                            setEmployeeInfoEditRows(rows=>{
                              const copy = [...rows];
                              copy[idx] = {...copy[idx], role:v};
                              return copy;
                            });
                          }}
                        />
                      : r.role}
                  </td>
                  <td style={centerCell}>
                    {editEmployeeInfo
                      ? <input
                          type="text"
                          value={r.hoursPP}
                          style={{width:"90%", fontSize:13, padding:"4px 6px"}}
                          onChange={e=>{
                            const v = e.target.value;
                            setEmployeeInfoEditRows(rows=>{
                              const copy = [...rows];
                              copy[idx] = {...copy[idx], hoursPP:v};
                              return copy;
                            });
                          }}
                        />
                      : Number(r.hoursPP).toFixed(1)}
                  </td>
                  <td style={centerCell}>
                    {editEmployeeInfo
                      ? <input
                          type="text"
                          value={r.hoursAll}
                          style={{width:"90%", fontSize:13, padding:"4px 6px"}}
                          onChange={e=>{
                            const v = e.target.value;
                            setEmployeeInfoEditRows(rows=>{
                              const copy = [...rows];
                              copy[idx] = {...copy[idx], hoursAll:v};
                              return copy;
                            });
                          }}
                        />
                      : Number(r.hoursAll).toFixed(1)}
                  </td>
                  <td style={centerCell}>
                    {editEmployeeInfo
                      ? <input
                          type="text"
                          value={r.earnPP}
                          style={{width:"90%", fontSize:13, padding:"4px 6px"}}
                          onChange={e=>{
                            const v = e.target.value;
                            setEmployeeInfoEditRows(rows=>{
                              const copy = [...rows];
                              copy[idx] = {...copy[idx], earnPP:v};
                              return copy;
                            });
                          }}
                        />
                      : money(r.earnPP)}
                  </td>
                  <td style={centerCell}>
                    {editEmployeeInfo
                      ? <input
                          type="text"
                          value={r.earnAll}
                          style={{width:"90%", fontSize:13, padding:"4px 6px"}}
                          onChange={e=>{
                            const v = e.target.value;
                            setEmployeeInfoEditRows(rows=>{
                              const copy = [...rows];
                              copy[idx] = {...copy[idx], earnAll:v};
                              return copy;
                            });
                          }}
                        />
                      : money(r.earnAll)}
                  </td>
                  <td style={{...centerCell, fontSize:12, lineHeight:1.4}}>
                    {editEmployeeInfo
                      ? <input
                          type="text"
                          value={`Worker: ${money(r.workerPP)} / ${money(r.workerAll)} | Seller: ${money(r.sellerPP)} / ${money(r.sellerAll)}`}
                          style={{width:"98%", fontSize:12, padding:"4px 6px"}}
                          onChange={()=>{}}
                          disabled
                        />
                      :
                        <>
                        <div>Worker: {money(r.workerPP)} / {money(r.workerAll)}</div>
                        <div>Seller: {money(r.sellerPP)} / {money(r.sellerAll)}</div>
                        <div style={{marginTop:4}}>
                          Sales: {r.salesPP} / {r.salesAll} • Jobs: {r.jobsPP} / {r.jobsAll}
                        </div>
                        </>
                    }
                  </td>
                  <td style={{...centerCell, fontSize:11, lineHeight:1.4, whiteSpace:'pre-wrap'}}>
                    {editEmployeeInfo
                      ? <textarea
                          value={
                            r.customersPP && r.customersPP.length > 0
                              ? r.customersPP.map((c,i)=>`${c.custName} (${money(c.price)}/${money(c.share)})`).join("\n")
                              : ""
                          }
                          style={{width:"98%", fontSize:11, minHeight:30, padding:"4px 6px"}}
                          onChange={()=>{}}
                          disabled
                        />
                      : (r.customersPP.length === 0
                          ? <span style={{color:'var(--muted)'}}>—</span>
                          : r.customersPP.map((c,i)=>(
                              <div key={i}>
                                {c.custName} ({money(c.price)}/{money(c.share)})
                              </div>
                            ))
                        )
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {editEmployeeInfo && (
            <div style={{display:"flex", gap:8, marginTop:16, justifyContent:"center"}}>
              <button className="btn" style={{fontSize:13, padding:"6px 16px"}} onClick={handleSaveEmployeeInfo}>
                Save
              </button>
              <button className="btn outline" style={{fontSize:13, padding:"6px 16px"}} onClick={handleCancelEmployeeInfo}>
                Cancel
              </button>
            </div>
          )}
          <div style={{ marginTop:12, fontSize:12, color:'var(--muted)', textAlign:"center" }}>
            "PP" = current pay period window.
          </div>
        </div>
      </div>

      {/* ===== PAY PERIOD PAYOUT TABLE (Mark Pay) ===== */}
      <div className="card">
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
          <h3 className="section-title" style={{ marginBottom: 6 }}>Mark Pay This Period</h3>
          <button
            className="btn outline"
            style={{
              fontSize:12,
              padding:"4px 10px",
              marginLeft:8,
              marginTop:-4,
              borderColor: editMarkPay ? "var(--accent)" : "#cbd5e1",
              color: editMarkPay ? "var(--accent)" : "#64748b"
            }}
            onClick={()=>setEditMarkPay(e=>!e)}
          >
            {editMarkPay ? "Done" : "Edit"}
          </button>
        </div>
        <table className="table" style={{tableLayout:"fixed", width:"100%"}}>
          <colgroup>
            <col style={{width:"24%"}} />
            <col style={{width:"12%"}} />
            <col style={{width:"16%"}} />
            <col style={{width:"16%"}} />
            <col style={{width:"16%"}} />
            <col style={{width:"16%"}} />
          </colgroup>
          <thead>
            <tr>
              <th style={{ ...payCell, fontWeight: 700, fontSize: "13.5px", padding: "10px 12px", letterSpacing: "0.25px" }}>Name</th>
              <th style={{ ...payCell, fontWeight: 700, fontSize: "13.5px", padding: "10px 12px", letterSpacing: "0.25px" }}>Role</th>
              <th style={{ ...payCell, fontWeight: 700, fontSize: "13.5px", padding: "10px 12px", letterSpacing: "0.25px" }}>Worker Earn (PP)</th>
              <th style={{ ...payCell, fontWeight: 700, fontSize: "13.5px", padding: "10px 12px", letterSpacing: "0.25px" }}>Seller Earn (PP)</th>
              <th style={{ ...payCell, fontWeight: 700, fontSize: "13.5px", padding: "10px 12px", letterSpacing: "0.25px" }}>Total (PP)</th>
              <th style={{ ...payCell, fontWeight: 700, fontSize: "13.5px", padding: "10px 12px", letterSpacing: "0.25px" }}>Pay</th>
            </tr>
          </thead>
          <tbody>
            {employeeInfo.length === 0 && (
              <tr>
                <td colSpan={6} style={{...payCell, color:'var(--muted)'}}>
                  No payouts this period.
                </td>
              </tr>
            )}
            {(editMarkPay ? markPayEditRows : employeeInfo).map((p, idx) => (
              <tr key={p.id}>
                <td style={{...payCell, fontWeight:600}}>
                  {editMarkPay
                    ? <input
                        type="text"
                        value={p.name}
                        style={{width:"90%", fontWeight:600, fontSize:13, padding:"4px 6px"}}
                        onChange={e=>{
                          const v = e.target.value;
                          setMarkPayEditRows(rows=>{
                            const copy = [...rows];
                            copy[idx] = {...copy[idx], name:v};
                            return copy;
                          });
                        }}
                      />
                    : p.name}
                </td>
                <td style={payCell}>
                  {editMarkPay
                    ? <input
                        type="text"
                        value={p.role}
                        style={{width:"90%", fontSize:13, padding:"4px 6px"}}
                        onChange={e=>{
                          const v = e.target.value;
                          setMarkPayEditRows(rows=>{
                            const copy = [...rows];
                            copy[idx] = {...copy[idx], role:v};
                            return copy;
                          });
                        }}
                      />
                    : p.role}
                </td>
                <td style={payCell}>
                  {editMarkPay
                    ? <input
                        type="text"
                        value={p.workerPP}
                        style={{width:"90%", fontSize:13, padding:"4px 6px"}}
                        onChange={e=>{
                          const v = e.target.value;
                          setMarkPayEditRows(rows=>{
                            const copy = [...rows];
                            copy[idx] = {...copy[idx], workerPP:v};
                            return copy;
                          });
                        }}
                      />
                    : money(p.workerPP)}
                </td>
                <td style={payCell}>
                  {editMarkPay
                    ? <input
                        type="text"
                        value={p.sellerPP}
                        style={{width:"90%", fontSize:13, padding:"4px 6px"}}
                        onChange={e=>{
                          const v = e.target.value;
                          setMarkPayEditRows(rows=>{
                            const copy = [...rows];
                            copy[idx] = {...copy[idx], sellerPP:v};
                            return copy;
                          });
                        }}
                      />
                    : money(p.sellerPP)}
                </td>
                <td style={payCell}>
                  {editMarkPay
                    ? <input
                        type="text"
                        value={p.earnPP}
                        style={{width:"90%", fontSize:13, padding:"4px 6px"}}
                        onChange={e=>{
                          const v = e.target.value;
                          setMarkPayEditRows(rows=>{
                            const copy = [...rows];
                            copy[idx] = {...copy[idx], earnPP:v};
                            return copy;
                          });
                        }}
                      />
                    : <strong>{money(p.earnPP)}</strong>}
                </td>
                <td style={payCell}>
                  <button
                    className="btn outline"
                    style={{fontSize:12, padding:"4px 8px", lineHeight:1}}
                    onClick={()=>markPaid(p)}
                    disabled={editMarkPay}
                  >
                    Mark Paid
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {editMarkPay && (
          <div style={{display:"flex", gap:8, marginTop:16, justifyContent:"center"}}>
            <button className="btn" style={{fontSize:13, padding:"6px 16px"}} onClick={handleSaveMarkPay}>
              Save
            </button>
            <button className="btn outline" style={{fontSize:13, padding:"6px 16px"}} onClick={handleCancelMarkPay}>
              Cancel
            </button>
          </div>
        )}
        <div style={{fontSize:12, color:'var(--muted)', marginTop:8}}>
          Mark Paid = just logs a receipt in this browser (localStorage.payouts). It doesn't actually move money.
        </div>
      </div>

      {/* ===== PAYOUT RECEIPTS (ALL TIME) ===== */}
      <div className="card">
        <h3 className="section-title" style={{ marginBottom: 6 }}>Payout Receipts (All Time)</h3>
        <table className="table" style={{fontSize:12}}>
          <thead>
            <tr>
              <th>When Logged</th>
              <th>Name</th>
              <th>Email</th>
              <th>Amount Paid</th>
              <th>Period Start</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {payouts.length === 0 && (
              <tr>
                <td colSpan={6} style={{color:"var(--muted)"}}>
                  None recorded yet.
                </td>
              </tr>
            )}

            {payouts.map(row=>(
              <tr key={row.id}>
                <td>{fmtDate(row.createdAtISO)}</td>
                <td style={{fontWeight:600}}>{row.name}</td>
                <td style={{fontSize:11, color:"var(--muted)"}}>{row.email}</td>
                <td><strong>{money(row.amount)}</strong></td>
                <td>{fmtDateShort(row.periodStartISO)}</td>
                <td>
                  <button
                    className="btn outline"
                    style={{fontSize:11, padding:"4px 6px", lineHeight:1, color:"var(--accent)"}}
                    onClick={()=>removePayout(row.id)}
                  >
                    remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{fontSize:12, color:'var(--muted)', marginTop:8, lineHeight:1.4}}>
          This is your audit trail. Stored in localStorage.payouts on this device.
          Clearing browser data deletes it.
        </div>
      </div>
    </div>
  );
}