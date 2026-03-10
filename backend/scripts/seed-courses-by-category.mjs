#!/usr/bin/env node

/**
 * Seed published courses for each published category.
 *
 * Usage:
 *   node backend/scripts/seed-courses-by-category.mjs
 *   node backend/scripts/seed-courses-by-category.mjs --per-category=4
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

const env = loadEnv(envPath);
const BASE_URL = env.DIRECTUS_URL || "http://localhost:8055";
const ADMIN_EMAIL = env.ADMIN_EMAIL || "admin@elearning.dev";
const ADMIN_PASSWORD = env.ADMIN_PASSWORD || "Admin@123456";

const cliPerCategory = Number(getArgValue("per-category"));
const envPerCategory = Number(env.SEED_COURSES_PER_CATEGORY);
const TARGET_PER_CATEGORY = Number.isFinite(cliPerCategory) && cliPerCategory > 0
  ? Math.floor(cliPerCategory)
  : Number.isFinite(envPerCategory) && envPerCategory > 0
    ? Math.floor(envPerCategory)
    : 4;

let token = "";

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

const get = (path) => api("GET", path);
const post = (path, body) => api("POST", path, body);

function log(message) {
  process.stdout.write(`${message}\n`);
}

async function waitForDirectus(maxRetries = 30) {
  for (let i = 1; i <= maxRetries; i += 1) {
    try {
      const res = await fetch(`${BASE_URL}/server/health`);
      if (res.ok) return true;
    } catch {
      // directus is still not ready
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1000));
  }
  return false;
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeSlug(value) {
  const base = (value ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || "category";
}

function extractId(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "id" in value) return value.id ?? null;
  return null;
}

function pickInstructor(users) {
  const candidates = toArray(users);

  const preferred = candidates.find(
    (u) => u?.email === "instructor@elearning.dev"
  );
  if (preferred?.id) return preferred;

  const approved = candidates.find((u) => u?.instructor_state === "APPROVED");
  if (approved?.id) return approved;

  const fallback = candidates.find((u) => Boolean(u?.id));
  return fallback ?? null;
}

const COURSE_BLUEPRINTS = [
  {
    key: "foundation",
    titleTail: "Foundation Track",
    level: "beginner",
    price: 0,
    discountPrice: null,
    shortLead: "Start from fundamentals",
    descLead: "This course introduces core concepts and practical first steps.",
    lessonCount: 12,
    totalDuration: 3600,
    isFeatured: true,
  },
  {
    key: "practical",
    titleTail: "Practical Lab",
    level: "intermediate",
    price: 299000,
    discountPrice: 199000,
    shortLead: "Hands-on real workflow",
    descLead: "This course focuses on project-based practice and applied techniques.",
    lessonCount: 18,
    totalDuration: 5400,
    isFeatured: false,
  },
  {
    key: "mastery",
    titleTail: "Mastery Sprint",
    level: "advanced",
    price: 499000,
    discountPrice: 349000,
    shortLead: "Advanced use cases",
    descLead: "This course covers advanced scenarios, optimization, and production tips.",
    lessonCount: 24,
    totalDuration: 7200,
    isFeatured: false,
  },
];

function buildUniqueSlug(baseSlug, slugSet) {
  if (!slugSet.has(baseSlug)) {
    slugSet.add(baseSlug);
    return baseSlug;
  }

  let idx = 2;
  while (slugSet.has(`${baseSlug}-${idx}`)) {
    idx += 1;
  }

  const finalSlug = `${baseSlug}-${idx}`;
  slugSet.add(finalSlug);
  return finalSlug;
}

function buildCoursePayload(category, sequence, slugSet) {
  const blueprint = COURSE_BLUEPRINTS[(sequence - 1) % COURSE_BLUEPRINTS.length];
  const serial = String(sequence).padStart(2, "0");
  const categoryName =
    typeof category?.name === "string" && category.name.trim()
      ? category.name.trim()
      : "General";
  const categorySlug = normalizeSlug(category?.slug || categoryName);
  const baseSlug = `${categorySlug}-${blueprint.key}-${serial}`;
  const slug = buildUniqueSlug(baseSlug, slugSet);

  return {
    title: `${categoryName} ${blueprint.titleTail} ${serial}`,
    slug,
    description: `<p>${blueprint.descLead}</p><p>Category focus: ${categoryName}.</p>`,
    short_description: `${blueprint.shortLead} for ${categoryName}.`,
    price: blueprint.price,
    discount_price: blueprint.discountPrice,
    level: blueprint.level,
    language: "vi",
    status: "published",
    category_id: category.id,
    requirements: [
      "Basic computer usage",
      "Stable internet connection",
      "Willingness to practice every week",
    ],
    what_you_learn: [
      `Understand the main framework of ${categoryName}`,
      "Build practical outcomes through guided steps",
      "Evaluate and improve your own learning roadmap",
    ],
    target_audience: [
      "New learners who need a clear roadmap",
      "Practitioners who want structured practice",
      "Learners preparing for real-world projects",
    ],
    total_lessons: blueprint.lessonCount,
    total_duration: blueprint.totalDuration,
    total_enrollments: 0,
    average_rating: 0,
    is_featured: blueprint.isFeatured && sequence === 1,
  };
}

async function ensureInstructorLink(courseId, instructorId) {
  const existing = await get(
    `/items/courses_instructors?filter[course_id][_eq]=${courseId}&filter[user_id][_eq]=${instructorId}&limit=1&fields=id`
  );

  const rows = toArray(existing);
  if (rows.length > 0) return false;

  await post("/items/courses_instructors", {
    course_id: courseId,
    user_id: instructorId,
  });
  return true;
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

  const categories = toArray(
    await get(
      "/items/categories?filter[status][_eq]=published&sort=sort,name&limit=-1&fields=id,name,slug,status"
    )
  );

  if (categories.length === 0) {
    log("No published categories found. Nothing to seed.");
    return;
  }

  const existingCourses = toArray(
    await get("/items/courses?limit=-1&fields=id,slug,status,category_id")
  );

  const slugSet = new Set(
    existingCourses
      .map((course) => (typeof course?.slug === "string" ? course.slug : null))
      .filter(Boolean)
  );

  const publishedCountByCategory = new Map();
  for (const course of existingCourses) {
    if (course?.status !== "published") continue;
    const categoryId = extractId(course?.category_id);
    if (!categoryId) continue;
    const current = publishedCountByCategory.get(categoryId) ?? 0;
    publishedCountByCategory.set(categoryId, current + 1);
  }

  const users = toArray(await get("/users?fields=id,email,instructor_state&limit=-1"));
  const instructor = pickInstructor(users);
  if (instructor?.id) {
    log(`Using instructor ${instructor.email ?? instructor.id} for course links.`);
  } else {
    log("No instructor user found. Courses will be created without instructor links.");
  }

  let totalCreated = 0;
  let totalLinked = 0;

  for (const category of categories) {
    const categoryId = category?.id;
    if (!categoryId) continue;

    const categoryName = category?.name || categoryId;
    const existingCount = publishedCountByCategory.get(categoryId) ?? 0;
    const missing = Math.max(0, TARGET_PER_CATEGORY - existingCount);

    if (missing === 0) {
      log(`- ${categoryName}: already has ${existingCount} published courses.`);
      continue;
    }

    log(`- ${categoryName}: creating ${missing} course(s) to reach ${TARGET_PER_CATEGORY}.`);

    for (let i = 0; i < missing; i += 1) {
      const sequence = existingCount + i + 1;
      const payload = buildCoursePayload(category, sequence, slugSet);
      const created = await post("/items/courses", payload);
      totalCreated += 1;

      if (instructor?.id && created?.id) {
        const linked = await ensureInstructorLink(created.id, instructor.id);
        if (linked) totalLinked += 1;
      }
    }
  }

  log("");
  log(`Done. Created ${totalCreated} course(s).`);
  if (instructor?.id) {
    log(`Instructor links created: ${totalLinked}.`);
  }
  log(`Target per category: ${TARGET_PER_CATEGORY}.`);
}

main().catch((error) => {
  console.error(`Seed failed: ${error.message}`);
  process.exit(1);
});

