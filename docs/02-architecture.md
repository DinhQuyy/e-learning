# KIẾN TRÚC HỆ THỐNG

## Hệ Thống Quản Lý Khoá Học Trực Tuyến (E-Learning Platform)

---

## 1. Tổng quan kiến trúc (System Overview)

Hệ thống được thiết kế theo kiến trúc **3-tier (3 tầng)** với sự tách biệt rõ ràng giữa tầng trình diễn (Presentation), tầng xử lý nghiệp vụ (Business Logic) và tầng dữ liệu (Data). Directus đóng vai trò là headless CMS cung cấp REST API tự động, trong khi Next.js xử lý server-side rendering và API proxy.

### 1.1. Sơ đồ kiến trúc tổng quan

```
                            ┌─────────────────────────────────────────────────────┐
                            │                    INTERNET                         │
                            └────────────────────────┬────────────────────────────┘
                                                     │
                                                     ▼
                            ┌─────────────────────────────────────────────────────┐
                            │               CDN (Vercel Edge Network)             │
                            │          Static Assets, Image Optimization          │
                            └────────────────────────┬────────────────────────────┘
                                                     │
                     ┌───────────────────────────────┼───────────────────────────────┐
                     │                               │                               │
                     ▼                               ▼                               ▼
          ┌──────────────────┐           ┌──────────────────┐           ┌──────────────────┐
          │    Browser       │           │    Browser       │           │    Browser       │
          │    (Client)      │           │    (Client)      │           │    (Client)      │
          │  React Hydration │           │  React Hydration │           │  React Hydration │
          └────────┬─────────┘           └────────┬─────────┘           └────────┬─────────┘
                   │                              │                              │
                   └──────────────────────────────┼──────────────────────────────┘
                                                  │
                                                  ▼
                   ┌──────────────────────────────────────────────────────────────┐
                   │                     NEXT.JS 16 SERVER                       │
                   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
                   │  │ App Router   │  │ API Routes   │  │ Middleware   │       │
                   │  │ (SSR/SSG)    │  │ (/api/*)     │  │ (Auth Guard) │       │
                   │  └──────┬───────┘  └──────┬───────┘  └──────────────┘       │
                   │         │                 │                                   │
                   │  ┌──────┴─────────────────┴───────┐                          │
                   │  │      Server Actions / Fetch     │                          │
                   │  │      (Directus SDK / REST)      │                          │
                   │  └──────────────┬─────────────────┘                          │
                   └─────────────────┼────────────────────────────────────────────┘
                                     │
                                     ▼
                   ┌──────────────────────────────────────────────────────────────┐
                   │                     DIRECTUS 11.x (Docker)                   │
                   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
                   │  │  REST API    │  │  Auth/RBAC   │  │  File        │       │
                   │  │  Engine      │  │  Engine      │  │  Storage     │       │
                   │  └──────┬───────┘  └──────────────┘  └──────────────┘       │
                   │         │                                                    │
                   │  ┌──────┴──────────────────────────────┐                    │
                   │  │          Directus Core               │                    │
                   │  │   (Query Engine, Hooks, Extensions)  │                    │
                   │  └──────────────┬──────────────────────┘                    │
                   └─────────────────┼────────────────────────────────────────────┘
                                     │
                          ┌──────────┴──────────┐
                          │                     │
                          ▼                     ▼
               ┌──────────────────┐  ┌──────────────────┐
               │   PostgreSQL 16  │  │     Redis 7      │
               │   (Primary DB)   │  │   (Cache Layer)  │
               │                  │  │                  │
               │  - Collections   │  │  - Query Cache   │
               │  - Relationships │  │  - Session Store  │
               │  - Indexes       │  │  - Rate Limiting  │
               └──────────────────┘  └──────────────────┘
```

---

## 2. Kiến trúc chi tiết các tầng

### 2.1. Tầng Trình diễn (Presentation Layer) - Next.js Frontend

#### Cấu trúc thư mục dự án Next.js

