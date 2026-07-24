import Link from "next/link";
import { Palette, ImageIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Portfolios · Creative Arts",
  description: "Visual arts portfolios and digital media showcases.",
};

export default function PortfoliosPage() {
  return (
    <div className="space-y-8">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline">Creative Arts</Badge>
          <Badge variant="secondary" className="text-xs">Sub-category</Badge>
        </div>
        <h1 className="text-3xl font-display font-semibold tracking-tight">Portfolios</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Curated portfolios of cultural design, visual art, and digital
          media work. Public-facing at{" "}
          <Link href="/artist" className="text-bronze-300 hover:text-bronze-200 underline">
            /artist
          </Link>
          .
        </p>
      </div>

      <Card className="border-dashed">
        <CardContent className="p-6 text-sm text-muted-foreground italic">
          <Palette className="mb-2 h-5 w-5 text-bronze-300" />
          Portfolios surface here once artists opt in via{" "}
          <Link href="/privacy-controls" className="text-bronze-300 hover:text-bronze-200 underline">
            /privacy-controls
          </Link>
          .
        </CardContent>
      </Card>
    </div>
  );
}
