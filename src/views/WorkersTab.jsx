import React from 'react'

function readUsers() {
  try { return JSON.parse(localStorage.getItem('users_seed') || '[]') } catch { return [] }
}

export default function WorkersTab() {
  const users = readUsers().filter(u => u.role === 'worker' || u.role === 'hybrid')

  return (
    <div className="card">
      <h2 className="section-title">Team Directory</h2>
      <table className="table">
        <thead>
          <tr><th>Name</th><th>Email</th><th>Role</th><th>PIN</th></tr>
        </thead>
        <tbody>
          {users.length === 0 && <tr><td colSpan={4}>No workers found</td></tr>}
          {users.map(u => (
            <tr key={u.email}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.pin}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}