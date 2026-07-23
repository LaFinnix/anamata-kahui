"use server";

/**
 * Newsletter server actions.
 *
 * Double-opt-in flow (GDPR + NZ Privacy Act 2020):
 *   1. subscribeAction — user submits email at /newsletter
 *   2. We INSERT with confirmed=false, send a confirm email
 *   3. User clicks the link (token in URL)
 *   4. confirmSubscriptionAction — sets confirmed=true, sends welcome
 *   5. New reads + news → broadcasts to confirmed subscribers
 *
 * Required env:
 *   - RESEND_API_KEY (Resend transactional email)
 *   - NEXT_PUBLIC_SITE_URL (used to build confirm/unsubscribe links)
 *   - RESEND_FROM (e.g. "Anamata Kāhui <hello@anamatakahui.co.nz>")
 *
 * If RESEND_API_KEY is not set, the actions still record the
 * subscription + token in the DB, but no email is sent. The user
 * sees "we'll send you a confirmation link shortly" regardless. The
 * confirmation action will report an error if the email was never
 * sent. The platform is designed to fail-gracefully: keys are
 * added later, no breaking change.
 */

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { headers } from "next/headers";
import { createServerSupabase, createAdminClient } from "@/lib/supabase/clients";
import { sendEmail } from "@/lib/newsletter/resend";

export interface SubscribeFormState {
  error?: string;
  success?: string;
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 320;
}

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * <SubscribeForm/> action — public, anon-friendly.
 */
export async function subscribeAction(
  _prev: SubscribeFormState | null,
  formData: FormData,
): Promise<SubscribeFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const source = String(formData.get("source") ?? "/newsletter").trim();
  const locale = String(formData.get("locale") ?? "en").trim();

  if (!email) {
    return { error: "Email is required." };
  }
  if (!isValidEmail(email)) {
    return { error: "Please enter a valid email address." };
  }

  // Capture IP + UA for abuse mitigation
  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    hdrs.get("x-real-ip") ??
    null;
  const ua = hdrs.get("user-agent") ?? null;

  const supabase = await createServerSupabase();

  // Check if already subscribed
  const { data: existing } = await supabase
    .from("newsletter_subscribers")
    .select("id, confirmed, confirm_token, confirm_token_expires_at, unsubscribed_at")
    .eq("email", email)
    .maybeSingle();

  if (existing?.confirmed && !existing.unsubscribed_at) {
    // Already subscribed + confirmed + not unsubscribed
    return { success: "You're already subscribed. Check your inbox for past issues." };
  }

  // Reuse or create token
  const token =
    existing?.confirm_token && existing.confirm_token_expires_at && new Date(existing.confirm_token_expires_at) > new Date()
      ? existing.confirm_token
      : generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  if (existing) {
    // Update existing row (re-subscribe flow)
    const { error: updateErr } = await supabase
      .from("newsletter_subscribers")
      .update({
        confirm_token: token,
        confirm_token_expires_at: expiresAt,
        confirmed: false,
        confirmed_at: null,
        unsubscribed_at: null,
        ip_address: ip,
        user_agent: ua,
        locale,
        source,
      })
      .eq("id", existing.id);
    if (updateErr) {
      return { error: `Could not update subscription: ${updateErr.message}` };
    }
  } else {
    // New subscriber
    const { error: insertErr } = await supabase
      .from("newsletter_subscribers")
      .insert({
        email,
        confirm_token: token,
        confirm_token_expires_at: expiresAt,
        confirmed: false,
        ip_address: ip,
        user_agent: ua,
        locale,
        source,
      });
    if (insertErr) {
      return { error: `Could not subscribe: ${insertErr.message}` };
    }
  }

  // Send confirmation email (fail-gracefully if Resend not configured)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://anamatakahui.co.nz";
  const confirmUrl = `${baseUrl}/${locale}/newsletter/confirm?token=${encodeURIComponent(token)}`;

  const { sent, error: sendErr } = await sendEmail({
    to: email,
    subject: "Confirm your subscription to Anamata Kāhui",
    html: confirmationEmailHtml(confirmUrl, locale),
    text: confirmationEmailText(confirmUrl, locale),
  });

  // Log the send attempt (admin client to bypass newsletter_sent RLS)
  const adminClient = createAdminClient();
  const { data: sub } = await adminClient
    .from("newsletter_subscribers")
    .select("id")
    .eq("email", email)
    .single();
  if (sub) {
    await adminClient.from("newsletter_sent").insert({
      subscriber_id: sub.id,
      email_type: "confirm",
      subject: "Confirm your subscription to Anamata Kāhui",
      body_preview: `Confirm at ${confirmUrl}`,
      status: sent ? "sent" : "failed",
      resend_id: sent?.id ?? null,
      error: sendErr ?? null,
      sent_at: sent ? new Date().toISOString() : null,
    });
  }

  if (!sent) {
    // Don't surface the Resend error to the user — but log it.
    // The subscription is recorded; if email fails, we can retry.
    console.error("Newsletter confirm email failed:", sendErr);
    return {
      success:
        "Almost done! We've recorded your subscription. If the confirmation email doesn't arrive within 5 minutes, please contact us.",
    };
  }

  return {
    success:
      "Check your inbox. We've sent a confirmation link — click it within 24 hours to complete your subscription.",
  };
}

