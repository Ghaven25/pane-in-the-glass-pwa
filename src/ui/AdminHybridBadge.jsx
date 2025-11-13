// src/ui/AdminHybridBadge.jsx
import React from "react";

export default function AdminHybridBadge() {
  const show = (localStorage.getItem("admin_show_name_on_cal") !== "false");
  let user = null;
  try { user = JSON.parse(localStorage.getItem("pane_user") || "null"); } catch {}
  if (!user || user.role !== "admin" || !show) return null;

  return (
    <div
      style={{
        margin: "-10px 0 6px 0",
        fontSize: 14,
        color: "var(--muted)",
        fontWeight: 600
      }}
    >
      (Admin) {user.name ?? "Admin"}
    </div>
  );
}