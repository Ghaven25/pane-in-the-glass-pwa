// src/views/Login.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function defaultRouteFor(u) {
  if (!u) return "/login";
  switch (u.role) {
    case "seller": return "/seller/home";
    case "worker": return "/worker";
    case "hybrid": return "/hybrid/home";
    case "admin":  return "/admin/home";
    default:       return "/login";
  }
}

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("pane_user") || "null");
      if (u && u.role) nav(defaultRouteFor(u), { replace: true });
    } catch {}
  }, [nav]);

  const toggleTheme = () => {
    const cur = document.documentElement.getAttribute("data-theme") || "dark";
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    setErr("");

    let user = null;
    try {
      const users = JSON.parse(localStorage.getItem("users_seed") || "[]");
      user = users.find(u => (u.email || "").toLowerCase() === email.toLowerCase());
    } catch {}

    if (!user || String(user.pin || "") !== String(pin || "")) {
      setErr("incorrect");
      return;
    }

    try {
      localStorage.setItem("pane_user", JSON.stringify(user));
    } catch {}

    const dest = defaultRouteFor(user);
    nav(dest, { replace: true });
  };

  const logoSrc =
    ((import.meta && import.meta.env && import.meta.env.BASE_URL)
      ? import.meta.env.BASE_URL
      : "/") + "logo.png";

  const maskedStyle = {
    WebkitTextSecurity: "disc",
    MozTextSecurity: "disc",
    textSecurity: "disc",
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <form
        onSubmit={onSubmit}
        className="card"
        style={{ minWidth: 320, padding: 24, textAlign: "center" }}
        autoComplete="off"
        data-lpignore="true"
        data-1p-ignore
        spellCheck={false}
      >
        {/* Centered logo + title */}
        <div style={{ marginBottom: 16 }}>
          <img
            src={logoSrc}
            alt="Pane in The Glass logo"
            style={{
              width: 56,
              height: 56,
              display: "block",
              margin: "0 auto 8px",
            }}
          />
          <div style={{ fontWeight: 800, fontSize: 20 }}>Pane in The Glass</div>
        </div>

        <label>Email</label>
        <input
          type="text"
          inputMode="email"
          name="pane_email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="off"
          data-lpignore="true"
          data-1p-ignore
          required
        />

        <label style={{ marginTop: 10 }}>PIN</label>
        <input
          type="text"
          inputMode="numeric"
          name="pane_pin"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="••••"
          autoComplete="off"
          data-lpignore="true"
          data-1p-ignore
          style={maskedStyle}
          required
        />

        {err && (
          <div style={{ color: "var(--danger)", marginTop: 8, fontSize: 13 }}>
            {err}
          </div>
        )}

        <div
          className="row"
          style={{ marginTop: 14, alignItems: "center", gap: 6 }}
        >
          <button className="btn" type="submit" style={{ flex: 1 }}>
            Log In
          </button>
          <button
            type="button"
            className="btn outline"
            onClick={toggleTheme}
          >
            Toggle Theme
          </button>
        </div>
      </form>
    </div>
  );
}