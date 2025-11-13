// src/views/hybrid/HybridHome.jsx
import React from 'react'

/* ===== localStorage helpers ===== */
const read = (k, fb) => { try { return JSON.parse(localStorage.getItem(k) ?? JSON.stringify(fb)); } catch { return fb; } };
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const getUser            = () => { try { return JSON.parse(localStorage.getItem('pane_user')||'null'); } catch { return null; } };
const readUsers          = () => read('users_seed', []);
const readAvail          = () => read('availability', []);      
const readAssignments    = () => read('assignments', []);       
const readSales          = () => read('sales', []);             
const readSellerCalendar = () => read('seller_calendar', []);   
const readNeighborhoods  = () => read('neighborhoodAssignments', []); 

/* ===== date helpers ===== */
const startOfDay = d => { const x=new Date(d); x.setHours(0,0,0,0); return x; };
const addDays = (d,n)=> { const x=new Date(d); x.setDate(x.getDate()+n); return x; };
const toISODate = d => startOfDay(d).toISOString().slice(0,10);
const fmtColHeader = d => d.toLocaleDateString([], { weekday:'short', month:'short', day:'numeric' });
const shortDow = d => d.toLocaleDateString([], { weekday:'short' }).slice(0,3);

/* ===== tiny utils ===== */
const money = (n)=> (isFinite(+n) ? `$${(+n).toFixed(2)}` : '-');

