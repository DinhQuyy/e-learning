# TÀI LIỆU API

## Hệ Thống Quản Lý Khoá Học Trực Tuyến (E-Learning Platform)

---

## 1. Tổng quan

### 1.1. Base URLs

| Environment | Next.js API                  | Directus API             |
| ----------- | ---------------------------- | ------------------------ |
| Development | `http://localhost:3000/api`  | `http://localhost:8055`  |
| Production  | `https://www.domain.com/api` | `https://api.domain.com` |

### 1.2. Quy ước chung

- **Content-Type:** `application/json`
- **Authentication:** Bearer Token (JWT) trong header `Authorization`
- **Pagination:** `?page=1&limit=20`
- **Sorting:** `?sort=-date_created` (prefix `-` = descending)
- **Filtering:** `?filter[status][_eq]=published`
- **Field Selection:** `?fields=id,title,slug`

### 1.3. Response Format

**Success Response:**

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "total_count": 100,
    "filter_count": 25,
    "page": 1,
    "limit": 20
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Mô tả lỗi cho người dùng",
    "details": [ ... ]
  }
}
```

### 1.4. HTTP Status Codes

| Code  | Ý nghĩa                                        |
| ----- | ---------------------------------------------- |
| `200` | Thành công                                     |
| `201` | Tạo mới thành công                             |
| `204` | Xoá thành công (no content)                    |
| `400` | Bad Request - Yêu cầu không hợp lệ             |
| `401` | Unauthorized - Chưa xác thực                   |
| `403` | Forbidden - Không có quyền                     |
| `404` | Not Found - Không tìm thấy                     |
| `409` | Conflict - Dữ liệu trùng lặp                   |
| `422` | Unprocessable Entity - Dữ liệu validation fail |
| `429` | Too Many Requests - Rate limited               |
| `500` | Internal Server Error                          |

---

## 2. Authentication APIs

### 2.1. POST /api/auth/register

**Mô tả:** Đăng ký tài khoản mới với vai trò Student.

**Authorization:** Không yêu cầu

**Request Body:**

```json
{
  "first_name": "Nguyen",
  "last_name": "Van A",
  "email": "nguyenvana@example.com",
  "password": "SecurePass123",
  "confirm_password": "SecurePass123"
}
```

**Validation Schema (Zod):**

```typescript
const registerSchema = z
  .object({
    first_name: z.string().min(1, "Tên là bắt buộc").max(255),
    last_name: z.string().min(1, "Họ là bắt buộc").max(255),
    email: z.string().email("Email không hợp lệ"),
    password: z
      .string()
      .min(8, "Mật khẩu tối thiểu 8 ký tự")
      .regex(/[A-Z]/, "Phải có ít nhất 1 chữ hoa")
      .regex(/[a-z]/, "Phải có ít nhất 1 chữ thường")
      .regex(/[0-9]/, "Phải có ít nhất 1 số"),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirm_password"],
  });
```

**Success Response (201):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "first_name": "Nguyen",
      "last_name": "Van A",
      "email": "nguyenvana@example.com",
      "role": {
        "id": "role-student-uuid",
        "name": "Student"
      }
    },
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "random_refresh_token_string",
    "expires": 900000
  }
}
```

**Error Responses:**

| Status | Code               | Message                 |
| ------ | ------------------ | ----------------------- |
| 422    | `VALIDATION_ERROR` | Chi tiết lỗi validation |
| 409    | `DUPLICATE_EMAIL`  | Email đã được sử dụng   |

---

### 2.2. POST /api/auth/login

**Mô tả:** Đăng nhập bằng email và mật khẩu.

**Authorization:** Không yêu cầu

**Request Body:**

```json
{
  "email": "nguyenvana@example.com",
  "password": "SecurePass123"
}
```

**Validation Schema:**

```typescript
const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(1, "Mật khẩu là bắt buộc"),
});
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "first_name": "Nguyen",
      "last_name": "Van A",
      "email": "nguyenvana@example.com",
      "avatar": "uuid-or-null",
      "role": {
        "id": "role-student-uuid",
        "name": "Student"
      }
    },
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "random_refresh_token_string",
    "expires": 900000
  }
}
```

**Cookies Set:**

- `access_token`: HTTP-only, Secure, SameSite=Lax, Max-Age=900
- `refresh_token`: HTTP-only, Secure, SameSite=Lax, Max-Age=604800

**Error Responses:**

