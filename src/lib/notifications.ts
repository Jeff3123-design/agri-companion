// Push notification utilities
import { maizeTasks } from "@/data/maizeTasks";

export interface NotificationPreferences {
  enabled: boolean;
  dailyTaskReminders: boolean;
  weatherAlerts: boolean;
  growthMilestones: boolean;
  customReminders: CustomReminder[];
}

export interface CustomReminder {
  id: string;
  title: string;
  day: number;
  time: string;
  enabled: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: false,
  dailyTaskReminders: true,
  weatherAlerts: true,
  growthMilestones: true,
  customReminders: [],
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

// Get notification preferences
export const getNotificationPreferences = (): NotificationPreferences => {
  const saved = localStorage.getItem('notificationPreferences');
  return saved ? JSON.parse(saved) : DEFAULT_PREFERENCES;
};

// Save notification preferences
export const saveNotificationPreferences = (prefs: NotificationPreferences) => {
  localStorage.setItem('notificationPreferences', JSON.stringify(prefs));
};

// Show local notification
export const showNotification = (title: string, options?: NotificationOptions) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  new Notification(title, {
    icon: '/pwa-192x192.png',
    badge: '/apple-touch-icon.png',
    ...options,
  });
};

// Schedule daily task reminder
export const scheduleDailyTaskReminder = (currentDay: number) => {
  const prefs = getNotificationPreferences();
  if (!prefs.enabled || !prefs.dailyTaskReminders) return;

  const task = maizeTasks.find(t => t.day === currentDay);
  if (!task) return;

  showNotification(`Day ${currentDay}: ${task.stage}`, {
    body: task.tasks[0],
    tag: 'daily-task',
  });
};

// Check for growth stage milestones
export const checkGrowthMilestone = (currentDay: number) => {
  const prefs = getNotificationPreferences();
  if (!prefs.enabled || !prefs.growthMilestones) return;

  const milestones = [1, 10, 30, 60, 80, 95, 120]; // Key growth days
  
  if (milestones.includes(currentDay)) {
    const task = maizeTasks.find(t => t.day === currentDay);
    if (task) {
      showNotification('🌱 Growth Milestone Reached!', {
        body: `Your maize has reached the ${task.stage} stage. Check your tasks for today.`,
        tag: 'milestone',
      });
    }
  }
};

// Show weather alert
export const showWeatherAlert = (alertMessage: string) => {
  const prefs = getNotificationPreferences();
  if (!prefs.enabled || !prefs.weatherAlerts) return;

  showNotification('⚠️ Weather Alert', {
    body: alertMessage,
    tag: 'weather-alert',
    requireInteraction: true,
  });
};

// Check custom reminders
export const checkCustomReminders = (currentDay: number) => {
  const prefs = getNotificationPreferences();
  if (!prefs.enabled) return;

  prefs.customReminders
    .filter(r => r.enabled && r.day === currentDay)
    .forEach(reminder => {
      showNotification(reminder.title, {
        tag: `custom-${reminder.id}`,
      });
    });
};

// Initialize notifications on app start
export const initializeNotifications = async () => {
  const prefs = getNotificationPreferences();
  
  if (prefs.enabled && Notification.permission === 'default') {
    await requestNotificationPermission();
  }
};
