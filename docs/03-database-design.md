# THIẾT KẾ CƠ SỞ DỮ LIỆU

## Hệ Thống Quản Lý Khoá Học Trực Tuyến (E-Learning Platform)

---

## 1. Tổng quan

Hệ thống sử dụng PostgreSQL 16 làm hệ quản trị cơ sở dữ liệu chính, được quản lý thông qua Directus 11.x. Cơ sở dữ liệu bao gồm 18 collections (bảng) + 1 singleton được thiết kế theo chuẩn hoá 3NF, đảm bảo tính toàn vẹn dữ liệu thông qua foreign key constraints, unique constraints và check constraints.

### 1.1. Quy ước đặt tên

- Tên bảng: snake_case, số nhiều (vd: `courses`, `enrollments`)
- Tên cột: snake_case (vd: `course_id`, `created_at`)
- Primary key: `id` (UUID)
- Foreign key: `<table_singular>_id` (vd: `course_id`, `user_id`)
- Timestamp fields: `date_created`, `date_updated` (Directus convention)
- Status fields: `status` (enum string)
- Sort fields: `sort` (integer)

### 1.2. Kiểu dữ liệu chung

| Kiểu             | Sử dụng cho                                                |
| ---------------- | ---------------------------------------------------------- |
| `uuid`           | Primary key, foreign key                                   |
| `varchar(255)`   | Tên, tiêu đề, slug                                         |
| `text`           | Mô tả ngắn, nội dung                                       |
| `integer`        | Số đếm, thứ tự sắp xếp, điểm                               |
| `decimal(10,2)`  | Giá, phần trăm                                             |
| `boolean`        | Cờ đúng/sai                                                |
| `json` / `jsonb` | Dữ liệu linh hoạt (requirements, objectives, social_links) |
| `timestamp`      | Thời gian                                                  |
| `enum` (varchar) | Trạng thái, loại                                           |

---

## 2. Chi tiết schema 18 collections + 1 singleton

### 2.1. directus_users (Mở rộng)

Directus cung cấp sẵn bảng `directus_users` với các fields cơ bản. Hệ thống mở rộng thêm các fields tùy chỉnh.

**Mô tả:** Lưu trữ thông tin người dùng (Admin, Instructor, Student).

| Cột            | Kiểu dữ liệu   | Ràng buộc                     | Mô tả                                                                  |
| -------------- | -------------- | ----------------------------- | ---------------------------------------------------------------------- |
| `id`           | `uuid`         | PK, NOT NULL                  | ID người dùng (Directus auto)                                          |
| `first_name`   | `varchar(255)` |                               | Tên                                                                    |
| `last_name`    | `varchar(255)` |                               | Họ                                                                     |
| `email`        | `varchar(255)` | UNIQUE, NOT NULL              | Email đăng nhập                                                        |
| `password`     | `varchar(255)` | NOT NULL                      | Mật khẩu đã hash                                                       |
| `avatar`       | `uuid`         | FK → directus_files           | Ảnh đại diện                                                           |
| `role`         | `uuid`         | FK → directus_roles, NOT NULL | Vai trò (Admin/Instructor/Student)                                     |
| `status`       | `varchar(16)`  | DEFAULT 'active'              | Trạng thái: active, suspended, archived                                |
| `bio`          | `text`         |                               | Tiểu sử / giới thiệu bản thân                                          |
| `phone`        | `varchar(20)`  |                               | Số điện thoại                                                          |
| `headline`     | `varchar(255)` |                               | Dòng mô tả ngắn (vd: "Senior Web Developer")                           |
| `social_links` | `jsonb`        | DEFAULT '{}'                  | Liên kết MXH: `{"facebook":"","linkedin":"","github":"","website":""}` |
| `date_created` | `timestamp`    | DEFAULT NOW()                 | Ngày tạo tài khoản                                                     |
| `date_updated` | `timestamp`    |                               | Ngày cập nhật gần nhất                                                 |

**Indexes:**

- `idx_users_email` ON `email` (UNIQUE)
- `idx_users_role` ON `role`
- `idx_users_status` ON `status`

**Directus Roles:**

| Role Name     | Role Key     | Mô tả                              |
| ------------- | ------------ | ---------------------------------- |
| Administrator | `admin`      | Quản trị viên - full access        |
| Instructor    | `instructor` | Giảng viên - quản lý khoá học      |
| Student       | `student`    | Học viên - đăng ký và học khoá học |

---

### 2.2. categories

**Mô tả:** Danh mục khoá học, hỗ trợ cấu trúc phân cấp (self-referencing) với danh mục cha-con.

| Cột            | Kiểu dữ liệu   | Ràng buộc                     | Mô tả                                  |
| -------------- | -------------- | ----------------------------- | -------------------------------------- |
| `id`           | `uuid`         | PK, NOT NULL                  | ID danh mục                            |
| `name`         | `varchar(255)` | NOT NULL                      | Tên danh mục                           |
| `slug`         | `varchar(255)` | UNIQUE, NOT NULL              | Slug URL-friendly                      |
| `description`  | `text`         |                               | Mô tả danh mục                         |
| `icon`         | `varchar(100)` |                               | Tên icon (Lucide icon name)            |
| `parent_id`    | `uuid`         | FK → categories(id), NULLABLE | Danh mục cha (NULL = root)             |
| `sort`         | `integer`      | DEFAULT 0                     | Thứ tự sắp xếp                         |
| `status`       | `varchar(16)`  | DEFAULT 'published'           | Trạng thái: published, draft, archived |
| `date_created` | `timestamp`    | DEFAULT NOW()                 | Ngày tạo                               |
| `date_updated` | `timestamp`    |                               | Ngày cập nhật                          |

**Indexes:**