| Status | Code                  | Message                        |
| ------ | --------------------- | ------------------------------ |
| 401    | `INVALID_CREDENTIALS` | Email hoặc mật khẩu không đúng |
| 403    | `ACCOUNT_SUSPENDED`   | Tài khoản đã bị tạm khoá       |

---

### 2.3. POST /api/auth/logout

**Mô tả:** Đăng xuất, xoá refresh token.

**Authorization:** Bearer Token

**Request Body:**

```json
{
  "refresh_token": "current_refresh_token"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Đăng xuất thành công"
  }
}
```

**Cookies Cleared:** `access_token`, `refresh_token`

---

### 2.4. POST /api/auth/forgot-password

**Mô tả:** Gửi email đặt lại mật khẩu.

**Authorization:** Không yêu cầu

**Request Body:**

```json
{
  "email": "nguyenvana@example.com"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu"
  }
}
```

> **Lưu ý bảo mật:** Luôn trả về thành công bất kể email có tồn tại hay không để tránh email enumeration.

---

### 2.5. POST /api/auth/reset-password

**Mô tả:** Đặt lại mật khẩu bằng token từ email.

**Authorization:** Không yêu cầu

**Request Body:**

```json
{
  "token": "reset_token_from_email",
  "password": "NewSecurePass123",
  "confirm_password": "NewSecurePass123"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Mật khẩu đã được đặt lại thành công"
  }
}
```

**Error Responses:**

| Status | Code               | Message                            |
| ------ | ------------------ | ---------------------------------- |
| 400    | `INVALID_TOKEN`    | Token không hợp lệ hoặc đã hết hạn |
| 422    | `VALIDATION_ERROR` | Mật khẩu không đáp ứng yêu cầu     |

---

### 2.6. POST /api/auth/refresh

**Mô tả:** Làm mới access token bằng refresh token.

**Authorization:** Không yêu cầu (sử dụng refresh token từ cookie)

**Request Body:**

```json
{
  "refresh_token": "current_refresh_token"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "access_token": "new_access_token",
    "refresh_token": "new_refresh_token",
    "expires": 900000
  }
}
```

---

## 3. Enrollment APIs

### 3.1. POST /api/enrollments

**Mô tả:** Đăng ký khoá học.

**Authorization:** Bearer Token (Student)

**Request Body:**

```json
{
  "course_id": "uuid-of-course"
}
```

**Validation Schema:**

```typescript
const enrollmentSchema = z.object({
  course_id: z.string().uuid("Course ID không hợp lệ"),
});
```

**Business Logic:**

1. Kiểm tra user đã xác thực và có role Student.
2. Kiểm tra khoá học tồn tại và status = "published".
3. Kiểm tra chưa đăng ký trước đó (unique constraint).
4. Tạo enrollment record.
5. Tăng `total_enrollments` của course.
6. Tạo notification cho student.

**Success Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "enrollment-uuid",
    "user_id": "user-uuid",
    "course_id": "course-uuid",
    "enrolled_at": "2025-01-15T10:30:00Z",
    "status": "active",
    "progress_percentage": 0,
    "course": {
      "id": "course-uuid",
      "title": "Lập trình Web với React",
      "slug": "lap-trinh-web-voi-react",
      "thumbnail": "uuid"
    }
  }
}
```

**Error Responses:**

| Status | Code               | Message                         |
| ------ | ------------------ | ------------------------------- |
| 401    | `UNAUTHORIZED`     | Vui lòng đăng nhập              |
| 403    | `FORBIDDEN`        | Chỉ học viên mới có thể đăng ký |
| 404    | `COURSE_NOT_FOUND` | Khoá học không tồn tại          |
| 409    | `ALREADY_ENROLLED` | Bạn đã đăng ký khoá học này     |

---

## 4. Progress APIs

### 4.1. PATCH /api/progress

**Mô tả:** Cập nhật tiến độ học bài (đánh dấu hoàn thành, lưu vị trí video).

**Authorization:** Bearer Token (Student)

**Request Body:**

```json
{
  "enrollment_id": "enrollment-uuid",
  "lesson_id": "lesson-uuid",
  "is_completed": true,
  "video_position": 350
}
```

**Validation Schema:**

```typescript
const progressSchema = z.object({
  enrollment_id: z.string().uuid(),
  lesson_id: z.string().uuid(),
  is_completed: z.boolean().optional(),
  video_position: z.number().int().min(0).optional(),
});
```

**Business Logic:**

1. Kiểm tra enrollment thuộc về user hiện tại.
2. Kiểm tra lesson thuộc về course của enrollment.
3. Upsert progress record (tạo mới hoặc cập nhật).
4. Nếu `is_completed = true`, set `completed_at`.
5. Tính lại `progress_percentage` = (completed lessons / total lessons) \* 100.
6. Cập nhật enrollment: `progress_percentage`, `last_accessed_lesson_id`.
7. Nếu progress = 100%, đánh dấu enrollment `completed_at` và `status = completed`.

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "progress": {
      "id": "progress-uuid",
      "enrollment_id": "enrollment-uuid",
      "lesson_id": "lesson-uuid",
      "is_completed": true,
      "completed_at": "2025-01-15T11:00:00Z",
      "video_position": 350
    },
    "enrollment": {
      "progress_percentage": 33.33,
      "status": "active"
    }
  }
}
```

