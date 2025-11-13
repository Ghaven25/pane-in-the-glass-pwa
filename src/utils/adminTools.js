// src/utils/adminTools.js
export function getUser() {
  try {
    return JSON.parse(localStorage.getItem("pane_user") || "null");
  } catch {
    return null;
  }
}

export function isAdmin() {
  const u = getUser();
  return u && u.role === "admin";
}

export function allowEdit() {
  const u = getUser();
  return !!u && u.role === "admin";
}

export function requireAdminAccess() {
  const u = getUser();
  if (!u || u.role !== "admin") {
    alert("Access restricted to admin.");
    window.location.href = "/";
  }
}