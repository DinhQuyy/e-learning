# TÀI LIỆU THAM KHẢO

## Hệ Thống Quản Lý Khoá Học Trực Tuyến (E-Learning Platform)

---

## 1. Frameworks và Libraries chính

### 1.1. Backend

| Công nghệ          | Phiên bản | Mô tả                                                                                                                              | Tham khảo                           |
| ------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| **Directus**       | 11.x      | Open-source Headless CMS, tự động tạo REST và GraphQL API cho mọi database schema, tích hợp quản trị giao diện, xác thực JWT, RBAC | https://docs.directus.io/           |
| **PostgreSQL**     | 16        | Hệ quản trị CSDL quan hệ mã nguồn mở mạnh mẽ, hỗ trợ JSONB, full-text search, advanced indexing                                    | https://www.postgresql.org/docs/16/ |
| **Redis**          | 7         | In-memory data store, sử dụng cho caching queries, session management, rate limiting                                               | https://redis.io/docs/              |
| **Docker**         | 27.x      | Nền tảng container hoá, đóng gói và triển khai ứng dụng nhất quán trên mọi môi trường                                              | https://docs.docker.com/            |
| **Docker Compose** | 2.x       | Công cụ định nghĩa và chạy multi-container Docker applications                                                                     | https://docs.docker.com/compose/    |

### 1.2. Frontend

| Công nghệ        | Phiên bản | Mô tả                                                                                                       | Tham khảo                            |
| ---------------- | --------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **Next.js**      | 16        | React framework cho production, hỗ trợ SSR, SSG, ISR, App Router, Server Components, API Routes, Middleware | https://nextjs.org/docs              |
| **React**        | 19+       | Thư viện JavaScript cho xây dựng giao diện người dùng, component-based architecture                         | https://react.dev/                   |
| **TypeScript**   | 5.x       | Superset của JavaScript với static typing, tăng chất lượng code và developer experience                     | https://www.typescriptlang.org/docs/ |
| **Tailwind CSS** | 4+        | Utility-first CSS framework, cho phép xây dựng giao diện nhanh chóng mà không cần viết CSS tùy chỉnh        | https://tailwindcss.com/docs         |
| **shadcn/ui**    | latest    | Bộ sưu tập React components xây dựng trên Radix UI và Tailwind CSS, copy-paste, accessible, customizable    | https://ui.shadcn.com/               |

### 1.3. State Management và Validation

| Công nghệ           | Phiên bản | Mô tả                                                                                      | Tham khảo                     |
| ------------------- | --------- | ------------------------------------------------------------------------------------------ | ----------------------------- |
| **Zustand**         | 5.x       | Lightweight state management cho React, API đơn giản, không boilerplate, hỗ trợ middleware | https://zustand-demo.pmnd.rs/ |
| **Zod**             | 4.x       | TypeScript-first schema declaration và validation, type inference tự động                  | https://zod.dev/              |
| **React Hook Form** | 7.x       | Performant form management cho React, uncontrolled components, tích hợp tốt với Zod        | https://react-hook-form.com/  |

### 1.4. Rich Text Editor

| Công nghệ  | Phiên bản | Mô tả                                                                                            | Tham khảo               |
| ---------- | --------- | ------------------------------------------------------------------------------------------------ | ----------------------- |
| **TipTap** | 2.x       | Headless rich text editor framework cho web, xây dựng trên ProseMirror, extensible, customizable | https://tiptap.dev/docs |

### 1.5. UI và Utilities

| Công nghệ          | Phiên bản | Mô tả                                                                | Tham khảo                                 |
| ------------------ | --------- | -------------------------------------------------------------------- | ----------------------------------------- |
| **Lucide React**   | latest    | Bộ icon SVG đẹp, nhẹ, consistent, fork từ Feather Icons              | https://lucide.dev/                       |
| **Radix UI**       | latest    | Primitive UI components accessible, unstyled, nền tảng cho shadcn/ui | https://www.radix-ui.com/                 |
| **date-fns**       | 3.x       | Thư viện xử lý ngày tháng cho JavaScript, modular, immutable         | https://date-fns.org/                     |
| **clsx**           | 2.x       | Utility cho conditional className construction                       | https://github.com/lukeed/clsx            |
| **tailwind-merge** | 2.x       | Merge Tailwind CSS classes một cách thông minh, tránh conflict       | https://github.com/dcastil/tailwind-merge |
| **qrcode**         | latest    | Thư viện tạo QR code cho trang thanh toán giả lập                | https://github.com/soldair/node-qrcode |
| **lowlight**       | latest    | Syntax highlighting cho code blocks trong TipTap editor          | https://github.com/wooorm/lowlight     |
| **cmdk**           | latest    | Command palette component, tìm kiếm nhanh                       | https://cmdk.paco.me/                  |

---

## 2. Development Tools

