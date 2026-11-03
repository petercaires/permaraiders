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
      className={cn("text-white select-none h-[92px] pt-2.5 wide:h-[72px] wide:pt-0 flex flex-col justify-start gap-2.5 text-left", className)}
      style={style}
      aria-live="polite"
    >
      {character ? (
        <>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base font-bold leading-tight shrink-0">{character.name}</span>
            <span
              className={cn(
                "text-[11px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0",
                isMinted ? "bg-white/10 text-white/70" : "bg-white text-black",
              )}
            >
              {isMinted ? "minted" : "available"}
            </span>
            <ul className="flex gap-1 min-w-0 overflow-hidden">
              {character.traits.map((trait) => (
                <li
                  key={trait}
                  className={cn(
                    "text-[11px] uppercase tracking-wider px-1.5 py-0.5 rounded border whitespace-nowrap",
                    trait === "PermaRare"
                      ? "relative rarity-gold [--rarity-blur:5px] [--glow:255_214_92] border-glow-animate border-transparent text-black font-bold"
                      : trait === "Rare"
                        ? "relative rarity-silver [--rarity-blur:5px] [--glow:207_213_220] border-glow-animate border-transparent text-black font-bold"
                        : "border-white/20 text-white/70",
                  )}
                >
                  {trait}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs wide:text-sm leading-snug text-white line-clamp-3 wide:line-clamp-2">{character.description}</p>
        </>
      ) : null}
    </aside>
  )
}
