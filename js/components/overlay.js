// Overlay engine (single overlay root). Not wired by default.
// Use this for future "pages" overlays (About/Contact/Models) and to unify modals.
let root, backdrop, content, closeBtn;
let isOpen = false;
let prevOverflow = "";

function ensureDOM() {
  if (root) return;
  root = document.getElementById("overlay-root");
  if (!root) return;
  backdrop = root.querySelector(".overlay-backdrop");
  content = root.querySelector(".overlay-content");
  closeBtn = root.querySelector("[data-overlay-close]");
  if (backdrop) backdrop.addEventListener("click", close);
  if (closeBtn) closeBtn.addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) close();
  });
}

export function open(nodeOrHtml, { ariaLabel = "Overlay" } = {}) {
  ensureDOM();
  if (!root || !content) return;
  content.innerHTML = "";
  if (typeof nodeOrHtml === "string") {
    content.innerHTML = nodeOrHtml;
  } else if (nodeOrHtml && nodeOrHtml.nodeType) {
    content.appendChild(nodeOrHtml);
  }
  root.setAttribute("aria-hidden", "false");
  root.setAttribute("aria-label", ariaLabel);
  root.classList.add("is-open");
  prevOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  isOpen = true;
}

export function close() {
  ensureDOM();
  if (!root || !content) return;
  root.classList.remove("is-open");
  root.setAttribute("aria-hidden", "true");
  content.innerHTML = "";
  document.body.style.overflow = prevOverflow;
  isOpen = false;
}

export function isOverlayOpen() { return isOpen; }
