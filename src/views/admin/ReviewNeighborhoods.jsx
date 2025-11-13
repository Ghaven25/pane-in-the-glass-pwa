// src/views/admin/ReviewNeighborhoods.jsx
import React from "react";
import { requireAdminAccess } from "../../utils/adminTools.js";

/*
 Admin view to audit all submitted Finished Neighborhood logs.
 Sellers / Hybrids submit proof they worked a neighborhood.
 We added Admin Edit Mode so the admin can fix / add / remove logs in-place
 and push it back to localStorage.
*/

/* ---------- localStorage helpers ---------- */

function safeParse(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

// We'll prefer "finishedNeighborhoodLogs" but fall back to "finishedNeighborhoods".
// ALSO: we remember which key we actually loaded from so we can save back to it.
function readLogsWithSource() {
  const a = safeParse("finishedNeighborhoodLogs");
  if (a.length > 0) {
    return { data: a, storageKey: "finishedNeighborhoodLogs" };
  }
  const b = safeParse("finishedNeighborhoods");
  return { data: b, storageKey: "finishedNeighborhoods" };
}

function writeLogs(storageKey, rows) {
  localStorage.setItem(storageKey, JSON.stringify(rows));
}

/* ---------- main component ---------- */

export default function ReviewNeighborhoods() {
  // hard gate: redirect non-admins immediately
  React.useEffect(() => {
    requireAdminAccess();
  }, []);

  // load once at mount
  const [{ storageKey, initialLoaded }, setMeta] = React.useState(() => {
    const { data, storageKey } = readLogsWithSource();
    return { storageKey, initialLoaded: data };
  });

  const [logs, setLogs] = React.useState(() => initialLoaded || []);
  const [editMode, setEditMode] = React.useState(false);

  // styles reused
  const thStyle = {
    textAlign: "center",
    padding: "8px 10px",
    verticalAlign: "middle",
  };
  const tdCenter = {
    textAlign: "center",
    padding: "8px 10px",
    verticalAlign: "middle",
  };
  const tdLeft = {
    textAlign: "left",
    padding: "8px 10px",
    verticalAlign: "middle",
  };

  /* ---------- admin edit helpers ---------- */

  // update a single field in a given row (by index)
  function updateField(idx, field, value) {
    setLogs((old) => {
      const copy = [...old];
      const row = { ...copy[idx] };
      row[field] = value;
      copy[idx] = row;
      return copy;
    });
  }

  // delete row
  function deleteRow(idx) {
    setLogs((old) => {
      const copy = [...old];
      copy.splice(idx, 1);
      return copy;
    });
  }

  // add blank row
  function addRow() {
    const blank = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now(),
      sellerName: "",
      sellerEmail: "",
      date: "",
      time: "",
      salesCount: "",
      numSales: "",
      customers: "",
      addressSentTo: "",
      address: "",
      notes: "",
      photoDataUrl: "",
    };
    setLogs((old) => [blank, ...old]);
  }

  // save all edits back to localStorage
  function saveAll() {
    writeLogs(storageKey, logs);
    alert("Saved to localStorage ✅");
  }

  // render either plain text (view mode) or inputs (edit mode)
  function CellInputText({ idx, field, placeholder, center }) {
    const val = logs[idx]?.[field] ?? "";
    if (!editMode) {
      return (
        <div
          style={{
            fontSize: center ? 12 : 12,
            fontWeight: field === "sellerName" ? 600 : 400,
            lineHeight: 1.4,
            wordBreak: "break-word",
            whiteSpace: "pre-wrap",
          }}
        >
          {val || "-"}
        </div>
      );
    }

    return (
      <input
        style={{
          width: "100%",
          fontSize: 12,
          lineHeight: 1.4,
          padding: "4px 6px",
          border: "1px solid var(--border)",
          borderRadius: 4,
          background: "var(--card)",
          color: "var(--text)",
        }}
        value={val}
        placeholder={placeholder || ""}
        onChange={(e) => updateField(idx, field, e.target.value)}
      />
    );
  }

  // textarea version for bigger fields
  function CellTextarea({ idx, field, placeholder }) {
    const val = logs[idx]?.[field] ?? "";
    if (!editMode) {
      return (
        <div
          style={{
            fontSize: 12,
            lineHeight: 1.4,
            wordBreak: "break-word",
            whiteSpace: "pre-wrap",
          }}
        >
          {val || "-"}
        </div>
      );
    }

    return (
      <textarea
        style={{
          width: "100%",
          minHeight: 60,
          fontSize: 12,
          lineHeight: 1.4,
          padding: "4px 6px",
          border: "1px solid var(--border)",
          borderRadius: 4,
          background: "var(--card)",
          color: "var(--text)",
        }}
        value={val}
        placeholder={placeholder || ""}
        onChange={(e) => updateField(idx, field, e.target.value)}
      />
    );
  }

  // special cell for seller (name + email stacked)
  function SellerCell({ idx }) {
    const row = logs[idx] || {};
    const nameVal = row.sellerName || row.sellerEmail || "";
    const emailVal = row.sellerEmail || "";

    if (!editMode) {
      return (
        <div style={{ fontSize: 12, lineHeight: 1.4 }}>
          <div style={{ fontWeight: 600 }}>
            {nameVal || "?"}
          </div>
          {emailVal ? (
            <div
              style={{
                fontSize: 11,
                color: "var(--muted)",
                fontWeight: 400,
                wordBreak: "break-word",
              }}
            >
              {emailVal}
            </div>
          ) : null}
        </div>
      );
    }

    // edit mode -> two stacked inputs
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <input
          style={{
            width: "100%",
            fontSize: 12,
            lineHeight: 1.4,
            padding: "4px 6px",
            border: "1px solid var(--border)",
            borderRadius: 4,
            background: "var(--card)",
            color: "var(--text)",
            fontWeight: 600,
          }}
          value={row.sellerName || ""}
          placeholder="Name"
          onChange={(e) => updateField(idx, "sellerName", e.target.value)}
        />
        <input
          style={{
            width: "100%",
            fontSize: 11,
            lineHeight: 1.4,
            padding: "4px 6px",
            border: "1px solid var(--border)",
            borderRadius: 4,
            background: "var(--card)",
            color: "var(--text)",
          }}
          value={row.sellerEmail || ""}
          placeholder="email@example.com"
          onChange={(e) => updateField(idx, "sellerEmail", e.target.value)}
        />
      </div>
    );
  }

  // special cell for photo
  function PhotoCell({ idx }) {
    const row = logs[idx] || {};
    const url = row.photoDataUrl || "";

    if (!editMode) {
      return (
        <div style={{ textAlign: "center" }}>
          {url ? (
            <img
              src={url}
              alt="proof"
              style={{
                width: 60,
                height: 60,
                objectFit: "cover",
                borderRadius: 6,
                border: "1px solid var(--border)",
                display: "block",
                margin: "0 auto",
              }}
            />
          ) : (
            <span style={{ color: "var(--muted)", fontSize: 12 }}>no photo</span>
          )}
        </div>
      );
    }

    // edit mode -> show preview + editable text field
    return (
      <div style={{ textAlign: "center" }}>
        {url ? (
          <img
            src={url}
            alt="proof"
            style={{
              width: 60,
              height: 60,
              objectFit: "cover",
              borderRadius: 6,
              border: "1px solid var(--border)",
              display: "block",
              margin: "0 auto 6px auto",
            }}
          />
        ) : null}

        <input
          style={{
            width: "100%",
            fontSize: 11,
            lineHeight: 1.4,
            padding: "4px 6px",
            border: "1px solid var(--border)",
            borderRadius: 4,
            background: "var(--card)",
            color: "var(--text)",
          }}
          value={url}
          placeholder="data:image/jpeg;base64,..."
          onChange={(e) => updateField(idx, "photoDataUrl", e.target.value)}
        />
      </div>
    );
  }

  return (
    <div className="grid" style={{ marginTop: -52 }}>
      <div className="card">
{/* Header row with title + edit mode */}
<div
  style={{
    display: "flex",
    flexDirection: "column",
    marginBottom: 12,
  }}
>
  {/* Top Row: Title and Edit Mode side-by-side */}
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      width: "100%",
    }}
  >
    {/* LEFT: Title/Description */}
    <div style={{ flex: "1 1 auto" }}>
      <h2 className="section-title" style={{ marginBottom: 4 }}>
        Review Neighborhood Submissions
      </h2>
      <p
        className="muted"
        style={{
          fontSize: 13,
          marginTop: -6,
          marginBottom: 0,
          lineHeight: 1.4,
        }}
      >
        Sellers / Hybrids submit proof they worked a neighborhood. You confirm
        they actually did it.
      </p>
    </div>

    {/* RIGHT: Edit Mode */}
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        minWidth: 160,
        marginRight: -60,
      }}
    >
      {/* Checkbox + Label */}
      <label
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 1, // 🟢 tightened spacing between box and text
          cursor: "pointer",
          userSelect: "none",
          fontSize: 12,
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        <input
          type="checkbox"
          checked={editMode}
          onChange={(e) => setEditMode(e.target.checked)}
          style={{
            margin: -12,
            transform: "scale(0.95)", // smaller checkbox for cleaner look
          }}
        />
        <span style={{ marginLeft: 2 }}>Edit Mode</span> {/* subtle tweak */}
      </label>

      {/* Buttons under it */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "flex-start",
          gap: 8,
          marginTop: 8,
          visibility: editMode ? "visible" : "hidden",
marginLeft: "-120px",
        }}
      >
        <button
          className="btn"
          style={{
            fontSize: 12,
            lineHeight: 1,
            padding: "6px 10px",
          }}
          onClick={addRow}
        >
          + Add Row
        </button>

        <button
          className="btn outline"
          style={{
            fontSize: 12,
            lineHeight: 1,
            padding: "6px 10px",
            borderColor: "var(--accent)",
            color: "var(--accent)",
          }}
          onClick={saveAll}
        >
          Save All Changes
        </button>
      </div>
    </div>
  </div>