- `idx_categories_slug` ON `slug` (UNIQUE)
- `idx_categories_parent_id` ON `parent_id`
- `idx_categories_status` ON `status`
- `idx_categories_sort` ON `sort`

**Ví dụ dữ liệu:**

```
| id   | name              | slug              | parent_id | sort |
|------|-------------------|-------------------|-----------|------|
| c001 | Lập trình         | lap-trinh         | NULL      | 1    |
| c002 | Web Development   | web-development   | c001      | 1    |
| c003 | Mobile Development| mobile-development| c001      | 2    |
| c004 | Thiết kế          | thiet-ke          | NULL      | 2    |
| c005 | UI/UX Design      | ui-ux-design      | c004      | 1    |
```

---

### 2.3. courses

**Mô tả:** Lưu trữ thông tin khoá học. Đây là bảng trung tâm của hệ thống.

| Cột                 | Kiểu dữ liệu    | Ràng buộc                     | Mô tả                                                      |
| ------------------- | --------------- | ----------------------------- | ---------------------------------------------------------- |
| `id`                | `uuid`          | PK, NOT NULL                  | ID khoá học                                                |
| `title`             | `varchar(255)`  | NOT NULL                      | Tên khoá học                                               |
| `slug`              | `varchar(255)`  | UNIQUE, NOT NULL              | Slug URL-friendly                                          |
| `description`       | `text`          |                               | Mô tả ngắn (max 300 ký tự hiển thị)                        |
| `content`           | `text`          |                               | Nội dung mô tả chi tiết (HTML từ TipTap)                   |
| `thumbnail`         | `uuid`          | FK → directus_files           | Hình thumbnail khoá học                                    |
| `promo_video_url`   | `varchar(500)`  |                               | URL video giới thiệu (YouTube/Vimeo)                       |
| `category_id`       | `uuid`          | FK → categories(id), NOT NULL | Danh mục khoá học                                          |
| `level`             | `varchar(20)`   | DEFAULT 'all_levels'          | Cấp độ: beginner, intermediate, advanced, all_levels       |
| `language`          | `varchar(10)`   | DEFAULT 'vi'                  | Ngôn ngữ khoá học                                          |
| `price`             | `decimal(10,2)` | DEFAULT 0                     | Giá gốc (0 = miễn phí)                                     |
| `discount_price`    | `decimal(10,2)` | NULLABLE                      | Giá khuyến mãi                                             |
| `status`            | `varchar(16)`   | DEFAULT 'draft'               | Trạng thái: draft, published, archived                     |
| `is_featured`       | `boolean`       | DEFAULT false                 | Khoá học nổi bật                                           |
| `requirements`      | `jsonb`         | DEFAULT '[]'                  | Yêu cầu tiên quyết: `["Biết HTML/CSS cơ bản","Có laptop"]` |
| `objectives`        | `jsonb`         | DEFAULT '[]'                  | Mục tiêu khoá học: `["Xây dựng website","Hiểu React"]`     |
| `target_audience`   | `jsonb`         | DEFAULT '[]'                  | Đối tượng: `["Sinh viên IT","Người mới bắt đầu"]`          |
| `total_duration`    | `integer`       | DEFAULT 0                     | Tổng thời lượng (giây), auto-calculated                    |
| `total_lessons`     | `integer`       | DEFAULT 0                     | Tổng số bài học, auto-calculated                           |
| `total_enrollments` | `integer`       | DEFAULT 0                     | Tổng lượt đăng ký, auto-calculated                         |
| `average_rating`    | `decimal(3,2)`  | DEFAULT 0                     | Điểm đánh giá trung bình, auto-calculated                  |
| `user_created`      | `uuid`          | FK → directus_users(id)       | Người tạo (Directus auto)                                  |
| `date_created`      | `timestamp`     | DEFAULT NOW()                 | Ngày tạo                                                   |
| `user_updated`      | `uuid`          | FK → directus_users(id)       | Người cập nhật                                             |
| `date_updated`      | `timestamp`     |                               | Ngày cập nhật                                              |

**Indexes:**

- `idx_courses_slug` ON `slug` (UNIQUE)
- `idx_courses_category_id` ON `category_id`
- `idx_courses_status` ON `status`
- `idx_courses_is_featured` ON `is_featured`
- `idx_courses_level` ON `level`
- `idx_courses_average_rating` ON `average_rating`
- `idx_courses_total_enrollments` ON `total_enrollments`
- `idx_courses_date_created` ON `date_created`

**Check Constraints:**

- `chk_courses_price` : `price >= 0`
- `chk_courses_discount` : `discount_price IS NULL OR discount_price < price`
- `chk_courses_rating` : `average_rating >= 0 AND average_rating <= 5`

---

### 2.4. courses_instructors (Junction Table - M2M)

**Mô tả:** Bảng liên kết nhiều-nhiều giữa khoá học và giảng viên. Một khoá học có thể có nhiều giảng viên, một giảng viên có thể tạo nhiều khoá học.

| Cột                 | Kiểu dữ liệu | Ràng buộc                                            | Mô tả                                  |
| ------------------- | ------------ | ---------------------------------------------------- | -------------------------------------- |
| `id`                | `uuid`       | PK, NOT NULL                                         | ID bản ghi                             |
| `courses_id`        | `uuid`       | FK → courses(id), NOT NULL, ON DELETE CASCADE        | ID khoá học                            |
| `directus_users_id` | `uuid`       | FK → directus_users(id), NOT NULL, ON DELETE CASCADE | ID giảng viên                          |
| `sort`              | `integer`    | DEFAULT 0                                            | Thứ tự giảng viên (primary, secondary) |

**Indexes:**

