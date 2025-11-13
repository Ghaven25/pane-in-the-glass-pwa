// src/views/SellerPayments.jsx
import React from 'react'

const read = (k, fb) => { try { return JSON.parse(localStorage.getItem(k) ?? JSON.stringify(fb)); } catch { return fb; } };

const getUser          = () => { try { return JSON.parse(localStorage.getItem('pane_user')||'null'); } catch { return null; } };
const readSales        = () => read('sales', []);
const readAssignments  = () => read('assignments', []);
const readSellerCal    = () => read('seller_calendar', []);

const money = (n)=> (isFinite(+n) ? `$${(+n).toFixed(2)}` : '-');

function nextFridayLabel(){
  const now = new Date();
  const day = now.getDay();
  const daysUntilFri = (5 - day + 7) % 7 || 7;
  const d = new Date(now);
  d.setDate(now.getDate() + daysUntilFri);
  return d.toLocaleDateString([], { weekday:'short', month:'short', day:'numeric' });
}

function parseDurationHours(when){
  if(!when) return 0;
  const s = String(when).toLowerCase();
  let m = s.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*[-–]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i)
        || s.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/)
        || s.match(/(\d{1,2})\s*-\s*(\d{1,2})/i);
  if(!m) return 0;

  const toMinutes = (tok)=>{
    let str = tok.trim(), pm=/pm/.test(str), am=/am/.test(str);
    str=str.replace(/\s*(am|pm)/g,'');
    let [h,mn='0']=str.split(':'), hh=parseInt(h), mm=parseInt(mn)||0;
    if(pm && hh<12) hh+=12;
    if(am && hh===12) hh=0;
    return hh*60+mm;
  };
  const start=toMinutes(m[1]), end=toMinutes(m[2]);
  return Math.max(0,(end-start)/60);
}

function sumSellerHoursFromCalendar(sellerCal, userEmail){
  let total = 0;
  for(const r of sellerCal){
    if(!r?.sellerEmail || r.sellerEmail.toLowerCase() !== (userEmail||'').toLowerCase()) continue;
    total += parseDurationHours(r.time||'');
  }
  return total;
}

export default function SellerPayments(){
  const me = getUser();
  const isHybrid = me?.role === 'hybrid';
  const isSellerOnly = me?.role === 'seller';
  const myEmail = me?.email || '';

  const sales = React.useMemo(()=> readSales(), []);
  const sellerCal = React.useMemo(()=> readSellerCal(), []);

  const mySales = React.useMemo(()=>{
    if(!myEmail) return [];
    return sales
      .filter(s => (s?.sellerEmail||'').toLowerCase() === myEmail.toLowerCase())
      .map(s => ({
        id: s.id,
        date: s.soldAt || (s.createdAt ? new Date(s.createdAt).toLocaleString() : '-'),
        customer: s.name || '-',
        address: s.address || '-',
        price: isFinite(+s.price) ? +s.price : null,
        yourShare: isFinite(+s.price) ? (+s.price * 0.30) : null,
        notes: s.notes || '-',
        status: s.status || 'unassigned',
      }))
      .sort((a,b)=> (b.date||'').localeCompare(a.date||''));
  }, [sales, myEmail]);

  const sellerSubtotal = mySales.reduce((sum, r) => sum + (r.yourShare ?? 0), 0);
  const nextPayday = nextFridayLabel();
  const sellerTotalHours = React.useMemo(()=> sumSellerHoursFromCalendar(sellerCal, myEmail), [sellerCal, myEmail]);

  return (
    <div className="grid">
      {/* Seller Paycheck */}
      {isSellerOnly && (
        <div className="card" style={{ paddingTop: 0 }}>
          <h2 className="section-title" style={{ margin: '18px 0 0 0', lineHeight: 0 }}>Paycheck</h2>
          <div
            className="grid"
            style={{
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
              marginTop: -54
            }}
          >
            <div className="card" style={{padding:'12px 14px'}}>
              <div className="muted" style={{fontSize:12,textTransform:'uppercase',letterSpacing:.3}}>Total Paycheck</div>
              <div style={{fontSize:24,fontWeight:900,marginTop:6}}>{money(sellerSubtotal)}</div>
              <div style={{fontSize:12,color:'var(--muted)'}}>Seller earnings @ 30%</div>
            </div>
            <div className="card" style={{padding:'12px 14px'}}>
              <div className="muted" style={{fontSize:12,textTransform:'uppercase',letterSpacing:.3}}>Next Payday</div>
              <div style={{fontSize:20,fontWeight:800,marginTop:6}}>{nextPayday}</div>
            </div>
            <div className="card" style={{padding:'12px 14px'}}>
              <div className="muted" style={{fontSize:12,textTransform:'uppercase',letterSpacing:.3}}>Hours (Seller)</div>
              <div style={{fontSize:20,fontWeight:800,marginTop:6}}>
                {isFinite(sellerTotalHours) ? `${sellerTotalHours.toFixed(1)} hrs` : '-'}
              </div>
              <div className="muted" style={{fontSize:12}}>From accepted neighborhood times</div>
            </div>
          </div>
        </div>
      )}

      {/* Payments (Seller) */}
      <div className="card" style={{marginTop:12}}>
        <h2 className="section-title" style={{ marginBottom: 2 }}>Payments (Seller)</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Date Sold</th>
              <th>Customer</th>
              <th>Address</th>
              <th style={{textAlign:'right'}}>Sale Price</th>
              <th style={{textAlign:'right'}}>Your 30%</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {mySales.length===0 && (
              <tr><td colSpan={7} style={{color:'var(--muted)'}}>No seller payments right now.</td></tr>
            )}
            {mySales.map(r=>(
              <tr key={r.id}>
                <td>{r.date}</td>
                <td style={{fontWeight:600}}>{r.customer}</td>
                <td style={{fontSize:12, color:'var(--muted)'}}>{r.address}</td>
                <td style={{textAlign:'right'}}>{r.price==null?'-':money(r.price)}</td>
                <td style={{textAlign:'right'}}>{r.yourShare==null?'-':money(r.yourShare)}</td>
                <td>{r.status}</td>
                <td style={{whiteSpace:'pre-wrap'}}>{r.notes}</td>
              </tr>
            ))}
            {mySales.length>0 && (
              <tr>
                <td colSpan={4} />
                <td style={{textAlign:'right'}}><strong>{money(sellerSubtotal)}</strong></td>
                <td colSpan={2}><span className="chip">Subtotal (Seller)</span></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}