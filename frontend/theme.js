export function initTheme() {
  syncIcon();
}

export function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  applyTheme(isDark ? 'light' : 'dark');
}

function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  localStorage.setItem('theme', theme);
  syncIcon();
}

function syncIcon() {
  const el = document.getElementById('themeIcon');
  if (el) el.textContent = document.documentElement.classList.contains('dark') ? '☀️' : '🌙';
}
