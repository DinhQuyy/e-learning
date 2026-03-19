import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { directusUrl } from "@/lib/directus";

let privilegedTokenPromise: Promise<string | null> | null = null;

function parseEnvValue(content: string, key: string): string | null {
  const line = content
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${key}=`));
  if (!line) return null;
  const rawValue = line.slice(key.length + 1).trim();
  return rawValue.replace(/^['"]|['"]$/g, "") || null;
}

async function readBackendAdminCredentials(): Promise<{ email: string; password: string } | null> {
  const candidates = [
    resolve(process.cwd(), "backend", ".env"),
    resolve(process.cwd(), "..", "backend", ".env"),
  ];

  for (const filePath of candidates) {
    try {
      const content = await readFile(filePath, "utf-8");
      const email = parseEnvValue(content, "ADMIN_EMAIL");
      const password = parseEnvValue(content, "ADMIN_PASSWORD");
      if (email && password) {
        return { email, password };
      }
    } catch {
      // continue
    }
  }

  return null;
}

async function loginWithAdminCredentials(): Promise<string | null> {
  const credentials = await readBackendAdminCredentials();
  if (!credentials) return null;

  const res = await fetch(`${directusUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password,
      mode: "json",
    }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const payload = await res.json().catch(() => null);
  return payload?.data?.access_token ?? null;
}

export async function getPrivilegedDirectusToken(options?: {
  refresh?: boolean;
  preferAdminLogin?: boolean;
}): Promise<string | null> {
  const refresh = options?.refresh ?? false;
  const preferAdminLogin = options?.preferAdminLogin ?? false;

  if (refresh) {
    privilegedTokenPromise = null;
  }

  if (!privilegedTokenPromise) {
    privilegedTokenPromise = (async () => {
      const staticToken = process.env.DIRECTUS_STATIC_TOKEN?.trim();

      if (preferAdminLogin) {
        return (await loginWithAdminCredentials()) || staticToken || null;
      }

      if (staticToken) return staticToken;
      return loginWithAdminCredentials();
    })();
  }

  return privilegedTokenPromise;
}

export async function directusAdminFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = path.startsWith("http") ? path : `${directusUrl}${path}`;

  const sendWithToken = async (token: string) => {
    const headers = new Headers(options.headers);
    if (!headers.has("Content-Type") && options.body) {
      headers.set("Content-Type", "application/json");
    }
    headers.set("Authorization", `Bearer ${token}`);

    return fetch(url, {
      ...options,
      headers,
      cache: "no-store",
    });
  };

  const firstToken = await getPrivilegedDirectusToken();
  if (!firstToken) {
    throw new Error("No privileged Directus token available.");
  }

  let response = await sendWithToken(firstToken);
  if (response.status !== 401) {
    return response;
  }

  const fallbackToken = await getPrivilegedDirectusToken({
    refresh: true,
    preferAdminLogin: true,
  });
  if (!fallbackToken || fallbackToken === firstToken) {
    return response;
  }

  response = await sendWithToken(fallbackToken);
  return response;
}
