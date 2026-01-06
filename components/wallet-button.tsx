"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { connectWallet, disconnectWallet, getWalletConnection } from "@/lib/mintAdapter"
import { useToast } from "@/hooks/use-toast"

interface WalletButtonProps {
  onConnectionChange: (connected: boolean) => void
}

export function WalletButton({ onConnectionChange }: WalletButtonProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [address, setAddress] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const connection = getWalletConnection()
    if (connection) {
      setIsConnected(true)
      setAddress(connection.address)
      onConnectionChange(true)
    }
  }, [])

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      const connection = await connectWallet()
      setIsConnected(true)
      setAddress(connection.address)
      onConnectionChange(true)
      toast({
        title: "Wallet connected",
        description: `Connected to ${connection.address.slice(0, 6)}...${connection.address.slice(-4)}`,
      })
    } catch (error) {
      toast({
        title: "Connection failed",
        description: "Failed to connect wallet",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = () => {
    disconnectWallet()
    setIsConnected(false)
    setAddress("")
    onConnectionChange(false)
    toast({
      title: "Wallet disconnected",
    })
  }

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(address)
    toast({
      title: "Address copied",
      description: "Wallet address copied to clipboard",
    })
  }

  if (!isConnected) {
    return (
      <Button onClick={handleConnect} disabled={isConnecting} variant="outline">
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </Button>
    )
  }

  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="font-mono bg-transparent">
          {shortAddress}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCopyAddress}>Copy address</DropdownMenuItem>
        <DropdownMenuItem onClick={handleDisconnect}>Disconnect</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
