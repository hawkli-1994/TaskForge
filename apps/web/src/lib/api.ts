const USER_ID = "dev-user";
const PROJECT_ROLE = "maintainer";

export async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const isServer = typeof window === "undefined";
  const base = isServer
    ? (process.env.TASKFORGE_API_URL ?? "http://localhost:3001")
    : "";
  const url = `${base}${path}`;

  const headers = new Headers(options?.headers);
  headers.set("x-taskforge-user-id", USER_ID);
  headers.set("x-taskforge-project-role", PROJECT_ROLE);
  if (options?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const res = await fetch(url, {
    ...options,
    headers,
    cache: options?.cache ?? "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `API ${options?.method ?? "GET"} ${path} failed: ${res.status} ${text}`,
    );
  }

  return res.json() as Promise<T>;
}
