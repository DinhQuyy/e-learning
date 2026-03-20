# SCRIPT THUYẾT TRÌNH WEBSITE E-LEARNING TRONG 10-15 PHÚT

Script này được viết theo kiểu gần như có thể đọc trực tiếp, nhưng bạn nên nói tự nhiên thay vì học thuộc từng câu.

Thời lượng hợp lý nhất là khoảng 12-13 phút.

## 0:00-1:00 - Mở đầu

> Em xin trình bày hệ thống E-Learning của em theo đúng flow người dùng, đi từ public đến student, instructor và cuối cùng là admin. Em sẽ không chỉ demo giao diện mà sẽ nói ngắn gọn cách code đang xử lý ở phía sau để cho thấy em nắm được cả nghiệp vụ lẫn kiến trúc hệ thống.
>
> Về tổng thể, frontend của em dùng Next.js 16 App Router, dữ liệu và quản trị nội dung dùng Directus trên PostgreSQL, còn phần AI em tách thành một FastAPI service riêng. Các API route trong Next.js đóng vai trò lớp trung gian, giữ cookie đăng nhập, kiểm tra quyền rồi mới gọi xuống Directus hoặc AI service.

Nếu bị hỏi code ngay từ đầu, bạn nói thêm:

> Phần auth và route guard em đặt ở `frontend/src/proxy.ts`, còn các server page dùng `requireAuth` và `requireRole` trong `frontend/src/lib/dal.ts`.

## 1:00-3:00 - Public

> Đầu tiên là vai trò khách. Ở phần public, người dùng có thể vào trang chủ, xem danh mục, tìm kiếm khóa học, lọc khóa học và xem chi tiết từng khóa học.
>
> Trang chủ của em không phải dữ liệu hard-code. Nó tải song song các khóa học nổi bật, category, review tiêu biểu và thống kê nền tảng. Em muốn nhấn mạnh điểm này để cho thấy giao diện phản ánh dữ liệu thật của hệ thống.
>
> Sang trang danh sách khóa học, người dùng có thể tìm kiếm, lọc theo danh mục, trình độ, giá và sắp xếp. Ở phía code, page này đọc `searchParams`, sau đó đưa xuống query layer để build filter, sort và paging.
>
> Khi vào trang chi tiết khóa học, hệ thống không chỉ lấy title và giá, mà còn lấy module, lesson preview, review, thông tin giảng viên, khóa học liên quan và trạng thái thao tác của người dùng như đã enrolled hay đã có trong giỏ hàng hay chưa.

Nếu bị hỏi code:

> Trang home nằm ở `frontend/src/app/(public)/page.tsx`, danh sách khóa học nằm ở `frontend/src/app/(public)/courses/page.tsx`, còn query chính nằm ở `frontend/src/lib/queries/courses.ts`. Trong đó `getCourses` build filter, sort, paging; còn `getCourseBySlug` lấy luôn modules, reviews và enrich lại metric thực tế.

## 3:00-6:30 - Student

> Tiếp theo là học viên. Đây là luồng nghiệp vụ trung tâm của hệ thống.
>
> Từ trang chi tiết khóa học, học viên có thể thêm vào giỏ hàng, mua ngay, thêm wishlist hoặc đăng ký miễn phí. Ở đây em có một component `CourseActions`, nó tự đổi nút và hành vi theo từng trạng thái của người dùng.
>
> Nếu học viên mua khóa học trả phí, hệ thống đi theo luồng `giỏ hàng -> checkout -> tạo đơn hàng -> mock payment -> tạo enrollment`. Em dùng mock payment để mô phỏng quy trình thanh toán nhưng vẫn giữ đầy đủ logic nghiệp vụ ở phía sau.
>
> Sau khi thanh toán thành công, API sẽ tạo enrollment cho từng khóa học trong đơn. Khi vào dashboard student, hệ thống hiển thị khóa học đang học, khóa học đã hoàn thành, tổng thời gian học và recommendation.
>
> Khi vào lesson, học viên có thể xem video, đọc nội dung, làm quiz, nộp assignment và cập nhật tiến độ. Ở phía code, `ProgressTracker` vừa cho học viên bấm hoàn thành, vừa tự lưu `video_position` theo chu kỳ. API `/api/progress` không chỉ lưu progress record mà còn cập nhật `last_lesson_id`, tính lại `progress_percentage`, đổi trạng thái enrollment, và khi học viên đạt 100% thì hệ thống tự cấp chứng chỉ.
>
> Nếu học đến cuối khóa, form review sẽ hiện ra ngay trong player. Nghĩa là các phần enrollments, progress, reviews, quiz attempts và certificates được liên kết khá chặt với nhau.

