/* Calendario ebraico: data di oggi, Shabbat ad Alessandria, prossime feste.
   I dati di feste e parashot sono calcolati al momento della pubblicazione (window.FESTE, window.PARASHOT);
   gli orari dello Shabbat sono calcolati qui, dal tramonto ad Alessandria. */
(function () {
  const FESTE = window.FESTE || [], PARASHOT = window.PARASHOT || {};
  const LAT = 44.9124, LON = 8.6154;
  const MESI = { Tishri: "Tishrì", Heshvan: "Cheshvan", Kislev: "Kislev", Tevet: "Tevet", Shevat: "Shevat", "Adar I": "Adar I",
    "Adar II": "Adar II", Adar: "Adar", Nisan: "Nissan", Iyar: "Iyar", Sivan: "Sivan", Tamuz: "Tammuz", Av: "Av", Elul: "Elul" };
  const MESI_HE = { Tishri: "תשרי", Heshvan: "חשוון", Kislev: "כסלו", Tevet: "טבת", Shevat: "שבט", "Adar I": "אדר א׳",
    "Adar II": "אדר ב׳", Adar: "אדר", Nisan: "ניסן", Iyar: "אייר", Sivan: "סיוון", Tamuz: "תמוז", Av: "אב", Elul: "אלול" };
  function gematria(n) {
    const C = ["", "ק", "ר", "ש", "ת", "תק", "תר", "תש", "תת", "תתק"], D = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"],
          U = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
    let r = n % 100, s = C[Math.floor(n / 100)];
    if (r === 15) s += "טו"; else if (r === 16) s += "טז"; else s += D[Math.floor(r / 10)] + U[r % 10];
    return s.length === 1 ? s + "׳" : s.slice(0, -1) + "״" + s.slice(-1);
  }
  const t = id => document.getElementById(id);
  const oggi = new Date();
  const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const giorno = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };

  /* oggi */
  try {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-u-ca-hebrew", { day: "numeric", month: "long", year: "numeric" })
      .formatToParts(oggi).map(x => [x.type, x.value]));
    t("oggi-it").textContent = p.day + " " + (MESI[p.month] || p.month) + " " + p.year;
    t("oggi-he").textContent = gematria(Number(p.day)) + " ב" + (MESI_HE[p.month] || "") + " " + gematria(Number(p.year) % 1000);
  } catch (e) { }
  t("oggi-civile").textContent = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(oggi);

  /* feste dei prossimi dodici mesi */
  const fmt = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
  const fmtBreve = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "long" });
  const oggiIso = iso(oggi);
  const limite = new Date(oggi); limite.setFullYear(limite.getFullYear() + 1);
  t("feste").innerHTML = FESTE.filter(f => f.fine >= oggiIso && giorno(f.inizio) <= limite).map(f => {
    const a = giorno(f.inizio), b = giorno(f.fine);
    const quando = f.inizio === f.fine ? fmt.format(a)
      : (a.getFullYear() === b.getFullYear() ? fmtBreve.format(a) : fmt.format(a)) + " – " + fmt.format(b);
    const inCorso = f.inizio <= oggiIso && f.fine >= oggiIso;
    return `<li class="cal-festa ${f.tipo}${inCorso ? " in-corso" : ""}">
      <div class="cal-quando"><span class="cal-data">${quando}</span><span class="cal-data-ebr">${f.ebr}</span></div>
      <div class="cal-nome"><span class="cal-tr">${f.tr}</span><span class="cal-it">${f.it}</span></div>
      <div class="cal-he" lang="he" dir="rtl">${f.he}</div>
      ${inCorso ? '<span class="cal-oggi-tag">in corso</span>' : ""}
    </li>`;
  }).join("");

  /* ---------- Shabbat ad Alessandria ----------
     Posizione del sole con l'algoritmo della NOAA (lo stesso usato da Hebcal).
     Candele: 18 minuti prima del tramonto (sole a 90,833° dallo zenit), al minuto per difetto.
     Havdalà: sole a 8,5° sotto l'orizzonte, uscita di tre stelle, al minuto più vicino. */
  const r = Math.PI / 180;
  function quandoIlSole(data, zenit) {
    const jd0 = Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()) / 864e5 + 2440587.5;
    let min = 720 - 4 * LON;
    for (let i = 0; i < 3; i++) {
      const T = (jd0 + min / 1440 - 2451545) / 36525;
      const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;
      const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
      const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
      const C = Math.sin(M * r) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(2 * M * r) * (0.019993 - 0.000101 * T) + Math.sin(3 * M * r) * 0.000289;
      const om = 125.04 - 1934.136 * T;
      const lam = L0 + C - 0.00569 - 0.00478 * Math.sin(om * r);
      const eps = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60 + 0.00256 * Math.cos(om * r);
      const dec = Math.asin(Math.sin(eps * r) * Math.sin(lam * r));
      const y = Math.tan(eps * r / 2) ** 2;
      const eqt = 4 / r * (y * Math.sin(2 * L0 * r) - 2 * e * Math.sin(M * r) + 4 * e * y * Math.sin(M * r) * Math.cos(2 * L0 * r) - 0.5 * y * y * Math.sin(4 * L0 * r) - 1.25 * e * e * Math.sin(2 * M * r));
      const ha = Math.acos(Math.cos(zenit * r) / (Math.cos(LAT * r) * Math.cos(dec)) - Math.tan(LAT * r) * Math.tan(dec)) / r;
      min = 720 - 4 * LON - eqt + 4 * ha;
    }
    return new Date(Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()) + min * 60000);
  }
  // venerdì di questo Shabbat: il sabato vale fino all'Havdalà
  const venerdi = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate());
  const gs = oggi.getDay();
  if (gs === 6) {
    venerdi.setDate(venerdi.getDate() - 1);
    if (oggi > quandoIlSole(oggi, 98.5)) venerdi.setDate(venerdi.getDate() + 7);
  } else venerdi.setDate(venerdi.getDate() + ((5 - gs + 7) % 7));
  const sabato = new Date(venerdi); sabato.setDate(sabato.getDate() + 1);
  const candele = new Date(quandoIlSole(venerdi, 90.833).getTime() - 18 * 60000);
  const havdala = new Date(quandoIlSole(sabato, 98.5).getTime() + 30000);
  const ora = d => new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" }).format(d);
  const data = d => new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Rome" }).format(d);
  const p = PARASHOT[iso(sabato)];
  t("shabbat").innerHTML =
    (p ? `<p class="cal-parasha"><span lang="he" dir="rtl">${p[1]}</span><span>Parashà ${p[0]}</span></p>` : "") +
    `<dl class="cal-orari">
       <div><dt>Accensione delle candele</dt><dd><span class="cal-ora">${ora(candele)}</span>${data(candele)}</dd></div>
       <div><dt>Havdalà</dt><dd><span class="cal-ora">${ora(havdala)}</span>${data(havdala)}</dd></div>
     </dl>`;
})();
