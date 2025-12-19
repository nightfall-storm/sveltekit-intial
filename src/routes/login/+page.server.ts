import { loginAction } from '$lib/features/auth/common/actions/login.action.js';
import type { Actions } from './$types.js';

export const actions: Actions = {
	login: loginAction
};
