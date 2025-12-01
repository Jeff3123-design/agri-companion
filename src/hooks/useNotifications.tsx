import { useEffect, useState } from 'react';
import {
  NotificationPreferences,
  getNotificationPreferences,
  saveNotificationPreferences,
  requestNotificationPermission,
  scheduleDailyTaskReminder,
  checkGrowthMilestone,
  checkCustomReminders,
} from '@/lib/notifications';

export const useNotifications = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    getNotificationPreferences()
  );
  const [permissionStatus, setPermissionStatus] = useState(
    'Notification' in window ? Notification.permission : 'denied'
  );

  useEffect(() => {
    // Check for daily reminders and milestones
    const currentDay = parseInt(localStorage.getItem('currentDay') || '1');
    
    if (preferences.enabled) {
      // Schedule notifications based on preferences
      if (preferences.dailyTaskReminders) {
        scheduleDailyTaskReminder(currentDay);
      }
      
      if (preferences.growthMilestones) {
        checkGrowthMilestone(currentDay);
      }
      
      checkCustomReminders(currentDay);
    }
  }, [preferences]);

  const enableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setPermissionStatus('granted');
      const newPrefs = { ...preferences, enabled: true };
      setPreferences(newPrefs);
      saveNotificationPreferences(newPrefs);
      return true;
    }
    return false;
  };

  const updatePreferences = (updates: Partial<NotificationPreferences>) => {
    const newPrefs = { ...preferences, ...updates };
    setPreferences(newPrefs);
    saveNotificationPreferences(newPrefs);
  };

  return {
    preferences,
    permissionStatus,
    enableNotifications,
    updatePreferences,
  };
};
