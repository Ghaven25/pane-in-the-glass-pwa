import React, { useState } from 'react'

// simple local-only calendar mockup (month grid)
export default function SellerAvailability() {
  const [month] = useState(new Date().toLocaleString('default', { month: 'long', year: 'numeric' }))
  const days = Array.from({ length: 30 }, (_, i) => i + 1)
  const [slots, setSlots] = useState({})

  const toggle = (day) => {
    setSlots(prev => ({ ...prev, [day]: !prev[day] }))
  }

  return (
    <div className="card">
      <h2 className="section-title">Scheduling Calendar – {month}</h2>
      <p className="muted">Click a day to mark availability or sales activity.</p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '6px',
        marginTop: '12px'
      }}>
        {days.map(d => (
          <div
            key={d}
            onClick={() => toggle(d)}
            style={{
              padding: '20px 0',
              borderRadius: '8px',
              textAlign: 'center',
              cursor: 'pointer',
              background: slots[d] ? '#0ea5e9' : '#f1f5f9',
              color: slots[d] ? 'white' : '#1e293b'
            }}>
            {d}
          </div>
        ))}
      </div>
    </div>
  )
}