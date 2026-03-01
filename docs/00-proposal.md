# ĐỀ CƯƠNG ĐỒ ÁN TỐT NGHIỆP

## Hệ Thống Quản Lý Khoá Học Trực Tuyến (E-Learning Platform)

---

## 1. Thông tin chung

| Mục                    | Nội dung                                                   |
| ---------------------- | ---------------------------------------------------------- |
| **Tên đề tài**         | Hệ Thống Quản Lý Khoá Học Trực Tuyến (E-Learning Platform) |
| **Loại đồ án**         | Đồ án tốt nghiệp                                           |
| **Lĩnh vực**           | Phát triển ứng dụng Web                                    |
| **Ngôn ngữ lập trình** | TypeScript, SQL                                            |
| **Nền tảng**           | Web Application (Responsive)                               |

---

## 2. Lý do chọn đề tài

Trong bối cảnh chuyển đổi số và đặc biệt sau ảnh hưởng của đại dịch COVID-19, nhu cầu học trực tuyến đã tăng trưởng vượt bậc. Các nền tảng e-learning như Udemy, Coursera, edX đã chứng minh tính hiệu quả của mô hình giáo dục trực tuyến. Tuy nhiên, phần lớn các nền tảng này là sản phẩm thương mại nước ngoài, chưa tối ưu cho thị trường Việt Nam.

Đề tài này hướng đến việc xây dựng một hệ thống quản lý khoá học trực tuyến hoàn chỉnh, cho phép giảng viên tạo và quản lý nội dung khoá học, sinh viên đăng ký và theo dõi tiến độ học tập, cùng hệ thống quản trị toàn diện cho quản trị viên.

Việc sử dụng Directus làm headless CMS kết hợp với Next.js giúp tận dụng tối đa hiệu năng server-side rendering, đồng thời giảm thiểu thời gian phát triển backend nhờ khả năng auto-generate API và giao diện quản trị của Directus.

---

## 3. Mục tiêu đề tài

### 3.1. Mục tiêu tổng quát

Thiết kế và xây dựng một hệ thống quản lý khoá học trực tuyến (E-Learning Platform) hoàn chỉnh với đầy đủ các chức năng cho ba nhóm người dùng chính: Quản trị viên (Admin), Giảng viên (Instructor) và Học viên (Student).

### 3.2. Mục tiêu cụ thể

1. **Xây dựng hệ thống quản lý nội dung khoá học:** Cho phép giảng viên tạo, chỉnh sửa và tổ chức nội dung khoá học theo cấu trúc module - bài học, bao gồm video bài giảng, nội dung văn bản rich-text, bài kiểm tra trắc nghiệm và tài liệu đính kèm.

2. **Xây dựng hệ thống đăng ký và học tập:** Cho phép học viên duyệt danh mục khoá học, đăng ký khoá học, theo dõi tiến độ học tập, thực hiện bài kiểm tra và đánh giá khoá học.

3. **Xây dựng hệ thống quản trị:** Cung cấp bảng điều khiển cho quản trị viên quản lý toàn bộ người dùng, khoá học, danh mục, đánh giá và theo dõi hoạt động hệ thống thông qua báo cáo thống kê.

4. **Đảm bảo trải nghiệm người dùng:** Giao diện responsive, thân thiện, hiệu năng cao với thời gian tải trang nhanh nhờ server-side rendering và caching.

5. **Đảm bảo bảo mật:** Xác thực JWT, phân quyền theo vai trò (RBAC), bảo vệ API endpoints, mã hoá mật khẩu.

---

## 4. Phạm vi đề tài

### 4.1. Phạm vi thực hiện

| Chức năng             | Mô tả                                                   |
| --------------------- | ------------------------------------------------------- |
| Xác thực & phân quyền | Đăng ký, đăng nhập, quên mật khẩu, phân quyền 3 vai trò |
| Quản lý khoá học      | CRUD khoá học, module, bài học, bài kiểm tra            |
| Đăng ký khoá học      | Học viên đăng ký (miễn phí), theo dõi tiến độ           |
| Hệ thống bài kiểm tra | Trắc nghiệm, chấm điểm tự động, giới hạn thời gian      |
| Đánh giá khoá học     | Rating 1-5 sao, bình luận                               |
| Quản trị hệ thống     | Dashboard thống kê, quản lý users/courses/categories    |
| Thông báo             | Hệ thống notification trong ứng dụng                    |
| Tìm kiếm & lọc        | Tìm kiếm khoá học, lọc theo danh mục/level/trạng thái   |

### 4.2. Giới hạn đề tài

- Chưa tích hợp thanh toán trực tuyến (chỉ hỗ trợ khoá học miễn phí hoặc đánh dấu giá tham khảo)
- Chưa tích hợp live streaming / video conference
- Chưa hỗ trợ chứng chỉ tự động (certificate generation)
- Chưa tích hợp chat real-time giữa giảng viên và học viên
- Chưa hỗ trợ đa ngôn ngữ (i18n)