**Error Responses:**

| Status | Code               | Message                       |
| ------ | ------------------ | ----------------------------- |
| 401    | `UNAUTHORIZED`     | Vui lòng đăng nhập            |
| 403    | `NOT_ENROLLED`     | Bạn chưa đăng ký khoá học này |
| 404    | `LESSON_NOT_FOUND` | Bài học không tồn tại         |

---

## 5. Review APIs

### 5.1. POST /api/reviews

**Mô tả:** Tạo hoặc cập nhật đánh giá khoá học.

**Authorization:** Bearer Token (Student)

**Request Body:**

```json
{
  "course_id": "course-uuid",
  "rating": 5,
  "comment": "Khoá học rất hay và dễ hiểu. Giảng viên nhiệt tình."
}
```

**Validation Schema:**

```typescript
const reviewSchema = z.object({
  course_id: z.string().uuid(),
  rating: z.number().int().min(1, "Tối thiểu 1 sao").max(5, "Tối đa 5 sao"),
  comment: z.string().max(2000, "Bình luận tối đa 2000 ký tự").optional(),
});
```

**Business Logic:**

1. Kiểm tra user đã đăng ký khoá học (enrollment exists).
2. Kiểm tra chưa đánh giá trước đó.
3. Tạo review record với status = "approved".
4. Tính lại `average_rating` của khoá học.
5. Tạo notification cho giảng viên.

**Success Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "review-uuid",
    "user_id": "user-uuid",
    "course_id": "course-uuid",
    "rating": 5,
    "comment": "Khoá học rất hay và dễ hiểu. Giảng viên nhiệt tình.",
    "status": "approved",
    "date_created": "2025-01-15T12:00:00Z"
  }
}
```

**Error Responses:**

| Status | Code               | Message                                     |
| ------ | ------------------ | ------------------------------------------- |
| 401    | `UNAUTHORIZED`     | Vui lòng đăng nhập                          |
| 403    | `NOT_ENROLLED`     | Bạn cần đăng ký khoá học trước khi đánh giá |
| 409    | `ALREADY_REVIEWED` | Bạn đã đánh giá khoá học này                |
| 422    | `VALIDATION_ERROR` | Dữ liệu không hợp lệ                        |

---

## 6. Quiz APIs

### 6.1. POST /api/quizzes/[id]/submit

**Mô tả:** Nộp bài kiểm tra.

**Authorization:** Bearer Token (Student)

**URL Parameters:**

- `id` (uuid): ID của quiz

**Request Body:**

```json
{
  "answers": [
    {
      "question_id": "question-uuid-1",
      "selected_answer_ids": ["answer-uuid-1"]
    },
    {
      "question_id": "question-uuid-2",
      "selected_answer_ids": ["answer-uuid-3", "answer-uuid-4"]
    }
  ],
  "started_at": "2025-01-15T13:00:00Z"
}
```

**Validation Schema:**

```typescript
const quizSubmitSchema = z.object({
  answers: z
    .array(
      z.object({
        question_id: z.string().uuid(),
        selected_answer_ids: z
          .array(z.string().uuid())
          .min(1, "Chọn ít nhất 1 đáp án"),
      }),
    )
    .min(1, "Phải trả lời ít nhất 1 câu"),
  started_at: z.string().datetime(),
});
```

**Business Logic:**

1. Kiểm tra user đã đăng ký khoá học chứa quiz.
2. Kiểm tra số lần làm chưa vượt `max_attempts`.
3. Kiểm tra thời gian (nếu có `time_limit`).
4. Fetch quiz questions + correct answers.
5. So sánh từng câu trả lời với đáp án đúng.
6. Tính điểm: `score = (earned_points / total_points) * 100`.
7. Xác định pass/fail dựa trên `passing_score`.
8. Lưu quiz_attempt record.

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "attempt": {
      "id": "attempt-uuid",
      "quiz_id": "quiz-uuid",
      "score": 80.0,
      "is_passed": true,
      "started_at": "2025-01-15T13:00:00Z",
      "completed_at": "2025-01-15T13:15:00Z"
    },
    "details": [
      {
        "question_id": "question-uuid-1",
        "question_text": "React là gì?",
        "selected_answer_ids": ["answer-uuid-1"],
        "correct_answer_ids": ["answer-uuid-1"],
        "is_correct": true,
        "points_earned": 1,
        "points_possible": 1,
        "explanation": "React là thư viện JavaScript để xây dựng giao diện người dùng."
      },
      {
        "question_id": "question-uuid-2",
        "question_text": "Hook nào dùng để quản lý state?",
        "selected_answer_ids": ["answer-uuid-3", "answer-uuid-4"],
        "correct_answer_ids": ["answer-uuid-3"],
        "is_correct": false,
        "points_earned": 0,
        "points_possible": 1,
        "explanation": "useState là hook chính để quản lý local state."
      }
    ],
    "summary": {
      "total_questions": 5,
      "correct_answers": 4,
      "total_points": 5,
      "earned_points": 4,
      "passing_score": 70,
      "time_taken_seconds": 900
    }
  }
}
```

