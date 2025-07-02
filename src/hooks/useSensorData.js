import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useESP32Data } from './useESP32Data';

// Base URL for API requests - NO HARDCODE FALLBACK
const API_BASE_URL = process.env.REACT_APP_API_URL;

/**
 * Custom hook for accessing ESP32 sensor data with enhanced querying capabilities
 */
const useSensorData = (initialDeviceId = 'ESP32-PUMP-01') => {
    // Get base ESP32 data from the websocket connection
    const {
        sensorData: realtimeData,
        lastUpdate: realtimeLastUpdate,
        isConnected,
        sendCommand
    } = useESP32Data();

    // Additional state for specialized data requests
    const [deviceId, setDeviceId] = useState(initialDeviceId);
    const [historyData, setHistoryData] = useState([]);
    const [dailyData, setDailyData] = useState(null);
    const [statsData, setStatsData] = useState(null);
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState({
        history: false,
        daily: false,
        stats: false,
        devices: false
    });
    const [error, setError] = useState(null);

    // Fetch historical data with advanced filtering
    const fetchHistory = useCallback(async (targetDeviceId = deviceId, options = {}) => {
        const {
            timeframe = '24h',
            startDate,
            endDate,
            interval = 'minute',
            format = 'aggregated'
        } = options;

        setLoading(prev => ({ ...prev, history: true }));
        setError(null);

        try {
            // Build query parameters
            const params = new URLSearchParams();
            if (timeframe) params.append('timeframe', timeframe);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            if (interval) params.append('interval', interval);
            if (format) params.append('format', format);

            const response = await axios.get(
                `${API_BASE_URL}/esp32/data/history/${targetDeviceId}?${params.toString()}`
            );

            if (response.data && response.data.status === 'success') {
                setHistoryData(response.data.data || []);
                return response.data;
            } else {
                const errorMsg = response.data?.message || 'Failed to fetch history data';
                setError(errorMsg);
                setHistoryData([]);
                return { error: errorMsg };
            }
        } catch (err) {
            const errorMsg = err.message || 'Error fetching history data';
            console.error(errorMsg, err);
            setError(errorMsg);
            setHistoryData([]);
            return { error: errorMsg };
        } finally {
            setLoading(prev => ({ ...prev, history: false }));
        }
    }, [deviceId]);

    // Fetch daily energy consumption data
    const fetchDailyConsumption = useCallback(async (targetDeviceId = deviceId) => {
        setLoading(prev => ({ ...prev, daily: true }));
        setError(null);

        try {
            const response = await axios.get(`${API_BASE_URL}/esp32/data/daily/${targetDeviceId}`);

            if (response.data && response.data.status === 'success') {
                setDailyData(response.data);
                return response.data;
            } else {
                const errorMsg = response.data?.message || 'Failed to fetch daily consumption data';
                setError(errorMsg);
                setDailyData(null);
                return { error: errorMsg };
            }
        } catch (err) {
            const errorMsg = err.message || 'Error fetching daily consumption';
            console.error(errorMsg, err);
            setError(errorMsg);
            setDailyData(null);
            return { error: errorMsg };
        } finally {
            setLoading(prev => ({ ...prev, daily: false }));
        }
    }, [deviceId]);

    // Fetch device list
    const fetchDevices = useCallback(async () => {
        setLoading(prev => ({ ...prev, devices: true }));

        try {
            const response = await axios.get(`${API_BASE_URL}/esp32/devices`);

            if (response.data && response.data.status === 'success') {
                setDevices(response.data.data || []);
                return response.data.data;
            } else {
                setDevices([]);
                return [];
            }
        } catch (err) {
            console.error('Error fetching devices:', err);
            setDevices([]);
            return [];
        } finally {
            setLoading(prev => ({ ...prev, devices: false }));
        }
    }, []);

    // Fetch aggregate statistics
    const fetchStats = useCallback(async (targetDeviceId = deviceId, period = '7d') => {
        setLoading(prev => ({ ...prev, stats: true }));
        setError(null);

        try {
            const response = await axios.get(
                `${API_BASE_URL}/esp32/data/stats/${targetDeviceId}?period=${period}`
            );

            if (response.data && response.data.status === 'success') {
                setStatsData(response.data);
                return response.data;
            } else {
                const errorMsg = response.data?.message || 'Failed to fetch statistics';
                setError(errorMsg);
                setStatsData(null);
                return { error: errorMsg };
            }
        } catch (err) {
            const errorMsg = err.message || 'Error fetching statistics';
            console.error(errorMsg, err);
            setError(errorMsg);
            setStatsData(null);
            return { error: errorMsg };
        } finally {
            setLoading(prev => ({ ...prev, stats: false }));
        }
    }, [deviceId]);

    // Change active device
    const changeDevice = useCallback((newDeviceId) => {
        setDeviceId(newDeviceId);
    }, []);

    // Fetch all data for initial load
    const fetchAllData = useCallback(() => {
        Promise.all([
            fetchHistory(deviceId),
            fetchDailyConsumption(deviceId),
            fetchStats(deviceId),
            fetchDevices()
        ]).catch(err => {
            console.error('Error fetching initial data:', err);
        });
    }, [fetchHistory, fetchDailyConsumption, fetchStats, fetchDevices, deviceId]);

    // Initial data load
    useEffect(() => {
        fetchAllData();

        // Set up auto-refresh interval
        const refreshInterval = setInterval(() => {
            if (!isConnected) {
                fetchHistory(deviceId, { timeframe: '1h' }).catch(() => { });
            }
        }, 30000); // every 30 seconds if websocket is down

        return () => clearInterval(refreshInterval);
    }, [deviceId, fetchAllData, isConnected]);

    // Toggle pump status
    const togglePump = useCallback(async (newStatus) => {
        try {
            return await sendCommand(deviceId, 'pump', { status: newStatus });
        } catch (err) {
            console.error('Error toggling pump:', err);
            throw err;
        }
    }, [deviceId, sendCommand]);

    return {
        deviceId,
        changeDevice,
        // Real-time data from websocket
        sensorData: realtimeData,
        lastUpdate: realtimeLastUpdate,
        isConnected,
        // Historical data from API
        historyData,
        dailyData,
        statsData,
        devices,
        loading,
        error,
        // Action methods
        fetchHistory,
        fetchDailyConsumption,
        fetchStats,
        fetchDevices,
        fetchAllData,
        togglePump
    };
};

export default useSensorData;
