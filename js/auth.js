const storageKey = 'linguahub-users';

function loadUsers() {
  return JSON.parse(localStorage.getItem(storageKey) || '[]');
}

function saveUsers(users) {
  localStorage.setItem(storageKey, JSON.stringify(users));
}

function seedUsers() {
  const users = loadUsers();
  if (users.length > 0) return users;

  const seed = [
    { id: crypto.randomUUID(), name: 'Master Admin', username: 'master', password: '123456', role: 'admin' },
    { id: crypto.randomUUID(), name: 'Ms. Lan', username: 'lan', password: '123456', role: 'teacher' },
    { id: crypto.randomUUID(), name: 'An Nguyen', username: 'an', password: '123456', role: 'student' }
  ];

  saveUsers(seed);
  return seed;
}

function setSession(user) {
  localStorage.setItem('linguahub-session', JSON.stringify(user));
}

function getSession() {
  return JSON.parse(localStorage.getItem('linguahub-session') || 'null');
}

function clearSession() {
  localStorage.removeItem('linguahub-session');
}

seedUsers();
