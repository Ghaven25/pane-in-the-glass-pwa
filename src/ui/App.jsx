import React from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import Login from './Login'
import Dashboard from './Dashboard'

export default function App(){
  return (
    <>
      <header className="header">
        <div className="logo">PG</div>
        <strong>Pane in The Glass</strong>
        <span className="pill">PWA</span>
      </header>
      <Routes>
        <Route path="/" element={<Login/>} />
        <Route path="/app/*" element={<Dashboard/>} />
      </Routes>
    </>
  )
}