# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vietnamese (vi locale) e-learning platform branded **Kognify** (Udemy-like) with e-commerce (cart, wishlist, orders, mock payment). Monorepo:
- `frontend/` — Next.js 16 (App Router) + React 19 + Tailwind CSS 4 + shadcn/ui
- `backend/` — Directus 11 (headless CMS) via Docker Compose with PostgreSQL 16 + Redis 7

## Development Commands

```bash
# Backend — must be running for frontend to work
cd backend && docker compose up -d      # Start Directus + PostgreSQL + Redis
cd backend && docker compose down        # Stop all services
cd backend && docker compose logs -f     # View logs
cd backend && node scripts/bootstrap.mjs # Bootstrap roles, collections, permissions

# Frontend (npm)
cd frontend && npm run dev                  # Dev server on localhost:3000
cd frontend && npm run build                # Production build
cd frontend && npm run lint                 # ESLint 9 (flat config)

# Add shadcn/ui component
cd frontend && npx shadcn@latest add <component>

# Seed scripts (requires backend running)
cd backend && node scripts/seed-demo-data.mjs  # Seed users, courses, enrollments, quizzes
cd backend && node scripts/seed-reviews.mjs    # Seed reviews for all enrollments + update course stats
```

Directus admin panel runs at `http://localhost:8055`.

## Branding

- Platform name: **Kognify**
- Logo: `KognifyLogo` wordmark component in `components/layout/logo.tsx` — renders "Kogni" + "fy" in two colors using `text-[#2f57ef]` accent
- Favicon: `app/icon.svg` — SVG with Kognify "K" lettermark
- Navbar links: "Khám phá khoá học", "Trở thành giảng viên" (removed "Trang chủ" and "Bảng giá")

## Seed Scripts (`backend/scripts/`)

### `seed-demo-data.mjs`
- Creates demo users (student accounts, instructor accounts), categories, courses, modules, lessons, enrollments, quizzes
- Uses `DIRECTUS_STATIC_TOKEN` from `frontend/.env.local`

