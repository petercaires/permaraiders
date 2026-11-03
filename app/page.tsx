"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { CharacterTile } from "@/components/character-tile"
import { CharacterDetails } from "@/components/character-details"
import { CharacterPanel, PANEL_MAX_WIDTH, PANEL_PAD, PANEL_GAP, PANEL_RAIL } from "@/components/character-panel"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"
import { characters, getRarity, rarityBgClass } from "@/lib/characters"
import { getClaimedIds, claimCharacter, clearAllClaimed } from "@/lib/mintAdapter"
import { ChevronUp, ChevronDown, Volume2, VolumeX, Eye, EyeOff, RotateCcw, Check } from "lucide-react"
import { Starfield } from "@/components/starfield"
import { MintStage, type MintPhase } from "@/components/mint-stage"
import { TraitLoader } from "@/components/trait-loader"
import { cn } from "@/lib/utils"
import { heroUrls } from "@/lib/hero-urls"
import { traitUrls } from "@/lib/trait-urls"

/*
 * Layout
 * ------
 * Two layouts, switched purely in CSS by the `wide` variant (see globals.css):
 *   - portrait  : logo, hero, grid, character details, mint bar — stacked.
 *   - wide      : (landscape and at least 768px wide) hero on the left,
 *                 logo / grid / details / mint bar in a column on the right.
 * Inside each layout everything scales fluidly; the character menu keeps a fixed
 * shape (columns × rows) and scales uniformly to fit the space it has.
 */

// The character menu has a fixed shape per layout and scales as one piece:
// tiles AND gaps grow and shrink together, so it never jumps between column counts.
const MENU_SHAPE = {
  wide: { cols: 11, rows: 6 },
  portrait: { cols: 5, rows: 3 },
}
const GAP_RATIO = 0.09 // gap as a fraction of the tile size
const RAIL_WIDTH = 28 // scroll arrows + bar beside the menu
const WIDE_QUERY = "(orientation: landscape) and (min-width: 768px)" // same as the `wide` CSS variant
const WIDE_BREAKPOINT = 768 // px, where the layout switches to the phone layout

// Desktop hero: the artwork has empty space on its left (~10% of the image width, shared by every
// raider since they're all remixes of one base). At full browser width that gap is left as is; as the
// window narrows towards the breakpoint the hero slides left so the gap closes to 5% of its full size.
const HERO_ART_GAP = 0.1 // left gap as a fraction of the hero's width
const HERO_GAP_AT_BREAKPOINT = 0.05 // fraction of the gap still showing at the breakpoint

