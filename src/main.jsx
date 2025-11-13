// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { registerSW } from 'virtual:pwa-register';

import Header from "./ui/Header.jsx";
import "./ui/header.css";
import "./ui/responsive.css";

// ===== default theme: LIGHT on first load (keeps prior choice) =====
(()=>{
  try{
    const saved = localStorage.getItem("pane_theme") || localStorage.getItem("theme");
    const theme = saved || "light"; // default to light
    document.documentElement.setAttribute("data-theme", theme);
    if(!saved){
      localStorage.setItem("pane_theme", theme);
      localStorage.setItem("theme", theme);
    }
  }catch{}
})();

// ----- auth / login -----
import Login from "./views/Login.jsx";

// ----- seller views -----
import SellerHome from "./views/SellerHome.jsx";
import SellersCalendar from "./views/SellersCalendar.jsx";
import SellerPayments from "./views/SellerPayments.jsx";
import Sales from "./views/Sales.jsx";

// ----- worker views -----
import WorkerHome from "./views/WorkerHome.jsx";
import WorkersCalendar from "./views/WorkersCalendar.jsx";
import WorkerPayments from "./views/WorkerPayments.jsx";
import FinishedJob from "./views/FinishedJob.jsx";

// ----- hybrid views -----
import HybridHome from "./views/hybrid/HybridHome.jsx";
import HybridCalendar from "./views/hybrid/HybridCalendar.jsx";
import HybridPayments from "./views/hybrid/HybridPayments.jsx";

// ----- admin views -----
import AdminHome from "./views/admin/AdminHome.jsx";
import AdminAssign from "./views/admin/AdminAssign.jsx";
import AdminPast from "./views/admin/AdminPast.jsx";
import MoneyTab from "./views/admin/MoneyTab.jsx";
import AdminEmployees from "./views/admin/AdminEmployees.jsx";
import ReviewNeighborhoods from "./views/admin/ReviewNeighborhoods.jsx";

// ***** NEW: admin data console (raw localStorage editor) *****
import DataConsole from "./views/admin/DataConsole.jsx";

// ----- shared -----
import MyNeighborhoods from "./views/MyNeighborhoods.jsx";

// --- PWA: auto update (no modal) ---
let updateSW = () => {};
if (import.meta.env.PROD) {
  updateSW = registerSW({
    immediate: true, // register SW ASAP in production
    onNeedRefresh() {
      // A new SW is waiting — activate immediately (skipWaiting + clientsClaim)
      updateSW(true);
    },
    onRegisteredSW(_swUrl, reg) {
      // Proactively check right after load, then hourly
      if (reg) {
        // short delay so the SW can settle, then check
        setTimeout(() => reg.update().catch(() => {}), 2000);
        setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
      }
    }
  });

  // When the new SW takes control, reload so new assets apply instantly
  if ("serviceWorker" in navigator) {
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!reloaded) {
        reloaded = true;
        window.location.reload();
      }
    });
  }
}
// --- end PWA auto update ---

/* ===== helpers ===== */
function getUser() {
  try {
    return JSON.parse(localStorage.getItem("pane_user") || "null");
  } catch {
    return null;
  }
}

function defaultRouteFor(user) {
  if (!user) return "/login";
  switch (user.role) {
    case "seller":
      return "/seller/home";
    case "worker":
      return "/worker";
    case "hybrid":
      return "/hybrid/home";
    case "admin":
      return "/admin/home";
    default:
      return "/login";
  }
}

function RequireAuth({ children }) {
  const u = getUser();
  if (!u) return <Navigate to="/login" replace />;
  return children;
}

/* ===== render app ===== */
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Header />
      <Routes>
        {/* public */}
        <Route path="/login" element={<Login />} />

        {/* root -> role home */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <Navigate to={defaultRouteFor(getUser())} replace />
            </RequireAuth>
          }
        />


        {/* SELLER */}
        <Route
          path="/seller/home"
          element={
            <RequireAuth>
              <SellerHome />
            </RequireAuth>
          }
        />
        <Route
          path="/calendar/sellers"
          element={
            <RequireAuth>
              <SellersCalendar />
            </RequireAuth>
          }
        />
        <Route
          path="/seller/payments"
          element={
            <RequireAuth>
              <SellerPayments />
            </RequireAuth>
          }
        />
        <Route
          path="/seller"
          element={
            <RequireAuth>
              <Sales />
            </RequireAuth>
          }
        />

        {/* shared page */}
        <Route
          path="/my-neighborhoods"
          element={
            <RequireAuth>
              <MyNeighborhoods />
            </RequireAuth>
          }
        />

        {/* WORKER */}
        <Route
          path="/worker"
          element={
            <RequireAuth>
              <WorkerHome />
            </RequireAuth>
          }
        />
        <Route
          path="/calendar/workers"
          element={
            <RequireAuth>
              <WorkersCalendar />
            </RequireAuth>
          }
        />
        <Route
          path="/worker/payments"
          element={
            <RequireAuth>
              <WorkerPayments />
            </RequireAuth>
          }
        />
        <Route
          path="/finished"
          element={
            <RequireAuth>
              <FinishedJob />
            </RequireAuth>
          }
        />

        {/* HYBRID */}
        <Route
          path="/hybrid/home"
          element={
            <RequireAuth>
              <HybridHome />
            </RequireAuth>
          }
        />
        <Route
          path="/hybrid/calendar"
          element={
            <RequireAuth>
              <HybridCalendar />
            </RequireAuth>
          }
        />
        <Route
          path="/hybrid/payments"
          element={
            <RequireAuth>
              <HybridPayments />
            </RequireAuth>
          }
        />

        {/* ADMIN */}
        <Route
          path="/admin/home"
          element={
            <RequireAuth>
              <AdminHome />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/assign"
          element={
            <RequireAuth>
              <AdminAssign />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/past"
          element={
            <RequireAuth>
              <AdminPast />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/money"
          element={
            <RequireAuth>
              <MoneyTab />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/employees"
          element={
            <RequireAuth>
              <AdminEmployees />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/review-neighborhoods"
          element={
            <RequireAuth>
              <ReviewNeighborhoods />
            </RequireAuth>
          }
        />

        {/* ***** NEW: raw data editor ***** */}
        <Route
          path="/admin/data"
          element={
            <RequireAuth>
              <DataConsole />
            </RequireAuth>
          }
        />

        {/* fallback */}
        <Route
          path="*"
          element={
            <RequireAuth>
              <Navigate to={defaultRouteFor(getUser())} replace />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);