import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { Provider } from "next-auth/providers";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { verifyPassword } from "@/lib/password";
import { logInSchema } from "@/lib/validation/auth";

// Compared against when the email doesn't exist, so a login attempt takes the
// same time either way and doesn't reveal which emails have accounts.
const DUMMY_HASH =
  "$2b$12$GTqSUsWfnIQNf4NZXbnclO0Tz/0DQDeoT59nYhUhfbTz4Loa518RS";

const providers: Provider[] = [
  Credentials({
    credentials: { email: {}, password: {} },
    async authorize(credentials) {
      const parsed = logInSchema.safeParse(credentials);
      if (!parsed.success) return null;

      const user = await db.user.findUnique({
        where: { email: parsed.data.email },
      });
      const valid = await verifyPassword(
        parsed.data.password,
        user?.passwordHash ?? DUMMY_HASH,
      );
      if (!user?.passwordHash || !valid) return null;

      return { id: user.id, email: user.email, name: user.name };
    },
  }),
];

// Google login is only enabled once its credentials are configured.
if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) {
  providers.push(Google);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // JWT sessions: see docs/decisions.md #6.
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    signIn({ account, profile }) {
      // Only accept Google accounts whose email Google has verified.
      if (account?.provider === "google")
        return profile?.email_verified === true;
      return true;
    },
    async jwt({ token, user, account }) {
      if (account?.provider === "google" && token.email) {
        // Find or create the Paydesk user for this Google account.
        const dbUser = await db.user.upsert({
          where: { email: token.email.toLowerCase() },
          update: {},
          create: { email: token.email.toLowerCase(), name: token.name },
        });
        token.userId = dbUser.id;
      } else if (user?.id) {
        token.userId = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token.userId) session.user.id = token.userId;
      return session;
    },
  },
});
