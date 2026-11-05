import { describe, expect, it, vi } from "vitest";
import { createEmailSender } from "@/lib/email";

const message = {
  to: "client@example.com",
  subject: "Invoice INV-0001",
  html: "<p>Hi</p>",
  text: "Hi",
};

function fakeFetch(status: number, body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status }));
}

describe("sendEmail", () => {
  it("sends through Resend and returns the message ID", async () => {
    const fetch = fakeFetch(200, { id: "email_123" });
    const send = createEmailSender({
      apiKey: "re_test",
      from: "a@b.co",
      fetch,
    });

    expect(await send(message)).toEqual({ ok: true, id: "email_123" });

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers).toMatchObject({ Authorization: "Bearer re_test" });
    expect(JSON.parse(String(init.body))).toMatchObject({
      from: "a@b.co",
      to: ["client@example.com"],
      subject: "Invoice INV-0001",
    });
  });

  it("returns a clear error when email isn't configured", async () => {
    const fetch = fakeFetch(200, { id: "x" });
    const send = createEmailSender({ fetch });

    expect(await send(message)).toEqual({
      ok: false,
      error: "Email isn't set up yet. Add RESEND_API_KEY and EMAIL_FROM.",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns the provider's reason when it rejects the email", async () => {
    const send = createEmailSender({
      apiKey: "re_test",
      from: "a@b.co",
      fetch: fakeFetch(422, { message: "Invalid `to` field" }),
    });

    expect(await send(message)).toEqual({
      ok: false,
      error: "The email service rejected the message: Invalid `to` field.",
    });
  });

  it("returns an error instead of throwing on a network failure", async () => {
    const send = createEmailSender({
      apiKey: "re_test",
      from: "a@b.co",
      fetch: vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    });

    expect(await send(message)).toEqual({
      ok: false,
      error: "Couldn't reach the email service. Please try again.",
    });
  });
});
