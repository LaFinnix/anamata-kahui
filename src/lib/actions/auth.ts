"use server";

/**
 * Auth server actions — wired to /login, /register, /reset-password forms
 * which previously POSTed to non-existent route handlers.
 *
 * Uses `@supabase/ssr` to read/write cookies via next/headers so the session
 * is established immediately in the browser after redirect.
 */

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/clients";
import { safeRedirect } from "@/lib/auth/safe-redirect";
import { rateLimit, clientIpFromHeaders } from "@/lib/auth/rate-limit";

export interface AuthFormState {
  error?: string;
  success?: string;
}

// Rate limits — defence in depth on top of Supabase's built-in.
// 5 login attempts per minute per IP, 3 register / reset per 5 min.
const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 60 * 1000;
const REGISTER_LIMIT = 3;
const REGISTER_WINDOW_MS = 5 * 60 * 1000;

export async function loginAction(
  _prev: AuthFormState | null,
  formData: FormData,
): Promise<AuthFormState> {
  // Rate limit before doing anything else
  const hdrs = await headers();
  const ip = clientIpFromHeaders(hdrs);
  const rl = rateLimit(`login:${ip}`, LOGIN_LIMIT, LOGIN_WINDOW_MS);
  if (!rl.allowed) {
    return {
      error: `Too many sign-in attempts. Try again in ${Math.ceil(rl.retryAfter / 1000)} seconds.`,
    };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/admin");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Don't leak whether the email exists or the password is wrong
    return { error: "Sign in failed. Check your email and password." };
  }

  revalidatePath("/", "layout");
  redirect(safeRedirect(redirectTo));
}

export async function registerAction(
  _prev: AuthFormState | null,
  formData: FormData,
): Promise<AuthFormState> {
  // Rate limit per IP — prevent mass account creation
  const hdrs = await headers();
  const ip = clientIpFromHeaders(hdrs);
  const rl = rateLimit(`register:${ip}`, REGISTER_LIMIT, REGISTER_WINDOW_MS);
  if (!rl.allowed) {
    return {
      error: `Too many sign-up attempts. Try again in ${Math.ceil(rl.retryAfter / 60000)} minutes.`,
    };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (!email || !password || !fullName) {
    return { error: "All fields are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createServerSupabase();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/api/auth/callback`,
      data: { full_name: fullName },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Trigger handle_new_user (in 0001_initial_schema.sql) will create the
  // profile row. If email confirmation is required, the user gets a
  // confirmation email before they can sign in.
  return {
    success:
      "Check your email for a confirmation link. Once confirmed, sign in to access the Kāhui.",
  };
}

export async function resetPasswordAction(
  _prev: AuthFormState | null,
  formData: FormData,
): Promise<AuthFormState> {
  // Rate limit per IP — prevent email enumeration
  const hdrs = await headers();
  const ip = clientIpFromHeaders(hdrs);
  const rl = rateLimit(`reset:${ip}`, REGISTER_LIMIT, REGISTER_WINDOW_MS);
  if (!rl.allowed) {
    return {
      error: `Too many reset attempts. Try again in ${Math.ceil(rl.retryAfter / 60000)} minutes.`,
    };
  }

  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Email is required." };
  }

  const supabase = await createServerSupabase();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password/confirm`,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: "If that email is on file, a recovery link has been sent.",
  };
}

export async function logoutAction() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