```
src/
├── app/                          # App Router
│   ├── (public)/                 # Route group: Trang công cộng
│   │   ├── page.tsx              # Trang chủ
│   │   ├── courses/
│   │   │   ├── page.tsx          # Danh sách khoá học
│   │   │   └── [slug]/
│   │   │       └── page.tsx      # Chi tiết khoá học
│   │   ├── categories/
│   │   │   └── page.tsx          # Danh mục
│   │   └── instructors/
│   │       └── [id]/
│   │           └── page.tsx      # Hồ sơ giảng viên
│   ├── (auth)/                   # Route group: Xác thực
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (dashboard)/              # Route group: Dashboard (Protected)
│   │   ├── student/
│   │   │   ├── page.tsx          # Student dashboard
│   │   │   ├── courses/page.tsx  # My courses
│   │   │   ├── learn/[slug]/page.tsx  # Course player
│   │   │   ├── profile/page.tsx
│   │   │   └── notifications/page.tsx
│   │   ├── instructor/
│   │   │   ├── page.tsx          # Instructor dashboard
│   │   │   ├── courses/
│   │   │   │   ├── page.tsx      # Course list
│   │   │   │   ├── new/page.tsx  # Create course
│   │   │   │   └── [id]/
│   │   │   │       ├── edit/page.tsx     # Edit course
│   │   │   │       ├── modules/page.tsx  # Manage modules
│   │   │   │       └── students/page.tsx # View students
│   │   │   ├── reviews/page.tsx
│   │   │   └── profile/page.tsx
│   │   └── admin/
│   │       ├── page.tsx          # Admin dashboard
│   │       ├── users/
│   │       │   ├── page.tsx
│   │       │   └── [id]/page.tsx
│   │       ├── courses/page.tsx
│   │       ├── categories/page.tsx
│   │       ├── reviews/page.tsx
│   │       ├── reports/page.tsx
│   │       └── settings/page.tsx
│   ├── api/                      # API Routes (Proxy)
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   ├── register/route.ts
│   │   │   ├── logout/route.ts
│   │   │   ├── refresh/route.ts
│   │   │   ├── forgot-password/route.ts
│   │   │   └── reset-password/route.ts
│   │   ├── enrollments/route.ts
│   │   ├── progress/route.ts
│   │   ├── reviews/route.ts
│   │   └── quizzes/
│   │       └── [id]/
│   │           └── submit/route.ts
│   ├── layout.tsx                # Root layout
│   ├── not-found.tsx
│   └── error.tsx
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── layout/                   # Header, Footer, Sidebar
│   ├── shared/                   # Shared components
│   ├── courses/                  # Course-related components
│   ├── dashboard/                # Dashboard components
│   └── forms/                    # Form components
├── lib/
│   ├── directus.ts               # Directus SDK client
│   ├── api.ts                    # API helper functions
│   ├── auth.ts                   # Auth utilities
│   ├── utils.ts                  # General utilities
│   └── validations/              # Zod schemas
├── hooks/                        # Custom React hooks
├── stores/                       # Zustand stores
│   ├── auth-store.ts
│   ├── course-store.ts
│   └── notification-store.ts
├── types/                        # TypeScript type definitions
│   ├── course.ts
│   ├── user.ts
│   ├── enrollment.ts
│   └── index.ts
├── styles/
│   └── globals.css               # Tailwind CSS imports
└── middleware.ts                  # Next.js middleware (auth guard)
```

#### Rendering Strategy

| Trang                | Strategy                 | Lý do                                            |
| -------------------- | ------------------------ | ------------------------------------------------ |
| Trang chủ            | ISR (revalidate: 60s)    | Nội dung thay đổi ít, cần SEO tốt                |
| Danh sách khoá học   | SSR + Client-side filter | Cần SEO, filter realtime                         |
| Chi tiết khoá học    | ISR (revalidate: 300s)   | Nội dung ít thay đổi, cần SEO                    |
| Trang danh mục       | SSG + ISR                | Rất ít thay đổi                                  |
| Trang login/register | SSR                      | Redirect nếu đã login                            |
| Dashboard (tất cả)   | SSR (protected)          | Dữ liệu cá nhân, cần auth                        |
| Course Player        | SSR (protected)          | Dữ liệu cá nhân, cần auth, cần realtime progress |

#### State Management (Zustand)

```
Zustand Stores
├── useAuthStore          # User info, tokens, login/logout actions
├── useCourseStore        # Course editor state (multi-step form)
├── useNotificationStore  # Notification count, list
└── usePlayerStore        # Video player state, current lesson, progress
```

### 2.2. Tầng Nghiệp vụ (Business Logic Layer) - Next.js API Routes + Directus

#### Next.js API Routes (Proxy Layer)

API Routes trong Next.js đóng vai trò proxy, xử lý các nghiệp vụ phức tạp trước khi gọi Directus API:

