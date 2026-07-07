// types/auth.ts — extends NextAuth session types

import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      role: 'staff' | 'admin';
      department_id: string | null;
      token_version: number;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    username: string;
    role: 'staff' | 'admin';
    department_id: string | null;
    token_version: number;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id: string;
    username: string;
    role: 'staff' | 'admin';
    department_id: string | null;
    token_version: number;
  }
}
