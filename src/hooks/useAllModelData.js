import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { errorOnce } from '../utils/consoleLogger';

// API URL from environment variables - NO HARDCODE FALLBACK
const API_BASE_URL = process.env.REACT_APP_API_URL;

/**
 * Hook to fetch and manage all model data from the database
 */
export const useAllModelData = () => {
    // State for different models
    const [devices, setDevices] = useState([]);
    const [sprayingLogs, setSprayingLogs] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [settings, setSettings] = useState([]);

    // Loading and error states
    const [loading, setLoading] = useState({
        devices: false,
        sprayingLogs: false,
        notifications: false,
        settings: false,
        all: false
    });
    const [error, setError] = useState({
        devices: null,
        sprayingLogs: null,
        notifications: null,
        settings: null,
        all: null
    });

    // Fetch initial data
    useEffect(() => {
        fetchAllModelData();
    }, []);

    // Function to fetch all model data
    const fetchAllModelData = useCallback(async () => {
        setLoading(prev => ({ ...prev, all: true }));
        setError(prev => ({ ...prev, all: null }));

        try {
            // Fetch all data in parallel
            const [devicesResponse, sprayingResponse, notificationsResponse, settingsResponse] =
                await Promise.all([
                    fetchDevices(),
                    fetchSprayingLogs(),
                    fetchNotifications(),
                    fetchSettings()
                ]);

            return {
                devices: devicesResponse,
                sprayingLogs: sprayingResponse,
                notifications: notificationsResponse,
                settings: settingsResponse
            };
        } catch (err) {
            errorOnce('FETCH_ALL_MODEL_DATA_ERROR', 'Error fetching all model data:', err);
            setError(prev => ({ ...prev, all: err.message }));
        } finally {
            setLoading(prev => ({ ...prev, all: false }));
        }
    }, []);

    // Function to fetch devices
    const fetchDevices = useCallback(async () => {
        setLoading(prev => ({ ...prev, devices: true }));
        setError(prev => ({ ...prev, devices: null }));

        try {
            const response = await axios.get(`${API_BASE_URL}/devices`);

            if (response.data?.status === 'success' && Array.isArray(response.data?.data)) {
                setDevices(response.data.data);
                return response.data.data;
            } else {
                throw new Error('Invalid response format');
            }
        } catch (err) {
            errorOnce('FETCH_DEVICES_ERROR', 'Error fetching devices:', err);
            setError(prev => ({ ...prev, devices: err.message }));
            return [];
        } finally {
            setLoading(prev => ({ ...prev, devices: false }));
        }
    }, []);

    // Function to fetch spraying logs
    const fetchSprayingLogs = useCallback(async () => {
        setLoading(prev => ({ ...prev, sprayingLogs: true }));
        setError(prev => ({ ...prev, sprayingLogs: null }));

        try {
            const response = await axios.get(`${API_BASE_URL}/spraying/logs`);

            if (response.data?.status === 'success' && Array.isArray(response.data?.data)) {
                setSprayingLogs(response.data.data);
                return response.data.data;
            } else {
                throw new Error('Invalid response format');
            }
        } catch (err) {
            errorOnce('FETCH_SPRAYING_LOGS_ERROR', 'Error fetching spraying logs:', err);
            setError(prev => ({ ...prev, sprayingLogs: err.message }));
            return [];
        } finally {
            setLoading(prev => ({ ...prev, sprayingLogs: false }));
        }
    }, []);

    // Function to fetch notifications
    const fetchNotifications = useCallback(async () => {
        setLoading(prev => ({ ...prev, notifications: true }));
        setError(prev => ({ ...prev, notifications: null }));

        try {
            const response = await axios.get(`${API_BASE_URL}/notifications`);

            if (response.data?.status === 'success' && Array.isArray(response.data?.data)) {
                setNotifications(response.data.data);
                return response.data.data;
            } else {
                throw new Error('Invalid response format');
            }
        } catch (err) {
            errorOnce('FETCH_NOTIFICATIONS_ERROR', 'Error fetching notifications:', err);
            setError(prev => ({ ...prev, notifications: err.message }));
            return [];
        } finally {
            setLoading(prev => ({ ...prev, notifications: false }));
        }
    }, []);

    // Function to fetch settings
    const fetchSettings = useCallback(async () => {
        setLoading(prev => ({ ...prev, settings: true }));
        setError(prev => ({ ...prev, settings: null }));

        try {
            const response = await axios.get(`${API_BASE_URL}/settings`);

            if (response.data?.status === 'success' && Array.isArray(response.data?.data)) {
                setSettings(response.data.data);
                return response.data.data;
            } else {
                throw new Error('Invalid response format');
            }
        } catch (err) {
            errorOnce('FETCH_SETTINGS_ERROR', 'Error fetching settings:', err);
            setError(prev => ({ ...prev, settings: err.message }));
            return [];
        } finally {
            setLoading(prev => ({ ...prev, settings: false }));
        }
    }, []);

    return {
        // Data
        devices,
        sprayingLogs,
        notifications,
        settings,

        // Status
        loading,
        error,

        // Functions
        fetchAllModelData,
        fetchDevices,
        fetchSprayingLogs,
        fetchNotifications,
        fetchSettings
    };
};

export default useAllModelData;
