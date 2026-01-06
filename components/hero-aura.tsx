"use client"

import { useEffect, useRef } from "react"

interface HeroAuraProps {
  isActive: boolean
}

export function HeroAura({ isActive }: HeroAuraProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<any[]>([])
  const animationRef = useRef<number>()
  const opacityRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d", { alpha: true })
    if (!ctx) return

    const updateCanvasSize = () => {
      const parent = canvas.parentElement
      if (!parent) return

      const rect = parent.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height

      initParticles()
    }

    class Particle {
      angle: number
      baseDistance: number
      speed: number
      size: number
      baseOpacity: number
      fadePhase: number
      fadeSpeed: number

      constructor(centerX: number, centerY: number) {
        this.angle = Math.random() * Math.PI * 2
        const minSize = Math.min(canvas.width, canvas.height)
        const distanceVariation = 0.3 + Math.random() * 0.4 // Increased distribution range from 25-55% to 30-70% for wider spread
        this.baseDistance = minSize * distanceVariation
        this.speed = 0.0005 + Math.random() * 0.001 // Reduced speed for smoother motion
        this.size = 1 + Math.random() * 1.5
        this.baseOpacity = 0.4 + Math.random() * 0.4
        this.fadePhase = Math.random() * Math.PI * 2
        this.fadeSpeed = 0.005 + Math.random() * 0.005 // Reduced fade speed for smoother opacity transitions
      }

      update() {
        this.angle += this.speed
        this.fadePhase += this.fadeSpeed
      }

      draw(ctx: CanvasRenderingContext2D, globalOpacity: number, centerX: number, centerY: number) {
        const distVariation = Math.sin(this.angle * 3) * (this.baseDistance * 0.08)
        const distance = this.baseDistance + distVariation

        const x = centerX + Math.cos(this.angle) * distance
        const y = centerY + Math.sin(this.angle) * distance

        const opacity = this.baseOpacity * (0.5 + Math.sin(this.fadePhase) * 0.5)

        ctx.beginPath()
        ctx.arc(x, y, this.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity * globalOpacity})`
        ctx.shadowBlur = 6
        ctx.shadowColor = `rgba(255, 255, 255, ${0.6 * globalOpacity})`
        ctx.fill()
        ctx.shadowBlur = 0
      }
    }

    const initParticles = () => {
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      particlesRef.current = Array.from({ length: 60 }, () => new Particle(centerX, centerY))
    }

    updateCanvasSize()

    let resizeTimeout: NodeJS.Timeout
    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(updateCanvasSize, 100)
    }

    window.addEventListener("resize", handleResize)

    const animate = () => {
      const targetOpacity = isActive ? 1 : 0
      const fadeSpeed = 0.08 // Increased fade speed from 0.05 to 0.08 for smoother transitions

      if (Math.abs(opacityRef.current - targetOpacity) > 0.01) {
        opacityRef.current += (targetOpacity - opacityRef.current) * fadeSpeed
      } else {
        opacityRef.current = targetOpacity
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (opacityRef.current > 0.01) {
        const centerX = canvas.width / 2
        const centerY = canvas.height / 2

        particlesRef.current.forEach((particle) => {
          particle.update()
          particle.draw(ctx, opacityRef.current, centerX, centerY)
        })
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      window.removeEventListener("resize", handleResize)
      clearTimeout(resizeTimeout)
    }
  }, [isActive])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-10 pointer-events-none overflow-hidden"
      style={{
        width: "100%",
        height: "100%",
      }}
    />
  )
}
