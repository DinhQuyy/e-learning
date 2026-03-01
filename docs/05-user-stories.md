# USER STORIES

## Hệ Thống Quản Lý Khoá Học Trực Tuyến (E-Learning Platform)

---

## 1. Tổng quan

User stories được viết theo format chuẩn:

> **As a** [vai trò], **I want to** [hành động], **so that** [lợi ích].

Mỗi user story bao gồm:

- **ID:** Mã định danh duy nhất
- **Priority:** Must Have (M), Should Have (S), Could Have (C)
- **Acceptance Criteria:** Điều kiện chấp nhận
- **Story Points:** Độ phức tạp ước tính (1-8, Fibonacci)

---

## 2. Epic: Xác thực & Tài khoản

### US-AUTH-01: Đăng ký tài khoản

- **As a** khách truy cập, **I want to** đăng ký tài khoản bằng email, **so that** tôi có thể sử dụng hệ thống với vai trò học viên.
- **Priority:** Must Have
- **Story Points:** 3
- **Acceptance Criteria:**
  1. Form đăng ký có các trường: Họ, Tên, Email, Mật khẩu, Xác nhận mật khẩu.
  2. Mật khẩu phải tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường và số.
  3. Hiển thị lỗi validation realtime khi nhập.
  4. Hiển thị lỗi nếu email đã tồn tại.
  5. Sau đăng ký thành công, tự động đăng nhập và chuyển đến dashboard.

### US-AUTH-02: Đăng nhập

- **As a** người dùng đã có tài khoản, **I want to** đăng nhập bằng email và mật khẩu, **so that** tôi có thể truy cập các chức năng dành cho mình.
- **Priority:** Must Have
- **Story Points:** 2
- **Acceptance Criteria:**
  1. Form đăng nhập có trường Email và Mật khẩu.
  2. Hiển thị lỗi rõ ràng khi thông tin không đúng.
  3. Sau đăng nhập, chuyển đến dashboard tương ứng với vai trò.
  4. Có tùy chọn "Nhớ đăng nhập".

### US-AUTH-03: Đăng xuất

- **As a** người dùng đã đăng nhập, **I want to** đăng xuất khỏi hệ thống, **so that** tôi bảo vệ được tài khoản khi không sử dụng.
- **Priority:** Must Have
- **Story Points:** 1
- **Acceptance Criteria:**
  1. Nút đăng xuất hiển thị trong menu người dùng.
  2. Sau đăng xuất, chuyển về trang chủ.
  3. Không còn truy cập được các trang yêu cầu đăng nhập.

### US-AUTH-04: Quên mật khẩu

- **As a** người dùng quên mật khẩu, **I want to** yêu cầu đặt lại mật khẩu qua email, **so that** tôi có thể lấy lại quyền truy cập tài khoản.
- **Priority:** Must Have
- **Story Points:** 3
- **Acceptance Criteria:**
  1. Nhập email đã đăng ký.
  2. Nhận email chứa link đặt lại mật khẩu (hết hạn sau 1 giờ).
  3. Thông báo đã gửi email (không tiết lộ email có tồn tại hay không).

### US-AUTH-05: Đặt lại mật khẩu

- **As a** người dùng đã nhận link reset, **I want to** đặt mật khẩu mới, **so that** tôi có thể đăng nhập lại.
- **Priority:** Must Have
- **Story Points:** 2
- **Acceptance Criteria:**
  1. Nhập mật khẩu mới và xác nhận mật khẩu.
  2. Mật khẩu phải đáp ứng yêu cầu bảo mật.
  3. Sau đặt lại thành công, chuyển đến trang đăng nhập.
  4. Thông báo lỗi nếu token hết hạn hoặc không hợp lệ.

### US-AUTH-06: Chỉnh sửa hồ sơ cá nhân

