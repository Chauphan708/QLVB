# Trạng thái kiểm tra bản bàn giao

- Kiểm tra cú pháp của 90 tệp TypeScript/TSX: đạt.
- Kiểm tra kiểu của 90 tệp TypeScript/TSX: không có lỗi. Dùng các thư viện giao diện đã cài của dự án gốc và khai báo kiểu chính thức @types/pg 8.15.5; không ghi đầu ra build.
- 7 bài kiểm tra logic: đạt. Gồm chuyển tham số SQL, chữ ký/hạn phiên quản trị và chặn yêu cầu ghi khác origin, mã hóa/xác thực token Google, bộ lọc khoảng ngày, chia đủ 20.000 tệp, giải nén ZIP với tên tiếng Việt và hủy luồng.
- Các bài kiểm tra chạy offline; pg được thay bằng bộ chặn để bảo đảm không kết nối hay sửa cơ sở dữ liệu thật.
- Đã kiểm tra các phiên bản Next.js 16.3.4, React 19.2.6, PostgreSQL client pg 8.16.3, TypeScript 5.9.3 có trên npm.

Chưa chạy thành công `npm install` và bản dựng production trong thư mục bàn giao: môi trường thực thi của phiên này từ chối ghi/tạo thư mục dù công cụ cấp quyền đã trả về quyền ghi. Tệp mã nguồn được lưu bằng công cụ chỉnh sửa tệp; không bỏ qua lỗi này hoặc coi là build thành công. Chưa có package-lock.json; cần chạy npm install và commit lockfile trước khi cố định việc triển khai.

Chưa kiểm tra kết nối thật Supabase, OAuth Gmail, upload/download Google Drive, chuyển dữ liệu hoặc triển khai Vercel vì chưa có cấu hình tài khoản. Cần chạy các bước ở README trước khi dùng chính thức. GitHub Actions được cấu hình chạy kiểm tra logic và build khi bạn đưa mã nguồn lên repository.

Site cũ và dữ liệu cũ không bị sửa hoặc chuyển trong quá trình chuẩn bị bộ mã nguồn này.
