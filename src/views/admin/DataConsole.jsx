import React from "react";
import { requireAdminAccess } from "../../utils/adminTools.js";

const KNOWN_KEYS = [
  "users_seed",
  "sales",
  "assignments",
  "finishedNeighborhoodLogs",
  "finishedNeighborhoods",
  "payouts",
  "pay_period_start"
];

// tiny helpers
function readRaw(key) {
  const val = localStorage.getItem(key);
  return val ?? "";
}

function writeRaw(key, val) {
  localStorage.setItem(key, val);
}

// pretty print if it's JSON array/object, otherwise leave it as-is
function pretty(val) {
  try {
    const parsed = JSON.parse(val);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return val ?? "";
  }
}

// try parse JSON, fallback string
function safeParse(val) {
  try {
    return JSON.parse(val);
  } catch {
    return null;
  }
}

export default function DataConsole() {
  // lock down non-admins
  React.useEffect(() => {
    requireAdminAccess();
  }, []);

  // which localStorage key we're working on
  const [activeKey, setActiveKey] = React.useState(KNOWN_KEYS[0]);

  // text in editor
  const [text, setText] = React.useState(() => pretty(readRaw(KNOWN_KEYS[0])));

  // info message for admin ("saved ✅" / parse error etc)
  const [msg, setMsg] = React.useState("");

  // whenever you pick a different key from dropdown
  function handleSelectChange(e) {
    const k = e.target.value;
    setActiveKey(k);
    setText(pretty(readRaw(k)));
    setMsg("");
  }

  // save button: write raw text to localStorage
  function handleSave() {
    // if it looks like JSON, make sure it parses before we save
    const trimmed = text.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        JSON.parse(trimmed);
      } catch (err) {
        setMsg("❌ Not valid JSON. Fix it first.");
        return;
      }
    }

    writeRaw(activeKey, trimmed);
    setMsg("✅ Saved to localStorage[" + activeKey + "]");
  }

  // convenience: delete one row (for array keys only)
  function deleteIndex(i) {
    const currentVal = readRaw(activeKey);
    const parsed = safeParse(currentVal);

    if (!Array.isArray(parsed)) {
      setMsg("❌ Current value is not an array, can't delete index.");
      return;
    }

    const copy = [...parsed];
    if (i < 0 || i >= copy.length) {
      setMsg("❌ Index out of range.");
      return;
    }

    copy.splice(i, 1);
    const newStr = JSON.stringify(copy, null, 2);
    setText(newStr);
    writeRaw(activeKey, newStr);
    setMsg(`✅ Removed item ${i} from ${activeKey}`);
  }

  // convenience: add a blank item to arrays
  function addBlankRow() {
    const currentVal = readRaw(activeKey);
    const parsed = safeParse(currentVal);

    if (!Array.isArray(parsed)) {
      setMsg("❌ Current value is not an array, can't push blank row.");
      return;
    }

    // generic starter row
    const blankObj = { id: crypto.randomUUID ? crypto.randomUUID() : Date.now() };

    const copy = [blankObj, ...parsed];
    const newStr = JSON.stringify(copy, null, 2);
    setText(newStr);
    writeRaw(activeKey, newStr);
    setMsg(`✅ Added blank row to ${activeKey}`);
  }

  // render quick preview table of array-ish stuff so you can see it without reading the whole JSON blob
  function renderQuickPreview() {
    const parsed = safeParse(text);
    if (!Array.isArray(parsed)) return null;

    // we'll try to render first ~5 rows, small columns (id, name/sellerName/sellerEmail, etc)
    const previewRows = parsed.slice(0, 5);

    return (
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "8px 10px",
          background: "var(--card)",
          overflowX: "auto",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
          Quick Preview (first 5 rows of {activeKey})
        </div>
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            fontSize: 12,
            lineHeight: 1.4,
          }}
        >
          <thead>
            <tr style={{ background: "var(--bg2)" }}>
              <th
                style={{
                  textAlign: "left",
                  padding: "4px 6px",
                  borderBottom: "1px solid var(--border)",
                  fontWeight: 600,
                }}
              >
                idx
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "4px 6px",
                  borderBottom: "1px solid var(--border)",
                  fontWeight: 600,
                }}
              >
                id
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "4px 6px",
                  borderBottom: "1px solid var(--border)",
                  fontWeight: 600,
                }}
              >
                name / sellerName
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "4px 6px",
                  borderBottom: "1px solid var(--border)",
                  fontWeight: 600,
                }}
              >
                email
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "4px 6px",
                  borderBottom: "1px solid var(--border)",
                  fontWeight: 600,
                }}
              >
                $ / notes / etc
              </th>
              <th
                style={{
                  textAlign: "center",
                  padding: "4px 6px",
                  borderBottom: "1px solid var(--border)",
                  fontWeight: 600,
                }}
              >
                delete
              </th>
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, i) => (
              <tr key={i}>
                <td
                  style={{
                    padding: "4px 6px",
                    borderBottom: "1px solid var(--border)",
                    verticalAlign: "top",
                    fontWeight: 600,
                  }}
                >
                  {i}
                </td>
                <td
                  style={{
                    padding: "4px 6px",
                    borderBottom: "1px solid var(--border)",
                    verticalAlign: "top",
                  }}
                >
                  {row?.id ?? "-"}
                </td>

                <td
                  style={{
                    padding: "4px 6px",
                    borderBottom: "1px solid var(--border)",
                    verticalAlign: "top",
                  }}
                >
                  {row?.name || row?.sellerName || "-"}
                </td>

                <td
                  style={{
                    padding: "4px 6px",
                    borderBottom: "1px solid var(--border)",
                    verticalAlign: "top",
                    fontSize: 11,
                    color: "var(--muted)",
                  }}
                >
                  {row?.email || row?.sellerEmail || "-"}
                </td>

                <td
                  style={{
                    padding: "4px 6px",
                    borderBottom: "1px solid var(--border)",
                    verticalAlign: "top",
                    fontSize: 11,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    maxWidth: 140,
                  }}
                >
                  {row?.price ||
                    row?.notes ||
                    row?.customers ||
                    row?.address ||
                    row?.addressSentTo ||
                    "-"}
                </td>

                <td
                  style={{
                    padding: "4px 6px",
                    borderBottom: "1px solid var(--border)",
                    textAlign: "center",
                  }}
                >
                  <button
                    className="btn outline"
                    style={{
                      fontSize: 10,
                      lineHeight: 1,
                      padding: "4px 6px",
                      borderColor: "var(--accent)",
                      color: "var(--accent)",
                    }}
                    onClick={() => deleteIndex(i)}
                  >
                    delete
                  </button>
                </td>
              </tr>
            ))}
            {parsed.length > 5 && (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: "4px 6px",
                    fontSize: 11,
                    color: "var(--muted)",
                    textAlign: "center",
                  }}
                >
                  …and {parsed.length - 5} more rows
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            className="btn"
            style={{
              fontSize: 12,
              lineHeight: 1,
              padding: "6px 10px",
            }}
            onClick={addBlankRow}
          >
            + Add Blank Row
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid" style={{ marginTop: -52 }}>
      <div className="card" style={{ width: "100%" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <h2 className="section-title" style={{ marginBottom: 4 }}>
              Admin Data Console
            </h2>
            <div
              className="muted"
              style={{ fontSize: 13, marginTop: -6, lineHeight: 1.4 }}
            >
              Full access to localStorage. Edit carefully.
            </div>
          </div>

          <div style={{ minWidth: 220 }}>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                display: "block",
                marginBottom: 4,
              }}
            >
              Storage Key
            </label>
            <select
              style={{
                width: "100%",
                fontSize: 12,
                padding: "6px 8px",
                border: "1px solid var(--border)",
                borderRadius: 6,
                background: "var(--card)",
                color: "var(--text)",
              }}
              value={activeKey}
              onChange={handleSelectChange}
            >
              {KNOWN_KEYS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
        </div>

        {renderQuickPreview()}

        <div style={{ marginTop: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 6,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600 }}>
              Raw {activeKey} value:
            </div>

            <button
              className="btn outline"
              style={{
                fontSize: 12,
                lineHeight: 1,
                padding: "6px 10px",
                borderColor: "var(--accent)",
                color: "var(--accent)",
              }}
              onClick={handleSave}
            >
              Save to localStorage
            </button>
          </div>

          <textarea
            style={{
              width: "100%",
              minHeight: 260,
              fontSize: 12,
              lineHeight: 1.4,
              fontFamily: "monospace",
              padding: "8px 10px",
              border: "1px solid var(--border)",
              borderRadius: 8,
              background: "var(--card)",
              color: "var(--text)",
              whiteSpace: "pre",
            }}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setMsg("");
            }}
          />
        </div>

        {msg && (
          <div
            style={{
              fontSize: 12,
              marginTop: 10,
              color: msg.startsWith("✅")
                ? "var(--accent)"
                : "var(--danger, #dc2626)",
              lineHeight: 1.4,
              wordBreak: "break-word",
            }}
          >
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}