| Công cụ             | Mô tả                                                                            | Tham khảo                                   |
| ------------------- | -------------------------------------------------------------------------------- | ------------------------------------------- |
| **Git**             | Hệ thống quản lý phiên bản phân tán                                              | https://git-scm.com/doc                     |
| **GitHub**          | Nền tảng hosting Git repositories, collaboration, CI/CD                          | https://docs.github.com/                    |
| **VS Code**         | Code editor phổ biến, hỗ trợ TypeScript, extensions phong phú                    | https://code.visualstudio.com/docs          |
| **ESLint**          | Công cụ linting JavaScript/TypeScript, phát hiện lỗi và enforce coding standards | https://eslint.org/docs/                    |
| **Prettier**        | Code formatter opinionated, đảm bảo code style nhất quán                         | https://prettier.io/docs/en/                |
| **Postman**         | Công cụ test API, tạo collection, environment variables                          | https://learning.postman.com/               |
| **Chrome DevTools** | Công cụ debug, profile, test responsive tích hợp trong Chrome                    | https://developer.chrome.com/docs/devtools/ |

---

## 3. Deployment và Infrastructure

| Công cụ           | Mô tả                                                                          | Tham khảo                      |
| ----------------- | ------------------------------------------------------------------------------ | ------------------------------ |
| **Vercel**        | Platform triển khai Next.js, serverless functions, edge network, CI/CD tự động | https://vercel.com/docs        |
| **Nginx**         | Web server và reverse proxy, xử lý SSL termination, load balancing             | https://nginx.org/en/docs/     |
| **Let's Encrypt** | Certificate Authority miễn phí, tự động cấp SSL/TLS certificates               | https://letsencrypt.org/docs/  |
| **Certbot**       | Công cụ tự động hoá việc cấp và renew Let's Encrypt certificates               | https://certbot.eff.org/       |
| **Ubuntu**        | Hệ điều hành Linux phổ biến cho server, LTS versions ổn định                   | https://ubuntu.com/server/docs |

---

## 4. Tài liệu kỹ thuật tham khảo

### 4.1. Kiến trúc và Design Patterns

| Tài liệu                         | Tác giả / Nguồn | Nội dung liên quan                                                                          |
| -------------------------------- | --------------- | ------------------------------------------------------------------------------------------- |
| Next.js App Router Documentation | Vercel          | Kiến trúc App Router, Server Components, Server Actions, Middleware, Data Fetching patterns |
| Directus Architecture Guide      | Directus Team   | Database-first approach, auto-generated API, hooks system, RBAC architecture                |
| Headless CMS Architecture        | various         | Kiến trúc tách biệt frontend-backend, API-first development                                 |
| REST API Design Best Practices   | various         | Quy ước đặt tên endpoint, HTTP methods, status codes, pagination, filtering                 |

### 4.2. Database Design

| Tài liệu                              | Tác giả / Nguồn                     | Nội dung liên quan                                           |
| ------------------------------------- | ----------------------------------- | ------------------------------------------------------------ |
| PostgreSQL 16 Documentation           | PostgreSQL Global Development Group | Data types, indexing, constraints, JSONB, performance tuning |
| Database Normalization                | E.F. Codd / various                 | 1NF, 2NF, 3NF normalization cho thiết kế schema              |
| Designing Data-Intensive Applications | Martin Kleppmann                    | Data modeling, indexing strategies, caching patterns         |

### 4.3. Frontend Development

| Tài liệu                                        | Tác giả / Nguồn   | Nội dung liên quan                                                   |
| ----------------------------------------------- | ----------------- | -------------------------------------------------------------------- |
| React 19 Documentation                          | Meta / React Team | Server Components, Hooks, State management, Performance optimization |
| Tailwind CSS Documentation                      | Tailwind Labs     | Utility classes, responsive design, custom configuration             |
| Web Content Accessibility Guidelines (WCAG) 2.1 | W3C               | Accessibility standards: semantic HTML, ARIA, keyboard navigation    |

### 4.4. Security

| Tài liệu               | Tác giả / Nguồn  | Nội dung liên quan                                           |
| ---------------------- | ---------------- | ------------------------------------------------------------ |
| OWASP Top 10           | OWASP Foundation | Top 10 web application security risks, prevention methods    |
| JWT Best Practices     | Auth0 / RFC 7519 | JWT structure, token rotation, refresh token patterns        |
| Next.js Security Guide | Vercel           | CSP headers, CSRF protection, environment variables security |

---

## 5. Nền tảng E-Learning tham khảo

| Nền tảng       | URL                        | Nội dung tham khảo                                                                         |
| -------------- | -------------------------- | ------------------------------------------------------------------------------------------ |
| **Udemy**      | https://www.udemy.com      | Mô hình khoá học marketplace, UX trang chi tiết khoá học, hệ thống đánh giá, course player |
| **Coursera**   | https://www.coursera.org   | Cấu trúc khoá học (modules/lessons), hệ thống quiz, progress tracking, certificates        |
| **edX**        | https://www.edx.org        | Giao diện learning platform, course catalog, instructor dashboard                          |
| **Skillshare** | https://www.skillshare.com | Video-centric learning, class structure, community features                                |

