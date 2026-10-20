// Zeitfenster für den Claim (Ben 20.10.2026: der Zeitpunkt wandert jeden Tag 5 min nach hinten und landet irgendwann
// in der Nacht). Ein Fenster ist { from: "08:00", to: "22:00", tz: "Europe/Berlin" }; "to" vor "from" heißt über
// Mitternacht (20:00–02:00). Liegt ein fälliger Claim außerhalb, wartet er bis zum nächsten Fensterbeginn – dann fällt
// eben einmal ein halber Tag weg. Ohne Fenster (null) wie bisher rund um die Uhr.
const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MIN_WINDOW_MIN = 30;

const minutesOf = hhmm => { const m = HHMM.exec(hhmm); return Number(m[1]) * 60 + Number(m[2]); };

// Uhrzeit in der Zeitzone des Fensters, in Minuten seit Mitternacht. Über Intl, damit Sommer-/Winterzeit stimmt.
// Ein Formatter je Zeitzone: neu angelegt kostet er ein Vielfaches, und nextAllowed fragt bis zu 2.880-mal.
const formatters = new Map();
function localMinutes(ms, tz) {
  if (!formatters.has(tz)) formatters.set(tz, new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }));
  const parts = formatters.get(tz).formatToParts(new Date(ms));
  const get = type => Number(parts.find(p => p.type === type).value);
  return get("hour") * 60 + get("minute");
}

function inWindow(ms, win) {
  if (!win) return true;
  const m = localMinutes(ms, win.tz), from = minutesOf(win.from), to = minutesOf(win.to);
  return from < to ? m >= from && m < to : m >= from || m < to;
}

// Frühester Zeitpunkt ab ms, der im Fenster liegt. Minutenweise, höchstens zwei Tage (eine Zeitumstellung inklusive).
function nextAllowed(ms, win) {
  if (inWindow(ms, win)) return ms;
  let t = Math.ceil(ms / 60000) * 60000;
  for (let i = 0; i < 2 * 24 * 60; i += 1, t += 60000) if (inWindow(t, win)) return t;
  return ms; // kann bei einem gültigen Fenster nicht passieren
}

// Prüft, was die Seite schickt. Gibt { window } oder { error, code } zurück; null/leer = kein Fenster. Die Seite
// übersetzt anhand von code, error ist der deutsche Text (für Aufrufer ohne Übersetzung).
function parseWindow(input) {
  if (input == null || input === false) return { window: null };
  const from = String(input.from || ""), to = String(input.to || ""), tz = String(input.tz || "");
  if (!HHMM.test(from) || !HHMM.test(to)) return { code: "bad_time", error: "Bitte die Uhrzeiten als HH:MM angeben." };
  if (from === to) return { code: "same_time", error: "Beginn und Ende des Zeitfensters dürfen nicht gleich sein." };
  // Der Server prüft nur alle 5 min – ein kürzeres Fenster könnte jeden Tag verpasst werden.
  if ((minutesOf(to) - minutesOf(from) + 1440) % 1440 < MIN_WINDOW_MIN) {
    return { code: "too_short", error: `Das Zeitfenster muss mindestens ${MIN_WINDOW_MIN} Minuten lang sein.` };
  }
  if (!tz) return { code: "no_tz", error: "Bitte eine Zeitzone wählen." };
  try { new Intl.DateTimeFormat("en-GB", { timeZone: tz }); } catch { return { code: "bad_tz", error: "Diese Zeitzone kenne ich nicht." }; }
  return { window: { from, to, tz } };
}

// Das gespeicherte Fenster beim Lesen nochmal prüfen: ein von Hand verändertes config.json oder eine Zeitzone, die
// diese Node-Version nicht kennt, würde sonst bei jeder Prüfung den Server abstürzen lassen. Ungültig = kein Fenster.
let warned = null;
function storedWindow(value) {
  if (value == null) return null;
  const { window, error } = parseWindow(value);
  if (error) {
    const key = JSON.stringify(value);
    if (warned !== key) { warned = key; console.log(`Zeitfenster in config.json ungültig, gilt nicht: ${error}`); }
    return null;
  }
  return window;
}

module.exports = { inWindow, nextAllowed, parseWindow, storedWindow, localMinutes };