- `idx_courses_instructors_unique` ON (`courses_id`, `directus_users_id`) (UNIQUE)
- `idx_courses_instructors_course` ON `courses_id`
- `idx_courses_instructors_user` ON `directus_users_id`

---

### 2.5. modules

**Mô tả:** Phần/chương trong khoá học. Mỗi khoá học có nhiều module, mỗi module chứa nhiều bài học.

| Cột            | Kiểu dữ liệu   | Ràng buộc                                     | Mô tả                         |
| -------------- | -------------- | --------------------------------------------- | ----------------------------- |
| `id`           | `uuid`         | PK, NOT NULL                                  | ID module                     |
| `title`        | `varchar(255)` | NOT NULL                                      | Tên module/chương             |
| `description`  | `text`         |                                               | Mô tả module                  |
| `course_id`    | `uuid`         | FK → courses(id), NOT NULL, ON DELETE CASCADE | Khoá học chứa module          |
| `sort`         | `integer`      | DEFAULT 0, NOT NULL                           | Thứ tự sắp xếp trong khoá học |
| `date_created` | `timestamp`    | DEFAULT NOW()                                 | Ngày tạo                      |
| `date_updated` | `timestamp`    |                                               | Ngày cập nhật                 |

**Indexes:**

- `idx_modules_course_id` ON `course_id`
- `idx_modules_sort` ON (`course_id`, `sort`)

---

### 2.6. lessons

**Mô tả:** Bài học trong module. Có thể là video, văn bản hoặc kết hợp.

| Cột              | Kiểu dữ liệu   | Ràng buộc                                     | Mô tả                                  |
| ---------------- | -------------- | --------------------------------------------- | -------------------------------------- |
| `id`             | `uuid`         | PK, NOT NULL                                  | ID bài học                             |
| `title`          | `varchar(255)` | NOT NULL                                      | Tên bài học                            |
| `slug`           | `varchar(255)` | NOT NULL                                      | Slug URL-friendly                      |
| `content`        | `text`         |                                               | Nội dung văn bản (HTML từ TipTap)      |
| `video_url`      | `varchar(500)` |                                               | URL video bài giảng                    |
| `video_duration` | `integer`      | DEFAULT 0                                     | Thời lượng video (giây)                |
| `module_id`      | `uuid`         | FK → modules(id), NOT NULL, ON DELETE CASCADE | Module chứa bài học                    |
| `sort`           | `integer`      | DEFAULT 0, NOT NULL                           | Thứ tự sắp xếp trong module            |
| `is_preview`     | `boolean`      | DEFAULT false                                 | Cho phép xem trước (không cần đăng ký) |
| `lesson_type`    | `varchar(20)`  | DEFAULT 'video'                               | Loại bài học: video, text, mixed       |
| `status`         | `varchar(16)`  | DEFAULT 'draft'                               | Trạng thái: draft, published           |
| `date_created`   | `timestamp`    | DEFAULT NOW()                                 | Ngày tạo                               |
| `date_updated`   | `timestamp`    |                                               | Ngày cập nhật                          |

**Quan hệ M2M với files (attachments):** Sử dụng junction table `lessons_files` (Directus auto-generate) để liên kết bài học với tài liệu đính kèm.

**Indexes:**

- `idx_lessons_module_id` ON `module_id`
- `idx_lessons_slug` ON `slug`
- `idx_lessons_sort` ON (`module_id`, `sort`)
- `idx_lessons_status` ON `status`
- `idx_lessons_is_preview` ON `is_preview`

---

### 2.7. enrollments

**Mô tả:** Bản ghi đăng ký khoá học của học viên. Theo dõi trạng thái và tiến độ.

| Cột                       | Kiểu dữ liệu   | Ràng buộc                                            | Mô tả                                    |
| ------------------------- | -------------- | ---------------------------------------------------- | ---------------------------------------- |
| `id`                      | `uuid`         | PK, NOT NULL                                         | ID enrollment                            |
| `user_id`                 | `uuid`         | FK → directus_users(id), NOT NULL, ON DELETE CASCADE | Học viên                                 |
| `course_id`               | `uuid`         | FK → courses(id), NOT NULL, ON DELETE CASCADE        | Khoá học                                 |
| `enrolled_at`             | `timestamp`    | DEFAULT NOW(), NOT NULL                              | Thời điểm đăng ký                        |
| `completed_at`            | `timestamp`    | NULLABLE                                             | Thời điểm hoàn thành                     |
| `status`                  | `varchar(16)`  | DEFAULT 'active'                                     | Trạng thái: active, completed, cancelled |
| `progress_percentage`     | `decimal(5,2)` | DEFAULT 0                                            | Tiến độ (0.00 - 100.00%)                 |
| `last_accessed_lesson_id` | `uuid`         | FK → lessons(id), NULLABLE                           | Bài học truy cập gần nhất                |
| `date_created`            | `timestamp`    | DEFAULT NOW()                                        | Ngày tạo                                 |
| `date_updated`            | `timestamp`    |                                                      | Ngày cập nhật                            |

**Indexes:**

- `idx_enrollments_unique` ON (`user_id`, `course_id`) (UNIQUE)
- `idx_enrollments_user_id` ON `user_id`
- `idx_enrollments_course_id` ON `course_id`
- `idx_enrollments_status` ON `status`
- `idx_enrollments_enrolled_at` ON `enrolled_at`

**Check Constraints:**

- `chk_enrollments_progress` : `progress_percentage >= 0 AND progress_percentage <= 100`

---

### 2.8. progress

**Mô tả:** Theo dõi tiến độ hoàn thành từng bài học của học viên trong enrollment.