---

## 6. Tài liệu học thuật

| #   | Tài liệu                                                                   | Tác giả                                            | Năm  | Nội dung liên quan                                                            |
| --- | -------------------------------------------------------------------------- | -------------------------------------------------- | ---- | ----------------------------------------------------------------------------- |
| 1   | "Software Engineering: A Practitioner's Approach"                          | Roger S. Pressman, Bruce R. Maxim                  | 2020 | Quy trình phát triển phần mềm, phân tích yêu cầu, thiết kế hệ thống, kiểm thử |
| 2   | "Clean Architecture: A Craftsman's Guide to Software Structure and Design" | Robert C. Martin                                   | 2017 | Nguyên tắc kiến trúc phần mềm, separation of concerns, dependency management  |
| 3   | "Database System Concepts"                                                 | Abraham Silberschatz, Henry F. Korth, S. Sudarshan | 2019 | Thiết kế cơ sở dữ liệu quan hệ, normalization, ER modeling, SQL               |
| 4   | "Don't Make Me Think"                                                      | Steve Krug                                         | 2014 | Nguyên tắc thiết kế giao diện usable, web navigation, testing usability       |
| 5   | "Learning React: Modern Patterns for Developing React Apps"                | Alex Banks, Eve Porcello                           | 2020 | React patterns, hooks, state management, component architecture               |
| 6   | "Designing Data-Intensive Applications"                                    | Martin Kleppmann                                   | 2017 | Data modeling, storage, encoding, replication, caching, consistency           |

---

## 7. Tiêu chuẩn và quy ước áp dụng

| Tiêu chuẩn               | Mô tả                                                   | Áp dụng cho         |
| ------------------------ | ------------------------------------------------------- | ------------------- |
| **Conventional Commits** | Quy ước commit message: `type(scope): description`      | Git commit messages |
| **Semantic Versioning**  | Quy ước đánh phiên bản: MAJOR.MINOR.PATCH               | Package versioning  |
| **REST API Conventions** | Quy ước thiết kế RESTful API                            | API endpoint design |
| **BEM / Utility-first**  | CSS naming convention (Tailwind utility-first approach) | CSS/Styling         |
| **ESLint Recommended**   | Bộ rules linting mặc định của ESLint cho TypeScript     | Code quality        |
| **WCAG 2.1 Level AA**    | Web accessibility guidelines                            | UI accessibility    |

---

## 8. Online Resources

### 8.1. Blogs và Tutorials

| Resource      | URL                         | Nội dung                                      |
| ------------- | --------------------------- | --------------------------------------------- |
| Vercel Blog   | https://vercel.com/blog     | Next.js updates, best practices, case studies |
| Directus Blog | https://directus.io/blog    | Directus tips, tutorials, updates             |
| CSS-Tricks    | https://css-tricks.com      | CSS/Tailwind techniques, responsive design    |
| Josh W Comeau | https://www.joshwcomeau.com | React patterns, CSS-in-JS, animation          |

### 8.2. Community

| Resource                   | URL                                           | Nội dung                             |
| -------------------------- | --------------------------------------------- | ------------------------------------ |
| Directus Discord           | https://discord.com/invite/directus           | Cộng đồng Directus, hỏi đáp, chia sẻ |
| Next.js GitHub Discussions | https://github.com/vercel/next.js/discussions | Thảo luận Next.js, bug reports       |
| Stack Overflow             | https://stackoverflow.com                     | Q&A cho vấn đề kỹ thuật cụ thể       |

---

## 9. Ghi chú bản quyền

Tất cả các thư viện và framework sử dụng trong dự án đều là phần mềm mã nguồn mở (Open Source) với các giấy phép sau:

| Phần mềm     | Giấy phép                                          |
| ------------ | -------------------------------------------------- |
| Directus     | BSL 1.1 (Business Source License) → chuyển GPL-3.0 |
| Next.js      | MIT License                                        |
| React        | MIT License                                        |
| TypeScript   | Apache License 2.0                                 |
| Tailwind CSS | MIT License                                        |
| PostgreSQL   | PostgreSQL License (tương tự MIT)                  |
| Redis        | RSALv2 / SSPLv1 (Redis 7+)                         |
| Docker       | Apache License 2.0                                 |
| shadcn/ui    | MIT License                                        |
| Zustand      | MIT License                                        |
| Zod          | MIT License                                        |
| TipTap       | MIT License (core)                                 |
| Lucide       | ISC License                                        |

Dự án này được phát triển cho mục đích học thuật (đồ án tốt nghiệp) và tuân thủ các điều khoản sử dụng của tất cả thư viện được sử dụng.

---

_Tài liệu tham khảo - Hệ Thống Quản Lý Khoá Học Trực Tuyến_
