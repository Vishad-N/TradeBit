import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// "Institutional Structure Core": market noise resolves into HH / HL structure, demand + supply zones,
// support / resistance levels and a metallic core. Vanilla Three.js, one instanced Points draw call.
// Loaded lazily by Hero.jsx so the landing page ships without three.js in its first chunk.

export const SWEEP_EVENT = 'tb:liquidity-sweep';

const CYAN = new THREE.Color('#7FE7FF');
const WHITE = new THREE.Color('#EAF4FF');
const GOLD = new THREE.Color('#D4AF37');

// Structure, in rig-local units (rig is scaled + positioned to the viewport on resize).
// x runs left -> right, price trends up: low, HH/HL staircase, then a break of structure.
const PIVOTS = [
  [-1.0, -1.5], [0.0, -0.55], [0.6, -1.15], [1.6, 0.1], [2.2, -0.5], [3.2, 0.8], [3.8, 0.2], [4.8, 1.55],
];
const SUPPORT_Y = -1.5;
const RESIST_Y = 0.8;
const ZONES = [
  { x0: 0.4, x1: 2.5, y0: SUPPORT_Y, y1: -1.05, color: CYAN },   // demand
  { x0: 3.5, x1: 5.1, y0: 1.5, y1: 1.85, color: GOLD },          // supply
];
const CORE_POS = new THREE.Vector3(3.3, -0.1, -1.3);
const CORE_R = 1.1;

// Label anchors (rig-local) -> text. Positioned in the DOM each frame by projecting these points.
const LABELS = [
  { t: 'HH', p: [3.2, 0.8, 0], dx: -6, dy: -18 },
  { t: 'HL', p: [2.2, -0.5, 0], dx: -6, dy: 12 },
  { t: 'BOS', p: [4.05, 0.8, 0], dx: -10, dy: -20, gold: true },
  { t: 'RESISTANCE', p: [5.15, RESIST_Y, 0], dx: 0, dy: 8, end: true },
  { t: 'SUPPORT', p: [5.15, SUPPORT_Y, 0], dx: 0, dy: -24, end: true },
  { t: 'DEMAND ZONE', p: [0.45, -1.28, 0], dx: -4, dy: 22 },
];

const rand = (a, b) => a + Math.random() * (b - a);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

function polylinePoint(t) {
  // t in 0..1 along the pivot polyline (by segment length).
  let total = 0;
  const lens = [];
  for (let i = 1; i < PIVOTS.length; i++) {
    const l = Math.hypot(PIVOTS[i][0] - PIVOTS[i - 1][0], PIVOTS[i][1] - PIVOTS[i - 1][1]);
    lens.push(l); total += l;
  }
  let d = t * total;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const k = Math.min(1, d / lens[i]);
      return [PIVOTS[i][0] + (PIVOTS[i + 1][0] - PIVOTS[i][0]) * k, PIVOTS[i][1] + (PIVOTS[i + 1][1] - PIVOTS[i][1]) * k];
    }
    d -= lens[i];
  }
  return PIVOTS[PIVOTS.length - 1];
}

// Particle kinds: 0 ambient dust (never resolves), 1 structure line, 2 zone fill, 3 level, 4 core halo.
function buildParticles(count) {
  const noise = new Float32Array(count * 3);
  const target = new Float32Array(count * 3);
  const kind = new Float32Array(count);
  const seed = new Float32Array(count);
  const delay = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const r = Math.random();
    let k = 0;
    if (r > 0.42) k = 1;
    if (r > 0.64) k = 2;
    if (r > 0.78) k = 3;
    if (r > 0.9) k = 4;
    kind[i] = k;
    seed[i] = Math.random();
    delay[i] = Math.random() * 0.4;
    // normalised noise cube in [-1, 1]; the shader scales it to cover the viewport
    noise[i * 3] = rand(-1, 1); noise[i * 3 + 1] = rand(-1, 1); noise[i * 3 + 2] = rand(-1, 1);
    let x = 0, y = 0, z = 0;
    if (k === 1) {
      const [px, py] = polylinePoint(Math.random());
      x = px + rand(-0.025, 0.025); y = py + rand(-0.025, 0.025); z = rand(-0.03, 0.03);
    } else if (k === 2) {
      const zn = ZONES[Math.random() < 0.62 ? 0 : 1];
      x = rand(zn.x0, zn.x1); y = rand(zn.y0, zn.y1); z = rand(-0.05, 0.05);
    } else if (k === 3) {
      const res = Math.random() < 0.5;
      x = rand(res ? -0.4 : -1.2, 5.2); y = (res ? RESIST_Y : SUPPORT_Y) + rand(-0.012, 0.012); z = rand(-0.03, 0.03);
    } else if (k === 4) {
      // sparse spherical halo around the core
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, rr = CORE_R * rand(1.35, 1.7), s = Math.sqrt(1 - u * u);
      x = CORE_POS.x + rr * s * Math.cos(a); y = CORE_POS.y + rr * u; z = CORE_POS.z + rr * s * Math.sin(a);
    }
    target[i * 3] = x; target[i * 3 + 1] = y; target[i * 3 + 2] = z;
  }
  return { noise, target, kind, seed, delay };
}