/**
 * <ConfirmSubscriptionButton/> action — public, called via /newsletter/confirm.
 */
export async function confirmSubscriptionAction(
  token: string,
): Promise<{ ok: boolean; error?: string; alreadyConfirmed?: boolean }> {
  if (!token) return { ok: false, error: "Missing token." };

  const adminClient = createAdminClient();
  const { data: sub, error: findErr } = await adminClient
    .from("newsletter_subscribers")
    .select("id, email, confirmed, confirm_token_expires_at, unsubscribed_at")
    .eq("confirm_token", token)
    .maybeSingle();

  if (findErr) return { ok: false, error: findErr.message };
  if (!sub) return { ok: false, error: "Invalid or expired link." };

  if (sub.confirmed && !sub.unsubscribed_at) {
    return { ok: true, alreadyConfirmed: true };
  }

  if (sub.confirm_token_expires_at && new Date(sub.confirm_token_expires_at) < new Date()) {
    return { ok: false, error: "This link has expired. Please subscribe again to receive a new link." };
  }

  const { error: updateErr } = await adminClient
    .from("newsletter_subscribers")
    .update({
      confirmed: true,
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", sub.id);

  if (updateErr) return { ok: false, error: updateErr.message };

  // Send welcome email
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://anamatakahui.co.nz";
  const unsubscribeUrl = `${baseUrl}/en/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;

  await sendEmail({
    to: sub.email,
    subject: "Welcome to Anamata Kāhui",
    html: welcomeEmailHtml(unsubscribeUrl),
    text: welcomeEmailText(unsubscribeUrl),
  });

  revalidatePath("/newsletter");
  return { ok: true };
}

/**
 * <UnsubscribeButton/> action.
 */
export async function unsubscribeAction(
  token: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!token) return { ok: false, error: "Missing token." };

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("newsletter_subscribers")
    .update({
      confirmed: false,
      unsubscribed_at: new Date().toISOString(),
    })
    .eq("confirm_token", token);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/newsletter");
  return { ok: true };
}

// =============================================================================
// Email templates
// =============================================================================

function confirmationEmailHtml(confirmUrl: string, locale: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; max-width: 560px; margin: 40px auto; padding: 0 16px; color: #1f1d1a;">
  <h1 style="font-size: 24px; margin-bottom: 16px;">Confirm your subscription</h1>
  <p>Thanks for subscribing to Anamata Kāhui. Click the button below to confirm — link expires in 24 hours.</p>
  <p style="margin: 32px 0;">
    <a href="${confirmUrl}" style="background: #b87333; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: 600;">Confirm subscription</a>
  </p>
  <p style="color: #666; font-size: 14px;">If the button doesn't work, paste this link into your browser:</p>
  <p style="color: #666; font-size: 12px; word-break: break-all;">${confirmUrl}</p>
  <hr style="margin: 32px 0; border: none; border-top: 1px solid #eee;">
  <p style="color: #999; font-size: 12px;">Anamata Kāhui · a collective platform for Aotearoa · anamatakahui.co.nz</p>
</body></html>`;
}

function confirmationEmailText(confirmUrl: string, _locale: string): string {
  return `Confirm your subscription to Anamata Kāhui

Click this link to confirm (expires in 24 hours):
${confirmUrl}

If you didn't sign up, you can ignore this email.

Anamata Kāhui · anamatakahui.co.nz`;
}

function welcomeEmailHtml(unsubscribeUrl: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; max-width: 560px; margin: 40px auto; padding: 0 16px; color: #1f1d1a;">
  <h1 style="font-size: 24px; margin-bottom: 16px;">Welcome to Anamata Kāhui</h1>
  <p>Your subscription is confirmed. You'll get an email when we publish new long-form research or news.</p>
  <p>What to expect:</p>
  <ul>
    <li>Long-form research from the Reads system</li>
    <li>Time-sensitive updates from the News system (releases, features, milestones, partner integrations)</li>
    <li>No spam — only when we publish something substantive</li>
  </ul>
  <p>Browse the latest: <a href="https://anamatakahui.co.nz/en/reads">/reads</a> · <a href="https://anamatakahui.co.nz/en/news">/news</a></p>
  <hr style="margin: 32px 0; border: none; border-top: 1px solid #eee;">
  <p style="color: #999; font-size: 12px;">
    <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a> · Anamata Kāhui · anamatakahui.co.nz
  </p>
</body></html>`;
}

function welcomeEmailText(unsubscribeUrl: string): string {
  return `Welcome to Anamata Kāhui

Your subscription is confirmed. You'll get an email when we publish new long-form research or news.

Browse the latest:
  https://anamatakahui.co.nz/en/reads
  https://anamatakahui.co.nz/en/news

Unsubscribe: ${unsubscribeUrl}

Anamata Kāhui · anamatakahui.co.nz`;
}