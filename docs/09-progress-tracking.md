# THEO DÕI TIẾN ĐỘ DỰ ÁN

## Hệ Thống Quản Lý Khoá Học Trực Tuyến (E-Learning Platform)

---

## 1. Tổng quan

### 1.1. Thông tin dự án

| Mục                       | Nội dung                             |
| ------------------------- | ------------------------------------ |
| **Tên dự án**             | Hệ Thống Quản Lý Khoá Học Trực Tuyến |
| **Tổng thời gian**        | 16 tuần (4 tháng)                    |
| **Số giai đoạn**          | 9 giai đoạn                          |

### 1.2. Ký hiệu trạng thái

| Ký hiệu | Trạng thái  | Mô tả          |
| ------- | ----------- | -------------- |
| [ ]     | Not Started | Chưa bắt đầu   |
| [~]     | In Progress | Đang thực hiện |
| [x]     | Completed   | Đã hoàn thành  |
| [!]     | Delayed     | Trễ tiến độ    |
| [-]     | Cancelled   | Huỷ bỏ         |

---

## 2. Bảng theo dõi tiến độ chi tiết

### Giai đoạn 1: Khảo sát và Phân tích yêu cầu (Tuần 1-2)

| #   | Công việc                                          | Trạng thái |
| --- | -------------------------------------------------- | ---------- |
| 1.1 | Khảo sát các nền tảng e-learning (Udemy, Coursera) | [x]        |
| 1.2 | Phân tích ưu/nhược điểm các nền tảng hiện có       | [x]        |
| 1.3 | Xác định yêu cầu chức năng (FR)                    | [x]        |
| 1.4 | Xác định yêu cầu phi chức năng (NFR)               | [x]        |
| 1.5 | Viết tài liệu đề cương (00-proposal.md)            | [x]        |
| 1.6 | Viết đặc tả yêu cầu (01-requirements.md)           | [x]        |
| 1.7 | Viết user stories (05-user-stories.md)             | [x]        |
| 1.8 | Review và hoàn thiện tài liệu giai đoạn 1          | [x]        |

**Deliverables:** Đề cương, Đặc tả yêu cầu, User Stories

---

### Giai đoạn 2: Thiết kế hệ thống (Tuần 3-4)

| #    | Công việc                                     | Trạng thái |
| ---- | --------------------------------------------- | ---------- |
| 2.1  | Thiết kế kiến trúc hệ thống tổng quan         | [x]        |
| 2.2  | Vẽ component diagram                          | [x]        |
| 2.3  | Vẽ data flow diagram                          | [x]        |
| 2.4  | Thiết kế cơ sở dữ liệu (ER diagram)           | [x]        |
| 2.5  | Chi tiết schema 18 collections + 1 singleton  | [x]        |
| 2.6  | Thiết kế API endpoints                        | [x]        |
| 2.7  | Mô tả wireframe giao diện                     | [x]        |
| 2.8  | Viết tài liệu kiến trúc (02-architecture.md)  | [x]        |
| 2.9  | Viết tài liệu CSDL (03-database-design.md)    | [x]        |
| 2.10 | Viết tài liệu API (04-api-documentation.md)   | [x]        |
| 2.11 | Viết tài liệu wireframe (06-ui-wireframes.md) | [x]        |
| 2.12 | Review và hoàn thiện thiết kế                 | [x]        |

**Deliverables:** Kiến trúc hệ thống, Thiết kế CSDL, Tài liệu API, Wireframes

---

### Giai đoạn 3: Thiết lập môi trường và Backend (Tuần 5-6)

| #    | Công việc                                               | Trạng thái |
| ---- | ------------------------------------------------------- | ---------- |
| 3.1  | Viết docker-compose.yml (Directus + PostgreSQL + Redis) | [x]        |
| 3.2  | Cấu hình Directus environment variables                 | [x]        |
| 3.3  | Khởi chạy Docker containers                             | [x]        |
| 3.4  | Tạo collections trong Directus                          | [x]        |
| 3.5  | Cấu hình relationships giữa collections                 | [x]        |
| 3.6  | Tạo 3 roles (Admin, Instructor, Student)                | [x]        |
| 3.7  | Cấu hình permissions cho từng role                      | [x]        |
| 3.8  | Tạo seed data (admin user, categories mẫu)              | [x]        |
| 3.9  | Viết bootstrap script (scripts/bootstrap.mjs)           | [x]        |
| 3.10 | Test API endpoints với Postman                          | [x]        |

