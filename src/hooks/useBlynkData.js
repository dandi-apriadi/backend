import { useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentData, getMultiplePinsData, getDeviceStatus } from '../services/blynkApi';

/**
 * Custom hook for fetching real-time Blynk data
 */
export const useBlynkData = (options = {}) => {
    const {
        pins = ['V1'],
        interval = 5000,
        autoStart = true
    } = options;

    const [data, setData] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    const intervalRef = useRef(null);
    const isMountedRef = useRef(true);

    const fetchData = useCallback(async () => {
        if (!isMountedRef.current) return;

        try {
            setLoading(true);
            setError(null);

            let newData;
            if (pins.length === 1) {
                const value = await getCurrentData(pins[0]);
                newData = { [pins[0]]: value };
            } else {
                newData = await getMultiplePinsData(pins);
            }

            if (isMountedRef.current) {
                setData(newData);
                setLastUpdate(new Date());
                console.log('Blynk data updated:', newData);
            }
        } catch (err) {
            if (isMountedRef.current) {
                setError(err.message || 'Failed to fetch Blynk data');
                console.error('Blynk data fetch error:', err);
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [pins]);

    const checkConnection = useCallback(async () => {
        try {
            const status = await getDeviceStatus();
            if (isMountedRef.current) {
                setIsConnected(status.isConnected);
            }
        } catch (err) {
            if (isMountedRef.current) {
                setIsConnected(false);
            }
        }
    }, []);

    const startFetching = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        fetchData();
        checkConnection();

        intervalRef.current = setInterval(() => {
            fetchData();
            checkConnection();
        }, interval);
    }, [fetchData, checkConnection, interval]);

    const stopFetching = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    const refresh = useCallback(() => {
        fetchData();
        checkConnection();
    }, [fetchData, checkConnection]);

    useEffect(() => {
        isMountedRef.current = true;

        if (autoStart) {
            startFetching();
        }

        return () => {
            isMountedRef.current = false;
            stopFetching();
        };
    }, [autoStart, startFetching, stopFetching]);

    useEffect(() => {
        if (autoStart && intervalRef.current) {
            startFetching();
        }
    }, [pins, autoStart, startFetching]);

    return {
        data,
        loading,
        error,
        lastUpdate,
        isConnected,
        refresh,
        startFetching,
        stopFetching
    };
};

/**
 * Hook for current sensor data
 */
export const useBlynkCurrent = (options = {}) => {
    const {
        pin = 'V1',
        interval = 3000,
        ...restOptions
    } = options;

    const { data, loading, error, lastUpdate, isConnected, refresh, startFetching, stopFetching } = useBlynkData({
        pins: [pin],
        interval,
        ...restOptions
    });

    const current = Number((data[pin] || 0).toFixed(2));

    const currentMetrics = {
        current,
        isHighCurrent: current > 6.0,
        isLowCurrent: current < 1.0,
        currentPercentage: Math.min(100, (current / 10) * 100),
        trend: current > 5 ? 'high' : current > 2 ? 'normal' : 'low'
    };

    return {
        ...currentMetrics,
        raw: data,
        loading,
        error,
        lastUpdate,
        isConnected,
        refresh,
        startFetching,
        stopFetching
    };
};

/**
 * Hook for all electrical monitoring data
 */
export const useBlynkElectrical = (options = {}) => {
    const {
        interval = 5000,
        ...restOptions
    } = options;

    const { data, loading, error, lastUpdate, isConnected, refresh, startFetching, stopFetching } = useBlynkData({
        pins: ['V1', 'V2', 'V3', 'V4'],
        interval,
        ...restOptions
    });

    const electrical = {
        current: Number((data.V1 || 5.2).toFixed(2)),
        voltage: Number((data.V2 || 220).toFixed(1)),
        power: Number((data.V3 || 1144).toFixed(0)),
        energy: Number((data.V4 || 1080).toFixed(0))
    };

    return {
        data: electrical,
        loading,
        error,
        lastUpdate,
        isConnected,
        refresh,
        startFetching,
        stopFetching
    };
};
