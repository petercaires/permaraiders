"use client"

import { useEffect, useState, useRef } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Confetti } from "@/components/confetti"

interface MintModalProps {
  isOpen: boolean
  characterId: string
  /** Fired once the simulated mint has completed */
  onMinted: (id: string) => void
  onClose: () => void
}

export function MintModal({ isOpen, characterId, onMinted, onClose }: MintModalProps) {
  const [isLoading, setIsLoading] = useState(true)
  const successSoundRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    successSoundRef.current = new Audio(
      "https://ik.imagekit.io/peterlikesthis/permaraiderz/permaraiderz%20sfx/mint%20positive.wav",
    )
    successSoundRef.current.volume = 0.398
    successSoundRef.current.preload = "auto"
    successSoundRef.current.load()
  }, [])

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      const timer = setTimeout(() => {
        setIsLoading(false)
        onMinted(characterId)
        if (successSoundRef.current) {
          successSoundRef.current.currentTime = 0
          successSoundRef.current.play().catch((err) => console.error("Success sound play failed:", err))
        }
      }, 2000)
      // Closing before the mint finishes cancels it, so nothing is marked as minted
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      <Confetti isActive={!isLoading && isOpen} />

      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/30" onClick={onClose} />

        <div className="relative bg-background rounded-lg p-6 md:p-6 max-w-[240px] md:max-w-xs w-full mx-4 shadow-2xl">
          <Button variant="ghost" size="icon" className="absolute top-2 right-2 w-8 h-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>

          <div className="flex flex-col items-center gap-6">
            <h2 className="text-2xl font-bold text-center">{isLoading ? "Minting..." : "It's yours!"}</h2>

            {isLoading ? (
              <div className="relative w-12 h-12">
                <svg className="animate-spin w-12 h-12" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="opacity-25"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray="200"
                    strokeDashoffset="50"
                    strokeLinecap="round"
                    className="text-primary"
                  />
                </svg>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <svg
                  className="w-8 h-8 text-green-500"
                  fill="none"
                  strokeWidth="3"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-center text-muted-foreground">Raider #{characterId} is now yours.</p>
                <Button className="w-full cursor-pointer" onClick={onClose}>
                  Done
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
