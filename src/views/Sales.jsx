// src/views/Sales.jsx
import React, { useEffect, useMemo, useState } from 'react'

function getUser(){ try{ return JSON.parse(localStorage.getItem('pane_user')||'null') }catch{ return null } }
function read(key, fallback){ try{ return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback)) }catch{ return fallback } }
function write(key, val){ localStorage.setItem('item_'+key, JSON.stringify(val)); localStorage.setItem(key, JSON.stringify(val)) } // keep legacy

function readSales(){ return read('sales', []) }
function writeSales(rows){ write('sales', rows) }

function readAssignments(){ return read('assignments', []) }
function readUsers(){ return read('users_seed', []) }

function toLocalDateTime() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default function Sales(){
  const user = getUser()
  const [sales, setSales] = useState(readSales())
  const [assignments, setAssignments] = useState(readAssignments())
  const users = readUsers()

  const [form, setForm] = useState({
    name: '', phone: '', price: '', address: '',
    neighborhood: '', notes: '',
    soldAt: toLocalDateTime(), // prefill with now in local time
  })

  useEffect(()=>{
    setSales(readSales())
    setAssignments(readAssignments())
  },[])

  /* ---------- helpers ---------- */
  const findWorkersForSale = (saleId)=>{
    const a = assignments.find(x => String(x.saleId) === String(saleId))
    if(!a) return []
    const emails = [a.workerEmail, a.worker2Email].filter(Boolean)
    return emails.map(e => (users.find(u=>u.email===e)?.name || e))
  }

  const sortKey = (s) => {
    const byId = Number(String(s.id || '').match(/\d+/)?.[0] || 0);
    return Number(s.createdAt || s.updatedAt || byId || 0);
  };
  const recentSales = useMemo(() => {
    return sales.slice().sort((a,b) => sortKey(b) - sortKey(a)).slice(0, 50);
  }, [sales]);

  /* ---------- add sale ---------- */
  const addSaleCore = ()=>{
    const all = readSales()
    const id = Date.now()
    const row = {
      id,
      name: form.name.trim(),
      phone: form.phone.trim(),
      price: form.price,                  // optional
      address: form.address,              // optional
      neighborhood: form.neighborhood,
      notes: form.notes,
      sellerEmail: user.email,
      sellerName: user.name,
      status: 'unassigned',
      createdAt: Date.now(),              // timestamp
      soldAt: form.soldAt                // “Date & Time Sold”
    }
    all.push(row)
    writeSales(all)
    setSales(all)
    setForm({
      name:'', phone:'', price:'', address:'',
      neighborhood:'', notes:'', soldAt: toLocalDateTime()
    })
    alert('Sale added!')
  }

  const addSale = ()=>{
    if(!form.name.trim() || !form.phone.trim() || !form.soldAt.trim()){
      alert('Customer name, phone number, and Date & Time Sold are required.')
      return
    }
    addSaleCore()
  }

  /* ---------- UI: my recent sales ---------- */
  const mySales = useMemo(() => {
    if (!user) return [];
    return recentSales.filter(s =>
      (s.sellerEmail === user.email || s.createdBy === user.email) &&
      s.status !== "finished"
    );
  }, [recentSales, user])

  const payForYou = (price)=> {
    const n = Number(price)
    if(!isFinite(n)) return '-'
    return `$${(n*0.30).toFixed(2)} (Total $${n.toFixed(2)})`
  }

  return (
    <div className="grid">
      {/* Record a New Sale — tightened spacing by moving the red note inside the H2 */}
      <div className="card">
        <h2
          className="section-title"
          style={{
            marginTop: 4,
            marginBottom: 4,       // keep tiny spacing below the title line
            display: 'flex',
            alignItems: 'baseline',
            gap: 10,
            flexWrap: 'wrap'
          }}
        >
          <span>Record a New Sale</span>
          <span style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: .3,
            textTransform: 'uppercase',
            color: 'var(--danger)'
          }}>
            MUST BE CONFIRMED SALE — IF NOT, ADD IN NOTES
          </span>
        </h2>

        {/* first inputs now sit immediately under the title row */}
        <div
          className="grid"
          style={{
            gridTemplateColumns:'repeat(2,1fr)',
            gap:10,
            marginTop: 0,          // kill any top gap above first input
            paddingTop: 0
          }}
        >
          <input placeholder="Customer Name*" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
          <input placeholder="Phone*" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/>

          <input placeholder="Price ($)" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/>
          <input placeholder="Address" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/>

          <input placeholder="Neighborhood" value={form.neighborhood} onChange={e=>setForm({...form,neighborhood:e.target.value})}/>
          <input
            type="datetime-local"
            placeholder="Date &amp; Time Sold*"
            value={form.soldAt}
            onChange={e=>setForm({...form, soldAt: e.target.value})}
          />

          <textarea placeholder="Notes (optional)" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} style={{gridColumn:'1 / span 2'}}/>
        </div>
        <div className="toolbar" style={{marginTop:10}}>
          <button className="btn" onClick={addSale}>Add Sale</button>
        </div>
        <p className="muted" style={{marginTop:6, fontSize:12}}>
          A timestamp is saved automatically when you add a sale.
        </p>
      </div>

      {/* Recent Sales */}
      <div className="card" style={{minHeight: "140px", padding: "10px"}}>
        <h2 className="section-title" style={{marginTop: 6, marginBottom: 6, textAlign: "center"}}>Recent Sales</h2>

        {Array.isArray(mySales) && mySales.length > 0 ? (
          <div className="grid" style={{gap:10, marginTop:"-65px"}}>
            {[...mySales].sort((a,b)=> (b.createdAt||0) - (a.createdAt||0)).map(s=>{
              const workers = findWorkersForSale(s.id)
              return (
                <div key={s.id} className="card" style={{padding:10}}>
                  <div style={{display:'grid', gap:6}}>
                    <div>
                      <div className="muted" style={{fontSize:12, fontWeight:700, textTransform:'uppercase'}}>Date Sold</div>
                      <div>{s.soldAt || (s.createdAt ? new Date(s.createdAt).toLocaleString() : '-')}</div>
                    </div>
                    <div>
                      <div className="muted" style={{fontSize:12, fontWeight:700, textTransform:'uppercase'}}>Customer</div>
                      <div>{s.name}</div>
                    </div>
                    <div>
                      <div className="muted" style={{fontSize:12, fontWeight:700, textTransform:'uppercase'}}>Address</div>
                      <div>{s.address || '-'}</div>
                    </div>
                    <div>
                      <div className="muted" style={{fontSize:12, fontWeight:700, textTransform:'uppercase'}}>Neighborhood</div>
                      <div>{s.neighborhood || '-'}</div>
                    </div>
                    <div>
                      <div className="muted" style={{fontSize:12, fontWeight:700, textTransform:'uppercase'}}>Pay for you (30%)</div>
                      <div>{payForYou(s.price)}</div>
                    </div>
                    <div>
                      <div className="muted" style={{fontSize: 12, fontWeight: 700, textTransform: 'uppercase'}}>Workers</div>
                      <div>{workers.length ? workers.join(' & ') : '-'}</div>
                    </div>
                    <div>
                      <div className="muted" style={{fontSize: 12, fontWeight: 700, textTransform: 'uppercase'}}>Status</div>
                      <div>{s.status || 'unassigned'}</div>
                    </div>
                    <div>
                      <div className="muted" style={{fontSize:12, fontWeight:700, textTransform:'uppercase'}}>Notes</div>
                      <div>{s.notes || '-'}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="muted" style={{margin:0, textAlign:"center"}}>No recent sales.</p>
        )}
      </div>
    </div>
  )
}