const roleButtons = document.querySelectorAll('.role-btn');
const forms = document.querySelectorAll('.auth-form');

roleButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const selectedRole = button.dataset.role;

    roleButtons.forEach((btn) => btn.classList.remove('active'));
    button.classList.add('active');

    forms.forEach((form) => form.classList.remove('active-form'));

    const targetForm = document.querySelector(`.auth-form[data-role="${selectedRole}"]`);
    if (targetForm) {
      targetForm.classList.add('active-form');
    }
  });
});

forms.forEach((form) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const data = new FormData(form);
    const username = data.get('username')?.toString().trim();
    const password = data.get('password')?.toString();
    const role = form.dataset.role;

    const users = loadUsers();
    const user = users.find((item) => item.username === username && item.password === password && item.role === role);

    if (!user) {
      alert('Thông tin đăng nhập không đúng');
      return;
    }

    setSession(user);

    if (role === 'admin') {
      window.location.href = 'admin.html';
    } else if (role === 'teacher') {
      window.location.href = 'teacher.html';
    } else {
      window.location.href = 'student.html';
    }
  });
});
