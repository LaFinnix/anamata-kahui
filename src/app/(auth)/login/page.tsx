import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Access the artist portal, dashboards, and the Kāhui console.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" action="/api/auth/login" method="post">
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
          <Button type="submit" className="w-full">
            Sign in
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            New to the Kāhui?{" "}
            <Link href="/register" className="text-bronze-300 hover:text-bronze-200">
              Create an account
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
