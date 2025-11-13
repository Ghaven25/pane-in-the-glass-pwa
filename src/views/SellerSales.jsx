import React, { useEffect, useMemo, useState } from 'react'

/* ---------- storage helpers ---------- */
function getUser(){ try{ return JSON.parse(localStorage.getItem('pane_user')||'null') }catch{ return null } }
function readSales(){ try{ return JSON.parse(localStorage.getItem('sales')||'[]') }catch{ return [] } }
function writeSales(rows){ localStorage.setItem('sales', JSON.stringify(rows)) }

/* ---------- date helpers ---------- */
const fmtDate = (t)=>{
  if(!t) return '-'
  const d = typeof t==='number' ? new Date(t) : new Date(String(t))
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleString([], { month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit' })
}

export default function SellerSales(){
  const user = getUser()
  const [rows, setRows] = useState(readSales())
  const [form, setForm] = useState({
    address: '',
    name: '',
    phone: '',
    price: '',
    neighborhood: '',
    notes: ''
  })

  useEffect(()=>{ setRows(readSales()) }, [])

  const visible = useMemo(()=>{
    if (!user) return []
    const all = readSales()
    if (user.role === 'admin') {
      return [...all].sort((a,b)=> (b.createdAt||0) - (a.createdAt||0))
    }
    const mine = all.filter(r => r.sellerEmail?.toLowerCase() === user.email?.toLowerCase())
    return [...mine].sort((a,b)=> (b.createdAt||0) - (a.createdAt||0))
  }, [rows, user])

  const saveSale = () => {
    const addr = (form.address||'').trim()
    const name = (form.name||'').trim()
    const phone = (form.phone||'').trim()
    const price = (form.price||'').trim()

    // Required fields
    if (!addr){ alert('Address is required.'); return }
    if (!name){ alert('Customer name is required.'); return }
    if (!phone){ alert('Phone number is required.'); return }
    if (!price){ alert('Price is required.'); return }

    const now = Date.now()
    const next = [
      ...readSales(),
      {
        id: now,
        createdAt: now,
        address: addr,
        name,
        phone,
        price: Number(price),
        neighborhood: (form.neighborhood||'').trim() || '',
        notes: (form.notes||'').trim() || '',
        sellerEmail: user?.email || '',
        sellerName: user?.name || '',
        status: 'workers not assigned',
        when: ''
      }
    ]
    writeSales(next)
    setRows(next)
    setForm({ address:'', name:'', phone:'', price:'', neighborhood:'', notes:'' })
    alert('Saved.')
  }

  const statusLabel = (s) => {
    if (!s || s === 'unassigned' || s === 'workers not assigned') return 'workers not assigned'
    if (s === 'assigned' || s === 'workers assigned') return 'workers assigned'
    if (s === 'worked') return 'worked'
    return s
  }

  return (
    <div className="grid">
      {/* form */}
      <div className="card">
        <h2 className="section-title">New Sale</h2>
        <p className="muted" style={{marginTop:-6}}>Address, Name, Phone, and Price are required.</p>
        <div className="grid">
          <label>Address*</label>
          <input
            value={form.address}
            onChange={e=>setForm({...form, address:e.target.value})}
            placeholder="123 Main St, City, ST"
          />

          <div className="row">
            <div style={{flex:1}}>
              <label>Customer Name*</label>
              <input
                value={form.name}
                onChange={e=>setForm({...form, name:e.target.value})}
                placeholder="Jane Doe"
              />
            </div>
            <div style={{flex:1}}>
              <label>Phone*</label>
              <input
                value={form.phone}
                onChange={e=>setForm({...form, phone:e.target.value})}
                placeholder="555-123-4567"
                inputMode="tel"
              />
            </div>
          </div>

          <div className="row">
            <div style={{flex:1}}>
              <label>Price*</label>
              <input
                value={form.price}
                onChange={e=>setForm({...form, price:e.target.value})}
                placeholder="e.g., 250"
                inputMode="decimal"
              />
            </div>
            <div style={{flex:1}}>
              <label>Neighborhood (optional)</label>
              <input
                value={form.neighborhood}
                onChange={e=>setForm({...form, neighborhood:e.target.value})}
                placeholder="e.g., North Hills"
              />
            </div>
          </div>

          <label>Notes (optional)</label>
          <textarea
            rows={3}
            value={form.notes}
            onChange={e=>setForm({...form, notes:e.target.value})}
            placeholder="Any extra details…"
          />

          <div className="toolbar">
            <button className="btn" onClick={saveSale}>Save Sale</button>
          </div>
        </div>
      </div>

      {/* list */}
      <div className="card">
        <h2 className="section-title">All Sales</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Submitted</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>Address</th>
              <th>Price</th>
              <th>Neighborhood</th>
              <th>Notes</th>
              <th>Status</th>
              <th>Date &amp; Time</th>
              <th>Seller</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td colSpan={10} style={{color:'#64748b'}}>No sales yet.</td></tr>
            )}
            {visible.map(s=>{
              const isMineForAdmin = user?.role==='admin' && s.sellerEmail?.toLowerCase()===user.email?.toLowerCase()
              return (
                <tr key={s.id} style={isMineForAdmin ? {fontWeight:700} : undefined}>
                  <td>{fmtDate(s.createdAt)}</td>
                  <td>{s.name || '-'}</td>
                  <td>{s.phone || '-'}</td>
                  <td>{s.address}</td>
                  <td>{s.price != null ? `$${s.price}` : '-'}</td>
                  <td>{s.neighborhood || '-'}</td>
                  <td style={{maxWidth:280}}>{s.notes || '-'}</td>
                  <td><span className="badge">{statusLabel(s.status)}</span></td>
                  <td>{s.when || '-'}</td>
                  <td>{s.sellerName ? `${s.sellerName} (${s.sellerEmail||''})` : (s.sellerEmail||'-')}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}