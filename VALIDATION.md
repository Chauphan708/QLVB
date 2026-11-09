# Trạng thái kiểm tra bản bàn giao & Bản nâng cấp tính năng

## 1. Kiểm tra Bản nâng cấp toàn diện — 09/11/2026

Bản nâng cấp toàn diện đã hoàn tất với các tiêu chuẩn kiểm thử tự động nghiêm ngặt trên máy:

- **`npm install`**: Đã cài đặt hoàn tất toàn bộ cây phụ thuộc 513 packages trên Node.js v24.16.0.
- **`npm run typecheck`**: `tsc --noEmit` đạt 0 lỗi trên toàn bộ các tệp TypeScript và React component.
- **`npm test`**: **25/25 bài kiểm tra chạy thành công 100%** (1 bài skip dành riêng cho disposable CI database).
  - Kiểm tra SQL parameterization không làm hỏng string literals.
  - Chữ ký phiên admin, chặn expired session và cross-origin writes.
  - Mã hóa AES-256-GCM token Google Drive.
  - Bộ lọc ngày tháng, tìm kiếm tiếng Việt không dấu, bộ lọc người xử lý (Assignee).
  - Thuật toán chia 20.000 tệp thành các gói ZIP nhỏ tối đa 40 tệp/100 MB.
  - Giải nén tệp ZIP hỗ trợ tên tiếng Việt có dấu.
  - Hủy luồng tải ZIP khi người dùng đóng kết nối.
  - Xác thực ngưỡng dung lượng tệp 100 MB.
  - Kiểm tra Resumable Upload 100 chunks 1 MiB trực tiếp sang Google Drive.
  - Thuật toán khóa lạc quan (Optimistic Concurrency Control) và xóa hàng loạt.
  - Tính toán hạn xử lý thông minh (`dueInfo`: Quá hạn, Hôm nay, Còn X ngày).
  - Bộ lọc định dạng xem trước trực tiếp (`isPreviewable`: PDF, PNG, JPG, WEBP).
  - Định dạng dung lượng tệp (`formatBytes`).
  - Gợi ý tự động số ký hiệu văn bản tiếp theo theo từng năm và loại văn bản (`suggestNextNumber`).
- **`npm run build`**: Bản dựng production của Next.js hoàn tất thành công, tạo ra 14 route tĩnh và động tối ưu.

## 2. Các tính năng nâng cấp mới được tích hợp

1. **Xem trước tệp trực tiếp trong ứng dụng (`app/file-preview-dialog.tsx`)**:
   - Cho phép xem trực tiếp tệp PDF và ảnh (PNG, JPG, WEBP, GIF) ngay trong Sheet chi tiết mà không cần tải về máy.
   - Hỗ trợ mở tab mới và nút tải về truyền thống.
2. **In sổ văn bản chuẩn Nghị định 30/2020/NĐ-CP (`app/print-registry.tsx`)**:
   - Biểu mẫu in A4 ngang chuẩn công tác văn thư nhà nước (có quốc hiệu, tiêu ngữ, tên trường, niên khóa, chữ ký người vào sổ và Hiệu trưởng).
   - Tự động thay đổi tiêu đề theo luồng (Sổ văn bản đến, Sổ văn bản đi, Sổ văn bản nội bộ).
   - Tích hợp `@media print` in sắc nét trực tiếp ra máy in hoặc lưu tệp PDF.
3. **Bộ lọc theo Người xử lý (Assignee Filter)**:
   - Thêm dropdown chọn cán bộ/giáo viên phụ trách trên thanh công cụ.
   - Tự động lấy danh sách người xử lý duy nhất từ database.
4. **Vùng kéo - thả tệp đính kèm hiện đại (`app/file-dropzone.tsx`)**:
   - Thay thế input file truyền thống bằng vùng Dropzone kéo thả mượt mà.
   - Kiểm tra định dạng và dung lượng tức thời trước khi tải lên.
   - Hiển thị badge loại tệp (PDF, Word, Excel, Ảnh), dung lượng và thanh tiến trình % tải lên Drive.
5. **Gợi ý tự động Số ký hiệu văn bản tiếp theo (`lib/number-helper.ts`)**:
   - Tự động phân tích các văn bản đã ban hành trong năm để gợi ý số kế tiếp (VD: `13/CV-TH`, `03/QĐ-TH`).
   - Nút bấm 1 chạm điền nhanh vào form thêm văn bản.
6. **Quản trị dung lượng Google Drive & Dọn dẹp tệp tải dở (`app/settings/page.tsx` & `lib/drive.ts`)**:
   - Hiển thị thanh dung lượng Google Drive cá nhân (đã dùng, còn trống, phần trăm).
   - Công cụ bấm dọn dẹp các tệp tạm dở dang > 24 giờ vào Thùng rác Drive.
7. **Nhật ký thao tác văn bản (`supabase/migrations/003_audit_log.sql` & `lib/audit-log.ts`)**:
   - Ghi nhận lịch sử: Tạo mới, Cập nhật thông tin/tệp, Đổi trạng thái xử lý, Xóa.
   - Hiển thị dòng thời gian trực quan ngay trong Sheet chi tiết văn bản.
8. **Nhãn đếm ngược thời hạn thông minh (`dueInfo`)**:
   - Cảnh báo trực quan trên bảng danh sách: `Quá hạn X ngày`, `Hôm nay đến hạn`, `Đến hạn ngày mai`, `Còn X ngày`.

## 3. Hướng dẫn trước khi vận hành thực tế

1. Mở Supabase SQL Editor và chạy `supabase/migrations/003_audit_log.sql` để tạo bảng nhật ký thao tác (nếu muốn lưu lịch sử).
2. Thiết lập các biến môi trường trong `.env.local` theo hướng dẫn tại `README.md`.
3. Khởi động môi trường thử nghiệm với `npm run dev`.