**Deliverables:** Docker setup, Directus configured, Bootstrap script, API tested

---

### Giai đoạn 4: Frontend - Giao diện công cộng (Tuần 7-8)

| #    | Công việc                                      | Trạng thái |
| ---- | ---------------------------------------------- | ---------- |
| 4.1  | Khởi tạo dự án Next.js 16 với TypeScript       | [x]        |
| 4.2  | Cấu hình Tailwind CSS 4                        | [x]        |
| 4.3  | Cài đặt và cấu hình shadcn/ui                  | [x]        |
| 4.4  | Thiết lập Directus SDK client                  | [x]        |
| 4.5  | Xây dựng PublicLayout (Header, Footer)         | [x]        |
| 4.6  | Xây dựng AuthLayout                            | [x]        |
| 4.7  | Xây dựng DashboardLayout (Header, Sidebar)     | [x]        |
| 4.8  | Trang chủ (HomePage)                           | [x]        |
| 4.9  | Trang danh sách khoá học (CoursesPage)         | [x]        |
| 4.10 | Trang chi tiết khoá học (CourseDetailPage)     | [x]        |
| 4.11 | Trang danh mục (CategoriesPage)                | [x]        |
| 4.12 | Trang hồ sơ giảng viên (InstructorProfilePage) | [x]        |
| 4.13 | Trang đăng nhập (LoginPage)                    | [x]        |
| 4.14 | Trang đăng ký (RegisterPage)                   | [x]        |
| 4.15 | Trang quên/đặt lại mật khẩu                    | [x]        |
| 4.16 | Middleware auth guard                          | [x]        |
| 4.17 | API Routes cho Authentication                  | [x]        |
| 4.18 | Zustand auth store                             | [x]        |
| 4.19 | Kiểm thử responsive giao diện công cộng        | [x]        |

**Deliverables:** Layout components, Public pages, Auth pages, Auth flow

---

### Giai đoạn 5: Frontend - Khu vực Học viên (Tuần 9-10)

| #    | Công việc                                | Trạng thái |
| ---- | ---------------------------------------- | ---------- |
| 5.1  | Dashboard học viên                       | [x]        |
| 5.2  | Trang "Khoá học của tôi"                 | [x]        |
| 5.3  | API Route: POST /api/enrollments         | [x]        |
| 5.4  | Chức năng đăng ký khoá học               | [x]        |
| 5.5  | Course Player - Layout (sidebar + main)  | [x]        |
| 5.6  | Course Player - Video player             | [x]        |
| 5.7  | Course Player - Nội dung bài học         | [x]        |
| 5.8  | Course Player - Điều hướng bài trước/sau | [x]        |
| 5.9  | API Route: PATCH /api/progress           | [x]        |
| 5.10 | Theo dõi tiến độ (đánh dấu hoàn thành)   | [x]        |
| 5.11 | Lưu vị trí video (video_position)        | [x]        |
| 5.12 | Giao diện làm bài kiểm tra               | [x]        |
| 5.13 | API Route: POST /api/quizzes/[id]/submit | [x]        |
| 5.14 | Hiển thị kết quả bài kiểm tra            | [x]        |
| 5.15 | API Route: POST /api/reviews             | [x]        |
| 5.16 | Chức năng đánh giá khoá học              | [x]        |
| 5.17 | Trang hồ sơ cá nhân                      | [x]        |
| 5.18 | Trang thông báo                          | [x]        |
| 5.19 | Kiểm thử toàn bộ chức năng học viên      | [x]        |

**Deliverables:** Student dashboard, Course player, Progress tracking, Quiz, Review

---

### Giai đoạn 6: Frontend - Khu vực Giảng viên (Tuần 11-12)

