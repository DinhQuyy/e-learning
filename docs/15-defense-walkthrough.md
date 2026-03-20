# HƯỚNG DẪN THUYẾT TRÌNH VÀ DEMO WEBSITE

Tài liệu này dùng để bạn demo trong khoảng 10-15 phút theo đúng flow nghiệp vụ chính của hệ thống: `public -> student -> instructor -> admin`.

## 1. Mục tiêu buổi bảo vệ

- Cho hội đồng thấy website giải được bài toán E-Learning đa vai trò.
- Cho thấy bạn hiểu cả nghiệp vụ lẫn code, không chỉ thao tác giao diện.
- Đi từ màn hình đến API, từ API đến dữ liệu, và từ dữ liệu đến luồng vận hành.

## 2. Câu mở đầu ngắn gọn về kiến trúc

Bạn có thể mở đầu như sau:

> Hệ thống của em tách thành 4 lớp chính. Frontend dùng Next.js 16 App Router và chia route group theo vai trò. Dữ liệu và phân quyền dùng Directus trên PostgreSQL. Phần AI được tách thành một FastAPI service riêng. Các API route trong Next.js đóng vai trò lớp nghiệp vụ trung gian, giữ cookie đăng nhập, kiểm tra quyền rồi mới gọi xuống Directus hoặc AI service.

## 3. Những file lõi nên nhớ

Nếu hội đồng hỏi “hệ thống chạy tổng thể như thế nào”, bạn nên dẫn về các file sau:

- `frontend/src/proxy.ts`
  Route guard và role guard. File này cho route public đi qua, chặn route private khi chưa đăng nhập, tự refresh token và kiểm tra người dùng đang vào đúng portal theo role.
- `frontend/src/lib/dal.ts`
  Có `getSession`, `requireAuth`, `requireRole`. Đây là lớp mà các server page dùng để đọc session và chặn quyền.
- `frontend/src/lib/directus-fetch.ts`
  Wrapper fetch phía server. Tự gắn `access_token`, nếu bị `401` thì refresh token rồi gọi lại.
- `frontend/src/lib/api-fetch.ts`
  Wrapper fetch phía client. Nếu hết hạn token thì gọi `/api/auth/refresh` rồi retry một lần.
- `frontend/src/lib/queries/courses.ts`
  Query layer cho public pages và recommendation.
- `frontend/src/lib/queries/instructor.ts`
  Query layer cho dashboard, course management, student list, earnings của giảng viên.
- `frontend/src/lib/queries/admin.ts`
  Query layer tổng hợp thống kê, báo cáo và moderation cho admin.
- `backend/ai/app/main.py`
  Entry point của AI service với các endpoint như chat, dashboard coach, lesson study, quiz mistake review.

## 4. Flow demo đề xuất trong 10-15 phút

## 4.1. 0:00-1:30 - Mở đầu và kiến trúc

- Thao tác:
  Mở trang chủ, nói ngắn gọn về kiến trúc và phân vai trò.
- Điểm nên nói:
  Frontend được chia route group theo vai trò nên code dễ quản lý.
  Auth không để client gọi trực tiếp xuống Directus mà đi qua Next API route và cookie HTTP-only.
  Phân quyền có 2 lớp: route guard ở `proxy.ts` và business guard ở server page hoặc API route.
- File nên nhắc:
  `frontend/src/proxy.ts`
  `frontend/src/lib/dal.ts`
  `frontend/src/lib/directus-fetch.ts`

## 4.2. 1:30-4:00 - Public: landing page, danh sách khóa học, chi tiết khóa học

- Thao tác:
  Mở home page.
  Sang trang danh sách khóa học.
  Lọc theo category, level, sort.
  Mở một trang chi tiết khóa học.
- Điểm nên nói:
  Public là lớp thu hút người dùng vào hệ thống.
  Home page không hard-code mà tải song song dữ liệu khóa học nổi bật, category, review tốt và thống kê nền tảng.
  Trang danh sách khóa học đọc `searchParams`, build filter, sort, paging rồi gọi query layer.
  Trang chi tiết khóa học lấy course, modules, lesson preview, reviews, giảng viên, course liên quan và trạng thái thao tác của người dùng.
- File nên nhắc:
  `frontend/src/app/(public)/page.tsx`
  `frontend/src/app/(public)/courses/page.tsx`
  `frontend/src/app/(public)/courses/[slug]/page.tsx`
  `frontend/src/lib/queries/courses.ts`
