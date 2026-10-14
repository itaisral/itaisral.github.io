/* Controllo di una tessera dal QR: italiaisraeleal.it/soci/verifica/#numero.anno.firma */
(function () {
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzFYbCpoZimTdvpAxVC317WNIetut5U4ZqZiouJqHSp7VpubdsS5XxadIZyXqLHXPA6/exec";
  const box = document.getElementById("verifica");
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const codice = decodeURIComponent(location.hash.slice(1));
  const ko = motivo => {
    box.className = "verifica-esito no";
    box.innerHTML = `<div class="ve-segno">✕</div><h2>Tessera non valida</h2><p>${esc(motivo)}</p>`;
  };
  if (!codice) { ko("Inquadra il codice QR della tessera digitale."); return; }
  fetch(SCRIPT_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ azione: "soci-tessera", codice }) })
    .then(r => r.json())
    .then(j => {
      if (!j.ok) return ko(j.errore || "Controllo non riuscito.");
      if (!j.valida) return ko(j.motivo || "Codice non riconosciuto.");
      box.className = "verifica-esito si";
      box.innerHTML = `<div class="ve-segno">✓</div><h2>Tessera valida</h2>
        <p class="ve-nome">${esc(j.nome)}</p>
        <p>Tessera <b>${esc(j.numero)}</b> · anno ${esc(j.anno)}<br>${esc(j.qualifica)}</p>`;
    })
    .catch(() => ko("Non riusciamo a contattare il server. Riprova fra poco."));
})();
