import { logSensorDataTable } from './consoleLogger.js';

/**
 * ESP32 Sensor Data Processing Utility
 * Handles data validation, normalization, and transformation
 */

/**
 * Process and standardize ESP32 sensor data format
 * Validates data structure and transforms it to a consistent format for storage and broadcast
 */
export const processESP32Data = (rawData) => {
    try {
        // Extract base data with defaults for missing values
        const processed = {
            device_id: rawData.device_id || 'unknown',
            timestamp: rawData.timestamp || new Date().toISOString(),
            // Process electrical readings
            voltage: parseFloat(rawData.voltage || rawData.electrical?.voltage || 0),
            current: parseFloat(rawData.current || rawData.electrical?.current || 0),
            power: parseFloat(rawData.power || rawData.electrical?.power || 0),
            energy: parseFloat(rawData.energy || rawData.electrical?.energy || 0),
            // Process status fields
            pir_status: rawData.pir_status !== undefined ? !!rawData.pir_status :
                rawData.status?.pir !== undefined ? !!rawData.status.pir : false,
            pump_status: rawData.pump_status !== undefined ? !!rawData.pump_status :
                rawData.status?.pump !== undefined ? !!rawData.status.pump : false,
            auto_mode: rawData.auto_mode !== undefined ? !!rawData.auto_mode :
                rawData.status?.auto_mode !== undefined ? !!rawData.status.auto_mode : true,
            // Add received timestamp for data processing metrics
            received_at: new Date().toISOString(),
            processed_at: new Date().toISOString()
        };

        return processed;
    } catch (error) {
        console.error('Error processing ESP32 data:', error);
        // Return minimal valid structure if processing fails
        return {
            device_id: rawData.device_id || 'unknown',
            timestamp: new Date().toISOString(),
            voltage: 0, current: 0, power: 0, energy: 0,
            pir_status: false, pump_status: false, auto_mode: true,
            received_at: new Date().toISOString(),
            processed_at: new Date().toISOString(),
            error: error.message
        };
    }
};

/**
 * Extract numeric database ID for a device from device record or connections
 * Used to optimize database operations
 */
export const getDeviceDatabaseId = (deviceId, connections, deviceRecord = null) => {
    // If we have a device record with ID, use that
    if (deviceRecord && deviceRecord.device_id) {
        return deviceRecord.device_id;
    }

    // Try to get from connections
    if (connections && typeof connections.get === 'function' && connections.has(deviceId)) {
        const connection = connections.get(deviceId);
        if (connection && connection.dbDeviceId) {
            return connection.dbDeviceId;
        }
    }

    // We couldn't find a database ID
    return null;
};

/**
 * Validate and normalize ESP32 sensor values
 */
export const validateSensorValues = (data) => {
    return {
        voltage: isValidNumber(data.voltage) ? Math.max(0, Math.min(250, parseFloat(data.voltage))) : 0,
        current: isValidNumber(data.current) ? Math.max(0, Math.min(20, parseFloat(data.current))) : 0,
        power: isValidNumber(data.power) ? Math.max(0, Math.min(5000, parseFloat(data.power))) : 0,
        energy: isValidNumber(data.energy) ? Math.max(0, parseFloat(data.energy)) : 0,
        pir_status: !!data.pir_status,
        pump_status: !!data.pump_status,
        auto_mode: data.auto_mode === undefined ? true : !!data.auto_mode
    };
};

/**
 * Helper to check if value is valid number
 */
const isValidNumber = (value) => {
    if (value === undefined || value === null) return false;
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num);
};
