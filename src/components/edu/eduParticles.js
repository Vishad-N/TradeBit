import { BufferAttribute, BufferGeometry, Color, OrthographicCamera, Points, Scene, ShaderMaterial, WebGLRenderer } from 'three';

// The particle layer for the curriculum cards (named imports so the bundler can tree-shake three.js).
// About 40-60 soft dots for three meanings only: flow along the finished structure line, a faint glow on the +3R target,
// and rising dots over the candle while its card is hovered. Returns a stop() that tears everything down.

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const rand = (a, b) => a + Math.random() * (b - a);

const VERT = /* glsl */ `
  attribute float aAlpha; attribute float aSize; attribute vec3 aColor;
  uniform float uPx; varying float vA; varying vec3 vC;
  void main(){ vA = aAlpha; vC = aColor; gl_PointSize = aSize * uPx; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const FRAG = /* glsl */ `
  varying float vA; varying vec3 vC;
  void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.05, d); gl_FragColor = vec4(vC, vA * a * a); }
`;

export function startParticles({ grid, svg, small, fine }) {
  const extraCleanup = [];
  const canvas = document.createElement('canvas');
  canvas.className = 'edu-fx-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  grid.appendChild(canvas);
  let renderer;
  try { renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' }); } catch { canvas.remove(); return null; }
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const cam = new OrthographicCamera(0, 1, 0, 1, -10, 10); // pixel space, y down, relative to the grid

  const S = small ? 8 : 14;      // structure flow
  const R = small ? 6 : 10;      // risk glow
  const P = fine ? 22 : 0;       // rising dots over the candle (hover only, so none on touch)
  const N = S + R + P;
  const pos = new Float32Array(N * 3), alpha = new Float32Array(N), size = new Float32Array(N), color = new Float32Array(N * 3);
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('aAlpha', new BufferAttribute(alpha, 1));
  geo.setAttribute('aSize', new BufferAttribute(size, 1));
  geo.setAttribute('aColor', new BufferAttribute(color, 3));
  const mat = new ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { uPx: { value: dpr } }, transparent: true, depthWrite: false });
  const points = new Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  const LIME = new Color('#8FB020'), INK = new Color('#151814'), LIME_HI = new Color('#B8D83D');
  const setColor = (i, c) => { color[i * 3] = c.r; color[i * 3 + 1] = c.g; color[i * 3 + 2] = c.b; };

  // per-particle state
  const flow = Array.from({ length: S }, (_, i) => ({ t: Math.random(), v: rand(0.045, 0.085), off: rand(-3, 3), sz: rand(3.5, 6) }));
  flow.forEach((p, i) => { setColor(i, i % 4 === 3 ? INK : LIME); size[i] = p.sz; });
  const glow = Array.from({ length: R }, (_, i) => ({ ph: Math.random() * 6.28, w: rand(0.25, 0.5), sz: rand(4, 7) }));
  glow.forEach((p, i) => { setColor(S + i, LIME_HI); size[S + i] = p.sz; });
  const rise = Array.from({ length: P }, () => ({ life: 0, age: 0, x: 0, y: 0, vx: 0, vy: 0, max: 1 }));
  rise.forEach((_, i) => { setColor(S + R + i, i % 3 === 2 ? INK : LIME); });

  const cardRisk = grid.querySelector('.m-risk');
  const target = grid.querySelector('.rr .tp');
  const cardPa = grid.querySelector('.m-feature');
  const body = grid.querySelector('.pa svg rect');
  const w = { hover: false };
  if (cardPa && fine) {
    const on = () => { w.hover = true; }, off = () => { w.hover = false; };
    cardPa.addEventListener('pointerenter', on); cardPa.addEventListener('pointerleave', off);
    extraCleanup.push(() => { cardPa.removeEventListener('pointerenter', on); cardPa.removeEventListener('pointerleave', off); });
  }

  const resize = () => {
    const gw = grid.clientWidth || 1, gh = grid.clientHeight || 1;
    renderer.setSize(gw, gh, false);
    cam.right = gw; cam.bottom = gh; cam.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(grid);

  let visible = true, run = false, last = performance.now(), t = 0, drawnAt = 0, spawn = 0;
  const frame = () => {
    raf2 = 0;
    if (!run) return;
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now; t += dt;
    const gr = grid.getBoundingClientRect();

    // 4a. flow along the finished structure line
    let structOn = 0;
    if (svg) {
  if (!drawnAt && svg.classList.contains('drawn')) drawnAt = t;
  structOn = drawnAt ? clamp01((t - drawnAt - 2.7) / 1.4) : 0;
  const r = svg.getBoundingClientRect();
  const sc = r.width / 760;
  const poly = svg.querySelector('polyline');
  if (poly && structOn > 0) {
    const pts = poly.getAttribute('points').trim().split(/\s+/).map((s) => s.split(',').map(Number));
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = cum[cum.length - 1];
    flow.forEach((p, i) => {
      p.t = (p.t + p.v * dt) % 1;
      const d = p.t * total;
      let s = 1;
      while (s < cum.length - 1 && cum[s] < d) s++;
      const k = (d - cum[s - 1]) / (cum[s] - cum[s - 1] || 1);
      const x = lerp(pts[s - 1][0], pts[s][0], k), y = lerp(pts[s - 1][1], pts[s][1], k);
      pos[i * 3] = r.left - gr.left + x * sc + p.off * 0.4;
      pos[i * 3 + 1] = r.top - gr.top + y * sc + p.off;
      alpha[i] = Math.pow(Math.sin(Math.PI * p.t), 0.8) * 0.75 * structOn;
    });
  } else flow.forEach((_, i) => { alpha[i] = 0; });
    }

    // 4b. soft glow inside the +3R target once the risk card has assembled
    const riskAt = cardRisk?.dataset.fxAt ? Number(cardRisk.dataset.fxAt) : 0;
    const riskOn = riskAt ? clamp01((now - riskAt - 1500) / 1400) : 0;
    if (target && riskOn > 0) {
  const r = target.getBoundingClientRect();
  glow.forEach((p, i) => {
    const j = S + i;
    pos[j * 3] = r.left - gr.left + r.width * (0.5 + 0.44 * Math.sin(p.ph + p.w * t));
    pos[j * 3 + 1] = r.top - gr.top + r.height * (0.5 + 0.4 * Math.sin(p.ph * 1.7 + p.w * 0.8 * t));
    alpha[j] = (0.2 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.2 + p.ph * 3))) * riskOn;
  });
    } else glow.forEach((_, i) => { alpha[S + i] = 0; });

    // 4c. a few dots rise from the candle while the card is hovered
    if (P && body) {
  const paAt = cardPa?.dataset.fxAt ? Number(cardPa.dataset.fxAt) : 0;
  if (w.hover && paAt && now - paAt > 900) {
    spawn += dt;
    if (spawn > 0.22) {
      spawn = 0;
      const free = rise.find((p) => p.life <= 0);
      if (free) {
        const r = body.getBoundingClientRect();
        Object.assign(free, { life: rand(2.4, 3.6), age: 0, x: r.left - gr.left + rand(0.1, 0.9) * r.width, y: r.top - gr.top + rand(0.2, 0.9) * r.height, vx: rand(-4, 4), vy: -rand(14, 28), max: rand(0.35, 0.6) });
        size[S + R + rise.indexOf(free)] = rand(2.5, 4.5);
      }
    }
  }
  rise.forEach((p, i) => {
    const j = S + R + i;
    if (p.life <= 0) { alpha[j] = 0; return; }
    p.age += dt; p.life -= dt;
    p.x += (p.vx + Math.sin(p.age * 1.6 + i) * 5) * dt; p.y += p.vy * dt;
    pos[j * 3] = p.x; pos[j * 3 + 1] = p.y;
    const u = clamp01(p.age / (p.age + Math.max(p.life, 0.001)));
    alpha[j] = Math.sin(Math.PI * u) * p.max;
  });
    }

    geo.attributes.position.needsUpdate = true;
    geo.attributes.aAlpha.needsUpdate = true;
    geo.attributes.aSize.needsUpdate = true;
    geo.attributes.aColor.needsUpdate = true;
    renderer.render(scene, cam);
    raf2 = requestAnimationFrame(frame);
  };
  let raf2 = 0;
  const start = () => { if (run) return; run = true; last = performance.now(); raf2 = requestAnimationFrame(frame); };
  const stop = () => { run = false; if (raf2) cancelAnimationFrame(raf2); raf2 = 0; };
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !document.hidden) start(); else stop(); });
  io.observe(grid);
  const onVis = () => { if (document.hidden) stop(); else if (visible) start(); };
  document.addEventListener('visibilitychange', onVis);
  start();

  return () => {
    extraCleanup.forEach((fn) => fn());
    stop(); io.disconnect(); ro.disconnect();
    document.removeEventListener('visibilitychange', onVis);
    geo.dispose(); mat.dispose(); renderer.dispose(); canvas.remove();
  };
}
