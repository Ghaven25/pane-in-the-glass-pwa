// src/views/WorkerHome.jsx
import React, { useMemo, useState } from "react";

function getUser(){ try{ return JSON.parse(localStorage.getItem("pane_user")||"null") }catch{ return null } }
function readAvail(){ try{ return JSON.parse(localStorage.getItem("availability")||"[]") }catch{ return [] } }
function readAssignments(){ try{ return JSON.parse(localStorage.getItem("assignments")||"[]") }catch{ return [] } }
function writeAssignments(rows){ localStorage.setItem("assignments", JSON.stringify(rows)) }
function readSales(){ try{ return JSON.parse(localStorage.getItem("sales")||"[]") }catch{ return [] } }
function readUsers(){ try{ return JSON.parse(localStorage.getItem("users_seed")||"[]") }catch{ return [] } }

function startOfDay(d){ const x=new Date(d); x.setHours(0,0,0,0); return x }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x }
function fmtDay(d){ return d.toLocaleDateString([], { weekday:"short", month:"short", day:"numeric" }) }
function shortDow(d){ return d.toLocaleDateString([], { weekday:"short" }) }

/* ===== small presentational helpers ===== */
const money = (n)=> (isFinite(+n) ? `$${(+n).toFixed(2)}` : '-');

function Chip({ children, kind="muted" }){
  const bg = kind==="ok" ? "var(--ok, #16a34a20)" :
             kind==="warn" ? "var(--warn, #f59e0b20)" :
             kind==="info" ? "var(--info, #3b82f620)" : "var(--border)";
  const color = kind==="ok" ? "#16a34a" :
                kind==="warn" ? "#b45309" :
                kind==="info" ? "#1d4ed8" : "var(--muted)";
  return (
    <span style={{
      display:'inline-block', padding:'2px 8px', borderRadius:999,
      background:bg, color, fontSize:12, fontWeight:600
    }}>{children}</span>
  );
}

function Row({ customer, when, moneyText, address, otherWorker, notes, right }) {
  return (
    <div
      style={{
        display:'grid', gridTemplateColumns:'1fr auto', gap:10,
        padding:'10px 12px', border:'1px solid var(--border)', borderRadius:12, background:'var(--card)'
      }}
    >
      <div>
        <div style={{display:'grid', gridTemplateColumns:'1fr auto', alignItems:'center'}}>
          <div style={{fontWeight:800, fontSize:15, overflow:'hidden', textOverflow:'ellipsis'}}>{customer || '-'}</div>
          {moneyText ? <div style={{fontWeight:800}}>{moneyText}</div> : null}
        </div>
        <div style={{marginTop:6, fontSize:12, color:'var(--muted)'}}>
          {when ? <span>• {when}</span> : null}
          {address ? <span style={{marginLeft:10}}>• {address}</span> : null}
          {otherWorker ? <span style={{marginLeft:10}}>• with {otherWorker}</span> : null}
          {notes ? <span style={{marginLeft:10}}>• note: {notes}</span> : null}
        </div>
      </div>
      <div style={{display:'flex', gap:8, alignItems:'center', justifyContent:'flex-end'}}>
        {right}
      </div>
    </div>
  );
}

