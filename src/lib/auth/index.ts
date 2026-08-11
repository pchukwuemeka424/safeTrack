import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDb } from "@/lib/db/connection";
import { User } from "@/models/User";
import { writeAuditLog } from "@/lib/audit/write";
import type { UserRole } from "@/types";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        await connectDb();
        const user = await User.findOne({
          email: parsed.data.email.toLowerCase(),
        });

        if (!user || !user.isActive) return null;

        if (user.lockUntil && user.lockUntil > new Date()) {
          return null;
        }

        const valid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash,
        );

        if (!valid) {
          user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
          if (user.failedLoginAttempts >= 5) {
            user.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
          }
          await user.save();
          return null;
        }

        user.failedLoginAttempts = 0;
        user.lockUntil = null;
        user.lastLoginAt = new Date();
        await user.save();

        await writeAuditLog({
          actorId: user._id.toString(),
          action: "LOGIN",
          resourceType: "User",
          resourceId: user._id.toString(),
        });

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role as UserRole,
          emailVerified: user.emailVerified,
          mfaEnabled: user.mfaEnabled,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: UserRole }).role;
        token.emailVerified = (user as { emailVerified?: boolean }).emailVerified;
        token.mfaEnabled = (user as { mfaEnabled?: boolean }).mfaEnabled;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        (session.user as { emailVerified: boolean }).emailVerified =
          Boolean(token.emailVerified);
        session.user.mfaEnabled = Boolean(token.mfaEnabled);
      }
      return session;
    },
  },
});
