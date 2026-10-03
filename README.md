# Văn thư trường học — Supabase + Google Drive + Vercel

Bản mã nguồn độc lập chuyển từ site Văn thư. Giữ sổ đến/đi/nội bộ, cơ quan ban hành, tìm kiếm không dấu, bộ lọc khoảng ngày, phân trang, hạn xử lý, ngày hết hiệu lực tùy chọn, văn bản thay thế, xuất CSV và tải ZIP theo toàn bộ kho hoặc bộ lọc.

## Dữ liệu nằm ở đâu?

| Nội dung | Nơi lưu |
| --- | --- |
| Thông tin văn bản, chỉ mục tìm kiếm, trạng thái | PostgreSQL trong dự án Supabase của bạn |
| PDF, Word, Excel, ảnh | Thư mục do ứng dụng tạo trong Google Drive của Gmail cá nhân |
| Quyền truy cập Drive lâu dài | Mã hóa AES-256-GCM trong Supabase; khóa giải mã nằm ở biến môi trường APP_SECRET |
| Mã nguồn | Kho GitHub của bạn |
| Ứng dụng | Vercel |

Ứng dụng không còn phụ thuộc Cloudflare D1/R2, Sites hoặc vinext. Không có tài khoản, khóa bí mật hay dữ liệu thật trong bộ mã nguồn này. Chưa triển khai và chưa chuyển dữ liệu của site cũ.

## 1. Chuẩn bị Supabase

1. Tạo project Supabase; giữ mật khẩu database.
2. Mở SQL Editor, chạy **supabase/migrations/001_initial.sql** một lần trên database mới. Không chạy trên bảng đang có dữ liệu cùng tên.
3. Mở **Connect → Transaction pooler**, lấy chuỗi PostgreSQL port 6543 làm `DATABASE_URL`. Mật khẩu chứa ký tự đặc biệt phải được URL-encode.
4. Kết nối chỉ chạy trên máy chủ. Các bảng bật RLS và thu hồi quyền `anon`/`authenticated`. Không dùng URL này trong biến `NEXT_PUBLIC_*`.
5. TLS kiểm tra chứng chỉ mặc định. Nếu cần CA của Supabase, tải certificate trong dashboard và đặt vào `DATABASE_CA_CERT` (xuống dòng bằng `\n`). Không tắt xác minh TLS cho production.

## 2. Cài và chạy máy cá nhân

Cần Node.js 22.13 trở lên (khuyến nghị Node 24) và npm. Trong thư mục chứa package.json:

```sh
npm install
```

Sao chép `.env.example` thành `.env.local`. Chạy `node scripts/generate-secrets.mjs` trên máy của bạn, chép hai giá trị khác nhau vào `APP_SECRET` và `ADMIN_PASSWORD`. Không gửi các giá trị này vào chat, không commit `.env.local`.

Điền `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`; để `APP_URL=http://localhost:3000` khi chạy local.

```sh
npm run dev
```

Mở http://localhost:3000/settings và đăng nhập bằng `ADMIN_PASSWORD`. Đây là mật khẩu quản trị phần mềm, không phải mật khẩu Gmail. Phiên quản trị tồn tại 12 giờ; thêm, sửa, xóa, tải lên và kết nối Drive đều cần phiên quản trị.

`PUBLIC_READ=true` giữ cách chia sẻ công khai của site cũ: người có URL xem thông tin, tải tệp và ZIP. Đổi thành `false` nếu muốn yêu cầu đăng nhập cho các API đọc. Cấu hình này không làm tệp trong Drive thành liên kết công khai; ứng dụng phục vụ việc tải theo quyền của nó.

## 3. Thiết lập Google Drive cho Gmail cá nhân

1. Trong Google Cloud Console, tạo project và bật **Google Drive API**.
2. Trong **Google Auth Platform**, cấu hình Branding/Audience (External), thêm Gmail của bạn vào Test users khi còn Testing.
3. Tạo OAuth client loại **Web application**. Thêm callback đúng tuyệt đối:
   - Local: `http://localhost:3000/api/drive/callback`
   - Production: `https://TEN-DU-AN.vercel.app/api/drive/callback` (hoặc tên miền riêng).
4. Lưu Client ID và Client Secret trong biến môi trường tương ứng. Không đưa Client Secret vào frontend hoặc GitHub.
5. Tại `/settings`, chọn **Kết nối Google Drive**, đăng nhập Gmail cá nhân và cấp quyền. Ứng dụng dùng phạm vi `drive.file` để quản lý các tệp do nó tạo và tạo thư mục **Văn thư trường học**. Không cần tạo/chia sẻ thư mục bằng tay hay tài khoản dịch vụ.
6. Khi dùng lâu dài, cấu hình Publishing status phù hợp trong Google Auth Platform. Với External ở chế độ Testing, refresh token có phạm vi Drive thường hết hạn sau 7 ngày; phải kết nối lại. Google cũng có thể thu hồi quyền trong các trường hợp khác.

Kết nối lại phải dùng cùng Gmail để giữ liên kết tệp cũ. Không đổi APP_SECRET sau khi đã kết nối mà không có kế hoạch sao lưu/chuyển khóa; khóa đó dùng giải mã quyền Drive. Khi đổi tên miền, cập nhật cả APP_URL và callback trong Google.

