// app/admin/layout.tsx
// Admin panel layout — provides nav, logout, and admin-only nav links

import LogoutButton from '@/app/staff/LogoutButton';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="flex items-center justify-between px-6 py-3 border-b bg-background">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold text-foreground">uReport NG — Admin</span>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/admin/users" className="hover:text-foreground transition-colors">
              Users
            </Link>
            <Link href="/admin/api-keys" className="hover:text-foreground transition-colors">
              API Keys
            </Link>
            <Link href="/admin/audit-log" className="hover:text-foreground transition-colors">
              Audit Log
            </Link>
          </div>
        </div>
        <LogoutButton />
      </nav>
      <main className="p-6">{children}</main>
    </>
  );
}
