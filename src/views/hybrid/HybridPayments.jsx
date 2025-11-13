// src/views/hybrid/HybridPayments.jsx
import React from "react";

/* ========== tiny storage helpers ========== */
const read = (k, fb) => {
  try { return JSON.parse(localStorage.getItem(k) ?? JSON.stringify(fb)); }
  catch { return fb; }
};
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const getUser         = () => { try { return JSON.parse(localStorage.getItem("pane_user")||"null"); } catch { return null; } };
const readSales       = () => read("sales", []);
const readAssignments = () => read("assignments", []);

/* ========== money / formatting ========== */
const money = (n)=> (isFinite(+n) ? `$${(+n).toFixed(2)}` : "-");

function formatDateTimeLoose(d) {
  if (!d) return "-";
  const dt = (typeof d === "number") ? new Date(d) : new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString([], { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" });
}

/* ========== “Next Payday” logic ========== */
function getNextPaydayISO() {
  const saved = localStorage.getItem("hybrid_next_payday");
  if (saved) return saved;
  // seed with 2025-11-01
  const seed = "2025-11-01";
  localStorage.setItem("hybrid_next_payday", seed);
  return seed;
}
function formatNextPaydayLabel(iso) {
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString([], {
    weekday:"short",
    month:"short",
    day:"numeric",
    year:"numeric"
  });
}

function __adminMarkPayrollPaidInternal() {
  const curISO = getNextPaydayISO();
  const d = new Date(`${curISO}T00:00:00`);
  d.setDate(d.getDate() + 14);
  const nextISO = d.toISOString().slice(0,10);
  localStorage.setItem("hybrid_next_payday", nextISO);
  localStorage.setItem("hybrid_payroll_clear_ts", String(Date.now()));
}

if (typeof window !== "undefined" && !window.__adminMarkPayrollPaid) {
  window.__adminMarkPayrollPaid = () => {
    __adminMarkPayrollPaidInternal();
    alert("Payroll marked paid. Tables cleared and next payday advanced by 14 days.");
    location.reload();
  };
}

/* ========== hours (worker) for paycheck display ========== */
function parseDurationHours(when){
  if(!when) return 0;
  const s = String(when).toLowerCase();

  let m =
    s.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*[-–]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i) ||
    s.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/) ||
    s.match(/(?:mon|tue|wed|thu|fri|sat|sun)?\s*(\d{1,2})\s*-\s*(\d{1,2})/i);

  if(!m) return 0;

  const toMin = (tok, fallbackPm=null)=>{
    let str = tok.trim(),
        hasAm = /am/.test(str),
        hasPm = /pm/.test(str);

    str = str.replace(/\s*(am|pm)/g,"").trim();

    let [hh,mm="0"] = str.split(":"),
        h  = parseInt(hh,10),
        m2 = parseInt(mm,10)||0,
        pm = false;

    if (hasAm) pm = false;
    else if (hasPm) pm = true;
    else if (fallbackPm!=null) pm = fallbackPm;

    if(pm && h<12) h+=12;
    if(!pm && /am/.test(tok) && h===12) h=0;

    return h*60+m2;
  };

  const [a,b] = [m[1],m[2]];
  let sMin = toMin(a),
      eMin = toMin(b);

  if(!/(am|pm)/.test(a+b) && eMin<=sMin) {
    eMin = toMin(b,true);
  }
  return Math.max(0,(eMin-sMin)/60);
}

function sumWorkerHours(assignments, email){
  let total=0;
  for(const a of assignments){
    const mine = (
      a &&
      (a.workerEmail===email || a.worker2Email===email) &&
      a.status==="finished"
    );
    if(!mine) continue;
    total += parseDurationHours(a.when||"");
  }
  return total;
}