- **As a** người dùng đã đăng nhập, **I want to** cập nhật thông tin cá nhân, **so that** hồ sơ của tôi luôn chính xác.
- **Priority:** Should Have
- **Story Points:** 3
- **Acceptance Criteria:**
  1. Cập nhật được: Avatar, Họ tên, Tiểu sử, Số điện thoại, Headline.
  2. Cập nhật liên kết mạng xã hội.
  3. Preview avatar trước khi lưu.
  4. Hiển thị thông báo lưu thành công.

### US-AUTH-07: Đổi mật khẩu

- **As a** người dùng đã đăng nhập, **I want to** đổi mật khẩu, **so that** tôi tăng cường bảo mật tài khoản.
- **Priority:** Should Have
- **Story Points:** 2
- **Acceptance Criteria:**
  1. Nhập mật khẩu cũ, mật khẩu mới, xác nhận mật khẩu mới.
  2. Kiểm tra mật khẩu cũ đúng.
  3. Mật khẩu mới phải khác mật khẩu cũ.
  4. Thông báo đổi mật khẩu thành công.

---

## 3. Epic: Duyệt & Khám phá Khoá học (Public)

### US-PUB-01: Xem trang chủ

- **As a** khách truy cập, **I want to** xem trang chủ với khoá học nổi bật, **so that** tôi nắm được tổng quan nội dung trên nền tảng.
- **Priority:** Must Have
- **Story Points:** 5
- **Acceptance Criteria:**
  1. Hiển thị hero banner với tiêu đề và nút CTA.
  2. Section khoá học nổi bật (is_featured).
  3. Section khoá học mới nhất.
  4. Section khoá học phổ biến nhất.
  5. Section danh mục khoá học.
  6. Thống kê: Số khoá học, giảng viên, học viên.
  7. Responsive trên mobile/tablet/desktop.

### US-PUB-02: Duyệt danh sách khoá học

- **As a** khách truy cập, **I want to** duyệt danh sách khoá học với bộ lọc, **so that** tôi tìm được khoá học phù hợp.
- **Priority:** Must Have
- **Story Points:** 5
- **Acceptance Criteria:**
  1. Hiển thị khoá học dạng grid card.
  2. Mỗi card có: thumbnail, tên, giảng viên, rating, số đăng ký, giá, level.
  3. Tìm kiếm theo tên khoá học.
  4. Lọc theo danh mục, cấp độ, giá (miễn phí/trả phí).
  5. Sắp xếp: mới nhất, phổ biến nhất, rating cao nhất.
  6. Phân trang (20 khoá học/trang).

### US-PUB-03: Xem chi tiết khoá học

- **As a** khách truy cập, **I want to** xem chi tiết khoá học, **so that** tôi đánh giá được khoá học trước khi đăng ký.
- **Priority:** Must Have
- **Story Points:** 5
- **Acceptance Criteria:**
  1. Hiển thị: Tên, mô tả ngắn, video giới thiệu / thumbnail.
  2. Thông tin giảng viên: Tên, avatar, headline.
  3. Thống kê: Tổng bài học, tổng thời lượng, level, ngôn ngữ, số đăng ký.
  4. Rating trung bình với số đánh giá.
  5. Nội dung chi tiết (rich text).
  6. Yêu cầu tiên quyết, mục tiêu, đối tượng mục tiêu.
  7. Danh sách module/bài học dạng accordion.
  8. Bài học có is_preview = true có thể xem nội dung.
  9. Danh sách đánh giá gần đây.
  10. Nút "Đăng ký khoá học" (hoặc "Tiếp tục học" nếu đã đăng ký).

### US-PUB-04: Tìm kiếm khoá học

- **As a** khách truy cập, **I want to** tìm kiếm khoá học bằng từ khoá, **so that** tôi tìm nhanh khoá học quan tâm.
- **Priority:** Must Have
- **Story Points:** 3
- **Acceptance Criteria:**
  1. Thanh tìm kiếm ở header, hiện trên mọi trang.
  2. Gợi ý kết quả khi gõ (debounce 300ms).
  3. Tìm kiếm theo tên khoá học.
  4. Nhấn Enter hoặc chọn kết quả để điều hướng.

