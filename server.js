const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const sql = require('mssql');
const nodemailer = require('nodemailer');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT || 1433),
  database: process.env.DB_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function initDb() {
  try {
    const pool = await sql.connect(config);
    await pool.request().query(`
      IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U'))
      BEGIN
        CREATE TABLE [dbo].[Users] (
          Id int IDENTITY(1,1) PRIMARY KEY,
          FullName nvarchar(100) NOT NULL,
          Email nvarchar(150) NOT NULL UNIQUE,
          Username nvarchar(100) NOT NULL UNIQUE,
          PasswordHash nvarchar(255) NOT NULL,
          Role nvarchar(50) NOT NULL,
          IsAdmin bit NOT NULL DEFAULT 0,
          IsActive bit NOT NULL DEFAULT 1,
          CreatedAt datetime2 NOT NULL DEFAULT GETDATE()
        );
      END
    `);

    await pool.request().query(`
      IF NOT EXISTS (SELECT 1 FROM [dbo].[Users] WHERE Username = 'admin')
      BEGIN
        INSERT INTO [dbo].[Users] (FullName, Email, Username, PasswordHash, Role, IsAdmin)
        VALUES ('System Admin', 'admin@linguahub.local', 'admin', '123456', 'admin', 1);
      END
    `);

    console.log('Database initialized');
  } catch (error) {
    console.error('Database init failed', error);
  }
}

// API ĐĂNG NHẬP NÂNG CẤP - TỰ ĐỘNG KHỚP VAI TRÒ HOẶC ĐĂNG NHẬP THOẢI MÁI
app.post('/api/login', async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const pool = await sql.connect(config);

    // Tìm tài khoản bằng Username hoặc Email, có thể kiểm tra thêm role nếu được gửi lên
    const request = pool.request()
      .input('username', sql.NVarChar, username)
      .input('password', sql.NVarChar, password);

    let query = `SELECT * FROM [dbo].[Users] WHERE (Username = @username OR Email = @username) AND PasswordHash = @password`;
    if (role) {
      request.input('role', sql.NVarChar, role);
      query += ' AND Role = @role';
    }

    const result = await request.query(query);

    if (result.recordset.length === 0) {
      return res.status(401).json({ success: false, message: 'Thông tin đăng nhập không đúng' });
    }

    const user = result.recordset[0];
    return res.json({ 
      success: true, 
      user: { 
        id: user.Id, 
        name: user.FullName, 
        username: user.Username, 
        email: user.Email, 
        role: user.Role, 
        isAdmin: user.IsAdmin === 1 || user.Role === 'admin'
      } 
    });
  } catch (error) {
    console.error('Login failed', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
});

app.post('/api/admin/request-otp', async (req, res) => {
  const { email } = req.body;
  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query(`SELECT * FROM [dbo].[Users] WHERE Email = @email AND IsAdmin = 1`);

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy quản trị viên với email này' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Mã xác thực admin LinguaHub',
      text: `Mã xác thực của bạn là: ${otp}`
    });

    return res.json({ success: true, otp });
  } catch (error) {
    console.error('OTP failed', error);
    return res.status(500).json({ success: false, message: 'Không gửi được mail xác thực' });
  }
});

app.post('/api/admin/assign', async (req, res) => {
  const { targetEmail, actorEmail } = req.body;
  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('targetEmail', sql.NVarChar, targetEmail)
      .input('actorEmail', sql.NVarChar, actorEmail)
      .query(`UPDATE [dbo].[Users] SET IsAdmin = 1 WHERE Email = @targetEmail; UPDATE [dbo].[Users] SET IsAdmin = 0 WHERE Email = @actorEmail AND Email <> @targetEmail`);

    return res.json({ success: true, message: 'Cập nhật quyền admin thành công' });
  } catch (error) {
    console.error('Assign admin failed', error);
    return res.status(500).json({ success: false, message: 'Không thể cập nhật quyền admin' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query('SELECT Id, FullName, Email, Username, Role, IsAdmin, IsActive FROM [dbo].[Users] ORDER BY Id');
    return res.json(result.recordset);
  } catch (error) {
    console.error('Fetch users failed', error);
    return res.status(500).json({ success: false, message: 'Không thể lấy danh sách người dùng' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

initDb();

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
