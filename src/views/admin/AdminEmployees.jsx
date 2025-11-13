// src/views/admin/AdminEmployees.jsx
import React, { useMemo, useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

const ROLES = ["admin", "seller", "worker", "hybrid"];

export default function AdminEmployees() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    email: "",
    pin: "",
    name: "",
    address: "",
    notes: "",
    role: "seller",
  });
  const [editingEmail, setEditingEmail] = useState(null);
  const [pinVisibility, setPinVisibility] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function loadUsers() {
    setLoading(true);
    setErr("");
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("role")
      .order("name");
    if (error) setErr(error.message);
    setUsers(data || []);
    try {
      // keep local cache so name lookups elsewhere still work
      localStorage.setItem("users_seed", JSON.stringify(data || []));
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
    const onFocus = () => loadUsers();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  function resetForm() {
    setForm({
      email: "",
      pin: "",
      name: "",
      address: "",
      notes: "",
      role: "seller",
    });
    setEditingEmail(null);
  }

  function onEdit(u) {
    setEditingEmail(u.email);
    setForm({
      email: u.email || "",
      pin: u.pin || "",
      name: u.name || "",
      address: u.address || "",
      notes: u.notes || "",
      role: u.role || "seller",
    });
  }

  async function onDelete(email) {
    if (!confirm("Delete this employee?")) return;
    const { error } = await supabase.from("users").delete().eq("email", email);
    if (error) {
      alert(error.message);
      return;
    }
    await loadUsers();
    if (editingEmail === email) resetForm();
  }

  async function onSubmit(e) {
    e.preventDefault();

    const clean = {
      email: (form.email || "").trim().toLowerCase(),
      pin: String(form.pin || "").trim(),
      name: (form.name || "").trim(),
      address: (form.address || "").trim(),
      notes: (form.notes || "").trim(),
      role: ROLES.includes(form.role) ? form.role : "seller",
    };

    if (!clean.email || !clean.pin || !clean.name) {
      alert("Email, PIN, and Name are required.");
      return;
    }

    if (editingEmail && editingEmail !== clean.email) {
      // primary key change: insert new then delete old
      const { error: upErr } = await supabase.from("users").upsert(clean);
      if (upErr) return alert(upErr.message);
      const { error: delErr } = await supabase
        .from("users")
        .delete()
        .eq("email", editingEmail);
      if (delErr) return alert(delErr.message);
    } else {
      const { error } = await supabase.from("users").upsert(clean);
      if (error) return alert(error.message);
    }

    await loadUsers();
    resetForm();
  }

  function togglePinVisibility(email) {
    setPinVisibility((prev) => ({ ...prev, [email]: !prev[email] }));
  }

  return (
    <div className="grid">
      <div className="card">
        <h2 className="section-title" style={{ marginBottom: 8 }}>
          Employees
        </h2>
        <div
          style={{
            display: "flex",
            gap: 18,
            color: "#64748b",
            fontSize: 14,
            marginTop: 2,
            marginBottom: 2,
            fontWeight: 400,
          }}
        >
          <span>Total: <b>{users.length}</b></span>
          <span>Admins: <b>{users.filter(u => u.role === "admin").length}</b></span>
          <span>Sellers: <b>{users.filter(u => u.role === "seller").length}</b></span>
          <span>Workers: <b>{users.filter(u => u.role === "worker").length}</b></span>
          <span>Hybrids: <b>{users.filter(u => u.role === "hybrid").length}</b></span>
          {loading && <span>Loading…</span>}
          {err && <span style={{color:"var(--danger)"}}>Error: {err}</span>}
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: "16%" }}>Name</th>
              <th style={{ width: "18%" }}>Email</th>
              <th style={{ width: "10%" }}>PIN</th>
              <th style={{ width: "12%" }}>Role</th>
              <th>Address</th>
              <th>Notes</th>
              <th style={{ width: 140 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ color: "#64748b" }}>
                  {loading ? "Loading…" : "No employees found."}
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.email}>
                  <td>{u.name || "-"}</td>
                  <td>{u.email || "-"}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => togglePinVisibility(u.email)}
                      style={{
                        cursor: "pointer",
                        background: "none",
                        border: "none",
                        padding: 0,
                        fontSize: "inherit",
                        fontFamily: "inherit",
                      }}
                      aria-label={pinVisibility[u.email] ? "Hide PIN" : "Show PIN"}
                    >
                      {pinVisibility[u.email] ? (u.pin || "-") : "••••"}
                    </button>
                  </td>
                  <td style={{ textTransform: "capitalize" }}>{u.role || "-"}</td>
                  <td
                    style={{
                      maxWidth: 240,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {u.address || "-"}
                  </td>
                  <td
                    style={{
                      maxWidth: 260,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {u.notes || "-"}
                  </td>
                  <td>
                    <div className="row" style={{ gap: 6 }}>
                      <button className="btn outline" onClick={() => onEdit(u)}>
                        Edit
                      </button>
                      <button
                        className="btn danger outline"
                        onClick={() => onDelete(u.email)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 className="section-title" style={{ marginBottom: -55 }}>
          {editingEmail ? "Edit Employee" : "Add Employee"}
        </h3>
        <form onSubmit={onSubmit}>
          <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <div>
              <label>Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full name"
              />
            </div>
            <div>
              <label>Email (unique)</label>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
                type="email"
              />
            </div>
            <div>
              <label>PIN</label>
              <input
                value={form.pin}
                onChange={(e) => setForm({ ...form, pin: e.target.value })}
                placeholder="1234"
                inputMode="numeric"
              />
            </div>
            <div>
              <label>Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Address</label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Street, City, State"
              />
            </div>
            <div>
              <label>Notes</label>
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Notes"
              />
            </div>
          </div>

          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            <button className="btn" type="submit">
              {editingEmail ? "Save Changes" : "Add Employee"}
            </button>
            {editingEmail && (
              <button type="button" className="btn outline" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}