import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Leaf, Server, Cloud, Wind } from "lucide-react";

export const metadata = { title: "Te Taiao" };

/**
 * Te Taiao sustainability commitment.
 *
 * Per audit §2.8 — emerging funder signal. Not yet required by NZ
 * funders but by 2027/2028 will be table stakes. We commit now so
 * the application language is on file when rounds start scoring it.
 */
export default function SustainabilityPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
      <Badge variant="outline" className="mb-4">Te Taiao · Sustainability</Badge>
      <h1 className="text-balance text-4xl font-display font-semibold tracking-tight sm:text-5xl">
        Te Taiao
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        How Anamata Kāhui honours the natural environment through the
        choices we make — about hosting, distribution, and touring.
      </p>

      <section className="mt-12 grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <Server className="h-5 w-5 text-pounamu-300" />
            <CardTitle>Digital-first distribution</CardTitle>
            <CardDescription>
              Streaming-first release model. No physical production run
              until audience demand justifies it. Reduces manufacturing
              footprint by default.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <Cloud className="h-5 w-5 text-pounamu-300" />
            <CardTitle>Vercel edge hosting</CardTitle>
            <CardDescription>
              Site hosted on Vercel's edge network — content served from
              the nearest region, minimising transit energy. Static
              pre-render wherever possible.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <Wind className="h-5 w-5 text-pounamu-300" />
            <CardTitle>Low-carbon touring policy</CardTitle>
            <CardDescription>
              We default to fewer, longer-stay performances over many
              short trips. Rail and coach preferred over air where
              practical. Karakia before/after travel acknowledges the
              whenua traversed.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <Leaf className="h-5 w-5 text-pounamu-300" />
            <CardTitle>Carbon tracker</CardTitle>
            <CardDescription>
              <Badge variant="outline">Coming soon</Badge>
              <p className="mt-3 text-sm text-muted-foreground">
                Per-event and per-release carbon logging ships alongside
                the analytics ingestion pipeline. Numbers will surface
                here when live.
              </p>
            </CardDescription>
          </CardHeader>
        </Card>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-2xl">Our commitment</h2>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          We commit to disclosing the environmental footprint of our
          operations in good faith — including the carbon cost of digital
          infrastructure. The default for digital-first organisations is
          to claim sustainability without measurement. We do the opposite:
          commit to measurement, publish the numbers, and accept the
          findings.
        </p>
      </section>
    </div>
  );
}
