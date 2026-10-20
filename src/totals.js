// Bisher erhaltene Sats: aus der Antwort des Faucets gelesen ("⚡ 21 sats envoyés !"), sonst 21. Nur zwei Zahlen und
// der Beginn – der Log bleibt bei 50 Einträgen. Fehlt der Zähler (vor 1.2.0), wird er einmal aus dem Log nachgezählt;
// der Log reicht 50 Versuche zurück, darum "seit" = ältester Eintrag.
// Tausender-Trenner (. , Leerzeichen, auch geschützte) nur vor genau drei Ziffern; Nachkommastellen fallen weg.
const satsOf = text => {
  const m = /(\d{1,3}(?:[.,\s\u00a0\u202f]\d{3})+|\d+)(?:[.,]\d+)?\s*sats?\b/i.exec(text || "");
  return m ? Number(m[1].replace(/\D/g, "")) : 21;
};
function totals(state) {
  if (!state.total) {
    const ok = (state.log || []).filter(e => e.ok);
    const at = ok.map(e => e.at).filter(Boolean); // "seit" = ältester Erfolg, nicht ein älterer Fehlversuch
    state.total = { sats: ok.reduce((n, e) => n + satsOf(e.text), 0), claims: ok.length, since: at.length ? Math.min(...at) : null };
  }
  return state.total;
}

module.exports = { satsOf, totals };
