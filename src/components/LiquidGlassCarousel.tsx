// Liquid Glass Carousel (Originkit), adapted for this site.
//
// Changes from the original paste:
//  - the Framer-only transition plumbing is replaced by fixed timings (see makeParams);
//  - the lens shader writes through linearToOutputTexel so colours match the page (the scene is rendered to a
//    linear render target first);
//  - the part of the file that was cut off in the paste (end of the entry animation, render loop, resize,
//    cleanup, imperative step() and the React wrapper) is written here;
//  - the wheel is off by default so the page can still scroll; prev/next are exposed through a ref.

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"
import * as THREE from "three"

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

type Ease = (t: number) => number

const outPow =
    (n: number): Ease =>
    (t) =>
        1 - Math.pow(1 - t, n)

const inOutPow =
    (n: number): Ease =>
    (t) =>
        t < 0.5 ? Math.pow(2 * t, n) / 2 : 1 - Math.pow(2 - 2 * t, n) / 2

const OUT3 = outPow(3)
const INOUT2 = inOutPow(2)
const INOUT3 = inOutPow(3)

type NumBag = Record<string, number>
const bag = (a: number[]) => a as unknown as NumBag

interface Track {
    obj: NumBag
    key: string
    from: number | null
    to: number
    dur: number
    at: number
    ease: Ease
}

class Timeline {
    private tracks: Track[] = []
    private calls: { at: number; fn: () => void; fired: boolean }[] = []
    private time: number
    private dead = false

    constructor(delay = 0) {
        this.time = -delay
    }

    to(obj: NumBag, key: string | number, to: number, dur: number, ease: Ease, at = 0) {
        this.tracks.push({ obj, key: String(key), from: null, to, dur: Math.max(0.0001, dur), at, ease })
        return this
    }

    call(fn: () => void, at: number) {
        this.calls.push({ at, fn, fired: false })
        return this
    }

    step(dt: number) {
        if (this.dead) return
        this.time += dt
        for (const tr of this.tracks) {
            const u = (this.time - tr.at) / tr.dur
            if (u < 0) continue
            if (tr.from === null) tr.from = tr.obj[tr.key] ?? 0
            tr.obj[tr.key] = tr.from + (tr.to - tr.from) * tr.ease(clamp01(u))
        }
        for (const c of this.calls) {
            if (!c.fired && this.time >= c.at) {
                c.fired = true
                c.fn()
            }
        }
    }

    kill() {
        this.dead = true
        this.tracks.length = 0
        this.calls.length = 0
    }
}

const lensVertexShader = `
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`

const lensFragmentShader = `
  #define PI 3.14159265
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTex;
  uniform vec2  uRes;
  uniform vec2  uCenter;
  uniform float uSizeX;
  uniform float uSizeY;
  uniform float uAspect;
  uniform float uZoom;
  uniform float uDispersion;
  uniform float uBlur;
  uniform float uGlow;
  uniform float uWhiteGlow;
  uniform float uNovaSize;
  uniform float uBlueRing;
  uniform float uRingRadius;
  uniform float uRingWidth;
  uniform float uShimmer;
  uniform float uShimmerFreq;
  uniform float uShimmerSpeed;
  uniform float uShimmerDepth;
  uniform float uTime;
  uniform float uRimStart;
  uniform float uRimTangential;
  uniform float uRimInward;
  uniform float uRimFreq1;
  uniform float uRimFreq2;
  uniform vec3  uBlueColor;
  uniform float uRimLine;
  uniform float uRimLinePos;
  uniform float uRimLineWidth;
  uniform float uVignette;
  uniform float uVignetteSize;
  uniform float uShape;
  uniform float uSquareRound;
  uniform float uRotation;
  uniform int   uSamples;
  uniform float uWarp;
  uniform float uWarpPow;

  const int MAX_SAMPLES = 16;

  // Bends the whole strip along a curve: content is raised on the right (it arrives from above) and lowered on
  // the left (it leaves downward). uWarp is the height shift at the screen edge, in uv units.
  float warpY(float x) {
    float s = (x - 0.5) * 2.0;
    return uWarp * sign(s) * pow(abs(s), uWarpPow);
  }

  float sdRoundBox(vec2 p, vec2 b, float r){
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  vec3 discLens(vec2 center, float aspectCorrect, out float outA) {
    vec2 p = (vUv - center);
    p.x *= aspectCorrect;

    float ca = cos(uRotation), sa = sin(uRotation);
    p = mat2(ca, -sa, sa, ca) * p;
    vec2 halfSize = vec2(uSizeX, uSizeY);

    float dist = length(p / halfSize);
    outA = 0.0;

    float maskND;
    if (uShape > 0.5) {
      float corner = min(uSizeX, uSizeY) * clamp(uSquareRound, 0.0, 1.0);
      float sd = sdRoundBox(p, halfSize, corner);
      maskND = 1.0 + sd / min(uSizeX, uSizeY);
    } else {
      maskND = dist;
    }
    if (maskND > 1.0) return vec3(0.0);

    float shapeND = clamp(maskND, 0.0, 1.0);

    float nd = clamp(dist, 0.0, 1.0);
    vec2  offset = vUv - center;
    vec2  radialDir = normalize(offset + 1e-6);
    vec2  tangentDir = vec2(-radialDir.y, radialDir.x);

    float angle = atan(p.y, p.x);

    float pull = uZoom * 0.30 * (nd * nd);
    float rimStrength = smoothstep(uRimStart, 1.0, nd);
    float fluidWave = sin(angle * uRimFreq1) * 0.55 + sin(angle * uRimFreq2) * 0.25;
    float rScreen = (uSizeX + uSizeY) * 0.5;
    vec2  rimOff = tangentDir * fluidWave * rimStrength * rScreen * uRimTangential;
    vec2  rimPull = -radialDir * rimStrength * rScreen * uRimInward;

    vec2 baseUV = center + offset * (1.0 - pull) + rimOff + rimPull;
    baseUV.y -= warpY(vUv.x);

    float rimMask = smoothstep(0.55, 1.0, nd);
    vec2  dispDir = offset * uDispersion * 0.004 * rimMask;
    int N = uSamples;
    if (N < 2) N = 2;
    if (N > MAX_SAMPLES) N = MAX_SAMPLES;
    vec3 col = vec3(0.0);

    if (uDispersion < 0.01) {
      col = texture2D(uTex, baseUV).rgb;
    } else {
      vec3 caW = vec3(0.0);
      for (int i = 0; i < MAX_SAMPLES; i++) {
        if (i >= N) break;
        float t = float(i) / float(N - 1);
        vec2 sUV = baseUV + dispDir * (t - 0.5);
        vec3 s = texture2D(uTex, sUV).rgb;
        vec3 w = vec3(
          exp(-pow((t - 0.00) / 0.38, 2.0)),
          exp(-pow((t - 0.50) / 0.38, 2.0)),
          exp(-pow((t - 1.00) / 0.38, 2.0))
        );
        col += s * w;
        caW += w;
      }
      col /= max(caW, vec3(0.001));
    }

    float blurFade = 1.0 - smoothstep(0.72, 0.98, nd);
    if (uBlur > 0.01 && blurFade > 0.01) {
      vec2 blurRad = vec2(uBlur) / uRes * blurFade;
      vec3 bcol = vec3(0.0);
      float btw = 0.0;
      for (float a = 0.0; a < PI * 2.0; a += PI * 2.0 / 6.0) {
        for (float rr = 0.4; rr <= 1.001; rr += 0.3) {
          vec2 o = vec2(cos(a), sin(a)) * blurRad * rr;
          float w = 1.0 - rr * 0.38;
          bcol += texture2D(uTex, baseUV + o).rgb * w;
          btw += w;
        }
      }
      col = mix(bcol / btw, col, rimMask);
    }

    col *= mix(0.91, 1.0, smoothstep(0.0, 0.38, shapeND));

    float r2 = shapeND * shapeND * 0.25;
    float gs = max(uNovaSize * uGlow * 0.003, 0.004);
    float nova = exp(-r2 / gs) + exp(-r2 / (gs * 7.0)) * 0.18;
    nova *= uWhiteGlow * (uGlow / 17.0) * 1.15;
    col += vec3(nova);

    float dC = shapeND * 0.5;
    float tR = clamp(uRingRadius, 0.1, 0.49);
    float rW = max(uRingWidth, 0.003);
    float ring = exp(-pow((dC - tR) / rW, 2.0));
    ring *= uBlueRing * (uGlow / 17.0) * 1.8;
    if (uShimmer > 0.5) ring *= sin(angle * uShimmerFreq + uTime * uShimmerSpeed) * uShimmerDepth + (1.0 - uShimmerDepth);

    float ringAura = exp(-pow((dC - tR) / (rW * 4.0), 2.0)) * 0.2 * uBlueRing * (uGlow / 17.0);
    col += uBlueColor * (ring + ringAura);

    vec3 edgeCol = mix(vec3(1.0), uBlueColor, 0.55);
    col += edgeCol * (exp(-pow((dC - uRimLinePos) / max(uRimLineWidth, 0.0001), 2.0)) * uRimLine);

    outA = smoothstep(1.0, 0.93, maskND);
    return col;
  }

  void main(){
    vec3 base = texture2D(uTex, vec2(vUv.x, vUv.y - warpY(vUv.x))).rgb;
    vec3 outc = base;

    float a = 0.0;
    vec3 c = discLens(uCenter, uAspect, a);
    outc = mix(outc, c, a);

    if (uVignette > 0.001) {
      vec2 vc = vUv - 0.5;
      vc.x *= uAspect;
      float d = length(vc) / max(uVignetteSize, 0.0001);
      float vig = 1.0 - uVignette * smoothstep(0.5, 1.0, d);
      outc *= clamp(vig, 0.0, 1.0);
    }

    // The scene was rendered to a linear target; convert to the canvas output encoding here.
    gl_FragColor = linearToOutputTexel(vec4(outc, 1.0));
  }
`

