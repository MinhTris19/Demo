const STORAGE_KEY = 'linguahub-state-v1';
const AUTH_KEY = 'linguahub-auth-v1';

const defaultState = {
  students: [
    { id: crypto.randomUUID(), name: 'An Nguyen', email: 'an@example.com', phone: '0901112222', course: 'IELTS', level: 'Intermediate', status: 'Đang học' },
    { id: crypto.randomUUID(), name: 'Mai Tran', email: 'mai@example.com', phone: '0903334444', course: 'TOEIC', level: 'Advanced', status: 'Hoàn thành' }
  ],
  teachers: [
    { id: crypto.randomUUID(), name: 'Ms. Lan', subject: 'IELTS', phone: '0912345678', experience: '6 năm' },
    { id: crypto.randomUUID(), name: 'Mr. David', subject: 'English Conversation', phone: '0987654321', experience: '8 năm' }
  ],
  courses: [
    { id: crypto.randomUUID(), name: 'IELTS Intensive', teacherId: null, level: 'Intermediate', room: 'A101', day: 'Thứ 2, 4, 6', time: '19:00 - 20:30' },
    { id: crypto.randomUUID(), name: 'Business English', teacherId: null, level: 'Advanced', room: 'B202', day: 'Thứ 3, 5', time: '20:00 - 21:30' }
  ],
  schedules: [
    { id: crypto.randomUUID(), name: 'IELTS Intensive', teacherId: null, room: 'A101', day: 'Thứ 2, 4, 6', time: '19:00 - 20:30' }
  ],
  assignments: [
    { id: crypto.randomUUID(), title: 'Bài tập 1 - Listening', courseId: null, dueDate: '2026-08-20', createdBy: 'Ms. Lan', description: 'Luyện nghe phần 1 và 2, nộp file ghi âm.' }
  ],
  submissions: [
    { id: crypto.randomUUID(), assignmentId: null, studentId: null, content: 'Link Google Drive: ...', note: 'Hoàn thành bản ghi âm', submittedAt: '2026-08-10', grade: '', feedback: '' }
  ],
  payments: [
    { id: crypto.randomUUID(), studentId: null, amount: 2500000, method: 'Chuyển khoản', date: '2026-08-01', status: 'Đã thu' },
    { id: crypto.randomUUID(), studentId: null, amount: 1800000, method: 'Tiền mặt', date: '2026-08-05', status: 'Chờ xử lý' }
  ],
  aiMessages: [
    { role: 'ai', text: 'Xin chào! Tôi có thể giúp bạn phân tích học viên, doanh thu và lớp học để đưa ra đề xuất thông minh cho trung tâm.' }
  ],
  attendance: [
    { id: crypto.randomUUID(), studentId: null, courseName: 'IELTS Intensive', date: '2026-08-07', status: 'Có mặt', note: 'Đúng giờ', markedBy: 'Ms. Lan' }
  ],
  users: [
    { id: crypto.randomUUID(), name: 'Master Admin', username: 'master', password: '123456', role: 'master' },
    { id: crypto.randomUUID(), name: 'Ms. Lan', username: 'lan', password: '123456', role: 'teacher', teacherId: null }
  ],
  authUserId: null,
  activeView: 'overview'
};

