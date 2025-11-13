import supa, { hasSupa, supabase } from "../supabase";
// src/ui/Header.jsx
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
/* ===== helpers ===== */
function getUser() {
  try {
    return JSON.parse(localStorage.getItem("pane_user") || "null");
  } catch {
    return null;
  }
}
function titleCaseRole(r) {
  if (!r) return "";
  const map = { admin: "Admin", seller: "Seller", worker: "Worker", hybrid: "Hybrid" };
  return map[r] || (r[0]?.toUpperCase() + r.slice(1));
}
function initials(nameOrEmail = "") {
  const base = String(nameOrEmail || "").trim();
  if (!base) return "U";
  if (base.includes("@")) return base[0].toUpperCase();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "U";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Header() {
  const nav = useNavigate();
  const loc = useLocation();

  const rawUser = getUser();
  if (!rawUser) return null;

  // normalize name
  const user = { ...rawUser };
  if (!user.name) {
    if (user.email && user.email.includes("@")) user.name = user.email.split("@")[0];
    else user.name = "User";
  }
  const shownRole = titleCaseRole(user.role);

  const isSeller = user.role === "seller";
  const isWorker = user.role === "worker";
  const isHybrid = user.role === "hybrid";
  const isAdmin  = user.role === "admin";

  const logoSrc =
    ((import.meta && import.meta.env && import.meta.env.BASE_URL)
      ? import.meta.env.BASE_URL
      : "/") + "logo.png";

  const isActive = (p) => loc.pathname === p;
  const go = (to) => nav(to);

  /* ====== STATE ====== */
  const [navOpen, setNavOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [theme, setTheme] = React.useState("light");

  /* ====== THEME ====== */
  const toggleTheme = () => {
    const cur = document.documentElement.getAttribute("data-theme") || "dark";
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    setTheme(next);
  };
  React.useEffect(() => {
    const saved = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", saved);
    setTheme(saved);
  }, []);

  React.useEffect(() => { setNavOpen(false); setProfileOpen(false); }, [loc.pathname]);

  React.useEffect(() => {
    const onEsc = (e) => (e.key === "Escape") && (setNavOpen(false), setProfileOpen(false));
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, []);

  // Realtime: on any DB change, notify pages to refetch
  React.useEffect(() => {
    const channel = supabase
      .channel("realtime-all")
      .on("postgres_changes", { event: "*", schema: "public" }, () => {
        window.dispatchEvent(new Event("db-refresh"));
      })
      .subscribe();
    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, []);

  const logout = () => {
    try { localStorage.removeItem("pane_user"); } catch {}
    if (window?.location?.replace) {
      window.location.replace("/login");
    } else {
      nav("/login", { replace: true });
      setTimeout(() => window.location.reload(), 50);
    }
  };

  /* ====== LINKS ====== */
  const roleLinks = (
    isAdmin ? [
      { to: "/admin/home", label: "Home" },
      { to: "/admin/assign", label: "Assign" },
      { to: "/admin/past", label: "Past" },
      { to: "/admin/money", label: "Money" },
      { to: "/admin/employees", label: "Employees" },
    ] :
    isHybrid ? [
      { to: "/hybrid/home", label: "Home" },
      { to: "/hybrid/calendar", label: "My Calendar" },
      { to: "/finished", label: "Job Finished" },
      { to: "/seller", label: "Sales" },
      { to: "/hybrid/payments", label: "Payments" },
    ] :
    isSeller ? [
      { to: "/seller/home", label: "Home" },
      { to: "/seller", label: "Sales" },
      { to: "/calendar/sellers", label: "My Calendar" },
    ] :
    isWorker ? [
      { to: "/worker", label: "Home" },
      { to: "/calendar/workers", label: "My Calendar" },
      { to: "/finished", label: "Job Finished" },
    ] : []
  );

  const tinyIconBtn = {
    height: 26,
    minHeight: 26,
    width: 30,
    minWidth: 30,
    padding: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 800,
    border: "1px solid var(--border)",
    background: "color-mix(in srgb, var(--bg) 70%, #000 30%)",
    color: "var(--text)",
    cursor: "pointer",
  };

  const capsule = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 8px",
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "color-mix(in srgb, var(--bg) 80%, #000 20%)",
  };

  const brandText = {
    fontSize: 11,
    fontWeight: 850,
    lineHeight: 1.05,
    letterSpacing: 0.15,
    whiteSpace: "nowrap",
    textAlign: "center",
  };

  const avatar = {
    height: 26,
    width: 26,
    borderRadius: "50%",
    border: "1px solid var(--border)",
    background: "color-mix(in srgb, var(--bg) 70%, #000 30%)",
    color: "var(--text)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 800,
    cursor: "pointer",
    userSelect: "none"
  };

  const sheet = {
    position: "fixed",
    inset: 0,
    zIndex: 70,
    background: "rgba(0,0,0,.45)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
  };
  const sheetCard = {
    width: "100%",
    maxWidth: 460,
    maxHeight: "82vh",
    overflowY: "auto",
    background: "var(--card)",
    backgroundImage: "linear-gradient(to bottom, rgba(51,199,230,0.14), transparent 28%)",
    border: "1px solid #33c7e6",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 12,
    paddingBottom: "calc(20px + env(safe-area-inset-bottom, 12px))",
    boxShadow: "0 -10px 28px rgba(0,0,0,.22)"
  };

  const NavButton = ({ to, label }) => {
    const active = isActive(to);
    return (
      <button
        onClick={() => go(to)}
        style={{
          textAlign: "left",
          padding: "12px 12px",
          borderRadius: 10,
          border: "1px solid var(--border)",
          background: active ? "rgba(51,199,230,0.16)" : "transparent",
          borderColor: active ? "#33c7e6" : "var(--border)",
          fontWeight: 800,
          cursor: "pointer",
        }}
        className="hover-row"
      >
        {label}
      </button>
    );
  };

  const fullButtonStyle = {
    textAlign: "left",
    padding: "12px 12px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "transparent",
    fontWeight: 800,
    cursor: "pointer",
    width: "100%"
  };

  const topbarStyle = (theme === "light")
    ? {
        position: "fixed",
        top: 0, left: 0, right: 0,
        height: 52,
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        gap: 8,
        padding: "0 18px",
        background: "rgba(255,255,255,0.72)",
        backdropFilter: "saturate(1.25) blur(10px)",
        WebkitBackdropFilter: "saturate(1.25) blur(10px)",
        borderBottom: "1px solid var(--border)",
        boxShadow: "0 1px 0 rgba(2,8,20,0.05), 0 8px 24px rgba(2,8,20,0.08)",
        zIndex: 60,
      }
    : {
        position: "fixed",
        top: 0, left: 0, right: 0,
        height: 52,
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        gap: 8,
        padding: "0 18px",
        background: "rgba(13,18,25,0.55)",
        backdropFilter: "saturate(1.1) blur(10px)",
        WebkitBackdropFilter: "saturate(1.1) blur(10px)",
        borderBottom: "1px solid var(--border)",
        boxShadow: "0 1px 0 rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.35)",
        zIndex: 60,
      };

  return (
    <>
      <header className="topbar" style={topbarStyle}>
        {/* LEFT: hamburger */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            aria-label="Open navigation"
            onClick={() => { setNavOpen(true); setProfileOpen(false); }}
            className="btn outline"
            style={tinyIconBtn}
            title="Menu"
          >
            ☰
          </button>
        </div>

        {/* CENTER: brand capsule */}
        <Link to="/" style={{ justifySelf: "center", alignSelf: "center", textDecoration: "none", color: "inherit" }}>
          <span style={capsule}>
            <img
              src={logoSrc}
              alt="Pane in The Glass"
              style={{ width: 24, height: 24, objectFit: "contain" }}
            />
            <span style={{ ...brandText, textAlign: "left" }}>
              <span style={{ whiteSpace: "nowrap" }}>Pane&nbsp;in</span>
              <br />
              <span style={{ whiteSpace: "nowrap" }}>The&nbsp;Glass</span>
            </span>
          </span>
        </Link>

        {/* RIGHT: profile */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, justifySelf: "end" }}>
          <div
            onClick={() => { setProfileOpen(true); setNavOpen(false); }}
            title={`${user.name} – ${shownRole}`}
            aria-label="User menu"
            style={avatar}
          >
            {initials(user.name || user.email)}
          </div>
        </div>
      </header>

      {/* NAV SHEET */}
      {navOpen && (
        <div style={sheet} onClick={() => setNavOpen(false)}>
          <div style={sheetCard} onClick={(e)=>e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: "#33c7e6", fontWeight: 800, letterSpacing: 0.4 }}>
                Navigation {isAdmin ? "(Admin)" : isHybrid ? "(Hybrid)" : ""}
              </div>
              <button onClick={() => setNavOpen(false)} className="btn outline" style={{ ...tinyIconBtn, width: 26 }}>✕</button>
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {roleLinks.map(link => (
                <NavButton key={link.to} to={link.to} label={link.label} />
              ))}
            </div>
            {isAdmin && (
              <>
                <div style={{ height: 8 }} />
                <div style={{ fontSize: 11, color: "#33c7e6", fontWeight: 800, letterSpacing: 0.4, margin: "2px 0 4px" }}>
                  Admin Extras
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  <NavButton to="/seller" label="Sales" />
                  <NavButton to="/finished" label="Job Finished" />
                </div>
              </>
            )}
            <div style={{ height: 6 }} />
          </div>
        </div>
      )}

      {/* PROFILE SHEET */}
      {profileOpen && (
        <div style={sheet} onClick={() => setProfileOpen(false)}>
          <div style={sheetCard} onClick={(e)=>e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={avatar}>{initials(user.name || user.email)}</div>
                <div style={{ lineHeight: 1.1 }}>
                  <div style={{ fontWeight: 900, fontSize: 13 }}>{user.name}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{shownRole}</div>
                </div>
              </div>
              <button onClick={() => setProfileOpen(false)} className="btn outline" style={{ ...tinyIconBtn, width: 26 }}>✕</button>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <button
                onClick={toggleTheme}
                className="hover-row"
                style={fullButtonStyle}
                aria-label="Toggle theme"
                title="Toggle light/dark"
              >
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </button>
              <button
                onClick={logout}
                className="hover-row"
                style={{ ...fullButtonStyle, borderColor: "var(--danger)", color: "var(--danger)" }}
              >
                ⎋ Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}