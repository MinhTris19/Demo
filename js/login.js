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
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const data = new FormData(form);
    const username = data.get('username')?.toString().trim();
    const password = data.get('password')?.toString();
    const role = data.get('role')?.toString();

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role })
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        alert(result.message || 'Thông tin đăng nhập không đúng');
        return;
      }

      setSession({ ...result.user, token: result.token });
      window.location.href = 'dashboard.html';
    } catch (error) {
      console.error(error);
      alert('Lỗi kết nối đến máy chủ');
    }
  });
}
