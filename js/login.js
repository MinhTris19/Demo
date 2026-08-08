const form = document.getElementById('login-form');
const roleButtons = document.querySelectorAll('.role-btn[data-role]');
const roleInput = document.getElementById('login-role');

roleButtons.forEach((button) => {
  button.addEventListener('click', () => {
    roleButtons.forEach((btn) => btn.classList.remove('active'));
    button.classList.add('active');
    const selectedRole = button.dataset.role;
    if (roleInput) {
      roleInput.value = selectedRole;
    }
  });
});

if (form) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const data = new FormData(form);
    const username = data.get('username')?.toString().trim();
    const password = data.get('password')?.toString();
    const role = data.get('role')?.toString();

    const users = loadUsers();
    const user = users.find((item) => item.username === username && item.password === password && item.role === role);

    if (!user) {
      alert('Thông tin đăng nhập không đúng');
      return;
    }

    setSession(user);
    window.location.href = 'dashboard.html';
  });
}
