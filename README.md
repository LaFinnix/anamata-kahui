# Anamata Kāhui

The digital ecosystem for the Anamata Kāhui — unifying four operational branches under a single platform with shared auth, shared data, and shared cultural foundations.

| Branch                | Path                              | Owner            |
| --------------------- | --------------------------------- | ---------------- |
| Anamata Records       | `/records`                        | Records team     |
| Research & Language   | `/research`                       | Research team    |
| Creative Arts         | `/arts`                           | Arts team        |
| Technology & Dev      | `/dev`                            | Dev team         |

**Apex domain (proposed):** `anamatakahui.co.nz`
**Branch subdomains (proposed):** `records.anamatakahui.co.nz`, `research.anamatakahui.co.nz`, `arts.anamatakahui.co.nz`, `dev.anamatakahui.co.nz`

> The Anamata *Records* marketing site at `/opt/data/anamata/website/` is a **separate** codebase with a separate identity (`anamatarecords.co.nz`). The Kāhui is the parent platform and uses its own domain.

---

## Stack

- **Next.js 16.2.10** (App Router, Turbopack)
- **React 19.2**
- **TypeScript 5**
- **Tailwind CSS v4** — dark by default with a bronze/gold token system defined in `src/app/globals.css`
- **Shadcn UI primitives** — Button, Card, Input, Label, Dropdown, Avatar, Badge (in `src/components/ui/`)
- **Supabase** — Auth, Postgres, Row Level Security, Storage (`@supabase/ssr`)
- **Lucide React** — icon set
- **Vercel** — hosting, CI/CD on push to `main`

---

## Project layout

```
anamata-kahui/
├── README.md                          # this file
├── vercel.json                        # Vercel project config (regions, headers)
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs                 # Tailwind v4 PostCSS plugin
├── eslint.config.mjs
├── .env.example                       # template — copy to .env.local
├── supabase/
│   ├── config.toml                    # Supabase local-dev project config
│   └── migrations/
│       └── 0001_initial_schema.sql    # profiles · branches · user_branches · releases · stems · RLS
└── src/
    ├── middleware.ts                  # session refresh + dashboard route protection
    ├── lib/
    │   ├── utils.ts                   # cn() — Tailwind class merger
    │   ├── types.ts                   # Profile · Branch · Release · Stem · RBAC types
    │   ├── branches.ts                # static branch directory (mirrors DB seed)
    │   └── supabase/
    │       ├── clients.ts             # browser / server / admin clients
    │       └── middleware.ts          # JWT refresh + redirect logic
    ├── components/
    │   ├── ui/                        # Shadcn primitives
    │   │   ├── button.tsx
    │   │   ├── card.tsx
    │   │   ├── input.tsx
    │   │   ├── label.tsx
    │   │   ├── dropdown-menu.tsx
    │   │   ├── avatar.tsx
    │   │   └── badge.tsx
    │   └── kahui/
    │       ├── site-header.tsx        # sticky header w/ branch switcher
    │       ├── site-footer.tsx
    │       └── branch-switcher.tsx    # dropdown for the four branches
    └── app/
        ├── layout.tsx                 # root layout
        ├── globals.css                # Tailwind v4 + theme tokens
        ├── (public)/                  # public marketing routes
        │   ├── layout.tsx             # header + footer chrome
        │   ├── page.tsx               # / — kahui landing
        │   ├── [slug]/page.tsx        # /records · /research · /arts · /dev
        │   ├── about/page.tsx
        │   ├── contact/page.tsx
        │   └── legal/
        │       ├── privacy-notice/page.tsx
        │       ├── cookie-policy/page.tsx
        │       └── terms-of-use/page.tsx
        ├── (auth)/                    # auth flow routes (no main chrome)
        │   ├── layout.tsx
        │   ├── login/page.tsx
        │   ├── register/page.tsx
        │   └── reset-password/page.tsx
        └── (dashboard)/               # authenticated app portal
            ├── layout.tsx             # sidebar + role-gated nav
            ├── admin/page.tsx         # platform super-admin overview
            ├── records/page.tsx       # artist & manager dashboard
            ├── releases/page.tsx      # release pipeline (draft → scheduled → released)
            ├── analytics/page.tsx     # stream & revenue metrics
            ├── research/page.tsx      # researcher portal
            └── dev/page.tsx           # dev team console
```

---

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with real values:

