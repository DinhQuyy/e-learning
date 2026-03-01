#!/usr/bin/env node

/**
 * Directus Bootstrap Script — E-Learning Platform
 *
 * Tự động khởi tạo schema (collections, fields, relations),
 * roles, permissions, và seed data thông qua Directus REST API.
 *
 * Yêu cầu: Docker backend phải đang chạy.
 *
 * Usage: node backend/scripts/bootstrap.mjs [--write-static-token-file]
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ─── Config ──────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env");

function loadEnv() {
  const content = readFileSync(envPath, "utf-8");
  const vars = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    vars[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return vars;
}

const env = loadEnv();
const BASE_URL = "http://localhost:8055";
const ADMIN_EMAIL = env.ADMIN_EMAIL || "admin@elearning.dev";
const ADMIN_PASSWORD = env.ADMIN_PASSWORD || "Admin@123456";

let TOKEN = "";
const args = new Set(process.argv.slice(2));
const WRITE_STATIC_TOKEN_FILE =
  args.has("--write-static-token-file") ||
  args.has("--write-token-file") ||
  args.has("--write-env");

// ─── HTTP Helpers ────────────────────────────────────────────────────────────

async function api(method, path, body = null) {
  const url = `${BASE_URL}${path}`;
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!res.ok) {
    // If collection/field/relation already exists, skip silently
    const errMsg = JSON.stringify(data);
    if (
      errMsg.includes("already exists") ||
      errMsg.includes("DUPLICATE") ||
      errMsg.includes("duplicate") ||
      errMsg.includes("already been") ||
      (res.status === 400 && errMsg.includes("already"))
    ) {
      return data?.data ?? data;
    }
    throw new Error(`${method} ${path} → ${res.status}: ${errMsg}`);
  }
  return data?.data ?? data;
}

const get = (path) => api("GET", path);
const post = (path, body) => api("POST", path, body);

// ─── Step Helpers ────────────────────────────────────────────────────────────

function log(icon, msg) {
  console.log(`  ${icon}  ${msg}`);
}

function section(title) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"─".repeat(60)}`);
}

function centerText(text, width) {
  if (text.length >= width) return text;
  const left = Math.floor((width - text.length) / 2);
  const right = width - text.length - left;
  return `${" ".repeat(left)}${text}${" ".repeat(right)}`;
}

function printSummary({ staticToken, wroteEnvFile }) {
  const lines = [
    `  Admin:      ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`,
    "  Instructor: instructor@elearning.dev / Instructor@123",
    "  Student:    student@elearning.dev / Student@123",
    "",
    `  Directus Admin: ${BASE_URL}`,
    `  Static token: ${staticToken}`,
  ];

  if (wroteEnvFile) {
    lines.push("  Static token file: frontend/.env.local");
  }

  const title = "Bootstrap complete!";
  const width = Math.max(title.length, ...lines.map((line) => line.length));
  const border = "═".repeat(width + 2);

  console.log(`\n╔${border}╗`);
  console.log(`║ ${centerText(title, width)} ║`);
  console.log(`╠${border}╣`);
  for (const line of lines) {
    console.log(`║ ${line.padEnd(width)} ║`);
  }
  console.log(`╚${border}╝\n`);
}

// ─── 1. Authenticate ────────────────────────────────────────────────────────

async function authenticate() {
  section("1. Authenticate");
  const result = await post("/auth/login", {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  TOKEN = result.access_token;
  log("✓", `Logged in as ${ADMIN_EMAIL}`);
}

// ─── 2. Custom Fields on directus_users ──────────────────────────────────────

async function addUserFields() {
  section("2. Custom Fields → directus_users");

  const fields = [
    {
      field: "bio",
      type: "text",
      meta: { interface: "input-multiline", note: "Giới thiệu bản thân" },
      schema: {},
    },
    {
      field: "phone",
      type: "string",
      meta: { interface: "input", note: "Số điện thoại" },
      schema: { max_length: 20 },
    },
    {
      field: "headline",
      type: "string",
      meta: { interface: "input", note: "Tiêu đề chuyên môn" },
      schema: { max_length: 255 },
    },
    {
      field: "social_links",
      type: "json",
      meta: {
        interface: "input-code",
        options: { language: "json" },
        note: "Liên kết mạng xã hội (JSON)",
      },
      schema: {},
    },
    {
      field: "date_created",
      type: "timestamp",
      meta: {
        interface: "datetime",
        special: ["date-created"],
        readonly: true,
        note: "Ngày tạo tài khoản",
      },
      schema: {},
    },
  ];

  for (const f of fields) {
    try {
      await post("/fields/directus_users", f);
      log("✓", `Field: directus_users.${f.field}`);
    } catch (e) {
      if (e.message.includes("already")) {
        log("–", `Skipped (exists): directus_users.${f.field}`);
      } else throw e;
    }
  }
}

// ─── 3. Roles & Policies ─────────────────────────────────────────────────────

let ROLE_INSTRUCTOR = "";
let ROLE_STUDENT = "";
let POLICY_INSTRUCTOR = "";
let POLICY_STUDENT = "";
let POLICY_PUBLIC = "";

async function createRoles() {
  section("3. Roles & Policies");

  // Check existing roles first
  const existing = await get("/roles");
  const roles = Array.isArray(existing) ? existing : [];

  const existingInstructor = roles.find((r) => r.name === "Instructor");
  const existingStudent = roles.find((r) => r.name === "Student");

  if (existingInstructor) {
    ROLE_INSTRUCTOR = existingInstructor.id;
    log("–", `Role Instructor exists: ${ROLE_INSTRUCTOR}`);
  } else {
    const r = await post("/roles", {
      name: "Instructor",
      icon: "school",
      description: "Giảng viên — tạo và quản lý khóa học",
    });
    ROLE_INSTRUCTOR = r.id;
    log("✓", `Role Instructor created: ${ROLE_INSTRUCTOR}`);
  }

  if (existingStudent) {
    ROLE_STUDENT = existingStudent.id;
    log("–", `Role Student exists: ${ROLE_STUDENT}`);
  } else {
    const r = await post("/roles", {
      name: "Student",
      icon: "person",
      description: "Học viên — đăng ký và theo dõi khóa học",
    });
    ROLE_STUDENT = r.id;
    log("✓", `Role Student created: ${ROLE_STUDENT}`);
  }

  // Create policies and link to roles
  // Directus 11 uses policies (not roles) for app_access and permissions
  const existingPolicies = await get("/policies");
  const policies = Array.isArray(existingPolicies) ? existingPolicies : [];

  const existingInstructorPolicy = policies.find((p) => p.name === "Instructor Policy");
  const existingStudentPolicy = policies.find((p) => p.name === "Student Policy");

  if (existingInstructorPolicy) {
    POLICY_INSTRUCTOR = existingInstructorPolicy.id;
    log("–", `Policy Instructor exists: ${POLICY_INSTRUCTOR}`);
  } else {
    const p = await post("/policies", {
      name: "Instructor Policy",
      icon: "school",
      description: "Chính sách quyền cho giảng viên",
      admin_access: false,
      app_access: true,
    });
    POLICY_INSTRUCTOR = p.id;
    // Link policy to role via /access junction
    await post("/access", { role: ROLE_INSTRUCTOR, policy: POLICY_INSTRUCTOR });
    log("✓", `Policy Instructor created and linked: ${POLICY_INSTRUCTOR}`);
  }

  if (existingStudentPolicy) {
    POLICY_STUDENT = existingStudentPolicy.id;
    log("–", `Policy Student exists: ${POLICY_STUDENT}`);
  } else {
    const p = await post("/policies", {
      name: "Student Policy",
      icon: "person",
      description: "Chính sách quyền cho học viên",
      admin_access: false,
      app_access: true,
    });
    POLICY_STUDENT = p.id;
    // Link policy to role via /access junction
    await post("/access", { role: ROLE_STUDENT, policy: POLICY_STUDENT });
    log("✓", `Policy Student created and linked: ${POLICY_STUDENT}`);
  }

  // Public policy — anonymous/unauthenticated access
  const existingPublicPolicy = policies.find((p) => p.name === "Public Policy");
  if (existingPublicPolicy) {
    POLICY_PUBLIC = existingPublicPolicy.id;
    log("–", `Policy Public exists: ${POLICY_PUBLIC}`);
  } else {
    const p = await post("/policies", {
      name: "Public Policy",
      icon: "public",
      description: "Quyền truy cập công khai (không cần đăng nhập)",
      admin_access: false,
      app_access: false,
    });
    POLICY_PUBLIC = p.id;
    // Link to public role (role: null) for unauthenticated access
    await post("/access", { role: null, policy: POLICY_PUBLIC });
    log("✓", `Policy Public created and linked: ${POLICY_PUBLIC}`);
  }
}

// ─── 4. Collections ──────────────────────────────────────────────────────────

async function createCollection(name, meta = {}) {
  try {
    await post("/collections", {
      collection: name,
      schema: {},
      meta: {
        icon: "box",
        note: "",
        ...meta,
      },
      fields: [
        {
          field: "id",
          type: "uuid",
          meta: { hidden: true, readonly: true, interface: "input", special: ["uuid"] },
          schema: { is_primary_key: true, has_auto_increment: false },
        },
        {
          field: "date_created",
          type: "timestamp",
          meta: { special: ["date-created"], interface: "datetime", readonly: true, hidden: true, width: "half" },
          schema: {},
        },
        {
          field: "date_updated",
          type: "timestamp",
          meta: { special: ["date-updated"], interface: "datetime", readonly: true, hidden: true, width: "half" },
          schema: {},
        },
      ],
    });
    log("✓", `Collection: ${name}`);
  } catch (e) {
    if (e.message.includes("already")) {
      log("–", `Skipped (exists): ${name}`);
    } else throw e;
  }
}

async function addField(collection, field) {
  try {
    await post(`/fields/${collection}`, field);
  } catch (e) {
    if (e.message.includes("already")) return;
    throw e;
  }
}

async function addRelation(relation) {
  try {
    await post("/relations", relation);
  } catch (e) {
    if (e.message.includes("already") || e.message.includes("duplicate")) return;
    throw e;
  }
  // Auto-create O2M alias field on the parent collection
  const oneField = relation.meta?.one_field;
  const oneCollection = relation.related_collection;
  if (oneField && oneCollection) {
    try {
      await post(`/fields/${oneCollection}`, {
        field: oneField,
        type: null,
        meta: { special: ["o2m"], interface: "list-o2m" },
      });
    } catch {
      // Already exists — ignore
    }
  }
}

async function createCollections() {
  section("4. Collections & Fields");

  // ── 4.1 categories ──
  await createCollection("categories", { icon: "category", note: "Danh mục khóa học" });
  await addField("categories", {
    field: "name",
    type: "string",
    meta: { interface: "input", required: true, note: "Tên danh mục" },
    schema: { max_length: 255, is_nullable: false },
  });
  await addField("categories", {
    field: "slug",
    type: "string",
    meta: { interface: "input", required: true, note: "Slug URL" },
    schema: { max_length: 255, is_nullable: false, is_unique: true },
  });
  await addField("categories", {
    field: "description",
    type: "text",
    meta: { interface: "input-multiline", note: "Mô tả" },
    schema: {},
  });
  await addField("categories", {
    field: "icon",
    type: "string",
    meta: { interface: "input", note: "Icon name (Material Icons)" },
    schema: { max_length: 50 },
  });
  await addField("categories", {
    field: "sort",
    type: "integer",
    meta: { interface: "input", note: "Thứ tự sắp xếp" },
    schema: { default_value: 0 },
  });
  await addField("categories", {
    field: "status",
    type: "string",
    meta: {
      interface: "select-dropdown",
      note: "Trạng thái",
      options: {
        choices: [
          { text: "Đã xuất bản", value: "published" },
          { text: "Bản nháp", value: "draft" },
        ],
      },
    },
    schema: { max_length: 20, default_value: "published" },
  });
  await addField("categories", {
    field: "parent_id",
    type: "uuid",
    meta: { interface: "select-dropdown-m2o", note: "Danh mục cha", special: ["m2o"] },
    schema: { is_nullable: true },
  });
  await addRelation({
    collection: "categories",
    field: "parent_id",
    related_collection: "categories",
    meta: { sort_field: null },
    schema: { on_delete: "SET NULL" },
  });
  log("✓", "Fields & relations: categories");

  // ── 4.2 courses ──
  await createCollection("courses", { icon: "menu_book", note: "Khóa học" });
  await addField("courses", {
    field: "title",
    type: "string",
    meta: { interface: "input", required: true, note: "Tên khóa học" },
    schema: { max_length: 255, is_nullable: false },
  });
  await addField("courses", {
    field: "slug",
    type: "string",
    meta: { interface: "input", required: true, note: "Slug URL" },
    schema: { max_length: 255, is_nullable: false, is_unique: true },
  });
  await addField("courses", {
    field: "description",
    type: "text",
    meta: { interface: "input-rich-text-html", note: "Mô tả chi tiết" },
    schema: {},
  });
  await addField("courses", {
    field: "short_description",
    type: "string",
    meta: { interface: "input-multiline", note: "Mô tả ngắn" },
    schema: { max_length: 500 },
  });
  await addField("courses", {
    field: "thumbnail",
    type: "uuid",
    meta: { interface: "file-image", special: ["file"], note: "Ảnh đại diện" },
    schema: {},
  });
  await addRelation({
    collection: "courses",
    field: "thumbnail",
    related_collection: "directus_files",
    schema: { on_delete: "SET NULL" },
  });
  await addField("courses", {
    field: "price",
    type: "decimal",
    meta: { interface: "input", note: "Giá (VNĐ)" },
    schema: { numeric_precision: 12, numeric_scale: 0, default_value: 0 },
  });
  await addField("courses", {
    field: "level",
    type: "string",
    meta: {
      interface: "select-dropdown",
      note: "Trình độ",
      options: {
        choices: [
          { text: "Người mới", value: "beginner" },
          { text: "Trung cấp", value: "intermediate" },
          { text: "Nâng cao", value: "advanced" },
        ],
      },
    },
    schema: { max_length: 20, default_value: "beginner" },
  });
  await addField("courses", {
    field: "language",
    type: "string",
    meta: { interface: "input", note: "Ngôn ngữ" },
    schema: { max_length: 10, default_value: "vi" },
  });
  await addField("courses", {
    field: "status",
    type: "string",
    meta: {
      interface: "select-dropdown",
      note: "Trạng thái",
      options: {
        choices: [
          { text: "Bản nháp", value: "draft" },
          { text: "Đang xét duyệt", value: "review" },
          { text: "Đã xuất bản", value: "published" },
          { text: "Đã lưu trữ", value: "archived" },
        ],
      },
    },
    schema: { max_length: 20, default_value: "draft", is_nullable: false },
  });
  await addField("courses", {
    field: "category_id",
    type: "uuid",
    meta: { interface: "select-dropdown-m2o", special: ["m2o"], note: "Danh mục" },
    schema: {},
  });
  await addRelation({
    collection: "courses",
    field: "category_id",
    related_collection: "categories",
    meta: { sort_field: null },
    schema: { on_delete: "SET NULL" },
  });
  await addField("courses", {
    field: "requirements",
    type: "json",
    meta: { interface: "input-code", options: { language: "json" }, note: "Yêu cầu tiên quyết" },
    schema: {},
  });
  await addField("courses", {
    field: "what_you_learn",
    type: "json",
    meta: { interface: "input-code", options: { language: "json" }, note: "Bạn sẽ học được gì" },
    schema: {},
  });
  await addField("courses", {
    field: "content",
    type: "text",
    meta: { interface: "input-rich-text-html", note: "Nội dung chi tiết khóa học" },
    schema: {},
  });
  await addField("courses", {
    field: "discount_price",
    type: "decimal",
    meta: { interface: "input", note: "Giá khuyến mãi (VNĐ)" },
    schema: { numeric_precision: 12, numeric_scale: 0, is_nullable: true },
  });
  await addField("courses", {
    field: "promo_video_url",
    type: "string",
    meta: { interface: "input", note: "URL video giới thiệu" },
    schema: { max_length: 500 },
  });
  await addField("courses", {
    field: "is_featured",
    type: "boolean",
    meta: { interface: "boolean", note: "Khóa học nổi bật?" },
    schema: { default_value: false },
  });
  await addField("courses", {
    field: "target_audience",
    type: "json",
    meta: { interface: "input-code", options: { language: "json" }, note: "Đối tượng học viên" },
    schema: {},
  });
  await addField("courses", {
    field: "total_enrollments",
    type: "integer",
    meta: { interface: "input", note: "Tổng số lượt đăng ký (cache)" },
    schema: { default_value: 0 },
  });
  await addField("courses", {
    field: "average_rating",
    type: "decimal",
    meta: { interface: "input", note: "Điểm đánh giá trung bình (cache)" },
    schema: { numeric_precision: 3, numeric_scale: 2, default_value: 0 },
  });
  await addField("courses", {
    field: "total_lessons",
    type: "integer",
    meta: { interface: "input", note: "Tổng số bài học (cache)" },
    schema: { default_value: 0 },
  });
  await addField("courses", {
    field: "total_duration",
    type: "integer",
    meta: { interface: "input", note: "Tổng thời lượng giây (cache)" },
    schema: { default_value: 0 },
  });
  log("✓", "Fields & relations: courses");

  // ── 4.3 courses_instructors (junction) ──
  await createCollection("courses_instructors", {
    icon: "group",
    note: "Giảng viên của khóa học (M2M)",
    hidden: true,
  });
  await addField("courses_instructors", {
    field: "course_id",
    type: "uuid",
    meta: { interface: "select-dropdown-m2o", special: ["m2o"], hidden: true },
    schema: { is_nullable: false },
  });
  await addField("courses_instructors", {
    field: "user_id",
    type: "uuid",
    meta: { interface: "select-dropdown-m2o", special: ["m2o"], hidden: true },
    schema: { is_nullable: false },
  });
  await addRelation({
    collection: "courses_instructors",
    field: "course_id",
    related_collection: "courses",
    meta: {
      one_field: "instructors",
      junction_field: "user_id",
    },
    schema: { on_delete: "CASCADE" },
  });
  await addRelation({
    collection: "courses_instructors",
    field: "user_id",
    related_collection: "directus_users",
    meta: {
      one_field: "courses_teaching",
      junction_field: "course_id",
    },
    schema: { on_delete: "CASCADE" },
  });
  log("✓", "Fields & relations: courses_instructors");

  // ── 4.4 modules ──
  await createCollection("modules", { icon: "folder", note: "Chương/module trong khóa học" });
  await addField("modules", {
    field: "title",
    type: "string",
    meta: { interface: "input", required: true, note: "Tên chương" },
    schema: { max_length: 255, is_nullable: false },
  });
  await addField("modules", {
    field: "description",
    type: "text",
    meta: { interface: "input-multiline", note: "Mô tả module" },
    schema: {},
  });
  await addField("modules", {
    field: "sort",
    type: "integer",
    meta: { interface: "input", note: "Thứ tự sắp xếp" },
    schema: { default_value: 0 },
  });
  await addField("modules", {
    field: "course_id",
    type: "uuid",
    meta: { interface: "select-dropdown-m2o", special: ["m2o"], note: "Khóa học" },
    schema: { is_nullable: false },
  });
  await addRelation({
    collection: "modules",
    field: "course_id",
    related_collection: "courses",
    meta: { one_field: "modules", sort_field: "sort" },
    schema: { on_delete: "CASCADE" },
  });
  log("✓", "Fields & relations: modules");

  // ── 4.5 lessons ──
  await createCollection("lessons", { icon: "play_circle", note: "Bài học" });
  await addField("lessons", {
    field: "title",
    type: "string",
    meta: { interface: "input", required: true, note: "Tên bài học" },
    schema: { max_length: 255, is_nullable: false },
  });
  await addField("lessons", {
    field: "slug",
    type: "string",
    meta: { interface: "input", required: true, note: "Slug URL" },
    schema: { max_length: 255, is_nullable: false, is_unique: true },
  });
  await addField("lessons", {
    field: "sort",
    type: "integer",
    meta: { interface: "input", note: "Thứ tự" },
    schema: { default_value: 0 },
  });
  await addField("lessons", {
    field: "type",
    type: "string",
    meta: {
      interface: "select-dropdown",
      note: "Loại bài học",
      options: {
        choices: [
          { text: "Video", value: "video" },
          { text: "Bài đọc", value: "text" },
        ],
      },
    },
    schema: { max_length: 20, default_value: "video" },
  });
  await addField("lessons", {
    field: "content",
    type: "text",
    meta: { interface: "input-rich-text-html", note: "Nội dung bài viết" },
    schema: {},
  });
  await addField("lessons", {
    field: "video_url",
    type: "string",
    meta: { interface: "input", note: "URL video" },
    schema: { max_length: 500 },
  });
  await addField("lessons", {
    field: "duration",
    type: "integer",
    meta: { interface: "input", note: "Thời lượng (giây)" },
    schema: { default_value: 0 },
  });
  await addField("lessons", {
    field: "is_free",
    type: "boolean",
    meta: { interface: "boolean", note: "Bài học miễn phí?" },
    schema: { default_value: false },
  });
  await addField("lessons", {
    field: "status",
    type: "string",
    meta: {
      interface: "select-dropdown",
      note: "Trạng thái",
      options: {
        choices: [
          { text: "Bản nháp", value: "draft" },
          { text: "Đã xuất bản", value: "published" },
        ],
      },
    },
    schema: { max_length: 20, default_value: "draft" },
  });
  await addField("lessons", {
    field: "module_id",
    type: "uuid",
    meta: { interface: "select-dropdown-m2o", special: ["m2o"], note: "Module" },
    schema: { is_nullable: false },
  });
  await addRelation({
    collection: "lessons",
    field: "module_id",
    related_collection: "modules",
    meta: { one_field: "lessons", sort_field: "sort" },
    schema: { on_delete: "CASCADE" },
  });
  log("✓", "Fields & relations: lessons");

  // ── 4.6 enrollments ──
  await createCollection("enrollments", { icon: "how_to_reg", note: "Đăng ký khóa học" });
  await addField("enrollments", {
    field: "user_id",
    type: "uuid",
    meta: { interface: "select-dropdown-m2o", special: ["m2o"], note: "Học viên" },
    schema: { is_nullable: false },
  });
  await addField("enrollments", {
    field: "course_id",
    type: "uuid",
    meta: { interface: "select-dropdown-m2o", special: ["m2o"], note: "Khóa học" },
    schema: { is_nullable: false },
  });
  await addField("enrollments", {
    field: "status",
    type: "string",
    meta: {
      interface: "select-dropdown",
      note: "Trạng thái",
      options: {
        choices: [
          { text: "Đang học", value: "active" },
          { text: "Hoàn thành", value: "completed" },
          { text: "Đã hủy", value: "cancelled" },
        ],
      },
    },
    schema: { max_length: 20, default_value: "active" },
  });
  await addField("enrollments", {
    field: "last_lesson_id",
    type: "uuid",
    meta: { interface: "select-dropdown-m2o", special: ["m2o"], note: "Bài học gần nhất" },
    schema: {},
  });
  await addField("enrollments", {
    field: "enrolled_at",
    type: "timestamp",
    meta: { interface: "datetime", note: "Ngày ghi danh", special: ["date-created"] },
    schema: {},
  });
  await addField("enrollments", {
    field: "progress_percentage",
    type: "decimal",
    meta: { interface: "input", note: "Phần trăm hoàn thành (cache)" },
    schema: { numeric_precision: 5, numeric_scale: 2, default_value: 0 },
  });
  await addField("enrollments", {
    field: "completed_at",
    type: "timestamp",
    meta: { interface: "datetime", note: "Ngày hoàn thành" },
    schema: {},
  });
  await addRelation({
    collection: "enrollments",
    field: "user_id",
    related_collection: "directus_users",
    meta: { one_field: "enrollments" },
    schema: { on_delete: "CASCADE" },
  });
  await addRelation({
    collection: "enrollments",
    field: "course_id",
    related_collection: "courses",
    meta: { one_field: "enrollments" },
    schema: { on_delete: "CASCADE" },
  });
  await addRelation({
    collection: "enrollments",
    field: "last_lesson_id",
    related_collection: "lessons",
    schema: { on_delete: "SET NULL" },
  });
  log("✓", "Fields & relations: enrollments");

  // ── 4.7 progress ──
  await createCollection("progress", { icon: "trending_up", note: "Tiến độ bài học" });
  await addField("progress", {
    field: "enrollment_id",
    type: "uuid",
    meta: { interface: "select-dropdown-m2o", special: ["m2o"], note: "Enrollment" },
    schema: { is_nullable: false },
  });
  await addField("progress", {
    field: "lesson_id",
    type: "uuid",
    meta: { interface: "select-dropdown-m2o", special: ["m2o"], note: "Bài học" },
    schema: { is_nullable: false },
  });
  await addField("progress", {
    field: "completed",
    type: "boolean",
    meta: { interface: "boolean", note: "Đã hoàn thành?" },
    schema: { default_value: false },
  });
  await addField("progress", {
    field: "video_position",
    type: "integer",
    meta: { interface: "input", note: "Vị trí video (giây)" },
    schema: { default_value: 0 },
  });
  await addField("progress", {
    field: "completed_at",
    type: "timestamp",
    meta: { interface: "datetime", note: "Thời gian hoàn thành" },
    schema: {},
  });
  await addRelation({
    collection: "progress",
    field: "enrollment_id",
    related_collection: "enrollments",
    meta: { one_field: "progress" },
    schema: { on_delete: "CASCADE" },
  });
  await addRelation({
    collection: "progress",
    field: "lesson_id",
    related_collection: "lessons",
    schema: { on_delete: "CASCADE" },
  });
  log("✓", "Fields & relations: progress");

  // ── 4.8 reviews ──
  await createCollection("reviews", { icon: "star", note: "Đánh giá khóa học" });
  await addField("reviews", {
    field: "user_id",
    type: "uuid",
    meta: { interface: "select-dropdown-m2o", special: ["m2o"], note: "Người đánh giá" },
    schema: { is_nullable: false },
  });
  await addField("reviews", {
    field: "course_id",
    type: "uuid",
    meta: { interface: "select-dropdown-m2o", special: ["m2o"], note: "Khóa học" },
    schema: { is_nullable: false },
  });
  await addField("reviews", {
    field: "rating",
    type: "integer",
    meta: { interface: "input", note: "Số sao (1-5)" },
    schema: { is_nullable: false },
  });
  await addField("reviews", {
    field: "comment",
    type: "text",
    meta: { interface: "input-multiline", note: "Nhận xét" },
    schema: {},
  });
  await addField("reviews", {
    field: "status",
    type: "string",
    meta: {
      interface: "select-dropdown",
      note: "Trạng thái đánh giá",
      options: {
        choices: [
          { text: "Chờ duyệt", value: "pending" },
          { text: "Đã duyệt", value: "approved" },
          { text: "Từ chối", value: "rejected" },
        ],
      },
    },
    schema: { max_length: 20, default_value: "pending" },
  });
  await addRelation({
    collection: "reviews",
    field: "user_id",
    related_collection: "directus_users",
    meta: { one_field: "reviews" },
    schema: { on_delete: "CASCADE" },
  });
  await addRelation({
    collection: "reviews",
    field: "course_id",
    related_collection: "courses",
    meta: { one_field: "reviews" },
    schema: { on_delete: "CASCADE" },
  });
  log("✓", "Fields & relations: reviews");

  // ── 4.9 quizzes ──
  await createCollection("quizzes", { icon: "quiz", note: "Bài kiểm tra" });
  await addField("quizzes", {
    field: "title",
    type: "string",
    meta: { interface: "input", required: true, note: "Tên bài kiểm tra" },
    schema: { max_length: 255, is_nullable: false },
  });
  await addField("quizzes", {
    field: "description",
    type: "text",
    meta: { interface: "input-multiline", note: "Mô tả" },
    schema: {},
  });
  await addField("quizzes", {
    field: "lesson_id",
    type: "uuid",
    meta: { interface: "select-dropdown-m2o", special: ["m2o"], note: "Bài học" },
    schema: { is_nullable: false },
  });
  await addField("quizzes", {
    field: "passing_score",
    type: "integer",
    meta: { interface: "input", note: "Điểm đạt (%)" },
    schema: { default_value: 70 },
  });
  await addField("quizzes", {
    field: "time_limit",
    type: "integer",
    meta: { interface: "input", note: "Thời gian giới hạn (phút), 0 = không giới hạn" },
    schema: { default_value: 0 },
  });
  await addField("quizzes", {
    field: "max_attempts",
    type: "integer",
    meta: { interface: "input", note: "Số lần thử tối đa, 0 = không giới hạn" },
    schema: { default_value: 0 },
  });
  await addRelation({
    collection: "quizzes",
    field: "lesson_id",
    related_collection: "lessons",
    meta: { one_field: "quizzes" },
    schema: { on_delete: "CASCADE" },
  });
  log("✓", "Fields & relations: quizzes");

  // ── 4.10 quiz_questions ──
  await createCollection("quiz_questions", { icon: "help", note: "Câu hỏi trắc nghiệm" });
  await addField("quiz_questions", {
    field: "quiz_id",
    type: "uuid",
    meta: { interface: "select-dropdown-m2o", special: ["m2o"], note: "Bài kiểm tra" },
    schema: { is_nullable: false },
  });
  await addField("quiz_questions", {
    field: "question_text",
    type: "text",
    meta: { interface: "input-multiline", required: true, note: "Nội dung câu hỏi" },
    schema: { is_nullable: false },
  });
  await addField("quiz_questions", {
    field: "sort",
    type: "integer",
    meta: { interface: "input", note: "Thứ tự" },
    schema: { default_value: 0 },
  });
  await addField("quiz_questions", {
    field: "question_type",
    type: "string",
    meta: {
      interface: "select-dropdown",
      note: "Loại câu hỏi",
      options: {
        choices: [
          { text: "Trắc nghiệm nhiều đáp án", value: "multiple_choice" },
          { text: "Trắc nghiệm một đáp án", value: "single_choice" },
          { text: "Đúng/Sai", value: "true_false" },
        ],
      },
    },
    schema: { max_length: 20, default_value: "multiple_choice" },
  });
  await addField("quiz_questions", {
    field: "points",
    type: "integer",
    meta: { interface: "input", note: "Điểm" },
    schema: { default_value: 1 },
  });
  await addField("quiz_questions", {
    field: "explanation",
    type: "text",
    meta: { interface: "input-multiline", note: "Giải thích đáp án" },
    schema: {},
  });
  await addRelation({
    collection: "quiz_questions",
    field: "quiz_id",
    related_collection: "quizzes",
    meta: { one_field: "questions", sort_field: "sort" },
    schema: { on_delete: "CASCADE" },
  });
  log("✓", "Fields & relations: quiz_questions");

  // ── 4.11 quiz_answers ──
  await createCollection("quiz_answers", { icon: "check_circle", note: "Đáp án trắc nghiệm" });
  await addField("quiz_answers", {
    field: "question_id",
    type: "uuid",
    meta: { interface: "select-dropdown-m2o", special: ["m2o"], note: "Câu hỏi" },
    schema: { is_nullable: false },
  });
  await addField("quiz_answers", {
    field: "answer_text",
    type: "string",
    meta: { interface: "input", required: true, note: "Nội dung đáp án" },
    schema: { max_length: 500, is_nullable: false },
  });
  await addField("quiz_answers", {
    field: "is_correct",
    type: "boolean",
    meta: { interface: "boolean", note: "Đáp án đúng?" },
    schema: { default_value: false },
  });
  await addField("quiz_answers", {
    field: "sort",
    type: "integer",
    meta: { interface: "input", note: "Thứ tự" },
    schema: { default_value: 0 },
  });
  await addRelation({
    collection: "quiz_answers",
    field: "question_id",
    related_collection: "quiz_questions",
    meta: { one_field: "answers", sort_field: "sort" },
    schema: { on_delete: "CASCADE" },
  });
  log("✓", "Fields & relations: quiz_answers");

  // ── 4.12 quiz_attempts ──
  await createCollection("quiz_attempts", { icon: "assignment", note: "Lượt làm bài kiểm tra" });
  await addField("quiz_attempts", {
    field: "quiz_id",
    type: "uuid",
    meta: { interface: "select-dropdown-m2o", special: ["m2o"], note: "Bài kiểm tra" },
    schema: { is_nullable: false },
  });
  await addField("quiz_attempts", {
    field: "user_id",
    type: "uuid",
    meta: { interface: "select-dropdown-m2o", special: ["m2o"], note: "Học viên" },
    schema: { is_nullable: false },
  });
  await addField("quiz_attempts", {
    field: "score",
    type: "decimal",
    meta: { interface: "input", note: "Điểm số" },
    schema: { numeric_precision: 5, numeric_scale: 2 },
  });
  await addField("quiz_attempts", {
    field: "passed",
    type: "boolean",
    meta: { interface: "boolean", note: "Đạt?" },
    schema: { default_value: false },
  });
  await addField("quiz_attempts", {
    field: "answers",
    type: "json",
    meta: { interface: "input-code", options: { language: "json" }, note: "Chi tiết câu trả lời" },
    schema: {},
  });
  await addField("quiz_attempts", {
    field: "started_at",
    type: "timestamp",
    meta: { interface: "datetime", note: "Bắt đầu lúc" },
    schema: {},
  });
  await addField("quiz_attempts", {
    field: "finished_at",
    type: "timestamp",
    meta: { interface: "datetime", note: "Kết thúc lúc" },
    schema: {},
  });
  await addRelation({
    collection: "quiz_attempts",
    field: "quiz_id",
    related_collection: "quizzes",
    meta: { one_field: "attempts" },
    schema: { on_delete: "CASCADE" },
  });
  await addRelation({
    collection: "quiz_attempts",
    field: "user_id",
    related_collection: "directus_users",
    schema: { on_delete: "CASCADE" },
  });
  log("✓", "Fields & relations: quiz_attempts");

  // ── 4.13 notifications ──
  await createCollection("notifications", { icon: "notifications", note: "Thông báo" });
  await addField("notifications", {
    field: "user_id",
    type: "uuid",
    meta: { interface: "select-dropdown-m2o", special: ["m2o"], note: "Người nhận" },
    schema: { is_nullable: false },
  });
  await addField("notifications", {
    field: "title",
    type: "string",
    meta: { interface: "input", required: true, note: "Tiêu đề" },
    schema: { max_length: 255, is_nullable: false },
  });
  await addField("notifications", {
    field: "message",
    type: "text",
    meta: { interface: "input-multiline", note: "Nội dung" },
    schema: {},
  });
  await addField("notifications", {
    field: "type",
    type: "string",
    meta: {
      interface: "select-dropdown",
      note: "Loại thông báo",
      options: {
        choices: [
          { text: "Thông tin", value: "info" },
          { text: "Thành công", value: "success" },
          { text: "Cảnh báo", value: "warning" },
          { text: "Ghi danh", value: "enrollment" },
          { text: "Đánh giá", value: "review" },
          { text: "Hệ thống", value: "system" },
        ],
      },
    },
    schema: { max_length: 20, default_value: "info" },
  });
  await addField("notifications", {
    field: "is_read",
    type: "boolean",
    meta: { interface: "boolean", note: "Đã đọc?" },
    schema: { default_value: false },
  });
  await addField("notifications", {
    field: "link",
    type: "string",
    meta: { interface: "input", note: "Đường dẫn liên kết" },
    schema: { max_length: 500 },
  });
  await addRelation({
    collection: "notifications",
    field: "user_id",
    related_collection: "directus_users",
    meta: { one_field: "notifications" },
    schema: { on_delete: "CASCADE" },
  });
  log("✓", "Fields & relations: notifications");

  // ── 4.10 cart_items ──
  await createCollection("cart_items", { icon: "shopping_cart", note: "Giỏ hàng" });
  await addField("cart_items", {
    field: "user_id",
    type: "uuid",
    meta: { interface: "select-dropdown-m2o", special: ["m2o"], required: true, note: "Người dùng" },
    schema: { is_nullable: false },
  });
  await addField("cart_items", {
    field: "course_id",
    type: "uuid",
    meta: { interface: "select-dropdown-m2o", special: ["m2o"], required: true, note: "Khoá học" },
    schema: { is_nullable: false },
  });
  await addRelation({
    collection: "cart_items",
    field: "user_id",
    related_collection: "directus_users",
    schema: { on_delete: "CASCADE" },
  });
  await addRelation({
    collection: "cart_items",
    field: "course_id",
    related_collection: "courses",
    schema: { on_delete: "CASCADE" },
  });
  log("✓", "Fields & relations: cart_items");

  // ── 4.11 wishlists ──
  await createCollection("wishlists", { icon: "favorite", note: "Danh sách yêu thích" });
  await addField("wishlists", {
    field: "user_id",
    type: "uuid",
    meta: { interface: "select-dropdown-m2o", special: ["m2o"], required: true, note: "Người dùng" },
    schema: { is_nullable: false },
  });
  await addField("wishlists", {
    field: "course_id",
    type: "uuid",
    meta: { interface: "select-dropdown-m2o", special: ["m2o"], required: true, note: "Khoá học" },
    schema: { is_nullable: false },
  });
  await addRelation({
    collection: "wishlists",
    field: "user_id",
    related_collection: "directus_users",
    schema: { on_delete: "CASCADE" },
  });
  await addRelation({
    collection: "wishlists",
    field: "course_id",
    related_collection: "courses",
    schema: { on_delete: "CASCADE" },
  });
  log("✓", "Fields & relations: wishlists");

  // ── 4.12 orders ──
  await createCollection("orders", { icon: "receipt_long", note: "Đơn hàng" });
  await addField("orders", {
    field: "user_id",
    type: "uuid",
    meta: { interface: "select-dropdown-m2o", special: ["m2o"], required: true, note: "Người mua" },
    schema: { is_nullable: false },
  });
  await addField("orders", {
    field: "order_number",
    type: "string",
    meta: { interface: "input", required: true, note: "Mã đơn hàng" },
    schema: { max_length: 50, is_nullable: false, is_unique: true },
  });
  await addField("orders", {
    field: "total_amount",
    type: "decimal",
    meta: { interface: "input", required: true, note: "Tổng tiền" },
    schema: { numeric_precision: 12, numeric_scale: 0, is_nullable: false, default_value: 0 },
  });
  await addField("orders", {
    field: "status",
    type: "string",
    meta: {
      interface: "select-dropdown",
      required: true,
      note: "Trạng thái",
      options: {
        choices: [
          { text: "Chờ xử lý", value: "pending" },
          { text: "Thành công", value: "success" },
          { text: "Thất bại", value: "failed" },
          { text: "Đã huỷ", value: "cancelled" },
        ],
      },
    },
    schema: { max_length: 20, default_value: "pending" },
  });
  await addField("orders", {
    field: "payment_method",
    type: "string",
    meta: {
      interface: "select-dropdown",
      required: true,
      note: "Phương thức thanh toán",
      options: {
        choices: [
          { text: "VNPay", value: "vnpay" },
          { text: "MoMo", value: "momo" },
          { text: "Chuyển khoản", value: "bank_transfer" },
        ],
      },
    },
    schema: { max_length: 20 },
  });
  await addField("orders", {
    field: "payment_ref",
    type: "string",
    meta: { interface: "input", note: "Mã tham chiếu thanh toán" },
    schema: { max_length: 255 },
  });
  await addField("orders", {
    field: "paid_at",
    type: "timestamp",
    meta: { interface: "datetime", note: "Thời gian thanh toán" },
    schema: {},
  });
  await addRelation({
    collection: "orders",
    field: "user_id",
    related_collection: "directus_users",
    schema: { on_delete: "SET NULL" },
  });
  log("✓", "Fields & relations: orders");

  // ── 4.13 order_items ──
  await createCollection("order_items", { icon: "list_alt", note: "Chi tiết đơn hàng" });
  await addField("order_items", {
    field: "order_id",
    type: "uuid",
    meta: { interface: "select-dropdown-m2o", special: ["m2o"], required: true, note: "Đơn hàng" },
    schema: { is_nullable: false },
  });
  await addField("order_items", {
    field: "course_id",
    type: "uuid",
    meta: { interface: "select-dropdown-m2o", special: ["m2o"], required: true, note: "Khoá học" },
    schema: { is_nullable: false },
  });
  await addField("order_items", {
    field: "price",
    type: "decimal",
    meta: { interface: "input", required: true, note: "Giá tại thời điểm mua" },
    schema: { numeric_precision: 12, numeric_scale: 0, is_nullable: false, default_value: 0 },
  });
  await addRelation({
    collection: "order_items",
    field: "order_id",
    related_collection: "orders",
    meta: { one_field: "items" },
    schema: { on_delete: "CASCADE" },
  });
  await addRelation({
    collection: "order_items",
    field: "course_id",
    related_collection: "courses",
    schema: { on_delete: "SET NULL" },
  });
  log("✓", "Fields & relations: order_items");

  // ── 4.14 platform_settings ──
  await createCollection("platform_settings", { icon: "settings", note: "Cài đặt nền tảng", singleton: true });
  await addField("platform_settings", {
    field: "platform_name",
    type: "string",
    meta: { interface: "input", note: "Tên nền tảng" },
    schema: { max_length: 255, default_value: "E-Learning Platform" },
  });
  await addField("platform_settings", {
    field: "platform_description",
    type: "text",
    meta: { interface: "input-multiline", note: "Mô tả nền tảng" },
    schema: {},
  });
  await addField("platform_settings", {
    field: "maintenance_mode",
    type: "boolean",
    meta: { interface: "boolean", note: "Chế độ bảo trì" },
    schema: { default_value: false },
  });
  await addField("platform_settings", {
    field: "maintenance_message",
    type: "text",
    meta: { interface: "input-multiline", note: "Thông báo bảo trì" },
    schema: {},
  });
  log("✓", "Fields: platform_settings");
}

// ─── 5. Permissions ──────────────────────────────────────────────────────────

async function setPermissions() {
  section("5. Permissions");

  // Load existing permissions to avoid duplicates
  const existingPerms = await get("/permissions?fields=id,policy,collection,action&limit=-1");
  const permSet = new Set();
  const perms = Array.isArray(existingPerms) ? existingPerms : [];
  for (const p of perms) {
    if (p.policy) permSet.add(`${p.policy}:${p.collection}:${p.action}`);
  }

  // Helper: create a permission entry (Directus 11 uses policy, not role)
  async function perm(policy, collection, action, opts = {}) {
    const key = `${policy}:${collection}:${action}`;
    if (permSet.has(key)) return;
    try {
      await post("/permissions", {
        policy,
        collection,
        action,
        ...opts,
      });
      permSet.add(key);
    } catch (e) {
      if (e.message.includes("already") || e.message.includes("duplicate")) return;
      throw e;
    }
  }

  // ── Public permissions (anonymous/unauthenticated) ──
  const P = POLICY_PUBLIC;

  // Public: read with O2M alias fields for relational queries
  await perm(P, "categories", "read", { fields: ["*"] });
  await perm(P, "courses", "read", { permissions: { status: { _eq: "published" } }, fields: ["*", "modules", "instructors", "enrollments", "reviews"] });
  await perm(P, "modules", "read", { fields: ["*", "lessons"] });
  await perm(P, "lessons", "read", { permissions: { status: { _eq: "published" } }, fields: ["*", "quizzes"] });
  await perm(P, "quizzes", "read", { fields: ["*", "questions"] });
  await perm(P, "quiz_questions", "read", { fields: ["*", "answers"] });
  await perm(P, "quiz_answers", "read", { fields: ["*"] });
  // Public: read junction for instructor info on course pages
  await perm(P, "courses_instructors", "read", { fields: ["*"] });
  // Public: read user profiles (limited fields for instructor display)
  await perm(P, "directus_users", "read", {
    fields: ["id", "first_name", "last_name", "avatar", "bio", "headline"],
  });
  // Public: read reviews (approved only)
  await perm(P, "reviews", "read", {
    permissions: { status: { _eq: "approved" } },
    fields: ["id", "user_id", "course_id", "rating", "comment", "date_created"],
  });
  // Public: read files (for course thumbnails, avatars)
  await perm(P, "directus_files", "read", { fields: "*" });

  log("✓", "Public permissions set");

  // ── Student permissions ──
  const S = POLICY_STUDENT;

  // Public-read collections (include O2M alias fields for relational queries)
  await perm(S, "categories", "read", { fields: ["*"] });
  await perm(S, "courses", "read", { permissions: { status: { _eq: "published" } }, fields: ["*", "modules", "instructors", "enrollments", "reviews"] });
  await perm(S, "modules", "read", { fields: ["*", "lessons"] });
  await perm(S, "lessons", "read", { permissions: { status: { _eq: "published" } }, fields: ["*", "quizzes"] });
  await perm(S, "quizzes", "read", { fields: ["*", "questions", "attempts"] });
  await perm(S, "quiz_questions", "read", { fields: ["*", "answers"] });
  await perm(S, "quiz_answers", "read", { fields: ["*"] });

  // Student: read junction for instructor info
  await perm(S, "courses_instructors", "read", { fields: ["*"] });

  // Student: own enrollments
  await perm(S, "enrollments", "create", { fields: "*", validation: { user_id: { _eq: "$CURRENT_USER" } } });
  await perm(S, "enrollments", "read", { permissions: { user_id: { _eq: "$CURRENT_USER" } }, fields: "*" });
  await perm(S, "enrollments", "update", { permissions: { user_id: { _eq: "$CURRENT_USER" } }, fields: ["status", "last_lesson_id", "progress_percentage", "completed_at"] });

  // Student: own progress
  await perm(S, "progress", "create", { fields: "*" });
  await perm(S, "progress", "read", { permissions: { enrollment_id: { user_id: { _eq: "$CURRENT_USER" } } }, fields: "*" });
  await perm(S, "progress", "update", { permissions: { enrollment_id: { user_id: { _eq: "$CURRENT_USER" } } }, fields: ["completed", "completed_at", "video_position"] });

  // Student: own reviews
  await perm(S, "reviews", "create", { fields: "*", validation: { user_id: { _eq: "$CURRENT_USER" } } });
  await perm(S, "reviews", "read", { fields: "*" });
  await perm(S, "reviews", "update", { permissions: { user_id: { _eq: "$CURRENT_USER" } }, fields: ["rating", "comment"] });

  // Student: quiz_attempts
  await perm(S, "quiz_attempts", "create", { fields: "*", validation: { user_id: { _eq: "$CURRENT_USER" } } });
  await perm(S, "quiz_attempts", "read", { permissions: { user_id: { _eq: "$CURRENT_USER" } }, fields: "*" });

  // Student: own profile
  await perm(S, "directus_users", "read", {
    permissions: { id: { _eq: "$CURRENT_USER" } },
    fields: ["id", "first_name", "last_name", "email", "avatar", "role", "status", "bio", "phone", "headline", "social_links", "date_created"],
  });
  await perm(S, "directus_users", "update", {
    permissions: { id: { _eq: "$CURRENT_USER" } },
    fields: ["first_name", "last_name", "avatar", "bio", "phone", "headline", "social_links"],
  });

  // Student: notifications (own)
  await perm(S, "notifications", "read", { permissions: { user_id: { _eq: "$CURRENT_USER" } }, fields: "*" });
  await perm(S, "notifications", "update", { permissions: { user_id: { _eq: "$CURRENT_USER" } }, fields: ["is_read"] });

  // Student: read files (for thumbnails etc.)
  await perm(S, "directus_files", "read", { fields: "*" });
  // Student: upload files (for avatar)
  await perm(S, "directus_files", "create", { fields: "*" });
  // Student: update own files (optional, but good for managing uploads if needed)
  await perm(S, "directus_files", "update", {
    permissions: { uploaded_by: { _eq: "$CURRENT_USER" } },
    fields: "*",
  });

  // Student: read roles (for role.name expansion)
  await perm(S, "directus_roles", "read", { fields: ["id", "name"] });

  // Student: cart (own)
  await perm(S, "cart_items", "create", { fields: "*", validation: { user_id: { _eq: "$CURRENT_USER" } } });
  await perm(S, "cart_items", "read", { permissions: { user_id: { _eq: "$CURRENT_USER" } }, fields: "*" });
  await perm(S, "cart_items", "delete", { permissions: { user_id: { _eq: "$CURRENT_USER" } } });

  // Student: wishlist (own)
  await perm(S, "wishlists", "create", { fields: "*", validation: { user_id: { _eq: "$CURRENT_USER" } } });
  await perm(S, "wishlists", "read", { permissions: { user_id: { _eq: "$CURRENT_USER" } }, fields: "*" });
  await perm(S, "wishlists", "delete", { permissions: { user_id: { _eq: "$CURRENT_USER" } } });

  // Student: orders (own)
  await perm(S, "orders", "create", { fields: "*", validation: { user_id: { _eq: "$CURRENT_USER" } } });
  await perm(S, "orders", "read", { permissions: { user_id: { _eq: "$CURRENT_USER" } }, fields: "*" });
  await perm(S, "orders", "update", { permissions: { user_id: { _eq: "$CURRENT_USER" } }, fields: ["status", "paid_at", "payment_ref"] });

  // Student: order_items (own orders)
  await perm(S, "order_items", "create", { fields: "*" });
  await perm(S, "order_items", "read", { permissions: { order_id: { user_id: { _eq: "$CURRENT_USER" } } }, fields: "*" });

  log("✓", "Student permissions set");

  // ── Instructor permissions ──
  const I = POLICY_INSTRUCTOR;

  // Same public reads as student (include O2M alias fields for relational queries)
  await perm(I, "categories", "read", { fields: ["*"] });
  await perm(I, "courses", "read", { fields: ["*", "modules", "instructors", "enrollments", "reviews"] });
  await perm(I, "modules", "read", { fields: ["*", "lessons"] });
  await perm(I, "lessons", "read", { fields: ["*", "quizzes"] });
  await perm(I, "quizzes", "read", { fields: ["*", "questions", "attempts"] });
  await perm(I, "quiz_questions", "read", { fields: ["*", "answers"] });
  await perm(I, "quiz_answers", "read", { fields: ["*"] });

  // Instructor: own profile + students in instructor-owned courses
  await perm(I, "directus_users", "read", {
    permissions: {
      _or: [
        { id: { _eq: "$CURRENT_USER" } },
        {
          enrollments: {
            course_id: {
              instructors: {
                user_id: { _eq: "$CURRENT_USER" },
              },
            },
          },
        },
      ],
    },
    fields: ["id", "first_name", "last_name", "email", "avatar", "role", "status", "bio", "phone", "headline", "social_links", "date_created"],
  });
  await perm(I, "directus_users", "update", {
    permissions: { id: { _eq: "$CURRENT_USER" } },
    fields: ["first_name", "last_name", "avatar", "bio", "phone", "headline", "social_links"],
  });

  // Instructor: CRUD own courses (via junction)
  await perm(I, "courses", "create", { fields: "*" });
  await perm(I, "courses", "update", {
    permissions: { instructors: { user_id: { _eq: "$CURRENT_USER" } } },
    fields: "*",
  });
  await perm(I, "courses", "delete", {
    permissions: { instructors: { user_id: { _eq: "$CURRENT_USER" } } },
  });

  // Instructor: courses_instructors junction
  await perm(I, "courses_instructors", "create", { fields: "*" });
  await perm(I, "courses_instructors", "read", { fields: "*" });
  await perm(I, "courses_instructors", "update", {
    permissions: { user_id: { _eq: "$CURRENT_USER" } },
    fields: "*",
  });
  await perm(I, "courses_instructors", "delete", {
    permissions: { user_id: { _eq: "$CURRENT_USER" } },
  });

  // Instructor: CRUD own modules/lessons (in own courses)
  for (const col of ["modules"]) {
    await perm(I, col, "create", { fields: "*" });
    await perm(I, col, "update", {
      permissions: { course_id: { instructors: { user_id: { _eq: "$CURRENT_USER" } } } },
      fields: "*",
    });
    await perm(I, col, "delete", {
      permissions: { course_id: { instructors: { user_id: { _eq: "$CURRENT_USER" } } } },
    });
  }

  // Instructor: lessons
  await perm(I, "lessons", "create", { fields: "*" });
  await perm(I, "lessons", "update", {
    permissions: { module_id: { course_id: { instructors: { user_id: { _eq: "$CURRENT_USER" } } } } },
    fields: "*",
  });
  await perm(I, "lessons", "delete", {
    permissions: { module_id: { course_id: { instructors: { user_id: { _eq: "$CURRENT_USER" } } } } },
  });

  // Instructor: CRUD quizzes/questions/answers (in own lessons)
  await perm(I, "quizzes", "create", { fields: "*" });
  await perm(I, "quizzes", "update", {
    permissions: { lesson_id: { module_id: { course_id: { instructors: { user_id: { _eq: "$CURRENT_USER" } } } } } },
    fields: "*",
  });
  await perm(I, "quizzes", "delete", {
    permissions: { lesson_id: { module_id: { course_id: { instructors: { user_id: { _eq: "$CURRENT_USER" } } } } } },
  });

  await perm(I, "quiz_questions", "create", { fields: "*" });
  await perm(I, "quiz_questions", "update", {
    permissions: { quiz_id: { lesson_id: { module_id: { course_id: { instructors: { user_id: { _eq: "$CURRENT_USER" } } } } } } },
    fields: "*",
  });
  await perm(I, "quiz_questions", "delete", {
    permissions: { quiz_id: { lesson_id: { module_id: { course_id: { instructors: { user_id: { _eq: "$CURRENT_USER" } } } } } } },
  });

  await perm(I, "quiz_answers", "create", { fields: "*" });
  await perm(I, "quiz_answers", "update", {
    permissions: { question_id: { quiz_id: { lesson_id: { module_id: { course_id: { instructors: { user_id: { _eq: "$CURRENT_USER" } } } } } } } },
    fields: "*",
  });
  await perm(I, "quiz_answers", "delete", {
    permissions: { question_id: { quiz_id: { lesson_id: { module_id: { course_id: { instructors: { user_id: { _eq: "$CURRENT_USER" } } } } } } } },
  });

  // Instructor: read enrollments, reviews, quiz_attempts for own courses
  await perm(I, "enrollments", "read", {
    permissions: { course_id: { instructors: { user_id: { _eq: "$CURRENT_USER" } } } },
    fields: "*",
  });
  await perm(I, "reviews", "read", { fields: "*" });
  await perm(I, "quiz_attempts", "read", {
    permissions: { quiz_id: { lesson_id: { module_id: { course_id: { instructors: { user_id: { _eq: "$CURRENT_USER" } } } } } } },
    fields: "*",
  });
  await perm(I, "quiz_attempts", "delete", {
    permissions: { quiz_id: { lesson_id: { module_id: { course_id: { instructors: { user_id: { _eq: "$CURRENT_USER" } } } } } } },
  });

  // Instructor: notifications (own)
  await perm(I, "notifications", "read", { permissions: { user_id: { _eq: "$CURRENT_USER" } }, fields: "*" });
  await perm(I, "notifications", "update", { permissions: { user_id: { _eq: "$CURRENT_USER" } }, fields: ["is_read"] });

  // Instructor: files
  await perm(I, "directus_files", "create", { fields: "*" });
  await perm(I, "directus_files", "read", { fields: "*" });

  // Instructor: read roles (for role.name expansion)
  await perm(I, "directus_roles", "read", { fields: ["id", "name"] });

  // Instructor: cart (own)
  await perm(I, "cart_items", "create", { fields: "*", validation: { user_id: { _eq: "$CURRENT_USER" } } });
  await perm(I, "cart_items", "read", { permissions: { user_id: { _eq: "$CURRENT_USER" } }, fields: "*" });
  await perm(I, "cart_items", "delete", { permissions: { user_id: { _eq: "$CURRENT_USER" } } });

  // Instructor: wishlist (own)
  await perm(I, "wishlists", "create", { fields: "*", validation: { user_id: { _eq: "$CURRENT_USER" } } });
  await perm(I, "wishlists", "read", { permissions: { user_id: { _eq: "$CURRENT_USER" } }, fields: "*" });
  await perm(I, "wishlists", "delete", { permissions: { user_id: { _eq: "$CURRENT_USER" } } });

  // Instructor: orders (own)
  await perm(I, "orders", "create", { fields: "*", validation: { user_id: { _eq: "$CURRENT_USER" } } });
  await perm(I, "orders", "read", { permissions: { user_id: { _eq: "$CURRENT_USER" } }, fields: "*" });
  await perm(I, "orders", "update", { permissions: { user_id: { _eq: "$CURRENT_USER" } }, fields: ["status", "paid_at", "payment_ref"] });

  // Instructor: order_items (own orders)
  await perm(I, "order_items", "create", { fields: "*" });
  await perm(I, "order_items", "read", { permissions: { order_id: { user_id: { _eq: "$CURRENT_USER" } } }, fields: "*" });

  log("✓", "Instructor permissions set");
}

// ─── 6. Seed Data ────────────────────────────────────────────────────────────

async function seedData() {
  section("6. Seed Data");

  // ── Users ──
  let instructor, student;

  // Check existing users (query separately to avoid URL encoding issues)
  const allUsers = await get("/users?fields=id,email&limit=-1");
  const users = Array.isArray(allUsers) ? allUsers : [];

  const existingInstructor = users.find((u) => u.email === "instructor@elearning.dev");
  const existingStudent = users.find((u) => u.email === "student@elearning.dev");

  if (existingInstructor) {
    instructor = existingInstructor;
    log("–", `Instructor user exists: ${instructor.id}`);
  } else {
    instructor = await post("/users", {
      email: "instructor@elearning.dev",
      password: "Instructor@123",
      first_name: "Nguyễn",
      last_name: "Văn A",
      role: ROLE_INSTRUCTOR,
      bio: "Giảng viên lập trình với hơn 5 năm kinh nghiệm.",
      headline: "Senior Web Developer",
      phone: "0901234567",
      social_links: { github: "https://github.com/nguyenvana", linkedin: "" },
    });
    log("✓", `Instructor user created: ${instructor.id}`);
  }

  if (existingStudent) {
    student = existingStudent;
    log("–", `Student user exists: ${student.id}`);
  } else {
    student = await post("/users", {
      email: "student@elearning.dev",
      password: "Student@123",
      first_name: "Trần",
      last_name: "Thị B",
      role: ROLE_STUDENT,
      bio: "Sinh viên năm 3 ngành Công nghệ thông tin.",
      headline: "CNTT Student",
      phone: "0912345678",
    });
    log("✓", `Student user created: ${student.id}`);
  }

  // ── Categories ──
  const catData = [
    { name: "Lập trình", slug: "lap-trinh", description: "Các khóa học về lập trình và phát triển phần mềm", icon: "code" },
    { name: "Thiết kế", slug: "thiet-ke", description: "Thiết kế đồ họa, UI/UX, và sáng tạo", icon: "brush" },
    { name: "Kinh doanh", slug: "kinh-doanh", description: "Quản trị kinh doanh và khởi nghiệp", icon: "business" },
    { name: "Ngoại ngữ", slug: "ngoai-ngu", description: "Học ngoại ngữ và giao tiếp", icon: "translate" },
    { name: "Phát triển cá nhân", slug: "phat-trien-ca-nhan", description: "Kỹ năng mềm và phát triển bản thân", icon: "self_improvement" },
  ];

  const categories = [];
  for (const c of catData) {
    try {
      const cat = await post("/items/categories", c);
      categories.push(cat);
    } catch (e) {
      // Try to fetch by slug if already exists
      if (e.message.includes("unique") || e.message.includes("duplicate") || e.message.includes("UNIQUE")) {
        const found = await get(`/items/categories?filter[slug][_eq]=${c.slug}&fields=id,slug`);
        const arr = Array.isArray(found) ? found : [];
        if (arr.length > 0) categories.push(arr[0]);
        log("–", `Category exists: ${c.name}`);
        continue;
      }
      throw e;
    }
    log("✓", `Category: ${c.name}`);
  }

  // ── Courses ──
  let course1, course2;

  try {
    course1 = await post("/items/courses", {
      title: "Lập trình Web với React & Next.js",
      slug: "lap-trinh-web-react-nextjs",
      description: "<p>Khóa học toàn diện về phát triển web hiện đại với React và Next.js. Bạn sẽ học từ cơ bản đến nâng cao, xây dựng ứng dụng thực tế.</p>",
      short_description: "Học React & Next.js từ cơ bản đến nâng cao, xây dựng ứng dụng web thực tế.",
      price: 499000,
      level: "beginner",
      language: "vi",
      status: "published",
      category_id: categories[0]?.id,
      requirements: ["Kiến thức cơ bản về HTML, CSS, JavaScript", "Máy tính có cài Node.js"],
      what_you_learn: ["Hiểu sâu về React hooks và component patterns", "Xây dựng ứng dụng Full-stack với Next.js", "Quản lý state với React Context và Zustand", "Deploy ứng dụng lên Vercel"],
    });
    log("✓", `Course: ${course1.title}`);
  } catch (e) {
    if (e.message.includes("unique") || e.message.includes("duplicate") || e.message.includes("UNIQUE")) {
      const found = await get("/items/courses?filter[slug][_eq]=lap-trinh-web-react-nextjs&fields=id,title");
      const arr = Array.isArray(found) ? found : [];
      if (arr.length > 0) course1 = arr[0];
      log("–", "Course 1 exists");
    } else throw e;
  }

  try {
    course2 = await post("/items/courses", {
      title: "Thiết kế UI/UX cho người mới bắt đầu",
      slug: "thiet-ke-uiux-cho-nguoi-moi",
      description: "<p>Khóa học giúp bạn nắm vững nguyên tắc thiết kế giao diện người dùng và trải nghiệm người dùng.</p>",
      short_description: "Nắm vững nguyên tắc UI/UX design, sử dụng Figma để thiết kế giao diện chuyên nghiệp.",
      price: 399000,
      level: "beginner",
      language: "vi",
      status: "published",
      category_id: categories[1]?.id,
      requirements: ["Không yêu cầu kinh nghiệm trước", "Cài đặt Figma (miễn phí)"],
      what_you_learn: ["Nguyên tắc thiết kế UI/UX cơ bản", "Sử dụng thành thạo Figma", "Thiết kế responsive", "Tạo design system"],
    });
    log("✓", `Course: ${course2.title}`);
  } catch (e) {
    if (e.message.includes("unique") || e.message.includes("duplicate") || e.message.includes("UNIQUE")) {
      const found = await get("/items/courses?filter[slug][_eq]=thiet-ke-uiux-cho-nguoi-moi&fields=id,title");
      const arr = Array.isArray(found) ? found : [];
      if (arr.length > 0) course2 = arr[0];
      log("–", "Course 2 exists");
    } else throw e;
  }

  // ── Link instructors to courses ──
  if (course1) {
    try {
      await post("/items/courses_instructors", { course_id: course1.id, user_id: instructor.id });
      log("✓", "Linked instructor → Course 1");
    } catch { log("–", "Instructor ↔ Course 1 link exists"); }
  }
  if (course2) {
    try {
      await post("/items/courses_instructors", { course_id: course2.id, user_id: instructor.id });
      log("✓", "Linked instructor → Course 2");
    } catch { log("–", "Instructor ↔ Course 2 link exists"); }
  }

  // ── Modules & Lessons for Course 1 ──
  if (course1) {
    const mod1 = await safeCreate("modules", {
      title: "Giới thiệu React",
      sort: 1,
      course_id: course1.id,
    });
    const mod2 = await safeCreate("modules", {
      title: "Next.js Fundamentals",
      sort: 2,
      course_id: course1.id,
    });

    if (mod1) {
      await safeCreate("lessons", { title: "React là gì?", slug: "react-la-gi", sort: 1, type: "video", video_url: "https://example.com/react-intro", duration: 600, is_free: true, status: "published", module_id: mod1.id });
      await safeCreate("lessons", { title: "JSX và Components", slug: "jsx-va-components", sort: 2, type: "video", video_url: "https://example.com/jsx-components", duration: 900, is_free: false, status: "published", module_id: mod1.id });
      await safeCreate("lessons", { title: "Props và State", slug: "props-va-state", sort: 3, type: "text", content: "<h2>Props</h2><p>Props là dữ liệu truyền từ component cha sang component con...</p><h2>State</h2><p>State là dữ liệu nội bộ của component...</p>", duration: 0, is_free: false, status: "published", module_id: mod1.id });
    }
    if (mod2) {
      await safeCreate("lessons", { title: "Cài đặt Next.js", slug: "cai-dat-nextjs", sort: 1, type: "video", video_url: "https://example.com/nextjs-setup", duration: 480, is_free: true, status: "published", module_id: mod2.id });
      await safeCreate("lessons", { title: "App Router", slug: "app-router", sort: 2, type: "video", video_url: "https://example.com/app-router", duration: 1200, is_free: false, status: "published", module_id: mod2.id });
    }

    log("✓", "Modules & Lessons for Course 1");
  }

  // ── Modules & Lessons for Course 2 ──
  if (course2) {
    const mod3 = await safeCreate("modules", {
      title: "Nguyên tắc UI/UX",
      sort: 1,
      course_id: course2.id,
    });
    const mod4 = await safeCreate("modules", {
      title: "Thực hành Figma",
      sort: 2,
      course_id: course2.id,
    });

    if (mod3) {
      await safeCreate("lessons", { title: "UI vs UX — Sự khác biệt", slug: "ui-vs-ux-su-khac-biet", sort: 1, type: "text", content: "<p>UI (User Interface) là giao diện người dùng...</p><p>UX (User Experience) là trải nghiệm người dùng...</p>", duration: 0, is_free: true, status: "published", module_id: mod3.id });
      await safeCreate("lessons", { title: "Nguyên tắc thiết kế cơ bản", slug: "nguyen-tac-thiet-ke-co-ban", sort: 2, type: "video", video_url: "https://example.com/design-principles", duration: 720, is_free: false, status: "published", module_id: mod3.id });
    }
    if (mod4) {
      await safeCreate("lessons", { title: "Làm quen với Figma", slug: "lam-quen-voi-figma", sort: 1, type: "video", video_url: "https://example.com/figma-intro", duration: 600, is_free: true, status: "published", module_id: mod4.id });
      await safeCreate("lessons", { title: "Thiết kế wireframe", slug: "thiet-ke-wireframe", sort: 2, type: "video", video_url: "https://example.com/wireframe", duration: 900, is_free: false, status: "published", module_id: mod4.id });
    }

    log("✓", "Modules & Lessons for Course 2");
  }

  // ── Enrollment ──
  if (course1 && student) {
    try {
      await post("/items/enrollments", { user_id: student.id, course_id: course1.id, status: "active", enrolled_at: new Date().toISOString() });
      log("✓", "Student enrolled in Course 1");
    } catch { log("–", "Enrollment exists"); }
  }

  // ── Review ──
  if (course1 && student) {
    try {
      await post("/items/reviews", { user_id: student.id, course_id: course1.id, rating: 5, comment: "Khóa học rất hay và dễ hiểu. Giảng viên giải thích rõ ràng!", status: "approved" });
      log("✓", "Student review for Course 1");
    } catch { log("–", "Review exists"); }
  }
}

async function safeCreate(collection, data) {
  try {
    return await post(`/items/${collection}`, data);
  } catch {
    return null;
  }
}

// ─── 7. Static Token ─────────────────────────────────────────────────────────

async function setupStaticToken({ writeFile } = {}) {
  section("7. Static Token");

  // Generate random token
  const { randomBytes } = await import("crypto");
  const token = randomBytes(32).toString("base64url"); // ~43 chars, URL-safe

  // Set token on admin user via Directus API
  await api("PATCH", "/users/me", { token });
  log("✓", `Static token: ${token}`);

  if (!writeFile) {
    return token;
  }

  const frontendEnvPath = resolve(__dirname, "..", "..", "frontend", ".env.local");

  // Read existing .env.local or create new
  let envContent = "";
  try {
    envContent = readFileSync(frontendEnvPath, "utf-8");
  } catch {
    // File doesn't exist — will create
  }

  // Update or append DIRECTUS_STATIC_TOKEN
  if (envContent.includes("DIRECTUS_STATIC_TOKEN=")) {
    envContent = envContent.replace(
      /DIRECTUS_STATIC_TOKEN=.*/,
      `DIRECTUS_STATIC_TOKEN=${token}`
    );
  } else {
    envContent += `${envContent.endsWith("\n") ? "" : "\n"}DIRECTUS_STATIC_TOKEN=${token}\n`;
  }

  // Ensure other required env vars exist
  if (!envContent.includes("NEXT_PUBLIC_DIRECTUS_URL=")) {
    envContent = `NEXT_PUBLIC_DIRECTUS_URL=http://localhost:8055\n${envContent}`;
  }
  if (!envContent.includes("NEXT_PUBLIC_APP_NAME=")) {
    envContent += `NEXT_PUBLIC_APP_NAME=E-Learning Platform\n`;
  }
  if (!envContent.includes("NEXT_PUBLIC_APP_URL=")) {
    envContent += `NEXT_PUBLIC_APP_URL=http://localhost:3000\n`;
  }

  writeFileSync(frontendEnvPath, envContent, "utf-8");
  log("✓", `Wrote token to frontend/.env.local`);

  return token;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║       E-Learning Platform — Directus Bootstrap         ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  // Wait for Directus to be ready
  console.log("\n  Checking Directus health...");
  for (let i = 0; i < 30; i++) {
    try {
      const health = await fetch(`${BASE_URL}/server/health`);
      if (health.ok) {
        log("✓", "Directus is ready");
        break;
      }
    } catch {
      // not ready yet
    }
    if (i === 29) {
      console.error("\n  ✗ Directus is not responding at " + BASE_URL);
      console.error("    Make sure Docker is running: cd backend && docker compose up -d\n");
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, 2000));
    process.stdout.write(".");
  }

  await authenticate();
  await addUserFields();
  await createRoles();
  await createCollections();
  await setPermissions();
  await seedData();
  const staticToken = await setupStaticToken({ writeFile: WRITE_STATIC_TOKEN_FILE });

  printSummary({ staticToken, wroteEnvFile: WRITE_STATIC_TOKEN_FILE });
}

main().catch((err) => {
  console.error("\n  ✗ Bootstrap failed:", err.message);
  process.exit(1);
});
