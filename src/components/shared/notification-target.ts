import PATHS from '@/constants/paths';

export function notificationTarget(notification: { type: string }): string | null {
  if (notification.type === 'shift_registration_reminder') return PATHS.MY_SCHEDULE;
  if (notification.type === 'manual_notification') return PATHS.NOTIFICATIONS;
  return null;
}
