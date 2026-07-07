// schemas/auth.ts
import { z } from 'zod';

export const LoginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

export const PasswordChangeSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(12).max(200).regex(/[A-Z]/).regex(/[0-9]/),
  confirm_password: z.string(),
}).refine(d => d.new_password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});
