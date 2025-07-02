/**
 * API Configuration
 * Centralized configuration for all API endpoints and URLs
 * This file helps maintain consistency across the application
 */

// Base URLs from environment variables - NO HARDCODE FALLBACK
export const API_CONFIG = {
    // Backend server base URL (without /api)
    BASE_URL: process.env.REACT_APP_API_BASE_URL,

    // API endpoint base URL (with /api)
    API_URL: process.env.REACT_APP_API_URL,

    // WebSocket server URL
    SOCKET_URL: process.env.REACT_APP_SOCKET_URL,

    // WebSocket endpoint
    WS_ENDPOINT: '/ws',

    // Default timeout for requests
    TIMEOUT: 10000,

    // Request retry configuration
    RETRY: {
        attempts: 3,
        delay: 1000
    }
};

// API endpoints
export const API_ENDPOINTS = {
    // Authentication
    AUTH: {
        LOGIN: '/login',
        LOGOUT: '/logout',
        ME: '/me',
        REFRESH: '/refresh'
    },

    // ESP32 Device endpoints
    ESP32: {
        DATA: '/esp32/data',
        DEVICES: '/esp32/devices',
        DASHBOARD_SUMMARY: (deviceId, timeframe) => `/esp32/dashboard-summary/${deviceId}?timeframe=${timeframe}`,
        ENERGY_TRENDS: (deviceId, timeframe) => `/esp32/energy-trends/${deviceId}?timeframe=${timeframe}`,
        ENERGY_TRENDS_LATEST: (deviceId) => `/esp32/energy-trends/latest/${deviceId}`,
        PING: '/esp32/ping',
        COMMAND: (deviceId) => `/esp32/command/${deviceId}`
    },

    // Sensor data endpoints
    SENSOR: {
        LATEST: (deviceId) => `/sensor/latest/${deviceId}`,
        HISTORY: (deviceId, timeframe) => `/sensor/history/${deviceId}?timeframe=${timeframe}`,
        STATS: (deviceId, period) => `/sensor/stats/${deviceId}?period=${period}`
    },

    // Device management
    DEVICES: {
        LIST: '/devices',
        STATUS: (deviceId) => `/devices/status/${deviceId}`,
        UPDATE: (deviceId) => `/devices/${deviceId}`
    },

    // Analytics
    ANALYTICS: {
        ENERGY_CONSUMPTION: (deviceId, period) => `/analytics/energy/${deviceId}?period=${period}`,
        DEVICE_PERFORMANCE: (deviceId) => `/analytics/performance/${deviceId}`,
        TRENDS: '/analytics/trends'
    }
};

// WebSocket events
export const WS_EVENTS = {
    // Connection events
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    CONNECT_ERROR: 'connect_error',
    RECONNECT: 'reconnect',

    // Data events
    SENSOR_DATA: 'sensor_data',
    DEVICE_STATUS: 'device_status',
    ENERGY_UPDATE: 'energy_update',

    // Command events
    PUMP_CONTROL: 'pump_control',
    DEVICE_COMMAND: 'device_command'
};

// Default configurations
export const DEFAULT_CONFIG = {
    DEVICE_ID: 'ESP32-PUMP-01',
    REFRESH_INTERVAL: 5000,
    CHART_REFRESH_INTERVAL: 30000,
    CONNECTION_TIMEOUT: 5000,
    DISCONNECTION_THRESHOLD: 30000
};

export default API_CONFIG;
