/**
 * Input validators for analytics microservice.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

export const validateDateRange = (
  startDate: string,
  endDate: string
): { valid: boolean; error?: string } => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime())) {
    return { valid: false, error: 'Invalid start date' };
  }

  if (isNaN(end.getTime())) {
    return { valid: false, error: 'Invalid end date' };
  }

  if (start > end) {
    return { valid: false, error: 'Start date must be before end date' };
  }

  const maxDays = parseInt(
    process.env.REACT_APP_MAX_DATE_RANGE_DAYS || '365',
    10
  );
  const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

  if (daysDiff > maxDays) {
    return {
      valid: false,
      error: `Date range cannot exceed ${maxDays} days`,
    };
  }

  return { valid: true };
};

export const validateTimeWindow = (
  window: string
): { valid: boolean; error?: string } => {
  const validWindows = ['1h', '24h', '7d', '30d', '90d', 'all'];
  if (!validWindows.includes(window)) {
    return {
      valid: false,
      error: `Time window must be one of: ${validWindows.join(', ')}`,
    };
  }
  return { valid: true };
};

export const validateCohortDimension = (
  dimension: string
): { valid: boolean; error?: string } => {
  const validDimensions = [
    'merchant',
    'channel',
    'geography',
    'device',
    'risk_band',
    'model_version',
    'rule_version',
  ];
  if (!validDimensions.includes(dimension)) {
    return {
      valid: false,
      error: `Dimension must be one of: ${validDimensions.join(', ')}`,
    };
  }
  return { valid: true };
};

