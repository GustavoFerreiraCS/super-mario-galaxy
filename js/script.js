function initStarfield() {
  const canvas = document.getElementById('starfield');
  if (!canvas || !canvas.getContext) {
    return { destroy() { } };
  }

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) {
    return { destroy() { } };
  }

  const root = document.documentElement;

  function readTokens() {
    const cs = getComputedStyle(root);
    return {
      bgDeep: cs.getPropertyValue('--bg-deep').trim(),
      bgMid: cs.getPropertyValue('--bg-mid').trim(),
      textMuted: cs.getPropertyValue('--text-muted').trim(),
      textPrimary: cs.getPropertyValue('--text-primary').trim(),
      accentStar: cs.getPropertyValue('--accent-star').trim(),
      cosmicCyan: cs.getPropertyValue('--cosmic-cyan').trim(),
      cosmicPurple: cs.getPropertyValue('--cosmic-purple').trim(),
      cosmicRose: cs.getPropertyValue('--cosmic-rose').trim(),
    };
  }

  /** @type {{ x: number; y: number; phase: number; twinkleRate: number }[]} */
  let starsFar = [];
  /** @type {{ x: number; y: number; nx: number; ny: number; glow: boolean; glowHue: string; size: number; twinklePhase: number; twinkleRate: number }[]} */
  let starsNear = [];
  /** @type {{ nx: number; ny: number; r: number; hue: string }[]} */
  let nebulae = [];

  let cssWidth = 0;
  let cssHeight = 0;
  let dprCap = Math.min(window.devicePixelRatio || 1, 2);
  let rafId = 0;
  let scrollY = window.scrollY;
  let prefersReduce =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const reduceMq = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  function rebuildStars() {
    starsFar = [];
    starsNear = [];
    nebulae = [];

    const w = cssWidth || 1;
    const h = cssHeight || 1;
    const areaFactor = Math.sqrt((w * h) / (1920 * 1080));

    const countFar = Math.round(216 * areaFactor);
    const countNear = Math.round(126 * areaFactor);

    const rand = Math.random;

    for (let i = 0; i < countFar; i++) {
      starsFar.push({
        x: rand() * w,
        y: rand() * h,
        phase: rand() * Math.PI * 2,
        twinkleRate: 0.00072 + rand() * 0.00128,
      });
    }

    for (let i = 0; i < countNear; i++) {
      const rarity = rand();
      const glow = rarity > 0.91;
      const glowHue = rand() > 0.5 ? 'cyan' : 'star';
      starsNear.push({
        x: rand() * w,
        y: rand() * h,
        nx: rand(),
        ny: rand(),
        glow,
        glowHue,
        size: 2 * (1.35 + rand() * 0.65),
        twinklePhase: rand() * Math.PI * 2,
        twinkleRate: 0.00062 + rand() * 0.00115,
      });
    }

    const nebulaCount = 3;
    for (let i = 0; i < nebulaCount; i++) {
      nebulae.push({
        nx: 0.12 + rand() * 0.76,
        ny: 0.08 + rand() * 0.84,
        r: (0.22 + rand() * 0.38) * Math.max(w, h),
        hue: rand() > 0.5 ? 'purple' : 'rose',
      });
    }
  }

  function syncCanvasDimensions() {
    dprCap = Math.min(window.devicePixelRatio || 1, 2);
    cssWidth = window.innerWidth;
    cssHeight = window.innerHeight;

    const bw = Math.max(1, Math.floor(cssWidth * dprCap));
    const bh = Math.max(1, Math.floor(cssHeight * dprCap));

    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }

    ctx.setTransform(dprCap, 0, 0, dprCap, 0, 0);
    rebuildStars();
  }

  function paintFrame(animationTimeMs) {
    const t = readTokens();
    const w = cssWidth;
    const h = cssHeight;

    if (!w || !h) return;

    const g = ctx.createRadialGradient(w * 0.45, h * 0.35, 0, w * 0.5, h * 0.55, Math.max(w, h) * 0.72);
    g.addColorStop(0, t.bgMid || t.bgDeep);
    g.addColorStop(1, t.bgDeep);
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < nebulae.length; i++) {
      const nb = nebulae[i];
      const cx = nb.nx * w;
      const cy = nb.ny * h;
      const col = nb.hue === 'purple' ? t.cosmicPurple : t.cosmicRose;
      const ng = ctx.createRadialGradient(cx, cy, 0, cx, cy, nb.r);
      ng.addColorStop(0, col);
      ng.addColorStop(1, 'transparent');
      ctx.globalAlpha = 0.035;
      ctx.fillStyle = ng;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.globalAlpha = 1;

    for (let i = 0; i < starsFar.length; i++) {
      const s = starsFar[i];
      const sine = prefersReduce ? 1 : Math.sin(animationTimeMs * s.twinkleRate + s.phase);
      const blink = prefersReduce ? 1 : 0.38 + 0.62 * (0.5 + 0.5 * sine);
      ctx.fillStyle = t.textMuted;
      ctx.globalAlpha = 0.28 * blink;
      ctx.fillRect(s.x, s.y, 2, 2);
    }

    ctx.globalAlpha = 1;
    const parallax = prefersReduce ? 0 : scrollY * 0.028;

    for (let i = 0; i < starsNear.length; i++) {
      const s = starsNear[i];
      const drift = prefersReduce ? 0 : s.ny * 0.006 * Math.sin(animationTimeMs * 0.00055 + s.nx * 6.28);
      const px = (((s.x + parallax * (0.55 + s.nx * 0.45)) % w) + w) % w;
      const py = (((s.y + drift * (h / 540)) % h) + h) % h;

      const sineNear = prefersReduce
        ? 1
        : Math.sin(animationTimeMs * s.twinkleRate + s.twinklePhase);
      const blinkNear = prefersReduce ? 1 : 0.5 + 0.5 * (0.5 + 0.5 * sineNear);

      if (s.glow && !prefersReduce) {
        ctx.save();
        ctx.shadowColor = s.glowHue === 'cyan' ? t.cosmicCyan : t.accentStar;
        ctx.shadowBlur = 5 + blinkNear * 7;
      }

      ctx.fillStyle = t.textPrimary;
      ctx.globalAlpha = blinkNear;
      ctx.fillRect(px, py, s.size, s.size);

      if (s.glow && !prefersReduce) {
        ctx.restore();
      }
    }

    ctx.globalAlpha = 1;
  }

  function frame(now) {
    paintFrame(now);
    if (!prefersReduce) {
      rafId = requestAnimationFrame(frame);
    }
  }

  function onReduceChange() {
    prefersReduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    cancelAnimationFrame(rafId);
    rafId = 0;

    const now = performance.now();
    paintFrame(now);

    if (!prefersReduce) {
      rafId = requestAnimationFrame(frame);
    }
  }

  function onScrollParallax() {
    scrollY = window.scrollY;
  }

  const resizeObs =
    typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
        syncCanvasDimensions();
        paintFrame(performance.now());
      })
      : null;

  function onWinResize() {
    syncCanvasDimensions();
    paintFrame(performance.now());
  }

  if (resizeObs) {
    resizeObs.observe(root);
  }
  window.addEventListener('resize', onWinResize, { passive: true });
  window.addEventListener('scroll', onScrollParallax, { passive: true });

  syncCanvasDimensions();
  const bootNow = performance.now();
  paintFrame(bootNow);
  if (!prefersReduce) {
    rafId = requestAnimationFrame(frame);
  }

  if (reduceMq) {
    if (typeof reduceMq.addEventListener === 'function') {
      reduceMq.addEventListener('change', onReduceChange);
    } else {
      reduceMq.addListener(onReduceChange);
    }
  }

  return {
    destroy() {
      cancelAnimationFrame(rafId);
      rafId = 0;
      resizeObs?.disconnect();
      window.removeEventListener('resize', onWinResize);
      window.removeEventListener('scroll', onScrollParallax);
      if (reduceMq) {
        if (typeof reduceMq.removeEventListener === 'function') {
          reduceMq.removeEventListener('change', onReduceChange);
        } else {
          reduceMq.removeListener(onReduceChange);
        }
      }
    },
  };
}

