# Landing "Fornitura WPC" — Spec di design

Data: 2026-10-15 · Stato: in revisione · Sito: broccoliniparquet.it

## 1. Obiettivo

Una landing per Google Ads che **testa la domanda di sola fornitura** di WPC per esterni in tutta Italia, offrendo la posa come opzione. La pagina deve:

- convincere: hero in stile home + contenuti essenziali di "Cos'è il WPC";
- **misurare**: ogni richiesta, e ogni scelta anche senza invio, dice se la persona vuole solo il materiale o anche la posa, quanti m² e con che tempistica.

**Fuori scope:** prezzi sulla pagina (lo studio dei prezzi non è ancora fatto), e-commerce, versione inglese, modifiche a `wpc.html`, a `decking-wpc-esterni.html` e alle altre pagine.

## 2. Decisioni prese

| Tema | Decisione |
|---|---|
| Tipo di pagina | Nuova, separata: `Broccoliniparquet/fornitura-wpc.html` |
| Offerta | Fornitura in tutta Italia; posa su richiesta |
| Mercato | Solo Italia, pagina in italiano |
| Prezzi | Nessuno: "Richiedi preventivo gratuito" |
| Indicizzazione | `noindex, follow`; non inserita in `sitemap.xml` né nel menu del sito |
| Annunci | Nuovo gruppo di annunci con parole chiave da fornitura → questa pagina. L'annuncio attuale resta sulla landing decking: le due pagine si confrontano in parallelo. |

## 3. Struttura della pagina

1. **Header minimale:** logo (link alla home) + numero di telefono cliccabile. Niente menu completo, per non distrarre.
2. **Hero in stile home:** foto o video di un lavoro reale in WPC.
   - Titolo, proposta: "WPC per esterni, fornito in tutta Italia".
   - Sottotitolo, proposta: "Ti spediamo il materiale per terrazze, giardini e bordi piscina. Se vuoi, lo posiamo noi."
   - Pulsanti: **Richiedi preventivo gratuito** (→ `#form`) e **Chiama**.
   - Tre rassicurazioni brevi: "Spedizione in tutta Italia", "Preventivo entro 24h", "Posa disponibile su richiesta".
3. **Due strade:** due riquadri affiancati (impilati su mobile). Ciascuno è cliccabile, porta al form con quella scelta già selezionata e invia `scelta_offerta`.
   - **Solo fornitura:** ricevi doghe, profili e clip con le indicazioni di posa.
   - **Fornitura e posa:** un solo referente, dal sopralluogo alla consegna del lavoro finito.
4. **Cos'è il WPC, in breve:** versione accorciata delle sezioni di `wpc.html`:
   - di cosa è fatto, in modo qualitativo;
   - perché all'aperto è meglio del legno (confronto essenziale);
   - fissaggio a clip senza viti a vista.

   Massimo tre blocchi.
5. **Lavori reali:** galleria con le foto WPC già sul sito (`img/lavoro-*`, `img/dettaglio-*`). Le foto non si tagliano mai: cornici con le proporzioni originali.
6. **Come funziona:** due righe di passaggi.
   - Fornitura: richiesta → preventivo → spedizione.
   - Posa: richiesta → sopralluogo → posa → consegna.
7. **Form** (`#form`), vedi §4.
8. **Footer** come le altre pagine: P.IVA, Privacy e Cookie Policy Iubenda.

**Regole contenuti** (già in vigore per il WPC):
- solo affermazioni qualitative;
- niente percentuali di composizione, classi o valori di laboratorio, marchi del produttore, garanzie in anni;
- niente "zero manutenzione" assoluto, niente "non scotta".

**Regole grafiche:**
- titoli monocolore e monostile, niente eyebrow;
- stessi font, colori e `type.css` del sito;
- linguaggio da azienda di servizi (fornitura, posa, preventivo), non da produttore.

## 4. Form in due passaggi

