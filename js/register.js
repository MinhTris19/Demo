const form = document.getElementById('register-form');

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const name = data.get('name')?.toString().trim();
  const email = data.get('email')?.toString().trim();
  const phone = data.get('phone')?.toString().trim();
  const username = data.get('username')?.toString().trim();
  const password = data.get('password')?.toString();
  const confirmPassword = data.get('confirmPassword')?.toString();
  const role = data.get('role')?.toString();

  if (!name || !email || !phone || !username || !password || !confirmPassword) {
    alert('Vui lòng điền đầy đủ thông tin');
    return;
  }

  if (password !== confirmPassword) {
    alert('Mật khẩu xác nhận không khớp');
    return;
  }

  const users = loadUsers();
  const exists = users.some((item) => item.username === username);
  if (exists) {
    alert('Tên đăng nhập đã tồn tại');
    return;
  }

  const newUser = {
    id: crypto.randomUUID(),
    name,
    email,
    phone,
    username,
    password,
    role
  };

  users.push(newUser);
  saveUsers(users);
  alert('Đăng ký thành công! Bạn có thể đăng nhập ngay.');
  window.location.href = 'login.html';
});
