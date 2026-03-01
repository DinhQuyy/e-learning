# ĐẶC TẢ YÊU CẦU HỆ THỐNG

## Hệ Thống Quản Lý Khoá Học Trực Tuyến (E-Learning Platform)

---

## 1. Giới thiệu

### 1.1. Mục đích tài liệu

Tài liệu này mô tả chi tiết các yêu cầu chức năng và phi chức năng của Hệ Thống Quản Lý Khoá Học Trực Tuyến. Đây là tài liệu tham chiếu chính cho quá trình thiết kế, phát triển và kiểm thử hệ thống.

### 1.2. Phạm vi hệ thống

Hệ thống phục vụ ba nhóm người dùng chính:

- **Quản trị viên (Admin):** Quản lý toàn bộ hệ thống, người dùng, nội dung và cấu hình.
- **Giảng viên (Instructor):** Tạo, quản lý khoá học và theo dõi học viên.
- **Học viên (Student):** Duyệt, đăng ký, học tập và đánh giá khoá học.

### 1.3. Định nghĩa và thuật ngữ

| Thuật ngữ  | Định nghĩa                                            |
| ---------- | ----------------------------------------------------- |
| Course     | Khoá học bao gồm nhiều module                         |
| Module     | Phần/chương trong khoá học, chứa nhiều bài học        |
| Lesson     | Bài học đơn lẻ, có thể là video, văn bản hoặc kết hợp |
| Quiz       | Bài kiểm tra trắc nghiệm gắn với bài học              |
| Enrollment | Bản ghi đăng ký khoá học của học viên                 |
| Progress   | Tiến độ hoàn thành từng bài học của học viên          |
| Review     | Đánh giá khoá học bao gồm điểm rating và bình luận    |
| RBAC       | Role-Based Access Control - Phân quyền theo vai trò   |
| Cart       | Giỏ hàng tạm thời chứa khoá học muốn mua             |
| Wishlist   | Danh sách yêu thích, lưu khoá học quan tâm           |
| Order      | Đơn hàng mua khoá học, gồm nhiều order items          |
| Mock Payment | Thanh toán giả lập (VNPay/MoMo/Bank Transfer)      |
| SSR        | Server-Side Rendering                                 |
| CMS        | Content Management System                             |

---

## 2. Yêu cầu chức năng (Functional Requirements)

### 2.1. Module Xác thực và Phân quyền (Authentication & Authorization)

#### FR-AUTH-01: Đăng ký tài khoản

- **Mô tả:** Người dùng mới có thể đăng ký tài khoản với vai trò Student.
- **Đầu vào:** Họ tên, email, mật khẩu, xác nhận mật khẩu.
- **Xử lý:**
  - Validate email hợp lệ và chưa tồn tại trong hệ thống.
  - Validate mật khẩu tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường và số.
  - Hash mật khẩu trước khi lưu.
  - Gán vai trò mặc định là Student.
- **Đầu ra:** Tài khoản được tạo, trả về access token và refresh token.
- **Lỗi:** Email đã tồn tại, mật khẩu không đủ mạnh, thông tin không hợp lệ.

#### FR-AUTH-02: Đăng nhập

- **Mô tả:** Người dùng đăng nhập bằng email và mật khẩu.
- **Đầu vào:** Email, mật khẩu.
- **Xử lý:**
  - Kiểm tra email tồn tại và tài khoản ở trạng thái active.
  - So sánh mật khẩu đã hash.
  - Tạo access token (15 phút) và refresh token (7 ngày).
- **Đầu ra:** Access token, refresh token, thông tin user cơ bản.
- **Lỗi:** Email không tồn tại, mật khẩu sai, tài khoản bị khoá.

#### FR-AUTH-03: Đăng xuất

- **Mô tả:** Người dùng đăng xuất khỏi hệ thống.
- **Xử lý:** Xoá refresh token, xoá cookie phía client.
- **Đầu ra:** Xác nhận đăng xuất thành công.

#### FR-AUTH-04: Quên mật khẩu

- **Mô tả:** Người dùng yêu cầu đặt lại mật khẩu qua email.
- **Đầu vào:** Email đã đăng ký.
- **Xử lý:**
  - Kiểm tra email tồn tại.
  - Tạo token đặt lại mật khẩu (hết hạn sau 1 giờ).
  - Gửi email chứa link đặt lại mật khẩu.
- **Đầu ra:** Thông báo đã gửi email.

