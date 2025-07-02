import React, { useState, useEffect } from 'react';
import { errorOnce } from '../../utils/consoleLogger';

/**
 * Component for displaying real-time device status including PIR and pump status
 */
const DeviceStatusCard = ({ device, sensorData, lastUpdate, isConnected }) => {
    // Format time nicely
    const formatTime = (timestamp) => {
        if (!timestamp) return 'N/A';
        try {
            const date = new Date(timestamp);
            return date.toLocaleTimeString();
        } catch (error) {
            return 'Invalid time';
        }
    };

    // Calculate time since last seen
    const getTimeSince = (timestamp) => {
        if (!timestamp) return 'N/A';
        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diffSeconds = Math.floor((now - date) / 1000);

            if (diffSeconds < 60) return `${diffSeconds}s ago`;
            if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
            if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
            return `${Math.floor(diffSeconds / 86400)}d ago`;
        } catch (error) {
            return 'N/A';
        }
    };

    // Add animation state for PIR and pump status changes
    const [pirHighlight, setPirHighlight] = useState(false);
    const [pumpHighlight, setPumpHighlight] = useState(false);

    // Highlight PIR or pump status when they change
    useEffect(() => {
        if (sensorData?.pir_status) {
            setPirHighlight(true);
            const timer = setTimeout(() => setPirHighlight(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [sensorData?.pir_status]);

    useEffect(() => {
        if (sensorData?.pump_status) {
            setPumpHighlight(true);
            const timer = setTimeout(() => setPumpHighlight(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [sensorData?.pump_status]);

    // For debugging, log when new sensor data arrives
    useEffect(() => {
        if (sensorData) {
            console.log('DeviceStatusCard - New sensor data received:', {
                device_id: device?.device_id,
                pir_status: sensorData.pir_status,
                pump_status: sensorData.pump_status,
                timestamp: new Date().toISOString()
            });
        }
    }, [sensorData, device]);

    // Don't render if no device data
    if (!device) return null;

    return (
        <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex justify-between items-center mb-4">
                <div className="font-medium text-gray-800">{device.device_id}</div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {isConnected ? 'ONLINE' : 'OFFLINE'}
                </div>
            </div>

            {/* Device info */}
            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm mb-4">
                <div className="text-gray-600">Location:</div>
                <div className="font-semibold">{device.location || 'Unknown'}</div>

                <div className="text-gray-600">Last Seen:</div>
                <div className="font-semibold">{getTimeSince(lastUpdate)}</div>

                <div className="text-gray-600">Connection:</div>
                <div className="font-semibold">{device.connection_type || 'N/A'}</div>

                <div className="text-gray-600">DB Status:</div>
                <div className="font-semibold">{device.database_status || 'N/A'}</div>
            </div>

            {/* Real-time sensor status section */}
            <div className="border-t pt-3">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Real-time Sensor Status</h4>

                {/* PIR Motion Sensor Status with animation */}
                <div className={`flex items-center justify-between p-2 rounded-md mb-2 transition-all ${sensorData?.pir_status
                        ? `${pirHighlight ? 'bg-red-100 border border-red-300 animate-pulse' : 'bg-red-50 border border-red-200'}`
                        : 'bg-gray-50 border border-gray-200'
                    }`}>
                    <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-2 ${sensorData?.pir_status ? 'bg-red-500' : 'bg-gray-400'}`}></div>
                        <span className="text-sm font-medium">PIR Motion Sensor</span>
                    </div>
                    <span className={`text-sm font-semibold ${sensorData?.pir_status ? 'text-red-600' : 'text-gray-500'}`}>
                        {sensorData?.pir_status ? 'MOTION DETECTED' : 'No Motion'}
                    </span>
                </div>

                {/* Pump Status with animation */}
                <div className={`flex items-center justify-between p-2 rounded-md transition-all ${sensorData?.pump_status
                        ? `${pumpHighlight ? 'bg-blue-100 border border-blue-300 animate-pulse' : 'bg-blue-50 border border-blue-200'}`
                        : 'bg-gray-50 border border-gray-200'
                    }`}>
                    <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-2 ${sensorData?.pump_status ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                        <span className="text-sm font-medium">Water Pump</span>
                    </div>
                    <span className={`text-sm font-semibold ${sensorData?.pump_status ? 'text-blue-600' : 'text-gray-500'}`}>
                        {sensorData?.pump_status ? 'ACTIVE' : 'Inactive'}
                    </span>
                </div>
            </div>

            {/* Last update timestamp */}
            <div className="text-xs text-gray-500 text-right mt-3">
                Updated: {formatTime(lastUpdate)}
            </div>
        </div>
    );
};

export default DeviceStatusCard;
