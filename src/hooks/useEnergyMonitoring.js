import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// API URL - NO HARDCODE FALLBACK
const API_BASE_URL = process.env.REACT_APP_API_URL;

/**
 * Hook for monitoring and managing energy data from ESP32 devices
 * @param {Object} options - Configuration options
 * @param {string} options.deviceId - Device ID to monitor
 * @param {number} options.refreshInterval - Data refresh interval in ms
 * @param {string} options.defaultTimeframe - Default timeframe for data
 * @returns {Object} Energy monitoring state and functions
 */
export function useEnergyMonitoring({
    deviceId = 'ESP32-PUMP-01',
    refreshInterval = 30000,
    defaultTimeframe = '24h',
} = {}) {
    const [energyData, setEnergyData] = useState([]);
    const [electricalData, setElectricalData] = useState([]);
    const [timeframe, setTimeframe] = useState(defaultTimeframe);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({
        voltage: { min: 0, max: 0, avg: 0 },
        current: { min: 0, max: 0, avg: 0 },
        power: { min: 0, max: 0, avg: 0 },
        energy: { min: 0, max: 0, avg: 0 },
        daily: { usage: 0, cost: 0 }
    });
    const [lastUpdated, setLastUpdated] = useState(null);

    // Fetch energy data from backend
    const fetchEnergyData = useCallback(async () => {
        try {
            setLoading(true);

            // Fetch dashboard summary data
            const response = await axios.get(
                `${API_BASE_URL}/esp32/dashboard-summary/${deviceId}?timeframe=${timeframe}`
            );

            if (response.data && response.data.status === 'success') {
                const { electrical_chart, energy_trends, latest_data } = response.data;

                if (electrical_chart && electrical_chart.data) {
                    setElectricalData(electrical_chart.data);
                    setStats(prev => ({
                        ...prev,
                        ...electrical_chart.stats
                    }));
                }

                if (energy_trends && energy_trends.data) {
                    setEnergyData(energy_trends.data);
                }

                if (latest_data && latest_data.summary) {
                    setStats(prev => ({
                        ...prev,
                        daily: {
                            usage: latest_data.summary.total_energy_24h || 0,
                            cost: (latest_data.summary.total_energy_24h || 0) * 1500, // 1500 IDR per kWh
                            estimated_monthly: (latest_data.summary.estimated_daily_kwh || 0) * 30 * 1500
                        }
                    }));
                }

                setLastUpdated(new Date());
                setError(null);
            } else {
                console.warn('Invalid response format:', response.data);
            }
        } catch (err) {
            console.error('Error fetching energy data:', err);
            setError(err.message || 'Failed to fetch energy data');
        } finally {
            setLoading(false);
        }
    }, [deviceId, timeframe]);

    // Fetch power consumption statistics specifically
    const fetchPowerStats = useCallback(async (period = 'day') => {
        try {
            const response = await axios.get(
                `${API_BASE_URL}/esp32/power-stats/${deviceId}?period=${period}`
            );

            if (response.data && response.data.status === 'success') {
                return response.data.stats;
            }
            return null;
        } catch (err) {
            console.error('Error fetching power stats:', err);
            return null;
        }
    }, [deviceId]);

    // Handle timeframe change
    const changeTimeframe = (newTimeframe) => {
        if (newTimeframe !== timeframe) {
            setTimeframe(newTimeframe);
        }
    };

    // Initial data load and refresh timer
    useEffect(() => {
        fetchEnergyData();

        // Set up periodic refresh if interval is provided
        if (refreshInterval > 0) {
            const timer = setInterval(fetchEnergyData, refreshInterval);
            return () => clearInterval(timer);
        }
    }, [fetchEnergyData, refreshInterval]);

    return {
        energyData,
        electricalData,
        loading,
        error,
        stats,
        timeframe,
        lastUpdated,
        fetchEnergyData,
        fetchPowerStats,
        changeTimeframe
    };
}

export default useEnergyMonitoring;
