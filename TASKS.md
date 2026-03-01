# TASKS - Hệ Thống Quản Lý Khoá Học E-Learning Platform

> Tổng: **118 tasks** | Hoàn thành: **0/118** | Tiến độ: **0%**

---

## GIAI ĐOẠN 1: KHỞI TẠO DỰ ÁN (13 tasks)

- [x] 1.1 Khởi tạo Git repo — `git init`, `.gitignore`
- [x] 1.2 Tạo cấu trúc `docs/` — 10 file tài liệu với template headers
- [x] 1.3 Viết đề cương đồ án — `00-proposal.md`
- [x] 1.4 Thiết lập Docker Compose — `backend/docker-compose.yml` + `.env`
- [ ] 1.5 Khởi động Directus — `docker compose up -d`, verify UI
- [x] 1.6 Khởi tạo Next.js
- [x] 1.7 Cài dependencies — `@directus/sdk`, `zustand`, `zod`, etc.
- [x] 1.8 Cấu hình shadcn/ui — Init + install components
- [x] 1.9 Tạo cấu trúc thư mục frontend — `lib/`, `hooks/`, `stores/`, `types/`, etc.
- [x] 1.10 Cấu hình Directus SDK — `src/lib/directus.ts`
- [x] 1.11 Cấu hình environment — `.env.local`
- [x] 1.12 Tạo TypeScript types — `types/`
- [x] 1.13 Viết tài liệu kiến trúc — `02-architecture.md`

## GIAI ĐOẠN 2: CSDL & RBAC (17 tasks)

- [x ] 2.1 Tạo roles — Instructor, Student roles
- [ x] 2.2 Tạo collection: categories — Self-referencing parent_id
- [x ] 2.3 Tạo collection: courses — All fields + relations
- [ x] 2.4 Tạo collection: modules — M2O → courses
- [ x] 2.5 Tạo collection: lessons — M2O → modules, M2M files
- [x ] 2.6 Tạo collection: enrollments — M2O → users + courses
- [x ] 2.7 Tạo collection: progress — M2O → enrollments + lessons
- [ x] 2.8 Tạo collection: reviews — M2O → users + courses
- [x ] 2.9 Tạo collections: quizzes + quiz_questions + quiz_answers
- [x ] 2.10 Tạo collection: quiz_attempts — M2O → quizzes + users
- [x ] 2.11 Tạo collection: notifications — M2O → users
- [x ] 2.12 Cấu hình RBAC - Student
- [ x] 2.13 Cấu hình RBAC - Instructor
- [x ] 2.14 Cấu hình RBAC - Admin
- [ x] 2.15 Tạo schema snapshot
- [x ] 2.16 Tạo dữ liệu mẫu
- [ x] 2.17 Viết tài liệu CSDL — `03-database-design.md`

## GIAI ĐOẠN 3: XÁC THỰC & PHÂN QUYỀN (15 tasks)

- [x] 3.1 Tạo Data Access Layer — `lib/dal.ts`
- [x] 3.2 API: POST /api/auth/login
- [x] 3.3 API: POST /api/auth/register
- [x] 3.4 API: POST /api/auth/logout
- [x] 3.5 API: POST /api/auth/forgot-password
- [x] 3.6 API: POST /api/auth/reset-password
- [x] 3.7 API: POST /api/auth/refresh
- [x] 3.8 Tạo middleware.ts — Route protection
- [x] 3.9 Tạo Auth Zustand store
- [x] 3.10 Tạo Auth Provider
- [x] 3.11 Xây dựng trang Login
- [x] 3.12 Xây dựng trang Register
- [x] 3.13 Trang Forgot/Reset Password
- [x] 3.14 Tạo useAuth hook
- [x] 3.15 Viết user stories — `05-user-stories.md`

## GIAI ĐOẠN 4: GIAO DIỆN CÔNG KHAI (15 tasks)