#### FR-AUTH-05: Đặt lại mật khẩu

- **Mô tả:** Người dùng đặt mật khẩu mới từ link trong email.
- **Đầu vào:** Token, mật khẩu mới, xác nhận mật khẩu mới.
- **Xử lý:** Kiểm tra token hợp lệ, cập nhật mật khẩu mới đã hash.
- **Đầu ra:** Xác nhận thay đổi mật khẩu thành công.

#### FR-AUTH-06: Làm mới token

- **Mô tả:** Tự động làm mới access token khi hết hạn.
- **Đầu vào:** Refresh token.
- **Xử lý:** Kiểm tra refresh token hợp lệ, tạo access token mới.
- **Đầu ra:** Access token mới.

#### FR-AUTH-07: Phân quyền theo vai trò

- **Mô tả:** Hệ thống kiểm soát quyền truy cập dựa trên vai trò người dùng.
- **Quy tắc:**
  - Admin: Truy cập toàn bộ hệ thống.
  - Instructor: Truy cập khu vực giảng viên và quản lý khoá học của mình.
  - Student: Truy cập khu vực học viên và khoá học đã đăng ký.
  - Guest (chưa đăng nhập): Chỉ xem trang công cộng.

---

### 2.2. Module Quản trị viên (Admin)

#### FR-ADMIN-01: Dashboard quản trị

- **Mô tả:** Hiển thị thống kê tổng quan hệ thống.
- **Thông tin hiển thị:**
  - Tổng số người dùng (phân theo vai trò).
  - Tổng số khoá học (phân theo trạng thái: draft, published, archived).
  - Tổng số đăng ký khoá học (enrollment) trong tháng.
  - Tổng số đánh giá mới trong tháng.
  - Biểu đồ đăng ký theo thời gian (7 ngày / 30 ngày / 12 tháng).
  - Top 5 khoá học được đăng ký nhiều nhất.
  - Top 5 khoá học được đánh giá cao nhất.
  - Hoạt động gần đây (đăng ký mới, đánh giá mới, khoá học mới).

#### FR-ADMIN-02: Quản lý người dùng - Danh sách

- **Mô tả:** Xem danh sách tất cả người dùng trong hệ thống.
- **Chức năng:**
  - Hiển thị bảng danh sách: Avatar, Họ tên, Email, Vai trò, Trạng thái, Ngày tạo.
  - Tìm kiếm theo tên hoặc email.
  - Lọc theo vai trò (Admin, Instructor, Student).
  - Lọc theo trạng thái (Active, Suspended, Inactive).
  - Sắp xếp theo cột.
  - Phân trang (20 items/trang).

#### FR-ADMIN-03: Quản lý người dùng - Chi tiết & chỉnh sửa

- **Mô tả:** Xem chi tiết và chỉnh sửa thông tin người dùng.
- **Chức năng:**
  - Xem thông tin chi tiết: profile, khoá học đã đăng ký/tạo, hoạt động.
  - Thay đổi vai trò người dùng.
  - Thay đổi trạng thái (kích hoạt/tạm khoá).
  - Xoá tài khoản người dùng (soft delete).

#### FR-ADMIN-04: Quản lý người dùng - Tạo mới

- **Mô tả:** Admin tạo tài khoản mới với vai trò bất kỳ.
- **Đầu vào:** Họ tên, email, mật khẩu, vai trò.
- **Xử lý:** Validate, tạo tài khoản, gửi email thông báo (tuỳ chọn).

#### FR-ADMIN-05: Quản lý khoá học

- **Mô tả:** Quản lý toàn bộ khoá học trong hệ thống.
- **Chức năng:**
  - Xem danh sách tất cả khoá học với thông tin: Thumbnail, Tên, Giảng viên, Danh mục, Trạng thái, Số đăng ký, Rating, Ngày tạo.
  - Tìm kiếm theo tên khoá học.
  - Lọc theo danh mục, trạng thái, giảng viên, level.
  - Thay đổi trạng thái khoá học (draft → published → archived).
  - Đánh dấu/bỏ đánh dấu khoá học nổi bật (is_featured).
  - Xoá khoá học (soft delete).
  - Xem chi tiết khoá học bao gồm nội dung, module, bài học, thống kê.

#### FR-ADMIN-06: Quản lý danh mục - Danh sách

