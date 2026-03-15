import "server-only";

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const ENV_FILE_CANDIDATES = [
  resolve(process.cwd(), ".env.local"),
  resolve(process.cwd(), "frontend/.env.local"),
  resolve(process.cwd(), "../backend/.env"),
  resolve(process.cwd(), "backend/.env"),
];

let fallbackEnvCache: Map<string, string> | null = null;

function normalizeEnvValue(rawValue: string): string {
  const trimmed = rawValue.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadFallbackEnv(): Map<string, string> {
  if (fallbackEnvCache) {
    return fallbackEnvCache;
  }

  const values = new Map<string, string>();

  for (const envPath of ENV_FILE_CANDIDATES) {
    if (!existsSync(envPath)) {
      continue;
    }

    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = normalizeEnvValue(trimmed.slice(separatorIndex + 1));

      if (key && value && !values.has(key)) {
        values.set(key, value);
      }
    }
  }

  fallbackEnvCache = values;
  return values;
}

export function getServerEnv(key: string): string | undefined {
  const runtimeValue = process.env[key]?.trim();
  if (runtimeValue) {
    return runtimeValue;
  }

  return loadFallbackEnv().get(key);
}