</div>
        <table
          className="table"
          style={{
            width: "100%",
            tableLayout: "fixed",
            borderCollapse: "collapse",
          }}
        >
          <colgroup>
            <col style={{ width: "14%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "10%" }} />
          </colgroup>

          <thead>
            <tr>
              <th style={thStyle}>Employee</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Time</th>
              <th style={thStyle}># Sales</th>
              <th style={thStyle}>Customers</th>
              <th style={thStyle}>Address Sent To</th>
              <th style={thStyle}>Notes</th>
              <th style={thStyle}>Photo</th>
            </tr>
          </thead>

          <tbody>
            {logs.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    ...tdCenter,
                    color: "var(--muted)",
                    fontSize: 12,
                  }}
                >
                  No submissions yet.
                </td>
              </tr>
            )}

            {logs.map((row, idx) => {
              // figure out sales count consistently
              const salesVal =
                row.salesCount !== undefined && row.salesCount !== ""
                  ? row.salesCount
                  : row.numSales !== undefined && row.numSales !== ""
                  ? row.numSales
                  : "";

              return (
                <tr key={row.id || idx}>
                  {/* Employee */}
                  <td style={tdLeft}>
                    <SellerCell idx={idx} />
                  </td>

                  {/* Date */}
                  <td style={tdCenter}>
                    <CellInputText
                      idx={idx}
                      field="date"
                      placeholder="2025-11-01"
                      center
                    />
                  </td>

                  {/* Time */}
                  <td style={tdCenter}>
                    <CellInputText
                      idx={idx}
                      field="time"
                      placeholder="3:45 PM"
                      center
                    />
                  </td>

                  {/* # Sales */}
                  <td style={tdCenter}>
                    {editMode ? (
                      <input
                        style={{
                          width: "100%",
                          fontSize: 12,
                          lineHeight: 1.4,
                          padding: "4px 6px",
                          border: "1px solid var(--border)",
                          borderRadius: 4,
                          background: "var(--card)",
                          color: "var(--text)",
                          textAlign: "center",
                        }}
                        value={salesVal}
                        placeholder="0"
                        onChange={(e) => {
                          // when editing, write to both fields so either one persists
                          updateField(idx, "salesCount", e.target.value);
                          updateField(idx, "numSales", e.target.value);
                        }}
                      />
                    ) : (
                      <div style={{ fontSize: 12, fontWeight: 600 }}>
                        {salesVal || "-"}
                      </div>
                    )}
                  </td>

                  {/* Customers */}
                  <td style={tdLeft}>
                    <CellTextarea
                      idx={idx}
                      field="customers"
                      placeholder="House 1, House 2, House 3..."
                    />
                  </td>

                  {/* Address Sent To */}
                  <td style={tdLeft}>
                    {/* We let them edit addressSentTo, fallback to address for view */}
                    {editMode ? (
                      <CellTextarea
                        idx={idx}
                        field="addressSentTo"
                        placeholder="Sent lead list to: Jason / group text / etc"
                      />
                    ) : (
                      <div
                        style={{
                          fontSize: 12,
                          lineHeight: 1.4,
                          wordBreak: "break-word",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {row.addressSentTo || row.address || "-"}
                      </div>
                    )}
                  </td>

                  {/* Notes */}
                  <td style={tdLeft}>
                    <CellTextarea
                      idx={idx}
                      field="notes"
                      placeholder="Knocked cul-de-sac, HOA tried to kick me out, etc."
                    />
                  </td>

                  {/* Photo */}
                  <td style={{ ...tdCenter, verticalAlign: "top" }}>
                    <PhotoCell idx={idx} />

                    {editMode && (
                      <button
                        className="btn outline"
                        style={{
                          fontSize: 10,
                          lineHeight: 1,
                          padding: "4px 6px",
                          marginTop: 8,
                          borderColor: "var(--accent)",
                          color: "var(--accent)",
                          width: "100%",
                        }}
                        onClick={() => deleteRow(idx)}
                      >
                        delete row
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div
          style={{
            fontSize: 12,
            color: "var(--muted)",
            marginTop: 10,
            lineHeight: 1.4,
          }}
        >
          Edit Mode lets you fix bad data, add missing knocks, or clean up notes.
          Press "Save All Changes" to write it all into localStorage.
        </div>
      </div>
    </div>
  );
}