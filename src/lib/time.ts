export interface SolatTimings {
  Fajr: number;    // decimal hour, e.g. 5.3 (05:18)
  Sunrise: number; // e.g. 6.57 (06:34)
  Dhuhr: number;   // e.g. 12.77 (12:46)
  Asr: number;     // e.g. 16.03 (16:02)
  Maghrib: number; // e.g. 18.70 (18:42)
  Isha: number;    // e.g. 19.87 (19:52)
}

export interface PrayerInfo {
  name: string;
  arabic: string;
  icon: string;
  isSolatWindow: boolean;
  nextName: string;
  nextTimeStr: string;
}

export type WeatherCondition = 'clear' | 'clouds' | 'rain' | 'storm' | 'harmattan';

export interface WeatherInfo {
  condition: WeatherCondition;
  tempC: number;
  label: string;
  icon: string;
  windKmh: number;
  isLive: boolean;
}

/** Default astronomical Solat timings for Ejigbo, Lagos (6.5569° N, 3.3087° E) */
export const DEFAULT_LAGOS_TIMINGS: SolatTimings = {
  Fajr: 5 + 18 / 60,
  Sunrise: 6 + 34 / 60,
  Dhuhr: 12 + 46 / 60,
  Asr: 16 + 2 / 60,
  Maghrib: 18 + 42 / 60,
  Isha: 19 + 52 / 60,
};

let cachedTimings: SolatTimings = { ...DEFAULT_LAGOS_TIMINGS };

/** Returns the real-world wall-clock hour (0–24 with minutes & seconds). */
export function realHourNow(now: Date = new Date()): number {
  return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
}

