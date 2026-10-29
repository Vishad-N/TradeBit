import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Rubber-sphere field (physics + logo decal shader ported from the Originkit "Rubber Spheres" component).
// Each sphere carries a market logo drawn to a canvas texture, so nothing is fetched from a third party.
// The canvas is deliberately bigger than the hero: spheres drift over the copy, while the attraction point
// (the "focal point") stays at the centre of the canvas, inside the container.

const CAM_Z = 30;
const DAMPING = 0.92;
const ATTRACTION = 0.005;
const MOUSE_RADIUS = 8;
const MOUSE_FORCE = 0.05;
const MAX_SPEED = 4;
const RELAX_ITERS = 3;
const PRESETTLE = 150;
const FIXED_DT = 1 / 60;
const AWAY = -9999;
const FOCUS_X = 0.74;

// [label, brand colour, ink, glyph painter]
const LOGOS = [
  ['BTC', '#f7931a', '#fff', 'btc'], ['ETH', '#627eea', '#fff', 'eth'], ['SOL', '#7c3aed', '#fff', 'sol'],
  ['XAU', '#e8b923', '#2a2100', 'Au'], ['XAG', '#c4ccd8', '#1d2430', 'Ag'], ['USD', '#1f8f55', '#fff', '$'],
  ['EUR', '#2457d6', '#fff', '€'], ['GBP', '#7b2d8e', '#fff', '£'], ['JPY', '#d9304a', '#fff', '¥'],
  ['USDT', '#26a17b', '#fff', 'T'], ['BNB', '#f3ba2f', '#2a2100', 'bnb'], ['XRP', '#23292f', '#fff', 'xrp'],
];