---

## 5. Công nghệ sử dụng (Tech Stack)

### 5.1. Backend - Headless CMS

| Công nghệ          | Phiên bản | Mục đích                                                          |
| ------------------ | --------- | ----------------------------------------------------------------- |
| **Directus**       | 11.x      | Headless CMS, auto-generate REST & GraphQL API, quản trị nội dung |
| **PostgreSQL**     | 16        | Hệ quản trị CSDL quan hệ chính                                    |
| **Redis**          | 7         | Caching, session management, rate limiting                        |
| **Docker**         | latest    | Container hoá Directus và các services liên quan                  |
| **Docker Compose** | latest    | Orchestration các containers                                      |

### 5.2. Frontend - Web Application

| Công nghệ           | Phiên bản | Mục đích                                         |
| ------------------- | --------- | ------------------------------------------------ |
| **Next.js**         | 15+       | React framework, App Router, SSR/SSG, API Routes |
| **React**           | 19+       | UI library                                       |
| **TypeScript**      | 5.x       | Type-safe JavaScript                             |
| **Tailwind CSS**    | 4+        | Utility-first CSS framework                      |
| **shadcn/ui**       | latest    | Component library dựa trên Radix UI              |
| **Zustand**         | 5.x       | Global state management                          |
| **Zod**             | 3.x       | Schema validation cho form và API                |
| **TipTap**          | 2.x       | Rich text editor cho nội dung khoá học           |
| **React Hook Form** | 7.x       | Form management                                  |
| **Lucide React**    | latest    | Icon library                                     |

### 5.3. Development Tools

| Công nghệ        | Mục đích        |
| ---------------- | --------------- |
| **ESLint**       | Linting code    |
| **Prettier**     | Code formatting |
| **Git & GitHub** | Version control |
| **VS Code**      | Code editor     |
| **Postman**      | API testing     |
| **Figma**        | UI/UX design    |

---

## 6. Kiến trúc tổng quan

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│              │     │                  │     │                  │
│   Browser    │────▶│   Next.js 15+    │────▶│   Directus 11    │
│   (Client)   │◀────│   (Frontend +    │◀────│   (Headless CMS  │
│              │     │    API Routes)   │     │    + REST API)   │
└──────────────┘     └──────────────────┘     └────────┬─────────┘
                                                       │
                                              ┌────────┴─────────┐
                                              │                  │
                                         ┌────▼────┐      ┌─────▼────┐
                                         │PostgreSQL│      │  Redis   │
                                         │   16     │      │    7     │
                                         └─────────┘      └──────────┘
