document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('admin-login-form');

  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const username = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;

    const users = loadUsers();
    const user = users.find((item) =>
      (item.username === username || item.email === username) &&
      item.password === password &&
      item.role === 'admin'
    );

    if (!user) {
      alert('Tên đăng nhập hoặc mật khẩu admin không đúng');
      return;
    }

    setSession(user);
    window.location.href = 'dashboard.html';
  });
});
