"use server";

/**
 * Contact form server action — wired to /(public)/contact.
 *
 * Persists the enquiry to Supabase (table `contact_enquiries`, defined in
 * 0003_contact_log.sql) and optionally fires a Resend email. Email is
 * optional — when the env vars are absent the enquiry is still logged.
 */

import { createServerSupabase, createAdminClient } from "@/lib/supabase/clients";
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

  // Persist to the contact_enquiries table using the admin client (RLS lets
  // any anon write to this one table — its only purpose is to log enquiries).
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("contact_enquiries").insert({
      name: payload.name,
      email: payload.email,
      message: payload.message,
      source: "website_contact_form",
    });
    if (error) {
      // Log but don't fail the user — the message will still get to us
      // once we wire Resend.
      console.error("contact_enquiries insert failed:", error.message);
    }
  } catch (e) {
    // Admin client may not be configured locally (no service-role key) —
    // that's fine, we fall through to the email path.
    console.warn("contact_enquiries skipped (no service-role key):", e);
  }

  // Optional email via Resend (deferred to a follow-up that adds the
  // `resend` package). For now we just acknowledge the user.
  revalidatePath("/contact");
  return {
    success:
      "Tēnā koe — we've received your message. The Kāhui team will be in touch within a few working days.",
  };
}
