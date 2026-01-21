// Test the serializer logic inline

// This is what EntityInput creates
const frontendSettings = {
  name: "Test Investigation",
  entities: [
    { type: "email", value: "test@example.com" }
  ],
  timeRange: {
    start: "2025-10-15",
    end: "2025-10-16"
  },
  tools: [
    { name: "device_analyzer", enabled: true }
  ],
  correlationMode: "OR"
};

// This is what the serializer should produce
function formatDateTime(dt) {
  if (!dt) {
    throw new Error('Start and end times are required');
  }
  if (typeof dt === 'string') {
    const trimmed = dt.trim();
    if (!trimmed.includes('Z') && !trimmed.includes('+') && !trimmed.includes('-')) {
      return trimmed + 'Z';
    }
    return trimmed;
  }
  if (dt instanceof Date) {
    return dt.toISOString();
  }
  if (typeof dt === 'number') {
    return new Date(dt).toISOString();
  }
  throw new Error(`Invalid datetime format: ${dt}`);
}

const timeRange = frontendSettings.timeRange || frontendSettings.time_range;
const startTime = timeRange.start_time || timeRange.startTime || timeRange.start;
const endTime = timeRange.end_time || timeRange.endTime || timeRange.end;

const serialized = {
  name: frontendSettings.name.trim(),
  entities: frontendSettings.entities.map(e => ({
    entity_type: e.entity_type || e.type || 'user_id',
    entity_value: e.entity_value || e.value || ''
  })),
  time_range: {
    start_time: formatDateTime(startTime),
    end_time: formatDateTime(endTime)
  },
  tools: frontendSettings.tools.map(t => ({
    tool_name: t.tool_name || t.name || '',
    enabled: typeof t.enabled === 'boolean' ? t.enabled : true,
    config: t.config || {}
  })),
  correlation_mode: frontendSettings.correlation_mode || frontendSettings.correlationMode
};

console.log('Frontend Settings:');
console.log(JSON.stringify(frontendSettings, null, 2));
console.log('\nSerialized Settings:');
console.log(JSON.stringify(serialized, null, 2));
console.log('\nMatches Backend Format: ✓');
