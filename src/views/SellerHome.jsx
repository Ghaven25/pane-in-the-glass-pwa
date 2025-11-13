// src/views/SellerHome.jsx
import React from 'react'

/* ===== storage helpers ===== */
function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } }
function getUser(){ try{ return JSON.parse(localStorage.getItem('pane_user')||'null') }catch{ return null } }
function readAssignments(){ return read('assignments', []) }
function readSales(){ return read('sales', []) }

/* ===== date helpers ===== */
function startOfDay(d){ const x=new Date(d); x.setHours(0,0,0,0); return x }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x }
function days7(){ const t = startOfDay(new Date()); return Array.from({length:7},(_,i)=> addDays(t,i)) }
function toISO(d){ return startOfDay(d).toISOString().slice(0,10) }
function fmtDate(d){ return d.toLocaleDateString([], { weekday:'short', month:'short', day:'numeric' }) }

/* Parse common "when" strings like "Tue 9-2" or ISO "2025-10-26 10:00-14:00" */
const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
function parseWhenToDateAndHours(when){
  if(!when) return { dateISO:null, hours:null }
  const s = String(when).trim()

  // If it starts with YYYY-MM-DD, take that date and try to grab hours after it
  const isoMatch = s.match(/^(\d{4}-\d{2}-\d{2})(?:\s+([0-9:\-apmAPM\s]+))?/);
  if(isoMatch){
    return { dateISO: isoMatch[1], hours: (isoMatch[2]||'').trim() || null }
  }

  // If it contains a weekday token like "Tue", map to next occurrence in next 7 days
  const short = WEEKDAYS.find(d => s.toLowerCase().startsWith(d.toLowerCase()) || s.toLowerCase().includes(` ${d.toLowerCase()} `) || s.toLowerCase().includes(`${d.toLowerCase()}:`) || s.toLowerCase().includes(`${d.toLowerCase()}-`))
  if(short){
    const targetIdx = WEEKDAYS.indexOf(short)
    const today = startOfDay(new Date())
    const todayIdx = today.getDay()
    let delta = targetIdx - todayIdx
    if(delta < 0) delta += 7
    const date = addDays(today, delta)
    // hours: try to grab whatever comes after the weekday token
    const after = s.split(new RegExp(short, 'i'))[1] || ''
    const hours = after.replace(/^[^\dA-Za-z]*/, '').trim() || null
    return { dateISO: toISO(date), hours }
  }

  return { dateISO:null, hours:null }
}

/* Best-effort field helpers */
const getAddress = (sale)=> (sale?.address || sale?.addr || sale?.location || sale?.street || sale?.addressLine || '') || ''
const getNotes   = (sale)=> (sale?.notes || '-') || ''
const getSaleSellerEmail = (sale)=> (sale?.sellerEmail || sale?.seller?.email || sale?.salespersonEmail || '') || ''

export default function SellerHome(){
  const me = getUser()
  const myEmail = me?.email || ''

  const assignments = React.useMemo(()=> readAssignments(), [])
  const sales = React.useMemo(()=> readSales(), [])

  // Index sales by id for quick join
  const salesById = React.useMemo(()=>{
    const map = new Map()
    for(const s of sales){
      if(s && (s.id !== undefined && s.id !== null)) map.set(String(s.id), s)
    }
    return map
  }, [sales])

  // Build a 7-day window and bucket entries by dateISO
  const windowDates = React.useMemo(()=> {
    const arr = days7()
    const byISO = new Map(arr.map(d => [toISO(d), { date:d, rows:[] }]))
    return byISO
  }, [])

  // Collect items for this seller from assignments and raw sales
  React.useEffect(()=>{
    // From assignments (join to sale)
    for(const a of assignments){
      const sale = (a && a.saleId != null) ? salesById.get(String(a.saleId)) : null
      const sellerEmail = getSaleSellerEmail(sale)
      if(!sellerEmail || sellerEmail.toLowerCase() !== myEmail.toLowerCase()) continue

      let dateISO = a.dateISO || null
      let hours = a.hours || null

      if(!dateISO || !hours){
        const parsed = parseWhenToDateAndHours(a.when)
        dateISO = dateISO || parsed.dateISO
        hours   = hours   || parsed.hours
      }

      if(dateISO && windowDates.has(dateISO)){
        windowDates.get(dateISO).rows.push({
          hours: hours || '-',
          notes: getNotes(sale),
          address: getAddress(sale)
        })
      }
    }

    // From sales directly
    for(const sale of sales){
      const sellerEmail = getSaleSellerEmail(sale)
      if(!sellerEmail || sellerEmail.toLowerCase() !== myEmail.toLowerCase()) continue

      let dateISO = sale.dateISO || null
      let hours = sale.hours || null
      if(!dateISO || !hours){
        const parsed = parseWhenToDateAndHours(sale.when)
        dateISO = dateISO || parsed.dateISO
        hours   = hours   || parsed.hours
      }

      if(dateISO && windowDates.has(dateISO)){
        windowDates.get(dateISO).rows.push({
          hours: hours || '-',
          notes: getNotes(sale),
          address: getAddress(sale)
        })
      }
    }

    // Force re-render by updating state derived from map
    setDays(Array.from(windowDates.values()).map(v => ({ date: v.date, rows: v.rows })))
    // eslint-disable-next-line
  }, [assignments, sales, myEmail])

  const [days, setDays] = React.useState([])

  return (
    <div className="grid">
      <div className="card">
        <h2 className="section-title">My Week (Seller)</h2>
        <div style={{ overflowX:'auto' }}>
          <table className="table" style={{ minWidth: 700 }}>
            <thead>
              <tr>
                <th style={{width:180}}>Date</th>
                <th style={{width:140}}>Hours</th>
                <th>Address To Go</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {days.length === 0 && (
                <tr><td colSpan={4} style={{ color:'var(--muted)' }}>No scheduled items in the next 7 days.</td></tr>
              )}
              {days.map(({date, rows})=>{
                const dateLabel = fmtDate(date)
                if(rows.length === 0){
                  return (
                    <tr key={toISO(date)}>
                      <td>{dateLabel}</td>
                      <td colSpan={3} style={{ color:'var(--muted)' }}>—</td>
                    </tr>
                  )
                }
                return rows.map((r, idx)=>(
                  <tr key={toISO(date)+'#'+idx}>
                    {idx===0 ? <td rowSpan={rows.length} style={{ verticalAlign:'top' }}>{dateLabel}</td> : null}
                    <td>{r.hours || '-'}</td>
                    <td>{r.address || '-'}</td>
                    <td>{r.notes || '-'}</td>
                  </tr>
                ))
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}