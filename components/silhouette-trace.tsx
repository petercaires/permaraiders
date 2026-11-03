"use client"

import { useEffect, useRef, type CSSProperties } from "react"
import { cn } from "@/lib/utils"

// The sweep runs over the top of the outline only: from lower-left, over the head, to lower-right
// (angles clockwise from straight up, around the silhouette's centre), then fades and starts again.
const START = 235
const SPAN = 250
const LAP_MS = 4500
const CENTRE = { x: 0.52, y: 0.55 } // of the image box
const SAMPLE = 256 // px; the silhouette is scanned at this size to find its edge

/**
 * Empty-state silhouette edge light. The inner layer is the silhouette's own shape (as a mask) filled with
 * a short bright arc; the outer layer's drop-shadow lets that arc spill just past the edge, and the
 * (opaque) silhouette drawn on top hides everything inside it. A few white confetti-style squares drift
 * off the edge where the light is.
 */
export function SilhouetteTrace({ src, className }: { src: string; className: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const arcRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return // CSS shows a still rim instead
    const wrap = wrapRef.current!, arc = arcRef.current!, canvas = canvasRef.current!
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
      edge = Array.from({ length: 360 }, (_, deg) => {
        const dx = Math.sin((deg * Math.PI) / 180), dy = -Math.cos((deg * Math.PI) / 180)
        for (let r = SAMPLE; r > 0; r--) {
          const x = Math.round(CENTRE.x * SAMPLE + dx * r), y = Math.round(CENTRE.y * SAMPLE + dy * r)
          if (x >= 0 && y >= 0 && x < SAMPLE && y < SAMPLE && alpha[(y * SAMPLE + x) * 4 + 3] > 128)
            return { x: x / SAMPLE, y: y / SAMPLE }
        }
        return { x: CENTRE.x, y: CENTRE.y }
      })
    }).catch(() => {})

    const particles: { x: number; y: number; vx: number; vy: number; age: number; life: number }[] = []
    let last = performance.now(), spawn = 0
    const start = last

    const tick = (now: number) => {
      const dt = Math.min(now - last, 50) / 1000
      last = now
      const p = ((now - start) % LAP_MS) / LAP_MS
      const deg = START + p * SPAN
      arc.style.setProperty("--trace", `${deg - 330}deg`) // the arc's brightest point sits at +330°
      wrap.style.opacity = String(Math.min(1, p / 0.1, (1 - p) / 0.1)) // fade in and out at the ends

      // Canvas matches the box at device resolution
      const size = wrap.clientWidth, dpr = window.devicePixelRatio || 1
      if (canvas.width !== Math.round(size * dpr)) canvas.width = canvas.height = Math.round(size * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, size, size)

      // A few particles per second, shed from the lit part of the edge and drifting outward
      if (edge) {
        spawn += dt * 14
        while (spawn >= 1) {
          spawn--
          const d = Math.round(deg - 10 + Math.random() * 14) % 360
          const out = ((d + (Math.random() - 0.5) * 50) * Math.PI) / 180
          const speed = 12 + Math.random() * 28
          particles.push({ x: edge[d].x * size, y: edge[d].y * size, vx: Math.sin(out) * speed, vy: -Math.cos(out) * speed, age: 0, life: 0.7 + Math.random() * 0.7 })
        }
      }
      ctx.fillStyle = "#fff"
      for (let i = particles.length - 1; i >= 0; i--) {
        const q = particles[i]
        q.age += dt
        if (q.age >= q.life) { particles.splice(i, 1); continue }
        q.x += q.vx * dt
        q.y += q.vy * dt
        ctx.globalAlpha = 0.8 * (1 - q.age / q.life) * Number(wrap.style.opacity)
        ctx.fillRect(q.x - 1.5, q.y - 1.5, 3, 3)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [src])

  return (
    <div ref={wrapRef} aria-hidden className={cn("hero-trace", className)}>
      <div ref={arcRef} style={{ ["--silhouette" as string]: `url("${src}")` } as CSSProperties} />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  )
}
