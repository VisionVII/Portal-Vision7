import { useMemo } from 'react';

export interface SkyInfo {
  isDaytime: boolean;
  moonPhase: number;
  moonPhaseName: string;
  moonEmoji: string;
  temperatureColor: string;
  temperatureBg: string;
  temperatureIcon: 'freezing' | 'cold' | 'cool' | 'mild' | 'warm' | 'hot' | 'extreme' | 'unknown';
  seasonName: string;
  seasonEmoji: string;
}

const MOON_PHASES = [
  { name: 'Lua Nova', emoji: '🌑' },
  { name: 'Crescente Côncava', emoji: '🌒' },
  { name: 'Quarto Crescente', emoji: '🌓' },
  { name: 'Crescente Convexa', emoji: '🌔' },
  { name: 'Lua Cheia', emoji: '🌕' },
  { name: 'Minguante Convexa', emoji: '🌖' },
  { name: 'Quarto Minguante', emoji: '🌗' },
  { name: 'Minguante Côncava', emoji: '🌘' },
] as const;

function getMoonPhase(date: Date): number {
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  const day = date.getDate();

  if (month < 3) {
    year--;
    month += 12;
  }

  month++;
  const c = 365.25 * year;
  const e = 30.6 * month;
  let jd = c + e + day - 694039.09;
  jd /= 29.5305882;
  const frac = jd - Math.floor(jd);
  let phase = Math.round(frac * 8);
  if (phase >= 8) phase = 0;

  return phase;
}

function getTemperatureStyle(temp: number | null): {
  color: string;
  bg: string;
  icon: SkyInfo['temperatureIcon'];
} {
  if (temp === null)
    return { color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800', icon: 'unknown' };
  if (temp <= -10)
    return { color: 'text-blue-700', bg: 'bg-blue-100 dark:bg-blue-950/80', icon: 'freezing' };
  if (temp <= 0)
    return { color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/60', icon: 'freezing' };
  if (temp <= 5)
    return { color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-950/60', icon: 'cold' };
  if (temp <= 10)
    return { color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-950/60', icon: 'cold' };
  if (temp <= 15)
    return { color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-950/60', icon: 'cool' };
  if (temp <= 20)
    return { color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/60', icon: 'mild' };
  if (temp <= 25)
    return { color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/60', icon: 'mild' };
  if (temp <= 30)
    return { color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/60', icon: 'warm' };
  if (temp <= 35)
    return { color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/60', icon: 'hot' };
  if (temp <= 40)
    return { color: 'text-red-700', bg: 'bg-red-100 dark:bg-red-950/70', icon: 'hot' };
  return { color: 'text-rose-700', bg: 'bg-rose-100 dark:bg-rose-950/60', icon: 'extreme' };
}

function getSeason(date: Date): { name: string; emoji: string } {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return { name: 'Primavera', emoji: '🌸' };
  if (month >= 5 && month <= 7) return { name: 'Verão', emoji: '☀️' };
  if (month >= 8 && month <= 10) return { name: 'Outono', emoji: '🍂' };
  return { name: 'Inverno', emoji: '❄️' };
}

export const useSkyInfo = (temperatureC: number | null, localTime: string): SkyInfo => {
  return useMemo(() => {
    const now = new Date();
    const hour = parseInt(localTime?.split(':')[0] || String(now.getHours()), 10);
    const isDaytime = hour >= 7 && hour < 20;
    const phase = getMoonPhase(now);
    const tempStyle = getTemperatureStyle(temperatureC);
    const season = getSeason(now);

    return {
      isDaytime,
      moonPhase: phase,
      moonPhaseName: MOON_PHASES[phase].name,
      moonEmoji: MOON_PHASES[phase].emoji,
      temperatureColor: tempStyle.color,
      temperatureBg: tempStyle.bg,
      temperatureIcon: tempStyle.icon,
      seasonName: season.name,
      seasonEmoji: season.emoji,
    };
  }, [temperatureC, localTime]);
};
