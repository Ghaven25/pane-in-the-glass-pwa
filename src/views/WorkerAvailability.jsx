import React, { useEffect, useState } from 'react'

function getUser(){ try{ return JSON.parse(localStorage.getItem('pane_user')||'null') }catch{ return null } }
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

function readAvailability(){
  try { return JSON.parse(localStorage.getItem('availability')||'[]') } catch { return [] }
}
function writeAvailability(rows){
  localStorage.setItem('availability', JSON.stringify(rows))
}

export default function WorkerAvailability(){
  const user = getUser()
  const [lines, setLines] = useState({})

  useEffect(()=>{
    const all = readAvailability()
    // worker or hybrid: store as worker
    const roleKey = user.role === 'hybrid' ? 'worker' : 'worker'
    const mine = all.filter(a => a.userEmail === user.email && a.role === roleKey)
    const obj = {}
    for (const d of DAYS) {
      const row = mine.find(m => m.day === d)
      obj[d] = row?.hours || ''
    }
    setLines(obj)
  }, [user.email, user.role])

  const saveAll = () => {
    const roleKey = user.role === 'hybrid' ? 'worker' : 'worker'
    const all = readAvailability().filter(a => !(a.userEmail === user.email && a.role === roleKey))
    const next = [...all, ...DAYS.map(day => ({
      id: `${user.email}:${roleKey}:${day}`,
      userEmail: user.email,
      role: roleKey,
      day,
      hours: lines[day] || ''
    }))]
    writeAvailability(next)
    alert('Worker availability saved.')
  }

  return (
    <div className="card">
      <h2 className="section-title">Worker Availability</h2>
      <p className="muted">Enter free-text hours for each day (ex: <i>9-12, 2-6</i> or <i>Off</i>).</p>
      <div className="grid">
        {DAYS.map(d=>(
          <div key={d} className="row">
            <div style={{width:72, paddingTop:10, fontWeight:600}}>{d}</div>
            <input value={lines[d]||''} onChange={e=>setLines({...lines, [d]: e.target.value})} placeholder="e.g., 9-12, 2-6 or Off"/>
          </div>
        ))}
        <div className="toolbar">
          <button className="btn" onClick={saveAll}>Save Availability</button>
        </div>
      </div>
    </div>
  )
}