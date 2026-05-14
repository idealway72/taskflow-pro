export function getDueDateInfo(dueAtISO) {
  if (!dueAtISO) return null;

  const due = new Date(dueAtISO);
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueMidnight  = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.round((dueMidnight - todayMidnight) / 86_400_000);
  const timeStr  = due.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

  if (diffDays < 0) return { text: '기한 초과',             cls: 'text-red-500 dark:text-red-400' };
  if (diffDays === 0) return { text: `오늘 ${timeStr}`,     cls: 'text-orange-500 dark:text-orange-400' };
  if (diffDays <= 6)  return { text: `D-${diffDays} ${timeStr}`, cls: 'text-yellow-600 dark:text-yellow-400' };
  return               { text: `D-${diffDays} ${timeStr}`,  cls: 'text-neutral-500 dark:text-neutral-400' };
}

export function toDateTimeLocal(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function fromDateTimeLocal(value) {
  if (!value) return null;
  return new Date(value).toISOString();
}
