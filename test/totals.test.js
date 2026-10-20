// Sat-Zähler: node --test test/totals.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { satsOf, totals } = require("../src/totals");

test("der Betrag kommt aus der Antwort des Faucets, sonst 21", () => {
  assert.equal(satsOf("⚡ 21 sats envoyés !"), 21);
  assert.equal(satsOf("21 sats (altes Skript)"), 21);
  assert.equal(satsOf("⚡ 1,000 sats sent"), 1000);
  assert.equal(satsOf("Claim erfolgreich"), 21);
  assert.equal(satsOf("21.0 sats"), 21);
  assert.equal(satsOf("2 100 sats envoyés"), 2100);
  assert.equal(satsOf("2\u202f100 sats"), 2100);
  assert.equal(satsOf("1.000 sats"), 1000);
  assert.equal(satsOf("0 sats"), 0);
});

test("ohne Zähler wird einmal aus dem Log nachgezählt, nur Erfolge", () => {
  const state = { log: [
    { at: 3000, ok: true, text: "⚡ 21 sats envoyés !" },
    { at: 2000, ok: false, text: "Veuillez patienter" },
    { at: 1000, ok: true, text: "21 sats (altes Skript)" },
  ] };
  assert.deepEqual(totals(state), { sats: 42, claims: 2, since: 1000 });
  state.log.unshift({ at: 4000, ok: true, text: "⚡ 21 sats envoyés !" });
  assert.deepEqual(totals(state), { sats: 42, claims: 2, since: 1000 }, "einmal gezählt, danach zählt der Server weiter");
});

test("eine frische Installation beginnt bei null", () => {
  assert.deepEqual(totals({}), { sats: 0, claims: 0, since: null });
});

test("seit = ältester Erfolg, nicht ein älterer Fehlversuch", () => {
  const state = { log: [{ at: 5000, ok: true, text: "21 sats" }, { at: 1000, ok: false, text: "Erreur" }] };
  assert.equal(totals(state).since, 5000);
  assert.deepEqual(totals({ log: [{ at: 1000, ok: false, text: "Erreur" }] }), { sats: 0, claims: 0, since: null });
});
