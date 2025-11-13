// src/views/MyNeighborhoods.jsx
import React from 'react'

/* ===== storage helpers ===== */
const read = (k, fb) => { try { return JSON.parse(localStorage.getItem(k) ?? JSON.stringify(fb)); } catch { return fb; } };
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const getUser            = () => { try { return JSON.parse(localStorage.getItem('pane_user')||'null'); } catch { return null; } };
const readNeighborhoods  = () => read('neighborhoodAssignments', []);   // [{id, sellerEmail, neighborhood, dateISO, time, day, notes, accepted, denied:[{email,reason,ts}], acceptedAt}]
const writeNeighborhoods = (rows) => write('neighborhoodAssignments', rows);

const readSellerCal      = () => read('seller_calendar', []);           // [{id,sellerEmail,dateISO,time,address,notes,source:'neighborhood'|...}]
const writeSellerCal     = (rows) => write('seller_calendar', rows);

const readSales          = () => read('sales', []);                     // used to count "# of sales" for Past Neighborhoods

/* ===== helpers ===== */
const fmtDateTime = (iso, dayLabel) => {
  if(!iso) return dayLabel ? String(dayLabel) : '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return dayLabel ? String(dayLabel) : '-';
  const base = d.toLocaleString([], { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' });
  return dayLabel ? `${base} • ${dayLabel}` : base;
};

const withinDays = (iso, days) => {
  const d = new Date(iso);
  if(isNaN(d.getTime())) return false;
  const diff = Date.now() - d.getTime();
  return diff >= 0 && diff <= days*24*60*60*1000;
};

const isTodayOrFuture = (iso) => {
  if(!iso) return false;
  const d = new Date(iso);
  if(isNaN(d.getTime())) return false;
  const now = new Date();
  // compare by day
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return a >= b;
};

/** Count number of sales the seller recorded that match this neighborhood and happened on the same calendar day */
function countSalesForNeighborhood(sales, sellerEmail, neighborhood, dateISO){
  const dayStr = dateISO ? String(dateISO).slice(0,10) : null;
  let n = 0;
  for(const s of sales){
    if((s?.sellerEmail||'').toLowerCase() !== (sellerEmail||'').toLowerCase()) continue;
    if((s?.neighborhood||'').trim().toLowerCase() !== (neighborhood||'').trim().toLowerCase()) continue;
    if(dayStr){
      const soldDay = s?.soldAt ? String(s.soldAt).slice(0,10) :
                      s?.createdAt ? new Date(s.createdAt).toISOString().slice(0,10) : null;
      if(soldDay && soldDay === dayStr) n++;
    }else{
      n++;
    }
  }
  return n;
}

/* ===== tiny UI helpers (match WorkerHome compact cards vibe) ===== */
function Row({ label, value, mono=false }){
  return (
    <div style={{display:'flex', gap:6, fontSize:13, lineHeight:1.35}}>
      <div style={{minWidth:88, color:'var(--muted)', textTransform:'uppercase', letterSpacing:.3, fontSize:11}}>{label}</div>
      <div style={{flex:1, whiteSpace:'pre-wrap', wordBreak:'break-word', fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'inherit'}}>
        {value || '-'}
      </div>
    </div>
  );
}

function Chip({ children }){
  return (
    <span className="chip" style={{fontSize:11, padding:'2px 8px', borderRadius:999}}>
      {children}
    </span>
  );
}

export default function MyNeighborhoods(){
  const [finishModal, setFinishModal] = React.useState({ open:false, id:null, soldCount:'', soldNames:'' });

  function openFinishModal(id){
    setFinishModal({ open:true, id, soldCount:'', soldNames:'' });
  }
  function closeFinishModal(){
    setFinishModal({ open:false, id:null, soldCount:'', soldNames:'' });
  }
  function submitFinishModal(){
    const soldCountNum = parseInt(String(finishModal.soldCount||'').trim(), 10);
    const soldCount = Number.isFinite(soldCountNum) && soldCountNum >= 0 ? soldCountNum : 0;
    const soldNames = String(finishModal.soldNames||'').trim();

    const all = readNeighborhoods();
    const idx = all.findIndex(r => r.id === finishModal.id);
    if(idx !== -1){
      all[idx] = { ...all[idx], finishedAt: Date.now(), soldCount, soldNames };
      writeNeighborhoods(all);
    }
    closeFinishModal();
  }

  const me = getUser();
  const myEmail = me?.email || '';

  const [neigh, setNeigh] = React.useState(readNeighborhoods());
  const sales = React.useMemo(()=> readSales(), []);

  React.useEffect(()=>{
    // keep in sync if another tab updates localStorage
    const t = setInterval(()=> setNeigh(readNeighborhoods()), 1200);
    return ()=> clearInterval(t);
  },[]);

  /* ===== buckets ===== */
  // Offered = not accepted, not denied
  const offered = React.useMemo(()=>{
    const mine = (neigh||[]).filter(r => r.sellerEmail === myEmail);
    return mine
      .filter(r => !r.accepted && !(r.denied||[]).some(d=>d.email===myEmail))
      .sort((a,b)=> String(a.dateISO||'').localeCompare(String(b.dateISO||'')));
  }, [neigh, myEmail]);

  // Accepted (upcoming/today)
  const acceptedUpcoming = React.useMemo(()=>{
    const mine = (neigh||[]).filter(r => r.sellerEmail === myEmail && r.accepted && !r.finishedAt);
    return mine
      .filter(r => isTodayOrFuture(r.dateISO))
      .sort((a,b)=> String(a.dateISO||'').localeCompare(String(b.dateISO||'')));
  }, [neigh, myEmail]);

  // Past (accepted last 7 days)
  const pastAccepted = React.useMemo(()=>{
    const mine = (neigh||[]).filter(r => r.sellerEmail === myEmail && r.accepted);
    return mine
      .filter(r => r.finishedAt || (!isTodayOrFuture(r.dateISO) && withinDays(r.dateISO, 7)))
      .sort((a,b)=> String(b.dateISO||'').localeCompare(String(a.dateISO||'')));
  }, [neigh, myEmail]);

  /* ===== actions ===== */
  const acceptNeighborhood = (id)=>{
    const all = readNeighborhoods();
    const idx = all.findIndex(r=>r.id===id);
    if(idx===-1) return;
    const row = all[idx];
    all[idx] = { ...row, accepted:true, acceptedAt: Date.now() };
    writeNeighborhoods(all);
    setNeigh(all);

    // lock into seller calendar (so calendars show "Locked")
    const cal = readSellerCal();
    const already = cal.some(c =>
      c.source==='neighborhood' &&
      c.sellerEmail===row.sellerEmail &&
      c.dateISO===row.dateISO &&
      c.address===(row.neighborhood||'-')
    );
    if(!already){
      cal.push({
        id: Date.now(),
        sellerEmail: row.sellerEmail,
        dateISO: row.dateISO,
        time: row.time || row.day || '-',      // keep original label
        address: row.neighborhood || '-',
        notes: row.notes || '',
        source: 'neighborhood'
      });
      writeSellerCal(cal);
    }
    alert('Neighborhood accepted and locked.');
  };

  const denyNeighborhood = (id)=>{
    let reason = '';
    // eslint-disable-next-line no-constant-condition
    while (true){
      const input = prompt('Please enter a reason to deny (required):');
      if (input === null) return; // cancel
      if (String(input).trim()){
        reason = String(input).trim();
        break;
      }
      alert('A reason is required to deny this neighborhood.');
    }

    const all = readNeighborhoods();
    const idx = all.findIndex(r=>r.id===id);
    if(idx===-1) return;
    const prevDenied = Array.isArray(all[idx].denied) ? all[idx].denied : [];
    all[idx] = { ...all[idx], denied: [...prevDenied, { email: myEmail, ts:Date.now(), reason }] };
    writeNeighborhoods(all);
    setNeigh(all);
    alert('Neighborhood denied.');
  };

  /* ===== shared card list layout ===== */
  const listGridStyle = {
    display:'grid',
    gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))',
    gap:12,
    marginTop:8
  };

  const cardShellStyle = {
    border:'1px solid var(--border)',
    borderRadius:12,
    padding:'10px 12px'
  };

  return (
    <div className="grid">
      {/* ===== Offered Neighborhood (cards) ===== */}
      <div className="card">
        <h2 className="section-title" style={{marginTop:6, marginBottom:2}}>Offered Neighborhood</h2>
        <div className="muted" style={{fontSize:12, marginBottom:8}}>(once accepted schedule is locked)</div>

        {offered.length===0 ? (
          <div className="muted" style={{padding:'6px 2px'}}>No neighborhood offers right now.</div>
        ) : (
          <div style={listGridStyle}>
            {offered.map(r=>(
              <div key={r.id} style={cardShellStyle}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6}}>
                  <div style={{fontWeight:700}}>{r.neighborhood || '-'}</div>
                  <Chip>Offered</Chip>
                </div>
                <table className="table" style={{width:'100%', marginTop:4}}>
                  <tbody>
                    <tr><th style={{textAlign:'left', fontSize:11, color:'var(--muted)'}}>Date &amp; Time</th></tr>
                    <tr><td style={{fontSize:13}}>{fmtDateTime(r.dateISO, r.day)}</td></tr>
                    <tr><th style={{textAlign:'left', fontSize:11, color:'var(--muted)'}}>Notes</th></tr>
                    <tr><td style={{fontSize:13, whiteSpace:'pre-wrap', wordBreak:'break-word'}}>{r.notes || '-'}</td></tr>
                  </tbody>
                </table>
                <div className="row" style={{justifyContent:'flex-end', gap:8, marginTop:10}}>
                  <button className="btn outline" onClick={()=>denyNeighborhood(r.id)}>Deny</button>
                  <button className="btn" onClick={()=>acceptNeighborhood(r.id)}>Accept</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== Accepted Neighborhoods (upcoming/today) — cards ===== */}
      <div className="card" style={{marginTop:24}}>
        <h2 className="section-title" style={{marginTop:6, marginBottom:6}}>Accepted Neighborhoods</h2>
        {acceptedUpcoming.length===0 ? (
          <div className="muted" style={{padding:'6px 2px'}}>No accepted neighborhoods scheduled.</div>
        ) : (
          <div style={listGridStyle}>
            {acceptedUpcoming.map(r=>(
              <div key={r.id} style={cardShellStyle}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6, gap:8}}>
                  <div style={{fontWeight:700}}>{r.neighborhood || '-'}</div>
                  <div className="row" style={{gap:8}}>
                    <Chip>Locked</Chip>
                    <button
                      className="btn outline"
                      onClick={()=>openFinishModal(r.id)}
                      title="Mark this neighborhood finished"
                    >
                      Finished
                    </button>
                  </div>
                </div>
                <table className="table" style={{width:'100%', marginTop:4}}>
                  <tbody>
                    <tr><th style={{textAlign:'left', fontSize:11, color:'var(--muted)'}}>Date &amp; Time</th></tr>
                    <tr><td style={{fontSize:13}}>{fmtDateTime(r.dateISO, r.day)}</td></tr>
                    <tr><th style={{textAlign:'left', fontSize:11, color:'var(--muted)'}}>Notes</th></tr>
                    <tr><td style={{fontSize:13, whiteSpace:'pre-wrap', wordBreak:'break-word'}}>{r.notes || '-'}</td></tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== Past Neighborhoods (7 Days) — cards with # of sales ===== */}
      <div className="card" style={{marginTop:24}}>
        <h2 className="section-title" style={{marginTop:6, marginBottom:6}}>Past Neighborhoods (7 Days)</h2>
        {pastAccepted.length===0 ? (
          <div className="muted" style={{padding:'6px 2px'}}>No past neighborhoods in the last week.</div>
        ) : (
          <div style={listGridStyle}>
            {pastAccepted.map(r=>{
              const count = countSalesForNeighborhood(sales, myEmail, r.neighborhood, r.dateISO);
              return (
                <div key={r.id} style={cardShellStyle}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6}}>
                    <div style={{fontWeight:700}}>{r.neighborhood || '-'}</div>
                    <Chip>Past 7d</Chip>
                  </div>
                  <table className="table" style={{width:'100%', marginTop:4}}>
                    <tbody>
                      <tr><th style={{textAlign:'left', fontSize:11, color:'var(--muted)'}}>Date &amp; Time</th></tr>
                      <tr><td style={{fontSize:13}}>{fmtDateTime(r.dateISO, r.day)}</td></tr>
                      <tr><th style={{textAlign:'left', fontSize:11, color:'var(--muted)'}}># of Sales</th></tr>
                      <tr><td style={{fontSize:13}}>{String(typeof r.soldCount === 'number' ? r.soldCount : count)}</td></tr>
                      {r.soldNames ? (
                        <>
                          <tr><th style={{textAlign:'left', fontSize:11, color:'var(--muted)'}}>Customer Names</th></tr>
                          <tr><td style={{fontSize:13, whiteSpace:'pre-wrap'}}>{r.soldNames}</td></tr>
                        </>
                      ) : null}
                      <tr><th style={{textAlign:'left', fontSize:11, color:'var(--muted)'}}>Notes</th></tr>
                      <tr><td style={{fontSize:13, whiteSpace:'pre-wrap', wordBreak:'break-word'}}>{r.notes || '-'}</td></tr>
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {finishModal.open && (
        <div
          style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,0.45)',
            display:'grid', placeItems:'center', zIndex:1000
          }}
          role="dialog" aria-modal="true"
        >
          <div
            className="card"
            style={{ width:'min(560px, 94vw)', padding:16, background:'var(--card)', border:'1px solid var(--border)', borderRadius:12 }}
          >
            <div style={{fontWeight:800, fontSize:16, marginBottom:8}}>Finish Neighborhood</div>
            <table className="table" style={{width:'100%'}}>
              <tbody>
                <tr>
                  <th style={{textAlign:'left', width:'40%'}}>Customers sold</th>
                  <td>
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={finishModal.soldCount}
                      onChange={e=>setFinishModal(m=>({...m, soldCount:e.target.value}))}
                      placeholder="e.g., 3"
                    />
                  </td>
                </tr>
                <tr>
                  <th style={{textAlign:'left'}}>Names</th>
                  <td>
                    <textarea
                      rows={3}
                      value={finishModal.soldNames}
                      onChange={e=>setFinishModal(m=>({...m, soldNames:e.target.value}))}
                      placeholder="List customer names (comma or line separated)"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="row" style={{justifyContent:'flex-end', gap:8, marginTop:12}}>
              <button className="btn outline" type="button" onClick={closeFinishModal}>Cancel</button>
              <button className="btn" type="button" onClick={submitFinishModal}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}