const VERT = /* glsl */ `
  attribute vec3 aTarget; attribute float aKind; attribute float aSeed; attribute float aDelay;
  uniform float uTime, uProgress, uSweep, uPx, uChaos, uLeftFade;
  uniform vec3 uExtent, uCenter;
  uniform vec2 uMouse, uFadeDir, uFadeRange;
  uniform vec3 uCyan, uWhite, uGold;
  varying vec3 vColor; varying float vAlpha;

  void main(){
    // drifting noise position (always defined: ambient dust stays here, structure particles start here)
    vec3 n = position * uExtent + uCenter;
    float t = uTime;
    float amp = mix(0.55, 0.14, smoothstep(0.0, 1.0, uProgress)) * uChaos + 0.05;
    n += amp * vec3(sin(t*0.9 + aSeed*40.0), cos(t*0.8 + aSeed*23.0), sin(t*0.6 + aSeed*57.0) * 0.5);

    float resolve = aKind > 0.5 ? smoothstep(aDelay, aDelay + 0.6, uProgress) : 0.0;
    vec3 p = mix(n, aTarget, resolve);
    // settled structure breathes very slightly
    p += resolve * 0.012 * vec3(sin(t*1.3 + aSeed*30.0), cos(t*1.1 + aSeed*17.0), 0.0);

    // liquidity sweep: a wave front runs left -> right through the field and kicks particles off their levels
    float front = mix(-7.0, 10.0, uSweep);
    float w = exp(-pow((p.x - front) * 0.8, 2.0)) * sin(uSweep * 3.14159);
    p.y += w * (aSeed - 0.5) * 1.6;
    p.x += w * 0.35;
    p.z += w * (aSeed - 0.5) * 0.8;

    // cursor gently pushes particles aside (more for loose dust than for settled structure)
    vec2 d = p.xy - uMouse; float md = length(d);
    float push = exp(-md * md * 0.9) * mix(0.55, 0.14, resolve);
    p.xy += normalize(d + 1e-4) * push;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uPx * (aKind > 0.5 ? 2.5 : 1.7) * (7.0 / -mv.z) * (1.0 + w * 1.4);

    vec3 col = uWhite;
    if (aKind > 0.5 && aKind < 1.5) col = mix(uCyan, uWhite, aSeed * 0.5);
    else if (aKind < 2.5 && aKind > 1.5) col = (p.y > 1.2) ? uGold : uCyan;
    else if (aKind > 2.5 && aKind < 3.5) col = (p.y > 0.0) ? uGold : uCyan;
    else if (aKind > 3.5) col = mix(uCyan, uGold, step(0.8, aSeed));
    col = mix(col, uGold, step(0.965, aSeed) * 0.9);     // a few gold sparks everywhere
    vColor = col + w * 0.6;

    float base = aKind < 0.5 ? 0.30 : mix(0.42, 0.95, resolve);
    if (aKind > 1.5 && aKind < 2.5) base *= 0.55;                // zone fill stays subtle
    float fade = mix(uLeftFade, 1.0, smoothstep(uFadeRange.x, uFadeRange.y, dot(gl_Position.xy / gl_Position.w, uFadeDir)));
    vAlpha = base * fade * (1.0 + w);
  }
`;
const FRAG = /* glsl */ `
  varying vec3 vColor; varying float vAlpha;
  void main(){
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor, vAlpha * a * a * 1.6);
  }
`;

const ZONE_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const ZONE_FRAG = `
  uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv;
  void main(){
    float edge = smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.92, vUv.y);
    float side = smoothstep(0.0, 0.05, vUv.x) * smoothstep(1.0, 0.7, vUv.x);
    gl_FragColor = vec4(uColor, uOpacity * (0.25 + 0.75 * edge) * side);
  }
`;

