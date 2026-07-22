"use client";

import { LogOut } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

/**
 * Sign-out button — wraps the server action in a form so it works without
 * any client-side fetch wiring.
 */
export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={logoutAction}>
      <Button variant="ghost" size="sm" className={className} type="submit">
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Sign out</span>
      </Button>
    </form>
  );
}
