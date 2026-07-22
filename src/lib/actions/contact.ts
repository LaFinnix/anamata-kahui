"use server";

/**
 * Contact form server action — wired to /(public)/contact.
 *
 * Persists to Supabase (table `contact_enquiries`, defined in
 * 0002_cultural_governance.sql) AND sends email via Resend when
 * RESEND_API_KEY is configured.
 *
 * The form requires an explicit consent checkbox (Privacy Act 2020).
 *
 * Honours App Router `useActionState` shape: (prevState, formData) → state.
 */

import { createAdminClient } from "@/lib/supabase/clients";

export interface ContactFormState {
  error?: string;
  success?: string;
}

export async function contactAction(
  _prev: ContactFormState | null,
  formData: FormData,
): Promise<ContactFormState> {
  // Parse + validate
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const consent = String(formData.get("consent") ?? "");

  if (!name || !email || !message) {
    return { error: "All fields are required." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Please enter a valid email address." };
  }
  if (consent !== "yes") {
    return {
      error:
        "Please confirm you consent to us storing your enquiry details per the privacy notice.",
    };
  }
  if (message.length < 10) {
    return { error: "Message is too short — please give us a bit more context." };
  }

  // Persist via service-role client (the table has anon-insert RLS too,
  // but service-role gives us a single code path).
  try {
    const admin = createAdminClient();
    const { error: insertError } = await admin.from("contact_enquiries").insert({
      name,
      email,
      message,
      source: "contact_form",
      consented_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error("contact_enquiries insert failed:", insertError.message);
      // Continue to email anyway — DB may be temporarily unavailable.
    }
  } catch (e) {
    console.warn("contact_enquiries skipped (no service-role key):", e);
  }

  // Optional email notification via Resend. If env vars aren't set, skip
  // silently — the DB row is enough.
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.CONTACT_FROM_EMAIL;
  const toEmail = process.env.CONTACT_TO_EMAIL;

  if (resendKey && fromEmail && toEmail) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [toEmail],
          subject: `[Anamata Kāhui] Contact form: ${name}`,
          text: `From: ${name} <${email}>\n\n${message}\n\n— Anamata Kāhui contact form`,
          reply_to: email,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error("Resend send failed:", res.status, body);
      }
    } catch (e) {
      console.error("Resend send exception:", e);
    }
  }

  return {
    success:
      "Tēnā koe — your message has been received. We'll be in touch within 2 working days.",
  };
}
