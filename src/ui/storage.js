// src/ui/storage.js
// We keep using your existing localStorage keys for full compatibility.
const KEY_USERS = 'users_seed'         // seeded users from Login.jsx
const KEY_SALES = 'sales'              // seller-created sales
const KEY_ASSIGN = 'pane_assignments'  // admin-created assignments

export function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback }
}
export function write(key, val) { localStorage.setItem(key, JSON.stringify(val)) }

// --- USERS ---
export function getUsers(){ return read(KEY_USERS, []) }
export function setUsers(u){ write(KEY_USERS, u) }

// --- SALES ---
export function getSales(){ return read(KEY_SALES, []) }
export function setSales(s){ write(KEY_SALES, s) }

// --- ASSIGNMENTS ---
export function getAssignments(){ return read(KEY_ASSIGN, []) }
export function setAssignments(a){ write(KEY_ASSIGN, a) }

// --- helpers ---
export function byId(list, id){ return list.find(x=>String(x.id)===String(id)) }
export function uid(){ return Math.random().toString(36).slice(2,10) }

// compute money for completed assignments in a given month/year
export function computePayouts({month, year}) {
  const sales = getSales()
  const asg   = getAssignments().filter(a=>a.completed === true)
  const users = getUsers()

  const rows = asg
    .filter(a => {
      if (!a.completedAt) return false
      const d = new Date(a.completedAt)
      return d.getMonth() === month && d.getFullYear() === year
    })
    .map(a => {
      const sale = byId(sales, a.saleId) || {}
      const worker = users.find(u=>u.email===a.workerEmail)
      const seller = users.find(u=>u.email===sale.sellerEmail)
      const price = Number(sale.price || 0)
      const workerCut = +(price * 0.20).toFixed(2)
      const sellerCut = +(price * 0.30).toFixed(2)
      return {
        date: a.completedAt,
        saleId: a.saleId,
        customer: sale.name || '',
        price,
        worker: worker ? worker.name : '(unknown)',
        workerEmail: worker?.email || '',
        workerCut,
        seller: seller ? seller.name : '(unknown)',
        sellerEmail: seller?.email || '',
        sellerCut
      }
    })

  const totals = rows.reduce((t,r)=>({
    price: t.price + (r.price||0),
    worker: t.worker + r.workerCut,
    seller: t.seller + r.sellerCut,
  }), {price:0, worker:0, seller:0})

  return { rows, totals }
}
