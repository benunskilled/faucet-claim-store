// Ein einzelner Claim: öffnet die Faucet-Seite in einem Browser ohne Fenster,
// trägt die Adresse ein, drückt den Knopf und gibt das Ergebnis als JSON aus.
// Läuft als eigener Prozess, damit nach dem Claim kein Browser-Speicher übrig bleibt.
const path = require("path");
const { chromium } = require("playwright");

const FAUCET_URL = process.env.FAUCET_URL || "https://faucet.vixlnbits.fr"; // für Tests überschreibbar
const DATA = process.env.DATA_DIR || path.join(__dirname, "data");
const ADDRESS = process.env.CLAIM_ADDRESS;
const NAME = process.env.CLAIM_NAME || "";

// Bilder, Schriften und Videos braucht der Claim nicht
const SKIP = new Set(["image", "font", "media"]);

(async () => {
  let context;
  let result;
  try {
    // Eigenes, dauerhaftes Browser-Profil, damit der Faucet jeden Tag denselben "Browser" sieht
    context = await chromium.launchPersistentContext(
      path.join(DATA, "browser-profile"),
      { headless: true }
    );
    await context.route("**/*", route =>
      SKIP.has(route.request().resourceType()) ? route.abort() : route.continue()
    );
    const page = await context.newPage();
    await page.goto(FAUCET_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    if (NAME) await page.fill("#claimName", NAME);
    await page.fill("#invoice", ADDRESS);
    await page.click("#claimBtn");
    // Warten, bis die Seite eine Erfolgs- oder Fehlermeldung zeigt
    const msg = page.locator("#claimMessage.success, #claimMessage.error");
    await msg.waitFor({ timeout: 60000 });
    result = {
      ok: (await msg.getAttribute("class")).includes("success"),
      text: (await msg.textContent()).trim(),
    };
  } catch (e) {
    result = { ok: false, text: e.message.split("\n")[0] };
  } finally {
    if (context) await context.close().catch(() => {});
  }
  process.stdout.write(JSON.stringify(result) + "\n");
})();