| Variable                          | Purpose                                                  |
| --------------------------------- | -------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`        | Supabase project URL (e.g. `https://abc.supabase.co`)    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Supabase anon key — safe in client code                  |
| `SUPABASE_SERVICE_ROLE_KEY`       | Supabase service-role — server-only, never in browser    |
| `NEXT_PUBLIC_SITE_URL`            | Apex URL used for OG/sitemap (defaults to anamatakahui.co.nz) |

### 3. Run the database

**Option A — Supabase Cloud (recommended):**

1. Create a project at <https://supabase.com/dashboard>.
2. Copy the project URL, anon key, and service-role key into `.env.local`.
3. Link the project and push migrations:

   ```bash
   npx supabase login
   npx supabase link --project-ref <YOUR_PROJECT_REF>
   npx supabase db push
   ```

**Option B — Local Supabase via Docker:**

```bash
npx supabase start
npx supabase db reset   # runs migrations from ./supabase/migrations
```

The local URLs and keys are printed by `supabase start`; copy them into `.env.local`.

### 4. Start the dev server

```bash
npm run dev
```

Open <http://127.0.0.1:3000>.

### 5. Other scripts

```bash
npm run lint         # ESLint (next/core-web-vitals)
npm run typecheck    # tsc --noEmit
npm run build        # production build (Turbopack)
```

---

## Database schema

The initial migration (`supabase/migrations/0001_initial_schema.sql`) creates:

- **profiles** — `id`, `full_name`, `email`, `role` (`super_admin` · `branch_admin` · `artist` · `researcher` · `client`), `avatar_url`, `bio`, timestamps. Auto-populated on signup via the `handle_new_user` trigger.
- **branches** — `id`, `slug` (`records` · `research` · `arts` · `dev`), `name`, `description`. Seeded in the migration.
- **user_branches** — junction for multi-branch membership with branch-scoped roles (`lead` · `admin` · `member` · `guest`).
- **releases** — Records-branch release rows: artist, branch, title, UPC/ISRC, status (`draft` · `scheduled` · `released` · `archived`), metadata JSONB.
- **stems** — audio stem vault (storage path, file name, mime, size).

### Row Level Security

RLS is **enabled on every table**. Policies enforce:

| Audience                          | What they can read                              | What they can write              |
| --------------------------------- | ----------------------------------------------- | -------------------------------- |
| Public (anon)                     | Released releases; branches directory           | Nothing                          |
| Authenticated user                | Releases in their branches; all profiles        | Their own profile row            |
| Branch lead / admin               | Everything in their branch                      | Releases + stems in their branch |
| `super_admin`                     | Everything                                       | Everything                       |

Two helper SQL functions scope the policies:

- `public.is_super_admin()` — checks the caller's profile role.
- `public.has_branch_access(p_branch uuid)` — super_admin OR a row in `user_branches` for that branch.

---

## Pushing to GitHub

This project was scaffolded locally. The repo is ready to push — once you have a GitHub account and credentials, follow one of the three paths below.

### Path A — `gh` CLI (recommended)

```bash
# 1. Install gh (skip if already installed)
# macOS:    brew install gh
# Linux:    see https://github.com/cli/cli#installation
# Windows:  winget install --id GitHub.cli

# 2. Auth
gh auth login

# 3. From the project root
cd anamata-kahui
gh repo create anamata-kahui --public --source=. --remote=origin --push
```

### Path B — Personal Access Token

1. Create a fine-grained PAT at <https://github.com/settings/tokens?type=beta>. Grant **Contents: Read & write** on the new repo (or all repos if creating it via the API).
2. From the project root:

   ```bash
   cd anamata-kahui
   git init -b main
   git add .
   git commit -m "feat: initial Anamata Kāhui scaffold"
   git remote add origin https://github.com/<YOUR_ORG>/anamata-kahui.git
   git push -u origin main
   ```

   When prompted for credentials, paste the PAT as the password.

### Path C — SSH key

1. Add your SSH public key to GitHub: <https://github.com/settings/keys>.
2. From the project root:

   ```bash
   cd anamata-kahui
   git init -b main
   git add .
   git commit -m "feat: initial Anamata Kāhui scaffold"
   git remote add origin git@github.com:<YOUR_ORG>/anamata-kahui.git
   git push -u origin main
   ```

> **Tip:** if the repo should live under an organisation rather than your personal account, replace `<YOUR_ORG>` with the org name and ensure you have push rights.

---

## Vercel deployment

