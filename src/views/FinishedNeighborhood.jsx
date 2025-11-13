// src/ui/Header.jsx
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

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

export default function Header() {
  const nav = useNavigate();
  const loc = useLocation();

  const rawUser = getUser();
  if (!rawUser) return null;

  // normalize name
  const user = { ...rawUser };
  if (!user.name) {
    if (user.email && user.email.includes("@")) {
      user.name = user.email.split("@")[0];
    } else {
      user.name = "User";
    }
  }

  let shownRole = titleCaseRole(user.role);
  if (user.role === "admin") shownRole = "Admin";

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

  // Menus
  const [menuOpen, setMenuOpen] = React.useState(false); // Admin menu
  const [navOpen, setNavOpen]   = React.useState(false); // Main nav
  const menuBtnRef = React.useRef(null);
  const menuRef    = React.useRef(null);
  const navBtnRef  = React.useRef(null);
  const navRef     = React.useRef(null);

  const toggleTheme = () => {
    const cur = document.documentElement.getAttribute("data-theme") || "dark";
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  };

  React.useEffect(() => {
    const saved = localStorage.getItem("theme") || "dark";
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  React.useEffect(() => { setMenuOpen(false); }, [loc.pathname]);
  React.useEffect(() => { setNavOpen(false); }, [loc.pathname]);

  // Close on outside click / Esc
  React.useEffect(() => {
    const onDocClick = (e) => {
      if (menuOpen) {
        if (menuRef.current?.contains(e.target)) return;
        if (menuBtnRef.current?.contains(e.target)) return;
        setMenuOpen(false);
      }
      if (navOpen) {
        if (navRef.current?.contains(e.target)) return;
        if (navBtnRef.current?.contains(e.target)) return;
        setNavOpen(false);
      }
    };
    const onEsc = (e) => (e.key === "Escape") && (setMenuOpen(false), setNavOpen(false));
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menuOpen, navOpen]);

  const logout = () => {
    try { localStorage.removeItem("pane_user"); } catch {}
    if (window?.location?.replace) {
      window.location.replace("/login");
    } else {
      nav("/login", { replace: true });
      setTimeout(() => window.location.reload(), 50);
    }
  };

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
      { to: "/finished-neighborhood", label: "Finished Neighborhood" },
      { to: "/my-neighborhoods", label: "My Neighborhoods" },
      { to: "/seller", label: "Sales" },
      { to: "/hybrid/payments", label: "Payments" },
    ] :
    isSeller ? [
      { to: "/seller/home", label: "Home" },
      { to: "/seller", label: "Sales" },
      { to: "/calendar/sellers", label: "My Calendar" },
      { to: "/finished-neighborhood", label: "Finished Neighborhood" },
      { to: "/seller/payments", label: "Payments" },
      { to: "/my-neighborhoods", label: "My Neighborhoods" },
    ] :
    isWorker ? [
      { to: "/worker", label: "Home" },
      { to: "/calendar/workers", label: "My Calendar" },
      { to: "/worker/payments", label: "Payments" },
      { to: "/finished", label: "Job Finished" },
    ] : []
  );

  // Shared tiny button style for both hamburgers
  const tinyBtn = {
    padding: "2px 6px",
    height: 20,
    minHeight: 20,
    lineHeight: 1,
    borderRadius: 9999,
    fontSize: 10
  };

  // Shared dropdown style (centers under its button; never cuts off)
  const dropStyle = {
    position: "absolute",
    left: "50%",
    top: "100%",
    transform: "translate(-50%, 8px)",
    minWidth: 220,
    maxWidth: "calc(100vw - 16px)",
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    boxShadow: "0 8px 24px rgba(0,0,0,.18)",
    padding: 6,
    zIndex: 60
  };

  // four equal columns (edges hug sides; middle columns centered)
  const colBase   = { flex: "1 1 25%", display: "flex", alignItems: "center", minWidth: 0 };
  const colLeft   = { ...colBase, justifyContent: "flex-start" };
  const colCenter = { ...colBase, justifyContent: "center" };
  const colRight  = { ...colBase, justifyContent: "flex-end" };

  return (
  <header className="topbar" style={{ position: "relative", zIndex: 50, padding: "0 6px" }}>
    <div style={{ display: "flex", width: "100%" }}>
      {/* COL 1 (25%): Logo + Brand together (brand tight to logo) */}
      <div style={colLeft}>
        <Link to="/" style={{ display: "flex", alignItems: "center", textDecoration: "none", color: "inherit" }}>
          <img
            src={logoSrc}
            alt="Pane in The Glass logo"
            className="logo"
            style={{ width: 36, height: 36, objectFit: "contain", marginLeft: -6, marginRight: 6 }}
          />
          <div
            className="brandLeft"
            style={{
              fontSize: 11,
              fontWeight: 800,
              whiteSpace: "normal",
              lineHeight: 1.05,
              overflow: "hidden",
              textOverflow: "ellipsis",
              textAlign: "center",
              display: "inline-block"
            }}
          >
            <span style={{ whiteSpace: "nowrap" }}>Pane&nbsp;in</span>
            <br />
            <span style={{ whiteSpace: "nowrap" }}>The&nbsp;Glass</span>
          </div>
        </Link>
      </div>

      {/* COL 3 (20%): Both hamburgers grouped, centered */}
      <div style={{ ...colCenter, gap: 4 }}>
        {/* Main NAV hamburger */}
        <div style={{ position: "relative" }}>
          <button
            ref={navBtnRef}
            aria-haspopup="menu"
            aria-expanded={navOpen ? "true" : "false"}
            onClick={(e) => { e.stopPropagation(); setNavOpen(o => !o); setMenuOpen(false); }}
            className="btn"
            style={tinyBtn}
            title="Open Navigation"
          >
            ☰
          </button>
          {navOpen && (
            <div ref={navRef} role="menu" style={dropStyle} onClick={(e)=>e.stopPropagation()}>
              <div style={{
                padding: "6px 10px",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: 0.3,
                color: "var(--muted)",
              }}>
                {`Navigation ${isAdmin ? "(Admin)" : isHybrid ? "(Hybrid)" : ""}`}
              </div>
              {roleLinks.map(item => {
                const active = isActive(item.to);
                return (
                  <button
                    key={item.to}
                    role="menuitem"
                    onClick={() => go(item.to)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      borderRadius: 8,
                      fontWeight: 600,
                      color: active ? "var(--text)" : "inherit",
                      outline: "none",
                      boxShadow: active ? "inset 0 0 0 2px var(--accent)" : "none",
                    }}
                    className="hover-row"
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Admin quick menu (outline) */}
        {isAdmin && (
          <div style={{ position: "relative" }}>
            <button
              ref={menuBtnRef}
              aria-haspopup="menu"
              aria-expanded={menuOpen ? "true" : "false"}
              onClick={(e) => { e.stopPropagation(); setMenuOpen(o => !o); setNavOpen(false); }}
              className="btn outline"
              style={tinyBtn}
              title="Admin Menu"
            >
              ☰
            </button>

            {menuOpen && (
              <div ref={menuRef} role="menu" style={dropStyle} onClick={(e)=>e.stopPropagation()}>
                <div style={{
                  padding: "6px 10px",
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                  color: "var(--muted)",
                }}>
                  Navigation (Admin)
                </div>

                {[
                  { to: "/finished", label: "Job Finished" },
                  { to: "/seller", label: "Sales" },
                ].map((item) => {
                  const active = isActive(item.to);
                  return (
                    <button
                      key={item.to}
                      role="menuitem"
                      onClick={() => go(item.to)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 12px",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        borderRadius: 8,
                        fontWeight: 600,
                        color: active ? "var(--text)" : "inherit",
                        outline: "none",
                        boxShadow: active ? "inset 0 0 0 2px var(--accent)" : "none",
                      }}
                      className="hover-row"
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* COL 4 (20%): name/role chip centered */}
      <div style={colCenter}>
        <div className="chip" style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "0 6px",
        }}>
          <span style={{ fontSize: 9, fontWeight: 800, lineHeight: 1 }}>{user.name}</span>
          <span style={{ fontSize: 9, opacity: 0.99, lineHeight: 1 }}>{shownRole}</span>
        </div>
      </div>

      {/* COL 5 (20%): Toggle + Logout grouped */}
      <div style={{ ...colRight, gap: 3 }}>
        <button
          className="btn outline"
          onClick={toggleTheme}
          title="Toggle Theme"
          style={tinyBtn}
        >
          🌓
        </button>
        <button
          className="btn outline"
          onClick={logout}
          title="Logout"
          style={tinyBtn}
        >
          ⎋
        </button>
      </div>
    </div>
  </header>
  );
}