export default function WorkerHome(){
  const me = getUser();
  const users = readUsers();

  const [avail] = useState(readAvail());
  const [assignments, setAssignments] = useState(readAssignments());
  const sales = readSales();

  const days = useMemo(()=>{
    const t = startOfDay(new Date());
    return Array.from({length:7}, (_,i)=> addDays(t,i));
  },[]);

  const getHours = (dayLabel)=>{
    const row = avail.find(a=>a.userEmail===me?.email && a.role==="worker" && a.day===dayLabel);
    return row?.hours || "";
  };

  const getNameByEmail = (email)=> users.find(u=>u.email===email)?.name || email || '-';

  // UPCOMING ASSIGNMENTS
  const upcoming = useMemo(()=>{
    const mine = assignments.filter(a => (a.workerEmail===me?.email || a.worker2Email===me?.email) && a.status !== 'offered');
    return mine.map(a=>{
      const sale = sales.find(s=>String(s.id)===String(a.saleId));
      const other = a.workerEmail===me?.email ? a.worker2Email : a.workerEmail;
      const price = sale?.price ? Number(sale.price) : null;
      const myShare = price!=null ? money(price*0.2) : '-';
      return {
        id:a.id,
        customer: sale?.name || a.saleId,
        address: sale?.address || '-',
        when: a.when || '-',
        otherWorker: other ? getNameByEmail(other) : '-',
        myMoney: myShare,
        notes: sale?.notes || ''
      }
    });
  }, [assignments, sales, me?.email]);

  // OFFERED ASSIGNMENTS
  const offered = useMemo(()=>{
    return assignments.filter(a=>{
      const meOnOffer = Array.isArray(a.offeredTo) && a.offeredTo.includes(me?.email);
      return a.status === 'offered' && meOnOffer;
    }).map(a=>{
      const sale = sales.find(s=>String(s.id)===String(a.saleId));
      const price = sale?.price ? Number(sale.price) : null;
      const myShare = price!=null ? money(price*0.2) : '-';
      const other = a.workerEmail && a.workerEmail!==me?.email ? a.workerEmail
                  : (a.worker2Email && a.worker2Email!==me?.email ? a.worker2Email : null);
      return {
        id:a.id,
        customer:sale?.name || a.saleId,
        address:sale?.address || '-',
        when:a.when || '-',
        otherWorker: other ? getNameByEmail(other) : '-',
        myMoney: myShare,
        notes: sale?.notes || ''
      }
    });
  },[assignments, sales, me?.email]);

  const acceptOffer = (id)=>{
    const all = JSON.parse(localStorage.getItem("assignments")||"[]");
    const idx = all.findIndex(a=>a.id===id);
    if(idx===-1) return;
    const a = all[idx];
    let workerEmail = a.workerEmail;
    let worker2Email = a.worker2Email;
    if(!workerEmail && !worker2Email){ workerEmail = me.email; }
    else if(workerEmail && !worker2Email){ worker2Email = me.email; }
    else if(!workerEmail && worker2Email){ workerEmail = me.email; }
    const updated = { ...a, workerEmail, worker2Email, status:'assigned', offeredTo:(a.offeredTo||[]).filter(e=>e!==me.email) };
    all[idx]=updated; localStorage.setItem("assignments", JSON.stringify(all)); setAssignments(all);
    alert('Offer accepted.');
  };

  const [denyId, setDenyId] = useState(null);
  const [denyNotes, setDenyNotes] = useState('');
  const openDeny = (id)=>{ setDenyId(id); setDenyNotes(''); }
  const cancelDeny = ()=>{ setDenyId(null); setDenyNotes(''); }
  const submitDeny = ()=>{
    if(!denyNotes.trim()){ alert('Please enter a reason.'); return; }
    const all = JSON.parse(localStorage.getItem("assignments")||"[]");
    const idx = all.findIndex(a=>a.id===denyId);
    if(idx===-1) return;
    const a = all[idx];
    const updated = { ...a, denied:[...(a.denied||[]),{email:me.email,reason:denyNotes.trim(),ts:Date.now()}], offeredTo:(a.offeredTo||[]).filter(e=>e!==me.email) };
    all[idx]=updated; localStorage.setItem("assignments", JSON.stringify(all)); setAssignments(all);
    setDenyId(null); setDenyNotes('');
    alert('Offer denied.');
  };

  // WEEKLY HOURS (read-only)
  const byWeekday = useMemo(()=>{
    const mine = assignments.filter(a=>(a.status!=='offered')&&(a.workerEmail===me?.email||a.worker2Email===me?.email));
    const map={}; const keys=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    for(const a of mine){
      const sale=sales.find(s=>String(s.id)===String(a.saleId));
      const label=a.when||''; const key=keys.find(k=>label.toLowerCase().includes(k.toLowerCase()));
      if(!key) continue;
      (map[key] ||= []).push({customer:sale?.name||a.saleId, when:a.when||'-'});
    }
    return map;
  }, [assignments, sales, me?.email]);

  return (
    <div className="grid">
      {/* Upcoming */}
      <div className="card">
        <h2 className="section-title">My Upcoming Assignments</h2>
        <div style={{display:'grid', gap:10}}>
          {upcoming.length===0 && (<div className="muted" style={{padding:'8px 0'}}>No upcoming assignments.</div>)}
          {upcoming.map(r=>(
            <Row
              key={r.id}
              customer={r.customer}
              when={r.when}
              moneyText={r.myMoney}
              address={r.address}
              otherWorker={r.otherWorker}
              notes={r.notes}
              right={<Chip kind="info">Assigned</Chip>}
            />
          ))}
        </div>
      </div>

      {/* Offered */}
      <div className="card">
        <h2 className="section-title">Offered Assignments</h2>
        <div style={{display:'grid', gap:10}}>
          {offered.length===0 && (<div className="muted" style={{padding:'8px 0'}}>No offers.</div>)}
          {offered.map(o=>(
            <Row
              key={o.id}
              customer={o.customer}
              when={o.when}
              moneyText={o.myMoney}
              address={o.address}
              otherWorker={o.otherWorker}
              notes={o.notes}
              right={
                <>
                  <button className="btn" onClick={()=>acceptOffer(o.id)}>Accept</button>
                  <button className="btn outline" onClick={()=>openDeny(o.id)}>Deny</button>
                </>
              }
            />
          ))}
        </div>

        {denyId!=null && (
          <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50}}>
            <div className="card" style={{width:420, maxWidth:'90vw'}}>
              <h3 className="section-title" style={{marginTop:0}}>Why are you denying?</h3>
              <textarea rows={4} value={denyNotes} onChange={e=>setDenyNotes(e.target.value)} placeholder="Type the reason..." />
              <div className="row" style={{justifyContent:'flex-end', marginTop:10}}>
                <button className="btn outline" onClick={cancelDeny}>Cancel</button>
                <button className="btn" onClick={submitDeny}>Submit</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Weekly Hours */}
      <div className="card">
        <h2 className="section-title">My Weekly Hours (Next 7 Days) — Scheduled</h2>
        <table className="table">
          <thead><tr>{days.map(d=><th key={d.toISOString()}>{fmtDay(d)}</th>)}</tr></thead>
          <tbody>
            <tr>
              {days.map(d=>{
                const short=shortDow(d).slice(0,3);
                const value=getHours(short);
                const items=byWeekday[short]||[];
                return(
                  <td key={d.toISOString()}>
                    <input value={value} readOnly disabled style={{width:'100%',opacity:.8,cursor:'not-allowed'}}/>
                    {items.length>0 && <div style={{marginTop:6,fontSize:12,color:'#8fb7c9'}}>{items.map((o,i)=><div key={i}>• {o.customer} — {o.when}</div>)}</div>}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}