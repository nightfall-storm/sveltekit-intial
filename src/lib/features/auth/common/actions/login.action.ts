import { fail, type ActionFailure } from '@sveltejs/kit';
import { LoginSchema, type LoginInput } from '../schemas/login.schema.js';
import { apiFormPost, type LoginResponse } from '../services/api.client.js';
import { setCookieServer } from '$lib/utils/cookies.server.js';
import type { RequestEvent } from '@sveltejs/kit';

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

export async function loginAction(
	event: RequestEvent
): Promise<LoginActionState | ActionFailure<LoginActionState>> {
	const formData = await event.request.formData();
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

	// Make API call to external endpoint
	const body = {
		username: result.data.username,
		password: result.data.password
	};

	const res = await apiFormPost<LoginResponse>('/auth/login', body);

	// Check if the API response was successful
	if (!res.success) {
		return fail(401, {
			success: false,
			message: res.message || 'Login failed'
		});
	}

	const token = res?.data?.access_token;
	const user = res?.data?.user;

	if (token && user) {
		// Set cookies in parallel
		await Promise.all([
			Promise.resolve(setCookieServer(event, 'fs_at', token)),
			Promise.resolve(setCookieServer(event, 'fs_current_udata', JSON.stringify(user))),
			Promise.resolve(setCookieServer(event, 'fs_user_role', user.role))
		]);

		return {
			success: true
		};
	}

	return fail(401, {
		success: false,
		message: 'Invalid response from server'
	});
}
