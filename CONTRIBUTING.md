# Contributing to Anamata Kāhui

Tēnā koe for considering a contribution. Anamata Kāhui is a Māori-led
platform; contributions that strengthen the cultural foundation are
welcome. This document covers the mechanics. For the *cultural* why,
read [`/kaitiakitanga`](https://anamatakahui.co.nz/kaitiakitanga) first.

---

## Code of conduct

Contributors are expected to honour:

- **Kaitiakitanga** — every change touching cultural data goes through the
  same consent lineage as catalog changes. Don't shortcut.
- **Tino rangatiratanga** — iwi decisions are final. If a kaitiaki rōpū
  member flags a change, defer.
- **Whanaungatanga** — communicate clearly. Cite the issue you're
  addressing. Ask if you're not sure.

## Reporting bugs

Open an issue on GitHub. Include:

1. URL where the bug appears
2. What you expected
3. What happened
4. Browser + viewport (if visual)
5. Console output (if applicable)

## Pull request workflow

1. Fork the repo, branch from `main`.
2. Make focused commits. Small PRs merge faster.
3. Run `npm run build` locally before pushing. CI is not yet wired.
4. Open a PR against `main` with a clear title (Conventional Commits
   preferred: `feat:`, `fix:`, `docs:`, `chore:`).
5. Wait for review. The kaitiaki rōpū has veto over cultural changes.

## Translation contributions

We accept te reo Māori translations via PR. Workflow:

1. Edit `src/locales/en.json` AND `src/locales/mi.json` side-by-side.
2. New keys must exist in `en.json` first. `mi.json` keys are validated
   against `en.json` at build time.
3. Use approved kupu from [`docs/REO-GLOSSARY.md`](./REO-GLOSSARY.md).
   Uncertain kupu — flag in the PR; a kaitiaki rōpū member reviews.
4. Macrons are required. CI does not yet enforce this; reviewers do.

## Future-locale translations

The platform supports 12 stub locales (Niuean, Hawaiian, Sāmoan,
Lea faka-Tonga, 日本語, 中文, 한국어, Español, Português, Français,
Deutsch, Nederlands). To activate one:

1. Add the code to `routing.locales` in `src/i18n/routing.ts`.
2. Move the entry from `FUTURE_LOCALES` to `ACTIVE_LOCALES` in
   `src/i18n/locales.ts` (status: `"active"`).
3. Create `src/locales/<code>.json` with the full translation tree
   (see `en.json` for the shape).
4. PR. CI builds must pass.

## Code style

- TypeScript strict — no `any` unless explicitly necessary.
- Tailwind v4 utility classes only. No CSS modules unless for
  animations. Hex literals in TSX = PR rejection (use `@theme` tokens).
- Server actions for forms. Server components for data fetching. Client
  components only when interactivity demands it.
- Prefer named exports for utilities. Default exports for pages.

## Testing

There is no test suite yet (see audit §4 #4). Until one exists:

- Run `npm run build` before every push.
- Manually exercise every route affected by your change.
- For Supabase schema changes, run `npx supabase db push` against a
  local Supabase instance first.

## Questions?

Open an issue. The team responds within a week.
