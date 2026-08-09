document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('admin-login-form');

  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role: 'admin' })
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        alert(result.message || 'Tên đăng nhập hoặc mật khẩu admin không đúng');
        return;
      }

      setSession({ ...result.user, token: result.token });
      window.location.href = 'dashboard.html';
    } catch (error) {
      console.error(error);
      alert('Lỗi kết nối đến máy chủ');
    }
  });
});
