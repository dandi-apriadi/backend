/**
 * Enhanced sensor data validation utility with comprehensive checks
 * for data integrity, plausibility and quality assessment.
 */

// Constants for validation
const VOLTAGE_RANGE = { min: 0, max: 250, unit: 'V' };
const CURRENT_RANGE = { min: 0, max: 15, unit: 'A' };
const POWER_RANGE = { min: 0, max: 3000, unit: 'W' };
const ENERGY_RANGE = { min: 0, max: 100000, unit: 'Wh' };

/**
 * Validates the type and converts value to appropriate type
 * @param {*} value Value to validate
 * @param {string} expectedType Expected type ('number', 'boolean', etc)
 * @param {*} defaultValue Default value to use if invalid
 * @returns {*} Validated and converted value
 */
export const validateAndConvertType = (value, expectedType, defaultValue) => {
    if (value === undefined || value === null) return defaultValue;

    switch (expectedType) {
        case 'number':
            // Handle various formats of numbers
            if (typeof value === 'number') return isNaN(value) ? defaultValue : value;
            if (typeof value === 'string') {
                const parsed = parseFloat(value);
                return isNaN(parsed) ? defaultValue : parsed;
            }
            return defaultValue;

        case 'boolean':
            // Handle various formats of booleans
            if (typeof value === 'boolean') return value;
            if (typeof value === 'number') return value !== 0;
            if (typeof value === 'string') {
                const lowered = value.toLowerCase();
                if (['true', '1', 'yes', 'on'].includes(lowered)) return true;
                if (['false', '0', 'no', 'off'].includes(lowered)) return false;
            }
            return defaultValue;

        case 'string':
            if (typeof value === 'string') return value;
            if (value === null || value === undefined) return defaultValue;
            return String(value);

        case 'date':
            if (value instanceof Date) return value;
            if (typeof value === 'string') {
                const date = new Date(value);
                return isNaN(date.getTime()) ? defaultValue : date;
            }
            if (typeof value === 'number') return new Date(value);
            return defaultValue;

        default:
            return value;
    }
};

/**
 * Validates if a value is within expected range
 * @param {number} value Value to check
 * @param {Object} range Range object with min and max
 * @returns {boolean} True if value is within range
 */
export const isWithinRange = (value, range) => {
    if (typeof value !== 'number' || isNaN(value)) return false;
    return value >= range.min && value <= range.max;
};

/**
 * Perform a comprehensive validation of sensor data
 * @param {Object} data The sensor data to validate
 * @returns {Object} Validation result with validated data and quality assessment
 */
export const validateSensorData = (data) => {
    if (!data) return { isValid: false, data: null, qualityScore: 0 };

    // Start with a perfect score and deduct points for issues
    let qualityScore = 100;
    const validationIssues = [];

    // Create validated data object with converted types
    const validatedData = {
        device_id: validateAndConvertType(data.device_id, 'string', 'unknown'),
        voltage: validateAndConvertType(data.voltage, 'number', 0),
        current: validateAndConvertType(data.current, 'number', 0),
        power: validateAndConvertType(data.power, 'number', 0),
        energy: validateAndConvertType(data.energy, 'number', 0),
        pir_status: validateAndConvertType(data.pir_status, 'boolean', false),
        pump_status: validateAndConvertType(data.pump_status, 'boolean', false),
        auto_mode: validateAndConvertType(data.auto_mode, 'boolean', true),
        timestamp: validateAndConvertType(data.timestamp || data.received_at, 'date', new Date())
    };

    // Check for missing required fields
    const requiredFields = ['voltage', 'current', 'power'];
    const missingFields = requiredFields.filter(field =>
        data[field] === undefined || data[field] === null
    );

    if (missingFields.length > 0) {
        qualityScore -= missingFields.length * 20; // Deduct 20 points per missing field
        validationIssues.push({
            type: 'missing_fields',
            fields: missingFields
        });
    }

    // Check value ranges for electrical measurements
    if (!isWithinRange(validatedData.voltage, VOLTAGE_RANGE)) {
        qualityScore -= 15;
        validationIssues.push({
            type: 'out_of_range',
            field: 'voltage',
            value: validatedData.voltage,
            range: VOLTAGE_RANGE
        });
    }

    if (!isWithinRange(validatedData.current, CURRENT_RANGE)) {
        qualityScore -= 15;
        validationIssues.push({
            type: 'out_of_range',
            field: 'current',
            value: validatedData.current,
            range: CURRENT_RANGE
        });
    }

    if (!isWithinRange(validatedData.power, POWER_RANGE)) {
        qualityScore -= 15;
        validationIssues.push({
            type: 'out_of_range',
            field: 'power',
            value: validatedData.power,
            range: POWER_RANGE
        });
    }

    if (!isWithinRange(validatedData.energy, ENERGY_RANGE)) {
        qualityScore -= 10;
        validationIssues.push({
            type: 'out_of_range',
            field: 'energy',
            value: validatedData.energy,
            range: ENERGY_RANGE
        });
    }

    // Check data consistency (power should be approximately voltage * current)
    const calculatedPower = validatedData.voltage * validatedData.current;
    const powerDifference = Math.abs(calculatedPower - validatedData.power);
    const powerThreshold = Math.max(5, calculatedPower * 0.1); // 10% tolerance or minimum 5W

    if (validatedData.voltage > 0 && validatedData.current > 0 && powerDifference > powerThreshold) {
        qualityScore -= 15;
        validationIssues.push({
            type: 'consistency_error',
            message: 'Power value inconsistent with voltage and current',
            expected: calculatedPower,
            actual: validatedData.power,
            difference: powerDifference
        });
    }

    // Check timestamp freshness
    const now = new Date();
    const timestampDate = validatedData.timestamp instanceof Date
        ? validatedData.timestamp
        : new Date(validatedData.timestamp);

    const dataAge = now - timestampDate;

    if (isNaN(dataAge)) {
        qualityScore -= 10;
        validationIssues.push({
            type: 'invalid_timestamp',
            timestamp: data.timestamp
        });
        // Set to current time as fallback
        validatedData.timestamp = new Date();
    } else if (dataAge > 60000) { // Older than 1 minute
        qualityScore -= Math.min(20, Math.floor(dataAge / 6000)); // Up to 20 points off for old data
        validationIssues.push({
            type: 'stale_data',
            age: Math.round(dataAge / 1000),
            timestamp: timestampDate
        });
    }

    // Check for all-zero values which often indicates sensor issues
    if (validatedData.voltage === 0 && validatedData.current === 0 && validatedData.power === 0) {
        qualityScore -= 25;
        validationIssues.push({
            type: 'all_zeros',
            message: 'All electrical measurements are zero, possible sensor disconnect'
        });
    }

    // Ensure score is within 0-100 range
    qualityScore = Math.max(0, Math.min(100, qualityScore));

    // Determine overall validity based on quality score
    const isValid = qualityScore >= 40; // At least 40% quality to be considered valid

    return {
        isValid,
        data: validatedData,
        qualityScore,
        validationIssues,
        timestamp: new Date()
    };
};

export default {
    validateSensorData,
    validateAndConvertType,
    isWithinRange
};
