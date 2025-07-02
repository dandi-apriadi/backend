import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { errorOnce } from '../utils/consoleLogger';

// API URL - NO HARDCODE FALLBACK
const API_BASE_URL = process.env.REACT_APP_API_URL;

/**
 * Custom hook for fetching and managing real-time energy trend data
 * Updates every 5 seconds to match the database recording frequency
 */
export function useEnergyTrends(deviceId = 'ESP32-PUMP-01', refreshInterval = 5000) {
    const [trendData, setTrendData] = useState([]);
    const [latestData, setLatestData] = useState(null);
    const [timeframe, setTimeframe] = useState('5m');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);

    // Track fetch counts for debugging
    const fetchCountRef = useRef(0);
    const failedFetchesRef = useRef(0);

    // Track if the component is mounted
    const mountedRef = useRef(true);

    // Fetch energy trends based on timeframe
    const fetchEnergyTrends = useCallback(async (tf = timeframe) => {
        if (!deviceId) return;

        setLoading(true);
        try {
            fetchCountRef.current += 1;
            const response = await axios.get(`${API_BASE_URL}/esp32/energy-trends/${deviceId}?timeframe=${tf}`);

            if (response.data && response.data.status === 'success') {
                if (mountedRef.current) {
                    setTrendData(response.data.data || []);
                    setTimeframe(tf);
                    setLastUpdate(new Date());
                    setError(null);
                }
            } else {
                if (mountedRef.current) {
                    setError('Failed to fetch energy trends');
                    failedFetchesRef.current += 1;
                }
            }
        } catch (err) {
            if (mountedRef.current) {
                errorOnce('ENERGY_TRENDS_ERROR', 'Error fetching energy trends:', err);
                setError(err.message);
                failedFetchesRef.current += 1;
            }
        } finally {
            if (mountedRef.current) {
                setLoading(false);
            }
        }
    }, [deviceId, timeframe]);

    // Fetch latest energy data point
    const fetchLatestEnergyData = useCallback(async () => {
        if (!deviceId) return;

        try {
            const response = await axios.get(`${API_BASE_URL}/esp32/energy-trends/latest/${deviceId}`);

            if (response.data && response.data.status === 'success') {
                if (mountedRef.current) {
                    setLatestData(response.data.data);
                    setLastUpdate(new Date());

                    // Add this data point to the trend data if it's new
                    if (response.data.data && trendData.length > 0) {
                        const newDataPoint = response.data.data;
                        const lastDataPoint = trendData[trendData.length - 1];

                        // Only add if it's a new data point with a different timestamp
                        if (newDataPoint.period_start !== lastDataPoint.period_start) {
                            setTrendData(prev => [...prev.slice(-99), newDataPoint]);
                        }
                    }
                }
            }
        } catch (err) {
            errorOnce('LATEST_ENERGY_ERROR', 'Error fetching latest energy data:', err);
        }
    }, [deviceId, trendData]);

    // Initialize and set up polling interval
    useEffect(() => {
        // Initial fetch
        fetchEnergyTrends();
        fetchLatestEnergyData();

        // Set up interval for real-time updates (every 5 seconds)
        const intervalId = setInterval(() => {
            fetchLatestEnergyData();
        }, refreshInterval);

        // Clean up
        return () => {
            clearInterval(intervalId);
            mountedRef.current = false;
        };
    }, [fetchEnergyTrends, fetchLatestEnergyData, refreshInterval]);

    // Change timeframe and refetch data
    const changeTimeframe = useCallback((tf) => {
        setTimeframe(tf);
        fetchEnergyTrends(tf);
    }, [fetchEnergyTrends]);

    return {
        trendData,
        latestData,
        timeframe,
        loading,
        error,
        lastUpdate,
        changeTimeframe,
        refreshData: fetchEnergyTrends,
        fetchLatestData: fetchLatestEnergyData,
        stats: {
            fetchCount: fetchCountRef.current,
            failedFetches: failedFetchesRef.current
        }
    };
}
