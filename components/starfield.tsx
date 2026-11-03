"use client"

import { useEffect, useRef } from "react"

interface Star {
  x: number
  y: number
  z: number
  size: number
  opacity: number
}

export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d", { alpha: true })
    if (!ctx) return

    // Set canvas size
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    const starCount = 50
    const stars: Star[] = []

    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: (Math.random() - 0.5) * canvas.width,
        y: (Math.random() - 0.5) * canvas.height,
        z: Math.random() * canvas.width,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.6 + 0.2,
      })
    }

    let animationId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2

      stars.forEach((star) => {
        star.z -= 2

        // Reset star when it goes past viewer
        if (star.z <= 0) {
          star.x = (Math.random() - 0.5) * canvas.width
          star.y = (Math.random() - 0.5) * canvas.height
          star.z = canvas.width
        }

        // Project 3D position to 2D screen
        const scale = canvas.width / star.z
        const screenX = star.x * scale + centerX
        const screenY = star.y * scale + centerY
        // Cap the star size to a maximum of 4 pixels to prevent huge stars
        const screenSize = Math.min(star.size * scale, 4)

        // Draw star (no pulsing or twinkling)
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`
        ctx.beginPath()
        ctx.arc(screenX, screenY, screenSize, 0, Math.PI * 2)
        ctx.fill()
      })

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />
}