**Error Responses:**

| Status | Code                   | Message                       |
| ------ | ---------------------- | ----------------------------- |
| 401    | `UNAUTHORIZED`         | Vui lòng đăng nhập            |
| 403    | `NOT_ENROLLED`         | Bạn chưa đăng ký khoá học này |
| 404    | `QUIZ_NOT_FOUND`       | Bài kiểm tra không tồn tại    |
| 409    | `MAX_ATTEMPTS_REACHED` | Bạn đã hết lượt làm bài       |
| 422    | `TIME_EXPIRED`         | Đã hết thời gian làm bài      |

---

## 7. Instructor APIs

### 7.1. Course CRUD

#### GET /api/instructor/courses

**Mô tả:** Lấy danh sách khoá học của giảng viên.

**Authorization:** Bearer Token (Instructor)

**Query Parameters:**

| Parameter | Type    | Default       | Mô tả                              |
| --------- | ------- | ------------- | ---------------------------------- |
| `page`    | integer | 1             | Trang hiện tại                     |
| `limit`   | integer | 20            | Số item/trang                      |
| `status`  | string  | all           | Filter: draft, published, archived |
| `search`  | string  |               | Tìm kiếm theo tên                  |
| `sort`    | string  | -date_created | Sắp xếp                            |

**Success Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "course-uuid",
      "title": "Lập trình Web với React",
      "slug": "lap-trinh-web-voi-react",
      "thumbnail": { "id": "file-uuid", "filename_download": "thumb.jpg" },
      "status": "published",
      "level": "intermediate",
      "total_enrollments": 150,
      "average_rating": 4.5,
      "total_lessons": 24,
      "date_created": "2025-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "total_count": 5,
    "filter_count": 5,
    "page": 1,
    "limit": 20
  }
}
```

#### POST /api/instructor/courses

**Mô tả:** Tạo khoá học mới.

**Authorization:** Bearer Token (Instructor)

**Request Body:**

```json
{
  "title": "Lập trình Web với React",
  "slug": "lap-trinh-web-voi-react",
  "description": "Học React từ cơ bản đến nâng cao",
  "content": "<h2>Giới thiệu</h2><p>Khoá học React...</p>",
  "thumbnail": "file-uuid",
  "promo_video_url": "https://youtube.com/watch?v=xxx",
  "category_id": "category-uuid",
  "level": "intermediate",
  "language": "vi",
  "price": 0,
  "discount_price": null,
  "requirements": ["Biết HTML/CSS cơ bản", "JavaScript ES6+"],
  "objectives": ["Xây dựng SPA với React", "State management"],
  "target_audience": ["Sinh viên CNTT", "Frontend developer junior"],
  "status": "draft"
}
```

**Success Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "new-course-uuid",
    "title": "Lập trình Web với React",
    "slug": "lap-trinh-web-voi-react",
    "status": "draft",
    "date_created": "2025-01-15T10:00:00Z"
  }
}
```

#### PATCH /api/instructor/courses/[id]

**Mô tả:** Cập nhật khoá học.

**Authorization:** Bearer Token (Instructor - owner only)

