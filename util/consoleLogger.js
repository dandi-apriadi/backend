/**
 * Console logger utility - Modified to display JSON instead of tables
 * Removed chalk dependency to prevent module errors
 */

// Log sensor data as JSON
export const logSensorDataTable = (data) => {
  const timestamp = new Date().toISOString();
  const logPrefix = `[SENSOR_DATA] ${timestamp}`;

  // Format data as JSON
  console.log(`${logPrefix}\n${JSON.stringify({
    device_id: data.device_id || 'unknown',
    timestamp: data.timestamp || new Date().toISOString(),
    electrical: {
      voltage: parseFloat(data.voltage) || 0,
      current: parseFloat(data.current) || 0,
      power: parseFloat(data.power) || 0,
      energy: parseFloat(data.energy) || 0
    },
    status: {
      pir: !!data.pir_status,
      pump: !!data.pump_status,
      auto_mode: !!data.auto_mode
    }
  }, null, 2)}`);
};

// Log device events as JSON
export const logDeviceEventTable = (deviceId, eventType, message) => {
  const timestamp = new Date().toISOString();
  const logPrefix = `[DEVICE_EVENT] ${timestamp}`;

  console.log(`${logPrefix}\n${JSON.stringify({
    device_id: deviceId,
    event_type: eventType,
    message: message,
    timestamp: timestamp
  }, null, 2)}`);
};

// Log errors as JSON
export const logErrorTable = (source, errorMessage) => {
  const timestamp = new Date().toISOString();
  const logPrefix = `[ERROR] ${timestamp}`;

  console.log(`${logPrefix}\n${JSON.stringify({
    source: source,
    error: errorMessage,
    timestamp: timestamp
  }, null, 2)}`);
};

// Log device status as JSON
export const logDeviceStatusTable = (deviceId, status, details) => {
  const timestamp = new Date().toISOString();
  const logPrefix = `[DEVICE_STATUS] ${timestamp}`;

  console.log(`${logPrefix}\n${JSON.stringify({
    device_id: deviceId,
    status: status,
    details: details,
    timestamp: timestamp
  }, null, 2)}`);
};

// Log metrics data as JSON
export const logMetricsTable = (metricType, metrics) => {
  const timestamp = new Date().toISOString();
  const logPrefix = `[METRICS] ${timestamp}`;

  console.log(`${logPrefix}\n${JSON.stringify({
    metric_type: metricType,
    timestamp: timestamp,
    values: metrics
  }, null, 2)}`);
};
