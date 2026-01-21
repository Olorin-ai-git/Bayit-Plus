/**
 * Shabbat Time Calculator
 * Utilities for calculating Shabbat-related trigger times
 */

import type { ShabbatTimes, TriggerCalculation } from '../types/flows.types';

// Default Jerusalem coordinates
const DEFAULT_LAT = 31.7683;
const DEFAULT_LON = 35.2137;

// Cache for Shabbat times
let shabbatTimesCache: {
  times: ShabbatTimes;
  expiry: number;
  lat: number;
  lon: number;
} | null = null;

/**
 * Get next Friday date from today
 */
export const getNextFriday = (from: Date = new Date()): Date => {
  const date = new Date(from);
  const day = date.getDay();
  // Days until Friday (5)
  const daysUntilFriday = (5 - day + 7) % 7;
  date.setDate(date.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Get next Saturday date from today
 */
export const getNextSaturday = (from: Date = new Date()): Date => {
  const date = new Date(from);
  const day = date.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7;
  date.setDate(date.getDate() + (daysUntilSaturday === 0 ? 7 : daysUntilSaturday));
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Check if a date is Shabbat (Friday evening to Saturday evening)
 */
export const isShabbat = (date: Date = new Date()): boolean => {
  const day = date.getDay();
  const hours = date.getHours();

  // Friday after 18:00 (approximate sunset)
  if (day === 5 && hours >= 18) return true;

  // Saturday before 20:00 (approximate havdalah)
  if (day === 6 && hours < 20) return true;

  return false;
};

/**
 * Check if flow should be skipped due to Shabbat
 */
export const shouldSkipForShabbat = (
  triggerTime: Date,
  skipShabbat: boolean
): boolean => {
  if (!skipShabbat) return false;
  return isShabbat(triggerTime);
};

/**
 * Calculate approximate candle lighting time
 * This is a simplified calculation - uses 18 minutes before sunset
 * For accurate times, use the zmanService API
 */
export const calculateApproximateCandleLighting = (
  friday: Date,
  latitude: number = DEFAULT_LAT
): Date => {
  // Simplified sunset calculation
  // More accurate would require the SunCalc algorithm
  const date = new Date(friday);

  // Approximate sunset based on season and latitude
  // This is a rough approximation - Israel times vary from ~16:30 (winter) to ~19:45 (summer)
  const dayOfYear = getDayOfYear(date);
  const sunsetHour = 17 + 2 * Math.sin((dayOfYear - 80) * Math.PI / 182.5);

  date.setHours(Math.floor(sunsetHour), Math.round((sunsetHour % 1) * 60), 0, 0);

  // Subtract 18 minutes for candle lighting
  date.setMinutes(date.getMinutes() - 18);

  return date;
};

/**
 * Get day of year (1-365)
 */
const getDayOfYear = (date: Date): number => {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
};

/**
 * Calculate Shabbat trigger time based on offset from candle lighting
 */
export const calculateShabbatTrigger = (
  offsetMinutes: number = 30,
  candleLightingTime?: Date
): TriggerCalculation => {
  const now = new Date();
  const friday = getNextFriday(now);

  // Use provided candle lighting time or calculate approximate
  const candleLighting = candleLightingTime || calculateApproximateCandleLighting(friday);

  // Apply offset
  const triggerTime = new Date(candleLighting.getTime() - offsetMinutes * 60000);

  // Check if we've passed this week's trigger
  const isPastTrigger = now > triggerTime;

  // If past, calculate for next week
  const finalTrigger = isPastTrigger
    ? new Date(triggerTime.getTime() + 7 * 24 * 60 * 60 * 1000)
    : triggerTime;

  // Format display string
  const displayString = formatTriggerDisplay(finalTrigger);

  return {
    nextTriggerTime: finalTrigger,
    displayString,
    isActive: !isPastTrigger && isWithinTimeWindow(triggerTime),
  };
};

/**
 * Check if current time is within trigger window (within 2 hours)
 */
const isWithinTimeWindow = (triggerTime: Date, windowMinutes: number = 120): boolean => {
  const now = new Date();
  const diff = triggerTime.getTime() - now.getTime();
  return diff >= 0 && diff <= windowMinutes * 60000;
};

/**
 * Format trigger time for display
 */
export const formatTriggerDisplay = (
  date: Date,
  locale: string = 'he-IL'
): string => {
  const dayFormatter = new Intl.DateTimeFormat(locale, { weekday: 'long' });
  const timeFormatter = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const day = dayFormatter.format(date);
  const time = timeFormatter.format(date);

  return `${day} ${time}`;
};

/**
 * Parse time string (HH:MM) to minutes from midnight
 */
export const parseTimeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Convert minutes from midnight to time string (HH:MM)
 */
export const minutesToTimeString = (minutes: number): string => {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

/**
 * Check if current time is within a time range
 */
export const isWithinTimeRange = (
  startTime: string,
  endTime: string,
  currentTime?: string
): boolean => {
  const now = currentTime || getCurrentTimeString();
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  const currentMinutes = parseTimeToMinutes(now);

  // Handle overnight ranges (e.g., 22:00 - 06:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};

/**
 * Get current time as HH:MM string
 */
export const getCurrentTimeString = (): string => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

/**
 * Validate time string format (HH:MM)
 */
export const isValidTimeString = (time: string): boolean => {
  const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(time);
};

/**
 * Get user's geolocation (with permission)
 */
export const getUserLocation = (): Promise<{ lat: number; lon: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => {
        // Fall back to default (Jerusalem)
        resolve({ lat: DEFAULT_LAT, lon: DEFAULT_LON });
      },
      { timeout: 10000 }
    );
  });
};