### US-PUB-05: Duyệt danh mục

- **As a** khách truy cập, **I want to** duyệt khoá học theo danh mục, **so that** tôi tìm khoá học trong lĩnh vực quan tâm.
- **Priority:** Should Have
- **Story Points:** 3
- **Acceptance Criteria:**
  1. Hiển thị grid danh mục: icon, tên, mô tả, số khoá học.
  2. Nhấn vào danh mục để xem khoá học thuộc danh mục đó.
  3. Hiển thị danh mục con (nếu có).

### US-PUB-06: Xem hồ sơ giảng viên

- **As a** khách truy cập, **I want to** xem hồ sơ công khai của giảng viên, **so that** tôi biết thêm về giảng viên trước khi đăng ký khoá học.
- **Priority:** Could Have
- **Story Points:** 3
- **Acceptance Criteria:**
  1. Avatar, họ tên, headline, bio.
  2. Liên kết mạng xã hội.
  3. Thống kê: Số khoá học, số học viên, rating trung bình.
  4. Danh sách khoá học của giảng viên.

---

## 4. Epic: Học viên (Student)

### US-STU-01: Đăng ký khoá học

- **As a** học viên, **I want to** đăng ký khoá học, **so that** tôi có thể truy cập nội dung khoá học.
- **Priority:** Must Have
- **Story Points:** 3
- **Acceptance Criteria:**
  1. Nút "Đăng ký" trên trang chi tiết khoá học.
  2. Nếu chưa đăng nhập, chuyển đến trang đăng nhập trước.
  3. Xác nhận đăng ký thành công với thông báo.
  4. Khoá học xuất hiện trong "Khoá học của tôi".
  5. Không thể đăng ký trùng lặp.

### US-STU-02: Xem dashboard học viên

- **As a** học viên, **I want to** xem dashboard tổng quan, **so that** tôi nắm được trạng thái học tập tổng thể.
- **Priority:** Must Have
- **Story Points:** 3
- **Acceptance Criteria:**
  1. Số khoá học đang học và đã hoàn thành.
  2. Section "Tiếp tục học" với bài học gần nhất.
  3. Danh sách khoá học đang học với progress bar.
  4. Thông báo mới nhất.

### US-STU-03: Xem danh sách khoá học đã đăng ký

- **As a** học viên, **I want to** xem tất cả khoá học đã đăng ký, **so that** tôi dễ dàng quản lý việc học.
- **Priority:** Must Have
- **Story Points:** 2
- **Acceptance Criteria:**
  1. Hiển thị khoá học: thumbnail, tên, giảng viên, progress bar.
  2. Lọc: Tất cả, Đang học, Đã hoàn thành.
  3. Nút "Tiếp tục học" dẫn đến bài học gần nhất.

### US-STU-04: Học bài (Course Player)

- **As a** học viên, **I want to** xem bài học với video và nội dung, **so that** tôi tiếp thu kiến thức khoá học.
- **Priority:** Must Have
- **Story Points:** 8
- **Acceptance Criteria:**
  1. Sidebar trái: Danh sách module/bài học với trạng thái hoàn thành.
  2. Video player phát video bài giảng (nếu có).
  3. Nội dung bài học dạng rich text bên dưới video.
  4. Thanh tiến độ khoá học ở trên.
  5. Nút "Bài trước" / "Bài tiếp theo".
  6. Tab "Tài liệu đính kèm" (nếu có).
  7. Tab "Bài kiểm tra" (nếu có quiz).
  8. Responsive: sidebar collapse trên mobile.

### US-STU-05: Đánh dấu bài học hoàn thành

- **As a** học viên, **I want to** đánh dấu bài học đã hoàn thành, **so that** tôi theo dõi được tiến độ học tập.
- **Priority:** Must Have
- **Story Points:** 3
- **Acceptance Criteria:**
  1. Nút "Hoàn thành bài học" ở cuối nội dung.
  2. Bài học được đánh dấu tích xanh trong sidebar.
  3. Progress bar khoá học được cập nhật.
  4. Tự động cập nhật khi xem xong video.

