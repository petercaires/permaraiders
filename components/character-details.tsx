"use client"

import type { CSSProperties } from "react"
import { getCharacterById } from "@/lib/characters"
import { cn } from "@/lib/utils"

interface CharacterDetailsProps {
  /** Character to describe, or null when nothing is hovered or selected */
  id: string | null
  isMinted: boolean
  className?: string
  style?: CSSProperties
}

/**
 * Short description of the hovered / selected raider, shown directly under the grid
 * and matched to its width so the two read as one block.
 * Fixed height, so the grid never jumps as the content changes.
 */
export function CharacterDetails({ id, isMinted, className, style }: CharacterDetailsProps) {
  const character = id ? getCharacterById(id) : undefined

  return (
    <aside
      className={cn("font-mono text-white select-none h-[68px] flex flex-col justify-start gap-1 text-left", className)}
      style={style}
      aria-live="polite"
    >
      {character ? (
        <>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-bold shrink-0">{character.name}</span>
            <span
              className={cn(
                "text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0",
                isMinted ? "bg-white/10 text-white/60" : "bg-white text-black",
              )}
            >
              {isMinted ? "minted" : "available"}
            </span>
            <ul className="hidden sm:flex gap-1 min-w-0 overflow-hidden">
              {character.traits.map((trait) => (
                <li
                  key={trait}
                  className="text-[9px] px-1.5 py-0.5 rounded border border-white/20 text-white/70 whitespace-nowrap"
                >
                  {trait}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-[10px] sm:text-[11px] leading-snug text-white/70 line-clamp-2">{character.description}</p>
        </>
      ) : (
        <p className="text-[10px] sm:text-[11px] text-white/40 pt-1">hover or tap a raider to see who they are</p>
      )}
    </aside>
  )
}
