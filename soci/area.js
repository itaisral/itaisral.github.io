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
    if (quale !== "area" && $("sala")) $("sala").hidden = true;
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
    chiudiSala();
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
    if (!x.online && !x.sala) return { testo: "In presenza", attivo: false };
    const coda = x.sala ? 60 * 60000 : ANTICIPO;
    if (ora < inizio - ANTICIPO) return { testo: (x.sala ? "La sala apre alle " : "Collegamento dalle ") + fmtOra.format(new Date(inizio - ANTICIPO)), attivo: false };
    if (ora <= fine + coda) return { testo: x.sala ? "Entra nella sala" : (ora < inizio ? "Collegati, si comincia alle " + fmtOra.format(new Date(inizio)) : "Collegati, è in corso"), attivo: true };
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
          ${x.online || x.sala ? `<div class="ri-azioni"><button type="button" class="bottone ri-entra" ${x.sala ? "data-sala" : "data-riunione"}="${esc(x.id)}"${st.attivo ? "" : " disabled"}>${esc(st.testo)}</button><span class="ri-msg" role="status"></span></div>` : ""}
          ${x.sala ? '<p class="ri-nota">Video, ordine del giorno e voto nella stessa pagina, dal computer o dal telefono.</p>' : ""}
        </div>
      </article>`;
    }).join("") : '<p class="vuoto">Nessuna riunione in programma. Le convocazioni compariranno qui.</p>';
  }
  setInterval(() => {                       // i pulsanti si accendono da soli all'ora giusta
    if ($("area").hidden) return;
    document.querySelectorAll(".ri-entra").forEach(b => {
      const x = riunioni.find(r => String(r.id) === (b.dataset.riunione || b.dataset.sala)); if (!x || b.classList.contains("in-corso")) return;
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

  /* ---------- sala riunioni: video, ordine del giorno, voto, verbale ---------- */
  let sala = null;   // { id, dati, jitsi, timer, scelta, firma }

  document.addEventListener("click", e => {
    const b = e.target.closest("[data-sala]"); if (!b) return;
    entraInSala(b.dataset.sala, b);
  });

  async function entraInSala(id, b) {
    const s = demo ? { token: "" } : leggi(); if (!s) { mostra("email"); return; }
    const msg = b && b.parentNode.querySelector(".ri-msg");
    if (b) { b.disabled = true; b.classList.add("in-corso"); }
    try {
      const j = await chiama({ azione: "soci-sala", token: s.token, id });
      if (j.scaduta) { esci("La sessione è scaduta. Chiedi un codice nuovo per rientrare."); return; }
      if (!j.ok) { if (msg) msg.textContent = j.errore || "Sala non disponibile."; return; }
      apriSala(id, j);
    } catch (err) { if (msg) msg.textContent = "Non riusciamo a contattare il server."; }
    finally { if (b) { b.classList.remove("in-corso"); b.disabled = false; } }
  }

  function apriSala(id, j) {
    sala = { id, dati: j, jitsi: null, timer: null, scelta: null, firma: "" };
    const r = j.riunione, d = new Date(r.inizio);
    $("area").hidden = true; $("sala").hidden = false;
    $("sala").innerHTML = `
      ${demo ? '<p class="demo-banner">Dimostrazione: il video è simulato, le votazioni funzionano con dati di prova.</p>' : ""}
      <div class="sala-testa">
        <div>
          <p class="ri-tipo">${esc(r.tipo)}</p>
          <h2>${esc(r.titolo)}</h2>
          <p class="ri-quando">${fmtGiorno.format(d)}, ore ${fmtOra.format(d)} · <span id="sala-presenti"></span></p>
        </div>
        <button type="button" class="bottone chiaro" id="sala-esci">Esci dalla sala</button>
      </div>
      <div class="sala-griglia">
        <div class="sala-video" id="sala-video"></div>
        <aside class="sala-lato">
          <section class="sala-voto" id="sala-voto" aria-live="polite"></section>
          ${r.odg && r.odg.length ? `<section class="sala-blocco"><h3>Ordine del giorno</h3><ol>${r.odg.map(p => `<li>${esc(p)}</li>`).join("")}</ol></section>` : ""}
          <section class="sala-blocco" id="sala-esiti" hidden><h3>Votazioni concluse</h3><div id="sala-esiti-elenco"></div></section>
          ${j.conduce ? `<section class="sala-blocco sala-conduci" id="sala-conduci">
            <h3>Conduzione</h3>
            <div id="conduci-apri">
              <label for="v-oggetto">Oggetto della votazione</label>
              <input id="v-oggetto" maxlength="300" placeholder="Approvazione del bilancio 2026">
              <div class="v-tipo" role="radiogroup" aria-label="Tipo di voto">
                <label><input type="radio" name="v-tipo" value="Palese" checked> Palese</label>
                <label><input type="radio" name="v-tipo" value="Segreta"> Segreta</label>
              </div>
              <label for="v-opzioni">Scelte <span class="piccolo">(vuoto: favorevole, contrario, astenuto · per un’elezione un nome per riga)</span></label>
              <textarea id="v-opzioni" rows="3"></textarea>
              <button type="button" class="bottone" id="v-apri">Apri la votazione</button>
            </div>
            <div id="conduci-chiudi" hidden>
              <p id="conduci-conta"></p>
              <button type="button" class="bottone" id="v-chiudi">Chiudi la votazione</button>
            </div>
            <p class="ri-msg" id="conduci-msg" role="status"></p>
            <button type="button" class="bottone chiaro" id="v-verbale">Scarica la bozza del verbale</button>
          </section>` : ""}
        </aside>
      </div>`;
    $("sala-esci").addEventListener("click", chiudiSala);
    if (j.conduce) {
      $("v-apri").addEventListener("click", () => conduci({ comando: "apri", oggetto: $("v-oggetto").value,
        tipo: (document.querySelector("input[name=v-tipo]:checked") || {}).value, opzioni: $("v-opzioni").value }));
      $("v-chiudi").addEventListener("click", () => conduci({ comando: "chiudi" }));
      $("v-verbale").addEventListener("click", scaricaVerbale);
    }
    avviaVideo(j);
    aggiornaSala(j);
    sala.timer = setInterval(sondaSala, 8000);
    window.scrollTo(0, 0);
  }

  function chiudiSala() {
    if (!sala) return;
    clearInterval(sala.timer);
    if (sala.jitsi) try { sala.jitsi.dispose(); } catch (e) { }
    sala = null;
    $("sala").hidden = true; $("sala").innerHTML = ""; $("area").hidden = false;
    window.scrollTo(0, 0);
  }

  function avviaVideo(j) {
    const box = $("sala-video");
    if (demo) {
      const nomi = ["Anna Esempio", "Bruno Esempio", "Carla Esempio", "Dario Esempio", "Elena Esempio", "Franco Esempio"];
      box.innerHTML = `<div class="video-finto">${nomi.map(n => `<div class="vf-riquadro"><span>${n.split(" ").map(x => x[0]).join("")}</span><small>${n}</small></div>`).join("")}</div>
        <p class="video-nota">Qui compare la videoconferenza, dentro la pagina.</p>`;
      return;
    }
    if (!j.video) {
      box.innerHTML = '<div class="video-assente"><p>La videoconferenza non è ancora attiva.</p><p class="piccolo">Puoi seguire l’ordine del giorno e votare da qui.</p></div>';
      return;
    }
    box.innerHTML = '<div class="video-assente"><p>Collegamento al video…</p></div>';
    const sc = document.createElement("script");
    sc.src = j.video.script;
    sc.onload = () => {
      if (!sala) return;
      box.innerHTML = "";
      sala.jitsi = new JitsiMeetExternalAPI(j.video.dominio, {
        roomName: j.video.stanza, jwt: j.video.jwt, parentNode: box, width: "100%", height: "100%", lang: "it",
        userInfo: { displayName: j.nome },
        configOverwrite: { prejoinConfig: { enabled: false }, disableDeepLinking: true, startWithAudioMuted: true,
          toolbarButtons: ["microphone", "camera", "tileview", "raisehand", "chat", "fullscreen", "settings", "hangup"] },
        interfaceConfigOverwrite: { MOBILE_APP_PROMO: false, SHOW_JITSI_WATERMARK: false }
      });
    };
    sc.onerror = () => { box.innerHTML = '<div class="video-assente"><p>Il video non si carica.</p><p class="piccolo">Controlla la connessione. Puoi comunque votare da qui.</p></div>'; };
    document.head.appendChild(sc);
  }

  async function sondaSala() {
    if (!sala) return;
    ultima = Date.now();                        // in riunione l'area resta aperta
    const s = demo ? { token: "" } : leggi(); if (!s) { chiudiSala(); mostra("email"); return; }
    try {
      const j = await chiama({ azione: "soci-sala-stato", token: s.token, id: sala.id });
      if (j.scaduta) { chiudiSala(); esci("La sessione è scaduta. Chiedi un codice nuovo per rientrare."); return; }
      if (j.chiusa) { $("sala-voto").innerHTML = '<div class="voto-vuoto"><p>La sala è chiusa.</p></div>'; clearInterval(sala.timer); return; }
      if (j.ok) aggiornaSala(j);
    } catch (e) { }
  }

  const ETICHETTE = { Favorevole: "favorevole", Contrario: "contrario", Astenuto: "astenuto" };
  function aggiornaSala(j) {
    if (!sala) return;
    $("sala-presenti").textContent = (j.presenti || 0) + (j.presenti === 1 ? " presente" : " presenti");
    const v = j.votazione;
    const firma = v ? [v.id, v.votato, v.puoVotare].join("|") : "nessuna";
    const boxVoto = $("sala-voto");
    if (firma !== sala.firma) {
      if (v && v.id !== (sala.firma.split("|")[0]) && navigator.vibrate) navigator.vibrate(120);
      sala.firma = firma; sala.scelta = null;
      if (!v) boxVoto.innerHTML = '<div class="voto-vuoto"><p>Nessuna votazione aperta.</p><p class="piccolo">Quando viene aperta una votazione, i pulsanti compaiono qui.</p></div>';
      else disegnaVoto(v);
    }
    const conta = boxVoto.querySelector(".voto-conta"); if (conta && v) conta.textContent = contaVoti(v.voti);
    // conduzione
    if (sala.dati.conduce) {
      $("conduci-apri").hidden = !!v; $("conduci-chiudi").hidden = !v;
      if (v) $("conduci-conta").textContent = "Votazione n. " + v.n + " aperta · " + contaVoti(v.voti);
    }
    // esiti
    const chiuse = j.chiuse || [];
    $("sala-esiti").hidden = !chiuse.length;
    $("sala-esiti-elenco").innerHTML = chiuse.slice().reverse().map(c => {
      const tot = c.opzioni.reduce((s, o) => s + Number(c.conteggio[o] || 0), 0) || 1;
      return `<div class="esito-voto"><p class="ev-titolo">${esc(c.n)}. ${esc(c.oggetto)} <span>${c.tipo === "Segreta" ? "segreta" : "palese"}</span></p>
        ${c.opzioni.map(o => { const n = Number(c.conteggio[o] || 0); return `<div class="ev-riga"><span class="ev-nome">${esc(o)}</span>
          <span class="ev-barra"><span style="width:${Math.round(n / tot * 100)}%"></span></span><b>${n}</b></div>`; }).join("")}</div>`;
    }).join("");
  }
  const contaVoti = n => (n || 0) + (n === 1 ? " voto raccolto" : " voti raccolti");

  function disegnaVoto(v) {
    const box = $("sala-voto");
    const testa = `<p class="voto-etichetta">Votazione n. ${esc(v.n)} · ${v.tipo === "Segreta" ? "voto segreto" : "voto palese"}</p><h3>${esc(v.oggetto)}</h3>`;
    if (!v.puoVotare) { box.innerHTML = testa + `<p>Puoi seguire la votazione, ma non hai diritto di voto.${v.motivo ? " " + esc(v.motivo) : ""}</p><p class="voto-conta"></p>`; return; }
    if (v.votato) {
      box.innerHTML = testa + `<div class="voto-fatto"><span>✓</span><p>${v.tipo === "Segreta" ? "Il tuo voto segreto è stato registrato." : "Hai votato «" + esc(v.votato) + "»."}</p></div><p class="voto-conta"></p>`;
      return;
    }
    if (sala.scelta) {
      box.innerHTML = testa + `<p class="voto-conferma">Hai scelto <b>${esc(sala.scelta)}</b>.</p>
        <button type="button" class="bottone voto-grande" id="voto-ok">Conferma il voto</button>
        <button type="button" class="bottone chiaro voto-grande" id="voto-cambia">Cambia</button><p class="voto-conta"></p>`;
      $("voto-ok").addEventListener("click", () => vota(v));
      $("voto-cambia").addEventListener("click", () => { sala.scelta = null; disegnaVoto(v); });
      return;
    }
    box.innerHTML = testa + `<div class="voto-scelte">${v.opzioni.map(o =>
      `<button type="button" class="voto-scelta ${ETICHETTE[o] || ""}" data-scelta="${esc(o)}">${esc(o)}</button>`).join("")}</div><p class="voto-conta"></p>`;
    box.querySelectorAll("[data-scelta]").forEach(b => b.addEventListener("click", () => { sala.scelta = b.dataset.scelta; disegnaVoto(v); }));
  }

  async function vota(v) {
    const s = demo ? { token: "" } : leggi(); if (!s) return;
    const b = $("voto-ok"); b.disabled = true; b.textContent = "Invio…";
    try {
      const j = await chiama({ azione: "soci-voto", token: s.token, id: sala.id, votazione: v.id, voto: sala.scelta });
      if (j.scaduta) { chiudiSala(); esci("La sessione è scaduta. Chiedi un codice nuovo per rientrare."); return; }
      if (!j.ok) { b.disabled = false; b.textContent = "Conferma il voto"; $("sala-voto").querySelector(".voto-conta").textContent = j.errore || "Voto non registrato."; return; }
      sala.firma = ""; aggiornaSala(j);
    } catch (e) { b.disabled = false; b.textContent = "Conferma il voto"; }
  }

  async function conduci(dati) {
    const s = demo ? { token: "" } : leggi(); if (!s) return;
    $("conduci-msg").textContent = "";
    try {
      const j = await chiama(Object.assign({ azione: "soci-sala-conduci", token: s.token, id: sala.id }, dati));
      if (j.scaduta) { chiudiSala(); esci("La sessione è scaduta. Chiedi un codice nuovo per rientrare."); return; }
      if (!j.ok) { $("conduci-msg").textContent = j.errore || "Operazione non riuscita."; return; }
      if (dati.comando === "apri") { $("v-oggetto").value = ""; $("v-opzioni").value = ""; }
      aggiornaSala(j);
    } catch (e) { $("conduci-msg").textContent = "Non riusciamo a contattare il server."; }
  }

  /* bozza del verbale in formato Word, da completare e firmare */
  async function scaricaVerbale() {
    const s = demo ? { token: "" } : leggi(); if (!s) return;
    try {
      const j = await chiama({ azione: "soci-verbale", token: s.token, id: sala.id });
      if (!j.ok) { $("conduci-msg").textContent = j.errore || "Verbale non disponibile."; return; }
      const r = j.riunione, data = giorno(r.data);
      const organo = r.tipo === "Consiglio direttivo" ? "il consiglio direttivo" : "l’assemblea dei soci";
      const piccola = x => ["Favorevole", "Contrario", "Astenuto", "Scheda bianca"].indexOf(x) >= 0 ? x.toLowerCase() : x;
      const voti = (c, o) => o.map(x => `${esc(piccola(x))} ${Number(c[x] || 0)}`).join(", ");
      const sede = r.luogo && !/online/i.test(r.luogo) ? " presso " + esc(r.luogo) + " e" : "";
      const html = `<html><head><meta charset="utf-8"><style>body{font-family:Calibri,Arial,sans-serif;font-size:12pt;line-height:1.5}
        h1{font-size:16pt} h2{font-size:13pt;margin-top:18pt} .nota{color:#777;font-size:10pt}</style></head><body>
        <p class="nota">Bozza generata dalla sala riunioni del sito, da completare e firmare.</p>
        <h1>Verbale ${r.tipo === "Consiglio direttivo" ? "del consiglio direttivo" : "dell’assemblea dei soci"} del ${data}</h1>
        <p>Il giorno ${data}, alle ore ${esc(r.ora)}, si è riunito ${organo}${sede} in videoconferenza attraverso la sala riunioni del sito dell’Associazione Italia Israele • Alessandria, per discutere il seguente ordine del giorno.</p>
        <ol>${r.odg.map(p => `<li>${esc(p)}</li>`).join("")}</ol>
        <p>Presiede ________________. Funge da segretario ________________.</p>
        <h2>Presenti (${j.presenze.length})</h2>
        <ul>${j.presenze.map(p => `<li>${esc(p.nome)}, in collegamento dalle ${esc(p.entrato)} alle ${esc(p.ultimo)}</li>`).join("")}</ul>
        <h2>Votazioni</h2>
        ${j.votazioni.length ? j.votazioni.map(v => `<p><b>${v.n}. ${esc(v.oggetto)}</b><br>Voto ${v.tipo === "Segreta" ? "segreto" : "palese"}, aperto alle ${esc(v.aperta)}${v.chiusa ? " e chiuso alle " + esc(v.chiusa) : ""}. Risultato: ${voti(v.conteggio, v.opzioni)}.</p>
          ${v.palesi.length ? `<ul>${v.palesi.map(x => `<li>${esc(x.nome)}, ${esc(piccola(x.voto))}</li>`).join("")}</ul>` : ""}
          <p>Esito: ________________________________</p>`).join("") : "<p>Nessuna votazione.</p>"}
        <h2>Discussione</h2><p>________________________________</p>
        <p style="margin-top:30pt">Il presidente ____________________ &nbsp;&nbsp;&nbsp; Il segretario ____________________</p>
        </body></html>`;
      const url = URL.createObjectURL(new Blob(["﻿" + html], { type: "application/msword" }));
      const a = document.createElement("a"); a.href = url; a.download = `Bozza verbale ${r.titolo} ${r.data}.doc`;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000);
    } catch (e) { $("conduci-msg").textContent = "Non riusciamo a contattare il server."; }
  }

  /* ---------- sala nella dimostrazione: altri cinque partecipanti finti votano da soli ---------- */
  const salaDemo = { votazioni: [], n: 0 };
  function statoDemo() {
    const aperta = salaDemo.votazioni.find(v => v.stato === "Aperta");
    const tot = v => Object.values(v.conteggio).reduce((a, b) => a + b, 0);
    return { ok: true, presenti: 6,
      votazione: aperta ? { id: aperta.id, n: aperta.n, oggetto: aperta.oggetto, tipo: aperta.tipo, opzioni: aperta.opzioni, votato: aperta.mio, puoVotare: true, voti: tot(aperta) } : null,
      chiuse: salaDemo.votazioni.filter(v => v.stato === "Chiusa").map(v => ({ id: v.id, n: v.n, oggetto: v.oggetto, tipo: v.tipo, opzioni: v.opzioni, conteggio: v.conteggio })) };
  }
  function salaFinta(d) {
    const ora = () => new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(new Date());
    if (d.azione === "soci-sala") {
      const x = (datiDemo().riunioni || []).find(r => String(r.id) === String(d.id)) || datiDemo().riunioni[0];
      return Object.assign({ nome: "Anna Esempio", conduce: true, video: null, riunione: x }, statoDemo());
    }
    if (d.azione === "soci-sala-stato") return statoDemo();
    if (d.azione === "soci-sala-conduci") {
      if (d.comando === "apri") {
        if (salaDemo.votazioni.some(v => v.stato === "Aperta")) return { ok: false, errore: "C'è già una votazione aperta. Chiudila prima." };
        if (!String(d.oggetto || "").trim()) return { ok: false, errore: "Scrivi l'oggetto della votazione." };
        let opzioni = String(d.opzioni || "").split("\n").map(x => x.trim()).filter(Boolean);
        if (!opzioni.length) opzioni = ["Favorevole", "Contrario", "Astenuto"]; else opzioni.push("Scheda bianca");
        const v = { id: "D" + (++salaDemo.n), n: salaDemo.n, oggetto: d.oggetto.trim(), tipo: d.tipo === "Segreta" ? "Segreta" : "Palese",
                    opzioni, stato: "Aperta", conteggio: {}, mio: "", palesi: [], aperta: ora(), chiusa: "" };
        salaDemo.votazioni.push(v);
        ["Bruno Esempio", "Carla Esempio", "Dario Esempio", "Elena Esempio", "Franco Esempio"].forEach((nome, i) => setTimeout(() => {
          if (v.stato !== "Aperta") return;
          const o = opzioni[i < 3 ? 0 : Math.floor(Math.random() * opzioni.length)];
          v.conteggio[o] = (v.conteggio[o] || 0) + 1; if (v.tipo === "Palese") v.palesi.push({ nome, voto: o });
          if (sala) aggiornaSala(statoDemo());
        }, 1500 + i * 1300));
      } else {
        const v = salaDemo.votazioni.find(x => x.stato === "Aperta");
        if (!v) return { ok: false, errore: "Nessuna votazione aperta." };
        v.stato = "Chiusa"; v.chiusa = ora();
      }
      return statoDemo();
    }
    if (d.azione === "soci-voto") {
      const v = salaDemo.votazioni.find(x => x.id === d.votazione && x.stato === "Aperta");
      if (!v) return { ok: false, errore: "La votazione è chiusa." };
      v.conteggio[d.voto] = (v.conteggio[d.voto] || 0) + 1; v.mio = v.tipo === "Palese" ? d.voto : "segreto";
      if (v.tipo === "Palese") v.palesi.unshift({ nome: "Anna Esempio", voto: d.voto });
      return statoDemo();
    }
    if (d.azione === "soci-verbale") {
      const x = datiDemo().riunioni[0], i = new Date(x.inizio);
      return { ok: true, riunione: { tipo: x.tipo, titolo: x.titolo, data: i.toISOString().slice(0, 10), ora: fmtOra.format(i), luogo: x.luogo, odg: x.odg },
        presenze: ["Anna Esempio", "Bruno Esempio", "Carla Esempio", "Dario Esempio", "Elena Esempio", "Franco Esempio"].map(nome => ({ nome, entrato: fmtOra.format(i), ultimo: ora() })),
        votazioni: salaDemo.votazioni.map(v => ({ n: v.n, oggetto: v.oggetto, tipo: v.tipo, opzioni: v.opzioni, conteggio: v.conteggio, aperta: v.aperta, chiusa: v.chiusa, palesi: v.tipo === "Palese" ? v.palesi : [] })) };
    }
    return null;
  }

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
        { id: 1, tipo: "Consiglio direttivo", titolo: "Consiglio direttivo", inizio: consiglio.toISOString(), durata: 60, luogo: "Solo online", sala: true,
          odg: ["Programma degli incontri di novembre", "Revisione dello statuto", "Varie ed eventuali"] },
        { id: 2, tipo: "Assemblea dei soci", titolo: "Assemblea ordinaria", inizio: assemblea.toISOString(), durata: 90, luogo: "Sede dell'associazione e online", sala: true,
          odg: ["Approvazione del nuovo statuto", "Programma delle attività 2027", "Varie ed eventuali"] }],
      ruoli: { direttivo: true, carica: "Presidente", ingressi: true, conduce: true }
    };
  }
  const entrateDemo = {};
  function finta(d) {
    const sf = salaFinta(d); if (sf) return new Promise(ok => setTimeout(() => ok(sf), 250));
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