interface EntryOffset {
    x: number
    y: number
}

type EntryPattern = (index: number, count: number, slot: number) => EntryOffset

const FROM_BOTTOM: EntryOffset = { x: 0, y: -1 }
const FROM_TOP: EntryOffset = { x: 0, y: 1 }

const ENTRY_PATTERNS: Record<string, EntryPattern> = {
    bottom: () => FROM_BOTTOM,
    top: () => FROM_TOP,
    alternate: (index) => (index % 2 === 0 ? FROM_TOP : FROM_BOTTOM),
}

interface CardScale {
    w: number
    h: number
}

type CardSizing = (index: number) => CardScale

const UNIFORM: CardScale = { w: 1, h: 1 }
const ALTERNATE_NARROW = 0.62

const hash01 = (n: number) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
    return x - Math.floor(x)
}

const SIZE_MODES: Record<string, CardSizing> = {
    same: () => UNIFORM,
    alternate: (i) => (i % 2 === 0 ? UNIFORM : { w: ALTERNATE_NARROW, h: 1 }),
    random: (i) => ({ w: 0.6 + 0.4 * hash01(i), h: 0.7 + 0.3 * hash01(i + 97) }),
    image: () => UNIFORM,
}

export interface CarouselImage {
    src: string
    alt?: string
}

export interface LensSettings {
    shape?: "circle" | "square"
    width?: number
    height?: number
    rotation?: number
    dispersion?: number
    ringColor?: string
}

export interface MotionSettings {
    sensitivity?: number
    glide?: number
    snap?: boolean
}

export interface LiquidGlassCarouselProps {
    items?: CarouselImage[]
    background?: string
    sizeMode?: string
    cardWidth?: number
    cardHeight?: number
    gap?: number
    lens?: LensSettings
    motion?: MotionSettings
    entry?: { enabled?: boolean; enterFrom?: string }
    interaction?: { wheel?: boolean; drag?: boolean; clickToFocus?: boolean }
    /** How far the strip bends at the screen edges, as a fraction of the stage height (0 = flat). */
    curve?: number
    onError?: () => void
    style?: React.CSSProperties
    className?: string
}

export interface LiquidGlassCarouselHandle {
    /** Move the carousel by whole cards: +1 next, -1 previous. */
    step: (dir: number) => void
}

