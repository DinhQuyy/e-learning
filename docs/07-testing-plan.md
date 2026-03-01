# KẾ HOẠCH KIỂM THỬ

## Hệ Thống Quản Lý Khoá Học Trực Tuyến (E-Learning Platform)

---

## 1. Tổng quan

### 1.1. Mục đích

Tài liệu này mô tả kế hoạch kiểm thử toàn diện cho hệ thống E-Learning Platform, bao gồm kiểm thử chức năng (functional testing), kiểm thử giao diện (UI testing) và kiểm thử phi chức năng (non-functional testing).

### 1.2. Phạm vi kiểm thử

| Loại kiểm thử  | Mô tả                           | Công cụ                       |
| -------------- | ------------------------------- | ----------------------------- |
| Manual Testing | Kiểm thử thủ công các chức năng | Trình duyệt (Chrome, Firefox) |
| API Testing    | Kiểm thử các API endpoints      | Postman / Thunder Client      |
| UI Testing     | Kiểm thử giao diện, responsive  | Chrome DevTools               |
| Performance    | Kiểm thử hiệu năng cơ bản       | Lighthouse, Chrome DevTools   |

### 1.3. Môi trường kiểm thử

| Environment | Mô tả                                                   |
| ----------- | ------------------------------------------------------- |
| Development | `localhost:3000` (Next.js), `localhost:8055` (Directus) |
| Staging     | Triển khai trên VPS test trước khi đưa lên production   |

### 1.4. Quy ước

- **Test Case ID:** `TC-[MODULE]-[SỐ]` (vd: TC-AUTH-01)
- **Kết quả:** PASS / FAIL / BLOCKED / SKIP
- **Mức độ ưu tiên:** Critical / High / Medium / Low

---

## 2. Test Cases - Module Xác thực (Authentication)

