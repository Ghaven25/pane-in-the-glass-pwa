// src/lib/db.js
import { supabase } from "../supabase";

function getUser() {
  try { return JSON.parse(localStorage.getItem("pane_user") || "null"); }
  catch { return null; }
}
const roleOf = (u) => u?.role;
const isAdmin  = (u) => roleOf(u) === "admin";
const isSeller = (u) => roleOf(u) === "seller";
const isWorker = (u) => roleOf(u) === "worker";
const isHybrid = (u) => roleOf(u) === "hybrid";

/** Inserts with created_by_email auto-filled */
async function insert(table, values) {
  const u = getUser();
  const payload = { ...values };
  if (!payload.created_by_email && u?.email) payload.created_by_email = u.email;

  const { data, error } = await supabase.from(table).insert(payload).select("*").single();
  if (error) throw error;
  return data;
}

/** Role-aware select (Admin = all; Seller = own; Worker = assigned; Hybrid = both) */
async function select(table, { extra, order = { column: "created_at", ascending: false } } = {}) {
  const u = getUser();
  let q = supabase.from(table).select("*");

  if (!isAdmin(u)) {
    if (isSeller(u)) q = q.eq("created_by_email", u?.email || "");
    else if (isWorker(u)) q = q.eq("assigned_to_email", u?.email || "");
    else if (isHybrid(u)) q = q.or(`created_by_email.eq.${u?.email},assigned_to_email.eq.${u?.email}`);
    else q = q.eq("created_by_email", u?.email || "");
  }

  if (order?.column) q = q.order(order.column, { ascending: !!order.ascending });
  if (typeof extra === "function") q = extra(q);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

/** Emit a workflow event; trigger in DB updates the real table */
async function emit(entity_type, action, entity_id, payload = {}) {
  const u = getUser();
  const { data, error } = await supabase
    .from("events")
    .insert({
      entity_type,
      action,
      entity_id,
      payload,
      created_by_email: u?.email || null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Realtime listener (call once at app startup) */
function listen(onAnyEvent) {
  const ch = supabase
    .channel("events-stream")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "events" },
      () => onAnyEvent?.()
    )
    .subscribe();
  return () => supabase.removeChannel(ch);
}

export default { insert, select, emit, listen, getUser, isAdmin, isSeller, isWorker, isHybrid };