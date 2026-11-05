import { env } from "@/lib/env";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendResult =
  { ok: true; id: string } | { ok: false; error: string };

type EmailConfig = {
  apiKey?: string;
  from?: string;
  fetch?: typeof fetch;
};

// Sends through Resend's HTTP API. Never throws: callers get a result they
// can log to EmailLog and show to the user.
export function createEmailSender({
  apiKey,
  from,
  fetch: fetchImpl = fetch,
}: EmailConfig) {
  return async function sendEmail(message: EmailMessage): Promise<SendResult> {
    if (!apiKey || !from) {
      return {
        ok: false,
        error: "Email isn't set up yet. Add RESEND_API_KEY and EMAIL_FROM.",
      };
    }

    try {
      const response = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, ...message, to: [message.to] }),
        signal: AbortSignal.timeout(10_000),
      });

      const body = (await response.json().catch(() => null)) as {
        id?: string;
        message?: string;
      } | null;

      if (!response.ok || !body?.id) {
        return {
          ok: false,
          error: `The email service rejected the message${body?.message ? `: ${body.message}` : ""}.`,
        };
      }
      return { ok: true, id: body.id };
    } catch {
      return {
        ok: false,
        error: "Couldn't reach the email service. Please try again.",
      };
    }
  };
}

export const sendEmail = createEmailSender({
  apiKey: env.RESEND_API_KEY,
  from: env.EMAIL_FROM,
});