**Request Body:** Các fields cần cập nhật (partial update).

```json
{
  "title": "Lập trình Web với React (Updated)",
  "status": "published"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "course-uuid",
    "title": "Lập trình Web với React (Updated)",
    "status": "published",
    "date_updated": "2025-01-15T11:00:00Z"
  }
}
```

#### DELETE /api/instructor/courses/[id]

**Mô tả:** Xoá khoá học (soft delete - chuyển status = archived).

**Authorization:** Bearer Token (Instructor - owner only)

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Khoá học đã được chuyển vào lưu trữ"
  }
}
```

---

### 7.2. Module CRUD + Reorder

#### GET /api/instructor/courses/[courseId]/modules

**Mô tả:** Lấy danh sách modules của khoá học (bao gồm lessons).

**Success Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "module-uuid-1",
      "title": "Giới thiệu React",
      "description": "Tổng quan về React",
      "sort": 1,
      "lessons": [
        {
          "id": "lesson-uuid-1",
          "title": "React là gì?",
          "lesson_type": "video",
          "video_duration": 600,
          "sort": 1,
          "status": "published"
        }
      ]
    }
  ]
}
```

#### POST /api/instructor/courses/[courseId]/modules

**Mô tả:** Tạo module mới.

**Request Body:**

```json
{
  "title": "Giới thiệu React",
  "description": "Tổng quan về React và hệ sinh thái"
}
```

#### PATCH /api/instructor/modules/[id]

**Mô tả:** Cập nhật module.

#### DELETE /api/instructor/modules/[id]

**Mô tả:** Xoá module.

#### PATCH /api/instructor/courses/[courseId]/modules/reorder

**Mô tả:** Sắp xếp lại thứ tự modules.

**Request Body:**

```json
{
  "module_ids": ["module-uuid-3", "module-uuid-1", "module-uuid-2"]
}
```

---

### 7.3. Lesson CRUD + Reorder

#### POST /api/instructor/modules/[moduleId]/lessons

**Mô tả:** Tạo bài học mới.

**Request Body:**

```json
{
  "title": "React là gì?",
  "slug": "react-la-gi",
  "content": "<p>React là thư viện JavaScript...</p>",
  "video_url": "https://youtube.com/watch?v=xxx",
  "video_duration": 600,
  "lesson_type": "mixed",
  "is_preview": true,
  "status": "published"
}
```

#### PATCH /api/instructor/lessons/[id]

**Mô tả:** Cập nhật bài học.

#### DELETE /api/instructor/lessons/[id]

**Mô tả:** Xoá bài học.

#### PATCH /api/instructor/modules/[moduleId]/lessons/reorder

**Mô tả:** Sắp xếp lại thứ tự bài học trong module.

**Request Body:**

```json
{
  "lesson_ids": ["lesson-uuid-2", "lesson-uuid-1", "lesson-uuid-3"]
}
```

---

### 7.4. Quiz CRUD

#### POST /api/instructor/lessons/[lessonId]/quizzes

**Mô tả:** Tạo bài kiểm tra cho bài học.

**Request Body:**

```json
{
  "title": "Kiểm tra: React cơ bản",
  "description": "Kiểm tra kiến thức React cơ bản",
  "passing_score": 70,
  "time_limit": 15,
  "max_attempts": 3,
  "questions": [
    {
      "question_text": "React là gì?",
      "question_type": "single_choice",
      "explanation": "React là thư viện JavaScript cho UI",
      "points": 1,
      "answers": [
        { "answer_text": "Thư viện JavaScript", "is_correct": true },
        { "answer_text": "Ngôn ngữ lập trình", "is_correct": false },
        { "answer_text": "Hệ điều hành", "is_correct": false },
        { "answer_text": "Database", "is_correct": false }
      ]
    },
    {
      "question_text": "Những hook nào thuộc React core?",
      "question_type": "multiple_choice",
      "explanation": "useState, useEffect, useContext là core hooks",
      "points": 2,
      "answers": [
        { "answer_text": "useState", "is_correct": true },
        { "answer_text": "useEffect", "is_correct": true },
        { "answer_text": "useQuery", "is_correct": false },
        { "answer_text": "useContext", "is_correct": true }
      ]
    }
  ]
}
```