- **Mô tả:** Quản lý danh mục khoá học theo cấu trúc phân cấp.
- **Chức năng:**
  - Hiển thị danh sách dạng cây (tree view) với danh mục cha-con.
  - Hiển thị số lượng khoá học trong mỗi danh mục.
  - Sắp xếp thứ tự danh mục (drag & drop hoặc sort number).

#### FR-ADMIN-07: Quản lý danh mục - CRUD

- **Mô tả:** Tạo, sửa, xoá danh mục khoá học.
- **Đầu vào:** Tên, slug (auto-generate), mô tả, icon, danh mục cha (tuỳ chọn), thứ tự sắp xếp, trạng thái.
- **Xử lý:**
  - Auto-generate slug từ tên.
  - Kiểm tra slug unique.
  - Khi xoá danh mục cha: Cập nhật danh mục con thành root category.
- **Ràng buộc:** Không xoá danh mục đang có khoá học active.

#### FR-ADMIN-08: Quản lý đánh giá

- **Mô tả:** Xem và kiểm duyệt đánh giá khoá học.
- **Chức năng:**
  - Xem danh sách tất cả đánh giá: Khoá học, Người đánh giá, Rating, Nội dung, Trạng thái, Ngày tạo.
  - Lọc theo trạng thái (pending, approved, rejected), rating.
  - Duyệt hoặc từ chối đánh giá.
  - Xoá đánh giá vi phạm.

#### FR-ADMIN-09: Báo cáo thống kê

- **Mô tả:** Xem các báo cáo thống kê chi tiết.
- **Thông tin:**
  - Thống kê đăng ký theo thời gian (ngày/tuần/tháng).
  - Thống kê khoá học theo danh mục.
  - Thống kê người dùng mới theo thời gian.
  - Tỷ lệ hoàn thành khoá học.
  - Phân bổ đánh giá (distribution).

#### FR-ADMIN-10: Cài đặt hệ thống

- **Mô tả:** Cấu hình các thiết lập chung cho hệ thống.
- **Chức năng:**
  - Thông tin website (tên, mô tả, logo).
  - Cấu hình email.
  - Quản lý vai trò và quyền hạn.

---

### 2.3. Module Giảng viên (Instructor)

#### FR-INS-01: Dashboard giảng viên

- **Mô tả:** Hiển thị thống kê liên quan đến khoá học của giảng viên.
- **Thông tin hiển thị:**
  - Tổng số khoá học đã tạo (phân theo trạng thái).
  - Tổng số học viên đăng ký.
  - Đánh giá trung bình toàn bộ khoá học.
  - Tổng số đánh giá mới.
  - Biểu đồ đăng ký theo thời gian.
  - Danh sách khoá học với thống kê nhanh.
  - Đánh giá gần đây.

#### FR-INS-02: Quản lý khoá học - Danh sách

- **Mô tả:** Xem danh sách khoá học của giảng viên.
- **Chức năng:**
  - Hiển thị danh sách khoá học của mình: Thumbnail, Tên, Trạng thái, Số đăng ký, Rating, Ngày tạo.
  - Lọc theo trạng thái.
  - Nút tạo khoá học mới.

#### FR-INS-03: Tạo khoá học (Multi-step Form)

- **Mô tả:** Tạo khoá học mới qua form nhiều bước.
- **Bước 1 - Thông tin cơ bản:**
  - Tên khoá học (bắt buộc).
  - Slug (auto-generate, có thể chỉnh sửa).
  - Mô tả ngắn (bắt buộc, tối đa 300 ký tự).
  - Danh mục (bắt buộc, chọn từ dropdown).
  - Cấp độ (Beginner, Intermediate, Advanced, All Levels).
  - Ngôn ngữ.
- **Bước 2 - Nội dung chi tiết:**
  - Nội dung mô tả chi tiết (TipTap rich text editor).
  - Yêu cầu tiên quyết (requirements - danh sách text, thêm/xoá dynamic).
  - Mục tiêu khoá học (objectives - danh sách text, thêm/xoá dynamic).
  - Đối tượng mục tiêu (target_audience - danh sách text, thêm/xoá dynamic).
- **Bước 3 - Media & Giá:**
  - Hình thumbnail (upload ảnh, preview).
  - Video giới thiệu URL (YouTube/Vimeo embed).
  - Giá (số, 0 = miễn phí).
  - Giá khuyến mãi (tuỳ chọn, phải nhỏ hơn giá gốc).
