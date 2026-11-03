"use client"

import { useState, useEffect, useRef, useCallback, type CSSProperties } from "react"
import { CharacterDetails } from "@/components/character-details"
import { CharacterPanel, PANEL_MAX_WIDTH, PANEL_PAD, PANEL_GAP, PANEL_RAIL } from "@/components/character-panel"
import { getRarity, rarityBgClass, RARITY_RGB } from "@/lib/characters"
import { getClaimedIds, claimCharacter, clearAllClaimed } from "@/lib/mintAdapter"
import { Volume2, VolumeX, Eye, EyeOff, RotateCcw, Check } from "lucide-react"
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
 *   - portrait  : logo, hero, character sheet, details, mint bar — stacked.
 *   - wide      : (landscape and at least 768px wide) hero on the left,
 *                 logo / character sheet / details / mint bar in a column on the right.
 * Both use the same CharacterPanel: 5 fixed columns on phones, as many as fit on desktop.
 */

const WIDE_BREAKPOINT = 768 // px, where the layout switches to the phone layout

// Desktop hero: the artwork has empty space on its left (~10% of the image width, shared by every
// raider since they're all remixes of one base). At full browser width that gap is left as is; as the
// window narrows towards the breakpoint the hero slides left so the gap closes to 5% of its full size.
const HERO_ART_GAP = 0.1 // left gap as a fraction of the hero's width
const HERO_GAP_AT_BREAKPOINT = 0.05 // fraction of the gap still showing at the breakpoint