```
Next.js API Routes
├── /api/auth/*           # Xử lý authentication flow
│   ├── Login             # Gọi Directus auth, set cookies
│   ├── Register          # Validate + tạo user trong Directus
│   ├── Logout            # Clear tokens
│   └── Refresh           # Refresh access token
├── /api/enrollments      # Enrollment business logic
│   └── POST              # Check duplicate, create enrollment, update stats
├── /api/progress         # Progress tracking logic
│   └── PATCH             # Update progress, calculate percentage
├── /api/reviews          # Review business logic
│   └── POST              # Validate enrollment, create review, update avg rating
├── /api/quizzes/[id]/submit  # Quiz submission logic
│   └── POST              # Grade answers, calculate score, save attempt
├── /api/cart             # Shopping cart
│   ├── GET               # List cart items
│   ├── POST              # Add course to cart
│   └── DELETE /[id]      # Remove from cart
├── /api/wishlist         # Wishlist
│   ├── GET               # List wishlist items
│   ├── POST              # Add to wishlist
│   └── DELETE /[id]      # Remove from wishlist
├── /api/orders           # Order management
│   ├── GET               # List user orders
│   ├── POST              # Create order from cart
│   └── GET /[id]         # Order details
├── /api/orders/[id]/pay  # Mock payment
│   └── POST              # Process payment, create enrollments
└── /api/admin/*          # Admin endpoints
    ├── /settings          # Platform settings (GET/PATCH)
    ├── /orders            # Order management (GET/PATCH)
    ├── /reviews           # Review moderation (GET/PATCH/DELETE)
    └── /users/roles       # Role listing (GET)
```

#### Directus (Headless CMS + API Engine)

Directus cung cấp:

- **REST API tự động** cho tất cả collections (CRUD operations).
- **Authentication Engine** với JWT tokens.
- **RBAC System** với roles & permissions granular đến field level.
- **File Storage** cho upload images và documents.
- **Hooks & Extensions** cho custom logic (event triggers).

### 2.3. Tầng Dữ liệu (Data Layer) - PostgreSQL + Redis

#### PostgreSQL 16

- **Primary Database** lưu trữ toàn bộ dữ liệu hệ thống.
- **Indexing Strategy:**
  - B-tree index trên các foreign key fields.
  - B-tree index trên các trường thường xuyên filter/sort (status, slug, created_at).
  - Composite unique index trên (user_id, course_id) cho enrollments và reviews.
  - GIN index trên JSON fields nếu cần query.

#### Redis 7

- **Query Caching:** Cache kết quả queries phổ biến (courses list, categories).
- **Session Store:** Lưu trữ session data và refresh tokens.
- **Rate Limiting:** Counter cho rate limiting trên auth endpoints.

---

## 3. Component Diagram

### 3.1. Frontend Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS APPLICATION                          │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      LAYOUT COMPONENTS                       │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │   │
│  │  │  Header   │  │  Footer  │  │  Sidebar │  │Breadcrumb│   │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      PAGE COMPONENTS                         │   │
│  │                                                               │   │
│  │  ┌─────────────────┐  ┌─────────────────┐                   │   │
│  │  │  PUBLIC PAGES    │  │  AUTH PAGES      │                   │   │
│  │  │  - HomePage      │  │  - LoginPage     │                   │   │
│  │  │  - CoursesPage   │  │  - RegisterPage  │                   │   │
│  │  │  - CourseDetail   │  │  - ForgotPwdPage │                   │   │
│  │  │  - CategoriesPage│  │  - ResetPwdPage  │                   │   │
│  │  │  - InstructorPage│  │                   │                   │   │
│  │  └─────────────────┘  └─────────────────┘                   │   │
│  │                                                               │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐│   │
│  │  │  STUDENT PAGES   │  │  INSTRUCTOR PGS  │  │  ADMIN PAGES ││   │
│  │  │  - Dashboard     │  │  - Dashboard     │  │  - Dashboard ││   │
│  │  │  - MyCourses     │  │  - CourseList    │  │  - Users     ││   │
│  │  │  - CoursePlayer  │  │  - CourseForm    │  │  - Courses   ││   │
│  │  │  - Profile       │  │  - ModuleManager │  │  - Categories││   │
│  │  │  - Notifications │  │  - LessonForm    │  │  - Reviews   ││   │
│  │  │                   │  │  - QuizBuilder   │  │  - Reports   ││   │
│  │  │                   │  │  - Students      │  │  - Settings  ││   │
│  │  │                   │  │  - Reviews       │  │              ││   │
│  │  └─────────────────┘  └─────────────────┘  └──────────────┘│   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    SHARED COMPONENTS                          │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │   │
│  │  │CourseCard│ │DataTable │ │RichEditor│ │StarRating│      │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │   │
│  │  │VideoPlay.│ │FileUpload│ │SearchBar │ │StatsCard │      │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │   │
│  │  │Pagination│ │EmptyState│ │ConfirmDlg│ │ProgressBr│      │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────┐                      │
│  │            SHADCN/UI BASE                 │                      │
│  │  Button, Input, Select, Dialog, Card,     │                      │
│  │  Table, Tabs, Toast, Badge, Avatar,       │                      │
│  │  Dropdown, Sheet, Accordion, Form, etc.   │                      │
│  └──────────────────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2. Backend Components (Directus)

