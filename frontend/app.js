import { initTheme, toggleTheme }                   from './theme.js';
import { setTasks, getTasks, setFilter, getFilter } from './state.js';
import { renderAddModal, renderEditModal, renderDeleteModal } from './render.js';
import { listTasks, createTask, getTask, updateTask, deleteTask } from './api.js';
import { fromDateTimeLocal }                        from './utils.js';

// ── 모달 ──────────────────────────────────────────────────────────────────────

function openModal(html) {
  document.getElementById('modalContent').innerHTML = html;
  document.getElementById('modalOverlay').classList.remove('hidden');
  setTimeout(() => document.querySelector('#modalContent input, #modalContent select')?.focus(), 50);
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
}

// ── 폼 헬퍼 ───────────────────────────────────────────────────────────────────

function readForm() {
  return {
    title:       document.getElementById('fieldTitle').value.trim(),
    status:      document.getElementById('fieldStatus').value,
    due_at:      fromDateTimeLocal(document.getElementById('fieldDueAt').value),
    description: document.getElementById('fieldDescription').value.trim() || null,
  };
}

function validateForm() {
  const titleEl = document.getElementById('fieldTitle');
  const errEl   = document.getElementById('titleError');
  if (!titleEl.value.trim()) {
    errEl.classList.remove('hidden');
    titleEl.focus();
    return false;
  }
  errEl.classList.add('hidden');
  return true;
}

// ── 데이터 갱신 ───────────────────────────────────────────────────────────────

async function fetchAndRender() {
  try {
    const tasks = await listTasks(getFilter());
    setTasks(tasks);
  } catch (err) {
    console.error('목록 조회 실패:', err);
  }
}

// ── 필터 탭 스타일 ────────────────────────────────────────────────────────────

const TAB_ACTIVE   = 'filter-tab shrink-0 min-h-[36px] px-3 text-sm font-medium rounded-lg transition-colors bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900';
const TAB_INACTIVE = 'filter-tab shrink-0 min-h-[36px] px-3 text-sm font-medium rounded-lg transition-colors bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700';

function updateFilterTabs(activeFilter) {
  document.querySelectorAll('.filter-tab').forEach(b => {
    b.className = b.dataset.filter === activeFilter ? TAB_ACTIVE : TAB_INACTIVE;
  });
}

// ── 초기화 ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();

  // 테마 토글
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);

  // 태스크 추가 버튼
  document.getElementById('addBtn').addEventListener('click', () => openModal(renderAddModal()));

  // 모달 이벤트 위임
  document.getElementById('modalOverlay').addEventListener('click', async (e) => {
    if (e.target.id === 'modalOverlay') { closeModal(); return; }

    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;

    if (action === 'closeModal') { closeModal(); return; }

    if (action === 'submitAdd') {
      if (!validateForm()) return;
      try {
        await createTask(readForm());
        closeModal();
        await fetchAndRender();
      } catch (err) { console.error('생성 실패:', err); }
      return;
    }

    if (action === 'submitEdit') {
      if (!validateForm()) return;
      const id = e.target.dataset.taskId;
      try {
        await updateTask(id, readForm());
        closeModal();
        await fetchAndRender();
      } catch (err) { console.error('수정 실패:', err); }
      return;
    }

    if (action === 'confirmDelete') {
      const id = e.target.dataset.taskId;
      try {
        await deleteTask(id);
        closeModal();
        await fetchAndRender();
      } catch (err) { console.error('삭제 실패:', err); }
      return;
    }
  });

  // 모달 내 제목 글자 수 카운터 + 실시간 에러 해제
  document.getElementById('modalOverlay').addEventListener('input', (e) => {
    if (e.target.id !== 'fieldTitle') return;
    document.getElementById('titleCount').textContent = `${e.target.value.length} / 200`;
    if (e.target.value.trim()) document.getElementById('titleError')?.classList.add('hidden');
  });

  // ESC 키로 모달 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // 카드 이벤트 위임 (삭제 / 수정)
  document.getElementById('taskList').addEventListener('click', async (e) => {
    const deleteBtn = e.target.closest('[data-action="delete"]');
    if (deleteBtn) {
      const id   = deleteBtn.dataset.taskId;
      const task = getTasks().find(t => t.id === id);
      if (task) openModal(renderDeleteModal(task));
      return;
    }

    const card = e.target.closest('.task-card');
    if (!card) return;
    try {
      const task = await getTask(card.dataset.taskId);
      openModal(renderEditModal(task));
    } catch (err) { console.error('조회 실패:', err); }
  });

  // 필터 탭
  document.getElementById('filterTabs').addEventListener('click', async (e) => {
    const btn = e.target.closest('.filter-tab');
    if (!btn) return;
    setFilter(btn.dataset.filter);
    updateFilterTabs(btn.dataset.filter);
    await fetchAndRender();
  });

  // 초기 로드 + 폴링 3초
  await fetchAndRender();
  setInterval(fetchAndRender, 3000);
});