Nếu bị hỏi code:

> Phần giỏ hàng nằm ở `frontend/src/app/api/cart/route.ts`, tạo đơn hàng nằm ở `frontend/src/app/api/orders/route.ts`, mock payment nằm ở `frontend/src/app/api/orders/[id]/pay/route.ts`.
>
> Phần học nằm ở `frontend/src/app/(student)/learn/[courseSlug]/[lessonSlug]/page.tsx`, component cập nhật tiến độ nằm ở `frontend/src/components/features/progress-tracker.tsx`, và business logic nằm ở `frontend/src/app/api/progress/route.ts`.
>
> Để tránh tạo enrollment trùng, em dùng `createOrGetEnrollment` trong `frontend/src/lib/enrollment-integrity.ts`.

## 6:30-9:30 - Instructor

> Sau học viên là giảng viên. Phần này em tách thành hai bước: trở thành giảng viên, và vận hành khóa học.
>
> Muốn vào portal giảng viên, người dùng không được cấp quyền ngay. Họ phải nộp hồ sơ ở trang `Trở thành giảng viên`. Hồ sơ này được lưu vào bảng `instructor_applications`, sau đó admin review rồi mới cấp role Instructor.
>
> Khi đã là instructor, người dùng vào dashboard giảng viên để xem tổng số khóa học, tổng số học viên, đánh giá trung bình và doanh thu.
>
> Phần tạo khóa học của em dùng form nhiều bước. Khi instructor tạo course mới, hệ thống tạo bản ghi `courses` ở trạng thái `draft`, đồng thời tạo bản ghi trong `courses_instructors` để gắn khóa học với đúng giảng viên đó.
>
> Sau đó instructor có thể vào trang quản lý nội dung để tạo module, lesson, quiz, assignment và sắp xếp thứ tự. Điểm em muốn nhấn mạnh là mọi API của instructor đều verify ownership qua bảng `courses_instructors`, nên giảng viên không thể sửa khóa học của người khác.
>
> Khi nội dung đã xong, giảng viên bấm gửi duyệt. Lúc này khóa học chuyển từ `draft` sang `review`. Instructor không tự publish, mà phải qua admin duyệt. Ngoài ra instructor còn xem được danh sách học viên, review và doanh thu từng khóa học.

Nếu bị hỏi code:

> Đăng ký giảng viên nằm ở `frontend/src/app/api/instructor-application/route.ts`.
>
> Vào portal nằm ở `frontend/src/app/api/instructor/portal/enter/route.ts`.
>
> Tạo khóa học nằm ở `frontend/src/app/api/instructor/courses/route.ts`.
>
> Kiểm tra ownership và cập nhật khóa học nằm ở `frontend/src/app/api/instructor/courses/[id]/route.ts`.
>
> Query cho instructor dashboard và earnings nằm ở `frontend/src/lib/queries/instructor.ts`.

## 9:30-12:00 - Admin