```
┌─────────────────────────────────────────────────────────────────────┐
│                      DIRECTUS 11.x (Docker)                         │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                       API LAYER                               │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │   │
│  │  │  REST API     │  │  GraphQL API │  │  WebSocket   │      │   │
│  │  │  /items/*     │  │  /graphql    │  │  (realtime)  │      │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    SERVICE LAYER                               │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │   │
│  │  │  Items    │  │  Auth    │  │  Users   │  │  Files   │   │   │
│  │  │  Service  │  │  Service │  │  Service │  │  Service │   │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │   │
│  │  │  Roles   │  │  Permis. │  │  Flows   │                  │   │
│  │  │  Service │  │  Service │  │  Service │                  │   │
│  │  └──────────┘  └──────────┘  └──────────┘                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    DATA LAYER                                 │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │   │
│  │  │  Knex.js     │  │  Schema      │  │  Migration   │      │   │
│  │  │  (Query      │  │  Inspector   │  │  Engine      │      │   │
│  │  │   Builder)   │  │              │  │              │      │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Data Flow Diagrams

### 4.1. Luồng Xác thực (Authentication Flow)

```
┌────────┐     ┌──────────┐     ┌──────────────┐     ┌──────────┐
│ Client │     │ Next.js  │     │  Directus    │     │PostgreSQL│
│Browser │     │ Server   │     │  Auth API    │     │          │
└───┬────┘     └────┬─────┘     └──────┬───────┘     └────┬─────┘
    │               │                   │                   │
    │  1. POST      │                   │                   │
    │  /api/auth/   │                   │                   │
    │  login        │                   │                   │
    │  {email, pwd} │                   │                   │
    │──────────────▶│                   │                   │
    │               │                   │                   │
    │               │  2. POST          │                   │
    │               │  /auth/login      │                   │
    │               │  {email, pwd}     │                   │
    │               │──────────────────▶│                   │
    │               │                   │                   │
    │               │                   │  3. SELECT user   │
    │               │                   │  WHERE email=?    │
    │               │                   │─────────────────▶│
    │               │                   │                   │
    │               │                   │  4. User data     │
    │               │                   │◀─────────────────│
    │               │                   │                   │
    │               │                   │  5. Verify pwd    │
    │               │                   │  Generate JWT     │
    │               │                   │                   │
    │               │  6. {access_token,│                   │
    │               │   refresh_token}  │                   │
    │               │◀──────────────────│                   │
    │               │                   │                   │
    │               │  7. Set HTTP-only │                   │
    │               │  cookies          │                   │
    │               │                   │                   │
    │  8. 200 OK    │                   │                   │
    │  {user, token}│                   │                   │
    │◀──────────────│                   │                   │
    │               │                   │                   │
```

### 4.2. Luồng Đăng ký Khoá học (Enrollment Flow)

```
┌────────┐     ┌──────────┐     ┌──────────────┐     ┌──────────┐
│ Client │     │ Next.js  │     │  Directus    │     │PostgreSQL│
│Browser │     │API Route │     │  REST API    │     │          │
└───┬────┘     └────┬─────┘     └──────┬───────┘     └────┬─────┘
    │               │                   │                   │
    │  1. POST      │                   │                   │
    │  /api/        │                   │                   │
    │  enrollments  │                   │                   │
    │  {course_id}  │                   │                   │
    │──────────────▶│                   │                   │
    │               │                   │                   │
    │               │  2. Validate      │                   │
    │               │  - Auth token     │                   │
    │               │  - Course exists  │                   │
    │               │  - Course status  │                   │
    │               │                   │                   │
    │               │  3. Check existing│                   │
    │               │  enrollment       │                   │
    │               │──────────────────▶│                   │
    │               │                   │─────────────────▶│
    │               │                   │◀─────────────────│
    │               │◀──────────────────│                   │
    │               │                   │                   │
    │               │  4. Create        │                   │
    │               │  enrollment record│                   │
    │               │──────────────────▶│                   │
    │               │                   │─────────────────▶│
    │               │                   │  INSERT enrollment│
    │               │                   │◀─────────────────│
    │               │◀──────────────────│                   │
    │               │                   │                   │
    │               │  5. Update course │                   │
    │               │  total_enrollments│                   │
    │               │──────────────────▶│                   │
    │               │                   │─────────────────▶│
    │               │                   │  UPDATE courses   │
    │               │                   │◀─────────────────│
    │               │◀──────────────────│                   │
    │               │                   │                   │
    │               │  6. Create        │                   │
    │               │  notification     │                   │
    │               │──────────────────▶│                   │
    │               │                   │─────────────────▶│
    │               │◀──────────────────│◀─────────────────│
    │               │                   │                   │
    │  7. 201       │                   │                   │
    │  {enrollment} │                   │                   │
    │◀──────────────│                   │                   │
