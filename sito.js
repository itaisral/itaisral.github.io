/* Associazione Italia Israele • Alessandria — comportamenti comuni del sito */
(function () {
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzFYbCpoZimTdvpAxVC317WNIetut5U4ZqZiouJqHSp7VpubdsS5XxadIZyXqLHXPA6/exec";
  const INFO = "info@italiaisraeleal.it";
  const AVVIO = Date.now();
  const TURNSTILE = "0x4AAAAAAFWsdikKgTl1PFvE";   // chiave pubblica Cloudflare Turnstile

  /* comparsa dolce delle sezioni */
  const elementi = document.querySelectorAll(".compare");
  if ("IntersectionObserver" in window) {
    const oss = new IntersectionObserver(voci => voci.forEach(v => {
      if (v.isIntersecting) { v.target.classList.add("vista"); oss.unobserve(v.target); }
    }), { rootMargin: "0px 0px -8% 0px", threshold: .08 });
    elementi.forEach(el => oss.observe(el));
  } else elementi.forEach(el => el.classList.add("vista"));

  /* modulo Scrivici */
  const form = document.querySelector("form.scrivici");
  if (!form) return;

  // i riquadri dei recapiti portano al modulo con l'argomento già scelto
  document.querySelectorAll(".recapito[data-argomento]").forEach(a => a.addEventListener("click", e => {
    const scelta = form.elements.argomento;
    if (![...scelta.options].some(o => o.value === a.dataset.argomento)) return;
    e.preventDefault();
    scelta.value = a.dataset.argomento;
    document.getElementById("scrivici").scrollIntoView({ behavior: "smooth", block: "start" });
    const campo = scelta.closest(".campo");
    campo.classList.remove("evidenzia"); void campo.offsetWidth; campo.classList.add("evidenzia");
  }));
  const esito = form.querySelector(".esito");
  const invia = form.querySelector("button[type=submit]");
  const val = n => (form.elements[n].value || "").trim();

  function messaggio(testo, tipo, html) {
    esito.className = "esito " + (tipo || "");
    if (html) esito.innerHTML = html; else esito.textContent = testo;
  }
  function errore(testo, ...campi) {
    form.querySelectorAll(".errore").forEach(c => c.classList.remove("errore"));
    campi.forEach(c => (c.closest(".campo") || c.closest(".consenso") || c).classList.add("errore"));
    if (campi[0]) campi[0].focus();
    messaggio(testo, "male");
    return false;
  }
  function riserva() {
    const oggetto = encodeURIComponent("Dal sito · " + val("argomento"));
    const corpo = encodeURIComponent(val("messaggio") + "\n\n" + val("nome"));
    messaggio("", "male", "Non siamo riusciti a inviare il messaggio da qui. Puoi mandarlo direttamente a " +
      '<a href="mailto:' + INFO + "?subject=" + oggetto + "&body=" + corpo + '">' + INFO + "</a>, lo abbiamo già preparato.");
  }

  /* verifica di sicurezza Cloudflare Turnstile */
  let turnstileId = null;
  const box = document.getElementById("turnstile-scrivici");
  if (TURNSTILE && box) {
    window.avviaTurnstileScrivici = () => {
      turnstileId = turnstile.render(box, { sitekey: TURNSTILE, language: "it", theme: "light" });
    };
    const sc = document.createElement("script");
    sc.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=avviaTurnstileScrivici";
    sc.async = true; sc.defer = true;
    document.head.appendChild(sc);
  }
  const token = () => (window.turnstile && turnstileId !== null) ? (turnstile.getResponse(turnstileId) || "") : "";
  const azzera = () => { if (window.turnstile && turnstileId !== null) turnstile.reset(turnstileId); };

  form.addEventListener("input", e => {
    const c = e.target.closest(".campo, .consenso"); if (c) c.classList.remove("errore");
  });

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const el = form.elements;
    if (!val("nome")) return errore("Scrivi il tuo nome.", el.nome);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val("email"))) return errore("Controlla l'indirizzo email.", el.email);
    if (val("messaggio").length < 5) return errore("Il messaggio è vuoto.", el.messaggio);
    if (!el.consenso.checked) return errore("Serve il consenso al trattamento dei dati per poterti rispondere.", el.consenso);
    if (TURNSTILE && box && !token()) return errore("Attendi la verifica di sicurezza qui sopra, poi invia.", box);
    form.querySelectorAll(".errore").forEach(c => c.classList.remove("errore"));

    invia.disabled = true; messaggio("Invio in corso…");
    const dati = { azione: "contatto", nome: val("nome"), email: val("email"), argomento: val("argomento"),
      messaggio: val("messaggio"), sito: el.sito.value, tempo: Date.now() - AVVIO, turnstile: token() };
    try {
      const r = await fetch(SCRIPT_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(dati) });
      const j = await r.json();
      if (j.ok && j.contatto) {
        form.innerHTML = '<div class="grazie"><div class="tondo"><svg class="icona" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>' +
          "<h3>Grazie, messaggio ricevuto</h3><p>Ti risponderemo all'indirizzo che ci hai lasciato.</p></div>";
        return;
      }
      if (j.ok === false && j.errore && j.errore !== "Tipo non valido") { messaggio(j.errore + ".", "male"); azzera(); invia.disabled = false; return; }
      riserva(); azzera();
    } catch (err) {
      riserva(); azzera();
    }
    invia.disabled = false;
  });
})();
