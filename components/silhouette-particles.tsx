"use client"

import { useEffect, useRef, useState } from "react"

// Particles sweep over the top of the outline: from lower-left, over the head, to lower-right (angles clockwise
// from straight up, around the shape's centre), then fade and start again.
const START = 235
const SPAN = 250
const LAP_MS = 4500
const SAMPLE = 256 // px; the silhouette is scanned at this size to find its outline
const FADE_IN_MS = 300
const FADE_OUT_MS = 200

/**
 * Empty-state silhouette: small white confetti-style squares drifting off its outline, so it reads at first
 * glance. Fades out briefly when a raider replaces the silhouette (and back in if it returns).
 */
export function SilhouetteParticles({ show, src, className }: { show: boolean; src: string; className?: string }) {
  const [mounted, setMounted] = useState(show)
  if (show && !mounted) setMounted(true)

  useEffect(() => {
    if (show || !mounted) return
    const t = setTimeout(() => setMounted(false), FADE_OUT_MS)
    return () => clearTimeout(t)
  }, [show, mounted])

  return mounted ? <Particles src={src} className={className} leaving={!show} /> : null
}

function Particles({ src, className, leaving }: { src: string; className?: string; leaving: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const leavingAt = useRef<number | null>(null)
  useEffect(() => {
    leavingAt.current = leaving ? (leavingAt.current ?? performance.now()) : null
  }, [leaving])

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const canvas = canvasRef.current!
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
      const solid = (x: number, y: number) => alpha[(y * SAMPLE + x) * 4 + 3] > 128
      // Centre of the shape: middle of its bounding box
      let x0 = SAMPLE, y0 = SAMPLE, x1 = 0, y1 = 0
      for (let y = 0; y < SAMPLE; y++)
        for (let x = 0; x < SAMPLE; x++)
          if (solid(x, y)) {
            x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y)
          }
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
      edge = Array.from({ length: 360 }, (_, deg) => {
        const dx = Math.sin((deg * Math.PI) / 180), dy = -Math.cos((deg * Math.PI) / 180)
        for (let r = SAMPLE; r > 0; r--) {
          const x = Math.round(cx + dx * r), y = Math.round(cy + dy * r)
          if (x >= 0 && y >= 0 && x < SAMPLE && y < SAMPLE && solid(x, y)) return { x: x / SAMPLE, y: y / SAMPLE }
        }
        return { x: cx / SAMPLE, y: cy / SAMPLE }
      })
    }).catch(() => {})

    const particles: { x: number; y: number; vx: number; vy: number; age: number; life: number }[] = []
    let start = 0, last = 0, spawn = 0

    const tick = (now: number) => {
      if (!start) start = last = now // timed from the first frame, so it always starts faded out
      const dt = Math.min(now - last, 50) / 1000
      last = now
      const p = ((now - start) % LAP_MS) / LAP_MS
      const deg = START + p * SPAN
      const fadeOut = leavingAt.current === null ? 1 : Math.max(0, 1 - (now - leavingAt.current) / FADE_OUT_MS)
      canvas.style.opacity = String(Math.min(1, (now - start) / FADE_IN_MS, fadeOut))
      const sweep = Math.min(1, p / 0.1, (1 - p) / 0.1) // fade in and out at the ends of each sweep

      // Canvas matches the box at device resolution
      const size = canvas.clientWidth, dpr = window.devicePixelRatio || 1
      if (canvas.width !== Math.round(size * dpr)) canvas.width = canvas.height = Math.round(size * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, size, size)

      // About 14 a second, shed from the edge where the sweep is and drifting outward
      if (edge && leavingAt.current === null) {
        spawn += dt * 14
        while (spawn >= 1) {
          spawn--
          const d = Math.round(deg - 10 + Math.random() * 14) % 360
          const dir = ((d + (Math.random() - 0.5) * 50) * Math.PI) / 180
          const speed = 12 + Math.random() * 28
          particles.push({ x: edge[d].x * size, y: edge[d].y * size, vx: Math.sin(dir) * speed, vy: -Math.cos(dir) * speed, age: 0, life: 0.7 + Math.random() * 0.7 })
        }
      }
      ctx.fillStyle = "#fff"
      for (let i = particles.length - 1; i >= 0; i--) {
        const q = particles[i]
        q.age += dt
        if (q.age >= q.life) {
          particles.splice(i, 1)
          continue
        }
        q.x += q.vx * dt
        q.y += q.vy * dt
        ctx.globalAlpha = 0.8 * (1 - q.age / q.life) * sweep
        ctx.fillRect(q.x - 1.5, q.y - 1.5, 3, 3)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [src])

  return (
    <div aria-hidden className={className}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ opacity: 0 }} />
    </div>
  )
}
