import { API_URL } from '$env/static/private';

/** HTTP method type definition */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/** Pagination response type */
export type Pagination = {
	current_page: number;
	last_page: number;
	per_page: number;
	total: number;
};

/** API error response type */
export type ApiError = {
	status: number;
	message: string;
	detail?: unknown;
};

/**
 * API response type with success/error discrimination
 * Use `if (res.success)` to narrow the type
 */
export type ApiResponse<T = unknown> =
	| {
			success: true;
			data: T; // 'data' is now the raw, full response body
			message?: string;
			error?: never;
	  }
	| {
			success: false;
			data?: never;
			message?: string;
			error: ApiError;
	  };

/** API request body serialization mode */
type ApiMode = 'json' | 'form' | 'urlencoded';
export type QueryPrimitive = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryPrimitive | QueryPrimitive[]>;

/**
 * Builds a query string from parameters object
 */
function buildQueryString(params?: QueryParams): string {
	if (!params) return '';
	const usp = new URLSearchParams();
	Object.entries(params).forEach(([key, value]) => {
		if (value == null) return;
		if (Array.isArray(value)) {
			value.forEach((v) => {
				if (v == null) return;
				usp.append(key, String(v));
			});
			return;
		}
		usp.set(key, String(value));
	});
	const qs = usp.toString();
	return qs ? `?${qs}` : '';
}

/**
 * API client class for making authenticated HTTP requests
 */
class Api {
	baseURL: string;
	mode: ApiMode;
	private defaultTimeoutMs: number;

	/**
	 * Creates a new API client instance
	 * @param baseURL - Base URL for all API requests
	 * @param mode - Request body serialization mode (default: "json")
	 * @param options - Additional configuration options
	 * @param options.timeoutMs - Request timeout in milliseconds (default: 30000)
	 */
	constructor(baseURL: string, mode: ApiMode = 'json', options?: { timeoutMs?: number }) {
		this.baseURL = baseURL;
		this.mode = mode;
		this.defaultTimeoutMs = options?.timeoutMs ?? 30000;
	}

	private buildBaseHeaders(): Record<string, string> {
		const headers: Record<string, string> = { Accept: 'application/json' };
		if (this.mode === 'json') headers['Content-Type'] = 'application/json';
		else if (this.mode === 'urlencoded')
			headers['Content-Type'] = 'application/x-www-form-urlencoded';
		return headers;
	}

	private async buildHeaders(token?: string): Promise<Record<string, string>> {
		const headers = this.buildBaseHeaders();
		if (token) headers['Authorization'] = `Bearer ${token}`;
		return headers;
	}

