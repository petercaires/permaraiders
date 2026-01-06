"use client"

import { useState, useEffect } from "react"
import { X, Hand } from "lucide-react"

interface ScrollGestureOverlayProps {
  showOverlay: boolean
  onClose: () => void
}

export function ScrollGestureOverlay({ showOverlay, onClose }: ScrollGestureOverlayProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (showOverlay) {
      setIsVisible(true)
    }
  }, [showOverlay])

  const handleClose = () => {
    setIsVisible(false)
    onClose()
  }

  if (!isVisible) return null

  return (
    <div
      className="fixed inset-0 z-50 sm:hidden flex items-center justify-center backdrop-blur-sm bg-black/40 animate-in fade-in duration-500"
      onClick={handleClose}
    >
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 p-1 text-white/80 hover:text-white transition-colors"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Gesture content */}
      <div className="flex flex-col items-center gap-6">
        {/* Animated hand icon */}
        <div className="animate-bounce">
          <Hand className="w-16 h-16 text-white" strokeWidth={1.5} />
        </div>

        {/* Text */}
        <p className="text-white text-lg font-medium tracking-wide">Scroll to view more</p>
      </div>
    </div>
  )
}
