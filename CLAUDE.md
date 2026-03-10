# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vietnamese (vi locale) e-learning platform (Udemy-like) with e-commerce (cart, wishlist, orders, mock payment). Monorepo:
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
```

Directus admin panel runs at `http://localhost:8055`.

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

## API Route Map (~43 routes in `app/api/`)

**Auth (7):**
`POST /api/auth/login` · `POST /api/auth/register` · `POST /api/auth/logout` · `POST /api/auth/refresh` · `POST /api/auth/forgot-password` · `POST /api/auth/reset-password` · `GET /api/auth/me`

**E-Commerce (7):**
`GET|POST /api/cart` · `DELETE /api/cart/[id]` · `GET|POST /api/wishlist` · `DELETE /api/wishlist/[id]` · `GET|POST /api/orders` · `GET /api/orders/[id]` · `POST /api/orders/[id]/pay`

**Instructor (9):**
`GET /api/instructor/courses` · `GET /api/instructor/courses/[id]` · `GET|POST /api/instructor/courses/[id]/modules` · `PATCH /api/instructor/courses/[id]/modules/[moduleId]` · `PATCH /api/instructor/courses/[id]/modules/reorder` · `POST /api/instructor/courses/[id]/lessons` · `GET /api/instructor/courses/[id]/lessons/[lessonId]` · `POST /api/instructor/quizzes` · `GET|PATCH /api/instructor/quizzes/[id]`

**Admin (11):**
`GET /api/admin/users` · `GET /api/admin/users/[id]` · `GET /api/admin/users/roles` · `GET /api/admin/courses` · `GET|PATCH /api/admin/courses/[id]` · `GET /api/admin/categories` · `PATCH /api/admin/categories/[id]` · `GET /api/admin/reviews` · `PATCH /api/admin/reviews/[id]` · `GET /api/admin/orders` · `PATCH /api/admin/orders/[id]` · `GET /api/admin/settings`

**Student (4):**
`POST /api/enrollments` · `PATCH /api/progress` · `POST /api/reviews` · `POST /api/quizzes/[id]/submit`

**Other (2):**
`POST /api/upload` · `GET /api/notifications` · `PATCH /api/notifications/[id]/read` · `PATCH /api/notifications/read-all`

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
| `(student)` | `/dashboard`, `/my-courses`, `/learn/[slug]`, `/cart`, `/wishlist`, `/checkout`, `/orders`, `/mock-payment/[orderId]`, `/checkout/success/[orderId]`, `/checkout/failed/[orderId]` | Student role |
| `(instructor)` | `/instructor/*` | Instructor or admin |
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
| `review-card.tsx` | Individual review display card |
| `review-form.tsx` | Review submission form (stars + comment) |
| `rich-text-editor.tsx` | TipTap rich text editor wrapper |
| `search-input.tsx` | Search input with debounce |
| `wishlist-button.tsx` | Wishlist toggle button (heart icon) |

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

## Admin Panel

### Features
- **Dashboard**: 6 stat cards, revenue/enrollment/course-status charts (Recharts), quick actions, activity feeds
- **Users**: Table with bulk actions (activate/suspend), CSV export, case-insensitive search, role/status filters
- **Courses**: Table with bulk actions (publish/archive), CSV export, search, status tabs, pending badge
- **Orders**: Table with status tabs, date range filter, CSV export, order detail page (`/admin/orders/[id]`) with timeline + actions
- **Categories**: CRUD with slug uniqueness check, circular parent_id detection
- **Reviews**: Status moderation (approve/reject/hide)
- **Reports**: Revenue summary cards with date range filter, enrollment trend + rating distribution charts, popular courses + top instructors tables

### Admin UI Conventions
- Use explicit gray color classes (`text-gray-900`, `text-gray-500`, `text-gray-700`) instead of CSS variables (`text-muted-foreground`, `text-foreground`) for reliable contrast on all displays
- Table headers: `bg-gray-100`, `text-gray-700 font-semibold text-xs uppercase tracking-wider`
- Outline buttons: always add `border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-700`
- Page titles: `text-2xl font-bold tracking-tight text-gray-900`
- Search uses `_icontains` (case-insensitive) for Directus filters
- Refresh buttons use `useTransition()` + `router.push("/admin/<page>")` to reset all filters
- Tables use `hidden lg:block` for desktop + mobile card layout (`lg:hidden`) for responsive design
- Sidebar shows badge counts (pending courses, orders, reviews, applications) fetched in admin layout

### Admin Charts (Recharts)
- `dashboard-charts.tsx`: RevenueChart (BarChart), EnrollmentChart (LineChart), CourseStatusChart (PieChart donut)
- `report-charts.tsx`: EnrollmentTrendChart (LineChart), RatingDistributionChart (horizontal BarChart)
- All chart components are `"use client"` since Recharts requires client-side rendering
- Revenue query functions in `lib/queries/admin.ts`: `getRevenueStats()`, `getEnrollmentTrend()`, `getCourseStatusDistribution()`

## Environment Variables

Frontend (`frontend/.env.local`):
- `NEXT_PUBLIC_DIRECTUS_URL` — Directus API URL (default: `http://localhost:8055`)
- `DIRECTUS_STATIC_TOKEN` — Static token for server-side requests
- `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL`

Backend (`backend/.env`):
- `DB_PASSWORD`, `DIRECTUS_KEY`, `DIRECTUS_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`
