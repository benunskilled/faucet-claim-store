# Faucet Claim ⚡

Eine winzige Umbrel-App: Sie holt jeden Tag automatisch die 21 Sats vom
[VIX Faucet](https://faucet.vixlnbits.fr) auf deine Lightning-Adresse.
Inoffiziell, kein Teil des VIX Faucet.

## Installieren

1. In umbrelOS **Einstellungen → App Store → ⋮ → Community App Stores** öffnen.
2. Diese Adresse hinzufügen:
   ```text
   https://github.com/benunskilled/faucet-claim-store
   ```
3. **Faucet Claim** installieren, öffnen, Lightning-Adresse eintragen, **Speichern**.

Fertig. Die App claimt ab jetzt von selbst. Auf ihrer Seite siehst du den letzten
Erfolg, den nächsten Versuch und ein kurzes Log. Die Adresse kannst du dort
jederzeit ändern.

## So funktioniert es

Ein kleiner eingebauter Browser öffnet die Faucet-Seite, trägt deine Adresse ein
und drückt den Knopf, genau wie von Hand. Nach einem Erfolg kommt der nächste
Claim 24 h 5 min später. Meldet der Faucet eine Sperre, versucht es die App nach
20 min erneut. Außer deiner Lightning-Adresse (an den Faucet) verlässt nichts
deinen Node.

## Neue Version veröffentlichen

1. Code in `src/` ändern, `version` in `src/package.json` erhöhen, committen.
2. `git tag vX.Y.Z && git push origin main vX.Y.Z`
3. Warten, bis die Action **Build and publish multi-arch image** fertig ist. Ihr
   letzter Schritt druckt `ghcr.io/benunskilled/faucet-claim:X.Y.Z@sha256:…`.
4. Diese Zeile in `vixfaucet-claim/docker-compose.yml` bei `image:` eintragen,
   `version:` in `vixfaucet-claim/umbrel-app.yml` anpassen, committen, pushen.

Beim allerersten Mal: Das Paket `faucet-claim` unter GitHub → Packages auf
**Public** stellen, sonst kann Umbrel das Image nicht laden.
