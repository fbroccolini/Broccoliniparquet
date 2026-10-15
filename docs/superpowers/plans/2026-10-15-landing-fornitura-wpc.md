# Landing "Fornitura WPC" — Piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pubblicare `Broccoliniparquet/fornitura-wpc.html`, la landing per Google Ads che testa la domanda di sola fornitura di WPC in Italia. Ha un form a due passaggi e traccia le scelte dei visitatori.

**Architecture:** Pagina HTML autonoma, nello **stile del sito**.
- **Hero come la home:** foto, oppure video da desktop; titolo maiuscolo con mascheratura; pulsante a contorno bianco.
- **Corpo come `wpc.html`:**
  - barra fissa, sipario, linee di griglia;
  - titoli Cormorant maiuscoli, testi Outfit 350, etichette Space Mono;
  - entrate `rv-*`, tabella di confronto, disegno della posa, passi numerati, footer scuro.
- **Librerie:** GSAP 3.15.0, ScrollTrigger e Lenis 1.3.26, dalle stesse URL jsDelivr del sito.
- **Tracciamento:** riusa `cta-tracking.js` e `trackConversion(name, params)`. La logica del form sta in uno script inline.
- **Senza JavaScript:** il form resta su un unico passaggio e invia direttamente a Web3Forms.

**Tech Stack:** HTML, CSS e JS vanilla; GSAP, ScrollTrigger, Lenis; Web3Forms; gtag (GA4 + Ads); Iubenda. Test con Puppeteer, installato in `node_modules` alla radice del workspace.

**Spec:** `docs/superpowers/specs/2026-10-15-landing-fornitura-wpc-design.md`. Scelte successive di Federico, che prevalgono sulla spec:
- stile del sito (home + `wpc.html`) al posto di quello della landing decking;
- animazioni con le librerie già in uso;
- **niente catalogo/collezione** in questa versione.

## Global Constraints

- File: `Broccoliniparquet/fornitura-wpc.html`, con `<meta name="robots" content="noindex, follow">`. Non va in `sitemap.xml` né nei menu delle altre pagine.
- Pagina in italiano. Offerta: fornitura in tutta Italia, posa su richiesta. Nessun prezzo, nessun catalogo.
- Testi WPC solo qualitativi:
  - niente percentuali, classi o valori di laboratorio, marchi, nomi dei colori, garanzie in anni;
  - niente "zero manutenzione" assoluto, niente "non scotta".
- Titoli monocolore e monostile (Cormorant 400 maiuscolo via `type.css`), niente eyebrow, niente corsivo o oro nei titoli.
- Foto della galleria mai tagliate: altezza fissa e `width:auto`, con gli attributi `width` e `height` reali.
- Codici del tracciamento:
  - `tipo_richiesta`: `fornitura` | `fornitura_posa` | `non_so`
  - `mq`: `lt20` | `20_50` | `50_100` | `gt100` | `non_so`
  - `tempistica`: `1m` | `1_3m` | `gt3m` | `valuto`
- Nell'email arrivano i valori leggibili ("Solo fornitura", "20–50 m²"…); il codice sta in `data-code`.
- Oggetto email: `[Fornitura WPC] Nuova richiesta`. Chiave Web3Forms: `72318e8e-7bbc-4405-9cde-44fc38a00f7e`.
- Conversioni Ads già esistenti:
  - `lead_form_submit` → `AW-18382303561/3Zg5CIyGg-AcEMnirr1E`
  - `call_click` → `AW-18382303561/HQnECIrS8t8cEMnirr1E`
- Nessun dato personale in GA4.
- Target touch ≥ 44px. Nessuno scorrimento orizzontale a 360px. Con `prefers-reduced-motion` tutto è visibile e fermo.

## Review Focus

1. **Visitatore senza JavaScript:** vede tutti i campi in un unico form e l'invio va comunque a Web3Forms. Coperto dal test "senza JS" (Task 1).
2. **Web3Forms risponde con errore:** il pulsante segnala l'errore, dati e scelte restano e non parte nessun `lead_form_submit`. Coperto dal test "invio fallito" (Task 1).
3. **Telefono piccolo (360px):** le scelte vanno a capo senza uscire dallo schermo. Coperto dal test di overflow (Task 1).
4. **Clic su un riquadro e poi cambio idea nel form:** prevale la scelta del form, tracciata con `origine: form`. Coperto dal test "cambio scelta" (Task 1).
5. **"Avanti" con una risposta mancante:** messaggio chiaro, focus sulla prima domanda senza risposta, nessun avanzamento. Coperto dal test "avanti incompleto" (Task 1).

---

### Task 1: Test automatico della landing (prima della pagina)

**Files:**
- Create: `_check-fornitura.mjs` (radice del workspace, accanto a `_check-cta.mjs`)

**Interfaces:**
- Consumes (dalla pagina del Task 2):
  - id `pageCurtain`, `contactForm`, `step1`, `step2`, `nextBtn`, `backBtn`, `step1Error`, `submitBtn`, `formSuccess`, `nome`, `telefono`, `email`, `localita`, `privacyConsent`;
  - radio `name="tipo_richiesta|mq|tempistica"` con `data-code`;
  - link `[data-offerta]` con `data-cta="due_strade"` e `[data-cta="hero"]`;
  - `window.formChoices()`.
- Produces: `node _check-fornitura.mjs` stampa ✔/✘ per ogni controllo ed esce con 0 se tutto va bene.

- [ ] **Step 1: Scrivi il test**

```js
// Verifica la landing Fornitura WPC in locale: tracciamento, form a due passaggi, invio simulato, layout.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const ROOT = fileURLToPath(new URL("./Broccoliniparquet/", import.meta.url));
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png", ".mp4": "video/mp4" };
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  try {
    const body = await readFile(join(ROOT, path.endsWith("/") ? `${path}index.html` : path));
    res.writeHead(200, { "Content-Type": TYPES[extname(path)] ?? "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404).end();
  }
}).listen(0);
const URL_PAGE = `http://localhost:${server.address().port}/fornitura-wpc.html`;

let failures = 0;
const check = (ok, message) => {
  console.log(`${ok ? "✔" : "✘"} ${message}`);
  if (!ok) failures++;
};

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });

/** Apre la pagina. Web3Forms risponde "ok" o "error" e il corpo inviato viene conservato. */
async function open({ width = 390, js = true, web3 = "ok" } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 860 });
  await page.setJavaScriptEnabled(js);
  const state = { errors: [], missing: [], sent: null };
  page.on("pageerror", (e) => state.errors.push(e.message));
  page.on("response", (r) => { if (r.url().startsWith("http://localhost") && r.status() >= 400) state.missing.push(r.url()); });
  await page.setRequestInterception(true);
  page.on("request", (r) => {
    const url = r.url();
    if (url.includes("api.web3forms.com")) {
      state.sent = r.postData() ?? "";
      return web3 === "ok"
        ? r.respond({ status: 200, contentType: "application/json", body: '{"success":true}' })
        : r.respond({ status: 500, contentType: "application/json", body: '{"success":false,"message":"errore"}' });
    }
    if (url.startsWith("http://localhost") || url.includes("fonts.g") || url.includes("cdn.jsdelivr.net")) return r.continue();
    return r.abort();
  });
  await page.goto(URL_PAGE, { waitUntil: "networkidle2" });
  // aspetta che il sipario d'ingresso sia sparito
  await page.waitForFunction(() => { const c = document.getElementById("pageCurtain"); return !c || getComputedStyle(c).display === "none"; }, { timeout: 5000 }).catch(() => {});
  return { page, state };
}
const events = (page, name) => page.evaluate((n) => (window.dataLayer || []).filter((e) => e.event === n), name);
const visible = (page, sel) => page.$eval(sel, (el) => !el.hidden && getComputedStyle(el).display !== "none" && el.getClientRects().length > 0).catch(() => false);
// clic via DOM: non dipende da cosa copre il punto (es. il pulsante flottante)
const tap = (page, sel) => page.$eval(sel, (el) => el.click());
const pick = (page, name, code) => tap(page, `input[name="${name}"][data-code="${code}"] + span`);
const stayOnPage = (page) => page.evaluate(() => window.addEventListener("click", (e) => { if (e.target.closest("a[href^='#']")) e.preventDefault(); }));

// 1. Struttura e indicizzazione
{
  const { page, state } = await open({ width: 1440 });
  const robots = await page.$eval('meta[name="robots"]', (m) => m.content).catch(() => null);
  check(robots === "noindex, follow", `meta robots = ${robots}`);
  const sitemap = await readFile(join(ROOT, "sitemap.xml"), "utf8");
  check(!sitemap.includes("fornitura-wpc"), "non è nella sitemap");
  check(await page.$("script[src^='cta-tracking.js']") !== null, "include cta-tracking.js");
  check(await page.evaluate(() => Boolean(window.gsap && window.ScrollTrigger && window.Lenis)), "GSAP, ScrollTrigger e Lenis caricati");
  check(state.errors.length === 0, `nessun errore JS ${state.errors.join(" | ")}`);
  check(state.missing.length === 0, `nessuna risorsa locale mancante ${state.missing.join(", ")}`);
  await page.close();
}

