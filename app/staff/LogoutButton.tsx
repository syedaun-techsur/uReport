'use client';

import { signOut } from 'next-auth/react';

export default function LogoutButton() {
  return (
    <button
      data-testid="logout-btn"
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      Log out
    </button>
  );
}
