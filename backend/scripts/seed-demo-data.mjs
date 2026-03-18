#!/usr/bin/env node

/**
 * Seed Demo Data — Kognify E-Learning Platform
 *
 * Tạo dữ liệu mẫu vừa đủ để demo:
 *   - 5 giảng viên bổ sung
 *   - 15 học viên
 *   - Enrollments + Orders (completed)
 *   - Reviews (đa dạng rating)
 *   - Progress cho từng enrollment
 *   - Notifications
 *   - Wishlist items
 *
 * Usage: node backend/scripts/seed-demo-data.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env");

function parseEnvContent(content) {
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

function loadEnv() {
  return parseEnvContent(readFileSync(envPath, "utf-8"));
}

function loadFrontendEnv() {
  try {
    const p = resolve(__dirname, "..", "..", "frontend", ".env.local");
    return parseEnvContent(readFileSync(p, "utf-8"));
  } catch { return {}; }
}

const env = loadEnv();
const frontendEnv = loadFrontendEnv();
const BASE_URL = env.DIRECTUS_URL || "http://localhost:8055";
const ADMIN_EMAIL = env.ADMIN_EMAIL || "admin@elearning.dev";
const ADMIN_PASSWORD = env.ADMIN_PASSWORD || "Admin@123456";
const STATIC_TOKEN = frontendEnv.DIRECTUS_STATIC_TOKEN || "";

let TOKEN = "";

// ─── HTTP Helpers ─────────────────────────────────────────────────────────────

async function api(method, path, body = null) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(data)}`);
  return data?.data ?? data;
}

const get  = (path)        => api("GET",   path);
const post = (path, body)  => api("POST",  path, body);
const patch = (path, body) => api("PATCH", path, body);

function log(icon, msg) { console.log(`  ${icon} ${msg}`); }
function section(title) { console.log(`\n${"─".repeat(60)}\n  ${title}\n${"─".repeat(60)}`); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function slug(n) { return `demo-${n}-${Date.now()}`; }

// ─── Data ─────────────────────────────────────────────────────────────────────

const INSTRUCTOR_DATA = [
  { first_name: "Phạm", last_name: "Minh Tuấn", email: "instructor.tuan@kognify.vn", headline: "Full-Stack Developer & Tech Educator", bio: "10 năm kinh nghiệm phát triển web, đã đào tạo hơn 2.000 học viên từ cơ bản đến nâng cao.", phone: "0901111222" },
  { first_name: "Lê", last_name: "Thị Hoa", email: "instructor.hoa@kognify.vn", headline: "UX/UI Designer & Product Consultant", bio: "Chuyên gia thiết kế với 7 năm tại các công ty sản phẩm hàng đầu Đông Nam Á.", phone: "0902222333" },
  { first_name: "Vũ", last_name: "Đức Anh", email: "instructor.anhduc@kognify.vn", headline: "Data Scientist & AI Researcher", bio: "Nghiên cứu sinh tiến sĩ về Machine Learning, đồng thời là giảng viên đại học 8 năm.", phone: "0903333444" },
  { first_name: "Ngô", last_name: "Thanh Hà", email: "instructor.ha@kognify.vn", headline: "Digital Marketing & Growth Hacker", bio: "Đã triển khai chiến dịch marketing cho 50+ thương hiệu, chuyên gia SEO và quảng cáo số.", phone: "0904444555" },
  { first_name: "Trương", last_name: "Quốc Bảo", email: "instructor.bao@kognify.vn", headline: "Mobile Developer (iOS & Android)", bio: "Kỹ sư di động với 9 năm kinh nghiệm, tác giả của 12 ứng dụng có trên 500k lượt tải.", phone: "0905555666" },
];

const STUDENT_DATA = [
  { first_name: "Nguyễn", last_name: "Văn Khoa", email: "student.khoa@gmail.com", headline: "Sinh viên CNTT năm 3", bio: "Đam mê lập trình và mong muốn trở thành full-stack developer." },
  { first_name: "Trần", last_name: "Thị Lan", email: "student.lan@gmail.com", headline: "Nhân viên kinh doanh", bio: "Đang học thêm về digital marketing để phát triển sự nghiệp." },
  { first_name: "Lê", last_name: "Hoàng Nam", email: "student.namhoang@gmail.com", headline: "Fresher Web Developer", bio: "Vừa tốt nghiệp và đang tìm kiếm cơ hội việc làm trong ngành IT." },
  { first_name: "Phạm", last_name: "Thị Yến", email: "student.yen@gmail.com", headline: "Graphic Designer", bio: "Muốn nâng cao kỹ năng thiết kế UI/UX để chuyển sang product design." },
  { first_name: "Hoàng", last_name: "Minh Đức", email: "student.minh.duc@gmail.com", headline: "Kỹ sư cơ khí", bio: "Muốn học lập trình để kết hợp với kỹ thuật, hướng tới tự động hóa." },
  { first_name: "Vũ", last_name: "Thị Mai", email: "student.mai@gmail.com", headline: "Giáo viên tiểu học", bio: "Tìm hiểu các công cụ công nghệ để áp dụng vào dạy học hiện đại." },
  { first_name: "Đặng", last_name: "Quang Huy", email: "student.huy@gmail.com", headline: "Sinh viên kinh tế", bio: "Học thêm kỹ năng phân tích dữ liệu để cạnh tranh trên thị trường việc làm." },
  { first_name: "Bùi", last_name: "Thị Thảo", email: "student.thao@gmail.com", headline: "Content Creator", bio: "Tạo nội dung chất lượng trên mạng xã hội và muốn học chỉnh sửa video chuyên nghiệp." },
  { first_name: "Lý", last_name: "Văn Tài", email: "student.tai@gmail.com", headline: "Nhân viên hành chính", bio: "Muốn học kỹ năng Excel và phân tích dữ liệu để tăng hiệu suất công việc." },
  { first_name: "Trịnh", last_name: "Thị Ngọc", email: "student.ngoc@gmail.com", headline: "Sinh viên năm 2", bio: "Đang tìm hiểu các ngôn ngữ lập trình phổ biến để định hướng nghề nghiệp." },
  { first_name: "Cao", last_name: "Minh Khải", email: "student.khai@gmail.com", headline: "Quản lý dự án IT", bio: "Muốn nâng cao kiến thức kỹ thuật để quản lý đội ngũ lập trình tốt hơn." },
  { first_name: "Đinh", last_name: "Thị Thu", email: "student.thu@gmail.com", headline: "Kế toán viên", bio: "Học thêm về tài chính số và công cụ phân tích để phát triển chuyên môn." },
  { first_name: "Hà", last_name: "Quốc Khánh", email: "student.khanh@gmail.com", headline: "Marketing Executive", bio: "Đang học thêm về SEO, SEM và data analytics để tối ưu chiến dịch." },
  { first_name: "Phan", last_name: "Thị Hạnh", email: "student.hanh@gmail.com", headline: "Nhà thiết kế tự do", bio: "Freelancer thiết kế đồ họa đang mở rộng sang thiết kế web và motion." },
  { first_name: "Tô", last_name: "Văn Lộc", email: "student.loc@gmail.com", headline: "Lập trình viên backend", bio: "Đang học thêm về cloud và DevOps để hoàn thiện kỹ năng kỹ sư." },
];

const REVIEW_COMMENTS = [
  "Khóa học rất hay và thực tế! Giảng viên giải thích rõ ràng, dễ hiểu, tôi đã áp dụng được ngay vào công việc.",
  "Nội dung khóa học phong phú, có nhiều bài tập thực hành giúp củng cố kiến thức hiệu quả.",
  "Tôi đã học nhiều khóa học khác nhưng đây là một trong những khóa tốt nhất. Rất đáng đồng tiền bỏ ra.",
  "Giảng viên nhiệt tình, luôn hỗ trợ học viên qua phần bình luận. Cảm ơn vì khóa học chất lượng này!",
  "Khóa học được cấu trúc tốt, từng bước một rất logic. Phù hợp cho người mới bắt đầu.",
  "Bài giảng chi tiết, dễ hiểu. Tuy nhiên một số bài có thể cập nhật thêm nội dung mới hơn.",
  "Tôi hoàn thành khóa học trong 3 tuần và đã có thể làm được dự án thực tế. Rất hài lòng!",
  "Chất lượng video tốt, âm thanh rõ ràng. Nội dung được trình bày theo trình tự hợp lý.",
  "Khóa học vượt ngoài mong đợi của tôi. Giảng viên không chỉ dạy lý thuyết mà còn chia sẻ kinh nghiệm thực tế.",
  "Rất tốt cho người mới bắt đầu. Giảng viên kiên nhẫn và giải thích từng chi tiết nhỏ.",
  "Nội dung phong phú nhưng đôi khi hơi nhanh ở một số phần. Nhìn chung vẫn là khóa học đáng học.",
  "Tôi đã giới thiệu khóa học này cho nhiều đồng nghiệp. Chất lượng xứng đáng với chi phí bỏ ra.",
  "Hệ thống bài học rõ ràng, bài tập sát thực tế. Sau khóa học tôi cảm thấy tự tin hơn nhiều.",
  "Đây là lần đầu tiên tôi học online và trải nghiệm tốt hơn tôi nghĩ. Sẽ đăng ký thêm khóa khác!",
  "Giảng viên chia sẻ rất nhiều tips hữu ích mà sách giáo khoa không có. Thực sự đáng giá.",
];

const PAYMENT_METHODS = ["vnpay", "momo", "bank_transfer"];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🌱  Kognify Demo Data Seeder\n");

  // Login
  section("1. Đăng nhập admin");
  if (STATIC_TOKEN) {
    TOKEN = STATIC_TOKEN;
    log("✓", "Dùng static token từ frontend/.env.local");
  } else {
    const auth = await post("/auth/login", { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    TOKEN = auth.access_token;
    log("✓", "Đăng nhập thành công");
  }

  // Fetch roles
  section("2. Lấy roles");
  const roles = await get("/roles");
  const roleArr = Array.isArray(roles) ? roles : [];
  const ROLE_INSTRUCTOR = roleArr.find((r) => r.name === "Instructor")?.id;
  const ROLE_STUDENT = roleArr.find((r) => r.name === "Student")?.id;
  if (!ROLE_INSTRUCTOR || !ROLE_STUDENT) {
    console.error("❌ Không tìm thấy role Instructor/Student. Hãy chạy bootstrap.mjs trước.");
    process.exit(1);
  }
  log("✓", `Role Instructor: ${ROLE_INSTRUCTOR}`);
  log("✓", `Role Student: ${ROLE_STUDENT}`);

  // Fetch existing users
  const allUsers = await get("/users?fields=id,email&limit=-1");
  const existingEmails = new Set((Array.isArray(allUsers) ? allUsers : []).map((u) => u.email));

  // Fetch published courses
  section("3. Lấy khóa học");
  const coursesRaw = await get("/items/courses?filter[status][_eq]=published&fields=id,title,price,discount_price&limit=-1");
  const courses = Array.isArray(coursesRaw) ? coursesRaw : [];
  if (courses.length === 0) {
    console.error("❌ Không có khóa học nào. Hãy seed khóa học trước.");
    process.exit(1);
  }
  log("✓", `${courses.length} khóa học tìm thấy`);

  // Fetch modules (course_id) then lessons (module_id) to build lessonsByCourse map
  const modulesRaw = await get("/items/modules?fields=id,course_id&limit=-1");
  const modules = Array.isArray(modulesRaw) ? modulesRaw : [];
  const courseByModule = new Map(modules.map((m) => [m.id, m.course_id]));

  const lessonsRaw = await get("/items/lessons?fields=id,module_id&limit=-1&sort=sort");
  const lessons = Array.isArray(lessonsRaw) ? lessonsRaw : [];
  const lessonsByCourse = new Map();
  for (const l of lessons) {
    const courseId = courseByModule.get(l.module_id);
    if (!courseId) continue;
    if (!lessonsByCourse.has(courseId)) lessonsByCourse.set(courseId, []);
    lessonsByCourse.get(courseId).push(l.id);
  }
  log("✓", `${lessons.length} bài học / ${modules.length} module tìm thấy`);

  // ─── Create Instructors ───────────────────────────────────────────────────
  section("4. Tạo giảng viên");
  const instructors = [];
  for (const d of INSTRUCTOR_DATA) {
    if (existingEmails.has(d.email)) {
      const found = (Array.isArray(allUsers) ? allUsers : []).find((u) => u.email === d.email);
      if (found) instructors.push(found);
      log("–", `Tồn tại: ${d.email}`);
      continue;
    }
    try {
      const u = await post("/users", {
        ...d,
        password: "Instructor@123456",
        role: ROLE_INSTRUCTOR,
        instructor_state: "APPROVED",
        status: "active",
      });
      instructors.push(u);
      log("✓", `Giảng viên: ${d.first_name} ${d.last_name}`);
    } catch (e) {
      log("✗", `Lỗi tạo ${d.email}: ${e.message.slice(0, 60)}`);
    }
  }

  // ─── Assign Instructors to Courses ───────────────────────────────────────
  section("5. Gắn giảng viên vào khóa học");
  const existingJunctions = await get("/items/courses_instructors?fields=course_id,user_id&limit=-1");
  const junctionSet = new Set(
    (Array.isArray(existingJunctions) ? existingJunctions : []).map((j) => `${j.course_id}:${j.user_id}`)
  );
  const shuffledCourses = [...courses].sort(() => Math.random() - 0.5);
  let junctionCount = 0;
  for (let i = 0; i < instructors.length; i++) {
    // Each instructor gets 8–15 courses
    const assignCourses = shuffledCourses.slice(i * 12, i * 12 + rand(8, 15));
    for (const c of assignCourses) {
      const key = `${c.id}:${instructors[i].id}`;
      if (junctionSet.has(key)) continue;
      try {
        await post("/items/courses_instructors", { course_id: c.id, user_id: instructors[i].id });
        junctionSet.add(key);
        junctionCount++;
      } catch { /* skip */ }
    }
    log("✓", `${instructors[i].email?.split("@")[0]} → ${assignCourses.length} khóa học`);
  }
  log("✓", `${junctionCount} liên kết giảng viên-khóa học tạo thành công`);

  // ─── Create Students ──────────────────────────────────────────────────────
  section("6. Tạo học viên");
  const students = [];
  for (const d of STUDENT_DATA) {
    if (existingEmails.has(d.email)) {
      const found = (Array.isArray(allUsers) ? allUsers : []).find((u) => u.email === d.email);
      if (found) students.push(found);
      log("–", `Tồn tại: ${d.email}`);
      continue;
    }
    try {
      const u = await post("/users", {
        ...d,
        password: "Student@123456",
        role: ROLE_STUDENT,
        status: "active",
        phone: `09${rand(10000000, 99999999)}`,
      });
      students.push(u);
      log("✓", `Học viên: ${d.first_name} ${d.last_name}`);
    } catch (e) {
      log("✗", `Lỗi tạo ${d.email}: ${e.message.slice(0, 60)}`);
    }
  }

  if (students.length === 0) {
    log("!", "Không có học viên nào được tạo — bỏ qua các bước tiếp theo");
    return;
  }

  // ─── Check existing enrollments ───────────────────────────────────────────
  section("7. Tạo đơn hàng & enrollment");
  const existingEnrollments = await get("/items/enrollments?fields=user_id,course_id&limit=-1");
  const enrolledSet = new Set(
    (Array.isArray(existingEnrollments) ? existingEnrollments : []).map((e) => `${e.user_id}:${e.course_id}`)
  );

  const allEnrollments = []; // {id, user_id, course_id}

  for (const student of students) {
    // Each student buys 2–5 courses
    const numCourses = rand(2, 5);
    const shuffled = [...courses].sort(() => Math.random() - 0.5).slice(0, numCourses);
    const newCourses = shuffled.filter((c) => !enrolledSet.has(`${student.id}:${c.id}`));
    if (newCourses.length === 0) {
      log("–", `${student.email} đã có enrollment`);
      continue;
    }

    const totalAmount = newCourses.reduce((sum, c) => {
      const price = Number(c.discount_price ?? c.price ?? 0);
      return sum + price;
    }, 0);

    const orderNumber = `KGN${Date.now().toString().slice(-8)}${rand(100, 999)}`;
    const paymentMethod = pick(PAYMENT_METHODS);
    const createdAt = new Date(Date.now() - rand(1, 180) * 24 * 60 * 60 * 1000).toISOString();

    let order;
    try {
      order = await post("/items/orders", {
        user_id: student.id,
        order_number: orderNumber,
        status: "success",
        total_amount: totalAmount,
        payment_method: paymentMethod,
        date_created: createdAt,
      });
    } catch (e) {
      log("✗", `Order cho ${student.email}: ${e.message.slice(0, 80)}`);
      continue;
    }

    for (const course of newCourses) {
      const price = Number(course.discount_price ?? course.price ?? 0);
      try {
        await post("/items/order_items", { order_id: order.id, course_id: course.id, price });
      } catch { /* skip */ }

      if (enrolledSet.has(`${student.id}:${course.id}`)) continue;
      enrolledSet.add(`${student.id}:${course.id}`);

      const progressPct = rand(0, 100);
      const status = progressPct === 100 ? "completed" : "active";
      const courseLessons = lessonsByCourse.get(course.id) || [];
      const lastLessonIdx = courseLessons.length > 0
        ? Math.min(Math.floor((progressPct / 100) * courseLessons.length), courseLessons.length - 1)
        : -1;
      const lastLessonId = lastLessonIdx >= 0 ? courseLessons[lastLessonIdx] : null;

      try {
        const enrollment = await post("/items/enrollments", {
          user_id: student.id,
          course_id: course.id,
          status,
          progress_percentage: progressPct,
          last_lesson_id: lastLessonId,
          enrolled_at: createdAt,
          ...(status === "completed" ? { completed_at: new Date().toISOString() } : {}),
        });
        allEnrollments.push({ id: enrollment.id, user_id: student.id, course_id: course.id, progress: progressPct, lessons: courseLessons });
        log("✓", `Enrollment: ${student.email.split("@")[0]} → ${course.title.slice(0, 30)}`);
      } catch (e) {
        log("✗", `Enrollment: ${e.message.slice(0, 80)}`);
      }
    }
  }

  // ─── Progress records ─────────────────────────────────────────────────────
  section("8. Tạo progress bài học");
  let progressCount = 0;
  for (const en of allEnrollments) {
    if (en.lessons.length === 0 || en.progress === 0) continue;
    const completedCount = Math.floor((en.progress / 100) * en.lessons.length);
    const lessonsToMark = en.lessons.slice(0, completedCount);
    for (const lessonId of lessonsToMark) {
      try {
        await post("/items/progress", {
          enrollment_id: en.id,
          lesson_id: lessonId,
          completed: true,
          video_position: rand(30, 600),
          completed_at: new Date(Date.now() - rand(0, 30) * 24 * 60 * 60 * 1000).toISOString(),
        });
        progressCount++;
      } catch { /* skip duplicate */ }
    }
  }
  log("✓", `${progressCount} progress records tạo thành công`);

  // ─── Reviews ──────────────────────────────────────────────────────────────
  section("9. Tạo đánh giá");
  const existingReviews = await get("/items/reviews?fields=user_id,course_id&limit=-1");
  const reviewedSet = new Set(
    (Array.isArray(existingReviews) ? existingReviews : []).map((r) => `${r.user_id}:${r.course_id}`)
  );

  // Rating distribution: mostly 4-5 stars, some 3, rare 1-2
  const RATING_WEIGHTS = [1, 1, 2, 5, 9]; // index = rating-1
  function weightedRating() {
    const total = RATING_WEIGHTS.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < RATING_WEIGHTS.length; i++) {
      r -= RATING_WEIGHTS[i];
      if (r <= 0) return i + 1;
    }
    return 5;
  }

  let reviewCount = 0;
  // 70% of enrollments with >20% progress get a review
  const reviewableEnrollments = allEnrollments.filter((e) => e.progress >= 20);
  for (const en of reviewableEnrollments) {
    if (Math.random() > 0.7) continue;
    if (reviewedSet.has(`${en.user_id}:${en.course_id}`)) continue;
    const rating = weightedRating();
    try {
      await post("/items/reviews", {
        user_id: en.user_id,
        course_id: en.course_id,
        rating,
        comment: pick(REVIEW_COMMENTS),
        status: "approved",
        date_created: new Date(Date.now() - rand(0, 60) * 24 * 60 * 60 * 1000).toISOString(),
      });
      reviewedSet.add(`${en.user_id}:${en.course_id}`);
      reviewCount++;
    } catch { /* skip */ }
  }
  log("✓", `${reviewCount} đánh giá tạo thành công`);

  // ─── Notifications ────────────────────────────────────────────────────────
  section("10. Tạo thông báo");
  const notifTypes = ["enrollment", "review", "info", "system"];
  const notifMessages = [
    { type: "enrollment", title: "Đăng ký thành công!", message: "Chúc mừng bạn đã đăng ký khoá học. Hành trình học tập bắt đầu từ hôm nay!" },
    { type: "review", title: "Cảm ơn đánh giá của bạn", message: "Đánh giá của bạn đã được ghi nhận và sẽ giúp ích cho học viên khác." },
    { type: "info", title: "Khóa học mới vừa ra mắt", message: "Một khóa học mới trong danh mục bạn quan tâm vừa được phát hành. Xem ngay!" },
    { type: "system", title: "Cập nhật nền tảng", message: "Kognify vừa cập nhật tính năng mới giúp trải nghiệm học tập tốt hơn." },
    { type: "info", title: "Ưu đãi đặc biệt cho bạn", message: "Giảm 20% cho tất cả khóa học trong tuần này. Đừng bỏ lỡ cơ hội này!" },
  ];

  let notifCount = 0;
  for (const student of students.slice(0, 10)) {
    const count = rand(1, 3);
    for (let i = 0; i < count; i++) {
      const n = pick(notifMessages);
      try {
        await post("/items/notifications", {
          user_id: student.id,
          title: n.title,
          message: n.message,
          type: n.type,
          read: Math.random() > 0.4,
          date_created: new Date(Date.now() - rand(0, 14) * 24 * 60 * 60 * 1000).toISOString(),
        });
        notifCount++;
      } catch { /* skip */ }
    }
  }
  log("✓", `${notifCount} thông báo tạo thành công`);

  // ─── Wishlist ─────────────────────────────────────────────────────────────
  section("11. Tạo wishlist");
  const existingWish = await get("/items/wishlists?fields=user_id,course_id&limit=-1");
  const wishSet = new Set(
    (Array.isArray(existingWish) ? existingWish : []).map((w) => `${w.user_id}:${w.course_id}`)
  );

  let wishCount = 0;
  for (const student of students) {
    const wishCourses = [...courses]
      .sort(() => Math.random() - 0.5)
      .slice(0, rand(1, 4))
      .filter((c) => !enrolledSet.has(`${student.id}:${c.id}`) && !wishSet.has(`${student.id}:${c.id}`));
    for (const c of wishCourses) {
      try {
        await post("/items/wishlists", { user_id: student.id, course_id: c.id });
        wishSet.add(`${student.id}:${c.id}`);
        wishCount++;
      } catch { /* skip */ }
    }
  }
  log("✓", `${wishCount} wishlist items tạo thành công`);

  // ─── Update course stats ──────────────────────────────────────────────────
  section("12. Cập nhật thống kê khóa học");
  const allEnrollmentsNow = await get("/items/enrollments?fields=course_id&limit=-1");
  const enrollCountByCourse = new Map();
  for (const e of (Array.isArray(allEnrollmentsNow) ? allEnrollmentsNow : [])) {
    enrollCountByCourse.set(e.course_id, (enrollCountByCourse.get(e.course_id) ?? 0) + 1);
  }
  const allReviewsNow = await get("/items/reviews?filter[status][_eq]=approved&fields=course_id,rating&limit=-1");
  const reviewsByCourse = new Map();
  for (const r of (Array.isArray(allReviewsNow) ? allReviewsNow : [])) {
    if (!reviewsByCourse.has(r.course_id)) reviewsByCourse.set(r.course_id, []);
    reviewsByCourse.get(r.course_id).push(r.rating);
  }

  let updateCount = 0;
  for (const course of courses) {
    const totalEnrollments = enrollCountByCourse.get(course.id) ?? 0;
    const ratings = reviewsByCourse.get(course.id) ?? [];
    const avgRating = ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : null;
    try {
      await patch(`/items/courses/${course.id}`, {
        total_enrollments: totalEnrollments,
        ...(avgRating !== null ? { average_rating: avgRating } : {}),
        review_count: ratings.length,
      });
      updateCount++;
    } catch { /* skip */ }
  }
  log("✓", `${updateCount} khóa học được cập nhật stats`);

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log(`
${"═".repeat(60)}
  ✅  SEED HOÀN THÀNH
${"═".repeat(60)}
  👨‍🏫  Giảng viên mới : ${instructors.length}
  🎓  Học viên mới   : ${students.length}
  📦  Enrollments    : ${allEnrollments.length}
  ⭐  Đánh giá       : ${reviewCount}
  🔔  Thông báo      : ${notifCount}
  ❤️   Wishlist       : ${wishCount}

  Tài khoản demo:
    Giảng viên: instructor.tuan@kognify.vn / Instructor@123456
    Học viên:   student.khoa@gmail.com    / Student@123456
${"═".repeat(60)}
`);
}

main().catch((e) => {
  console.error("\n❌ Lỗi:", e.message);
  process.exit(1);
});