```

### 4.3. Luồng Học bài và Theo dõi Tiến độ (Learning & Progress Flow)

```
┌────────┐     ┌──────────┐     ┌──────────────┐     ┌──────────┐
│ Client │     │ Next.js  │     │  Directus    │     │PostgreSQL│
│Browser │     │ Server   │     │  REST API    │     │          │
└───┬────┘     └────┬─────┘     └──────┬───────┘     └────┬─────┘
    │               │                   │                   │
    │  1. Navigate  │                   │                   │
    │  /learn/[slug]│                   │                   │
    │──────────────▶│                   │                   │
    │               │                   │                   │
    │               │  2. Fetch course  │                   │
    │               │  + modules        │                   │
    │               │  + lessons        │                   │
    │               │  + enrollment     │                   │
    │               │  + progress       │                   │
    │               │──────────────────▶│─────────────────▶│
    │               │◀──────────────────│◀─────────────────│
    │               │                   │                   │
    │  3. SSR Page  │                   │                   │
    │  with data    │                   │                   │
    │◀──────────────│                   │                   │
    │               │                   │                   │
    │  4. User      │                   │                   │
    │  completes    │                   │                   │
    │  lesson       │                   │                   │
    │               │                   │                   │
    │  5. PATCH     │                   │                   │
    │  /api/progress│                   │                   │
    │  {enrollment_id,                  │                   │
    │   lesson_id,  │                   │                   │
    │   is_completed│                   │                   │
    │   video_pos}  │                   │                   │
    │──────────────▶│                   │                   │
    │               │                   │                   │
    │               │  6. Upsert        │                   │
    │               │  progress record  │                   │
    │               │──────────────────▶│─────────────────▶│
    │               │◀──────────────────│◀─────────────────│
    │               │                   │                   │
    │               │  7. Calculate new │                   │
    │               │  progress %       │                   │
    │               │  = completed /    │                   │
    │               │    total lessons  │                   │
    │               │                   │                   │
    │               │  8. Update        │                   │
    │               │  enrollment       │                   │
    │               │  progress_pct     │                   │
    │               │  last_accessed    │                   │
    │               │──────────────────▶│─────────────────▶│
    │               │◀──────────────────│◀─────────────────│
    │               │                   │                   │
    │  9. 200 OK    │                   │                   │
    │  {progress,   │                   │                   │
    │   percentage} │                   │                   │
    │◀──────────────│                   │                   │
```

### 4.4. Luồng Nộp bài kiểm tra (Quiz Submission Flow)

```
┌────────┐     ┌──────────┐     ┌──────────────┐     ┌──────────┐
│ Client │     │ Next.js  │     │  Directus    │     │PostgreSQL│
│Browser │     │API Route │     │  REST API    │     │          │
└───┬────┘     └────┬─────┘     └──────┬───────┘     └────┬─────┘
    │               │                   │                   │
    │  1. POST      │                   │                   │
    │  /api/quizzes │                   │                   │
    │  /[id]/submit │                   │                   │
    │  {answers:[]} │                   │                   │
    │──────────────▶│                   │                   │
    │               │                   │                   │
    │               │  2. Fetch quiz    │                   │
    │               │  + questions      │                   │
    │               │  + correct answers│                   │
    │               │──────────────────▶│─────────────────▶│
    │               │◀──────────────────│◀─────────────────│
    │               │                   │                   │
    │               │  3. Check         │                   │
    │               │  max_attempts     │                   │
    │               │──────────────────▶│─────────────────▶│
    │               │◀──────────────────│◀─────────────────│
    │               │                   │                   │
    │               │  4. Grade:        │                   │
    │               │  - Compare answers│                   │
    │               │  - Calculate score│                   │
    │               │  - Determine pass │                   │
    │               │                   │                   │
    │               │  5. Save attempt  │                   │
    │               │  {score, is_passed│                   │
    │               │   answers_detail} │                   │
    │               │──────────────────▶│─────────────────▶│
    │               │◀──────────────────│◀─────────────────│
    │               │                   │                   │
    │  6. 200 OK    │                   │                   │
    │  {score,      │                   │                   │
    │   is_passed,  │                   │                   │
    │   details:[]} │                   │                   │
    │◀──────────────│                   │                   │