function alphaOf(css: string): number {
    const rgba = /rgba?\(([^)]+)\)/i.exec(css)
    if (rgba) {
        const parts = rgba[1].split(/[\s,/]+/).filter(Boolean)
        return parts.length >= 4 ? clamp01(parseFloat(parts[3])) : 1
    }
    const hex = css.trim()
    if (/^#[0-9a-f]{8}$/i.test(hex)) return parseInt(hex.slice(7, 9), 16) / 255
    if (/^#[0-9a-f]{4}$/i.test(hex)) return parseInt(hex[4] + hex[4], 16) / 255
    return 1
}

function makeParams(p: LiquidGlassCarouselProps) {
    const m = p.motion ?? {}
    const e = p.entry ?? {}
    const it = p.interaction ?? {}
    const l = p.lens ?? {}

    const sens = clamp(m.sensitivity ?? 5, 0.2, 10)
    const glide = clamp(m.glide ?? 5, 0, 10)
    const lensAlpha = alphaOf(l.ringColor ?? "#009dff")
    const ease = clamp(0.18 * Math.pow(0.5, glide / 5), 0.02, 0.4)

    return {
        panelH: clamp(p.cardHeight ?? 450, 60, 1200),
        cardW: clamp(p.cardWidth ?? 340, 40, 1600),
        sizeMode: SIZE_MODES[p.sizeMode ?? "same"] ? p.sizeMode ?? "same" : "same",
        gap: clamp(p.gap ?? 12, 0, 200),
        shrinkMax: 0.25,
        shrinkSpeed: 60,
        shrinkAttack: 0.25,
        shrinkDecay: 0.06,

        ease,
        snapEase: ease * 0.56,
        wheelSpeed: 0.28 * sens,
        dragSpeed: 0.32 * sens,
        touchDrag: 1.0,
        touchEase: 0.22,
        friction: 0.865,
        snap: m.snap !== false,
        snapIdleMs: 120,
        clickSlop: 6,
        touchClickSlop: 12,
        flickIdleMs: 90,

        wheel: it.wheel === true,
        drag: it.drag !== false,
        clickToFocus: it.clickToFocus !== false,

        focus: {
            cardDuration: 0.7,
            focusDuration: 0.9,
            stagger: 0.06,
            dropDist: 1.4,
            centerScale: 1.18,
            lensFade: 0.85,
            ease: OUT3,
        },

        entry: {
            enabled: e.enabled !== false,
            delay: 0.5,
            startH: 80,
            riseDuration: 1.0,
            ease: OUT3,
            stagger: 0.07,
            travel: 0.9,
            pattern: ENTRY_PATTERNS[e.enterFrom ?? "bottom"] ?? ENTRY_PATTERNS.bottom,
            growDelay: 0.25,
            growDuration: 2.15,
            growStagger: 0.085,
            lensBloom: 1.4,
        },

        lens: {
            square: l.shape === "square",
            round: 0,
            sizeX: clamp(l.width ?? 0.565, 0.05, 3),
            sizeY: clamp(l.height ?? 1, 0.05, 3),
            posX: 0.5,
            posY: 0.5,
            rotation: l.rotation ?? 65,
            spin: 0,
            zoom: 0,
            dispersion: clamp(l.dispersion ?? 11, 0, 60),
            blur: 0,
            glow: 3,
            whiteGlow: 0.08,
            novaSize: 12,
            ring: 1 * lensAlpha,
            ringRadius: 0.49,
            ringWidth: 0.014,
            ringColor: l.ringColor ?? "#009dff",
            shimmer: true,
            shimmerFreq: 12,
            shimmerSpeed: 3.5,
            shimmerDepth: 0.12,
            rimStart: 0.578,
            rimTangential: 0.6,
            rimInward: 0,
            rimFreq1: 2,
            rimFreq2: 1,
            rimLine: 0,
            rimLinePos: 0.488,
            rimLineWidth: 0.003,
            vignette: 0,
            vignetteSize: 0.3,
            samples: 16,
        },

        curve: clamp(p.curve ?? 0, 0, 0.6),
        curvePow: 2.2,
        background: p.background ?? "#000000",
        cardColor: "#262626",
    }
}

type Params = ReturnType<typeof makeParams>

function placeholderTexture(index: number, aspect: number, color: string) {
    const h = 320
    const w = Math.max(1, Math.round(h * aspect))
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const g = canvas.getContext("2d")
    if (g) {
        g.fillStyle = color
        g.fillRect(0, 0, w, h)
        const grad = g.createLinearGradient(0, 0, w, h)
        grad.addColorStop(0, "rgba(255,255,255,0.16)")
        grad.addColorStop(0.55, "rgba(255,255,255,0.02)")
        grad.addColorStop(1, "rgba(255,255,255,0.1)")
        g.fillStyle = grad
        g.fillRect(0, 0, w, h)
        g.fillStyle = "rgba(255,255,255,0.6)"
        g.font = `500 ${Math.round(h * 0.14)}px ui-sans-serif, system-ui, -apple-system, sans-serif`
        g.textAlign = "center"
        g.textBaseline = "middle"
        g.fillText(String(index + 1).padStart(2, "0"), w / 2, h / 2)
    }
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.minFilter = THREE.LinearMipmapLinearFilter
    tex.magFilter = THREE.LinearFilter
    tex.generateMipmaps = true
    return tex
}

const REPEATS = 4

interface EngineItem {
    src: string
    aspect: number | null
}

interface Source {
    tex: THREE.Texture | null
    aspect: number
    locked: boolean
    ph: boolean
}

interface Panel {
    mesh: THREE.Mesh
    mat: THREE.MeshBasicMaterial
    srcIndex: number
    bound: boolean
}

interface PanelRect {
    left: number
    right: number
    top: number
    bottom: number
    poolIdx: number
    srcIndex: number
    centerX: number
}

function createEngine(mount: HTMLElement, getParams: () => Params) {
    let pp = getParams()
    let disposed = false

    let W = Math.max(1, mount.clientWidth)
    let H = Math.max(1, mount.clientHeight)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(W, H)

    const clearColor = new THREE.Color()
    let clearKey = ""
    function applyClear() {
        if (pp.background === clearKey) return
        clearKey = pp.background
        try {
            clearColor.set(pp.background)
        } catch {
            clearColor.set("#ffffff")
        }
        renderer.setClearColor(clearColor, 1)
    }
    applyClear()

    const el = renderer.domElement
    el.style.position = "absolute"
    el.style.left = "0"
    el.style.top = "0"
    el.style.display = "block"
    el.style.touchAction = "pan-y" // vertical swipes still scroll the page; horizontal drags move the carousel
    el.style.userSelect = "none"
    el.style.setProperty("-webkit-user-select", "none")
    el.style.setProperty("-webkit-touch-callout", "none")
    el.style.setProperty("-webkit-tap-highlight-color", "transparent")
    mount.appendChild(el)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -100, 100)
    camera.position.z = 10

    const loader = new THREE.TextureLoader()
    loader.setCrossOrigin("anonymous")

    let sources: Source[] = []
    let pool: Panel[] = []
    let owned: THREE.Texture[] = []
    let offsets: number[] = []
    let totalWidth = 0

    function panelHeight() {
        return Math.min(pp.panelH, Math.max(40, H * 0.86))
    }

    function sizing(srcIndex: number) {
        return (SIZE_MODES[pp.sizeMode] ?? SIZE_MODES.same)(srcIndex)
    }

    function cardHeight(srcIndex: number) {
        return panelHeight() * sizing(srcIndex).h
    }

    function widthAt(srcIndex: number, h: number) {
        if (pp.sizeMode === "image") return sources[srcIndex].aspect * h
        const rest = cardHeight(srcIndex)
        return pp.cardW * sizing(srcIndex).w * (rest > 0 ? h / rest : 1)
    }

    function slotWidth(srcIndex: number) {
        return widthAt(srcIndex, cardHeight(srcIndex)) + pp.gap
    }

    function coverWindow(srcIndex: number) {
        const h = cardHeight(srcIndex)
        const card = h > 0 ? widthAt(srcIndex, h) / h : 1
        const art = sources[srcIndex].aspect || 1
        if (Math.abs(card - art) < 1e-6) return { rx: 1, ox: 0, ry: 1, oy: 0 }
        if (card > art) {
            const ry = art / card
            return { rx: 1, ox: 0, ry, oy: (1 - ry) / 2 }
        }
        const rx = card / art
        return { rx, ox: (1 - rx) / 2, ry: 1, oy: 0 }
    }

    function recomputeTotal() {
        offsets = []
        let acc = 0
        for (let i = 0; i < sources.length; i++) {
            offsets.push(acc)
            acc += slotWidth(i)
        }
        totalWidth = acc
    }

    function centerForIndex(idx: number) {
        const N = sources.length
        if (!N) return 0
        const loop = Math.floor(idx / N)
        const s = ((idx % N) + N) % N
        return offsets[s] + slotWidth(s) / 2 - pp.gap / 2 + loop * totalWidth
    }

    function nearestIndex(value: number) {
        const N = sources.length
        if (!totalWidth || !N) return 0
        let best = 0
        let bestDist = Infinity
        for (let i = 0; i < N; i++) {
            const center = offsets[i] + slotWidth(i) / 2 - pp.gap / 2
            const k = Math.round((value - center) / totalWidth)
            const dist = Math.abs(center + k * totalWidth - value)
            if (dist < bestDist) {
                bestDist = dist
                best = i + k * N
            }
        }
        return best
    }

    function centerIndex(value: number) {
        if (!totalWidth || !sources.length) return 0
        let bestI = 0
        let bestDist = Infinity
        for (let i = 0; i < sources.length; i++) {
            const center = offsets[i] + slotWidth(i) / 2 - pp.gap / 2
            const k = Math.round((value - center) / totalWidth)
            const dist = Math.abs(center + k * totalWidth - value)
            if (dist < bestDist) {
                bestDist = dist
                bestI = i
            }
        }
        return bestI
    }

    let scroll = 0
    let target = 0
    let velocity = 0
    let prevScroll = 0
    let scrollEnergy = 0
    let pendingFocus: { srcIndex: number } | null = null
    let lastInput = performance.now()
    let snapped = false

    const focusState = { active: false, srcIndex: -1, poolIdx: -1, lensFx: 1 }
    const focusZoom = { v: 1 }
    let drop: number[] = []
    let pEntry: number[] = []
    let growArr: number[] = []
    let lastCenterX: (number | undefined)[] = []
    let entryActive = false
    let entrySettled = false
    let closing = false
    let focusTl: Timeline | null = null
    let entryTl: Timeline | null = null

    const dpr = renderer.getPixelRatio()
    const rt = new THREE.WebGLRenderTarget(Math.max(1, Math.round(W * dpr)), Math.max(1, Math.round(H * dpr)))
    const lensScene = new THREE.Scene()
    const lensCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const lensU = {
        uTex: { value: rt.texture as THREE.Texture },
        uRes: { value: new THREE.Vector2(W * dpr, H * dpr) },
        uCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uSizeX: { value: 0.565 },
        uSizeY: { value: 1 },
        uShape: { value: 0 },
        uSquareRound: { value: 0 },
        uRotation: { value: 0 },
        uAspect: { value: W / H },
        uZoom: { value: 0 },
        uDispersion: { value: 11 },
        uBlur: { value: 0 },
        uGlow: { value: 4.2 },
        uWhiteGlow: { value: 0.24 },
        uNovaSize: { value: 12 },
        uBlueRing: { value: 6 },
        uRingRadius: { value: 0.49 },
        uRingWidth: { value: 0.014 },
        uShimmer: { value: 1 },
        uShimmerFreq: { value: 12 },
        uShimmerSpeed: { value: 3.5 },
        uShimmerDepth: { value: 0.12 },
        uTime: { value: 0 },
        uRimStart: { value: 0.578 },
        uRimTangential: { value: 0.6 },
        uRimInward: { value: 0 },
        uRimFreq1: { value: 2 },
        uRimFreq2: { value: 1 },
        uBlueColor: { value: new THREE.Color("#009dff") },
        uRimLine: { value: 1.4 },
        uRimLinePos: { value: 0.488 },
        uRimLineWidth: { value: 0.003 },
        uVignette: { value: 0 },
        uVignetteSize: { value: 0.3 },
        uSamples: { value: 16 },
        uWarp: { value: 0 },
        uWarpPow: { value: 2.2 },
    }
    const lensMat = new THREE.ShaderMaterial({
        uniforms: lensU,
        vertexShader: lensVertexShader,
        fragmentShader: lensFragmentShader,
    })
    const lensGeo = new THREE.PlaneGeometry(2, 2)
    const lensQuad = new THREE.Mesh(lensGeo, lensMat)
    lensScene.add(lensQuad)

    try {
        renderer.compile(lensScene, lensCam)
    } catch {}

    let ringKey = ""
    function syncLens(now: number) {
        const L = pp.lens
        const rad = (a: number) => (a * Math.PI) / 180
        lensU.uCenter.value.set(L.posX, L.posY)
        lensU.uAspect.value = W / H
        lensU.uTime.value = now * 0.001
        lensU.uRotation.value = rad(L.rotation) + rad(L.spin) * (now * 0.001)
        lensU.uSizeX.value = L.sizeX
        lensU.uSizeY.value = L.sizeY
        lensU.uShape.value = L.square ? 1 : 0
        lensU.uSquareRound.value = L.round
        lensU.uBlur.value = L.blur
        lensU.uGlow.value = L.glow
        lensU.uWhiteGlow.value = L.whiteGlow
        lensU.uNovaSize.value = L.novaSize
        lensU.uRingRadius.value = L.ringRadius
        lensU.uRingWidth.value = L.ringWidth
        lensU.uShimmer.value = L.shimmer ? 1 : 0
        lensU.uShimmerFreq.value = L.shimmerFreq
        lensU.uShimmerSpeed.value = L.shimmerSpeed
        lensU.uShimmerDepth.value = L.shimmerDepth
        lensU.uRimStart.value = L.rimStart
        lensU.uRimFreq1.value = L.rimFreq1
        lensU.uRimFreq2.value = L.rimFreq2
        lensU.uRimLinePos.value = L.rimLinePos
        lensU.uRimLineWidth.value = L.rimLineWidth
        lensU.uVignetteSize.value = L.vignetteSize
        lensU.uSamples.value = L.samples
        if (L.ringColor !== ringKey) {
            ringKey = L.ringColor
            try {
                lensU.uBlueColor.value.set(L.ringColor)
            } catch {
                lensU.uBlueColor.value.set("#009dff")
            }
        }

        // The lens effects fade out while a card is focused.
        const fx = focusState.lensFx
        lensU.uDispersion.value = L.dispersion * fx
        lensU.uBlueRing.value = L.ring * fx
        lensU.uRimLine.value = L.rimLine * fx
        lensU.uVignette.value = L.vignette * fx
        lensU.uZoom.value = L.zoom * fx
        lensU.uRimTangential.value = L.rimTangential * fx
        lensU.uRimInward.value = L.rimInward * fx
        // The bend relaxes while a card is open or the intro is playing.
        lensU.uWarp.value = pp.curve * fx
        lensU.uWarpPow.value = pp.curvePow
    }

    function disposeContent() {
        pool.forEach((p) => {
            scene.remove(p.mesh)
            p.mesh.geometry.dispose()
            p.mat.dispose()
        })
        pool = []
        owned.forEach((t) => t.dispose())
        owned = []
        sources = []
    }

    let generation = 0
    let ready = false
    let awaiting = 0
    let bootTimer: ReturnType<typeof setTimeout> | null = null

    function boot() {
        if (disposed || ready) return
        if (bootTimer !== null) {
            clearTimeout(bootTimer)
            bootTimer = null
        }
        ready = true
        recomputeTotal()

        scroll = centerForIndex(nearestIndex(scroll))
        target = scroll
        prevScroll = scroll
        if (pp.entry.enabled) playEntry()
        else {
            entryActive = false
            entrySettled = false
        }
    }

    function setItems(list: EngineItem[]) {
        if (disposed) return
        pp = getParams()
        disposeContent()
        const gen = ++generation
        ready = false
        if (bootTimer !== null) clearTimeout(bootTimer)
        awaiting = list.filter((item) => !!item.src).length
        // Never wait forever on a slow image: start with whatever has loaded.
        bootTimer = awaiting > 0 ? setTimeout(boot, 6000) : null

        sources = list.map((item, i) => {
            const s: Source = { tex: null, aspect: item.aspect || 1, locked: item.aspect != null, ph: false }
            if (!item.src) {
                s.ph = true
                s.tex = placeholderTexture(i, s.aspect, pp.cardColor)
                owned.push(s.tex)
                return s
            }
            loader.load(
                item.src,
                (tex) => {
                    if (disposed || gen !== generation) {
                        tex.dispose()
                        return
                    }
                    tex.minFilter = THREE.LinearMipmapLinearFilter
                    tex.magFilter = THREE.LinearFilter
                    tex.generateMipmaps = true
                    tex.anisotropy = renderer.capabilities.getMaxAnisotropy()
                    tex.colorSpace = THREE.SRGBColorSpace
                    if (!s.locked && tex.image) s.aspect = tex.image.width / tex.image.height
                    s.tex = tex
                    owned.push(tex)
                    try {
                        renderer.initTexture(tex)
                    } catch {}
                    recomputeTotal()
                    if (--awaiting <= 0) boot()
                },
                undefined,
                () => {
                    if (disposed || gen !== generation) return
                    s.ph = true
                    s.tex = placeholderTexture(i, s.aspect, pp.cardColor)
                    owned.push(s.tex)
                    if (--awaiting <= 0) boot()
                }
            )
            return s
        })

        for (let r = 0; r < REPEATS; r++) {
            for (let i = 0; i < sources.length; i++) {
                const mat = new THREE.MeshBasicMaterial({ color: 0xdddddd, transparent: true })
                const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 1, 1), mat)
                mesh.visible = false
                scene.add(mesh)
                pool.push({ mesh, mat, srcIndex: i, bound: false })
            }
        }

        recomputeTotal()
        cardKey = pp.cardColor
        const n = pool.length
        drop = new Array(n).fill(0)
        pEntry = new Array(n).fill(1)
        growArr = new Array(n).fill(1)
        lastCenterX = new Array(n)
        focusState.active = false
        focusState.srcIndex = -1
        focusState.poolIdx = -1
        focusState.lensFx = 1
        focusZoom.v = 1
        velocity = 0
        scroll = centerForIndex(0)
        target = scroll
        prevScroll = scroll

        if (focusTl) focusTl.kill()
        focusTl = null
        if (entryTl) entryTl.kill()
        entryTl = null
        entryActive = false
        entrySettled = false
        closing = false

        if (awaiting <= 0) boot()
    }

    function syncWindows() {
        for (let i = 0; i < sources.length; i++) {
            const tex = sources[i].tex
            if (!tex) continue
            const base = coverWindow(i)
            tex.repeat.set(base.rx, base.ry)
            tex.offset.set(base.ox, (1 - base.ry) * 0.5)
        }
    }

    let cardKey = ""
    function syncCardColor() {
        if (pp.cardColor === cardKey) return
        cardKey = pp.cardColor
        sources.forEach((s, i) => {
            if (!s.ph) return
            const old = s.tex
            s.tex = placeholderTexture(i, s.aspect, pp.cardColor)
            owned.push(s.tex)
            if (old) {
                owned = owned.filter((t) => t !== old)
                old.dispose()
            }
            pool.forEach((p) => {
                if (p.srcIndex !== i) return
                p.mat.map = s.tex
                p.mat.needsUpdate = true
            })
        })
    }

    let panelRects: PanelRect[] = []
    let centeredPanel: { srcIndex: number; centerX: number; wPx: number; h: number; poolIdx: number } | null = null

    function layout() {
        panelRects = []
        centeredPanel = null
        let centeredDist = Infinity
        const N = sources.length
        if (!N || !totalWidth || !ready) {
            for (const p of pool) p.mesh.visible = false
            return
        }
        const half = W / 2
        const panelH = panelHeight()
        const buffer = panelH
        const E = pp.entry

        pool.forEach((p, poolIdx) => {
            const rep = Math.floor(poolIdx / N)
            const i = p.srcIndex
            const src = sources[i]

            const slotCenterInLoop = offsets[i] + slotWidth(i) / 2 - pp.gap / 2
            let x = slotCenterInLoop - scroll
            x = ((x % totalWidth) + totalWidth) % totalWidth
            x += (rep - Math.floor(REPEATS / 2)) * totalWidth
            if (x > half + totalWidth) x -= totalWidth * REPEATS

            const centerX = x
            const inEntry = entryActive || entrySettled
            if (!inEntry && (centerX < -half - buffer || centerX > half + buffer)) {
                p.mesh.visible = false
                lastCenterX[poolIdx] = undefined
                return
            }
            lastCenterX[poolIdx] = centerX

            const shrink = 1 - pp.shrinkMax * scrollEnergy
            const h = cardHeight(i) * shrink
            const wPx = widthAt(i, h)

            if (src.tex && !p.bound) {
                p.mat.map = src.tex
                p.mat.color.set(0xffffff)
                p.mat.needsUpdate = true
                p.bound = true
            }

            let y = 0

            const isFocused = focusState.active && focusState.poolIdx === poolIdx
            const d = drop[poolIdx] || 0
            let drawW = wPx
            let drawH = h
            if (isFocused) {
                drawW = wPx * focusZoom.v
                drawH = h * focusZoom.v
            } else if (d > 0) {
                y -= d * H * pp.focus.dropDist
            }

            p.mesh.visible = true

            let finalX = centerX
            let finalY = y
            let finalW = drawW
            let finalH = drawH

            if (inEntry) {
                const pe = pEntry[poolIdx] || 0
                const g = growArr[poolIdx] || 0

                const startH = Math.min(E.startH, panelH * 0.5)
                const curH = startH + (drawH - startH) * g
                finalH = curH
                finalW = widthAt(i, curH)

                // During the entry only one copy of the strip is drawn, laid out around the centre card.
                const midRep = Math.floor(REPEATS / 2)
                if (rep !== midRep) {
                    p.mesh.visible = false
                    lastCenterX[poolIdx] = undefined
                    return
                }
                const cSrc = centerIndex(scroll)
                let di = i - cSrc
                if (di > N / 2) di -= N
                if (di < -N / 2) di += N
                const slotH = (s: number) => {
                    const gg = growArr[midRep * N + s] || 0
                    return startH + (cardHeight(s) - startH) * gg
                }
                let off = 0
                if (di > 0) {
                    for (let k = 0; k < di; k++) {
                        const sa = (((cSrc + k) % N) + N) % N
                        const sb = (((cSrc + k + 1) % N) + N) % N
                        off += (widthAt(sa, slotH(sa)) + widthAt(sb, slotH(sb))) / 2 + pp.gap
                    }
                } else if (di < 0) {
                    for (let k = 0; k < -di; k++) {
                        const sa = (((cSrc - k) % N) + N) % N
                        const sb = (((cSrc - k - 1) % N) + N) % N
                        off -= (widthAt(sa, slotH(sa)) + widthAt(sb, slotH(sb))) / 2 + pp.gap
                    }
                }
                finalX = off
                if (finalX < -half - buffer || finalX > half + buffer) {
                    p.mesh.visible = false
                    lastCenterX[poolIdx] = undefined
                    return
                }

                const dir = E.pattern(i, N, di)
                const fromX = finalX + dir.x * W * E.travel
                const fromY = dir.y * H * E.travel
                finalX = fromX + (finalX - fromX) * pe
                finalY = fromY + (y - fromY) * pe
            }

            p.mesh.position.set(finalX, finalY, 0)
            p.mesh.scale.set(Math.max(1, finalW), Math.max(1, finalH), 1)

            const sx = centerX + W / 2
            const sy = H / 2 - y
            panelRects.push({
                left: sx - drawW / 2,
                right: sx + drawW / 2,
                top: sy - drawH / 2,
                bottom: sy + drawH / 2,
                poolIdx,
                srcIndex: i,
                centerX,
            })

            if (Math.abs(centerX) < centeredDist) {
                centeredDist = Math.abs(centerX)
                centeredPanel = { srcIndex: i, centerX, wPx, h, poolIdx }
            }
        })
    }

    // The bend is a screen-space warp, so map the pointer back into the unbent layout before hit-testing.
    function warpPx(px: number) {
        const s = (px / W) * 2 - 1
        return pp.curve * focusState.lensFx * Math.sign(s) * Math.pow(Math.abs(s), pp.curvePow) * H
    }

    function panelAtPointer(px: number, py0: number) {
        const py = py0 + warpPx(px)
        for (let i = 0; i < panelRects.length; i++) {
            const r = panelRects[i]
            if (px >= r.left && px <= r.right && py >= r.top && py <= r.bottom) return r
        }
        return null
    }

    let bounds = mount.getBoundingClientRect()
    const readBounds = () => {
        bounds = mount.getBoundingClientRect()
    }

    let dragging = false
    let dragPointerId: number | null = null
    let dragLastX = 0
    let dragDist = 0
    let dragVel = 0
    let dragMoveT = 0
    let suppressClick = false
    let dragPointerType = "mouse"
    let lastPointerX = NaN
    let lastPointerY = NaN
    let pointerInside = false
    let lastPointerType = "mouse"

    let hoverPanel = false
    let hoverFocused = false

    let cursorNow = ""
    function setCursor(v: string) {
        if (v === cursorNow) return
        cursorNow = v
        el.style.cursor = v
    }

    function updateCursor() {
        if (entryActive || entrySettled) return setCursor("")
        if (focusState.active) return setCursor(hoverFocused ? "" : "zoom-out")
        if (dragging) return setCursor("grabbing")
        if (!hoverPanel) return setCursor("")
        if (pp.drag) return setCursor("grab")
        return setCursor(pp.clickToFocus ? "pointer" : "")
    }

    function setHover(on: boolean) {
        hoverPanel = on
        updateCursor()
    }

    function refreshHover() {
        if (!pointerInside || lastPointerType !== "mouse") return
        if (!Number.isFinite(lastPointerX)) return
        if (focusState.active) {
            const on = panelAtPointer(lastPointerX, lastPointerY)
            hoverFocused = !!on && on.poolIdx === focusState.poolIdx
            setHover(false)
            return
        }
        hoverFocused = false
        setHover(panelAtPointer(lastPointerX, lastPointerY) !== null)
    }

    function inputLocked() {
        return focusState.active || entryActive || entrySettled
    }

    function onWheel(e: WheelEvent) {
        if (!pp.wheel) return
        e.preventDefault()
        if (inputLocked()) return
        pendingFocus = null
        target += (e.deltaY || e.deltaX) * pp.wheelSpeed
        lastInput = performance.now()
        snapped = false
    }

    function onPointerDown(e: PointerEvent) {
        suppressClick = false
        readBounds()
        if (!pp.drag || inputLocked()) return
        if (dragging) return
        if (e.button !== 0 && e.pointerType === "mouse") return
        dragging = true
        dragPointerId = e.pointerId
        dragPointerType = e.pointerType || "mouse"
        try {
            el.setPointerCapture(e.pointerId)
        } catch {}
        dragLastX = e.clientX
        lastPointerX = e.clientX - bounds.left
        lastPointerY = e.clientY - bounds.top
        dragDist = 0
        dragVel = 0
        dragMoveT = performance.now()
        updateCursor()
        velocity = 0
        pendingFocus = null
        snapped = false
        lastInput = dragMoveT
    }

    function onPointerMove(e: PointerEvent) {
        if (dragging && e.pointerId === dragPointerId) {
            const sens = dragPointerType === "mouse" ? pp.dragSpeed : pp.touchDrag
            const dx = e.clientX - dragLastX
            dragLastX = e.clientX
            dragDist += Math.abs(dx)
            target -= dx * sens
            dragVel = dragVel * 0.6 + -dx * sens * 0.4
            dragMoveT = performance.now()
            lastInput = dragMoveT
            snapped = false
        }
        lastPointerX = e.clientX - bounds.left
        lastPointerY = e.clientY - bounds.top
        lastPointerType = e.pointerType || "mouse"
        pointerInside = true

        if (e.pointerType !== "mouse") return
        if (focusState.active) {
            setHover(false)
            return
        }
        setHover(panelAtPointer(lastPointerX, lastPointerY) !== null)
    }

    function onPointerUp(e?: PointerEvent) {
        if (!dragging) return
        if (e && dragPointerId !== null && e.pointerId !== dragPointerId) return
        dragging = false
        if (dragPointerId !== null) {
            try {
                el.releasePointerCapture(dragPointerId)
            } catch {}
            dragPointerId = null
        }

        velocity = performance.now() - dragMoveT > pp.flickIdleMs ? 0 : dragVel
        dragVel = 0
        lastInput = performance.now()
        snapped = false
        suppressClick = dragDist > (dragPointerType === "mouse" ? pp.clickSlop : pp.touchClickSlop)
        if (dragPointerType === "mouse") setHover(panelAtPointer(lastPointerX, lastPointerY) !== null)
        else updateCursor()
    }

    function onEnter(e: PointerEvent) {
        pointerInside = true
        lastPointerType = e.pointerType || "mouse"
        readBounds()
    }

    function onLeave() {
        pointerInside = false
        setHover(false)
    }

    function onKeyDown(e: KeyboardEvent) {
        if (e.key !== "Escape" || !focusState.active) return
        e.preventDefault()
        closeFocus()
    }

    function onClick(e: MouseEvent) {
        if (!pp.clickToFocus) return
        if (suppressClick) {
            suppressClick = false
            return
        }

        if (focusState.active) {
            const on = panelAtPointer(e.clientX - bounds.left, e.clientY - bounds.top)
            if (!on || on.poolIdx !== focusState.poolIdx) closeFocus()
            return
        }
        if (inputLocked()) return
        const hit = panelAtPointer(e.clientX - bounds.left, e.clientY - bounds.top)
        if (!hit) return

        if (centeredPanel && hit.poolIdx === centeredPanel.poolIdx) {
            pendingFocus = null
            openFocus()
            return
        }
        // A click on a side card first brings it to the centre, then opens it.
        velocity = 0
        target = centerForIndex(nearestIndex(scroll + hit.centerX))
        snapped = true
        pendingFocus = { srcIndex: hit.srcIndex }
        updateCursor()
    }

    function openFocus() {
        if (focusState.active || !centeredPanel) return
        const F = pp.focus
        const panel = centeredPanel
        const src = sources[panel.srcIndex]
        if (!src || !src.tex) return

        focusState.active = true
        closing = false
        focusState.srcIndex = panel.srcIndex
        focusState.poolIdx = panel.poolIdx

        target = centerForIndex(nearestIndex(scroll))

        const focusX = lastCenterX[panel.poolIdx] || 0
        const others = pool
            .map((_, idx) => ({ idx, x: lastCenterX[idx] }))
            .filter((o) => o.idx !== panel.poolIdx && o.x !== undefined)
            .map((o) => ({ idx: o.idx, dist: Math.abs((o.x as number) - focusX) }))
            .sort((a, b) => a.dist - b.dist)

        let rank = 0
        let prevDist = -1
        const ranked = others.map((o) => {
            if (prevDist >= 0 && o.dist - prevDist > 1) rank++
            prevDist = o.dist
            return { idx: o.idx, rank }
        })

        if (focusTl) focusTl.kill()
        const tl = new Timeline()
        tl.to(focusState as unknown as NumBag, "lensFx", 0, F.lensFade, OUT3, 0)
        tl.to(focusZoom, "v", F.centerScale, F.focusDuration, F.ease, 0)
        ranked.forEach((o) => {
            tl.to(bag(drop), o.idx, 1, F.cardDuration, F.ease, o.rank * F.stagger)
        })
        focusTl = tl

        updateCursor()
    }

    function closeFocus() {
        if (!focusState.active || closing) return
        closing = true
        const F = pp.focus
        if (focusTl) focusTl.kill()

        const focusX = lastCenterX[focusState.poolIdx] || 0
        const others = pool
            .map((_, idx) => ({ idx, x: lastCenterX[idx] }))
            .filter((o) => o.x !== undefined && (drop[o.idx] || 0) > 0)
            .map((o) => ({ idx: o.idx, dist: Math.abs((o.x as number) - focusX) }))
            .sort((a, b) => b.dist - a.dist)

        let rank = 0
        let prevDist = -1
        const ranked = others.map((o) => {
            if (prevDist >= 0 && prevDist - o.dist > 1) rank++
            prevDist = o.dist
            return { idx: o.idx, rank }
        })

        const tl = new Timeline()
        tl.to(focusState as unknown as NumBag, "lensFx", 1, F.lensFade * 0.8, INOUT3, 0)
        tl.to(focusZoom, "v", 1, F.focusDuration * 0.85, F.ease, 0)
        let end = Math.max(F.lensFade * 0.8, F.focusDuration * 0.85)
        ranked.forEach((o) => {
            const at = o.rank * F.stagger * 0.7
            end = Math.max(end, at + F.cardDuration * 0.85)
            tl.to(bag(drop), o.idx, 0, F.cardDuration * 0.85, F.ease, at)
        })
        tl.call(() => {
            focusState.active = false
            focusState.srcIndex = -1
            focusState.poolIdx = -1
            closing = false
            updateCursor()
        }, end)
        focusTl = tl
    }

    function playEntry() {
        if (!sources.length) return
        const E = pp.entry
        if (entryTl) entryTl.kill()
        for (let k = 0; k < pEntry.length; k++) pEntry[k] = 0
        for (let k = 0; k < growArr.length; k++) growArr[k] = 0
        entryActive = true
        entrySettled = false
        focusState.lensFx = 0

        target = centerForIndex(nearestIndex(scroll))
        scroll = target
        velocity = 0
        snapped = true

        // One pass of layout tells us which cards are on screen, and where.
        layout()
        const visible: number[] = []
        for (let k = 0; k < lastCenterX.length; k++) {
            if (lastCenterX[k] !== undefined) visible.push(k)
        }
        // Cards that are not on screen skip the animation.
        const inView = new Set(visible)
        for (let k = 0; k < pEntry.length; k++) {
            if (!inView.has(k)) {
                pEntry[k] = 1
                growArr[k] = 1
            }
        }

        const tl = new Timeline(E.delay)
        // Stagger left to right.
        const order = visible.slice().sort((a, b) => (lastCenterX[a] as number) - (lastCenterX[b] as number))
        let end = 0
        order.forEach((k, rank) => {
            const riseAt = rank * E.stagger
            const growAt = E.growDelay + rank * E.growStagger
            tl.to(bag(pEntry), k, 1, E.riseDuration, E.ease, riseAt)
            tl.to(bag(growArr), k, 1, E.growDuration, E.ease, growAt)
            end = Math.max(end, riseAt + E.riseDuration, growAt + E.growDuration)
        })
        // The lens blooms in as the cards finish growing.
        const bloomAt = E.growDelay + E.growDuration * 0.35
        tl.to(focusState as unknown as NumBag, "lensFx", 1, E.lensBloom, INOUT2, bloomAt)
        end = Math.max(end, bloomAt + E.lensBloom)
        tl.call(() => {
            entryActive = false
            entrySettled = false
            entryTl = null
            updateCursor()
        }, end)
        entryTl = tl
        updateCursor()
    }

    // ---- public: move by whole cards ----
    function step(dir: number) {
        if (!ready || inputLocked()) return
        velocity = 0
        pendingFocus = null
        const cur = nearestIndex(target)
        target = centerForIndex(cur + (dir < 0 ? -1 : 1))
        snapped = true
        lastInput = performance.now()
    }

    // ---- frame ----
    let layoutKey = ""
    let last = performance.now()
    let onScreen = true

    function frame() {
        const now = performance.now()
        const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000))
        last = now

        pp = getParams()
        applyClear()

        // Re-measure when sizes change (card size props, gap, container height).
        const key = `${pp.panelH}|${pp.cardW}|${pp.gap}|${pp.sizeMode}|${H}`
        if (key !== layoutKey) {
            layoutKey = key
            if (ready) {
                const idx = nearestIndex(scroll)
                recomputeTotal()
                scroll = centerForIndex(idx)
                target = scroll
                prevScroll = scroll
            }
        }
        syncWindows()
        syncCardColor()

        if (entryTl) entryTl.step(dt)
        if (focusTl) focusTl.step(dt)

        const locked = inputLocked()
        if (ready && !locked) {
            if (dragging) {
                scroll += (target - scroll) * (dragPointerType === "mouse" ? pp.ease : pp.touchEase)
            } else {
                if (Math.abs(velocity) > 0.05) {
                    target += velocity
                    velocity *= pp.friction
                } else {
                    velocity = 0
                }
                const idle = now - lastInput > pp.snapIdleMs
                if (pp.snap && !snapped && idle && Math.abs(velocity) < 0.5) {
                    target = centerForIndex(nearestIndex(target))
                    snapped = true
                }
                scroll += (target - scroll) * (snapped ? pp.snapEase : pp.ease)
            }
        } else if (ready && focusState.active) {
            scroll += (target - scroll) * pp.snapEase
        }

        const speed = Math.abs(scroll - prevScroll)
        prevScroll = scroll
        const wantE = locked ? 0 : clamp01(speed / pp.shrinkSpeed)
        scrollEnergy += (wantE - scrollEnergy) * (wantE > scrollEnergy ? pp.shrinkAttack : pp.shrinkDecay)

        layout()

        const cp = centeredPanel as { srcIndex: number } | null
        if (pendingFocus && !focusState.active && cp && cp.srcIndex === pendingFocus.srcIndex && Math.abs(target - scroll) < 1.5) {
            pendingFocus = null
            openFocus()
        }

        // Scene -> linear render target -> lens pass on the canvas.
        renderer.setRenderTarget(rt)
        renderer.clear()
        renderer.render(scene, camera)
        renderer.setRenderTarget(null)
        syncLens(now)
        renderer.render(lensScene, lensCam)

        refreshHover()
    }

    // ---- sizing ----
    function resize() {
        if (disposed) return
        W = Math.max(1, mount.clientWidth)
        H = Math.max(1, mount.clientHeight)
        renderer.setSize(W, H)
        camera.left = -W / 2
        camera.right = W / 2
        camera.top = H / 2
        camera.bottom = -H / 2
        camera.updateProjectionMatrix()
        const d = renderer.getPixelRatio()
        rt.setSize(Math.max(1, Math.round(W * d)), Math.max(1, Math.round(H * d)))
        lensU.uRes.value.set(W * d, H * d)
        readBounds()
    }

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => resize()) : null
    ro?.observe(mount)
    const io =
        typeof IntersectionObserver !== "undefined"
            ? new IntersectionObserver(([entry]) => {
                  onScreen = entry.isIntersecting
                  if (onScreen) last = performance.now()
              })
            : null
    io?.observe(mount)

    el.addEventListener("wheel", onWheel, { passive: false })
    el.addEventListener("pointerdown", onPointerDown)
    el.addEventListener("pointermove", onPointerMove)
    el.addEventListener("pointerup", onPointerUp)
    el.addEventListener("pointercancel", onPointerUp)
    el.addEventListener("pointerenter", onEnter)
    el.addEventListener("pointerleave", onLeave)
    el.addEventListener("click", onClick)
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("scroll", readBounds, { passive: true })

    let raf = 0
    const loop = () => {
        if (disposed) return
        if (onScreen) frame()
        raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    function destroy() {
        if (disposed) return
        disposed = true
        cancelAnimationFrame(raf)
        if (bootTimer !== null) clearTimeout(bootTimer)
        ro?.disconnect()
        io?.disconnect()
        el.removeEventListener("wheel", onWheel)
        el.removeEventListener("pointerdown", onPointerDown)
        el.removeEventListener("pointermove", onPointerMove)
        el.removeEventListener("pointerup", onPointerUp)
        el.removeEventListener("pointercancel", onPointerUp)
        el.removeEventListener("pointerenter", onEnter)
        el.removeEventListener("pointerleave", onLeave)
        el.removeEventListener("click", onClick)
        window.removeEventListener("keydown", onKeyDown)
        window.removeEventListener("scroll", readBounds)
        if (focusTl) focusTl.kill()
        if (entryTl) entryTl.kill()
        disposeContent()
        rt.dispose()
        lensGeo.dispose()
        lensMat.dispose()
        renderer.dispose()
        if (el.parentNode === mount) mount.removeChild(el)
    }

    return { setItems, step, destroy }
}

