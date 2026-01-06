"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { CharacterTile } from "@/components/character-tile"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"
import {
  characters,
  getCharactersForRows,
  getCharactersForMobileRows,
  TOTAL_ROWS,
  VISIBLE_ROWS,
  MOBILE_TOTAL_ROWS,
  MOBILE_VISIBLE_ROWS,
} from "@/lib/characters"
import { getClaimedIds, claimCharacter, clearAllClaimed, unclaimCharacter } from "@/lib/mintAdapter"
import { ChevronUp, ChevronDown, Volume2, VolumeX, Eye, EyeOff } from "lucide-react"
import { Starfield } from "@/components/starfield"
import { MintModal } from "@/components/mint-modal"
import { TraitLoader } from "@/components/trait-loader"
import { ScrollGestureOverlay } from "@/components/scroll-gesture-overlay"
import { cn } from "@/lib/utils"
import { heroUrls } from "@/lib/hero-urls"
import { traitUrls } from "@/lib/trait-urls"
import { StoryModal } from "@/components/story-modal"

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)
  const [startRow, setStartRow] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [claimedIds, setClaimedIds] = useState<string[]>([])
  const [revealedTiles, setRevealedTiles] = useState<Set<string>>(new Set())
  const [isMinting, setIsMinting] = useState(false)
  const { toast } = useToast()
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [showMintModal, setShowMintModal] = useState(false)
  const displayedHeroId = hoveredId || selectedId || "000"
  const [isHeroLoading, setIsHeroLoading] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(true)
  const [isSelectionAnimating, setIsSelectionAnimating] = useState(false)
  const [showStarBurst, setShowStarBurst] = useState(false)
  const hoverSoundRef = useRef<HTMLAudioElement | null>(null)
  const scrollAccumulator = useRef(0)
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
  const musicRef = useRef<HTMLAudioElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const scrollbarRef = useRef<HTMLDivElement | null>(null)
  const selectSoundRef = useRef<HTMLAudioElement | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [showScrollOverlay, setShowScrollOverlay] = useState(false)
  const [hasShownScrollOverlay, setHasShownScrollOverlay] = useState(false)
  const [showStoryModal, setShowStoryModal] = useState(false)
  const [viewport, setViewport] = useState({ w: 0, h: 0 })
  const [isGridVisible, setIsGridVisible] = useState(true)
  const [heroPopTrigger, setHeroPopTrigger] = useState(0)
  const prefersReducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

  const visibleCharacters = isMobile ? getCharactersForMobileRows(startRow) : getCharactersForRows(startRow)
  const totalRows = isMobile ? MOBILE_TOTAL_ROWS : TOTAL_ROWS
  const visibleRows = isMobile ? MOBILE_VISIBLE_ROWS : VISIBLE_ROWS
  const gridCols = isMobile ? 5 : 11
  const tileSize = isMobile ? 45 : isTablet ? 60 : 80
  const gapSize = isMobile ? 4 : 6
  const gridHeightPx = tileSize * visibleRows + gapSize * (visibleRows - 1)
  const gridWidthPx = tileSize * gridCols + gapSize * (gridCols - 1)
  const gridHeightValue = `${gridHeightPx}px`
  const gridWidthValue = `${gridWidthPx}px`

  const gridScale = useMemo(() => {
    if (!isTablet || viewport.h === 0) return 0.85
    const reserved = 220
    const available = Math.max(200, viewport.h - reserved)
    const raw = available / gridHeightPx
    return Math.max(0.62, Math.min(0.7, raw))
  }, [isTablet, viewport.h, gridHeightPx])

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      setViewport({ w, h })
      setIsMobile(w < 640)
      setIsTablet(w >= 640 && w < 1024)
    }
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  useEffect(() => {
    const checkFullScreen = () => {
      const isAtFullWidth = window.innerWidth >= window.screen.width - 20
      setIsFullScreen(isAtFullWidth)
    }

    checkFullScreen()

    window.addEventListener("resize", checkFullScreen)
    return () => window.removeEventListener("resize", checkFullScreen)
  }, [])

  useEffect(() => {
    clearAllClaimed()
    unclaimCharacter("011")
    setClaimedIds(getClaimedIds())
  }, [])

  useEffect(() => {
    setRevealedTiles(new Set(visibleCharacters.map((char) => char.id)))
  }, [startRow])

  useEffect(() => {
    characters.forEach((char) => {
      const traitId = char.traitIds.length > 0 ? char.traitIds[0] : `trait${char.id}`
      const img = new Image()
      img.src = `/traits/${traitId}.png`
    })
  }, [])

  useEffect(() => {
    selectSoundRef.current = new Audio(
      "https://ik.imagekit.io/peterlikesthis/permaraiderz/permaraiderz%20sfx/select.wav",
    )
    selectSoundRef.current.volume = 0.5
    selectSoundRef.current.load()

    hoverSoundRef.current = new Audio("https://ik.imagekit.io/peterlikesthis/permaraiderz/permaraiderz%20sfx/hover.wav")
    hoverSoundRef.current.volume = 0.5
    hoverSoundRef.current.load()

    musicRef.current = new Audio("https://ik.imagekit.io/peterlikesthis/permaraiderz/permaraiderz%20sfx/loop.wav")
    musicRef.current.volume = 0.316
    musicRef.current.loop = true
    musicRef.current.preload = "auto"
  }, [])

  useEffect(() => {
    const hasShown = localStorage.getItem("scroll-hint-shown")
    if (hasShown === "true") {
      setHasShownScrollOverlay(true)
    }
  }, [])

  useEffect(() => {
    if (!isLoading && musicRef.current) {
      musicRef.current.volume = 0
      musicRef.current
        .play()
        .then(() => {
          setIsMusicPlaying(true)
          let currentVolume = 0
          const fadeInterval = setInterval(() => {
            if (currentVolume < 0.316) {
              currentVolume = Math.min(0.316, currentVolume + 0.016)
              if (musicRef.current) musicRef.current.volume = currentVolume
            } else {
              clearInterval(fadeInterval)
            }
          }, 50)
        })
        .catch(() => {
          // Autoplay blocked, will be handled by user interaction
        })
    }
  }, [isLoading])

  useEffect(() => {
    if (selectedId && !prefersReducedMotion) {
      setHeroPopTrigger((prev) => prev + 1)
    }
  }, [selectedId, prefersReducedMotion])

  const toggleMusic = () => {
    if (musicRef.current) {
      if (isMusicPlaying) {
        let currentVolume = musicRef.current.volume
        const fadeOutInterval = setInterval(() => {
          if (currentVolume > 0) {
            currentVolume = Math.max(0, currentVolume - 0.032)
            if (musicRef.current) musicRef.current.volume = currentVolume
          } else {
            clearInterval(fadeOutInterval)
            if (musicRef.current) musicRef.current.pause()
          }
        }, 30)
        setIsMusicPlaying(false)
      } else {
        musicRef.current.volume = 0
        musicRef.current
          .play()
          .then(() => {
            setIsMusicPlaying(true)
            let currentVolume = 0
            const fadeInInterval = setInterval(() => {
              if (currentVolume < 0.316) {
                currentVolume = Math.min(0.316, currentVolume + 0.032)
                if (musicRef.current) musicRef.current.volume = currentVolume
              } else {
                clearInterval(fadeInInterval)
              }
            }, 30)
          })
          .catch(() => {
            // Play failed
          })
      }
    }
  }

  const toggleGridVisibility = () => {
    setIsGridVisible((prev) => !prev)
  }

  const handleScroll = (direction: "up" | "down") => {
    if (direction === "up") {
      setStartRow((prev) => Math.max(0, prev - 1))
    } else {
      setStartRow((prev) => Math.min(totalRows - visibleRows, prev + 1))
    }
    setHoveredId(null)
  }

  const handleTileClick = (id: string) => {
    if (selectedId === id) {
      setHoveredId(null)
    }
    const newSelectedId = selectedId === id ? null : id
    setSelectedId(newSelectedId)

    if (newSelectedId !== null) {
      if (selectSoundRef.current) {
        selectSoundRef.current.pause()
        selectSoundRef.current.currentTime = 0
        selectSoundRef.current.play().catch(() => {})
      }

      setIsSelectionAnimating(true)
      setShowStarBurst(true)
      setTimeout(() => setIsSelectionAnimating(false), 200)
      setTimeout(() => setShowStarBurst(false), 600)
    }
  }

  const handleMint = () => {
    if (selectedId && !claimedIds.includes(selectedId)) {
      setShowMintModal(true)
    }
  }

  const handleModalClose = () => {
    setShowMintModal(false)
    if (selectedId && !claimedIds.includes(selectedId)) {
      claimCharacter(selectedId)
      setClaimedIds(getClaimedIds())
      setSelectedId(null)
      toast({
        title: "Success",
        description: `Character ${selectedId} has been minted!`,
      })
    }
  }

  const handleScrollbarMouseDown = (e: MouseEvent) => {
    setIsDragging(true)
    e.preventDefault()
  }

  const handleTileHover = (id: string) => {
    setHoveredId(id)

    if (isMobile && !hasShownScrollOverlay && !showScrollOverlay) {
      setShowScrollOverlay(true)
    }
  }

  const handleCloseScrollOverlay = () => {
    setShowScrollOverlay(false)
    setHasShownScrollOverlay(true)
    localStorage.setItem("scroll-hint-shown", "true")
  }

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      scrollAccumulator.current += e.deltaY

      const threshold = 150

      if (Math.abs(scrollAccumulator.current) >= threshold) {
        if (scrollAccumulator.current > 0) {
          handleScroll("down")
        } else {
          handleScroll("up")
        }
        scrollAccumulator.current = 0
      }
    }

    window.addEventListener("wheel", handleWheel, { passive: true })
    return () => window.removeEventListener("wheel", handleWheel)
  }, [totalRows, visibleRows]) // added dependencies so handleScroll has current values

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!scrollbarRef.current) return

      const rect = scrollbarRef.current.getBoundingClientRect()
      const relativeY = e.clientY - rect.top
      const percentage = Math.max(0, Math.min(1, relativeY / rect.height))

      const newRow = Math.round(percentage * (totalRows - visibleRows))
      setStartRow(Math.max(0, Math.min(totalRows - visibleRows, newRow)))
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, totalRows, visibleRows])

  useEffect(() => {
    if (hoveredId && hoverSoundRef.current) {
      hoverSoundRef.current.pause()
      hoverSoundRef.current.currentTime = 0
      hoverSoundRef.current.play().catch(() => {})
    }
  }, [hoveredId])

  const isSelectedClaimed = selectedId ? claimedIds.includes(selectedId) : false

  const handleLoadComplete = () => {
    setIsLoading(false)
  }

  const showUpArrow = startRow > 0
  const showDownArrow = startRow < totalRows - visibleRows
  const w = viewport.w

  const touchStartY = useRef(0)
  const touchAccumulator = useRef(0)

  useEffect(() => {
    if (!isMobile) return

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY
      touchAccumulator.current = 0
    }

    const handleTouchMove = (e: TouchEvent) => {
      const touchY = e.touches[0].clientY
      const deltaY = touchStartY.current - touchY
      touchAccumulator.current += deltaY
      touchStartY.current = touchY

      const threshold = 50

      if (Math.abs(touchAccumulator.current) >= threshold) {
        if (touchAccumulator.current > 0) {
          handleScroll("down")
        } else {
          handleScroll("up")
        }
        touchAccumulator.current = 0
      }
    }

    window.addEventListener("touchstart", handleTouchStart, { passive: true })
    window.addEventListener("touchmove", handleTouchMove, { passive: true })

    return () => {
      window.removeEventListener("touchstart", handleTouchStart)
      window.removeEventListener("touchmove", handleTouchMove)
    }
  }, [isMobile, totalRows, visibleRows])

  if (isLoading) {
    return <TraitLoader onComplete={handleLoadComplete} />
  }

  return (
    <div className="h-[100svh] overflow-hidden bg-background grid grid-rows-[auto,1fr,auto] relative">
      <Starfield />

      <div className="fog-container" />
      <div className="fixed top-0 left-0 right-0 h-48 bg-gradient-to-b from-black/40 via-black/20 to-transparent z-20 pointer-events-none" />
      <header className="relative z-30 flex flex-col items-center justify-center w-full pt-6 md:pt-10 select-none gap-0.5 mx-auto sm:-translate-x-[25px] lg:translate-x-0">
        <img
          src="/header.png"
          alt="Perma Raiders"
          className="object-contain select-none h-14 sm:h-20 md:h-24 lg:h-32"
        />
        <p className="text-white/100 font-mono font-normal tracking-wide select-none text-[10px] sm:text-xs">
          pfp collection
        </p>
        <p className="text-white/70 font-mono font-normal select-none text-[9px] sm:text-[11px]">
          select character to mint
        </p>
      </header>
      {isMobile && <ScrollGestureOverlay showOverlay={showScrollOverlay} onClose={handleCloseScrollOverlay} />}
      <div className="fixed right-4 top-4 z-30 flex flex-col gap-0.5">
        <button
          onClick={() => setShowStoryModal(!showStoryModal)}
          aria-label="Show story"
          className="cursor-pointer hover:opacity-80 transition-opacity text-white w-4 sm:w-5 md:w-6 h-4 sm:h-5 md:h-6"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full py-px px-[0-10px] px-[0]"
          >
            <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" fill="none" />
            <circle cx="12" cy="8" r="1" fill="white" />
            <rect x="11" y="11" width="2" height="7" rx="1" fill="white" />
          </svg>
        </button>
        <button
          onClick={toggleMusic}
          aria-label="Toggle music"
          className="cursor-pointer hover:opacity-80 transition-opacity text-white w-4 sm:w-5 md:w-6 h-4 sm:h-5 md:h-6"
        >
          {isMusicPlaying ? (
            <Volume2 className="w-full h-full px-[0x] my-0 py-px" />
          ) : (
            <VolumeX className="w-full h-full py-px" />
          )}
        </button>
        <div className="relative">
          <button
            onClick={toggleGridVisibility}
            aria-label={isGridVisible ? "Hide grid" : "Show grid"}
            className="cursor-pointer hover:opacity-80 transition-opacity text-white w-4 sm:w-5 md:w-6 h-4 sm:h-5 md:h-6 group"
          >
            {isGridVisible ? <Eye className="w-full h-full py-px" /> : <EyeOff className="w-full h-full" />}
            <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              <div className="bg-black/90 text-white text-xs px-2 py-1 rounded font-mono">
                {isGridVisible ? "hide grid" : "show grid"}
              </div>
            </div>
          </button>
        </div>
      </div>
      <div
        className={cn("pointer-events-none z-0", "fixed inset-0", "sm:left-0 sm:right-auto")}
        style={{
          width: isMobile ? "100%" : w >= 1024 ? "58vw" : "100%",
          maxWidth: isMobile ? "none" : w >= 1024 ? "900px" : "none",
        }}
      >
        <div className="relative h-full w-full overflow-hidden">
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/20 via-black/10 to-transparent z-10 pointer-events-none" />
          <div
            className={cn(
              "absolute flex items-end justify-center",
              "lg:justify-start lg:translate-x-0",
              isMobile ? "h-auto bottom-0" : "h-full",
            )}
            style={{
              width: "100%",
              transform: isMobile ? "translateX(20px)" : undefined,
              overflow: "visible",
            }}
          >
            <div
              className="relative"
              style={{
                width: "100%",
                height: isMobile ? "auto" : "100%",
                overflow: "visible",
              }}
            >
              <img
                key={heroPopTrigger}
                src={heroUrls[`hero${displayedHeroId || "/placeholder.svg"}`] || heroUrls["hero000"]}
                alt={displayedHeroId ? `Hero ${displayedHeroId}` : "Hero"}
                className={cn(
                  "transition-all select-none",
                  "lg:h-full lg:w-auto lg:object-contain lg:origin-bottom-left lg:scale-105 lg:ml-8",
                  "sm:h-auto sm:w-full sm:max-h-full sm:object-contain sm:origin-bottom sm:scale-100",
                  "h-auto w-full object-cover object-bottom origin-bottom scale-[1.8]",
                  isMobile ? (isGridVisible ? "opacity-30" : "opacity-100") : "opacity-100",
                  isSelectionAnimating ? "duration-100 ease-out brightness-110" : "duration-500 ease-in",
                  displayedHeroId && claimedIds.includes(displayedHeroId) && "opacity-50",
                  !prefersReducedMotion && heroPopTrigger > 0 && "animate-hero-pop",
                )}
                style={{
                  maskImage:
                    w >= 1024
                      ? "linear-gradient(to right, transparent 0%, black 15%, black 70%, transparent 100%)"
                      : w >= 640
                        ? "linear-gradient(to bottom, black 60%, transparent 100%)"
                        : "none",
                  WebkitMaskImage:
                    w >= 1024
                      ? "linear-gradient(to right, transparent 0%, black 15%, black 70%, transparent 100%)"
                      : w >= 640
                        ? "linear-gradient(to bottom, black 60%, transparent 100%)"
                        : "none",
                  transformOrigin: "bottom center",
                  willChange: !prefersReducedMotion && heroPopTrigger > 0 ? "transform" : "auto",
                }}
                onError={(e) => {
                  e.currentTarget.src = heroUrls["hero000"]
                  setIsHeroLoading(false)
                }}
                onLoad={() => {
                  setIsHeroLoading(false)
                }}
              />
            </div>
          </div>
        </div>
      </div>
      <main
        className={cn(
          "relative z-20 flex items-center justify-center select-none transition-opacity duration-300 min-h-0 sm:-translate-x-[25px] lg:translate-x-0 w-full mx-auto",
        )}
      >
        <div
          className={cn(
            "flex items-stretch gap-2 sm:gap-3 origin-center transition-opacity duration-300",
            !isGridVisible && "opacity-0 pointer-events-none",
          )}
          style={{ transform: gridScale === 1 ? undefined : `scale(${gridScale})` }}
        >
          <div
            className="grid grid-cols-5 sm:grid-cols-11 isolation-auto my-0 mt-0 flex-shrink-0"
            style={{
              gap: `${gapSize}px`,
              width: gridWidthValue,
              height: gridHeightValue,
              alignContent: "start",
            }}
          >
            {visibleCharacters.map((char) => (
              <CharacterTile
                key={char.id}
                id={char.id}
                index={char.index}
                traitIds={char.traitIds}
                isSelected={selectedId === char.id}
                isClaimed={claimedIds.includes(char.id)}
                isRevealed={revealedTiles.has(char.id)}
                onHover={() => handleTileHover(char.id)}
                onLeave={() => setHoveredId(null)}
                onClick={() => handleTileClick(char.id)}
              />
            ))}
          </div>
          <div
            className="hidden sm:flex flex-col items-center justify-between shrink-0 px-0.5 relative"
            style={{
              height: gridHeightValue,
            }}
          >
            <button
              className="shrink-0 cursor-pointer hover:text-white/80 transition-colors text-white flex items-center justify-center w-6 md:w-7 h-6 md:h-7"
              onClick={() => handleScroll("up")}
              disabled={!showUpArrow}
            >
              <ChevronUp className="w-4 md:w-5 h-4 md:h-5" />
            </button>
            <div
              ref={scrollbarRef}
              className="relative w-1 my-1 bg-white/10 flex-1 cursor-pointer"
              onMouseDown={handleScrollbarMouseDown}
            >
              <div
                className="absolute left-0 right-0 bg-white/40 transition-all duration-200 rounded-full pointer-events-none"
                style={{
                  height: `${(visibleRows / totalRows) * 100}%`,
                  top: `${(startRow / (totalRows - visibleRows)) * (100 - (visibleRows / totalRows) * 100)}%`,
                }}
              />
            </div>
            <button
              className="shrink-0 cursor-pointer hover:text-white/80 transition-colors text-white flex items-center justify-center my-1 w-6 md:w-7 h-6 md:h-7"
              onClick={() => handleScroll("down")}
              disabled={!showDownArrow}
            >
              <ChevronDown className="w-4 md:w-5 h-4 md:h-5" />
            </button>
          </div>
        </div>
      </main>
      <footer className="relative z-30 flex items-center justify-center w-full pb-6 mx-auto sm:-translate-x-[25px] lg:translate-x-0">
        <div className="flex gap-2 items-end justify-center flex-row h-[56px] sm:h-[64px] md:h-[72px]">
          {selectedId && (
            <>
              <Button
                size="lg"
                className={cn(
                  "font-semibold bg-zinc-700 hover:bg-zinc-600 text-white relative overflow-hidden border-2 cursor-pointer px-4 sm:px-5 md:px-6 py-3 sm:py-3.5 md:py-4 text-sm sm:text-base min-w-[120px] sm:min-w-[130px] md:min-w-[140px]",
                  selectedId && !claimedIds.includes(selectedId) && !isMinting ? "border-white" : "border-transparent",
                )}
                onClick={handleMint}
                disabled={!selectedId || (selectedId ? claimedIds.includes(selectedId) : false) || isMinting}
              >
                <span className="relative z-10">{isMinting ? "Minting..." : "Mint PFP"}</span>
              </Button>
              <div className="flex items-center gap-0.5 animate-in fade-in-0 zoom-in-95 duration-200 flex-col">
                <span className="text-white/70 font-mono font-normal select-none whitespace-nowrap text-[8px] sm:text-[9px] md:text-[10px]">
                  {selectedId} selected
                </span>
                <div
                  className="relative border-2 border-white rounded overflow-hidden shrink-0 h-10 sm:h-12 md:h-14"
                  style={{
                    aspectRatio: "1",
                  }}
                >
                  <img
                    src={traitUrls[`trait${selectedId || "/placeholder.svg"}`] || `/traits/trait${selectedId}.png`}
                    alt={`Trait ${selectedId}`}
                    className="object-cover select-none leading-4 h-full w-full"
                    crossOrigin="anonymous"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </footer>
      <div
        className={cn(
          "fixed left-0 right-0 z-20 select-none transition-opacity duration-300 flex justify-center py-2.5",
        )}
        style={{
          bottom: isMobile ? "32px" : "0px",
        }}
      >
        {displayedHeroId && displayedHeroId !== "000" && (
          <div className="absolute bottom-[calc(2rem+20px)] sm:bottom-[20px] md:bottom-[20px] left-[66px] md:left-[400px] lg:left-15 pointer-events-none animate-in slide-in-from-left-8 duration-300 hidden sm:block pb-6">
            <p
              className="text-white font-bold text-5xl md:text-6xl tracking-wider"
              style={{
                textShadow:
                  "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, -3px 0 0 #000, 3px 0 0 #000, 0 -3px 0 #000, 0 3px 0 #000",
              }}
            >
              {displayedHeroId.toString().padStart(3, "0")}
            </p>
          </div>
        )}
      </div>
      <Toaster />
      <MintModal isOpen={showMintModal} characterId={selectedId || ""} onClose={handleModalClose} />
      <StoryModal isOpen={showStoryModal} onClose={() => setShowStoryModal(false)} />
      <a
        href="https://t.me/permaraidz"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed z-30 select-none cursor-pointer w-5 sm:w-6 h-5 sm:h-6"
        style={{
          bottom: isMobile ? "12px" : "24px",
          right: isMobile ? "12px" : "24px",
        }}
      >
        <img
          src="https://ik.imagekit.io/peterlikesthis/permaraiderz/telegram.png"
          alt="Telegram"
          className="select-none brightness-0 invert w-full h-full"
        />
      </a>
    </div>
  )
}
