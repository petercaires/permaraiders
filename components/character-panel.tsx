"use client"

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react"
import { ChevronUp, ChevronDown } from "lucide-react"
import { CharacterTile } from "@/components/character-tile"
import { characters } from "@/lib/characters"
import { cn } from "@/lib/utils"

/*
 * The character sheet (phone and desktop).
 *
 * The panel is a fixed frame: it fills the space between the pinned logo block and the
 * pinned description/mint block, so its edges only ever track the window size.
 * Inside, tiles reflow: as many 68–84px columns as fit (never more than 11), stretching
 * slightly to fill the width, and as many rows as fit. The rest scrolls natively,
 * snapping row by row, with a fade on whichever edge has more raiders beyond it.
 */

export const PANEL_GAP = 6 // px between tiles
export const PANEL_PAD = 4 // px inset so hover/selected tiles aren't clipped
export const PANEL_RAIL = 22 // px scroll rail beside the sheet
const TILE_MIN = 68
const TILE_MAX = 84
const MAX_COLS = 11
/** Widest the panel gets, so tiles top out at TILE_MAX with MAX_COLS columns */
export const PANEL_MAX_WIDTH =
  MAX_COLS * TILE_MAX + (MAX_COLS - 1) * PANEL_GAP + PANEL_PAD * 2 + PANEL_GAP + PANEL_RAIL

interface CharacterPanelProps {
  selectedId: string | null
  claimedIds: string[]
  onHover: (id: string) => void
  onLeave: () => void
  onSelect: (id: string) => void
  /** Hide the tiles' "click to deselect" hint */
  tooltipHidden?: boolean
  className?: string
}

export function CharacterPanel({ selectedId, claimedIds, onHover, onLeave, onSelect, tooltipHidden, className }: CharacterPanelProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [scroll, setScroll] = useState({ pos: 0, size: 1, atStart: true, atEnd: true })
  const [isDragging, setIsDragging] = useState(false)

  const update = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const max = el.scrollHeight - el.clientHeight
    setScroll({
      pos: max > 0 ? el.scrollTop / max : 0,
      size: el.scrollHeight > 0 ? Math.min(1, el.clientHeight / el.scrollHeight) : 1,
      atStart: el.scrollTop <= 1,
      atEnd: el.scrollTop >= max - 1,
    })
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    return () => ro.disconnect()
  }, [update])

  // One row = one tile height + gap
  const scrollRows = (dir: 1 | -1) => {
    const el = scrollRef.current
    const tile = el?.querySelector("button")
    if (!el || !tile) return
    el.scrollBy({ top: dir * (tile.getBoundingClientRect().height + PANEL_GAP), behavior: "smooth" })
  }

  // Dragging the custom scrollbar
  useEffect(() => {
    if (!isDragging) return
    const move = (e: PointerEvent) => {
      const el = scrollRef.current
      const track = trackRef.current
      if (!el || !track) return
      const rect = track.getBoundingClientRect()
      const pct = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
      el.scrollTop = pct * (el.scrollHeight - el.clientHeight)
    }
    const up = () => setIsDragging(false)
    document.addEventListener("pointermove", move)
    document.addEventListener("pointerup", up)
    document.addEventListener("pointercancel", up)
    return () => {
      document.removeEventListener("pointermove", move)
      document.removeEventListener("pointerup", up)
      document.removeEventListener("pointercancel", up)
    }
  }, [isDragging])

  // Fade whichever edge has more raiders beyond it
  const top = scroll.atStart ? "black 0" : "transparent 0, black 28px"
  const bottom = scroll.atEnd ? "black 100%" : "black calc(100% - 56px), transparent 100%"
  const mask = `linear-gradient(to bottom, ${top}, ${bottom})`

  return (
    <div className={cn("flex min-h-0 w-full", className)} style={{ gap: PANEL_GAP, maxWidth: PANEL_MAX_WIDTH }}>
      <div
        ref={scrollRef}
        onScroll={update}
        className={cn(
          "relative flex-1 min-w-0 h-full overflow-y-auto overscroll-contain",
          "snap-y snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          // Edge fades on desktop only: the phone sheet shows exactly 3 whole rows
          "wide:[mask-image:var(--fade)] wide:[-webkit-mask-image:var(--fade)]",
          isDragging && "snap-none",
        )}
        style={{
          padding: PANEL_PAD,
          scrollPaddingTop: PANEL_PAD,
          ["--fade" as string]: mask,
        } as CSSProperties}
      >
        <div
          // Phones: 5 fixed columns. Desktop: tiles at least TILE_MIN wide, never more than MAX_COLS, stretched to fill
          className="grid [&>*]:snap-start grid-cols-5 wide:[grid-template-columns:var(--desktop-cols)]"
          style={
            {
              gap: PANEL_GAP,
              ["--desktop-cols" as string]: `repeat(auto-fill, minmax(max(${TILE_MIN}px, calc((100% - ${(MAX_COLS - 1) * PANEL_GAP}px) / ${MAX_COLS})), 1fr))`,
            } as CSSProperties
          }
        >
          {characters.map((char) => (
            <CharacterTile
              key={char.id}
              id={char.id}
              isSelected={selectedId === char.id}
              isClaimed={claimedIds.includes(char.id)}
              tooltipHidden={tooltipHidden}
              onHover={() => onHover(char.id)}
              onLeave={onLeave}
              onClick={() => onSelect(char.id)}
            />
          ))}
        </div>
      </div>

      {/* Scroll rail */}
      <div className="flex flex-col items-center justify-between shrink-0 py-1" style={{ width: PANEL_RAIL }}>
        <button
          className="shrink-0 cursor-pointer text-white hover:text-white/80 disabled:opacity-30 disabled:cursor-default transition-[color,opacity] flex items-center justify-center w-6 h-6"
          onClick={() => scrollRows(-1)}
          disabled={scroll.atStart}
          aria-label="Scroll up"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
        <div
          ref={trackRef}
          className="relative w-1 my-1 bg-white/10 flex-1 cursor-pointer rounded-full touch-none"
          onPointerDown={(e) => {
            setIsDragging(true)
            e.preventDefault()
          }}
        >
          <div
            className="absolute left-0 right-0 bg-white/40 rounded-full pointer-events-none"
            style={{ height: `${scroll.size * 100}%`, top: `${scroll.pos * (1 - scroll.size) * 100}%` }}
          />
        </div>
        <button
          className="shrink-0 cursor-pointer text-white hover:text-white/80 disabled:opacity-30 disabled:cursor-default transition-[color,opacity] flex items-center justify-center w-6 h-6"
          onClick={() => scrollRows(1)}
          disabled={scroll.atEnd}
          aria-label="Scroll down"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
