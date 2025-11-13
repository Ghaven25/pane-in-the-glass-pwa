// src/views/FinishedJob.jsx
import React, { useState } from 'react'

function getUser(){ try{return JSON.parse(localStorage.getItem('pane_user')||'null')}catch{return null} }
function readJobs(){ try{return JSON.parse(localStorage.getItem('finished_jobs')||'[]')}catch{return []} }
function writeJobs(r){ localStorage.setItem('finished_jobs',JSON.stringify(r)) }

export default function FinishedJob(){
  const me = getUser();

  const [rows,setRows]=useState(readJobs());
  const [form,setForm]=useState({
    name:'',
    address:'',
    notes:'',
    otherWorker:''
  });

  const addJob=()=>{
    if(!form.name.trim() || !form.address.trim() || !form.otherWorker.trim()){
      alert('Customer Name, Address, and Other Worker are required.');
      return;
    }
    const all = readJobs();
    all.push({
      ...form,
      addedBy: me?.email,
      ts: Date.now()
      // moneyEarned intentionally omitted (no happiness)
    });
    writeJobs(all);
    setRows(all);
    setForm({name:'',address:'',notes:'',otherWorker:''});
    alert('Job marked finished!');
  };

  return(
    <div className="grid">
      <div className="card">
        <h2 className="section-title" style={{marginTop:6, marginBottom:6}}>Job Finished</h2>

        <div className="grid" style={{gridTemplateColumns:'repeat(2,1fr)',gap:10,marginTop:0,paddingTop:0}}>
          <input placeholder="Customer Name*" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
          <input placeholder="Address*" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/>
          <input
            placeholder="Other Worker*"
            value={form.otherWorker}
            onChange={e=>setForm({...form,otherWorker:e.target.value})}
            required
          />
          <textarea
            placeholder="Notes (optional)"
            style={{gridColumn:'1 / span 2'}}
            value={form.notes}
            onChange={e=>setForm({...form,notes:e.target.value})}
          />
        </div>

        <div className="toolbar" style={{marginTop:10}}>
          <button className="btn" onClick={addJob}>Submit Finished Job</button>
        </div>
      </div>

      <div className="card" style={{marginTop:24}}>
        <h2 className="section-title" style={{marginTop:6, marginBottom:6}}>Past Jobs (7 Days)</h2>
        {rows.filter(r => Date.now()-r.ts <= 7*24*60*60*1000).length === 0 ? (
          <p style={{color:'var(--muted)'}}>No finished jobs yet.</p>
        ) : (
          rows
            .filter(r => Date.now()-r.ts <= 7*24*60*60*1000)
            .sort((a,b) => b.ts - a.ts)
            .map((r,i) => (
              <table key={i} className="table" style={{marginBottom:12}}>
                <tbody>
                  <tr><th style={{textAlign:'left'}}>Date &amp; Time</th></tr>
                  <tr><td>{new Date(r.ts).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td></tr>

                  <tr><th style={{textAlign:'left'}}>Customer</th></tr>
                  <tr><td>{r.name || '-'}</td></tr>

                  <tr><th style={{textAlign:'left'}}>Address</th></tr>
                  <tr><td>{r.address || '-'}</td></tr>

                  <tr><th style={{textAlign:'left'}}>Other Worker</th></tr>
                  <tr><td>{r.otherWorker || '-'}</td></tr>

                  <tr><th style={{textAlign:'left'}}>Notes</th></tr>
                  <tr><td>{r.notes || '-'}</td></tr>
                </tbody>
              </table>
            ))
        )}
      </div>
    </div>
  );
}