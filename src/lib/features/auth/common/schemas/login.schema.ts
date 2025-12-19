import { z } from 'zod';

export const LoginSchema = z.object({
	username: z.string().email('Invalid email address'),
	password: z.string().min(1, 'Password is required')
});

export type LoginInput = z.infer<typeof LoginSchema>;