| ID         | Mô tả                                       | Điều kiện tiên quyết       | Các bước thực hiện                                                                                                                                    | Kết quả mong đợi                                                           | Ưu tiên  | Kết quả |
| ---------- | ------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------- | ------- |
| TC-AUTH-01 | Đăng ký tài khoản thành công                | Truy cập trang đăng ký     | 1. Nhập họ: "Nguyen" 2. Nhập tên: "Van A" 3. Nhập email hợp lệ mới 4. Nhập mật khẩu "Abc12345" 5. Nhập xác nhận mật khẩu "Abc12345" 6. Nhấn "Đăng ký" | Đăng ký thành công, chuyển đến dashboard học viên, hiển thị tên người dùng | Critical |         |
| TC-AUTH-02 | Đăng ký với email đã tồn tại                | Email đã có trong hệ thống | 1. Nhập thông tin hợp lệ 2. Nhập email đã tồn tại 3. Nhấn "Đăng ký"                                                                                   | Hiển thị lỗi "Email đã được sử dụng"                                       | Critical |         |
| TC-AUTH-03 | Đăng ký với mật khẩu yếu                    | Truy cập trang đăng ký     | 1. Nhập thông tin hợp lệ 2. Nhập mật khẩu "123" 3. Nhấn "Đăng ký"                                                                                     | Hiển thị lỗi về yêu cầu mật khẩu (8 ký tự, chữ hoa, chữ thường, số)        | High     |         |
| TC-AUTH-04 | Đăng ký với mật khẩu xác nhận không khớp    | Truy cập trang đăng ký     | 1. Nhập mật khẩu "Abc12345" 2. Nhập xác nhận "Abc12346" 3. Nhấn "Đăng ký"                                                                             | Hiển thị lỗi "Mật khẩu xác nhận không khớp"                                | High     |         |
| TC-AUTH-05 | Đăng ký với email không hợp lệ              | Truy cập trang đăng ký     | 1. Nhập email "invalid-email" 2. Nhấn "Đăng ký"                                                                                                       | Hiển thị lỗi "Email không hợp lệ"                                          | High     |         |
| TC-AUTH-06 | Đăng ký với trường bắt buộc trống           | Truy cập trang đăng ký     | 1. Để trống tất cả trường 2. Nhấn "Đăng ký"                                                                                                           | Hiển thị lỗi cho từng trường bắt buộc                                      | High     |         |
| TC-AUTH-07 | Đăng nhập thành công                        | Tài khoản đã tồn tại       | 1. Nhập email chính xác 2. Nhập mật khẩu chính xác 3. Nhấn "Đăng nhập"                                                                                | Đăng nhập thành công, chuyển đến dashboard theo vai trò                    | Critical |         |
| TC-AUTH-08 | Đăng nhập với email sai                     | Truy cập trang đăng nhập   | 1. Nhập email không tồn tại 2. Nhập mật khẩu bất kỳ 3. Nhấn "Đăng nhập"                                                                               | Hiển thị lỗi "Email hoặc mật khẩu không đúng"                              | Critical |         |
| TC-AUTH-09 | Đăng nhập với mật khẩu sai                  | Tài khoản đã tồn tại       | 1. Nhập email chính xác 2. Nhập mật khẩu sai 3. Nhấn "Đăng nhập"                                                                                      | Hiển thị lỗi "Email hoặc mật khẩu không đúng"                              | Critical |         |
| TC-AUTH-10 | Đăng nhập tài khoản bị khoá                 | Tài khoản bị suspended     | 1. Nhập email tài khoản bị khoá 2. Nhập mật khẩu đúng 3. Nhấn "Đăng nhập"                                                                             | Hiển thị lỗi "Tài khoản đã bị tạm khoá"                                    | High     |         |
| TC-AUTH-11 | Đăng xuất                                   | Đã đăng nhập               | 1. Nhấn avatar ở header 2. Chọn "Đăng xuất"                                                                                                           | Đăng xuất thành công, chuyển về trang chủ, không truy cập được dashboard   | Critical |         |
| TC-AUTH-12 | Quên mật khẩu - Gửi email                   | Tài khoản đã tồn tại       | 1. Nhấn "Quên mật khẩu?" 2. Nhập email đã đăng ký 3. Nhấn "Gửi"                                                                                       | Hiển thị thông báo "Đã gửi email đặt lại mật khẩu"                         | High     |         |
| TC-AUTH-13 | Đặt lại mật khẩu thành công                 | Nhận được link reset       | 1. Truy cập link reset 2. Nhập mật khẩu mới hợp lệ 3. Nhập xác nhận 4. Nhấn "Đặt lại"                                                                 | Đặt lại thành công, chuyển đến trang đăng nhập                             | High     |         |
| TC-AUTH-14 | Đặt lại mật khẩu token hết hạn              | Token đã hết hạn (>1h)     | 1. Truy cập link reset đã hết hạn                                                                                                                     | Hiển thị lỗi "Link đã hết hạn. Vui lòng yêu cầu lại."                      | Medium   |         |
| TC-AUTH-15 | Truy cập trang protected khi chưa đăng nhập | Chưa đăng nhập             | 1. Truy cập `/student/dashboard` trực tiếp                                                                                                            | Redirect đến trang đăng nhập                                               | Critical |         |
| TC-AUTH-16 | Truy cập trang admin với role Student       | Đăng nhập với Student      | 1. Truy cập `/admin/dashboard`                                                                                                                        | Redirect đến trang 403 hoặc dashboard student                              | Critical |         |
| TC-AUTH-17 | Truy cập trang instructor với role Student  | Đăng nhập với Student      | 1. Truy cập `/instructor/courses`                                                                                                                     | Redirect đến trang 403 hoặc dashboard student                              | Critical |         |

---

## 3. Test Cases - Trang công cộng (Public Pages)

