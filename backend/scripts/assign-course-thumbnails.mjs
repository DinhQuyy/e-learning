#!/usr/bin/env node

/**
 * Auto-assign course thumbnails in Directus.
 *
 * Default behavior:
 * - Uses semantic search queries based on each course title/category.
 * - Fetches related images from Openverse.
 * - Uploads image to Directus files and sets courses.thumbnail.
 *
 * Fallback behavior:
 * - If no related image can be downloaded, fallback to deterministic Picsum image.
 *
 * Usage:
 *   node backend/scripts/assign-course-thumbnails.mjs
 *   node backend/scripts/assign-course-thumbnails.mjs --all
 *   node backend/scripts/assign-course-thumbnails.mjs --limit=20
 *   node backend/scripts/assign-course-thumbnails.mjs --width=1280 --height=720
 *   node backend/scripts/assign-course-thumbnails.mjs --dry-run
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env");

function loadEnv(path) {
  const content = readFileSync(path, "utf-8");
  const out = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const splitIdx = trimmed.indexOf("=");
    if (splitIdx < 0) continue;

    const key = trimmed.slice(0, splitIdx).trim();
    const value = trimmed.slice(splitIdx + 1).trim();
    out[key] = value;
  }

  return out;
}

function getArgValue(name) {
  const prefix = `--${name}=`;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith(prefix)) return arg.slice(prefix.length);
  }
  return null;
}

function hasFlag(name) {
  return process.argv.slice(2).includes(`--${name}`);
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function log(message) {
  process.stdout.write(`${message}\n`);
}

function normalizeSlug(value) {
  const base = (value ?? "")
    .toString()
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || "course";
}

function normalizeText(value) {
  return (value ?? "")
    .toString()
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value) {
  const clean = normalizeText(value);
  if (!clean) return [];
  return clean.split(" ").filter(Boolean);
}

function extractId(value) {
  if (!value) return null;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object" && "id" in value) {
    const id = value.id;
    return id == null ? null : String(id);
  }
  return null;
}

function extensionFromContentType(contentType) {
  const safeType = String(contentType || "").toLowerCase();
  if (safeType.includes("png")) return "png";
  if (safeType.includes("webp")) return "webp";
  if (safeType.includes("gif")) return "gif";
  if (safeType.includes("svg")) return "svg";
  return "jpg";
}

function sanitizeFileStem(value) {
  return normalizeSlug(value).slice(0, 80) || "course-thumb";
}

function extractUploadedFileId(uploaded) {
  const direct = extractId(uploaded);
  if (direct) return direct;

  if (Array.isArray(uploaded) && uploaded.length > 0) {
    const first = uploaded[0];
    const arrayId = extractId(first);
    if (arrayId) return arrayId;
  }

  if (uploaded && typeof uploaded === "object") {
    const dataId = extractId(uploaded.data);
    if (dataId) return dataId;
  }

  return null;
}

function truncate(value, max = 80) {
  const text = String(value || "");
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

function extractCategoryName(category) {
  if (!category) return "";
  if (typeof category === "string") return category;
  if (typeof category === "object" && typeof category.name === "string") {
    return category.name;
  }
  return "";
}

function pushUnique(target, seen, value) {
  const clean = normalizeText(value);
  if (!clean) return;
  if (seen.has(clean)) return;
  seen.add(clean);
  target.push(clean);
}

const STOPWORDS = new Set([
  "va",
  "cho",
  "voi",
  "trong",
  "cua",
  "tu",
  "den",
  "phan",
  "khoa",
  "hoc",
  "co",
  "ban",
  "nang",
  "cao",
  "lo",
  "trinh",
  "toan",
  "dien",
  "thuc",
  "chien",
  "du",
  "an",
  "thuc",
  "te",
  "bo",
  "cong",
  "cu",
  "quy",
  "chuyen",
  "nghiep",
  "ke",
  "hoach",
  "ngay",
  "ho",
  "so",
  "portfolio",
  "trien",
  "khai",
  "tu",
  "so",
  "san",
  "sang",
  "di",
  "lam",
  "the",
  "complete",
  "masterclass",
  "intensive",
  "accelerator",
  "track",
  "foundation",
  "practical",
  "lab",
  "mastery",
  "sprint",
  "zero",
  "job",
  "ready",
  "career",
  "build",
  "launch",
  "improve",
  "beginner",
  "pro",
  "advanced",
  "strategies",
  "case",
  "studies",
  "day",
  "plan",
  "2026",
  "arch",
]);

const TOPIC_RULES = [
  {
    scope: "title",
    pattern: /\b(ielts toeic|toeic ielts)\b/,
    queries: [
      "english exam preparation study",
      "language test preparation",
      "study desk exam notes",
    ],
  },
  {
    scope: "title",
    pattern:
      /\b(toeic|luyen nghe doc toeic|meo lam bai toeic|toeic listening|toeic reading)\b/,
    queries: [
      "toeic exam preparation study",
      "english listening test practice",
      "toeic reading practice materials",
    ],
  },
  {
    scope: "title",
    pattern:
      /\b(ielts|luyen noi ielts|luyen viet ielts|reading ielts|speaking ielts|writing ielts)\b/,
    queries: [
      "ielts exam preparation study desk",
      "english writing speaking practice",
      "ielts reading listening practice",
    ],
  },
  {
    scope: "title",
    pattern:
      /\b(dam phan|negotiation|xu ly tu choi|chot don|closing|sales call|objection|consultative selling)\b/,
    queries: [
      "business negotiation meeting",
      "sales negotiation handshake",
      "client meeting discussion",
    ],
  },
  {
    scope: "title",
    pattern:
      /\b(thuyet trinh|public speaking|presentation|pitch deck|storytelling|slide|speaker|presentation design)\b/,
    queries: [
      "public speaking stage audience",
      "business presentation speaker",
      "presentation slides meeting",
    ],
  },
  {
    scope: "title",
    pattern:
      /\b(ui ux|thiet ke ui ux|thiet ke ux|thiet ke ui|user experience|user interface|figma|wireframe|prototype)\b/,
    queries: [
      "ui ux wireframe prototype",
      "product design interface mockup",
      "user research ux workshop",
    ],
  },
  {
    scope: "title",
    pattern:
      /\b(game dev|phat trien tro choi|gameplay|unity|unreal|mobile game|game ui|co che game|vat ly game|ai trong game|monetization)\b/,
    queries: [
      "game development workspace",
      "video game programming code",
      "game design concept art",
    ],
  },
  {
    pattern: /\b(korean|topik|tieng han)\b/,
    queries: [
      "korean language learning",
      "korean study desk",
      "hangul writing practice",
    ],
  },
  {
    pattern: /\b(chinese|hsk|mandarin|tieng trung|chu han|han tu)\b/,
    queries: [
      "chinese language learning",
      "mandarin study materials",
      "chinese writing practice",
    ],
  },
  {
    pattern: /\b(japanese|jlpt|tieng nhat)\b/,
    queries: [
      "japanese language learning",
      "japanese study materials",
      "japanese writing practice",
    ],
  },
  {
    pattern: /\b(english|ielts|toeic|tieng anh)\b/,
    queries: [
      "english language learning",
      "english study notebook",
      "english vocabulary education",
    ],
  },
  {
    pattern: /\b(game|unity|unreal|gameplay|gaming|c#|tro choi)\b/,
    queries: [
      "game development design",
      "video game programming",
      "game engine workstation",
    ],
  },
  {
    pattern: /\b(3d|blender|render|rendering|animation|modeling|texturing|mo hinh)\b/,
    queries: [
      "3d modeling render workstation",
      "digital 3d art creation",
      "3d animation software",
    ],
  },
  {
    pattern:
      /\b(video|editing|premiere|after effects|motion|youtube|color grading|chinh sua video|motion graphics)\b/,
    queries: [
      "video editing workstation",
      "motion graphics animation",
      "film post production",
    ],
  },
  {
    pattern: /\b(ui|ux|figma|wireframe|prototype|usability|interaction|thiet ke ux|thiet ke ui)\b/,
    queries: [
      "ui ux design interface",
      "wireframe prototype design",
      "user experience workshop",
    ],
  },
  {
    pattern:
      /\b(test|testing|qa|cypress|playwright|selenium|postman|istqb|kiem thu|kiem thu phan mem)\b/,
    queries: [
      "software testing quality assurance",
      "test automation coding",
      "bug tracking dashboard",
    ],
  },
  {
    pattern: /\b(android|ios|flutter|kotlin|react native|mobile|app|phat trien di dong)\b/,
    queries: [
      "mobile app development smartphone",
      "app programming code",
      "developer mobile interface",
    ],
  },
  {
    pattern:
      /\b(web|react|next|javascript|typescript|node|express|frontend|backend|fullstack|api|sql|database|phat trien web)\b/,
    queries: [
      "web development coding laptop",
      "software engineering programming",
      "computer code monitor",
    ],
  },
  {
    pattern: /\b(lap trinh|programming|developer|coding)\b/,
    queries: [
      "software development coding",
      "programming computer monitor",
      "developer workspace",
    ],
  },
  {
    pattern:
      /\b(productivity|time management|public speaking|critical thinking|emotion|mindfulness|nang suat|thuyet trinh|phat trien ban than|quan ly thoi gian|quan ly cam xuc|tu duy phan bien|giao tiep)\b/,
    queries: [
      "productivity planning desk",
      "public speaking presentation",
      "mindfulness and personal growth",
    ],
  },
  {
    pattern:
      /\b(sales|ban hang|marketing|startup|business|leadership|kinh doanh|khoi nghiep|doanh nghiep|negotiation|dam phan)\b/,
    queries: [
      "business strategy meeting",
      "sales marketing presentation",
      "team management office",
    ],
  },
  {
    pattern:
      /\b(design|graphic|photoshop|illustrator|canva|typography|logo|branding|color|thiet ke|do hoa)\b/,
    queries: [
      "graphic design creative workspace",
      "branding logo design",
      "digital design tools",
    ],
  },
];

const TITLE_TOKEN_HINTS = {
  react: "react",
  next: "next js",
  javascript: "javascript",
  typescript: "typescript",
  node: "node js",
  express: "express js",
  api: "api",
  sql: "sql",
  java: "java",
  python: "python",
  rust: "rust",
  kotlin: "kotlin",
  flutter: "flutter",
  cypress: "cypress",
  playwright: "playwright",
  selenium: "selenium",
  postman: "postman",
  figma: "figma",
  photoshop: "photoshop",
  illustrator: "illustrator",
  blender: "blender",
  animation: "animation",
  ielts: "ielts",
  toeic: "toeic",
  hsk: "hsk",
  topik: "topik",
  jlpt: "jlpt",
  toeic: "toeic",
  speaking: "public speaking",
  presentation: "presentation",
  negotiation: "negotiation",
  ux: "ux",
  ui: "ui",
  wireframe: "wireframe",
  prototype: "prototype",
  unity: "unity",
  unreal: "unreal",
  sales: "sales",
  marketing: "marketing",
  startup: "startup",
  leadership: "leadership",
  strategy: "strategy",
  game: "game development",
};

const env = loadEnv(envPath);
const BASE_URL = env.DIRECTUS_URL || "http://localhost:8055";
const ADMIN_EMAIL = env.ADMIN_EMAIL || "admin@elearning.dev";
const ADMIN_PASSWORD = env.ADMIN_PASSWORD || "Admin@123456";
const OPENVERSE_API = (env.OPENVERSE_API || "https://api.openverse.engineering/v1").replace(
  /\/+$/,
  ""
);

const cliLimit = Number(getArgValue("limit"));
const cliWidth = Number(getArgValue("width"));
const cliHeight = Number(getArgValue("height"));
const cliCandidatesPerQuery = Number(getArgValue("candidates-per-query"));
const onlyMissing = !hasFlag("all");
const dryRun = hasFlag("dry-run");

const LIMIT = Number.isFinite(cliLimit) && cliLimit > 0 ? Math.floor(cliLimit) : null;
const WIDTH = Number.isFinite(cliWidth) && cliWidth > 0 ? Math.floor(cliWidth) : 1280;
const HEIGHT = Number.isFinite(cliHeight) && cliHeight > 0 ? Math.floor(cliHeight) : 720;
const CANDIDATES_PER_QUERY =
  Number.isFinite(cliCandidatesPerQuery) && cliCandidatesPerQuery > 0
    ? Math.floor(cliCandidatesPerQuery)
    : 30;

const queryCache = new Map();
let token = "";
let openverseBlockedUntil = 0;

async function api(method, path, body = null) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }

  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(payload)}`);
  }

  return payload?.data ?? payload;
}

async function apiForm(method, path, formData) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const text = await res.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }

  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(payload)}`);
  }

  return payload?.data ?? payload;
}

const get = (path) => api("GET", path);
const post = (path, body) => api("POST", path, body);
const patch = (path, body) => api("PATCH", path, body);

async function waitForDirectus(maxRetries = 45) {
  for (let i = 1; i <= maxRetries; i += 1) {
    try {
      const res = await fetch(`${BASE_URL}/server/health`);
      if (res.ok) return true;
    } catch {
      // keep waiting
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1000));
  }
  return false;
}

function buildSearchQueries(course) {
  const title = String(course?.title || "");
  const slug = String(course?.slug || "");
  const categoryName = extractCategoryName(course?.category_id);
  const normalizedTitle = normalizeText(title);
  const normalizedAll = normalizeText(`${title} ${slug} ${categoryName}`);

  const queries = [];
  const seen = new Set();

  for (const rule of TOPIC_RULES) {
    const targetText = rule.scope === "title" ? normalizedTitle : normalizedAll;
    if (rule.pattern.test(targetText)) {
      for (const query of rule.queries) {
        pushUnique(queries, seen, query);
      }
    }
  }

  const titleTokens = tokenize(title).filter(
    (tokenPart) => tokenPart.length > 2 && !STOPWORDS.has(tokenPart)
  );
  const hintedTerms = [];
  const hintedSeen = new Set();
  for (const tokenPart of titleTokens) {
    const hint = TITLE_TOKEN_HINTS[tokenPart];
    if (!hint) continue;
    if (hintedSeen.has(hint)) continue;
    hintedSeen.add(hint);
    hintedTerms.push(hint);
  }
  if (hintedTerms.length >= 1) {
    pushUnique(queries, seen, `${hintedTerms.slice(0, 3).join(" ")} training`);
  }

  const categoryTokens = tokenize(categoryName).filter(
    (tokenPart) => tokenPart.length > 2 && !STOPWORDS.has(tokenPart)
  );
  if (categoryTokens.length >= 1) {
    pushUnique(queries, seen, `${categoryTokens.slice(0, 3).join(" ")} training`);
  }

  pushUnique(queries, seen, "online learning education");
  pushUnique(queries, seen, "professional training course");

  return queries.slice(0, 8);
}

async function searchOpenverse(query) {
  if (Date.now() < openverseBlockedUntil) {
    throw new Error("Openverse cooldown active");
  }

  if (queryCache.has(query)) {
    return queryCache.get(query);
  }

  const url = new URL(`${OPENVERSE_API}/images/`);
  url.searchParams.set("q", query);
  url.searchParams.set("page_size", String(CANDIDATES_PER_QUERY));
  url.searchParams.set("license_type", "commercial");
  url.searchParams.set("mature", "false");

  const res = await fetch(url.toString());
  if (!res.ok) {
    if (res.status === 429) {
      const retryAfterRaw = Number(res.headers.get("retry-after"));
      const retryAfterSec =
        Number.isFinite(retryAfterRaw) && retryAfterRaw > 0 ? retryAfterRaw : 120;
      openverseBlockedUntil = Date.now() + retryAfterSec * 1000;
    }
    throw new Error(`Openverse search failed (${res.status}) for query "${query}"`);
  }

  const payload = await res.json();
  const results = toArray(payload?.results).filter((item) => {
    if (!item || typeof item !== "object") return false;
    if (item.mature === true) return false;
    if (typeof item.url !== "string" || !item.url.startsWith("http")) return false;
    const width = Number(item.width);
    const height = Number(item.height);
    if (Number.isFinite(width) && Number.isFinite(height)) {
      if (width < 600 || height < 330) return false;
    }
    return true;
  });

  queryCache.set(query, results);
  return results;
}

function imageScore(candidate, queryTokens) {
  const width = Number(candidate?.width);
  const height = Number(candidate?.height);
  const targetRatio = WIDTH / HEIGHT;
  let score = 0;

  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    const ratio = width / height;
    const ratioDiff = Math.abs(ratio - targetRatio);
    score += Math.max(0, 24 - ratioDiff * 80);

    if (width >= WIDTH * 0.75 && height >= HEIGHT * 0.75) {
      score += 18;
    } else if (width >= 1000 && height >= 560) {
      score += 10;
    }
  }

  const textBucket = normalizeText(
    `${candidate?.title || ""} ${toArray(candidate?.tags).map((t) => t?.name || "").join(" ")}`
  );
  const textTokens = new Set(tokenize(textBucket));
  const overlap = queryTokens.filter((tokenPart) => textTokens.has(tokenPart)).length;
  score += overlap * 8;

  const fileType = normalizeText(candidate?.filetype || "");
  if (fileType === "jpg" || fileType === "jpeg" || fileType === "png" || fileType === "webp") {
    score += 8;
  }

  if (candidate?.source === "wikimedia" || candidate?.source === "flickr") {
    score += 2;
  }

  return score;
}

async function downloadImageFromUrl(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Image download failed (${res.status}) from ${url}`);
  }

  const contentType = res.headers.get("content-type") || "image/jpeg";
  if (!contentType.startsWith("image/")) {
    throw new Error(`Invalid content type "${contentType}" from ${url}`);
  }

  const bytes = await res.arrayBuffer();
  if (!bytes || bytes.byteLength === 0) {
    throw new Error(`Downloaded image is empty from ${url}`);
  }

  return { contentType, bytes };
}

function simpleHash(value) {
  let hash = 0;
  const text = String(value || "");
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function buildLoremFlickrTags(query) {
  const tokens = tokenize(query).filter(
    (tokenPart) => tokenPart.length > 2 && !STOPWORDS.has(tokenPart)
  );
  const selected = tokens.slice(0, 4);
  if (selected.length === 0) return "education,learning";
  return selected.join(",");
}

async function downloadLoremFlickrImage(query, seed) {
  const tags = buildLoremFlickrTags(query);
  const lock = simpleHash(`${seed}:${query}`);
  const url = `https://loremflickr.com/${WIDTH}/${HEIGHT}/${tags}?lock=${lock}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`LoremFlickr download failed (${res.status}) for query "${query}"`);
  }

  const contentType = res.headers.get("content-type") || "image/jpeg";
  if (!contentType.startsWith("image/")) {
    throw new Error(`Invalid LoremFlickr content type "${contentType}"`);
  }

  const bytes = await res.arrayBuffer();
  if (!bytes || bytes.byteLength === 0) {
    throw new Error("LoremFlickr downloaded image is empty");
  }

  return {
    contentType,
    bytes,
    mode: "related",
    query,
    sourceUrl: url,
  };
}

async function downloadSeedImage(seed) {
  const url = `https://picsum.photos/seed/${encodeURIComponent(seed)}/${WIDTH}/${HEIGHT}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Image download failed (${res.status}) from ${url}`);
  }

  const contentType = res.headers.get("content-type") || "image/jpeg";
  const bytes = await res.arrayBuffer();
  if (!bytes || bytes.byteLength === 0) {
    throw new Error("Downloaded fallback image is empty");
  }

  return {
    contentType,
    bytes,
    mode: "fallback",
    query: seed,
    sourceUrl: url,
  };
}

async function downloadRelatedImage(course, usedSourceUrls) {
  const queries = buildSearchQueries(course);
  const sourceSeed = normalizeSlug(course.slug || course.title || String(course.id));

  for (const query of queries) {
    let candidates = [];
    try {
      candidates = await searchOpenverse(query);
    } catch {
      candidates = [];
    }

    if (candidates.length > 0) {
      const queryTokens = tokenize(query).filter(
        (tokenPart) => tokenPart.length > 2 && !STOPWORDS.has(tokenPart)
      );
      const ranked = candidates
        .map((candidate) => ({
          candidate,
          score: imageScore(candidate, queryTokens),
        }))
        .sort((a, b) => b.score - a.score);

      for (const entry of ranked.slice(0, 10)) {
        const sourceUrl = entry.candidate.url;
        if (usedSourceUrls.has(sourceUrl)) continue;
        try {
          const downloaded = await downloadImageFromUrl(sourceUrl);
          usedSourceUrls.add(sourceUrl);
          return {
            ...downloaded,
            mode: "related",
            query,
            sourceUrl,
          };
        } catch {
          // Try next candidate.
        }
      }
    }

    try {
      const related = await downloadLoremFlickrImage(query, sourceSeed);
      return related;
    } catch {
      // Try next query.
    }
  }

  return downloadSeedImage(sourceSeed);
}

async function uploadImageToDirectus(course, image) {
  const ext = extensionFromContentType(image.contentType);
  const stem = sanitizeFileStem(course.slug || course.title || `course-${course.id}`);
  const filename = `${stem}-thumb.${ext}`;

  const blob = new Blob([image.bytes], { type: image.contentType || "image/jpeg" });
  const form = new FormData();
  form.append("file", blob, filename);
  form.append("title", `${course.title || `Course ${course.id}`} thumbnail`);

  const uploaded = await apiForm("POST", "/files", form);
  const fileId = extractUploadedFileId(uploaded);
  if (!fileId) {
    throw new Error("Directus did not return uploaded file ID");
  }

  return fileId;
}

async function main() {
  log("Checking Directus health...");
  const healthy = await waitForDirectus();
  if (!healthy) {
    throw new Error(`Directus is not reachable at ${BASE_URL}`);
  }

  log(`Authenticating as ${ADMIN_EMAIL}...`);
  const loginResult = await post("/auth/login", {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  token = loginResult.access_token;
  if (!token) {
    throw new Error("Authentication failed: access_token is missing");
  }

  const allCourses = toArray(
    await get(
      "/items/courses?fields=id,title,slug,thumbnail,status,category_id.id,category_id.name,category_id.slug&limit=-1&sort=id"
    )
  );

  let courses = allCourses.filter((course) => Boolean(course?.id));
  if (onlyMissing) {
    courses = courses.filter((course) => !extractId(course.thumbnail));
  }

  if (LIMIT) {
    courses = courses.slice(0, LIMIT);
  }

  if (courses.length === 0) {
    log("No target courses found.");
    return;
  }

  log(`Target courses: ${courses.length}`);
  log(
    `Mode: ${onlyMissing ? "only missing thumbnails" : "all courses"}${dryRun ? " (dry-run)" : ""}`
  );

  let updated = 0;
  let failed = 0;
  let relatedCount = 0;
  let fallbackCount = 0;
  const failures = [];
  const usedSourceUrls = new Set();

  for (let index = 0; index < courses.length; index += 1) {
    const course = courses[index];
    const queries = buildSearchQueries(course);

    try {
      if (dryRun) {
        log(
          `[${index + 1}/${courses.length}] plan: ${course.title || course.id} | query: ${truncate(
            queries[0] || "n/a",
            70
          )}`
        );
        continue;
      }

      const image = await downloadRelatedImage(course, usedSourceUrls);
      const fileId = await uploadImageToDirectus(course, image);
      await patch(`/items/courses/${course.id}`, { thumbnail: fileId });

      updated += 1;
      if (image.mode === "related") relatedCount += 1;
      if (image.mode === "fallback") fallbackCount += 1;
      log(
        `[${index + 1}/${courses.length}] updated: ${course.title || course.id} -> ${fileId} | ${image.mode} | query: ${truncate(
          image.query,
          60
        )}`
      );
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      failures.push({
        id: course.id,
        title: course.title || String(course.id),
        message,
      });
      log(`[${index + 1}/${courses.length}] failed: ${course.title || course.id} -> ${message}`);
    }
  }

  log("");
  log("Finished.");
  log(`- Updated: ${updated}`);
  log(`- Related images: ${relatedCount}`);
  log(`- Fallback images: ${fallbackCount}`);
  log(`- Failed: ${failed}`);

  if (failures.length > 0) {
    log("- Failure samples:");
    for (const item of failures.slice(0, 10)) {
      log(`  * ${item.title} (${item.id}): ${item.message}`);
    }
  }
}

main().catch((error) => {
  console.error(`Assign thumbnails failed: ${error.message}`);
  process.exit(1);
});
