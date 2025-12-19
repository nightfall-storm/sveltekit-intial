import { API_URL } from '$env/static/private';

export type ApiResponse<T = unknown> = {
	success: boolean;
	message?: string;
	data?: T;
};

export type LoginResponse = {
	access_token: string;
	user: {
		role: string;
		[key: string]: unknown;
	};
};

/**
 * Makes a POST request to the API with form data
 */
export async function apiFormPost<T = unknown>(
	endpoint: string,
	body: Record<string, string>
): Promise<ApiResponse<T>> {
	const apiUrl = API_URL || '';
	const url = `${apiUrl}${endpoint}`;

	try {
		const formData = new URLSearchParams();
		Object.entries(body).forEach(([key, value]) => {
			formData.append(key, value);
		});

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: formData.toString()
		});

		const data = await response.json();

		if (!response.ok) {
			return {
				success: false,
				message: data.message || `HTTP error! status: ${response.status}`
			};
		}

		return {
			success: true,
			data
		};
	} catch (error) {
		return {
			success: false,
			message: error instanceof Error ? error.message : 'An unknown error occurred'
		};
	}
}
