/**
 * Dummy data for dashboard components to display UI design
 * without relying on real-time data connections
 */

// Current sensor data reading
export const dummySensorData = {
    voltage: 221.5,
    current: 5.27,
    power: 1165.4,
    energy: 1082.3,
    pir_status: true,
    pump_status: true,
    auto_mode: false,
    timestamp: new Date().toISOString()
};

// Historical sensor readings for charts
export const dummySensorHistory = Array(24).fill(0).map((_, i) => {
    const date = new Date();
    date.setHours(date.getHours() - (24 - i));

    return {
        timestamp: date.toISOString(),
        voltage: 220 + (Math.random() * 5 - 2.5),
        current: 5 + (Math.random() * 1 - 0.5),
        power: 1100 + (Math.random() * 150 - 75),
        energy: 1080 + (Math.random() * 10 - 5),
        pir_status: Math.random() > 0.7,
        pump_status: i % 8 < 4,
        auto_mode: true
    };
});

// Devices list
export const dummyDevices = [
    { device_id: 'ESP32-PUMP-01', status: 'aktif', last_seen: new Date().toISOString() },
    { device_id: 'ESP32-SENSOR-02', status: 'nonaktif', last_seen: new Date(Date.now() - 86400000).toISOString() }
];

// Device status information
export const dummyDeviceStatus = {
    'ESP32-PUMP-01': { database_status: 'aktif', last_seen: new Date().toISOString() },
    'ESP32-SENSOR-02': { database_status: 'nonaktif', last_seen: new Date(Date.now() - 86400000).toISOString() }
};

// Online status for devices
export const dummyDeviceOnlineStatus = {
    'ESP32-PUMP-01': true,
    'ESP32-SENSOR-02': false
};

// Dummy daily consumption data
export const dummyDailyData = {
    hourly_data: Array(24).fill(0).map((_, i) => ({
        hour: new Date().setHours(i, 0, 0, 0),
        avg_power: Math.round(800 + Math.random() * 400)
    })),
    summary: {
        total_energy_kwh: 12.45,
        avg_daily_energy_kwh: 2.4
    }
};

// Dummy statistics data
export const dummyStatsData = {
    summary: {
        voltage: { min: 215.2, avg: 220.5, max: 228.7 },
        current: { min: 4.85, avg: 5.2, max: 5.95 },
        power: { min: 1050, avg: 1144, max: 1320 },
        pir_activity: { count: 15, percentage: 35 },
        pump_activity: { count: 42, percentage: 29 }
    },
    time: {
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date().toISOString()
    },
    count: 96
};

// Dummy connection status
export const dummyConnectionStatus = {
    isConnected: true,
    lastUpdate: new Date().toISOString(),
    deviceName: 'ESP32-PUMP-01'
};

// Additional dummy model data
export const dummyModelData = {
    notifications: [
        { id: 1, message: 'Pump activated', timestamp: new Date().toISOString(), read: false },
        { id: 2, message: 'Motion detected', timestamp: new Date(Date.now() - 3600000).toISOString(), read: true }
    ],
    sprayingLogs: [
        { id: 1, device_id: 'ESP32-PUMP-01', start_time: new Date(Date.now() - 7200000).toISOString(), end_time: new Date(Date.now() - 7140000).toISOString(), duration_seconds: 60 },
        { id: 2, device_id: 'ESP32-PUMP-01', start_time: new Date(Date.now() - 3600000).toISOString(), end_time: new Date(Date.now() - 3540000).toISOString(), duration_seconds: 60 }
    ],
    settings: [
        { id: 1, key: 'schedule_enabled', value: 'true', description: 'Enable automatic scheduling' },
        { id: 2, key: 'motion_trigger', value: 'true', description: 'Trigger spray on motion' }
    ]
};