| ID        | Mô tả                             | Điều kiện tiên quyết       | Các bước thực hiện                                      | Kết quả mong đợi                                                             | Ưu tiên  | Kết quả |
| --------- | --------------------------------- | -------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------- | -------- | ------- |
| TC-PUB-01 | Trang chủ hiển thị đúng           | Có dữ liệu courses         | 1. Truy cập trang chủ                                   | Hero section, khoá học nổi bật, mới nhất, phổ biến, danh mục hiển thị đầy đủ | High     |         |
| TC-PUB-02 | Trang chủ responsive mobile       | Truy cập trang chủ         | 1. Resize trình duyệt < 768px                           | Layout chuyển sang 1 cột, menu hamburger, cards stack dọc                    | High     |         |
| TC-PUB-03 | Danh sách khoá học hiển thị đúng  | Có dữ liệu courses         | 1. Truy cập /courses                                    | Hiển thị grid khoá học, mỗi card có thumbnail, tên, rating, giảng viên, giá  | High     |         |
| TC-PUB-04 | Tìm kiếm khoá học                 | Có khoá học "React"        | 1. Nhập "React" vào ô tìm kiếm 2. Nhấn Enter            | Hiển thị khoá học có tên chứa "React"                                        | High     |         |
| TC-PUB-05 | Lọc khoá học theo danh mục        | Có khoá học nhiều danh mục | 1. Chọn danh mục "Web Development"                      | Chỉ hiển thị khoá học thuộc danh mục đã chọn                                 | High     |         |
| TC-PUB-06 | Lọc khoá học theo cấp độ          | Có khoá học nhiều cấp độ   | 1. Chọn cấp độ "Beginner"                               | Chỉ hiển thị khoá học Beginner                                               | Medium   |         |
| TC-PUB-07 | Sắp xếp khoá học                  | Có nhiều khoá học          | 1. Chọn sắp xếp "Rating cao nhất"                       | Khoá học hiển thị theo thứ tự rating giảm dần                                | Medium   |         |
| TC-PUB-08 | Phân trang khoá học               | Có >20 khoá học            | 1. Nhấn trang 2                                         | Hiển thị khoá học trang 2 (item 21-40)                                       | Medium   |         |
| TC-PUB-09 | Chi tiết khoá học hiển thị đầy đủ | Khoá học có đầy đủ dữ liệu | 1. Nhấn vào card khoá học                               | Hiển thị: tên, mô tả, giảng viên, thống kê, modules, reviews                 | Critical |         |
| TC-PUB-10 | Xem danh sách module/bài học      | Khoá học có modules        | 1. Vào chi tiết khoá học 2. Nhấn vào module             | Accordion mở hiển thị danh sách bài học trong module                         | High     |         |
| TC-PUB-11 | Xem bài học preview               | Bài học có is_preview=true | 1. Vào chi tiết khoá học 2. Nhấn bài có tag "Preview"   | Hiển thị nội dung bài học preview (video/text)                               | Medium   |         |
| TC-PUB-12 | Xem đánh giá khoá học             | Khoá học có reviews        | 1. Vào chi tiết khoá học 2. Scroll đến section đánh giá | Hiển thị phân bổ rating, danh sách đánh giá                                  | Medium   |         |
| TC-PUB-13 | Trang danh mục hiển thị đúng      | Có danh mục                | 1. Truy cập /categories                                 | Grid danh mục với icon, tên, số khoá học                                     | Medium   |         |
| TC-PUB-14 | Xem hồ sơ giảng viên              | Giảng viên có khoá học     | 1. Nhấn tên giảng viên từ chi tiết khoá học             | Hiển thị profile: avatar, tên, bio, khoá học                                 | Low      |         |
| TC-PUB-15 | Trang 404                         | N/A                        | 1. Truy cập URL không tồn tại                           | Hiển thị trang 404 thân thiện                                                | Medium   |         |

---

## 4. Test Cases - Chức năng Học viên (Student)

