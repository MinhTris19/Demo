const storageKey = 'linguahub-users';

function loadUsers() {
  return JSON.parse(localStorage.getItem(storageKey) || '[]');
}

function saveUsers(users) {
  localStorage.setItem(storageKey, JSON.stringify(users));
}

function seedUsers() {
  const users = loadUsers();

  const requiredUsers = [
    { id: crypto.randomUUID(), name: 'System Admin', username: 'admin', email: 'admin@linguahub.local', password: '123456', role: 'admin' },
    { id: crypto.randomUUID(), name: 'Ms. Lan', username: 'lan', email: 'lan@linguahub.local', password: '123456', role: 'teacher' },
    { id: crypto.randomUUID(), name: 'Anh Nguyen', username: 'an', email: 'an@linguahub.local', password: '123456', role: 'student' }
  ];

  const merged = [...users];
  requiredUsers.forEach((required) => {
    const existing = merged.find(u => u.username === required.username || u.email === required.email);
    if (existing) {
      existing.name = required.name;
      existing.email = required.email;
      existing.password = required.password;
      existing.role = required.role;
    } else {
      merged.push(required);
    }
  });

  saveUsers(merged);
  return merged;
}

function setSession(session) {
  localStorage.setItem('linguahub-session', JSON.stringify(session));
}

function getSession() {
  return JSON.parse(localStorage.getItem('linguahub-session') || 'null');
}

function getAuthToken() {
  return getSession()?.token || null;
}

function clearSession() {
  localStorage.removeItem('linguahub-session');
}

seedUsers();