export function formatHour(hour: number): string {
  const norm = ((hour % 24) + 24) % 24;
  const h = Math.floor(norm);
  const m = Math.floor((norm - h) * 60);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${suffix}`;
}

const parseHHMM = (raw: string | undefined, fallback: number): number => {
  if (!raw) return fallback;
  const match = raw.match(/(\d{1,2}):(\d{2})/);
  if (!match) return fallback;
  return parseInt(match[1], 10) + parseInt(match[2], 10) / 60;
};

/**
 * Fetches today's real-world Solat timings for Ejigbo, Lagos from AlAdhan API
 * (Muslim World League method), falling back gracefully to Lagos coordinates defaults.
 */
export async function fetchLagosSolatTimings(): Promise<SolatTimings> {
  try {
    const res = await fetch(
      'https://api.aladhan.com/v1/timings?latitude=6.5569&longitude=3.3087&method=3',
      { cache: 'no-store' },
    );
    if (!res.ok) return cachedTimings;
    const json = await res.json();
    const t = json?.data?.timings;
    if (!t) return cachedTimings;
    cachedTimings = {
      Fajr: parseHHMM(t.Fajr, DEFAULT_LAGOS_TIMINGS.Fajr),
      Sunrise: parseHHMM(t.Sunrise, DEFAULT_LAGOS_TIMINGS.Sunrise),
      Dhuhr: parseHHMM(t.Dhuhr, DEFAULT_LAGOS_TIMINGS.Dhuhr),
      Asr: parseHHMM(t.Asr, DEFAULT_LAGOS_TIMINGS.Asr),
      Maghrib: parseHHMM(t.Maghrib, DEFAULT_LAGOS_TIMINGS.Maghrib),
      Isha: parseHHMM(t.Isha, DEFAULT_LAGOS_TIMINGS.Isha),
    };
    return cachedTimings;
  } catch {
    return cachedTimings;
  }
}

/** Maps a real-world hour (0-24) to the current Solat period and next obligatory Solat. */
export function prayerFor(hour: number, t: SolatTimings = cachedTimings): PrayerInfo {
  const h = ((hour % 24) + 24) % 24;

  const schedule: { name: string; at: number }[] = [
    { name: 'Subhi', at: t.Fajr },
    { name: 'Zuhr', at: t.Dhuhr },
    { name: 'Asr', at: t.Asr },
    { name: 'Maghrib', at: t.Maghrib },
    { name: 'Isha', at: t.Isha },
  ];
  const upcoming = schedule.find((s) => s.at > h) ?? schedule[0];
  const nextName = upcoming.name;
  const nextTimeStr = formatHour(upcoming.at);

  if (h >= t.Fajr && h < t.Sunrise) {
    return { name: 'Subhi (Fajr)', arabic: 'الفجر', icon: '🌅', isSolatWindow: true, nextName, nextTimeStr };
  }
  if (h >= t.Sunrise && h < t.Dhuhr) {
    return { name: 'Duha', arabic: 'الضحى', icon: '☀️', isSolatWindow: false, nextName, nextTimeStr };
  }
  if (h >= t.Dhuhr && h < t.Asr) {
    return { name: 'Zuhr', arabic: 'الظهر', icon: '🌞', isSolatWindow: true, nextName, nextTimeStr };
  }
  if (h >= t.Asr && h < t.Maghrib) {
    return { name: 'Asr', arabic: 'العصر', icon: '🌤️', isSolatWindow: true, nextName, nextTimeStr };
  }
  if (h >= t.Maghrib && h < t.Isha) {
    return { name: 'Maghrib', arabic: 'المغرب', icon: '🌇', isSolatWindow: true, nextName, nextTimeStr };
  }
  if (h >= t.Isha || h < 2.5) {
    return { name: 'Isha', arabic: 'العشاء', icon: '🌙', isSolatWindow: true, nextName, nextTimeStr };
  }
  return { name: 'Tahajjud', arabic: 'التهجد', icon: '🌌', isSolatWindow: false, nextName, nextTimeStr };
}

export const DEFAULT_WEATHER: WeatherInfo = {
  condition: 'clouds',
  tempC: 29,
  label: 'Scattered Clouds',
  icon: '⛅',
  windKmh: 11,
  isLive: false,
};

/** Maps Open-Meteo WMO weather_code to Lagos weather state. */
function mapWmoCode(code: number, hour: number): Pick<WeatherInfo, 'condition' | 'label' | 'icon'> {
  const isNight = hour < 6 || hour >= 19;
  if (code === 0 || code === 1) {
    return {
      condition: 'clear',
      label: isNight ? 'Clear Night' : 'Sunny & Clear',
      icon: isNight ? '🌙' : '☀️',
    };
  }
  if (code === 2 || code === 3) {
    return {
      condition: 'clouds',
      label: code === 2 ? 'Partly Cloudy' : 'Overcast Clouds',
      icon: isNight ? '☁️' : '⛅',
    };
  }
  if (code === 45 || code === 48) {
    return {
      condition: 'harmattan',
      label: 'Harmattan Mist',
      icon: '🌫️',
    };
  }
  if (code >= 51 && code <= 67) {
    return {
      condition: 'rain',
      label: code >= 63 ? 'Heavy Lagos Rain' : 'Light Tropical Rain',
      icon: '🌧️',
    };
  }
  if (code >= 80 && code <= 82) {
    return {
      condition: 'rain',
      label: 'Tropical Showers',
      icon: '🌦️',
    };
  }
  if (code >= 95) {
    return {
      condition: 'storm',
      label: 'Thunderstorm',
      icon: '⛈️',
    };
  }
  return {
    condition: 'clouds',
    label: 'Warm & Humid',
    icon: isNight ? '☁️' : '⛅',
  };
}

/**
 * Fetches live real-world weather for Ejigbo, Lagos (6.5569° N, 3.3087° E)
 * from Open-Meteo (free, no API key required).
 */
export async function fetchLagosWeather(): Promise<WeatherInfo> {
  const hour = realHourNow();
  try {
    const res = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=6.5569&longitude=3.3087&current=temperature_2m,weather_code,wind_speed_10m&timezone=Africa%2FLagos',
      { cache: 'no-store' },
    );
    if (!res.ok) return DEFAULT_WEATHER;
    const data = await res.json();
    const cur = data?.current;
    if (!cur) return DEFAULT_WEATHER;
    const code = Number(cur.weather_code ?? 2);
    const mapped = mapWmoCode(code, hour);
    return {
      ...mapped,
      tempC: Math.round(Number(cur.temperature_2m ?? 29)),
      windKmh: Math.round(Number(cur.wind_speed_10m ?? 10)),
      isLive: true,
    };
  } catch {
    return DEFAULT_WEATHER;
  }
}
