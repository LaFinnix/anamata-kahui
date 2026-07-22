import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://anamatakahui.co.nz";

export const metadata: Metadata = {
  title: {
    default: "Anamata Kāhui",
    template: "%s · Anamata Kāhui",
  },
  description:
    "Anamata Kāhui — a collective platform unifying Anamata Records, Research & Language Preservation, Creative Arts, and Technology & Development.",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    siteName: "Anamata Kāhui",
    url: SITE_URL,
    title: "Anamata Kāhui",
    description:
      "Anamata Kāhui — a collective platform unifying Anamata Records, Research & Language Preservation, Creative Arts, and Technology & Development.",
    locale: "en_NZ",
    alternateLocale: ["mi_NZ"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Anamata Kāhui",
    description:
      "Anamata Kāhui — a collective platform unifying Anamata Records, Research & Language Preservation, Creative Arts, and Technology & Development.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
