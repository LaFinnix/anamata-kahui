/**
 * Resend email client.
 *
 * Fail-gracefully: if RESEND_API_KEY is not set, we log a warning and
 * return sent=null + error. Subscriptions still record in the DB so
 * the user can be backfilled when the key is added.
 *
 * Why fail-gracefully: Resend is a real-money service (you pay per
 * email). We don't want to silently send or fail the action in dev
 * environments. The platform is designed to work with or without
 * the key.
 */

interface SendParams {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
}

interface SendResult {
  id: string | null;
  sent: boolean;
  error?: string;
}

export async function sendEmail(params: SendParams): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    params.from ??
    process.env.RESEND_FROM ??
    "Anamata Kāhui <hello@anamatakahui.co.nz>";

  if (!apiKey) {
    return {
      id: null,
      sent: false,
      error:
        "RESEND_API_KEY is not set. Email not sent. Subscription is recorded in the database; the user can be notified later.",
    };
  }

  if (!apiKey.startsWith("re_")) {
    return {
      id: null,
      sent: false,
      error: "RESEND_API_KEY does not start with 're_' — looks like a placeholder, not a real key.",
    };
  }

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return {
        id: null,
        sent: false,
        error: `Resend API error (${resp.status}): ${text.slice(0, 200)}`,
      };
    }

    const data = (await resp.json()) as { id?: string };
    return { id: data.id ?? null, sent: true };
  } catch (e) {
    return {
      id: null,
      sent: false,
      error: `Resend request failed: ${(e as Error).message}`,
    };
  }
}