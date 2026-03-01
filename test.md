admin: 
- quên mật khẩu chưa làm x
- http://localhost:3000/admin/courses: thiếu chức năng thay đổi trạng thái cho khóa học ( cập nhật tương tự cho instructor) x
- http://localhost:3000/admin/users/id: cập nhật phần trăm tiến độ cho phần khóa học đã ghi danh theo dữ liệu thật x


instructor: 
- http://localhost:3000/instructor/courses/new : ở media và giá - phần url bên ngoài - đg bị lỗi phát video x 
- ở tất cả phần thêm hình ảnh trước khi xác nhận chọn thì tôi muốn có thêm chức năng crop ảnh x
- Thiếu chức năng thay đổi trạng thái khi đã lưu trữ khóa học x
- http://localhost:3000/instructor/dashboard:thiếu thống kê doanh thu theo tháng, quý, năm ; thống kê học viên theo tháng, quý, năm; 
thống kê khóa học theo tháng, quý, năm; tiến độ ở phần đăng ký gần đây chưa được cập nhật theo dữ liệu thật 
- Danh sách đăng ký học viên chưa hiển thị tên học viên và eamil đúng theo dữ liệu thật x và đồng bộ lại % tiến độ theo dữ liệu thật tương tự như admin và student x
- Thêm ui để giảng viên có thể xem được chi tiết thông tin của học viên đã đăng kí khóa học http://localhost:3000/instructor/courses/id (chưa xong)



student: 
- http://localhost:3000/courses/thiet-ke-uiux-cho-nguoi-moi: Đánh giá từ học viên chưa đc cập nhật ui theo dữ liệu thật x
- http://localhost:3000/learn/thiet-ke-uiux-cho-nguoi-moi/thiet-ke-wireframe: Khi đánh giá khóa học xong load lại nó không lưu lại nhưng vẫn hiển thị đánh giá ở http://localhost:3000/courses/thiet-ke-uiux-cho-nguoi-moi x
- Thiếu UI hiển thị quizz khi giảng viên tạo quizz cho khóa học x ( chưa hiển thị được đúng điểm cao nhất)
- http://localhost:3000/my-courses: UI tiến độ học tập chưa đúng theo dữ liệu thật x
- Kiểm tra lại luồng thông báo xem đã hoạt động chưa ( hoạt động rồi nhưng chưa test)
- http://localhost:3000/dashboard: kiểm tra lại luồng khóa học hoàn thành x, tổng giờ học xem đã hoạt động chưa x 
- http://localhost:3000/profile: Thêm chức năng crop ảnh khi thay đổi ảnh đại diện x; đổi mật khẩu chưa làm x
- Chức năng chỉnh sửa thay đổi lại đánh giá và nhận xét x