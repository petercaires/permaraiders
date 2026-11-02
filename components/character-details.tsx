"use client"

import { getCharacterById } from "@/lib/characters"
import { cn } from "@/lib/utils"

interface CharacterDetailsProps {
  /** Character to describe, or null when nothing is hovered or selected */
  id: string | null
  isMinted: boolean
  className?: string
}

/**
 * Short description of the hovered / selected raider.
 * Sits beside the grid when there's room, and below it otherwise.
 * Its height is fixed per layout so the grid never jumps as content changes.
 */
export function CharacterDetails({ id, isMinted, className }: CharacterDetailsProps) {
  const character = id ? getCharacterById(id) : undefined

  return (
    <aside
      className={cn(
        "font-mono text-white select-none",
        "h-[64px] @min-[720px]:h-auto @min-[720px]:min-h-[180px]",
        "flex flex-col justify-center gap-1 @min-[720px]:gap-2",
        "text-center @min-[720px]:text-left",
        className,
      )}
      aria-live="polite"
    >
      {character ? (
        <>
          <div className="flex items-baseline justify-center @min-[720px]:justify-start gap-2">
            <span className="text-sm @min-[720px]:text-base font-bold">{character.name}</span>
            <span
              className={cn(
                "text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded",
                isMinted ? "bg-white/10 text-white/60" : "bg-white text-black",
              )}
            >
              {isMinted ? "minted" : "available"}
            </span>
          </div>
          <p className="text-[10px] @min-[720px]:text-[11px] leading-snug text-white/70 line-clamp-2 @min-[720px]:line-clamp-6">
            {character.description}
          </p>
          <ul className="hidden @min-[720px]:flex flex-wrap gap-1 mt-1">
            {character.traits.map((trait) => (
              <li key={trait} className="text-[9px] px-1.5 py-0.5 rounded border border-white/20 text-white/70">
                {trait}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-[10px] @min-[720px]:text-[11px] text-white/40">hover or tap a raider to see who they are</p>
      )}
    </aside>
  )
}
