"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { CharacterTile } from "@/components/character-tile"
import { CharacterDetails } from "@/components/character-details"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"
import { characters } from "@/lib/characters"
import { getClaimedIds, claimCharacter, clearAllClaimed } from "@/lib/mintAdapter"
import { ChevronUp, ChevronDown, Volume2, VolumeX, Eye, EyeOff, RotateCcw } from "lucide-react"
import { Starfield } from "@/components/starfield"
import { MintModal } from "@/components/mint-modal"
import { TraitLoader } from "@/components/trait-loader"
import { ScrollGestureOverlay } from "@/components/scroll-gesture-overlay"
import { cn } from "@/lib/utils"
import { heroUrls } from "@/lib/hero-urls"
import { traitUrls } from "@/lib/trait-urls"
import { StoryModal } from "@/components/story-modal"

/*
 * Layout
 * ------
 * Two layouts, switched purely in CSS by the `wide` variant (see globals.css):
 *   - portrait  : logo, hero, grid, character details, mint bar — stacked.
 *   - wide      : (landscape and at least 768px wide) hero on the left,
 *                 logo / grid / details / mint bar in a column on the right.
 * Inside each layout everything scales fluidly; the grid measures the space
 * it has and picks its column count and tile size to fit.
 */

const GRID_GAP = 6
const TILE_TARGET = 56 // tile size the grid aims for when choosing columns
const TILE_MAX = 76
const MIN_COLS = 5
const MAX_COLS = 11
const RAIL_WIDTH = 28 // scroll arrows + bar beside the grid

