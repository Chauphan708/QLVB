# Trạng thái kiểm tra bản bàn giao

## Kiểm tra trên GitHub Actions — 03/10/2026

Commit mã nguồn `e6bb66118afcf2ec080a97880b10de7b4e8abd93` đã vượt qua:

- `npm install` trên Ubuntu với Node.js 24.
- `npm test`: 7/7 bài kiểm tra thành công.
- `npm run build`: bản dựng production Next.js thành công, bao gồm kiểm tra TypeScript.

[Kết quả kiểm tra](https://github.com/Chauphan708/QLVB/actions/runs/37120808443).

Các kiểm tra logic bao gồm tham số SQL, chữ ký/hạn phiên quản trị, chặn yêu cầu ghi khác origin, mã hóa token Drive, bộ lọc khoảng ngày, chia đủ 20.000 tệp, giải nén ZIP tiếng Việt và hủy luồng.

Lần build đầu phát hiện thiếu stylesheet trong thư mục vendor; tệp gốc đã được bổ sung và bản dựng lại thành công. Kiểm tra offline trước đó cũng đạt trên 90 tệp TypeScript/TSX.

## Chưa xác minh bằng tài khoản thật

Chưa kết nối Supabase, OAuth Gmail, upload/download Google Drive, chuyển dữ liệu hay triển khai Vercel. Cần cấu hình các biến môi trường, chạy SQL và kiểm tra quy trình thực tế theo README trước khi dùng chính thức. Build thành công không xác nhận các kết nối bên ngoài đã sẵn sàng.

Chưa commit package-lock.json. Hãy lưu lockfile được tạo bởi npm install trước khi cố định phiên bản phụ thuộc. Log npm install có báo cáo audit cần đánh giá riêng trước khi vận hành; các kiểm tra trên không phải đánh giá bảo mật toàn bộ phụ thuộc.

Site cũ và dữ liệu cũ không bị sửa hoặc chuyển trong quá trình chuẩn bị và đẩy mã nguồn.
