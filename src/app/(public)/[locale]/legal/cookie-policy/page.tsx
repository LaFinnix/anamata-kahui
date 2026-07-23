import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.cookiePolicy" });
  return {
    title: t("title"),
    description: t("summary").slice(0, 160),
  };
}

interface CookieRow {
  name: string;
  category: string;
  purpose: string;
  lifetime: string;
  domain: string;
  provider: string;
  control: string;
}

const COOKIES: CookieRow[] = [
  {
    name: "sb-<project>-auth-token",
    category: "Strictly necessary",
    purpose: "Supabase Auth session JWT. Identifies the signed-in user and refreshes their session. Cannot function without this cookie — auth would not work.",
    lifetime: "1 hour (auto-refreshed on activity)",
    domain: ".anamatakahui.co.nz",
    provider: "Supabase Inc.",
    control: "Cannot opt out. Sign out to clear.",
  },
  {
    name: "NEXT_LOCALE",
    category: "Strictly necessary",
    purpose: "Remembers your chosen language (en or mi) for next-intl. Without it, the site would default to English regardless of preference.",
    lifetime: "1 year",
    domain: "anamatakahui.co.nz",
    provider: "Vercel / next-intl",
    control: "Cannot opt out. Clear site data to reset.",
  },
  {
    name: "kahui_cookie_consent",
    category: "Strictly necessary",
    purpose: "Records your cookie consent choice (accepted | essential_only). Not set until you choose; banner does not appear after.",
    lifetime: "1 year",
    domain: "anamatakahui.co.nz",
    provider: "Anamata Kāhui",
    control: "Manage at /privacy-controls",
  },
  {
    name: "kahui_active_context",
    category: "Preferences",
    purpose: "Stores your active branch + role context inside the dashboard (e.g. Music (Anamata Records) as artist). Set on switcher use.",
    lifetime: "1 year",
    domain: "anamatakahui.co.nz",
    provider: "Anamata Kāhui",
    control: "Manage at /privacy-controls",
  },
];

export default async function CookiePolicyPage() {
  const t = await getTranslations("legal.cookiePolicy");

  return (
    <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
      <Badge variant="outline" className="mb-4">{t("badge")}</Badge>
      <h1 className="text-balance text-4xl font-display font-semibold tracking-tight sm:text-5xl">
        {t("title")}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("lastUpdated")}: <span className="font-mono">2026-07-22</span>
      </p>

      <aside
        aria-label="Whakarāpopototanga reo Māori"
        className="mt-8 rounded-md border border-pounamu-500/30 bg-pounamu-500/5 p-5 text-sm"
      >
        <p className="font-medium text-pounamu-200">Whakarāpopototanga reo Māori</p>
        <p className="mt-2 text-muted-foreground">{t("summary")}</p>
      </aside>

      <div className="prose prose-invert mt-10 max-w-none">
        <p>
          What cookies the Anamata Kāhui platform sets, why, and how to
          control them. Strictly necessary cookies only by default — no
          third-party tracking. The platform ships zero analytics
          cookies today.
        </p>
        <h2>What is a cookie</h2>
        <p>
          A cookie is a small text file your browser stores at the
          request of a website. Cookies are how the site remembers you
          between requests. They cannot run code or read other files on
          your device.
        </p>
        <h2>Categories used</h2>
        <p>
          We use two categories. Both are explained below. The full table
          is on this page.
        </p>
      </div>

      <h2 className="mt-10 font-display text-2xl">Cookies set by this site</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2 pr-4 font-medium">Name</th>
              <th className="py-2 pr-4 font-medium">Category</th>
              <th className="py-2 pr-4 font-medium">Lifetime</th>
              <th className="py-2 font-medium">Control</th>
            </tr>
          </thead>
          <tbody>
            {COOKIES.map((c) => (
              <tr key={c.name} className="border-b border-border">
                <td className="py-3 pr-4 font-mono text-xs">{c.name}</td>
                <td className="py-3 pr-4">{c.category}</td>
                <td className="py-3 pr-4 text-xs">{c.lifetime}</td>
                <td className="py-3 text-xs">{c.control}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 font-display text-2xl">Detail per cookie</h2>
      <div className="mt-4 space-y-4">
        {COOKIES.map((c) => (
          <div key={c.name} className="rounded-md border border-border p-4 text-sm">
            <p className="font-mono text-xs">{c.name}</p>
            <p className="mt-1 font-medium">{c.category}</p>
            <p className="mt-1 text-muted-foreground">{c.purpose}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Domain: {c.domain} · Lifetime: {c.lifetime} · Provider: {c.provider}
            </p>
            <p className="mt-1 text-xs">{c.control}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 font-display text-2xl">Controlling cookies</h2>
      <div className="prose prose-invert mt-4 max-w-none">
        <p>
          Use the in-app controls at{" "}
          <Link href="/privacy-controls" className="text-bronze-300 hover:text-bronze-200 underline">
            /privacy-controls
          </Link>{" "}
          to manage cookie preferences. Strictly necessary cookies cannot
          be opted out of because the platform would not function without
          them. Analytics cookies are not currently set.
        </p>
        <h2>Do Not Track</h2>
        <p>
          If your browser sends the DNT header, we do not set any
          optional cookies regardless of your consent choice.
        </p>
        <h2>{t("contact")}</h2>
        <p>
          Questions about cookies? Email{" "}
          <a href="mailto:privacy@anamatakahui.co.nz" className="text-bronze-300 hover:text-bronze-200 underline">
            privacy@anamatakahui.co.nz
          </a>
          .
        </p>
      </div>
    </div>
  );
}
