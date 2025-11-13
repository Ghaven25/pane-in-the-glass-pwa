import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function logoutAndReset() {
  try { localStorage.removeItem("pane_user"); } catch {}
  window.location.href = "/login";
}

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
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("pane_user") || "null");
      if (u && typeof u === "object" && u.role && window.location.pathname === "/login") {
        nav(defaultRouteFor(u), { replace: true });
      } else if (!u || !u.role) {
        localStorage.removeItem("pane_user");
      }
    } catch {
      localStorage.removeItem("pane_user");
    }
  }, [nav]);

  // Lock page scroll while on login (prevents tiny vertical bounce)
  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow || "";
      document.body.style.overflow = prevBodyOverflow || "";
    };
  }, []);

  const toggleTheme = () => {
    const cur = document.documentElement.getAttribute("data-theme") || "dark";
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", (email || "").toLowerCase().trim())
      .maybeSingle();

    if (error || !user || String(user.pin || "") !== String(pin || "")) {
      setErr("Incorrect email or PIN.");
      return;
    }

    try { localStorage.setItem("pane_user", JSON.stringify(user)); } catch {}
    window.location.href = defaultRouteFor(user);
  };

  const logoSrc =
    ((import.meta && import.meta.env && import.meta.env.BASE_URL)
      ? import.meta.env.BASE_URL
      : "/") + "logo.png";

  const maskedStyle = { WebkitTextSecurity: "disc", MozTextSecurity: "disc", textSecurity: "disc" };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,                  // covers full viewport
        height: "100svh",
        display: "grid",
        placeItems: "center",      // perfect center both directions
        padding: 16,               // small gutter from phone edges
        overflow: "hidden",
        zIndex: 11,                // sit above header
        background: "var(--bg)"    // hide header behind
      }}
    >
      <form
        onSubmit={onSubmit}
        className="card"
        style={{ width: "min(92vw, 380px)", padding: 20, borderRadius: 12, transform: "translateY(-3vh)", willChange: "transform" }}
        autoComplete="off"
        data-lpignore="true"
        data-1p-ignore
        spellCheck={false}
      >
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <img src={logoSrc} alt="Pane in The Glass logo" style={{ width: 60, height: 60, display: "block", margin: "0 auto 8px" }} />
          <div style={{ fontWeight: 800, fontSize: 20 }}>Pane in The Glass</div>
        </div>
        <div style={{ textAlign: "left" }}>
          <label>Email</label>
          <input type="text" inputMode="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" required />
          <label style={{ marginTop: 10 }}>PIN</label>
          <input type="text" inputMode="numeric" value={pin} onChange={(e)=>setPin(e.target.value)} placeholder="••••" style={maskedStyle} required />
        </div>
        {err && <div style={{ color: "var(--danger)", marginTop: 8, fontSize: 13 }}>{err}</div>}
        <div className="row" style={{ marginTop: 14, alignItems: "center", gap: 6 }}>
          <button className="btn" type="submit" style={{ flex: 1 }}>Log In</button>
          <button type="button" className="btn outline" onClick={toggleTheme}>Toggle Theme</button>
        </div>
      </form>
    </div>
  );
}
