/**
 * Cron Expression Parser Utility
 *
 * Converts cron expressions into human-readable schedule descriptions.
 */

/**
 * Parse cron expression and make it human-readable
 *
 * Supports common patterns:
 * - Daily: "0 2 * * *" -> "Daily at 02:00"
 * - Weekly: "0 3 * * 0" -> "Weekly on Sunday at 03:00"
 *
 * @param cron - Cron expression (5-part format)
 * @param t - Translation function
 * @returns Human-readable schedule string
 *
 * @example
 * ```ts
 * parseCronToHumanReadable("0 2 * * *", t) // "Daily at 02:00"
 * parseCronToHumanReadable("0 3 * * 0", t) // "Weekly on Sunday at 03:00"
 * ```
 */
export const parseCronToHumanReadable = (cron: string, t: any): string => {
  const parts = cron.split(' ');
  if (parts.length < 5) return cron;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Daily pattern: "0 2 * * *"
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return t('admin.librarian.schedules.patterns.daily', { hour, minute });
  }

  // Weekly pattern: "0 3 * * 0" (Sunday)
  if (dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = t(`admin.librarian.schedules.days.${days[parseInt(dayOfWeek)]}`);
    return t('admin.librarian.schedules.patterns.weekly', { day: dayName, hour, minute });
  }

  return cron; // Fallback to raw cron
};