```

---

## 7. Kế hoạch thực hiện (Timeline)

Tổng thời gian dự kiến: **16 tuần** (4 tháng)

### Giai đoạn 1: Khảo sát và phân tích yêu cầu (Tuần 1-2)

| Công việc                                | Sản phẩm                |
| ---------------------------------------- | ----------------------- |
| Khảo sát các nền tảng e-learning hiện có | Báo cáo khảo sát        |
| Thu thập và phân tích yêu cầu chức năng  | Tài liệu đặc tả yêu cầu |
| Xác định use case cho từng vai trò       | Sơ đồ use case          |
| Viết user stories                        | Danh sách user stories  |

### Giai đoạn 2: Thiết kế hệ thống (Tuần 3-4)

| Công việc                    | Sản phẩm                |
| ---------------------------- | ----------------------- |
| Thiết kế kiến trúc hệ thống  | Sơ đồ kiến trúc         |
| Thiết kế cơ sở dữ liệu       | ER Diagram, Schema CSDL |
| Thiết kế API endpoints       | Tài liệu API            |
| Thiết kế wireframe giao diện | Wireframe các trang     |

### Giai đoạn 3: Thiết lập môi trường và Backend (Tuần 5-6)

| Công việc                                                 | Sản phẩm           |
| --------------------------------------------------------- | ------------------ |
| Cấu hình Docker Compose cho Directus + PostgreSQL + Redis | docker-compose.yml |
| Tạo collections và schema trong Directus                  | Database schema    |
| Cấu hình roles & permissions trong Directus               | RBAC configuration |
| Tạo seed data cho testing                                 | Dữ liệu mẫu        |

### Giai đoạn 4: Frontend - Giao diện công cộng (Tuần 7-8)

| Công việc                                                 | Sản phẩm          |
| --------------------------------------------------------- | ----------------- |
| Thiết lập dự án Next.js, cấu hình Tailwind CSS, shadcn/ui | Project setup     |
| Xây dựng layout chung (Header, Footer, Sidebar)           | Layout components |
| Trang chủ, danh mục khoá học, chi tiết khoá học           | Public pages      |
| Trang xác thực (đăng nhập, đăng ký, quên mật khẩu)        | Auth pages        |

### Giai đoạn 5: Frontend - Khu vực Học viên (Tuần 9-10)

| Công việc                                       | Sản phẩm             |
| ----------------------------------------------- | -------------------- |
| Dashboard học viên                              | Student dashboard    |
| Trang học (course player) với video và nội dung | Learning pages       |
| Theo dõi tiến độ và đánh dấu bài học hoàn thành | Progress tracking    |
| Hệ thống bài kiểm tra và đánh giá khoá học      | Quiz & review system |

### Giai đoạn 6: Frontend - Khu vực Giảng viên (Tuần 11-12)

| Công việc                                       | Sản phẩm                  |
| ----------------------------------------------- | ------------------------- |
| Dashboard giảng viên với thống kê               | Instructor dashboard      |
| Form tạo/chỉnh sửa khoá học (multi-step)        | Course management         |
| Quản lý module và bài học (drag & drop sắp xếp) | Module/lesson management  |
| Quiz builder và xem danh sách học viên/đánh giá | Quiz & student management |

### Giai đoạn 7: Frontend - Khu vực Quản trị (Tuần 13-14)

| Công việc                                 | Sản phẩm           |
| ----------------------------------------- | ------------------ |
| Dashboard quản trị với thống kê tổng quan | Admin dashboard    |
| Quản lý người dùng và phân quyền          | User management    |
| Quản lý khoá học, danh mục và đánh giá    | Content management |
| Báo cáo và cài đặt hệ thống               | Reports & settings |

### Giai đoạn 8: Kiểm thử và triển khai (Tuần 15-16)

| Công việc                                                      | Sản phẩm              |
| -------------------------------------------------------------- | --------------------- |
| Kiểm thử chức năng toàn bộ hệ thống                            | Báo cáo kiểm thử      |
| Sửa lỗi và tối ưu hiệu năng                                    | Bug fixes             |
| Triển khai lên server (Directus trên VPS, Next.js trên Vercel) | Production deployment |
| Viết báo cáo đồ án và chuẩn bị bảo vệ                          | Báo cáo đồ án         |

---

## 8. Kết quả dự kiến (Expected Outcomes)

### 8.1. Sản phẩm phần mềm

1. **Hệ thống backend** chạy trên Docker với Directus, PostgreSQL và Redis, cung cấp REST API hoàn chỉnh cho toàn bộ chức năng.

2. **Ứng dụng web frontend** xây dựng trên Next.js 15+ với giao diện responsive, bao gồm:
   - Trang công cộng: Trang chủ, danh mục khoá học, chi tiết khoá học, trang giảng viên
   - Khu vực học viên: Dashboard, trang học, bài kiểm tra, quản lý hồ sơ
   - Khu vực giảng viên: Dashboard, quản lý khoá học/module/bài học/quiz
   - Khu vực quản trị: Dashboard, quản lý users/courses/categories/reviews

3. **Cơ sở dữ liệu** với 14 collections được thiết kế chuẩn hoá, đáp ứng đầy đủ yêu cầu lưu trữ và truy vấn.

### 8.2. Tài liệu

1. Đề cương đồ án (Proposal)
2. Đặc tả yêu cầu (Requirements Specification)
3. Tài liệu kiến trúc hệ thống (System Architecture)
4. Thiết kế cơ sở dữ liệu (Database Design)
5. Tài liệu API (API Documentation)
6. User Stories
7. Mô tả wireframe giao diện (UI Wireframes)
8. Kế hoạch kiểm thử (Testing Plan)
9. Kế hoạch triển khai (Deployment Plan)
10. Theo dõi tiến độ (Progress Tracking)
11. Tài liệu tham khảo (References)

### 8.3. Kiến thức và kỹ năng đạt được

- Nắm vững quy trình phát triển phần mềm từ phân tích, thiết kế đến triển khai
- Kinh nghiệm thực tế với headless CMS (Directus) và modern web framework (Next.js)
- Kỹ năng thiết kế cơ sở dữ liệu quan hệ phức tạp
- Kỹ năng xây dựng giao diện responsive với Tailwind CSS
- Kinh nghiệm containerisation với Docker và triển khai ứng dụng
- Kỹ năng quản lý dự án và viết tài liệu kỹ thuật

---

## 9. Tài liệu tham khảo sơ bộ

1. Directus Documentation - https://docs.directus.io/
2. Next.js Documentation - https://nextjs.org/docs
3. Tailwind CSS Documentation - https://tailwindcss.com/docs
4. shadcn/ui Documentation - https://ui.shadcn.com/
5. PostgreSQL Documentation - https://www.postgresql.org/docs/16/
6. Docker Documentation - https://docs.docker.com/
7. Udemy, Coursera - Tham khảo mô hình và UX

---

_Tài liệu được tạo cho đồ án tốt nghiệp - Hệ Thống Quản Lý Khoá Học Trực Tuyến_
