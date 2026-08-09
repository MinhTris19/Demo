const form = document.getElementById('register-form');

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const name = data.get('name')?.toString().trim();
  const email = data.get('email')?.toString().trim();
  const phone = data.get('phone')?.toString().trim();
  const username = data.get('username')?.toString().trim();
  const password = data.get('password')?.toString();
  const confirmPassword = data.get('confirmPassword')?.toString();
  const role = data.get('role')?.toString();

  if (!name || !email || !phone || !username || !password || !confirmPassword || !role) {
    alert('Vui lòng điền đầy đủ thông tin');
    return;
  }

  if (password !== confirmPassword) {
    alert('Mật khẩu xác nhận không khớp');
    return;
  }

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: name, email, username, password, role })
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      alert(result.message || 'Không thể đăng ký tài khoản');
      return;
    }

    setSession({ ...result.user, token: result.token });
    alert('Đăng ký thành công!');
    window.location.href = 'dashboard.html';
  } catch (error) {
    console.error(error);
    alert('Lỗi kết nối đến máy chủ');
  }
});
