(function () {
  const root = document.getElementById("modal-root");
  const openBtn = document.getElementById("btn-matrice");
  if (!root || !openBtn) return;

  const overlay = root.querySelector(".modal__overlay");
  const closeBtns = root.querySelectorAll("[data-close]");

  let lastActive = null;

  function openModal() {
    lastActive = document.activeElement;
    root.setAttribute("aria-hidden", "false");
    const closeBtn = root.querySelector(".modal__close");
    if (closeBtn) closeBtn.focus();
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    root.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastActive && typeof lastActive.focus === "function") {
      lastActive.focus();
    } else {
      openBtn.focus();
    }
  }

  openBtn.addEventListener("click", openModal);
  overlay?.addEventListener("click", closeModal);
  closeBtns.forEach((btn) => btn.addEventListener("click", closeModal));

  document.addEventListener("keydown", (evt) => {
    if (evt.key === "Escape" && root.getAttribute("aria-hidden") === "false") {
      closeModal();
    }
  });
})();
