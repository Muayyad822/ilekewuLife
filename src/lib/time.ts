export interface PrayerInfo {
  name: string;
  arabic: string;
  icon: string;
}

/** Maps an in-game hour (0-24) to the current salah window. */
export function prayerFor(hour: number): PrayerInfo {
  if (hour >= 5 && hour < 6.5) return { name: 'Fajr', arabic: 'الفجر', icon: '🌅' };
  if (hour >= 6.5 && hour < 12) return { name: 'Morning', arabic: 'الضحى', icon: '☀️' };
  if (hour >= 12 && hour < 15.5) return { name: 'Dhuhr', arabic: 'الظهر', icon: '🌞' };
  if (hour >= 15.5 && hour < 18.3) return { name: 'Asr', arabic: 'العصر', icon: '🌤️' };
  if (hour >= 18.3 && hour < 19.4) return { name: 'Maghrib', arabic: 'المغرب', icon: '🌇' };
  if (hour >= 19.4 && hour < 22) return { name: 'Isha', arabic: 'العشاء', icon: '🌙' };
  return { name: 'Night', arabic: 'الليل', icon: '🌌' };
}

export function formatHour(hour: number): string {
  const h = Math.floor(hour) % 24;
  const m = Math.floor((hour - Math.floor(hour)) * 60);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${suffix}`;
}

