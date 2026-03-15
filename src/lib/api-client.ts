import { ApiResponse } from "../../shared/types"

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...init })
  const text = await res.text();
  if (!text) {
    if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
    return undefined as T;
  }

  let json: ApiResponse<T>;
  try {
    json = JSON.parse(text) as ApiResponse<T>;
  } catch (err) {
    console.error(`Failed to parse JSON response from ${path}. Status: ${res.status}. Raw response: ${text}`);
    throw new Error(`Invalid JSON response from server: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!res.ok || !json.success || json.data === undefined) {
    const errorMessage = json.error || `Request failed with status ${res.status}`;
    throw new Error(errorMessage);
  }
  return json.data
}