'use client';
// components/admin/UserForm.tsx
// Admin user create/edit form — rendered inside a shadcn Sheet
// ADMIN-05: User account management

import { useState, useEffect } from 'react';

interface Department {
  id: string;
  name: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  role: 'staff' | 'admin';
  department_id: string | null;
  active: boolean;
}

interface UserFormProps {
  user?: User; // undefined = create mode; defined = edit mode
  onSuccess: () => void;
  onCancel: () => void;
}

export function UserForm({ user, onSuccess, onCancel }: UserFormProps) {
  const isEdit = Boolean(user);

  const [username, setUsername] = useState(user?.username ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'staff' | 'admin'>(user?.role ?? 'staff');
  const [departmentId, setDepartmentId] = useState<string>(user?.department_id ?? '');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/staff/departments')
      .then((r) => r.json())
      .then((data: { data: Department[] }) => setDepartments(data.data ?? []))
      .catch(() => setDepartments([]));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const url = isEdit ? `/api/admin/users/${user!.id}` : '/api/admin/users';
      const method = isEdit ? 'PATCH' : 'POST';
      const body: Record<string, unknown> = {
        role,
        department_id: departmentId || null,
      };

      if (!isEdit) {
        body.username = username;
        body.email = email;
        body.password = password;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = (await res.json()) as { error?: { code?: string; message?: string } };
        const code = json.error?.code;
        if (code === 'DUPLICATE_USERNAME') {
          setError('Username already exists. Please choose a different username.');
        } else if (code === 'DUPLICATE_EMAIL') {
          setError('Email already exists. Please use a different email address.');
        } else {
          setError(json.error?.message ?? 'An error occurred. Please try again.');
        }
        return;
      }

      onSuccess();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{isEdit ? 'Edit User' : 'Create User'}</h2>

      {error && (
        <div
          role="alert"
          data-testid="user-form-error"
          className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded"
        >
          {error}
        </div>
      )}

      {!isEdit && (
        <>
          <div className="flex flex-col gap-1">
            <label htmlFor="username" className="text-sm font-medium">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              pattern="[a-zA-Z0-9_-]+"
              minLength={1}
              maxLength={50}
              className="px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. jsmith"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="jsmith@bloomington.in.gov"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={12}
              className="px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Min 12 chars, uppercase, number"
            />
          </div>
        </>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="role" className="text-sm font-medium">
          Role <span className="text-red-500">*</span>
        </label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value as 'staff' | 'admin')}
          className="px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
        >
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="department" className="text-sm font-medium">
          Department
        </label>
        <select
          id="department"
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          className="px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
        >
          <option value="">— None —</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          data-testid="user-form-submit"
          className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create User'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium border rounded hover:bg-muted transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
