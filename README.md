# E-Learning Platform

Hệ thống quản lý khoá học trực tuyến (tham khảo Udemy) - Đồ án tốt nghiệp.

## Tổng quan

Platform hỗ trợ 3 vai trò người dùng:

- **Admin**: Quản trị toàn hệ thống (người dùng, khoá học, danh mục, đánh giá, đơn hàng, cài đặt)
- **Instructor**: Tạo và quản lý khoá học, module, bài học, quiz
- **Student**: Duyệt, mua khoá học (giỏ hàng, thanh toán giả lập), học bài, làm quiz, viết đánh giá, quản lý wishlist

## Tính năng chính

- Xác thực & phân quyền (JWT, RBAC 3 vai trò)
- Duyệt, tìm kiếm, lọc khoá học
- Tạo & quản lý khoá học (multi-step form, TipTap editor)
- Quản lý module, bài học, quiz (CRUD + sắp xếp)
- Giỏ hàng & Wishlist
- Thanh toán giả lập (VNPay/MoMo/QR code)
- Theo dõi tiến độ học tập (progress tracking)
- Đánh giá khoá học (rating + comment)
- Hệ thống thông báo in-app
- Dashboard quản trị với thống kê
- Responsive (mobile/tablet/desktop) + Dark mode

## Tech Stack

| Layer            | Công nghệ                       |
| ---------------- | ------------------------------- |
| Backend CMS      | Directus 11.x (Docker)          |
| Database         | PostgreSQL 16                   |
| Cache            | Redis 7                         |
| Frontend         | Next.js 16 (App Router)         |
| Styling          | Tailwind CSS 4+                 |
| UI Components    | shadcn/ui                       |
| State Management | Zustand                         |
| Auth             | Directus SDK (cookie-based JWT) |
| Validation       | Zod 4.x + React Hook Form      |

## Cấu trúc dự án

```
elearning/
├── docs/                # Tài liệu đồ án (11 files)
├── backend/             # Directus (Docker Compose)
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   ├── scripts/         # Bootstrap script
│   └── .env
├── frontend/            # Next.js application
│   └── src/
│       ├── app/         # App Router pages & API routes
│       ├── components/  # UI + feature components
│       ├── lib/         # Directus SDK, queries, utils
│       ├── hooks/       # Custom React hooks
│       ├── stores/      # Zustand stores
│       └── types/       # TypeScript types
├── CLAUDE.md            # AI agent context (loaded into Claude Code)
└── README.md
```

## Yêu cầu hệ thống

- **Node.js** 20+
- **npm**
- **Docker** & **Docker Compose**
- **Git**

## Cài đặt & Khởi chạy

### 1. Clone repository

```bash
git clone <repo-url> elearning
cd elearning
```

### 2. Khởi động Backend (Directus)

```bash
cd backend

# Chỉnh sửa file .env nếu cần
# Khởi động Docker containers
docker compose up -d

# Verify: truy cập http://localhost:8055
# Đăng nhập với credentials trong .env

# Bootstrap roles, collections, permissions
node scripts/bootstrap.mjs
```

### 3. Khởi động Frontend (Next.js)

```bash
cd frontend

# Cài đặt dependencies
npm install

# Chỉnh sửa .env.local nếu cần
# NEXT_PUBLIC_DIRECTUS_URL=http://localhost:8055

# Khởi động development server
npm run dev

# Truy cập http://localhost:3000
```

## Tài liệu

| File                           | Nội dung            |
| ------------------------------ | ------------------- |
| `docs/00-proposal.md`          | Đề cương đồ án      |
| `docs/01-requirements.md`      | Đặc tả yêu cầu      |
| `docs/02-architecture.md`      | Kiến trúc hệ thống  |
| `docs/03-database-design.md`   | Thiết kế CSDL       |
| `docs/04-api-documentation.md` | Tài liệu API        |
| `docs/05-user-stories.md`      | User stories        |
| `docs/06-ui-wireframes.md`     | Mô tả wireframe     |
| `docs/07-testing-plan.md`      | Kế hoạch kiểm thử   |
| `docs/08-deployment-plan.md`   | Kế hoạch triển khai |
| `docs/09-progress-tracking.md` | Theo dõi tiến độ    |
| `docs/10-references.md`        | Tài liệu tham khảo  |

## Scripts

```bash
# Frontend
npm run dev          # Development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint

# Backend
docker compose up -d       # Start services
docker compose down        # Stop services
docker compose logs -f     # View logs
```

## Tài khoản mặc định

| Role  | Email               | Password     |
| ----- | ------------------- | ------------ |
| Admin | admin@elearning.dev | Admin@123456 |

## License

Dự án phục vụ mục đích học tập - Đồ án tốt nghiệp.