| ID        | Mô tả                               | Điều kiện tiên quyết                     | Các bước thực hiện                                            | Kết quả mong đợi                                                       | Ưu tiên  | Kết quả |
| --------- | ----------------------------------- | ---------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------- | -------- | ------- |
| TC-STU-01 | Đăng ký khoá học thành công         | Đã đăng nhập Student, khoá học published | 1. Vào chi tiết khoá học 2. Nhấn "Đăng ký khoá học"           | Đăng ký thành công, hiển thị thông báo, nút chuyển thành "Bắt đầu học" | Critical |         |
| TC-STU-02 | Đăng ký khoá học khi chưa đăng nhập | Chưa đăng nhập                           | 1. Vào chi tiết khoá học 2. Nhấn "Đăng ký"                    | Redirect đến trang đăng nhập, sau đăng nhập quay lại khoá học          | High     |         |
| TC-STU-03 | Đăng ký khoá học đã đăng ký         | Đã đăng ký khoá học                      | 1. Vào chi tiết khoá học đã đăng ký                           | Hiển thị nút "Tiếp tục học" thay vì "Đăng ký"                          | High     |         |
| TC-STU-04 | Dashboard học viên hiển thị đúng    | Đã đăng ký một số khoá học               | 1. Truy cập dashboard                                         | Hiển thị: Số khoá học, tiếp tục học, danh sách khoá học với progress   | High     |         |
| TC-STU-05 | Xem "Khoá học của tôi"              | Đã đăng ký khoá học                      | 1. Truy cập "Khoá học của tôi"                                | Danh sách khoá học đã đăng ký với progress bar                         | High     |         |
| TC-STU-06 | Lọc khoá học đang học               | Có khoá học active và completed          | 1. Chọn tab "Đang học"                                        | Chỉ hiển thị khoá học chưa hoàn thành                                  | Medium   |         |
| TC-STU-07 | Lọc khoá học đã hoàn thành          | Có khoá học completed                    | 1. Chọn tab "Đã hoàn thành"                                   | Chỉ hiển thị khoá học progress 100%                                    | Medium   |         |
| TC-STU-08 | Mở Course Player                    | Đã đăng ký khoá học                      | 1. Nhấn "Tiếp tục học"                                        | Mở trang học bài với sidebar module, video/content                     | Critical |         |
| TC-STU-09 | Xem video bài học                   | Bài học có video                         | 1. Mở Course Player 2. Chọn bài học có video                  | Video player hiển thị và phát video                                    | Critical |         |
| TC-STU-10 | Đánh dấu hoàn thành bài học         | Đang trong Course Player                 | 1. Xem bài học 2. Nhấn "Hoàn thành bài học"                   | Bài học đánh dấu tích xanh, progress cập nhật                          | Critical |         |
| TC-STU-11 | Tiến độ khoá học cập nhật đúng      | Khoá học có 10 bài                       | 1. Hoàn thành 3/10 bài                                        | Progress hiển thị 30%                                                  | Critical |         |
| TC-STU-12 | Khoá học hoàn thành 100%            | Khoá học gần hoàn thành                  | 1. Hoàn thành bài cuối cùng                                   | Progress 100%, status chuyển "Completed"                               | High     |         |
| TC-STU-13 | Điều hướng bài trước/bài sau        | Đang trong Course Player                 | 1. Nhấn "Bài tiếp theo"                                       | Chuyển sang bài học tiếp theo trong module                             | High     |         |
| TC-STU-14 | Lưu vị trí video                    | Đang xem video bài học                   | 1. Xem video đến 5:00 2. Thoát ra 3. Quay lại bài học         | Video bắt đầu từ vị trí ~5:00                                          | Medium   |         |
| TC-STU-15 | Làm bài kiểm tra                    | Bài học có quiz                          | 1. Mở bài kiểm tra 2. Trả lời các câu hỏi 3. Nhấn "Nộp bài"   | Hiển thị kết quả: Điểm, đạt/không đạt, chi tiết                        | Critical |         |
| TC-STU-16 | Bài kiểm tra hết thời gian          | Quiz có time_limit                       | 1. Bắt đầu quiz 2. Để hết thời gian                           | Tự động nộp bài, hiển thị kết quả                                      | High     |         |
| TC-STU-17 | Bài kiểm tra hết lượt               | max_attempts=3, đã làm 3 lần             | 1. Cố gắng làm lại quiz                                       | Hiển thị thông báo "Đã hết lượt làm bài"                               | High     |         |
| TC-STU-18 | Đánh giá khoá học                   | Đã đăng ký khoá học                      | 1. Chọn rating 5 sao 2. Nhập bình luận 3. Nhấn "Gửi đánh giá" | Đánh giá được lưu, hiển thị trong danh sách đánh giá                   | High     |         |
| TC-STU-19 | Đánh giá trùng lặp                  | Đã đánh giá khoá học                     | 1. Cố gắng đánh giá lại                                       | Hiển thị đánh giá hiện tại với nút "Chỉnh sửa"                         | Medium   |         |
| TC-STU-20 | Chỉnh sửa đánh giá                  | Đã đánh giá trước đó                     | 1. Nhấn "Chỉnh sửa" 2. Đổi rating và comment 3. Lưu           | Đánh giá được cập nhật                                                 | Medium   |         |
| TC-STU-21 | Xem thông báo                       | Có thông báo mới                         | 1. Nhấn icon thông báo                                        | Hiển thị danh sách thông báo, badge số chưa đọc                        | Medium   |         |
| TC-STU-22 | Đánh dấu thông báo đã đọc           | Có thông báo chưa đọc                    | 1. Nhấn vào thông báo                                         | Thông báo chuyển trạng thái đã đọc, badge giảm                         | Medium   |         |
| TC-STU-23 | Cập nhật hồ sơ cá nhân              | Đã đăng nhập                             | 1. Vào trang profile 2. Cập nhật tên, bio 3. Lưu              | Thông tin được cập nhật, hiển thị thông báo thành công                 | Medium   |         |

---

## 5. Test Cases - Chức năng Giảng viên (Instructor)

