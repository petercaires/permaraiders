"use client"

import { useState, useRef, useEffect, type CSSProperties } from "react"
import { cn } from "@/lib/utils"
import { traitUrls } from "@/lib/trait-urls"
import { getRarity, rarityBgClass } from "@/lib/characters"

interface CharacterTileProps {
  id: string
  index: number
  traitIds: string[]
  isSelected: boolean
  isClaimed: boolean
  isRevealed: boolean
  onHover: () => void
  onLeave: () => void
  onClick: () => void
}

export function CharacterTile({
  id,
  index,
  traitIds,
  isSelected,
  isClaimed,
  isRevealed,
  onHover,
  onLeave,
  onClick,
}: CharacterTileProps) {
  const [imageError, setImageError] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const hasShownTooltipRef = useRef(false)

  const traitId = traitIds.length > 0 ? traitIds[0] : `trait${id}`
  const traitSrc = traitUrls[traitId] || `/traits/${traitId}.png`
  const rarity = getRarity(id)
  const rarityBg = rarityBgClass(rarity)
  // Outline colour by rarity (RGB triplet, also drives the hover glow)
  const outline = rarity === "PermaRare" ? "242 205 92" : rarity === "Rare" ? "207 213 220" : null

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
    <button
      className={cn(
        "relative aspect-square rounded-md overflow-visible transition-all duration-300 outline-offset-2 group border-2",
        isRevealed ? "opacity-100 scale-100" : "opacity-0 scale-95",
        isClaimed && "opacity-50 cursor-not-allowed z-0",
        isClaimed && (outline ? "border-[rgb(var(--glow)/0.4)]" : "border-white/15"),
        !isClaimed && "cursor-pointer",
        !isClaimed && !isSelected && "hover:scale-105 hover:z-[100] hover:relative",
        !isClaimed && !isSelected && (outline ? "border-[rgb(var(--glow)/0.55)]" : "border-white/15"),
        !isClaimed && !isSelected && isHovered && "border-glow-animate",
        !isClaimed && isSelected && "scale-105 z-[100] relative",
        !isClaimed && isSelected && (outline ? "border-[rgb(var(--glow))]" : "border-white"),
      )}
      style={outline ? ({ ["--glow" as string]: outline } as CSSProperties) : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      disabled={!isRevealed}
    >
      {!isClaimed && isSelected && showTooltip && (
        <div
          className={cn(
            "absolute -top-9 left-1/2 -translate-x-1/2 bg-white text-black px-2 py-1 rounded text-[11px] uppercase tracking-wider whitespace-nowrap z-[200] transition-opacity duration-200 flex items-center justify-center",
            tooltipVisible ? "opacity-100" : "opacity-0",
          )}
        >
          click to deselect
        </div>
      )}

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
          src={traitSrc || "/placeholder.svg"}
          alt={`Character ${id}`}
          className="absolute inset-0 w-full h-full object-cover"
          crossOrigin="anonymous"
          onError={() => {
            setImageError(true)
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent/50 to-muted">
          <span className="text-2xl font-bold text-muted-foreground/50">{index}</span>
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
    </button>
  )
}
