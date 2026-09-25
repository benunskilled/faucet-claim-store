// Holt automatisch die täglichen 21 Sats vom VIX Faucet – wie ein Klick von Hand –
// und zeigt eine kleine Seite, auf der man die Lightning-Adresse einträgt.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const PORT = Number(process.env.PORT || 3000);
const DATA = process.env.DATA_DIR || path.join(__dirname, "data");
const CONFIG = path.join(DATA, "config.json");
const STATE = path.join(DATA, "state.json");
const INTERVAL_MS = (24 * 60 + 5) * 60 * 1000; // 24 h 5 min nach dem letzten Erfolg
const RETRY_MS = 20 * 60 * 1000; // nach einem Fehler erst in 20 min wieder versuchen
const CHECK_MS = 5 * 60 * 1000; // alle 5 min prüfen, ob ein Claim fällig ist
const MAX_LOG = 50;

fs.mkdirSync(DATA, { recursive: true });

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return {}; }
}
function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function addLog(state, ok, text) {
  state.log = [{ at: Date.now(), ok, text }, ...(state.log || [])].slice(0, MAX_LOG);
  console.log(`${new Date().toISOString()}  ${ok ? "OK" : "FEHLER"}  ${text}`);
}

let running = false;

async function claimIfDue() {
  const { address, name } = readJson(CONFIG);
  const state = readJson(STATE);
  const now = Date.now();
  if (running || !address) return;
  if (now < (state.lastSuccess || 0) + INTERVAL_MS) return; // noch nicht fällig
  if (now < (state.lastAttempt || 0) + RETRY_MS) return; // Fehler-Pause
  running = true;
  const { ok, text } = await runClaim(address, name);
  dropBrowserCache();
  addLog(state, ok, text);
  if (ok) state.lastSuccess = now;
  state.lastAttempt = now;
  try { writeJson(STATE, state); } catch (e) { console.log(`Status nicht gespeichert: ${e.message}`); }
  running = false;
}

// Der Browser läuft in einem eigenen Prozess (claim.js), der sich danach beendet.
// So braucht der Server im Leerlauf nur ein paar MB statt einer geladenen Browser-Steuerung.
function runClaim(address, name) {
  return new Promise(resolve => {
    execFile(
      process.execPath,
      [path.join(__dirname, "claim.js")],
      { env: { ...process.env, CLAIM_ADDRESS: address, CLAIM_NAME: name || "" }, timeout: 3 * 60 * 1000 },
      (err, stdout) => {
        try {
          resolve(JSON.parse(stdout.trim().split("\n").pop()));
        } catch {
          resolve({ ok: false, text: err ? `Claim-Prozess fehlgeschlagen: ${err.killed ? "Zeitüberschreitung" : err.message.split("\n")[0]}` : "Keine Antwort vom Claim-Prozess" });
        }
      }
    );
  });
}

// Nach dem Claim bleiben die gelesenen Browser-Dateien (~270 MB) im Datei-Cache
// und werden dem Container angerechnet – Umbrel zeigt die App dann tagelang
// mit ~180 MB statt ~17 MB. dd mit iflag=nocache wirft den Cache jeder Datei weg
// (dauert ~2 s, einmal am Tag). Nur im Image, wo PLAYWRIGHT_BROWSERS_PATH gesetzt ist.
function dropBrowserCache() {
  const browsers = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!browsers) return;
  const dirs = [browsers, path.join(__dirname, "node_modules"), "/usr/lib", "/usr/share/fonts"].filter(d => fs.existsSync(d));
  execFile("find", [...dirs, "-type", "f", "-exec", "dd", "if={}", "iflag=nocache", "count=0", "status=none", ";"],
    { timeout: 60 * 1000 }, () => {});
}

function status() {
  const config = readJson(CONFIG);
  const state = readJson(STATE);
  let next = null;
  if (config.address) {
    next = Math.max(
      (state.lastSuccess || 0) + INTERVAL_MS,
      (state.lastAttempt || 0) + RETRY_MS,
      Date.now()
    );
  }
  return {
    address: config.address || "",
    name: config.name || "",
    running,
    lastSuccess: state.lastSuccess || null,
    next,
    log: state.log || [],
  };
}

const LIGHTNING_ADDRESS = /^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

const server = http.createServer((req, res) => {
  const send = (code, type, body) => {
    res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store" });
    res.end(body);
  };
  if (req.method === "GET" && req.url === "/") {
    return send(200, "text/html; charset=utf-8", fs.readFileSync(path.join(__dirname, "index.html")));
  }
  if (req.method === "GET" && req.url === "/api/status") {
    return send(200, "application/json", JSON.stringify(status()));
  }
  if (req.method === "POST" && req.url === "/api/config") {
    let body = "";
    req.on("data", chunk => { body += chunk; if (body.length > 10000) req.destroy(); });
    req.on("end", () => {
      let input;
      try { input = JSON.parse(body); } catch { return send(400, "application/json", '{"error":"Ungültige Anfrage"}'); }
      const address = String(input.address || "").trim();
      const name = String(input.name || "").trim().slice(0, 30);
      if (!LIGHTNING_ADDRESS.test(address)) {
        return send(400, "application/json", JSON.stringify({ error: "Das sieht nicht wie eine Lightning-Adresse aus (name@wallet.com)." }));
      }
      try {
        writeJson(CONFIG, { address, name });
      } catch (e) {
        console.log(`Speichern fehlgeschlagen: ${e.message}`);
        return send(500, "application/json", JSON.stringify({ error: `Kann nicht speichern: Der Datenordner ist nicht beschreibbar (${e.code || e.message}).` }));
      }
      send(200, "application/json", JSON.stringify(status()));
      claimIfDue(); // neue Adresse: gleich prüfen, ob ein Claim fällig ist
    });
    return;
  }
  send(404, "text/plain", "Nicht gefunden");
});

server.listen(PORT, () => console.log(`Läuft auf Port ${PORT}`));
claimIfDue();
setInterval(claimIfDue, CHECK_MS);
