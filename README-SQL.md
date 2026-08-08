# Hướng dẫn tích hợp SQL Server cho LinguaHub

## 1. Cài đặt SQL Server
- Cài SQL Server 2019/2022 Express hoặc Developer.
- Tạo login `sa` hoặc một login khác.
- Chạy file [sql-server-setup.sql](sql-server-setup.sql) để tạo database và bảng.

## 2. Cấu hình biến môi trường
Tạo file `.env` dựa trên [.env.example](.env.example) và chỉnh các giá trị:
- DB_SERVER=localhost
- DB_DATABASE=LinguaHub
- DB_USER=sa
- DB_PASSWORD=your_password
- SMTP_* để gửi mail OTP

## 3. Cài dependency
```bash
npm install
```

## 4. Chạy server
```bash
node server.js
```

## 5. Truy cập
- Trang chủ: http://localhost:3000/
- Admin panel: http://localhost:3000/admin-panel.html

## 6. Tính năng mới
- Đăng nhập bằng email + mật khẩu
- Gửi mã xác thực qua email cho admin
- Trao quyền admin cho một tài khoản khác
- Thu hồi quyền admin khỏi một tài khoản
