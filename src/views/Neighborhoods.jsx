// src/views/MyNeighborhoods.jsx
import React from "react"
import { useLocation } from "react-router-dom"

function getUser(){
  try { return JSON.parse(localStorage.getItem('pane_user') || 'null') } catch { return null }
}
function readNeighborhoods(){
  try { return JSON.parse(localStorage.getItem('neighborhoodAssignments') || '[]') } catch { return [] }
}

const fmtDateOnly = (t) => {
  if (!t) return '-'
  const d = new Date(t)
  return isNaN(d) ? '-' : d.toLocaleDateString([], { month:'short', day:'numeric' })
}

export default function MyNeighborhoods(){
  const loc = useLocation()
  const user = getUser()
  const data = React.useMemo(()=> readNeighborhoods(), [])

  const params = new URLSearchParams(loc.search)
  const forceHybrid = params.get('view') === 'hybrid'
  const role = user?.role
  const asHybrid = role === 'hybrid' || (role === 'admin' && forceHybrid)

  // sort newest first
  const rows = React.useMemo(()=>{
    return [...data].sort((a,b)=> (new Date(b.assignedAt||0)) - (new Date(a.assignedAt||0)))
  }, [data])

  return (
    <div className="card">
      <h2 className="section-title" style={{ marginBottom: 6 }}>
        {asHybrid ? 'My Neighborhoods (Hybrid View)' : 'My Neighborhoods'}
      </h2>

      {/* HYBRID-STYLE TABLE (for real hybrids, or admin with ?view=hybrid) */}
      {asHybrid ? (
        <table className="table">
          <thead>
            <tr>
              <th>Salesman</th>
              <th>Date(s)</th>
              <th>Neighborhood</th>
              <th style={{width:140}}>Customers Worked</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={5} style={{color:'#64748b'}}>No neighborhood assignments yet.</td></tr>
            )}
            {rows.map(r=>(
              <tr key={r.id}>
                <td>{r.sellerName} ({r.sellerEmail})</td>
                <td>{r.day || '-'} • {r.dateISO ? fmtDateOnly(r.dateISO) : '-'}</td>
                <td>{r.neighborhood || '-'}</td>
                <td>{typeof r.customersWorked==='number' ? r.customersWorked : 0}</td>
                <td style={{fontSize:12, color:'#334155'}}>{r.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        // DEFAULT (non-hybrid) — keep it simple/read-only
        <table className="table">
          <thead>
            <tr>
              <th>Assigned To</th>
              <th>Date</th>
              <th>Neighborhood</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={4} style={{color:'#64748b'}}>No neighborhood assignments yet.</td></tr>
            )}
            {rows.map(r=>(
              <tr key={r.id}>
                <td>{r.sellerName || r.userName || '-'}</td>
                <td>{r.dateISO ? fmtDateOnly(r.dateISO) : '-'}</td>
                <td>{r.neighborhood || '-'}</td>
                <td style={{fontSize:12, color:'#334155'}}>{r.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}