export default function HybridPayments(){
  const me = getUser();
  const myEmail = me?.email || "";

  const sales = React.useMemo(()=> readSales(), []);
  const assignments = React.useMemo(()=> readAssignments(), []);

  const clearTs = +(localStorage.getItem("hybrid_payroll_clear_ts")||0);
  const nextPaydayISO = getNextPaydayISO();
  const nextPaydayLabel = formatNextPaydayLabel(nextPaydayISO);

  // SELLER 30%
  const sellerRows = React.useMemo(()=>{
    const finishedAssignments = assignments.filter(
      a => (a.workerEmail===myEmail || a.worker2Email===myEmail) && a.status==="finished"
    );
    const saleIds = new Set(finishedAssignments.map(a => a.saleId));
    return sales
      .filter(
        s => saleIds.has(s.id)
      )
      .filter(
        s => (s?.createdAt||0) > clearTs
      )
      .map(s => {
        const price = isFinite(+s.price) ? +s.price : null;
        return {
          id: s.id,
          dateLabel: s.soldAt
            ? formatDateTimeLoose(s.soldAt)
            : (s.createdAt ? formatDateTimeLoose(s.createdAt) : "-"),
          customer: s.name || "-",
          address: s.address || "-",
          sale: price==null ? null : price,
          your30: price==null ? null : price*0.30,
          notes: s.notes || "-"
        };
      })
      .sort((a,b)=> String(b.dateLabel||"").localeCompare(String(a.dateLabel||"")));
  }, [sales, assignments, myEmail, clearTs]);

  const sellerSubtotal = React.useMemo(
    () => sellerRows.reduce((sum, r) => sum + (r.your30 ?? 0), 0),
    [sellerRows]
  );

  // WORKER 20%
  const workerRows = React.useMemo(()=>{
    const mapBySaleId = new Map(sales.map(s => [String(s.id), s]));
    return assignments
      .filter(
        a => (a.workerEmail===myEmail || a.worker2Email===myEmail) && a.status==="finished"
      )
      .filter(
        a => (typeof a.id === "number" ? a.id : 0) > clearTs
      )
      .map(a => {
        const s = mapBySaleId.get(String(a.saleId));
        const price = isFinite(+s?.price) ? +s.price : null;
        const your20 = price==null ? null : price*0.20;
        return {
          id: a.id,
          dateTime: a.when || "-",
          customer: s?.name || a.saleId,
          address: s?.address || "-",
          your20,
          notes: s?.notes || "-"
        };
      });
  }, [assignments, myEmail, clearTs, sales]);

  const workerSubtotal = React.useMemo(
    () => workerRows.reduce((sum, r) => sum + (r.your20 ?? 0), 0),
    [workerRows]
  );

  const paycheckTotal = sellerSubtotal + workerSubtotal;
  const totalHoursWorked = React.useMemo(
    () => sumWorkerHours(assignments, myEmail),
    [assignments, myEmail]
  );

  /* shared cell style for full centering */
  const cellBase = {
    textAlign: "center",
    verticalAlign: "middle"
  };
  const labelXs = { fontSize: 11, fontWeight: 800, letterSpacing: .2, textTransform: "uppercase" };
  const valueXs = { fontSize: 13, lineHeight: 1.25 };

  return (
    <div className="grid">
      {/* ===== Paycheck summary cards ===== */}
      <div className="card" style={{ paddingTop: 16 }}>
        <h2
          className="section-title"
          style={{ margin: "0 0 8px 0", lineHeight: 1.1, textAlign: "center" }}
        >
          Paycheck
        </h2>

        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 6,
            marginTop: -100
          }}
        >
          <div className="card" style={{padding:"6px 8px", textAlign:"center"}}>
            <div className="muted" style={{fontSize:10, textTransform:"uppercase", letterSpacing:.3}}>Total Paycheck</div>
            <div style={{fontSize:15, fontWeight:900, marginTop:4}}>{money(paycheckTotal)}</div>
            <div style={{fontSize:11.5, color:"var(--muted)"}}>= <strong>30% (Seller)</strong> + <strong>20% (Worker)</strong></div>
          </div>

          <div className="card" style={{padding:"6px 8px", textAlign:"center"}}>
            <div className="muted" style={{fontSize:10, textTransform:"uppercase", letterSpacing:.3}}>Next Payday</div>
            <div style={{fontSize:18, fontWeight:800, marginTop:4}}>{nextPaydayLabel}</div>
          </div>

          <div className="card" style={{padding:"6px 8px", textAlign:"center"}}>
            <div className="muted" style={{fontSize:10, textTransform:"uppercase", letterSpacing:.3}}>Hours (Worker)</div>
            <div style={{fontSize:15, fontWeight:800, marginTop:4}}>
              {isFinite(totalHoursWorked) ? `${totalHoursWorked.toFixed(1)} hrs` : "-"}
            </div>
          </div>

          <div className="card" style={{padding:"6px 8px", textAlign:"center"}}>
            <div className="muted" style={{fontSize:8, textTransform:"uppercase", letterSpacing:.3}}>Breakdown</div>
            <div style={{fontSize:11, marginTop:4, lineHeight:1.35}}>
              <div>Seller 30%: <strong>{money(sellerSubtotal)}</strong></div>
              <div>Worker 20%: <strong>{money(workerSubtotal)}</strong></div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Payments (Seller) ===== */}
      <div className="card" style={{ marginTop: 12, padding: "10px 12px" }}>
        <h2 className="section-title" style={{ marginBottom: 6, textAlign: "center" }}>Payments (Seller)</h2>

        {sellerRows.length === 0 ? (
          <p className="muted" style={{margin:0, textAlign:"center"}}>No seller payments right now.</p>
        ) : (
          <div className="grid" style={{gap:8}}>
            {sellerRows.map(r => (
              <div key={r.id} className="card" style={{padding:"8px 10px"}}>
                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:6}}>
                  <div>
                    <div className="muted" style={labelXs}>Date Sold</div>
                    <div style={valueXs}>{r.dateLabel}</div>
                  </div>
                  <div>
                    <div className="muted" style={labelXs}>Customer</div>
                    <div style={valueXs}>{r.customer}</div>
                  </div>
                  <div>
                    <div className="muted" style={labelXs}>Address</div>
                    <div style={valueXs}>{r.address}</div>
                  </div>
                  <div>
                    <div className="muted" style={labelXs}>Sale</div>
                    <div style={valueXs}>{r.sale==null ? "-" : money(r.sale)}</div>
                  </div>
                  <div>
                    <div className="muted" style={labelXs}>Your 30%</div>
                    <div style={{...valueXs, fontWeight:800}}>{r.your30==null ? "-" : money(r.your30)}</div>
                  </div>
                  <div style={{gridColumn:"1 / -1"}}>
                    <div className="muted" style={labelXs}>Notes</div>
                    <div style={{...valueXs, whiteSpace:"pre-wrap"}}>{r.notes}</div>
                  </div>
                </div>
              </div>
            ))}
            <div className="card" style={{padding:"8px 10px", textAlign:"right"}}>
              <strong>Subtotal (Seller): {money(sellerSubtotal)}</strong>
            </div>
          </div>
        )}
      </div>

      {/* ===== Payments (Worker) ===== */}
      <div className="card" style={{ marginTop: 12, padding: "10px 12px" }}>
        <h2 className="section-title" style={{ marginBottom: 6, textAlign: "center" }}>Payments (Worker)</h2>

        {workerRows.length === 0 ? (
          <p className="muted" style={{margin:0, textAlign:"center"}}>No worker payments right now.</p>
        ) : (
          <div className="grid" style={{gap:8}}>
            {workerRows.map(r => (
              <div key={r.id} className="card" style={{padding:"8px 10px"}}>
                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:6}}>
                  <div>
                    <div className="muted" style={labelXs}>Date &amp; Time</div>
                    <div style={valueXs}>{r.dateTime}</div>
                  </div>
                  <div>
                    <div className="muted" style={labelXs}>Customer</div>
                    <div style={valueXs}>{r.customer}</div>
                  </div>
                  <div>
                    <div className="muted" style={labelXs}>Address</div>
                    <div style={valueXs}>{r.address}</div>
                  </div>
                  <div>
                    <div className="muted" style={labelXs}>Your 20%</div>
                    <div style={{...valueXs, fontWeight:800}}>{r.your20==null ? "-" : money(r.your20)}</div>
                  </div>
                  <div style={{gridColumn:"1 / -1"}}>
                    <div className="muted" style={labelXs}>Notes</div>
                    <div style={{...valueXs, whiteSpace:"pre-wrap"}}>{r.notes}</div>
                  </div>
                </div>
              </div>
            ))}
            <div className="card" style={{padding:"8px 10px", textAlign:"right"}}>
              <strong>Subtotal (Worker): {money(workerSubtotal)}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Dev note:
         Run window.__adminMarkPayrollPaid() in DevTools to simulate paying out:
         - advances payday +14d
         - clears current items
      */}
    </div>
  );
}