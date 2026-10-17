/* Associazione Italia Israele • Alessandria — area riservata ai soci */
(function () {
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzFYbCpoZimTdvpAxVC317WNIetut5U4ZqZiouJqHSp7VpubdsS5XxadIZyXqLHXPA6/exec";
  const TURNSTILE = "0x4AAAAAAFWsdikKgTl1PFvE";
  const CHIAVE = "area-soci";
  const $ = id => document.getElementById(id);

  /* ---------- utilità ---------- */
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const euro = n => Number(n).toLocaleString("it-IT") + " €";
  const giorno = s => { if (!s) return ""; const [y, m, d] = s.split("-").map(Number); return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" }).format(new Date(y, m - 1, d)); };
  const peso = n => n > 1048576 ? (n / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";

  /* la sessione vive solo in questa scheda: chiudendo il browser si perde */
  function leggi() { try { const s = JSON.parse(sessionStorage.getItem(CHIAVE) || "null"); return s && s.token ? s : null; } catch (e) { return null; } }
  function salva(token) { try { sessionStorage.setItem(CHIAVE, JSON.stringify({ token })); } catch (e) { } }
  function dimentica() { try { sessionStorage.removeItem(CHIAVE); } catch (e) { } }
  try { localStorage.removeItem(CHIAVE); } catch (e) { }   // vecchie sessioni salvate in modo permanente

  let demo = false;
  async function chiama(dati) {
    if (demo) return finta(dati);
    const r = await fetch(SCRIPT_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(dati) });
    return r.json();
  }
  function esito(el, testo, tipo) { el.className = "esito " + (tipo || ""); el.textContent = testo || ""; }

  /* ---------- Turnstile ---------- */
  let turnstileId = null;
  if (TURNSTILE && $("turnstile-area")) {
    window.avviaTurnstileArea = () => { turnstileId = turnstile.render("#turnstile-area", { sitekey: TURNSTILE, language: "it", theme: "light" }); };
    const sc = document.createElement("script");
    sc.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=avviaTurnstileArea";
    sc.async = true; document.head.appendChild(sc);
  }
  const token = () => (window.turnstile && turnstileId !== null) ? (turnstile.getResponse(turnstileId) || "") : "";
  const azzera = () => { if (window.turnstile && turnstileId !== null) turnstile.reset(turnstileId); };

  /* ---------- schermate ---------- */
  function mostra(quale) {
    $("accesso").hidden = quale === "area";
    $("area").hidden = quale !== "area";
    $("f-email").hidden = quale !== "email";
    $("f-codice").hidden = quale !== "codice";
    $("caricamento").hidden = quale !== "attesa";
    window.scrollTo(0, 0);
  }

  let emailInserita = "";

  $("f-email").addEventListener("submit", async e => {
    e.preventDefault();
    const out = $("esito-email"), b = e.submitter || e.target.querySelector("button[type=submit]");
    const email = $("email").value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { esito(out, "Controlla l'indirizzo email.", "male"); $("email").focus(); return; }
    if (TURNSTILE && !token()) { esito(out, "Attendi la verifica di sicurezza qui sopra, poi riprova.", "male"); return; }
    b.disabled = true; esito(out, "Invio in corso…");
    try {
      const j = await chiama({ azione: "soci-codice", email, sito: $("sito").value, turnstile: token() });
      azzera();
      if (!j.ok) { esito(out, (j.errore || "Qualcosa non ha funzionato") + ".", "male"); return; }
      emailInserita = email;
      $("email-scritta").textContent = email;
      $("codice").value = ""; esito($("esito-codice"), "");
      mostra("codice"); $("codice").focus();
    } catch (err) {
      azzera(); esito(out, "Non riusciamo a contattare il server. Riprova fra poco.", "male");
    } finally { b.disabled = false; }
  });

  $("f-codice").addEventListener("submit", async e => {
    e.preventDefault();
    const out = $("esito-codice"), b = e.submitter || e.target.querySelector("button[type=submit]");
    const codice = $("codice").value.replace(/\D/g, "");
    if (codice.length !== 6) { esito(out, "Il codice ha sei cifre.", "male"); return; }
    b.disabled = true; esito(out, "Controllo…");
    try {
      const j = await chiama({ azione: "soci-entra", email: emailInserita, codice });
      if (!j.ok) { esito(out, j.errore || "Il codice non è corretto.", "male"); return; }
      salva(j.token);
      disegna(j); mostra("area"); attivita();
    } catch (err) {
      esito(out, "Non riusciamo a contattare il server. Riprova fra poco.", "male");
    } finally { b.disabled = false; }
  });
  $("codice").addEventListener("input", e => { e.target.value = e.target.value.replace(/\D/g, "").slice(0, 6); });
  $("cambia").addEventListener("click", () => { mostra("email"); $("email").focus(); });
  $("rimanda").addEventListener("click", () => { mostra("email"); $("email").value = emailInserita; esito($("esito-email"), "Completa la verifica e chiedi un codice nuovo."); });

  async function esci(motivo) {
    if (demo) { demo = false; chiudiScanner(); $("demo-banner").hidden = true; mostra("email"); return; }
    const s = leggi(); dimentica(); chiudiAvviso(); chiudiScanner(); mostra("email");
    if (motivo) esito($("esito-email"), motivo);
    if (s) try { await chiama({ azione: "soci-esci", token: s.token }); } catch (e) { }
  }
  $("esci").addEventListener("click", () => esci());

  /* ---------- inattività: avviso a 5 minuti, uscita a 6 ---------- */
  const AVVISO = 5 * 60 * 1000, USCITA = 6 * 60 * 1000, RINNOVO = 2 * 60 * 1000;
  let ultima = Date.now(), ultimoRinnovo = Date.now(), avviso = null;
  function inArea() { return !$("area").hidden && !!leggi(); }
  function attivita() {
    if (avviso) return;                       // con l'avviso aperto conta solo «Continua»
    ultima = Date.now();
    if (inArea() && Date.now() - ultimoRinnovo > RINNOVO) rinnova();
  }
  async function rinnova() {
    const s = leggi(); if (!s) return;
    ultimoRinnovo = Date.now();
    try { const j = await chiama({ azione: "soci-rinnova", token: s.token }); if (j.scaduta) esci("La sessione è scaduta. Chiedi un codice nuovo per rientrare."); } catch (e) { }
  }
  ["pointerdown", "keydown", "scroll", "touchstart", "mousemove"].forEach(ev =>
    document.addEventListener(ev, attivita, { passive: true }));
  function apriAvviso() {
    avviso = document.createElement("div");
    avviso.className = "avviso-sessione";
    avviso.setAttribute("role", "alertdialog"); avviso.setAttribute("aria-modal", "true");
    avviso.innerHTML = `<div class="as-box">
      <h3>Sei ancora qui?</h3>
      <p>Per la tua sicurezza usciamo dall’area soci fra <b id="as-secondi">60</b> secondi.</p>
      <div class="as-azioni"><button type="button" class="bottone" id="as-continua">Continua</button>
      <button type="button" class="bottone chiaro" id="as-esci">Esci</button></div></div>`;
    document.body.appendChild(avviso);
    $("as-continua").addEventListener("click", () => { chiudiAvviso(); ultima = Date.now(); rinnova(); });
    $("as-esci").addEventListener("click", () => esci());
    $("as-continua").focus();
  }
  function chiudiAvviso() { if (avviso) { avviso.remove(); avviso = null; } }
  setInterval(() => {
    if (!inArea()) { chiudiAvviso(); return; }
    const ferma = Date.now() - ultima;
    if (ferma >= USCITA) { esci("Sei uscito dall’area soci dopo sei minuti di inattività."); return; }
    if (ferma >= AVVISO && !avviso) apriAvviso();
    if (avviso) { const el = $("as-secondi"); if (el) el.textContent = Math.max(0, Math.ceil((USCITA - ferma) / 1000)); }
  }, 1000);

  /* chiudendo la pagina o il browser la sessione si chiude anche sul server */
  window.addEventListener("pagehide", () => {
    const s = leggi(); if (!s) return;
    dimentica();
    try { navigator.sendBeacon(SCRIPT_URL, JSON.stringify({ azione: "soci-esci", token: s.token })); } catch (e) { }
  });

  /* ---------- area ---------- */
  function qr(testo) {
    if (!window.qrcode) return "";
    const q = qrcode(0, "M"); q.addData(testo); q.make();
    return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  }

  function carta(t) {
    const pagata = t.stato === "Pagata";
    const fondatore = t.qualifica === "Fondatore";
    if (!pagata) {
      const p = t.pagamento || {};
      return `<article class="tessera-attesa">
        <p class="occhiello">${t.tipo === "Rinnovo" ? "Rinnovo" : "Nuova tessera"} ${esc(t.anno)}</p>
        <h3>${t.numero ? "Tessera " + esc(t.numero) + ", " : ""}manca solo la quota</h3>
        <p>Abbiamo ricevuto la tua domanda${t.dataDomanda ? " del " + giorno(t.dataDomanda) : ""}. Quota ${esc((t.fascia || "").toLowerCase())}, <b>${euro(t.importo)}</b>.</p>
        <dl class="pagamento">
          <div><dt>Bonifico</dt><dd>IBAN ${esc(p.iban)}<br>intestato a ${esc(p.intestatario)}<br>causale: ${esc(p.causale)}</dd></div>
          ${p.satispay ? `<div><dt>Satispay</dt><dd><a href="${esc(p.satispay)}" rel="noopener">Paga con Satispay</a></dd></div>` : ""}
          ${p.paypal ? `<div><dt>PayPal o carta</dt><dd><a href="${esc(p.paypal)}" rel="noopener">Paga online</a></dd></div>` : ""}
        </dl>
      </article>`;
    }
    return `<div class="tessera-spazio"><article class="tessera-carta" aria-label="Tessera dell’Associazione Italia Israele • Alessandria">
      <div class="tc-dati">
        <p class="tc-etichetta">Tessera ${esc(t.anno)}</p>
        <p class="tc-numero">${esc(t.numero)}</p>
        <p class="tc-nome">${esc(t.nome)} ${esc(t.cognome)}</p>
        <p class="tc-qualifica">${esc(t.qualifica)}${fondatore ? ' <span lang="he" dir="rtl">מייסד</span>' : ""}</p>
        <p class="tc-validita">Valida fino al 31 dicembre ${esc(t.anno)}</p>
      </div>
      ${t.qr ? `<div class="tc-qr" title="Da mostrare agli incontri">${qr(t.qr)}</div>` : ""}
    </article></div>`;
  }

  function disegna(d) {
    const tessere = d.tessere || [];
    const r = d.recapiti || {};
    $("saluto").textContent = r.nome ? "Shalom, " + r.nome : "Shalom";
    $("tessere").innerHTML = tessere.length ? tessere.map(carta).join("") : '<p class="vuoto">Non troviamo tessere collegate a questo indirizzo.</p>';

    const ricevute = tessere.filter(t => t.ricevuta);
    $("ricevute").innerHTML = ricevute.length ? ricevute.map(t =>
      `<li><button type="button" class="riga-file" data-ricevuta="${esc(t.ricevuta)}">
        <span class="rf-nome">Ricevuta ${esc(t.ricevuta)}</span>
        <span class="rf-info">Tessera ${esc(t.numero)} · ${euro(t.importo)} · ${giorno(t.dataPagamento)}</span>
      </button></li>`).join("") : '<li class="vuoto">Le ricevute compaiono qui dopo il pagamento della quota.</li>';

    const docs = d.documenti || [];
    $("documenti").innerHTML = docs.length ? docs.map(x =>
      `<li><button type="button" class="riga-file" data-documento="${esc(x.id)}">
        <span class="rf-nome">${esc(x.nome)}</span>
        <span class="rf-info">${giorno(x.data)}${x.peso ? " · " + peso(x.peso) : ""}</span>
      </button></li>`).join("") : '<li class="vuoto">Per ora non ci sono documenti. Qui troverai convocazioni, verbali e bilanci.</li>';

    disegnaRiunioni(d.riunioni || []);
    $("blocco-ingressi").hidden = !(d.ruoli && d.ruoli.ingressi);

    const consensi = r.consensi || {};
    const sn = v => v ? "sì" : "no";
    $("dati").innerHTML = `
      <div><dt>Nome</dt><dd>${esc(r.nome)} ${esc(r.cognome)}</dd></div>
      <div><dt>Email</dt><dd>${esc(r.email)}</dd></div>
      ${r.cellulare ? `<div><dt>Cellulare</dt><dd>${esc(r.cellulare)}</dd></div>` : ""}
      ${r.indirizzo ? `<div><dt>Indirizzo</dt><dd>${esc(r.indirizzo)}</dd></div>` : ""}
      <div><dt>Consensi</dt><dd>Immagini: ${sn(consensi.immagini)} · Notizie per email: ${sn(consensi.newsletter)}</dd></div>`;
  }

  /* scaricamento di ricevute e documenti */
  document.addEventListener("click", async e => {
    const b = e.target.closest("[data-ricevuta],[data-documento]");
    if (!b) return;
    const s = demo ? { token: "" } : leggi(); if (!s) { mostra("email"); return; }
    const dati = b.dataset.ricevuta ? { azione: "soci-ricevuta", token: s.token, codice: b.dataset.ricevuta }
                                    : { azione: "soci-documento", token: s.token, id: b.dataset.documento };
    b.classList.add("in-corso"); b.disabled = true;
    try {
      const j = await chiama(dati);
      if (j.scaduta) { dimentica(); mostra("email"); esito($("esito-email"), "La sessione è scaduta. Chiedi un codice nuovo.", "male"); return; }
      if (!j.ok) { alertino(b, j.errore || "Non riusciamo a scaricare il file."); return; }
      const bin = atob(j.dati), u = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([u], { type: j.tipo || "application/octet-stream" }));
      const a = document.createElement("a"); a.href = url; a.download = j.nome || "documento"; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000);
    } catch (err) { alertino(b, "Non riusciamo a contattare il server."); }
    finally { b.classList.remove("in-corso"); b.disabled = false; }
  });
  function alertino(b, testo) {
    const p = document.createElement("span"); p.className = "rf-errore"; p.textContent = testo;
    b.appendChild(p); setTimeout(() => p.remove(), 5000);
  }

  /* ---------- riunioni in videoconferenza ---------- */
  let riunioni = [];
  const ANTICIPO = 15 * 60 * 1000;
  const fmtGiorno = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome" });
  const fmtOra = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
  const fmtNum = new Intl.DateTimeFormat("it-IT", { day: "numeric", timeZone: "Europe/Rome" });
  const fmtMese = new Intl.DateTimeFormat("it-IT", { month: "short", timeZone: "Europe/Rome" });

  function statoRiunione(x) {
    const inizio = new Date(x.inizio).getTime(), fine = inizio + x.durata * 60000, ora = Date.now();
    if (!x.online) return { testo: "In presenza", attivo: false };
    if (ora < inizio - ANTICIPO) return { testo: "Collegamento dalle " + fmtOra.format(new Date(inizio - ANTICIPO)), attivo: false };
    if (ora <= fine + ANTICIPO) return { testo: ora < inizio ? "Collegati, si comincia alle " + fmtOra.format(new Date(inizio)) : "Collegati, è in corso", attivo: true };
    return { testo: "Conclusa", attivo: false };
  }

  function disegnaRiunioni(lista) {
    riunioni = lista;
    $("riunioni").innerHTML = lista.length ? lista.map(x => {
      const d = new Date(x.inizio), st = statoRiunione(x);
      const direttivo = x.tipo === "Consiglio direttivo";
      return `<article class="riunione${direttivo ? " direttivo" : ""}" data-id="${esc(x.id)}">
        <div class="ri-data"><span class="ri-giorno">${fmtNum.format(d)}</span><span class="ri-mese">${fmtMese.format(d).replace(".", "")}</span></div>
        <div class="ri-corpo">
          <p class="ri-tipo">${esc(x.tipo)}${direttivo ? ' <span class="ri-riservata">riservata al direttivo</span>' : ""}</p>
          <h4>${esc(x.titolo)}</h4>
          <p class="ri-quando">${fmtGiorno.format(d)}, ore ${fmtOra.format(d)} · ${esc(x.durata)} minuti${x.luogo ? " · " + esc(x.luogo) : ""}</p>
          ${x.odg && x.odg.length ? `<details class="ri-odg"><summary>Ordine del giorno</summary><ol>${x.odg.map(p => `<li>${esc(p)}</li>`).join("")}</ol></details>` : ""}
          ${x.online ? `<div class="ri-azioni"><button type="button" class="bottone ri-entra" data-riunione="${esc(x.id)}"${st.attivo ? "" : " disabled"}>${esc(st.testo)}</button><span class="ri-msg" role="status"></span></div>` : ""}
        </div>
      </article>`;
    }).join("") : '<p class="vuoto">Nessuna riunione in programma. Le convocazioni compariranno qui.</p>';
  }
  setInterval(() => {                       // i pulsanti si accendono da soli all'ora giusta
    if ($("area").hidden) return;
    document.querySelectorAll(".ri-entra").forEach(b => {
      const x = riunioni.find(r => String(r.id) === b.dataset.riunione); if (!x || b.classList.contains("in-corso")) return;
      const st = statoRiunione(x); b.disabled = !st.attivo; b.textContent = st.testo;
    });
  }, 20000);

  document.addEventListener("click", async e => {
    const b = e.target.closest("[data-riunione]"); if (!b) return;
    const s = demo ? { token: "" } : leggi(); if (!s) { mostra("email"); return; }
    const msg = b.parentNode.querySelector(".ri-msg");
    const finestra = demo ? null : window.open("", "_blank");   // aperta subito, altrimenti il browser la blocca
    b.classList.add("in-corso"); b.disabled = true; msg.textContent = "";
    try {
      const j = await chiama({ azione: "soci-riunione", token: s.token, id: b.dataset.riunione });
      if (j.scaduta) { if (finestra) finestra.close(); esci("La sessione è scaduta. Chiedi un codice nuovo per rientrare."); return; }
      if (!j.ok) { if (finestra) finestra.close(); msg.textContent = j.errore || "Collegamento non disponibile."; return; }
      if (finestra) { finestra.opener = null; finestra.location.href = j.link; } else location.href = j.link;
    } catch (err) { if (finestra) finestra.close(); msg.textContent = "Non riusciamo a contattare il server."; }
    finally { b.classList.remove("in-corso"); const x = riunioni.find(r => String(r.id) === b.dataset.riunione); if (x) b.disabled = !statoRiunione(x).attivo; }
  });

  /* ---------- controllo delle tessere agli ingressi ---------- */
  let scanner = null;
  function caricaLettore() {
    if (window.jsQR) return Promise.resolve();
    return new Promise((ok, ko) => { const sc = document.createElement("script"); sc.src = "/lib/jsqr.js?v=1.4.0"; sc.onload = ok; sc.onerror = ko; document.head.appendChild(sc); });
  }
  async function apriScanner() {
    const box = document.createElement("div");
    box.className = "scanner"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", "Controllo delle tessere");
    box.innerHTML = `<div class="sc-testa"><b>Controllo ingressi</b><button type="button" class="sc-chiudi" aria-label="Chiudi">✕</button></div>
      <div class="sc-video"><video playsinline muted></video><div class="sc-mirino"></div></div>
      <div class="sc-esito" aria-live="assertive"><p class="sc-aiuto">Inquadra il codice QR della tessera.</p></div>
      ${demo ? '<button type="button" class="bottone chiaro sc-prova">Prova con la tessera di esempio</button>' : ""}`;
    document.body.appendChild(box);
    scanner = { box, video: box.querySelector("video"), canvas: document.createElement("canvas"), fermo: false, ultimo: "", quando: 0, flusso: null };
    box.querySelector(".sc-chiudi").addEventListener("click", chiudiScanner);
    const prova = box.querySelector(".sc-prova");
    if (prova) prova.addEventListener("click", () => controlla(QR_DEMO));
    try {
      await caricaLettore();
      scanner.flusso = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      scanner.video.srcObject = scanner.flusso; await scanner.video.play();
      requestAnimationFrame(leggiFotogramma);
    } catch (err) {
      mostraEsito("no", "Fotocamera non disponibile", "Consenti l'uso della fotocamera al sito e riprova.");
    }
  }
  function chiudiScanner() {
    if (!scanner) return;
    if (scanner.flusso) scanner.flusso.getTracks().forEach(t => t.stop());
    scanner.box.remove(); scanner = null;
  }
  function leggiFotogramma() {
    if (!scanner) return;
    const v = scanner.video;
    if (!scanner.fermo && v.readyState === v.HAVE_ENOUGH_DATA) {
      const w = Math.min(640, v.videoWidth), h = Math.round(v.videoHeight * w / v.videoWidth);
      scanner.canvas.width = w; scanner.canvas.height = h;
      const ctx = scanner.canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(v, 0, 0, w, h);
      const q = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" });
      if (q && q.data && !(q.data === scanner.ultimo && Date.now() - scanner.quando < 4000)) controlla(q.data);
    }
    requestAnimationFrame(leggiFotogramma);
  }
  function mostraEsito(tipo, titolo, testo, nome) {
    if (!scanner) return;
    scanner.box.querySelector(".sc-esito").innerHTML = `<div class="sc-risultato ${tipo}">
      <div class="sc-segno">${tipo === "si" ? "✓" : "✕"}</div>
      <div><p class="sc-titolo">${esc(titolo)}</p>${nome ? `<p class="sc-nome">${esc(nome)}</p>` : ""}<p class="sc-dettaglio">${esc(testo)}</p></div></div>
      <button type="button" class="bottone sc-avanti">Avanti</button>`;
    scanner.box.querySelector(".sc-avanti").addEventListener("click", () => {
      scanner.fermo = false; scanner.box.querySelector(".sc-esito").innerHTML = '<p class="sc-aiuto">Inquadra il codice QR della tessera.</p>';
    });
  }
  async function controlla(dato) {
    if (!scanner) return;
    scanner.fermo = true; scanner.ultimo = dato; scanner.quando = Date.now(); ultima = Date.now();
    const m = /\/soci\/verifica\/#(\d{3}\.\d{4}\.[A-Za-z0-9_-]{12})$/.exec(dato);
    if (!m) { mostraEsito("no", "Non è una tessera", "Questo codice QR non appartiene a una tessera dell'associazione."); return; }
    scanner.box.querySelector(".sc-esito").innerHTML = '<p class="sc-aiuto">Controllo…</p>';
    if (navigator.vibrate) navigator.vibrate(60);
    const s = demo ? { token: "" } : leggi();
    if (!s) { chiudiScanner(); mostra("email"); return; }
    try {
      const j = await chiama({ azione: "soci-controllo", token: s.token, codice: m[1] });
      if (j.scaduta) { chiudiScanner(); esci("La sessione è scaduta. Chiedi un codice nuovo per rientrare."); return; }
      if (!j.ok) { mostraEsito("no", "Controllo non riuscito", j.errore || ""); return; }
      if (!j.valida) { mostraEsito("no", "Tessera non valida", j.motivo || ""); return; }
      const dettaglio = "Tessera " + j.numero + " · " + j.anno + " · " + (j.qualifica || "");
      if (j.gia) { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); mostraEsito("no", "Già entrata alle " + j.gia, dettaglio + ". Controlla il documento.", j.nome); return; }
      mostraEsito("si", "Tessera valida", dettaglio, j.nome);
    } catch (err) { mostraEsito("no", "Controllo non riuscito", "Non riusciamo a contattare il server."); }
  }
  $("apri-scanner").addEventListener("click", apriScanner);
  setInterval(() => { if (scanner && !demo) { ultima = Date.now(); if (Date.now() - ultimoRinnovo > RINNOVO) rinnova(); } }, 30000);   // alla porta l'area resta aperta

  /* ---------- dimostrazione con dati di prova, senza contattare il server ---------- */
  const QR_DEMO = "https://italiaisraeleal.it/soci/verifica/#026.2027.DIMOSTRAZION";
  function datiDemo() {
    const ora = new Date();
    const consiglio = new Date(ora.getTime() - 5 * 60000);
    const assemblea = new Date(ora.getFullYear(), ora.getMonth(), ora.getDate() + 12, 21, 0);
    return {
      recapiti: { nome: "Anna", cognome: "Esempio", email: "anna.esempio@example.com", cellulare: "+39 333 000 0000",
                  indirizzo: "Via dell'Esempio 1, 15121 Alessandria (AL), Italia", consensi: { immagini: true, newsletter: true } },
      tessere: [{ numero: "026", anno: "2027", stato: "Pagata", tipo: "Nuova adesione", qualifica: "Socio del rilancio", fascia: "Ordinario",
                  importo: 54, nome: "Anna", cognome: "Esempio", dataDomanda: "2026-10-20", dataPagamento: "2026-10-22", metodo: "Bonifico",
                  ricevuta: "2027-026", qr: QR_DEMO }],
      documenti: [{ id: "d1", nome: "Statuto dell'associazione.pdf", data: "2026-10-01", peso: 245760 },
                  { id: "d2", nome: "Convocazione dell'assemblea ordinaria.pdf", data: "2026-10-15", peso: 98304 },
                  { id: "d3", nome: "Verbale del consiglio direttivo.pdf", data: "2026-10-10", peso: 131072 }],
      riunioni: [
        { id: 1, tipo: "Consiglio direttivo", titolo: "Consiglio direttivo", inizio: consiglio.toISOString(), durata: 60, luogo: "Solo online", online: true,
          odg: ["Programma degli incontri di novembre", "Revisione dello statuto", "Varie ed eventuali"] },
        { id: 2, tipo: "Assemblea dei soci", titolo: "Assemblea ordinaria", inizio: assemblea.toISOString(), durata: 90, luogo: "Sede dell'associazione e online", online: true,
          odg: ["Approvazione del nuovo statuto", "Programma delle attività 2027", "Varie ed eventuali"] }],
      ruoli: { direttivo: true, carica: "Consigliere", ingressi: true }
    };
  }
  const entrateDemo = {};
  function finta(d) {
    switch (d.azione) {
      case "soci-riunione": return Promise.resolve({ ok: false, errore: "Nella dimostrazione il collegamento non si apre. Qui partirebbe la videoconferenza su Google Meet." });
      case "soci-controllo": return new Promise(ok => setTimeout(() => {
        if (d.codice !== "026.2027.DIMOSTRAZION") return ok({ ok: true, valida: false, motivo: "Nella dimostrazione si riconosce solo la tessera di esempio." });
        const r = { ok: true, valida: true, nome: "Anna Esempio", numero: "026", anno: "2027", qualifica: "Socio del rilancio" };
        if (entrateDemo[d.codice]) r.gia = entrateDemo[d.codice];
        else entrateDemo[d.codice] = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(new Date());
        ok(r);
      }, 500));
      case "soci-ricevuta": case "soci-documento": return Promise.resolve({ ok: false, errore: "Nella dimostrazione i file non si scaricano." });
    }
    return Promise.resolve({ ok: true });
  }
  if ($("dimostrazione")) $("dimostrazione").addEventListener("click", () => {
    demo = true; disegna(datiDemo()); $("demo-banner").hidden = false; mostra("area");
  });

  /* ---------- avvio ---------- */
  (async function () {
    const s = leggi();
    if (!s) { mostra("email"); return; }
    mostra("attesa");
    try {
      const j = await chiama({ azione: "soci-dati", token: s.token });
      if (j.ok) { disegna(j); mostra("area"); ultima = ultimoRinnovo = Date.now(); return; }
      dimentica();
    } catch (e) { }
    mostra("email");
  })();
})();
