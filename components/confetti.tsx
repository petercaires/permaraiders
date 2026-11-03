"use client"

import { useEffect, useState } from "react"

interface ConfettiProps {
  isActive: boolean
  /** Keep the burst inside the nearest positioned parent instead of the whole screen */
  contained?: boolean
  /** Particle colours; one is picked per particle */
  colors?: string[]
}

export function Confetti({ isActive, contained = false, colors = ["#ffffff"] }: ConfettiProps) {
  const [particles, setParticles] = useState<Array<{ id: number; angle: number; speed: number; delay: number }>>([])

  useEffect(() => {
    if (isActive) {
      const newParticles = Array.from({ length: 40 }, (_, i) => ({
        id: i,
        angle: (Math.PI * 2 * i) / 40 + (Math.random() - 0.5) * 0.3, // Evenly distributed angles with slight randomness
        speed: (contained ? 120 : 200) + Math.random() * (contained ? 140 : 150), // Speed in pixels
        delay: Math.random() * 0.1,
      }))
      setParticles(newParticles)
    } else {
      setParticles([])
    }
  }, [isActive, contained])

  if (!isActive) return null

  return (
    <div className={`${contained ? "absolute" : "fixed"} inset-0 pointer-events-none z-40 overflow-hidden`}>
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="explosion-particle"
          style={{
            left: "50%",
            top: "50%",
            animationDelay: `${particle.delay}s`,
            ["--angle" as string]: `${particle.angle}rad`,
            ["--speed" as string]: `${particle.speed}px`,
            backgroundColor: colors[particle.id % colors.length],
          }}
        />
      ))}
    </div>
  )
}