// Audio
const SFX = "https://ik.imagekit.io/peterlikesthis/permaraiderz/permaraiderz%20sfx/"
const MUSIC_VOLUME = 0.316 // about -10 dB
const SFX_VOLUME = 0.5
const SUCCESS_VOLUME = 0.398 // about -8 dB

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [claimedIds, setClaimedIds] = useState<string[]>([])
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [mintPhase, setMintPhase] = useState<MintPhase>("idle")
  const [mintingId, setMintingId] = useState<string | null>(null)
  const successSoundRef = useRef<HTMLAudioElement | null>(null)
  const displayedHeroId = hoveredId || selectedId || "000"
  const hoverSoundRef = useRef<HTMLAudioElement | null>(null)
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
  // The volume button mutes everything: music and sound effects
  const soundOnRef = useRef(true)
  const fadeRef = useRef<number | undefined>(undefined)
  const musicRef = useRef<HTMLAudioElement | null>(null)
  const selectSoundRef = useRef<HTMLAudioElement | null>(null)
  const [isTouch, setIsTouch] = useState(false)
  const [isGridVisible, setIsGridVisible] = useState(true)
  const [heroPopTrigger, setHeroPopTrigger] = useState(0)
  const prefersReducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches


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
    const load = (file: string, volume: number) => {
      const audio = new Audio(SFX + file)
      audio.volume = volume
      audio.preload = "auto"
      return audio
    }
    selectSoundRef.current = load("select.wav", SFX_VOLUME)
    hoverSoundRef.current = load("hover.wav", SFX_VOLUME)
    successSoundRef.current = load("mint%20positive.wav", SUCCESS_VOLUME)
    musicRef.current = load("loop.wav", MUSIC_VOLUME)
    musicRef.current.loop = true
    return () => {
      musicRef.current?.pause()
      clearInterval(fadeRef.current)
    }
  }, [])

  /** Fade the music to a volume over `ms`, then pause it if the target is silence. One fade at a time. */
  const fadeMusic = useCallback((to: number, ms: number) => {
    const music = musicRef.current
    if (!music) return
    clearInterval(fadeRef.current)
    const from = music.volume
    const start = performance.now()
    fadeRef.current = window.setInterval(() => {
      const t = Math.min(1, (performance.now() - start) / ms)
      music.volume = from + (to - from) * t
      if (t === 1) {
        clearInterval(fadeRef.current)
        if (to === 0) music.pause()
      }
    }, 30)
  }, [])

  /** Start the music from silence and fade it in. Rejects if the browser blocks autoplay. */
  const startMusic = useCallback(
    (fadeMs: number) => {
      const music = musicRef.current
      if (!music) return Promise.reject()
      clearInterval(fadeRef.current)
      music.volume = 0
      return music.play().then(() => {
        setIsMusicPlaying(true)
        fadeMusic(MUSIC_VOLUME, fadeMs)
      })
    },
    [fadeMusic],
  )

  useEffect(() => {
    if (!isLoading && musicRef.current) {
      startMusic(1000).catch(() => {
          // Browsers block sound until the visitor interacts, so start the music on their first click, tap or key press.
          // A first click on the music button itself is left to that button.
          const startOnFirstInteraction = (e: Event) => {
            removeListeners()
            const target = e.target as Element | null
            if (target?.closest?.("[data-music-toggle]")) return
            if (!musicRef.current?.paused) return
            startMusic(1000).catch(() => {})
          }
          const events = ["pointerdown", "keydown", "touchstart"] as const
          const removeListeners = () =>
            events.forEach((ev) => document.removeEventListener(ev, startOnFirstInteraction, true))
          events.forEach((ev) => document.addEventListener(ev, startOnFirstInteraction, true))
        })
    }
  }, [isLoading, startMusic])

  // Selection feedback: the hero pops (and briefly brightens) via the hero-pop animation
  useEffect(() => {
    if (selectedId && !prefersReducedMotion) setHeroPopTrigger((prev) => prev + 1)
  }, [selectedId, prefersReducedMotion])

  // The volume button mutes everything: music fades out/in, sound effects stop/start
  const toggleMusic = () => {
    if (isMusicPlaying) {
      soundOnRef.current = false
      setIsMusicPlaying(false)
      fadeMusic(0, 300)
    } else {
      soundOnRef.current = true
      startMusic(300).catch(() => {})
    }
  }

  const handleTileClick = (id: string) => {
    if (selectedId === id) setHoveredId(null)
    const newSelectedId = selectedId === id ? null : id
    setSelectedId(newSelectedId)

    if (newSelectedId !== null) {
      if (selectSoundRef.current && soundOnRef.current) {
        selectSoundRef.current.pause()
        selectSoundRef.current.currentTime = 0
        selectSoundRef.current.play().catch(() => {})
      }
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
    const timer = setTimeout(() => {
      claimCharacter(mintingId)
      setClaimedIds(getClaimedIds())
      setMintPhase("success")
      if (successSoundRef.current && soundOnRef.current) {
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

  useEffect(() => {
    if (hoveredId && !isTouch && hoverSoundRef.current && soundOnRef.current) {
      hoverSoundRef.current.pause()
      hoverSoundRef.current.currentTime = 0
      hoverSoundRef.current.play().catch(() => {})
    }
  }, [hoveredId, isTouch])

  if (isLoading) {
    return <TraitLoader onComplete={() => setIsLoading(false)} />
  }

  const isDisplayedClaimed = displayedHeroId !== "000" && claimedIds.includes(displayedHeroId)
  const isSelectedClaimed = selectedId ? claimedIds.includes(selectedId) : false
  // Full hero art (already loaded for the selected raider), scaled down in the mint portrait so it stays sharp
  const mintImage = mintingId ? heroUrls[`hero${mintingId}`] || traitUrls[`trait${mintingId}`] || "" : ""
  const actionId = selectedId ?? (hoveredId || null)

  return (
    <div className="h-[100svh] overflow-hidden bg-background relative flex flex-col wide:flex-row font-mono">
      <Starfield />
      <div className="fog-container" />

      {/* ---------- Hero ---------- */}
      <section className="relative order-2 wide:order-none flex-1 min-h-0 wide:min-w-0 z-0 pointer-events-none select-none">
        <img
          key={heroPopTrigger}
          src={heroUrls[`hero${displayedHeroId}`] || heroUrls["hero000"]}
          alt={displayedHeroId !== "000" ? `Raider ${displayedHeroId}` : ""}
          className={cn(
            "hero-fade absolute bottom-0 max-w-none aspect-square",
            // Height is always tied to the viewport height, never the width.
            // portrait: 55% of the screen height, centred (narrow phones crop both sides equally)
            "h-[55svh] left-1/2 -translate-x-1/2 translate-y-[10svh] wide:translate-y-0",
            // wide: full screen height, left edge pinned so the left is never cropped;
            // a narrower screen slides more of the right side under the menu column instead
            "wide:h-[100svh] wide:left-0 wide:translate-x-[calc(var(--hero-shift,0px)*-1)]",
            "transition-[opacity,filter] select-none",
            isDisplayedClaimed ? "opacity-50" : "opacity-100",
            "duration-500 ease-in",
            !prefersReducedMotion && heroPopTrigger > 0 && "animate-hero-pop",
          )}
          style={{ transformOrigin: "bottom center" }}
          onError={(e) => {
            if (e.currentTarget.src !== heroUrls["hero000"]) e.currentTarget.src = heroUrls["hero000"]
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
          {/* One visual block: character sheet + description in a single box (30% black on desktop), 12px inset all round */}
          <div
            className={cn(
              "@container w-full max-w-[651px] wide:max-w-[var(--box-max)] min-h-0 flex flex-col gap-3 p-3 rounded-md wide:bg-black/30 wide:flex-1 transition-opacity duration-300",
              !isGridVisible && "opacity-0 pointer-events-none",
            )}
            // Portrait: at most 651px wide, so 3 rows of 5 stay within 360px tall (tablets). Wide: the panel's max + inset
            style={{ ["--box-max" as string]: `${PANEL_MAX_WIDTH + 24}px` } as CSSProperties}
            // While the menu is hidden, nothing inside (back button, Mint, tiles) can be clicked, tapped or tabbed to
            inert={!isGridVisible}
          >
          {/* Character sheet; the mint sequence plays over it. Phones: 5 columns, exactly 3 rows tall
              (tile = (width − 60px of rail, gaps and padding) / 5, so 3 rows = 3/5 of that + 20px) */}
          <div className="relative flex min-h-0 shrink-0 h-[calc((100cqw_-_60px)_*_0.6_+_20px)] wide:h-auto wide:flex-1">
            <CharacterPanel
              className={cn(
                "flex-1 transition-opacity duration-300",
                (!isGridVisible || isMintActive) && "opacity-0 pointer-events-none",
              )}
              selectedId={selectedId}
              claimedIds={claimedIds}
              onHover={setHoveredId}
              onLeave={() => setHoveredId(null)}
              onSelect={handleTileClick}
              tooltipHidden={!isGridVisible || isMintActive}
            />
            <MintStage phase={mintPhase} id={mintingId} imageSrc={mintImage} rarity={getRarity(mintingId)} onBack={handleBackToRaiders} />
          </div>

          {/* Details + action row: flush with the tiles' edges (not the scroll rail), fixed height so nothing shifts */}
          <div
            className={cn(
              "w-full shrink-0 flex flex-col gap-1 wide:gap-2 transition-opacity duration-300",
              !isGridVisible && "opacity-0 pointer-events-none",
            )}
            style={{ paddingLeft: PANEL_PAD, paddingRight: PANEL_PAD + PANEL_GAP + PANEL_RAIL }}
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
                <button
                  className={cn(
                    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md transition-all shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
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
                </button>
                <div
                  className={cn(
                    "relative rounded overflow-hidden shrink-0 h-10 wide:h-12 aspect-square border-2",
                    !selectedId && "border-dashed border-white/25",
                    selectedId && "border-[rgb(var(--outline))]",
                    selectedId && rarityBgClass(getRarity(selectedId)),
                    selectedId && rarityBgClass(getRarity(selectedId)) && "rarity-swirl [--rarity-blur:10px]",
                  )}
                  style={{ ["--outline" as string]: RARITY_RGB[getRarity(selectedId)] ?? "255 255 255" } as CSSProperties}
                >
                  {selectedId && (
                    <img
                      key={selectedId}
                      src={traitUrls[`trait${selectedId}`]}
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

      {/* ---------- Creator credit, bottom-right. Type: "meta" (11px uppercase), at the dimmed white/30 also used for the empty raider number ---------- */}
      <a
        href="https://www.twitter.com/peterlikesthis"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed z-40 bottom-2 right-4 wide:bottom-4 text-[11px] uppercase tracking-wider whitespace-nowrap text-white/30 hover:text-white transition-colors"
      >
        creator @peterlikesthis
      </a>

      {/* ---------- Corner controls ---------- */}
      <div className="fixed right-4 top-4 z-40 flex flex-col gap-1">
        <IconButton
          label={isMusicPlaying ? "mute" : "unmute"}
          onClick={toggleMusic}
          data-music-toggle
        >
          {/* Icon nudged right for optical balance with the icons below (the button and its tooltip stay aligned) */}
          {isMusicPlaying ? (
            <Volume2 className="w-full h-full py-px translate-x-[2px]" />
          ) : (
            <VolumeX className="w-full h-full py-px translate-x-[2px]" />
          )}
        </IconButton>
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
          className="group relative select-none cursor-pointer w-5 h-5 sm:w-6 sm:h-6 p-0.5"
          aria-label="telegram"
        >
          {/* Paper-plane outline, traced from the original telegram.png so it looks the same */}
          <svg
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white w-full h-full group-hover:opacity-80 transition-opacity"
            aria-hidden
          >
            <path d="M76.3 18.3L16.7 43.7Q2 50 16.6 56.5L36 65L64.5 83.3Q78 92 80.6 76.2L88.4 27.8Q91 12 76.3 18.3ZM36 65L61 40" />
          </svg>
          <Tooltip label="telegram" />
        </a>
        {claimedIds.length > 0 && (
          <IconButton label="reset demo mints" onClick={handleResetMints} disabled={!isGridVisible}>
            <RotateCcw className="w-full h-full p-0.5" />
          </IconButton>
        )}
      </div>

    </div>
  )
}

function IconButton({
  label,
  children,
  ...props
}: { label: string; children: React.ReactNode } & React.ComponentProps<"button"> & { "data-music-toggle"?: boolean }) {
  return (
    <button
      aria-label={label}
      className="cursor-pointer text-white w-5 h-5 sm:w-6 sm:h-6 group relative transition-opacity disabled:opacity-30 disabled:cursor-default"
      {...props}
    >
      <div className="group-enabled:hover:opacity-80 transition-opacity w-full h-full">{children}</div>
      <Tooltip label={label} />
    </button>
  )
}

/** Hover label to the left of a corner icon (hidden while a button is disabled) */
function Tooltip({ label }: { label: string }) {
  return (
    <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 hidden group-hover:block group-disabled:!hidden pointer-events-none whitespace-nowrap">
      <div className="bg-white text-black text-[11px] uppercase tracking-wider px-2 py-1 rounded">{label}</div>
    </div>
  )
}
