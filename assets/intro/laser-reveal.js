(() => {
  "use strict";

  // Expose une fonction simple pour l'intro.
  // Usage: await window.runLaserReveal({ duration: 1000, root: "#site-layer" })
  window.runLaserReveal = async function runLaserReveal(opts = {}) {
    const duration = Number(opts.duration ?? 1000);
    const rootSel = String(opts.root ?? "#site-layer");
    const excludeSel = String(opts.exclude ?? ".hero__bg, #background-canvas");

    const root = document.querySelector(rootSel);
    if (!root) return;

    // Cible : éléments raisonnables dans le site-layer.
    // On reste pragmatique : on évite d'ajouter sur TOUT (perf), mais on couvre bien le above-the-fold.
    const candidates = Array.from(root.querySelectorAll(
      "img, picture, svg, h1, h2, h3, p, a, button, li, section, article, header, nav, .hero-card, .process-card, .btn"
    ));

    const isExcluded = (el) => {
      if (!excludeSel) return false;
      try {
        return el.matches(excludeSel) || (!!el.closest(excludeSel));
      } catch {
        return false;
      }
    };

    const els = candidates
      .filter((el) => !isExcluded(el))
      .filter((el) => {
        // ignore éléments invisibles / pas dans le flux
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false;
        return true;
      });

    if (!els.length) return;

    // Ajoute la classe + configure les masks pour images
    for (const el of els) {
      el.classList.add("scan-reveal");

      // IMG => masque par alpha du fichier
      if (el.tagName === "IMG") {
        el.classList.add("is-image");
        const src = el.currentSrc || el.getAttribute("src");
        if (src) el.style.setProperty("--mask", `url(\"${src}\")`);
      }
    }

    // Uniquement dans le viewport
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          e.target.classList.toggle("is-inview", e.isIntersecting);
        }
      },
      { threshold: 0.01 }
    );
    els.forEach((el) => io.observe(el));

    // Animation scan sur hauteur d'écran
    const START_PAD = 80;
    const END_PAD = 120;

    const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    const randPercent = (min, max) => (min + Math.random() * (max - min)).toFixed(1) + "%";

    document.body.classList.add("laser-reveal-running");

    // place le site-layer en dessous de l'effet: on révèle via opacités
    for (const el of els) {
      el.style.setProperty("--reveal", "0");
      el.style.setProperty("--fx", "0");
    }

    const start = performance.now();

    await new Promise((resolve) => {
      function tick(now) {
        const vh = window.innerHeight || 800;
        const t = Math.min(1, (now - start) / Math.max(1, duration));
        const p = easeInOut(t);
        const scanY = -START_PAD + (vh + END_PAD + START_PAD) * p;
        const curtainY = (now * 0.6) % 220;

        for (const el of els) {
          if (!el.classList.contains("is-inview")) {
            el.style.setProperty("--fx", "0");
            continue;
          }

          const r = el.getBoundingClientRect();
          const localY = scanY - r.top;
          const margin = 90;
          const active = localY > -margin && localY < r.height + margin ? 1 : 0;

          // Révélation: quand la ligne dépasse le haut de l'élément
          const reveal = Math.max(0, Math.min(1, (scanY - r.top + 30) / 140));
          const flicker = 0.65 + Math.random() * 0.55;

          if (active) {
            el.style.setProperty("--sx1", randPercent(10, 30));
            el.style.setProperty("--sx2", randPercent(25, 45));
            el.style.setProperty("--sx3", randPercent(40, 60));
            el.style.setProperty("--sx4", randPercent(55, 75));
            el.style.setProperty("--sx5", randPercent(70, 92));
          }

          el.style.setProperty("--localY", `${localY.toFixed(1)}px`);
          el.style.setProperty("--fx", String(active));
          el.style.setProperty("--reveal", reveal.toFixed(3));
          el.style.setProperty("--flicker", flicker.toFixed(3));
          el.style.setProperty("--curtainY", `${curtainY.toFixed(1)}px`);
        }

        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          resolve();
        }
      }

      requestAnimationFrame(tick);
    });

    // Fin : tout visible, plus de FX
    for (const el of els) {
      el.style.setProperty("--reveal", "1");
      el.style.setProperty("--fx", "0");
      el.classList.remove("is-inview");
    }

    // ménage
    document.body.classList.remove("laser-reveal-running");
    io.disconnect();
  };
})();
