import Link from "next/link";

const FOOTER_LINKS = [
  {
    title: "Branches",
    links: [
      { href: "/records",  label: "Anamata Records" },
      { href: "/research", label: "Research & Language" },
      { href: "/arts",     label: "Creative Arts" },
      { href: "/dev",      label: "Technology & Dev" },
    ],
  },
  {
    title: "Platform",
    links: [
      { href: "/about",    label: "About the Kāhui" },
      { href: "/reads",    label: "Reads" },
      { href: "/news",     label: "News" },
      { href: "/faq",      label: "FAQ" },
      { href: "/contact",  label: "Contact" },
      { href: "/login",    label: "Sign in" },
      { href: "/register", label: "Join" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/privacy-notice", label: "Privacy notice" },
      { href: "/legal/cookie-policy",  label: "Cookie policy" },
      { href: "/legal/terms-of-use",   label: "Terms of use" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 font-display text-lg font-semibold">
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 rounded-full bg-bronze-400"
              />
              Anamata Kāhui
            </div>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              A collective platform unifying records, research, creative arts,
              and technology for Aotearoa.
            </p>
          </div>

          {FOOTER_LINKS.map((column) => (
            <div key={column.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-bronze-300">
                {column.title}
              </h3>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-border pt-8 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Anamata Kāhui. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