| #    | Công việc                                            | Trạng thái |
| ---- | ---------------------------------------------------- | ---------- |
| 6.1  | Dashboard giảng viên với thống kê                    | [x]        |
| 6.2  | Trang danh sách khoá học                             | [x]        |
| 6.3  | Form tạo khoá học - Bước 1 (Thông tin cơ bản)        | [x]        |
| 6.4  | Form tạo khoá học - Bước 2 (Chi tiết, TipTap editor) | [x]        |
| 6.5  | Form tạo khoá học - Bước 3 (Media & Giá)             | [x]        |
| 6.6  | Form tạo khoá học - Bước 4 (Xem lại & Lưu)           | [x]        |
| 6.7  | Form chỉnh sửa khoá học                              | [x]        |
| 6.8  | Quản lý Module (CRUD + reorder)                      | [x]        |
| 6.9  | Form tạo/sửa bài học                                 | [x]        |
| 6.10 | Sắp xếp bài học (drag & drop)                        | [x]        |
| 6.11 | Quiz Builder (tạo quiz + câu hỏi + đáp án)           | [x]        |
| 6.12 | Trang xem danh sách học viên                         | [x]        |
| 6.13 | Trang xem đánh giá                                   | [x]        |
| 6.14 | Instructor API Routes                                | [x]        |
| 6.15 | Kiểm thử toàn bộ chức năng giảng viên                | [x]        |

**Deliverables:** Instructor dashboard, Course management, Module/Lesson management, Quiz builder

---

### Giai đoạn 7: Frontend - Khu vực Quản trị (Tuần 13-14)

| #    | Công việc                                   | Trạng thái |
| ---- | ------------------------------------------- | ---------- |
| 7.1  | Dashboard quản trị với thống kê tổng quan   | [x]        |
| 7.2  | Trang danh sách người dùng (DataTable)      | [x]        |
| 7.3  | Trang chi tiết người dùng                   | [x]        |
| 7.4  | Form tạo người dùng mới                     | [x]        |
| 7.5  | Chức năng thay đổi vai trò / khoá tài khoản | [x]        |
| 7.6  | Trang quản lý khoá học                      | [x]        |
| 7.7  | Trang quản lý danh mục (tree view)          | [x]        |
| 7.8  | CRUD danh mục                               | [x]        |
| 7.9  | Trang quản lý đánh giá (kiểm duyệt)         | [x]        |
| 7.10 | Trang chi tiết khoá học (admin)             | [x]        |
| 7.11 | Trang cài đặt hệ thống                      | [x]        |
| 7.12 | Trang quản lý đơn hàng                      | [x]        |
| 7.13 | Admin API Routes                            | [x]        |
| 7.14 | Kiểm thử toàn bộ chức năng admin            | [x]        |

**Deliverables:** Admin dashboard, User management, Course management, Category management, Order management, Settings

---

### Giai đoạn 8: Kiểm thử và Triển khai (Tuần 15-16)

| #    | Công việc                                        | Trạng thái |
| ---- | ------------------------------------------------ | ---------- |
| 8.1  | Viết kế hoạch kiểm thử (07-testing-plan.md)      | [x]        |
| 8.2  | Thực hiện kiểm thử Authentication                | [x]        |
| 8.3  | Thực hiện kiểm thử Public pages                  | [x]        |
| 8.4  | Thực hiện kiểm thử Student features              | [x]        |
| 8.5  | Thực hiện kiểm thử Instructor features           | [x]        |
| 8.6  | Thực hiện kiểm thử Admin features                | [x]        |
| 8.7  | Kiểm thử responsive (mobile/tablet/desktop)      | [x]        |
| 8.8  | Kiểm thử performance (Lighthouse)                | [x]        |
| 8.9  | Sửa lỗi phát hiện                                | [x]        |
| 8.10 | Regression testing                               | [x]        |
| 8.11 | Viết kế hoạch triển khai (08-deployment-plan.md) | [x]        |
| 8.12 | Viết báo cáo đồ án                               | [x]        |
| 8.13 | Chuẩn bị demo                                    | [x]        |

**Deliverables:** Test report, Documentation, Final report

---

### Giai đoạn 9: Thương mại điện tử (E-Commerce)

