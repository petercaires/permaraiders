"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import { cn } from "@/lib/utils"

// The particles sweep over the top of the outline only: from lower-left, over the head, to lower-right
// (angles clockwise from straight up, around the shape's centre), then fade and start again.
const START = 235
const SPAN = 250
const LAP_MS = 4500
const SAMPLE = 256 // px; the art is scanned at this size to find its outline
const FADE_OUT_MS = 200
const FADE_IN_MS = 300

export interface Trace {
  /** Changes whenever the light should restart (new raider, or the same one re-selected) */
  id: string
  src: string
  rgb: string
  className?: string
}

/**
 * The current edge light, plus the previous one fading out for FADE_OUT_MS after a change.
 * At most one is ever fading, so quick hovering can't pile them up.
 */
export function HeroTrace({ trace }: { trace: Trace | null }) {
  const [shown, setShown] = useState(trace)
  const [leaving, setLeaving] = useState<Trace | null>(null)

  // Noticed during render (not in an effect), so the outgoing light is never unmounted, even for a frame
  if (trace?.id !== shown?.id) {
    setLeaving(shown)
    setShown(trace)
  }

  useEffect(() => {
    if (!leaving) return
    const t = setTimeout(() => setLeaving(null), FADE_OUT_MS)
    return () => clearTimeout(t)
  }, [leaving])

  // Keyed by id, so the outgoing light keeps its running instance (and just fades) rather than restarting
  return [leaving, trace].map(
    (t) => t && <EdgeTrace key={t.id} src={t.src} rgb={t.rgb} className={t.className} leaving={t === leaving && t.id !== trace?.id} />,
  )
}

/**
 * Edge particles for the empty silhouette: confetti-style squares drifting off its outline, sweeping over the
 * top from one side to the other.
 */
function EdgeTrace({ src, rgb, className, leaving }: { src: string; /** "r g b" */ rgb: string; className?: string; leaving: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const leavingAt = useRef<number | null>(null)
  useEffect(() => {
    // (if it comes back before it has gone, e.g. hovering away and straight back, it just shows again)
    leavingAt.current = leaving ? (leavingAt.current ?? performance.now()) : null
  }, [leaving])
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return // no particles
    const wrap = wrapRef.current!, canvas = canvasRef.current!
    const ctx = canvas.getContext("2d")!
    let edge: { x: number; y: number }[] | null = null // outline point for each whole degree (0–1 of the box)
    let frame = 0

    // Find the outline: for each degree, walk in from the box edge towards the centre until hitting the shape
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.src = src
    img.decode().then(() => {
      const c = document.createElement("canvas")
      c.width = c.height = SAMPLE
      const g = c.getContext("2d")!
      g.drawImage(img, 0, 0, SAMPLE, SAMPLE)
      const alpha = g.getImageData(0, 0, SAMPLE, SAMPLE).data
      // Centre of the shape: middle of its bounding box
      let x0 = SAMPLE, y0 = SAMPLE, x1 = 0, y1 = 0
      for (let i = 0; i < SAMPLE * SAMPLE; i++)
        if (alpha[i * 4 + 3] > 128) {
          const x = i % SAMPLE, y = (i - x) / SAMPLE
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y)
        }
      const CENTRE = { x: (x0 + x1) / 2 / SAMPLE, y: (y0 + y1) / 2 / SAMPLE }
      edge = Array.from({ length: 360 }, (_, deg) => {
        const dx = Math.sin((deg * Math.PI) / 180), dy = -Math.cos((deg * Math.PI) / 180)
        for (let r = SAMPLE; r > 0; r--) {
          const x = Math.round(CENTRE.x * SAMPLE + dx * r), y = Math.round(CENTRE.y * SAMPLE + dy * r)
          if (x >= 0 && y >= 0 && x < SAMPLE && y < SAMPLE && alpha[(y * SAMPLE + x) * 4 + 3] > 128)
            return { x: x / SAMPLE, y: y / SAMPLE }
        }
        return CENTRE
      })
    }).catch(() => {})

    const particles: { x: number; y: number; vx: number; vy: number; age: number; life: number }[] = []
    let last = 0, start = 0, spawn = 0

    const tick = (now: number) => {
      if (!start) start = last = now // timed from the first frame, so it always starts faded out
      const dt = Math.min(now - last, 50) / 1000
      last = now
      const p = ((now - start) % LAP_MS) / LAP_MS
      const deg = START + p * SPAN
      const out = leavingAt.current === null ? 1 : Math.min(1, Math.max(0, 1 - (now - leavingAt.current) / FADE_OUT_MS))
      wrap.style.opacity = String(Math.min(1, (now - start) / FADE_IN_MS) * out)
      const sweep = Math.min(1, p / 0.1, (1 - p) / 0.1) // particles fade in and out at the ends of each sweep

      // Canvas matches the box at device resolution
      const size = wrap.clientWidth, dpr = window.devicePixelRatio || 1
      if (canvas.width !== Math.round(size * dpr)) canvas.width = canvas.height = Math.round(size * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, size, size)

      // A few particles per second, shed from the lit part of the edge and drifting outward
      if (edge && leavingAt.current === null) {
        spawn += dt * 14
        while (spawn >= 1) {
          spawn--
          const d = Math.round(deg - 10 + Math.random() * 14) % 360
          const out = ((d + (Math.random() - 0.5) * 50) * Math.PI) / 180
          const speed = 12 + Math.random() * 28
          particles.push({ x: edge[d].x * size, y: edge[d].y * size, vx: Math.sin(out) * speed, vy: -Math.cos(out) * speed, age: 0, life: 0.7 + Math.random() * 0.7 })
        }
      }
      ctx.fillStyle = `rgb(${rgb})`
      for (let i = particles.length - 1; i >= 0; i--) {
        const q = particles[i]
        q.age += dt
        if (q.age >= q.life) { particles.splice(i, 1); continue }
        q.x += q.vx * dt
        q.y += q.vy * dt
        ctx.globalAlpha = 0.8 * (1 - q.age / q.life) * sweep
        ctx.fillRect(q.x - 1.5, q.y - 1.5, 3, 3)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [src, rgb])

  return (
    <div ref={wrapRef} aria-hidden className={className} style={{ opacity: 0 }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  )
}

/** A single soft band of light crossing Rare (silver) and PermaRare (gold) art as it appears */
export function RarityShine({ src, rgb, className }: { src: string; rgb: string; className?: string }) {
  return (
    <div aria-hidden className={className}>
      <div
        className="hero-shine absolute inset-0"
        style={{ ["--silhouette" as string]: `url("${src}")`, ["--trace-rgb" as string]: rgb } as CSSProperties}
      />
    </div>
  )
}