- **Bước 4 - Xem lại & Xuất bản:**
  - Preview toàn bộ thông tin đã nhập.
  - Lưu nháp (draft) hoặc gửi xuất bản (published).

#### FR-INS-04: Chỉnh sửa khoá học

- **Mô tả:** Chỉnh sửa thông tin khoá học đã tạo.
- **Chức năng:** Tương tự form tạo khoá học, load dữ liệu hiện có.
- **Ràng buộc:** Chỉ chỉnh sửa khoá học do mình tạo.

#### FR-INS-05: Xoá khoá học

- **Mô tả:** Xoá khoá học (soft delete - chuyển trạng thái archived).
- **Ràng buộc:** Hiển thị cảnh báo nếu khoá học có học viên đang đăng ký.

#### FR-INS-06: Quản lý Module

- **Mô tả:** Quản lý các module/chương trong khoá học.
- **Chức năng:**
  - Thêm module mới: Tên, mô tả (tuỳ chọn).
  - Chỉnh sửa thông tin module.
  - Xoá module (cảnh báo nếu có bài học).
  - Sắp xếp thứ tự module (drag & drop hoặc nút lên/xuống).
  - Hiển thị danh sách bài học trong mỗi module.

#### FR-INS-07: Quản lý Bài học

- **Mô tả:** Quản lý bài học trong module.
- **Chức năng tạo/sửa bài học:**
  - Tên bài học (bắt buộc).
  - Slug (auto-generate).
  - Loại bài học (lesson_type): video, text, mixed.
  - Nội dung văn bản (TipTap rich text editor).
  - URL video bài giảng.
  - Thời lượng video (phút:giây).
  - Đánh dấu bài học xem trước miễn phí (is_preview).
  - Đính kèm tài liệu (attachments).
  - Trạng thái (draft, published).
- **Sắp xếp:** Drag & drop hoặc nút lên/xuống trong module.
- **Xoá bài học:** Soft delete.

#### FR-INS-08: Quản lý Quiz

- **Mô tả:** Tạo và quản lý bài kiểm tra trắc nghiệm.
- **Chức năng tạo quiz:**
  - Tên bài kiểm tra.
  - Mô tả/hướng dẫn.
  - Liên kết với bài học.
  - Điểm đạt (passing_score, %).
  - Giới hạn thời gian (phút, tuỳ chọn).
  - Số lần làm tối đa (max_attempts, 0 = không giới hạn).
- **Quản lý câu hỏi:**
  - Thêm câu hỏi: Nội dung, loại (single_choice, multiple_choice), giải thích, điểm.
  - Thêm đáp án cho mỗi câu hỏi: Nội dung, đánh dấu đáp án đúng.
  - Sắp xếp thứ tự câu hỏi.
  - Xoá câu hỏi/đáp án.

#### FR-INS-09: Xem danh sách học viên

- **Mô tả:** Xem học viên đã đăng ký khoá học.
- **Thông tin:** Họ tên, Email, Ngày đăng ký, Tiến độ (%), Trạng thái, Bài học truy cập gần nhất.
- **Lọc:** Theo khoá học, theo trạng thái (active, completed).
- **Tìm kiếm:** Theo tên hoặc email.

#### FR-INS-10: Xem đánh giá

- **Mô tả:** Xem đánh giá khoá học từ học viên.
- **Thông tin:** Khoá học, Học viên, Rating, Nội dung bình luận, Ngày đánh giá.
- **Lọc:** Theo khoá học, theo số sao.
- **Thống kê:** Phân bổ đánh giá (% mỗi mức sao), rating trung bình.

---

### 2.4. Module Học viên (Student)

#### FR-STU-01: Duyệt khoá học

- **Mô tả:** Học viên có thể duyệt danh sách khoá học.
- **Trang danh mục khoá học:**
  - Hiển thị khoá học dạng grid (card): Thumbnail, Tên, Giảng viên, Rating, Số đăng ký, Giá, Level.
  - Tìm kiếm theo tên khoá học.
  - Lọc theo: Danh mục, Cấp độ, Giá (miễn phí/trả phí), Rating.
  - Sắp xếp theo: Mới nhất, Phổ biến nhất, Rating cao nhất.
  - Phân trang hoặc infinite scroll.