function computeGrid(width: number, height: number) {
  const usableW = Math.max(0, width - RAIL_WIDTH - GRID_GAP)
  const cols = Math.max(
    MIN_COLS,
    Math.min(MAX_COLS, Math.floor((usableW + GRID_GAP) / (TILE_TARGET + GRID_GAP)) || MIN_COLS),
  )
  let tile = Math.min(TILE_MAX, (usableW - GRID_GAP * (cols - 1)) / cols)
  let rows = Math.floor((height + GRID_GAP) / (tile + GRID_GAP))
  if (rows < 2) {
    rows = 2
    tile = (height - GRID_GAP) / 2
  }
  const totalRows = Math.ceil(characters.length / cols)
  rows = Math.min(rows, totalRows)
  tile = Math.max(24, Math.floor(tile))
  return { cols, rows, tile, totalRows }
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)
  const [startRow, setStartRow] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [claimedIds, setClaimedIds] = useState<string[]>([])
  const { toast } = useToast()
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [showMintModal, setShowMintModal] = useState(false)
  const displayedHeroId = hoveredId || selectedId || "000"
  const [isSelectionAnimating, setIsSelectionAnimating] = useState(false)
  const hoverSoundRef = useRef<HTMLAudioElement | null>(null)
  const scrollAccumulator = useRef(0)
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
  const musicRef = useRef<HTMLAudioElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const scrollbarRef = useRef<HTMLDivElement | null>(null)
  const selectSoundRef = useRef<HTMLAudioElement | null>(null)
  const [isTouch, setIsTouch] = useState(false)
  const [showScrollOverlay, setShowScrollOverlay] = useState(false)
  const [hasShownScrollOverlay, setHasShownScrollOverlay] = useState(false)
  const [showStoryModal, setShowStoryModal] = useState(false)
  const [isGridVisible, setIsGridVisible] = useState(true)
  const [heroPopTrigger, setHeroPopTrigger] = useState(0)
  const gridAreaRef = useRef<HTMLDivElement | null>(null)
  const [grid, setGrid] = useState({ cols: MAX_COLS, rows: 6, tile: 60, totalRows: Math.ceil(characters.length / MAX_COLS) })
  const prefersReducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

  const { cols: gridCols, rows: visibleRows, tile: tileSize, totalRows } = grid
  const maxStartRow = Math.max(0, totalRows - visibleRows)
  const visibleCharacters = characters.slice(startRow * gridCols, (startRow + visibleRows) * gridCols)
  const gridWidthPx = tileSize * gridCols + GRID_GAP * (gridCols - 1)
  const gridHeightPx = tileSize * visibleRows + GRID_GAP * (visibleRows - 1)

  // Measure the space the grid has and fit columns / rows / tile size to it.
  useEffect(() => {
    const el = gridAreaRef.current
    if (!el) return
    const measure = () => {
      const { width, height } = el.getBoundingClientRect()
      if (width > 0 && height > 0) setGrid(computeGrid(width, height))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [isLoading])

  // Keep the scroll position valid when the grid shape changes.
  useEffect(() => {
    setStartRow((prev) => Math.min(prev, maxStartRow))
  }, [maxStartRow])

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)")
    const update = () => setIsTouch(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  // Minted characters are remembered in this browser (localStorage).
  useEffect(() => {
    setClaimedIds(getClaimedIds())
  }, [])

  useEffect(() => {
    characters.forEach((char) => {
      const traitId = char.traitIds.length > 0 ? char.traitIds[0] : `trait${char.id}`
      const img = new Image()
      img.src = traitUrls[traitId] || `/traits/${traitId}.png`
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
    if (localStorage.getItem("scroll-hint-shown") === "true") {
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
    if (!musicRef.current) return
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
        .catch(() => {})
    }
  }

  const handleScroll = useCallback(
    (direction: "up" | "down") => {
      setStartRow((prev) => (direction === "up" ? Math.max(0, prev - 1) : Math.min(maxStartRow, prev + 1)))
      setHoveredId(null)
    },
    [maxStartRow],
  )

  const handleTileClick = (id: string) => {
    if (selectedId === id) setHoveredId(null)
    const newSelectedId = selectedId === id ? null : id
    setSelectedId(newSelectedId)

    if (newSelectedId !== null) {
      if (selectSoundRef.current) {
        selectSoundRef.current.pause()
        selectSoundRef.current.currentTime = 0
        selectSoundRef.current.play().catch(() => {})
      }
      setIsSelectionAnimating(true)
      setTimeout(() => setIsSelectionAnimating(false), 200)
    }
  }

  const handleMint = () => {
    if (selectedId && !claimedIds.includes(selectedId)) setShowMintModal(true)
  }

  // Called by the modal once the simulated mint has finished.
  const handleMinted = async (id: string) => {
    await claimCharacter(id)
    setClaimedIds(getClaimedIds())
  }

  const handleModalClose = () => {
    setShowMintModal(false)
    if (selectedId && getClaimedIds().includes(selectedId)) {
      toast({ title: "Minted", description: `Raider #${selectedId} is yours.` })
      setSelectedId(null)
      setHoveredId(null)
    }
  }

  const handleResetMints = () => {
    clearAllClaimed()
    setClaimedIds([])
    toast({ title: "Demo reset", description: "All raiders are available to mint again." })
  }

  const handleTileHover = (id: string) => {
    setHoveredId(id)
    if (isTouch && !hasShownScrollOverlay && !showScrollOverlay) setShowScrollOverlay(true)
  }

  const handleCloseScrollOverlay = () => {
    setShowScrollOverlay(false)
    setHasShownScrollOverlay(true)
    localStorage.setItem("scroll-hint-shown", "true")
  }

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      scrollAccumulator.current += e.deltaY
      if (Math.abs(scrollAccumulator.current) >= 150) {
        handleScroll(scrollAccumulator.current > 0 ? "down" : "up")
        scrollAccumulator.current = 0
      }
    }
    window.addEventListener("wheel", handleWheel, { passive: true })
    return () => window.removeEventListener("wheel", handleWheel)
  }, [handleScroll])

  useEffect(() => {
    if (!isDragging) return
    const handleMouseMove = (e: MouseEvent) => {
      if (!scrollbarRef.current) return
      const rect = scrollbarRef.current.getBoundingClientRect()
      const percentage = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
      setStartRow(Math.round(percentage * maxStartRow))
    }
    const handleMouseUp = () => setIsDragging(false)
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, maxStartRow])

  useEffect(() => {
    if (hoveredId && hoverSoundRef.current) {
      hoverSoundRef.current.pause()
      hoverSoundRef.current.currentTime = 0
      hoverSoundRef.current.play().catch(() => {})
    }
  }, [hoveredId])

  const touchStartY = useRef(0)
  const touchAccumulator = useRef(0)

  // Swipe to scroll the grid on touch screens.
  useEffect(() => {
    if (!isTouch) return
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY
      touchAccumulator.current = 0
    }
    const handleTouchMove = (e: TouchEvent) => {
      const touchY = e.touches[0].clientY
      touchAccumulator.current += touchStartY.current - touchY
      touchStartY.current = touchY
      if (Math.abs(touchAccumulator.current) >= 50) {
        handleScroll(touchAccumulator.current > 0 ? "down" : "up")
        touchAccumulator.current = 0
      }
    }
    window.addEventListener("touchstart", handleTouchStart, { passive: true })
    window.addEventListener("touchmove", handleTouchMove, { passive: true })
    return () => {
      window.removeEventListener("touchstart", handleTouchStart)
      window.removeEventListener("touchmove", handleTouchMove)
    }
  }, [isTouch, handleScroll])

  if (isLoading) {
    return <TraitLoader onComplete={() => setIsLoading(false)} />
  }

  const showUpArrow = startRow > 0
  const showDownArrow = startRow < maxStartRow
  const isDisplayedClaimed = displayedHeroId !== "000" && claimedIds.includes(displayedHeroId)
  const isSelectedClaimed = selectedId ? claimedIds.includes(selectedId) : false
  const thumbRatio = visibleRows / totalRows

  return (
    <div className="h-[100svh] overflow-hidden bg-background relative flex flex-col wide:flex-row">
      <Starfield />
      <div className="fog-container" />
      <div className="fixed top-0 left-0 right-0 h-48 bg-gradient-to-b from-black/40 via-black/20 to-transparent z-20 pointer-events-none" />

      {/* ---------- Hero ---------- */}
      <section className="relative order-2 wide:order-none flex-1 min-h-0 wide:min-w-0 z-0 pointer-events-none select-none">
        <img
          key={heroPopTrigger}
          src={heroUrls[`hero${displayedHeroId}`] || heroUrls["hero000"]}
          alt={displayedHeroId !== "000" ? `Raider ${displayedHeroId}` : ""}
          className={cn(
            "hero-image absolute bottom-0 max-w-none aspect-square",
            // Height is always tied to the viewport height, never the width.
            // A narrower screen just crops the sides; the character stays centred.
            // portrait: 55% of the screen height, sitting on top of the grid
            "h-[55svh] left-1/2 -translate-x-1/2",
            // wide: full screen height, centred in the left area and spilling under the grid column
            "wide:h-[100svh]",
            "transition-[opacity,filter] select-none",
            isDisplayedClaimed ? "opacity-50" : "opacity-100",
            isSelectionAnimating ? "duration-100 ease-out brightness-110" : "duration-500 ease-in",
            !prefersReducedMotion && heroPopTrigger > 0 && "animate-hero-pop",
          )}
          style={{ transformOrigin: "bottom center" }}
          onError={(e) => {
            e.currentTarget.src = heroUrls["hero000"]
          }}
        />
        {displayedHeroId !== "000" && (
          <p
            key={displayedHeroId}
            className="hidden wide:block absolute left-6 bottom-6 text-white font-bold tracking-wider text-[clamp(2.5rem,5vw,4rem)] leading-none animate-in slide-in-from-left-8 duration-300"
            style={{
              textShadow:
                "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, -3px 0 0 #000, 3px 0 0 #000, 0 -3px 0 #000, 0 3px 0 #000",
            }}
          >
            {displayedHeroId}
          </p>
        )}
      </section>

      {/* ---------- Content column (flattened into the page in portrait) ---------- */}
      <div className="contents wide:relative wide:z-20 wide:flex wide:flex-col wide:w-[58vw] wide:max-w-[1100px] wide:h-full wide:shrink-0 wide:pr-14">
        <header className="order-1 wide:order-none relative z-30 flex flex-col items-center w-full pt-[clamp(10px,2.5svh,40px)] pb-1 wide:pb-3 select-none gap-0.5 shrink-0">
          <img src="/header.png" alt="Perma Raiders" className="object-contain select-none h-[clamp(36px,7.5svh,120px)]" />
          <p className="text-white font-mono tracking-wide text-[10px] sm:text-xs">pfp collection</p>
          <p className="text-white/70 font-mono text-[9px] sm:text-[11px]">select character to mint</p>
        </header>

        <main
          className={cn(
            "order-3 wide:order-none relative z-20 shrink-0 wide:flex-1 wide:min-h-0 select-none",
            "@container px-4 wide:px-0 w-full",
            "transition-opacity duration-300",
            !isGridVisible && "opacity-0 pointer-events-none",
          )}
        >
          <div className="h-full flex flex-col @min-[720px]:flex-row items-stretch gap-3 @min-[720px]:gap-6">
            {/* The grid measures this box */}
            <div
              ref={gridAreaRef}
              className="relative min-w-0 h-[clamp(130px,28svh,360px)] wide:h-auto wide:flex-1 @min-[720px]:flex-1"
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-stretch" style={{ gap: GRID_GAP }}>
                  <div
                    className="grid shrink-0"
                    style={{
                      gap: `${GRID_GAP}px`,
                      gridTemplateColumns: `repeat(${gridCols}, ${tileSize}px)`,
                      gridAutoRows: `${tileSize}px`,
                      width: gridWidthPx,
                      height: gridHeightPx,
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
                        isRevealed
                        onHover={() => handleTileHover(char.id)}
                        onLeave={() => setHoveredId(null)}
                        onClick={() => handleTileClick(char.id)}
                      />
                    ))}
                  </div>

                  <div
                    className="flex flex-col items-center justify-between shrink-0"
                    style={{ height: gridHeightPx, width: RAIL_WIDTH - GRID_GAP }}
                  >
                    <button
                      className="shrink-0 cursor-pointer text-white hover:text-white/80 disabled:opacity-30 disabled:cursor-default transition flex items-center justify-center w-6 h-6"
                      onClick={() => handleScroll("up")}
                      disabled={!showUpArrow}
                      aria-label="Scroll up"
                    >
                      <ChevronUp className="w-5 h-5" />
                    </button>
                    <div
                      ref={scrollbarRef}
                      className="relative w-1 my-1 bg-white/10 flex-1 cursor-pointer rounded-full"
                      onMouseDown={(e) => {
                        setIsDragging(true)
                        e.preventDefault()
                      }}
                    >
                      <div
                        className="absolute left-0 right-0 bg-white/40 transition-all duration-200 rounded-full pointer-events-none"
                        style={{
                          height: `${thumbRatio * 100}%`,
                          top: `${maxStartRow === 0 ? 0 : (startRow / maxStartRow) * (100 - thumbRatio * 100)}%`,
                        }}
                      />
                    </div>
                    <button
                      className="shrink-0 cursor-pointer text-white hover:text-white/80 disabled:opacity-30 disabled:cursor-default transition flex items-center justify-center w-6 h-6"
                      onClick={() => handleScroll("down")}
                      disabled={!showDownArrow}
                      aria-label="Scroll down"
                    >
                      <ChevronDown className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <CharacterDetails
              id={displayedHeroId === "000" ? null : displayedHeroId}
              isMinted={isDisplayedClaimed}
              className="shrink-0 self-center w-full max-w-[560px] @min-[720px]:w-[clamp(170px,22cqw,240px)]"
            />
          </div>
        </main>

        {/* Mint bar — fixed height so nothing shifts when a character is selected */}
        <footer className="order-4 wide:order-none relative z-30 flex items-center justify-center w-full h-[clamp(72px,11svh,96px)] pb-3 shrink-0">
          {selectedId ? (
            <div className="flex gap-3 items-center animate-in fade-in-0 zoom-in-95 duration-200">
              <Button
                size="lg"
                className={cn(
                  "font-semibold bg-zinc-700 hover:bg-zinc-600 text-white border-2 cursor-pointer px-6 min-w-[140px]",
                  isSelectedClaimed ? "border-transparent" : "border-white",
                )}
                onClick={handleMint}
                disabled={isSelectedClaimed}
              >
                {isSelectedClaimed ? "Minted" : "Mint PFP"}
              </Button>
              <div className="relative border-2 border-white rounded overflow-hidden shrink-0 h-12 aspect-square">
                <img
                  src={traitUrls[`trait${selectedId}`] || `/traits/trait${selectedId}.png`}
                  alt={`Raider ${selectedId}`}
                  className="object-cover select-none h-full w-full"
                  crossOrigin="anonymous"
                />
              </div>
            </div>
          ) : (
            <p className="text-white/50 font-mono text-[10px] sm:text-xs">pick a raider to mint</p>
          )}
        </footer>
      </div>

      {/* ---------- Corner controls ---------- */}
      {isTouch && <ScrollGestureOverlay showOverlay={showScrollOverlay} onClose={handleCloseScrollOverlay} />}
      <div className="fixed right-4 top-4 z-30 flex flex-col gap-1">
        <button
          onClick={() => setShowStoryModal(!showStoryModal)}
          aria-label="Show story"
          className="cursor-pointer hover:opacity-80 transition-opacity text-white w-5 h-5 sm:w-6 sm:h-6"
        >
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full py-px">
            <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" fill="none" />
            <circle cx="12" cy="8" r="1" fill="white" />
            <rect x="11" y="11" width="2" height="7" rx="1" fill="white" />
          </svg>
        </button>
        <button
          onClick={toggleMusic}
          aria-label="Toggle music"
          className="cursor-pointer hover:opacity-80 transition-opacity text-white w-5 h-5 sm:w-6 sm:h-6"
        >
          {isMusicPlaying ? <Volume2 className="w-full h-full py-px" /> : <VolumeX className="w-full h-full py-px" />}
        </button>
        <IconButton
          label={isGridVisible ? "hide grid" : "show grid"}
          onClick={() => setIsGridVisible((v) => !v)}
        >
          {isGridVisible ? <Eye className="w-full h-full py-px" /> : <EyeOff className="w-full h-full py-px" />}
        </IconButton>
        {claimedIds.length > 0 && (
          <IconButton label="reset demo mints" onClick={handleResetMints}>
            <RotateCcw className="w-full h-full p-0.5" />
          </IconButton>
        )}
      </div>

      <a
        href="https://t.me/permaraidz"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed z-30 select-none cursor-pointer w-5 h-5 sm:w-6 sm:h-6 right-4 bottom-4 sm:right-6 sm:bottom-6"
        aria-label="Telegram"
      >
        <img
          src="https://ik.imagekit.io/peterlikesthis/permaraiderz/telegram.png"
          alt=""
          className="select-none brightness-0 invert w-full h-full"
        />
      </a>

      <Toaster />
      <MintModal
        isOpen={showMintModal}
        characterId={selectedId || ""}
        onMinted={handleMinted}
        onClose={handleModalClose}
      />
      <StoryModal isOpen={showStoryModal} onClose={() => setShowStoryModal(false)} />
    </div>
  )
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="cursor-pointer text-white w-5 h-5 sm:w-6 sm:h-6 group relative"
    >
      <div className="hover:opacity-80 transition-opacity w-full h-full">{children}</div>
      <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 group-hover:block hidden pointer-events-none whitespace-nowrap">
        <div className="bg-white text-black text-[9px] px-2 py-1 rounded font-mono">{label}</div>
      </div>
    </button>
  )
}