| ID        | Mô tả                              | Điều kiện tiên quyết                 | Các bước thực hiện                                                                      | Kết quả mong đợi                                       | Ưu tiên  | Kết quả |
| --------- | ---------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------- | ------- |
| TC-INS-01 | Dashboard giảng viên hiển thị đúng | Đã đăng nhập Instructor, có khoá học | 1. Truy cập dashboard                                                                   | Hiển thị: Số khoá học, học viên, rating, biểu đồ       | High     |         |
| TC-INS-02 | Tạo khoá học mới - Bước 1          | Đã đăng nhập Instructor              | 1. Nhấn "Tạo khoá học" 2. Nhập tên, mô tả, danh mục, level 3. Nhấn "Tiếp theo"          | Chuyển sang bước 2, dữ liệu bước 1 được lưu            | Critical |         |
| TC-INS-03 | Tạo khoá học mới - Bước 2          | Hoàn thành bước 1                    | 1. Nhập nội dung chi tiết (TipTap) 2. Thêm requirements, objectives 3. Nhấn "Tiếp theo" | Chuyển sang bước 3                                     | Critical |         |
| TC-INS-04 | Tạo khoá học mới - Bước 3          | Hoàn thành bước 2                    | 1. Upload thumbnail 2. Nhập video URL 3. Nhập giá 4. Nhấn "Tiếp theo"                   | Chuyển sang bước 4, preview thumbnail                  | High     |         |
| TC-INS-05 | Tạo khoá học mới - Bước 4 & Lưu    | Hoàn thành bước 3                    | 1. Xem lại thông tin 2. Nhấn "Lưu nháp"                                                 | Khoá học được tạo với status=draft, redirect danh sách | Critical |         |
| TC-INS-06 | Tạo khoá học với validation lỗi    | Đã đăng nhập Instructor              | 1. Bỏ trống tên khoá học 2. Nhấn "Tiếp theo"                                            | Hiển thị lỗi "Tên khoá học là bắt buộc"                | High     |         |
| TC-INS-07 | Slug auto-generate                 | Tạo khoá học                         | 1. Nhập tên "Lập trình React"                                                           | Slug tự động: "lap-trinh-react"                        | Medium   |         |
| TC-INS-08 | Chỉnh sửa khoá học                 | Có khoá học đã tạo                   | 1. Nhấn "Chỉnh sửa" 2. Đổi tên 3. Lưu                                                   | Tên được cập nhật                                      | High     |         |
| TC-INS-09 | Xuất bản khoá học                  | Khoá học draft                       | 1. Chỉnh sửa khoá học 2. Đổi status "Published" 3. Lưu                                  | Khoá học xuất hiện trong trang công cộng               | High     |         |
| TC-INS-10 | Xoá khoá học                       | Khoá học có học viên                 | 1. Nhấn "Xoá" 2. Xác nhận                                                               | Cảnh báo có học viên, sau xác nhận chuyển archived     | High     |         |
| TC-INS-11 | Thêm module                        | Khoá học đã tạo                      | 1. Vào quản lý module 2. Nhấn "+ Thêm Module" 3. Nhập tên 4. Lưu                        | Module mới xuất hiện trong danh sách                   | Critical |         |
| TC-INS-12 | Sắp xếp module                     | Có 3+ modules                        | 1. Kéo thả module 3 lên vị trí 1                                                        | Thứ tự module thay đổi, sort cập nhật                  | Medium   |         |
| TC-INS-13 | Xoá module có bài học              | Module có bài học                    | 1. Nhấn xoá module                                                                      | Hiển thị cảnh báo, xác nhận rồi xoá                    | Medium   |         |
| TC-INS-14 | Thêm bài học                       | Module đã tạo                        | 1. Nhấn "+ Thêm bài học" 2. Nhập tên, video URL, nội dung 3. Lưu                        | Bài học mới trong module                               | Critical |         |
| TC-INS-15 | Sắp xếp bài học                    | Có 3+ bài trong module               | 1. Kéo thả bài học                                                                      | Thứ tự bài học thay đổi                                | Medium   |         |
| TC-INS-16 | Tạo quiz                           | Bài học đã tạo                       | 1. Tạo quiz cho bài học 2. Thêm 3 câu hỏi 3. Thêm đáp án 4. Lưu                         | Quiz được tạo với câu hỏi và đáp án                    | Critical |         |
| TC-INS-17 | Chỉnh sửa quiz                     | Quiz đã tạo                          | 1. Sửa câu hỏi 2. Thêm câu mới 3. Lưu                                                   | Quiz được cập nhật                                     | High     |         |
| TC-INS-18 | Xem danh sách học viên             | Khoá học có học viên                 | 1. Vào "Học viên"                                                                       | Danh sách: Tên, email, ngày đăng ký, tiến độ           | High     |         |
| TC-INS-19 | Lọc học viên theo khoá học         | Nhiều khoá học có HV                 | 1. Chọn khoá học từ dropdown                                                            | Chỉ hiển thị học viên của khoá học đã chọn             | Medium   |         |
| TC-INS-20 | Xem đánh giá                       | Khoá học có đánh giá                 | 1. Vào "Đánh giá"                                                                       | Danh sách đánh giá, thống kê phân bổ                   | Medium   |         |