type Engine = ReturnType<typeof createEngine>

const LiquidGlassCarousel = forwardRef<LiquidGlassCarouselHandle, LiquidGlassCarouselProps>(function LiquidGlassCarousel(props, ref) {
    const mountRef = useRef<HTMLDivElement>(null)
    const engineRef = useRef<Engine | null>(null)
    const paramsRef = useRef<Params>(makeParams(props))
    paramsRef.current = makeParams(props)
    const errorRef = useRef(props.onError)
    errorRef.current = props.onError

    useImperativeHandle(ref, () => ({ step: (dir: number) => engineRef.current?.step(dir) }), [])

    useEffect(() => {
        const mount = mountRef.current
        if (!mount) return
        let engine: Engine | null = null
        try {
            engine = createEngine(mount, () => paramsRef.current)
        } catch {
            errorRef.current?.()
            return
        }
        engineRef.current = engine
        return () => {
            engine?.destroy()
            engineRef.current = null
        }
    }, [])

    // Re-load the images whenever the list of sources changes.
    const itemsRef = useRef<EngineItem[]>([])
    const srcKey = (props.items ?? []).map((i) => i.src).join("\n")
    itemsRef.current = (props.items ?? []).map((i) => ({ src: i.src, aspect: null }))
    useEffect(() => {
        engineRef.current?.setItems(itemsRef.current)
    }, [srcKey])

    return <div ref={mountRef} className={props.className} style={{ position: "relative", overflow: "hidden", width: "100%", height: "100%", ...props.style }} />
})

export default LiquidGlassCarousel
