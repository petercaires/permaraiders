"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { traitUrls } from "@/lib/trait-urls"

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
        isClaimed && "opacity-50 cursor-not-allowed z-0 border-white/15",
        !isClaimed && "cursor-pointer",
        !isClaimed && !isSelected && "border-white/15 hover:scale-105 hover:z-[100] hover:relative",
        !isClaimed && !isSelected && isHovered && "border-white/30 border-glow-animate",
        !isClaimed && isSelected && "border-white scale-105 z-[100] relative",
      )}
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

      <div className="absolute inset-0 bg-gradient-to-br from-secondary via-muted to-secondary opacity-50" />

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
