import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../shared/utils.js'

const SETTINGS = {
  count: 632,
  speed: [0.8, 2.7],
  wind: -1,
  windVariation: 0,
  size: [2, 2.5],
  opacity: [0.3, 0.9],
  color: '#ffffff',
}
const rand = (a, b) => a + Math.random() * (b - a)

// Fixed full-viewport snowfall canvas behind the page (port of the approved component).
export default function Snowfall() {
  const boxRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const box = boxRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const { count, speed, wind, windVariation, size, opacity, color } = SETTINGS
    let W = 0
    let H = 0
    let flakes = []
    let raf = 0

    function build(rect) {
      W = Math.max(1, Math.floor(rect?.width || box.clientWidth) || 1)
      H = Math.max(1, Math.floor(rect?.height || box.clientHeight) || 1)
      canvas.width = Math.floor(W * dpr)
      canvas.height = Math.floor(H * dpr)
      canvas.style.width = `${W}px`
      canvas.style.height = `${H}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      flakes = Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: rand(size[0], size[1]),
        vy: rand(speed[0], speed[1]),
        vx: rand(-1, 1),
        phase: Math.random() * Math.PI * 2,
        sway: rand(0.2, 0.9),
        alpha: rand(opacity[0], opacity[1]),
      }))
    }

    function draw() {
      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = color
      for (const f of flakes) {
        ctx.globalAlpha = f.alpha
        ctx.beginPath()
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    function loop(t) {
      for (const f of flakes) {
        f.y += f.vy
        f.x += wind + f.vx * windVariation + Math.sin(t * 0.0012 + f.phase) * f.sway
        if (f.y - f.r > H) {
          f.y = -f.r
          f.x = Math.random() * W
        }
        if (f.x < -f.r) f.x = W + f.r
        else if (f.x > W + f.r) f.x = -f.r
      }
      draw()
      raf = requestAnimationFrame(loop)
    }

    build()
    draw()
    if (!prefersReducedMotion) raf = requestAnimationFrame(loop)

    let lastW = W
    let lastH = H
    const observer = new ResizeObserver(([entry]) => {
      const r = entry.contentRect
      // Ignore mobile URL-bar show/hide jitter so the snow doesn't reset on scroll.
      if (Math.abs(r.width - lastW) < 1 && Math.abs(r.height - lastH) < 80) return
      lastW = r.width
      lastH = r.height
      build(r)
      draw()
    })
    observer.observe(box)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [])

  return (
    <div id="snow" ref={boxRef} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  )
}
