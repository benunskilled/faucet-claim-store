#!/bin/sh
# Startet den Server, lässt einen Claim gegen die nachgebaute Faucet-Seite laufen
# und prüft das Ergebnis. Aufruf: sh test/smoke.sh (braucht nur node + Playwright-Browser)
set -e
DIR=$(cd "$(dirname "$0")/.." && pwd)
APP=${APP:-$DIR/src} # im Docker-Test: /app aus dem Image
DATA=$(mktemp -d)
PORT=3999
export DATA_DIR="$DATA" PORT FAUCET_URL="file://$DIR/test/fake-faucet.html"
node "$APP/server.js" & PID=$!
trap 'kill $PID 2>/dev/null; rm -rf "$DATA"' EXIT
sleep 1
node -e 'fetch(`http://localhost:${process.env.PORT}/api/config`, { method: "POST", body: JSON.stringify({ address: "test@example.com" }) }).then(r => process.exit(r.ok ? 0 : 1))'
for i in $(seq 1 60); do
  if grep -q '"lastSuccess"' "$DATA/state.json" 2>/dev/null; then
    echo "OK: $(cat "$DATA/state.json")"
    exit 0
  fi
  sleep 1
done
echo "FEHLER: kein erfolgreicher Claim"; cat "$DATA/state.json" 2>/dev/null; exit 1