```

### 4.5. Luồng Mua khoá học (Purchase Flow)

```
┌────────┐     ┌──────────┐     ┌──────────────┐     ┌──────────┐
│ Client │     │ Next.js  │     │  Directus    │     │PostgreSQL│
│Browser │     │API Route │     │  REST API    │     │          │
└───┬────┘     └────┬─────┘     └──────┬───────┘     └────┬─────┘
    │               │                   │                   │
    │  1. POST      │                   │                   │
    │  /api/cart    │                   │                   │
    │  {course_id}  │                   │                   │
    │──────────────▶│                   │                   │
    │               │  2. Check enrolled│                   │
    │               │  + check in cart  │                   │
    │               │──────────────────▶│─────────────────▶│
    │               │◀──────────────────│◀─────────────────│
    │               │                   │                   │
    │               │  3. Add to cart   │                   │
    │               │──────────────────▶│─────────────────▶│
    │               │◀──────────────────│◀─────────────────│
    │  4. 201 OK    │                   │                   │
    │◀──────────────│                   │                   │
    │               │                   │                   │
    │  5. POST      │                   │                   │
    │  /api/orders  │                   │                   │
    │  {payment,    │                   │                   │
    │   items}      │                   │                   │
    │──────────────▶│                   │                   │
    │               │  6. Create order  │                   │
    │               │  + order_items    │                   │
    │               │  + clear cart     │                   │
    │               │──────────────────▶│─────────────────▶│
    │               │◀──────────────────│◀─────────────────│
    │  7. 201       │                   │                   │
    │  {order}      │                   │                   │
    │◀──────────────│                   │                   │
    │               │                   │                   │
    │  8. POST      │                   │                   │
    │  /api/orders  │                   │                   │
    │  /[id]/pay    │                   │                   │
    │──────────────▶│                   │                   │
    │               │  9. Update order  │                   │
    │               │  status=success   │                   │
    │               │──────────────────▶│─────────────────▶│
    │               │                   │                   │
    │               │  10. Create       │                   │
    │               │  enrollments for  │                   │
    │               │  each course      │                   │
    │               │──────────────────▶│─────────────────▶│
    │               │                   │                   │
    │               │  11. Send         │                   │
    │               │  notification     │                   │
    │               │──────────────────▶│─────────────────▶│
    │               │◀──────────────────│◀─────────────────│
    │  12. 200 OK   │                   │                   │
    │  {order}      │                   │                   │
    │◀──────────────│                   │                   │
