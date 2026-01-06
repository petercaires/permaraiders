"use client"

import { X } from "lucide-react"

interface StoryModalProps {
  isOpen: boolean
  onClose: () => void
}

export function StoryModal({ isOpen, onClose }: StoryModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative bg-background rounded-lg p-6 md:p-8 max-w-[240px] md:max-w-xs w-full mx-4 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          <X className="w-3 h-3" />
        </button>

        <div className="flex flex-col gap-2 text-center text-xs md:text-sm font-mono">
          <p className="text-sm">After the Great Ending, they fled to Earth.</p>
          <p className="text-sm">Now they follow one rule: </p>
          <p className="text-sm">Raid posts, spread the Permaweb.</p>
        </div>
      </div>
    </div>
  )
}
