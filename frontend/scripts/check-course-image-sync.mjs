#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const TARGET_DIRS = [join(ROOT, "src", "app"), join(ROOT, "src", "components")];
const FILE_EXTENSIONS = [".ts", ".tsx"];

const RULES = [
  {
    id: "course-thumbnail-direct",
    regex: /\bcourse\.thumbnail\b/g,
    message: "Do not access course.thumbnail directly in UI. Use getCourseImageSrc(course).",
  },
  {
    id: "course-assets-directus-url",
    regex: /\$\{process\.env\.NEXT_PUBLIC_DIRECTUS_URL\}\/assets\/\$\{[^}]*thumbnail[^}]*\}/g,
    message: "Do not build Directus asset URL manually for course images. Use getCourseImageSrc(course).",
  },
  {
    id: "course-getasset-thumbnail",
    regex: /getAssetUrl\(\s*[^)]*thumbnail[^)]*\)/g,
    message: "Do not call getAssetUrl(...thumbnail...) for course cards. Use getCourseImageSrc(course).",
  },
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walk(fullPath, out);
      continue;
    }

    if (FILE_EXTENSIONS.some((ext) => fullPath.endsWith(ext))) {
      out.push(fullPath);
    }
  }
  return out;
}

const files = TARGET_DIRS.flatMap((dir) => walk(dir)).filter(
  (file) => !file.endsWith(".d.ts")
);

const violations = [];

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const relPath = relative(ROOT, file).replace(/\\/g, "/");

  for (const rule of RULES) {
    const matches = content.match(rule.regex);
    if (!matches || matches.length === 0) continue;

    violations.push({
      file: relPath,
      rule: rule.id,
      count: matches.length,
      message: rule.message,
    });
  }
}

if (violations.length > 0) {
  console.error("Course image sync check failed:");
  for (const item of violations) {
    console.error(
      `- ${item.file} [${item.rule}] x${item.count}: ${item.message}`
    );
  }
  process.exit(1);
}

console.log("Course image sync check passed.");