| #    | Công việc                                          | Trạng thái |
| ---- | -------------------------------------------------- | ---------- |
| 9.1  | Thiết kế schema: cart_items, wishlists, orders, order_items | [x]        |
| 9.2  | Tạo collections trong Directus                     | [x]        |
| 9.3  | API Routes: Cart CRUD (/api/cart)                  | [x]        |
| 9.4  | API Routes: Wishlist CRUD (/api/wishlist)          | [x]        |
| 9.5  | API Routes: Orders CRUD (/api/orders)              | [x]        |
| 9.6  | API Route: Mock Payment (/api/orders/[id]/pay)     | [x]        |
| 9.7  | Trang giỏ hàng (Cart Page)                         | [x]        |
| 9.8  | Trang Wishlist                                     | [x]        |
| 9.9  | Trang Checkout                                     | [x]        |
| 9.10 | Trang Mock Payment (VNPay/MoMo/Bank Transfer)      | [x]        |
| 9.11 | Trang kết quả thanh toán (Success/Failed)          | [x]        |
| 9.12 | Trang lịch sử đơn hàng (Student)                   | [x]        |
| 9.13 | Trang quản lý đơn hàng (Admin)                     | [x]        |
| 9.14 | Admin API Routes: Orders, Settings, Reviews        | [x]        |
| 9.15 | Component: WishlistButton, MediaUploader           | [x]        |
| 9.16 | Component: Course Actions (mua/enroll/wishlist)    | [x]        |
| 9.17 | Tích hợp luồng: Cart → Checkout → Payment → Enrollment | [x]  |
| 9.18 | Kiểm thử toàn bộ chức năng e-commerce              | [x]        |

**Deliverables:** Cart, Wishlist, Checkout, Mock Payment, Order management, Admin orders

---

## 3. Tổng hợp tiến độ theo giai đoạn

| Giai đoạn                      | Tuần   | Số công việc | Hoàn thành | Tỷ lệ   | Trạng thái      |
| ------------------------------ | ------ | ------------ | ---------- | ------- | --------------- |
| GĐ1: Khảo sát & Phân tích      | 1-2    | 8            | 8          | 100%    | [x] Completed   |
| GĐ2: Thiết kế hệ thống         | 3-4    | 12           | 12         | 100%    | [x] Completed   |
| GĐ3: Backend Setup             | 5-6    | 10           | 10         | 100%    | [x] Completed   |
| GĐ4: Frontend Public           | 7-8    | 19           | 19         | 100%    | [x] Completed   |
| GĐ5: Frontend Student          | 9-10   | 19           | 19         | 100%    | [x] Completed   |
| GĐ6: Frontend Instructor       | 11-12  | 15           | 15         | 100%    | [x] Completed   |
| GĐ7: Frontend Admin            | 13-14  | 14           | 14         | 100%    | [x] Completed   |
| GĐ8: Testing & Documentation   | 15-16  | 13           | 13         | 100%    | [x] Completed   |
| GĐ9: Thương mại điện tử        | -      | 18           | 18         | 100%    | [x] Completed   |
| **Tổng**                       | **16** | **128**      | **128**    | **100%**|                 |

---

## 4. Biểu đồ Gantt (Text Representation)

```
Tuần    1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16
       ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──
GĐ1    ██ ██
GĐ2          ██ ██
GĐ3                ██ ██
GĐ4                      ██ ██
GĐ5                            ██ ██
GĐ6                                  ██ ██
GĐ7                                        ██ ██
GĐ8                                              ██ ██
GĐ9                                        ██ ██ ██ ██
       ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──
Tài liệu ██ ██ ██ ██ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ██ ██

██ = Giai đoạn chính
░░ = Cập nhật tài liệu liên tục
```

---

## 5. Rủi ro và Biện pháp

| #   | Rủi ro                                  | Xác suất   | Ảnh hưởng  | Biện pháp giảm thiểu                                            | Kết quả       |
| --- | --------------------------------------- | ---------- | ---------- | --------------------------------------------------------------- | ------------- |
| R1  | Trễ tiến độ do phức tạp kỹ thuật        | Trung bình | Cao        | Ưu tiên Must Have features, để Could Have làm nếu còn thời gian | Đã giải quyết |
| R2  | Lỗi tương thích phiên bản thư viện      | Thấp       | Trung bình | Lock phiên bản trong package.json, test sớm                     | Gặp với Zod v4 |
| R3  | Directus không hỗ trợ feature cần thiết | Thấp       | Cao        | Sử dụng custom endpoints/hooks, hoặc xử lý ở Next.js API Routes | Đã giải quyết |
| R4  | Thay đổi yêu cầu giữa chừng             | Trung bình | Trung bình | Scope rõ ràng từ đầu, change control                            | Thêm e-commerce |