// 2. Layout a 360px: niente scorrimento orizzontale
{
  const { page } = await open({ width: 360 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 0, `nessun overflow orizzontale a 360px (${overflow}px)`);
  await page.close();
}

// 3. Riquadri "Due strade" + cambio idea nel form
{
  const { page } = await open();
  await stayOnPage(page);
  await tap(page, '[data-offerta="fornitura"]');
  check(await page.$eval('input[name="tipo_richiesta"][data-code="fornitura"]', (r) => r.checked), "il riquadro Solo fornitura seleziona la scelta nel form");
  const scelta = (await events(page, "scelta_offerta")).at(-1);
  check(scelta?.tipo_richiesta === "fornitura" && scelta?.origine === "riquadro", `scelta_offerta da riquadro ${JSON.stringify(scelta)}`);
  const cta = (await events(page, "cta_preventivo")).at(-1);
  check(cta?.cta_posizione === "due_strade", `cta_preventivo due_strade ${JSON.stringify(cta)}`);
  await pick(page, "tipo_richiesta", "fornitura_posa");
  const dopo = (await events(page, "scelta_offerta")).at(-1);
  check(dopo?.tipo_richiesta === "fornitura_posa" && dopo?.origine === "form", `cambio scelta tracciato dal form ${JSON.stringify(dopo)}`);
  await page.close();
}

// 4. Passaggio 1: "Avanti" incompleto, poi completo, poi "Indietro"
{
  const { page } = await open();
  check(await visible(page, "#step1") && !(await visible(page, "#step2")), "all'inizio si vede solo il passaggio 1");
  await pick(page, "tipo_richiesta", "fornitura");
  await tap(page, "#nextBtn");
  check(await visible(page, "#step1Error"), "Avanti incompleto mostra il messaggio");
  const focused = await page.evaluate(() => document.activeElement?.name);
  check(focused === "mq", `focus sulla prima domanda senza risposta (${focused})`);
  check(!(await visible(page, "#step2")), "Avanti incompleto non avanza");
  await pick(page, "mq", "20_50");
  await pick(page, "tempistica", "1_3m");
  await tap(page, "#nextBtn");
  check(await visible(page, "#step2") && !(await visible(page, "#step1")), "Avanti completo mostra il passaggio 2");
  check((await page.evaluate(() => document.activeElement?.id)) === "nome", "focus sul campo Nome");
  const step2 = (await events(page, "form_step2")).at(-1);
  check(step2?.tipo_richiesta === "fornitura" && step2?.mq === "20_50" && step2?.tempistica === "1_3m", `form_step2 ${JSON.stringify(step2)}`);
  await tap(page, "#backBtn");
  const kept = await page.evaluate(() => window.formChoices());
  check(await visible(page, "#step1") && kept.mq === "20_50", "Indietro torna al passaggio 1 e conserva le scelte");
  await page.close();
}

// 5. Invio riuscito (Web3Forms simulato)
{
  const { page, state } = await open();
  await stayOnPage(page);
  await tap(page, '[data-cta="hero"]');
  await pick(page, "tipo_richiesta", "fornitura");
  await pick(page, "mq", "gt100");
  await pick(page, "tempistica", "1m");
  await tap(page, "#nextBtn");
  await page.type("#nome", "Prova Test");
  await page.type("#telefono", "3330000000");
  await page.type("#email", "prova@example.com");
  await page.type("#localita", "Pescara");
  await tap(page, "#privacyConsent");
  await tap(page, "#submitBtn");
  await page.waitForFunction(() => getComputedStyle(document.getElementById("formSuccess")).display !== "none", { timeout: 5000 }).catch(() => {});
  check(await visible(page, "#formSuccess"), "messaggio di successo visibile");
  const lead = (await events(page, "lead_form_submit")).at(-1);
  check(
    lead?.tipo_richiesta === "fornitura" && lead?.mq === "gt100" && lead?.tempistica === "1m" && lead?.cta_posizione === "hero",
    `lead_form_submit con scelte e provenienza ${JSON.stringify(lead)}`,
  );
  check(!/Prova|Pescara|example/.test(JSON.stringify(lead ?? {})), "nessun dato personale in GA4");
  const sent = state.sent ?? "";
  check(sent.includes("[Fornitura WPC] Nuova richiesta"), "oggetto email corretto");
  check(sent.includes("Solo fornitura") && sent.includes("Oltre 100 m²") && sent.includes("Pescara"), "email con valori leggibili e località");
  await page.close();
}

// 6. Invio fallito: errore visibile, dati conservati, nessuna conversione
{
  const { page } = await open({ web3: "error" });
  await pick(page, "tipo_richiesta", "non_so");
  await pick(page, "mq", "non_so");
  await pick(page, "tempistica", "valuto");
  await tap(page, "#nextBtn");
  await page.type("#nome", "Prova");
  await page.type("#telefono", "3330000000");
  await page.type("#email", "prova@example.com");
  await page.type("#localita", "Roma");
  await tap(page, "#privacyConsent");
  await tap(page, "#submitBtn");
  await page.waitForFunction(() => /Errore/.test(document.getElementById("submitBtn").textContent), { timeout: 5000 }).catch(() => {});
  const label = await page.$eval("#submitBtn", (b) => b.textContent.trim());
  check(/Errore/.test(label), `pulsante segnala l'errore (${label})`);
  check((await page.$eval("#nome", (i) => i.value)) === "Prova", "i dati inseriti restano");
  check((await events(page, "lead_form_submit")).length === 0, "nessun lead_form_submit");
  await page.close();
}

// 7. Senza JavaScript: un solo passaggio, invio diretto a Web3Forms
{
  const { page } = await open({ js: false });
  check(await visible(page, "#step2") && await visible(page, "#submitBtn"), "senza JS contatti e invio sono visibili");
  check(!(await visible(page, "#nextBtn")), "senza JS il pulsante Avanti è nascosto");
  check(!(await visible(page, "#pageCurtain")), "senza JS il sipario non copre la pagina");
  const action = await page.$eval("#contactForm", (f) => `${f.method} ${f.action}`);
  check(action === "post https://api.web3forms.com/submit", `senza JS il form invia a Web3Forms (${action})`);
  await page.close();
}

await browser.close();
server.close();
console.log(failures === 0 ? "\nTUTTO OK" : `\n${failures} controlli falliti`);
process.exit(failures === 0 ? 0 : 1);
```

- [ ] **Step 2: Esegui e verifica che fallisca**

Run: `cd "/c/Users/fedeb/OneDrive/Claude workspace" && node _check-fornitura.mjs </dev/null`
Expected: FAIL. La pagina non esiste ancora, quindi meta robots è null e ci sono risorse mancanti.

---

### Task 2: La pagina `fornitura-wpc.html`

**Files:**
- Create: `Broccoliniparquet/fornitura-wpc.html`

**Interfaces:**
- Consumes:
  - `type.css?v=8` (font del sito);
  - `cta-tracking.js` (`window.ctaOrigin()`, eventi automatici `cta_preventivo` e `form_start`);
  - immagini in `img/` e `img/wpc/`, video `img/hero-piscina.mp4`;
  - **il blocco `.note` di `wpc.html`**, cioè le righe 767–870: dalla riga `<div class="note" aria-labelledby="noteTitle">` al `</div>` che precede `</section>` della sezione confronto.
- Produces: gli id e le funzioni elencati nel Task 1.

- [ ] **Step 1: Crea la pagina.** Il segnaposto `<!--NOTE-WPC-->` va sostituito con il blocco `.note` copiato **identico** da `wpc.html` (vedi Interfaces): stessi testi e stesso disegno della posa.

```html
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!-- Iubenda Cookie Solution (banner consenso + Google Consent Mode v2) -->
    <script type="text/javascript" src="https://embeds.iubenda.com/widgets/cc3c0458-e34d-4aa7-93d0-a3ea3b48fba4.js"></script>
    <!-- Nasconde la barra Iubenda "Notice at collection / Your Privacy Choices" (leggi USA, non pertinente) -->
    <style>.iub__us-widget{display:none!important}</style>

    <!-- Google tag (gtag.js) — GA4 + Google Ads. Consenso gestito da Iubenda Consent Mode v2 -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-XVMX37BWHQ"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-XVMX37BWHQ');
      gtag('config', 'AW-18382303561');
    </script>

    <title>Fornitura WPC per esterni in tutta Italia | Broccolini</title>
    <meta name="description" content="Decking WPC per terrazze, giardini e bordi piscina, spedito in tutta Italia. Solo fornitura o fornitura e posa: preventivo gratuito entro 24 ore.">
    <!-- Landing per gli annunci: fuori dai risultati di Google e fuori dalla sitemap -->
    <meta name="robots" content="noindex, follow">
    <link rel="canonical" href="https://www.broccoliniparquet.it/fornitura-wpc.html">
    <meta name="theme-color" content="#111111">

    <link rel="icon" type="image/svg+xml" href="favicon.svg">
    <link rel="icon" type="image/png" sizes="32x32" href="favicon-32.png">
    <link rel="icon" type="image/png" sizes="96x96" href="favicon-96.png">
    <link rel="apple-touch-icon" href="apple-touch-icon.png">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300..700&family=Cormorant+Garamond:wght@300;400;500&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
    <noscript><link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300..700&family=Cormorant+Garamond:wght@300;400;500&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet"></noscript>
    <link rel="preload" as="image" href="img/hero-piscina-foto-m.webp" media="(max-width: 768px)">
    <link rel="preload" as="image" href="img/hero-piscina-foto.webp" media="(min-width: 769px)">
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
            --dark: #111111; --dark-2: #0a0a0a; --mid: #666666; --light: #ebe8e2; --white: #ffffff;
            --bg: #f7f6f3; --border: rgba(0,0,0,0.09); --line: rgba(17,17,17,0.07); --rule: rgba(17,17,17,0.16);
            --accent: #C4A882;
            --f: 'Outfit', sans-serif; --serif: 'Cormorant Garamond', Georgia, serif; --mono-f: 'Space Mono', ui-monospace, monospace;
            --gut: 3.5rem; --nav-h: 76px;
            --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
        }
        @media (max-width: 960px) { :root { --gut: 1.5rem; --nav-h: 64px; } }

        body { background: var(--bg); color: var(--dark); font-family: var(--f); font-size: 1rem; line-height: 1.6; -webkit-font-smoothing: antialiased; overflow-x: clip; }
        img { max-width: 100%; display: block; }
        a { color: inherit; }
        [hidden] { display: none !important; }

        /* ── NAV ridotta: logo + telefono ── */
        nav#navbar { position: fixed; top: 0; left: 0; right: 0; z-index: 200; }
        .nav-bar { height: var(--nav-h); display: flex; align-items: center; justify-content: space-between; padding: 0 var(--gut); background: var(--bg); border-bottom: 1px solid var(--border); }
        .nav-logo { display: flex; flex-direction: column; align-items: center; text-decoration: none; line-height: 1; }
        .logo-name { font-size: 1.35rem; font-weight: 700; text-transform: uppercase; color: var(--dark); display: block; }
        .logo-rule { display: block; width: 100%; height: 1px; background: var(--dark); opacity: 0.18; margin: 0.28rem 0 0.22rem; }
        .logo-sub { font-size: 0.65rem; letter-spacing: 0.48em; text-transform: uppercase; color: var(--accent); display: block; }
        .nav-call { display: inline-flex; align-items: center; gap: 0.6rem; min-height: 44px; color: var(--dark); text-decoration: none; font-family: var(--mono-f); text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.78rem; border-bottom: 1px solid rgba(17,17,17,0.3); transition: border-color 0.25s; }
        .nav-call:hover { border-color: var(--dark); }
        .nav-call svg { width: 15px; height: 15px; flex: none; }
        @media (max-width: 480px) {
            .nav-call { width: 44px; height: 44px; justify-content: center; border: 1px solid rgba(17,17,17,0.2); border-radius: 50%; }
            .nav-call .txt { display: none; }
        }

        /* ── SIPARIO d'ingresso (come le altre pagine) ── */
        #pageCurtain { position: fixed; inset: 0; z-index: 9999; background: var(--dark); }
        #pageCurtain .pc-seam { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--accent); transform: scaleX(0); transform-origin: left center; }
        #pageCurtain .pc-mark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 0.78rem; text-transform: uppercase; color: rgba(255,255,255,0.78); opacity: 0; white-space: nowrap; }

        html.lenis, html.lenis body { height: auto; }
        .lenis-smooth { scroll-behavior: auto !important; }
        .lenis-stopped { overflow: hidden; }

        /* ── GRIGLIA DI FONDO: linee verticali sottili ── */
        .wpc-lines { position: fixed; top: 0; bottom: 0; left: var(--gut); right: var(--gut); border-left: 1px solid var(--line); border-right: 1px solid var(--line); pointer-events: none; z-index: 0; }
        .wpc-lines::before, .wpc-lines::after { content: ''; position: absolute; top: 0; bottom: 0; width: 1px; background: var(--line); }
        .wpc-lines::before { left: 25%; }
        .wpc-lines::after { left: 75%; }
        @media (max-width: 960px) { .wpc-lines::before, .wpc-lines::after { display: none; } }

        main { position: relative; z-index: 1; }
        .wrap { padding-inline: var(--gut); }

        /* ── Tipografia (si appoggia a type.css) ── */
        .sec-title { font-family: var(--serif); font-weight: 400; text-transform: uppercase; font-size: clamp(2.3rem, 4.6vw, 4.4rem); line-height: 0.95; letter-spacing: -0.02em; text-wrap: balance; }
        .prose { font-family: var(--f); font-weight: 350; color: #2b2b2b; letter-spacing: -0.008em; font-size: clamp(1.12rem, 1.35vw, 1.32rem); line-height: 1.5; text-wrap: pretty; }
        .mono { font-family: var(--mono-f); font-weight: 400; text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.75rem; line-height: 1.6; color: #68635d; }
        .sec-head { display: grid; grid-template-columns: repeat(4, 1fr); margin-bottom: clamp(2.5rem, 6vh, 4rem); }
        .sec-head .sec-title { grid-column: 1 / 4; }
        .sec-head .prose { grid-column: 1 / 3; margin-top: 1.4rem; max-width: 40ch; }
        @media (max-width: 960px) { .sec-head { grid-template-columns: 1fr; } .sec-head > * { grid-column: 1 !important; } }

        /* entrate: visibili di default, nascoste solo con JS attivo */
        .ml { display: block; overflow: hidden; padding-bottom: 0.08em; margin-bottom: -0.08em; }
        .ml-in { display: block; will-change: transform; }
        .has-js .rv-title .ml-in { transform: translateY(110%); transition: transform 1.1s var(--ease-out); }
        .has-js .rv-title.in .ml-in { transform: none; }
        .has-js .rv-fade { opacity: 0; transform: translateY(18px); transition: opacity 0.9s ease, transform 0.9s var(--ease-out); }
        .has-js .rv-fade.in { opacity: 1; transform: none; }
        .ph { position: relative; overflow: hidden; background: var(--light); }
        .ph img { width: 100%; height: 100%; object-fit: cover; }
        .has-js .rv-ph { background: transparent; }
        .has-js .rv-ph img { clip-path: inset(100% 0 0 0); transform: scale(1.14); transition: clip-path 1.35s cubic-bezier(0.77, 0, 0.18, 1), transform 1.8s var(--ease-out); }
        .has-js .rv-ph.in img { clip-path: inset(0 0 0 0); transform: scale(1); }

        /* ── HERO (come la home) ── */
        .hero { position: relative; z-index: 1; min-height: 100vh; min-height: 100svh; padding-top: var(--nav-h); display: flex; align-items: flex-end; overflow: hidden; background: #1b1d1f; }
        .hero-media { position: absolute; inset: 0; z-index: 0; }
        .hero-media img, .hero-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 64% 70%; }
        .hero-media img { transform: scale(1.08); animation: heroImgScale 2s cubic-bezier(0.76, 0, 0.24, 1) 0.35s forwards; }
        .hero-video { opacity: 0; transition: opacity 0.9s ease; filter: brightness(0.92) contrast(1.03); }
        .hero-video.is-playing { opacity: 1; }
        @keyframes heroImgScale { to { transform: scale(1); } }
        .hero::before { content: ''; position: absolute; inset: 0; z-index: 1; pointer-events: none; background:
            linear-gradient(to top, rgba(10,7,5,0.74) 0%, rgba(10,7,5,0.2) 50%, transparent 72%),
            linear-gradient(to right, rgba(10,7,5,0.42) 0%, transparent 58%); }
        .hero-left { position: relative; z-index: 2; width: 100%; padding: 4rem var(--gut) clamp(3rem, 8vh, 4.5rem); }
        .hero-title { color: #fff; font-size: clamp(2.6rem, 6.4vw, 5.6rem); line-height: 0.95; letter-spacing: -0.02em; max-width: 13ch; }
        .hero-title-mask { display: block; overflow: hidden; padding-bottom: 0.1em; margin-bottom: -0.1em; }
        .hero-title-in { display: block; text-wrap: balance; transform: translateY(115%); animation: heroTitleRise 0.95s cubic-bezier(.22,1,.36,1) 0.75s forwards; }
        @keyframes heroTitleRise { to { transform: translateY(0); } }
        .hero-usp { margin-top: 1.2rem; max-width: 44ch; font-size: clamp(1.1rem, 1.7vw, 1.4rem); line-height: 1.5; color: rgba(255,255,255,0.88); animation: fadeInUp 0.8s ease 1.2s both; }
        .hero-trust { margin-top: 1.3rem; display: flex; flex-wrap: wrap; gap: 0.3rem 1.6rem; animation: fadeInUp 0.8s ease 1.35s both; }
        .hero-trust.mono { color: rgba(255,255,255,0.82); }
        .hero-trust span { display: inline-flex; align-items: center; gap: 0.55rem; }
        .hero-trust span::before { content: ''; width: 0.4rem; height: 0.4rem; border-radius: 50%; background: var(--accent); }
        .hero-ctas { margin-top: 2.2rem; display: flex; align-items: center; flex-wrap: wrap; gap: 0.75rem 2rem; animation: fadeInUp 0.8s ease 1.5s both; }
        .hero-cta { display: inline-flex; align-items: center; gap: 0.55rem; min-height: 48px; padding: 1.05rem 2.1rem; color: #fff; border: 1.5px solid rgba(255,255,255,0.7); border-radius: 999px; font-family: var(--f); font-size: 1rem; font-weight: 600; letter-spacing: 0.01em; text-decoration: none; transition: transform 0.25s var(--ease-out), background 0.25s, border-color 0.25s; }
        .hero-cta:hover { background: rgba(255,255,255,0.14); border-color: #fff; transform: translateY(-2px); }
        .hero-cta svg { width: 18px; height: 18px; }
        .hero-link { display: inline-flex; align-items: center; gap: 0.55rem; min-height: 44px; color: rgba(255,255,255,0.9); text-decoration: none; font-family: var(--mono-f); text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.78rem; border-bottom: 1px solid rgba(255,255,255,0.35); transition: color 0.25s, border-color 0.25s; }
        .hero-link:hover { color: #fff; border-color: #fff; }
        .hero-link svg { width: 15px; height: 15px; }
        .hero-cta:focus-visible, .hero-link:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        @media (max-width: 600px) {
            .hero-ctas { flex-direction: column; align-items: stretch; gap: 1rem; }
            .hero-cta { justify-content: center; min-height: 54px; padding: 1rem 1.25rem; }
            .hero-link { align-self: flex-start; }
        }

        /* ── DUE STRADE ── */
        .paths { padding-block: clamp(5rem, 12vh, 8rem); }
        .paths-grid { display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid var(--rule); }
        .path { display: flex; flex-direction: column; padding: clamp(2rem, 4vw, 3rem) clamp(1rem, 3vw, 3rem) 0 0; }
        .path + .path { border-left: 1px solid var(--rule); padding-left: clamp(1rem, 3vw, 3rem); }
        .path-n { display: block; font-family: var(--serif); font-size: clamp(2.6rem, 4vw, 3.6rem); line-height: 1; color: var(--accent); letter-spacing: -0.02em; margin-bottom: 1rem; }
        .path h3 { font-family: var(--serif); font-weight: 400; text-transform: uppercase; font-size: clamp(2rem, 3.4vw, 3.2rem); line-height: 0.95; letter-spacing: -0.01em; margin-bottom: 1rem; }
        .path .prose { max-width: 40ch; }
        .path ul { list-style: none; margin: 1.6rem 0 2.2rem; display: grid; gap: 0.55rem; }
        .path li { display: flex; align-items: baseline; gap: 0.7rem; font-weight: 350; font-size: 1.05rem; color: #2b2b2b; }
        .path li::before { content: ''; width: 0.45rem; height: 0.45rem; border-radius: 50%; background: var(--accent); flex: none; transform: translateY(-0.12rem); }
        .path-btn { margin-top: auto; align-self: flex-start; display: inline-flex; align-items: center; justify-content: center; gap: 0.8rem; min-height: 48px; padding: 1.05rem 2rem; border-radius: 999px; background: var(--dark); color: #fff; text-decoration: none; font-family: var(--mono-f); text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.78rem; text-align: center; transition: background 0.25s; }
        .path-btn:hover { background: #2a2a2a; }
        .path-btn svg { width: 1rem; height: 1rem; flex: none; transition: transform 0.35s var(--ease-out); }
        .path-btn:hover svg { transform: translateX(4px); }
        .path-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
        @media (max-width: 960px) {
            .paths-grid { grid-template-columns: 1fr; }
            .path { padding-right: 0; padding-bottom: 2.5rem; }
            .path + .path { border-left: 0; border-top: 1px solid var(--rule); padding-left: 0; }
            .path-btn { align-self: stretch; }
        }

        /* ── FASCIA SCURA ── */
        .band { position: relative; z-index: 1; background: var(--dark); color: var(--white); padding: clamp(5rem, 14vh, 9rem) var(--gut); }
        .band-text { font-family: var(--serif); font-weight: 400; font-size: clamp(2.3rem, 5.2vw, 5rem); line-height: 1.04; letter-spacing: -0.02em; max-width: 17ch; text-wrap: balance; }
        @media (min-width: 961px) { .band { display: grid; grid-template-columns: repeat(4, 1fr); } .band-text { grid-column: 2 / 5; padding-left: clamp(1rem, 2.4vw, 2.5rem); } }

        /* ── COM'È FATTA UNA DOGA (versione statica) ── */
        .layers-sec { padding-block: clamp(5rem, 12vh, 8rem) 0; }
        .layers { list-style: none; display: grid; grid-template-columns: repeat(4, 1fr); border-top: 1px solid var(--rule); }
        .layer { padding: 1.8rem clamp(1rem, 2.4vw, 2.5rem) 0 0; }
        .layer-k { display: flex; align-items: center; gap: 0.8rem; margin-bottom: 0.8rem; }
        .layer-k::before { content: ''; width: 0.7rem; height: 0.7rem; border-radius: 50%; background: var(--sw, var(--accent)); flex: none; }
        .layer h3 { font-family: var(--serif); font-weight: 400; text-transform: uppercase; font-size: clamp(1.7rem, 2.4vw, 2.3rem); line-height: 0.95; letter-spacing: -0.01em; margin-bottom: 0.8rem; }
        .layer .prose { font-size: clamp(1.02rem, 1.15vw, 1.15rem); }
        .has-js .layer { opacity: 0; transform: translateY(16px); transition: opacity 0.8s ease, transform 0.8s var(--ease-out); }
        .has-js .layers.in .layer { opacity: 1; transform: none; }
        .has-js .layers.in .layer:nth-child(2) { transition-delay: 0.12s; }
        .has-js .layers.in .layer:nth-child(3) { transition-delay: 0.24s; }
        .has-js .layers.in .layer:nth-child(4) { transition-delay: 0.36s; }
        @media (max-width: 960px) { .layers { grid-template-columns: 1fr 1fr; row-gap: 2rem; } }
        @media (max-width: 560px) { .layers { grid-template-columns: 1fr; row-gap: 1.6rem; } }

        /* ── CONFRONTO WPC / LEGNO + NOTA SULLA POSA (come wpc.html) ── */
        .cmp { padding-block: clamp(5rem, 12vh, 8rem); }
        .cmp-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .cmp-table th, .cmp-table td { text-align: left; vertical-align: top; padding: 1.6rem clamp(0.75rem, 2vw, 2rem) 1.6rem 0; border-top: 1px solid var(--rule); }
        .cmp-table thead th { border-top: 0; padding-bottom: 1rem; }
        .cmp-table tbody tr:last-child > * { border-bottom: 1px solid var(--rule); }
        .cmp-table .c-k { width: 25%; }
        .cmp-table tbody th { font-family: var(--serif); font-weight: 400; text-transform: uppercase; font-size: clamp(1.4rem, 2vw, 1.9rem); line-height: 1; letter-spacing: -0.01em; }
        .cmp-table td { font-weight: 350; font-size: clamp(1.02rem, 1.15vw, 1.15rem); line-height: 1.5; color: #2b2b2b; }
        .cmp-table td.c-wpc { color: var(--dark); }
        .cmp-table td.c-wood { color: #5f5a54; }
        .note { margin-top: clamp(4.5rem, 11vh, 7.5rem); }
        .note-top { display: grid; grid-template-columns: repeat(4, 1fr); align-items: end; row-gap: 2rem; }
        .note-big { grid-column: 1 / 4; grid-row: 1; font-family: var(--serif); font-weight: 400; font-size: clamp(2.8rem, 7vw, 7rem); line-height: 0.98; letter-spacing: -0.025em; color: var(--dark); max-width: 12ch; text-wrap: balance; }
        .note-side { grid-column: 3 / 5; grid-row: 2; padding-left: clamp(1rem, 2.4vw, 2.5rem); max-width: 44ch; }
        .note-tag { margin-top: 1.4rem; padding-top: 1rem; border-top: 1px solid rgba(17,17,17,0.2); font-family: var(--mono-f); text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.78rem; line-height: 1.6; color: var(--dark); }
        .note-fig { margin-top: clamp(2.5rem, 6vh, 4rem); }
        .note-fig svg { width: 100%; height: auto; display: block; }
        .note-fig .lbl line { stroke: #111; stroke-width: 1; stroke-opacity: 0.55; }
        .note-fig .lbl text { font-family: var(--mono-f); font-size: 15px; letter-spacing: 0.08em; text-transform: uppercase; fill: #3d3a36; }
        .note-legend { display: none; list-style: none; margin-top: 1.5rem; }
        .note-fig .drop { opacity: 0; }
        .note-fig.in .drop { animation: wpcDrop 2.1s cubic-bezier(0.5, 0, 0.75, 0.6) var(--dl) infinite; }
        .note-fig .wind path { stroke-dasharray: 34 140; stroke-dashoffset: 34; opacity: 0; }
        .note-fig.in .wind path { animation: wpcWind 3.2s cubic-bezier(0.45, 0, 0.25, 1) var(--wd) infinite; }
        @keyframes wpcWind { 0% { stroke-dashoffset: 34; opacity: 0; } 12% { opacity: 0.9; } 80% { opacity: 0.9; } 100% { stroke-dashoffset: -100; opacity: 0; } }
        .note-fig.in .gaps path { animation: wpcGap 2.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .has-js .note-fig .lbl { opacity: 0; transition: opacity 0.8s ease 0.3s; }
        .has-js .note-fig.in .lbl { opacity: 1; }
        @keyframes wpcDrop { 0% { transform: translateY(0); opacity: 0; } 12% { opacity: 1; } 78% { opacity: 1; } 100% { transform: translateY(205px); opacity: 0; } }
        @keyframes wpcGap { 0%, 100% { transform: scaleX(1); } 50% { transform: scaleX(0.55); } }
        @media (max-width: 760px) {
            .note-top { grid-template-columns: 1fr; }
            .note-big, .note-side { grid-column: 1; padding-left: 0; }
            .note-side { grid-row: 2; }
            .note-fig { margin-inline: calc(var(--gut) * -0.5); }
            .note-fig .lbl { display: none; }
            .note-legend { display: grid; grid-template-columns: 1fr 1fr; gap: 1.1rem 1rem; }
            .nl-k { display: block; font-family: var(--mono-f); font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--dark); margin-bottom: 0.25rem; }
            .nl-d { display: block; font-size: 0.95rem; line-height: 1.4; color: #4a4642; font-weight: 350; }
            .cmp-table, .cmp-table tbody, .cmp-table tr { display: block; }
            .cmp-table thead { display: none; }
            .cmp-table tr { display: grid; grid-template-columns: 1fr 1fr; column-gap: 1rem; border-top: 1px solid var(--rule); padding: 1.3rem 0; }
            .cmp-table tbody tr:last-child { border-bottom: 1px solid var(--rule); }
            .cmp-table th, .cmp-table td { border: 0 !important; padding: 0; }
            .cmp-table tbody th { grid-column: 1 / -1; margin-bottom: 0.8rem; }
            .cmp-table td::before { content: attr(data-l); display: block; margin-bottom: 0.3rem; font-family: var(--mono-f); font-size: 0.68rem; letter-spacing: 0.08em; text-transform: uppercase; color: #68635d; }
        }

        /* ── LAVORI: numeri + striscia di foto (proporzioni originali, niente tagli) ── */
        .works { padding-block: clamp(5rem, 12vh, 8rem); border-top: 1px solid rgba(17,17,17,0.12); }
        .stats { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid var(--rule); margin-bottom: clamp(2.5rem, 6vh, 4rem); }
        .stat { padding: 1.4rem 1rem 0 0; }
        .stat .n { font-family: var(--serif); font-size: clamp(2.6rem, 5vw, 4.4rem); line-height: 1; letter-spacing: -0.02em; }
        .stat .n sup { font-size: 0.45em; color: var(--accent); vertical-align: super; }
        .stat .l { margin-top: 0.5rem; }
        .strip { display: flex; gap: clamp(0.75rem, 1.2vw, 1.2rem); overflow-x: auto; padding: 0 var(--gut) 1rem; scroll-snap-type: x mandatory; scrollbar-width: thin; }
        .strip figure { flex: 0 0 auto; scroll-snap-align: start; background: var(--light); }
        .strip img { height: clamp(260px, 44vw, 460px); width: auto; max-width: none; }
        .strip:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; }
        .strip-hint { padding-inline: var(--gut); margin-top: 1rem; }
        @media (max-width: 560px) { .stat .l { font-size: 0.66rem; } }

        /* ── COME FUNZIONA: due percorsi numerati (come "Come lo posiamo") ── */
        .flow-sec { padding-block: clamp(4rem, 10vh, 7rem) clamp(5rem, 12vh, 8rem); border-top: 1px solid rgba(17,17,17,0.12); }
        .flow + .flow { margin-top: clamp(3.5rem, 8vh, 5rem); }
        .flow-name { font-family: var(--serif); font-weight: 400; text-transform: uppercase; font-size: clamp(1.6rem, 2.4vw, 2.2rem); line-height: 1; margin-bottom: 2rem; }
        .steps { list-style: none; display: grid; grid-template-columns: repeat(4, 1fr); position: relative; }
        .steps::before { content: ''; position: absolute; left: 0; right: 0; top: 0.55rem; height: 1px; background: rgba(17,17,17,0.2); transform-origin: left; }
        .has-js .steps::before { transform: scaleX(0); transition: transform 1.6s cubic-bezier(0.77, 0, 0.18, 1); }
        .has-js .steps.in::before { transform: scaleX(1); }
        .step-i { position: relative; padding: 2.2rem clamp(1rem, 2.4vw, 2.5rem) 0 0; }
        .step-i::before { content: ''; position: absolute; top: 0.2rem; left: 0; width: 0.75rem; height: 0.75rem; border-radius: 50%; background: var(--bg); border: 1px solid var(--dark); }
        .step-n { display: block; font-family: var(--serif); font-size: clamp(2.6rem, 4vw, 3.6rem); line-height: 1; color: var(--accent); margin-bottom: 1rem; letter-spacing: -0.02em; }
        .step-i h4 { font-family: var(--serif); font-weight: 400; text-transform: uppercase; font-size: clamp(1.45rem, 2vw, 1.85rem); line-height: 1; margin-bottom: 0.8rem; }
        .step-i .prose { font-size: clamp(1rem, 1.1vw, 1.1rem); }
        .has-js .step-i { opacity: 0; transform: translateY(16px); transition: opacity 0.8s ease, transform 0.8s var(--ease-out); }
        .has-js .steps.in .step-i { opacity: 1; transform: none; }
        .has-js .steps.in .step-i:nth-child(2) { transition-delay: 0.15s; }
        .has-js .steps.in .step-i:nth-child(3) { transition-delay: 0.3s; }
        .has-js .steps.in .step-i:nth-child(4) { transition-delay: 0.45s; }
        @media (max-width: 960px) {
            .steps { grid-template-columns: 1fr; gap: 2.2rem; padding-left: 2rem; }
            .steps::before { left: 0.37rem; right: auto; top: 0.5rem; bottom: 0.5rem; width: 1px; height: auto; transform-origin: top; }
            .has-js .steps::before { transform: scaleY(0); }
            .has-js .steps.in::before { transform: scaleY(1); }
            .step-i { padding: 0; }
            .step-i::before { left: -2rem; top: 0.25rem; }
        }

        /* ── FORM ── */
        .lead-form { position: relative; z-index: 1; background: var(--light); padding: clamp(5rem, 12vh, 8rem) var(--gut); scroll-margin-top: var(--nav-h); }
        .lf-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2.5rem 0; align-items: start; }
        .lf-left { grid-column: 1 / 3; padding-right: clamp(1rem, 3vw, 3rem); }
        .lf-right { grid-column: 3 / 5; background: var(--bg); border: 1px solid var(--border); padding: clamp(1.4rem, 3vw, 2.4rem); }
        @media (max-width: 960px) { .lf-grid { grid-template-columns: 1fr; } .lf-left, .lf-right { grid-column: 1; padding-right: 0; } .lf-right { padding: 1.4rem; } }
        .lf-left h2 { font-size: clamp(2.3rem, 4.6vw, 4.4rem); line-height: 0.95; letter-spacing: -0.02em; text-wrap: balance; }
        .lf-left .prose { margin-top: 1.4rem; max-width: 40ch; }
        .lf-contact { display: flex; flex-direction: column; gap: 1.2rem; margin-top: 2.2rem; }
        .lf-contact a { display: inline-flex; flex-direction: column; text-decoration: none; color: var(--dark); align-self: flex-start; min-height: 44px; }
        .lf-contact .lfc-val { font-family: var(--serif); font-size: clamp(1.5rem, 2.2vw, 2rem); line-height: 1.1; border-bottom: 1px solid rgba(17,17,17,0.25); transition: border-color 0.25s; }
        .lf-contact a:hover .lfc-val { border-color: var(--dark); }
        .step-count { margin-bottom: 1.2rem; }
        .choice-group { border: 0; margin: 0 0 1.6rem; padding: 0; min-width: 0; }
        .choice-group legend { padding: 0; margin-bottom: 0.75rem; font-weight: 500; font-size: 1.05rem; }
        .choices { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .choice { position: relative; cursor: pointer; max-width: 100%; }
        .choice input { position: absolute; opacity: 0; width: 1px; height: 1px; }
        .choice span { display: inline-flex; align-items: center; min-height: 44px; padding: 0.5rem 1.1rem; border: 1px solid rgba(17,17,17,0.22); border-radius: 999px; background: #fff; font-size: 0.95rem; transition: border-color 0.2s, background 0.2s, color 0.2s; }
        .choice:hover span { border-color: var(--dark); }
        .choice input:checked + span { background: var(--dark); border-color: var(--dark); color: #fff; }
        .choice input:focus-visible + span { outline: 2px solid var(--accent); outline-offset: 2px; }
        .step-error { color: #8b2e2e; font-size: 0.92rem; margin: -0.4rem 0 1rem; }
        .back-link { display: inline-flex; align-items: center; min-height: 44px; background: none; border: 0; padding: 0; margin-bottom: 0.2rem; cursor: pointer; color: var(--dark); font-family: var(--mono-f); text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.72rem; text-decoration: underline; text-underline-offset: 4px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0 1rem; }
        @media (max-width: 520px) { .form-row { grid-template-columns: 1fr; } }
        .fg { margin-bottom: 1.1rem; }
        .fg label { display: block; margin-bottom: 0.45rem; font-family: var(--mono-f); text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.68rem; color: #68635d; }
        .fg input, .fg textarea { width: 100%; background: #fff; border: 1px solid rgba(17,17,17,0.2); border-radius: 0; padding: 0.9rem 1rem; color: var(--dark); font-family: var(--f); font-size: 1rem; transition: border-color 0.2s, box-shadow 0.2s; }
        .fg input::placeholder, .fg textarea::placeholder { color: #9a938a; }
        .fg input:focus, .fg textarea:focus { outline: none; border-color: var(--dark); box-shadow: 0 0 0 3px rgba(196,168,130,0.3); }
        .fg textarea { resize: vertical; min-height: 96px; }
        .submit-btn { width: 100%; min-height: 54px; border: 0; border-radius: 999px; background: var(--dark); color: #fff; cursor: pointer; font-family: var(--mono-f); text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.8rem; transition: background 0.25s; }
        .submit-btn:hover { background: #2a2a2a; }
        .submit-btn:disabled { opacity: 0.7; cursor: default; }
        .submit-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
        .consent { display: flex; gap: 0.6rem; margin-top: 1rem; font-size: 0.84rem; line-height: 1.5; color: #4a4642; }
        .consent input { flex: none; width: 18px; height: 18px; margin-top: 0.15rem; accent-color: var(--dark); }
        .consent a { color: var(--dark); text-decoration: underline; }
        .form-success { text-align: center; padding: 2.5rem 0; }
        .form-success .big { font-family: var(--serif); text-transform: uppercase; font-size: clamp(1.8rem, 3vw, 2.4rem); line-height: 1; margin-bottom: 0.8rem; }

        /* ── FOOTER (come le pagine interne) ── */
        footer { position: relative; z-index: 1; background: var(--dark-2); color: var(--white); padding: 4rem 4.5rem; }
        .footer-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 3rem; padding-bottom: 2.5rem; border-bottom: 1px solid rgba(255,255,255,0.07); margin-bottom: 2rem; }
        .footer-logo { display: flex; flex-direction: column; align-items: center; align-self: flex-start; width: max-content; margin-bottom: 1.25rem; line-height: 1; }
        .footer-logo .logo-name { font-size: 2rem; color: var(--white); }
        .footer-logo .logo-rule { background: var(--white); opacity: 0.2; }
        .footer-tagline { font-size: 1rem; font-weight: 300; color: rgba(255,255,255,0.45); line-height: 1.6; }
        .footer-col-title { font-size: 0.68rem; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.4); margin-bottom: 1.25rem; }
        .footer-links { list-style: none; display: flex; flex-direction: column; gap: 0.7rem; }
        .footer-links a { color: rgba(255,255,255,0.65); text-decoration: none; transition: color 0.2s; }
        .footer-links a:hover { color: var(--white); }
        .footer-bottom { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
        .footer-copy { font-size: 0.72rem; color: rgba(255,255,255,0.4); }
        .footer-copy a { color: rgba(255,255,255,0.65); text-decoration: underline; }
        @media (max-width: 960px) { footer { padding: 3rem 1.5rem; } .footer-grid { grid-template-columns: 1fr; gap: 2rem; } }

        /* ── FAB contatti rapidi (come le altre pagine) ── */
        .fab-dial{position:fixed;right:1.25rem;bottom:5.5rem;z-index:90;display:flex;flex-direction:column;align-items:flex-end;gap:.6rem}
        .fab-actions{display:flex;flex-direction:column;align-items:flex-end;gap:.55rem}
        .fab-action{display:inline-flex;align-items:center;gap:.55rem;padding:.5rem .95rem .5rem .5rem;background:#fff;color:#1a1a1a;border-radius:999px;text-decoration:none;font-family:inherit;font-weight:600;font-size:.95rem;line-height:1;box-shadow:0 6px 20px rgba(0,0,0,.16);white-space:nowrap;transition:transform .2s cubic-bezier(.16,1,.3,1),box-shadow .2s,opacity .25s cubic-bezier(.16,1,.3,1)}
        .fab-action:hover{transform:translateX(-3px);box-shadow:0 10px 26px rgba(0,0,0,.22)}
        .fab-action:focus-visible{outline:2px solid #111;outline-offset:3px}
        .fab-action .fab-ico{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:var(--accent);color:#111;flex:none}
        .fab-action .fab-ico svg{width:18px;height:18px}
        .fab-toggle{position:relative;align-self:flex-end;width:56px;height:56px;border:0;padding:0;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--accent);color:#111;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.22);transition:transform .25s cubic-bezier(.16,1,.3,1),box-shadow .25s,background .25s}
        .fab-toggle:hover{transform:scale(1.06);background:#d4b892}
        .fab-toggle:focus-visible{outline:2px solid #111;outline-offset:3px}
        .fab-toggle svg{position:absolute;width:26px;height:26px;transition:opacity .2s ease,transform .3s cubic-bezier(.16,1,.3,1)}
        .fab-toggle .ic-close{opacity:0;transform:rotate(-90deg) scale(.5)}
        .fab-dial.fab-ready .fab-action{opacity:0;transform:translateY(12px) scale(.96);pointer-events:none}
        .fab-dial.fab-ready.open .fab-action{opacity:1;transform:none;pointer-events:auto}
        .fab-dial.fab-ready.open .fab-action:nth-last-child(1){transition-delay:.04s}
        .fab-dial.fab-ready.open .fab-action:nth-last-child(2){transition-delay:.10s}
        .fab-dial.fab-ready.open .fab-toggle .ic-open{opacity:0;transform:rotate(90deg) scale(.5)}
        .fab-dial.fab-ready.open .fab-toggle .ic-close{opacity:1;transform:none}

        /* ── Animazioni ridotte: tutto visibile, niente movimento ── */
        @media (prefers-reduced-motion: reduce) {
            #pageCurtain { display: none !important; }
            .hero-media img, .hero-title-in, .hero-usp, .hero-trust, .hero-ctas { animation: none !important; transform: none !important; opacity: 1 !important; }
            .has-js .rv-title .ml-in, .has-js .rv-fade, .has-js .rv-ph img, .has-js .layer, .has-js .step-i, .has-js .steps::before { transform: none !important; opacity: 1 !important; clip-path: none !important; transition: none !important; }
            .note-fig.in .drop, .note-fig.in .wind path, .note-fig.in .gaps path { animation: none; }
            .note-fig .wind path { stroke-dasharray: none; opacity: 0.8; }
            .note-fig .drop { opacity: 1; }
            .has-js .note-fig .lbl { opacity: 1; transition: none; }
            .fab-action, .fab-toggle, .fab-toggle svg { transition: opacity .12s linear; }
            .fab-dial.fab-ready .fab-action { transform: none; }
        }
    </style>
    <link rel="stylesheet" href="type.css?v=8">
</head>
<body>

<div id="pageCurtain" aria-hidden="true">
    <span class="pc-seam"></span>
    <span class="pc-mark">Broccolini Parquet</span>
</div>
<script>setTimeout(function () { var c = document.getElementById('pageCurtain'); if (c) c.style.display = 'none'; }, 1800);</script>
<noscript><style>#pageCurtain{display:none!important}.hero-title-in{transform:none!important;animation:none!important}</style></noscript>

<!-- ── NAV ridotta ── -->
<nav id="navbar">
    <div class="nav-bar">
        <a href="index.html" class="nav-logo">
            <span class="logo-name">Broccolini</span>
            <span class="logo-rule"></span>
            <span class="logo-sub">Parquet</span>
        </a>
        <a href="tel:+393294116649" class="nav-call" id="navCall" data-goal="call" aria-label="Chiama 329 411 6649">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            <span class="txt">329 411 6649</span>
        </a>
    </div>
</nav>

<div class="wpc-lines" aria-hidden="true"></div>

<main>

<!-- ── HERO (come la home) ── -->
<header class="hero">
    <div class="hero-media" id="heroMedia">
        <picture>
            <source media="(max-width:768px)" srcset="img/hero-piscina-foto-m.webp" type="image/webp">
            <source srcset="img/hero-piscina-foto.webp" type="image/webp">
            <img src="img/hero-piscina-foto.jpg" alt="Bordo piscina rivestito in decking WPC color legno" fetchpriority="high" width="1254" height="1254">
        </picture>
    </div>
    <div class="hero-left">
        <h1 class="hero-title">
            <span class="hero-title-mask"><span class="hero-title-in">WPC per esterni, fornito in tutta Italia</span></span>
        </h1>
        <p class="hero-usp">Ti spediamo il materiale per terrazze, giardini e bordi piscina. Se vuoi, lo posiamo noi.</p>
        <p class="hero-trust mono"><span>Spedizione in tutta Italia</span><span>Preventivo entro 24h</span><span>Posa su richiesta</span></p>
        <div class="hero-ctas">
            <a data-cta="hero" class="hero-cta" href="#form" data-goal="quote">
                Richiedi preventivo gratuito
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </a>
            <a class="hero-link" id="heroCall" data-goal="call" href="tel:+393294116649">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                Chiama 329 411 6649
            </a>
        </div>
    </div>
</header>

<!-- ── DUE STRADE ── -->
<section class="paths wrap" aria-labelledby="pathsTitle">
    <div class="sec-head">
        <h2 class="sec-title rv-title" id="pathsTitle"><span class="ml"><span class="ml-in">Scegli tu come</span></span></h2>
        <p class="prose rv-fade">Puoi ricevere solo il materiale oppure affidarci anche la posa. In entrambi i casi hai un unico interlocutore.</p>
    </div>
    <div class="paths-grid">
        <article class="path rv-fade">
            <span class="path-n" aria-hidden="true">01</span>
            <h3>Solo fornitura</h3>
            <p class="prose">Ti spediamo doghe, profili e clip, con le indicazioni per la posa. Pensata per chi ha già un posatore di fiducia o vuole occuparsene da sé.</p>
            <ul>
                <li>Spedizione in tutta Italia</li>
                <li>Doghe, profili e clip</li>
                <li>Indicazioni di posa incluse</li>
            </ul>
            <a class="path-btn" href="#form" data-cta="due_strade" data-offerta="fornitura">Preventivo per la fornitura
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </a>
        </article>
        <article class="path rv-fade">
            <span class="path-n" aria-hidden="true">02</span>
            <h3>Fornitura e posa</h3>
            <p class="prose">Pensiamo a tutto noi: sopralluogo, materiale, sottostruttura e posa con clip a scomparsa, fino alla consegna del lavoro finito.</p>
            <ul>
                <li>Sopralluogo gratuito</li>
                <li>Un solo referente dall'inizio alla fine</li>
                <li>Posa senza viti a vista</li>
            </ul>
            <a class="path-btn" href="#form" data-cta="due_strade" data-offerta="fornitura_posa">Preventivo con posa
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </a>
        </article>
    </div>
</section>

<!-- ── FASCIA SCURA ── -->
<section class="band" aria-label="In sintesi">
    <p class="band-text rv-title"><span class="ml"><span class="ml-in">L’aspetto del legno, con la resistenza di un materiale nato per l’esterno.</span></span></p>
</section>

<!-- ── COM'È FATTA UNA DOGA ── -->
<section class="layers-sec wrap" aria-labelledby="layersTitle">
    <div class="sec-head">
        <h2 class="sec-title rv-title" id="layersTitle"><span class="ml"><span class="ml-in">Com’è fatta una doga</span></span></h2>
        <p class="prose rv-fade">Quattro ingredienti, ognuno con un compito preciso.</p>
    </div>
    <ol class="layers" id="layers">
        <li class="layer" style="--sw:#b07f52"><p class="layer-k mono">Strato 1</p><h3>Fibra di legno</h3><p class="prose">Fibre e farina di legno, in buona parte di recupero: danno alla doga peso, venatura e una superficie piacevole al tatto.</p></li>
        <li class="layer" style="--sw:#d9cbb6"><p class="layer-k mono">Strato 2</p><h3>Polimero</h3><p class="prose">Lega le fibre e le chiude una per una: per questo il WPC non beve acqua come il legno e non si apre in schegge.</p></li>
        <li class="layer" style="--sw:#e9c98f"><p class="layer-k mono">Strato 3</p><h3>Additivi</h3><p class="prose">Proteggono il colore dai raggi del sole e rendono la superficie poco attaccabile da muffe e insetti.</p></li>
        <li class="layer" style="--sw:#4a2e18"><p class="layer-k mono">Strato 4</p><h3>Guscio protettivo</h3><p class="prose">Nelle doghe di nuova generazione avvolge tutto il profilo: resiste a macchie e graffi e si pulisce con acqua e detergente neutro.</p></li>
    </ol>
</section>

<!-- ── CONFRONTO WPC / LEGNO + NOTA SULLA POSA ── -->
<section class="cmp wrap" aria-labelledby="cmpTitle">
    <div class="sec-head">
        <h2 class="sec-title rv-title" id="cmpTitle"><span class="ml"><span class="ml-in">WPC e legno a confronto</span></span></h2>
    </div>
    <table class="cmp-table rv-fade">
        <thead>
            <tr><th class="c-k mono" scope="col">Aspetto</th><th class="mono" scope="col">WPC</th><th class="mono" scope="col">Legno naturale</th></tr>
        </thead>
        <tbody>
            <tr><th scope="row">Manutenzione</th><td class="c-wpc" data-l="WPC">Si lava con acqua e un detergente neutro. Niente oli né impregnanti.</td><td class="c-wood" data-l="Legno">Va oliato o impregnato ogni anno, e col tempo carteggiato.</td></tr>
            <tr><th scope="row">Acqua e umidità</th><td class="c-wpc" data-l="WPC">Assorbe pochissima acqua: non marcisce e non si gonfia con l'umidità.</td><td class="c-wood" data-l="Legno">Assorbe acqua: negli anni può gonfiarsi, imbarcarsi o marcire.</td></tr>
            <tr><th scope="row">Sole</th><td class="c-wpc" data-l="WPC">Il colore è stabilizzato e cambia poco nel tempo.</td><td class="c-wood" data-l="Legno">Senza trattamenti ingrigisce in pochi mesi.</td></tr>
            <tr><th scope="row">A piedi nudi</th><td class="c-wpc" data-l="WPC">Superficie antiscivolo e niente schegge, anche a bordo piscina.</td><td class="c-wood" data-l="Legno">Con l'usura può scheggiarsi e da bagnato diventa scivoloso.</td></tr>
        </tbody>
    </table>
<!--NOTE-WPC-->
</section>

<!-- ── LAVORI ── -->
<section class="works" aria-labelledby="worksTitle">
    <div class="wrap">
        <div class="sec-head">
            <h2 class="sec-title rv-title" id="worksTitle"><span class="ml"><span class="ml-in">Lavori realizzati in WPC</span></span></h2>
        </div>
        <div class="stats rv-fade">
            <div class="stat"><div class="n">35<sup>+</sup></div><p class="l mono">anni di esperienza del posatore</p></div>
            <div class="stat"><div class="n">50.000<sup>+</sup></div><p class="l mono">m² di superfici posate</p></div>
            <div class="stat"><div class="n">300<sup>+</sup></div><p class="l mono">cantieri completati</p></div>
        </div>
    </div>
    <div class="strip" tabindex="0" aria-label="Galleria dei lavori, scorri in orizzontale">
        <figure class="rv-ph"><img src="img/wpc/piscina-gradini-m.webp" alt="Bordo piscina con gradini rivestiti in WPC" width="900" height="970" loading="lazy"></figure>
        <figure class="rv-ph"><img src="img/wpc/rivestimento-terrazza-m.webp" alt="Terrazza con pavimento e rivestimento in WPC" width="900" height="600" loading="lazy"></figure>
        <figure class="rv-ph"><img src="img/wpc/terrazzo-fioriere-m.webp" alt="Terrazzo in WPC con fioriere" width="900" height="1200" loading="lazy"></figure>
        <figure class="rv-ph"><img src="img/wpc/villa-wpc-m.webp" alt="Esterno di villa con pavimento in WPC" width="900" height="507" loading="lazy"></figure>
        <figure class="rv-ph"><img src="img/wpc/piscina-dall-alto-m.webp" alt="Piscina vista dall'alto con bordo in WPC" width="900" height="900" loading="lazy"></figure>
        <figure class="rv-ph"><img src="img/wpc/jacuzzi-terrazza.webp" alt="Terrazza con jacuzzi rivestita in WPC" width="742" height="1000" loading="lazy"></figure>
        <figure class="rv-ph"><img src="img/wpc/piscina-colline.webp" alt="Piscina in collina con bordo in WPC" width="639" height="1000" loading="lazy"></figure>
    </div>
    <p class="strip-hint mono">Scorri per vedere altri lavori →</p>
</section>

<!-- ── COME FUNZIONA ── -->
<section class="flow-sec wrap" aria-labelledby="flowTitle">
    <div class="sec-head">
        <h2 class="sec-title rv-title" id="flowTitle"><span class="ml"><span class="ml-in">Come funziona</span></span></h2>
    </div>
    <div class="flow">
        <h3 class="flow-name">Solo fornitura</h3>
        <ol class="steps">
            <li class="step-i"><span class="step-n" aria-hidden="true">01</span><h4>Richiesta</h4><p class="prose">Ci dici dove va il pavimento, quanti metri quadri e che effetto cerchi.</p></li>
            <li class="step-i"><span class="step-n" aria-hidden="true">02</span><h4>Preventivo</h4><p class="prose">Ti mandiamo il preventivo del materiale entro 24 ore lavorative.</p></li>
            <li class="step-i"><span class="step-n" aria-hidden="true">03</span><h4>Spedizione</h4><p class="prose">Spediamo doghe, profili e clip in tutta Italia, con le indicazioni per la posa.</p></li>
        </ol>
    </div>
    <div class="flow">
        <h3 class="flow-name">Fornitura e posa</h3>
        <ol class="steps">
            <li class="step-i"><span class="step-n" aria-hidden="true">01</span><h4>Richiesta</h4><p class="prose">Ci racconti il progetto e fissiamo il sopralluogo gratuito.</p></li>
            <li class="step-i"><span class="step-n" aria-hidden="true">02</span><h4>Sopralluogo</h4><p class="prose">Misuriamo, controlliamo il fondo e le pendenze e ti prepariamo il preventivo.</p></li>
            <li class="step-i"><span class="step-n" aria-hidden="true">03</span><h4>Posa</h4><p class="prose">Sottostruttura ventilata e doghe fissate con clip a scomparsa, senza viti a vista.</p></li>
            <li class="step-i"><span class="step-n" aria-hidden="true">04</span><h4>Consegna</h4><p class="prose">Ti consegniamo il lavoro finito e ti spieghiamo come pulirlo.</p></li>
        </ol>
    </div>
</section>

<!-- ── FORM ── -->
<section class="lead-form" id="form" aria-labelledby="formTitle">
    <div class="lf-grid">
        <div class="lf-left">
            <h2 class="rv-title" id="formTitle"><span class="ml"><span class="ml-in">Richiedi il tuo preventivo gratuito</span></span></h2>
            <p class="prose rv-fade">Tre domande veloci e i tuoi contatti: ti rispondiamo entro 24 ore lavorative con una prima valutazione.</p>
            <div class="lf-contact rv-fade">
                <a href="tel:+393294116649" id="sideCall" data-goal="call"><span class="mono">Telefono</span><span class="lfc-val">329 411 6649</span></a>
                <a href="mailto:info@broccoliniparquet.it"><span class="mono">Email</span><span class="lfc-val">info@broccoliniparquet.it</span></a>
            </div>
        </div>

        <div class="lf-right">
            <!-- Senza JavaScript il form invia direttamente a Web3Forms su un'unica pagina -->
            <form id="contactForm" action="https://api.web3forms.com/submit" method="POST" onsubmit="handleSubmit(event)">
                <input type="hidden" name="access_key" value="72318e8e-7bbc-4405-9cde-44fc38a00f7e">
                <input type="hidden" name="subject" value="[Fornitura WPC] Nuova richiesta">
                <input type="hidden" name="from_name" value="Broccolini Parquet — Landing Fornitura WPC">
                <input type="checkbox" name="botcheck" style="display:none" tabindex="-1" autocomplete="off">

                <div class="form-step" id="step1">
                    <p class="step-count mono" hidden>Passaggio 1 di 2</p>
                    <fieldset class="choice-group">
                        <legend>Cosa ti serve?</legend>
                        <div class="choices">
                            <label class="choice"><input type="radio" name="tipo_richiesta" value="Solo fornitura" data-code="fornitura" required><span>Solo fornitura</span></label>
                            <label class="choice"><input type="radio" name="tipo_richiesta" value="Fornitura e posa" data-code="fornitura_posa"><span>Fornitura e posa</span></label>
                            <label class="choice"><input type="radio" name="tipo_richiesta" value="Non so ancora" data-code="non_so"><span>Non so ancora</span></label>
                        </div>
                    </fieldset>
                    <fieldset class="choice-group">
                        <legend>Quanti metri quadri, più o meno?</legend>
                        <div class="choices">
                            <label class="choice"><input type="radio" name="mq" value="Meno di 20 m²" data-code="lt20" required><span>Meno di 20 m²</span></label>
                            <label class="choice"><input type="radio" name="mq" value="20–50 m²" data-code="20_50"><span>20–50 m²</span></label>
                            <label class="choice"><input type="radio" name="mq" value="50–100 m²" data-code="50_100"><span>50–100 m²</span></label>
                            <label class="choice"><input type="radio" name="mq" value="Oltre 100 m²" data-code="gt100"><span>Oltre 100 m²</span></label>
                            <label class="choice"><input type="radio" name="mq" value="Non so" data-code="non_so"><span>Non so</span></label>
                        </div>
                    </fieldset>
                    <fieldset class="choice-group">
                        <legend>Quando vorresti realizzarlo?</legend>
                        <div class="choices">
                            <label class="choice"><input type="radio" name="tempistica" value="Entro 1 mese" data-code="1m" required><span>Entro 1 mese</span></label>
                            <label class="choice"><input type="radio" name="tempistica" value="1–3 mesi" data-code="1_3m"><span>1–3 mesi</span></label>
                            <label class="choice"><input type="radio" name="tempistica" value="Oltre 3 mesi" data-code="gt3m"><span>Oltre 3 mesi</span></label>
                            <label class="choice"><input type="radio" name="tempistica" value="Sto solo valutando" data-code="valuto"><span>Sto solo valutando</span></label>
                        </div>
                    </fieldset>
                    <p class="step-error" id="step1Error" role="alert" hidden>Scegli una risposta per ogni domanda, poi premi Avanti.</p>
                    <button type="button" class="submit-btn" id="nextBtn" hidden>Avanti</button>
                </div>

                <div class="form-step" id="step2">
                    <button type="button" class="back-link" id="backBtn" hidden>← Indietro</button>
                    <p class="step-count mono" hidden>Passaggio 2 di 2</p>
                    <div class="form-row">
                        <div class="fg"><label for="nome">Nome</label><input type="text" id="nome" name="nome" placeholder="Mario Rossi" autocomplete="name" required></div>
                        <div class="fg"><label for="telefono">Telefono</label><input type="tel" id="telefono" name="telefono" placeholder="+39 333 000 0000" autocomplete="tel" required></div>
                    </div>
                    <div class="form-row">
                        <div class="fg"><label for="email">Email</label><input type="email" id="email" name="email" placeholder="mario@esempio.it" autocomplete="email" required></div>
                        <div class="fg"><label for="localita">Città o provincia</label><input type="text" id="localita" name="localita" placeholder="Es. Pescara" autocomplete="address-level2" required></div>
                    </div>
                    <div class="fg"><label for="messaggio">Il tuo progetto (facoltativo)</label><textarea id="messaggio" name="messaggio" placeholder="Es. terrazza in cemento da rivestire, colore chiaro, consegna in primavera."></textarea></div>
                    <button type="submit" class="submit-btn" id="submitBtn">Invia richiesta</button>
                    <div class="consent">
                        <input type="checkbox" id="privacyConsent" name="privacy_consent" required>
                        <label for="privacyConsent">Ho letto la <a href="https://www.iubenda.com/privacy-policy/73481809" target="_blank" rel="noopener">Privacy Policy</a> e acconsento al trattamento dei miei dati per essere ricontattato. I dati non saranno ceduti a terzi. *</label>
                    </div>
                </div>
            </form>

            <div id="formSuccess" class="form-success" role="status" style="display:none">
                <p class="big">Richiesta inviata</p>
                <p class="prose">Ti risponderemo entro 24 ore lavorative.</p>
            </div>
        </div>
    </div>
</section>

</main>

<!-- ── FOOTER ── -->
<footer>
    <div class="footer-grid">
        <div>
            <div class="footer-logo">
                <span class="logo-name">Broccolini</span>
                <span class="logo-rule"></span>
                <span class="logo-sub">Parquet</span>
            </div>
            <p class="footer-tagline">Fornitura e posa di parquet<br>e pavimenti WPC da esterno.</p>
        </div>
        <div>
            <p class="footer-col-title">Contatti</p>
            <ul class="footer-links">
                <li><a href="mailto:info@broccoliniparquet.it">info@broccoliniparquet.it</a></li>
                <li><a href="index.html">Vai al sito</a></li>
            </ul>
        </div>
    </div>
    <div class="footer-bottom">
        <p class="footer-copy">© 2026 Broccolini Srls · P.IVA 01937410676 · Via San Giuseppe SNC, Teramo (TE)</p>
        <p class="footer-copy"><a href="https://www.iubenda.com/privacy-policy/73481809" target="_blank" rel="noopener">Privacy Policy</a> · <a href="https://www.iubenda.com/privacy-policy/73481809/cookie-policy" target="_blank" rel="noopener">Cookie Policy</a></p>
    </div>
</footer>

<!-- ── FAB contatti rapidi ── -->
<div class="fab-dial" id="fabDial">
    <div class="fab-actions" id="fabMenu">
        <a data-cta="pulsante_flottante" class="fab-action" href="#form" data-goal="quote">
            <span class="fab-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg></span>
            <span>Richiedi preventivo</span>
        </a>
        <a class="fab-action" id="callFab" data-goal="call" href="tel:+393294116649">
            <span class="fab-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg></span>
            <span>Chiama</span>
        </a>
    </div>
    <button class="fab-toggle" id="fabToggle" type="button" aria-expanded="false" aria-controls="fabMenu" aria-label="Apri i contatti rapidi">
        <svg class="ic-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        <svg class="ic-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
</div>

<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/ScrollTrigger.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/lenis@1.3.26/dist/lenis.min.js"></script>
<script>
    document.documentElement.classList.add('has-js');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── Livello conversioni (GA4 + Google Ads) ──
    window.trackConversion = function (name, params) {
        params = params || {};
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push(Object.assign({ event: name }, params));
        if (typeof window.gtag === 'function') {
            window.gtag('event', name, params);
            const adsSendTo = {
                call_click: 'AW-18382303561/HQnECIrS8t8cEMnirr1E',
                lead_form_submit: 'AW-18382303561/3Zg5CIyGg-AcEMnirr1E'
            };
            if (adsSendTo[name]) window.gtag('event', 'conversion', { send_to: adsSendTo[name] });
        }
    };
    ['navCall', 'heroCall', 'sideCall', 'callFab'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', () => window.trackConversion('call_click'));
    });

    // ── Sipario d'ingresso e tra pagine (come le altre pagine) ──
    (function () {
        const curtain = document.getElementById('pageCurtain');
        if (!curtain) return;
        const seam = curtain.querySelector('.pc-seam');
        const mark = curtain.querySelector('.pc-mark');
        if (!window.gsap || reduceMotion) { curtain.style.display = 'none'; return; }
        gsap.timeline()
            .set(mark, { opacity: 0, y: 8 })
            .set(seam, { scaleX: 0 })
            .to(mark, { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' }, 0.05)
            .to(seam, { scaleX: 1, duration: 0.28, ease: 'power3.out' }, 0.1)
            .to(mark, { opacity: 0, duration: 0.15 }, 0.46)
            .to(curtain, { yPercent: -101, duration: 0.5, ease: 'power3.inOut', onComplete: () => { curtain.style.display = 'none'; } }, 0.38);
        document.querySelectorAll('a[href]').forEach((a) => {
            const href = a.getAttribute('href');
            if (!href || href.charAt(0) === '#' || href.includes('://') || /^(mailto|tel|javascript):/i.test(href) || a.target === '_blank') return;
            a.addEventListener('click', (e) => {
                if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                e.preventDefault();
                curtain.style.display = 'block';
                gsap.timeline({ onComplete: () => { window.location.href = href; } })
                    .set(curtain, { yPercent: 101 }).set(seam, { scaleX: 0 }).set(mark, { opacity: 0 })
                    .to(curtain, { yPercent: 0, duration: 0.45, ease: 'power3.inOut' })
                    .to(seam, { scaleX: 1, duration: 0.22, ease: 'power3.out' }, 0.2);
            });
        });
    })();

    // ── Smooth scroll solo con mouse/trackpad (col dito lo scroll resta nativo) ──
    (function () {
        if (reduceMotion || !window.gsap || !window.ScrollTrigger) return;
        gsap.registerPlugin(ScrollTrigger);
        if (window.Lenis && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
            const lenis = new Lenis({ lerp: 0.09 });
            lenis.on('scroll', ScrollTrigger.update);
            gsap.ticker.add((time) => lenis.raf(time * 1000));
            gsap.ticker.lagSmoothing(0);
            window.__lenis = lenis;
        }
        // i link interni (#form) scorrono con Lenis quando è attivo
        document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
            const target = a.getAttribute('href').length > 1 && document.querySelector(a.getAttribute('href'));
            if (!target || !window.__lenis) return;
            e.preventDefault();
            window.__lenis.scrollTo(target, { offset: 0 });
        }));
    })();

    // ── Video dell'hero: solo da computer (da telefono resta la foto, più leggera) ──
    (function () {
        if (reduceMotion || !window.matchMedia('(min-width: 769px)').matches) return;
        const media = document.getElementById('heroMedia');
        const video = document.createElement('video');
        video.className = 'hero-video';
        video.muted = true; video.loop = true; video.autoplay = true; video.playsInline = true;
        video.setAttribute('playsinline', ''); video.setAttribute('aria-hidden', 'true');
        video.src = 'img/hero-piscina.mp4';
        video.addEventListener('playing', () => video.classList.add('is-playing'));
        media.appendChild(video);
    })();

    // ── Entrate leggere: titoli mascherati, testi, foto, strati, passi, disegno della posa ──
    (function () {
        const els = document.querySelectorAll('.rv-title, .rv-fade, .rv-ph, .rv-fig, .layers, .steps');
        if (reduceMotion || !('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('in')); return; }
        const io = new IntersectionObserver((entries) => {
            entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
        }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
        els.forEach((el) => io.observe(el));
    })();

    // ── Form a due passaggi ──
    (function () {
        const form = document.getElementById('contactForm');
        const step1 = document.getElementById('step1');
        const step2 = document.getElementById('step2');
        const next = document.getElementById('nextBtn');
        const back = document.getElementById('backBtn');
        const error = document.getElementById('step1Error');
        const GROUPS = ['tipo_richiesta', 'mq', 'tempistica'];
        const checked = (name) => form.querySelector('input[name="' + name + '"]:checked');

        /** Codici delle tre scelte per GA4: mai dati personali. */
        window.formChoices = function () {
            const out = {};
            GROUPS.forEach((name) => { const el = checked(name); out[name] = el ? el.getAttribute('data-code') : 'non_indicato'; });
            return out;
        };
        function showStep(n) {
            step1.hidden = n !== 1;
            step2.hidden = n !== 2;
            if (window.ScrollTrigger) ScrollTrigger.refresh();
        }

        // Con JavaScript il form diventa a due passaggi; senza, resta tutto in una pagina.
        next.hidden = false;
        back.hidden = false;
        form.querySelectorAll('.step-count').forEach((el) => { el.hidden = false; });
        showStep(1);

        next.addEventListener('click', () => {
            const missing = GROUPS.filter((name) => !checked(name));
            if (missing.length) {
                error.hidden = false;
                form.querySelector('input[name="' + missing[0] + '"]').focus();
                return;
            }
            error.hidden = true;
            window.trackConversion('form_step2', window.formChoices());
            showStep(2);
            document.getElementById('nome').focus();
        });
        back.addEventListener('click', () => {
            showStep(1);
            (checked('tipo_richiesta') || form.querySelector('input[name="tipo_richiesta"]')).focus();
        });
        form.addEventListener('change', (event) => {
            if (event.target.name === 'tipo_richiesta') {
                window.trackConversion('scelta_offerta', { tipo_richiesta: event.target.getAttribute('data-code'), origine: 'form' });
            }
            if (GROUPS.every(checked)) error.hidden = true;
        });
        // Riquadri "Due strade": portano al form con la scelta già fatta.
        document.querySelectorAll('[data-offerta]').forEach((link) => link.addEventListener('click', () => {
            const code = link.getAttribute('data-offerta');
            const radio = form.querySelector('input[name="tipo_richiesta"][data-code="' + code + '"]');
            if (radio) radio.checked = true;
            showStep(1);
            window.trackConversion('scelta_offerta', { tipo_richiesta: code, origine: 'riquadro' });
        }));
    })();

    // ── Invio form (Web3Forms) ──
    async function handleSubmit(e) {
        e.preventDefault();
        const btn = document.getElementById('submitBtn');
        const form = document.getElementById('contactForm');
        const successEl = document.getElementById('formSuccess');
        btn.textContent = 'Invio in corso…';
        btn.disabled = true;
        try {
            const res = await fetch('https://api.web3forms.com/submit', { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) });
            const json = await res.json();
            if (!json.success) throw new Error(json.message || 'Errore invio');
            form.style.display = 'none';
            successEl.style.display = 'block';
            window.trackConversion('lead_form_submit', Object.assign({}, window.ctaOrigin ? window.ctaOrigin() : {}, window.formChoices()));
        } catch (err) {
            btn.textContent = 'Errore — riprova';
            btn.style.background = '#8b2e2e';
            btn.disabled = false;
            setTimeout(() => { btn.textContent = 'Invia richiesta'; btn.style.background = ''; }, 2600);
        }
    }

    // ── FAB speed-dial ──
    (function () {
        const dial = document.getElementById('fabDial');
        const toggle = document.getElementById('fabToggle');
        if (!dial || !toggle) return;
        dial.classList.add('fab-ready');
        let isOpen = false;
        function setOpen(v) {
            isOpen = v;
            dial.classList.toggle('open', v);
            toggle.setAttribute('aria-expanded', v ? 'true' : 'false');
            toggle.setAttribute('aria-label', v ? 'Chiudi i contatti rapidi' : 'Apri i contatti rapidi');
        }
        toggle.addEventListener('click', (e) => { e.stopPropagation(); setOpen(!isOpen); });
        document.addEventListener('click', (e) => { if (isOpen && !dial.contains(e.target)) setOpen(false); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen) { setOpen(false); toggle.focus(); } });
        dial.querySelectorAll('.fab-action').forEach((a) => a.addEventListener('click', () => setOpen(false)));
    })();
</script>

<script src="cta-tracking.js?v=1"></script>
</body>
</html>
```

- [ ] **Step 2: Inserisci il blocco `.note`** al posto di `<!--NOTE-WPC-->`, copiandolo identico da `wpc.html` (righe 767–870, delimitate come indicato in Interfaces). Lo script di estrazione deve fermarsi se il blocco non inizia con `<div class="note"` o se non contiene `class="note-fig rv-fig"`.

- [ ] **Step 3: Esegui il test**

Run: `cd "/c/Users/fedeb/OneDrive/Claude workspace" && node _check-fornitura.mjs </dev/null`
Expected: `TUTTO OK`. Ogni ✘ si corregge nella pagina, non nel test, a meno che il test sia sbagliato. In quel caso correggilo e scrivi il motivo nel commit.

- [ ] **Step 4: Commit**

```bash
cd "/c/Users/fedeb/OneDrive/Claude workspace"
git add Broccoliniparquet/fornitura-wpc.html
git commit -m "Landing Fornitura WPC nello stile del sito: test di domanda con form a due passaggi"
```

---

### Task 3: Verifica visiva e rifinitura

**Files:**
- Modify: `Broccoliniparquet/fornitura-wpc.html` (solo CSS e testi, se la revisione lo richiede)

- [ ] **Step 1: Screenshot.** Con un server statico locale (lo stesso del test), scatta la prima schermata e la pagina intera a 390px e a 1440px.
  - Prima dello scatto scorri tutta la pagina, così si attivano `loading="lazy"` e le entrate `rv-*`.
  - Poi riporta la pagina in cima.
  - Salva in `_shots/` (temporanea, da cancellare a fine task).
- [ ] **Step 2: Revisione critica** con la skill `impeccable` e confronto con `wpc.html` e la home. Controlla:
  - coerenza dello stile con il resto del sito;
  - prima schermata su mobile: titolo, sottotitolo e pulsante visibili senza scorrere;
  - leggibilità sull'immagine;
  - ritmo degli spazi tra le sezioni;
  - tabella su mobile;
  - scelte del form a 360px;
  - galleria senza tagli;
  - pulsante flottante che non copre l'invio.
- [ ] **Step 3: Applica le correzioni.** Poi rilancia `node _check-fornitura.mjs` e rifai gli screenshot.
Expected: `TUTTO OK` e nessun difetto visivo residuo.
- [ ] **Step 4: Commit**

```bash
git add Broccoliniparquet/fornitura-wpc.html
git commit -m "Landing Fornitura WPC: rifiniture visive"
```

---

### Task 4: Pubblicazione e consegna

- [ ] **Step 1: Pubblica, solo dopo la conferma di Federico.**
  - `git push origin main` e attendi il deploy di Vercel.
  - Controlla che `curl -s -o /dev/null -w "%{http_code}" https://www.broccoliniparquet.it/fornitura-wpc.html` restituisca 200.
- [ ] **Step 2: Verifica dal vivo** adattando `_check-cta-live.mjs`, cioè leggendo i beacon GA4.
  - Usa un browser nuovo e accetta il banner.
  - Clicca "Preventivo per la fornitura", fai le scelte e premi Avanti.
  - Verifica che `scelta_offerta` e `form_step2` arrivino a `/g/collect` con i parametri.
  - **Non** inviare il form vero.
- [ ] **Step 3: Aggiorna la memoria** in `project_google_ads.md`: nuova landing, eventi, dimensioni da registrare.
- [ ] **Step 4: Istruzioni a Federico**
  1. **GA4 → Definizioni personalizzate:** registra `tipo_richiesta`, `mq` e `tempistica`, con ambito evento.
  2. **Google Ads:** crea un nuovo gruppo di annunci nella campagna esistente.
     - URL finale: `https://www.broccoliniparquet.it/fornitura-wpc.html`.
     - Parole chiave da fornitura, per esempio *decking wpc prezzo*, *acquisto decking wpc*, *pavimento wpc esterno fornitura*, *doghe wpc vendita*.
     - L'annuncio attuale resta sulla landing decking.
  3. **Regola di decisione:** dopo almeno 150 clic, se almeno 1 richiesta su 4 è di sola fornitura da 20 m² in su, si passa allo studio dei prezzi.
