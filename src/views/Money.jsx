import React, { useMemo } from "react";

/** ---------- tiny helpers ---------- */
function getUser() {
  try {
    return JSON.parse(localStorage.getItem("pane_user") || "null");
  } catch {
    return null;
  }
}
function readSales() {
  try {
    return JSON.parse(localStorage.getItem("sales") || "[]");
  } catch {
    return [];
  }
}
function readAssignments() {
  try {
    return JSON.parse(localStorage.getItem("assignments") || "[]");
  } catch {
    return [];
  }
}
function readUsers() {
  try {
    return JSON.parse(localStorage.getItem("users_seed") || "[]");
  } catch {
    return [];
  }
}

export default function Money() {
  const user = getUser();
  const sales = readSales();
  const assignments = readAssignments();
  const users = readUsers();

  // show all sales if admin; otherwise only user's
  const visibleSales = useMemo(() => {
    if (!user) return [];
    if (user.role === "admin" || user.role === "hybrid") return sales;
    // worker/seller only see own
    return sales.filter(
      (s) =>
        s.sellerEmail === user.email ||
        s.assignedTo?.toLowerCase().includes(user.name?.toLowerCase() || "")
    );
  }, [user, sales]);

  // compute payments
  const rows = visibleSales.map((sale) => {
    const match = assignments.find((a) => String(a.saleId) === String(sale.id));
    const price = Number(sale.price) || 0;

    const worker1 = match
      ? users.find((u) => u.email === match.workerEmail)?.name || match.workerEmail
      : "-";
    const worker2 = match
      ? users.find((u) => u.email === match.worker2Email)?.name || match.worker2Email
      : "-";
    const seller = sale.sellerName || "-";

    const payWorker1 = match ? (price * 0.2).toFixed(2) : "-";
    const payWorker2 = match ? (price * 0.2).toFixed(2) : "-";
    const paySeller = match ? (price * 0.3).toFixed(2) : "-";
    const payAdmin = match ? (price * 0.1).toFixed(2) : "-";
    const expenses = match ? (price * 0.2).toFixed(2) : "-";

    return {
      id: sale.id,
      customer: sale.name,
      address: sale.address,
      price,
      seller,
      worker1,
      worker2,
      payWorker1,
      payWorker2,
      paySeller,
      payAdmin,
      expenses,
    };
  });

  return (
    <div className="grid">
      <div className="card">
        <h2 className="section-title">Money Tracker</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Address</th>
              <th>Price</th>
              <th>Seller</th>
              <th>Worker 1</th>
              <th>Worker 2</th>
              <th>Seller (30%)</th>
              <th>Worker 1 (20%)</th>
              <th>Worker 2 (20%)</th>
              <th>Admin (10%)</th>
              <th>Expenses (20%)</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} style={{ color: "#64748b" }}>
                  No sales or assignments yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.customer}</td>
                <td>{r.address}</td>
                <td>${r.price}</td>
                <td>{r.seller}</td>
                <td>{r.worker1}</td>
                <td>{r.worker2}</td>
                <td>${r.paySeller}</td>
                <td>${r.payWorker1}</td>
                <td>${r.payWorker2}</td>
                <td>${r.payAdmin}</td>
                <td>${r.expenses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}