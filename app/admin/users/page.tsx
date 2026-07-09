'use client';
// app/admin/users/page.tsx
// Admin user management page — list, create, edit, deactivate, reset password
// ADMIN-05: User account management

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserForm } from '@/components/admin/UserForm';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'staff' | 'admin';
  active: boolean;
  department_id: string | null;
  department: { name: string } | null;
  created_at: string;
  updated_at: string;
}

interface PaginationMeta {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ total: 0, page: 1, page_size: 25, total_pages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>(undefined);
  const [page, setPage] = useState(1);

  // Reset password dialog
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetUsername, setResetUsername] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Current session user ID (stored in first user whose username = 'admin' — fallback approach)
  // We determine self by reading from the response; server enforces the guard
  const [selfId, setSelfId] = useState<string | null>(null);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users?page=${page}&page_size=25`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to load users');
      }
      const json = (await res.json()) as { data: User[]; meta: PaginationMeta };
      setUsers(json.data);
      setMeta(json.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [page, router]);

  // Get current user ID from admin/me to identify self (for disabling deactivate-self button)
  useEffect(() => {
    fetch('/api/admin/me')
      .then((r) => r.json())
      .then((data: { id?: string }) => {
        if (data.id) setSelfId(data.id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  async function handleToggleActive(user: User) {
    const newActive = !user.active;
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: newActive }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: { code?: string; message?: string } };
        if (json.error?.code === 'SELF_DEACTIVATION') {
          showToast('You cannot deactivate your own account.', 'error');
        } else {
          showToast(json.error?.message ?? 'Failed to update user.', 'error');
        }
        return;
      }
      showToast(`User ${newActive ? 'reactivated' : 'deactivated'} successfully.`);
      void fetchUsers();
    } catch {
      showToast('Network error. Please try again.', 'error');
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetError(null);

    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }

    setResetSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${resetUserId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: newPassword }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: { message?: string } };
        setResetError(json.error?.message ?? 'Failed to reset password.');
        return;
      }
      setResetUserId(null);
      setNewPassword('');
      setConfirmPassword('');
      showToast(`Password reset successfully for ${resetUsername}.`);
    } catch {
      setResetError('Network error. Please try again.');
    } finally {
      setResetSubmitting(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <button
          type="button"
          data-testid="create-user-btn"
          onClick={() => {
            setEditingUser(undefined);
            setShowForm(true);
          }}
          className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
        >
          + Create User
        </button>
      </div>

      {/* Toast notification */}
      {toast && (
        <div
          role="alert"
          data-testid="toast"
          className={`mb-4 p-3 text-sm rounded border ${
            toast.type === 'error'
              ? 'text-red-700 bg-red-50 border-red-200'
              : 'text-green-700 bg-green-50 border-green-200'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* User form (create/edit) — rendered inline as a panel */}
      {showForm && (
        <div className="mb-6 p-6 border rounded-lg bg-card shadow-sm">
          <UserForm
            user={editingUser}
            onSuccess={() => {
              setShowForm(false);
              setEditingUser(undefined);
              showToast(editingUser ? 'User updated.' : 'User created successfully.');
              void fetchUsers();
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingUser(undefined);
            }}
          />
        </div>
      )}

      {/* Reset Password dialog */}
      {resetUserId && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        >
          <div className="bg-background border rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h2 className="text-lg font-semibold mb-4">Reset Password for {resetUsername}</h2>
            <form onSubmit={handleResetPassword} className="flex flex-col gap-3">
              {resetError && (
                <div role="alert" className="p-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
                  {resetError}
                </div>
              )}
              <div className="flex flex-col gap-1">
                <label htmlFor="new-password" className="text-sm font-medium">
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={12}
                  className="px-3 py-2 border rounded text-sm"
                  placeholder="Min 12 chars, uppercase, number"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="confirm-password" className="text-sm font-medium">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="px-3 py-2 border rounded text-sm"
                  placeholder="Repeat new password"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={resetSubmitting}
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                >
                  {resetSubmitting ? 'Resetting…' : 'Reset Password'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResetUserId(null);
                    setNewPassword('');
                    setConfirmPassword('');
                    setResetError(null);
                  }}
                  className="px-4 py-2 text-sm border rounded hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading && <p className="text-muted-foreground text-sm">Loading users…</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}

      {!isLoading && !error && (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm" data-testid="users-table">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Username</th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Role</th>
                  <th className="px-4 py-3 text-left font-medium">Department</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isSelf = selfId !== null && user.id === selfId;
                  return (
                    <tr key={user.id} className="border-t hover:bg-muted/50">
                      <td className="px-4 py-3 font-mono">{user.username}</td>
                      <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            user.role === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {user.department?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            user.active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {user.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            data-testid={`edit-user-${user.id}`}
                            onClick={() => {
                              setEditingUser(user);
                              setShowForm(true);
                            }}
                            className="text-xs px-2 py-1 border rounded hover:bg-muted"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            data-testid={`toggle-active-${user.id}`}
                            disabled={isSelf && user.active}
                            onClick={() => void handleToggleActive(user)}
                            title={isSelf && user.active ? 'Cannot deactivate your own account' : undefined}
                            className={`text-xs px-2 py-1 border rounded ${
                              isSelf && user.active
                                ? 'opacity-40 cursor-not-allowed'
                                : 'hover:bg-muted'
                            }`}
                          >
                            {user.active ? 'Deactivate' : 'Reactivate'}
                          </button>
                          <button
                            type="button"
                            data-testid={`reset-password-${user.id}`}
                            onClick={() => {
                              setResetUserId(user.id);
                              setResetUsername(user.username);
                            }}
                            className="text-xs px-2 py-1 border rounded hover:bg-muted"
                          >
                            Reset PW
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.total_pages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <span className="text-muted-foreground">
                {meta.total} total users — page {meta.page} of {meta.total_pages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 border rounded hover:bg-muted disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(meta.total_pages, p + 1))}
                  disabled={page === meta.total_pages}
                  className="px-3 py-1.5 border rounded hover:bg-muted disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