| Cột              | Kiểu dữ liệu | Ràng buộc                                         | Mô tả                      |
| ---------------- | ------------ | ------------------------------------------------- | -------------------------- |
| `id`             | `uuid`       | PK, NOT NULL                                      | ID progress                |
| `enrollment_id`  | `uuid`       | FK → enrollments(id), NOT NULL, ON DELETE CASCADE | Enrollment tương ứng       |
| `lesson_id`      | `uuid`       | FK → lessons(id), NOT NULL, ON DELETE CASCADE     | Bài học                    |
| `is_completed`   | `boolean`    | DEFAULT false                                     | Đã hoàn thành chưa         |
| `completed_at`   | `timestamp`  | NULLABLE                                          | Thời điểm hoàn thành       |
| `video_position` | `integer`    | DEFAULT 0                                         | Vị trí video đã xem (giây) |
| `date_created`   | `timestamp`  | DEFAULT NOW()                                     | Ngày tạo                   |
| `date_updated`   | `timestamp`  |                                                   | Ngày cập nhật              |

**Indexes:**

- `idx_progress_unique` ON (`enrollment_id`, `lesson_id`) (UNIQUE)
- `idx_progress_enrollment_id` ON `enrollment_id`
- `idx_progress_lesson_id` ON `lesson_id`
- `idx_progress_is_completed` ON `is_completed`

---

### 2.9. reviews

**Mô tả:** Đánh giá khoá học từ học viên. Mỗi học viên chỉ có thể đánh giá một lần cho mỗi khoá học.

| Cột            | Kiểu dữ liệu  | Ràng buộc                                            | Mô tả                                   |
| -------------- | ------------- | ---------------------------------------------------- | --------------------------------------- |
| `id`           | `uuid`        | PK, NOT NULL                                         | ID đánh giá                             |
| `user_id`      | `uuid`        | FK → directus_users(id), NOT NULL, ON DELETE CASCADE | Học viên đánh giá                       |
| `course_id`    | `uuid`        | FK → courses(id), NOT NULL, ON DELETE CASCADE        | Khoá học được đánh giá                  |
| `rating`       | `integer`     | NOT NULL                                             | Điểm đánh giá (1-5)                     |
| `comment`      | `text`        |                                                      | Bình luận đánh giá                      |
| `status`       | `varchar(16)` | DEFAULT 'approved'                                   | Trạng thái: pending, approved, rejected |
| `date_created` | `timestamp`   | DEFAULT NOW()                                        | Ngày tạo                                |
| `date_updated` | `timestamp`   |                                                      | Ngày cập nhật                           |

**Indexes:**

- `idx_reviews_unique` ON (`user_id`, `course_id`) (UNIQUE)
- `idx_reviews_user_id` ON `user_id`
- `idx_reviews_course_id` ON `course_id`
- `idx_reviews_rating` ON `rating`
- `idx_reviews_status` ON `status`

**Check Constraints:**

- `chk_reviews_rating` : `rating >= 1 AND rating <= 5`

---

### 2.10. quizzes

**Mô tả:** Bài kiểm tra trắc nghiệm gắn với bài học.

| Cột             | Kiểu dữ liệu   | Ràng buộc                                     | Mô tả                                            |
| --------------- | -------------- | --------------------------------------------- | ------------------------------------------------ |
| `id`            | `uuid`         | PK, NOT NULL                                  | ID bài kiểm tra                                  |
| `title`         | `varchar(255)` | NOT NULL                                      | Tên bài kiểm tra                                 |
| `description`   | `text`         |                                               | Mô tả / hướng dẫn                                |
| `lesson_id`     | `uuid`         | FK → lessons(id), NOT NULL, ON DELETE CASCADE | Bài học liên kết                                 |
| `passing_score` | `integer`      | DEFAULT 70, NOT NULL                          | Điểm đạt (%)                                     |
| `time_limit`    | `integer`      | NULLABLE                                      | Giới hạn thời gian (phút), NULL = không giới hạn |
| `max_attempts`  | `integer`      | DEFAULT 0                                     | Số lần làm tối đa (0 = không giới hạn)           |
| `date_created`  | `timestamp`    | DEFAULT NOW()                                 | Ngày tạo                                         |
| `date_updated`  | `timestamp`    |                                               | Ngày cập nhật                                    |

**Indexes:**

- `idx_quizzes_lesson_id` ON `lesson_id`

**Check Constraints:**

- `chk_quizzes_passing_score` : `passing_score >= 0 AND passing_score <= 100`
- `chk_quizzes_time_limit` : `time_limit IS NULL OR time_limit > 0`
- `chk_quizzes_max_attempts` : `max_attempts >= 0`

---

### 2.11. quiz_questions

**Mô tả:** Câu hỏi trong bài kiểm tra.

| Cột             | Kiểu dữ liệu  | Ràng buộc                                     | Mô tả                                |
| --------------- | ------------- | --------------------------------------------- | ------------------------------------ |
| `id`            | `uuid`        | PK, NOT NULL                                  | ID câu hỏi                           |
| `quiz_id`       | `uuid`        | FK → quizzes(id), NOT NULL, ON DELETE CASCADE | Bài kiểm tra chứa câu hỏi            |
| `question_text` | `text`        | NOT NULL                                      | Nội dung câu hỏi                     |
| `question_type` | `varchar(20)` | DEFAULT 'single_choice', NOT NULL             | Loại: single_choice, multiple_choice |
| `explanation`   | `text`        |                                               | Giải thích đáp án đúng               |
| `sort`          | `integer`     | DEFAULT 0, NOT NULL                           | Thứ tự câu hỏi                       |
| `points`        | `integer`     | DEFAULT 1, NOT NULL                           | Điểm cho câu hỏi                     |
| `date_created`  | `timestamp`   | DEFAULT NOW()                                 | Ngày tạo                             |
| `date_updated`  | `timestamp`   |                                               | Ngày cập nhật                        |

