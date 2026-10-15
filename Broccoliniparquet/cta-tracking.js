/* ── Percorso verso il preventivo (GA4) ──────────────────────────────
   1. cta_preventivo  → clic su un link con data-cta (quale pulsante, da che pagina)
   2. form_start      → primo campo del form toccato (una volta per pagina)
   3. lead_form_submit → già inviato dalla pagina; riceve cta_posizione/cta_pagina da ctaOrigin()
   Il pulsante di provenienza resta in sessionStorage solo per la visita (niente cookie).
   Come tutto il resto, nulla parte verso Google finché il banner Iubenda non è accettato. */
(function () {
  var KEY = 'broc_cta';

  function currentPage() {
    var path = location.pathname.replace(/^\//, '');
    if (path === '' || /\/$/.test(path)) path += 'index.html';
    return path;
  }

  function send(name, params) {
    window.dataLayer = window.dataLayer || [];
    var payload = { event: name };
    for (var key in params) payload[key] = params[key];
    window.dataLayer.push(payload);
    if (typeof window.gtag === 'function') window.gtag('event', name, params);
  }

  /** Pulsante da cui la persona è partita in questa visita, oppure "diretto". */
  window.ctaOrigin = function () {
    try {
      var saved = JSON.parse(sessionStorage.getItem(KEY));
      if (saved && saved.cta_posizione) return saved;
    } catch (e) {}
    return { cta_posizione: 'diretto', cta_pagina: currentPage() };
  };

  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('[data-cta]');
    if (!link) return;
    var origin = { cta_posizione: link.getAttribute('data-cta'), cta_pagina: currentPage() };
    try { sessionStorage.setItem(KEY, JSON.stringify(origin)); } catch (e) {}
    send('cta_preventivo', origin);
  }, true);

  var form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('focusin', function onStart(event) {
      if (event.target.type === 'hidden') return;
      form.removeEventListener('focusin', onStart);
      send('form_start', window.ctaOrigin());
    });
  }
})();
