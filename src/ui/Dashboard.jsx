import React, {useEffect, useState} from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import SellerAvailability from '../views/SellerAvailability'
import WorkerAvailability from '../views/WorkerAvailability'
import SellerSales from '../views/SellerSales'
import AdminAssign from '../views/AdminAssign'

function useAuth(){
  const [user,setUser]=useState(null)
  useEffect(()=>{
    const u = localStorage.getItem('pane_user')
    if(u) setUser(JSON.parse(u))
  },[])
  return [user, (v)=>{localStorage.setItem('pane_user', JSON.stringify(v)); setUser(v)}]
}

export default function Dashboard(){
  const nav=useNavigate()
  const [user,setUser]=useAuth()

  if(!user) return (
    <div style={{padding:16}} className="grid">
      <div className="card">
        <p>Not logged in.</p>
        <button className="btn" onClick={()=>nav('/')}>Go to login</button>
      </div>
    </div>
  )

  return (
    <div style={{padding:16}} className="grid">
      <div className="row">
        <span className="pill">{user.role.toUpperCase()}</span>
        <span className="pill">{user.email}</span>
        <button className="btn secondary" onClick={()=>{localStorage.removeItem('pane_user'); nav('/')}}>Log out</button>
      </div>

      {user.role==='admin' && (
        <div className="card">
          <h3>Admin</h3>
          <div className="toolbar">
            <Link className="btn" to="assign">Assign Jobs</Link>
            <Link className="btn" to="seller-sales">View Sales</Link>
            <Link className="btn" to="seller-availability">Seller Availability</Link>
            <Link className="btn" to="worker-availability">Worker Availability</Link>
          </div>
        </div>
      )}

      {user.role==='worker' && (
        <div className="card">
          <h3>Worker</h3>
          <div className="toolbar">
            <Link className="btn" to="worker-availability">Set Availability</Link>
          </div>
        </div>
      )}

      {user.role==='seller' && (
        <div className="card">
          <h3>Seller</h3>
          <div className="toolbar">
            <Link className="btn" to="seller-availability">Set Availability</Link>
            <Link className="btn" to="seller-sales">Add Sale</Link>
          </div>
        </div>
      )}

      <Routes>
        <Route path="seller-availability" element={<SellerAvailability/>}/>
        <Route path="worker-availability" element={<WorkerAvailability/>}/>
        <Route path="seller-sales" element={<SellerSales/>}/>
        <Route path="assign" element={<AdminAssign/>}/>
      </Routes>
    </div>
  )
}