### US-STU-06: Lưu vị trí video

- **As a** học viên, **I want to** hệ thống nhớ vị trí video đã xem, **so that** tôi tiếp tục xem từ chỗ dừng lần trước.
- **Priority:** Should Have
- **Story Points:** 3
- **Acceptance Criteria:**
  1. Tự động lưu vị trí video mỗi 10 giây.
  2. Khi mở lại bài học, video bắt đầu từ vị trí đã lưu.
  3. Hiển thị thông báo "Tiếp tục từ XX:XX".

### US-STU-07: Làm bài kiểm tra

- **As a** học viên, **I want to** làm bài kiểm tra trắc nghiệm, **so that** tôi đánh giá được mức độ hiểu bài.
- **Priority:** Must Have
- **Story Points:** 5
- **Acceptance Criteria:**
  1. Hiển thị thông tin: Tên quiz, số câu, thời gian, điểm đạt, số lần đã làm.
  2. Nút "Bắt đầu làm bài".
  3. Hiển thị câu hỏi với các đáp án (radio/checkbox).
  4. Đếm ngược thời gian (nếu có giới hạn).
  5. Nút "Nộp bài".
  6. Hiển thị kết quả: Điểm, đạt/không đạt.
  7. Chi tiết từng câu: Đúng/Sai, đáp án đúng, giải thích.

### US-STU-08: Xem lịch sử bài kiểm tra

- **As a** học viên, **I want to** xem lại kết quả các lần làm bài kiểm tra, **so that** tôi theo dõi được sự tiến bộ.
- **Priority:** Should Have
- **Story Points:** 2
- **Acceptance Criteria:**
  1. Danh sách các lần làm: Ngày, Điểm, Đạt/Không đạt.
  2. Xem chi tiết từng lần làm.

### US-STU-09: Đánh giá khoá học

- **As a** học viên, **I want to** đánh giá khoá học đã đăng ký, **so that** tôi chia sẻ trải nghiệm với học viên khác.
- **Priority:** Must Have
- **Story Points:** 3
- **Acceptance Criteria:**
  1. Chọn rating 1-5 sao (hover effect).
  2. Viết bình luận (tuỳ chọn, max 2000 ký tự).
  3. Gửi đánh giá.
  4. Chỉ đánh giá 1 lần cho mỗi khoá học.
  5. Có thể chỉnh sửa đánh giá đã gửi.

### US-STU-10: Xem thông báo

- **As a** học viên, **I want to** nhận thông báo về hoạt động liên quan, **so that** tôi không bỏ lỡ thông tin quan trọng.
- **Priority:** Should Have
- **Story Points:** 3
- **Acceptance Criteria:**
  1. Icon notification với badge số chưa đọc ở header.
  2. Dropdown danh sách thông báo mới nhất.
  3. Trang thông báo với danh sách đầy đủ.
  4. Đánh dấu đã đọc khi nhấn vào.
  5. Nhấn thông báo chuyển đến trang liên quan.

---

## 5. Epic: Giảng viên (Instructor)

### US-INS-01: Xem dashboard giảng viên

- **As a** giảng viên, **I want to** xem dashboard thống kê, **so that** tôi nắm được hiệu quả các khoá học.
- **Priority:** Must Have
- **Story Points:** 5
- **Acceptance Criteria:**
  1. Tổng số khoá học (draft/published/archived).
  2. Tổng số học viên đăng ký.
  3. Rating trung bình toàn bộ khoá học.
  4. Biểu đồ đăng ký theo thời gian (7 ngày / 30 ngày).
  5. Danh sách khoá học với thống kê nhanh.
  6. Đánh giá gần đây nhất.

### US-INS-02: Tạo khoá học mới