- **Trang chi tiết khoá học:**
  - Thông tin khoá học: Tên, mô tả ngắn, thumbnail/video giới thiệu.
  - Giảng viên: Tên, avatar, headline, số khoá học.
  - Thống kê: Tổng bài học, tổng thời lượng, cấp độ, ngôn ngữ, số đăng ký.
  - Rating trung bình và số đánh giá.
  - Nội dung chi tiết (rich text).
  - Yêu cầu tiên quyết, mục tiêu, đối tượng mục tiêu.
  - Danh sách module và bài học (accordion), bài học preview có thể xem.
  - Danh sách đánh giá từ học viên.
  - Nút đăng ký (Enroll Now).

#### FR-STU-02: Đăng ký khoá học

- **Mô tả:** Học viên đăng ký tham gia khoá học.
- **Xử lý:**
  - Kiểm tra chưa đăng ký trước đó (unique constraint).
  - Tạo bản ghi enrollment với status = active, progress = 0%.
  - Tăng total_enrollments của khoá học.
  - Gửi thông báo xác nhận đăng ký.
- **Ràng buộc:** Phải đăng nhập, khoá học phải ở trạng thái published.

#### FR-STU-03: Khu vực học tập (Course Player)

- **Mô tả:** Giao diện học bài với video player và nội dung.
- **Layout:**
  - Sidebar trái: Danh sách module/bài học (accordion), đánh dấu bài đã hoàn thành.
  - Khu vực chính: Video player (nếu có) + nội dung bài học (rich text).
  - Thanh tiến độ tổng khoá học.
  - Nút điều hướng: Bài trước / Bài tiếp theo.
  - Tab bổ sung: Tài liệu đính kèm, bài kiểm tra (nếu có).
- **Xử lý:**
  - Lưu vị trí video khi người dùng rời trang (video_position).
  - Tự động đánh dấu hoàn thành khi xem xong video hoặc nhấn nút hoàn thành.
  - Cập nhật tiến độ enrollment.
  - Lưu bài học truy cập gần nhất (last_accessed_lesson_id).

#### FR-STU-04: Theo dõi tiến độ

- **Mô tả:** Hệ thống tự động theo dõi và hiển thị tiến độ học tập.
- **Chức năng:**
  - Đánh dấu bài học đã hoàn thành (is_completed).
  - Tính toán tiến độ khoá học (progress_percentage) = bài hoàn thành / tổng bài.
  - Đánh dấu khoá học hoàn thành khi progress = 100%.
  - Hiển thị thanh tiến độ trên card khoá học trong "Khoá học của tôi".

#### FR-STU-05: Làm bài kiểm tra

- **Mô tả:** Học viên thực hiện bài kiểm tra trắc nghiệm.
- **Chức năng:**
  - Hiển thị thông tin quiz: Tên, số câu hỏi, thời gian giới hạn, điểm đạt, số lần đã làm.
  - Bắt đầu làm bài: Hiển thị từng câu hỏi hoặc tất cả.
  - Chọn đáp án (single choice hoặc multiple choice).
  - Đếm ngược thời gian (nếu có giới hạn).
  - Nộp bài: Tính điểm tự động, xác định đạt/không đạt.
  - Hiển thị kết quả: Điểm, đạt/không đạt, chi tiết từng câu (đúng/sai, giải thích).
  - Kiểm tra số lần làm tối đa (nếu đã hết lượt thì không cho làm lại).
- **Ràng buộc:** Tự động nộp bài khi hết thời gian.

#### FR-STU-06: Đánh giá khoá học

- **Mô tả:** Học viên đánh giá khoá học đã đăng ký.
- **Chức năng:**
  - Chọn rating 1-5 sao (bắt buộc).
  - Viết bình luận (tuỳ chọn).
  - Gửi đánh giá (một đánh giá duy nhất cho mỗi khoá học).
  - Chỉnh sửa đánh giá đã gửi.
- **Xử lý:**
  - Unique constraint: 1 user chỉ đánh giá 1 lần cho 1 khoá học.
  - Cập nhật average_rating của khoá học.
- **Ràng buộc:** Chỉ đánh giá khoá học đã đăng ký.

#### FR-STU-07: Dashboard học viên

- **Mô tả:** Trang tổng quan cho học viên.
- **Thông tin hiển thị:**
  - Số khoá học đang học.
  - Số khoá học đã hoàn thành.
  - Bài học gần đây (continue learning).
  - Danh sách khoá học đang học với tiến độ.
  - Thông báo mới.

#### FR-STU-08: Khoá học của tôi

