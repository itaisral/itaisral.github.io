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

  function leggi() { try { const s = JSON.parse(localStorage.getItem(CHIAVE) || "null"); return s && s.scade > Date.now() ? s : null; } catch (e) { return null; } }
  function salva(token, durata) { try { localStorage.setItem(CHIAVE, JSON.stringify({ token, scade: Date.now() + (durata - 60) * 1000 })); } catch (e) { } }
  function dimentica() { try { localStorage.removeItem(CHIAVE); } catch (e) { } }

  async function chiama(dati) {
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
      salva(j.token, j.durata || 21600);
      disegna(j); mostra("area");
    } catch (err) {
      esito(out, "Non riusciamo a contattare il server. Riprova fra poco.", "male");
    } finally { b.disabled = false; }
  });
  $("codice").addEventListener("input", e => { e.target.value = e.target.value.replace(/\D/g, "").slice(0, 6); });
  $("cambia").addEventListener("click", () => { mostra("email"); $("email").focus(); });
  $("rimanda").addEventListener("click", () => { mostra("email"); $("email").value = emailInserita; esito($("esito-email"), "Completa la verifica e chiedi un codice nuovo."); });

  $("esci").addEventListener("click", async () => {
    const s = leggi(); dimentica(); mostra("email");
    if (s) try { await chiama({ azione: "soci-esci", token: s.token }); } catch (e) { }
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
    return `<article class="tessera-carta${fondatore ? " fondatore" : ""}">
      <div class="tc-testa"><img src="/soci/logo-chiaro.svg" alt="">
        <div><span class="tc-ass">Associazione Italia Israele • Alessandria</span><span class="tc-he" lang="he" dir="rtl">עמותת איטליה־ישראל אלסנדריה</span></div></div>
      <div class="tc-corpo">
        <div>
          <p class="tc-etichetta">Tessera ${esc(t.anno)}</p>
          <p class="tc-numero">${esc(t.numero)}</p>
          <p class="tc-nome">${esc(t.nome)} ${esc(t.cognome)}</p>
          <p class="tc-qualifica">${esc(t.qualifica)}${fondatore ? ' <span lang="he" dir="rtl">מייסד</span>' : ""}</p>
          <p class="tc-validita">Valida fino al 31 dicembre ${esc(t.anno)}</p>
        </div>
        ${t.qr ? `<div class="tc-qr" title="Da mostrare agli incontri">${qr(t.qr)}</div>` : ""}
      </div>
    </article>`;
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

    const consensi = r.consensi || {};
    const sn = v => v ? "sì" : "no";
    $("dati").innerHTML = `
      <div><dt>Nome</dt><dd>${esc(r.nome)} ${esc(r.cognome)}</dd></div>
      <div><dt>Email</dt><dd>${esc(r.email)}</dd></div>
      ${r.cellulare ? `<div><dt>Cellulare</dt><dd>${esc(r.cellulare)}</dd></div>` : ""}
      ${r.indirizzo ? `<div><dt>Indirizzo</dt><dd>${esc(r.indirizzo)}</dd></div>` : ""}
      <div><dt>Consensi</dt><dd>Albo dei soci: ${sn(consensi.albo)} · Immagini: ${sn(consensi.immagini)} · Notizie per email: ${sn(consensi.newsletter)}</dd></div>`;
  }

  /* scaricamento di ricevute e documenti */
  document.addEventListener("click", async e => {
    const b = e.target.closest("[data-ricevuta],[data-documento]");
    if (!b) return;
    const s = leggi(); if (!s) { mostra("email"); return; }
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

  /* ---------- avvio ---------- */
  (async function () {
    const s = leggi();
    if (!s) { mostra("email"); return; }
    mostra("attesa");
    try {
      const j = await chiama({ azione: "soci-dati", token: s.token });
      if (j.ok) { disegna(j); mostra("area"); return; }
      dimentica();
    } catch (e) { }
    mostra("email");
  })();
})();
