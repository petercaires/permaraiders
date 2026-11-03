// Demo mint storage: minted raiders are remembered in this browser (localStorage).
// Swap these out for real wallet / chain calls when the mint goes live.

const STORAGE_KEY = "claimedCharacterIds"

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

export function clearAllClaimed(): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]))
}
