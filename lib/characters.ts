export interface Character {
  index: number
  id: string
  name: string
  description: string
  traits: string[]
  traitIds: string[]
}

// Generate 165 characters with zero-padded IDs, each with ONE corresponding trait
export const characters: Character[] = Array.from({ length: 165 }, (_, i) => {
  const index = i + 1
  const id = String(index).padStart(3, "0")
  const traitId = `trait${id}` // Simple 1:1 mapping

  return {
    index,
    id,
    name: `Raider ${id}`,
    description: `A legendary fighter from the digital realm. Each Raider possesses unique combat abilities and traits that make them formidable in battle.`,
    // Rarity tag: Common, Rare or PermaRare. Placeholder rule — set real rarities per raider here.
    traits: [index % 11 === 0 ? "PermaRare" : index % 3 === 0 ? "Rare" : "Common"],
    traitIds: [traitId],
  }
})

export const CHARACTERS_PER_PAGE = 55
export const TOTAL_PAGES = Math.ceil(characters.length / CHARACTERS_PER_PAGE)

export const CHARACTERS_PER_ROW = 11
export const VISIBLE_ROWS = 6
export const MOBILE_CHARACTERS_PER_ROW = 5
export const MOBILE_VISIBLE_ROWS = 10

export const TOTAL_ROWS = Math.ceil(characters.length / CHARACTERS_PER_ROW)
export const MOBILE_TOTAL_ROWS = Math.ceil(characters.length / MOBILE_CHARACTERS_PER_ROW)

export function getCharactersForMobileRows(startRow: number): Character[] {
  const start = startRow * MOBILE_CHARACTERS_PER_ROW
  const end = start + MOBILE_VISIBLE_ROWS * MOBILE_CHARACTERS_PER_ROW
  return characters.slice(start, end)
}

export function getCharactersForRows(startRow: number): Character[] {
  const start = startRow * CHARACTERS_PER_ROW
  const end = start + VISIBLE_ROWS * CHARACTERS_PER_ROW
  return characters.slice(start, end)
}

export function getCharactersForPage(page: number): Character[] {
  const start = page * CHARACTERS_PER_PAGE
  const end = start + CHARACTERS_PER_PAGE
  return characters.slice(start, end)
}

export function getCharacterById(id: string): Character | undefined {
  return characters.find((char) => char.id === id)
}
