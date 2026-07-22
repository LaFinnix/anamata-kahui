import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // App Router is default in Next 16; Turbopack is the default build engine.
  experimental: {
    // Reserved for future flags (e.g. server actions, PPR).
  },
  images: {
    remotePatterns: [
      // Supabase storage CDN — public bucket for cover art, press kits, research PDFs.
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
    ],
  },
  // Ensure the Shadcn UI primitives and lib utilities resolve via the `@/` alias.
  typescript: {
    ignoreBuildErrors: false,
  },
};

// Wrap with the next-intl plugin so getRequestConfig() is available
// across all routes (including the [locale]/layout.tsx that calls
// setRequestLocale + getMessages).
export default withNextIntl(nextConfig);
