/**
 * Seed historical orders + enrollments for the past 5 months.
 * Creates realistic, gradually-increasing data so the admin dashboard charts
 * (Revenue last 6 months, Enrollments last 6 months) show meaningful trends.
 *
 * Re-running this script is safe: it deletes previously-created historical
 * data first, then recreates with the targets defined below.
 *
 * Usage: node backend/scripts/seed-historical-orders.mjs
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

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
  if (!res.ok) throw new Error(`GET ${path} → ${res.status} ${await res.text()}`);
  return (await res.json()).data;
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

async function del(path) {
  const res = await fetch(`${BASE_URL}${path}`, { method: "DELETE", headers });
  return res.ok;
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

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randDateInMonth(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const day = randInt(1, daysInMonth);
  const hour = randInt(7, 22);
  const min = randInt(0, 59);
  return new Date(year, month - 1, day, hour, min, 0).toISOString();
}

function makeOrderNumber(isoDate, seq) {
  const d = new Date(isoDate);
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `ORD-${ymd}-${String(seq).padStart(5, "0")}`;
}

// Monthly targets: { enrollments: N, revenueTarget: VND }
// 5 entries for months[-5] to months[-1] (oldest → newest)
// Targets calibrated for paid-course avg price ~600-700K; max 10M/month
const MONTHLY_TARGETS = [
  { enrollments: 3,  revenueTarget: 2_000_000 },   // 5 months ago
  { enrollments: 5,  revenueTarget: 3_500_000 },   // 4 months ago
  { enrollments: 8,  revenueTarget: 5_500_000 },   // 3 months ago
  { enrollments: 11, revenueTarget: 7_500_000 },   // 2 months ago
  { enrollments: 14, revenueTarget: 9_800_000 },   // 1 month ago
];

const PAYMENT_METHODS = ["vnpay", "momo", "bank_transfer"];

async function main() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Build date range for the 5 historical months
  const histStart = new Date(currentYear, currentMonth - 1 - 5, 1);
  const histEnd = new Date(currentYear, currentMonth - 1, 1); // start of current month

  const histStartIso = histStart.toISOString();
  const histEndIso = histEnd.toISOString();

  // ── Step 1: Clean up previous historical data ──────────────────────────────
  console.log("🧹 Xóa dữ liệu lịch sử cũ...\n");

  // Find historical orders (paid_at in the 5-month window)
  const oldOrders = await get(
    `/items/orders?filter[paid_at][_gte]=${encodeURIComponent(histStartIso)}&filter[paid_at][_lt]=${encodeURIComponent(histEndIso)}&filter[status][_eq]=success&fields=id&limit=-1`
  );
  console.log(`  Tìm thấy ${oldOrders.length} đơn hàng lịch sử`);

  // Delete order_items for those orders
  let deletedItems = 0;
  for (const order of oldOrders) {
    const items = await get(`/items/order_items?filter[order_id][_eq]=${order.id}&fields=id&limit=-1`);
    for (const item of items) {
      await del(`/items/order_items/${item.id}`);
      deletedItems++;
    }
  }

  // Delete orders
  for (const order of oldOrders) {
    await del(`/items/orders/${order.id}`);
  }
  console.log(`  ✓ Đã xóa ${oldOrders.length} đơn hàng, ${deletedItems} order items`);

  // Delete historical enrollments (enrolled_at in the window)
  const oldEnrollments = await get(
    `/items/enrollments?filter[enrolled_at][_gte]=${encodeURIComponent(histStartIso)}&filter[enrolled_at][_lt]=${encodeURIComponent(histEndIso)}&fields=id&limit=-1`
  );
  for (const e of oldEnrollments) {
    await del(`/items/enrollments/${e.id}`);
  }
  console.log(`  ✓ Đã xóa ${oldEnrollments.length} enrollments lịch sử\n`);

  // ── Step 2: Fetch reference data ───────────────────────────────────────────
  console.log("🔍 Đang lấy dữ liệu...\n");

  const users = await get("/users?fields=id&limit=-1&filter[status][_eq]=active");
  console.log(`✓ ${users.length} users`);

  const allCourses = await get(
    "/items/courses?filter[status][_eq]=published&fields=id,price&limit=-1"
  );
  // Only use paid courses so revenue is meaningful
  const courses = allCourses.filter((c) => Number(c.price ?? 0) > 0);
  console.log(`✓ ${courses.length} published courses`);

  // Fresh enrollment set (after cleanup)
  const existingEnrollments = await get("/items/enrollments?fields=user_id,course_id&limit=-1");
  const enrolledSet = new Set(existingEnrollments.map((e) => `${e.user_id}:${e.course_id}`));
  console.log(`✓ ${existingEnrollments.length} enrollments hiện tại\n`);

  // Seq counter base
  const existingOrderCount = await get("/items/orders?aggregate[count]=id&limit=1");
  let seq = Number(existingOrderCount?.[0]?.count?.id ?? 0) * 10 + 5000;

  // ── Step 3: Create new historical data ────────────────────────────────────
  let totalOrders = 0;
  let totalEnrollments = 0;
  let totalRevenue = 0;

  for (let i = 5; i >= 1; i--) {
    const targetDate = new Date(currentYear, currentMonth - 1 - i, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;
    const monthName = `Th${month}/${year}`;

    const { enrollments: targetEnrollments, revenueTarget } = MONTHLY_TARGETS[5 - i];

    console.log(`📅 ${monthName}: ${targetEnrollments} ghi danh, tối đa ${(revenueTarget / 1_000_000).toFixed(1)}M VND`);

    let monthRevenue = 0;
    let monthOrders = 0;
    let monthEnrollments = 0;

    // Shuffle users so different users get orders each month
    const shuffledUsers = [...users].sort(() => Math.random() - 0.5);

    for (let o = 0; o < targetEnrollments; o++) {
      if (monthRevenue >= revenueTarget) break;

      const user = shuffledUsers[o % shuffledUsers.length];

      // Pick one course the user hasn't enrolled in, price ≤ remaining budget
      const remaining = revenueTarget - monthRevenue;
      const available = courses.filter(
        (c) => !enrolledSet.has(`${user.id}:${c.id}`) && Number(c.price ?? 0) <= remaining
      );
      if (available.length === 0) continue;

      // Random pick from available
      const course = pick(available);

      const price = Number(course.price ?? 0);
      const paidAt = randDateInMonth(year, month);
      const orderNumber = makeOrderNumber(paidAt, ++seq);

      try {
        const order = await post("/items/orders", {
          order_number: orderNumber,
          user_id: user.id,
          total_amount: price,
          status: "success",
          payment_method: pick(PAYMENT_METHODS),
          date_created: paidAt,
          paid_at: paidAt,
        });

        await post("/items/order_items", {
          order_id: order.id,
          course_id: course.id,
          price,
        });

        const key = `${user.id}:${course.id}`;
        if (!enrolledSet.has(key)) {
          // Directus ignores enrolled_at on POST → create first, then PATCH
          const enrollment = await post("/items/enrollments", {
            user_id: user.id,
            course_id: course.id,
            status: "active",
            progress_percentage: 0,
          });
          await patch(`/items/enrollments/${enrollment.id}`, { enrolled_at: paidAt });
          enrolledSet.add(key);
          monthEnrollments++;
          totalEnrollments++;
        }

        monthRevenue += price;
        monthOrders++;
        totalOrders++;
        totalRevenue += price;
      } catch {
        // skip
      }
    }

    console.log(`  ✓ ${monthOrders} đơn | ${monthEnrollments} ghi danh | ${(monthRevenue / 1_000_000).toFixed(2)}M VND`);
  }

  // ── Step 4: Update course enrollment stats ─────────────────────────────────
  console.log("\n📊 Cập nhật thống kê khoá học...");
  const allEnrollments = await get("/items/enrollments?fields=course_id&limit=-1");
  const countByCourse = new Map();
  for (const e of allEnrollments) {
    countByCourse.set(e.course_id, (countByCourse.get(e.course_id) ?? 0) + 1);
  }
  let updated = 0;
  for (const [courseId, count] of countByCourse) {
    try { await patch(`/items/courses/${courseId}`, { total_enrollments: count }); updated++; } catch {}
  }
  console.log(`✓ Đã cập nhật ${updated} khoá học\n`);

  console.log("═".repeat(50));
  console.log("  ✅ HOÀN THÀNH");
  console.log("═".repeat(50));
  console.log(`  📦 Đơn hàng mới   : ${totalOrders}`);
  console.log(`  🎓 Ghi danh mới   : ${totalEnrollments}`);
  console.log(`  💰 Tổng doanh thu  : ${(totalRevenue / 1_000_000).toFixed(2)}M VND`);
  console.log("═".repeat(50));
  console.log("\n💡 Làm mới trang admin dashboard để thấy biểu đồ cập nhật.");
}

main().catch((e) => {
  console.error("❌ Lỗi:", e.message);
  process.exit(1);
});
