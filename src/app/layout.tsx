import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Anamata Kāhui",
    template: "%s · Anamata Kāhui",
  },
  description:
    "Anamata Kāhui — a collective platform unifying Anamata Records, Research & Language Preservation, Creative Arts, and Technology & Development.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://anamatakahui.co.nz",
  ),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