function computeGrid(width: number, height: number, isWide: boolean) {
  const { cols, rows } = isWide ? MENU_SHAPE.wide : MENU_SHAPE.portrait
  const usableW = Math.max(0, width - RAIL_WIDTH)
  // largest tile where cols × rows (plus proportional gaps) fits the box, in both directions
  const fitW = usableW / (cols + (cols - 1) * GAP_RATIO)
  const fitH = height / (rows + (rows - 1) * GAP_RATIO)
  const tile = Math.max(20, Math.min(fitW, fitH))
  const gap = tile * GAP_RATIO
  const totalRows = Math.ceil(characters.length / cols)
  return { cols, rows: Math.min(rows, totalRows), tile, gap, totalRows }
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)
  const [startRow, setStartRow] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [claimedIds, setClaimedIds] = useState<string[]>([])
  const { toast } = useToast()
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [mintPhase, setMintPhase] = useState<MintPhase>("idle")
  const [mintingId, setMintingId] = useState<string | null>(null)
  const successSoundRef = useRef<HTMLAudioElement | null>(null)
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
  const [isGridVisible, setIsGridVisible] = useState(true)
  const [heroPopTrigger, setHeroPopTrigger] = useState(0)
  const gridAreaRef = useRef<HTMLDivElement | null>(null)
  const [isWide, setIsWide] = useState(true)
  const [grid, setGrid] = useState(() => computeGrid(375, 180, false))
  const prefersReducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

  const { cols: gridCols, rows: visibleRows, tile: tileSize, gap: gridGap, totalRows } = grid
  const maxStartRow = Math.max(0, totalRows - visibleRows)
  const visibleCharacters = characters.slice(startRow * gridCols, (startRow + visibleRows) * gridCols)
  const gridWidthPx = tileSize * gridCols + gridGap * (gridCols - 1)
  const gridHeightPx = tileSize * visibleRows + gridGap * (visibleRows - 1)

  // Demo-level image protection: block right-click, drag and long-press saving on images
  useEffect(() => {
    const block = (e: Event) => {
      if (e.target instanceof HTMLImageElement) e.preventDefault()
    }
    document.addEventListener("contextmenu", block)
    document.addEventListener("dragstart", block)
    return () => {
      document.removeEventListener("contextmenu", block)
      document.removeEventListener("dragstart", block)
    }
  }, [])

  // Desktop hero gap: 0 at full screen width, rising to 1 at the breakpoint
  useEffect(() => {
    const update = () => {
      const fullWidth = Math.max(window.screen.width, WIDE_BREAKPOINT + 1)
      const closing = Math.min(1, Math.max(0, (fullWidth - window.innerWidth) / (fullWidth - WIDE_BREAKPOINT)))
      // hero width = hero height = viewport height on desktop
      const shift = closing * (1 - HERO_GAP_AT_BREAKPOINT) * HERO_ART_GAP * window.innerHeight
      document.documentElement.style.setProperty("--hero-shift", `${shift}px`)
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  // Which layout is active (matches the `wide` CSS variant)
  useEffect(() => {
    const mq = window.matchMedia(WIDE_QUERY)
    const update = () => setIsWide(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  // Phone layout: measure the space the menu has and scale its fixed 5 × 3 shape to fit.
  // (Desktop uses CharacterPanel, which sizes itself.)
  useEffect(() => {
    if (isWide) return
    const el = gridAreaRef.current
    if (!el) return
    const measure = () => {
      const width = el.getBoundingClientRect().width
      // Height budget for the menu: 28% of the screen, between 130 and 360px.
      // The menu area then hugs the menu itself, so the box inset stays even all round.
      const height = Math.min(360, Math.max(130, window.innerHeight * 0.28))
      if (width > 0) setGrid(computeGrid(width, height, false))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener("resize", measure)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [isLoading, isWide])

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

    successSoundRef.current = new Audio(
      "https://ik.imagekit.io/peterlikesthis/permaraiderz/permaraiderz%20sfx/mint%20positive.wav",
    )
    successSoundRef.current.volume = 0.398
    successSoundRef.current.preload = "auto"
    successSoundRef.current.load()
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
          // Browsers block sound until the visitor interacts, so start the music on their first click, tap or key press.
          // A first click on the music button itself is left to that button.
          const startOnFirstInteraction = (e: Event) => {
            removeListeners()
            const target = e.target as Element | null
            if (target?.closest?.('[aria-label="Toggle music"]')) return
            const music = musicRef.current
            if (!music || !music.paused) return
            music.volume = 0
            music
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
              .catch(() => {})
          }
          const events = ["pointerdown", "keydown", "touchstart"] as const
          const removeListeners = () =>
            events.forEach((ev) => document.removeEventListener(ev, startOnFirstInteraction, true))
          events.forEach((ev) => document.addEventListener(ev, startOnFirstInteraction, true))
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

  // Mint plays out inside the menu box: minting (2s, no cancel) → success → back to raiders
  const handleMint = () => {
    if (mintPhase !== "idle" || !selectedId || claimedIds.includes(selectedId)) return
    setMintingId(selectedId)
    setMintPhase("minting")
  }

  useEffect(() => {
    if (mintPhase !== "minting" || !mintingId) return
    const timer = setTimeout(async () => {
      await claimCharacter(mintingId)
      setClaimedIds(getClaimedIds())
      setMintPhase("success")
      if (successSoundRef.current) {
        successSoundRef.current.currentTime = 0
        successSoundRef.current.play().catch(() => {})
      }
    }, 2000)
    return () => clearTimeout(timer)
  }, [mintPhase, mintingId])

  const handleBackToRaiders = () => {
    setMintPhase("idle")
    setMintingId(null)
    setSelectedId(null)
    setHoveredId(null)
  }

  const isMintActive = mintPhase !== "idle"

  const handleResetMints = () => {
    if (mintPhase === "minting") return
    clearAllClaimed()
    setClaimedIds([])
    setMintingId(null)
    setSelectedId(null)
    setHoveredId(null)
    setMintPhase("reset")
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
    if (isWide) return
    const handleWheel = (e: WheelEvent) => {
      scrollAccumulator.current += e.deltaY
      if (Math.abs(scrollAccumulator.current) >= 150) {
        handleScroll(scrollAccumulator.current > 0 ? "down" : "up")
        scrollAccumulator.current = 0
      }
    }
    window.addEventListener("wheel", handleWheel, { passive: true })
    return () => window.removeEventListener("wheel", handleWheel)
  }, [handleScroll, isWide])

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
  // Full hero art (already loaded for the selected raider), scaled down in the mint portrait so it stays sharp
  const mintImage = mintingId ? heroUrls[`hero${mintingId}`] || traitUrls[`trait${mintingId}`] || "" : ""
  const thumbRatio = visibleRows / totalRows
  const actionId = selectedId ?? (hoveredId || null)

  return (
    <div className="h-[100svh] overflow-hidden bg-background relative flex flex-col wide:flex-row font-mono">
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
            // portrait: 55% of the screen height, centred (narrow phones crop both sides equally)
            "h-[55svh] left-1/2 -translate-x-1/2 translate-y-[10svh] wide:translate-y-0",
            // wide: full screen height, left edge pinned so the left is never cropped;
            // a narrower screen slides more of the right side under the menu column instead
            "wide:h-[100svh] wide:left-0 wide:translate-x-[calc(var(--hero-shift,0px)*-1)]",
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
      </section>

      {/* ---------- Content column (flattened into the page in portrait) ---------- */}
      <div className="contents wide:relative wide:z-20 wide:flex wide:flex-col wide:w-[58vw] wide:max-w-[1100px] wide:h-full wide:shrink-0 wide:pr-14">
        {/*
          Vertical rhythm (one spacing scale, grouped by proximity):
            logo group  —(section gap)—  grid  —(12px)—  [details + action row, 8px apart]  —(bottom breathing room)
          The details and the action row both describe the current raider, so they sit closest together.
        */}
        <header
          className="order-1 wide:order-none relative z-30 flex flex-col items-center w-full shrink-0 select-none gap-1 pt-4 pb-[clamp(12px,3svh,32px)] wide:pb-[clamp(8px,1.5svh,16px)]"
        >
          <img src="/header.png" alt="Perma Raiders" className="object-contain select-none h-[clamp(36px,7.5svh,112px)]" />
          <p className="hidden wide:block text-white text-sm">pfp collection</p>
          <p className="hidden wide:block text-white/70 text-sm">select character to mint</p>
        </header>

        <main
          className={cn(
            "order-3 wide:order-none relative z-20 shrink-0 wide:flex-1 wide:min-h-0 select-none",
            "px-4 wide:px-0 w-full pb-[clamp(28px,6svh,72px)]",
            "flex flex-col items-center",
          )}
        >
          {/* One visual block: character sheet + description in a single 25% black box, 12px inset all round */}
          <div
            className={cn(
              "w-full min-h-0 flex flex-col gap-3 p-3 rounded-md wide:bg-black/30 wide:flex-1 transition-opacity duration-300",
              !isGridVisible && "opacity-0 pointer-events-none",
            )}
            style={{ maxWidth: (isWide ? PANEL_MAX_WIDTH : gridWidthPx + RAIL_WIDTH) + 24 }}
            // While the menu is hidden, nothing inside (back button, Mint, tiles) can be clicked, tapped or tabbed to
            inert={!isGridVisible}
          >
          {isWide && (
            <div className="relative flex-1 min-h-0 flex">
              <CharacterPanel
                className={cn(
                  "flex-1 transition-opacity duration-300",
                  (!isGridVisible || isMintActive) && "opacity-0 pointer-events-none",
                )}
                selectedId={selectedId}
                claimedIds={claimedIds}
                onHover={handleTileHover}
                onLeave={() => setHoveredId(null)}
                onSelect={handleTileClick}
              />
              <MintStage phase={mintPhase} id={mintingId} imageSrc={mintImage} rarity={getRarity(mintingId)} onBack={handleBackToRaiders} />
            </div>
          )}

          {/* Phone menu: the grid measures this box */}
          {!isWide && (
          <div
            ref={gridAreaRef}
            style={{ height: gridHeightPx }}
            className={cn(
              "relative w-full min-w-0 shrink-0",
              "transition-opacity duration-300",
              !isGridVisible && "opacity-0 pointer-events-none",
            )}
          >
            <div
              className={cn(
                "absolute inset-0 flex items-end justify-center transition-opacity duration-300",
                isMintActive && "opacity-0 pointer-events-none",
              )}
            >
              <div className="flex items-stretch" style={{ gap: gridGap }}>
                <div
                  className="grid shrink-0"
                  style={{
                    gap: `${gridGap}px`,
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
                  style={{ height: gridHeightPx, width: RAIL_WIDTH - gridGap }}
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
            <MintStage phase={mintPhase} id={mintingId} imageSrc={mintImage} rarity={getRarity(mintingId)} onBack={handleBackToRaiders} />
          </div>

          )}

          {/* Details + action row: flush with the tiles' edges (not the scroll rail), fixed height so nothing shifts */}
          <div
            className={cn(
              "w-full shrink-0 flex flex-col gap-2 transition-opacity duration-300",
              !isGridVisible && "opacity-0 pointer-events-none",
            )}
            style={
              isWide
                ? { paddingLeft: PANEL_PAD, paddingRight: PANEL_PAD + PANEL_GAP + PANEL_RAIL }
                : { paddingRight: RAIL_WIDTH }
            }
          >
            <CharacterDetails id={displayedHeroId === "000" ? null : displayedHeroId} isMinted={isDisplayedClaimed} />

            <div className="flex items-center justify-between gap-3 h-10 wide:h-12">
              <p
                key={actionId ?? "none"}
                className={cn(
                  "font-bold tracking-wider leading-none text-[clamp(24px,3.6svh,34px)] wide:text-[clamp(28px,4.5svh,48px)] tabular-nums",
                  selectedId ? "text-white animate-in fade-in-0 slide-in-from-left-2 duration-200" : "text-white/30",
                )}
                style={{
                  textShadow:
                    "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, -3px 0 0 #000, 3px 0 0 #000, 0 -3px 0 #000, 0 3px 0 #000",
                }}
              >
                {actionId ?? "---"}
              </p>

              <div className="flex items-center gap-2">
                <Button
                  className={cn(
                    "relative overflow-hidden h-10 wide:h-12 font-mono text-base font-bold bg-zinc-700 hover:bg-zinc-600 text-white border-2 cursor-pointer px-4 wide:px-6 min-w-[108px] wide:min-w-[132px]",
                    selectedId && !isSelectedClaimed ? "border-white" : "border-transparent",
                    mintPhase === "minting" && "disabled:opacity-100",
                  )}
                  onClick={handleMint}
                  disabled={!selectedId || isSelectedClaimed || isMintActive}
                >
                  {mintPhase === "minting" ? (
                    <>
                      Minting…
                      <span className="mint-progress absolute left-0 bottom-0 h-[3px] w-full bg-white" />
                    </>
                  ) : isSelectedClaimed ? (
                    <>
                      Minted <Check className="w-4 h-4" />
                    </>
                  ) : (
                    "Mint PFP"
                  )}
                </Button>
                <div
                  className={cn(
                    "relative rounded overflow-hidden shrink-0 h-10 wide:h-12 aspect-square border-2",
                    !selectedId && "border-dashed border-white/25",
                    selectedId &&
                      (getRarity(selectedId) === "PermaRare"
                        ? "border-[rgb(255_214_92)]"
                        : getRarity(selectedId) === "Rare"
                          ? "border-[rgb(207_213_220)]"
                          : "border-white"),
                    selectedId && rarityBgClass(getRarity(selectedId)),
                    selectedId && rarityBgClass(getRarity(selectedId)) && "rarity-swirl [--rarity-blur:10px]",
                  )}
                >
                  {selectedId && (
                    <img
                      key={selectedId}
                      src={traitUrls[`trait${selectedId}`] || `/traits/trait${selectedId}.png`}
                      alt={`Raider ${selectedId}`}
                      className="object-cover select-none h-full w-full animate-in fade-in-0 zoom-in-95 duration-200"
                      crossOrigin="anonymous"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
          </div>
        </main>
      </div>

      {/* ---------- Corner controls ---------- */}
      <div className="fixed right-4 top-4 z-40 flex flex-col gap-1">
        <button
          onClick={toggleMusic}
          aria-label="Toggle music"
          // Nudged right for optical balance with the icons below; a transform, so the column itself doesn't move
          className="cursor-pointer hover:opacity-80 transition-opacity text-white w-5 h-5 sm:w-6 sm:h-6 translate-x-[2px]"
        >
          {isMusicPlaying ? <Volume2 className="w-full h-full py-px" /> : <VolumeX className="w-full h-full py-px" />}
        </button>
        <IconButton
          label={isGridVisible ? "hide grid" : "show grid"}
          onClick={() => setIsGridVisible((v) => !v)}
        >
          {isGridVisible ? <Eye className="w-full h-full py-px" /> : <EyeOff className="w-full h-full py-px" />}
        </IconButton>
        <a
          href="https://t.me/permaraidz"
          target="_blank"
          rel="noopener noreferrer"
          className="select-none cursor-pointer hover:opacity-80 transition-opacity w-5 h-5 sm:w-6 sm:h-6 p-0.5"
          aria-label="Telegram"
        >
          <img
            src="https://ik.imagekit.io/peterlikesthis/permaraiderz/telegram.png"
            alt=""
            className="select-none brightness-0 invert w-full h-full"
          />
        </a>
        {claimedIds.length > 0 && (
          <IconButton label="reset demo mints" onClick={handleResetMints} disabled={!isGridVisible}>
            <RotateCcw className="w-full h-full p-0.5" />
          </IconButton>
        )}
      </div>

      <Toaster />
    </div>
  )
}

function IconButton({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className="cursor-pointer text-white w-5 h-5 sm:w-6 sm:h-6 group relative transition-opacity disabled:opacity-30 disabled:cursor-default"
    >
      <div className="group-enabled:hover:opacity-80 transition-opacity w-full h-full">{children}</div>
      <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 group-enabled:group-hover:block hidden pointer-events-none whitespace-nowrap">
        <div className="bg-white text-black text-[11px] uppercase tracking-wider px-2 py-1 rounded">{label}</div>
      </div>
    </button>
  )
}
