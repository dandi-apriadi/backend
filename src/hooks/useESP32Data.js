import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { errorOnce } from '../utils/consoleLogger';

// Constants - NO HARDCODE FALLBACK
const API_BASE_URL = process.env.REACT_APP_API_URL;

export function useESP32Data(deviceId = 'ESP32-PUMP-01') {
    // State
    const [sensorData, setSensorData] = useState(null);
    const [devices, setDevices] = useState([]);
    const [deviceStatus, setDeviceStatus] = useState({});
    const [deviceOnlineStatus, setDeviceOnlineStatus] = useState({});
    const [lastUpdate, setLastUpdate] = useState(null);
    const [sensorHistory, setSensorHistory] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isOffline, setIsOffline] = useState(false);
    const [loading, setLoading] = useState({
        latest: false,
        history: false,
        status: false,
        devices: false
    });

    // WebSocket connection
    const socketRef = useRef(null);
    const callbacksRef = useRef(new Set());

    // Create socket connection
    useEffect(() => {
        console.log('Initializing WebSocket connection to server...');

        const newSocket = io(API_BASE_URL.replace('/api', ''), {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: Infinity
        });

        socketRef.current = newSocket;

        newSocket.on('connect', () => {
            console.log('%cWebSocket connected! 🟢', 'color: green; font-weight: bold');
            setIsConnected(true);
            setIsOffline(false);
        });

        newSocket.on('disconnect', () => {
            console.log('%cWebSocket disconnected! 🔴', 'color: red; font-weight: bold');
            setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error);
            if (navigator.onLine === false) {
                setIsOffline(true);
                console.log('Device is offline, switching to offline mode');
            }
        });

        newSocket.on('sensor_data', (data) => {
            console.group('%cReal-time data received from server', 'background: #8e44ad; color: white; padding: 2px 5px;');
            console.log('Raw data:', data);
            console.table({
                voltage: data.voltage || data.data?.voltage || 'N/A',
                current: data.current || data.data?.current || 'N/A',
                power: data.power || data.data?.power || 'N/A',
                energy: data.energy || data.data?.energy || 'N/A',
                pir_status: data.pir_status || data.data?.pir_status || false,
                pump_status: data.pump_status || data.data?.pump_status || false
            });
            console.groupEnd();

            // Process data for component
            const processedData = {
                ...(data.data || data),
                timestamp: data.timestamp || new Date().toISOString()
            };

            setSensorData(processedData);
            setLastUpdate(new Date());

            // Notify all registered callbacks
            callbacksRef.current.forEach(callback => {
                try {
                    callback(processedData);
                } catch (e) {
                    console.error('Error in real-time data callback:', e);
                }
            });
        });

        // Clean up on unmount
        return () => {
            console.log('Cleaning up WebSocket connection...');
            if (newSocket) {
                newSocket.disconnect();
            }
        };
    }, [API_BASE_URL]);

    // Register real-time callback
    const registerRealTimeCallback = useCallback((callback) => {
        callbacksRef.current.add(callback);
        return () => callbacksRef.current.delete(callback);
    }, []);

    // Log all data changes
    useEffect(() => {
        if (sensorData) {
            console.log('useESP32Data - Sensor data updated:', sensorData);
        }
    }, [sensorData]);

    useEffect(() => {
        if (sensorHistory && sensorHistory.length > 0) {
            console.log('useESP32Data - History data updated:',
                { count: sensorHistory.length, first: sensorHistory[0], last: sensorHistory[sensorHistory.length - 1] });
        }
    }, [sensorHistory]);

    // Fetch devices
    const fetchDevices = useCallback(async () => {
        if (!API_BASE_URL) {
            console.warn('API_BASE_URL not configured');
            return [];
        } try {
            setLoading(prev => ({ ...prev, devices: true }));
            console.log('Fetching devices from:', `${API_BASE_URL}/dashboard/devices`);
            const response = await axios.get(`${API_BASE_URL}/dashboard/devices`);
            console.log('Devices response:', response.data);

            if (response.data && response.data.status === 'success') {
                // Transform data to expected format, same as PerangkatSection
                const formattedDevices = Array.isArray(response.data.data) ? response.data.data.map(device => ({
                    device_id: parseInt(device.device_id) || device.device_id, // Ensure it's a number
                    device_name: device.device_name,
                    device_status: device.device_status,
                    status: device.device_status === 'aktif' ? 'online' : 'offline',
                    location: device.location || 'Unknown',
                    last_seen: device.last_online,
                    last_online: device.last_online,
                    created_at: device.created_at,
                    updated_at: device.updated_at
                })) : [];

                console.log('Formatted devices for schedules:', formattedDevices);
                setDevices(formattedDevices);
                return formattedDevices;
            } else {
                console.warn('Invalid response format or no devices found');
                setDevices([]);
                return [];
            }
        } catch (error) {
            console.error('Error fetching devices:', error);
            errorOnce('FETCH_DEVICES_ERROR', 'Failed to fetch devices:', error.message);
            return [];
        } finally {
            setLoading(prev => ({ ...prev, devices: false }));
        }
    }, [API_BASE_URL]);

    // Fetch devices on mount
    useEffect(() => {
        fetchDevices();
    }, [fetchDevices]);

    // Return the hook's API
    return {
        sensorData,
        devices,
        deviceStatus,
        deviceOnlineStatus,
        lastUpdate,
        sensorHistory,
        isConnected,
        isOffline,
        loading,
        registerRealTimeCallback,
        fetchDevices
    };
}
