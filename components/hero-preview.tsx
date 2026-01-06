"use client"

import { useState, useEffect } from "react"
import type { Character } from "@/lib/characters"
import { heroUrls } from "@/lib/hero-urls"

interface HeroPreviewProps {
  character: Character | null
}

export function HeroPreview({ character }: HeroPreviewProps) {
  const [imageError, setImageError] = useState(false)
  const [animationKey, setAnimationKey] = useState(0)

  useEffect(() => {
    if (character) {
      setImageError(false)
      setAnimationKey((prev) => prev + 1)
    }
  }, [character])

  if (!character) {
    return (
      <div className="aspect-square rounded-lg bg-gradient-to-br from-muted via-secondary to-muted flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-6xl font-mono text-muted-foreground/30">?</div>
          <p className="text-sm text-muted-foreground">Select a character</p>
        </div>
      </div>
    )
  }

  const heroSrc = heroUrls[`hero${character.id}`] || heroUrls["hero000"]

  return (
    <div className="space-y-4">
      <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-secondary via-muted to-accent relative z-0">
        {!imageError ? (
          <img
            key={animationKey}
            src={heroSrc || "/placeholder.svg"}
            alt={character.name}
            className="w-full h-full object-cover animate-in slide-in-from-left duration-300"
            crossOrigin="anonymous"
            onError={() => {
              setImageError(true)
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center animate-in slide-in-from-left duration-300">
            <span className="text-8xl font-bold text-muted-foreground/40 font-mono">{character.index}</span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Character Info */}
      <div className="space-y-3">
        <div>
          <h2 className="text-2xl font-bold text-balance">{character.name}</h2>
          <p className="text-sm text-muted-foreground font-mono">#{character.id}</p>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed text-pretty">{character.description}</p>

        {/* Traits */}
        <div className="flex flex-wrap gap-2">
          {character.traits.map((trait, idx) => (
            <span key={idx} className="px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium">
              {trait}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
