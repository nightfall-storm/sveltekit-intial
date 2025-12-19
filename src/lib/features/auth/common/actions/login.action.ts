import { fail, type ActionFailure } from '@sveltejs/kit';
import { LoginSchema, type LoginInput } from '../schemas/login.schema.js';

export type LoginActionState =
	| {
			success: true;
	  }
	| {
			success: false;
			message?: string;
			error?: string;
			issues?: Partial<Record<keyof LoginInput, string[]>>;
	  };

export async function loginAction({
	request
}: {
	request: Request;
}): Promise<LoginActionState | ActionFailure<LoginActionState>> {
	const formData = await request.formData();
	const rawData = {
		username: formData.get('email'),
		password: formData.get('password')
	};

	const result = LoginSchema.safeParse(rawData);

	if (!result.success) {
		const issues: Partial<Record<keyof LoginInput, string[]>> = {};
		for (const error of result.error.issues) {
			const path = error.path[0] as keyof LoginInput;
			if (path) {
				if (!issues[path]) {
					issues[path] = [];
				}
				issues[path]!.push(error.message);
			}
		}
		return fail(400, {
			success: false,
			issues
		});
	}

	// TODO: Implement actual login logic here
	// For now, this is a placeholder that always fails
	// Replace with your actual authentication logic

	return fail(401, {
		success: false,
		message: 'Invalid email or password'
	});
}