1. Sign in to <https://vercel.com> with your GitHub account.
2. **Add New Project → Import** the `anamata-kahui` repo.
3. Vercel auto-detects Next.js. Confirm:
   - **Framework Preset:** Next.js
   - **Build Command:** `next build` (default)
   - **Install Command:** `npm install`
   - **Output Directory:** `.next` (default)
   - **Root Directory:** `./`
4. Add environment variables (Production + Preview + Development as needed):

   | Variable                          | Value                                              |
   | --------------------------------- | -------------------------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`        | From Supabase dashboard → Settings → API           |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Same                                               |
   | `SUPABASE_SERVICE_ROLE_KEY`       | Same (mark sensitive)                              |
   | `NEXT_PUBLIC_SITE_URL`            | `https://anamatakahui.co.nz`                       |

5. Click **Deploy**. The first build takes ~2 minutes.
6. Once green, every push to `main` redeploys automatically.

### Adding a preview domain

Vercel assigns `https://anamata-kahui-<hash>.vercel.app` for each PR. No extra config needed.

---

## Custom domain — `anamatakahui.co.nz`

The `.co.nz` registry uses the **Extensible Provisioning Protocol (EPP)**. Below is the playbook assuming the registrar is the same one that handles `anamatarecords.co.nz` (otherwise substitute in the matching screens).

### Apex (`anamatakahui.co.nz`)

1. In Vercel: **Settings → Domains → Add** `anamatakahui.co.nz` and `www.anamatakahui.co.nz`.
2. Vercel shows the records to add at the registrar. For `.co.nz` you'll typically add:

   | Type | Host | Value                          |
   | ---- | ---- | ------------------------------ |
   | A    | @    | `76.76.21.21`                  |
   | CNAME| www  | `cname.vercel-dns.com.`        |

3. Propagation is usually fast (<30 min) but allow up to 24 hours.
4. Vercel auto-issues a Let's Encrypt cert once DNS resolves.

### Branch subdomains

The four branch subdomains are **separate Vercel projects**, each pointing at the same GitHub repo with a different root directory:

| Subdomain                          | Vercel project     | Root directory         |
| ---------------------------------- | ------------------ | ---------------------- |
| `records.anamatakahui.co.nz`       | `anamata-records`  | `./` (with branch filter `main`, env overrides) |
| `research.anamatakahui.co.nz`      | `anamata-research` | `./`                   |
| `arts.anamatakahui.co.nz`          | `anamata-arts`     | `./`                   |
| `dev.anamatakahui.co.nz`           | `anamata-dev`      | `./`                   |

For each project, add the subdomain in **Settings → Domains**, then add at the registrar:

| Type  | Host      | Value                  |
| ----- | --------- | ---------------------- |
| CNAME | `records` | `cname.vercel-dns.com.` |
| CNAME | `research`| `cname.vercel-dns.com.` |
| CNAME | `arts`    | `cname.vercel-dns.com.` |
| CNAME | `dev`     | `cname.vercel-dns.com.` |

> If a future iteration uses middleware-based rewrites to serve different branches from a single apex deployment, the subdomains can collapse to one project — but the multi-project layout above keeps each branch deployable independently from day one.

### CAA record (recommended)

Add a CAA record authorising Let's Encrypt to issue certificates for the domain:

| Type | Host | Value                  |
| ---- | ---- | ---------------------- |
| CAA  | @    | `0 issue "letsencrypt.org"` |

---

## Environment & secrets — production checklist

- [ ] Supabase project created and migrations applied (`supabase db push`).
- [ ] `auth.email.enable_confirmations` set to `true` in production.
- [ ] Storage buckets created (`covers`, `press`, `stems`, `research`).
- [ ] Vercel project linked; env vars set for Production.
- [ ] Apex domain verified; HTTPS cert issued.
- [ ] At least one `super_admin` profile seeded (insert manually via SQL editor or a one-off `supabase db seed`).
- [ ] Branch memberships seeded for each artist / researcher.

---

## Acknowledgements

Built on the shoulders of:

- **Next.js** and **Vercel** for the deploy story.
- **Supabase** for auth, Postgres, RLS, and storage.
- **Shadcn UI** and **Tailwind** for the primitives.
- **Lucide** for icons.

Kāhui is a Māori concept of a collective / gathering. The platform is named in honour of the communities who shape it.

---

*Source of truth for cultural / iwi-gate policy: `legal/templates/cultural-kaitiaki-protocol.md` in the parent Anamata project.*