let state = loadState();

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return structuredClone(defaultState);
  try {
    return { ...structuredClone(defaultState), ...JSON.parse(stored) };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getSessionUser() {
  return JSON.parse(localStorage.getItem('linguahub-session') || 'null');
}

function getAuthUser() {
  const sessionUser = getSessionUser();
  if (sessionUser) {
    const stored = state.users.find(user => user.username === sessionUser.username || user.email === sessionUser.email);
    if (stored) return stored;
    state.users.unshift(sessionUser);
    saveState();
    return sessionUser;
  }
  return state.users.find(user => user.id === state.authUserId) || null;
}

function isMaster() {
  return getAuthUser()?.role === 'master';
}

function isTeacher() {
  return getAuthUser()?.role === 'teacher';
}

function isStudent() {
  return getAuthUser()?.role === 'student';
}

function isTeacherOrMaster() {
  const role = getAuthUser()?.role;
  return role === 'teacher' || role === 'master' || role === 'admin';
}

function renderNav() {
  const nav = document.getElementById('sidebar-nav');
  const items = [
    { key: 'overview', label: 'Tổng quan' },
    { key: 'students', label: 'Học viên' },
    { key: 'teachers', label: 'Giảng viên' },
    { key: 'courses', label: 'Lớp học' },
    { key: 'schedule', label: 'Lịch học' },
    { key: 'homework', label: 'Bài tập' },
    { key: 'ai', label: 'Trợ lý AI' },
    { key: 'payments', label: 'Thanh toán' }
  ];

  nav.innerHTML = items.map(item => `
    <button class="nav-btn ${state.activeView === item.key ? 'active' : ''}" data-view="${item.key}">
      ${item.label}
    </button>
  `).join('');

  document.getElementById('page-title').textContent = items.find(item => item.key === state.activeView)?.label || 'Tổng quan';
}

function renderOverview() {
  document.getElementById('student-count').textContent = state.students.length;
  document.getElementById('teacher-count').textContent = state.teachers.length;
  document.getElementById('course-count').textContent = state.courses.length;

  const revenue = state.payments
    .filter(item => item.status === 'Đã thu')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  document.getElementById('revenue-total').textContent = revenue.toLocaleString('vi-VN') + 'đ';

  const summaryItems = [
    { label: 'Số học viên đang học', value: state.students.filter(student => student.status === 'Đang học').length },
    { label: 'Lớp học đang hoạt động', value: state.courses.length },
    { label: 'Thanh toán đã thu', value: state.payments.filter(item => item.status === 'Đã thu').length },
    { label: 'Giảng viên sẵn sàng', value: state.teachers.length }
  ];

  document.getElementById('overview-summary').innerHTML = summaryItems.map(item => `
    <div class="summary-item">
      <strong>${item.label}</strong>
      <div>${item.value}</div>
    </div>
  `).join('');
}

function renderStudents() {
  const tbody = document.getElementById('student-table-body');
  const canManage = isTeacherOrMaster();
  tbody.innerHTML = state.students.map(student => `
    <tr>
      <td>${student.name}</td>
      <td>${student.email}</td>
      <td>${student.course}</td>
      <td>${student.level}</td>
      <td>${student.status}</td>
      <td>
        ${canManage ? `<button class="btn secondary" data-action="edit-student" data-id="${student.id}">Sửa</button>` : ''}
        ${canManage ? `<button class="btn danger" data-action="delete-student" data-id="${student.id}">Xóa</button>` : ''}
      </td>
    </tr>
  `).join('');

  const addStudentBtn = document.getElementById('add-student-btn');
  if (addStudentBtn) {
    addStudentBtn.style.display = canManage ? 'inline-flex' : 'none';
  }
}

function renderTeachers() {
  const tbody = document.getElementById('teacher-table-body');
  const canManage = isMaster();
  tbody.innerHTML = state.teachers.map(teacher => `
    <tr>
      <td>${teacher.name}</td>
      <td>${teacher.subject}</td>
      <td>${teacher.phone}</td>
      <td>${teacher.experience}</td>
      <td>
        ${canManage ? `<button class="btn secondary" data-action="edit-teacher" data-id="${teacher.id}">Sửa</button>` : ''}
        ${canManage ? `<button class="btn danger" data-action="delete-teacher" data-id="${teacher.id}">Xóa</button>` : ''}
      </td>
    </tr>
  `).join('');
}

function renderCourses() {
  const tbody = document.getElementById('course-table-body');
  const teacherMap = Object.fromEntries(state.teachers.map(teacher => [teacher.id, teacher.name]));
  tbody.innerHTML = state.courses.map(course => `
    <tr>
      <td>${course.name}</td>
      <td>${teacherMap[course.teacherId] || 'Chưa phân công'}</td>
      <td>${course.level}</td>
      <td>${course.room}</td>
      <td>${course.day} • ${course.time}</td>
      <td>
        <button class="btn secondary" data-action="edit-course" data-id="${course.id}">Sửa</button>
        <button class="btn danger" data-action="delete-course" data-id="${course.id}">Xóa</button>
      </td>
    </tr>
  `).join('');

  const teacherSelect = document.getElementById('course-teacher');
  teacherSelect.innerHTML = ['<option value="">Chọn giảng viên</option>', ...state.teachers.map(teacher => `<option value="${teacher.id}">${teacher.name}</option>`)].join('');
}

function renderSchedule() {
  const tbody = document.getElementById('schedule-table-body');
  const teacherMap = Object.fromEntries(state.teachers.map(teacher => [teacher.id, teacher.name]));
  const canManage = isTeacherOrMaster();
  tbody.innerHTML = state.schedules.map(schedule => `
    <tr>
      <td>${schedule.name}</td>
      <td>${teacherMap[schedule.teacherId] || 'Chưa phân công'}</td>
      <td>${schedule.room}</td>
      <td>${schedule.day}</td>
      <td>${schedule.time}</td>
      <td>
        ${canManage ? `<button class="btn secondary" data-action="edit-schedule" data-id="${schedule.id}">Sửa</button>` : ''}
        ${canManage ? `<button class="btn danger" data-action="delete-schedule" data-id="${schedule.id}">Xóa</button>` : ''}
      </td>
    </tr>
  `).join('');

  const teacherSelect = document.getElementById('schedule-teacher');
  if (teacherSelect) {
    teacherSelect.innerHTML = ['<option value="">Chọn giảng viên</option>', ...state.teachers.map(teacher => `<option value="${teacher.id}">${teacher.name}</option>`)].join('');
  }

  const scheduleActionBtn = document.getElementById('schedule-action');
  if (scheduleActionBtn) {
    scheduleActionBtn.style.display = canManage ? 'inline-flex' : 'none';
  }

  const scheduleFormCard = document.getElementById('schedule-form-card');
  if (scheduleFormCard) {
    scheduleFormCard.style.display = canManage ? 'block' : 'none';
  }
}

function renderHomework() {
  const assignmentBody = document.getElementById('assignment-table-body');
  const submissionBody = document.getElementById('submission-table-body');
  const assignmentCourse = document.getElementById('assignment-course');
  const submissionAssignment = document.getElementById('submission-assignment');
  const submissionStudent = document.getElementById('submission-student');

  const courseMap = Object.fromEntries(state.courses.map(course => [course.id, course.name]));
  const studentMap = Object.fromEntries(state.students.map(student => [student.id, student.name]));

  const canCreateAssignment = isTeacherOrMaster();
  const canSubmit = isStudent();
  const canGrade = isTeacherOrMaster();

  assignmentBody.innerHTML = state.assignments.map(assign => `
    <tr>
      <td>${assign.title}</td>
      <td>${courseMap[assign.courseId] || 'Chưa chọn'}</td>
      <td>${assign.dueDate}</td>
      <td>${assign.createdBy}</td>
      <td>${assign.description}</td>
      <td>
        ${canCreateAssignment ? `<button class="btn secondary" data-action="edit-assignment" data-id="${assign.id}">Sửa</button>` : ''}
        ${canCreateAssignment ? `<button class="btn danger" data-action="delete-assignment" data-id="${assign.id}">Xóa</button>` : ''}
      </td>
    </tr>
  `).join('');

  submissionBody.innerHTML = state.submissions.map(sub => `
    <tr>
      <td>${studentMap[sub.studentId] || 'Chưa xác định'}</td>
      <td>${state.assignments.find(assign => assign.id === sub.assignmentId)?.title || 'Không rõ'}</td>
      <td>${sub.content}</td>
      <td>${sub.submittedAt}</td>
      <td>${sub.grade || '-'}</td>
      <td>${sub.feedback || '-'}</td>
      <td>
        ${canGrade ? `<button class="btn secondary" data-action="grade-submission" data-id="${sub.id}">Chấm</button>` : ''}
      </td>
    </tr>
  `).join('');

  if (assignmentCourse) {
    assignmentCourse.innerHTML = ['<option value="">Chọn lớp học</option>', ...state.courses.map(course => `<option value="${course.id}">${course.name}</option>`)].join('');
  }

  if (submissionAssignment) {
    submissionAssignment.innerHTML = ['<option value="">Chọn bài tập</option>', ...state.assignments.map(assign => `<option value="${assign.id}">${assign.title}</option>`)].join('');
  }

  if (submissionStudent) {
    submissionStudent.innerHTML = ['<option value="">Chọn học viên</option>', ...state.students.map(student => `<option value="${student.id}">${student.name}</option>`)].join('');
  }

  const assignmentActionBtn = document.getElementById('assignment-action');
  if (assignmentActionBtn) {
    assignmentActionBtn.style.display = canCreateAssignment ? 'inline-flex' : 'none';
  }

  const assignmentFormCard = document.getElementById('assignment-form-card');
  if (assignmentFormCard) {
    assignmentFormCard.style.display = canCreateAssignment ? 'block' : 'none';
  }

  const submissionFormCard = document.getElementById('submission-form-card');
  if (submissionFormCard) {
    submissionFormCard.style.display = canSubmit ? 'block' : 'none';
  }
}

function renderAttendance() {
  const tbody = document.getElementById('attendance-table-body');
  const studentMap = Object.fromEntries(state.students.map(student => [student.id, student.name]));
  tbody.innerHTML = state.attendance.map(item => `
    <tr>
      <td>${studentMap[item.studentId] || 'Chưa xác định'}</td>
      <td>${item.courseName}</td>
      <td>${item.date}</td>
      <td>${item.status}</td>
      <td>${item.markedBy}</td>
    </tr>
  `).join('');

  const studentSelect = document.getElementById('attendance-student');
  studentSelect.innerHTML = ['<option value="">Chọn học viên</option>', ...state.students.map(student => `<option value="${student.id}">${student.name}</option>`)].join('');

  const courseSelect = document.getElementById('attendance-course');
  courseSelect.innerHTML = ['<option value="">Chọn lớp học</option>', ...state.courses.map(course => `<option value="${course.name}">${course.name}</option>`)].join('');
}

function renderPayments() {
  const tbody = document.getElementById('payment-table-body');
  const studentMap = Object.fromEntries(state.students.map(student => [student.id, student.name]));
  tbody.innerHTML = state.payments.map(payment => `
    <tr>
      <td>${studentMap[payment.studentId] || 'Chưa xác định'}</td>
      <td>${Number(payment.amount).toLocaleString('vi-VN')}đ</td>
      <td>${payment.method}</td>
      <td>${payment.date}</td>
      <td>${payment.status}</td>
    </tr>
  `).join('');

  const studentSelect = document.getElementById('payment-student');
  studentSelect.innerHTML = ['<option value="">Chọn học viên</option>', ...state.students.map(student => `<option value="${student.id}">${student.name}</option>`)].join('');
}

function getAiInsights() {
  const revenue = state.payments
    .filter(item => item.status === 'Đã thu')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const activeStudents = state.students.filter(student => student.status === 'Đang học').length;
  const pendingPayments = state.payments.filter(item => item.status === 'Chờ xử lý').length;
  const teacherGap = Math.max(0, state.courses.length - state.teachers.length);

  return [
    { title: 'Tăng trưởng học viên', text: `Hiện có ${activeStudents} học viên đang theo học và trung tâm đang vận hành tích cực.` },
    { title: 'Doanh thu', text: `Doanh thu đã thu là ${revenue.toLocaleString('vi-VN')}đ, còn ${pendingPayments} giao dịch đang chờ xử lý.` },
    { title: 'Năng lực giảng dạy', text: `Bạn có ${state.teachers.length} giảng viên cho ${state.courses.length} lớp học.${teacherGap ? ` Khuyến nghị bổ sung ${teacherGap} giảng viên để giảm áp lực.` : ' Khả năng vận hành khá ổn định.'}` },
    { title: 'Gợi ý AI', text: 'Ưu tiên tăng cường các lớp IELTS và Business English để tận dụng nhu cầu học tập hiện tại.' }
  ];
}

function renderAiInsights() {
  const container = document.getElementById('ai-insights');
  container.innerHTML = getAiInsights().map(item => `
    <div class="ai-insight">
      <strong>${item.title}</strong>
      <div>${item.text}</div>
    </div>
  `).join('');
}

function getAiReply(input) {
  const text = input.toLowerCase();
  const revenue = state.payments
    .filter(item => item.status === 'Đã thu')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const activeStudents = state.students.filter(student => student.status === 'Đang học').length;
  const pendingPayments = state.payments.filter(item => item.status === 'Chờ xử lý').length;

  if (text.includes('doanh thu') || text.includes('thu nhập')) {
    return `Doanh thu hiện tại đã thu là ${revenue.toLocaleString('vi-VN')}đ. Nếu duy trì tốc độ này, trung tâm có thể mở thêm một lớp mới vào tháng tới.`;
  }

  if (text.includes('học viên') || text.includes('student')) {
    return `Hiện có ${activeStudents} học viên đang học. Bạn nên gửi lời nhắc cho các học viên có ${pendingPayments} giao dịch đang chờ xử lý để tăng tỷ lệ thanh toán.`;
  }

  if (text.includes('lớp') || text.includes('class')) {
    return `Trung tâm hiện đang có ${state.courses.length} lớp học, phù hợp cho các khóa IELTS và Business English. AI đề xuất ưu tiên phân bổ giảng viên cho các lớp có số lượng học viên lớn.`;
  }

  if (text.includes('gợi ý') || text.includes('khuyến nghị')) {
    return 'AI đề xuất tập trung vào marketing cho khóa IELTS, đồng thời tăng thêm chương trình luyện thi và các buổi tư vấn học tập cho học viên mới.';
  }

  return 'Tôi đang phân tích dữ liệu trung tâm của bạn. Bạn có thể hỏi về doanh thu, học viên, lớp học hoặc cần gợi ý chiến lược tăng trưởng.';
}

function renderAiChat() {
  const container = document.getElementById('ai-chat');
  container.innerHTML = state.aiMessages.map(message => `
    <div class="ai-message ${message.role === 'user' ? 'user' : 'ai'}">${message.text}</div>
  `).join('');
}

function updateAuthUI() {
  const userBadge = document.getElementById('user-badge');
  const user = getAuthUser();

  if (!user) {
    return;
  }

  const roleLabel = user.role === 'master'
    ? 'Master'
    : user.role === 'admin'
      ? 'Admin'
      : user.role === 'teacher'
        ? 'Giảng viên'
        : 'Học viên';

  userBadge.textContent = `${user.name} • ${roleLabel}`;
}

function setActiveView(view) {
  state.activeView = view;
  document.querySelectorAll('.view').forEach(section => section.classList.toggle('active', section.id === view));
  document.querySelectorAll('.nav-btn').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  document.getElementById('page-title').textContent = document.querySelector(`.nav-btn[data-view="${view}"]`)?.textContent || 'Tổng quan';
  saveState();
}

function renderHomework() {
  const assignmentBody = document.getElementById('assignment-table-body');
  const submissionBody = document.getElementById('submission-table-body');
  const assignmentCourse = document.getElementById('assignment-course');
  const submissionAssignment = document.getElementById('submission-assignment');
  const submissionStudent = document.getElementById('submission-student');

  const courseMap = Object.fromEntries(state.courses.map(course => [course.id, course.name]));
  const studentMap = Object.fromEntries(state.students.map(student => [student.id, student.name]));

  const canCreateAssignment = isTeacherOrMaster();
  const canSubmit = isStudent();
  const canGrade = isTeacherOrMaster();

  assignmentBody.innerHTML = state.assignments.map(assign => `
    <tr>
      <td>${assign.title}</td>
      <td>${courseMap[assign.courseId] || 'Chưa chọn'}</td>
      <td>${assign.dueDate}</td>
      <td>${assign.createdBy}</td>
      <td>${assign.description}</td>
      <td>
        ${canCreateAssignment ? `<button class="btn secondary" data-action="edit-assignment" data-id="${assign.id}">Sửa</button>` : ''}
        ${canCreateAssignment ? `<button class="btn danger" data-action="delete-assignment" data-id="${assign.id}">Xóa</button>` : ''}
      </td>
    </tr>
  `).join('');

  submissionBody.innerHTML = state.submissions.map(sub => `
    <tr>
      <td>${studentMap[sub.studentId] || 'Chưa xác định'}</td>
      <td>${state.assignments.find(assign => assign.id === sub.assignmentId)?.title || 'Không rõ'}</td>
      <td>${sub.content}</td>
      <td>${sub.submittedAt}</td>
      <td>${sub.grade || '-'}</td>
      <td>${sub.feedback || '-'}</td>
      <td>
        ${canGrade ? `<button class="btn secondary" data-action="grade-submission" data-id="${sub.id}">Chấm</button>` : ''}
      </td>
    </tr>
  `).join('');

  if (assignmentCourse) {
    assignmentCourse.innerHTML = ['<option value="">Chọn lớp học</option>', ...state.courses.map(course => `<option value="${course.id}">${course.name}</option>`)].join('');
  }

  if (submissionAssignment) {
    submissionAssignment.innerHTML = ['<option value="">Chọn bài tập</option>', ...state.assignments.map(assign => `<option value="${assign.id}">${assign.title}</option>`)].join('');
  }

  if (submissionStudent) {
    submissionStudent.innerHTML = ['<option value="">Chọn học viên</option>', ...state.students.map(student => `<option value="${student.id}">${student.name}</option>`)].join('');
  }

  const assignmentActionBtn = document.getElementById('assignment-action');
  if (assignmentActionBtn) {
    assignmentActionBtn.style.display = canCreateAssignment ? 'inline-flex' : 'none';
  }

  const assignmentFormCard = document.getElementById('assignment-form-card');
  if (assignmentFormCard) {
    assignmentFormCard.style.display = canCreateAssignment ? 'block' : 'none';
  }

  const submissionFormCard = document.getElementById('submission-form-card');
  if (submissionFormCard) {
    submissionFormCard.style.display = canSubmit ? 'block' : 'none';
  }
}

function clearStudentForm() {
  document.getElementById('student-id').value = '';
  document.getElementById('student-form').reset();
}

function clearTeacherForm() {
  document.getElementById('teacher-id').value = '';
  document.getElementById('teacher-form').reset();
}

function clearCourseForm() {
  document.getElementById('course-id').value = '';
  document.getElementById('course-form').reset();
}

function clearScheduleForm() {
  document.getElementById('schedule-id').value = '';
  document.getElementById('schedule-form').reset();
}

function attachEvents() {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      state.authUserId = null;
      saveState();
      window.location.href = 'login.html';
    });
  }

  const sidebarNav = document.getElementById('sidebar-nav');
  if (sidebarNav) {
    sidebarNav.addEventListener('click', (event) => {
      const button = event.target.closest('[data-view]');
      if (button) setActiveView(button.dataset.view);
    });
  }

  document.querySelectorAll('[data-form-toggle]').forEach(button => {
    button.addEventListener('click', () => {
      const formId = button.dataset.formToggle;
      const form = document.getElementById(formId);
      form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      form?.querySelector('input, select')?.focus();
    });
  });

  document.getElementById('student-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const id = document.getElementById('student-id').value;
    const student = {
      id: id || crypto.randomUUID(),
      name: document.getElementById('student-name').value,
      email: document.getElementById('student-email').value,
      phone: document.getElementById('student-phone').value,
      course: document.getElementById('student-course').value,
      level: document.getElementById('student-level').value,
      status: document.getElementById('student-status').value
    };

    if (id) {
      state.students = state.students.map(item => item.id === id ? student : item);
    } else {
      state.students.unshift(student);
    }
    saveState();
    renderAll();
    clearStudentForm();
  });

  document.getElementById('teacher-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const id = document.getElementById('teacher-id').value;
    const teacher = {
      id: id || crypto.randomUUID(),
      name: document.getElementById('teacher-name').value,
      subject: document.getElementById('teacher-subject').value,
      phone: document.getElementById('teacher-phone').value,
      experience: document.getElementById('teacher-experience').value
    };

    if (id) {
      state.teachers = state.teachers.map(item => item.id === id ? teacher : item);
    } else {
      state.teachers.unshift(teacher);
    }
    saveState();
    renderAll();
    clearTeacherForm();
  });

  document.getElementById('course-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const id = document.getElementById('course-id').value;
    const course = {
      id: id || crypto.randomUUID(),
      name: document.getElementById('course-name').value,
      teacherId: document.getElementById('course-teacher').value,
      level: document.getElementById('course-level').value,
      room: document.getElementById('course-room').value,
      day: document.getElementById('course-day').value,
      time: document.getElementById('course-time').value
    };

    if (id) {
      state.courses = state.courses.map(item => item.id === id ? course : item);
    } else {
      state.courses.unshift(course);
    }
    saveState();
    renderAll();
    clearCourseForm();
  });

  document.getElementById('assignment-form').addEventListener('submit', (event) => {
    event.preventDefault();
    if (!isTeacherOrMaster()) {
      alert('Chỉ admin và giảng viên mới được tạo bài tập');
      return;
    }

    const id = document.getElementById('assignment-id').value;
    const assignment = {
      id: id || crypto.randomUUID(),
      title: document.getElementById('assignment-title').value,
      courseId: document.getElementById('assignment-course').value,
      dueDate: document.getElementById('assignment-due').value,
      createdBy: getAuthUser()?.name || 'Không rõ',
      description: document.getElementById('assignment-desc').value
    };

    if (id) {
      state.assignments = state.assignments.map(item => item.id === id ? assignment : item);
    } else {
      state.assignments.unshift(assignment);
    }
    saveState();
    renderAll();
    document.getElementById('assignment-form').reset();
    document.getElementById('assignment-id').value = '';
  });

  document.getElementById('submission-form').addEventListener('submit', (event) => {
    event.preventDefault();
    if (!isStudent()) {
      alert('Chỉ học viên mới được nộp bài');
      return;
    }

    const submission = {
      id: crypto.randomUUID(),
      assignmentId: document.getElementById('submission-assignment').value,
      studentId: document.getElementById('submission-student').value,
      content: document.getElementById('submission-content').value,
      note: document.getElementById('submission-note').value,
      submittedAt: new Date().toISOString().slice(0, 10),
      grade: '',
      feedback: ''
    };

    state.submissions.unshift(submission);
    saveState();
    renderAll();
    document.getElementById('submission-form').reset();
  });

  const scheduleForm = document.getElementById('schedule-form');
  if (scheduleForm) {
    scheduleForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!isTeacherOrMaster()) {
        alert('Chỉ admin và giảng viên mới được quản lý lịch học');
        return;
      }

      const id = document.getElementById('schedule-id').value;
      const schedule = {
        id: id || crypto.randomUUID(),
        name: document.getElementById('schedule-name').value,
        teacherId: document.getElementById('schedule-teacher').value,
        room: document.getElementById('schedule-room').value,
        day: document.getElementById('schedule-day').value,
        time: document.getElementById('schedule-time').value
      };

      if (id) {
        state.schedules = state.schedules.map(item => item.id === id ? schedule : item);
      } else {
        state.schedules.unshift(schedule);
      }
      saveState();
      renderAll();
      clearScheduleForm();
    });
  }

  document.getElementById('attendance-form').addEventListener('submit', (event) => {
    event.preventDefault();
    if (!isTeacherOrMaster()) {
      alert('Chỉ giảng viên và master mới được điểm danh');
      return;
    }
    state.attendance.unshift({
      id: crypto.randomUUID(),
      studentId: document.getElementById('attendance-student').value,
      courseName: document.getElementById('attendance-course').value,
      date: document.getElementById('attendance-date').value,
      status: document.getElementById('attendance-status').value,
      note: document.getElementById('attendance-note').value,
      markedBy: getAuthUser()?.name || 'Không rõ'
    });
    saveState();
    renderAttendance();
    document.getElementById('attendance-form').reset();
  });

  document.getElementById('payment-form').addEventListener('submit', (event) => {
    event.preventDefault();
    state.payments.unshift({
      id: crypto.randomUUID(),
      studentId: document.getElementById('payment-student').value,
      amount: Number(document.getElementById('payment-amount').value),
      method: document.getElementById('payment-method').value,
      date: document.getElementById('payment-date').value,
      status: document.getElementById('payment-status').value
    });
    saveState();
    renderAll();
    document.getElementById('payment-form').reset();
  });

  document.getElementById('ai-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = document.getElementById('ai-input').value.trim();
    if (!input) return;

    state.aiMessages.push({ role: 'user', text: input });
    state.aiMessages.push({ role: 'ai', text: getAiReply(input) });
    saveState();
    renderAiChat();
    document.getElementById('ai-form').reset();
  });

  document.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const { action, id } = button.dataset;
    if (action === 'delete-student') {
      state.students = state.students.filter(student => student.id !== id);
      saveState();
      renderAll();
    }

    if (action === 'edit-student') {
      const student = state.students.find(item => item.id === id);
      if (!student) return;
      document.getElementById('student-id').value = student.id;
      document.getElementById('student-name').value = student.name;
      document.getElementById('student-email').value = student.email;
      document.getElementById('student-phone').value = student.phone;
      document.getElementById('student-course').value = student.course;
      document.getElementById('student-level').value = student.level;
      document.getElementById('student-status').value = student.status;
      setActiveView('students');
      document.getElementById('student-name').focus();
    }

    if (action === 'delete-teacher') {
      state.teachers = state.teachers.filter(teacher => teacher.id !== id);
      saveState();
      renderAll();
    }

    if (action === 'edit-teacher') {
      const teacher = state.teachers.find(item => item.id === id);
      if (!teacher) return;
      document.getElementById('teacher-id').value = teacher.id;
      document.getElementById('teacher-name').value = teacher.name;
      document.getElementById('teacher-subject').value = teacher.subject;
      document.getElementById('teacher-phone').value = teacher.phone;
      document.getElementById('teacher-experience').value = teacher.experience;
      setActiveView('teachers');
      document.getElementById('teacher-name').focus();
    }

    if (action === 'delete-course') {
      state.courses = state.courses.filter(course => course.id !== id);
      saveState();
      renderAll();
    }

    if (action === 'edit-course') {
      const course = state.courses.find(item => item.id === id);
      if (!course) return;
      document.getElementById('course-id').value = course.id;
      document.getElementById('course-name').value = course.name;
      document.getElementById('course-teacher').value = course.teacherId;
      document.getElementById('course-level').value = course.level;
      document.getElementById('course-room').value = course.room;
      document.getElementById('course-day').value = course.day;
      document.getElementById('course-time').value = course.time;
      setActiveView('courses');
      document.getElementById('course-name').focus();
    }

    if (action === 'delete-schedule') {
      if (!isTeacherOrMaster()) return;
      state.schedules = state.schedules.filter(schedule => schedule.id !== id);
      saveState();
      renderAll();
      return;
    }

    if (action === 'edit-schedule') {
      if (!isTeacherOrMaster()) return;
      const schedule = state.schedules.find(item => item.id === id);
      if (!schedule) return;
      document.getElementById('schedule-id').value = schedule.id;
      document.getElementById('schedule-name').value = schedule.name;
      document.getElementById('schedule-teacher').value = schedule.teacherId;
      document.getElementById('schedule-room').value = schedule.room;
      document.getElementById('schedule-day').value = schedule.day;
      document.getElementById('schedule-time').value = schedule.time;
      setActiveView('schedule');
      document.getElementById('schedule-name').focus();
    }

    if (action === 'delete-assignment') {
      if (!isTeacherOrMaster()) return;
      state.assignments = state.assignments.filter(assign => assign.id !== id);
      saveState();
      renderAll();
      return;
    }

    if (action === 'edit-assignment') {
      if (!isTeacherOrMaster()) return;
      const assignment = state.assignments.find(item => item.id === id);
      if (!assignment) return;
      document.getElementById('assignment-id').value = assignment.id;
      document.getElementById('assignment-title').value = assignment.title;
      document.getElementById('assignment-course').value = assignment.courseId;
      document.getElementById('assignment-due').value = assignment.dueDate;
      document.getElementById('assignment-desc').value = assignment.description;
      setActiveView('homework');
      document.getElementById('assignment-title').focus();
      return;
    }

    if (action === 'grade-submission') {
      if (!isTeacherOrMaster()) return;
      const submission = state.submissions.find(item => item.id === id);
      if (!submission) return;
      const grade = prompt('Nhập điểm cho bài nộp này:', submission.grade || '');
      if (grade === null) return;
      const feedback = prompt('Nhập phản hồi cho học viên:', submission.feedback || '');
      if (feedback === null) return;
      submission.grade = grade;
      submission.feedback = feedback;
      saveState();
      renderAll();
      return;
    }
  });
}