### `seed-reviews.mjs`
- Reads all enrollments with `progress_percentage` field (NOT `progress` — that's a M2O relation, not a number)
- Skips enrollments that already have reviews (deduplication via Set of `user_id:course_id`)
- Creates reviews for all remaining enrollments; rating weighted by progress (80%+ → mostly 4-5 stars)
- After seeding: patches every published course's `average_rating` and `total_enrollments` via aggregate queries
- **CRLF note**: `.env.local` has Windows CRLF line endings — uses `line.trim().replace(/\r$/, "")` + `startsWith()` instead of regex to parse the token

### `seed-historical-orders.mjs`
- Creates historical orders + enrollments spread across past 5 months for dashboard chart data
- Targets: 3/5/8/11/14 enrollments per month with revenue caps (2M→9.8M VND, max 10M/month)
- Only uses paid courses (price > 0); picks random course per order (1 course per order)
- Stops when revenue target OR enrollment count reached for each month
- Cleanup step first: deletes existing historical orders (paid_at in past 5-month window) + their order_items + enrollments
- After creating: calls PATCH on each enrollment to set `enrolled_at` (see pattern below)
- Re-runnable safely

### `fix-enrolled-at.mjs`
- One-time fix script: patches `enrolled_at` on all enrollments to match their order's `paid_at`
- Deletes orphaned enrollments (no corresponding successful order) created by deleted historical runs
- Run after any seed that creates enrollments if `enrolled_at` shows today's date for all records

## Database Collections (18 + 1 singleton)

| Collection | Interface | Description |
|---|---|---|
| `directus_users` (extended) | `DirectusUser` | Users with bio, phone, headline, social_links |
| `categories` | `Category` | Hierarchical course categories (self-ref parent_id) |
| `courses` | `Course` | Central table — title, slug, price, status, stats |
| `courses_instructors` | `CourseInstructor` | M2M junction: courses ↔ users |
| `modules` | `Module` | Course chapters with sort order |
| `lessons` | `Lesson` | Video/text/mixed lessons in modules |
| `enrollments` | `Enrollment` | Student course registrations with progress |
| `progress` | `Progress` | Per-lesson completion tracking |
| `reviews` | `Review` | Course ratings (1-5) and comments |
| `quizzes` | `Quiz` | Lesson-attached quizzes with passing_score, time_limit |
| `quiz_questions` | `QuizQuestion` | Single/multiple choice questions |
| `quiz_answers` | `QuizAnswer` | Answer options with is_correct flag |
| `quiz_attempts` | `QuizAttempt` | Student quiz results (score, passed, answers JSON) |
| `notifications` | `Notification` | In-app notifications (info, enrollment, review, system) |
| `cart_items` | `CartItem` | Shopping cart items (user_id, course_id) |
| `wishlists` | `WishlistItem` | Wishlisted courses |
| `orders` | `Order` | Purchase orders (order_number, total_amount, status, payment_method) |
| `order_items` | `OrderItem` | Line items in orders (course_id, price) |
| `platform_settings` | — | Singleton: platform_name, maintenance_mode, etc. |

All types defined in `types/index.ts`. Schema type passed to `createDirectus<Schema>()`.

## API Route Map (~48 routes in `app/api/`)

**Auth (7):**
`POST /api/auth/login` · `POST /api/auth/register` · `POST /api/auth/logout` · `POST /api/auth/refresh` · `POST /api/auth/forgot-password` · `POST /api/auth/reset-password` · `GET /api/auth/me`

**E-Commerce (7):**
`GET|POST /api/cart` · `DELETE /api/cart/[id]` · `GET|POST /api/wishlist` · `DELETE /api/wishlist/[id]` · `GET|POST /api/orders` · `GET /api/orders/[id]` · `POST /api/orders/[id]/pay`

**Instructor (12):**
`GET /api/instructor/courses` · `GET /api/instructor/courses/[id]` · `GET|POST /api/instructor/courses/[id]/modules` · `PATCH /api/instructor/courses/[id]/modules/[moduleId]` · `PATCH /api/instructor/courses/[id]/modules/reorder` · `POST /api/instructor/courses/[id]/lessons` · `GET /api/instructor/courses/[id]/lessons/[lessonId]` · `POST /api/instructor/quizzes` · `GET|PATCH /api/instructor/quizzes/[id]` · `POST /api/instructor/courses/[id]/clone` · `PATCH /api/instructor/reviews/[reviewId]/reply`

**Admin (11):**
`GET /api/admin/users` · `GET /api/admin/users/[id]` · `GET /api/admin/users/roles` · `GET /api/admin/courses` · `GET|PATCH /api/admin/courses/[id]` · `GET /api/admin/categories` · `PATCH /api/admin/categories/[id]` · `GET /api/admin/reviews` · `PATCH /api/admin/reviews/[id]` · `GET /api/admin/orders` · `PATCH /api/admin/orders/[id]` · `GET /api/admin/settings`

**Student (4):**
`POST /api/enrollments` · `PATCH /api/progress` · `POST /api/reviews` · `POST /api/quizzes/[id]/submit`

**Other (5):**
`POST /api/upload` · `GET /api/notifications` · `PATCH /api/notifications/[id]/read` · `PATCH /api/notifications/read-all` · `POST /api/newsletter`

## E-Commerce Flow

```
Cart → Checkout → Create Order (status: pending) → Mock Payment Page
  → Select method (VNPay/MoMo/Bank Transfer) → Show QR code
  → POST /api/orders/[id]/pay → status: success → Auto-create enrollments
  → Redirect to success page
```

Payment is mock (simulated). `POST /api/orders/[id]/pay` marks order as `success` and creates enrollment records for each course in the order.

## Route Groups (App Router)

| Group | Paths | Access |
|-------|-------|--------|
| `(public)` | `/`, `/courses`, `/courses/[slug]`, `/categories` | Everyone |
| `(auth)` | `/login`, `/register`, `/forgot-password`, `/reset-password` | Unauthenticated only |
| `(student)` | `/dashboard`, `/my-courses`, `/learn/[slug]`, `/cart`, `/wishlist`, `/checkout`, `/orders`, `/orders/[id]`, `/mock-payment/[orderId]`, `/checkout/success/[orderId]`, `/checkout/failed/[orderId]` | Student role |
| `(instructor)` | `/instructor/*` (courses, earnings, profile) | Instructor or admin |
| `(admin)` | `/admin/*` (users, courses, categories, reviews, orders, settings) | Admin only |

## Authentication Flow

1. Login → `/api/auth/login` → Directus `/auth/login` (mode: json) → sets `access_token` (15min), `refresh_token` (7d), `user_role` cookies
2. `middleware.ts` reads cookies for route protection and role-based redirects; auto-refreshes expired tokens via Directus `/auth/refresh`
3. Server API routes use `directusFetch()` from `lib/directus-fetch.ts` — auto-attaches token, auto-refreshes on 401, retries once
4. Client components use `apiFetch()` from `lib/api-fetch.ts` — intercepts 401, calls `/api/auth/refresh`, retries with mutex dedup
5. Server pages use `requireAuth()` / `requireRole()` from `lib/dal.ts`
6. Client components use `useAuth()` hook backed by Zustand store (`stores/auth-store.ts`)
7. Directus role "administrator" is normalized to "admin" everywhere via `getUserRole()`

## Data Fetching Patterns

- **Server components**: Import query functions from `lib/queries/*.ts` which use `@directus/sdk` directly
- **Client mutations**: POST/PATCH/DELETE via `apiFetch()`/`apiPost()`/`apiPatch()`/`apiDelete()` from `lib/api-fetch.ts` to Next.js API routes (`app/api/`), which proxy to Directus
- **API routes → Directus**: Use `directusFetch()` from `lib/directus-fetch.ts` (auto token + refresh). Helper `getCurrentUserId()` for routes needing user ID
- **Pagination**: Use `readItems()` + `aggregate()` together for list+count queries
- **Authenticated requests (SDK)**: `getDirectusClient(token)` from `lib/directus.ts` — token comes from `requireAuth()`
- **Auth routes exception**: Login/register/logout use `apiFetch` with `skipRetry: true` to avoid infinite refresh loops

Query modules in `lib/queries/`: `courses.ts`, `categories.ts`, `instructor.ts`, `enrollments.ts`, `admin.ts`, `notifications.ts`

## Key Files

| File | Purpose |
|------|---------|
| `lib/directus.ts` | Directus SDK client init, `getDirectusClient(token)`, `getAssetUrl()` |
| `lib/directus-fetch.ts` | Server-side fetch wrapper for API routes — auto token, auto refresh on 401, `getCurrentUserId()`, `getDirectusError()` |
| `lib/api-fetch.ts` | Client-side fetch wrapper — 401 retry with refresh mutex, `apiGet/Post/Patch/Delete()` helpers |
| `lib/dal.ts` | Data Access Layer — `getSession()`, `requireAuth()`, `requireRole()`, `getUserRole()` |
| `lib/validations.ts` | Shared API input validation — `sanitizePagination()`, `sanitizeSearch()`, `isValidCourseStatus()`, `isValidOrderStatus()`, `isValidReviewStatus()`, `isValidSlug()` |
| `lib/notifications-helper.ts` | Helper to create Directus notifications from API routes |
| `middleware.ts` | Route protection, role-based redirects, token refresh with anti-loop (`_refreshed` param) |
| `stores/auth-store.ts` | Zustand store for client-side auth state |
| `hooks/use-auth.ts` | `useAuth()` hook — `isLoggedIn`, `isAdmin`, `isInstructor`, `role` |
| `types/index.ts` | All TypeScript interfaces (User, Course, CartItem, Order, etc.) |

## Feature Components (`components/features/`)

| Component | Purpose |
|-----------|---------|
| `course-card.tsx` | Course grid card (thumbnail, title, rating, price) |
| `course-sidebar.tsx` | Course player lesson navigation sidebar |
| `instructor-sidebar.tsx` | Instructor dashboard sidebar navigation |
| `student-sidebar.tsx` | Student dashboard sidebar navigation |
| `logout-button.tsx` | Logout button with confirmation |
| `media-uploader.tsx` | Image/file upload component with Directus integration |
| `notification-bell.tsx` | Header notification icon with unread badge |
| `notifications-list.tsx` | Full notification list with mark-read |
| `pagination.tsx` | Reusable pagination component |
| `progress-tracker.tsx` | Course progress bar and lesson completion |
| `quiz-player.tsx` | Quiz taking interface (questions, timer, submit) |
| `rating-stars.tsx` | Star rating display and input |
| `review-card.tsx` | Individual review display card (supports `replySlot` prop + instructor reply display) |
| `review-form.tsx` | Review submission form (stars + comment) |
| `review-reply-form.tsx` | Instructor reply form for reviews (toggle open/close, edit existing) |
| `rich-text-editor.tsx` | TipTap rich text editor wrapper |
| `search-input.tsx` | Search input with debounce |
| `wishlist-button.tsx` | Wishlist toggle button (heart icon) |
| `course-recommendations.tsx` | Horizontal scrollable course recommendation section |
| `share-certificate-button.tsx` | Certificate sharing (Facebook, LinkedIn, copy link) + PDF download |
| `../layout/logo.tsx` | `KognifyLogo` wordmark component used in navbar and footer |

## Course Detail Tab Navigation (`courses/[slug]/course-tabs.tsx`)

- `CourseTabs` — `"use client"` component with sticky tab bar: Tổng quan, Nội dung khoá học, Chi tiết, Giảng viên, Đánh giá
- Active tab tracked via `IntersectionObserver` (most-visible section wins using `intersectionRatio`)
- Click handler: calls `window.scrollTo({ behavior: "smooth" })` with 96px offset for sticky header, sets `isClickScrolling` ref to prevent observer from overriding the active tab during the 800ms scroll animation
- Active style: `bg-[#eef3ff] text-[#2f57ef]`; inactive hover: `hover:bg-[#eef3ff] hover:text-[#2f57ef]`

## Course Recommendations

Query functions in `lib/queries/courses.ts`:
- `getRecommendedByCategories(enrolledCourseIds, enrolledCategoryIds, limit)` — courses from student's studied categories, excluding enrolled
- `getRecommendedByInstructors(enrolledCourseIds, enrolledInstructorIds, limit)` — courses from studied instructors
- `getTrendingCourses(enrolledCourseIds, limit)` — highest enrollment courses, excluding enrolled

Used in: `/dashboard` and `/my-courses` pages via `CourseRecommendationSection` component. Extracts category/instructor IDs from student's enrollment data.

## Instructor Features

### Earnings Page (`/instructor/earnings`)
- Server component with `requireRole(["instructor"])`
- 4 stat cards: total revenue, this month, last month, total orders
- Monthly revenue bar chart (`EarningsChart` — Recharts BarChart, `"use client"`)
- Per-course revenue breakdown table with percentages
- Query: `getInstructorRevenueDetails(token)` in `lib/queries/instructor.ts`

### Course Cloning
- `POST /api/instructor/courses/[id]/clone` — deep clones course + modules + lessons
- Sets cloned course to `status: "draft"`, title: `"Bản sao - {original}"`
- Creates instructor junction for the cloning user
- UI: "Nhân bản" button in course dropdown menu (`courses-client.tsx`)

### Review Reply
- `PATCH /api/instructor/reviews/[reviewId]/reply` — instructor replies to student reviews
- Verifies instructor owns the course the review belongs to
- `Review` type extended with `instructor_reply` and `instructor_reply_at` fields
- UI: `ReviewReplyForm` component in course reviews page, reply shown in `ReviewCard`

### Course Students Table
- Search by student name/email, filter by status (active/completed/dropped), sort by date/progress/name
- Client component: `course-students-table.tsx`

## Student UX Enhancements

### Continue Learning (Homepage)
- `ContinueLearningSection` component (`components/home/continue-learning.tsx`) — client component
- Shows up to 4 in-progress courses with progress bars on the homepage (below hero)
- Wrapped in `<Suspense>` on the homepage; hidden when not logged in or no enrollments

### My Courses — Search/Sort
- Client component `my-courses-client.tsx` with search by course name + sort (progress, date, name A-Z)
- Uses `SearchInput` component with debounce

### Order Detail Page (`/orders/[id]`)
- Status timeline, course list, price breakdown, payment method
- "Thanh toán lại" button for pending orders, "In hoá đơn" with print CSS

### Notification Filters
- Tab filters in `notifications-list.tsx`: Tất cả, Khoá học, Đánh giá, Hệ thống
- Client-side filtering on `initialNotifications`

### Certificate Sharing
- `ShareCertificateButton` in certificate page
- Share to Facebook, LinkedIn, copy link, download PDF (`window.print()`)

## Public Page Enhancements

### Homepage
- Platform stats (total courses, students, instructors) via `getPlatformStats()` aggregate queries
- Testimonials section using top reviews with star ratings and course links
- `NewsletterStrip` with working email form → `POST /api/newsletter`

### FAQ Search
- `FaqSearch` client component with keyword filtering and text highlighting
- Icon names passed as strings (not components) to avoid serialization issues

### Category & Course Detail
- Category page: sort (newest, popular, rating, price) + level/price filters + breadcrumbs
- Course detail: `CourseTabs` client component with IntersectionObserver active tab highlighting + "Khoá học khác của giảng viên" section
- Course detail dark mode: all `bg-white` → `bg-card`, `bg-[#f6f8fc]` → `bg-muted/30`, `text-slate-*` → `text-foreground`/`text-muted-foreground`, `border-slate-*` → `border-border`

## Loading States

Skeleton `loading.tsx` files added for 15+ routes:
- Student: my-courses, orders, orders/[id], cart, wishlist, notifications, my-certificates, profile
- Public: courses/[slug], categories, categories/[slug]
- Instructor: courses, earnings, profile

## Important Conventions

### Directus SDK Typing
Nested field dot notation requires type assertion:
```ts
fields: ["id", "role.name"] as never[]
```

### Build Requirements
- Pages using `useSearchParams()` must be wrapped in `<Suspense>` (split into server page + client component)
- Server pages fetching from Directus need `export const dynamic = 'force-dynamic'`

### Styling
- Tailwind CSS v4 (`@import "tailwindcss"` in globals.css, no `tailwind.config.ts`)
- shadcn/ui with new-york style, neutral base color, OKLch color space
- Dark mode via `next-themes` with `.dark` class

### Forms
React Hook Form + Zod v4 + `@hookform/resolvers`. Note: Zod v4 uses `message` instead of `required_error` in `z.enum()`.

### Toast Notifications
Use `sonner` (not the deprecated shadcn `toast` component).

### Directus Public Role & Review Status Field
- The public role does NOT return the `status` field on `reviews` — it is excluded by Directus permissions
- Never filter client-visible reviews with `review.status === "approved"` — `status` will be `undefined`, silently excluding all reviews
- Correct pattern: `!r.status || r.status === "approved"` (treat missing status as approved)

### `fetchRatingsByCourse` Env Var Pattern
- **Always read `process.env.DIRECTUS_STATIC_TOKEN` inside the function body**, never at module scope
- Module-level `const serverToken = process.env.DIRECTUS_STATIC_TOKEN` can be `undefined` in some Next.js evaluation contexts (e.g., during build-time static analysis)
- Same rule applies to any query function that builds its own `fetch()` call outside the Directus SDK

### `enrolled_at` Field — PATCH After Create
- Directus ignores `enrolled_at` on `POST /items/enrollments` (auto-sets to current timestamp)
- Pattern: create enrollment first, then immediately `PATCH /items/enrollments/{id}` with `{ enrolled_at: targetDate }`
- Same issue applies to `seed-demo-data.mjs` — all original enrollments land on today's date unless patched
- `fix-enrolled-at.mjs` can repair existing data by matching enrollments to their order's `paid_at`

### Admin Orders — Pending First (Server-Side)
- `GET /api/admin/orders` uses two parallel Directus queries when `status=all`:
  1. Fetch ALL pending orders (`limit=-1`) → always displayed at top
  2. Fetch non-pending with normal pagination + adjusted offset
- Pagination math: `pendingInPage = max(0, min(limit, pendingCount - offset))`, `npOffset = max(0, offset - pendingCount)`
- When a specific status tab is selected, falls back to a single normal query

### Admin Reports — Popular Courses ID Type
- Course IDs in Directus are UUID strings, NOT numbers
- Never do `Number(course.id)` — returns `NaN` for UUIDs, causing `filter(course.id > 0)` to drop all courses
- `popularCourses` in `ReportDataResult` uses `id: string`; filter is `Boolean(course.id) && total_enrollments > 0`

### Admin Reports — AI Service Detection
- `getReportData()` returns `aiServiceOnline: boolean` (true if `GET /v1/admin/metrics` succeeds)
- Reports page shows 3 AI metric cards + upload/indexing tools only when `aiServiceOnline === true`
- When offline: single card with `WifiOff` icon + address of AI service (`AI_API_URL`)

### Admin Sidebar — "Trang chủ học viên"
- Links to `/` (public homepage), NOT `/dashboard`
- `/dashboard` is student-only; middleware redirects admin back to `/admin` causing a loop

### Vietnamese Text
- All API error messages and notifications use correct Vietnamese diacritics (audited across 15+ files)
- Currency formatting: `Intl.NumberFormat("vi-VN")` for consistent VND display
- Client components receiving icon data: pass icon name strings, not LucideIcon components (to avoid serialization errors)

## Admin Panel

### Features
- **Dashboard**: 6 stat cards, revenue/enrollment/course-status charts (Recharts), quick actions, activity feeds
- **Users**: Table with bulk actions (activate/suspend), CSV export, case-insensitive search, role/status filters
- **Courses**: Table with bulk actions (publish/archive), CSV export, search, status tabs, pending badge
- **Orders**: Table with status tabs, date range filter, CSV export, order detail page (`/admin/orders/[id]`) with timeline + actions; pending orders always float to top of page 1
- **Categories**: CRUD with slug uniqueness check, circular parent_id detection
- **Reviews**: Status moderation (approve/reject/hide)
- **Reports**: Revenue summary cards with date range filter, enrollment trend + rating distribution charts, popular courses + top instructors tables; AI metrics shown only when AI service is online

### Admin UI Conventions
- Use explicit gray color classes (`text-gray-900`, `text-gray-500`, `text-gray-700`) instead of CSS variables (`text-muted-foreground`, `text-foreground`) for reliable contrast on all displays
- Table headers: `bg-gray-100`, `text-gray-700 font-semibold text-xs uppercase tracking-wider`
- Outline buttons: always add `border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-700`
- Page titles: `text-2xl font-bold tracking-tight text-gray-900`
- Search uses `_icontains` (case-insensitive) for Directus filters
- Refresh buttons use `useTransition()` + `router.push("/admin/<page>")` to reset all filters
- Tables use `hidden lg:block` for desktop + mobile card layout (`lg:hidden`) for responsive design
- Sidebar shows badge counts (pending courses, orders, reviews, applications) fetched in admin layout

### Admin Loading & Error States
- Every admin page has a `loading.tsx` with skeleton UI matching its layout (dashboard, users, courses, orders, reviews, categories, reports, settings, instructor-applications, instructor-reactivations)
- Global error boundary at `(admin)/error.tsx` catches all admin errors
- Detail pages (`[id]`) have specific `error.tsx` with Vietnamese messages + "Quay lại danh sách" link (orders, users, courses, instructor-applications)

### Admin Query Types (`lib/queries/admin.ts`)
- All query functions have explicit return types
- Exported interfaces: `AdminUser`, `AdminUserDetail`, `AdminReview`, `RevenueStatsResult`, `EnrollmentTrendItem`, `CourseStatusItem`, `ReportDataResult`, `LatestEnrollment`, `LatestReview`

### Admin Charts (Recharts)
- `dashboard-charts.tsx`: RevenueChart (BarChart), EnrollmentChart (LineChart), CourseStatusChart (PieChart donut)
- `report-charts.tsx`: EnrollmentTrendChart (LineChart), RatingDistributionChart (horizontal BarChart)
- All chart components are `"use client"` since Recharts requires client-side rendering
- Revenue query functions in `lib/queries/admin.ts`: `getRevenueStats()`, `getEnrollmentTrend()`, `getCourseStatusDistribution()`
- Instructor charts: `earnings-chart.tsx` (BarChart for monthly revenue)

### Platform Stats Query
- `getPlatformStats()` in `lib/queries/courses.ts` — 3 parallel aggregate queries for courses count, distinct enrolled students, distinct instructors
- Returns `PlatformStats` interface: `totalCourses`, `totalStudents`, `totalInstructors`

## Environment Variables

Frontend (`frontend/.env.local`):
- `NEXT_PUBLIC_DIRECTUS_URL` — Directus API URL (default: `http://localhost:8055`)
- `DIRECTUS_STATIC_TOKEN` — Static token for server-side requests
- `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL`
- `AI_API_URL` — AI backend service URL (default: `http://localhost:8090`)
- `AI_INTERNAL_KEY` — Auth key for AI service internal calls

Backend (`backend/.env`):
- `DB_PASSWORD`, `DIRECTUS_KEY`, `DIRECTUS_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`