**Success Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "quiz-uuid",
    "title": "Kiểm tra: React cơ bản",
    "lesson_id": "lesson-uuid",
    "passing_score": 70,
    "time_limit": 15,
    "max_attempts": 3,
    "questions_count": 2,
    "total_points": 3
  }
}
```

#### PATCH /api/instructor/quizzes/[id]

**Mô tả:** Cập nhật bài kiểm tra (bao gồm câu hỏi và đáp án).

#### DELETE /api/instructor/quizzes/[id]

**Mô tả:** Xoá bài kiểm tra.

---

## 8. Admin APIs

### 8.1. User Management

#### GET /api/admin/users

**Mô tả:** Lấy danh sách người dùng.

**Authorization:** Bearer Token (Admin)

**Query Parameters:**

| Parameter | Type    | Default       | Mô tả                               |
| --------- | ------- | ------------- | ----------------------------------- |
| `page`    | integer | 1             | Trang                               |
| `limit`   | integer | 20            | Số item/trang                       |
| `role`    | string  | all           | Filter theo role                    |
| `status`  | string  | all           | Filter: active, suspended, archived |
| `search`  | string  |               | Tìm theo tên hoặc email             |
| `sort`    | string  | -date_created | Sắp xếp                             |

**Success Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "user-uuid",
      "first_name": "Nguyen",
      "last_name": "Van A",
      "email": "nguyenvana@example.com",
      "avatar": { "id": "file-uuid" },
      "role": { "id": "role-uuid", "name": "Student" },
      "status": "active",
      "date_created": "2025-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "total_count": 500,
    "filter_count": 500,
    "page": 1,
    "limit": 20
  }
}
```

#### POST /api/admin/users

**Mô tả:** Tạo người dùng mới (Admin có thể gán bất kỳ role).

**Request Body:**

```json
{
  "first_name": "Tran",
  "last_name": "Van B",
  "email": "tranvanb@example.com",
  "password": "TempPass123",
  "role": "role-instructor-uuid",
  "status": "active"
}
```

#### PATCH /api/admin/users/[id]

**Mô tả:** Cập nhật thông tin người dùng.

**Request Body:**

```json
{
  "role": "role-instructor-uuid",
  "status": "suspended"
}
```

#### DELETE /api/admin/users/[id]

**Mô tả:** Xoá người dùng (soft delete).

---

### 8.2. Course Management

#### GET /api/admin/courses

**Mô tả:** Lấy danh sách tất cả khoá học.

**Query Parameters:** Tương tự instructor + thêm filter theo instructor.

#### PATCH /api/admin/courses/[id]

**Mô tả:** Cập nhật khoá học (thay đổi trạng thái, featured).

**Request Body:**

```json
{
  "status": "published",
  "is_featured": true
}
```

#### DELETE /api/admin/courses/[id]

**Mô tả:** Xoá khoá học.

---

### 8.3. Category CRUD

#### GET /api/admin/categories

**Mô tả:** Lấy danh sách danh mục (dạng cây).

