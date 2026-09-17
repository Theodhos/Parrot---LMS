import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db/client";
import { loginSchema } from "@/features/auth/schemas/auth.schema";
import { verifyCredentials } from "@/features/auth/services/auth.service";

const oauthProviders: NextAuthConfig["providers"] = [];
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  oauthProviders.push(Google);
}
if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  oauthProviders.push(GitHub);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Trust the incoming request's Host header to build redirect URLs instead
  // of a static NEXTAUTH_URL env var. Vercel's production/preview URLs can
  // change (or the env var can simply be set wrong, as it was here) --
  // without this, a misconfigured/stale NEXTAUTH_URL silently sends every
  // post-login redirect to whatever host it says (e.g. localhost) instead
  // of wherever the visitor actually is. Safe on Vercel (its edge network
  // sets Host correctly) and in local dev.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;

        try {
          const user = await verifyCredentials(parsed.data.email, parsed.data.password);
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role,
            wordpressUserId: user.wordpressUserId,
          };
        } catch {
          return null;
        }
      },
    }),
    ...oauthProviders,
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.role = user.role;
        token.wordpressUserId = user.wordpressUserId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.wordpressUserId = token.wordpressUserId;
      }
      return session;
    },
  },
});