- **As a** giảng viên, **I want to** tạo khoá học mới qua form nhiều bước, **so that** tôi tổ chức thông tin khoá học một cách có hệ thống.
- **Priority:** Must Have
- **Story Points:** 8
- **Acceptance Criteria:**
  1. **Bước 1:** Nhập thông tin cơ bản (tên, mô tả ngắn, danh mục, level, ngôn ngữ).
  2. **Bước 2:** Nhập nội dung chi tiết (rich text), yêu cầu, mục tiêu, đối tượng.
  3. **Bước 3:** Upload thumbnail, nhập video URL, giá.
  4. **Bước 4:** Xem lại tổng thể, lưu nháp hoặc xuất bản.
  5. Slug auto-generate từ tên (có thể chỉnh sửa).
  6. Validation realtime mỗi bước.
  7. Có thể quay lại bước trước mà không mất dữ liệu.

### US-INS-03: Chỉnh sửa khoá học

- **As a** giảng viên, **I want to** chỉnh sửa thông tin khoá học đã tạo, **so that** tôi cập nhật nội dung khi cần.
- **Priority:** Must Have
- **Story Points:** 3
- **Acceptance Criteria:**
  1. Tương tự form tạo khoá học, pre-fill dữ liệu hiện có.
  2. Chỉ chỉnh sửa khoá học của mình.
  3. Thông báo lưu thành công.

### US-INS-04: Quản lý Module

- **As a** giảng viên, **I want to** tổ chức khoá học thành các module, **so that** nội dung được cấu trúc rõ ràng.
- **Priority:** Must Have
- **Story Points:** 5
- **Acceptance Criteria:**
  1. Xem danh sách modules với bài học bên trong (accordion).
  2. Thêm module mới (inline form).
  3. Chỉnh sửa tên và mô tả module (inline edit).
  4. Xoá module (xác nhận nếu có bài học).
  5. Sắp xếp module bằng drag & drop hoặc nút lên/xuống.

### US-INS-05: Tạo bài học

- **As a** giảng viên, **I want to** tạo bài học trong module, **so that** tôi cung cấp nội dung giảng dạy.
- **Priority:** Must Have
- **Story Points:** 5
- **Acceptance Criteria:**
  1. Nhập: Tên, loại (video/text/mixed), nội dung, video URL, thời lượng.
  2. Đánh dấu bài học xem trước (is_preview).
  3. Upload tài liệu đính kèm.
  4. Lưu nháp hoặc xuất bản.
  5. Rich text editor (TipTap) cho nội dung.

### US-INS-06: Sắp xếp bài học

- **As a** giảng viên, **I want to** sắp xếp thứ tự bài học trong module, **so that** nội dung được trình bày theo logic.
- **Priority:** Should Have
- **Story Points:** 3
- **Acceptance Criteria:**
  1. Drag & drop bài học trong module.
  2. Hoặc sử dụng nút mũi tên lên/xuống.
  3. Thứ tự được lưu tự động.

### US-INS-07: Tạo bài kiểm tra

- **As a** giảng viên, **I want to** tạo bài kiểm tra cho bài học, **so that** tôi đánh giá được mức độ tiếp thu của học viên.
- **Priority:** Must Have
- **Story Points:** 8
- **Acceptance Criteria:**
  1. Nhập thông tin quiz: Tên, mô tả, điểm đạt, thời gian, số lần tối đa.
  2. Thêm câu hỏi: Nội dung, loại (single/multiple choice), giải thích, điểm.
  3. Thêm đáp án cho mỗi câu hỏi, đánh dấu đáp án đúng.
  4. Sắp xếp câu hỏi.
  5. Preview bài kiểm tra trước khi lưu.
  6. Xoá câu hỏi/đáp án.

### US-INS-08: Xem danh sách học viên

- **As a** giảng viên, **I want to** xem danh sách học viên đăng ký khoá học, **so that** tôi theo dõi được học viên.
- **Priority:** Should Have
- **Story Points:** 3
- **Acceptance Criteria:**
  1. Danh sách: Họ tên, Email, Ngày đăng ký, Tiến độ, Trạng thái.
  2. Lọc theo khoá học.
  3. Lọc theo trạng thái (active, completed).
  4. Tìm kiếm theo tên/email.