/* ===== component ===== */
export default function HybridHome(){
  const me = getUser();
  const myEmail = me?.email || '';

  // fixed 7-day window
  const days7 = React.useMemo(()=>{
    const t = startOfDay(new Date());
    // show only next 5 days to give columns more width
    return Array.from({length:5}, (_,i)=> addDays(t,i));
  },[]);

  /* ----------- SELLER snapshot (This Week) ----------- */
  const sellerCal  = React.useMemo(()=> readSellerCalendar(), []);
  const sellerAvail= React.useMemo(()=> readAvail().filter(r=>r.role==='seller'), []);
  const sellerMapByISO = React.useMemo(()=>{
    const map = new Map(days7.map(d => [toISODate(d), { date:d, rows:[] }]));
    for(const sc of sellerCal){
      if(!sc?.sellerEmail || sc.sellerEmail.toLowerCase()!==myEmail.toLowerCase()) continue;
      if(!sc.dateISO || !map.has(sc.dateISO)) continue;
      map.get(sc.dateISO).rows.push({
        hours: sc.time || '-',
        name:  sc.neighborhood || sc.title || '',
        address: sc.address || '-',
        notes: sc.notes || '',
        locked: true
      });
    }
    for(const d of days7){
      const iso = toISODate(d);
      const dow = shortDow(d);
      const hit = sellerAvail.find(r=>r.userEmail===myEmail && r.day===dow);
      if(hit && (map.get(iso).rows||[]).length===0){
        map.get(iso).rows.push({
          hours: hit.hours || '-',
          name: '',
          address: '-',
          notes: '',
          locked: false
        });
      }
    }
    return map;
  }, [myEmail, sellerAvail, sellerCal, days7]);

  /* ----------- WORKER: upcoming & offered ----------- */
  const [assignments, setAssignments] = React.useState(readAssignments());
  const sales       = React.useMemo(()=> readSales(), []);
  const users       = React.useMemo(()=> readUsers(), []);
  React.useEffect(()=>{
    const t = setInterval(()=> setAssignments(readAssignments()), 1200);
    return ()=> clearInterval(t);
  },[]);
  const getNameByEmail = (email)=> users.find(u=>u.email===email)?.name || email || '-';

  const myUpcoming = React.useMemo(()=>{
    const mine = assignments.filter(a => (a.workerEmail===myEmail || a.worker2Email===myEmail) && a.status==='assigned');
    return mine.map(a=>{
      const sale = sales.find(s=> String(s.id)===String(a.saleId));
      const other = a.workerEmail===myEmail ? a.worker2Email : a.workerEmail;
      const price = sale?.price ? Number(sale.price) : null;
      const myShare = price!=null ? `$${(price*0.2).toFixed(2)}` : '-';
      return {
        id:a.id,
        when:a.when || '-',
        customer:sale?.name || a.saleId,
        address:sale?.address || '-',
        otherWorker: other ? getNameByEmail(other) : '-',
        myMoney: myShare
      }
    });
  }, [assignments, sales, myEmail, users]);

  const myOffered = React.useMemo(()=>{
    return assignments.filter(a=>{
      const meOnOffer = Array.isArray(a.offeredTo) && a.offeredTo.includes(myEmail);
      return a.status === 'offered' && meOnOffer;
    }).map(a=>{
      const sale = sales.find(s=>String(s.id)===String(a.saleId));
      const price = sale?.price ? Number(sale.price) : null;
      const myShare = price!=null ? `$${(price*0.2).toFixed(2)}` : '-';
      const other = a.workerEmail && a.workerEmail!==myEmail ? a.workerEmail
                  : (a.worker2Email && a.worker2Email!==myEmail ? a.worker2Email : null);
      return {
        id:a.id,
        raw:a,
        when:a.when || '-',
        customer:sale?.name || a.saleId,
        address:sale?.address || '-',
        otherWorker: other ? getNameByEmail(other) : '-',
        myMoney: myShare
      }
    });
  },[assignments, sales, myEmail, users]);

  /* ----------- Offered Neighborhoods ----------- */
  const neigh = React.useMemo(()=> readNeighborhoods(), []);
  const offeredNeigh = React.useMemo(()=>{
    const mine = (neigh||[]).filter(r => r.sellerEmail === myEmail);
    return mine.filter(r => !r.accepted && !(r.denied||[]).some(d=>d.email===myEmail))
               .sort((a,b)=> String(a.dateISO||'').localeCompare(String(b.dateISO||'')));
  }, [neigh, myEmail]);

  /* ===== RENDER ===== */
  return (
    <div className="grid">

      {/* 1) Combined week-at-a-glance (Both) */}
      <div className="card">
        <h2 className="section-title">This Week (Both)</h2>
        <div style={{display:'grid', gap:8, gridTemplateColumns: 'repeat(' + days7.length + ',1fr)', fontSize: 12}}>
          {days7.map(d=>{
            const iso = toISODate(d);
            const sellerRows = (sellerMapByISO.get(iso)?.rows)||[];
            const workerRows = myUpcoming.filter(r => (r.when||'').toLowerCase().includes(shortDow(d).toLowerCase()));
            return (
              <div key={iso} className="card" style={{padding:'6px 8px'}}>
                <div style={{fontWeight:800, marginBottom:4, fontSize:12}}>{fmtColHeader(d)}</div>
                {sellerRows.length===0 ? (
                  <div className="muted" style={{fontSize:11}}>Seller: —</div>
                ) : sellerRows.map((r,i)=>(
                  <div key={i} style={{fontSize:11, marginBottom:3}}>
                    <div><strong>Seller:</strong> {r.hours || '-'} {r.name ? `(${r.name})` : ''}</div>
                    {r.locked && (
                      <div style={{color:'var(--muted)'}}>• Locked — {r.address}{r.notes?` • ${r.notes}`:''}</div>
                    )}
                  </div>
                ))}
                {workerRows.length===0 ? (
                  <div className="muted" style={{fontSize:11}}>Worker: —</div>
                ) : workerRows.map((r,i)=>(
                  <div key={'w'+i} style={{fontSize:11}}>
                    <div><strong>Worker:</strong> {r.when} ({r.customer}{r.address?` — ${r.address}`:''})</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2) Offered Neighborhoods (Seller) */}
      <div className="card" style={{marginTop:24}}>
        <h2 className="section-title">Offered Neighborhoods (Seller)</h2>
        <table className="table" style={{ tableLayout:'fixed', width:'100%' }}>
          <thead>
            <tr>
              <th style={{width:'33%'}}>Date &amp; Time</th>
              <th style={{width:'33%'}}>Street(s)</th>
              <th style={{width:'33%'}}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {offeredNeigh.length===0 && (
              <tr><td colSpan={3} style={{color:'var(--muted)'}}>No neighborhood offers right now.</td></tr>
            )}
            {offeredNeigh.map(r=>(
              <tr key={r.id}>
                <td>{r.dateISO ? new Date(r.dateISO).toLocaleString() : '-'}</td>
                <td>{r.neighborhood || r.address || '-'}</td>
                <td>{r.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 3) Offered Assignments (Worker) */}
      <div className="card" style={{marginTop:24}}>
        <h2 className="section-title">Offered Assignments (Worker)</h2>
        <table className="table" style={{ tableLayout:'fixed', width:'100%' }}>
          <thead>
            <tr>
              <th style={{width:'33%'}}>Date &amp; Time</th>
              <th style={{width:'33%'}}>Customer / Address</th>
              <th style={{width:'33%'}}>Other Worker</th>
            </tr>
          </thead>
          <tbody>
            {myOffered.length===0 && (
              <tr><td colSpan={3} style={{color:'var(--muted)'}}>No offers.</td></tr>
            )}
            {myOffered.map(o=>(
              <tr key={o.id}>
                <td>{o.when}</td>
                <td>
                  <div style={{fontWeight:600}}>{o.customer}</div>
                  <div style={{fontSize:12,color:'var(--muted)'}}>{o.address}</div>
                </td>
                <td>{o.otherWorker}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}