function initFloatingNav() {
  const nav = document.querySelector('.floating-nav');
  if (!nav) return;

  const links = nav.querySelectorAll('.floating-nav__link[data-section]');
  const sectionOrder = ['hero', 'personagens', 'trailers', 'estreia'];

  function getThreshold() {
    const heroEl = document.getElementById('hero');
    if (heroEl) {
      return heroEl.offsetHeight * 0.6;
    }
    return Math.max(window.innerHeight * 0.6, 300);
  }

  function updateVisibility() {
    const threshold = getThreshold();
    if (window.scrollY > threshold) {
      nav.classList.add('visible');
    } else {
      nav.classList.remove('visible');
    }
  }

  function updateActiveFromScroll() {
    const probeY = window.scrollY + window.innerHeight * 0.25;
    let activeId = 'hero';

    for (const id of sectionOrder) {
      const el = document.getElementById(id);
      if (el && el.offsetTop <= probeY) {
        activeId = id;
      }
    }

    links.forEach((link) => {
      const sec = link.getAttribute('data-section');
      link.classList.toggle('floating-nav__link--active', sec === activeId);
    });
  }

  function onScrollOrResize() {
    updateVisibility();
    updateActiveFromScroll();
  }

  window.addEventListener('scroll', onScrollOrResize, { passive: true });
  window.addEventListener('resize', onScrollOrResize);
  onScrollOrResize();
}

