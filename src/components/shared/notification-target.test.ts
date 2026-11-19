import { describe, expect, it } from 'vitest';
import { notificationTarget } from './notification-target';

describe('notification target', () => {
  it('opens My Schedule for shift registration reminders without scheduleId', () => {
    expect(notificationTarget({ type: 'shift_registration_reminder' })).toBe('/my-schedule');
  });
  it('opens the full notification for manual messages', () => {
    expect(notificationTarget({ type: 'manual_notification' })).toBe('/notifications');
  });
  it('does not redirect unrelated notifications', () => {
    expect(notificationTarget({ type: 'system' })).toBeNull();
  });
});