function renderAll() {
  renderNav();
  renderOverview();
  renderStudents();
  renderTeachers();
  renderCourses();
  renderSchedule();
  renderHomework();
  renderAttendance();
  renderAiInsights();
  renderAiChat();
  renderPayments();
  updateAuthUI();
  populateTeacherSelect();
}

function init() {
  const user = getAuthUser();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  const validViews = ['overview', 'students', 'teachers', 'courses', 'schedule', 'attendance', 'payments', 'ai'];
  const hashView = window.location.hash?.replace('#', '');
  if (hashView && validViews.includes(hashView)) {
    state.activeView = hashView;
  }

  renderAll();
  attachEvents();
  setActiveView(state.activeView);
  populateTeacherSelect();
}

function populateTeacherSelect() {
  const teacherSelect = document.getElementById('register-teacher');
  if (teacherSelect) {
    teacherSelect.innerHTML = ['<option value="">Không liên kết</option>', ...state.teachers.map(teacher => `<option value="${teacher.id}">${teacher.name}</option>`)].join('');
  }

  const scheduleTeacherSelect = document.getElementById('schedule-teacher');
  if (scheduleTeacherSelect) {
    scheduleTeacherSelect.innerHTML = ['<option value="">Chọn giảng viên</option>', ...state.teachers.map(teacher => `<option value="${teacher.id}">${teacher.name}</option>`)].join('');
  }
}

init();
