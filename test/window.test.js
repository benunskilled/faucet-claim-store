// Zeitfenster: node --test test/
const test = require("node:test");
const assert = require("node:assert/strict");
const { inWindow, nextAllowed, parseWindow } = require("../src/window");

const day = { from: "08:00", to: "22:00", tz: "Europe/Berlin" };
const night = { from: "20:00", to: "02:00", tz: "Europe/Berlin" };
const at = iso => Date.parse(iso);

test("ohne Fenster ist immer erlaubt", () => {
  assert.equal(inWindow(at("2026-10-20T03:00:00Z"), null), true);
  assert.equal(nextAllowed(123, null), 123);
});

test("Tagesfenster in Berliner Zeit (Sommerzeit: UTC+2)", () => {
  assert.equal(inWindow(at("2026-07-01T06:00:00Z"), day), true); // 08:00 Berlin – Beginn zählt
  assert.equal(inWindow(at("2026-07-01T05:59:00Z"), day), false); // 07:59
  assert.equal(inWindow(at("2026-07-01T20:00:00Z"), day), false); // 22:00 – Ende zählt nicht mehr
});

test("ein fälliger Claim nachts wartet bis 08:00, auch im Winter (UTC+1)", () => {
  assert.equal(nextAllowed(at("2026-12-01T22:30:00Z"), day), at("2026-12-02T07:00:00Z"));
});

test("Fenster über Mitternacht", () => {
  assert.equal(inWindow(at("2026-07-01T23:30:00Z"), night), true); // 01:30 Berlin
  assert.equal(inWindow(at("2026-07-01T10:00:00Z"), night), false); // 12:00
  assert.equal(nextAllowed(at("2026-07-01T10:00:00Z"), night), at("2026-07-01T18:00:00Z")); // 20:00 Berlin
});

test("über die Zeitumstellung (Berlin, 25.10.2026) stimmt die Ortszeit", () => {
  // Sonntag 02:30 UTC = 03:30 Sommerzeit wird 02:30 Winterzeit; nächster Beginn 08:00 Winterzeit = 07:00 UTC
  assert.equal(nextAllowed(at("2026-10-25T02:30:00Z"), day), at("2026-10-25T07:00:00Z"));
});

test("andere Zeitzone", () => {
  const ny = { from: "08:00", to: "22:00", tz: "America/New_York" };
  assert.equal(inWindow(at("2026-07-01T12:00:00Z"), ny), true); // 08:00 New York
  assert.equal(inWindow(at("2026-07-01T11:59:00Z"), ny), false);
});

test("Eingaben werden geprüft", () => {
  assert.deepEqual(parseWindow(null), { window: null });
  assert.deepEqual(parseWindow({ from: "08:00", to: "22:00", tz: "Europe/Berlin" }), { window: day });
  assert.ok(parseWindow({ from: "8:00", to: "22:00", tz: "Europe/Berlin" }).error);
  assert.ok(parseWindow({ from: "08:00", to: "08:00", tz: "Europe/Berlin" }).error);
  assert.ok(parseWindow({ from: "08:00", to: "22:00", tz: "Mars/Olympus" }).error);
  assert.ok(parseWindow({ from: "08:00", to: "22:00", tz: "" }).error);
});
