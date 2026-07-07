// lib/auth.ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { log } from '@/lib/logger';
import { LoginSchema } from '@/schemas/auth';

const nextAuth = NextAuth({
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Validate input shape with Zod
        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { username, password } = parsed.data;

        // TechArch §5.1: SELECT WHERE lower(username) = lower($1) AND active = true
        const user = await prisma.user.findFirst({
          where: {
            username: { equals: username, mode: 'insensitive' },
            active: true,
          },
        });

        if (!user) {
          log.warn({ event: 'auth_failed', reason: 'user_not_found' });
          return null; // No enumeration: same null as wrong password
        }

        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
          log.warn({ event: 'auth_failed', reason: 'invalid_password', userId: user.id });
          return null;
        }

        log.info({ event: 'auth_success', userId: user.id, role: user.role });

        // Return shape must match the User interface in types/auth.ts
        return {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role as 'staff' | 'admin',
          department_id: user.department_id,
          token_version: user.token_version,
        };
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    // AUTH_SESSION_TTL defaults to 8 hours (28800 seconds)
    maxAge: parseInt(process.env.AUTH_SESSION_TTL ?? '28800', 10),
  },

  callbacks: {
    async jwt({ token, user }) {
      // On initial sign-in: user object is populated, copy fields into JWT
      if (user) {
        token.id = user.id;
        token.username = (user as { username: string }).username;
        token.role = (user as { role: 'staff' | 'admin' }).role;
        token.department_id = (user as { department_id: string | null }).department_id;
        token.token_version = (user as { token_version: number }).token_version;
      }

      // TechArch §5.1 token version invalidation check:
      // On every request with an existing JWT, verify token_version hasn't been incremented
      if (token.id && token.token_version !== undefined) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { token_version: true, active: true },
        });
        // Reject if user deactivated or token_version bumped (admin password reset)
        if (!dbUser || !dbUser.active || dbUser.token_version > (token.token_version as number)) {
          log.warn({ event: 'token_rejected', userId: token.id, reason: 'token_version_mismatch_or_deactivated' });
          return null; // Returning null forces Auth.js to clear the session
        }
      }

      return token;
    },

    async session({ session, token }) {
      // Propagate JWT fields into the session object
      if (token) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as 'staff' | 'admin';
        session.user.department_id = token.department_id as string | null;
        session.user.token_version = token.token_version as number;
      }
      return session;
    },
  },

  pages: {
    signIn: '/login',
    error: '/login', // Redirect auth errors back to login page
  },

  // Cookie config from TechArch §5.1
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
});

export const { auth, handlers, signIn, signOut } = nextAuth;
// Re-export GET and POST for the catch-all route handler
export const { GET, POST } = nextAuth.handlers;