function initMarioScrollAnimations() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  const mario = document.querySelector('.hero__mario');
  if (!mario) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  gsap.registerPlugin(ScrollTrigger);

  gsap
    .timeline({
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: '+=100%',
        scrub: true,
      },
    })
    .to(mario, { y: '100vh', ease: 'none', duration: 1 }, 0)
    .to(mario, { opacity: 0, ease: 'none', duration: 0.5 }, 0);
}

function initYoshiScrollAnimations() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  const yoshiWrap = document.querySelector('.hero__yoshi-wrap');
  if (!yoshiWrap) return;

  if (window.matchMedia('prefers-reduced-motion: reduce)').matches) return;

  gsap.registerPlugin(ScrollTrigger);

  gsap
    .timeline({
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: '+=100%',
        scrub: true,
      },
    })
    .to(yoshiWrap, { y: '100vh', ease: 'none', duration: 1 }, 0)
    .to(yoshiWrap, { opacity: 0, ease: 'none', duration: 0.5 }, 0);
}

function initHeroContentScrollAnimations() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  const content = document.querySelector('.hero__content-layer');
  const scrollIndicator = document.querySelector('.hero__scroll-indicator');
  if (!content) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  gsap.registerPlugin(ScrollTrigger);

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '#hero',
      start: 'top top',
      end: '+=100%',
      scrub: true,
      pin: content,
      pinSpacing: false,
    },
  });

  if (scrollIndicator) {
    tl.to(scrollIndicator, { opacity: 0, ease: 'none', duration: 0.1 }, 0.1);
  }

  tl.to(content, { opacity: 0, ease: 'none', duration: 0.5 }, 0.5);
}

function colorVarToHex(varName) {
  const el = document.createElement('span');
  el.style.color = `var(${varName})`;
  el.style.position = 'fixed';
  el.style.left = '-9999px';
  el.style.top = '0';
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
  const rgb = getComputedStyle(el).color;
  document.body.removeChild(el);
  const m = rgb.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!m) {
    return '#f5f0e8';
  }
  const toH = (i) => Number(m[i]).toString(16).padStart(2, '0');
  return `#${toH(1)}${toH(2)}${toH(3)}`;
}