---

## 6. Nhật ký thay đổi (Change Log)

| Ngày | Thay đổi | Lý do | Ảnh hưởng |
| ---- | -------- | ----- | --------- |
| -    | Thêm giai đoạn 9: Thương mại điện tử | Bổ sung tính năng mua khoá học | Thêm 4 collections, 7 API routes, 6 trang mới |
| -    | Cập nhật GĐ7: Thêm trang đơn hàng, cài đặt admin | Tích hợp e-commerce vào admin | Thêm 2 trang admin, 4 API routes |

---

## 7. Bài học kinh nghiệm (Lessons Learned)

### 7.1. Kỹ thuật

| #   | Bài học | Chi tiết |
| --- | ------- | -------- |
| 1   | Directus 11 dùng policies thay vì roles cho permissions | Flow: create Role → create Policy → link via `POST /access` → create permissions với `policy` field. Không dùng `role` trực tiếp trong permissions. |
| 2   | Zod v4 thay đổi API so với v3 | `required_error` không tồn tại, dùng `message` thay thế trong `z.enum()`. `z.coerce.number()` có thể resolve sang `unknown` trong zodResolver. |
| 3   | Next.js 16 + `useSearchParams()` cần Suspense boundary | Pages dùng `useSearchParams()` fail prerender build — cần tách thành server page + client component bọc trong `<Suspense>`. |
| 4   | Server pages fetch Directus cần `force-dynamic` | Khi Docker không chạy lúc build, server pages gọi Directus sẽ fail. Thêm `export const dynamic = 'force-dynamic'` để skip prerender. |
| 5   | Directus SDK nested fields cần type assertion | Dot notation fields (vd: `"role.name"`) không được TypeScript chấp nhận — dùng `as never[]` để bypass. |

### 7.2. Quản lý dự án

| #   | Bài học | Chi tiết |
| --- | ------- | -------- |
| 1   | Viết tài liệu trước giúp định hình kiến trúc | 11 file docs viết trước khi code giúp rõ ràng scope, giảm thay đổi giữa chừng. |
| 2   | E-commerce nên được plan từ đầu | Thêm e-commerce sau khi hoàn thành core features tạo thêm effort refactor enrollment flow. |
| 3   | Bootstrap script tiết kiệm thời gian setup | `scripts/bootstrap.mjs` tự động tạo roles, policies, permissions, collections — không cần setup thủ công qua Directus admin. |

### 7.3. Cá nhân

| #   | Bài học | Chi tiết |
| --- | ------- | -------- |
| 1   | Sử dụng AI agent (Claude Code) tăng tốc phát triển | Delegating boilerplate code và documentation cho AI agent giúp tập trung vào business logic. |
| 2   | shadcn/ui + Tailwind CSS rút ngắn thời gian UI | Copy-paste components + utility classes cho phép build UI nhanh mà vẫn consistent. |
| 3   | Directus là lựa chọn tốt cho MVP | Auto-generated API + admin panel giảm ~70% effort backend cho graduation project. |

---

## 8. Tổng kết

### 8.1. Kết quả đạt được

- [x] Hoàn thành tất cả chức năng Must Have
- [x] Hoàn thành tất cả chức năng Should Have
- [x] Hoàn thành phần lớn chức năng Could Have
- [x] Tích hợp thương mại điện tử (giỏ hàng, đơn hàng, thanh toán giả lập)
- [x] Tất cả trang responsive (mobile/tablet/desktop)
- [x] Tài liệu đầy đủ (11 files)

### 8.2. Thống kê code

| Metric | Số lượng |
| ------ | -------- |
| Source files | ~142 |
| API route files | ~43 |
| Component files | ~42 |
| Query helper modules | 6 |
| Documentation files | 11 |
| Database collections | 18 + 1 singleton |

---

_Tài liệu theo dõi tiến độ - Hệ Thống Quản Lý Khoá Học Trực Tuyến_
