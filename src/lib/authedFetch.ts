export async function authedFetch(path: string, token: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...(init || {}),
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data ? JSON.stringify(data) : "Request failed");
  return data;
}