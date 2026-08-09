const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const sql = require('mssql');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const path = require('path');

dotenv.config({ override: true });

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

const activeSessions = new Map();

function createSession(user) {
  const token = crypto.randomBytes(24).toString('hex');
  activeSessions.set(token, {
    id: user.Id,
    email: user.Email,
    role: user.Role,
    isAdmin: user.IsAdmin === 1 || user.Role === 'admin',
    createdAt: Date.now()
  });
  return token;
}

async function getSessionUserFromToken(token) {
  if (!token) return null;
  const session = activeSessions.get(token);
  if (!session) return null;
  const pool = await sql.connect(config);
  const result = await pool.request()
    .input('id', sql.Int, session.id)
    .query('SELECT * FROM [dbo].[Users] WHERE Id = @id');
  return result.recordset[0] || null;
}

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  try {
    const user = await getSessionUserFromToken(token);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware failed', error);
    return res.status(500).json({ success: false, message: 'Unauthorized' });
  }
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || (roles.length > 0 && !roles.includes(req.user.Role))) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
  };
}

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

    await pool.request().query(`
      IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Classes]') AND type in (N'U'))
      BEGIN
        CREATE TABLE [dbo].[Classes] (
          Id int IDENTITY(1,1) PRIMARY KEY,
          Name nvarchar(150) NOT NULL,
          TeacherId int NULL,
          Level nvarchar(50) NULL,
          Room nvarchar(50) NULL,
          Day nvarchar(100) NULL,
          Time nvarchar(50) NULL,
          CreatedAt datetime2 NOT NULL DEFAULT GETDATE(),
          CONSTRAINT FK_Classes_Teacher FOREIGN KEY (TeacherId) REFERENCES [dbo].[Users](Id)
        );
      END
    `);

    await pool.request().query(`
      IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Enrollments]') AND type in (N'U'))
      BEGIN
        CREATE TABLE [dbo].[Enrollments] (
          Id int IDENTITY(1,1) PRIMARY KEY,
          ClassId int NOT NULL,
          StudentId int NOT NULL,
          Status nvarchar(50) NOT NULL DEFAULT 'Active',
          Score nvarchar(50) NULL,
          AttendanceStatus nvarchar(50) NULL,
          CreatedAt datetime2 NOT NULL DEFAULT GETDATE(),
          CONSTRAINT FK_Enrollments_Class FOREIGN KEY (ClassId) REFERENCES [dbo].[Classes](Id),
          CONSTRAINT FK_Enrollments_Student FOREIGN KEY (StudentId) REFERENCES [dbo].[Users](Id),
          CONSTRAINT UQ_Enrollments_ClassStudent UNIQUE (ClassId, StudentId)
        );
      END
    `);

    await pool.request().query(`
      IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Attendance]') AND type in (N'U'))
      BEGIN
        CREATE TABLE [dbo].[Attendance] (
          Id int IDENTITY(1,1) PRIMARY KEY,
          EnrollmentId int NOT NULL,
          AttendanceDate date NOT NULL,
          Status nvarchar(50) NOT NULL,
          Note nvarchar(200) NULL,
          MarkedBy nvarchar(150) NULL,
          CreatedAt datetime2 NOT NULL DEFAULT GETDATE(),
          CONSTRAINT FK_Attendance_Enrollment FOREIGN KEY (EnrollmentId) REFERENCES [dbo].[Enrollments](Id)
        );
      END
    `);

    await pool.request().query(`
      IF NOT EXISTS (SELECT 1 FROM [dbo].[Users] WHERE Role = 'teacher')
      BEGIN
        INSERT INTO [dbo].[Users] (FullName, Email, Username, PasswordHash, Role, IsAdmin)
        VALUES ('Ms. Lan', 'lan@linguahub.local', 'lan', '123456', 'teacher', 0);
      END
    `);

    await pool.request().query(`
      IF NOT EXISTS (SELECT 1 FROM [dbo].[Users] WHERE Username = 'teacher' OR Email = 'teacher@linguahub.local')
      BEGIN
        INSERT INTO [dbo].[Users] (FullName, Email, Username, PasswordHash, Role, IsAdmin)
        VALUES ('Giảng viên mẫu', 'teacher@linguahub.local', 'teacher', '123456', 'teacher', 0);
      END
    `);

    await pool.request().query(`
      IF NOT EXISTS (SELECT 1 FROM [dbo].[Users] WHERE Role = 'student')
      BEGIN
        INSERT INTO [dbo].[Users] (FullName, Email, Username, PasswordHash, Role, IsAdmin)
        VALUES ('Anh Nguyen', 'an@linguahub.local', 'an', '123456', 'student', 0);
      END
    `);

    await pool.request().query(`
      IF NOT EXISTS (SELECT 1 FROM [dbo].[Users] WHERE Username = 'student' OR Email = 'student@linguahub.local')
      BEGIN
        INSERT INTO [dbo].[Users] (FullName, Email, Username, PasswordHash, Role, IsAdmin)
        VALUES ('Học viên mẫu', 'student@linguahub.local', 'student', '123456', 'student', 0);
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
    const token = createSession(user);

    return res.json({ 
      success: true, 
      token,
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

app.post('/api/register', async (req, res) => {
  const { fullName, email, username, password, role } = req.body;
  if (!fullName || !email || !username || !password || !role) {
    return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin' });
  }
  if (!['student', 'teacher'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Vai trò không hợp lệ' });
  }

  try {
    const pool = await sql.connect(config);
    const existing = await pool.request()
      .input('email', sql.NVarChar, email)
      .input('username', sql.NVarChar, username)
      .query(`SELECT * FROM [dbo].[Users] WHERE Email = @email OR Username = @username`);

    if (existing.recordset.length > 0) {
      return res.status(409).json({ success: false, message: 'Email hoặc tên đăng nhập đã tồn tại' });
    }

    const insertResult = await pool.request()
      .input('fullName', sql.NVarChar, fullName)
      .input('email', sql.NVarChar, email)
      .input('username', sql.NVarChar, username)
      .input('password', sql.NVarChar, password)
      .input('role', sql.NVarChar, role)
      .query(`INSERT INTO [dbo].[Users] (FullName, Email, Username, PasswordHash, Role, IsAdmin)
        VALUES (@fullName, @email, @username, @password, @role, 0);
        SELECT SCOPE_IDENTITY() AS Id;`);

    const userId = insertResult.recordset[0]?.Id;
    const newUser = {
      Id: userId,
      FullName: fullName,
      Email: email,
      Username: username,
      Role: role,
      IsAdmin: 0
    };
    const token = createSession(newUser);

    res.json({ success: true, token, user: {
      id: newUser.Id,
      name: newUser.FullName,
      username: newUser.Username,
      email: newUser.Email,
      role: newUser.Role,
      isAdmin: false
    }});
  } catch (error) {
    console.error('Register failed', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
});

app.get('/api/users/me', authMiddleware, async (req, res) => {
  const user = req.user;
  res.json({ success: true, user: {
    id: user.Id,
    name: user.FullName,
    username: user.Username,
    email: user.Email,
    role: user.Role,
    isAdmin: user.IsAdmin === 1 || user.Role === 'admin'
  }});
});

function normalizeText(value) {
  return (value || '').toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function extractLastName(question) {
  const text = normalizeText(question);
  const match = text.match(/(?:ho|họ)\s+([a-zđ]+)/i);
  if (match) {
    return match[1];
  }
  const fallback = text.match(/\b(nguyen|tran|le|pham|hoang|do|ngo|vu|dang|truong|phan|pham)\b/i);
  return fallback ? fallback[1] : null;
}

function findMatchedClass(question, classes) {
  const text = normalizeText(question);
  let best = null;
  let bestLength = 0;
  for (const klass of classes) {
    const name = normalizeText(klass.Name || '');
    if (!name) continue;
    if (text.includes(name) && name.length > bestLength) {
      best = klass;
      bestLength = name.length;
    }
  }
  return best;
}

function findMatchedStudent(question, students) {
  const text = normalizeText(question);
  let best = null;
  let bestLength = 0;
  for (const student of students) {
    const fullName = normalizeText(student.FullName || '');
    if (!fullName) continue;
    if (text.includes(fullName) && fullName.length > bestLength) {
      best = student;
      bestLength = fullName.length;
    }
  }
  return best;
}

async function getAccessibleClasses(pool, user) {
  const request = pool.request();
  let query = `SELECT c.Id, c.Name, c.Level, c.Room, c.Day, c.Time, c.TeacherId
    FROM [dbo].[Classes] c`;
  if (user.Role === 'teacher') {
    query += ' WHERE c.TeacherId = @teacherId';
    request.input('teacherId', sql.Int, user.Id);
  }
  query += ' ORDER BY c.Name';
  const result = await request.query(query);
  return result.recordset;
}

async function getAccessibleStudentNames(pool, user) {
  const request = pool.request();
  let query = `SELECT DISTINCT s.Id, s.FullName, s.Email
    FROM [dbo].[Enrollments] e
    INNER JOIN [dbo].[Users] s ON s.Id = e.StudentId
    INNER JOIN [dbo].[Classes] c ON c.Id = e.ClassId`;
  if (user.Role === 'teacher') {
    query += ' WHERE c.TeacherId = @teacherId';
    request.input('teacherId', sql.Int, user.Id);
  }
  query += ' ORDER BY s.FullName';
  const result = await request.query(query);
  return result.recordset;
}

async function handleAIAsk(req, res) {
  const question = (req.body.question || '').toString().trim();
  if (!question) {
    return res.status(400).json({ success: false, message: 'Vui lòng gửi câu hỏi' });
  }

  const normalized = normalizeText(question);
  const isTeacher = req.user.Role === 'teacher';
  const pool = await sql.connect(config);
  const classes = await getAccessibleClasses(pool, req.user);
  const students = await getAccessibleStudentNames(pool, req.user);
  const classMatch = findMatchedClass(question, classes);
  const studentMatch = findMatchedStudent(question, students);
  const lastName = extractLastName(question);
  const today = new Date().toISOString().slice(0, 10);

  try {
    if (/điểm trung bình|diem trung binh/.test(normalized) && classMatch) {
      const result = await pool.request()
        .input('classId', sql.Int, classMatch.Id)
        .query(`SELECT AVG(TRY_CAST(NULLIF(Score, '') AS float)) AS AverageScore
          FROM [dbo].[Enrollments]
          WHERE ClassId = @classId`);
      const avg = result.recordset[0]?.AverageScore;
      if (avg === null || avg === undefined) {
        return res.json({ success: true, intent: 'CLASS_AVERAGE_SCORE', answer: `Lớp ${classMatch.Name} hiện chưa có điểm số hợp lệ để tính trung bình.`, data: { classId: classMatch.Id, className: classMatch.Name } });
      }
      const rounded = Number(avg).toFixed(1).replace(/\.0$/, '');
      return res.json({ success: true, intent: 'CLASS_AVERAGE_SCORE', answer: `Điểm trung bình của lớp ${classMatch.Name} là ${rounded}.`, data: { classId: classMatch.Id, averageScore: Number(rounded) } });
    }

    if (/danh sách học viên|danh sach hoc vien|ai [^\n]* hoc vien|hoc vien[^\n]*lop|lop[^\n]*hoc vien/.test(normalized) && classMatch) {
      const result = await pool.request()
        .input('classId', sql.Int, classMatch.Id)
        .query(`SELECT s.FullName, s.Email, s.Phone, e.Status, e.Score, e.AttendanceStatus
          FROM [dbo].[Enrollments] e
          INNER JOIN [dbo].[Users] s ON s.Id = e.StudentId
          WHERE e.ClassId = @classId
          ORDER BY s.FullName`);
      const studentList = result.recordset.map(r => ({ fullName: r.FullName, email: r.Email, phone: r.Phone, status: r.Status, score: r.Score, attendanceStatus: r.AttendanceStatus }));
      const names = studentList.map(s => s.fullName).slice(0, 10);
      const summary = names.length ? names.join(', ') : 'Không có học viên trong lớp.';
      return res.json({ success: true, intent: 'LIST_CLASS_STUDENTS', answer: `Lớp ${classMatch.Name} có ${studentList.length} học viên: ${summary}.`, data: { classId: classMatch.Id, className: classMatch.Name, students: studentList } });
    }

    if (/(hôm nay|hom nay).*(vắng|vang|nghi)|bao nhiêu học viên.*vắng|hoc vien.*vang/.test(normalized)) {
      const request = pool.request().input('today', sql.Date, today);
      let query = `SELECT COUNT(DISTINCT e.StudentId) AS Count
        FROM [dbo].[Enrollments] e
        INNER JOIN [dbo].[Classes] c ON c.Id = e.ClassId
        INNER JOIN [dbo].[Attendance] a ON a.EnrollmentId = e.Id
        WHERE a.AttendanceDate = @today AND LOWER(a.Status) LIKE '%vang%'`;
      if (isTeacher) {
        query += ' AND c.TeacherId = @teacherId';
        request.input('teacherId', sql.Int, req.user.Id);
      }
      const result = await request.query(query);
      const count = result.recordset[0]?.Count || 0;
      return res.json({ success: true, intent: 'ABSENT_STUDENTS', answer: `Hôm nay có ${count} học viên vắng trong các lớp bạn đang phụ trách.`, data: { date: today, absentCount: count } });
    }

    if (/(ai chưa điểm danh|ai chua diem danh|chua diem danh|chưa điểm danh)/.test(normalized) && isTeacher) {
      const request = pool.request().input('today', sql.Date, today).input('teacherId', sql.Int, req.user.Id);
      const result = await request.query(`SELECT DISTINCT s.FullName, c.Name AS ClassName, ISNULL(a.Status, 'Chưa điểm danh') AS Status
        FROM [dbo].[Enrollments] e
        INNER JOIN [dbo].[Users] s ON s.Id = e.StudentId
        INNER JOIN [dbo].[Classes] c ON c.Id = e.ClassId
        LEFT JOIN [dbo].[Attendance] a ON a.EnrollmentId = e.Id AND a.AttendanceDate = @today
        WHERE c.TeacherId = @teacherId AND (a.Status IS NULL OR LOWER(a.Status) <> 'có mặt')
        ORDER BY s.FullName`);
      const rows = result.recordset;
      if (!rows.length) {
        return res.json({ success: true, intent: 'ABSENT_STUDENTS', answer: 'Hiện không có học viên nào chưa điểm danh hoặc vắng trong các lớp của bạn hôm nay.', data: { date: today, students: [] } });
      }
      const names = rows.map(r => `${r.FullName} (${r.ClassName})`).slice(0, 8);
      return res.json({ success: true, intent: 'ABSENT_STUDENTS', answer: `Những học viên chưa điểm danh hoặc chưa có điểm danh hôm nay: ${names.join(', ')}.`, data: { date: today, students: rows } });
    }

    if (/đang học lớp nào|học lớp nào|lop nao/.test(normalized) && studentMatch) {
      const request = pool.request().input('studentId', sql.Int, studentMatch.Id);
      if (isTeacher) {
        request.input('teacherId', sql.Int, req.user.Id);
      }
      let query = `SELECT DISTINCT c.Name, c.Day, c.Time
        FROM [dbo].[Enrollments] e
        INNER JOIN [dbo].[Classes] c ON c.Id = e.ClassId
        WHERE e.StudentId = @studentId`;
      if (isTeacher) {
        query += ' AND c.TeacherId = @teacherId';
      }
      const result = await request.query(query);
      const classesForStudent = result.recordset;
      if (!classesForStudent.length) {
        return res.json({ success: true, intent: 'FIND_STUDENT_CLASS', answer: `Không tìm thấy lớp học của ${studentMatch.FullName} trong các lớp bạn đang phụ trách.`, data: { student: studentMatch.FullName, classes: [] } });
      }
      const list = classesForStudent.map(c => `${c.Name} (${c.Day || 'Chưa có lịch'} - ${c.Time || 'Chưa có giờ'})`);
      return res.json({ success: true, intent: 'FIND_STUDENT_CLASS', answer: `${studentMatch.FullName} hiện đang học ${list.length} lớp: ${list.join(', ')}.`, data: { student: studentMatch.FullName, classes: classesForStudent } });
    }

    if (/lịch học|lich hoc|lịch dạy|lich day/.test(normalized) && isTeacher) {
      const result = await pool.request()
        .input('teacherId', sql.Int, req.user.Id)
        .query(`SELECT c.Name, c.Day, c.Time, c.Room FROM [dbo].[Classes] c WHERE c.TeacherId = @teacherId ORDER BY c.Day, c.Time`);
      const rows = result.recordset;
      if (!rows.length) {
        return res.json({ success: true, intent: 'SCHEDULE', answer: 'Bạn hiện chưa được phân công lớp học nào.', data: { schedule: [] } });
      }
      const scheduleLines = rows.map(c => `${c.Name}: ${c.Day || 'Chưa rõ'} - ${c.Time || 'Chưa rõ'} ở ${c.Room || 'phòng chưa rõ'}`);
      return res.json({ success: true, intent: 'SCHEDULE', answer: `Lịch dạy của bạn: ${scheduleLines.join('; ')}.`, data: { schedule: rows } });
    }

    if ((/bao nhiêu học viên|co bao nhieu hoc vien|co may hoc vien|so luong hoc vien/.test(normalized) || /số lượng học viên/.test(normalized)) && lastName) {
      const request = pool.request().input('lastName', sql.NVarChar, `${lastName}%`);
      if (isTeacher) {
        request.input('teacherId', sql.Int, req.user.Id);
      }
      let query = `SELECT COUNT(DISTINCT e.StudentId) AS Count
        FROM [dbo].[Enrollments] e
        INNER JOIN [dbo].[Users] s ON s.Id = e.StudentId
        INNER JOIN [dbo].[Classes] c ON c.Id = e.ClassId
        WHERE LOWER(s.FullName) LIKE @lastName`;
      if (isTeacher) {
        query += ' AND c.TeacherId = @teacherId';
      }
      const result = await request.query(query);
      const count = result.recordset[0]?.Count || 0;
      return res.json({ success: true, intent: 'COUNT_STUDENTS_BY_LAST_NAME', answer: `Trong các lớp bạn được phép xem, có ${count} học viên có họ ${lastName}.`, data: { lastName, count } });
    }

    if ((/bao nhiêu học viên|co bao nhieu hoc vien|co may hoc vien|so luong hoc vien/.test(normalized) || /số lượng học viên/.test(normalized)) && classMatch) {
      const request = pool.request().input('classId', sql.Int, classMatch.Id);
      const result = await request.query(`SELECT COUNT(DISTINCT StudentId) AS Count FROM [dbo].[Enrollments] WHERE ClassId = @classId`);
      const count = result.recordset[0]?.Count || 0;
      return res.json({ success: true, intent: 'COUNT_STUDENTS_IN_CLASS', answer: `Lớp ${classMatch.Name} hiện có ${count} học viên.`, data: { classId: classMatch.Id, className: classMatch.Name, count } });
    }

    if ((/bao nhiêu học viên|co bao nhieu hoc vien|co may hoc vien|so luong hoc vien/.test(normalized) || /số lượng học viên/.test(normalized)) && isTeacher) {
      const request = pool.request().input('teacherId', sql.Int, req.user.Id);
      const result = await request.query(`SELECT COUNT(DISTINCT e.StudentId) AS Count
        FROM [dbo].[Enrollments] e
        INNER JOIN [dbo].[Classes] c ON c.Id = e.ClassId
        WHERE c.TeacherId = @teacherId`);
      const count = result.recordset[0]?.Count || 0;
      return res.json({ success: true, intent: 'COUNT_STUDENTS', answer: `Trong các lớp bạn phụ trách có ${count} học viên.`, data: { count } });
    }

    return res.json({ success: true, intent: 'UNKNOWN', answer: 'Câu hỏi này nằm ngoài phạm vi hỗ trợ của AI Giảng viên. Tôi có thể hỗ trợ về học viên, lớp học, điểm danh, điểm số và lịch học.', data: null });
  } catch (error) {
    console.error('AI ask failed', error);
    return res.status(500).json({ success: false, message: 'Lỗi xử lý câu hỏi AI' });
  }
}

app.post('/api/ai/ask', authMiddleware, handleAIAsk);
app.post('/api/teacher-ai/ask', authMiddleware, handleAIAsk);

app.get('/api/teacher/classes', authMiddleware, authorizeRoles('teacher', 'admin'), async (req, res) => {
  try {
    const pool = await sql.connect(config);
    let query = `SELECT c.Id, c.Name, c.Level, c.Room, c.Day, c.Time, u.FullName AS TeacherName,
      COUNT(e.Id) AS StudentCount
      FROM [dbo].[Classes] c
      LEFT JOIN [dbo].[Users] u ON u.Id = c.TeacherId
      LEFT JOIN [dbo].[Enrollments] e ON e.ClassId = c.Id
    `;
    const request = pool.request();
    if (req.user.Role === 'teacher') {
      query += ` WHERE c.TeacherId = @teacherId`;
      request.input('teacherId', sql.Int, req.user.Id);
    }
    query += ` GROUP BY c.Id, c.Name, c.Level, c.Room, c.Day, c.Time, u.FullName ORDER BY c.Name`;

    const result = await request.query(query);
    res.json({ success: true, classes: result.recordset });
  } catch (error) {
    console.error('Fetch teacher classes failed', error);
    return res.status(500).json({ success: false, message: 'Không thể lấy danh sách lớp' });
  }
});

app.get('/api/teacher/classes/:classId', authMiddleware, authorizeRoles('teacher', 'admin'), async (req, res) => {
  const classId = Number(req.params.classId);
  if (!classId) {
    return res.status(400).json({ success: false, message: 'ClassId không hợp lệ' });
  }

  try {
    const pool = await sql.connect(config);
    const classResult = await pool.request()
      .input('classId', sql.Int, classId)
      .query(`SELECT c.Id, c.Name, c.Level, c.Room, c.Day, c.Time, c.TeacherId, u.FullName AS TeacherName
        FROM [dbo].[Classes] c
        LEFT JOIN [dbo].[Users] u ON u.Id = c.TeacherId
        WHERE c.Id = @classId`);

    if (classResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    }

    const klass = classResult.recordset[0];
    if (req.user.Role === 'teacher' && klass.TeacherId !== req.user.Id) {
      return res.status(403).json({ success: false, message: 'Không có quyền xem lớp này' });
    }

    const studentsResult = await pool.request()
      .input('classId', sql.Int, classId)
      .query(`SELECT e.Id AS EnrollmentId, s.Id AS StudentId, s.FullName, s.Email, s.Username,
          s.Phone, e.Status, e.Score, e.AttendanceStatus
        FROM [dbo].[Enrollments] e
        INNER JOIN [dbo].[Users] s ON s.Id = e.StudentId
        WHERE e.ClassId = @classId`);

    const students = studentsResult.recordset.map(item => ({
      enrollmentId: item.EnrollmentId,
      studentId: item.StudentId,
      studentCode: `HV${item.StudentId}`,
      fullName: item.FullName,
      email: item.Email,
      phone: item.Phone || '',
      status: item.Status,
      score: item.Score || '-',
      attendanceStatus: item.AttendanceStatus || 'Chưa điểm danh'
    }));

    res.json({ success: true, class: klass, students });
  } catch (error) {
    console.error('Fetch class detail failed', error);
    return res.status(500).json({ success: false, message: 'Không thể lấy chi tiết lớp học' });
  }
});

app.get('/api/teacher/classes/:classId/candidates', authMiddleware, authorizeRoles('teacher', 'admin'), async (req, res) => {
  const classId = Number(req.params.classId);
  if (!classId) {
    return res.status(400).json({ success: false, message: 'ClassId không hợp lệ' });
  }

  try {
    const pool = await sql.connect(config);
    const classResult = await pool.request()
      .input('classId', sql.Int, classId)
      .query(`SELECT TeacherId FROM [dbo].[Classes] WHERE Id = @classId`);

    if (classResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    }

    const klass = classResult.recordset[0];
    if (req.user.Role === 'teacher' && klass.TeacherId !== req.user.Id) {
      return res.status(403).json({ success: false, message: 'Không có quyền xem lớp này' });
    }

    const candidatesResult = await pool.request()
      .input('classId', sql.Int, classId)
      .query(`SELECT u.Id, u.FullName, u.Email, u.Phone
        FROM [dbo].[Users] u
        WHERE u.Role = 'student' AND u.Id NOT IN (
          SELECT StudentId FROM [dbo].[Enrollments] WHERE ClassId = @classId
        ) ORDER BY u.FullName`);

    res.json({ success: true, students: candidatesResult.recordset });
  } catch (error) {
    console.error('Fetch candidate students failed', error);
    return res.status(500).json({ success: false, message: 'Không thể lấy danh sách học viên' });
  }
});

app.post('/api/teacher/classes/:classId/students', authMiddleware, authorizeRoles('teacher', 'admin'), async (req, res) => {
  const classId = Number(req.params.classId);
  const { studentId } = req.body;
  if (!classId || !studentId) {
    return res.status(400).json({ success: false, message: 'Thông tin không hợp lệ' });
  }

  try {
    const pool = await sql.connect(config);
    const classResult = await pool.request()
      .input('classId', sql.Int, classId)
      .query(`SELECT TeacherId FROM [dbo].[Classes] WHERE Id = @classId`);

    if (classResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    }

    const klass = classResult.recordset[0];
    if (req.user.Role === 'teacher' && klass.TeacherId !== req.user.Id) {
      return res.status(403).json({ success: false, message: 'Không có quyền cập nhật lớp này' });
    }

    const existing = await pool.request()
      .input('classId', sql.Int, classId)
      .input('studentId', sql.Int, studentId)
      .query(`SELECT * FROM [dbo].[Enrollments] WHERE ClassId = @classId AND StudentId = @studentId`);

    if (existing.recordset.length > 0) {
      return res.status(409).json({ success: false, message: 'Học viên đã có trong lớp' });
    }

    await pool.request()
      .input('classId', sql.Int, classId)
      .input('studentId', sql.Int, studentId)
      .query(`INSERT INTO [dbo].[Enrollments] (ClassId, StudentId) VALUES (@classId, @studentId)`);

    return res.json({ success: true, message: 'Thêm học viên vào lớp thành công' });
  } catch (error) {
    console.error('Add student to class failed', error);
    return res.status(500).json({ success: false, message: 'Không thể thêm học viên vào lớp' });
  }
});

app.delete('/api/teacher/classes/:classId/students/:enrollmentId', authMiddleware, authorizeRoles('teacher', 'admin'), async (req, res) => {
  const classId = Number(req.params.classId);
  const enrollmentId = Number(req.params.enrollmentId);
  if (!classId || !enrollmentId) {
    return res.status(400).json({ success: false, message: 'Thông tin không hợp lệ' });
  }

  try {
    const pool = await sql.connect(config);
    const classResult = await pool.request()
      .input('classId', sql.Int, classId)
      .query(`SELECT TeacherId FROM [dbo].[Classes] WHERE Id = @classId`);

    if (classResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    }

    const klass = classResult.recordset[0];
    if (req.user.Role === 'teacher' && klass.TeacherId !== req.user.Id) {
      return res.status(403).json({ success: false, message: 'Không có quyền cập nhật lớp này' });
    }

    const enrollmentResult = await pool.request()
      .input('enrollmentId', sql.Int, enrollmentId)
      .query(`SELECT ClassId FROM [dbo].[Enrollments] WHERE Id = @enrollmentId`);

    if (enrollmentResult.recordset.length === 0 || enrollmentResult.recordset[0].ClassId !== classId) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đăng ký học viên' });
    }

    await pool.request()
      .input('enrollmentId', sql.Int, enrollmentId)
      .query(`DELETE FROM [dbo].[Enrollments] WHERE Id = @enrollmentId`);

    return res.json({ success: true, message: 'Xóa học viên khỏi lớp thành công' });
  } catch (error) {
    console.error('Remove student from class failed', error);
    return res.status(500).json({ success: false, message: 'Không thể xóa học viên khỏi lớp' });
  }
});

app.post('/api/teacher/classes/:classId/students/:enrollmentId/attendance', authMiddleware, authorizeRoles('teacher', 'admin'), async (req, res) => {
  const classId = Number(req.params.classId);
  const enrollmentId = Number(req.params.enrollmentId);
  const { status, note, date } = req.body;
  if (!classId || !enrollmentId || !status) {
    return res.status(400).json({ success: false, message: 'Thông tin không hợp lệ' });
  }

  try {
    const pool = await sql.connect(config);
    const classResult = await pool.request()
      .input('classId', sql.Int, classId)
      .query(`SELECT TeacherId FROM [dbo].[Classes] WHERE Id = @classId`);

    if (classResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    }

    const klass = classResult.recordset[0];
    if (req.user.Role === 'teacher' && klass.TeacherId !== req.user.Id) {
      return res.status(403).json({ success: false, message: 'Không có quyền cập nhật lớp này' });
    }

    const enrollmentResult = await pool.request()
      .input('enrollmentId', sql.Int, enrollmentId)
      .query(`SELECT ClassId FROM [dbo].[Enrollments] WHERE Id = @enrollmentId`);
    if (enrollmentResult.recordset.length === 0 || enrollmentResult.recordset[0].ClassId !== classId) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đăng ký học viên' });
    }

    const attendanceDate = date || new Date().toISOString().slice(0, 10);
    await pool.request()
      .input('enrollmentId', sql.Int, enrollmentId)
      .input('attendanceDate', sql.Date, attendanceDate)
      .input('status', sql.NVarChar, status)
      .input('note', sql.NVarChar, note || '')
      .input('markedBy', sql.NVarChar, req.user.FullName)
      .query(`INSERT INTO [dbo].[Attendance] (EnrollmentId, AttendanceDate, Status, Note, MarkedBy)
        VALUES (@enrollmentId, @attendanceDate, @status, @note, @markedBy)`);

    await pool.request()
      .input('enrollmentId', sql.Int, enrollmentId)
      .input('status', sql.NVarChar, status)
      .query(`UPDATE [dbo].[Enrollments] SET AttendanceStatus = @status WHERE Id = @enrollmentId`);

    return res.json({ success: true, message: 'Điểm danh thành công' });
  } catch (error) {
    console.error('Attendance update failed', error);
    return res.status(500).json({ success: false, message: 'Không thể cập nhật điểm danh' });
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

app.get('/Teacher/Classes', (req, res) => {
  res.sendFile(path.join(__dirname, 'teacher-classes.html'));
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

initDb();

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
