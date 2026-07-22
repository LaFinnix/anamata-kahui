import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ContactForm } from "@/components/contact/contact-form";

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
          <ContactForm />
        </CardContent>
      </Card>
    </div>
  );
}
