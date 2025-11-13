// src/views/SellerPaycheck.jsx
import React from 'react'

/* storage */
const read = (k, fb) => { try { return JSON.parse(localStorage.getItem(k) ?? JSON.stringify(fb)); } catch { return fb; } };
const getUser          = () => { try { return JSON.parse(localStorage.getItem('pane_user')||'null'); } catch { return null; } };
const readSales        = () => read('sales', []);
const readAssignments  = () => read('assignments', []);

/* helpers */
const money = (n)=> (isFinite(+n) ? `$${(+n).toFixed(2)}` : '-');

export default function SellerPaycheck(){
  const me = getUser();
  const myEmail = me?.email || '';
  const myRole = me?.role || '';

  const sales = React.useMemo(()=> readSales(), []);
  const assignments = React.useMemo(()=> readAssignments(), []);

  /* Seller subtotal (30%) */
  const sellerRows = React.useMemo(()=>{
    return sales
      .filter(s => (s?.sellerEmail||'').toLowerCase() === myEmail.toLowerCase())
      .map(s => ({ price: isFinite(+s.price)? +s.price : null, share: isFinite(+s.price)? +s.price*0.30 : null }));
  }, [sales, myEmail]);
  const sellerSubtotal = sellerRows.reduce((sum, r)=> sum + (r.share ?? 0), 0);

  /* Worker subtotal (20%) */
  const workerRows = React.useMemo(()=>{
    const mapBySaleId = new Map(sales.map(s => [String(s.id), s]));
    const mine = assignments.filter(a => (a.workerEmail===myEmail || a.worker2Email===myEmail) && a.status !== 'offered');

    return mine.map(a=>{
      const s = mapBySaleId.get(String(a.saleId));
      const price = isFinite(+s?.price) ? +s.price : null;
      const share = price != null ? price*0.20 : null;
      return { price, share };
    });
  }, [assignments, sales, myEmail]);
  const workerSubtotal = workerRows.reduce((sum, r)=> sum + (r.share ?? 0), 0);

  const grandTotal = sellerSubtotal + workerSubtotal;

  return (
    <div className="grid">
      <div className="card">
        <h2 className="section-title">Paycheck</h2>

        <div className="grid" style={{gridTemplateColumns:'repeat(3, 1fr)', gap:12}}>
          <div className="card" style={{padding:'12px 14px'}}>
            <div className="muted" style={{fontSize:12, textTransform:'uppercase', letterSpacing:.3}}>Seller Subtotal (30%)</div>
            <div style={{fontSize:22, fontWeight:800, marginTop:6}}>{money(sellerSubtotal)}</div>
          </div>

          <div className="card" style={{padding:'12px 14px'}}>
            <div className="muted" style={{fontSize:12, textTransform:'uppercase', letterSpacing:.3}}>Worker Subtotal (20%)</div>
            <div style={{fontSize:22, fontWeight:800, marginTop:6}}>{money(workerSubtotal)}</div>
          </div>

          <div className="card" style={{padding:'12px 14px', background:'var(--card-strong, var(--card))'}}>
            <div className="muted" style={{fontSize:12, textTransform:'uppercase', letterSpacing:.3}}>Total</div>
            <div style={{fontSize:26, fontWeight:900, marginTop:6}}>{money(grandTotal)}</div>
          </div>
        </div>

        <p className="muted" style={{marginTop:10, fontSize:12}}>
          Totals above reflect the same rows you see in <strong>Payments (Seller)</strong>{myRole==='hybrid' ? ' and ' : ''}{myRole==='hybrid' ? <strong>Payments (Worker)</strong> : null}.
        </p>
      </div>
    </div>
  )
}