- Điểm “hiểu code”:
  `HomePage` dùng `Promise.allSettled` để tải nhiều nguồn dữ liệu song song.
  `getCourses` build filter theo search, category tree, level, price, rating, sort.
  `getCourseBySlug` không chỉ lấy thông tin cơ bản mà còn enrich thêm modules, lessons, reviews và các metric thực tế.

## 4.3. 4:00-7:30 - Student: thêm giỏ hàng, tạo đơn, mock payment, học, cập nhật tiến độ, quiz, chứng chỉ

- Thao tác:
  Từ course detail, bấm `Thêm vào giỏ hàng` hoặc `Mua ngay`.
  Vào giỏ hàng, checkout, thanh toán mock.
  Vào dashboard học viên.
  Mở một lesson để trình bày progress, quiz, review và certificate.
- Điểm nên nói:
  Đây là luồng nghiệp vụ trung tâm của hệ thống.
  Course detail có component `CourseActions`, tự đổi hành vi theo trạng thái: chưa đăng nhập, đã enrolled, đã có trong cart, hay khóa học miễn phí.
  Với khóa học trả phí, flow là `cart -> order -> payment -> enrollment`.
  Sau khi thanh toán thành công, hệ thống tạo enrollment cho từng khóa học trong đơn.
  Khi học, hệ thống theo dõi lesson progress, video position, quiz attempt, assignment submission và review.
  Khi hoàn thành 100%, hệ thống tự cấp certificate.
- File nên nhắc:
  `frontend/src/app/api/cart/route.ts`
  `frontend/src/app/api/orders/route.ts`
  `frontend/src/app/api/orders/[id]/pay/route.ts`
  `frontend/src/app/(student)/learn/[courseSlug]/[lessonSlug]/page.tsx`
  `frontend/src/components/features/progress-tracker.tsx`
  `frontend/src/app/api/progress/route.ts`
  `frontend/src/app/api/quizzes/[id]/submit/route.ts`
- Điểm “hiểu code”:
  `ProgressTracker` vừa cho người học đánh dấu hoàn thành, vừa auto-save `video_position` theo chu kỳ.
  API `/api/progress` không chỉ lưu record mà còn cập nhật `last_lesson_id`, tính lại `progress_percentage`, đổi trạng thái enrollment và cấp chứng chỉ khi đủ điều kiện.
  Để tránh enrollment trùng, dự án dùng `createOrGetEnrollment` trong `frontend/src/lib/enrollment-integrity.ts`.

## 4.4. 7:30-10:30 - Instructor: đăng ký làm giảng viên, tạo khóa học, quản lý nội dung, gửi duyệt

- Thao tác:
  Mở trang `Trở thành giảng viên`.
  Trình bày instructor dashboard.
  Mở course management, trang tạo/sửa khóa học, trang modules.
- Điểm nên nói:
  Người dùng không được vào portal giảng viên ngay mà phải nộp hồ sơ.
  Hồ sơ này được lưu thành `instructor_applications`, chờ admin review.
  Khi đã là instructor, họ có dashboard theo dõi course, students, ratings, earnings.
  Khi tạo khóa học, hệ thống tạo course ở trạng thái `draft` và gắn ownership qua bảng `courses_instructors`.
  Instructor có thể quản lý module, lesson, quiz, assignment và gửi khóa học sang trạng thái `review`.
  Instructor không tự publish mà phải qua admin duyệt.
- File nên nhắc:
  `frontend/src/app/api/instructor-application/route.ts`
  `frontend/src/app/api/instructor/portal/enter/route.ts`
  `frontend/src/app/api/instructor/courses/route.ts`
  `frontend/src/app/api/instructor/courses/[id]/route.ts`
  `frontend/src/app/api/instructor/courses/[id]/modules/route.ts`
  `frontend/src/lib/queries/instructor.ts`
- Điểm “hiểu code”:
  Ownership được verify qua junction table `courses_instructors`, nên giảng viên không sửa được course của người khác.
  Workflow trạng thái đi theo hướng `draft -> review -> published`, nghĩa là instructor tạo nội dung, còn admin là người quyết định public.

## 4.5. 10:30-13:00 - Admin: dashboard, duyệt giảng viên, duyệt khóa học, moderation

- Thao tác:
  Mở admin dashboard.
  Vào danh sách instructor applications.
  Mở course moderation.
  Nếu còn thời gian, lướt qua reports hoặc reviews.
