import type { AdminBadgeTone } from '../components/admin';

export const STATUS_TONES: Record<string, AdminBadgeTone> = {
  active: 'success',
  approved: 'success',
  balanced: 'success',
  completed: 'success',
  converted: 'success',
  created: 'success',
  delivered: 'success',
  matched: 'success',
  paid: 'success',
  sent: 'success',

  cancelled: 'danger',
  failed: 'danger',
  rejected: 'danger',
  unpaid: 'danger',

  draft: 'neutral',
  inactive: 'neutral',
  not_submitted: 'neutral',

  delayed: 'warning',
  partial: 'warning',
  partially_received: 'warning',
  pending: 'warning',
  pending_approval: 'warning',
  received: 'warning',

  approved_transfer: 'info',
  caf: 'info',
  reviewed: 'info',

  emr: 'accent',
  lab: 'accent',
};

export function toneForStatus(status?: string, fallback: AdminBadgeTone = 'neutral') {
  return status ? STATUS_TONES[status] ?? fallback : fallback;
}

export function formatStatusLabel(status?: string) {
  return status ? status.replace(/_/g, ' ') : '-';
}
