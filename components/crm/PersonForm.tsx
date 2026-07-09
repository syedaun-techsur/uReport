'use client';
// components/crm/PersonForm.tsx
// Reusable form for Create / Edit Person — CRM-04
// Uses react-hook-form + Zod resolver for validation
// Fields: name, email, phone, notes, preferred_contact

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreatePersonSchema, type CreatePersonInput } from '@/schemas/person';

interface PersonFormProps {
  /** Initial values for edit mode */
  defaultValues?: Partial<CreatePersonInput>;
  /** Submit handler — receives validated form data */
  onSubmit: (data: CreatePersonInput) => Promise<void>;
  /** Label for the submit button */
  submitLabel?: string;
  /** Whether submission is in progress */
  isSubmitting?: boolean;
}

export function PersonForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Save',
  isSubmitting = false,
}: PersonFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreatePersonInput>({
    resolver: zodResolver(CreatePersonSchema),
    defaultValues: defaultValues ?? {},
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {/* Name */}
      <div className="flex flex-col gap-1">
        <label htmlFor="person-name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="person-name"
          type="text"
          autoComplete="name"
          placeholder="Full name"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          {...register('name')}
        />
        {errors.name && (
          <p role="alert" className="text-xs text-destructive">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1">
        <label htmlFor="person-email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="person-email"
          type="email"
          autoComplete="email"
          placeholder="constituent@example.com"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          {...register('email')}
        />
        {errors.email && (
          <p role="alert" className="text-xs text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Phone */}
      <div className="flex flex-col gap-1">
        <label htmlFor="person-phone" className="text-sm font-medium">
          Phone
        </label>
        <input
          id="person-phone"
          type="tel"
          autoComplete="tel"
          placeholder="(555) 555-5555"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          {...register('phone')}
        />
        {errors.phone && (
          <p role="alert" className="text-xs text-destructive">
            {errors.phone.message}
          </p>
        )}
      </div>

      {/* Preferred Contact */}
      <div className="flex flex-col gap-1">
        <label htmlFor="person-preferred-contact" className="text-sm font-medium">
          Preferred Contact Method
        </label>
        <select
          id="person-preferred-contact"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          {...register('preferred_contact')}
        >
          <option value="">Not specified</option>
          <option value="email">Email</option>
          <option value="phone">Phone</option>
          <option value="none">No contact preferred</option>
        </select>
        {errors.preferred_contact && (
          <p role="alert" className="text-xs text-destructive">
            {errors.preferred_contact.message}
          </p>
        )}
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1">
        <label htmlFor="person-notes" className="text-sm font-medium">
          Notes
        </label>
        <textarea
          id="person-notes"
          rows={4}
          placeholder="Internal notes about this constituent..."
          className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          {...register('notes')}
        />
        {errors.notes && (
          <p role="alert" className="text-xs text-destructive">
            {errors.notes.message}
          </p>
        )}
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          {isSubmitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