## 4. Đẩy lên GitHub

Tạo một repository rỗng, ưu tiên **Private**. Không khởi tạo sẵn README. Sau đó chạy trong thư mục mã nguồn:

```sh
git init
git add .
git commit -m "Prepare school office app with Supabase and Google Drive"
git branch -M main
git remote add origin https://github.com/TAI-KHOAN/TEN-REPOSITORY.git
git push -u origin main
```

Sau lần `npm install` thành công, đưa `package-lock.json` vào Git để cố định cây phụ thuộc. `.gitignore` loại trừ .env, node_modules, bản dựng và bản sao lưu. Kiểm tra `git status` trước khi commit; không đưa tệp văn bản thật hoặc khóa bí mật lên GitHub.

## 5. Triển khai Vercel

1. Vercel → Add New → Project → Import repository GitHub. Root Directory là thư mục chứa `package.json`, Framework **Next.js**.
2. Khai báo tất cả biến trong `.env.example` cho Production. `APP_URL` phải là URL HTTPS cố định của ứng dụng, không có dấu `/` cuối. Không sử dụng database/Drive production cho preview thử nghiệm nếu sẽ sửa dữ liệu.
3. Deploy. Thêm callback URL production vào Google Cloud, rồi vào `/settings` để đăng nhập và kết nối Drive.
4. Kiểm tra thêm văn bản, tải một tệp lớn hơn 4,5 MB, xem/tải tệp, bộ lọc, CSV và ZIP trước khi sử dụng chính thức.

Upload dùng phiên Google resumable: tệp đi thẳng từ trình duyệt sang Google theo từng khối 1 MiB. Vercel chỉ nhận thông tin văn bản. OAuth token không được gửi xuống trình duyệt; URL phiên upload tạm thời chỉ cho phép tải tệp của phiên đó. Nếu trình duyệt báo lỗi CORS/Origin, kiểm tra APP_URL đúng origin đang mở.

ZIP truyền theo luồng, chia tối đa 40 tệp hoặc 100 MiB mỗi gói, không nạp toàn bộ kho vào bộ nhớ. API tải có `maxDuration=300`; giới hạn thực tế còn phụ thuộc gói Vercel. Với mạng chậm, có thể giảm ZIP_MAX_FILES/ZIP_MAX_BYTES trong lib/zip-export.ts. Mỗi ZIP có danh-muc.csv và hướng dẫn báo tệp thiếu.

## 6. Chuyển dữ liệu cũ (không tự chạy)

Đầu tiên sao lưu dữ liệu và tạm dừng nhập liệu trên site cũ. Hoàn tất Supabase, kết nối Drive ở site mới và đặt đúng APP_SECRET/DATABASE_URL trong .env.local trước khi chuyển. Chạy từ máy cá nhân, không chạy trong Vercel Function:

```sh
node --env-file=.env.local --import tsx scripts/migrate-from-sites.ts --source https://van-thu-truong-hoc.trancongngon5.chatgpt.site
```

Lệnh trên chỉ đọc/đếm. Khi sẵn sàng ghi dữ liệu mới, thêm `--apply`. Công cụ giữ ID và thông tin văn bản, đưa từng tệp sang Drive, bỏ qua ID đã có khi chạy lại. Nếu thiếu tệp hay lỗi mạng, công cụ dừng và báo lỗi; không xóa dữ liệu ở nguồn. Đây là công cụ cho site cũ đang công khai. Không dùng CSV làm bản sao lưu duy nhất vì CSV không chứa tệp đính kèm hoặc mọi trường dữ liệu.

Sau chuyển, đối chiếu số văn bản và số tệp, mở mẫu tệp ở cả ba luồng, kiểm tra bộ lọc, hạn hiệu lực, văn bản thay thế, tải CSV/ZIP. Chỉ chuyển người dùng sang địa chỉ mới khi đã đối chiếu. Giữ site cũ trong thời gian kiểm tra.

## 7. Kiểm tra và vận hành

```sh
npm run typecheck
npm test
npm run build
```

Các bài kiểm tra bao gồm chữ ký phiên quản trị, mã hóa token, tham số SQL, bộ lọc ngày, chia 20.000 tệp, giải nén ZIP và hủy luồng. Kết nối thật Supabase, OAuth Google và giới hạn Vercel cần kiểm tra bằng tài khoản của bạn sau cấu hình.

Khi thay tệp hoặc xóa văn bản, tệp cũ được chuyển vào Thùng rác Drive sau khi database cập nhật thành công. Upload bị hủy có thể để lại tệp chưa gắn văn bản và bản ghi pending_uploads; kiểm tra thủ công định kỳ, không tự động xóa. Sao lưu Supabase và Drive riêng; chức năng ZIP chỉ tải tệp, không phải bản sao lưu đầy đủ để phục hồi ứng dụng.

Tài liệu chính thức: [Supabase PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres), [Google Drive upload](https://developers.google.com/workspace/drive/api/guides/manage-uploads), [Google OAuth](https://developers.google.com/identity/protocols/oauth2/web-server), [Vercel GitHub](https://vercel.com/docs/git/vercel-for-github).
