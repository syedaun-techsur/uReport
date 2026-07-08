// app/login/page.tsx
'use client';

import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { LoginSchema } from '@/schemas/auth';
import type { z } from 'zod';

type LoginFormData = z.infer<typeof LoginSchema>;

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/staff/tickets';
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
  });

  async function onSubmit(data: LoginFormData) {
    setServerError(null);
    setIsPending(true);

    // redirect:false so we can show credential errors inline instead of letting
    // Auth.js bounce to its error page.
    const result = await signIn('credentials', {
      identifier: data.identifier,
      password: data.password,
      redirect: false,
    });

    setIsPending(false);

    if (!result?.ok || result?.error) {
      // Generic message — never leak whether username or password was wrong
      setServerError('Invalid username or password');
      return;
    }

    // Auth succeeded — do a real full-page navigation to the (relative) callback
    // URL: this makes the browser send the freshly-set session cookie and runs
    // middleware server-side, and a relative URL resolves against the current
    // preview origin (no 0.0.0.0/host leak). Guard against open redirects.
    const target = callbackUrl.startsWith('/') ? callbackUrl : '/staff/tickets';
    window.location.assign(target);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-white p-8 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-sm text-muted-foreground">uReport NG — City of Bloomington 311</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" data-testid="login-form">
          <div className="space-y-1">
            <label htmlFor="identifier" className="text-sm font-medium">
              Username or email
            </label>
            <input
              id="identifier"
              type="text"
              autoComplete="username"
              aria-label="Username or email"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              {...register('identifier')}
            />
            {errors.identifier && (
              <p className="text-sm text-destructive" role="alert">
                {errors.identifier.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-label="Password"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>

          {serverError && (
            <div
              role="alert"
              aria-live="assertive"
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
              data-testid="login-error"
            >
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            data-testid="login-submit"
          >
            {isPending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  // useSearchParams() must be inside a Suspense boundary, or the production build
  // fails the CSR-bailout prerender check for /login.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
