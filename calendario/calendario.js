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
     Posizione del sole con le formule astronomiche standard (le stesse di SunCalc).
     Tramonto: sole a −0,833° (bordo superiore, con la rifrazione). Havdalà: sole a −8,5°, uscita di tre stelle. */
  const rad = Math.PI / 180, dayMs = 864e5, J1970 = 2440588, J2000 = 2451545, J0 = 0.0009, obl = rad * 23.4397;
  const toDays = d => d.valueOf() / dayMs - 0.5 + J1970 - J2000;
  const fromJulian = j => new Date((j + 0.5 - J1970) * dayMs);
  function quandoIlSole(data, alt) {
    const lw = rad * -LON, phi = rad * LAT, d = toDays(data);
    const n = Math.round(d - J0 - lw / (2 * Math.PI));
    const ds = J0 + lw / (2 * Math.PI) + n;
    const M = rad * (357.5291 + 0.98560028 * ds);
    const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
    const L = M + C + rad * 102.9372 + Math.PI;
    const dec = Math.asin(Math.sin(0) * Math.cos(obl) + Math.cos(0) * Math.sin(obl) * Math.sin(L));
    const w = Math.acos((Math.sin(alt * rad) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec)));
    const a = J0 + (w + lw) / (2 * Math.PI) + n;
    return fromJulian(J2000 + a + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L));
  }
  const aMezzogiorno = d => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  // venerdì di questo Shabbat: il sabato vale fino all'Havdalà
  const venerdi = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate());
  const gs = oggi.getDay();
  if (gs === 6) {
    venerdi.setDate(venerdi.getDate() - 1);
    if (oggi > quandoIlSole(aMezzogiorno(oggi), -8.5)) venerdi.setDate(venerdi.getDate() + 7);
  } else venerdi.setDate(venerdi.getDate() + ((5 - gs + 7) % 7));
  const sabato = new Date(venerdi); sabato.setDate(sabato.getDate() + 1);
  const candele = new Date(quandoIlSole(aMezzogiorno(venerdi), -0.833).getTime() - 18 * 60000);
  const havdala = quandoIlSole(aMezzogiorno(sabato), -8.5);
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