```

---

## 5. Lý giải lựa chọn công nghệ (Technology Justification)

### 5.1. Directus 11.x - Headless CMS

| Tiêu chí               | Lý do chọn                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| **Auto-generated API** | Tự động tạo REST & GraphQL API cho mọi collection, giảm 70% thời gian phát triển backend |
| **Admin Panel**        | Giao diện quản trị có sẵn cho quản lý dữ liệu trực tiếp                                  |
| **RBAC**               | Hệ thống phân quyền granular đến field level, phù hợp 3 vai trò                          |
| **File Management**    | Quản lý file upload, image transformation tích hợp sẵn                                   |
| **Docker Support**     | Dễ dàng triển khai và scaling qua Docker                                                 |
| **Extensible**         | Hỗ trợ custom hooks, endpoints, modules khi cần mở rộng                                  |
| **Open Source**        | Miễn phí, cộng đồng lớn, tài liệu tốt                                                    |

**So sánh với Strapi:**

- Directus hỗ trợ database-first approach (kết nối DB có sẵn).
- Directus có giao diện admin đẹp và dễ sử dụng hơn.
- Directus hỗ trợ PostgreSQL native tốt hơn.

### 5.2. Next.js 16 - Frontend Framework

| Tiêu chí           | Lý do chọn                                                      |
| ------------------ | --------------------------------------------------------------- |
| **App Router**     | File-based routing mới, hỗ trợ Server Components native         |
| **SSR/SSG/ISR**    | Linh hoạt chiến lược rendering cho từng trang                   |
| **Server Actions** | Giảm client-side JavaScript, xử lý form trên server             |
| **API Routes**     | Built-in API layer, không cần backend riêng cho proxy           |
| **Middleware**     | Auth guard, redirect logic ở edge                               |
| **Performance**    | Automatic code splitting, image optimization, font optimization |
| **SEO**            | Metadata API mới, sitemap generation                            |
| **Vercel**         | Triển khai tối ưu trên Vercel với zero config                   |

### 5.3. Tailwind CSS 4+ & shadcn/ui

| Tiêu chí         | Lý do chọn                                                          |
| ---------------- | ------------------------------------------------------------------- |
| **Tailwind CSS** | Utility-first, build size nhỏ, customize dễ, responsive nhanh       |
| **shadcn/ui**    | Không phải library, copy-paste components, full control, accessible |
| **Kết hợp**      | shadcn/ui dùng Tailwind natively, không conflict, consistent design |

### 5.4. PostgreSQL 16

| Tiêu chí         | Lý do chọn                                                         |
| ---------------- | ------------------------------------------------------------------ |
| **Reliability**  | ACID compliant, data integrity cao                                 |
| **Performance**  | Parallel query, advanced indexing (B-tree, GIN, GiST)              |
| **JSON Support** | JSONB cho flexible schema (requirements, objectives, social_links) |
| **Directus**     | Database chính thức được Directus recommend                        |
| **Scalability**  | Hỗ trợ replication, partitioning                                   |

### 5.5. Redis 7

| Tiêu chí          | Lý do chọn                              |
| ----------------- | --------------------------------------- |
| **Caching**       | In-memory cache giúp giảm load database |
| **Speed**         | Sub-millisecond latency                 |
| **Directus**      | Tích hợp sẵn với Directus cho caching   |
| **Rate Limiting** | Atomic counter cho rate limiting        |

### 5.6. Các thư viện hỗ trợ

| Thư viện            | Lý do chọn                                                           |
| ------------------- | -------------------------------------------------------------------- |
| **Zustand**         | Lightweight (1KB), simple API, không boilerplate như Redux           |
| **Zod**             | TypeScript-first schema validation, tích hợp tốt với React Hook Form |
| **TipTap**          | Rich text editor headless, extensible, collaborative-ready           |
| **React Hook Form** | Performance tốt (uncontrolled), tích hợp Zod validation              |

---

## 6. Kiến trúc triển khai (Deployment Architecture)

### 6.1. Production Deployment

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
┌──────────────────────┐      ┌──────────────────────────────────┐
│   VERCEL PLATFORM    │      │         VPS SERVER               │
│                      │      │       (Ubuntu 22.04)             │
│  ┌────────────────┐  │      │                                  │
│  │  Next.js App   │  │      │  ┌────────────────────────────┐  │
│  │  (Serverless)  │  │      │  │    Docker Compose          │  │
│  │                │  │      │  │                            │  │
│  │  - SSR Pages   │──┼──────┼─▶│  ┌──────────┐             │  │
│  │  - API Routes  │  │      │  │  │ Directus  │ :8055       │  │
│  │  - Static      │  │      │  │  │ Container │             │  │
│  │    Assets      │  │      │  │  └─────┬────┘             │  │
│  │                │  │      │  │        │                    │  │
│  └────────────────┘  │      │  │  ┌─────┴────┐ ┌─────────┐ │  │
│                      │      │  │  │PostgreSQL│ │  Redis  │ │  │
│  ┌────────────────┐  │      │  │  │Container │ │Container│ │  │
│  │  Vercel Edge   │  │      │  │  │  :5432   │ │  :6379  │ │  │
│  │  Network (CDN) │  │      │  │  └──────────┘ └─────────┘ │  │
│  └────────────────┘  │      │  └────────────────────────────┘  │
│                      │      │                                  │
│  ┌────────────────┐  │      │  ┌────────────────────────────┐  │
│  │  Environment   │  │      │  │  Nginx Reverse Proxy       │  │
│  │  Variables     │  │      │  │  + SSL (Let's Encrypt)     │  │
│  └────────────────┘  │      │  │  api.domain.com → :8055    │  │
│                      │      │  └────────────────────────────┘  │
└──────────────────────┘      │                                  │
                              │  ┌────────────────────────────┐  │
                              │  │  Automated Backups         │  │
                              │  │  - Daily DB dump           │  │
                              │  │  - Weekly full backup      │  │
                              │  └────────────────────────────┘  │
                              └──────────────────────────────────┘
```