- [x] 4.1 Tạo Layout components — Header, Footer, MobileNav
- [x] 4.2 Root Layout — ThemeProvider, AuthProvider, Toaster
- [x] 4.3 Public Layout — Header + Footer wrapping
- [x] 4.4 Trang chủ — Hero, featured courses, categories
- [x] 4.5 CourseCard component
- [x] 4.6 Trang Courses (Catalog) — Search, filters, sort, pagination
- [x] 4.7 Directus query helpers — `lib/queries/courses.ts`
- [x] 4.8 Trang Course Detail — Banner, curriculum, reviews
- [x] 4.9 ReviewCard component
- [x] 4.10 Trang Categories
- [x] 4.11 Trang Instructor Profile
- [x] 4.12 Search component
- [x] 4.13 Pagination component
- [x] 4.14 RatingStars component
- [x] 4.15 Responsive audit — Mobile, tablet, desktop

## GIAI ĐOẠN 5: CHỨC NĂNG HỌC VIÊN (14 tasks)

- [x] 5.1 Student Dashboard
- [x] 5.2 API: POST /api/enrollments
- [x] 5.3 Chức năng ghi danh
- [x] 5.4 Trang My Courses
- [x] 5.5 Course Player Layout
- [x] 5.6 Lesson Player
- [x] 5.7 API: PATCH /api/progress
- [x] 5.8 Progress tracking
- [x] 5.9 API: POST /api/quizzes/[id]/submit
- [x] 5.10 Quiz Player
- [x] 5.11 API: POST /api/reviews
- [x] 5.12 Form đánh giá
- [x] 5.13 Trang Profile
- [x] 5.14 Trang Notifications

## GIAI ĐOẠN 6: CHỨC NĂNG GIẢNG VIÊN (15 tasks)

- [x] 6.1 Instructor Layout
- [x] 6.2 Instructor Dashboard
- [x] 6.3 Trang danh sách khoá học
- [x] 6.4 API routes: Course CRUD
- [x] 6.5 Form tạo khoá học (multi-step)
- [x] 6.6 Form chỉnh sửa khoá học
- [x] 6.7 API routes: Module CRUD + reorder
- [x] 6.8 Trang quản lý module
- [x] 6.9 API routes: Lesson CRUD + reorder
- [x] 6.10 Form tạo/chỉnh sửa bài học
- [x] 6.11 API routes: Quiz CRUD
- [x] 6.12 Quiz builder
- [x] 6.13 Trang xem học viên
- [x] 6.14 Trang xem đánh giá
- [x] 6.15 WYSIWYG Editor — TipTap integration

## GIAI ĐOẠN 7: CHỨC NĂNG QUẢN TRỊ (12 tasks)

- [x] 7.1 Admin Layout
- [x] 7.2 Admin Dashboard
- [x] 7.3 Trang quản lý người dùng
- [x] 7.4 API routes: Admin user management
- [x] 7.5 Chi tiết người dùng
- [x] 7.6 Trang quản lý khoá học
- [x] 7.7 API routes: Admin course management
- [x] 7.8 Trang quản lý danh mục
- [x] 7.9 API routes: Category CRUD
- [x] 7.10 Trang kiểm duyệt đánh giá
- [x] 7.11 Trang báo cáo
- [x] 7.12 Trang cài đặt hệ thống

## GIAI ĐOẠN 8: HOÀN THIỆN & TRIỂN KHAI (17 tasks)

- [x] 8.1 SEO & Metadata
- [x] 8.2 Loading states — Skeleton screens
- [x] 8.3 Error handling — `error.tsx`, `not-found.tsx`
- [x] 8.4 Toast notifications
- [x] 8.5 Dark mode
- [x] 8.6 Performance — `next/image`, lazy loading
- [x] 8.7 Accessibility
- [x] 8.8 Viết kế hoạch kiểm thử — `07-testing-plan.md`
- [x] 8.9 Kiểm thử thủ công
- [x] 8.10 Viết tài liệu API — `04-api-documentation.md`
- [x] 8.11 Viết mô tả wireframe — `06-ui-wireframes.md`
- [x] 8.12 Docker production config
- [x] 8.13 Viết kế hoạch triển khai — `08-deployment-plan.md`
- [ ] 8.14 Triển khai staging
- [x] 8.15 Tạo README.md
- [x] 8.16 Hoàn thiện tài liệu tham khảo — `10-references.md`
- [x] 8.17 Hoàn thiện tiến độ — `09-progress-tracking.md`
