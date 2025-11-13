import React, { useEffect, useState } from 'react'

function readSales() {
  try { return JSON.parse(localStorage.getItem('sales') || '[]') } catch { return [] }
}
function readAssignments() {
  try { return JSON.parse(localStorage.getItem('assignments') || '[]') } catch { return [] }
}

export default function MoneyTab() {
  const [records, setRecords] = useState([])

  useEffect(() => {
    const assigns = readAssignments().filter(a => a.done)
    const sales = readSales()
    const rows = assigns.map(a => {
      const sale = sales.find(s => String(s.id) === String(a.saleId))
      if (!sale) return null
      const workerPay = (sale.price || 0) * 0.20
      const sellerPay = (sale.price || 0) * 0.30
      return { id: a.id, customer: sale.name, price: sale.price || 0, workerPay, sellerPay }
    }).filter(Boolean)
    setRecords(rows)
  }, [])

  return (
    <div className="card">
      <h2 className="section-title">Money Tracker</h2>
      <table className="table">
        <thead>
          <tr><th>Customer</th><th>Sale Price</th><th>Worker 20%</th><th>Seller 30%</th></tr>
        </thead>
        <tbody>
          {records.length === 0
            ? <tr><td colSpan={4}>No completed jobs yet.</td></tr>
            : records.map(r => (
                <tr key={r.id}>
                  <td>{r.customer}</td>
                  <td>${r.price}</td>
                  <td>${r.workerPay.toFixed(2)}</td>
                  <td>${r.sellerPay.toFixed(2)}</td>
                </tr>
              ))
          }
        </tbody>
      </table>
    </div>
  )
}