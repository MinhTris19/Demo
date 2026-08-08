document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('admin-login-form');

  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;

    const defaultAdmin = {
      id: crypto.randomUUID(),
      name: 'Admin Default',
      email: 'admin@gmail.com',
      password: '123456',
      role: 'admin'
    };

    if (email === defaultAdmin.email && password === defaultAdmin.password) {
      setSession(defaultAdmin);
      window.location.href = 'admin.html';
      return;
    }

    alert('Email hoặc mật khẩu admin không đúng');
  });
});
