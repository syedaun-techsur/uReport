// app/admin/page.tsx
// Admin landing page — redirects to user management

import { redirect } from 'next/navigation';

export default function AdminPage() {
  redirect('/admin/users');
}
