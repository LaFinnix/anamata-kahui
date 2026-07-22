import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-display font-semibold tracking-tight">Contact</h1>
      <p className="mt-3 text-muted-foreground">
        Drop us a line. We reply within a few working days.
      </p>

      <Card className="mt-10">
        <CardHeader>
          <CardTitle>Send a message</CardTitle>
          <CardDescription>For licensing, partnerships, or general enquiries.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" action="/api/contact" method="post">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <textarea
                id="message"
                name="message"
                rows={6}
                required
                className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <Button type="submit" className="w-full">Send</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
