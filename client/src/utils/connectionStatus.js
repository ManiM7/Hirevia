export const STATUS_LABELS = {
  pending: 'Pending',
  availability_submitted: 'Awaiting Scheduling',
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const STATUS_BADGE_CLASS = {
  pending: 'badge-warning',
  availability_submitted: 'badge-neutral',
  scheduled: 'badge-success',
  completed: 'badge-neutral',
  cancelled: 'badge-danger',
};

export function formatSlot(slot) {
  if (!slot) return '';
  return `${slot.date} · ${slot.startTime}–${slot.endTime} (${slot.timezone})`;
}

export function detectTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
