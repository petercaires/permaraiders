# Perma Raiders — PFP mint demo

A demo mint page for the 165-piece Perma Raiders PFP collection. Nothing is minted on-chain:
"minted" raiders are remembered in the visitor's browser (localStorage) and can be reset from
the corner controls.

Built with Next.js 16, React 19 and Tailwind CSS v4. Raider art and audio are served from ImageKit.

## Run it

```bash
pnpm install
pnpm dev     # http://localhost:3000
pnpm build   # production build (type-checked)
```

## Where things live

| What | File |
|---|---|
| Page layout, sound, mint flow | `app/page.tsx` |
| Raider descriptions and rarity lists | `lib/characters.ts` |
| Desktop character sheet | `components/character-panel.tsx` |
| One raider tile | `components/character-tile.tsx` |
| Name, tags and description under the sheet | `components/character-details.tsx` |
| In-box mint sequence | `components/mint-stage.tsx` |
| Demo mint storage (swap for real wallet/chain calls) | `lib/mintAdapter.ts` |
| Image URLs | `lib/hero-urls.ts`, `lib/trait-urls.ts` |
| Colours, rarity glows, animations, type scale | `app/globals.css` |

Layout switches on one custom Tailwind variant, `wide:` (landscape and at least 768px wide);
everything else is the phone layout.