**Indexes:**

- `idx_quiz_questions_quiz_id` ON `quiz_id`
- `idx_quiz_questions_sort` ON (`quiz_id`, `sort`)

**Check Constraints:**

- `chk_quiz_questions_points` : `points > 0`

---

### 2.12. quiz_answers

**Mô tả:** Đáp án cho mỗi câu hỏi.

| Cột            | Kiểu dữ liệu | Ràng buộc                                            | Mô tả               |
| -------------- | ------------ | ---------------------------------------------------- | ------------------- |
| `id`           | `uuid`       | PK, NOT NULL                                         | ID đáp án           |
| `question_id`  | `uuid`       | FK → quiz_questions(id), NOT NULL, ON DELETE CASCADE | Câu hỏi chứa đáp án |
| `answer_text`  | `text`       | NOT NULL                                             | Nội dung đáp án     |
| `is_correct`   | `boolean`    | DEFAULT false, NOT NULL                              | Là đáp án đúng      |
| `sort`         | `integer`    | DEFAULT 0, NOT NULL                                  | Thứ tự hiển thị     |
| `date_created` | `timestamp`  | DEFAULT NOW()                                        | Ngày tạo            |
| `date_updated` | `timestamp`  |                                                      | Ngày cập nhật       |

**Indexes:**

- `idx_quiz_answers_question_id` ON `question_id`
- `idx_quiz_answers_sort` ON (`question_id`, `sort`)

---

### 2.13. quiz_attempts

**Mô tả:** Lưu trữ kết quả mỗi lần làm bài kiểm tra của học viên.

| Cột            | Kiểu dữ liệu   | Ràng buộc                                            | Mô tả                |
| -------------- | -------------- | ---------------------------------------------------- | -------------------- |
| `id`           | `uuid`         | PK, NOT NULL                                         | ID lần làm bài       |
| `quiz_id`      | `uuid`         | FK → quizzes(id), NOT NULL, ON DELETE CASCADE        | Bài kiểm tra         |
| `user_id`      | `uuid`         | FK → directus_users(id), NOT NULL, ON DELETE CASCADE | Học viên             |
| `score`        | `decimal(5,2)` | NOT NULL                                             | Điểm đạt được (%)    |
| `is_passed`    | `boolean`      | NOT NULL                                             | Đạt hay không        |
| `answers`      | `jsonb`        | NOT NULL                                             | Chi tiết câu trả lời |
| `started_at`   | `timestamp`    | NOT NULL                                             | Thời điểm bắt đầu    |
| `completed_at` | `timestamp`    | NULLABLE                                             | Thời điểm hoàn thành |
| `date_created` | `timestamp`    | DEFAULT NOW()                                        | Ngày tạo             |

**Cấu trúc JSON `answers`:**

```json
[
  {
    "question_id": "uuid",
    "selected_answer_ids": ["uuid"],
    "is_correct": true,
    "points_earned": 1,
    "points_possible": 1
  }
]
```

**Indexes:**

- `idx_quiz_attempts_quiz_id` ON `quiz_id`
- `idx_quiz_attempts_user_id` ON `user_id`
- `idx_quiz_attempts_quiz_user` ON (`quiz_id`, `user_id`)

**Check Constraints:**

- `chk_quiz_attempts_score` : `score >= 0 AND score <= 100`

---

### 2.14. notifications

**Mô tả:** Hệ thống thông báo trong ứng dụng cho người dùng.

| Cột            | Kiểu dữ liệu   | Ràng buộc                                            | Mô tả                                            |
| -------------- | -------------- | ---------------------------------------------------- | ------------------------------------------------ |
| `id`           | `uuid`         | PK, NOT NULL                                         | ID thông báo                                     |
| `user_id`      | `uuid`         | FK → directus_users(id), NOT NULL, ON DELETE CASCADE | Người nhận                                       |
| `title`        | `varchar(255)` | NOT NULL                                             | Tiêu đề thông báo                                |
| `message`      | `text`         | NOT NULL                                             | Nội dung thông báo                               |
| `type`         | `varchar(30)`  | DEFAULT 'info', NOT NULL                             | Loại: info, enrollment, progress, review, system |
| `is_read`      | `boolean`      | DEFAULT false, NOT NULL                              | Đã đọc chưa                                      |
| `link`         | `varchar(500)` |                                                      | URL điều hướng khi nhấn vào                      |
| `date_created` | `timestamp`    | DEFAULT NOW()                                        | Ngày tạo                                         |

**Indexes:**

- `idx_notifications_user_id` ON `user_id`
- `idx_notifications_is_read` ON (`user_id`, `is_read`)
- `idx_notifications_date_created` ON `date_created`
- `idx_notifications_type` ON `type`

---

### 2.15. cart_items

**Mô tả:** Giỏ hàng tạm thời, lưu khoá học mà học viên muốn mua.

| Cột            | Kiểu dữ liệu | Ràng buộc                                            | Mô tả           |
| -------------- | ------------ | ---------------------------------------------------- | --------------- |
| `id`           | `uuid`       | PK, NOT NULL                                         | ID item         |
| `user_id`      | `uuid`       | FK → directus_users(id), NOT NULL, ON DELETE CASCADE | Học viên        |
| `course_id`    | `uuid`       | FK → courses(id), NOT NULL, ON DELETE CASCADE        | Khoá học        |
| `date_created` | `timestamp`  | DEFAULT NOW()                                        | Ngày thêm vào giỏ |

**Indexes:**

- `idx_cart_items_unique` ON (`user_id`, `course_id`) (UNIQUE)
- `idx_cart_items_user_id` ON `user_id`

---

### 2.16. wishlists

**Mô tả:** Danh sách yêu thích, lưu khoá học mà học viên quan tâm.

