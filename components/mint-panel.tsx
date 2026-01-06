"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { claimCharacter } from "@/lib/mintAdapter"
import { useToast } from "@/hooks/use-toast"

interface MintPanelProps {
  selectedCharacterId: string | null
  isConnected: boolean
  isClaimed: boolean
  onMintSuccess: () => void
  onConnectWallet: () => void
}

export function MintPanel({
  selectedCharacterId,
  isConnected,
  isClaimed,
  onMintSuccess,
  onConnectWallet,
}: MintPanelProps) {
  const [isMinting, setIsMinting] = useState(false)
  const { toast } = useToast()

  const handleMint = async () => {
    if (!selectedCharacterId) return

    setIsMinting(true)
    try {
      await claimCharacter(selectedCharacterId)
      toast({
        title: "Success!",
        description: `Minted character #${selectedCharacterId}`,
      })
      onMintSuccess()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mint character",
        variant: "destructive",
      })
    } finally {
      setIsMinting(false)
    }
  }

  const getButtonState = () => {
    if (!isConnected) {
      return {
        text: "Connect wallet to mint",
        disabled: true,
        onClick: onConnectWallet,
      }
    }

    if (!selectedCharacterId) {
      return {
        text: "Select PFP",
        disabled: true,
        onClick: () => {},
      }
    }

    if (isClaimed) {
      return {
        text: "Unavailable",
        disabled: true,
        onClick: () => {},
      }
    }

    return {
      text: isMinting ? "Minting..." : "Mint PFP",
      disabled: isMinting,
      onClick: handleMint,
    }
  }

  const buttonState = getButtonState()

  return (
    <div className="space-y-4 p-6 rounded-lg bg-card border border-border">
      <div className="space-y-2">
        <h3 className="text-lg font-bold">Mint Character</h3>
        <p className="text-sm text-muted-foreground">
          {isConnected ? "Select a character from the grid to mint" : "Connect your wallet to get started"}
        </p>
      </div>

      <Button
        onClick={buttonState.onClick}
        disabled={buttonState.disabled}
        className="w-full h-12 text-base font-bold uppercase tracking-wide"
        style={
          !buttonState.disabled && buttonState.text === "Mint PFP"
            ? { animation: "mintPulse 2s ease-in-out infinite" }
            : undefined
        }
        size="lg"
      >
        {buttonState.text}
      </Button>
    </div>
  )
}
