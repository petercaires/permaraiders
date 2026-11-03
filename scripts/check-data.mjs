// Sanity check for the hand-edited raider data. Run: pnpm check
import assert from "node:assert/strict"
import { characters } from "../lib/characters.ts"
import { readFileSync } from "node:fs"

const src = readFileSync(new URL("../lib/characters.ts", import.meta.url), "utf8")
const ids = (name) => [...src.match(new RegExp(`${name} = new Set\\(\\[([^\\]]*)\\]`))[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
const valid = new Set(characters.map((c) => c.id))
const rare = ids("RARE_IDS")
const perma = ids("PERMARARE_IDS")

for (const id of [...rare, ...perma]) assert(valid.has(id), `rarity list has an id that isn't 001–165: "${id}"`)
for (const id of rare) assert(!perma.includes(id), `${id} is listed as both Rare and PermaRare`)
for (const [name, list] of [["RARE_IDS", rare], ["PERMARARE_IDS", perma]])
  assert.equal(new Set(list).size, list.length, `${name} lists an id twice`)
for (const c of characters) assert(c.description, `Raider ${c.id} has no description`)
for (const c of characters) assert(c.alt, `Raider ${c.id} has no alt text`)

console.log(`ok: ${characters.length} raiders, ${rare.length} Rare, ${perma.length} PermaRare`)
