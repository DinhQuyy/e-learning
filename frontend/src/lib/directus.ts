import { createDirectus, rest, authentication, staticToken } from "@directus/sdk";
import type { Schema } from "@/types";

const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL!;
const serverToken = process.env.DIRECTUS_STATIC_TOKEN;

export const directus = serverToken
  ? createDirectus<Schema>(directusUrl)
      .with(staticToken(serverToken))
      .with(rest())
  : createDirectus<Schema>(directusUrl)
      .with(rest())
      .with(authentication("cookie", { credentials: "include" }));

export function getDirectusClient(token?: string) {
  const client = createDirectus<Schema>(directusUrl)
    .with(rest())
    .with(authentication("cookie", { credentials: "include" }));

  if (token) {
    client.setToken(token);
  }

  return client;
}

export function getAssetUrl(fileId: string | null | undefined) {
  if (!fileId) return "/placeholder.svg";

  const idFromUrl = extractFileIdFromUrl(fileId);
  if (idFromUrl && idFromUrl !== fileId) {
    return `/api/assets/${idFromUrl}`;
  }

  // Already a proxied asset
  if (fileId.startsWith("/api/assets/")) return fileId;

  // Direct asset UUID
  if (/^[0-9a-fA-F-]{36}$/.test(fileId)) {
    return `/api/assets/${fileId}`;
  }

  // Fallback: absolute or relative URL provided
  if (
    fileId.startsWith("http://") ||
    fileId.startsWith("https://") ||
    fileId.startsWith("/")
  ) {
    return fileId;
  }

  // Default to proxying through Next
  return `/api/assets/${fileId}`;
}

export function extractFileIdFromUrl(
  url: string | null | undefined
): string | null {
  if (!url) return null;
  // If it's already a UUID, return it
  if (
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      url
    )
  ) {
    return url;
  }
  // Extract ID from asset URL (Directus or proxied /api/assets)
  const match =
    url.match(/\/assets\/([0-9a-fA-F-]{36})/) ||
    url.match(/\/api\/assets\/([0-9a-fA-F-]{36})/);
  return match ? match[1] : url;
}

export { directusUrl };