- **Mô tả:** Xem danh sách khoá học đã đăng ký.
- **Chức năng:**
  - Hiển thị danh sách khoá học: Thumbnail, Tên, Giảng viên, Progress bar, Trạng thái.
  - Lọc: Tất cả, Đang học, Đã hoàn thành.
  - Nút "Tiếp tục học" dẫn đến bài học gần nhất.

#### FR-STU-09: Quản lý hồ sơ cá nhân

- **Mô tả:** Xem và chỉnh sửa thông tin cá nhân.
- **Chức năng:**
  - Cập nhật: Họ tên, avatar, tiểu sử (bio), số điện thoại, headline.
  - Cập nhật liên kết mạng xã hội (social_links).
  - Đổi mật khẩu (yêu cầu mật khẩu cũ).

#### FR-STU-10: Thông báo

- **Mô tả:** Xem danh sách thông báo.
- **Chức năng:**
  - Hiển thị danh sách thông báo: Tiêu đề, Nội dung ngắn, Thời gian, Trạng thái đã đọc.
  - Đánh dấu đã đọc/chưa đọc.
  - Nhấn vào thông báo để điều hướng đến trang liên quan (link).
  - Badge số thông báo chưa đọc trên icon.

---

### 2.5. Module Thương mại điện tử (E-Commerce)

#### FR-ECOM-01: Giỏ hàng (Cart)

- **Mô tả:** Học viên có thể thêm khoá học vào giỏ hàng trước khi thanh toán.
- **Chức năng:**
  - Thêm khoá học vào giỏ hàng từ trang chi tiết khoá học.
  - Xem danh sách khoá học trong giỏ (tên, thumbnail, giá, giảm giá).
  - Xoá khoá học khỏi giỏ hàng.
  - Hiển thị tổng tiền (tự động tính giá khuyến mãi nếu có).
- **Ràng buộc:** Không thể thêm khoá học đã đăng ký hoặc đã có trong giỏ.

#### FR-ECOM-02: Danh sách yêu thích (Wishlist)

- **Mô tả:** Học viên có thể lưu khoá học vào danh sách yêu thích.
- **Chức năng:**
  - Toggle thêm/xoá khoá học khỏi wishlist từ trang chi tiết hoặc danh sách.
  - Xem danh sách khoá học đã lưu.
  - Chuyển khoá học từ wishlist vào giỏ hàng.
- **Ràng buộc:** Mỗi khoá học chỉ xuất hiện 1 lần trong wishlist (unique constraint).

#### FR-ECOM-03: Tạo đơn hàng (Checkout)

- **Mô tả:** Học viên tạo đơn hàng từ giỏ hàng và chọn phương thức thanh toán.
- **Đầu vào:** Danh sách khoá học từ giỏ hàng, phương thức thanh toán (VNPay, MoMo, Bank Transfer).
- **Xử lý:**
  - Tạo đơn hàng với mã đơn tự động (ORD-YYYYMMDD-XXXX).
  - Tạo order_items với giá tại thời điểm mua (discount_price nếu có).
  - Xoá khoá học khỏi giỏ hàng.
  - Redirect đến trang thanh toán.
- **Đầu ra:** Đơn hàng với status = "pending".

#### FR-ECOM-04: Thanh toán giả lập (Mock Payment)

- **Mô tả:** Hệ thống mô phỏng quy trình thanh toán với VNPay/MoMo/Bank Transfer.
- **Chức năng:**
  - Hiển thị thông tin đơn hàng và mã QR giả lập.
  - Nút "Xác nhận thanh toán" để mô phỏng thanh toán thành công.
  - Nút "Huỷ thanh toán" để mô phỏng thanh toán thất bại.
- **Xử lý khi thành công:**
  - Cập nhật order status = "success", paid_at = NOW().
  - Tạo enrollment cho từng khoá học trong đơn hàng.
  - Gửi thông báo xác nhận cho học viên.
  - Redirect đến trang thanh toán thành công.
- **Xử lý khi thất bại:**
  - Cập nhật order status = "failed".
  - Redirect đến trang thanh toán thất bại.

#### FR-ECOM-05: Lịch sử đơn hàng (Student)

- **Mô tả:** Học viên xem danh sách đơn hàng đã tạo.
- **Thông tin hiển thị:** Mã đơn, ngày tạo, tổng tiền, phương thức thanh toán, trạng thái, danh sách khoá học.
- **Lọc:** Theo trạng thái (pending, success, failed, cancelled).