function initPersonagensBg() {
  const section = document.getElementById('personagens');
  const parallaxEl = section?.querySelector('.personagens__particles-parallax');
  if (!section || !parallaxEl || typeof particlesJS !== 'function') {
    return;
  }

  const prefersReduce =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const starColor = colorVarToHex('--text-primary');

  function buildLayerConfig(count, sizePx, speed) {
    return {
      particles: {
        number: {
          value: count,
          density: { enable: false },
        },
        color: {
          value: starColor,
        },
        shape: {
          type: 'circle',
        },
        opacity: {
          value: 1,
          random: false,
          anim: { enable: false },
        },
        size: {
          value: sizePx,
          random: false,
          anim: { enable: false },
        },
        line_linked: {
          enable: false,
        },
        move: {
          enable: !prefersReduce,
          speed,
          direction: 'bottom',
          random: false,
          straight: true,
          out_mode: 'out',
          bounce: false,
        },
      },
      interactivity: {
        detect_on: 'canvas',
        events: {
          onhover: { enable: false, mode: 'grab' },
          onclick: { enable: false, mode: 'push' },
          resize: true,
        },
      },
      retina_detect: true,
    };
  }

  particlesJS('personagens-particles-1', buildLayerConfig(1000, 1, 0.48));
  particlesJS('personagens-particles-2', buildLayerConfig(400, 2, 0.24));
  particlesJS('personagens-particles-3', buildLayerConfig(200, 3, 0.16));

  if (prefersReduce) {
    return;
  }

  let px = 0;
  let py = 0;
  let vx = 0;
  let vy = 0;
  let tx = 0;
  let ty = 0;
  let springRafId = 0;

  function tick() {
    const dt = 1 / 60;
    const stiffness = 50;
    const damping = 20;
    const ax = stiffness * (tx - px) - damping * vx;
    const ay = stiffness * (ty - py) - damping * vy;
    vx += ax * dt;
    vy += ay * dt;
    px += vx * dt;
    py += vy * dt;
    parallaxEl.style.transform = `translate3d(${px}px, ${py}px, 0)`;

    const stillMoving =
      Math.abs(vx) > 0.002 ||
      Math.abs(vy) > 0.002 ||
      Math.abs(tx - px) > 0.02 ||
      Math.abs(ty - py) > 0.02;

    if (stillMoving) {
      springRafId = requestAnimationFrame(tick);
    } else {
      springRafId = 0;
    }
  }

  function scheduleSpring() {
    if (springRafId) {
      return;
    }
    springRafId = requestAnimationFrame(tick);
  }

  section.addEventListener(
    'mousemove',
    (e) => {
      tx = -(e.clientX - window.innerWidth * 0.5) * 0.05;
      ty = -(e.clientY - window.innerHeight * 0.5) * 0.05;
      scheduleSpring();
    },
    { passive: true },
  );
}

/**
 * Contador regressivo da estreia com flip 3D (docs/contador-animacao-spec.md).
 * @param {number} diffMs
 */
function calcularRestanteFromDiff(diffMs) {
  const diff = Math.max(0, diffMs);
  return {
    dia: Math.floor(diff / 86400000),
    hor: Math.floor((diff % 86400000) / 3600000),
    min: Math.floor((diff % 3600000) / 60000),
    seg: Math.floor((diff % 60000) / 1000),
  };
}