	private serializeBody(body?: unknown): BodyInit | undefined {
		if (body == null) return undefined;
		if (this.mode === 'json') return JSON.stringify(body);
		if (this.mode === 'urlencoded') {
			if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams)
				return body.toString();
			const params = new URLSearchParams();
			const appendParam = (key: string, value: unknown) => {
				if (value === undefined || value === null) {
					params.append(key, '');
					return;
				}
				if (value instanceof Date) {
					params.append(key, value.toISOString());
					return;
				}
				if (Array.isArray(value)) {
					for (const v of value) appendParam(`${key}[]`, v);
					return;
				}
				if (typeof value === 'object') {
					Object.entries(value as Record<string, unknown>).forEach(([subKey, subVal]) =>
						appendParam(`${key}[${subKey}]`, subVal)
					);
					return;
				}
				params.append(key, String(value));
			};
			Object.entries(body as Record<string, unknown>).forEach(([k, v]) => appendParam(k, v));
			return params.toString();
		}
		// Form Data
		if (typeof FormData !== 'undefined' && body instanceof FormData) return body;
		const fd = new FormData();
		const appendFD = (key: string, value: unknown) => {
			if (value === undefined || value === null) {
				fd.append(key, '');
				return;
			}
			if (typeof File !== 'undefined' && value instanceof File) {
				fd.append(key, value, value.name || 'file');
				return;
			}
			if (value instanceof Blob) {
				fd.append(key, value);
				return;
			}
			if (value instanceof Date) {
				fd.append(key, value.toISOString());
				return;
			}
			if (Array.isArray(value)) {
				for (const v of value) appendFD(`${key}[]`, v);
				return;
			}
			if (typeof value === 'object') {
				Object.entries(value as Record<string, unknown>).forEach(([subKey, subVal]) =>
					appendFD(`${key}[${subKey}]`, subVal)
				);
				return;
			}
			fd.append(key, String(value));
		};
		Object.entries(body as Record<string, unknown>).forEach(([k, v]) => appendFD(k, v));
		return fd;
	}

	private async request<T = unknown>(
		path: string,
		method: HttpMethod,
		body?: unknown,
		init?: RequestInit & {
			timeoutMs?: number;
			token?: string;
		}
	): Promise<ApiResponse<T>> {
		const { token, ...fetchInit } = init || {};

		const controller = new AbortController();
		const signals: AbortSignal[] = [];
		if (fetchInit?.signal) signals.push(fetchInit.signal);
		const timeoutMs = fetchInit?.timeoutMs ?? this.defaultTimeoutMs;
		let timeoutId: ReturnType<typeof setTimeout> | undefined;
		if (timeoutMs && timeoutMs > 0) {
			timeoutId = setTimeout(() => controller.abort(), timeoutMs);
		}
		for (const sig of signals) {
			if (sig.aborted) controller.abort(sig.reason);
			else
				sig.addEventListener('abort', () => controller.abort(sig.reason), {
					once: true
				});
		}

		try {
			const baseHeaders = await this.buildHeaders(token);
			const finalFetchInit: RequestInit = {
				...fetchInit,
				cache: 'no-store',
				headers: {
					...baseHeaders,
					...fetchInit?.headers,
					'Cache-Control': 'no-store, max-age=0'
				}
			};

			const res = await fetch(`${this.baseURL}${path}`, {
				method,
				body: this.serializeBody(body),
				...finalFetchInit,
				signal: controller.signal
			});

			// Handle 204 No Content
			if (res.status === 204) {
				return {
					success: true,
					data: {} as T,
					message: 'No Content'
				};
			}

			// Parse Response
			const contentType = (res.headers.get('content-type') || '').toLowerCase();
			let parsed: unknown;
			try {
				if (contentType.includes('application/json')) {
					parsed = await res.json();
				} else {
					parsed = await res.text();
				}
			} catch {
				parsed = null;
			}

			// Handle HTTP Errors
			if (!res.ok) {
				console.error(parsed || res);
				let message = res.statusText || 'Request failed';
				let detail: unknown = undefined;

				if (typeof parsed === 'object' && parsed !== null) {
					const parsedObj = parsed as Record<string, unknown>;
					if ('detail' in parsedObj) {
						detail = parsedObj.detail;
						if (Array.isArray(detail)) {
							message = detail
								.map((item: unknown) =>
									typeof item === 'string'
										? item
										: (item as { msg?: string })?.msg || JSON.stringify(item)
								)
								.join('; ');
						} else if (typeof detail === 'string') {
							message = detail;
						} else if (typeof detail === 'object') {
							message = (detail as { msg?: string })?.msg || JSON.stringify(detail);
						}
					} else if ('message' in parsedObj) {
						message = String(parsedObj.message);
					}
				} else if (typeof parsed === 'string') {
					message = parsed.slice(0, 300);
				}

				return {
					success: false,
					error: { status: res.status, message, detail },
					message
				};
			}

			// Handle Success (Raw Return)
			return {
				success: true,
				data: parsed as T,
				message: (parsed as { message?: string })?.message || 'OK'
			};
		} catch (e: unknown) {
			const err = e as Error;
			const message =
				err.name === 'AbortError' ? 'Request aborted' : err.message || 'Network error';

			return {
				success: false,
				error: { status: 0, message },
				message
			};
		} finally {
			if (timeoutId) clearTimeout(timeoutId);
		}
	}

	/**
	 * Makes a GET request to the API
	 * @param path - API endpoint path
	 * @param params - Query parameters (optional)
	 * @param token - Authentication token (optional)
	 */
	get<T = unknown>(path: string, params?: QueryParams, token?: string) {
		const url = `${path}${buildQueryString(params)}`;
		return this.request<T>(url, 'GET', undefined, { token });
	}

	/**
	 * Makes a POST request to the API
	 * @param path - API endpoint path
	 * @param body - Request body
	 * @param token - Authentication token (optional)
	 */
	post<T = unknown>(path: string, body: unknown, token?: string) {
		return this.request<T>(path, 'POST', body, { token });
	}

	/**
	 * Makes a PUT request to the API
	 * @param path - API endpoint path
	 * @param body - Request body
	 * @param token - Authentication token (optional)
	 */
	put<T = unknown>(path: string, body: unknown, token?: string) {
		return this.request<T>(path, 'PUT', body, { token });
	}

	/**
	 * Makes a PATCH request to the API
	 * @param path - API endpoint path
	 * @param body - Request body
	 * @param token - Authentication token (optional)
	 */
	patch<T = unknown>(path: string, body: unknown, token?: string) {
		return this.request<T>(path, 'PATCH', body, { token });
	}

	/**
	 * Makes a DELETE request to the API
	 * @param path - API endpoint path
	 * @param token - Authentication token (optional)
	 */
	delete<T = unknown>(path: string, token?: string) {
		return this.request<T>(path, 'DELETE', undefined, { token });
	}

	/**
	 * Makes a DELETE request with body to the API
	 * @param path - API endpoint path
	 * @param body - Request body
	 * @param token - Authentication token (optional)
	 */
	deleteWithBody<T = unknown>(path: string, body: unknown, token?: string) {
		return this.request<T>(path, 'DELETE', body, { token });
	}
}

const BASE_URL = API_URL || '';

export const apiJson = new Api(BASE_URL, 'json');
export const apiForm = new Api(BASE_URL, 'form');
export const apiUrlEncoded = new Api(BASE_URL, 'urlencoded');
export const api = apiJson;
