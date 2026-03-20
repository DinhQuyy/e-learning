# TÓM TẮT ĐỒ ÁN TỐT NGHIỆP

## Hệ thống E-Learning đa vai trò tích hợp AI

**Sinh viên:** `[Điền họ tên]`  
**MSSV:** `[Điền MSSV]`  
**Giảng viên hướng dẫn:** `[Điền tên GVHD]`

### Tóm tắt

Đồ án xây dựng một nền tảng E-Learning theo mô hình nhiều vai trò, hướng đến việc số hóa đầy đủ quy trình vận hành của một website đào tạo trực tuyến. Hệ thống cho phép người dùng tìm kiếm và tiếp cận khóa học, đăng ký học, thanh toán mô phỏng, theo dõi tiến độ, làm bài kiểm tra, nhận chứng chỉ, đồng thời hỗ trợ giảng viên tạo nội dung và hỗ trợ quản trị viên kiểm duyệt, vận hành toàn hệ thống.

### Phạm vi chức năng

Hệ thống được tổ chức theo bốn nhóm người dùng chính. Ở lớp **Public**, người dùng có thể xem trang chủ, tìm kiếm, lọc và xem chi tiết khóa học. Ở lớp **Student**, người học có thể thêm khóa học vào giỏ hàng, tạo đơn hàng, thanh toán mô phỏng, tham gia học, làm quiz, cập nhật tiến độ, viết đánh giá và nhận chứng chỉ sau khi hoàn thành. Ở lớp **Instructor**, người dùng có thể nộp hồ sơ trở thành giảng viên, tạo khóa học, quản lý module, bài học, quiz, assignment và gửi khóa học lên để duyệt. Ở lớp **Admin**, hệ thống hỗ trợ quản lý người dùng, duyệt hồ sơ giảng viên, duyệt khóa học, kiểm duyệt đánh giá và theo dõi báo cáo vận hành.

### Kiến trúc triển khai

Frontend của hệ thống được xây dựng bằng **Next.js 16 App Router** và được chia route group theo từng vai trò nhằm tách biệt giao diện và luồng nghiệp vụ. Tầng dữ liệu sử dụng **Directus** trên **PostgreSQL**, đóng vai trò headless CMS và lớp quản trị dữ liệu. Cơ chế xác thực sử dụng cookie-based JWT, kết hợp route guard và role guard để kiểm soát truy cập ở nhiều lớp. Ngoài ra, hệ thống có một **AI service** viết bằng **FastAPI**, được tách riêng để phục vụ các tính năng như tư vấn khóa học, hỗ trợ học tập và theo dõi mức sử dụng AI.

### Điểm nhấn kỹ thuật

Điểm cốt lõi của đồ án không nằm ở giao diện đơn lẻ mà ở việc tổ chức luồng xử lý xuyên suốt từ giao diện, API route, query layer đến tầng dữ liệu. Quy trình học tập được liên kết thành chuỗi rõ ràng từ `cart -> order -> payment -> enrollment -> progress -> review -> certificate`, bảo đảm mỗi thao tác của người học đều phản ánh thành dữ liệu nghiệp vụ tương ứng. Với vai trò giảng viên, hệ thống kiểm soát quyền sở hữu khóa học thông qua quan hệ dữ liệu riêng, từ đó ngăn việc chỉnh sửa nội dung không đúng thẩm quyền. Với vai trò quản trị, toàn bộ quy trình duyệt giảng viên và duyệt khóa học được tách riêng, bảo đảm đúng mô hình kiểm duyệt nhiều vai trò của một nền tảng đào tạo trực tuyến.

### Giá trị đạt được

Đồ án thể hiện khả năng thiết kế và triển khai một hệ thống full-stack hoàn chỉnh, trong đó giao diện, nghiệp vụ, phân quyền, dữ liệu và AI được tổ chức thành các lớp rõ ràng. Kết quả đạt được không chỉ là một website có thể trình diễn chức năng, mà là một mô hình phần mềm có khả năng mở rộng tiếp theo cho thanh toán thật, recommendation nâng cao, video learning và các tính năng AI chuyên sâu.
