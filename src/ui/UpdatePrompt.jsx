// src/ui/UpdatePrompt.jsx
import React, { useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

export default function UpdatePrompt() {
  const [show, setShow] = useState(false);

  // Rely ONLY on the event callback; do not read needRefresh directly.
  const { updateServiceWorker } = useRegisterSW({
    onNeedRefresh() {
      // This only fires when a new SW is waiting
      setShow(true);
    },
    onRegistered() {},      // no-op
    onRegisterError(e) { console.error("SW register error:", e); },
  });

  if (!show) return null;

  const doUpdate = async () => {
    try { await updateServiceWorker(true); } catch {}
    // Reload after the SW takes control
    setTimeout(() => location.reload(), 200);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="App update available"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "grid",
        placeItems: "center",
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div
        style={{
          width: "min(520px, 92vw)",
          borderRadius: 14,
          border: "1px solid var(--border)",
          background: "var(--card)",
          color: "var(--text)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
          padding: 18,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
          Update available
        </div>
        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 16 }}>
          A new version is ready. Tap Update to continue.
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button className="btn" onClick={doUpdate} autoFocus>
            Update
          </button>
        </div>
      </div>
    </div>
  );
}
