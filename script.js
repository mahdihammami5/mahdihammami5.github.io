/* ==========================================================================
   Mahdi Hammami — Portfolio interactions
   GSAP + ScrollTrigger + Lenis (CDN). Vanilla JS only.
   ========================================================================== */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const animate = hasGSAP && !reduced;
  const SVGNS = 'http://www.w3.org/2000/svg';

  const COLORS = { ink: '#16213A', ink2: '#4A5368', ink3: '#7A8194', sage: '#3F7F76', clay: '#C9784A', glow: '#9FD3C7', onInk: '#EDE9E0' };

  const yearEl = $('[data-year]');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- helpers ---------------------------------------------------- */
  function rng(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const gauss = (x, m, s) => Math.exp(-((x - m) ** 2) / (2 * s * s));
  // one heartbeat, u in [0,1)
  const ecg = (u) => 0.12 * gauss(u, 0.16, 0.03) - 0.12 * gauss(u, 0.30, 0.008) + 1.0 * gauss(u, 0.33, 0.01)
    - 0.28 * gauss(u, 0.36, 0.01) + 0.22 * gauss(u, 0.56, 0.045);
  const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  function randomWalk(n, seed, drift, vol = 1) {
    const r = rng(seed); const a = [0];
    for (let i = 1; i < n; i++) a.push(a[i - 1] + drift + (r() - 0.5) * vol);
    const min = Math.min(...a), max = Math.max(...a);
    return a.map((v) => (v - min) / (max - min || 1));
  }
  const toPath = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  function svgPath(svg, d, attrs = {}) {
    const p = document.createElementNS(SVGNS, 'path');
    p.setAttribute('d', d);
    Object.entries(attrs).forEach(([k, v]) => p.setAttribute(k, v));
    svg.appendChild(p);
    return p;
  }

  /* ---------- split text ------------------------------------------------- */
  function splitText(el) {
    const mode = el.dataset.split;
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const mask = document.createElement('span');
            mask.className = 'w-mask';
            mask.setAttribute('aria-hidden', 'true');
            const w = document.createElement('span');
            w.className = 'w';
            if (mode === 'chars') {
              Array.from(part).forEach((ch) => {
                const c = document.createElement('span');
                c.className = 'c'; c.textContent = ch; w.appendChild(c);
              });
            } else { w.textContent = part; }
            mask.appendChild(w); frag.appendChild(mask);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) { walk(n); }
      });
    };
    walk(el);
  }
  $$('[data-split]').forEach(splitText);

  /* ---------- Fit the hero name to its column (never wraps) ------------ */
  function fitHeroTitle() {
    const title = $('.hero__title');
    if (!title) return;
    title.style.fontSize = '';
    const avail = title.parentElement.clientWidth;
    const widest = Math.max(...$$('.hero__line', title).map((l) => l.scrollWidth));
    if (avail > 0 && widest > avail) {
      const size = parseFloat(getComputedStyle(title).fontSize);
      title.style.fontSize = Math.floor(size * (avail / widest) * 0.97) + 'px';
    }
  }
  fitHeroTitle();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitHeroTitle);
  let fitT; window.addEventListener('resize', () => { clearTimeout(fitT); fitT = setTimeout(fitHeroTitle, 100); });

  /* ---------- SVG motifs ------------------------------------------------- */
  function buildMotifs() {
    $$('svg[data-motif]').forEach((svg) => {
      const type = svg.dataset.motif;
      const [, , W, H] = svg.getAttribute('viewBox').split(' ').map(Number);
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      const r = rng(type.length * 97);

      if (type === 'channels') {
        for (let i = 0; i < 7; i++) {
          const base = 14 + (i * (H - 28)) / 6; const pts = [];
          for (let k = 0; k <= 80; k++) {
            const x = (k / 80) * W; const m = smooth(0.15, 0.85, k / 80);
            const noise = (Math.sin(k * 0.7 + i * 2) * 7 + (r() - 0.5) * 10) * (1 - m);
            pts.push([x, base + (H / 2 - base) * m + noise]);
          }
          svgPath(svg, toPath(pts), { stroke: i === 3 ? COLORS.glow : 'rgba(237,233,224,.35)', 'stroke-width': i === 3 ? 2 : 1.2 });
        }
      }

      if (type === 'heart') {
        svgPath(svg, `M0 ${H * 0.62} L${W} ${H * 0.62}`, { stroke: 'rgba(237,233,224,.12)', 'stroke-width': 1 });
        const pts = [];
        for (let k = 0; k <= 400; k++) { const x = (k / 400) * W; pts.push([x, H * 0.62 - ecg(((k / 400) * 2.4) % 1) * H * 0.55]); }
        svgPath(svg, toPath(pts), { stroke: COLORS.glow, 'stroke-width': 2 });
      }

      if (type === 'price') {
        [[COLORS.glow, 2, 0.06], ['rgba(237,233,224,.35)', 1.2, 0.035], [COLORS.clay, 1.4, 0.045]].forEach(([c, w, drift], j) => {
          const walk = randomWalk(90, 31 + j * 13, drift, 0.9);
          svgPath(svg, toPath(walk.map((v, k) => [(k / 89) * W, H - 10 - v * (H - 24)])), { stroke: c, 'stroke-width': w });
        });
      }

      if (type === 'paper') {
        const nodeX = W * 0.5, nodeY = H * 0.46;
        for (let i = 0; i < 7; i++) {
          const y0 = 20 + (i * (H * 0.82 - 20)) / 6; const pts = [];
          for (let k = 0; k <= 60; k++) {
            const t = k / 60; const x = t * (nodeX - 18); const m = smooth(0.45, 1, t);
            const n = Math.sin(k * 0.9 + i * 1.7) * 6 * (1 - m) + (r() - 0.5) * 5 * (1 - m);
            pts.push([x, y0 + (nodeY - y0) * m + n]);
          }
          svgPath(svg, toPath(pts), { stroke: 'rgba(237,233,224,.38)', 'stroke-width': 1.2 });
        }
        svgPath(svg, `M${nodeX - 16} ${nodeY} a16 16 0 1 0 32 0 a16 16 0 1 0 -32 0`, { stroke: COLORS.glow, 'stroke-width': 1.6, fill: 'rgba(159,211,199,.12)' });
        [[H * 0.16, COLORS.glow], [H * 0.46, COLORS.onInk], [H * 0.76, COLORS.clay]].forEach(([y1, c]) => {
          const pts = [];
          for (let k = 0; k <= 60; k++) {
            const t = k / 60; const x = nodeX + 16 + t * (W - nodeX - 16); const m = smooth(0, 0.4, t);
            pts.push([x, nodeY + (y1 - nodeY) * m + (t > 0.4 ? Math.sin(k * 0.5) * 3 : 0)]);
          }
          svgPath(svg, toPath(pts), { stroke: c, 'stroke-width': 1.6 });
        });
      }

      if (type === 'bundle') {
        svgPath(svg, `M0 ${H - 6} L${W} ${H - 6}`, { stroke: COLORS.ink3, 'stroke-width': 0.8, opacity: 0.35 });
        const series = [[COLORS.ink3, 1, 0.03, 0.5], [COLORS.ink3, 1, 0.035, 0.5], [COLORS.ink2, 1.4, 0.04, 1, '4 4'], [COLORS.sage, 1.4, 0.045, 0.9], [COLORS.clay, 2.2, 0.06, 1]];
        series.forEach(([c, w, drift, o, dash], j) => {
          const walk = randomWalk(100, 101 + j * 17, drift, 0.85);
          const p = svgPath(svg, toPath(walk.map((v, k) => [(k / 99) * W, H - 8 - v * (H - 22) * (0.6 + j * 0.1)])), { stroke: c, 'stroke-width': w, opacity: o });
          if (dash) p.dataset.dash = dash;
        });
      }

      // small decorative motifs for the home "explore" cards (stroke set in CSS)
      if (type === 'mini-heart') {
        const pts = []; for (let k = 0; k <= 200; k++) pts.push([(k / 200) * W, H * 0.6 - ecg(((k / 200) * 2) % 1) * H * 0.5]);
        svgPath(svg, toPath(pts));
      }
      if (type === 'mini-price') {
        const w = randomWalk(60, 77, 0.05, 0.9); svgPath(svg, toPath(w.map((v, k) => [(k / 59) * W, H - 6 - v * (H - 12)])));
      }
      if (type === 'mini-steps') {
        svgPath(svg, `M0 ${H - 6} H${W * 0.22} V${H * 0.66} H${W * 0.46} V${H * 0.4} H${W * 0.7} V${H * 0.16} H${W}`);
      }
      if (type === 'mini-curve') {
        const pts = []; for (let k = 0; k <= 100; k++) { const x = k / 100; pts.push([x * W, H - 6 - (H - 14) * Math.pow(x, 2.2)]); }
        svgPath(svg, toPath(pts));
        svgPath(svg, `M0 ${H - 6} H${W}`);
      }
      if (type === 'mini-wave') {
        const pts = []; for (let k = 0; k <= 120; k++) { const x = k / 120; pts.push([x * W, H / 2 + Math.sin(x * 6.283 * 2.2) * H * 0.32 * (1 - x * 0.5)]); }
        svgPath(svg, toPath(pts));
      }

      if (type === 'bars') {
        const pairs = [[0.273, 0.871], [0.504, 0.878], [0.576, 0.882]];
        const gw = W / pairs.length;
        svgPath(svg, `M0 ${H - 1} L${W} ${H - 1}`, { stroke: COLORS.ink3, 'stroke-width': 0.8, opacity: 0.4 });
        pairs.forEach(([a, b], i) => {
          [[a, COLORS.ink3, 0.35], [b, COLORS.sage, 1]].forEach(([v, c, o], j) => {
            const bw = gw * 0.22; const x = i * gw + gw * 0.24 + j * (bw + 8); const h = v * (H - 16);
            const rect = document.createElementNS(SVGNS, 'rect');
            rect.setAttribute('x', x); rect.setAttribute('y', H - 1 - h);
            rect.setAttribute('width', bw); rect.setAttribute('height', h);
            rect.setAttribute('rx', 4); rect.setAttribute('fill', c); rect.setAttribute('opacity', o);
            rect.classList.add('bar'); svg.appendChild(rect);
          });
        });
      }

      svg.querySelectorAll('path').forEach((p) => { if (!p.getAttribute('fill')) p.setAttribute('fill', 'none'); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round'); });
    });
  }
  buildMotifs();

  // returns a paused draw-on timeline for an svg
  function drawTween(svg) {
    if (!hasGSAP) return null;
    const tl = gsap.timeline({ paused: true });
    const paths = $$('path', svg);
    paths.forEach((p, i) => {
      const len = p.getTotalLength();
      const dash = p.dataset.dash;
      const op = parseFloat(p.getAttribute('opacity') || '1');
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len, opacity: 0 });
      tl.set(p, { opacity: op }, i * 0.08)
        .to(p, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', onComplete: () => { if (dash) p.setAttribute('stroke-dasharray', dash); } }, i * 0.08);
    });
    const bars = $$('.bar', svg);
    if (bars.length) {
      gsap.set(bars, { scaleY: 0, transformOrigin: '50% 100%' });
      tl.to(bars, { scaleY: 1, duration: 1, ease: 'power3.out', stagger: 0.07 }, 0.1);
    }
    return tl;
  }

  /* ---------- Hero signal field (canvas) -------------------------------- */
  function SignalField(canvas) {
    const ctx = canvas.getContext('2d');
    const N = 7, P = 200;
    const palette = [COLORS.sage, COLORS.clay, COLORS.ink2, COLORS.sage, COLORS.clay, COLORS.sage, COLORS.ink2];
    const r = rng(7);
    const lines = Array.from({ length: N }, (_, i) => ({
      f1: 0.7 + r() * 1.3, f2: 2 + r() * 3, f3: 5 + r() * 4,
      s1: 0.15 + r() * 0.25, s2: 0.1 + r() * 0.2, ph: r() * 6.283, amp: 0.55 + r() * 0.55,
      walk: randomWalk(P, 11 + i * 7, 0.045 + i * 0.004, 1.1),
    }));
    let W = 0, H = 0, grads = [];
    let progress = 0, target = 0, t = 0, visible = true, last = performance.now();

    const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const mobile = W < 900;
      grads = palette.map((c, i) => {
        const g = ctx.createLinearGradient(0, 0, W, 0);
        const strong = i === 3;
        g.addColorStop(0, hexA(c, mobile ? 0.25 : strong ? 0.25 : 0.1));
        g.addColorStop(0.5, hexA(c, strong ? 0.75 : 0.32));
        g.addColorStop(1, hexA(c, strong ? 0.9 : 0.45));
        return g;
      });
      draw();
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const p = progress;
      const wSig = 1 - smooth(0.16, 0.42, p);
      const wPrice = smooth(0.58, 0.84, p);
      const wHeart = 1 - wSig - wPrice;
      const mobile = W < 900;
      // mobile: keep the lines in the band around the portrait, away from the text
      const bandTop = mobile ? H * 0.1 : H * 0.12, bandH = mobile ? H * 0.32 : H * 0.76;
      const heartY = mobile ? H * 0.34 : H * 0.8, heartA = mobile ? H * 0.12 : Math.min(H * 0.17, 130);
      const priceTop = mobile ? H * 0.12 : H * 0.46, priceBot = mobile ? H * 0.4 : H * 0.93;

      for (let i = 0; i < N; i++) {
        const L = lines[i];
        const base = bandTop + (bandH * (i + 0.5)) / N;
        const spread = (bandH / N) * 0.95 * L.amp;
        const focus = 1 - Math.abs(i - 3) * 0.12;
        ctx.beginPath();
        for (let k = 0; k < P; k++) {
          const x = k / (P - 1);
          const ySig = base + spread * (0.6 * Math.sin(6.283 * x * L.f1 + t * L.s1 * 6 + L.ph)
            + 0.28 * Math.sin(6.283 * x * L.f2 - t * L.s2 * 6) + 0.12 * Math.sin(6.283 * x * L.f3 + t * 2));
          const u = (((x * 3.2 - t * 0.14) % 1) + 1) % 1;
          const yHeart = heartY + (i - 3) * 2.4 - heartA * ecg(u) * focus;
          const yPrice = priceBot - (priceBot - priceTop) * (L.walk[k] * 0.8 + x * 0.2) * (0.75 + i * 0.04)
            + Math.sin(t * 1.4 + k * 0.25 + i) * 1.4;
          const y = ySig * wSig + yHeart * wHeart + yPrice * wPrice;
          if (k) ctx.lineTo(x * W, y); else ctx.moveTo(x * W, y);
        }
        ctx.strokeStyle = grads[i];
        ctx.lineWidth = i === 3 ? 1.9 : 1.15;
        ctx.globalAlpha = i === 3 ? 1 : 1 - wHeart * 0.4 - wPrice * 0.35;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (visible && !reduced) {
        t += dt;
        progress += (target - progress) * 0.1;
        draw();
      }
      requestAnimationFrame(frame);
    }

    resize();
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 120); });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
    requestAnimationFrame(frame);

    return {
      set target(v) { target = v; if (reduced) { progress = v; draw(); } },
    };
  }

  const canvas = $('.hero__canvas');
  const field = canvas ? SignalField(canvas) : null;

  /* ---------- Fallback (no GSAP or reduced motion) ---------------------- */
  const loader = $('.loader');
  function endLoading() {
    document.body.classList.remove('is-loading');
    if (loader) loader.remove();
  }

  if (!animate) {
    endLoading();
    initCommon(null);
    return;
  }

  /* ---------- GSAP setup ------------------------------------------------- */
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  // Native scrolling (no smooth-scroll layer): the page always moves instantly.
  const lenis = null;

  /* initial states */
  const isHome = !!$('.hero');
  const pageHero = $('.page-hero');
  const setIf = (sel, vars) => { if ($$(sel).length) gsap.set(sel, vars); };
  setIf('[data-hero-fade]', { opacity: 0, y: 24 });
  if (isHome) {
    setIf('.hero__title .c', { yPercent: 115 });
    setIf('.hero__frame', { clipPath: 'inset(100% 0% 0% 0% round 999px 999px 28px 28px)' });
    setIf('.hero__frame img', { scale: 1.25 });
    setIf('.hero__readout, .hero__scroll, .hero__portrait figcaption', { opacity: 0 });
  }
  if (pageHero) setIf('.page-hero__title .c', { yPercent: 115 });

  // The full preloader plays only on the first visit of a session
  let seen = false;
  try { seen = sessionStorage.getItem('mh-intro') === '1'; sessionStorage.setItem('mh-intro', '1'); } catch (e) { /* storage blocked */ }

  /* ---------- Preloader → hero intro ----------------------------------- */
  function intro() {
    const tl = gsap.timeline();
    const path = $('.loader__line path');
    if (!isHome) { introPage(tl); return; }
    if (loader && path && !seen) {
      loader.style.animation = 'none';
      const len = path.getTotalLength();
      gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
      tl.to(path, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut' })
        .to('.loader__name', { opacity: 1, duration: 0.5 }, '-=0.4')
        .to(loader, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.9, ease: 'expo.inOut', delay: 0.25, onComplete: () => { endLoading(); if (lenis) lenis.start(); } });
    } else { endLoading(); if (lenis) lenis.start(); }

    tl.to('.hero__frame', { clipPath: 'inset(0% 0% 0% 0% round 999px 999px 28px 28px)', duration: 1.3, ease: 'expo.out' }, '-=0.35')
      .to('.hero__frame img', { scale: 1, duration: 1.6, ease: 'expo.out' }, '<')
      .to('.hero__title .c', { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.035, onComplete: () => $('.hero__title').classList.add('is-revealed') }, '<0.1')
      .to('[data-hero-fade]', { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1 }, '<0.35')
      .to(['.hero__readout', '.hero__scroll', '.hero__portrait figcaption'], { opacity: 1, duration: 0.8 }, '<0.3');
  }

  // Sub-page header intro
  function introPage(tl) {
    endLoading(); if (lenis) lenis.start();
    const line = $('.page-hero__line path');
    if (line) {
      const len = line.getTotalLength();
      gsap.set(line, { strokeDasharray: len, strokeDashoffset: len });
    }
    tl.to('.page-hero__title .c', {
      yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.025, delay: 0.1,
      onComplete: () => { const t = $('.page-hero__title'); if (t) t.classList.add('is-revealed'); },
    })
      .to('[data-hero-fade]', { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1 }, '<0.3');
    if (line) tl.to(line, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut' }, '<');
    // arriving with a #hash from another page
    if (location.hash) {
      const target = $(location.hash);
      if (target) setTimeout(() => { ScrollTrigger.refresh(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 500);
    }
  }

  /* ---------- Hero signal loop (independent of scrolling) -------------- */
  // Signals -> heartbeat -> market chart -> back, as a slow ambient loop.
  // Nothing is pinned and the photo never zooms, so scrolling stays natural.
  function initHero() {
    if (!isHome || !field) return;
    const readout = $('[data-readout]');
    const phases = ['CH 01–07 · RAW PHYSIOLOGICAL SIGNALS', 'HEART RATE · LIVE · 72 BPM', 'S&P 500 · WALK-FORWARD · 2020–2026'];
    let phase = 0;
    const st = { p: 0 };
    const update = () => {
      field.target = st.p;
      const ph = st.p < 0.3 ? 0 : st.p < 0.72 ? 1 : 2;
      if (ph !== phase && readout) {
        phase = ph;
        gsap.to(readout, { opacity: 0, duration: 0.2, onComplete: () => { readout.textContent = phases[ph]; gsap.to(readout, { opacity: 1, duration: 0.4 }); } });
      }
    };
    gsap.timeline({ repeat: -1, delay: 2.5, onUpdate: update })
      .to(st, { p: 0, duration: 4 })
      .to(st, { p: 0.5, duration: 2.2, ease: 'power2.inOut' })
      .to(st, { p: 0.5, duration: 4.5 })
      .to(st, { p: 1, duration: 2.2, ease: 'power2.inOut' })
      .to(st, { p: 1, duration: 4.5 })
      .to(st, { p: 0, duration: 2.6, ease: 'power2.inOut' });
  }

  /* ---------- Reveals ---------------------------------------------------- */
  function initReveals() {
    // Calm, quick fade-ups (nothing is tied to the scroll position)
    gsap.set('[data-reveal]', { opacity: 0, y: 14 });
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 92%', once: true,
      onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger: 0.05, overwrite: true }),
    });

    // section headings: a short, simple fade
    $$('[data-split="words"]:not([data-scrub-words])').forEach((el) => {
      gsap.from(el, { opacity: 0, y: 12, duration: 0.6, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
    });

    // CTA title + line: simple fade and draw once, when it appears
    const ctaTitle = $('.cta__title');
    if (ctaTitle) {
      ctaTitle.classList.add('is-revealed');
      gsap.from(ctaTitle, { opacity: 0, y: 14, duration: 0.7, ease: 'power2.out', scrollTrigger: { trigger: ctaTitle, start: 'top 90%', once: true } });
    }
    const ctaPath = $('.cta__line path');
    if (ctaPath) {
      const len = ctaPath.getTotalLength();
      gsap.fromTo(ctaPath, { strokeDasharray: len, strokeDashoffset: len }, {
        strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut',
        scrollTrigger: { trigger: '.cta', start: 'top 85%', once: true },
      });
    }
  }

  /* ---------- Stats counters -------------------------------------------- */
  function initStats() {
    $$('[data-count]').forEach((el) => {
      const to = parseFloat(el.dataset.to);
      const dec = parseInt(el.dataset.decimals || '0', 10);
      const obj = { v: 0 };
      el.textContent = (0).toFixed(dec);
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: () => gsap.to(obj, {
          v: to, duration: to > 10 ? 2 : 1.4, ease: 'power3.out',
          onUpdate: () => { el.textContent = obj.v.toFixed(dec); },
        }),
      });
    });
  }

  /* ---------- Pillars (horizontal on desktop) -------------------------- */
  function initPillars() {
    const section = $('.pillars');
    const track = $('.pillars__track');
    if (!section || !track) return;

    // Normal vertical layout (no pinning, no sideways scroll); lines draw once.
    $$('.pillar').forEach((pillar) => {
      const tw = drawTween($('svg', pillar));
      ScrollTrigger.create({ trigger: pillar, start: 'top 90%', once: true, onEnter: () => tw && tw.play() });
    });
  }

  /* ---------- Story ------------------------------------------------------ */
  function initStory() {
    const tlEl = $('.timeline');
    if (!tlEl) return;
    gsap.to('.timeline__fill', {
      scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: tlEl, start: 'top 65%', end: 'bottom 65%', scrub: true },
    });
    $$('.tl').forEach((item) => {
      ScrollTrigger.create({ trigger: item, start: 'top 66%', onEnter: () => item.classList.add('is-on'), onLeaveBack: () => item.classList.remove('is-on') });
    });
    // photos simply fade in with their item (no zoom, no scroll-linked effect)
  }

  /* ---------- Work motifs ---------------------------------------------- */
  function initWorkMotifs() {
    $$('.pub__viz svg, .project__viz svg, .pcard__viz svg, .xcard__motif, .results__chart svg').forEach((svg) => {
      const tw = drawTween(svg);
      ScrollTrigger.create({ trigger: svg, start: 'top 85%', once: true, onEnter: () => tw && tw.play() });
    });
  }

  /* ---------- Nav --------------------------------------------------------- */
  function initNav() {
    const nav = $('[data-nav]');
    const bar = $('.nav__progress span');
    const mbar = $('.mbar');
    let lastY = 0;
    const onScroll = (y) => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      nav.classList.toggle('is-scrolled', y > 40);
      lastY = y; // the menu bar always stays visible
      if (bar) bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
      if (mbar) {
        const contact = $('#contact');
        const nearEnd = contact && contact.getBoundingClientRect().top < window.innerHeight * 0.9;
        mbar.classList.toggle('is-on', y > window.innerHeight * 0.8 && !nearEnd);
      }
    };
    if (lenis) lenis.on('scroll', ({ scroll }) => onScroll(scroll));
    else window.addEventListener('scroll', () => onScroll(window.scrollY), { passive: true });
    onScroll(window.scrollY);

    const darkActive = new Set();
    $$('.pillars, .pub, .cta, .footer').forEach((sec) => {
      ScrollTrigger.create({
        trigger: sec, start: 'top 40px', end: 'bottom 40px',
        onToggle: (self) => {
          if (self.isActive) darkActive.add(sec); else darkActive.delete(sec);
          nav.classList.toggle('on-dark', darkActive.size > 0);
        },
      });
    });

  }

  /* ---------- Projects filter ------------------------------------------- */
  function initFilters() {
    const bar = $('.filters');
    if (!bar) return;
    const cards = $$('.pcard[data-tags]');
    const label = $('[data-count-label]');
    const apply = (f) => {
      let n = 0;
      cards.forEach((c) => {
        const show = f === 'all' || c.dataset.tags.split(' ').includes(f);
        c.classList.toggle('is-hidden', !show);
        if (show) n++;
      });
      if (label) label.textContent = `${n} project${n === 1 ? '' : 's'}`;
      if (hasGSAP) {
        gsap.fromTo(cards.filter((c) => !c.classList.contains('is-hidden')), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.06, overwrite: true });
        ScrollTrigger.refresh();
      }
    };
    $$('button[data-filter]', bar).forEach((b) => b.addEventListener('click', () => {
      $$('button[data-filter]', bar).forEach((x) => x.classList.toggle('is-active', x === b));
      apply(b.dataset.filter);
    }));
    if (label) label.textContent = `${cards.length} projects`;
  }

  /* ---------- Cursor, magnetic, tilt ----------------------------------- */
  function initPointer() {
    if (!finePointer) return;
    // The native system cursor is kept (custom cursor removed for responsiveness).

    $$('[data-magnetic]').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.25);
        yTo((e.clientY - r.top - r.height / 2) * 0.35);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });

    $$('[data-tilt]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(el, { rotateY: px * 5, rotateX: -py * 5, y: -6, transformPerspective: 1000, duration: 0.6, ease: 'power3.out' });
      });
      el.addEventListener('pointerleave', () => gsap.to(el, { rotateY: 0, rotateX: 0, y: 0, duration: 0.8, ease: 'power3.out' }));
    });
  }

  /* ---------- Common (works without GSAP too) -------------------------- */
  function initCommon(lenisInstance) {
    // mobile menu
    const toggle = $('.nav__toggle');
    const setMenu = (open) => {
      document.body.classList.toggle('menu-open', open);
      document.documentElement.classList.toggle('menu-open', open);
      if (toggle) { toggle.setAttribute('aria-expanded', String(open)); toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); }
      if (lenisInstance) { if (open) lenisInstance.stop(); else lenisInstance.start(); }
    };
    if (toggle) toggle.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

    // page transitions between .html pages
    const fade = $('.page-fade');
    $$('a[href]').forEach((a) => {
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || a.target === '_blank' || a.hasAttribute('download')) return;
      if (!/\.html(#.*)?$/.test(href)) return;
      a.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        const url = new URL(href, location.href);
        if (url.pathname === location.pathname && url.hash) return; // same page anchor
        e.preventDefault();
        setMenu(false);
        if (fade && !reduced) { fade.classList.add('is-on'); setTimeout(() => { location.href = url.href; }, 320); }
        else location.href = url.href;
      });
    });
    window.addEventListener('pageshow', () => { if (fade) fade.classList.remove('is-on'); });

    initFilters();

    // phones: if the tab row scrolls, bring the current tab into view
    const tabs = $('.nav__links'); const cur = $('.nav__links a.is-current');
    const showCurrentTab = () => {
      if (tabs && cur && tabs.scrollWidth > tabs.clientWidth) tabs.scrollLeft = Math.max(0, cur.offsetLeft - (tabs.clientWidth - cur.offsetWidth) / 2);
    };
    showCurrentTab();
    window.addEventListener('load', showCurrentTab);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(showCurrentTab);

    // anchor links
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        const target = id.length > 1 ? $(id) : null;
        if (!target) return;
        e.preventDefault();
        setMenu(false);
        if (lenisInstance) lenisInstance.scrollTo(target, { offset: 0, duration: 1.6 });
        else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
      });
    });

    // copy email
    const toast = $('.toast');
    $$('[data-copy]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(btn.dataset.copy); show('Email copied'); }
        catch { show(btn.dataset.copy); }
      });
    });
    let tt;
    function show(msg) {
      if (!toast) return;
      toast.textContent = msg; toast.classList.add('is-on');
      clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('is-on'), 2000);
    }

    // static motifs when not animating
    if (!animate) {
      const mbar = $('.mbar');
      if (mbar) window.addEventListener('scroll', () => mbar.classList.toggle('is-on', window.scrollY > window.innerHeight * 0.8), { passive: true });
      const nav = $('[data-nav]');
      if (nav) window.addEventListener('scroll', () => nav.classList.toggle('is-scrolled', window.scrollY > 40), { passive: true });
    }
  }

  /* ---------- Boot --------------------------------------------------------- */
  initCommon(lenis);
  initHero();
  initReveals();
  initStats();
  initPillars();
  initStory();
  initWorkMotifs();
  initNav();
  initPointer();

  const start = () => { intro(); ScrollTrigger.refresh(); };
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]).then(start);
  } else { start(); }
  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