**Success Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "cat-01",
      "name": "Lập trình",
      "slug": "lap-trinh",
      "icon": "code",
      "sort": 1,
      "status": "published",
      "courses_count": 15,
      "children": [
        {
          "id": "cat-02",
          "name": "Web Development",
          "slug": "web-development",
          "icon": "globe",
          "sort": 1,
          "status": "published",
          "courses_count": 8,
          "children": []
        }
      ]
    }
  ]
}
```

#### POST /api/admin/categories

**Mô tả:** Tạo danh mục mới.

**Request Body:**

```json
{
  "name": "Machine Learning",
  "slug": "machine-learning",
  "description": "Các khoá học về Machine Learning",
  "icon": "brain",
  "parent_id": "cat-06",
  "sort": 1,
  "status": "published"
}
```

#### PATCH /api/admin/categories/[id]

**Mô tả:** Cập nhật danh mục.

#### DELETE /api/admin/categories/[id]

**Mô tả:** Xoá danh mục.

**Error Response khi có khoá học active:**

```json
{
  "success": false,
  "error": {
    "code": "CATEGORY_HAS_COURSES",
    "message": "Không thể xoá danh mục đang có khoá học. Vui lòng di chuyển khoá học sang danh mục khác trước."
  }
}
```

### 8.4. Settings Management

#### GET /api/admin/settings

**Mô tả:** Lấy cài đặt nền tảng.

**Authorization:** Bearer Token (Admin)

**Success Response (200):**

```json
{
  "platform_name": "E-Learning Platform",
  "platform_description": "Nền tảng học trực tuyến",
  "maintenance_mode": false,
  "maintenance_message": ""
}
```

#### PATCH /api/admin/settings

**Mô tả:** Cập nhật cài đặt nền tảng.

**Request Body:**

```json
{
  "platform_name": "E-Learning Platform",
  "maintenance_mode": true,
  "maintenance_message": "Hệ thống đang bảo trì..."
}
```

---

### 8.5. Order Management

#### GET /api/admin/orders

**Mô tả:** Lấy danh sách tất cả đơn hàng.

**Authorization:** Bearer Token (Admin)

**Query Parameters:**

| Parameter | Type    | Default       | Mô tả                                      |
| --------- | ------- | ------------- | ------------------------------------------ |
| `page`    | integer | 1             | Trang                                      |
| `limit`   | integer | 20            | Số item/trang                              |
| `status`  | string  | all           | Filter: pending, success, failed, cancelled |
| `search`  | string  |               | Tìm theo mã đơn hoặc email                |
| `sort`    | string  | -date_created | Sắp xếp                                    |

#### PATCH /api/admin/orders/[id]

**Mô tả:** Cập nhật trạng thái đơn hàng.

**Request Body:**

```json
{
  "status": "cancelled"
}
```

---

### 8.6. Review Management (Admin)

#### GET /api/admin/reviews

**Mô tả:** Lấy danh sách tất cả đánh giá (admin).

**Authorization:** Bearer Token (Admin)

**Query Parameters:**

| Parameter | Type    | Default       | Mô tả                               |
| --------- | ------- | ------------- | ----------------------------------- |
| `page`    | integer | 1             | Trang                               |
| `limit`   | integer | 20            | Số item/trang                       |
| `status`  | string  | all           | Filter: pending, approved, rejected |

#### PATCH /api/admin/reviews/[id]

**Mô tả:** Duyệt hoặc từ chối đánh giá.

#### DELETE /api/admin/reviews/[id]

**Mô tả:** Xoá đánh giá.

---

### 8.7. Role Management

#### GET /api/admin/users/roles

**Mô tả:** Lấy danh sách tất cả vai trò (roles) trong hệ thống.

**Authorization:** Bearer Token (Admin)

**Success Response (200):**

```json
{
  "data": [
    { "id": "role-uuid", "name": "Administrator" },
    { "id": "role-uuid", "name": "Instructor" },
    { "id": "role-uuid", "name": "Student" }
  ]
}
```

---

## 9. Public APIs (Directus Direct)

Các API công cộng được gọi trực tiếp từ Next.js Server Components đến Directus REST API.

### 9.1. GET /items/courses (Directus)

**Mô tả:** Lấy danh sách khoá học (published).

**Query Example:**

```
GET /items/courses
  ?filter[status][_eq]=published
  &fields=id,title,slug,description,thumbnail.id,thumbnail.filename_download,
          category_id.id,category_id.name,level,price,discount_price,
          total_enrollments,average_rating,total_lessons,total_duration,
          date_created
  &sort=-date_created
  &limit=20
  &page=1
```

### 9.2. GET /items/courses/[id] (Directus)

**Mô tả:** Lấy chi tiết khoá học.

**Query Example:**

```
GET /items/courses/[id]
  ?fields=id,title,slug,description,content,price,discount_price,
          thumbnail.id,thumbnail.filename_download,
          category_id.id,category_id.name,category_id.slug,
          courses_instructors.directus_users_id.id,
          courses_instructors.directus_users_id.first_name,
          courses_instructors.directus_users_id.last_name,
          courses_instructors.directus_users_id.avatar,
          courses_instructors.directus_users_id.headline,
          modules.id,modules.title,modules.sort,
          modules.lessons.id,modules.lessons.title,
          modules.lessons.video_duration,modules.lessons.lesson_type,
          modules.lessons.is_preview,modules.lessons.sort
  &deep[modules][_sort]=sort
  &deep[modules][lessons][_sort]=sort
```

### 9.3. GET /items/categories (Directus)

**Mô tả:** Lấy danh sách danh mục.

### 9.4. GET /items/reviews (Directus)

**Mô tả:** Lấy đánh giá cho khoá học.

**Query Example:**

```
GET /items/reviews
  ?filter[course_id][_eq]=[course-uuid]
  &filter[status][_eq]=approved
  &fields=id,rating,comment,date_created,
          user_id.id,user_id.first_name,user_id.last_name,user_id.avatar
  &sort=-date_created
  &limit=10
