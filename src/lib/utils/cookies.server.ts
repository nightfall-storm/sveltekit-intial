import type { RequestEvent } from '@sveltejs/kit';
import { dev } from '$app/environment';

/**
 * Configuration options for setting cookies on the server side.
 */
export type CookieSetOptions = {
	/** Whether the cookie should be HTTP-only (not accessible via JavaScript) */
	httpOnly?: boolean;
	/** Whether the cookie should only be sent over HTTPS */
	secure?: boolean;
	/** Controls when the cookie is sent with cross-site requests */
	sameSite?: 'lax' | 'strict' | 'none';
	/** The path where the cookie is available */
	path?: string;
	/** Cookie expiration time in seconds */
	maxAge?: number;
	/** Specific expiration date for the cookie */
	expires?: Date;
	/** The domain where the cookie is available */
	domain?: string;
};

/**
 * Default cookie configuration options.
 */
const DEFAULT_COOKIE_OPTIONS: Required<
	Pick<CookieSetOptions, 'httpOnly' | 'secure' | 'sameSite' | 'path' | 'maxAge'>
> = {
	httpOnly: true,
	secure: !dev,
	sameSite: 'lax',
	path: '/',
	maxAge: 60 * 60 * 24 * 1 // 1 day
};

/**
 * Sets a cookie on the server side with the specified options.
 * @param event - The SvelteKit request event
 * @param name - The name of the cookie
 * @param value - The value to store in the cookie
 * @param options - Optional cookie configuration settings
 */
export function setCookieServer(
	event: RequestEvent,
	name: string,
	value: string,
	options?: CookieSetOptions
) {
	const finalOptions = {
		...DEFAULT_COOKIE_OPTIONS,
		...(options ?? {}),
		path: options?.path ?? DEFAULT_COOKIE_OPTIONS.path
	};

	event.cookies.set(name, value, finalOptions);
}

/**
 * Retrieves a cookie value by name from the server side.
 * @param event - The SvelteKit request event
 * @param name - The name of the cookie to retrieve
 * @returns The cookie value or undefined if not found
 */
export function getCookieServer(event: RequestEvent, name: string) {
	return event.cookies.get(name);
}

/**
 * Deletes a cookie by name from the server side.
 * @param event - The SvelteKit request event
 * @param name - The name of the cookie to delete
 */
export function deleteCookieServer(event: RequestEvent, name: string) {
	event.cookies.delete(name, { path: '/' });
}

/**
 * Retrieves the authentication token cookie from the server-side.
 * @param event - The SvelteKit request event
 * @returns The authentication token value or undefined if not found
 */
export function getAuthServer(event: RequestEvent) {
	// Default app auth token, fallback to store manager token if present
	const fs = getCookieServer(event, 'fs_at');
	if (fs) return fs;
	return getCookieServer(event, 'st_manager_at');
}

/** Returns the Store Manager access token specifically (st_manager_at). */
export function getStoreManagerAuthServer(event: RequestEvent) {
	return getCookieServer(event, 'st_manager_at');
}

export function getUserRoleServer(event: RequestEvent) {
	return getCookieServer(event, 'fs_user_role');
}