---

## 6. Test Cases - Chức năng Quản trị viên (Admin)

| ID        | Mô tả                         | Điều kiện tiên quyết         | Các bước thực hiện                                           | Kết quả mong đợi                                        | Ưu tiên | Kết quả |
| --------- | ----------------------------- | ---------------------------- | ------------------------------------------------------------ | ------------------------------------------------------- | ------- | ------- |
| TC-ADM-01 | Dashboard admin hiển thị đúng | Đã đăng nhập Admin           | 1. Truy cập admin dashboard                                  | Hiển thị: Tổng users, courses, enrollments, biểu đồ     | High    |         |
| TC-ADM-02 | Xem danh sách người dùng      | Có người dùng trong hệ thống | 1. Vào "Quản lý người dùng"                                  | Bảng: Avatar, Tên, Email, Vai trò, Trạng thái, Ngày tạo | High    |         |
| TC-ADM-03 | Tìm kiếm người dùng           | Có người dùng                | 1. Nhập tên vào ô tìm kiếm                                   | Lọc ra người dùng khớp tên                              | High    |         |
| TC-ADM-04 | Lọc người dùng theo vai trò   | Có users nhiều vai trò       | 1. Chọn filter "Instructor"                                  | Chỉ hiển thị user có role Instructor                    | Medium  |         |
| TC-ADM-05 | Tạo tài khoản mới             | Đã đăng nhập Admin           | 1. Nhấn "Tạo người dùng" 2. Nhập thông tin, chọn role 3. Lưu | Tài khoản mới được tạo với role đã chọn                 | High    |         |
| TC-ADM-06 | Thay đổi vai trò người dùng   | User Student tồn tại         | 1. Vào chi tiết user 2. Đổi role sang Instructor 3. Lưu      | Vai trò được cập nhật                                   | High    |         |
| TC-ADM-07 | Tạm khoá tài khoản            | User active tồn tại          | 1. Vào chi tiết user 2. Đổi status "Suspended" 3. Lưu        | Tài khoản bị khoá, user không đăng nhập được            | High    |         |
| TC-ADM-08 | Kích hoạt lại tài khoản       | User suspended               | 1. Đổi status "Active" 2. Lưu                                | Tài khoản được kích hoạt lại                            | Medium  |         |
| TC-ADM-09 | Xoá người dùng                | User tồn tại                 | 1. Nhấn "Xoá" 2. Xác nhận                                    | User bị soft delete (archived)                          | Medium  |         |
| TC-ADM-10 | Quản lý khoá học - Danh sách  | Có khoá học                  | 1. Vào "Quản lý khoá học"                                    | Tất cả khoá học hiển thị (không giới hạn instructor)    | High    |         |
| TC-ADM-11 | Thay đổi trạng thái khoá học  | Khoá học draft               | 1. Nhấn dropdown status 2. Chọn "Published"                  | Khoá học chuyển published, hiển thị công cộng           | High    |         |
| TC-ADM-12 | Đánh dấu khoá học nổi bật     | Khoá học published           | 1. Toggle "Featured"                                         | Khoá học hiển thị trong section nổi bật trang chủ       | Medium  |         |
| TC-ADM-13 | Tạo danh mục                  | Đã đăng nhập Admin           | 1. Nhấn "Tạo danh mục" 2. Nhập tên, slug, icon 3. Lưu        | Danh mục mới xuất hiện trong danh sách                  | High    |         |
| TC-ADM-14 | Tạo danh mục con              | Có danh mục cha              | 1. Tạo danh mục 2. Chọn parent "Lập trình" 3. Lưu            | Danh mục con hiển thị dưới danh mục cha                 | High    |         |
| TC-ADM-15 | Chỉnh sửa danh mục            | Danh mục tồn tại             | 1. Nhấn "Chỉnh sửa" 2. Đổi tên 3. Lưu                        | Tên danh mục được cập nhật                              | Medium  |         |
| TC-ADM-16 | Xoá danh mục trống            | Danh mục không có khoá học   | 1. Nhấn "Xoá" 2. Xác nhận                                    | Danh mục bị xoá                                         | Medium  |         |
| TC-ADM-17 | Xoá danh mục có khoá học      | Danh mục có khoá học active  | 1. Nhấn "Xoá"                                                | Hiển thị lỗi "Không thể xoá danh mục đang có khoá học"  | High    |         |
| TC-ADM-18 | Kiểm duyệt đánh giá - Duyệt   | Đánh giá pending             | 1. Vào quản lý đánh giá 2. Nhấn "Duyệt"                      | Đánh giá chuyển approved, hiển thị công cộng            | Medium  |         |
| TC-ADM-19 | Kiểm duyệt đánh giá - Từ chối | Đánh giá pending             | 1. Nhấn "Từ chối"                                            | Đánh giá chuyển rejected, không hiển thị                | Medium  |         |
| TC-ADM-20 | Xoá đánh giá                  | Đánh giá vi phạm             | 1. Nhấn "Xoá" 2. Xác nhận                                    | Đánh giá bị xoá, average_rating cập nhật                | Medium  |         |

