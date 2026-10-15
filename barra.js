/* Associazione Italia Israele • Alessandria — comportamento della barra in alto (tutte le pagine) */
(function () {
  const barra = document.getElementById("barra-sito");
  if (!barra) return;
  const bottone = barra.querySelector(".menu-btn");
  const menu = barra.querySelector(".menu");
  const voci = barra.querySelectorAll(".voce");
  const stretto = () => window.matchMedia("(max-width: 1180px)").matches;

  function chiudiVoci(tranne) { voci.forEach(v => { if (v !== tranne) { v.classList.remove("aperta"); v.querySelector(".voce-btn").setAttribute("aria-expanded", "false"); } }); }
  function chiudiTutto() {
    menu.classList.remove("aperto"); bottone.setAttribute("aria-expanded", "false"); chiudiVoci();
  }

  bottone.addEventListener("click", () => {
    const aperto = menu.classList.toggle("aperto");
    bottone.setAttribute("aria-expanded", aperto ? "true" : "false");
    if (!aperto) chiudiVoci();
  });
  voci.forEach(v => {
    const b = v.querySelector(".voce-btn");
    b.addEventListener("click", e => {
      e.stopPropagation();
      const aperta = v.classList.toggle("aperta");
      b.setAttribute("aria-expanded", aperta ? "true" : "false");
      chiudiVoci(v);
    });
    v.addEventListener("mouseleave", () => { if (!stretto()) { v.classList.remove("aperta"); b.setAttribute("aria-expanded", "false"); } });
  });
  menu.addEventListener("click", e => { if (e.target.closest("a")) chiudiTutto(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") chiudiTutto(); });
  document.addEventListener("click", e => { if (!e.target.closest("#barra-sito")) chiudiTutto(); });

  const segna = () => barra.classList.toggle("scorsa", window.scrollY > 8);
  window.addEventListener("scroll", segna, { passive: true }); segna();

  // I collegamenti che portano fuori dal sito si aprono in una nuova scheda
  document.querySelectorAll("a[href^='http']").forEach(a => {
    if (a.host !== location.host) { a.target = "_blank"; a.rel = "noopener"; }
  });

  document.querySelectorAll("#piede-sito [data-anno]").forEach(el => el.textContent = new Date().getFullYear());
})();