function logoTexture([, , ink, glyph]) {
  const S = 256, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = ink; g.strokeStyle = ink; g.lineCap = 'round'; g.lineJoin = 'round';
  const text = (t, size, y = S / 2) => { g.font = `700 ${size}px "Space Grotesk", Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, S / 2, y + size * 0.04); };
  if (glyph === 'btc') {
    text('B', 170);
    g.lineWidth = 12; g.beginPath(); g.moveTo(108, 40); g.lineTo(108, 66); g.moveTo(138, 40); g.lineTo(138, 66); g.moveTo(108, 190); g.lineTo(108, 216); g.moveTo(138, 190); g.lineTo(138, 216); g.stroke();
  } else if (glyph === 'eth') {
    const d = (pts, a) => { g.globalAlpha = a; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
    d([[128, 30], [188, 130], [128, 100], [68, 130]], 1); d([[128, 112], [188, 138], [128, 176], [68, 138]], 0.75); d([[128, 190], [188, 150], [128, 232], [68, 150]], 0.9); g.globalAlpha = 1;
  } else if (glyph === 'sol') {
    [70, 116, 162].forEach((y, i) => { g.beginPath(); const k = i === 1 ? -1 : 1; g.moveTo(k > 0 ? 80 : 60, y); g.lineTo(k > 0 ? 200 : 180, y); g.lineTo(k > 0 ? 176 : 204, y + 28); g.lineTo(k > 0 ? 56 : 84, y + 28); g.closePath(); g.fill(); });
  } else text(glyph, glyph.length > 2 ? 78 : glyph.length === 2 ? 120 : 170);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const DECAL_VERT = '#include <common>\nvarying vec3 vDecalPos;';
const DECAL_FRAG_DECL = '#include <common>\nuniform sampler2D uDecalMap;\nvarying vec3 vDecalPos;';
const DECAL_FRAG = `#include <map_fragment>
{
  vec3 dn = normalize(vDecalPos);
  float face = smoothstep(0.0, 0.35, dn.z);
  vec2 dUv = vDecalPos.xy / 0.72;
  float inside = step(abs(dUv.x), 1.0) * step(abs(dUv.y), 1.0);
  vec4 slide = texture2D(uDecalMap, dUv * 0.5 + 0.5);
  diffuseColor.rgb = mix(diffuseColor.rgb, slide.rgb, face * inside * slide.a);
}`;

function decalMaterial(color, texture) {
  const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.3, sheen: 1, sheenColor: new THREE.Color(color), sheenRoughness: 0.4 });
  mat.onBeforeCompile = (s) => {
    s.uniforms.uDecalMap = { value: texture };
    s.vertexShader = s.vertexShader.replace('#include <common>', DECAL_VERT).replace('#include <begin_vertex>', '#include <begin_vertex>\nvDecalPos = position;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', DECAL_FRAG_DECL).replace('#include <map_fragment>', DECAL_FRAG);
  };
  mat.customProgramCacheKey = () => 'tb-decal';
  return mat;
}

export default function SpheresScene({ count = 22, size = 1.45 }) {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
    camera.position.set(0, 0, CAM_Z);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8892a6, 1.5));
    const key = new THREE.DirectionalLight(0xffffff, 2); key.position.set(10, 25, 20); scene.add(key);
    const fill = new THREE.DirectionalLight(0xbcd0ff, 0.6); fill.position.set(-15, 0, 15); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.8); rim.position.set(0, -10, -20); scene.add(rim);

    // Focal point: FOCUS_X of the way across the canvas (0 = left edge, 1 = right edge), in world units at z = 0.
    const focusX = () => {
      const w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return 0;
      const visibleW = 2 * CAM_Z * Math.tan(THREE.MathUtils.degToRad(22.5)) * (w / h);
      return ((w < 1500 ? 0.81 : FOCUS_X) - 0.5) * visibleW;
    };
    const fx0 = focusX();
    const scale = () => THREE.MathUtils.clamp(host.clientWidth / 1800, 0.68, 1); // smaller spheres on narrower screens
    const geo = new THREE.SphereGeometry(1, 40, 40);
    const textures = LOGOS.map(logoTexture);
    const bodies = Array.from({ length: count }, (_, i) => {
      const li = i % LOGOS.length;
      const mat = decalMaterial(LOGOS[li][1], textures[li]);
      const root = new THREE.Mesh(geo, mat);
      scene.add(root);
      const jitter = 1 + (Math.random() - 0.5) * 0.3;
      return {
        root, mat, jitter, radius: size * jitter,
        pos: new THREE.Vector3(fx0 + (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 10),
        vel: new THREE.Vector3(),
        // Start facing the camera so the logo is readable; a gentle sway is added per frame.
        phase: Math.random() * 6.28, sway: 0.15 + Math.random() * 0.2,
      };
    });

    const resize = () => {
      const w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h, false);
    };
    const ro = new ResizeObserver(resize); ro.observe(host); resize();

    // The canvas never takes pointer events (text stays selectable); the pointer is tracked on the window instead,
    // so spheres dodge the cursor even while it is over the headline.
    const mouse = new THREE.Vector3(0, 0, AWAY);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
    const onMove = (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const r = host.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      if (!ray.ray.intersectPlane(plane, mouse)) mouse.set(0, 0, AWAY);
    };
    const onOut = () => mouse.set(0, 0, AWAY);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('mouseleave', onOut);
    window.addEventListener('blur', onOut);

    const tmp = new THREE.Vector3(), delta = new THREE.Vector3(), rel = new THREE.Vector3();
    const sx = 1.0, sy = 1.0; // elliptical spread around the focal point
    const step = () => {
      const fx = focusX();
      for (const b of bodies) {
        b.radius = size * scale() * b.jitter;
        tmp.copy(b.pos); tmp.x -= fx; tmp.negate(); tmp.x /= sx; tmp.y /= sy;
        b.vel.addScaledVector(tmp, ATTRACTION);
        if (mouse.z !== AWAY) {
          const d = b.pos.distanceTo(mouse);
          if (d < MOUSE_RADIUS) { tmp.copy(b.pos).sub(mouse); if (tmp.lengthSq() < 1e-8) tmp.set(0, 1, 0); tmp.normalize(); b.vel.addScaledVector(tmp, (MOUSE_RADIUS - d) * MOUSE_FORCE); }
        }
        if (b.vel.length() > MAX_SPEED) b.vel.setLength(MAX_SPEED);
        b.vel.multiplyScalar(DAMPING);
        b.pos.add(b.vel);
      }
      for (let it = 0; it < RELAX_ITERS; it++) {
        for (let i = 0; i < bodies.length; i++) {
          const a = bodies[i];
          for (let j = i + 1; j < bodies.length; j++) {
            const c = bodies[j], min = a.radius + c.radius;
            if (Math.abs(a.pos.x - c.pos.x) > min || Math.abs(a.pos.y - c.pos.y) > min || Math.abs(a.pos.z - c.pos.z) > min) continue;
            const dist = a.pos.distanceTo(c.pos);
            if (dist >= min) continue;
            delta.copy(a.pos).sub(c.pos); if (delta.lengthSq() < 1e-8) delta.set(1, 0, 0); delta.normalize();
            const push = (min - dist) * 0.5;
            a.pos.addScaledVector(delta, push); c.pos.addScaledVector(delta, -push);
            rel.copy(a.vel).sub(c.vel);
            const ap = rel.dot(delta);
            if (ap < 0) { a.vel.addScaledVector(delta, -ap * 0.8); c.vel.addScaledVector(delta, ap * 0.8); }
          }
        }
      }
    };
    for (let i = 0; i < PRESETTLE; i++) step();

    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 });
    io.observe(host);
    let raf = 0, last = performance.now(), acc = 0;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.25, (now - last) / 1000); last = now;
      if (!visible || document.hidden) return;
      acc += dt;
      let n = 0;
      while (acc >= FIXED_DT && n++ < 6) { step(); acc -= FIXED_DT; }
      if (acc >= FIXED_DT) acc = 0;
      const t = now / 1000;
      for (const b of bodies) {
        b.root.position.copy(b.pos);
        b.root.scale.setScalar(b.radius);
        // Face the camera, leaning slightly toward the direction of travel so they feel like they roll.
        b.root.rotation.set(b.vel.y * -0.35 + Math.sin(t * 0.7 + b.phase) * b.sway * 0.4, b.vel.x * 0.35 + Math.cos(t * 0.6 + b.phase) * b.sway * 0.4, 0);
      }
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf); io.disconnect(); ro.disconnect();
      window.removeEventListener('pointermove', onMove); document.removeEventListener('mouseleave', onOut); window.removeEventListener('blur', onOut);
      bodies.forEach((b) => b.mat.dispose()); textures.forEach((t) => t.dispose()); geo.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, [count, size]);

  return <div ref={hostRef} className="cx-spheres" />;
}
