import { getDueDateInfo, toDateTimeLocal } from './utils.js';

const STATUS = {
  todo:        { label: 'TODO',  icon: '●', badge: 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300' },
  in_progress: { label: '진행중', icon: '●', badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
  done:        { label: '완료',  icon: '✓', badge: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' },
};

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderTaskList(tasks) {
  const list    = document.getElementById('taskList');
  const empty   = document.getElementById('emptyState');
  const loading = document.getElementById('loadingState');

  loading?.classList.add('hidden');

  if (!tasks.length) {
    list.innerHTML = '';
    empty?.classList.remove('hidden');
    return;
  }
  empty?.classList.add('hidden');
  list.innerHTML = tasks.map(taskCard).join('');
}

function taskCard(task) {
  const cfg = STATUS[task.status] ?? STATUS.todo;
  const due = getDueDateInfo(task.due_at);
  return `
    <div class="task-card group flex items-center gap-3 bg-white dark:bg-neutral-800 rounded-xl shadow-sm hover:shadow-md p-4 cursor-pointer transition-shadow"
         data-task-id="${task.id}">
      <span class="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${cfg.badge}">
        <span>${cfg.icon}</span><span>${cfg.label}</span>
      </span>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium truncate">${esc(task.title)}</p>
        ${due ? `<p class="text-xs mt-0.5 ${due.cls}">${due.text}</p>` : ''}
      </div>
      <button class="shrink-0 flex items-center justify-center w-[44px] h-[44px] rounded-xl
                     text-neutral-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20
                     transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
              data-action="delete" data-task-id="${task.id}" aria-label="삭제">
        <span>🗑</span>
      </button>
    </div>`;
}

function formFields(task) {
  const opts = Object.entries(STATUS)
    .map(([v, c]) => `<option value="${v}"${task?.status === v ? ' selected' : ''}>${c.label}</option>`)
    .join('');
  return `
    <div class="space-y-4">
      <div>
        <label class="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
          제목 <span class="text-red-500">*</span>
        </label>
        <input id="fieldTitle" type="text" maxlength="200" value="${task ? esc(task.title) : ''}"
          placeholder="태스크 제목을 입력하세요"
          class="w-full min-h-[44px] px-3 rounded-xl border border-neutral-200 dark:border-neutral-600
                 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        <div class="flex justify-between mt-1">
          <p id="titleError" class="text-xs text-red-500 hidden">제목을 입력해 주세요</p>
          <p id="titleCount" class="text-xs text-neutral-400 ml-auto">${task ? task.title.length : 0} / 200</p>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">상태</label>
          <select id="fieldStatus"
            class="w-full min-h-[44px] px-3 rounded-xl border border-neutral-200 dark:border-neutral-600
                   bg-white dark:bg-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            ${opts}
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">마감 시각</label>
          <input id="fieldDueAt" type="datetime-local"
            value="${task?.due_at ? toDateTimeLocal(task.due_at) : ''}"
            class="w-full min-h-[44px] px-2 rounded-xl border border-neutral-200 dark:border-neutral-600
                   bg-white dark:bg-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>
      </div>
      <div>
        <label class="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">설명 (선택)</label>
        <textarea id="fieldDescription" rows="2" placeholder="상세 내용을 입력하세요"
          class="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-600
                 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none">${esc(task?.description ?? '')}</textarea>
      </div>
    </div>`;
}

const modalShell = (title, body, actions) => `
  <div class="p-6">
    <div class="flex items-center justify-between mb-5">
      <h2 class="text-base font-semibold">${title}</h2>
      <button data-action="closeModal"
        class="flex items-center justify-center w-[44px] h-[44px] rounded-xl
               hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 text-lg">✕</button>
    </div>
    ${body}
    <div class="flex justify-end gap-2 mt-5">${actions}</div>
  </div>`;

const btnSecondary = `<button data-action="closeModal"
  class="min-h-[44px] px-4 rounded-xl text-sm font-medium
         hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">취소</button>`;

export function renderAddModal() {
  return modalShell('새 태스크', formFields(null), `
    ${btnSecondary}
    <button data-action="submitAdd"
      class="min-h-[44px] px-4 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-xl transition-colors">추가</button>`);
}

export function renderEditModal(task) {
  return modalShell('태스크 수정', formFields(task), `
    ${btnSecondary}
    <button data-action="submitEdit" data-task-id="${task.id}"
      class="min-h-[44px] px-4 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-xl transition-colors">저장</button>`);
}

export function renderDeleteModal(task) {
  return `
    <div class="p-6">
      <h2 class="text-base font-semibold mb-3">태스크를 삭제할까요?</h2>
      <p class="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
        '<span class="font-medium text-neutral-900 dark:text-neutral-100">${esc(task.title)}</span>'을
        삭제하면 되돌릴 수 없습니다.
      </p>
      <div class="flex justify-end gap-2">
        ${btnSecondary}
        <button data-action="confirmDelete" data-task-id="${task.id}"
          class="min-h-[44px] px-4 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-xl transition-colors">삭제</button>
      </div>
    </div>`;
}
