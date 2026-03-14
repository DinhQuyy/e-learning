/**
 * Migration: Add instructor_reply fields to reviews collection
 * and grant instructor update permission.
 *
 * Usage: cd backend && node scripts/add-review-reply-fields.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

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
const DIRECTUS_URL = "http://localhost:8055";
const ADMIN_EMAIL = env.ADMIN_EMAIL || "admin@elearning.dev";
const ADMIN_PASSWORD = env.ADMIN_PASSWORD || "Admin@123456";

async function run() {
  // Login
  const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!loginRes.ok) {
    console.error("Login failed:", await loginRes.text());
    process.exit(1);
  }
  const { data: auth } = await loginRes.json();
  const token = auth.access_token;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // 1. Add instructor_reply field
  console.log("Adding instructor_reply field...");
  const f1 = await fetch(`${DIRECTUS_URL}/fields/reviews`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      field: "instructor_reply",
      type: "text",
      meta: { interface: "input-multiline", note: "Phản hồi của giảng viên" },
      schema: {},
    }),
  });
  if (f1.ok) {
    console.log("✓ instructor_reply added");
  } else if (f1.status === 400) {
    console.log("→ instructor_reply already exists, skipping");
  } else {
    console.error("✗ Failed:", await f1.text());
  }

  // 2. Add instructor_reply_at field
  console.log("Adding instructor_reply_at field...");
  const f2 = await fetch(`${DIRECTUS_URL}/fields/reviews`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      field: "instructor_reply_at",
      type: "timestamp",
      meta: { interface: "datetime", note: "Thời gian phản hồi" },
      schema: {},
    }),
  });
  if (f2.ok) {
    console.log("✓ instructor_reply_at added");
  } else if (f2.status === 400) {
    console.log("→ instructor_reply_at already exists, skipping");
  } else {
    console.error("✗ Failed:", await f2.text());
  }

  // 3. Find instructor policy ID (Directus 11 uses policies, not roles directly)
  console.log("Finding instructor policy...");
  const rolesRes = await fetch(
    `${DIRECTUS_URL}/roles?filter[name][_icontains]=instructor&limit=1`,
    { headers }
  );
  const rolesData = await rolesRes.json();
  const instructorRole = rolesData.data?.[0];
  if (!instructorRole) {
    console.error("✗ Instructor role not found");
    process.exit(1);
  }
  console.log(`✓ Instructor role: ${instructorRole.id} (${instructorRole.name})`);

  // Find the policy linked to this role via access table
  const accessRes = await fetch(
    `${DIRECTUS_URL}/access?filter[role][_eq]=${instructorRole.id}&limit=1&fields=policy`,
    { headers }
  );
  const accessData = await accessRes.json();
  const policyId = accessData.data?.[0]?.policy;
  if (!policyId) {
    console.error("✗ Instructor policy not found");
    process.exit(1);
  }
  console.log(`✓ Instructor policy: ${policyId}`);

  // 4. Check if update permission already exists
  const existingPermRes = await fetch(
    `${DIRECTUS_URL}/permissions?filter[policy][_eq]=${policyId}&filter[collection][_eq]=reviews&filter[action][_eq]=update&limit=1`,
    { headers }
  );
  const existingPermData = await existingPermRes.json();
  if (existingPermData.data?.length > 0) {
    console.log("→ Update permission already exists, skipping");
  } else {
    console.log("Adding update permission for instructor on reviews...");
    const permRes = await fetch(`${DIRECTUS_URL}/permissions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        policy: policyId,
        collection: "reviews",
        action: "update",
        fields: ["instructor_reply", "instructor_reply_at"],
      }),
    });
    if (permRes.ok) {
      console.log("✓ Update permission added");
    } else {
      console.error("✗ Failed:", await permRes.text());
    }
  }

  console.log("\nDone!");
}

run().catch(console.error);
