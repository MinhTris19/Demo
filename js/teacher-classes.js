const teacherClassesState = {
  classes: [],
  selectedClass: null,
  students: [],
  candidates: [],
  selectedStudents: new Set()
};

function showMessage(type, message) {
  const container = document.getElementById('message-container');
  if (!container) return;
  container.innerHTML = `<div class="message ${type}">${message}</div>`;
  setTimeout(() => { container.innerHTML = ''; }, 5000);
}

function getAuthTokenHeader() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchTeacherClasses() {
  try {
    const res = await fetch('/api/teacher/classes', {
      headers: { ...getAuthTokenHeader() }
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Không thể tải danh sách lớp');
    }
    teacherClassesState.classes = data.classes;
    renderClasses();
  } catch (error) {
    console.error(error);
    showMessage('error', error.message);
  }
}

function renderClasses() {
  const container = document.getElementById('classes-list');
  container.innerHTML = teacherClassesState.classes.map(klass => `
    <article class="class-card">
      <h3>${klass.Name}</h3>
      <p>Giảng viên: ${klass.TeacherName || 'Chưa phân công'}</p>
      <p>Số học viên: ${klass.StudentCount || 0}</p>
      <p>Lớp: ${klass.Level || '-'} • ${klass.Room || '-'}</p>
      <p>Lịch: ${klass.Day || '-'} • ${klass.Time || '-'}</p>
      <div class="actions">
        <button class="btn primary" data-action="view-class" data-id="${klass.Id}">Xem lớp</button>
      </div>
    </article>
  `).join('');
}

async function fetchClassDetail(classId) {
  try {
    const res = await fetch(`/api/teacher/classes/${classId}`, {
      headers: { ...getAuthTokenHeader() }
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Không thể tải chi tiết lớp');
    }
    teacherClassesState.selectedClass = data.class;
    teacherClassesState.students = data.students;
    renderClassDetail();
  } catch (error) {
    console.error(error);
    showMessage('error', error.message);
  }
}

function renderClassDetail() {
  const section = document.getElementById('class-detail-section');
  const info = document.getElementById('class-info');
  const countBox = document.getElementById('student-count-box');
  const body = document.getElementById('student-table-body');
  section.classList.remove('hidden');

  const klass = teacherClassesState.selectedClass;
  if (!klass) return;

  info.innerHTML = `
    <div class="grid full-width">
      <div class="card">
        <strong>Tên lớp</strong>
        <p>${klass.Name}</p>
      </div>
      <div class="card">
        <strong>Giảng viên</strong>
        <p>${klass.TeacherName || 'Chưa phân công'}</p>
      </div>
      <div class="card">
        <strong>Lịch</strong>
        <p>${klass.Day || '-'} • ${klass.Time || '-'}</p>
      </div>
      <div class="card">
        <strong>Phòng</strong>
        <p>${klass.Room || '-'}</p>
      </div>
    </div>
  `;

  countBox.innerHTML = `<div class="badge">${teacherClassesState.students.length} học viên</div>`;

  body.innerHTML = teacherClassesState.students.map(student => `
    <tr>
      <td>${student.studentCode}</td>
      <td>${student.fullName}</td>
      <td>${student.email}</td>
      <td>${student.phone || '-'}</td>
      <td>${student.status}</td>
      <td>${student.score}</td>
      <td><span class="badge ${student.attendanceStatus === 'Có mặt' ? 'status-present' : student.attendanceStatus === 'Vắng' ? 'status-absent' : 'status-waiting'}">${student.attendanceStatus}</span></td>
      <td>
        <button class="btn secondary" data-action="remove-student" data-enrollment="${student.enrollmentId}">Xóa</button>
        <button class="btn secondary" data-action="attendance-student" data-enrollment="${student.enrollmentId}">Điểm danh</button>
      </td>
    </tr>
  `).join('');
}

async function fetchCandidateStudents() {
  try {
    if (!teacherClassesState.selectedClass) return;
    const classId = teacherClassesState.selectedClass.Id;
    const res = await fetch(`/api/teacher/classes/${classId}/candidates`, {
      headers: { ...getAuthTokenHeader() }
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Không thể tải danh sách học viên');
    }
    teacherClassesState.candidates = data.students;
    renderCandidates();
  } catch (error) {
    console.error(error);
    showMessage('error', error.message);
  }
}

function renderCandidates() {
  const body = document.getElementById('candidate-table-body');
  body.innerHTML = teacherClassesState.candidates.map(student => `
    <tr>
      <td><input type="checkbox" data-student-id="${student.Id}" /></td>
      <td>${student.FullName}</td>
      <td>${student.Email}</td>
      <td>${student.Phone || '-'}</td>
    </tr>
  `).join('');
}

function getSelectedCandidateIds() {
  return Array.from(document.querySelectorAll('#candidate-table-body input[type="checkbox"]'))
    .filter(input => input.checked)
    .map(input => Number(input.dataset.studentId));
}

async function addSelectedStudents() {
  try {
    const ids = getSelectedCandidateIds();
    if (!ids.length) {
      showMessage('error', 'Vui lòng chọn tối thiểu một học viên.');
      return;
    }
    const classId = teacherClassesState.selectedClass.Id;
    const promises = ids.map(id =>
      fetch(`/api/teacher/classes/${classId}/students`, {
        method: 'POST',
        headers: {
          ...getAuthTokenHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ studentId: id })
      })
    );

    const results = await Promise.all(promises);
    const failed = [];
    for (const res of results) {
      const data = await res.json();
      if (!res.ok) {
        failed.push(data.message || 'Lỗi thêm học viên');
      }
    }

    if (failed.length) {
      showMessage('error', failed.join('; '));
    } else {
      showMessage('success', 'Thêm học viên vào lớp thành công');
      closeAddStudentPanel(); // Hide add student panel after success
    }
    await fetchClassDetail(classId);
    // await fetchCandidateStudents(); // no need to fetch candidates if we close the panel
  } catch (error) {
    console.error(error);
    showMessage('error', error.message);
  }
}

async function removeStudent(enrollmentId) {
  try {
    const classId = teacherClassesState.selectedClass.Id;
    const res = await fetch(`/api/teacher/classes/${classId}/students/${enrollmentId}`, {
      method: 'DELETE',
      headers: { ...getAuthTokenHeader() }
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Không thể xóa học viên');
    }
    showMessage('success', data.message);
    await fetchClassDetail(classId);
    await fetchCandidateStudents();
  } catch (error) {
    console.error(error);
    showMessage('error', error.message);
  }
}

async function markAttendance(enrollmentId) {
  const status = prompt('Nhập trạng thái điểm danh (Có mặt / Vắng / Muộn):', 'Có mặt');
  if (!status) return;
  try {
    const classId = teacherClassesState.selectedClass.Id;
    const res = await fetch(`/api/teacher/classes/${classId}/students/${enrollmentId}/attendance`, {
      method: 'POST',
      headers: {
        ...getAuthTokenHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status, note: '', date: new Date().toISOString().slice(0, 10) })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Không thể cập nhật điểm danh');
    }
    showMessage('success', data.message);
    await fetchClassDetail(classId);
  } catch (error) {
    console.error(error);
    showMessage('error', error.message);
  }
}

function filterStudents() {
  const search = document.getElementById('student-search').value.trim().toLowerCase();
  const status = document.getElementById('student-filter-status').value;
  const body = document.getElementById('student-table-body');

  body.innerHTML = teacherClassesState.students
    .filter(student => {
      const found = [student.fullName, student.email, student.studentCode].some(value => value.toLowerCase().includes(search));
      const statusMatch = !status || student.status === status;
      return found && statusMatch;
    })
    .map(student => `
      <tr>
        <td>${student.studentCode}</td>
        <td>${student.fullName}</td>
        <td>${student.email}</td>
        <td>${student.phone || '-'}</td>
        <td>${student.status}</td>
        <td>${student.score}</td>
        <td><span class="badge ${student.attendanceStatus === 'Có mặt' ? 'status-present' : student.attendanceStatus === 'Vắng' ? 'status-absent' : 'status-waiting'}">${student.attendanceStatus}</span></td>
        <td>
          <button class="btn secondary" data-action="remove-student" data-enrollment="${student.enrollmentId}">Xóa</button>
          <button class="btn secondary" data-action="attendance-student" data-enrollment="${student.enrollmentId}">Điểm danh</button>
        </td>
      </tr>
    `).join('');
}

function filterCandidates() {
  const search = document.getElementById('candidate-search').value.trim().toLowerCase();
  const body = document.getElementById('candidate-table-body');

  body.innerHTML = teacherClassesState.candidates
    .filter(student => [student.FullName, student.Email, student.Phone].some(value => (value || '').toLowerCase().includes(search)))
    .map(student => `
      <tr>
        <td><input type="checkbox" data-student-id="${student.Id}" /></td>
        <td>${student.FullName}</td>
        <td>${student.Email}</td>
        <td>${student.Phone || '-'}</td>
      </tr>
    `).join('');
}

function closeAddStudentPanel() {
  document.getElementById('add-student-section').classList.add('hidden');
  document.getElementById('class-detail-section').classList.remove('hidden');
}

function openAddStudentPanel() {
  document.getElementById('class-detail-section').classList.add('hidden');
  document.getElementById('add-student-section').classList.remove('hidden');
}

function closeClassDetailPanel() {
  document.getElementById('class-detail-section').classList.add('hidden');
}

function attachTeacherClassesEvents() {
  document.getElementById('logout-btn').addEventListener('click', () => {
    clearSession();
    window.location.href = 'login.html';
  });

  document.getElementById('back-btn').addEventListener('click', () => {
    window.location.href = 'teacher.html';
  });

  document.getElementById('reload-class-btn').addEventListener('click', () => {
    if (teacherClassesState.selectedClass) {
      fetchClassDetail(teacherClassesState.selectedClass.Id);
    }
  });

  document.getElementById('open-add-student-btn').addEventListener('click', async () => {
    if (!teacherClassesState.selectedClass) return;
    await fetchCandidateStudents();
    openAddStudentPanel();
  });

  document.getElementById('close-add-student-btn').addEventListener('click', closeAddStudentPanel);
  document.getElementById('add-selected-students-btn').addEventListener('click', addSelectedStudents);
  document.getElementById('student-search').addEventListener('input', filterStudents);
  document.getElementById('student-filter-status').addEventListener('change', filterStudents);
  document.getElementById('candidate-search').addEventListener('input', filterCandidates);

  document.getElementById('classes-list').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action="view-class"]');
    if (!button) return;
    const classId = Number(button.dataset.id);
    fetchClassDetail(classId);
  });

  document.addEventListener('click', (event) => {
    const removeBtn = event.target.closest('button[data-action="remove-student"]');
    if (removeBtn) {
      const enrollmentId = Number(removeBtn.dataset.enrollment);
      removeStudent(enrollmentId);
      return;
    }

    const attendanceBtn = event.target.closest('button[data-action="attendance-student"]');
    if (attendanceBtn) {
      const enrollmentId = Number(attendanceBtn.dataset.enrollment);
      markAttendance(enrollmentId);
      return;
    }
  });
}

async function initTeacherClassesPage() {
  const session = getSession();
  if (!session || (session.role !== 'teacher' && session.role !== 'admin')) {
    window.location.href = 'login.html';
    return;
  }

  attachTeacherClassesEvents();
  await fetchTeacherClasses();
}

initTeacherClassesPage();