| Cột            | Kiểu dữ liệu | Ràng buộc                                            | Mô tả           |
| -------------- | ------------ | ---------------------------------------------------- | --------------- |
| `id`           | `uuid`       | PK, NOT NULL                                         | ID item         |
| `user_id`      | `uuid`       | FK → directus_users(id), NOT NULL, ON DELETE CASCADE | Học viên        |
| `course_id`    | `uuid`       | FK → courses(id), NOT NULL, ON DELETE CASCADE        | Khoá học        |
| `date_created` | `timestamp`  | DEFAULT NOW()                                        | Ngày thêm       |

**Indexes:**

- `idx_wishlists_unique` ON (`user_id`, `course_id`) (UNIQUE)
- `idx_wishlists_user_id` ON `user_id`

---

### 2.17. orders

**Mô tả:** Đơn hàng mua khoá học, lưu thông tin thanh toán và trạng thái.

| Cột              | Kiểu dữ liệu    | Ràng buộc                                            | Mô tả                                         |
| ---------------- | --------------- | ---------------------------------------------------- | --------------------------------------------- |
| `id`             | `uuid`          | PK, NOT NULL                                         | ID đơn hàng                                   |
| `user_id`        | `uuid`          | FK → directus_users(id), NOT NULL, ON DELETE CASCADE | Người mua                                     |
| `order_number`   | `varchar(50)`   | UNIQUE, NOT NULL                                     | Mã đơn hàng (auto-generate, vd: ORD-20250115) |
| `total_amount`   | `decimal(10,2)` | NOT NULL                                             | Tổng tiền                                     |
| `status`         | `varchar(16)`   | DEFAULT 'pending', NOT NULL                          | Trạng thái: pending, success, failed, cancelled |
| `payment_method` | `varchar(20)`   | NOT NULL                                             | Phương thức: vnpay, momo, bank_transfer       |
| `payment_ref`    | `varchar(255)`  | NULLABLE                                             | Mã tham chiếu thanh toán                      |
| `paid_at`        | `timestamp`     | NULLABLE                                             | Thời điểm thanh toán thành công               |
| `date_created`   | `timestamp`     | DEFAULT NOW()                                        | Ngày tạo                                      |

**Indexes:**

- `idx_orders_user_id` ON `user_id`
- `idx_orders_order_number` ON `order_number` (UNIQUE)
- `idx_orders_status` ON `status`
- `idx_orders_date_created` ON `date_created`

**Check Constraints:**

- `chk_orders_total_amount` : `total_amount >= 0`

---

### 2.18. order_items

**Mô tả:** Chi tiết từng khoá học trong đơn hàng.

| Cột          | Kiểu dữ liệu    | Ràng buộc                                     | Mô tả       |
| ------------ | --------------- | --------------------------------------------- | ----------- |
| `id`         | `uuid`          | PK, NOT NULL                                  | ID item     |
| `order_id`   | `uuid`          | FK → orders(id), NOT NULL, ON DELETE CASCADE  | Đơn hàng    |
| `course_id`  | `uuid`          | FK → courses(id), NOT NULL, ON DELETE CASCADE | Khoá học    |
| `price`      | `decimal(10,2)` | NOT NULL                                      | Giá tại thời điểm mua |

**Indexes:**

- `idx_order_items_order_id` ON `order_id`
- `idx_order_items_course_id` ON `course_id`

---

### 2.19. platform_settings (Singleton)

**Mô tả:** Cài đặt chung của nền tảng. Chỉ có 1 bản ghi duy nhất (Directus singleton collection).

| Cột                     | Kiểu dữ liệu   | Ràng buộc     | Mô tả                    |
| ----------------------- | -------------- | ------------- | ------------------------ |
| `id`                    | `uuid`         | PK, NOT NULL  | ID bản ghi                |
| `platform_name`         | `varchar(255)` | NOT NULL      | Tên nền tảng              |
| `platform_description`  | `text`         |               | Mô tả nền tảng            |
| `maintenance_mode`      | `boolean`      | DEFAULT false | Chế độ bảo trì            |
| `maintenance_message`   | `text`         |               | Thông báo bảo trì         |
| `date_updated`          | `timestamp`    |               | Ngày cập nhật             |

---

## 3. Tổng hợp quan hệ giữa các bảng (ER Relationships Summary)

### 3.1. Bảng tóm tắt quan hệ

