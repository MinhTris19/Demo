const STORAGE_KEY = 'linguahub-state-v1';

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
  payments: [
    { id: crypto.randomUUID(), studentId: null, amount: 2500000, method: 'Chuyển khoản', date: '2026-08-01', status: 'Đã thu' },
    { id: crypto.randomUUID(), studentId: null, amount: 1800000, method: 'Tiền mặt', date: '2026-08-05', status: 'Chờ xử lý' }
  ],
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

function renderNav() {
  const nav = document.getElementById('sidebar-nav');
  const items = [
    { key: 'overview', label: 'Tổng quan' },
    { key: 'students', label: 'Học viên' },
    { key: 'teachers', label: 'Giảng viên' },
    { key: 'courses', label: 'Lớp học' },
    { key: 'schedule', label: 'Lịch học' },
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
  tbody.innerHTML = state.students.map(student => `
    <tr>
      <td>${student.name}</td>
      <td>${student.email}</td>
      <td>${student.course}</td>
      <td>${student.level}</td>
      <td>${student.status}</td>
      <td>
        <button class="btn secondary" data-action="edit-student" data-id="${student.id}">Sửa</button>
        <button class="btn danger" data-action="delete-student" data-id="${student.id}">Xóa</button>
      </td>
    </tr>
  `).join('');
}

function renderTeachers() {
  const tbody = document.getElementById('teacher-table-body');
  tbody.innerHTML = state.teachers.map(teacher => `
    <tr>
      <td>${teacher.name}</td>
      <td>${teacher.subject}</td>
      <td>${teacher.phone}</td>
      <td>${teacher.experience}</td>
      <td>
        <button class="btn secondary" data-action="edit-teacher" data-id="${teacher.id}">Sửa</button>
        <button class="btn danger" data-action="delete-teacher" data-id="${teacher.id}">Xóa</button>
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
  const container = document.getElementById('schedule-list');
  const teacherMap = Object.fromEntries(state.teachers.map(teacher => [teacher.id, teacher.name]));
  container.innerHTML = state.courses.map(course => `
    <div class="schedule-item">
      <div>
        <strong>${course.name}</strong>
        <div>${course.day} • ${course.time}</div>
      </div>
      <div>${teacherMap[course.teacherId] || 'Chưa phân công'} • ${course.room}</div>
    </div>
  `).join('');
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

function setActiveView(view) {
  state.activeView = view;
  document.querySelectorAll('.view').forEach(section => section.classList.toggle('active', section.id === view));
  document.querySelectorAll('.nav-btn').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  document.getElementById('page-title').textContent = document.querySelector(`.nav-btn[data-view="${view}"]`)?.textContent || 'Tổng quan';
  saveState();
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

function attachEvents() {
  document.getElementById('sidebar-nav').addEventListener('click', (event) => {
    const button = event.target.closest('[data-view]');
    if (button) setActiveView(button.dataset.view);
  });

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
  });
}

function renderAll() {
  renderNav();
  renderOverview();
  renderStudents();
  renderTeachers();
  renderCourses();
  renderSchedule();
  renderPayments();
}

function init() {
  renderAll();
  attachEvents();
  setActiveView(state.activeView);
}

init();
