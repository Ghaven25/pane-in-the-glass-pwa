// src/ui/Header.jsx
import React from "react"
import { NavLink } from "react-router-dom"
import MapPage from "./MapPage";

function Header() {
  const user = JSON.parse(localStorage.getItem("pane_user") || "null") || {}

  const roleLinks = {
    seller: [
      { to: "/seller/home", label: "Home" },
      { to: "/calendar/sellers", label: "My Calendar" },
      { to: "/finished", label: "Job Finished" },
      { to: "/seller", label: "Sales" },
      { to: "/seller/payments", label: "Payments" },
      { to: "/map", label: "Map" },
    ],
    worker: [
      { to: "/worker", label: "Home" },
      { to: "/calendar/workers", label: "My Calendar" },
      { to: "/finished", label: "Job Finished" },
      { to: "/worker/payments", label: "Payments" },
    ],
    hybrid: [
      { to: "/hybrid/home", label: "Home" },
      { to: "/hybrid/calendar", label: "My Calendar" },
      { to: "/finished", label: "Job Finished" },
      { to: "/hybrid/payments", label: "Payments" },
      { to: "/seller", label: "Sales" },
      { to: "/map", label: "Map" },
    ],
    admin: [
      { to: "/admin/home", label: "Home" },
      { to: "/admin/assign", label: "Assign Jobs" },
      { to: "/admin/past", label: "Past Jobs" },
      { to: "/admin/money", label: "Money" },
      { to: "/admin/employees", label: "Employees" },
      { to: "/map", label: "Map" },
    ],
  }

  const links = roleLinks[user.role] || []

  return (
    <nav className="header-nav">
      {links.map(({ to, label }) => (
        <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "active" : "")}>
          {label}
        </NavLink>
      ))}
      <button
        onClick={() => {
          localStorage.removeItem("pane_user")
          window.location.href = "/login"
        }}
      >
        Logout
      </button>
    </nav>
  )
}

export default Header