| Quan hệ | Bảng 1           | Loại | Bảng 2                              | Mô tả                                                  |
| ------- | ---------------- | ---- | ----------------------------------- | ------------------------------------------------------ |
| R01     | `directus_users` | 1:N  | `courses` (qua courses_instructors) | User tạo nhiều khoá học                                |
| R02     | `courses`        | M:N  | `directus_users`                    | Khoá học có nhiều giảng viên (qua courses_instructors) |
| R03     | `categories`     | 1:N  | `courses`                           | Danh mục chứa nhiều khoá học                           |
| R04     | `categories`     | 1:N  | `categories`                        | Danh mục cha-con (self-ref)                            |
| R05     | `courses`        | 1:N  | `modules`                           | Khoá học có nhiều module                               |
| R06     | `modules`        | 1:N  | `lessons`                           | Module có nhiều bài học                                |
| R07     | `lessons`        | M:N  | `directus_files`                    | Bài học có nhiều tài liệu đính kèm                     |
| R08     | `directus_users` | 1:N  | `enrollments`                       | User đăng ký nhiều khoá học                            |
| R09     | `courses`        | 1:N  | `enrollments`                       | Khoá học có nhiều lượt đăng ký                         |
| R10     | `enrollments`    | 1:N  | `progress`                          | Enrollment có nhiều progress records                   |
| R11     | `lessons`        | 1:N  | `progress`                          | Bài học có nhiều progress records                      |
| R12     | `directus_users` | 1:N  | `reviews`                           | User viết nhiều đánh giá                               |
| R13     | `courses`        | 1:N  | `reviews`                           | Khoá học có nhiều đánh giá                             |
| R14     | `lessons`        | 1:N  | `quizzes`                           | Bài học có quiz (thường 1:1 nhưng thiết kế 1:N)        |
| R15     | `quizzes`        | 1:N  | `quiz_questions`                    | Quiz có nhiều câu hỏi                                  |
| R16     | `quiz_questions` | 1:N  | `quiz_answers`                      | Câu hỏi có nhiều đáp án                                |
| R17     | `quizzes`        | 1:N  | `quiz_attempts`                     | Quiz có nhiều lần thử                                  |
| R18     | `directus_users` | 1:N  | `quiz_attempts`                     | User có nhiều lần thử quiz                             |
| R19     | `directus_users` | 1:N  | `notifications`                     | User nhận nhiều thông báo                              |
| R20     | `enrollments`    | N:1  | `lessons`                           | Enrollment ref đến bài học truy cập gần nhất           |
| R21     | `directus_users` | 1:N  | `cart_items`             | User có nhiều item trong giỏ hàng                  |
| R22     | `courses`        | 1:N  | `cart_items`             | Khoá học có nhiều lượt thêm vào giỏ               |
| R23     | `directus_users` | 1:N  | `wishlists`              | User có nhiều khoá học trong wishlist              |
| R24     | `courses`        | 1:N  | `wishlists`              | Khoá học có nhiều lượt thêm wishlist              |
| R25     | `directus_users` | 1:N  | `orders`                 | User có nhiều đơn hàng                             |
| R26     | `orders`         | 1:N  | `order_items`            | Đơn hàng có nhiều khoá học                         |
| R27     | `courses`        | 1:N  | `order_items`            | Khoá học có trong nhiều đơn hàng                   |

### 3.2. ER Diagram (Text Representation)

```
                                    ┌──────────────┐
                                    │  categories  │
                                    │──────────────│
                                    │ id (PK)      │
                                    │ name         │
                              ┌─────│ parent_id(FK)│──────┐ (self-ref)
                              │     │ slug         │      │
                              │     │ ...          │      │
                              │     └──────┬───────┘      │
                              │            │ 1:N          │
                              │            ▼              │
┌──────────────┐         ┌─────────────────────────┐      │
│directus_users│         │        courses           │      │
│──────────────│         │─────────────────────────│      │
│ id (PK)      │         │ id (PK)                 │      │
│ first_name   │    M:N  │ title                   │      │
│ last_name    │◀═══════▶│ slug                    │      │
│ email        │  (via   │ category_id (FK)────────┘      │
│ bio          │ courses_│ thumbnail (FK)→files            │
│ phone        │instructo│ status                          │
│ headline     │  rs)    │ is_featured                     │
│ social_links │         │ requirements (JSON)             │
│ ...          │         │ objectives (JSON)               │
└──────┬───────┘         │ target_audience (JSON)          │
       │                 │ total_duration                  │
       │                 │ total_lessons                   │
       │                 │ total_enrollments               │
       │                 │ average_rating                  │
       │                 │ ...                             │
       │                 └───┬──────────────┬──────────────┘
       │                     │ 1:N          │ 1:N
       │                     ▼              │
       │              ┌──────────────┐      │
       │              │   modules    │      │
       │              │──────────────│      │
       │              │ id (PK)      │      │
       │              │ title        │      │
       │              │ course_id(FK)│      │
       │              │ sort         │      │
       │              └──────┬───────┘      │
       │                     │ 1:N          │
       │                     ▼              │
       │              ┌──────────────┐      │
       │              │   lessons    │      │
       │              │──────────────│      │
       │              │ id (PK)      │      │
       │              │ title        │      │
       │              │ module_id(FK)│      │
       │              │ video_url    │      │
       │              │ is_preview   │      │
       │              │ lesson_type  │      │
       │              │ ...          │      │
       │              └─┬──────┬─────┘      │
       │                │ 1:N  │ 1:N        │
       │                ▼      │            │
       │         ┌──────────┐  │            │
       │         │ quizzes  │  │            │
       │         │──────────│  │            │
       │         │ id (PK)  │  │            │
       │         │lesson_id │  │            │
       │         │pass_score│  │            │
       │         │time_limit│  │            │
       │         └────┬─────┘  │            │
       │              │ 1:N    │            │
       │              ▼        │            │
       │     ┌──────────────┐  │            │
       │     │quiz_questions│  │            │
       │     │──────────────│  │            │
       │     │ id (PK)      │  │            │
       │     │ quiz_id (FK) │  │            │
       │     │ question_text│  │            │
       │     │ question_type│  │            │
       │     │ points       │  │            │
       │     └────┬─────────┘  │            │
       │          │ 1:N        │            │
       │          ▼            │            │
       │     ┌──────────────┐  │            │
       │     │ quiz_answers │  │            │
       │     │──────────────│  │            │
       │     │ id (PK)      │  │            │
       │     │question_id FK│  │            │
       │     │ answer_text  │  │            │
       │     │ is_correct   │  │            │
       │     └──────────────┘  │            │
       │                       │            │
       │ 1:N          1:N     │            │
       ├─────────┐     ┌──────┘            │
       │         ▼     ▼                   │
       │  ┌────────────────┐               │
       │  │   progress     │               │
       │  │────────────────│               │
       │  │ id (PK)        │               │
       │  │ enrollment_id  │──┐            │
       │  │ lesson_id (FK) │  │            │
       │  │ is_completed   │  │            │
       │  │ video_position │  │            │
       │  └────────────────┘  │            │
       │                      │            │
       │ 1:N                  │ N:1        │
       ├─────────┐     ┌──────┘            │
       │         ▼     ▼                   │
       │  ┌────────────────┐               │
       │  │  enrollments   │◀──────────────┘
       │  │────────────────│     1:N
       │  │ id (PK)        │
       │  │ user_id (FK)   │
       │  │ course_id (FK) │
       │  │ progress_pct   │
       │  │ last_lesson_id │
       │  │ status         │
       │  └────────────────┘
       │
       │ 1:N
       ├─────────┐
       │         ▼
       │  ┌────────────────┐
       │  │   reviews      │
       │  │────────────────│
       │  │ id (PK)        │
       │  │ user_id (FK)   │
       │  │ course_id (FK) │──── courses (1:N)
       │  │ rating (1-5)   │
       │  │ comment        │
       │  │ status         │
       │  └────────────────┘
       │
       │ 1:N
       ├─────────┐
       │         ▼
       │  ┌────────────────┐
       │  │ quiz_attempts  │
       │  │────────────────│
       │  │ id (PK)        │
       │  │ quiz_id (FK)   │──── quizzes (1:N)
       │  │ user_id (FK)   │
       │  │ score          │
       │  │ is_passed      │
       │  │ answers (JSON) │
       │  └────────────────┘
       │
       │ 1:N
       ├─────────┐
       │         ▼
       │  ┌────────────────┐
       │  │ notifications  │
       │  │────────────────│
       │  │ id (PK)        │
       │  │ user_id (FK)   │
       │  │ title          │
       │  │ message        │
       │  │ type           │
       │  │ is_read        │
       │  │ link           │
       │  └────────────────┘
       │
       │ 1:N
       ├─────────┐
       │         ▼
       │  ┌────────────────┐
       │  │  cart_items     │
       │  │────────────────│
       │  │ id (PK)        │
       │  │ user_id (FK)   │
       │  │ course_id (FK) │──── courses (1:N)
       │  │ date_created   │
       │  └────────────────┘
       │
       │ 1:N
       ├─────────┐
       │         ▼
       │  ┌────────────────┐
       │  │  wishlists      │
       │  │────────────────│
       │  │ id (PK)        │
       │  │ user_id (FK)   │
       │  │ course_id (FK) │──── courses (1:N)
       │  │ date_created   │
       │  └────────────────┘
       │
       │ 1:N
       ├─────────┐
       │         ▼
       │  ┌────────────────┐
       │  │   orders        │
       │  │────────────────│
       │  │ id (PK)        │
       │  │ user_id (FK)   │
       │  │ order_number   │
       │  │ total_amount   │
       │  │ status         │
       │  │ payment_method │
       │  │ payment_ref    │
       │  │ paid_at        │
       │  └───────┬────────┘
       │          │ 1:N
       │          ▼
       │  ┌────────────────┐
       │  │  order_items    │
       │  │────────────────│
       │  │ id (PK)        │
       │  │ order_id (FK)  │
       │  │ course_id (FK) │──── courses (1:N)
       │  │ price          │
       │  └────────────────┘


┌────────────────────┐
│ platform_settings  │
│ (Singleton)        │
│────────────────────│
│ id (PK)            │
│ platform_name      │
│ platform_description│
│ maintenance_mode   │
│ maintenance_message│
└────────────────────┘
```

