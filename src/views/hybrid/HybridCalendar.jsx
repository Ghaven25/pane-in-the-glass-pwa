// src/views/hybrid/HybridCalendar.jsx
import React from "react";

const chipStyle = {
  fontSize: 12,
  padding: "2px 8px",
  borderRadius: 999,
  border: "1px solid var(--border)",
  color: "var(--muted)",
  background: "transparent",
  lineHeight: "18px",
  display: "inline-block",
  verticalAlign: "middle"
};
function Title({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <h2 className="section-title" style={{ margin: 0 }}>{label}</h2>
      <span style={chipStyle}>next 14 days</span>
    </div>
  );
}

function SectionStart({ text = "Workers Calendar" }) {
  return (
    <div style={{ margin: "24px 0 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ height: 1, background: "var(--border)", flex: 1 }} />
        <span
          style={{
            border: "1px solid #33c7e6",
            color: "#33c7e6",
            fontWeight: 800,
            fontSize: 11,
            letterSpacing: 1,
            textTransform: "uppercase",
            padding: "6px 10px",
            borderRadius: 999,
            background: "rgba(51,199,230,0.12)"
          }}
        >
          {text} starts here
        </span>
        <div style={{ height: 1, background: "var(--border)", flex: 1 }} />
      </div>
    </div>
  );
}

/* ===== storage helpers ===== */
const read = (k, fb) => {
  try {
    return JSON.parse(localStorage.getItem(k) ?? JSON.stringify(fb));
  } catch {
    return fb;
  }
};
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const getUser       = () => { try { return JSON.parse(localStorage.getItem("pane_user") || "null"); } catch { return null; } };
const readUsers     = () => read("users_seed", []);
const readAvail     = () => read("availability", []);
const writeAvail    = (rows) => write("availability", rows);
const readAssign    = () => read("assignments", []);
const readSales     = () => read("sales", []);
const readSellerCal = () => read("seller_calendar", []);

/* ===== date helpers ===== */
const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const addDays    = (d,n)=> { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
const toISODate  = (d) => startOfDay(d).toISOString().slice(0,10);
const fmtCol     = (d) => d.toLocaleDateString([], { weekday:"short", month:"short", day:"numeric" });
const shortDow   = (d) => d.toLocaleDateString([], { weekday:"short" }).slice(0,3);
const daysDiff   = (a,b)=> Math.round((startOfDay(a) - startOfDay(b)) / (24*60*60*1000));

/* ===== config ===== */
const LOCK_WINDOW_DAYS = 3; // lock today + next 2 days on WORKER side

/* ===== role filters (no admins displayed) ===== */
const sellersOnly = (u)=> u && (u.role === "seller" || u.role === "hybrid");
const workersOnly = (u)=> u && (u.role === "worker" || u.role === "hybrid");

/* ===== availability read/write helpers ===== */
function readHoursFor(userEmail, role, dowShort){
  const rows = readAvail();
  const hit = rows.find(r => r.userEmail===userEmail && r.role===role && r.day===dowShort);
  return hit?.hours || "";
}
function setHoursFor(userEmail, role, dowShort, hours){
  const all = readAvail();
  const idx = all.findIndex(r => r.userEmail===userEmail && r.role===role && r.day===dowShort);
  if(idx === -1){
    all.push({ userEmail, role, day:dowShort, hours:(hours||"").trim() });
  }else{
    all[idx] = { ...all[idx], hours:(hours||"").trim() };
  }
  writeAvail(all);
}

/* ===== main component ===== */
export default function HybridCalendar(){
  const me = getUser();
  const myEmail = me?.email || "";

  const [days] = React.useState(()=>{
    const t = startOfDay(new Date());
    return Array.from({length:14}, (_,i)=> addDays(t,i)); // rolling 2 weeks
  });

  const users        = React.useMemo(()=> readUsers(), []);
  const sellerUsers  = React.useMemo(()=> users.filter(sellersOnly), [users]);
  const workerUsers  = React.useMemo(()=> users.filter(workersOnly), [users]);

  const sellerCal    = React.useMemo(()=> readSellerCal(), []);
  const assignments  = React.useMemo(()=> readAssign(), []);
  const sales        = React.useMemo(()=> readSales(), []);

  // --- live hours state mirrored to localStorage ---
  const keyH = (email, role, day) => `${email}|${role}|${day}`;

  const [hoursMap, setHoursMap] = React.useState(() => {
    const rows = readAvail();
    const m = new Map();
    for (const r of rows) {
      if (r?.userEmail && r?.role && r?.day) {
        m.set(keyH(r.userEmail, r.role, r.day), r.hours || "");
      }
    }
    return m;
  });

  const getHours = React.useCallback((email, role, dayShort) => {
    return hoursMap.get(keyH(email, role, dayShort)) || "";
  }, [hoursMap]);

  const setHoursLocal = React.useCallback((email, role, dayShort, hours) => {
    setHoursMap(prev => {
      const next = new Map(prev);
      next.set(keyH(email, role, dayShort), (hours || "").trim());
      const arr = Array.from(next.entries()).map(([k, v]) => {
        const [e, r, d] = k.split("|");
        return { userEmail: e, role: r, day: d, hours: v };
      });
      writeAvail(arr);
      return next;
    });
  }, []);

  // ===== responsive mode (vertical lists on narrow screens) =====
  const [isNarrow, setIsNarrow] = React.useState(() => {
    try { return window.matchMedia("(max-width: 720px)").matches; } catch { return false; }
  });
  React.useEffect(() => {
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

  /* ---------- SELLERS GRID data ---------- */
  const sellerMapByDateEmail = React.useMemo(()=>{
    const map = new Map();
    for(const u of sellerUsers){
      for(const d of days){
        map.set(`${u.email}|${toISODate(d)}`, {
          locked: [],
          hoursFromAvail: getHours(u.email, "seller", shortDow(d))
        });
      }
    }
    for(const sc of sellerCal){
      if(!sc?.sellerEmail || !sc.dateISO) continue;
      const key = `${sc.sellerEmail}|${sc.dateISO}`;
      if(map.has(key)){
        map.get(key).locked.push({
          time: sc.time || "-",
          address: sc.address || "-",
          notes: sc.notes || ""
        });
      }
    }
    for(const v of map.values()){
      v.locked.sort((a,b)=> String(a.time||"").localeCompare(String(b.time||"")));
    }
    return map;
  }, [sellerUsers, days, sellerCal, hoursMap]);

  // NEW: seller editability — only your row, and ONLY when no locked neighborhood that day
  const canEditSellerCell = (email, lockedItems) => {
    if (email !== myEmail) return false;
    return (lockedItems?.length || 0) === 0;
  };

  /* ---------- WORKERS GRID helpers ---------- */
  const byWorkerWeekday = React.useMemo(()=>{
    const map = new Map(); // key: email|Mon/Tue...
    const SHORTS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    for(const a of assignments){
      for(const email of [a.workerEmail, a.worker2Email]){
        if(!email) continue;
        const when = (a.when||"").toLowerCase();
        const short = SHORTS.find(s=> when.includes(s.toLowerCase()));
        if(!short) continue;
        const sale = sales.find(s=> String(s.id)===String(a.saleId));
        const key = `${email}|${short}`;
        const arr = map.get(key) || [];
        arr.push({ customer: sale?.name || a.saleId, address: sale?.address || "-", when: a.when || "-" });
        map.set(key, arr);
      }
    }
    return map;
  }, [assignments, sales]);

  const canEditWorkerCell = (email, dateObj)=>{
    if(email !== myEmail) return false;                // only your own row
    const diff = daysDiff(dateObj, new Date());
    const withinLockWindow = diff >= 0 && diff < LOCK_WINDOW_DAYS;
    if(withinLockWindow) return false;                 // locked by time window
    // also lock if scheduled on that weekday
    const short = shortDow(dateObj);
    const sched = (byWorkerWeekday.get(`${email}|${short}`) || []);
    if(sched.length > 0) return false;                 // locked when scheduled
    return true;
  };

  const onWorkerEdit = (email, dateObj, val)=>{
    if(email !== myEmail) return;
    const short = shortDow(dateObj);
    setHoursLocal(email, "worker", short, val);
  };

  const onSellerEdit = (email, dateObj, val)=>{
    if(email !== myEmail) return;
    const short = shortDow(dateObj);
    setHoursLocal(email, "seller", short, val);
  };

  return (
    <div className="grid">
      {/* ===== SELLERS CALENDAR (All Sellers; my row editable unless locked) ===== */}
      <div className="card">
        <Title label="Sellers" />

        {!isNarrow ? (
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ minWidth: 1200 }}>
              <thead>
                <tr>
                  <th style={{ width: 220, position: "sticky", left: 0, zIndex: 2, background: "var(--card)" }}>Seller</th>
                  {days.map((d) => (
                    <th key={d.toISOString()} style={{ position: "sticky", top: 0, zIndex: 1, background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
                      {fmtCol(d)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sellerUsers.length === 0 && (
                  <tr>
                    <td colSpan={1 + days.length} style={{ color: "var(--muted)" }}>
                      No sellers.
                    </td>
                  </tr>
                )}
                {sellerUsers.map((u) => {
                  return (
                    <tr key={u.email}>
                      <td style={{ fontWeight: u.email === myEmail ? 700 : 500, position: "sticky", left: 0, zIndex: 1, background: "var(--card)" }}>
                        {u.name}
                      </td>
                      {days.map((d) => {
                        const dateISO = toISODate(d);
                        const key = `${u.email}|${dateISO}`;
                        const cell =
                          sellerMapByDateEmail.get(key) || {
                            locked: [],
                            hoursFromAvail: "",
                          };
                        const lockedItems = cell.locked || [];
                        const value = cell.hoursFromAvail || "";
                        const editable = canEditSellerCell(u.email, lockedItems);

                        return (
                          <td key={key}>
                            <input
                              value={value}
                              onChange={(e) =>
                                editable && onSellerEdit(u.email, d, e.target.value)
                              }
                              placeholder="hours"
                              readOnly={!editable}
                              disabled={!editable}
                              style={{
                                width: "100%",
                                padding: "6px 8px",
                                border: "1px solid var(--border)",
                                borderRadius: 8,
                                outline: "none",
                                background: "var(--card)",
                                color: "var(--text)",
                                fontWeight: u.email === myEmail ? 600 : 400,
                                opacity: editable ? 1 : 0.75,
                                cursor: editable ? "text" : "not-allowed",
                              }}
                            />
                            {lockedItems.length > 0 && (
                              <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)" }}>
                                {lockedItems.map((r, i) => (
                                  <div key={i}>
                                    <div>
                                      🔒 {r.time || "-"}{r.address ? ` — ${r.address}` : ""}
                                    </div>
                                    {r.notes ? (
                                      <div style={{ marginLeft: 14 }}>{r.notes}</div>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div>
            {days.map((d) => {
              const dateISO = toISODate(d);
              return (
                <div key={dateISO} className="card" style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 14,
                      marginBottom: 6,
                      textAlign: "left",
                    }}
                  >
                    {fmtCol(d)}
                  </div>
                  <table className="table" style={{ tableLayout: "fixed", width: "100%" }}>
                    <thead>
                      <tr>
                        <th style={{ width: "33.33%", fontSize: 12 }}>Seller</th>
                        <th style={{ width: "33.33%", fontSize: 12 }}>Hours</th>
                        <th style={{ width: "33.33%", fontSize: 12 }}>Streets</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sellerUsers.length === 0 ? (
                        <tr>
                          <td colSpan={3} style={{ color: "var(--muted)" }}>
                            No sellers.
                          </td>
                        </tr>
                      ) : (
                        sellerUsers.map((u) => {
                          const key = `${u.email}|${dateISO}`;
                          const cell =
                            sellerMapByDateEmail.get(key) || {
                              locked: [],
                              hoursFromAvail: "",
                            };
                          const lockedItems = cell.locked || [];
                          const value = cell.hoursFromAvail || "";
                          const editable = canEditSellerCell(u.email, lockedItems);

                          return (
                            <tr key={u.email}>
                              <td style={{ fontWeight: u.email === myEmail ? 700 : 500, textAlign:"left" }}>
                                {u.name}
                              </td>
                              <td>
                                <input
                                  value={value}
                                  onChange={(e) =>
                                    editable &&
                                    onSellerEdit(u.email, d, e.target.value)
                                  }
                                  placeholder="hours"
                                  readOnly={!editable}
                                  disabled={!editable}
                                  style={{
                                    width: "100%",
                                    padding: "6px 8px",
                                    border: "1px solid var(--border)",
                                    borderRadius: 8,
                                    outline: "none",
                                    background: "var(--card)",
                                    color: "var(--text)",
                                    fontWeight: u.email === myEmail ? 600 : 400,
                                    opacity: editable ? 1 : 0.75,
                                    cursor: editable ? "text" : "not-allowed",
                                    fontSize: 13,
                                  }}
                                />
                              </td>
                              <td style={{ fontSize: 12, textAlign: "left", wordBreak: "break-word" }}>
                                {(() => {
                                  const streets = (lockedItems || []).map(r => r?.address).filter(Boolean);
                                  return streets.length > 0 ? streets.join(", ") : "—";
                                })()}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== WORKERS CALENDAR (All Workers; my row editable except locked days; scheduled jobs rendered) ===== */}
      <SectionStart text="Workers Calendar" />
      <div
        className="card"
        style={{
          marginTop: 16,
          border: "1px solid #33c7e6",
          background: "linear-gradient(180deg, rgba(51,199,230,0.06), rgba(51,199,230,0.02))",
          boxShadow: "0 0 0 3px rgba(51,199,230,0.08) inset"
        }}
      >
        <Title label="Workers" />

        {!isNarrow ? (
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ minWidth: 1200 }}>
              <thead>
                <tr>
                  <th style={{ width: 220, position: "sticky", left: 0, zIndex: 2, background: "var(--card)" }}>Worker</th>
                  {days.map((d) => (
                    <th key={d.toISOString()} style={{ position: "sticky", top: 0, zIndex: 1, background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
                      {fmtCol(d)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workerUsers.length === 0 && (
                  <tr>
                    <td colSpan={1 + days.length} style={{ color: "var(--muted)" }}>
                      No workers.
                    </td>
                  </tr>
                )}
                {workerUsers.map((u) => {
                  return (
                    <tr key={u.email}>
                      <td style={{ fontWeight: u.email === myEmail ? 700 : 500, position: "sticky", left: 0, zIndex: 1, background: "var(--card)" }}>
                        {u.name}
                      </td>
                      {days.map((d) => {
                        const short = shortDow(d);
                        const sched = byWorkerWeekday.get(`${u.email}|${short}`) || [];
                        const value = getHours(u.email, "worker", short);
                        const editable = canEditWorkerCell(u.email, d);

                        return (
                          <td key={u.email + toISODate(d)}>
                            <input
                              value={value}
                              onChange={(e) =>
                                editable && onWorkerEdit(u.email, d, e.target.value)
                              }
                              placeholder="hours"
                              readOnly={!editable}
                              disabled={!editable}
                              style={{
                                width: "100%",
                                padding: "6px 8px",
                                border: "1px solid var(--border)",
                                borderRadius: 8,
                                outline: "none",
                                background: "var(--card)",
                                color: "var(--text)",
                                fontWeight: u.email === myEmail ? 600 : 400,
                                opacity: editable ? 1 : 0.6,
                                cursor: editable ? "text" : "not-allowed",
                              }}
                            />

                            {sched.length > 0 && (
                              <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)" }}>
                                {sched.map((s, i) => (
                                  <div key={i}>
                                    <strong>{s.customer}</strong>
                                    <div style={{ color: "var(--muted)" }}>{s.address}</div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {u.email === myEmail && !editable && (
                              <div style={{ marginTop: 6, fontSize: 11, color: "var(--muted)" }}>
                                🔒
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div>
            {days.map((d) => {
              const dateISO = toISODate(d);
              return (
                <div key={dateISO} className="card" style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 14,
                      marginBottom: 6,
                      textAlign: "left",
                    }}
                  >
                    {fmtCol(d)}
                  </div>
                  <table className="table" style={{ tableLayout: "fixed", width: "100%" }}>
                    <thead>
                      <tr>
                        <th style={{ width: "33.33%", fontSize: 12 }}>Worker</th>
                        <th style={{ width: "33.33%", fontSize: 12 }}>Hours</th>
                        <th style={{ width: "33.33%", fontSize: 12 }}>Scheduled</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workerUsers.length === 0 ? (
                        <tr>
                          <td colSpan={3} style={{ color: "var(--muted)" }}>
                            No workers.
                          </td>
                        </tr>
                      ) : (
                        workerUsers.map((u) => {
                          const short = shortDow(d);
                          const sched = byWorkerWeekday.get(`${u.email}|${short}`) || [];
                          const value = getHours(u.email, "worker", short);
                          const editable = canEditWorkerCell(u.email, d);

                          return (
                            <tr key={u.email}>
                              <td style={{ fontWeight: u.email === myEmail ? 700 : 500, textAlign:"left" }}>
                                {u.name}
                              </td>
                              <td>
                                <input
                                  value={value}
                                  onChange={(e) =>
                                    editable &&
                                    onWorkerEdit(u.email, d, e.target.value)
                                  }
                                  placeholder="hours"
                                  readOnly={!editable}
                                  disabled={!editable}
                                  style={{
                                    width: "100%",
                                    padding: "6px 8px",
                                    border: "1px solid var(--border)",
                                    borderRadius: 8,
                                    outline: "none",
                                    background: "var(--card)",
                                    color: "var(--text)",
                                    fontWeight: u.email === myEmail ? 600 : 400,
                                    opacity: editable ? 1 : 0.6,
                                    cursor: editable ? "text" : "not-allowed",
                                    fontSize: 13,
                                  }}
                                />
                              </td>
                              <td style={{ fontSize: 12, color: "var(--muted)", textAlign:"left" }}>
                                {sched.length > 0 ? (
                                  sched.map((s, i) => (
                                    <div key={i}>
                                      <strong>{s.customer}</strong>
                                      <div style={{ color: "var(--muted)" }}>{s.address}</div>
                                    </div>
                                  ))
                                ) : (
                                  <span>—</span>
                                )}
                                {u.email === myEmail && !editable ? (
                                  <div style={{ marginTop: 4, fontSize: 11 }}>🔒</div>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}