function makeLine(points, color, opacity, dashed) {
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = dashed
    ? new THREE.LineDashedMaterial({ color, transparent: true, opacity, dashSize: 0.12, gapSize: 0.1, depthWrite: false, blending: THREE.AdditiveBlending })
    : new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });
  const line = new THREE.Line(geo, mat);
  if (dashed) line.computeLineDistances();
  return line;
}

export default function StructureCore({ onReady }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const labelsRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const small = window.matchMedia('(max-width: 820px)').matches;
    const cores = navigator.hardwareConcurrency || 4;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, alpha: true, powerPreference: 'high-performance' });
    } catch {
      setFailed(true);
      return undefined;
    }
    let dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
    camera.position.set(0, 0, 9);

    // Reflections for the metallic core, from a tiny procedural room (no external HDR to download).
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    const rig = new THREE.Group();
    scene.add(rig);

    // ---- particles
    const COUNT = small ? 4500 : (cores <= 4 ? 9000 : 13000);
    const { noise, target, kind, seed, delay } = buildParticles(COUNT);
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(noise, 3));
    pGeo.setAttribute('aTarget', new THREE.BufferAttribute(target, 3));
    pGeo.setAttribute('aKind', new THREE.BufferAttribute(kind, 1));
    pGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    pGeo.setAttribute('aDelay', new THREE.BufferAttribute(delay, 1));
    const uniforms = {
      uTime: { value: 0 }, uProgress: { value: reduced ? 1 : 0 }, uSweep: { value: 0 }, uPx: { value: dpr },
      uChaos: { value: reduced ? 0.2 : 1 }, uLeftFade: { value: 0.16 },
      uExtent: { value: new THREE.Vector3(8, 4.5, 3) }, uCenter: { value: new THREE.Vector3() },
      uMouse: { value: new THREE.Vector2(99, 99) },
      uFadeDir: { value: new THREE.Vector2(1, 0) }, uFadeRange: { value: new THREE.Vector2(-0.7, -0.05) },
      uCyan: { value: CYAN }, uWhite: { value: WHITE }, uGold: { value: GOLD },
    };
    const pMat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(pGeo, pMat);
    points.frustumCulled = false;
    rig.add(points);

    // ---- structure line + pivot nodes
    const structure = makeLine(PIVOTS.map(([x, y]) => new THREE.Vector3(x, y, 0.02)), CYAN, 0.9, false);
    structure.geometry.setDrawRange(0, 0);
    rig.add(structure);
    const nodeGeo = new THREE.SphereGeometry(0.045, 12, 12);
    const nodes = new THREE.Group();
    PIVOTS.forEach(([x, y], i) => {
      const high = i % 2 === 1 || i === PIVOTS.length - 1;
      const m = new THREE.Mesh(nodeGeo, new THREE.MeshBasicMaterial({ color: high ? GOLD : CYAN, transparent: true, opacity: 0 }));
      m.position.set(x, y, 0.04);
      nodes.add(m);
    });
    rig.add(nodes);

    // ---- levels
    const support = makeLine([new THREE.Vector3(-1.2, SUPPORT_Y, 0), new THREE.Vector3(5.2, SUPPORT_Y, 0)], CYAN, 0, true);
    const resist = makeLine([new THREE.Vector3(-0.4, RESIST_Y, 0), new THREE.Vector3(5.2, RESIST_Y, 0)], GOLD, 0, true);
    rig.add(support, resist);

    // ---- zones (glowing blocks + hairline edges)
    const zoneMats = [];
    ZONES.forEach((z) => {
      const w = z.x1 - z.x0, h = z.y1 - z.y0;
      const mat = new THREE.ShaderMaterial({
        vertexShader: ZONE_VERT, fragmentShader: ZONE_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uColor: { value: z.color }, uOpacity: { value: 0 } },
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      mesh.position.set(z.x0 + w / 2, z.y0 + h / 2, -0.04);
      rig.add(mesh);
      zoneMats.push(mat);
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, h)),
        new THREE.LineBasicMaterial({ color: z.color, transparent: true, opacity: 0, depthWrite: false }));
      edge.position.copy(mesh.position);
      rig.add(edge);
      zoneMats.push(edge.material);
    });

    // ---- the core: faceted metal body, hairline wireframe and two thin orbit plates
    const core = new THREE.Group();
    core.position.copy(CORE_POS);
    core.scale.setScalar(0.001);
    const body = new THREE.Mesh(
      new THREE.IcosahedronGeometry(CORE_R, 1),
      new THREE.MeshStandardMaterial({ color: '#0f131b', metalness: 1, roughness: 0.2, flatShading: true, envMapIntensity: 1.1 }),
    );
    const wire = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(CORE_R * 1.012, 1)),
      new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending }));
    const ringA = new THREE.Mesh(new THREE.RingGeometry(CORE_R * 1.42, CORE_R * 1.435, 128),
      new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    const ringB = new THREE.Mesh(new THREE.RingGeometry(CORE_R * 1.7, CORE_R * 1.712, 128),
      new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    ringA.rotation.set(1.2, 0.2, 0.3); ringB.rotation.set(0.5, 0.9, 0);
    core.add(body, wire, ringA, ringB);
    rig.add(core);
    const key = new THREE.DirectionalLight('#bfeaff', 2.2); key.position.set(4, 5, 6);
    const rim = new THREE.DirectionalLight('#ffd98a', 1.6); rim.position.set(-5, -2, 3);
    scene.add(key, rim);

    // ---- layout: structure sits right-of-centre on desktop, above the copy on phones
    const size = { w: 1, h: 1, scale: 1 };
    const resize = () => {
      const w = wrap.clientWidth || 1, h = wrap.clientHeight || 1;
      size.w = w; size.h = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      const visH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const visW = visH * camera.aspect;
      const portrait = w / h < 0.95;
      const scale = portrait ? (0.94 * visW) / 6.4 : Math.min(1.25, (0.46 * visW) / 6.2);
      size.scale = scale;
      rig.scale.setScalar(scale);
      rig.position.set(
        portrait ? -1.9 * scale : (0.22 * visW) - 1.9 * scale,
        portrait ? 0.3 * visH - 0.17 * scale : -0.05 * visH,
        0,
      );
      uniforms.uExtent.value.set((visW * 0.62) / scale, (visH * 0.62) / scale, 3);
      uniforms.uCenter.value.set(-rig.position.x / scale, -rig.position.y / scale, 0);
      if (portrait) {
        uniforms.uFadeDir.value.set(0, 1); uniforms.uFadeRange.value.set(-0.1, 0.4); uniforms.uLeftFade.value = 0.12;
      } else {
        uniforms.uFadeDir.value.set(1, 0); uniforms.uFadeRange.value.set(-0.72, -0.02); uniforms.uLeftFade.value = 0.14;
      }
    };
    resize();
    let placeLabels = () => {};
    const ro = new ResizeObserver(() => {
      resize();
      // reduced-motion renders a single still frame, so repaint it when the size changes
      if (reduced) requestAnimationFrame(() => { rig.updateMatrixWorld(true); renderer.render(scene, camera); placeLabels(true); });
    });
    ro.observe(wrap);

    // ---- pointer parallax (desktop only)
    const mouse = { x: 0, y: 0, tx: 0, ty: 0, active: false };
    const ray = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const hit = new THREE.Vector3();
    const onMove = (e) => {
      const r = wrap.getBoundingClientRect();
      if (e.clientY < r.top || e.clientY > r.bottom) { mouse.active = false; return; }
      mouse.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.ty = -(((e.clientY - r.top) / r.height) * 2 - 1);
      mouse.active = true;
    };
    if (!small && !reduced) window.addEventListener('pointermove', onMove, { passive: true });

    // ---- liquidity sweep
    let sweepT = -1;
    const onSweep = () => { if (!reduced) sweepT = 0; };
    window.addEventListener(SWEEP_EVENT, onSweep);

    // ---- labels
    const labelEls = [...labelsRef.current.children];
    const v = new THREE.Vector3();
    placeLabels = (show) => {
      LABELS.forEach((L, i) => {
        const el = labelEls[i];
        v.set(L.p[0], L.p[1], L.p[2]).applyMatrix4(rig.matrixWorld).project(camera);
        const x = (v.x * 0.5 + 0.5) * size.w + L.dx, y = (-v.y * 0.5 + 0.5) * size.h + L.dy;
        el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)${L.end ? ' translateX(-100%)' : ''}`;
        el.classList.toggle('on', show);
      });
    };

    // ---- loop
    let raf = 0, visible = true, running = false;
    let lastT = performance.now();
    let elapsed = 0, startWait = 0.35, frames = 0, slow = 0, dropped = false;
    const RESOLVE = 2.8;

    const frame = () => {
      raf = 0;
      if (!running) return;
      // wall-clock time: the resolve always takes ~3s, even on a slow GPU (frames just get coarser)
      const now = performance.now();
      const dt = Math.min((now - lastT) / 1000, 0.5);
      lastT = now;
      elapsed += dt;
      uniforms.uTime.value = elapsed;

      let prog = reduced ? 1 : easeInOut(clamp01((elapsed - startWait) / RESOLVE));
      uniforms.uProgress.value = prog;
      uniforms.uChaos.value = reduced ? 0.2 : 1 - 0.8 * prog;

      // lines draw on after the particles start to settle
      const lineP = clamp01((prog - 0.35) / 0.55);
      structure.geometry.setDrawRange(0, Math.ceil(lineP * PIVOTS.length));
      // partial segment reveal: scale the draw by also fading
      structure.material.opacity = 0.9 * clamp01(lineP * 3);
      nodes.children.forEach((n, i) => { n.material.opacity = clamp01((lineP * PIVOTS.length - i) * 1.2) * 0.95; });
      const zoneP = clamp01((prog - 0.55) / 0.4);
      zoneMats.forEach((m, i) => { if (m.uniforms) m.uniforms.uOpacity.value = zoneP * 0.5; else m.opacity = zoneP * 0.5; });
      const levelP = clamp01((prog - 0.5) / 0.4);
      let pulse = 0;
      if (sweepT >= 0) {
        sweepT += dt / 1.4;
        if (sweepT >= 1) { sweepT = -1; uniforms.uSweep.value = 0; } else { uniforms.uSweep.value = easeInOut(sweepT); pulse = Math.sin(sweepT * Math.PI); }
      }
      support.material.opacity = (levelP * 0.5) + pulse * 0.5;
      resist.material.opacity = (levelP * 0.55) + pulse * 0.45;

      const coreP = reduced ? 1 : clamp01((prog - 0.4) / 0.6);
      core.scale.setScalar(Math.max(0.001, easeInOut(coreP) * (1 + pulse * 0.07)));
      core.rotation.y = elapsed * 0.16;
      core.rotation.x = Math.sin(elapsed * 0.3) * 0.12;
      ringA.rotation.z = elapsed * 0.22; ringB.rotation.x = 0.5 + elapsed * 0.12;
      wire.material.opacity = 0.26 + pulse * 0.4;

      // parallax: ease the rig towards the cursor and light the cursor push in rig-local space
      mouse.x += (mouse.tx - mouse.x) * 0.06; mouse.y += (mouse.ty - mouse.y) * 0.06;
      rig.rotation.y = mouse.x * 0.1; rig.rotation.x = -mouse.y * 0.06;
      rig.updateMatrixWorld(true);
      if (mouse.active) {
        ray.setFromCamera({ x: mouse.tx, y: mouse.ty }, camera);
        if (ray.ray.intersectPlane(plane, hit)) { rig.worldToLocal(hit); uniforms.uMouse.value.set(hit.x, hit.y); }
      } else uniforms.uMouse.value.set(99, 99);

      placeLabels(prog > 0.92);
      renderer.render(scene, camera);

      // one-time adaptive quality: if the GPU struggles, drop resolution and thin the field
      if (!dropped && ++frames > 40) {
        if (dt > 0.034) slow++;
        if (frames > 140) {
          if (slow > 55) {
            dropped = true;
            dpr = 1; renderer.setPixelRatio(1); uniforms.uPx.value = 1; resize();
            pGeo.setDrawRange(0, Math.floor(COUNT * 0.5));
          } else dropped = true;
        }
      }
      if (reduced) { running = false; return; }
      raf = requestAnimationFrame(frame);
    };
    const start = () => { if (running || reduced && frames > 0) return; running = true; lastT = performance.now(); raf = requestAnimationFrame(frame); };
    const stop = () => { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; };

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !document.hidden) start(); else stop(); }, { threshold: 0 });
    io.observe(wrap);
    const onVis = () => { if (document.hidden) stop(); else if (visible) start(); };
    document.addEventListener('visibilitychange', onVis);
    start();
    onReady?.();

    return () => {
      stop();
      io.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener(SWEEP_EVENT, onSweep);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      });
      envTex.dispose(); pmrem.dispose(); renderer.dispose();
    };
  }, [onReady]);

  if (failed) return null;
  return (
    <div className="sc" ref={wrapRef} aria-hidden="true">
      <canvas ref={canvasRef} />
      <div className="sc-labels" ref={labelsRef}>
        {LABELS.map((L, i) => <span key={L.t} className={'sc-label' + (L.gold ? ' gold' : '')} style={{ '--d': `${i * 0.12}s` }}>{L.t}</span>)}
      </div>
    </div>
  );
}
