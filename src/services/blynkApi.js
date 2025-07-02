import axios from 'axios';

// Blynk API configuration
const BLYNK_BASE_URL = 'https://blynk.cloud/external/api';
const BLYNK_TOKEN = 'fvgXU3TNYRZHMdJ52KDiINvyxbiqicK2';

// Create axios instance for Blynk API
const blynkApi = axios.create({
    baseURL: BLYNK_BASE_URL,
    timeout: 10000, // 10 seconds timeout
});

/**
 * Fetch current data from Blynk virtual pin
 * @param {string} pin - Virtual pin identifier (e.g., 'V1', 'V2')
 * @returns {Promise<number>} Current value from the pin
 */
export const getCurrentData = async (pin = 'V1') => {
    try {
        const response = await blynkApi.get(`/get`, {
            params: {
                token: BLYNK_TOKEN,
                pin: pin
            }
        });

        // Blynk API returns data in different formats, handle both array and direct value
        const data = response.data;
        const value = Array.isArray(data) ? data[0] : data;

        return parseFloat(value) || 0;
    } catch (error) {
        console.warn(`Failed to fetch data from pin ${pin}:`, error.message);
        // Return fallback values for demonstration
        const fallbackValues = {
            'V1': 5.2,  // Current            'V2': 220,  // Voltage  
            'V3': 1144, // Power
            'V4': 1080  // Energy
        };
        return fallbackValues[pin] || 0;
    }
};

/**
 * Fetch multiple pins data at once
 * @param {string[]} pins - Array of pin identifiers
 * @returns {Promise<Object>} Object with pin as key and value as data
 */
export const getMultiplePinsData = async (pins = ['V1', 'V2', 'V3', 'V4']) => {
    try {
        const promises = pins.map(pin => getCurrentData(pin));
        const results = await Promise.all(promises);

        const data = {};
        pins.forEach((pin, index) => {
            data[pin] = results[index];
        });

        return data;
    } catch (error) {
        console.error('Error fetching multiple pins data:', error);

        // Return fallback data
        return {
            'V1': 5.2,  // Current (A)
            'V2': 220,  // Voltage (V)
            'V3': 1144, // Power (W)
            'V4': 1080  // Energy (Wh)
        };
    }
};

/**
 * Update device virtual pin value (for controlling devices)
 * @param {string} pin - Virtual pin identifier
 * @param {number|string} value - Value to set
 * @returns {Promise<boolean>} Success status
 */
export const updatePinValue = async (pin, value) => {
    try {
        await blynkApi.get(`/update`, {
            params: {
                token: BLYNK_TOKEN,
                pin: pin,
                value: value
            }
        });

        return true;
    } catch (error) {
        console.error(`Error updating pin ${pin} with value ${value}:`, error);
        return false;
    }
};

/**
 * Get device status and connection info
 * @returns {Promise<Object>} Device status information
 */
export const getDeviceStatus = async () => {
    try {
        const response = await blynkApi.get(`/isHardwareConnected`, {
            params: {
                token: BLYNK_TOKEN
            }
        });

        return {
            isConnected: response.data === true || response.data === 'true',
            lastUpdate: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error checking device status:', error);
        return {
            isConnected: false,
            lastUpdate: new Date().toISOString(),
            error: error.message
        };
    }
};