### US-INS-09: Xem đánh giá khoá học

- **As a** giảng viên, **I want to** xem đánh giá từ học viên, **so that** tôi cải thiện chất lượng khoá học.
- **Priority:** Should Have
- **Story Points:** 2
- **Acceptance Criteria:**
  1. Danh sách đánh giá: Khoá học, Học viên, Rating, Bình luận, Ngày.
  2. Lọc theo khoá học, theo số sao.
  3. Thống kê: Phân bổ rating, rating trung bình.

### US-INS-10: Xoá khoá học

- **As a** giảng viên, **I want to** xoá khoá học không cần nữa, **so that** danh sách khoá học gọn gàng.
- **Priority:** Should Have
- **Story Points:** 2
- **Acceptance Criteria:**
  1. Nút xoá trên danh sách khoá học hoặc trang chỉnh sửa.
  2. Dialog xác nhận xoá.
  3. Cảnh báo nếu có học viên đang đăng ký.
  4. Khoá học chuyển sang trạng thái archived (soft delete).

---

## 6. Epic: Quản trị viên (Admin)

### US-ADM-01: Xem dashboard quản trị

- **As a** quản trị viên, **I want to** xem dashboard tổng quan, **so that** tôi nắm được tình trạng hệ thống.
- **Priority:** Must Have
- **Story Points:** 5
- **Acceptance Criteria:**
  1. Tổng người dùng (phân theo role).
  2. Tổng khoá học (phân theo status).
  3. Tổng enrollment trong tháng.
  4. Tổng đánh giá mới trong tháng.
  5. Biểu đồ đăng ký theo thời gian.
  6. Top khoá học phổ biến và được đánh giá cao.
  7. Hoạt động gần đây.

### US-ADM-02: Xem danh sách người dùng

- **As a** quản trị viên, **I want to** xem và tìm kiếm người dùng, **so that** tôi quản lý tài khoản người dùng.
- **Priority:** Must Have
- **Story Points:** 3
- **Acceptance Criteria:**
  1. Bảng: Avatar, Họ tên, Email, Vai trò, Trạng thái, Ngày tạo.
  2. Tìm kiếm theo tên hoặc email.
  3. Lọc theo vai trò, trạng thái.
  4. Sắp xếp theo cột.
  5. Phân trang 20 items/trang.

### US-ADM-03: Tạo tài khoản người dùng

- **As a** quản trị viên, **I want to** tạo tài khoản mới với bất kỳ vai trò, **so that** tôi thêm giảng viên hoặc admin mới.
- **Priority:** Must Have
- **Story Points:** 3
- **Acceptance Criteria:**
  1. Form: Họ tên, Email, Mật khẩu, Vai trò (dropdown).
  2. Validate email unique.
  3. Tạo tài khoản thành công.

### US-ADM-04: Chỉnh sửa người dùng

- **As a** quản trị viên, **I want to** chỉnh sửa thông tin và vai trò người dùng, **so that** tôi quản lý quyền truy cập.
- **Priority:** Must Have
- **Story Points:** 2
- **Acceptance Criteria:**
  1. Xem chi tiết: Thông tin profile, khoá học đăng ký/tạo, hoạt động.
  2. Thay đổi vai trò.
  3. Kích hoạt/tạm khoá tài khoản.

### US-ADM-05: Xoá người dùng

- **As a** quản trị viên, **I want to** xoá tài khoản người dùng, **so that** tôi loại bỏ tài khoản vi phạm.
- **Priority:** Should Have
- **Story Points:** 2
- **Acceptance Criteria:**
  1. Dialog xác nhận xoá.
  2. Cảnh báo các dữ liệu liên quan sẽ bị ảnh hưởng.
  3. Soft delete (chuyển status archived).

### US-ADM-06: Quản lý khoá học