### 6.2. Domain Configuration

| Subdomain        | Service          | Hosting      |
| ---------------- | ---------------- | ------------ |
| `www.domain.com` | Next.js Frontend | Vercel       |
| `api.domain.com` | Directus API     | VPS (Docker) |

### 6.3. Chiến lược Caching

```
Request Flow with Caching:

Client → Vercel CDN (static assets, ISR pages)
       → Next.js Server (SSR, API Routes)
           → Redis Cache (check cache first)
               → Hit: Return cached data
               → Miss: Query PostgreSQL → Store in Redis → Return
```

| Layer      | Cache Type   | TTL            | Content                                |
| ---------- | ------------ | -------------- | -------------------------------------- |
| Vercel CDN | Edge Cache   | ISR revalidate | Static pages, images, fonts            |
| Next.js    | Server Cache | 60-300s        | ISR page data                          |
| Redis      | Query Cache  | 300-3600s      | Course lists, categories, popular data |
| Browser    | HTTP Cache   | Cache-Control  | Static assets, API responses           |

---

## 7. Bảo mật (Security Architecture)

### 7.1. Authentication Flow

```
┌────────────────────────────────────────────────────────┐
│                   Authentication Layer                   │
│                                                         │
│  1. Client sends credentials to Next.js API Route       │
│  2. API Route forwards to Directus /auth/login          │
│  3. Directus validates and returns JWT tokens            │
│  4. API Route sets HTTP-only secure cookies              │
│  5. Subsequent requests include cookie automatically     │
│  6. Next.js middleware validates token on protected routes│
│  7. API Routes forward token to Directus API calls       │
│                                                         │
│  Access Token: 15 min TTL (in memory + cookie)          │
│  Refresh Token: 7 day TTL (HTTP-only cookie)            │
└────────────────────────────────────────────────────────┘
```

### 7.2. Authorization Matrix

| Resource          | Guest | Student           | Instructor         | Admin      |
| ----------------- | ----- | ----------------- | ------------------ | ---------- |
| Public pages      | Read  | Read              | Read               | Read       |
| Own profile       | -     | Read/Write        | Read/Write         | Read/Write |
| Browse courses    | Read  | Read              | Read               | Read       |
| Enroll course     | -     | Create            | -                  | -          |
| Learn course      | -     | Read (enrolled)   | -                  | -          |
| Submit quiz       | -     | Create (enrolled) | -                  | -          |
| Write review      | -     | Create (enrolled) | -                  | -          |
| Create course     | -     | -                 | Create             | Create     |
| Edit own course   | -     | -                 | Read/Write         | -          |
| Edit any course   | -     | -                 | -                  | Read/Write |
| Manage users      | -     | -                 | -                  | Full CRUD  |
| Manage categories | -     | -                 | -                  | Full CRUD  |
| View all reviews  | -     | -                 | Read (own courses) | Full CRUD  |
| Cart/Wishlist     | -     | Full CRUD         | -                  | -          |
| Create order      | -     | Create            | -                  | -          |
| Mock payment      | -     | Create (own order)| -                  | -          |
| View own orders   | -     | Read              | -                  | -          |
| Manage all orders | -     | -                 | -                  | Read/Write |
| System settings   | -     | -                 | -                  | Read/Write |

---

## 8. Error Handling Strategy

### 8.1. Error Boundaries

```
App Error Boundary (error.tsx)
├── Page-level Error Boundary
│   ├── Component-level try/catch
│   │   └── API call error handling
│   └── Form validation errors (Zod)
└── Not Found (not-found.tsx)
```

### 8.2. API Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ",
    "details": [
      {
        "field": "email",
        "message": "Email không đúng định dạng"
      }
    ]
  }
}
```

### 8.3. Error Codes

| Code               | HTTP Status | Mô tả                     |
| ------------------ | ----------- | ------------------------- |
| `UNAUTHORIZED`     | 401         | Chưa xác thực             |
| `FORBIDDEN`        | 403         | Không có quyền            |
| `NOT_FOUND`        | 404         | Không tìm thấy resource   |
| `VALIDATION_ERROR` | 422         | Dữ liệu không hợp lệ      |
| `DUPLICATE_ENTRY`  | 409         | Dữ liệu đã tồn tại        |
| `RATE_LIMITED`     | 429         | Vượt quá giới hạn request |
| `INTERNAL_ERROR`   | 500         | Lỗi server                |

---

_Tài liệu kiến trúc hệ thống - Hệ Thống Quản Lý Khoá Học Trực Tuyến_
