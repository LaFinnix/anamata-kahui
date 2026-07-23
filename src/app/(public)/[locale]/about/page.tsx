import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return {
    title: t("title"),
    description: t("lede").slice(0, 160),
  };
}

export default async function AboutPage() {
  const t = await getTranslations("about");

  return (
    <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
      <h1 className="text-balance text-4xl font-display font-semibold tracking-tight sm:text-5xl">
        {t("title")}
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        {t("lede")}
      </p>

      <section className="mt-12 grid gap-6 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t("pillars.tino.title")}</CardTitle>
            <CardDescription>{t("pillars.tino.body")}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("pillars.kaitiaki.title")}</CardTitle>
            <CardDescription>{t("pillars.kaitiaki.body")}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("pillars.whanaunga.title")}</CardTitle>
            <CardDescription>{t("pillars.whanaunga.body")}</CardDescription>
          </CardHeader>
        </Card>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-2xl">{t("getInvolvedTitle")}</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">{t("getInvolvedLede")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/contact">Get in touch</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/for-funders">For funders</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}