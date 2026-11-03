"use client"

import { useState, useRef, useEffect, useLayoutEffect, type CSSProperties } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { traitUrls } from "@/lib/trait-urls"
import { getRarity, rarityBgClass, RARITY_RGB } from "@/lib/characters"

interface CharacterTileProps {
  id: string
  isSelected: boolean
  isClaimed: boolean
  /** Hide the "click to deselect" hint (e.g. while the mint sequence is showing) */
  tooltipHidden?: boolean
  onHover: () => void
  onLeave: () => void
  onClick: () => void
}

export function CharacterTile({
  id,
  isSelected,
  isClaimed,
  tooltipHidden = false,
  onHover,
  onLeave,
  onClick,
}: CharacterTileProps) {
  const [imageError, setImageError] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const hasShownTooltipRef = useRef(false)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)

  // Pin the tooltip 12px above the tile (re-placed on resize). Scrolling the menu fades it out
  // where it is, rather than letting it drift with the tile.
  useLayoutEffect(() => {
    if (!showTooltip) return
    const place = () => {
      const r = buttonRef.current?.getBoundingClientRect()
      if (r) setTooltipPos({ x: r.left + r.width / 2, y: r.top - 12 })
    }
    let hideTimer: ReturnType<typeof setTimeout> | undefined
    const fadeOut = () => {
      setTooltipVisible(false)
      hideTimer ??= setTimeout(() => setShowTooltip(false), 200)
    }
    place()
    window.addEventListener("scroll", fadeOut, true)
    window.addEventListener("resize", place)
    return () => {
      clearTimeout(hideTimer)
      window.removeEventListener("scroll", fadeOut, true)
      window.removeEventListener("resize", place)
    }
  }, [showTooltip])

  const rarity = getRarity(id)
  const rarityBg = rarityBgClass(rarity)
  // Outline colour by rarity (RGB triplet, also drives the hover glow)
  const outline = RARITY_RGB[rarity]

  useEffect(() => {
    if (isSelected && !hasShownTooltipRef.current) {
      hasShownTooltipRef.current = true
      const showTimer = setTimeout(() => {
        setShowTooltip(true)
        setTooltipVisible(true)
      }, 300)

      const hideTimer = setTimeout(() => {
        setTooltipVisible(false)
        setTimeout(() => setShowTooltip(false), 200)
      }, 2300)

      return () => {
        clearTimeout(showTimer)
        clearTimeout(hideTimer)
      }
    }

    if (!isSelected) {
      hasShownTooltipRef.current = false
      setShowTooltip(false)
      setTooltipVisible(false)
    }
  }, [isSelected])

  const handleMouseEnter = () => {
    setIsHovered(true)
    onHover()
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    onLeave()
  }

  const handleClick = () => {
    if (!isClaimed) {
      onClick()
    }
  }

  return (
    // The button is the hit area and never scales; the visuals scale inside it.
    // (If the hit area itself grew/shrank on hover, a cursor right on the edge could
    // flicker between hovered and not-hovered in a loop.)
    <button
      ref={buttonRef}
      className={cn(
        "relative aspect-square rounded-md outline-offset-2 group",
        isClaimed ? "cursor-not-allowed z-0" : "cursor-pointer",
        !isClaimed && !isSelected && "hover:z-[100]",
        !isClaimed && isSelected && "z-[100]",
      )}
      style={outline ? ({ ["--glow" as string]: outline } as CSSProperties) : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Drawn at page level so the menu's scroll area can't clip it */}
      {!isClaimed && isSelected && showTooltip && !tooltipHidden && tooltipPos &&
        createPortal(
          <div
            className={cn(
              "fixed -translate-x-1/2 -translate-y-full font-mono font-normal bg-white text-black text-[11px] uppercase tracking-wider px-2 py-1 rounded whitespace-nowrap z-[1000] pointer-events-none transition-opacity duration-200",
              tooltipVisible ? "opacity-100" : "opacity-0",
            )}
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
          >
            click to deselect
          </div>,
          document.body,
        )}

      <div
        className={cn(
          "absolute inset-0 rounded-md border-2 transition-all duration-300 pointer-events-none",
          isClaimed && "opacity-50",
          isClaimed && (outline ? "border-[rgb(var(--glow)/0.4)]" : "border-white/15"),
          !isClaimed && !isSelected && "group-hover:scale-105",
          !isClaimed && !isSelected && (outline ? "border-[rgb(var(--glow)/0.55)]" : "border-white/15"),
          !isClaimed && !isSelected && isHovered && "border-glow-animate",
          !isClaimed && isSelected && "scale-105",
          !isClaimed && isSelected && (outline ? "border-[rgb(var(--glow))]" : "border-white"),
        )}
      >

      {rarityBg ? (
        <div
          className={cn("absolute inset-0 rounded-[4px]", rarityBg, (isHovered || isSelected) && !isClaimed && "rarity-swirl")}
          style={{ ["--rarity-blur" as string]: "14px", ["--rarity-opacity" as string]: (isHovered || isSelected) && !isClaimed ? 1 : 0.8 } as CSSProperties}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-secondary via-muted to-secondary opacity-50" />
      )}

      {!imageError ? (
        <img
          src={traitUrls[`trait${id}`]}
          alt={`Character ${id}`}
          className="absolute inset-0 w-full h-full object-cover"
          crossOrigin="anonymous"
          onError={() => {
            setImageError(true)
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent/50 to-muted">
          <span className="text-2xl font-bold text-muted-foreground/50">{Number(id)}</span>
        </div>
      )}

      {/* Soft shade behind the number so it reads on bright raiders */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 rounded-b-[4px] bg-gradient-to-t from-black/20 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[11px] leading-none pb-0.5 font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {id}
      </div>

      {!isClaimed && isSelected && (
        <div className="absolute top-1 right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center animate-in fade-in zoom-in duration-200 z-[150]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="black"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3 h-3"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}

      {isClaimed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" />
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line x1="0" y1="0" x2="100" y2="100" stroke="white" strokeWidth="2" />
          </svg>
        </div>
      )}
      </div>
    </button>
  )
}
