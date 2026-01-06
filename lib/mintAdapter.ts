// Adapter layer for wallet connection and minting
// This can be replaced with real blockchain logic later

const STORAGE_KEY = "claimedCharacterIds"
const WALLET_KEY = "connectedWallet"

export interface WalletConnection {
  address: string
  connected: boolean
}

export async function connectWallet(): Promise<WalletConnection> {
  // Simulate connection delay
  await new Promise((resolve) => setTimeout(resolve, 800))

  // Generate mock wallet address
  const mockAddress = "0xA1b2C3d4E5f6G7h8I9j0"

  if (typeof window !== "undefined") {
    localStorage.setItem(WALLET_KEY, mockAddress)
  }

  return {
    address: mockAddress,
    connected: true,
  }
}

export function disconnectWallet(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(WALLET_KEY)
  }
}

export function getWalletConnection(): WalletConnection | null {
  if (typeof window === "undefined") return null

  const address = localStorage.getItem(WALLET_KEY)
  if (!address) return null

  return {
    address,
    connected: true,
  }
}

export function getClaimedIds(): string[] {
  if (typeof window === "undefined") return []

  const stored = localStorage.getItem(STORAGE_KEY)
  return stored ? JSON.parse(stored) : []
}

export async function claimCharacter(id: string): Promise<boolean> {
  if (typeof window === "undefined") return false

  const claimed = getClaimedIds()
  if (!claimed.includes(id)) {
    claimed.push(id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(claimed))
    return true
  }
  return false
}

export function isCharacterClaimed(id: string): boolean {
  return getClaimedIds().includes(id)
}

export async function unclaimCharacter(id: string): Promise<void> {
  if (typeof window === "undefined") return

  const claimed = getClaimedIds()
  const filtered = claimed.filter((claimedId) => claimedId !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}

export function clearAllClaimed(): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]))
}
