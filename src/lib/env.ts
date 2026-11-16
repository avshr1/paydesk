import { z } from "zod";

// Variables are added here as each phase needs them (see README → Environment Variables).
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.url(),
  DIRECT_URL: z.url().optional(),
  APP_URL: z.url().default("http://localhost:3000"),
  // Read directly by Auth.js. Generate one with: npx auth secret
  AUTH_SECRET: z.string().min(32).optional(),
  AUTH_GOOGLE_ID: z.string().min(1).optional(),
  AUTH_GOOGLE_SECRET: z.string().min(1).optional(),
  // Email via Resend (resend.com). Optional until Phase 4 is set up.
  RESEND_API_KEY: z.string().startsWith("re_").optional(),
  EMAIL_FROM: z.string().min(3).optional(),
  // Stripe. Test-mode keys only: this project never takes real payments.
  STRIPE_SECRET_KEY: z
    .string()
    .startsWith("sk_test_", "Use a Stripe test-mode key (sk_test_...)")
    .optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),
  // Protects /api/cron/overdue. Vercel Cron sends it automatically.
  CRON_SECRET: z.string().min(16).optional(),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${details}`);
  }
  const { data } = result;
  // Vercel provides the production domain, so emailed links work without
  // setting APP_URL by hand. An explicit APP_URL always wins.
  if (!source.APP_URL && source.VERCEL_PROJECT_PRODUCTION_URL) {
    data.APP_URL = `https://${source.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return data;
}

export const env = parseEnv(process.env);