function initEstreiaCountdown() {
  const card = document.querySelector('.estreia__countdown-card');
  if (!card) return;

  const targetRaw = card.dataset.targetDate;
  if (!targetRaw) return;

  const ALVO = new Date(targetRaw).getTime();
  if (Number.isNaN(ALVO)) return;

  const live = document.getElementById('estreia-countdown-live');
  /** @type {{ dia: number; hor: number; min: number; seg: number } | null} */
  let valorAtual = null;
  let lastTickAt = Date.now();
  let lastAriaMinuteBucket = /** @type {number | null} */ (null);
  let ariaEndedAnnounced = false;
  let timerId = 0;
  /** @type {Record<string, number>} */
  const flipTimers = {};

  const prefersReduce =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** @type {readonly ['dia','hor','min','seg']} */
  const UNITS = ['dia', 'hor', 'min', 'seg'];

  function calcularRestante() {
    return calcularRestanteFromDiff(ALVO - Date.now());
  }

  function alvoAtingido() {
    return Date.now() >= ALVO;
  }

  /**
   * @param {number} n
   * @param {'dia'|'hor'|'min'|'seg'} unidade
   */
  function formatar(n, unidade) {
    const z = alvoAtingido();
    if (unidade === 'dia') {
      return z ? '000' : String(n);
    }
    return z ? '00' : String(n).padStart(2, '0');
  }

  function updateAria(state) {
    if (!live) return;
    const diff = Math.max(0, ALVO - Date.now());

    if (diff <= 0) {
      if (!ariaEndedAnnounced) {
        ariaEndedAnnounced = true;
        live.textContent =
          'A contagem regressiva terminou. Super Mario Galaxy: O Filme já estreou nos cinemas.';
      }
      return;
    }

    ariaEndedAnnounced = false;
    const bucket = Math.floor(diff / 60000);
    if (bucket === lastAriaMinuteBucket) return;
    lastAriaMinuteBucket = bucket;

    const { dia, hor, min, seg } = state;
    live.textContent = `Faltam ${dia} dias, ${hor} horas, ${min} minutos e ${seg} segundos para a estreia nos cinemas.`;
  }

  /**
   * @param {'dia'|'hor'|'min'|'seg'} unit
   */
  function getUnitEls(unit) {
    const wrap = card.querySelector(`[data-unit="${unit}"]`);
    if (!wrap) return null;
    const fc = wrap.querySelector('.flip-card');
    if (!fc) return null;
    return {
      card: fc,
      top: fc.querySelector('.flip-card__top .flip-card__face'),
      bottom: fc.querySelector('.flip-card__bottom .flip-card__face'),
      topFlap: fc.querySelector('.flip-card__top-flap .flip-card__face'),
      bottomFlap: fc.querySelector('.flip-card__bottom-flap .flip-card__face'),
    };
  }

  /**
   * @param {{ dia: number; hor: number; min: number; seg: number }} state
   * @param {{ silent?: boolean }} [opts]
   */
  function pintarTudo(state, opts = {}) {
    const silent = opts.silent === true;
    for (let i = 0; i < UNITS.length; i++) {
      const u = UNITS[i];
      const els = getUnitEls(u);
      if (!els || !els.top || !els.bottom || !els.topFlap || !els.bottomFlap) continue;
      const t = formatar(state[u], u);
      els.top.textContent = t;
      els.bottom.textContent = t;
      if (silent) {
        els.topFlap.textContent = t;
        els.bottomFlap.textContent = t;
      }
      els.card.classList.remove('is-flipping');
    }
  }

  /**
   * @param {'dia'|'hor'|'min'|'seg'} unit
   * @param {number} antigo
   * @param {number} novo
   */
  function flip(unit, antigo, novo) {
    const els = getUnitEls(unit);
    if (!els) return;

    const fa = formatar(antigo, unit);
    const fn = formatar(novo, unit);

    if (prefersReduce || fa === fn) {
      if (els.top) els.top.textContent = fn;
      if (els.bottom) els.bottom.textContent = fn;
      return;
    }

    if (els.topFlap) els.topFlap.textContent = fa;
    if (els.bottomFlap) els.bottomFlap.textContent = fn;
    if (els.top) els.top.textContent = fn;
    if (els.bottom) els.bottom.textContent = fa;

    window.clearTimeout(flipTimers[unit]);
    els.card.classList.remove('is-flipping');
    void els.card.offsetWidth;
    els.card.classList.add('is-flipping');

    flipTimers[unit] = window.setTimeout(() => {
      if (els.bottom) els.bottom.textContent = fn;
      els.card.classList.remove('is-flipping');
      delete flipTimers[unit];
    }, 600);
  }

  function travarZero() {
    const zero = { dia: 0, hor: 0, min: 0, seg: 0 };
    Object.keys(flipTimers).forEach((k) => {
      window.clearTimeout(flipTimers[k]);
      delete flipTimers[k];
    });
    pintarTudo(zero, { silent: true });
    valorAtual = zero;
    window.clearInterval(timerId);
    timerId = 0;
    updateAria(zero);
    window.dispatchEvent(new CustomEvent('estreia-countdown-zero', { detail: { target: ALVO } }));
  }

  function sincronizarSemAnimacao() {
    Object.keys(flipTimers).forEach((k) => {
      window.clearTimeout(flipTimers[k]);
      delete flipTimers[k];
    });
    const novo = calcularRestante();
    pintarTudo(novo, { silent: true });
    valorAtual = novo;
  }

  function tick() {
    lastTickAt = Date.now();

    if (alvoAtingido()) {
      travarZero();
      return;
    }

    const novo = calcularRestante();
    if (valorAtual === null) {
      valorAtual = novo;
      pintarTudo(novo, { silent: true });
      updateAria(novo);
      return;
    }

    for (let i = 0; i < UNITS.length; i++) {
      const u = UNITS[i];
      if (novo[u] !== valorAtual[u]) {
        flip(u, valorAtual[u], novo[u]);
      }
    }

    valorAtual = novo;
    updateAria(novo);
  }

  /** Render inicial sem flip */
  const inicial = calcularRestante();
  if (alvoAtingido()) {
    travarZero();
  } else {
    pintarTudo(inicial, { silent: true });
    valorAtual = inicial;
    updateAria(inicial);
    timerId = window.setInterval(tick, 1000);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    const gap = Date.now() - lastTickAt;
    if (gap > 2000) {
      if (alvoAtingido()) {
        travarZero();
      } else {
        sincronizarSemAnimacao();
      }
    }
    if (!alvoAtingido() && !timerId) {
      timerId = window.setInterval(tick, 1000);
    }
    lastTickAt = Date.now();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initFloatingNav();
  initStarfield();
  initPersonagensBg();
  initEstreiaCountdown();
  initMarioScrollAnimations();
  initYoshiScrollAnimations();
  initHeroContentScrollAnimations();
});


(function () {
  const track = document.querySelector('.trailers__track');
  const dots = document.querySelectorAll('.trailers__dot');
  const btnPrev = document.querySelector('.trailers__arrow--prev');
  const btnNext = document.querySelector('.trailers__arrow--next');
  const total = dots.length;

  // Slide inicial conforme spec: índice 1 (segundo trailer)
  let current = 1;

  function goTo(index) {
    current = index;
    track.style.transform = `translateX(-${current * 100}%)`;

    dots.forEach((dot, i) => {
      const active = i === current;
      dot.classList.toggle('is-active', active);
      dot.setAttribute('aria-selected', String(active));
      dot.setAttribute('aria-current', active ? 'true' : 'false');
    });

    btnPrev.disabled = current === 0;
    btnNext.disabled = current === total - 1;
  }

  dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));
  btnPrev.addEventListener('click', () => { if (current > 0) goTo(current - 1); });
  btnNext.addEventListener('click', () => { if (current < total - 1) goTo(current + 1); });

  // Navegação por teclado ←/→ quando o carrossel tem foco
  document.querySelector('.trailers__carousel').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); if (current > 0) goTo(current - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); if (current < total - 1) goTo(current + 1); }
  });

  // Estado inicial
  goTo(current);
})();