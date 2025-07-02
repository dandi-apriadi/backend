import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './value-transitions.css'; // Import the CSS for transitions
import { logOnce, warnOnce, errorOnce } from "../../utils/consoleLogger"; // Add missing import

// Constants - NO LOCALHOST FALLBACK
const API_BASE_URL = process.env.REACT_APP_API_URL;
const DISCONNECTION_THRESHOLD = 30000; // 30 seconds threshold for disconnection detection

/**
 * ESP32 Monitoring Section - Displays real-time data from ESP32 devices
 */
const ESP32Section = ({
    isConnected,
    sensorData,
    devices,
    lastUpdate,
    sendCommand,
    electricalData
}) => {
    const [dataUpdated, setDataUpdated] = useState(false);
    const prevSensorDataRef = useRef(null);
    // Remove the autoRefresh toggle and always keep it true
    const autoRefresh = true;

    // Create refs for all data elements we want to update directly
    const voltageRef = useRef(null);
    const currentRef = useRef(null);
    const powerRef = useRef(null);
    const energyRef = useRef(null);
    const pirStatusRef = useRef(null);
    const pumpStatusRef = useRef(null);
    const lastUpdateRef = useRef(null);

    // Add a ref for animation tracking
    const animatingElementsRef = useRef(new Set());

    // Add state to track last known good readings
    const [lastKnownReadings, setLastKnownReadings] = useState({
        voltage: null,
        current: null,
        power: null,
        energy: null,
        timestamp: null
    });

    // Check if the device is truly connected based on last update time
    const isDeviceActuallyConnected = () => {
        if (!lastUpdate) return false;

        const now = new Date();
        const updateTime = new Date(lastUpdate);
        const diffMs = now - updateTime;

        // If last update is older than 30 seconds, consider device disconnected
        return diffMs < DISCONNECTION_THRESHOLD;
    };

    // Get connection status for display
    const effectiveConnectionStatus = isConnected && isDeviceActuallyConnected();

    // Track changes in sensor data to show update animation
    useEffect(() => {
        if (sensorData && (!prevSensorDataRef.current ||
            JSON.stringify(prevSensorDataRef.current) !== JSON.stringify(sensorData))) {
            setDataUpdated(true);

            // Log real-time updates to console for verification
            console.log('Real-time sensor data update:', {
                timestamp: new Date().toISOString(),
                voltage: sensorData.voltage,
                current: sensorData.current,
                power: sensorData.power,
                pir_status: sensorData.pir_status,
                pump_status: sensorData.pump_status
            });

            // Store last known good readings whenever we get valid data while connected
            if (isConnected && effectiveConnectionStatus) {
                const hasValidReadings =
                    sensorData.voltage > 0 ||
                    sensorData.current > 0 ||
                    sensorData.power > 0;

                if (hasValidReadings) {
                    setLastKnownReadings({
                        voltage: sensorData.voltage,
                        current: sensorData.current,
                        power: sensorData.power,
                        energy: sensorData.energy,
                        timestamp: new Date()
                    });
                }
            }

            // Reset update indicator after animation completes
            setTimeout(() => setDataUpdated(false), 1000);

            // Update DOM elements directly if refs are available
            updateDomElementsWithNewData(sensorData);

            // Update the ref with new data
            prevSensorDataRef.current = { ...sensorData };
        }
    }, [sensorData, isConnected, effectiveConnectionStatus]);

    // Function to update DOM elements directly with new data
    const updateDomElementsWithNewData = (data) => {
        if (!data) return;

        // Helper function to animate value changes with no gaps
        const animateValueChange = (ref, newValue, unit = '', decimals = 2) => {
            if (!ref.current) return;

            // Store current value before changing
            const currentContent = ref.current.textContent;

            // Check if the new value is valid; if not, don't update
            if (newValue === null || newValue === undefined || isNaN(newValue)) {
                console.log("Invalid value detected, keeping current value:", currentContent);
                return;
            }

            // Format the new value
            const formattedValue = typeof newValue === 'number'
                ? newValue.toFixed(decimals) + unit
                : newValue;

            // Skip if value hasn't changed to prevent unnecessary animations
            if (currentContent === formattedValue) return;

            // Skip animation if we're already animating this element
            if (animatingElementsRef.current.has(ref)) return;

            // Mark element as animating
            animatingElementsRef.current.add(ref);

            // Apply animation class
            ref.current.classList.add('value-updating');

            // Set new value immediately without clearing old one first
            ref.current.textContent = formattedValue;

            // Remove animation class after transition completes
            setTimeout(() => {
                if (ref.current) {
                    ref.current.classList.remove('value-updating');
                    animatingElementsRef.current.delete(ref);
                }
            }, 700);
        };

        // If device is disconnected, use last known readings
        const displayData = effectiveConnectionStatus ? data : {
            ...data,
            voltage: lastKnownReadings.voltage || data.voltage,
            current: lastKnownReadings.current || data.current,
            power: lastKnownReadings.power || data.power,
            energy: lastKnownReadings.energy || data.energy,
        };

        // Update electrical values with seamless transitions and data protection
        if (voltageRef.current) animateValueChange(voltageRef, parseFloat(displayData.voltage) || prevSensorDataRef.current?.voltage, '', 2);
        if (currentRef.current) animateValueChange(currentRef, parseFloat(displayData.current) || prevSensorDataRef.current?.current, '', 3);
        if (powerRef.current) animateValueChange(powerRef, parseFloat(displayData.power) || prevSensorDataRef.current?.power, '', 2);
        if (energyRef.current) animateValueChange(energyRef, parseFloat(displayData.energy) || prevSensorDataRef.current?.energy, '', 3);

        // Update PIR status without gaps
        if (pirStatusRef.current) {
            const newStatus = data.pir_status ? 'MOTION DETECTED' : 'No Motion';
            // Only update if value changed
            if (pirStatusRef.current.textContent !== newStatus) {
                pirStatusRef.current.textContent = newStatus;

                // Apply classes without removing existing ones first
                if (data.pir_status) {
                    pirStatusRef.current.parentElement.classList.add('bg-red-100', 'text-red-800');
                    pirStatusRef.current.parentElement.classList.remove('bg-gray-100', 'text-gray-600');
                } else {
                    pirStatusRef.current.parentElement.classList.add('bg-gray-100', 'text-gray-600');
                    pirStatusRef.current.parentElement.classList.remove('bg-red-100', 'text-red-800');
                }
            }
        }

        // Update pump status without gaps
        if (pumpStatusRef.current) {
            const newStatus = data.pump_status ? 'ON' : 'OFF';
            // Only update if value changed
            if (pumpStatusRef.current.textContent !== newStatus) {
                pumpStatusRef.current.textContent = newStatus;

                // Apply classes without removing existing ones first
                if (data.pump_status) {
                    pumpStatusRef.current.parentElement.classList.add('bg-blue-100', 'text-blue-800');
                    pumpStatusRef.current.parentElement.classList.remove('bg-gray-100', 'text-gray-600');
                } else {
                    pumpStatusRef.current.parentElement.classList.add('bg-gray-100', 'text-gray-600');
                    pumpStatusRef.current.parentElement.classList.remove('bg-blue-100', 'text-blue-800');
                }
            }
        }

        // Update last update time without gaps
        if (lastUpdateRef.current) {
            const newTimeText = formatLastUpdate(new Date());
            // Only update if time changed
            if (lastUpdateRef.current.textContent !== `Last update: ${newTimeText}`) {
                lastUpdateRef.current.textContent = `Last update: ${newTimeText}`;
            }
        }
    };

    // Direct AJAX fetch for real-time data without page refresh
    const fetchLatestSensorData = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/esp32/data/latest`);

            if (response.data && response.data.status === 'success' && response.data.data) {
                // Data validation - ensure we never have empty electrical values
                const newData = response.data.data;

                // Create a complete data object combining new data with previous values for any missing fields
                const completeData = {
                    ...prevSensorDataRef.current, // Use previous data as base
                    ...newData, // Overlay with new data
                    // Ensure electrical values are never empty by falling back to previous values
                    voltage: parseFloat(newData.voltage) || prevSensorDataRef.current?.voltage || lastKnownReadings.voltage || 0,
                    current: parseFloat(newData.current) || prevSensorDataRef.current?.current || lastKnownReadings.current || 0,
                    power: parseFloat(newData.power) || prevSensorDataRef.current?.power || lastKnownReadings.power || 0,
                    energy: parseFloat(newData.energy) || prevSensorDataRef.current?.energy || lastKnownReadings.energy || 0
                };

                // Update DOM elements directly with the fresh data
                updateDomElementsWithNewData(completeData);
                prevSensorDataRef.current = completeData;

                console.log('AJAX fetched latest sensor data:', completeData);
            }
        } catch (error) {
            console.error('Error fetching latest sensor data:', error);
        }
    };

    // Setup real-time data updates using AJAX
    useEffect(() => {
        // Only set up polling if autoRefresh is enabled
        if (!autoRefresh) return;

        // Immediate first fetch
        fetchLatestSensorData();

        // Set up interval for regular data updates
        const intervalId = setInterval(() => {
            if (autoRefresh) {
                fetchLatestSensorData();
            }
        }, 5000); // Update every 5 seconds

        // Cleanup
        return () => {
            clearInterval(intervalId);
        };
    }, [autoRefresh]);

    // Handle pump control command
    const handlePumpControl = async (action) => {
        if (!isConnected) return;
        try {
            await sendCommand('ESP32-PUMP-01', 'pump_control', { action });
            console.log(`Sent pump control command: ${action}`);

            // Optimistic UI update - immediately update the UI
            if (pumpStatusRef.current) {
                const newStatus = action === 'on';
                pumpStatusRef.current.textContent = newStatus ? 'ON' : 'OFF';
                pumpStatusRef.current.parentElement.classList.toggle('bg-blue-100', newStatus);
                pumpStatusRef.current.parentElement.classList.toggle('text-blue-800', newStatus);
                pumpStatusRef.current.parentElement.classList.toggle('bg-gray-100', !newStatus);
                pumpStatusRef.current.parentElement.classList.toggle('text-gray-600', !newStatus);
            }

            // Force a data refresh after a short delay to confirm the change
            setTimeout(() => fetchLatestSensorData(), 500);
        } catch (error) {
            errorOnce('ESP32_COMMAND_ERROR', 'Error sending command:', error);
        }
    };

    // Function to format timestamp in a readable way
    const formatLastUpdate = (timestamp) => {
        if (!timestamp) return 'Never';

        const now = new Date();
        const updateTime = new Date(timestamp);
        const diffSeconds = Math.floor((now - updateTime) / 1000);

        if (diffSeconds < 10) return 'Just now';
        if (diffSeconds < 60) return `${diffSeconds} seconds ago`;
        if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} minutes ago`;

        return updateTime.toLocaleTimeString();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2h10" />
                    </svg>
                    ESP32 Monitoring
                    <span className={`ml-3 text-xs px-2 py-1 rounded-full ${effectiveConnectionStatus ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {effectiveConnectionStatus ? 'ONLINE' : 'OFFLINE'}
                    </span>
                </h2>
            </div>

            {/* Ultra-Modern Device Status Panel */}
            <div className={`rounded-xl overflow-hidden shadow-lg transform transition-all duration-300 hover:shadow-xl bg-white border-b-4 ${effectiveConnectionStatus ? 'border-green-500' : 'border-red-500'}`}>
                {/* Glass-effect header with gradient */}
                <div className={`relative p-5 ${effectiveConnectionStatus
                    ? 'bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50'
                    : 'bg-gradient-to-r from-red-50 via-orange-50 to-amber-50'}`
                }>
                    {/* Background decorative elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
                        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                            <path fill={effectiveConnectionStatus ? "#6366F1" : "#EF4444"} d="M46.5,-48.3C58.9,-35.6,67.3,-17.8,68.6,1.3C69.9,20.4,64.2,40.8,51.8,52.8C39.3,64.8,19.7,68.4,0.1,68.3C-19.4,68.1,-38.9,64.2,-50.9,52.2C-63,40.2,-67.7,20.1,-67.5,0.2C-67.3,-19.7,-62.3,-39.3,-49.8,-52C-37.3,-64.7,-18.7,-70.5,-0.5,-70C17.8,-69.5,35.5,-62.7,46.5,-48.3Z" transform="translate(100 100)" />
                        </svg>
                    </div>

                    <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center z-10">
                        <div className="flex items-center">
                            <div className="bg-white p-3 rounded-xl shadow-md mr-4 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${effectiveConnectionStatus ? 'text-blue-600' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2h10" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Device Status</h3>
                                <div className="flex items-center text-sm text-gray-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Updated: {new Date().toLocaleTimeString()}
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 md:mt-0 flex space-x-3">
                            <div className={`flex items-center rounded-lg px-3 py-1.5 transition-all ${effectiveConnectionStatus
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'}`}
                            >
                                <div className={`w-2 h-2 rounded-full mr-2 ${effectiveConnectionStatus
                                    ? 'bg-green-500 animate-ping'
                                    : 'bg-red-500'}`}
                                ></div>
                                <span className="font-semibold text-sm">
                                    {effectiveConnectionStatus ? 'ONLINE' : 'OFFLINE'}
                                </span>
                            </div>

                            <button
                                onClick={() => fetchLatestSensorData()}
                                className={`flex items-center rounded-lg px-3 py-1.5 bg-white border text-sm font-medium transition-all ${effectiveConnectionStatus
                                    ? 'border-blue-300 text-blue-700 hover:bg-blue-50'
                                    : 'border-gray-300 text-gray-500 hover:bg-gray-50'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-1 ${dataUpdated ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content with glassmorphism cards */}
                <div className="p-5">
                    <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
                        {/* Left side - Device data */}
                        <div className="lg:col-span-2 space-y-5">
                            {/* Device ID Card */}
                            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-4 shadow-sm border border-gray-100 transition-all hover:shadow-md group">
                                <div className="flex items-center">
                                    <div className="bg-indigo-100 p-2 rounded-lg mr-3 group-hover:bg-indigo-200 transition-all">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="text-xs font-medium text-indigo-500 uppercase tracking-wider group-hover:text-indigo-600 transition-all">Device ID</div>                                        <div className="text-gray-800 font-mono text-sm group-hover:text-black transition-all">
                                            {devices?.find(d => d.device_name?.includes('ESP32'))?.device_name || 'ESP32-PUMP-01'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Location Card */}
                            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-4 shadow-sm border border-gray-100 transition-all hover:shadow-md group">
                                <div className="flex items-center">
                                    <div className="bg-blue-100 p-2 rounded-lg mr-3 group-hover:bg-blue-200 transition-all">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="text-xs font-medium text-blue-500 uppercase tracking-wider group-hover:text-blue-600 transition-all">Location</div>                                        <div className="text-gray-800 text-sm group-hover:text-black transition-all">
                                            {devices?.find(d => d.device_name?.includes('ESP32'))?.location || 'Default location'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Connection Card */}
                            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-4 shadow-sm border border-gray-100 transition-all hover:shadow-md group">
                                <div className="flex items-center">
                                    <div className="bg-purple-100 p-2 rounded-lg mr-3 group-hover:bg-purple-200 transition-all">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h10" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="text-xs font-medium text-purple-500 uppercase tracking-wider group-hover:text-purple-600 transition-all">Connection</div>
                                        <div className="flex items-center">
                                            <span className="text-gray-800 text-sm group-hover:text-black transition-all mr-2">websocket</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${effectiveConnectionStatus ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                DB: aktif
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Last Seen Card */}
                            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-4 shadow-sm border border-gray-100 transition-all hover:shadow-md group">
                                <div className="flex items-center">
                                    <div className="bg-amber-100 p-2 rounded-lg mr-3 group-hover:bg-amber-200 transition-all">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="text-xs font-medium text-amber-500 uppercase tracking-wider group-hover:text-amber-600 transition-all">Last Seen</div>
                                        <div className="text-gray-800 text-sm group-hover:text-black transition-all">
                                            {formatLastUpdate(lastUpdate)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Mode Card with toggle */}
                            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-4 shadow-sm border border-gray-100 transition-all hover:shadow-md">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className="bg-teal-100 p-2 rounded-lg mr-3">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                            </svg>
                                        </div>
                                        <div>
                                            <div className="text-xs font-medium text-teal-500 uppercase tracking-wider">Operation Mode</div>
                                            <div className="text-gray-800 text-sm">
                                                {sensorData?.auto_mode ? 'Automatic' : 'Manual'}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => sendCommand('ESP32-PUMP-01', 'mode_toggle')}
                                        className={`w-12 h-6 rounded-full relative ${sensorData?.auto_mode
                                            ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                                            : 'bg-gradient-to-r from-amber-400 to-amber-500'} transition-all duration-300`}
                                        disabled={!isConnected}
                                    >
                                        <div className={`absolute w-4 h-4 bg-white rounded-full top-1 transition-all duration-300 ${sensorData?.auto_mode ? 'left-7' : 'left-1'
                                            }`}></div>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Right side */}
                        <div className="lg:col-span-4">
                            <div className="grid grid-cols-1 md:grid-cols-6 gap-5">
                                {/* Sensor status indicators */}
                                <div className="md:col-span-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Motion Sensor Card */}
                                    <div className={`relative overflow-hidden rounded-2xl p-5 border-l-4 shadow-md transition-transform duration-300 hover:shadow-lg transform hover:-translate-y-1 ${sensorData?.pir_status
                                        ? 'bg-gradient-to-br from-red-50 to-rose-50 border-red-500 shadow-red-100'
                                        : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-300 shadow-gray-100'
                                        }`}>
                                        {/* Animated radar circles if motion detected */}
                                        {sensorData?.pir_status && (
                                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                                                <div className="w-16 h-16 rounded-full bg-red-500 opacity-10 animate-ping"></div>
                                                <div className="w-24 h-24 rounded-full bg-red-500 opacity-5 animate-ping animation-delay-1000"></div>
                                                <div className="w-32 h-32 rounded-full bg-red-500 opacity-5 animate-ping animation-delay-2000"></div>
                                            </div>
                                        )}

                                        <div className="relative flex items-center">
                                            <div className={`relative flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center border-2 ${sensorData?.pir_status
                                                ? 'bg-red-100 border-red-300'
                                                : 'bg-gray-100 border-gray-200'
                                                }`}>
                                                <svg className={`w-6 h-6 ${sensorData?.pir_status ? 'text-red-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                {sensorData?.pir_status && (
                                                    <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-red-500 border-2 border-white animate-pulse"></span>
                                                )}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Motion Sensor</div>
                                                <div className={`text-base font-bold mt-0.5 ${sensorData?.pir_status ? 'text-red-700' : 'text-gray-600'}`} ref={pirStatusRef}>
                                                    {sensorData?.pir_status ? 'MOTION DETECTED' : 'No Motion'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Pump Status Card */}
                                    <div className={`relative overflow-hidden rounded-2xl p-5 border-l-4 shadow-md transition-transform duration-300 hover:shadow-lg transform hover:-translate-y-1 ${sensorData?.pump_status
                                        ? 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-500 shadow-blue-100'
                                        : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-300 shadow-gray-100'
                                        }`}>
                                        {/* Water ripples animation when pump is active */}
                                        {sensorData?.pump_status && (
                                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                                                <div className="w-16 h-16 rounded-full bg-blue-500 opacity-10 animate-ping"></div>
                                                <div className="w-24 h-24 rounded-full bg-blue-500 opacity-5 animate-ping animation-delay-500"></div>
                                                <div className="w-32 h-32 rounded-full bg-blue-500 opacity-5 animate-ping animation-delay-1000"></div>
                                            </div>
                                        )}

                                        <div className="relative flex items-center">
                                            <div className={`relative flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center border-2 ${sensorData?.pump_status
                                                ? 'bg-blue-100 border-blue-300'
                                                : 'bg-gray-100 border-gray-200'
                                                }`}>
                                                <svg className={`w-6 h-6 ${sensorData?.pump_status ? 'text-blue-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                                </svg>
                                                {sensorData?.pump_status && (
                                                    <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-blue-500 border-2 border-white animate-pulse"></span>
                                                )}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Pump Status</div>
                                                <div className={`text-base font-bold mt-0.5 ${sensorData?.pump_status ? 'text-blue-700' : 'text-gray-600'}`} ref={pumpStatusRef}>
                                                    {sensorData?.pump_status ? 'ON' : 'OFF'}
                                                </div>
                                            </div>
                                            <div className="ml-auto space-x-2">
                                                <button
                                                    onClick={() => handlePumpControl('on')}
                                                    className={`px-3 py-1.5 text-xs font-medium rounded transition-all duration-200 ${sensorData?.pump_status
                                                        ? 'bg-green-600 text-white shadow-sm'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-green-100 hover:text-green-700'
                                                        }`}
                                                    disabled={!isConnected}
                                                >
                                                    ON
                                                </button>
                                                <button
                                                    onClick={() => handlePumpControl('off')}
                                                    className={`px-3 py-1.5 text-xs font-medium rounded transition-all duration-200 ${!sensorData?.pump_status
                                                        ? 'bg-red-500 text-white shadow-sm'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-red-100 hover:text-red-700'
                                                        }`}
                                                    disabled={!isConnected}
                                                >
                                                    OFF
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Current Readings and Power Stats */}
                                <div className="md:col-span-6">
                                    <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl border border-blue-100 shadow-sm p-5 transition-all hover:shadow-md">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-sm font-semibold text-gray-800">Electrical Metrics</h4>
                                            <div className="text-xs text-gray-500">
                                                Last update: {formatLastUpdate(lastUpdate)}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {/* Voltage Card */}
                                            <div className="bg-white rounded-xl p-3 shadow-sm border border-blue-50 hover:border-blue-200 transition-all">
                                                <div className="flex items-center">
                                                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                        </svg>
                                                    </div>
                                                    <div className="ml-3">
                                                        <div className="text-xs text-gray-500 font-medium">Voltage</div>
                                                        <div className="text-lg font-bold text-gray-800 flex items-baseline">
                                                            <span ref={voltageRef}>{electricalData?.voltage?.toFixed(1) || '0.0'}</span>
                                                            <span className="text-xs text-gray-500 ml-1">V</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Current Card */}
                                            <div className="bg-white rounded-xl p-3 shadow-sm border border-green-50 hover:border-green-200 transition-all">
                                                <div className="flex items-center">
                                                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                        </svg>
                                                    </div>
                                                    <div className="ml-3">
                                                        <div className="text-xs text-gray-500 font-medium">Current</div>
                                                        <div className="text-lg font-bold text-gray-800 flex items-baseline">
                                                            <span ref={currentRef}>{electricalData?.current?.toFixed(2) || '0.00'}</span>
                                                            <span className="text-xs text-gray-500 ml-1">A</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Power Card */}
                                            <div className="bg-white rounded-xl p-3 shadow-sm border border-purple-50 hover:border-purple-200 transition-all">
                                                <div className="flex items-center">
                                                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                        </svg>
                                                    </div>
                                                    <div className="ml-3">
                                                        <div className="text-xs text-gray-500 font-medium">Power</div>
                                                        <div className="text-lg font-bold text-gray-800 flex items-baseline">
                                                            <span ref={powerRef}>{electricalData?.power?.toFixed(1) || '0.0'}</span>
                                                            <span className="text-xs text-gray-500 ml-1">W</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Energy Card */}
                                            <div className="bg-white rounded-xl p-3 shadow-sm border border-amber-50 hover:border-amber-200 transition-all">
                                                <div className="flex items-center">
                                                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2h10" />
                                                        </svg>
                                                    </div>
                                                    <div className="ml-3">
                                                        <div className="text-xs text-gray-500 font-medium">Energy</div>
                                                        <div className="text-lg font-bold text-gray-800 flex items-baseline">
                                                            <span ref={energyRef}>{electricalData?.energy?.toFixed(2) || '0.00'}</span>
                                                            <span className="text-xs text-gray-500 ml-1">Wh</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Trends Section removed */}
                                    </div>
                                </div>                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ESP32Section;
