// 포트는 백엔드 실행 포트에 맞춰 변경 (기본 8000, 현재 세션 8002)
const BASE = 'http://localhost:8002/api/v1';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error('API 오류'), { status: res.status, data });
  return data;
}

export const listTasks  = (status) => request(`/tasks${status ? `?status=${status}` : ''}`);
export const createTask = (body)   => request('/tasks', { method: 'POST', body: JSON.stringify(body) });
export const getTask    = (id)     => request(`/tasks/${id}`);
export const updateTask = (id, body) => request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteTask = (id)     => request(`/tasks/${id}`, { method: 'DELETE' });
