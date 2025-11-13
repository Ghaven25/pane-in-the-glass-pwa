// src/views/WorkerPayments.jsx
import React from 'react'

const read = (k, fb) => { try { return JSON.parse(localStorage.getItem(k) ?? JSON.stringify(fb)); } catch { return fb; } };
const getUser = () => { try { return JSON.parse(localStorage.getItem('pane_user')||'null'); } catch { return null; } };
const readAssignments = () => read('assignments', []);
const readSales = () => read('sales', []);
const money = (n)=> (isFinite(+n) ? `$${(+n).toFixed(2)}` : '-');

const nextFridayLabel = () => {
  const now = new Date();
  const day = now.getDay();
  const daysUntilFri = (5 - day + 7) % 7 || 7;
  const d = new Date(now);
  d.setDate(now.getDate() + daysUntilFri);
  return d.toLocaleDateString([], { weekday:'short', month:'short', day:'numeric' });
};

const parseDurationHours = (when) => {
  if(!when) return 0;
  const s = String(when).toLowerCase();
  let m = s.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*[-–]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
  if(!m) m = s.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if(!m) m = s.match(/(?:mon|tue|wed|thu|fri|sat|sun)?\s*(\d{1,2})\s*-\s*(\d{1,2})/i);
  if(!m) return 0;
  const toMinutes = (tok, fallbackPm=null)=>{
    let str = tok.replace(/\s*(am|pm)/g,'').trim();
    let [hh,mm='0']=str.split(':');
    let h=parseInt(hh,10), m2=parseInt(mm,10)||0;
    const isPm=/pm/.test(tok);
    const isAm=/am/.test(tok);
    if(isPm && h<12)h+=12;
    if(!isPm && !isAm && fallbackPm)h+=12;
    return h*60+m2;
  };
  const startStr=m[1], endStr=m[2];
  let start=toMinutes(startStr), end=toMinutes(endStr);
  if(end<=start)end=toMinutes(endStr,true);
  return Math.max(0,(end-start)/60);
};

const sumWorkerHours = (assignments, email) => {
  let total=0;
  for(const a of assignments){
    if((a.workerEmail===email||a.worker2Email===email)&&a.status!=='offered'){
      total+=parseDurationHours(a.when);
    }
  }
  return total;
};

export default function WorkerPayments(){
  const me = getUser();
  const myEmail = me?.email || '';
  const assignments = React.useMemo(()=> readAssignments(), []);
  const sales = React.useMemo(()=> readSales(), []);
  const nextPayday = nextFridayLabel();
  const totalHours = React.useMemo(()=> sumWorkerHours(assignments,myEmail),[assignments,myEmail]);

  const myRows = React.useMemo(()=>{
    const mapBySaleId=new Map(sales.map(s=>[String(s.id),s]));
    return assignments.filter(a=>(a.workerEmail===myEmail||a.worker2Email===myEmail)&&a.status!=='offered')
      .map(a=>{
        const s=mapBySaleId.get(String(a.saleId));
        const price=isFinite(+s?.price)?+s.price:null;
        const yourShare=price!=null?price*0.20:null;
        return{
          id:a.id,
          date:a.when||'-',
          customer:s?.name||a.saleId,
          address:s?.address||'-',
          yourShare,
          notes:s?.notes||'-'
        };
      });
  },[assignments,sales,myEmail]);

  const subtotal=myRows.reduce((sum,r)=>sum+(r.yourShare??0),0);

  return (
    <div className="grid">
      {/* PAYCHECK CARD */}
      <div className="card">
        <h2 className="section-title" style={{marginTop:6, marginBottom:6}}>Paycheck</h2>
        <div
          className="grid"
          style={{
            gridTemplateColumns:'repeat(3,1fr)',
            gap:8,
            marginTop:0,
            paddingTop:0
          }}
        >
          <div className="card" style={{padding:'12px 14px'}}>
            <div className="muted" style={{fontSize:12, textTransform:'uppercase', letterSpacing:.3}}>Total Paycheck</div>
            <div style={{fontSize:24, fontWeight:900, marginTop:6}}>{money(subtotal)}</div>
            <div style={{fontSize:12, color:'var(--muted)'}}>= 20% (Worker)</div>
          </div>
          <div className="card" style={{padding:'12px 14px'}}>
            <div className="muted" style={{fontSize:12, textTransform:'uppercase', letterSpacing:.3}}>Next Payday</div>
            <div style={{fontSize:20, fontWeight:800, marginTop:6}}>{nextPayday}</div>
          </div>
          <div className="card" style={{padding:'12px 14px'}}>
            <div className="muted" style={{fontSize:12, textTransform:'uppercase', letterSpacing:.3}}>Hours Worked</div>
            <div style={{fontSize:20, fontWeight:800, marginTop:6}}>
              {isFinite(totalHours)?`${totalHours.toFixed(1)} hrs`:'-'}
            </div>
            <div className="muted" style={{fontSize:12}}>Based on job times</div>
          </div>
        </div>
      </div>

      {/* NEXT PAYMENTS TABLE */}
      <div className="card" style={{marginTop:24}}>
        <h2 className="section-title" style={{marginTop:6, marginBottom:6}}>Next Payments</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Date &amp; Time</th>
              <th>Customer</th>
              <th>Address</th>
              <th>Your Share (20%)</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {myRows.length===0 && (
              <tr><td colSpan={5} style={{color:'var(--muted)'}}>No worker payments yet.</td></tr>
            )}
            {myRows.map(r=>(
              <tr key={r.id}>
                <td>{r.date}</td>
                <td>{r.customer}</td>
                <td>{r.address}</td>
                <td>{r.yourShare==null?'-':money(r.yourShare)}</td>
                <td style={{maxWidth:280, whiteSpace:'pre-wrap'}}>{r.notes}</td>
              </tr>
            ))}
            {myRows.length>0 && (
              <tr>
                <td colSpan={3}/>
                <td><strong>{money(subtotal)}</strong></td>
                <td><span className="chip">Subtotal (Worker)</span></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}