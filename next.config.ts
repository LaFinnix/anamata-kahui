import type { NextConfig } from "next";

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

export default nextConfig;