#### FR-ECOM-06: Quản lý đơn hàng (Admin)

- **Mô tả:** Admin xem và quản lý tất cả đơn hàng.
- **Chức năng:**
  - Xem danh sách đơn hàng: Mã đơn, Người mua, Tổng tiền, Phương thức, Trạng thái, Ngày tạo.
  - Tìm kiếm theo mã đơn hoặc email người mua.
  - Lọc theo trạng thái.
  - Xem chi tiết đơn hàng.

#### FR-ECOM-07: Cài đặt nền tảng (Admin)

- **Mô tả:** Admin cấu hình thông tin chung của nền tảng.
- **Chức năng:**
  - Cập nhật tên nền tảng, mô tả.
  - Bật/tắt chế độ bảo trì (maintenance mode).
  - Cập nhật thông báo bảo trì.

---

### 2.6. Module Trang công cộng (Public Pages)

#### FR-PUB-01: Trang chủ

- **Mô tả:** Trang đầu tiên khi truy cập website.
- **Nội dung:**
  - Hero section: Tiêu đề, mô tả ngắn, nút CTA "Khám phá khoá học".
  - Khoá học nổi bật (is_featured = true).
  - Khoá học mới nhất.
  - Khoá học phổ biến nhất (theo enrollment count).
  - Danh mục khoá học (grid icon + tên).
  - Thống kê: Số khoá học, số giảng viên, số học viên.

#### FR-PUB-02: Trang danh mục

- **Mô tả:** Hiển thị danh mục khoá học.
- **Nội dung:** Grid danh mục với icon, tên, mô tả, số khoá học.

#### FR-PUB-03: Trang hồ sơ giảng viên

- **Mô tả:** Trang công khai của giảng viên.
- **Nội dung:** Avatar, Họ tên, Headline, Bio, Social links, Danh sách khoá học, Thống kê (số khoá học, số học viên, rating TB).

---

## 3. Yêu cầu phi chức năng (Non-Functional Requirements)

### 3.1. Hiệu năng (Performance)

| ID          | Yêu cầu                                               | Chỉ số mục tiêu                                                  |
| ----------- | ----------------------------------------------------- | ---------------------------------------------------------------- |
| NFR-PERF-01 | Thời gian tải trang đầu tiên (First Contentful Paint) | < 1.5 giây                                                       |
| NFR-PERF-02 | Thời gian phản hồi API                                | < 500ms cho 95% requests                                         |
| NFR-PERF-03 | Thời gian tải trang chuyển tiếp (client navigation)   | < 300ms                                                          |
| NFR-PERF-04 | Hỗ trợ đồng thời                                      | Tối thiểu 100 người dùng đồng thời                               |
| NFR-PERF-05 | Kích thước bundle JavaScript                          | < 200KB (gzipped) cho initial load                               |
| NFR-PERF-06 | Caching                                               | Sử dụng Redis cache cho queries thường xuyên, ISR cho trang tĩnh |

### 3.2. Bảo mật (Security)

| ID         | Yêu cầu          | Mô tả                                                     |
| ---------- | ---------------- | --------------------------------------------------------- |
| NFR-SEC-01 | Xác thực         | JWT-based authentication với access token + refresh token |
| NFR-SEC-02 | Mã hoá mật khẩu  | Bcrypt/Argon2 hashing                                     |
| NFR-SEC-03 | HTTPS            | Tất cả traffic qua HTTPS (TLS 1.2+)                       |
| NFR-SEC-04 | CORS             | Cấu hình CORS chỉ cho phép domain frontend                |
| NFR-SEC-05 | Rate limiting    | Giới hạn request cho API endpoints (đặc biệt auth)        |
| NFR-SEC-06 | Input validation | Validate tất cả input phía server (Zod schema)            |
| NFR-SEC-07 | SQL Injection    | Sử dụng parameterized queries (Directus ORM)              |
| NFR-SEC-08 | XSS Protection   | Sanitize HTML input, CSP headers                          |
| NFR-SEC-09 | CSRF Protection  | CSRF token cho các mutation operations                    |
| NFR-SEC-10 | Phân quyền       | RBAC - kiểm tra quyền ở cả frontend và backend            |

### 3.3. Khả năng sử dụng (Usability)

