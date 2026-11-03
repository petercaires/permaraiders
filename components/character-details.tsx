"use client"

import { getCharacterById, RARITY_RGB } from "@/lib/characters"
import type { CSSProperties } from "react"
import { cn } from "@/lib/utils"

interface CharacterDetailsProps {
  /** Character to describe, or null when nothing is hovered or selected */
  id: string | null
  isMinted: boolean
}

/**
 * Short description of the hovered / selected raider, shown directly under the grid
 * and matched to its width so the two read as one block.
 * Fixed height, so the grid never jumps as the content changes.
 */
export function CharacterDetails({ id, isMinted }: CharacterDetailsProps) {
  const character = id ? getCharacterById(id) : undefined

  return (
    <aside
      className="text-white select-none h-[92px] pt-2.5 wide:h-[72px] wide:pt-0 flex flex-col justify-start gap-2.5 text-left"
      aria-live="polite"
    >
      {character ? (
        <>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base font-bold leading-tight shrink-0">Raider {character.id}</span>
            <span
              className={cn(
                "text-[11px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0",
                isMinted ? "bg-white/10 text-white/70" : "bg-white text-black",
              )}
            >
              {isMinted ? "minted" : "available"}
            </span>
            <span
              className={cn(
                "text-[11px] uppercase tracking-wider px-1.5 py-0.5 rounded border whitespace-nowrap min-w-0 truncate",
                RARITY_RGB[character.rarity]
                  ? cn(
                      "relative border-glow-animate border-transparent text-black font-bold [--rarity-blur:5px]",
                      character.rarity === "PermaRare" ? "rarity-gold" : "rarity-silver",
                    )
                  : "border-white/20 text-white/70",
              )}
              style={{ ["--glow" as string]: RARITY_RGB[character.rarity] ?? undefined } as CSSProperties}
            >
              {character.rarity}
            </span>
          </div>
          <p className="text-xs wide:text-sm leading-snug text-white line-clamp-3 wide:line-clamp-2">{character.description}</p>
        </>
      ) : null}
    </aside>
  )
}
