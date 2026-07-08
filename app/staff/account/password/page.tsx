// app/staff/account/password/page.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { PasswordChangeSchema } from '@/schemas/auth';
import type { z } from 'zod';

type PasswordChangeFormData = z.infer<typeof PasswordChangeSchema>;

export default function PasswordChangePage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PasswordChangeFormData>({
    resolver: zodResolver(PasswordChangeSchema),
  });

  async function onSubmit(data: PasswordChangeFormData) {
    setServerError(null);
    setFieldErrors({});
    setIsPending(true);

    try {
      const res = await fetch('/api/staff/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json?.error?.field_errors) {
          setFieldErrors(json.error.field_errors);
        } else {
          setServerError(json?.error?.message ?? 'An error occurred. Please try again.');
        }
        return;
      }

      setSuccess(true);
      reset();
      // After successful password change, the session is invalidated (token_version bumped).
      // Redirect to login so user re-authenticates with new password.
      setTimeout(() => router.push('/login'), 2000);
    } catch {
      setServerError('Network error. Please try again.');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-white p-8 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Change password</h1>
          <p className="text-sm text-muted-foreground">
            Password must be at least 12 characters with one uppercase letter and one number.
          </p>
        </div>

        {success && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-md bg-green-50 p-3 text-sm text-green-800"
            data-testid="password-success"
          >
            Password changed successfully. Redirecting to login…
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" data-testid="password-change-form">
          <div className="space-y-1">
            <label htmlFor="current_password" className="text-sm font-medium">
              Current password
            </label>
            <input
              id="current_password"
              type="password"
              autoComplete="current-password"
              aria-label="Current password"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              {...register('current_password')}
            />
            {(errors.current_password || fieldErrors.current_password) && (
              <p className="text-sm text-destructive" role="alert" data-testid="error-current-password">
                {errors.current_password?.message ?? fieldErrors.current_password}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="new_password" className="text-sm font-medium">
              New password
            </label>
            <input
              id="new_password"
              type="password"
              autoComplete="new-password"
              aria-label="New password"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              {...register('new_password')}
            />
            {errors.new_password && (
              <p className="text-sm text-destructive" role="alert">
                {errors.new_password.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="confirm_password" className="text-sm font-medium">
              Confirm new password
            </label>
            <input
              id="confirm_password"
              type="password"
              autoComplete="new-password"
              aria-label="Confirm new password"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              {...register('confirm_password')}
            />
            {errors.confirm_password && (
              <p className="text-sm text-destructive" role="alert">
                {errors.confirm_password.message}
              </p>
            )}
          </div>

          {serverError && (
            <div
              role="alert"
              aria-live="assertive"
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
              data-testid="password-error"
            >
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || success}
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            data-testid="password-submit"
          >
            {isPending ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
