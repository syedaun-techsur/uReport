'use client';

import { signOut } from 'next-auth/react';

export default function LogoutButton() {
  return (
    <button
      data-testid="logout-btn"
      onClick={async () => {
        // redirect:false + manual RELATIVE navigation: Auth.js's own redirect
        // built an absolute logout URL from the 0.0.0.0 bind host
        // ("0.0.0.0 refused to connect"). A relative URL resolves against the
        // current preview origin, so logout lands on /login correctly.
        await signOut({ redirect: false });
        window.location.assign('/login');
      }}
      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      Log out
    </button>
  );
}