---

## 4. Dữ liệu mẫu (Seed Data)

### 4.1. Directus Roles

```sql
-- Roles được tạo qua Directus Admin
INSERT INTO directus_roles (id, name, icon, description) VALUES
('role-admin-uuid', 'Administrator', 'shield', 'Quản trị viên hệ thống'),
('role-instructor-uuid', 'Instructor', 'graduation-cap', 'Giảng viên'),
('role-student-uuid', 'Student', 'user', 'Học viên');
```

### 4.2. Sample Categories

```sql
INSERT INTO categories (id, name, slug, description, icon, parent_id, sort, status) VALUES
('cat-01', 'Lập trình', 'lap-trinh', 'Các khoá học về lập trình', 'code', NULL, 1, 'published'),
('cat-02', 'Web Development', 'web-development', 'Phát triển ứng dụng web', 'globe', 'cat-01', 1, 'published'),
('cat-03', 'Mobile Development', 'mobile-development', 'Phát triển ứng dụng di động', 'smartphone', 'cat-01', 2, 'published'),
('cat-04', 'Thiết kế', 'thiet-ke', 'Các khoá học về thiết kế', 'palette', NULL, 2, 'published'),
('cat-05', 'UI/UX Design', 'ui-ux-design', 'Thiết kế giao diện và trải nghiệm người dùng', 'layout', 'cat-04', 1, 'published'),
('cat-06', 'Data Science', 'data-science', 'Khoa học dữ liệu', 'bar-chart', NULL, 3, 'published'),
('cat-07', 'DevOps', 'devops', 'Vận hành và triển khai', 'server', NULL, 4, 'published');
```

---

## 5. Migration Strategy

### 5.1. Directus Schema Management

Directus quản lý schema thông qua:

1. **Admin Panel:** Tạo collections và fields qua giao diện.
2. **Schema Snapshot:** Export/import schema dạng YAML.
3. **Directus CLI:** `npx directus schema snapshot` và `npx directus schema apply`.

### 5.2. Schema Versioning

```bash
# Export schema snapshot
npx directus schema snapshot ./snapshots/001-initial-schema.yaml

# Apply schema to new environment
npx directus schema apply ./snapshots/001-initial-schema.yaml
```

---

_Tài liệu thiết kế cơ sở dữ liệu - Hệ Thống Quản Lý Khoá Học Trực Tuyến_