- Điểm nên nói:
  Admin là vai trò vận hành toàn hệ thống.
  Dashboard tổng hợp user, course, enrollment, revenue, charts và các pending items.
  Nghiệp vụ quan trọng là duyệt hồ sơ giảng viên.
  Khi approve application, hệ thống không chỉ đổi trạng thái hồ sơ mà còn cập nhật role và `instructor_state` cho user.
  Admin cũng là nơi duyệt khóa học, publish, archive, gắn featured, quản lý user, review và báo cáo.
- File nên nhắc:
  `frontend/src/app/(admin)/layout.tsx`
  `frontend/src/app/(admin)/admin/dashboard/page.tsx`
  `frontend/src/app/api/admin/instructor-applications/[id]/review/route.ts`
  `frontend/src/app/api/admin/courses/[id]/route.ts`
  `frontend/src/lib/queries/admin.ts`
- Điểm “hiểu code”:
  Route review instructor application có rollback để tránh tình trạng cập nhật role thành công nhưng update application thất bại.
  Admin dashboard và reports lấy dữ liệu theo hướng aggregate và group-by, không phải fetch từng bản ghi một cách thủ công.

## 4.6. 13:00-14:00 - Điểm nhấn AI nếu còn thời gian

- Thao tác:
  Chỉ nói nhanh, không cần sa đà.
- Điểm nên nói:
  AI không đứng riêng thành một chatbot đơn lẻ mà được gắn vào từng bối cảnh sử dụng.
  Public có `Course AI Advisor`.
  Student có `Dashboard AI Coach`, `Lesson Study Assistant`.
  Khi làm quiz, AI bị hạn chế để tránh gợi ý đáp án.
  Admin có AI analytics để theo dõi mức độ sử dụng AI.
- File nên nhắc:
  `frontend/src/app/api/ai/chat/route.ts`
  `frontend/src/app/api/ai/dashboard-coach/route.ts`
  `backend/ai/app/main.py`

## 5. Checklist chuẩn bị trước khi demo

- Đăng nhập sẵn 3-4 tài khoản: student, instructor, admin.
- Chuẩn bị sẵn 1 khóa học free, 1 khóa học trả phí, 1 khóa học đang `review`.
- Chuẩn bị sẵn 1 instructor application ở trạng thái `PENDING`.
- Chuẩn bị sẵn 1 student đã học gần xong để dễ nói về progress, review, certificate.
- Nếu mạng không ổn định, ưu tiên nói flow chính thay vì cố click quá nhiều.

## 6. Những câu hỏi hội đồng dễ hỏi

### Câu 1. Vì sao phải có `proxy.ts` nếu đã kiểm tra role trong page?

Trả lời ngắn:

> `proxy.ts` chặn sớm ở tầng route để tránh người dùng đi sai portal hoặc nhìn thấy nháy trang. Còn `requireAuth` và `requireRole` ở page/API là lớp bảo vệ nghiệp vụ bên trong. Em dùng cả hai để tránh chỉ dựa vào UI.

### Câu 2. Vì sao không cho frontend gọi thẳng Directus?

Trả lời ngắn:

> Vì em muốn tập trung logic auth, refresh token, business validation và permission ở một chỗ là Next API routes. Cách này giúp client gọn hơn và bảo vệ token tốt hơn bằng cookie HTTP-only.

### Câu 3. Làm sao tránh student mua xong mà tạo enrollment trùng?

Trả lời ngắn:

> Em có lớp `createOrGetEnrollment` để ưu tiên tái sử dụng enrollment đã có, đồng thời xử lý trường hợp race condition và dọn dữ liệu trùng nếu cần.

### Câu 4. Vì sao instructor không tự publish khóa học?

Trả lời ngắn:

> Vì em thiết kế đúng nghiệp vụ nhiều vai trò. Instructor chịu trách nhiệm tạo nội dung, còn admin chịu trách nhiệm kiểm duyệt chất lượng trước khi public ra hệ thống.

### Câu 5. AI được gắn vào đâu và kiểm soát thế nào?

Trả lời ngắn:

> Frontend gọi qua `/api/ai/*`, sau đó mới sang FastAPI AI service. Ở backend AI em có internal key và rate limit. Trong bối cảnh quiz, AI bị hạn chế để tránh hỗ trợ gian lận.

## 7. Câu kết nên dùng

> Tổng kết lại, hệ thống của em không chỉ có giao diện theo 4 vai trò mà còn có luồng nghiệp vụ, phân quyền và dữ liệu chạy xuyên suốt từ public đến admin. Khi demo một chức năng, em có thể giải thích được nó đang chạy ở màn hình nào, qua API nào và dữ liệu đi như thế nào.
