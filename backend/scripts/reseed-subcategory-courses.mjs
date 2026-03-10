#!/usr/bin/env node

/**
 * Reseed courses into child categories only.
 *
 * Behavior:
 * - Archive existing courses in both parent and child categories.
 * - Create fresh published courses in each child category.
 * - Default: 10 courses per child category.
 *
 * Usage:
 *   node backend/scripts/reseed-subcategory-courses.mjs
 *   node backend/scripts/reseed-subcategory-courses.mjs --per-child=10
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

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function extractId(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object" && "id" in value) {
    const id = value.id;
    if (typeof id === "string") return id;
    if (typeof id === "number") return String(id);
  }
  return null;
}

function normalizeSlug(value) {
  const base = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || "course";
}

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

function nowTag() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${day}${hh}${mm}${ss}`;
}

function pickInstructor(users) {
  const list = toArray(users);
  const preferred = list.find((u) => u?.email === "instructor@elearning.dev");
  if (preferred?.id) return preferred;

  const approved = list.find((u) => u?.instructor_state === "APPROVED");
  if (approved?.id) return approved;

  const fallback = list.find((u) => Boolean(u?.id));
  return fallback ?? null;
}

const env = loadEnv(envPath);
const BASE_URL = env.DIRECTUS_URL || "http://localhost:8055";
const ADMIN_EMAIL = env.ADMIN_EMAIL || "admin@elearning.dev";
const ADMIN_PASSWORD = env.ADMIN_PASSWORD || "Admin@123456";

const cliPerChild = Number(getArgValue("per-child"));
const envPerChild = Number(env.SEED_COURSES_PER_SUBCATEGORY);
const TARGET_PER_CHILD =
  Number.isFinite(cliPerChild) && cliPerChild > 0
    ? Math.floor(cliPerChild)
    : Number.isFinite(envPerChild) && envPerChild > 0
      ? Math.floor(envPerChild)
      : 10;

let token = "";

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
    throw new Error(`${method} ${path} -> ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload?.data ?? payload;
}

const get = (path) => api("GET", path);
const post = (path, body) => api("POST", path, body);
const patch = (path, body) => api("PATCH", path, body);

function log(message) {
  process.stdout.write(`${message}\n`);
}

async function waitForDirectus(maxRetries = 45) {
  for (let i = 0; i < maxRetries; i += 1) {
    try {
      const health = await fetch(`${BASE_URL}/server/health`);
      if (health.ok) return true;
    } catch {
      // not ready yet
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1000));
  }
  return false;
}

const TITLE_FRAMES = [
  "Lộ Trình Toàn Diện {topic} 2026",
  "{topic}: Từ Cơ Bản Đến Nâng Cao",
  "{topic} Thực Chiến Qua Dự Án Thực Tế",
  "{topic}: Từ Số 0 Đến Sẵn Sàng Đi Làm",
  "Bộ Công Cụ Và Quy Trình Chuyên Nghiệp {topic}",
  "{topic} Cấp Tốc: Xây Dựng, Ra Mắt, Tối Ưu",
  "{topic} Cho Đội Nhóm Và Làm Việc Tự Do",
  "{topic} Nâng Cao: Chiến Lược Và Tình Huống Thực Tế",
  "Lộ Trình Nghề Nghiệp {topic}: Hồ Sơ Dự Án Và Triển Khai",
  "{topic} 30 Ngày: Kế Hoạch Thực Hành",
];

const SUBCATEGORY_TOPICS = {
  "kinh-doanh-tinh-than-khoi-nghiep": [
    "Khởi nghiệp tinh gọn",
    "Kiểm chứng MVP",
    "Tư duy nhà sáng lập",
    "Kiểm định ý tưởng kinh doanh",
    "Nền tảng tài chính startup",
    "Thiết kế pitch deck",
    "Nền tảng Go-to-Market",
    "Xây dựng đội ngũ startup",
    "Tăng trưởng giai đoạn sớm",
    "Sẵn sàng gọi vốn",
  ],
  "kinh-doanh-giao-tiep": [
    "Giao tiếp trong kinh doanh",
    "Kể chuyện trong công việc",
    "Viết email chuyên nghiệp",
    "Đàm phán căn bản",
    "Truyền thông với stakeholder",
    "Kỹ năng xử lý xung đột",
    "Giao tiếp với khách hàng",
    "Giao tiếp liên phòng ban",
    "Phản hồi và huấn luyện",
    "Giao tiếp thuyết trình",
  ],
  "kinh-doanh-quan-ly": [
    "Quản lý đội nhóm",
    "Triển khai KPI và OKR",
    "Huấn luyện hiệu suất",
    "Lãnh đạo dự án",
    "Quản lý vận hành",
    "Ra quyết định cho quản lý",
    "Quản trị nhân sự nền tảng",
    "Cải tiến quy trình",
    "Quản lý rủi ro và leo thang",
    "Giao tiếp lãnh đạo",
  ],
  "kinh-doanh-ban-hang": [
    "Bán hàng tư vấn",
    "Quy trình bán hàng B2B",
    "Tăng chuyển đổi bán hàng B2C",
    "Tìm kiếm khách hàng tiềm năng",
    "Làm chủ cuộc gọi bán hàng",
    "Xử lý từ chối",
    "Kỹ thuật chốt đơn",
    "Quy trình CRM cho sales",
    "Chiến lược tăng trưởng tài khoản",
    "Chỉ số và dự báo doanh số",
  ],
  "kinh-doanh-chien-luoc": [
    "Nền tảng chiến lược kinh doanh",
    "Phân tích cạnh tranh",
    "Định vị thị trường",
    "Lập kế hoạch chiến lược",
    "Thiết kế chiến lược tăng trưởng",
    "Chiến lược định giá",
    "Chiến lược sản phẩm",
    "Lộ trình triển khai",
    "Hoạch định rủi ro chiến lược",
    "Đổi mới mô hình kinh doanh",
  ],
  "lap-trinh-phat-trien-web": [
    "Phát triển web full-stack",
    "React và Next.js thực chiến",
    "Node.js và Express",
    "TypeScript cho ứng dụng web",
    "Kỹ thuật xây dựng REST API",
    "Thiết kế cơ sở dữ liệu cho web",
    "Xác thực và bảo mật web",
    "Kiểm thử web và QA",
    "Tối ưu hiệu năng web",
    "Triển khai web lên cloud",
  ],
  "lap-trinh-phat-trien-di-dong": [
    "Phát triển ứng dụng Flutter",
    "Phát triển ứng dụng React Native",
    "Kotlin cho Android",
    "Swift cho iOS",
    "Kỹ thuật UI mobile",
    "Quản lý state cho mobile",
    "Firebase cho ứng dụng di động",
    "Kiểm thử ứng dụng mobile",
    "Đưa ứng dụng lên App Store/CH Play",
    "Clean Architecture cho mobile",
  ],
  "lap-trinh-ngon-ngu-lap-trinh": [
    "Lập trình Python",
    "Lập trình Java",
    "Lập trình C#",
    "Lập trình JavaScript",
    "Lập trình TypeScript",
    "Lập trình Go",
    "Lập trình Rust",
    "Nền tảng C và C++",
    "Lập trình PHP",
    "Lập trình SQL căn bản",
  ],
  "lap-trinh-phat-trien-tro-choi": [
    "Phát triển game 2D với Unity",
    "Phát triển game 3D với Unity",
    "Nền tảng Unreal Engine",
    "C# cho phát triển game",
    "Thiết kế hệ thống gameplay",
    "Cơ bản về AI trong game",
    "Vật lý và cơ chế game",
    "Quy trình thiết kế màn chơi",
    "Thiết kế UI/UX cho game",
    "Kiếm tiền từ game mobile",
  ],
  "lap-trinh-kiem-thu-phan-mem": [
    "Kiểm thử phần mềm thủ công",
    "Kiểm thử API với Postman",
    "Tự động hóa kiểm thử với Selenium",
    "Kiểm thử E2E với Cypress",
    "Kiểm thử với Playwright",
    "Luyện thi ISTQB Foundation",
    "Quản lý test với Jira",
    "Kiểm thử hiệu năng bằng JMeter",
    "Kiểm thử ứng dụng di động",
    "Viết test case và báo lỗi",
  ],
  "ngoai-ngu-tieng-anh-giao-tiep": [
    "Giao tiếp tiếng Anh hằng ngày",
    "Phát âm tiếng Anh chuẩn",
    "Luyện nghe nói tiếng Anh",
    "Tiếng Anh giao tiếp nơi công sở",
    "Tiếng Anh du lịch",
    "Tự tin hội thoại tiếng Anh",
    "Từ vựng tiếng Anh theo ngữ cảnh",
    "Kỹ năng nói chuyện xã giao bằng tiếng Anh",
    "Tiếng Anh cho họp hành",
    "Luyện phản xạ tiếng Anh",
  ],
  "ngoai-ngu-ielts-toeic": [
    "Luyện nói IELTS",
    "Nâng band viết IELTS",
    "Chiến lược nghe IELTS",
    "Kỹ thuật đọc IELTS",
    "Luyện nghe đọc TOEIC",
    "Luyện nói viết TOEIC",
    "Từ vựng và ngữ pháp IELTS",
    "Mẹo làm bài TOEIC",
    "Làm đề thi thử IELTS",
    "Chiến lược phòng thi IELTS/TOEIC",
  ],
  "ngoai-ngu-tieng-trung": [
    "Phát âm tiếng Trung và Pinyin",
    "Hội thoại tiếng Trung hằng ngày",
    "Tăng vốn từ HSK",
    "Ngữ pháp tiếng Trung căn bản",
    "Luyện nghe tiếng Trung",
    "Tiếng Trung thương mại cơ bản",
    "Kỹ năng đọc tiếng Trung",
    "Viết chữ Hán",
    "Tự tin nói tiếng Trung",
    "Luyện đề HSK",
  ],
  "ngoai-ngu-tieng-nhat": [
    "Tiếng Nhật cho người mới",
    "Luyện thi JLPT N5",
    "Luyện thi JLPT N4",
    "Ngữ pháp tiếng Nhật căn bản",
    "Luyện nói tiếng Nhật",
    "Luyện nghe tiếng Nhật",
    "Tăng vốn từ tiếng Nhật",
    "Tiếng Nhật thương mại cơ bản",
    "Luyện đọc tiếng Nhật",
    "Viết Kana và Kanji",
  ],
  "ngoai-ngu-tieng-han": [
    "Tiếng Hàn cho người mới",
    "Luyện thi TOPIK I",
    "Ngữ pháp tiếng Hàn thiết yếu",
    "Luyện nói tiếng Hàn",
    "Luyện nghe tiếng Hàn",
    "Mở rộng từ vựng tiếng Hàn",
    "Đọc và viết tiếng Hàn",
    "Tiếng Hàn thương mại cơ bản",
    "Luyện phát âm tiếng Hàn",
    "Chiến lược thi TOPIK",
  ],
  "phat-trien-ban-than-quan-ly-thoi-gian": [
    "Nền tảng quản lý thời gian",
    "Hệ thống lập kế hoạch tuần",
    "Deep Work và tập trung",
    "Quản lý ưu tiên công việc",
    "Lập kế hoạch và theo dõi mục tiêu",
    "Thiết kế thói quen năng suất",
    "Tối ưu quy trình làm việc cá nhân",
    "Làm chủ lịch và công việc",
    "Đánh bại trì hoãn",
    "Kỷ luật thực thi",
  ],
  "phat-trien-ban-than-thuyet-trinh": [
    "Nền tảng thuyết trình trước công chúng",
    "Thiết kế bài thuyết trình doanh nghiệp",
    "Kể chuyện cho người thuyết trình",
    "Truyền đạt bằng slide hiệu quả",
    "Rèn sự tự tin khi đứng sân khấu",
    "Kỹ năng giọng nói và trình bày",
    "Nói thuyết phục",
    "Xử lý phần hỏi đáp",
    "Kỹ năng pitch",
    "Thuyết trình cho lãnh đạo",
  ],
  "phat-trien-ban-than-tu-duy-phan-bien": [
    "Nền tảng tư duy phản biện",
    "Kỹ năng lập luận logic",
    "Khung ra quyết định",
    "Tư duy giải quyết vấn đề",
    "Phân tích lập luận",
    "Tư duy dựa trên dữ liệu",
    "Nhận diện thiên kiến nhận thức",
    "Tư duy có cấu trúc trong công việc",
    "Nền tảng tư duy chiến lược",
    "Giao tiếp dựa trên bằng chứng",
  ],
  "phat-trien-ban-than-quan-ly-cam-xuc": [
    "Nền tảng trí tuệ cảm xúc",
    "Quản lý căng thẳng trong công việc",
    "Phát triển tự nhận thức",
    "Khả năng phục hồi tinh thần",
    "Kỹ thuật điều tiết cảm xúc",
    "Chánh niệm cho người đi làm",
    "Quản lý cảm xúc khi xung đột",
    "Thiết lập ranh giới lành mạnh",
    "Kỹ năng đồng cảm và xây dựng quan hệ",
    "Giao tiếp bình tĩnh",
  ],
  "phat-trien-ban-than-nang-suat-ca-nhan": [
    "Hệ thống năng suất cá nhân",
    "Thói quen hiệu suất cao",
    "Quản lý tập trung và năng lượng",
    "Thực thi và trách nhiệm cá nhân",
    "Lập kế hoạch công việc để đạt kết quả",
    "Quy trình dùng công cụ năng suất",
    "Khung chinh phục mục tiêu",
    "Nâng cấp hiệu suất làm việc cá nhân",
    "Duy trì phong độ bền vững",
    "Tối ưu sản lượng công việc",
  ],
  "thiet-ke-do-hoa": [
    "Nền tảng thiết kế đồ họa",
    "Photoshop cho nhà thiết kế",
    "Illustrator cho nhận diện thương hiệu",
    "Quy trình thiết kế với Canva",
    "Typography và bố cục",
    "Lý thuyết màu sắc trong thiết kế",
    "Thiết kế bộ nhận diện thương hiệu",
    "Thiết kế nội dung mạng xã hội",
    "Thiết kế ấn phẩm in",
    "Xây dựng portfolio thiết kế đồ họa",
  ],
  "thiet-ke-ui-ux": [
    "Nền tảng thiết kế UI/UX",
    "Figma cho thiết kế giao diện",
    "Nghiên cứu người dùng",
    "Wireframe và prototype",
    "Cơ bản về design system",
    "UX writing và microcopy",
    "Thiết kế tương tác",
    "Thiết kế UX cho ứng dụng di động",
    "Thiết kế UX cho website",
    "Xây dựng portfolio UI/UX",
  ],
  "thiet-ke-3d": [
    "Nền tảng mô hình hóa 3D",
    "Blender cho người mới bắt đầu",
    "Texturing và vật liệu",
    "Kỹ thuật ánh sáng 3D",
    "Quy trình render 3D",
    "Diễn họa sản phẩm 3D",
    "Mô hình hóa nhân vật cơ bản",
    "Bố cục cảnh 3D",
    "Hoạt hình 3D cơ bản",
    "Dự án portfolio 3D",
  ],
  "thiet-ke-motion-graphics": [
    "Nền tảng motion graphics",
    "After Effects từ cơ bản đến nâng cao",
    "Thiết kế kinetic typography",
    "Quy trình animation 2D",
    "Motion design cho quảng cáo",
    "Kỹ thuật animate logo",
    "Lập storyboard cho motion",
    "Cơ bản về hiệu ứng hình ảnh",
    "Nội dung motion cho mạng xã hội",
    "Portfolio motion graphics",
  ],
  "thiet-ke-chinh-sua-video": [
    "Nền tảng chỉnh sửa video",
    "Premiere Pro từ cơ bản đến nâng cao",
    "Quy trình dựng phim với DaVinci Resolve",
    "Color grading cơ bản",
    "Chỉnh sửa âm thanh cho video",
    "Dựng video YouTube",
    "Sản xuất video ngắn",
    "Kỹ thuật dựng phim điện ảnh",
    "Kể chuyện bằng dựng phim",
    "Portfolio chỉnh sửa video",
  ],
};

function buildCoursePayload({
  category,
  categoryIndex,
  sequence,
  topic,
  slugSet,
}) {
  const frame = TITLE_FRAMES[(sequence - 1) % TITLE_FRAMES.length];
  const title = frame.replace("{topic}", topic);
  const baseSlug = `${normalizeSlug(category.slug)}-${normalizeSlug(topic)}-${String(sequence).padStart(2, "0")}`;
  const slug = buildUniqueSlug(baseSlug, slugSet);

  const levelCycle = ["beginner", "beginner", "intermediate", "intermediate", "advanced"];
  const level = levelCycle[(sequence - 1) % levelCycle.length];

  const pricingPlans = [
    { price: 399000, discount: 149000 },
    { price: 599000, discount: 199000 },
    { price: 899000, discount: 299000 },
    { price: 1199000, discount: 399000 },
    { price: 0, discount: null },
  ];
  const plan = pricingPlans[(sequence + categoryIndex) % pricingPlans.length];

  const totalLessons = 20 + ((sequence + categoryIndex) % 7) * 4;
  const lessonMinutes = 18 + ((sequence + categoryIndex) % 5) * 4;
  const totalDuration = totalLessons * lessonMinutes * 60;

  const avgRating = (4.2 + ((sequence + categoryIndex) % 6) * 0.12).toFixed(2);
  const totalEnrollments = 120 + (sequence * 83) + (categoryIndex * 47);

  return {
    title,
    slug,
    description: `<p>Lộ trình học lấy cảm hứng từ các khóa thực chiến, tập trung vào <strong>${topic}</strong> với quy trình rõ ràng, dự án có hướng dẫn và checklist triển khai.</p><p>Bạn sẽ học theo từng bước với tình huống thực tế và tạo ra sản phẩm có thể đưa vào portfolio.</p>`,
    short_description: `Khóa học ${topic} thực hành chuyên sâu, bám sát dự án thực tế và mục tiêu nghề nghiệp.`,
    price: plan.price,
    discount_price: plan.discount,
    level,
    language: "vi",
    status: "published",
    category_id: category.id,
    requirements: [
      "Có máy tính cá nhân và kết nối internet ổn định",
      "Kỹ năng tin học cơ bản",
      "Cam kết học và thực hành 3-5 giờ mỗi tuần",
    ],
    what_you_learn: [
      `Làm chủ quy trình thực hành trong ${topic}`,
      "Xây dựng sản phẩm hoàn chỉnh thông qua các dự án có hướng dẫn",
      "Áp dụng các thực hành tốt đang dùng trong đội nhóm thực tế và công việc tự do",
    ],
    target_audience: [
      "Người mới cần lộ trình học bài bản, dễ theo dõi",
      "Người chuyển ngành muốn tích lũy kỹ năng thực chiến",
      "Người đi làm cần cập nhật quy trình và công cụ hiện đại",
    ],
    total_lessons: totalLessons,
    total_duration: totalDuration,
    total_enrollments: totalEnrollments,
    average_rating: Number(avgRating),
    is_featured: sequence <= 2,
  };
}

async function archiveCourses(courses, slugSet) {
  if (courses.length === 0) return 0;

  const suffix = nowTag();
  let archived = 0;

  for (let i = 0; i < courses.length; i += 1) {
    const course = courses[i];
    const currentSlug = normalizeSlug(course.slug || `course-${course.id}`);
    const archiveSlug = buildUniqueSlug(`${currentSlug}-arch-${suffix}`, slugSet);

    await patch(`/items/courses/${course.id}`, {
      status: "archived",
      slug: archiveSlug,
      is_featured: false,
    });
    archived += 1;
  }

  return archived;
}

async function linkInstructor(courseId, instructorId) {
  await post("/items/courses_instructors", {
    course_id: courseId,
    user_id: instructorId,
  });
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
      "/items/categories?filter[status][_eq]=published&sort=sort,name&limit=-1&fields=id,name,slug,parent_id,status,sort"
    )
  );

  if (categories.length === 0) {
    log("No published categories found. Nothing to reseed.");
    return;
  }

  const parentCategories = categories.filter((cat) => !extractId(cat.parent_id));
  const parentIds = new Set(parentCategories.map((cat) => cat.id));
  const childCategories = categories
    .filter((cat) => {
      const parentId = extractId(cat.parent_id);
      return Boolean(parentId && parentIds.has(parentId));
    })
    .sort((a, b) => {
      const sortA = Number(a.sort ?? 0);
      const sortB = Number(b.sort ?? 0);
      if (sortA !== sortB) return sortA - sortB;
      return String(a.name).localeCompare(String(b.name));
    });

  if (childCategories.length === 0) {
    log("No child categories found. Nothing to reseed.");
    return;
  }

  const categoryIdSet = new Set([
    ...parentCategories.map((cat) => cat.id),
    ...childCategories.map((cat) => cat.id),
  ]);

  const existingCourses = toArray(
    await get("/items/courses?limit=-1&fields=id,title,slug,status,category_id")
  );
  const slugSet = new Set(
    existingCourses
      .map((course) => (typeof course?.slug === "string" ? course.slug : null))
      .filter(Boolean)
  );

  const coursesToArchive = existingCourses.filter((course) => {
    const categoryId = extractId(course?.category_id);
    if (!categoryId || !categoryIdSet.has(categoryId)) return false;
    return course?.status !== "archived";
  });

  log(`Archiving existing courses in parent/child categories: ${coursesToArchive.length}`);
  const archivedCount = await archiveCourses(coursesToArchive, slugSet);

  const users = toArray(await get("/users?fields=id,email,instructor_state&limit=-1"));
  const instructor = pickInstructor(users);
  if (instructor?.id) {
    log(`Using instructor for links: ${instructor.email ?? instructor.id}`);
  } else {
    log("No instructor user found. Courses will be created without instructor links.");
  }

  let createdCount = 0;
  let linkedCount = 0;

  for (let categoryIndex = 0; categoryIndex < childCategories.length; categoryIndex += 1) {
    const category = childCategories[categoryIndex];
    const topics = SUBCATEGORY_TOPICS[category.slug] ?? [
      `${category.name} Essentials`,
      `${category.name} Fundamentals`,
      `${category.name} Projects`,
      `${category.name} Career Track`,
      `${category.name} Practical Workflow`,
      `${category.name} Advanced Skills`,
      `${category.name} Foundations`,
      `${category.name} Masterclass`,
      `${category.name} Professional Path`,
      `${category.name} Accelerator`,
    ];

    log(`Creating ${TARGET_PER_CHILD} courses in child category: ${category.name}`);

    for (let i = 1; i <= TARGET_PER_CHILD; i += 1) {
      const topic = topics[(i - 1) % topics.length];
      const payload = buildCoursePayload({
        category,
        categoryIndex,
        sequence: i,
        topic,
        slugSet,
      });

      const created = await post("/items/courses", payload);
      createdCount += 1;

      if (instructor?.id && created?.id) {
        await linkInstructor(created.id, instructor.id);
        linkedCount += 1;
      }
    }
  }

  log("");
  log("Reseed completed.");
  log(`- Archived courses: ${archivedCount}`);
  log(`- Created courses: ${createdCount}`);
  if (instructor?.id) {
    log(`- Instructor links created: ${linkedCount}`);
  }
  log(`- Target per child category: ${TARGET_PER_CHILD}`);
}

main().catch((error) => {
  console.error(`Reseed failed: ${error.message}`);
  process.exit(1);
});