**Passaggio 1:** tre scelte a pulsante, tutte obbligatorie per proseguire.
- `tipo_richiesta`: Solo fornitura (`fornitura`) / Fornitura e posa (`fornitura_posa`) / Non so ancora (`non_so`)
- `mq`: Meno di 20 (`lt20`) / 20–50 (`20_50`) / 50–100 (`50_100`) / Oltre 100 (`gt100`) / Non so (`non_so`)
- `tempistica`: Entro 1 mese (`1m`) / 1–3 mesi (`1_3m`) / Oltre 3 mesi (`gt3m`) / Sto solo valutando (`valuto`)

Pulsante **"Avanti"**.

**Passaggio 2:**
- campi: nome*, telefono*, email*, città o provincia*, messaggio (facoltativo), consenso privacy* (link Iubenda);
- pulsante **"Invia richiesta"** e un link "← Indietro" che conserva le scelte.

**Invio:** Web3Forms con la stessa chiave del sito.
- Oggetto: `[Fornitura WPC] Nuova richiesta`.
- Le tre scelte arrivano nell'email in testo leggibile ("Solo fornitura", "20–50 m²"…).
- Protezioni come le altre pagine: honeypot `botcheck` e messaggio di successo nella pagina.

**Senza JavaScript** il form mostra tutti i campi in un unico passaggio e funziona lo stesso.

**Accessibilità:**
- le scelte sono veri `radio` dentro `fieldset` con `legend`;
- passando al passaggio 2 il focus va al primo campo;
- target ≥ 44px.

## 5. Tracciamento

Si riusano `cta-tracking.js` (eventi `cta_preventivo` e `form_start`) e `trackConversion(name, params)`.

| Evento | Quando | Parametri |
|---|---|---|
| `cta_preventivo` | clic su link con `data-cta` (`hero`, `due_strade`, `pulsante_flottante`…) | `cta_posizione`, `cta_pagina` |
| `scelta_offerta` | clic su un riquadro "Due strade", oppure scelta di `tipo_richiesta` nel passaggio 1 | `tipo_richiesta`, `origine` (`riquadro` / `form`) |
| `form_start` | primo campo toccato | come oggi |
| `form_step2` | "Avanti" con il passaggio 1 completo | `tipo_richiesta`, `mq`, `tempistica` |
| `lead_form_submit` | invio riuscito: conversione Google Ads esistente | `tipo_richiesta`, `mq`, `tempistica`, `cta_posizione`, `cta_pagina` |

Regole:
- in GA4 non va mai un dato personale (nome, telefono, email, località);
- `call_click` sul pulsante Chiama, come nelle altre pagine.

Da registrare in GA4 come dimensioni personalizzate (ambito evento): `tipo_richiesta`, `mq`, `tempistica`.

## 6. Lettura del test

**Quando:** dopo 2–4 settimane, oppure almeno 150 clic sugli annunci di questa pagina.

**Cosa guardare:**
1. **Interesse:** distribuzione di `scelta_offerta` per `tipo_richiesta`.
2. **Domanda reale:** `lead_form_submit` per `tipo_richiesta`. Le email contano più di GA4, che sottostima per via del consenso.
3. **Qualità:** `mq` e `tempistica` delle richieste di sola fornitura.
4. **Confronto:** richieste / clic di questa pagina rispetto alla landing decking.

**Regola di decisione:** proposta da confermare con Federico prima del lancio. Se almeno 1 richiesta su 4 è di sola fornitura con 20 m² o più, si avvia lo studio dei prezzi della fornitura.

## 7. Verifica

- Puppeteer, mobile 390px e desktop 1440px: screenshot e analisi visiva, nessuno scorrimento orizzontale, nessun errore JS, nessuna risorsa 404.
- Script di test locale:
  - ogni `data-cta` e ogni riquadro invia l'evento giusto;
  - il passaggio 1 senza scelte non avanza;
  - "Indietro" conserva le scelte;
  - l'invio produce `lead_form_submit` con i parametri, con Web3Forms simulato (nessuna email vera).
- `noindex` presente; la pagina non compare in `sitemap.xml`.
