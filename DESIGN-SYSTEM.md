# Anamata Kāhui — Design System

**Status:** Living document. Update when tokens or components change.
**Stack:** Next.js 16 · React 19 · TypeScript 5 · Tailwind CSS v4 · Shadcn UI.

---

## Brand in one sentence

A Māori-led, kaitiaki-gated collective platform unifying four operational
branches under one cultural foundation. Visual language: warm bronze
+ dark backgrounds, with pounamu (greenstone) reserved for cultural and
success states.

## Palette

All tokens are defined in `src/app/globals.css` under the `@theme`
block. To change the palette: edit that file. Components consume tokens
via Tailwind utility classes (`bg-bronze-400`, `text-muted-foreground`,
etc.) — **never** via inline hex.

| Token | Value | Role |
|---|---|---|
| `--color-background` | `#0b0a08` | Page background (dark by default) |
| `--color-foreground` | `#f4ede0` | Body text (aged-paper ivory) |
| `--color-muted` | `#1a1814` | Card surface |
| `--color-muted-foreground` | `#a89e8b` | Secondary text |
| `--color-border` | `#2a2620` | Hairline dividers |
| `--color-input` | `#1f1c17` | Form input surface |
| `--color-ring` | `#c89a3c` | Focus ring (bronze) |
| `--color-bronze-400` | `#c89a3c` | Primary brand accent |
| `--color-bronze-500` | `#a87a25` | Hover state for bronze |
| `--color-pounamu-500` | `#3f8a6c` | Success / cultural states |
| `--color-destructive` | `#c0392b` | Errors / destructive actions |

### Bronze scale (50 → 900)

`bronze-50` → `bronze-900` is a 10-step warm metallic ramp. Use it for:
- brand accents
- hover/focus states
- decorative borders (e.g. on `bronze-500/30`)

### Pounamu (greenstone)

Used **sparingly** for cultural and success states only. Reserved for:
- `/transparency` active counts
- `/impact` cultural metrics
- success badges (`variant="success"`)

## Typography

| Role | Font | Use |
|---|---|---|
| Display (h1, h2, h3, h4) | Cormorant Garamond (`font-display`) | Hero, section headings |
| Body | Inter (`font-sans`) | All other text |
| Mono | JetBrains Mono (`font-mono`) | IDs, DOIs, code blocks |

## Spacing & layout

- Container: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- Section vertical padding: `py-20` (mobile) / `py-32` (lg)
- Card padding: `p-6` (default) / `p-4` (compact)

## Components

All Shadcn primitives live in `src/components/ui/`. Variants are
configured in each component file — see `button.tsx` for the canonical
example.

| Component | Use for |
|---|---|
| `Button` | All CTAs. Variants: default, secondary, ghost, destructive, link |
| `Card` + Header/Content/Footer | Content panels. Always include a Header with Title + Description |
| `Badge` | Tags + status. Variants: default, secondary, outline, success, destructive |
| `Input` + `Label` | Form fields |
| `DropdownMenu` | Headless menu. Use for branch switcher, language switcher |
| `Avatar` | User / artist profile circles |
| `Skeleton` (in `skeletons.tsx`) | Loading placeholders |

## Accessibility

- Colour contrast meets WCAG 2.2 AA across the bronze-on-dark palette
- Skip-to-content link in every layout (WCAG 2.4.1)
- `<main>` has `id="main-content"` for skip-target
- All interactive elements have visible focus rings (`focus-visible:ring-2`)
- Language switcher in header writes `<html lang>` dynamically (when the
  `[locale]` route group ships)
- Quarterly external review by Arts Access Aotearoa

## Changing the palette

1. Edit `src/app/globals.css` — find the `@theme` block
2. Update hex values
3. Run `npm run build`
4. Verify in `/accessibility` page that contrast still passes AA
5. Commit + push

That's it. The token system is the single source of truth.