> Cuối cùng là vai trò admin. Đây là vai trò vận hành và điều phối toàn hệ thống.
>
> Trang dashboard admin tổng hợp số liệu users, courses, enrollments, doanh thu, chart tăng trưởng và các mục đang chờ xử lý. Nghĩa là admin có cái nhìn tổng thể ngay khi vào hệ thống.
>
> Nghiệp vụ quan trọng nhất của admin là duyệt instructor application. Khi admin approve một hồ sơ, hệ thống không chỉ đổi trạng thái application, mà còn cập nhật role Instructor và `instructor_state` cho user. Đây là điểm em muốn nhấn mạnh vì nó ảnh hưởng trực tiếp đến phân quyền.
>
> Nghiệp vụ quan trọng thứ hai là duyệt khóa học. Instructor gửi khóa học lên ở trạng thái `review`, admin mở chi tiết khóa học và có thể approve để publish, reject để trả lại chỉnh sửa, đánh dấu featured hoặc archive.
>
> Ngoài ra admin còn có thể quản lý user, khóa hoặc mở tài khoản, đổi role, kiểm duyệt review và xem báo cáo tổng hợp.

Nếu bị hỏi code:

> Dashboard admin nằm ở `frontend/src/app/(admin)/admin/dashboard/page.tsx`, còn query tổng hợp nằm ở `frontend/src/lib/queries/admin.ts`.
>
> Duyệt instructor application nằm ở `frontend/src/app/api/admin/instructor-applications/[id]/review/route.ts`. Route này còn có rollback để tránh cập nhật dở dang khi một bước thành công còn bước sau thất bại.
>
> Duyệt khóa học nằm ở `frontend/src/app/api/admin/courses/[id]/route.ts`.

## 12:00-13:00 - Điểm nhấn AI

> Nếu còn thời gian, em xin nói thêm một điểm nhấn kỹ thuật là lớp AI. AI của em không đứng riêng thành một chatbot tách rời, mà được gắn vào từng bối cảnh sử dụng.
>
> Ở public có `Course AI Advisor` để tư vấn nhanh khóa học.
>
> Ở student có `Dashboard AI Coach` và `Lesson Study Assistant`.
>
> Trong lúc làm quiz, AI bị hạn chế để tránh gợi ý đáp án.
>
> Ở admin có AI analytics để theo dõi mức độ sử dụng AI trong hệ thống.
>
> Về code, frontend gọi qua các route `/api/ai/*`, sau đó Next.js mới gọi sang FastAPI service. Backend AI nằm ở `backend/ai/app/main.py`, có internal key, rate limit và quản lý conversation.

## 13:00-14:00 - Kết

> Tổng kết lại, hệ thống của em không chỉ có giao diện theo 4 vai trò, mà còn có luồng nghiệp vụ, phân quyền và dữ liệu chạy xuyên suốt từ public đến admin. Điều em muốn nhấn mạnh là em đã tách rõ các layer quan trọng như route guard, API route, query layer, Directus collections và AI service. Vì vậy khi demo một chức năng, em có thể giải thích được nó đang chạy ở màn hình nào, qua API nào và dữ liệu đi như thế nào.

## Bản rút gọn nếu chỉ còn 10 phút

Nếu hội đồng yêu cầu nói rất nhanh, bạn giữ 5 ý:

1. Hệ thống tách 4 vai trò và dùng Next.js + Directus + FastAPI AI.
2. Public giải quyết tìm kiếm, lọc và xem chi tiết khóa học bằng query layer riêng.
3. Student có flow đầy đủ từ cart, order, payment đến enrollment, progress, quiz và certificate.
4. Instructor có flow nộp hồ sơ, tạo course, quản lý nội dung và gửi duyệt với ownership rõ ràng.
5. Admin là nơi duyệt giảng viên, duyệt khóa học, moderation và xem báo cáo tổng hợp.

## Mẹo trình bày

- Không cần click quá nhiều, chỉ chọn đúng 1-2 màn hình tiêu biểu cho mỗi vai trò.
- Mỗi chức năng chỉ nên nói theo mẫu: `người dùng làm gì -> API xử lý gì -> dữ liệu cập nhật gì`.
- Nếu bị hỏi sâu, ưu tiên kéo về `proxy.ts`, query layer hoặc API route vì đó là nơi thể hiện bạn hiểu hệ thống.
