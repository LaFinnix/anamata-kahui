"use server";

/**
 * Contact form server action — wired to /(public)/contact.
 *
 * Persists to Supabase (table `contact_enquiries`, defined in
 * 0002_cultural_governance.sql) AND sends email via Resend when env
 * vars are present. When Resend isn't configured, the form still
 * persists — operators see the enquiry in the staff dashboard.
 */

import { createAdminClient } from "@/lib/supabase/clients";
import { revalidatePath } from "next/cache";

export interface ContactFormState {
  error?: string;
  success?: string;
}

interface ContactPayload {
  name: string;
  email: string;
  message: string;
}

export async function contactAction(
  _prev: ContactFormState | null,
  formData: FormData,
): Promise<ContactFormState> {
  const payload: ContactPayload = {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    message: String(formData.get("message") ?? "").trim(),
  };

  if (!payload.name || !payload.email || !payload.message) {
    return { error: "All fields are required." };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.email)) {
    return { error: "Please enter a valid email address." };
  }
  if (payload.message.length < 10) {
    return { error: "Message is too short — please give us a bit more context." };
  }

  // Persist via service-role client (the table has anon-insert RLS too,
  // but service-role gives us a single code path).
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("contact_enquiries").insert({
      name: payload.name,
      email: payload.email,
      message: payload.message,
      source: "website_contact_form",
    });
    if (error) {
      console.error("contact_enquiries insert failed:", error.message);
    }
  } catch (e) {
    console.warn("contact_enquiries skipped (no service-role key):", e);
  }

  // Send email via Resend if configured. Optional — the enquiry is
  // already in the DB.
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
          to: toEmail,
          reply_to: payload.email,
          subject: `[Anamata Kāhui] New enquiry from ${payload.name}`,
          text: `From: ${payload.name} <${payload.email}>\n\n${payload.message}`,
          html: `
            <p><strong>From:</strong> ${escapeHtml(payload.name)} &lt;${escapeHtml(payload.email)}&gt;</p>
            <p>${escapeHtml(payload.message).replace(/\n/g, "<br>")}</p>
          `,
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

  revalidatePath("/contact");
  return {
    success:
      "Tēnā koe — we've received your message. The Kāhui team will be in touch within a few working days.",
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
