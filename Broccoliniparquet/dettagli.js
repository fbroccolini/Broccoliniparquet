// Sezione "La nostra forza è nei dettagli": animazioni editoriali (GSAP + ScrollTrigger).
// Senza GSAP o con prefers-reduced-motion la sezione resta semplicemente visibile.
(function () {
    const sec = document.querySelector('.dtl');
    if (!sec || !window.gsap || !window.ScrollTrigger) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.registerPlugin(ScrollTrigger);

    const once = (trigger, start) => ({ trigger, start: start || 'top 85%', toggleActions: 'play none none reverse' });
    const passing = (trigger, scrub) => ({ trigger, start: 'top bottom', end: 'bottom top', scrub });

    // Divide un paragrafo nelle righe reali del browser (rientro della prima riga compreso):
    // ogni parola in uno span, raggruppate per posizione verticale, poi una maschera per riga.
    function splitLines(p) {
        if (!p.dataset.src) p.dataset.src = p.innerHTML;
        p.innerHTML = p.dataset.src.trim().split(/\s+/).map(w => '<span class="dtl-w">' + w + '</span>').join(' ');
        const rows = [];
        let lastTop = null;
        p.querySelectorAll('.dtl-w').forEach(w => {
            const top = Math.round(w.offsetTop);
            if (lastTop === null || Math.abs(top - lastTop) > 2) { rows.push([]); lastTop = top; }
            rows[rows.length - 1].push(w.innerHTML);
        });
        p.innerHTML = rows.map(r => '<span class="dtl-line-mask"><span class="dtl-line">' + r.join(' ') + '</span></span>').join('');
        return p.querySelectorAll('.dtl-line');
    }


    function charsOf(el) {
        el.innerHTML = el.innerHTML.split(/(<br\s*\/?>)/i).map(part =>
            /^<br/i.test(part) ? part : [...part].map(c => '<span class="dtl-char">' + c + '</span>').join('')
        ).join('');
        return el.querySelectorAll('.dtl-char');
    }

    // le righe vanno calcolate con i font definitivi: si parte a pagina caricata e font pronti
    const start = () => (document.fonts ? document.fonts.ready : Promise.resolve()).then(init);
    if (document.readyState === 'complete') start(); else window.addEventListener('load', start, { once: true });

    function init() {
        // Titolo: le due righe salgono dalla maschera
        gsap.from(sec.querySelectorAll('.dtl-tline > span'), {
            yPercent: 115, duration: 1.1, ease: 'power3.out', stagger: 0.08,
            scrollTrigger: once(sec.querySelector('.dtl-title'))
        });

        // Paragrafi riga per riga; al resize le righe si ricalcolano
        const paragraphs = [...sec.querySelectorAll('.dtl-text')];
        let lineTweens = [];
        function buildLines() {
            lineTweens.forEach(t => { if (t.scrollTrigger) t.scrollTrigger.kill(); t.kill(); });
            lineTweens = paragraphs.map(p => gsap.from(splitLines(p), {
                yPercent: 115, duration: 0.95, ease: 'power3.out', stagger: 0.07, scrollTrigger: once(p, 'top 88%')
            }));
        }
        buildLines();
        let lastW = window.innerWidth, rt;
        window.addEventListener('resize', () => {
            if (window.innerWidth === lastW) return; // ignora i resize solo verticali (barra del browser su mobile)
            lastW = window.innerWidth;
            clearTimeout(rt);
            rt = setTimeout(() => { buildLines(); ScrollTrigger.refresh(); }, 200);
        });

        // Foto su tre livelli: cornice che si apre, contenitore in parallasse,
        // immagine sovradimensionata che scorre e si de-zooma (scala >= 1 + 2·yPercent/100)
        sec.querySelectorAll('.dtl-media').forEach((m) => {
            const frame = m.querySelector('.dtl-frame');
            const wrap = m.querySelector('.dtl-imgwrap');
            const reveal = gsap.timeline({ scrollTrigger: once(m, 'top 84%') });
            reveal.fromTo(frame, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.35, ease: 'power3.inOut' });
            gsap.fromTo(m, { y: 35 }, { y: -35, ease: 'none', scrollTrigger: passing(m, 1.4) });
            if (wrap) {
                // foto con annotazioni: parallasse leggera sull'intero livello (immagine + puntatori),
                // così i puntatori restano sui dettagli e nessun punto esce dalla cornice
                gsap.fromTo(wrap, { yPercent: -2.5, scale: 1.08 }, { yPercent: 2.5, scale: 1.06, ease: 'none', scrollTrigger: passing(m, 1.2) });
                // centraggio in percentuale gestito da GSAP: resta esatto anche al resize
                const dots = m.querySelectorAll('.dtl-dot');
                gsap.set(dots, { x: 0, y: 0, xPercent: -50, yPercent: -50 });
                reveal.from(dots, { scale: 0, duration: 0.5, ease: 'back.out(2.2)', stagger: 0.15 }, 1.0)
                      .from(m.querySelectorAll('.dtl-ln--h'), { scaleX: 0, duration: 0.7, ease: 'power3.inOut' }, 1.15)
                      .from(m.querySelectorAll('.dtl-ln--v'), { scaleY: 0, duration: 0.7, ease: 'power3.inOut' }, 1.3)
                      .from(m.querySelectorAll('.dtl-lab'), { opacity: 0, duration: 0.5, ease: 'power2.out', stagger: 0.15 }, 1.55); // solo opacità: niente transform sulle etichette
            } else {
                const img = m.querySelector('.dtl-img');
                if (img) gsap.fromTo(img, { yPercent: -6, scale: 1.22 }, { yPercent: 6, scale: 1.14, ease: 'none', scrollTrigger: passing(m, 1.2) });
            }
        });

        // Cerchio di sfondo: deriva e ruota lentamente con lo scroll
        const circle = sec.querySelector('.dtl-circle svg');
        if (circle) gsap.fromTo(circle, { y: -45, x: 25, rotation: -8, scale: 0.96 }, {
            y: 110, x: -25, rotation: 20, scale: 1.03, ease: 'none', scrollTrigger: passing(sec, 2)
        });

        // Nota con crocetta: la croce si disegna, le lettere compaiono una dopo l'altra
        const aside = sec.querySelector('.dtl-aside');
        const asideText = sec.querySelector('.dtl-aside-text');
        if (aside && asideText) {
            const tl = gsap.timeline({ scrollTrigger: once(aside, 'top 92%') });
            tl.from(aside.querySelectorAll('.dtl-plus line'), { scale: 0, transformOrigin: '50% 50%', duration: 0.5, ease: 'power3.out', stagger: 0.08 });
            tl.from(charsOf(asideText), { opacity: 0, duration: 0.01, stagger: 0.02, ease: 'none' }, 0.15);
            gsap.matchMedia().add('(min-width: 1025px)', () => {
                gsap.fromTo(aside, { y: 90 }, { y: -70, ease: 'none', scrollTrigger: passing(sec, 1.3) });
            });
        }
        ScrollTrigger.refresh();
    }
})();
