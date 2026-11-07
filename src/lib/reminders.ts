// PWA Local Notification & Study Reminders (100% Free Firebase Spark / Web Notifications API)

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const res = await Notification.requestPermission();
    return res === 'granted';
  }
  return false;
}

export function scheduleDailyMadrasahReminder(hour24: number = 16, minute: number = 0) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    localStorage.setItem(
      'ilekewu_daily_reminder',
      JSON.stringify({ hour: hour24, minute, enabled: true })
    );

    // If service worker registration is active, register scheduled check
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SCHEDULE_DAILY_STUDY_REMINDER',
        hour: hour24,
        minute,
      });
    }
  } catch {}
}

export function showDailyInAppGreeting(streakDays: number, studentName: string): string {
  const greetings = [
    `Assalamu Alaikum, ${studentName}! Ready to keep your ${streakDays}-day Madrasah streak alive? 📖`,
    `Barakallahu feek, ${studentName}! Today's lesson is on the classroom chalkboard! 🌟`,
    `A new day of Ilm begins! Come sit in today's halqah with your classmates! 🕌`,
  ];
  return greetings[Math.floor(Math.random() * greetings.length)];
}