- **As a** quản trị viên, **I want to** quản lý tất cả khoá học, **so that** tôi kiểm soát nội dung trên nền tảng.
- **Priority:** Must Have
- **Story Points:** 3
- **Acceptance Criteria:**
  1. Xem tất cả khoá học (không giới hạn theo giảng viên).
  2. Thay đổi trạng thái (draft/published/archived).
  3. Đánh dấu khoá học nổi bật.
  4. Xoá khoá học.

### US-ADM-07: Quản lý danh mục

- **As a** quản trị viên, **I want to** quản lý danh mục khoá học, **so that** khoá học được phân loại hợp lý.
- **Priority:** Must Have
- **Story Points:** 5
- **Acceptance Criteria:**
  1. Hiển thị dạng cây (tree view).
  2. Thêm danh mục mới (tên, slug, mô tả, icon, danh mục cha).
  3. Chỉnh sửa danh mục.
  4. Xoá danh mục (không cho xoá nếu có khoá học active).
  5. Sắp xếp thứ tự.

### US-ADM-08: Kiểm duyệt đánh giá

- **As a** quản trị viên, **I want to** kiểm duyệt đánh giá, **so that** nội dung đánh giá phù hợp với quy định.
- **Priority:** Should Have
- **Story Points:** 2
- **Acceptance Criteria:**
  1. Danh sách đánh giá với thông tin đầy đủ.
  2. Lọc theo trạng thái (pending, approved, rejected).
  3. Duyệt hoặc từ chối đánh giá.
  4. Xoá đánh giá vi phạm.

### US-ADM-09: Xem báo cáo

- **As a** quản trị viên, **I want to** xem báo cáo thống kê chi tiết, **so that** tôi ra quyết định dựa trên dữ liệu.
- **Priority:** Could Have
- **Story Points:** 5
- **Acceptance Criteria:**
  1. Biểu đồ đăng ký theo thời gian (ngày/tuần/tháng).
  2. Thống kê khoá học theo danh mục.
  3. Thống kê người dùng mới.
  4. Tỷ lệ hoàn thành khoá học.
  5. Phân bổ đánh giá.

### US-ADM-10: Cấu hình hệ thống

- **As a** quản trị viên, **I want to** cấu hình thông tin website, **so that** thông tin hiển thị chính xác.
- **Priority:** Could Have
- **Story Points:** 3
- **Acceptance Criteria:**
  1. Cấu hình tên website, mô tả, logo.
  2. Cấu hình thông tin liên hệ.

---

## 7. Epic: Thương mại điện tử (E-Commerce)

### US-ECOM-01: Thêm khoá học vào giỏ hàng

- **As a** học viên, **I want to** thêm khoá học vào giỏ hàng, **so that** tôi có thể mua nhiều khoá học cùng lúc.
- **Priority:** Must Have
- **Story Points:** 3
- **Acceptance Criteria:**
  1. Nút "Thêm vào giỏ" trên trang chi tiết khoá học.
  2. Không thể thêm khoá học đã đăng ký hoặc đã có trong giỏ.
  3. Hiển thị thông báo thêm thành công.
  4. Badge số lượng trên icon giỏ hàng ở header.

### US-ECOM-02: Quản lý giỏ hàng

- **As a** học viên, **I want to** xem và quản lý giỏ hàng, **so that** tôi xem lại trước khi thanh toán.
- **Priority:** Must Have
- **Story Points:** 3
- **Acceptance Criteria:**
  1. Trang giỏ hàng hiển thị: Thumbnail, tên khoá học, giá gốc, giá khuyến mãi.
  2. Nút xoá từng khoá học.
  3. Hiển thị tổng tiền (tự động tính khuyến mãi).
  4. Nút "Tiến hành thanh toán".
  5. Hiển thị empty state khi giỏ trống.

### US-ECOM-03: Thêm khoá học vào Wishlist

- **As a** học viên, **I want to** lưu khoá học vào danh sách yêu thích, **so that** tôi có thể mua sau.
- **Priority:** Should Have
- **Story Points:** 2
- **Acceptance Criteria:**
  1. Nút trái tim (toggle) trên card khoá học và trang chi tiết.
  2. Trang wishlist hiển thị danh sách khoá học đã lưu.
  3. Có thể xoá khỏi wishlist.

