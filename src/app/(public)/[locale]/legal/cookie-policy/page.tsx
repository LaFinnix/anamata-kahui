import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export const metadata = {
  title: "Cookie policy",
  description:
    "What cookies the Anamata Kāhui platform sets, why, and how to control them. Strictly necessary cookies only by default — no third-party tracking.",
};

const COOKIES = [
  {
    name: "sb-<project>-auth-token",
    category: "Strictly necessary",
    purpose:
      "Supabase Auth session JWT. Identifies the signed-in user and refreshes their session. Cannot function without this cookie — auth would not work.",
    lifetime: "1 hour (auto-refreshed on activity)",
    domain: ".anamatakahui.co.nz",
    provider: "Supabase Inc.",
    control: "Cannot opt out. Sign out to clear.",
  },
  {
    name: "NEXT_LOCALE",
    category: "Strictly necessary",
    purpose:
      "next-intl locale preference. Remembers whether you've chosen te reo Māori or English so the next visit uses the same language.",
    lifetime: "1 year",
    domain: ".anamatakahui.co.nz",
    provider: "Anamata Kāhui",
    control:
      "Cleared when you reset cookie preferences in /privacy-controls.",
  },
  {
    name: "kahui_cookie_consent",
    category: "Preferences",
    purpose:
      "Records your cookie-category choices from the consent banner so we don't re-ask on every visit.",
    lifetime: "1 year",
    domain: ".anamatakahui.co.nz",
    provider: "Anamata Kāhui",
    control: "Manage via /privacy-controls.",
  },
];

export default function CookiePolicyPage() {
  const lastUpdated = "2026-07-22";

  return (
    <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
      <Badge variant="outline" className="mb-4">Legal · Cookies</Badge>
      <h1 className="text-balance text-4xl font-display font-semibold tracking-tight sm:text-5xl">
        Cookie policy
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: <span className="font-mono">{lastUpdated}</span>
      </p>

      <div className="prose prose-invert mt-10 max-w-none">
        <p>
          Cookies are small text files stored on your device when you
          visit a website. They help the site function, remember your
          preferences, and (sometimes) help the site owner understand
          how the site is used.
        </p>

        <h2>What cookies we use</h2>
        <p>
          <strong>By default, the platform uses only strictly necessary
          cookies.</strong> No analytics, no advertising, no third-party
          tracking. We ship privacy-friendly by design.
        </p>

        <h3>Strictly necessary (always on)</h3>
        <p>
          These cookies are required for the platform to function.
          They cannot be disabled while using the site.
        </p>

        <table>
          <thead>
            <tr>
              <th>Cookie</th>
              <th>Purpose</th>
              <th>Lifetime</th>
              <th>Provider</th>
            </tr>
          </thead>
          <tbody>
            {COOKIES.filter((c) => c.category === "Strictly necessary").map((c) => (
              <tr key={c.name}>
                <td><code>{c.name}</code></td>
                <td>{c.purpose}</td>
                <td>{c.lifetime}</td>
                <td>{c.provider}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>Preferences</h3>
        <p>
          Set only when you explicitly opt in via the cookie banner or{" "}
          <Link href="/privacy-controls">/privacy-controls</Link>.
        </p>
        <table>
          <thead>
            <tr>
              <th>Cookie</th>
              <th>Purpose</th>
              <th>Lifetime</th>
              <th>Provider</th>
            </tr>
          </thead>
          <tbody>
            {COOKIES.filter((c) => c.category === "Preferences").map((c) => (
              <tr key={c.name}>
                <td><code>{c.name}</code></td>
                <td>{c.purpose}</td>
                <td>{c.lifetime}</td>
                <td>{c.provider}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>Analytics</h3>
        <p>
          We do not currently use any analytics cookies. If we add them in
          the future (e.g. a privacy-respecting tool like Plausible or
          Fathom), this page will list them with a category
          "Analytics — only with consent" and we'll ask for consent via the
          cookie banner before they're set.
        </p>

        <h3>Embedded content</h3>
        <p>
          The platform may embed content from third parties (e.g. Spotify,
          Apple Music, YouTube iframes on the waiata detail page). When you
          interact with those embeds, the third party may set its own
          cookies. These are governed by the third party's privacy
          policy, not ours:
        </p>
        <ul>
          <li>
            <a
              href="https://www.spotify.com/legal/privacy-policy/"
              target="_blank"
              rel="noreferrer"
              className="text-bronze-300 hover:text-bronze-200"
            >
              Spotify
            </a>{" "}
            — listening behaviour, IP, device info
          </li>
          <li>
            <a
              href="https://www.apple.com/legal/privacy/"
              target="_blank"
              rel="noreferrer"
              className="text-bronze-300 hover:text-bronze-200"
            >
              Apple Music
            </a>{" "}
            — embedded player behaviour
          </li>
          <li>
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noreferrer"
              className="text-bronze-300 hover:text-bronze-200"
            >
              YouTube
            </a>{" "}
            — viewing behaviour, IP, device info
          </li>
          <li>
            <a
              href="https://resend.com/legal/privacy-policy"
              target="_blank"
              rel="noreferrer"
              className="text-bronze-300 hover:text-bronze-200"
            >
              Resend
            </a>{" "}
            (contact form email delivery) — sender IP, message metadata
          </li>
        </ul>

        <h2>Your choices</h2>
        <ul>
          <li>
            <strong>Cookie banner.</strong> First visit shows a consent
            banner with "Accept all", "Reject non-essential", and
            "Customise" options. Your choice is remembered for 1 year.
          </li>
          <li>
            <strong>Manage preferences anytime.</strong> Visit{" "}
            <Link href="/privacy-controls">/privacy-controls</Link> to
            change your choices.
          </li>
          <li>
            <strong>Browser controls.</strong> Most browsers let you block
            or delete cookies. Blocking strictly necessary cookies will
            break the platform (you won't be able to sign in).
          </li>
          <li>
            <strong>Do Not Track.</strong> We honour DNT signals — no
            tracking cookies will be set if your browser sends this header.
          </li>
          <li>
            <strong>Third-party embeds.</strong> You can avoid third-party
            cookies by not interacting with embedded Spotify / Apple Music
            / YouTube players.
          </li>
        </ul>

        <h2>Changes to this policy</h2>
        <p>
          We update this policy when cookie usage changes. The "Last
          updated" date at the top shows the latest revision. Material
          changes will be announced via the cookie banner on next visit.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about cookies:{" "}
          <a href="mailto:privacy@anamatakahui.co.nz">privacy@anamatakahui.co.nz</a>
        </p>
      </div>
    </div>
  );
}
