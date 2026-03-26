const API_BASE = process.env.API_BASE_URL ?? "http://localhost:3000";

export async function apiGet<T>(path: string): Promise<T> {
	const response = await fetch(`${API_BASE}${path}`);

	if (!response.ok) {
		throw new Error(`API request failed: ${response.status} ${response.statusText}`);
	}

	return response.json() as Promise<T>;
}