| ID         | Yêu cầu           | Mô tả                                                               |
| ---------- | ----------------- | ------------------------------------------------------------------- |
| NFR-USE-01 | Responsive design | Hỗ trợ Desktop (1024px+), Tablet (768px-1023px), Mobile (< 768px)   |
| NFR-USE-02 | Trình duyệt       | Chrome 90+, Firefox 90+, Safari 14+, Edge 90+                       |
| NFR-USE-03 | Accessibility     | WCAG 2.1 Level AA (semantic HTML, ARIA labels, keyboard navigation) |
| NFR-USE-04 | Loading states    | Hiển thị skeleton/spinner cho tất cả async operations               |
| NFR-USE-05 | Error handling    | Thông báo lỗi rõ ràng, thân thiện bằng tiếng Việt                   |
| NFR-USE-06 | Form validation   | Realtime validation với thông báo lỗi inline                        |
| NFR-USE-07 | Điều hướng        | Breadcrumb, navigation nhất quán, back button hoạt động đúng        |

### 3.4. Khả năng mở rộng (Scalability)

| ID         | Yêu cầu            | Mô tả                                              |
| ---------- | ------------------ | -------------------------------------------------- |
| NFR-SCA-01 | Database           | PostgreSQL hỗ trợ indexing và partitioning khi cần |
| NFR-SCA-02 | Caching            | Redis cache có thể mở rộng                         |
| NFR-SCA-03 | File storage       | Hỗ trợ S3-compatible storage cho upload files      |
| NFR-SCA-04 | Horizontal scaling | Directus và Next.js có thể chạy nhiều instances    |
| NFR-SCA-05 | CDN                | Tĩnh assets phục vụ qua CDN (Vercel Edge Network)  |

### 3.5. Khả năng bảo trì (Maintainability)

| ID         | Yêu cầu            | Mô tả                                        |
| ---------- | ------------------ | -------------------------------------------- |
| NFR-MAI-01 | Code quality       | TypeScript strict mode, ESLint, Prettier     |
| NFR-MAI-02 | Code structure     | Modular architecture, separation of concerns |
| NFR-MAI-03 | Documentation      | Inline comments, README, API documentation   |
| NFR-MAI-04 | Version control    | Git workflow, semantic commit messages       |
| NFR-MAI-05 | Environment config | Environment variables cho mọi cấu hình       |

### 3.6. Độ tin cậy (Reliability)

| ID         | Yêu cầu        | Mô tả                                                     |
| ---------- | -------------- | --------------------------------------------------------- |
| NFR-REL-01 | Uptime         | 99.5% availability                                        |
| NFR-REL-02 | Data backup    | Backup database hàng ngày                                 |
| NFR-REL-03 | Error recovery | Graceful error handling, không crash toàn bộ app          |
| NFR-REL-04 | Data integrity | Foreign key constraints, unique constraints, transactions |

---

## 4. Ràng buộc hệ thống (System Constraints)

1. **Backend phải sử dụng Directus** làm headless CMS, triển khai qua Docker.
2. **Frontend phải sử dụng Next.js 15+** với App Router.
3. **Cơ sở dữ liệu** phải là PostgreSQL 16.
4. **Giao diện** phải responsive, sử dụng Tailwind CSS 4+ và shadcn/ui.
5. **Toàn bộ source code** viết bằng TypeScript.
6. **API communication** giữa Next.js và Directus qua REST API.

---

## 5. Ma trận truy xuất yêu cầu (Requirements Traceability Matrix)

| Nhóm chức năng        | Số lượng FR | Ưu tiên    |
| --------------------- | ----------- | ---------- |
| Xác thực & Phân quyền | 7           | Cao        |
| Quản trị viên         | 10          | Cao        |
| Giảng viên            | 10          | Cao        |
| Học viên              | 10          | Cao        |
| Thương mại điện tử    | 7           | Cao        |
| Trang công cộng       | 3           | Trung bình |
| **Tổng**              | **47**      |            |

| Nhóm NFR         | Số lượng | Ưu tiên    |
| ---------------- | -------- | ---------- |
| Hiệu năng        | 6        | Cao        |
| Bảo mật          | 10       | Cao        |
| Khả năng sử dụng | 7        | Cao        |
| Khả năng mở rộng | 5        | Trung bình |
| Bảo trì          | 5        | Trung bình |
| Độ tin cậy       | 4        | Cao        |
| **Tổng**         | **37**   |            |

---

_Tài liệu đặc tả yêu cầu - Hệ Thống Quản Lý Khoá Học Trực Tuyến_
