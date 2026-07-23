"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { contactAction } from "@/lib/actions/contact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(contactAction, null);
  const t = useTranslations("contact");

  return (
    <form className="space-y-4" action={formAction}>
      <div className="space-y-2">
        <Label htmlFor="name">{t("name")}</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <textarea
          id="message"
          name="message"
          rows={6}
          required
          minLength={10}
          className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3 text-sm">
        <input
          id="consent"
          name="consent"
          type="checkbox"
          value="yes"
          required
          className="mt-1 h-4 w-4 rounded border-border text-bronze-400 focus:ring-bronze-400"
        />
        <label htmlFor="consent" className="flex-1 cursor-pointer text-muted-foreground">
          I consent to Anamata Kāhui storing my name, email, and message
          so it can respond to my enquiry, per the{" "}
          <Link
            href="/legal/privacy-notice"
            className="text-bronze-300 hover:text-bronze-200 underline"
          >
            privacy notice
          </Link>
          . Storage retention: 24 months.
        </label>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-pounamu-300">{state.success}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isPending ? "Sending…" : "Send"}
      </Button>
    </form>
  );
}