---

## 7. Test Cases - Thương mại điện tử (E-Commerce)

| ID          | Mô tả                                | Điều kiện tiên quyết                  | Các bước thực hiện                                                      | Kết quả mong đợi                                                    | Ưu tiên  | Kết quả |
| ----------- | ------------------------------------ | ------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------- | -------- | ------- |
| TC-ECOM-01  | Thêm khoá học vào giỏ hàng           | Đã đăng nhập Student, khoá học published | 1. Vào chi tiết khoá học 2. Nhấn "Thêm vào giỏ"                         | Khoá học xuất hiện trong giỏ hàng, thông báo thành công             | Critical |         |
| TC-ECOM-02  | Thêm khoá học đã đăng ký vào giỏ     | Đã đăng ký khoá học                   | 1. Vào chi tiết khoá học đã đăng ký 2. Nhấn "Thêm vào giỏ"             | Hiển thị lỗi "Bạn đã đăng ký khoá học này"                          | High     |         |
| TC-ECOM-03  | Thêm khoá học trùng vào giỏ          | Khoá học đã trong giỏ                 | 1. Vào chi tiết khoá học đã thêm 2. Nhấn "Thêm vào giỏ"                | Hiển thị lỗi "Khoá học đã có trong giỏ hàng"                        | High     |         |
| TC-ECOM-04  | Xem giỏ hàng                         | Có khoá học trong giỏ                 | 1. Truy cập trang giỏ hàng                                             | Hiển thị danh sách khoá học, giá, tổng tiền                         | Critical |         |
| TC-ECOM-05  | Xoá khoá học khỏi giỏ hàng           | Có khoá học trong giỏ                 | 1. Nhấn nút xoá trên item                                              | Khoá học bị xoá, tổng tiền cập nhật                                 | High     |         |
| TC-ECOM-06  | Toggle wishlist                       | Đã đăng nhập Student                  | 1. Vào chi tiết khoá học 2. Nhấn icon trái tim                         | Icon chuyển trạng thái, khoá học xuất hiện/biến mất trong wishlist  | High     |         |
| TC-ECOM-07  | Xem trang wishlist                    | Có khoá học trong wishlist            | 1. Truy cập trang wishlist                                             | Hiển thị danh sách khoá học đã lưu                                   | Medium   |         |
| TC-ECOM-08  | Checkout từ giỏ hàng                  | Có khoá học trong giỏ                 | 1. Nhấn "Thanh toán" 2. Chọn phương thức VNPay 3. Nhấn "Đặt hàng"      | Đơn hàng tạo thành công, redirect đến mock payment                  | Critical |         |
| TC-ECOM-09  | Thanh toán thành công (Mock)          | Đơn hàng pending                      | 1. Xem thông tin đơn hàng và QR 2. Nhấn "Xác nhận thanh toán"          | Order status = success, enrollment tạo, redirect trang thành công   | Critical |         |
| TC-ECOM-10  | Thanh toán thất bại (Mock)            | Đơn hàng pending                      | 1. Nhấn "Huỷ thanh toán"                                               | Order status = failed, redirect trang thất bại                      | High     |         |
| TC-ECOM-11  | Trang thanh toán thành công           | Thanh toán vừa thành công             | 1. Xem trang success                                                   | Hiển thị mã đơn, danh sách khoá học, nút "Bắt đầu học"             | High     |         |
| TC-ECOM-12  | Trang thanh toán thất bại            | Thanh toán vừa thất bại              | 1. Xem trang failed                                                    | Hiển thị mã đơn, thông báo lỗi, nút "Thử lại"                      | High     |         |
| TC-ECOM-13  | Xem lịch sử đơn hàng (Student)       | Có đơn hàng                          | 1. Truy cập trang đơn hàng                                             | Danh sách đơn: Mã, ngày, tổng tiền, phương thức, trạng thái        | Medium   |         |
| TC-ECOM-14  | Admin xem danh sách đơn hàng          | Đã đăng nhập Admin, có đơn hàng       | 1. Vào "Quản lý đơn hàng"                                              | Tất cả đơn hàng hiển thị với thông tin đầy đủ                       | High     |         |
| TC-ECOM-15  | Admin lọc đơn hàng theo trạng thái    | Có đơn hàng nhiều trạng thái          | 1. Chọn filter "success"                                               | Chỉ hiển thị đơn hàng thành công                                    | Medium   |         |

