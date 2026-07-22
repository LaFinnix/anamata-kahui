import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "About",
  description:
    "Anamata Kāhui is a Māori-led collective platform unifying Anamata Records, Research & Language Preservation, Creative Arts, and Technology & Development under one cultural foundation.",
};
const PILLARS = [
  {
    title: "Tino rangatiratanga",
    body: "Self-determination at every layer — the platform serves the people who build on it, not the other way around.",
  },
  {
    title: "Kaitiakitanga",
    body: "Cultural data is governed by the communities it comes from. RLS, consent metadata, and audit trails are first-class.",
  },
  {
    title: "Whanaungatanga",
    body: "The four branches share an identity, an auth system, and a code of conduct. They don't exist in isolation.",
  },
] as const;

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
      <h1 className="text-balance text-4xl font-display font-semibold tracking-tight sm:text-5xl">
        About Anamata Kāhui
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
        Anamata Kāhui is the digital ecosystem that holds Anamata Records,
        Research & Language Preservation, Creative Arts, and Technology &
        Development under one roof. Each branch has its own team, dashboards,
        and tools — but they share the same auth, the same data model, and the
        same cultural foundation.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {PILLARS.map((p) => (
          <Card key={p.title}>
            <CardHeader>
              <CardTitle className="text-lg">{p.title}</CardTitle>
              <CardDescription>{p.body}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="mt-16 rounded-lg border border-bronze-500/30 bg-bronze-900/20 p-8">
        <h2 className="font-display text-2xl">Get involved</h2>
        <p className="mt-2 text-muted-foreground">
          Whether you're an artist, researcher, designer, or engineer — there's
          a place in the Kāhui.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/register">Join</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/contact">Contact</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
