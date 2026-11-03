"use client"

import { useEffect, useRef, useState } from "react"
import { traitUrls } from "@/lib/trait-urls"
import { heroUrls } from "@/lib/hero-urls"

interface TraitLoaderProps {
  onComplete: () => void
}

export function TraitLoader({ onComplete }: TraitLoaderProps) {
  const [progress, setProgress] = useState(0)
  const [isFadingOut, setIsFadingOut] = useState(false)
  // The page re-renders while this loads, handing over a new onComplete each time;
  // keep the latest in a ref so preloading starts once instead of restarting on every render
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    // Wait only for the small tile art and the blank hero. The full-size heroes (~50MB) keep
    // downloading after the page shows; one not loaded yet just appears a moment late on first hover.
    const allImages = [...Object.values(traitUrls), heroUrls.hero000]

    let loadedCount = 0
    const totalImages = allImages.length

    const preloadImage = (src: string) => {
      return new Promise<void>((resolve) => {
        const img = new Image()
        img.onload = () => {
          loadedCount++
          setProgress((loadedCount / totalImages) * 100)
          resolve()
        }
        img.onerror = () => {
          loadedCount++
          setProgress((loadedCount / totalImages) * 100)
          resolve()
        }
        img.src = src
      })
    }

    Promise.all(allImages.map(preloadImage)).then(() => {
      Object.values(heroUrls).forEach((src) => (new Image().src = src))
      setTimeout(() => {
        setIsFadingOut(true)
        setTimeout(() => {
          onCompleteRef.current()
        }, 400)
      }, 500)
    })
  }, [])

  return (
    <div
      className={`fixed inset-0 z-50 h-screen flex flex-col items-center justify-center pb-[33svh] wide:pb-[8svh] bg-gradient-to-b from-zinc-900 via-zinc-950 to-black transition-opacity duration-400 ${
        isFadingOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="fog-container" />

      {/* Mobile: upper third. Desktop: optical centre (a touch above the true middle, which reads as centred) */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-5 wide:gap-8">
        <img src="/header.png" alt="Perma Raiders" className="h-20 wide:h-[clamp(120px,18svh,180px)] w-auto object-contain" />

        <div className="w-40 wide:w-72 h-3 wide:h-3.5 border border-white/80 rounded p-1">
          <div
            className="h-full bg-white rounded-sm transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
