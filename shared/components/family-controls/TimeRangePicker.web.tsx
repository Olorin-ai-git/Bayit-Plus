/**
 * Time Range Picker (Web Version) - Select viewing hours range.
 *
 * Supports:
 * - Start hour (0-23)
 * - End hour (0-23)
 * - Overnight ranges (e.g., 22:00 to 06:00)
 * - Visual 24-hour display
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface TimeRangePickerProps {
  startHour: number;
  endHour: number;
  onStartHourChange: (hour: number) => void;
  onEndHourChange: (hour: number) => void;
  disabled?: boolean;
}

const hours = Array.from({ length: 24 }, (_, i) => i);

const formatHour = (hour: number): string => {
  return `${hour.toString().padStart(2, '0')}:00`;
};

export const TimeRangePicker: React.FC<TimeRangePickerProps> = ({
  startHour,
  endHour,
  onStartHourChange,
  onEndHourChange,
  disabled = false,
}) => {
  const isOvernightRange = startHour > endHour;

  const handleStartChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onStartHourChange(Number(event.target.value));
  };

  const handleEndChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onEndHourChange(Number(event.target.value));
  };

  return (
    <View style={[styles.container, disabled && styles.containerDisabled]}>
      <Text style={styles.label}>Allowed Viewing Hours</Text>
      <Text style={styles.description}>
        Content will be accessible only during these hours
      </Text>

      <View style={styles.pickers}>
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Start Time</Text>
          <View style={styles.pickerWrapper}>
            <select
              value={startHour}
              onChange={handleStartChange}
              disabled={disabled}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23A855F7' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                paddingRight: '36px',
              }}
            >
              {hours.map((hour) => (
                <option key={hour} value={hour} style={{ backgroundColor: '#1a1a1a', color: '#fff' }}>
                  {formatHour(hour)}
                </option>
              ))}
            </select>
          </View>
        </View>

        <Text style={styles.separator}>to</Text>

        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>End Time</Text>
          <View style={styles.pickerWrapper}>
            <select
              value={endHour}
              onChange={handleEndChange}
              disabled={disabled}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23A855F7' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                paddingRight: '36px',
              }}
            >
              {hours.map((hour) => (
                <option key={hour} value={hour} style={{ backgroundColor: '#1a1a1a', color: '#fff' }}>
                  {formatHour(hour)}
                </option>
              ))}
            </select>
          </View>
        </View>
      </View>

      {isOvernightRange && (
        <View style={styles.warning}>
          <Text style={styles.warningText}>
            ⚠️ Overnight range: Viewing allowed from {formatHour(startHour)} to{' '}
            {formatHour(endHour)} the next day
          </Text>
        </View>
      )}

      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          {isOvernightRange
            ? `Blocked: ${formatHour(endHour)} - ${formatHour(startHour)}`
            : `Allowed: ${formatHour(startHour)} - ${formatHour(endHour)}`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  containerDisabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 16,
  },
  pickers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pickerContainer: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 4,
  },
  pickerWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  separator: {
    color: '#888',
    fontSize: 14,
    paddingTop: 20,
  },
  warning: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  warningText: {
    color: '#f59e0b',
    fontSize: 14,
  },
  summary: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  summaryText: {
    color: '#A855F7',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
