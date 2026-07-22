"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { loginAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Login form — wired to the `loginAction` server action.
 *
 * Carries `redirectTo` from the query string so post-login the user lands
 * where they originally tried to go (set by the proxy when gating a
 * (dashboard) route).
 */
export function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/admin";
  const urlError = searchParams.get("error");

  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <form className="space-y-4" action={formAction}>
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/reset-password"
            className="text-xs text-bronze-300 hover:text-bronze-200"
          >
            Forgot?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      {(state?.error || urlError) && (
        <p className="text-sm text-destructive">
          {state?.error ?? "Sign-in failed. Please try again."}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isPending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        New to the Kāhui?{" "}
        <Link href="/register" className="text-bronze-300 hover:text-bronze-200">
          Create an account
        </Link>
      </p>
    </form>
  );
}