---

## 8. Test Cases - Hiệu năng và Bảo mật (Non-Functional)

| ID         | Mô tả               | Điều kiện tiên quyết | Các bước thực hiện                                      | Kết quả mong đợi                                   | Ưu tiên  | Kết quả |
| ---------- | ------------------- | -------------------- | ------------------------------------------------------- | -------------------------------------------------- | -------- | ------- |
| TC-PERF-01 | Trang chủ load time | Production build     | 1. Chạy Lighthouse trên trang chủ                       | FCP < 1.5s, LCP < 2.5s                             | High     |         |
| TC-PERF-02 | API response time   | Backend running      | 1. Gọi GET /items/courses 2. Đo thời gian               | Response time < 500ms                              | High     |         |
| TC-PERF-03 | Responsive layout   | Tất cả trang         | 1. Test trên 320px, 768px, 1024px, 1440px               | Layout hiển thị đúng ở mọi breakpoint              | High     |         |
| TC-SEC-01  | JWT token expired   | Access token hết hạn | 1. Đợi token expire 2. Gọi API                          | Auto refresh token, request thành công             | High     |         |
| TC-SEC-02  | XSS prevention      | N/A                  | 1. Nhập `<script>alert('xss')</script>` vào form review | Script không được thực thi, nội dung được sanitize | Critical |         |
| TC-SEC-03  | CORS validation     | N/A                  | 1. Gọi API từ domain khác                               | Request bị reject bởi CORS                         | High     |         |

---

## 9. Tổng hợp

### 9.1. Tổng số Test Cases

| Module         | Số TC   | Critical | High   | Medium | Low   |
| -------------- | ------- | -------- | ------ | ------ | ----- |
| Authentication | 17      | 7        | 7      | 2      | 1     |
| Public Pages   | 15      | 1        | 6      | 7      | 1     |
| Student        | 23      | 5        | 7      | 10     | 1     |
| Instructor     | 20      | 4        | 8      | 8      | 0     |
| Admin          | 20      | 0        | 10     | 10     | 0     |
| E-Commerce     | 15      | 4        | 7      | 4      | 0     |
| Non-Functional | 6       | 1        | 4      | 1      | 0     |
| **Tổng**       | **116** | **22**   | **49** | **42** | **3** |

### 9.2. Tiến độ kiểm thử

| Giai đoạn      | Thời gian  | Nội dung                      |
| -------------- | ---------- | ----------------------------- |
| Test Planning  | Tuần 15    | Chuẩn bị test plan, test data |
| Test Execution | Tuần 15-16 | Chạy toàn bộ test cases       |
| Bug Fixing     | Tuần 16    | Sửa lỗi phát hiện             |
| Regression     | Tuần 16    | Test lại sau fix bug          |
| Report         | Tuần 16    | Tổng hợp báo cáo kiểm thử     |

---

_Tài liệu kế hoạch kiểm thử - Hệ Thống Quản Lý Khoá Học Trực Tuyến_
