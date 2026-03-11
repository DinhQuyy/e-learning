#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
const FRONTEND_ENV = resolve(ROOT, "frontend", ".env.local");
const BACKEND_ENV = resolve(ROOT, "backend", ".env");
const OUTPUT_FILE = resolve(
  ROOT,
  "frontend",
  "src",
  "app",
  "(public)",
  "courses",
  "demo-course-image-overrides.ts"
);

function loadEnv(filePath) {
  const content = readFileSync(filePath, "utf8");
  const out = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    out[key] = value;
  }
  return out;
}

function loadEnvSafe(filePath) {
  try {
    return loadEnv(filePath);
  } catch {
    return {};
  }
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toCanonicalUdemyImage(url) {
  const clean = String(url ?? "");
  const match = clean.match(/\/course\/\d+x\d+\/([^?"'\s]+)/i);
  if (!match) return null;
  return `https://img-c.udemycdn.com/course/480x270/${match[1]}`;
}

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}

const STOPWORDS = new Set([
  "lo",
  "trinh",
  "toan",
  "dien",
  "tu",
  "co",
  "ban",
  "den",
  "nang",
  "cao",
  "thuc",
  "chien",
  "qua",
  "du",
  "an",
  "thuc",
  "te",
  "bo",
  "cong",
  "cu",
  "va",
  "quy",
  "trinh",
  "chuyen",
  "nghiep",
  "cho",
  "doi",
  "nhom",
  "lam",
  "viec",
  "so",
  "san",
  "sang",
  "di",
  "ke",
  "hoach",
  "ngay",
  "nghe",
  "nghiep",
  "ho",
  "so",
  "trien",
  "khai",
  "cap",
  "toc",
  "xay",
  "dung",
  "ra",
  "mat",
  "toi",
  "uu",
  "foundation",
  "masterclass",
  "bootcamp",
  "complete",
  "course",
]);

const CATEGORY_KEYWORDS = {
  "kinh-doanh-ban-hang": [
    "sales",
    "selling",
    "b2b sales",
    "negotiation",
    "closing deals",
    "customer success",
  ],
  "kinh-doanh-chien-luoc": [
    "business strategy",
    "strategic planning",
    "business model",
    "innovation",
    "market analysis",
    "risk management",
  ],
  "kinh-doanh-giao-tiep": [
    "business communication",
    "negotiation",
    "presentation",
    "email communication",
    "meeting skills",
    "stakeholder communication",
  ],
  "kinh-doanh-quan-ly": [
    "management",
    "leadership",
    "team management",
    "operations management",
    "okr",
    "kpi",
    "project management",
  ],
  "kinh-doanh-tinh-than-khoi-nghiep": [
    "entrepreneurship",
    "startup",
    "business plan",
    "mvp",
    "fundraising",
    "go to market",
  ],
  "lap-trinh-kiem-thu-phan-mem": [
    "software testing",
    "qa",
    "test automation",
    "selenium",
    "postman",
    "cypress",
    "playwright",
  ],
  "lap-trinh-ngon-ngu-lap-trinh": [
    "programming",
    "software development",
    "python",
    "java",
    "c#",
    "go programming",
    "algorithms",
  ],
  "lap-trinh-phat-trien-di-dong": [
    "mobile app development",
    "android development",
    "ios development",
    "flutter",
    "react native",
    "kotlin",
    "swift",
  ],
  "lap-trinh-phat-trien-tro-choi": [
    "game development",
    "unity",
    "unreal engine",
    "game design",
    "c# game",
    "2d game",
    "3d game",
  ],
  "lap-trinh-phat-trien-web": [
    "web development",
    "javascript",
    "typescript",
    "react",
    "next js",
    "node js",
    "api development",
    "cloud deployment",
  ],
  "ngoai-ngu-ielts-toeic": [
    "ielts",
    "toeic",
    "english exam",
    "english vocabulary",
    "english grammar",
    "english listening",
  ],
  "ngoai-ngu-tieng-anh-giao-tiep": [
    "english conversation",
    "spoken english",
    "business english",
    "english pronunciation",
    "english communication",
  ],
  "ngoai-ngu-tieng-han": [
    "korean language",
    "topik",
    "hangul",
    "korean conversation",
    "learn korean",
  ],
  "ngoai-ngu-tieng-nhat": [
    "japanese language",
    "jlpt",
    "hiragana",
    "katakana",
    "kanji",
    "learn japanese",
  ],
  "ngoai-ngu-tieng-trung": [
    "chinese language",
    "mandarin",
    "hsk",
    "chinese conversation",
    "learn chinese",
  ],
  "phat-trien-ban-than-nang-suat-ca-nhan": [
    "productivity",
    "focus",
    "habit building",
    "goal setting",
    "personal development",
    "self management",
  ],
  "phat-trien-ban-than-quan-ly-cam-xuc": [
    "emotional intelligence",
    "stress management",
    "mindfulness",
    "resilience",
    "self awareness",
    "mental wellness",
  ],
  "phat-trien-ban-than-quan-ly-thoi-gian": [
    "time management",
    "deep work",
    "planning",
    "productivity",
    "prioritization",
    "personal organization",
  ],
  "phat-trien-ban-than-thuyet-trinh": [
    "public speaking",
    "presentation skills",
    "storytelling",
    "pitching",
    "communication skills",
    "speaker training",
  ],
  "phat-trien-ban-than-tu-duy-phan-bien": [
    "critical thinking",
    "problem solving",
    "decision making",
    "logical thinking",
    "analytical thinking",
  ],
  "thiet-ke-3d": [
    "3d modeling",
    "blender",
    "3d rendering",
    "3d animation",
    "texturing",
    "maya",
  ],
  "thiet-ke-chinh-sua-video": [
    "video editing",
    "premiere pro",
    "davinci resolve",
    "color grading",
    "youtube video",
    "video production",
  ],
  "thiet-ke-do-hoa": [
    "graphic design",
    "photoshop",
    "illustrator",
    "logo design",
    "branding",
    "typography",
  ],
  "thiet-ke-motion-graphics": [
    "motion graphics",
    "after effects",
    "animation",
    "visual effects",
    "kinetic typography",
  ],
  "thiet-ke-ui-ux": [
    "ui ux design",
    "figma",
    "wireframe",
    "prototype",
    "design system",
    "user experience",
  ],
};

const TITLE_RULES = [
  { pattern: /\breact|next\b/, tags: ["react", "next js", "frontend"] },
  { pattern: /\bnode|express|api|rest\b/, tags: ["node js", "api", "backend"] },
  { pattern: /\btypescript|javascript\b/, tags: ["typescript", "javascript"] },
  { pattern: /\bcloud|aws|azure|deploy|trien khai\b/, tags: ["cloud deployment", "aws"] },
  { pattern: /\bqa|kiem thu|test|cypress|selenium|playwright|postman|jmeter\b/, tags: ["software testing", "qa", "test automation"] },
  { pattern: /\bflutter|kotlin|swift|react native|mobile|ios|android\b/, tags: ["mobile app development", "android", "ios"] },
  { pattern: /\bgame|unity|unreal|gameplay|vat ly\b/, tags: ["game development", "unity", "game design"] },
  { pattern: /\bui\s?ux|figma|wireframe|prototype|design system\b/, tags: ["ui ux design", "figma", "user experience"] },
  { pattern: /\bphotoshop|illustrator|logo|branding|mau sac|typography\b/, tags: ["graphic design", "photoshop", "illustrator"] },
  { pattern: /\b3d|blender|render|texturing|modeling\b/, tags: ["3d modeling", "blender", "rendering"] },
  { pattern: /\bafter effects|motion|kinetic|visual effects\b/, tags: ["motion graphics", "after effects", "animation"] },
  { pattern: /\bvideo|premiere|davinci|color grading|youtube\b/, tags: ["video editing", "premiere pro", "video production"] },
  { pattern: /\bielts|toeic\b/, tags: ["ielts", "toeic", "english exam"] },
  { pattern: /\btieng anh|english|pronunciation|giao tiep\b/, tags: ["english conversation", "spoken english"] },
  { pattern: /\btieng han|korean|topik|hangul\b/, tags: ["korean language", "topik"] },
  { pattern: /\btieng nhat|japanese|jlpt|kana|kanji\b/, tags: ["japanese language", "jlpt", "kanji"] },
  { pattern: /\btieng trung|chinese|mandarin|hsk|chu han\b/, tags: ["chinese language", "hsk", "mandarin"] },
  { pattern: /\bdam phan|negotiation|xu ly tu choi\b/, tags: ["negotiation", "sales"] },
  { pattern: /\bthuyet trinh|presentation|pitch|storytelling\b/, tags: ["public speaking", "presentation skills"] },
  { pattern: /\bban hang|sales|closing|chot don\b/, tags: ["sales", "selling"] },
  { pattern: /\bchien luoc|strategy|doi moi|business model|rui ro\b/, tags: ["business strategy", "strategic planning"] },
  { pattern: /\bquan ly|leadership|kpi|okr|hieu suat\b/, tags: ["management", "leadership", "okr"] },
  { pattern: /\bkhoi nghiep|startup|mvp|goi von|y tuong\b/, tags: ["entrepreneurship", "startup", "mvp"] },
  { pattern: /\bnang suat|productivity|focus|goal\b/, tags: ["productivity", "goal setting"] },
  { pattern: /\bcam xuc|stress|chanh niem|resilience\b/, tags: ["emotional intelligence", "mindfulness", "stress management"] },
  { pattern: /\bthoi gian|deep work|prioritization|tri hoan\b/, tags: ["time management", "deep work"] },
  { pattern: /\btu duy|critical|logic|ra quyet dinh|problem solving\b/, tags: ["critical thinking", "problem solving"] },
];

function extractOrderFromSlug(slug) {
  const match = String(slug).match(/-(\d{1,2})-\d+$/);
  return match ? Number(match[1]) : null;
}

function extractImportantTitleTerms(title, limit = 5) {
  const words = normalizeText(title)
    .split(" ")
    .filter((word) => word.length >= 3 && !STOPWORDS.has(word));
  return uniq(words).slice(0, limit);
}

function getCourseTerms(course) {
  const categorySlug = course?.category_id?.slug ?? "";
  const titleNorm = normalizeText(course.title);

  const baseTerms = [...(CATEGORY_KEYWORDS[categorySlug] ?? [])];

  for (const rule of TITLE_RULES) {
    if (rule.pattern.test(titleNorm)) {
      baseTerms.push(...rule.tags);
    }
  }

  baseTerms.push(...extractImportantTitleTerms(course.title));

  return uniq(baseTerms.map((term) => normalizeText(term)).filter(Boolean));
}

function scoreItem(itemText, terms, categoryTerms) {
  let score = 0;

  for (let i = 0; i < terms.length; i += 1) {
    const term = terms[i];
    if (!term) continue;

    const weight = i < 8 ? 8 : i < 14 ? 5 : 3;
    if (itemText.includes(term)) {
      score += weight;
      continue;
    }

    const parts = term.split(" ").filter(Boolean);
    if (parts.length > 1) {
      const matched = parts.filter((part) => itemText.includes(part)).length;
      if (matched > 0) {
        score += Math.min(weight - 1, matched * 2);
      }
    }
  }

  for (const categoryTerm of categoryTerms) {
    if (itemText.includes(categoryTerm)) {
      score += 2;
    }
  }

  return score;
}

function buildCategoryCandidatePools(udemyItems) {
  const pools = {};
  for (const [categorySlug, terms] of Object.entries(CATEGORY_KEYWORDS)) {
    const normalizedTerms = terms.map((term) => normalizeText(term)).filter(Boolean);
    const ranked = [];

    for (const item of udemyItems) {
      const score = scoreItem(item.searchText, normalizedTerms, normalizedTerms);
      if (score <= 0) continue;
      ranked.push({ score, image: item.image });
    }

    ranked.sort((a, b) => b.score - a.score);
    pools[categorySlug] = uniq(ranked.map((entry) => entry.image)).slice(0, 400);
  }
  return pools;
}

function chooseImageForCourse({
  course,
  udemyItems,
  categoryPools,
  usedGlobal,
  usedByCategory,
}) {
  const categorySlug = course?.category_id?.slug ?? "";
  const categoryTerms = (CATEGORY_KEYWORDS[categorySlug] ?? []).map((term) => normalizeText(term));
  const courseTerms = getCourseTerms(course);

  let best = null;
  for (const item of udemyItems) {
    if (usedGlobal.has(item.image)) continue;
    if (usedByCategory.has(item.image)) continue;

    const score = scoreItem(item.searchText, courseTerms, categoryTerms);
    if (score <= 0) continue;

    if (!best || score > best.score) {
      best = { image: item.image, score };
    }
  }

  if (best) {
    return best.image;
  }

  const pool = categoryPools[categorySlug] ?? [];
  const order = extractOrderFromSlug(course.slug);
  const startIndex = order ? Math.max(order - 1, 0) : 0;

  for (let i = 0; i < pool.length; i += 1) {
    const idx = (startIndex + i) % pool.length;
    const candidate = pool[idx];
    if (!candidate) continue;
    if (usedGlobal.has(candidate)) continue;
    if (usedByCategory.has(candidate)) continue;
    return candidate;
  }

  for (const candidate of pool) {
    if (!usedByCategory.has(candidate)) return candidate;
  }

  for (const item of udemyItems) {
    if (!usedGlobal.has(item.image)) {
      return item.image;
    }
  }

  return pool[0] ?? "https://img-c.udemycdn.com/course/480x270/3880538_252d_3.jpg";
}

function buildOutputFile(mapping) {
  const lines = [];
  lines.push("// AUTO-GENERATED by backend/scripts/generate-udemy-demo-image-map.mjs");
  lines.push("// Source: Directus courses (all statuses) + Udemy course image dataset");
  lines.push("\nexport const DEMO_COURSE_IMAGE_OVERRIDES: Record<string, string> = {");

  for (const [slug, image] of Object.entries(mapping).sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`  \"${slug}\": \"${image}\",`);
  }

  lines.push("};\n");
  return lines.join("\n");
}

async function main() {
  const frontendEnv = loadEnvSafe(FRONTEND_ENV);
  const backendEnv = loadEnvSafe(BACKEND_ENV);
  const directusUrl = frontendEnv.NEXT_PUBLIC_DIRECTUS_URL || backendEnv.DIRECTUS_URL;
  const directusToken =
    backendEnv.DIRECTUS_STATIC_TOKEN || frontendEnv.DIRECTUS_STATIC_TOKEN;

  if (!directusUrl) {
    throw new Error(
      "Directus URL is missing. Set NEXT_PUBLIC_DIRECTUS_URL (frontend/.env.local) or DIRECTUS_URL (backend/.env)."
    );
  }

  const coursesUrl = new URL("/items/courses", directusUrl);
  coursesUrl.searchParams.set("fields", "slug,title,category_id.slug,category_id.name");
  coursesUrl.searchParams.set("limit", "-1");

  const coursesRes = await fetch(coursesUrl.toString(), {
    headers: {
      accept: "application/json",
      ...(directusToken ? { Authorization: `Bearer ${directusToken}` } : {}),
    },
  });
  if (!coursesRes.ok) {
    throw new Error(`Failed to fetch courses: HTTP ${coursesRes.status}`);
  }

  const coursesJson = await coursesRes.json();
  const courses = Array.isArray(coursesJson.data) ? coursesJson.data : [];
  courses.sort((a, b) => {
    const catA = a?.category_id?.slug ?? "";
    const catB = b?.category_id?.slug ?? "";
    if (catA !== catB) return catA.localeCompare(catB);
    return String(a.slug).localeCompare(String(b.slug));
  });

  const datasetUrl =
    "https://gist.githubusercontent.com/devgiordane/a0d59a5eb54dafa8bdf5db4d8ea7e840/raw";
  const datasetRes = await fetch(datasetUrl, {
    headers: { accept: "application/json", "user-agent": "Mozilla/5.0" },
  });
  if (!datasetRes.ok) {
    throw new Error(`Failed to fetch Udemy dataset: HTTP ${datasetRes.status}`);
  }

  const datasetJson = await datasetRes.json();
  const rawItems = Array.isArray(datasetJson) ? datasetJson : [];

  const seenImages = new Set();
  const udemyItems = [];
  for (const item of rawItems) {
    const image = toCanonicalUdemyImage(item.product_image);
    if (!image) continue;
    if (seenImages.has(image)) continue;

    seenImages.add(image);
    udemyItems.push({
      image,
      searchText: normalizeText(
        [
          item.product_title,
          item.category_title,
          item.subcategory_title,
          item.category_slug,
          item.subcategory_slug,
        ].join(" ")
      ),
    });
  }

  const categoryPools = buildCategoryCandidatePools(udemyItems);

  const mapping = {};
  const usedGlobal = new Set();
  const usedByCategory = new Map();

  for (const course of courses) {
    const categorySlug = course?.category_id?.slug ?? "uncategorized";
    const categoryUsed = usedByCategory.get(categorySlug) ?? new Set();

    const image = chooseImageForCourse({
      course,
      udemyItems,
      categoryPools,
      usedGlobal,
      usedByCategory: categoryUsed,
    });

    mapping[course.slug] = image;
    usedGlobal.add(image);
    categoryUsed.add(image);
    usedByCategory.set(categorySlug, categoryUsed);
  }

  writeFileSync(OUTPUT_FILE, buildOutputFile(mapping), "utf8");

  const duplicateCount =
    Object.keys(mapping).length - new Set(Object.values(mapping)).size;

  console.log(`Courses: ${courses.length}`);
  console.log(`Mapped: ${Object.keys(mapping).length}`);
  console.log(`Unique images: ${new Set(Object.values(mapping)).size}`);
  console.log(`Duplicate URLs: ${duplicateCount}`);
  console.log(`Output: ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
