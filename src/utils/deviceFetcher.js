import axios from 'axios';

// Import from centralized config - NO HARDCODE FALLBACK
const API_BASE_URL = process.env.REACT_APP_API_URL;

export const fetchDeviceData = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/esp32/devices`);

        if (response.data && response.data.status === 'success') {
            return {
                success: true,
                data: response.data.data || [],
                error: null
            };
        } else {
            return {
                success: false,
                data: [],
                error: 'Invalid response format'
            };
        }
    } catch (error) {
        return {
            success: false,
            data: [],
            error: error.message || 'Failed to fetch device data'
        };
    }
};
