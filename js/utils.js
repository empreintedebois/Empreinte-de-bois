// js/utils.js
export async function fetchJSON(url, { cache = "no-store" } = {}) {
  const res = await fetch(url, { cache });
  if (!res.ok) throw new Error(`Impossible de charger ${url}: ${res.status}`);
  return await res.json();
}

export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function escapeHTML(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
