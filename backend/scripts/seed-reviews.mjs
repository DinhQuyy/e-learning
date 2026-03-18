/**
 * Seed reviews từ tất cả các học viên đã đăng ký khoá học.
 * Script này tạo đánh giá cho những enrollment chưa có review.
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load DIRECTUS_STATIC_TOKEN from frontend/.env.local
function loadToken() {
  try {
    const envPath = join(__dirname, "../../frontend/.env.local");
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim().replace(/\r$/, "");
      if (trimmed.startsWith("DIRECTUS_STATIC_TOKEN=")) {
        return trimmed.slice("DIRECTUS_STATIC_TOKEN=".length).trim();
      }
    }
  } catch {}
  return null;
}

const BASE_URL = "http://localhost:8055";
const TOKEN = loadToken();

if (!TOKEN) {
  console.error("❌ Không tìm thấy DIRECTUS_STATIC_TOKEN trong frontend/.env.local");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

async function get(path) {
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  const d = await res.json();
  return d.data;
}

async function post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`POST ${path} → ${res.status}: ${JSON.stringify(err)}`);
  }
  return (await res.json()).data;
}

async function patch(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} → ${res.status}`);
  return (await res.json()).data;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const RATING_WEIGHTS = [1, 1, 2, 5, 9]; // 1-star → 5-star weights (mostly 4-5 stars)
function weightedRating() {
  const total = RATING_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < RATING_WEIGHTS.length; i++) {
    r -= RATING_WEIGHTS[i];
    if (r <= 0) return i + 1;
  }
  return 5;
}

const REVIEW_COMMENTS = [
  "Khoá học rất hay và bổ ích. Giảng viên giải thích rõ ràng, dễ hiểu.",
  "Nội dung khoá học phong phú, có nhiều bài tập thực hành giúp củng cố kiến thức hiệu quả.",
  "Tôi học được rất nhiều điều mới từ khoá học này. Sẽ giới thiệu cho bạn bè.",
  "Khoá học có cấu trúc tốt, từng bước dễ theo dõi. Rất phù hợp cho người mới bắt đầu.",
  "Giảng viên nhiệt tình và có kinh nghiệm thực tế. Nội dung cập nhật và thực tiễn.",
  "Video chất lượng cao, âm thanh rõ ràng. Nội dung súc tích và đi thẳng vào vấn đề.",
  "Khoá học tuyệt vời! Tôi đã áp dụng được ngay vào công việc sau khi hoàn thành.",
  "Rất hài lòng với chất lượng khoá học. Đáng đồng tiền bát gạo.",
  "Học được nhiều kỹ năng thực tế. Giảng viên có cách truyền đạt rất cuốn hút.",
  "Nội dung đầy đủ và chi tiết. Tôi đã hiểu sâu hơn về chủ đề này sau khi học xong.",
  "Khoá học khá ổn, nội dung cơ bản đầy đủ. Mong có thêm bài tập thực hành hơn.",
  "Giảng viên dạy rõ ràng, dễ nắm bắt. Tuy nhiên tốc độ hơi chậm với người đã có kinh nghiệm.",
  "Khoá học tốt cho người mới bắt đầu. Cần thêm ví dụ thực tế hơn.",
  "Nội dung hữu ích nhưng video có thể được chỉnh sửa gọn gàng hơn.",
  "Khoá học trung bình, cần cải thiện phần bài tập và kiểm tra.",
  "Khoá học xuất sắc! Một trong những khoá học tốt nhất tôi từng tham gia.",
  "Kiến thức được truyền đạt một cách logic và có hệ thống. Rất dễ theo dõi.",
  "Tôi đã cải thiện đáng kể kỹ năng của mình sau khoá học này. Cảm ơn giảng viên!",
  "Khoá học có chất lượng cao, xứng đáng với mức giá. Sẽ học thêm các khoá khác.",
  "Giảng viên rất am hiểu chuyên môn và nhiệt tình hỗ trợ học viên.",
];

function randDays(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log("🔍 Đang lấy dữ liệu...\n");

  // Get all enrollments with progress_percentage
  const enrollments = await get(
    "/items/enrollments?fields=id,user_id,course_id,progress_percentage&limit=-1"
  );
  console.log(`✓ ${enrollments.length} enrollments`);

  // Get existing reviews to avoid duplicates
  const existingReviews = await get("/items/reviews?fields=user_id,course_id&limit=-1");
  const reviewedSet = new Set(existingReviews.map((r) => `${r.user_id}:${r.course_id}`));
  console.log(`✓ ${existingReviews.length} reviews đã tồn tại\n`);

  // Create reviews for enrollments without reviews
  // Threshold: progress_percentage > 10 (any meaningful progress)
  const toReview = enrollments.filter((e) => {
    const pct = Number(e.progress_percentage ?? 0);
    const key = `${e.user_id}:${e.course_id}`;
    return pct > 10 && !reviewedSet.has(key);
  });

  // Also include enrollments with 0% but still enrolled (student registered but hasn't started)
  const toReviewAll = enrollments.filter((e) => {
    const key = `${e.user_id}:${e.course_id}`;
    return !reviewedSet.has(key);
  });

  console.log(`📝 Enrollments chưa có review (>10% progress): ${toReview.length}`);
  console.log(`📝 Tổng enrollments chưa có review: ${toReviewAll.length}\n`);

  // Create reviews for ALL enrollments that don't have one yet
  let created = 0;
  let failed = 0;

  for (const enrollment of toReviewAll) {
    const key = `${enrollment.user_id}:${enrollment.course_id}`;
    if (reviewedSet.has(key)) continue;

    const pct = Number(enrollment.progress_percentage ?? 0);
    // Weight rating based on progress - more progress = slightly higher ratings tendency
    let rating;
    if (pct >= 80) {
      rating = weightedRating(); // Normal distribution (mostly 4-5)
    } else if (pct >= 40) {
      rating = Math.random() < 0.7 ? Math.floor(Math.random() * 2) + 4 : Math.floor(Math.random() * 3) + 2; // 4-5 or 2-4
    } else {
      rating = Math.floor(Math.random() * 3) + 3; // 3-5 for low progress
    }

    const daysAgo = randDays(1, 90);
    try {
      await post("/items/reviews", {
        user_id: enrollment.user_id,
        course_id: enrollment.course_id,
        rating,
        comment: pick(REVIEW_COMMENTS),
        status: "approved",
        date_created: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
      });
      reviewedSet.add(key);
      created++;
      if (created % 10 === 0) process.stdout.write(`  ${created} reviews đã tạo...\r`);
    } catch (err) {
      failed++;
    }
  }

  console.log(`\n✓ Đã tạo ${created} reviews mới (${failed} lỗi)\n`);

  // Update course stats
  console.log("📊 Cập nhật thống kê khoá học...");
  const allReviews = await get(
    "/items/reviews?filter[status][_eq]=approved&fields=course_id,rating&limit=-1"
  );
  const allEnrollments = await get("/items/enrollments?fields=course_id&limit=-1");
  const courses = await get("/items/courses?filter[status][_eq]=published&fields=id&limit=-1");

  // Build maps
  const reviewsByCourse = new Map();
  for (const r of allReviews) {
    if (!reviewsByCourse.has(r.course_id)) reviewsByCourse.set(r.course_id, []);
    reviewsByCourse.get(r.course_id).push(r.rating);
  }

  const enrollCountByCourse = new Map();
  for (const e of allEnrollments) {
    enrollCountByCourse.set(e.course_id, (enrollCountByCourse.get(e.course_id) ?? 0) + 1);
  }

  let updated = 0;
  for (const course of courses) {
    const ratings = reviewsByCourse.get(course.id) ?? [];
    const avgRating =
      ratings.length > 0
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
        : null;
    const totalEnrollments = enrollCountByCourse.get(course.id) ?? 0;

    try {
      await patch(`/items/courses/${course.id}`, {
        total_enrollments: totalEnrollments,
        ...(avgRating !== null ? { average_rating: avgRating } : {}),
      });
      updated++;
    } catch {}
  }

  console.log(`✓ Đã cập nhật ${updated} khoá học\n`);

  const totalReviews = allReviews.length;
  const coursesWithReviews = reviewsByCourse.size;
  console.log("═".repeat(50));
  console.log(`  ✅ HOÀN THÀNH`);
  console.log("═".repeat(50));
  console.log(`  ⭐ Reviews mới tạo : ${created}`);
  console.log(`  ⭐ Tổng reviews    : ${totalReviews}`);
  console.log(`  📚 Khoá học có đánh giá: ${coursesWithReviews}`);
  console.log("═".repeat(50));
}

main().catch((e) => {
  console.error("❌ Lỗi:", e.message);
  process.exit(1);
});
