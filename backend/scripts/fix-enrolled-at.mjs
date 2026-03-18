/**
 * Fix enrolled_at for all enrollments.
 *
 * Problem: Directus ignores the `enrolled_at` value on POST (creates with
 * current timestamp). Every enrollment in the DB has enrolled_at = "today".
 *
 * Fix:
 *  1. Build a map of user_id+course_id → paid_at from ALL successful orders.
 *  2. For every enrollment that has a matching order → PATCH enrolled_at = paid_at.
 *  3. For enrollments with no matching order (orphaned from deleted historical runs)
 *     → DELETE them.
 *
 * Usage: node backend/scripts/fix-enrolled-at.mjs
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
if (!TOKEN) { console.error("❌ Không tìm thấy DIRECTUS_STATIC_TOKEN"); process.exit(1); }

const headers = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };

async function get(path) {
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return (await res.json()).data;
}
async function patchItem(collection, id, body) {
  const res = await fetch(`${BASE_URL}/items/${collection}/${id}`, {
    method: "PATCH", headers, body: JSON.stringify(body),
  });
  return res.ok;
}
async function deleteItem(collection, id) {
  const res = await fetch(`${BASE_URL}/items/${collection}/${id}`, { method: "DELETE", headers });
  return res.ok;
}

async function main() {
  console.log("🔍 Đang lấy dữ liệu...\n");

  // 1. Get all successful orders with their paid_at
  const orders = await get("/items/orders?filter[status][_eq]=success&fields=id,user_id,paid_at,date_created&limit=-1");
  console.log(`✓ ${orders.length} đơn hàng thành công`);

  // 2. Get all order_items to map course_id → order
  const orderItems = await get("/items/order_items?fields=order_id,course_id&limit=-1");
  console.log(`✓ ${orderItems.length} order items`);

  // Build map: "user_id:course_id" → paid_at
  const orderMap = new Map(orders.map((o) => [o.id, o]));
  const enrollDateMap = new Map(); // "user_id:course_id" → paid_at date string

  for (const item of orderItems) {
    const order = orderMap.get(item.order_id);
    if (!order) continue;
    const key = `${order.user_id}:${item.course_id}`;
    const date = order.paid_at || order.date_created;
    // If multiple orders for same user+course, keep the earliest
    if (!enrollDateMap.has(key) || date < enrollDateMap.get(key)) {
      enrollDateMap.set(key, date);
    }
  }
  console.log(`✓ ${enrollDateMap.size} cặp user+course có order\n`);

  // 3. Get all enrollments
  const enrollments = await get("/items/enrollments?fields=id,user_id,course_id,enrolled_at&limit=-1");
  console.log(`Tổng enrollments: ${enrollments.length}`);

  let patched = 0;
  let deleted = 0;
  let skipped = 0;

  for (const e of enrollments) {
    const key = `${e.user_id}:${e.course_id}`;
    const targetDate = enrollDateMap.get(key);

    if (!targetDate) {
      // No matching order → orphaned enrollment → delete
      await deleteItem("enrollments", e.id);
      deleted++;
    } else if (e.enrolled_at === targetDate) {
      // Already correct
      skipped++;
    } else {
      // Needs patching
      await patchItem("enrollments", e.id, { enrolled_at: targetDate });
      patched++;
    }

    if ((patched + deleted + skipped) % 20 === 0) {
      process.stdout.write(`  Xử lý: ${patched + deleted + skipped}/${enrollments.length}...\r`);
    }
  }

  console.log(`\n✓ Đã PATCH enrolled_at : ${patched}`);
  console.log(`✓ Đã xóa orphaned      : ${deleted}`);
  console.log(`✓ Không đổi (đúng rồi) : ${skipped}`);

  // 4. Show distribution after fix
  console.log("\n📊 Phân bổ enrolled_at sau khi fix:");
  const fixed = await get("/items/enrollments?fields=enrolled_at&limit=-1");
  const byMonth = {};
  for (const e of fixed) {
    const m = (e.enrolled_at || "").slice(0, 7);
    byMonth[m] = (byMonth[m] || 0) + 1;
  }
  Object.keys(byMonth).sort().forEach((m) => console.log(`  ${m}: ${byMonth[m]} enrollments`));

  console.log("\n✅ Xong! Làm mới trang dashboard để thấy biểu đồ cập nhật.");
}

main().catch((e) => { console.error("❌ Lỗi:", e.message); process.exit(1); });