```

---

## 10. E-Commerce APIs

### 10.1. Cart

#### GET /api/cart

**Mô tả:** Lấy danh sách khoá học trong giỏ hàng.

**Authorization:** Bearer Token (Student)

**Success Response (200):**

```json
{
  "data": [
    {
      "id": "cart-item-uuid",
      "course_id": {
        "id": "course-uuid",
        "title": "Lập trình React",
        "slug": "lap-trinh-react",
        "thumbnail": "file-uuid",
        "price": 499000,
        "discount_price": 299000
      },
      "date_created": "2025-01-15T10:00:00Z"
    }
  ]
}
```

#### POST /api/cart

**Mô tả:** Thêm khoá học vào giỏ hàng.

**Request Body:**

```json
{
  "course_id": "course-uuid"
}
```

**Error Responses:**

| Status | Code              | Message                           |
| ------ | ----------------- | --------------------------------- |
| 409    | `ALREADY_IN_CART` | Khoá học đã có trong giỏ hàng      |
| 409    | `ALREADY_ENROLLED`| Bạn đã đăng ký khoá học này       |

#### DELETE /api/cart/[id]

**Mô tả:** Xoá khoá học khỏi giỏ hàng.

---

### 10.2. Wishlist

#### GET /api/wishlist

**Mô tả:** Lấy danh sách khoá học trong wishlist.

**Authorization:** Bearer Token (Student)

#### POST /api/wishlist

**Mô tả:** Thêm khoá học vào wishlist.

**Request Body:**

```json
{
  "course_id": "course-uuid"
}
```

#### DELETE /api/wishlist/[id]

**Mô tả:** Xoá khoá học khỏi wishlist.

---

### 10.3. Orders

#### GET /api/orders

**Mô tả:** Lấy danh sách đơn hàng của người dùng hiện tại.

**Authorization:** Bearer Token (Student)

#### POST /api/orders

**Mô tả:** Tạo đơn hàng từ giỏ hàng.

**Request Body:**

```json
{
  "payment_method": "vnpay",
  "items": [
    { "course_id": "course-uuid-1" },
    { "course_id": "course-uuid-2" }
  ]
}
```

**Business Logic:**

1. Kiểm tra tất cả khoá học tồn tại và chưa đăng ký.
2. Tạo order với status = "pending".
3. Tạo order_items với giá tại thời điểm mua (discount_price nếu có, nếu không thì price).
4. Xoá các khoá học khỏi giỏ hàng.
5. Trả về order để redirect đến trang thanh toán.

**Success Response (201):**

```json
{
  "data": {
    "id": "order-uuid",
    "order_number": "ORD-20250115-XXXX",
    "total_amount": 798000,
    "status": "pending",
    "payment_method": "vnpay",
    "items": [
      { "course_id": "course-uuid-1", "price": 499000 },
      { "course_id": "course-uuid-2", "price": 299000 }
    ]
  }
}
```

#### GET /api/orders/[id]

**Mô tả:** Lấy chi tiết đơn hàng.

#### POST /api/orders/[id]/pay

**Mô tả:** Xử lý thanh toán giả lập (mock payment).

**Business Logic:**

1. Kiểm tra đơn hàng thuộc user hiện tại và status = "pending".
2. Cập nhật status = "success", paid_at = NOW().
3. Tạo enrollment cho từng khoá học trong đơn hàng.
4. Gửi notification cho student.
5. Redirect đến trang thành công.

**Success Response (200):**

```json
{
  "data": {
    "id": "order-uuid",
    "status": "success",
    "paid_at": "2025-01-15T10:05:00Z"
  }
}
```

---

## 11. Rate Limiting

| Endpoint Group              | Limit        | Window  |
| --------------------------- | ------------ | ------- |
| `/api/auth/login`           | 5 requests   | 15 phút |
| `/api/auth/register`        | 3 requests   | 1 giờ   |
| `/api/auth/forgot-password` | 3 requests   | 1 giờ   |
| `/api/auth/refresh`         | 10 requests  | 1 phút  |
| `/api/enrollments`          | 10 requests  | 1 phút  |
| `/api/reviews`              | 5 requests   | 1 phút  |
| `/api/quizzes/*/submit`     | 10 requests  | 1 phút  |
| `/api/cart`                 | 20 requests  | 1 phút  |
| `/api/wishlist`             | 20 requests  | 1 phút  |
| `/api/orders`               | 5 requests   | 1 phút  |
| `/api/orders/*/pay`         | 3 requests   | 1 phút  |
| General API                 | 100 requests | 1 phút  |

---

_Tài liệu API - Hệ Thống Quản Lý Khoá Học Trực Tuyến_
