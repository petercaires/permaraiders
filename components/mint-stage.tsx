"use client"

import type { CSSProperties } from "react"
import { Undo2 } from "lucide-react"
import { Confetti } from "@/components/confetti"
import { cn } from "@/lib/utils"
import { rarityBgClass, type Rarity } from "@/lib/characters"

const STAMP: Record<Rarity, string> = {
  Common: "border-white text-white",
  Rare: "border-slate-200 text-slate-100",
  PermaRare: "border-amber-300 text-amber-300",
}
/** Outline colour by rarity (RGB triplet), matching the menu tiles */
const OUTLINE: Record<Rarity, string> = {
  Common: "255 255 255",
  Rare: "207 213 220",
  PermaRare: "255 214 92",
}
const CONFETTI: Record<Rarity, string[]> = {
  Common: ["#ffffff"],
  Rare: ["#ffffff", "#e5e7eb", "#9ca3af"],
  PermaRare: ["#fff4c2", "#f7dc7c", "#d4a017"],
}

export type MintPhase = "idle" | "minting" | "success" | "reset"

interface MintStageProps {
  phase: MintPhase
  /** Raider being minted */
  id: string | null
  imageSrc: string
  rarity: Rarity
  onBack: () => void
}

/**
 * The mint sequence, played inside the menu box instead of a popup.
 * Sits over the character sheet; the sheet fades out while this fades in.
 *   minting → portrait under a scanning shimmer, "Minting Raider 042…"
 *   success → MINTED stamp lands, "It's yours!", confetti kept inside the box, "Back to raiders"
 *   reset   → "Demo reset" confirmation, "Back to raiders"
 */
export function MintStage({ phase, id, imageSrc, rarity, onBack }: MintStageProps) {
  const rarityBg = rarityBgClass(rarity)
  const active = phase === "reset" || (phase !== "idle" && !!id)

  return (
    <div
      className={cn(
        "absolute inset-0 z-10 overflow-hidden rounded-md flex flex-row wide:flex-col items-center justify-start wide:justify-center gap-4 wide:gap-3 px-2 wide:px-4 text-white text-left wide:text-center transition-opacity duration-300",
        active ? "opacity-100" : "opacity-0 pointer-events-none",
      )}
      aria-live="polite"
    >
      {active && phase === "reset" && (
        <div className="w-full flex flex-col items-center text-center gap-4 wide:gap-5 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
          <div>
            <h2 className="text-lg wide:text-2xl font-bold leading-tight whitespace-nowrap">Demo reset</h2>
            <p className="mt-2 wide:mt-3 text-[11px] wide:text-xs text-white/70">All raiders are available to mint again.</p>
          </div>
          <BackButton onClick={onBack} />
        </div>
      )}

      {active && phase !== "reset" && (
        <>
          <Confetti isActive={phase === "success"} contained colors={CONFETTI[rarity]} />

          {/* Desktop: invisible spacer matching the message below, so the portrait itself sits at the vertical centre */}
          <div aria-hidden className="hidden wide:block shrink-0 h-[60px]" />

          {/* Portrait */}
          <div className="@container relative shrink-0 h-[96%] wide:h-[max(160px,calc(100%-144px))] max-h-[480px] min-h-[72px] aspect-square">
            <div
              className={cn(
                "relative w-full h-full rounded-md overflow-hidden border-2 transition-[border-color,filter] duration-500",
                rarityBg && cn(rarityBg, "rarity-swirl [--rarity-blur:60px]"),
                phase === "minting" ? "border-[rgb(var(--outline)/0.35)] grayscale-[60%] brightness-75" : "border-[rgb(var(--outline))]",
              )}
              style={{ ["--outline" as string]: OUTLINE[rarity] } as CSSProperties}
            >
              <img src={imageSrc} alt={`Raider ${id}`} className="w-full h-full object-cover select-none" crossOrigin="anonymous" />
              {phase === "minting" && <div className="mint-scan absolute inset-0" />}
            </div>

            {phase === "success" && (
              <div className="mint-stamp absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className={cn("px-2 py-0.5 border-[3px] font-bold tracking-[0.2em] text-[12cqw] leading-none rounded-sm bg-black/50", STAMP[rarity])}>
                  MINTED
                </span>
              </div>
            )}
          </div>

          {/* Message — same fixed height in both phases, so the portrait never moves */}
          <div className="flex-1 wide:flex-none wide:h-[60px] flex flex-col justify-center wide:justify-start items-start wide:items-center">
            {phase === "minting" ? (
              <p className="text-base font-bold leading-tight text-white/70 animate-pulse">Minting Raider {id}…</p>
            ) : (
              <div className="flex flex-col wide:flex-row items-start wide:items-center gap-3 wide:gap-5 text-left animate-in fade-in-0 slide-in-from-bottom-2 duration-300 fill-mode-both [animation-delay:250ms]">
                <div>
                  <h2 className="text-lg wide:text-2xl font-bold leading-tight whitespace-nowrap">Mint Complete</h2>
                  <p className="text-[11px] wide:text-xs text-white/70">Raider {id} is now yours.</p>
                </div>
                <BackButton onClick={onBack} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Back to raiders"
      title="Back to raiders"
      className="cursor-pointer flex items-center justify-center rounded-full border-2 border-white/50 w-10 h-10 wide:w-12 wide:h-12 transition-[transform,border-color,background-color] duration-150 hover:scale-110 hover:border-white hover:bg-white/10 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <Undo2 className="w-5 h-5 wide:w-6 wide:h-6" />
    </button>
  )
}