### US-ECOM-04: Thanh toán (Checkout)

- **As a** học viên, **I want to** chọn phương thức thanh toán và hoàn tất đơn hàng, **so that** tôi có quyền truy cập khoá học.
- **Priority:** Must Have
- **Story Points:** 5
- **Acceptance Criteria:**
  1. Trang checkout hiển thị: Danh sách khoá học, tổng tiền.
  2. Chọn phương thức: VNPay, MoMo, Bank Transfer.
  3. Nhấn "Thanh toán" tạo đơn hàng và redirect đến mock payment.
  4. Mock payment hiển thị QR code giả lập.
  5. Nút "Xác nhận" → thanh toán thành công → tạo enrollment.
  6. Nút "Huỷ" → thanh toán thất bại.

### US-ECOM-05: Xem kết quả thanh toán

- **As a** học viên, **I want to** xem kết quả thanh toán, **so that** tôi biết đơn hàng thành công hay thất bại.
- **Priority:** Must Have
- **Story Points:** 2
- **Acceptance Criteria:**
  1. Trang thành công: Mã đơn, danh sách khoá học, nút "Bắt đầu học".
  2. Trang thất bại: Mã đơn, thông báo lỗi, nút "Thử lại".

### US-ECOM-06: Xem lịch sử đơn hàng

- **As a** học viên, **I want to** xem lịch sử đơn hàng, **so that** tôi theo dõi được các giao dịch.
- **Priority:** Should Have
- **Story Points:** 3
- **Acceptance Criteria:**
  1. Danh sách đơn hàng: Mã đơn, ngày, tổng tiền, phương thức, trạng thái.
  2. Lọc theo trạng thái.
  3. Xem chi tiết đơn hàng với danh sách khoá học.

### US-ECOM-07: Quản lý đơn hàng (Admin)

- **As a** quản trị viên, **I want to** xem và quản lý tất cả đơn hàng, **so that** tôi giám sát giao dịch.
- **Priority:** Must Have
- **Story Points:** 3
- **Acceptance Criteria:**
  1. Danh sách tất cả đơn hàng với thông tin đầy đủ.
  2. Tìm kiếm theo mã đơn hoặc email.
  3. Lọc theo trạng thái, phương thức thanh toán.
  4. Xem chi tiết đơn hàng.

### US-ECOM-08: Cài đặt nền tảng (Admin)

- **As a** quản trị viên, **I want to** cấu hình thông tin nền tảng, **so that** thông tin website luôn chính xác.
- **Priority:** Could Have
- **Story Points:** 2
- **Acceptance Criteria:**
  1. Cập nhật tên nền tảng, mô tả.
  2. Bật/tắt chế độ bảo trì.
  3. Cập nhật thông báo bảo trì.

---

## 8. Tổng hợp User Stories

### Theo vai trò

| Vai trò        | Số lượng | Must Have | Should Have | Could Have |
| -------------- | -------- | --------- | ----------- | ---------- |
| Authentication | 7        | 5         | 2           | 0          |
| Public (Guest) | 6        | 4         | 1           | 1          |
| Student        | 10       | 6         | 4           | 0          |
| Instructor     | 10       | 5         | 4           | 1          |
| Admin          | 10       | 5         | 3           | 2          |
| E-Commerce     | 8        | 4         | 3           | 1          |
| **Tổng**       | **51**   | **29**    | **17**      | **5**      |

### Theo Story Points

| Story Points | Số lượng | Tổng Points |
| ------------ | -------- | ----------- |
| 1            | 1        | 1           |
| 2            | 13       | 26          |
| 3            | 21       | 63          |
| 5            | 12       | 60          |
| 8            | 4        | 32          |
| **Tổng**     | **51**   | **185**     |

---

_Tài liệu User Stories - Hệ Thống Quản Lý Khoá Học Trực Tuyến_
