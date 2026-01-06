"use client"

import { useEffect, useState } from "react"
import { traitUrls } from "@/lib/trait-urls"
import { heroUrls } from "@/lib/hero-urls"

interface TraitLoaderProps {
  onComplete: () => void
}

export function TraitLoader({ onComplete }: TraitLoaderProps) {
  const [progress, setProgress] = useState(0)
  const [isFadingOut, setIsFadingOut] = useState(false)

  useEffect(() => {
    const allTraitUrls = Object.values(traitUrls)
    const allHeroUrls = Object.values(heroUrls)
    const allImages = [...allTraitUrls, ...allHeroUrls]

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
      setTimeout(() => {
        setIsFadingOut(true)
        setTimeout(() => {
          onComplete()
        }, 400)
      }, 500)
    })
  }, [onComplete])

  return (
    <div
      className={`fixed inset-0 z-50 h-screen flex flex-col items-center justify-center bg-gradient-to-b from-zinc-900 via-zinc-950 to-black transition-opacity duration-400 ${
        isFadingOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="fog-container" />

      <div className="relative z-10 flex flex-col items-center justify-center gap-8 md:gap-12">
        <img src="/header.png" alt="Perma Raiders" className="h-16 md:h-20 w-auto object-contain" />

        <div className="w-48 md:w-64 h-3 md:h-3.5 border border-white/80 rounded p-1">
          <div
            className="h-full bg-white rounded-sm transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
