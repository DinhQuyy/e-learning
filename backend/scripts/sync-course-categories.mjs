#!/usr/bin/env node

/**
 * Sync course category taxonomy (parent/child) to Directus.
 *
 * Usage:
 *   node backend/scripts/sync-course-categories.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env");

function loadEnv(path) {
  const content = readFileSync(path, "utf-8");
  const result = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const idx = trimmed.indexOf("=");
    if (idx < 0) continue;

    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    result[key] = value;
  }

  return result;
}

const env = loadEnv(envPath);
const BASE_URL = env.DIRECTUS_URL || "http://localhost:8055";
const ADMIN_EMAIL = env.ADMIN_EMAIL || "admin@elearning.dev";
const ADMIN_PASSWORD = env.ADMIN_PASSWORD || "Admin@123456";

let token = "";

const CATEGORY_TREE = [
  {
    name: "Kinh doanh",
    slug: "kinh-doanh",
    icon: "business",
    description: "Kiến thức và kỹ năng vận hành, tăng trưởng doanh nghiệp.",
    children: [
      {
        name: "Tinh thần khởi nghiệp",
        slug: "kinh-doanh-tinh-than-khoi-nghiep",
        icon: "rocket_launch",
        description: "Tư duy và năng lực xây dựng hành trình khởi nghiệp.",
      },
      {
        name: "Giao tiếp",
        slug: "kinh-doanh-giao-tiep",
        icon: "record_voice_over",
        description: "Kỹ năng giao tiếp chuyên nghiệp trong môi trường kinh doanh.",
      },
      {
        name: "Quản lý",
        slug: "kinh-doanh-quan-ly",
        icon: "manage_accounts",
        description: "Kỹ năng quản lý đội nhóm, quy trình và hiệu suất.",
      },
      {
        name: "Bán hàng",
        slug: "kinh-doanh-ban-hang",
        icon: "point_of_sale",
        description: "Kỹ thuật bán hàng từ cơ bản đến thực chiến.",
      },
      {
        name: "Chiến lược kinh doanh",
        slug: "kinh-doanh-chien-luoc",
        icon: "insights",
        description: "Xây dựng chiến lược cạnh tranh và tăng trưởng dài hạn.",
      },
    ],
  },
  {
    name: "Lập trình",
    slug: "lap-trinh",
    icon: "code",
    description: "Phát triển phần mềm, ứng dụng và hệ thống hiện đại.",
    children: [
      {
        name: "Phát triển web",
        slug: "lap-trinh-phat-trien-web",
        icon: "language",
        description: "Xây dựng website và ứng dụng web full-stack.",
      },
      {
        name: "Phát triển ứng dụng di động",
        slug: "lap-trinh-phat-trien-di-dong",
        icon: "smartphone",
        description: "Phát triển ứng dụng Android/iOS đa nền tảng.",
      },
      {
        name: "Ngôn ngữ lập trình",
        slug: "lap-trinh-ngon-ngu-lap-trinh",
        icon: "terminal",
        description: "Học và ứng dụng các ngôn ngữ lập trình phổ biến.",
      },
      {
        name: "Phát triển trò chơi",
        slug: "lap-trinh-phat-trien-tro-choi",
        icon: "sports_esports",
        description: "Thiết kế và phát triển game từ ý tưởng đến triển khai.",
      },
      {
        name: "Kiểm tra phần mềm",
        slug: "lap-trinh-kiem-thu-phan-mem",
        icon: "bug_report",
        description: "Manual testing, automation testing và đảm bảo chất lượng.",
      },
    ],
  },
  {
    name: "Ngoại ngữ",
    slug: "ngoai-ngu",
    icon: "translate",
    description: "Nâng cao năng lực ngôn ngữ cho học tập và công việc.",
    children: [
      {
        name: "Tiếng Anh giao tiếp",
        slug: "ngoai-ngu-tieng-anh-giao-tiep",
        icon: "chat",
        description: "Luyện phản xạ và giao tiếp tiếng Anh trong đời sống.",
      },
      {
        name: "Tiếng Anh học thuật (IELTS/TOEIC)",
        slug: "ngoai-ngu-ielts-toeic",
        icon: "school",
        description: "Chiến lược học và luyện đề cho IELTS, TOEIC hiệu quả.",
      },
      {
        name: "Tiếng Trung",
        slug: "ngoai-ngu-tieng-trung",
        icon: "menu_book",
        description: "Từ vựng, ngữ pháp và giao tiếp tiếng Trung thực tế.",
      },
      {
        name: "Tiếng Nhật",
        slug: "ngoai-ngu-tieng-nhat",
        icon: "menu_book",
        description: "Lộ trình học tiếng Nhật từ cơ bản đến trung cấp.",
      },
      {
        name: "Tiếng Hàn",
        slug: "ngoai-ngu-tieng-han",
        icon: "menu_book",
        description: "Học tiếng Hàn phục vụ du học, công việc và giao tiếp.",
      },
    ],
  },
  {
    name: "Phát triển bản thân",
    slug: "phat-trien-ca-nhan",
    icon: "self_improvement",
    description: "Rèn luyện tư duy, kỹ năng và hiệu suất cá nhân.",
    children: [
      {
        name: "Quản lý thời gian",
        slug: "phat-trien-ban-than-quan-ly-thoi-gian",
        icon: "schedule",
        description: "Phương pháp lập kế hoạch và tối ưu thời gian hiệu quả.",
      },
      {
        name: "Kỹ năng thuyết trình",
        slug: "phat-trien-ban-than-thuyet-trinh",
        icon: "campaign",
        description: "Xây dựng bài nói thuyết phục và trình bày tự tin.",
      },
      {
        name: "Tư duy phản biện",
        slug: "phat-trien-ban-than-tu-duy-phan-bien",
        icon: "psychology",
        description: "Phân tích vấn đề logic và ra quyết định có cơ sở.",
      },
      {
        name: "Quản lý cảm xúc",
        slug: "phat-trien-ban-than-quan-ly-cam-xuc",
        icon: "favorite",
        description: "Nhận diện và điều tiết cảm xúc trong học tập, công việc.",
      },
      {
        name: "Năng suất cá nhân",
        slug: "phat-trien-ban-than-nang-suat-ca-nhan",
        icon: "bolt",
        description: "Thiết kế hệ thống làm việc bền vững, duy trì hiệu quả cao.",
      },
    ],
  },
  {
    name: "Thiết kế",
    slug: "thiet-ke",
    icon: "brush",
    description: "Kỹ năng thiết kế sáng tạo cho sản phẩm số và truyền thông.",
    children: [
      {
        name: "Thiết kế đồ họa",
        slug: "thiet-ke-do-hoa",
        icon: "palette",
        description: "Nguyên lý thị giác, bố cục và công cụ thiết kế đồ họa.",
      },
      {
        name: "Thiết kế UI/UX",
        slug: "thiet-ke-ui-ux",
        icon: "web",
        description: "Thiết kế giao diện và trải nghiệm người dùng hiện đại.",
      },
      {
        name: "Thiết kế 3D",
        slug: "thiet-ke-3d",
        icon: "view_in_ar",
        description: "Dựng hình, ánh sáng và kết xuất sản phẩm 3D.",
      },
      {
        name: "Motion Graphics",
        slug: "thiet-ke-motion-graphics",
        icon: "movie",
        description: "Thiết kế đồ họa chuyển động cho video và quảng cáo.",
      },
      {
        name: "Chỉnh sửa video",
        slug: "thiet-ke-chinh-sua-video",
        icon: "video_camera_back",
        description: "Biên tập video chuyên nghiệp cho nội dung số.",
      },
    ],
  },
];

async function api(method, path, body = null) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }

  if (!response.ok) {
    throw new Error(
      `${method} ${path} -> ${response.status}: ${JSON.stringify(payload)}`
    );
  }

  return payload?.data ?? payload;
}

const get = (path) => api("GET", path);
const post = (path, body) => api("POST", path, body);
const patch = (path, body) => api("PATCH", path, body);

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function extractId(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "id" in value) return value.id ?? null;
  return null;
}

function print(message) {
  process.stdout.write(`${message}\n`);
}

async function waitForDirectus(maxTries = 30) {
  for (let i = 0; i < maxTries; i += 1) {
    try {
      const health = await fetch(`${BASE_URL}/server/health`);
      if (health.ok) return true;
    } catch {
      // service is not ready
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1000));
  }
  return false;
}

async function upsertCategory({
  existingBySlug,
  name,
  slug,
  description,
  icon,
  parentId,
  sort,
}) {
  const payload = {
    name,
    slug,
    description: description ?? null,
    icon: icon ?? null,
    parent_id: parentId ?? null,
    status: "published",
    sort,
  };

  const existing = existingBySlug.get(slug);
  if (!existing?.id) {
    const created = await post("/items/categories", payload);
    existingBySlug.set(slug, created);
    print(`+ Created category: ${name}`);
    return created;
  }

  const existingParentId = extractId(existing.parent_id);
  const hasChanges =
    existing.name !== payload.name ||
    existing.description !== payload.description ||
    existing.icon !== payload.icon ||
    existing.status !== payload.status ||
    Number(existing.sort ?? 0) !== Number(payload.sort) ||
    (existingParentId ?? null) !== (payload.parent_id ?? null);

  if (hasChanges) {
    const updated = await patch(`/items/categories/${existing.id}`, payload);
    const updatedRecord = { ...existing, ...updated };
    existingBySlug.set(slug, updatedRecord);
    print(`~ Updated category: ${name}`);
    return updatedRecord;
  }

  print(`= Unchanged category: ${name}`);
  return existing;
}

async function main() {
  print("Checking Directus health...");
  const healthy = await waitForDirectus();
  if (!healthy) {
    throw new Error(`Directus is not reachable at ${BASE_URL}`);
  }

  print(`Authenticating as ${ADMIN_EMAIL}...`);
  const login = await post("/auth/login", {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  token = login?.access_token;
  if (!token) {
    throw new Error("Authentication failed: missing access token");
  }

  const existingRows = toArray(
    await get("/items/categories?limit=-1&fields=id,name,slug,description,icon,parent_id,sort,status")
  );

  const existingBySlug = new Map();
  for (const row of existingRows) {
    if (typeof row?.slug === "string" && row.slug.trim()) {
      existingBySlug.set(row.slug, row);
    }
  }

  let parentSort = 1;
  for (const parent of CATEGORY_TREE) {
    const parentRow = await upsertCategory({
      existingBySlug,
      name: parent.name,
      slug: parent.slug,
      description: parent.description,
      icon: parent.icon,
      parentId: null,
      sort: parentSort * 100,
    });

    const parentId = parentRow?.id;
    let childSort = 1;
    for (const child of parent.children) {
      await upsertCategory({
        existingBySlug,
        name: child.name,
        slug: child.slug,
        description: child.description,
        icon: child.icon,
        parentId,
        sort: parentSort * 100 + childSort,
      });
      childSort += 1;
    }

    parentSort += 1;
  }

  print("");
  print("Category taxonomy sync completed.");
}

main().catch((error) => {
  console.error(`Sync failed: ${error.message}`);
  process.exit(1);
});

