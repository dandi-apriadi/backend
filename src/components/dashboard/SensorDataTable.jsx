import React, { useState, useEffect, useMemo } from 'react';
import { errorOnce } from '../../utils/consoleLogger';

/**
 * Component for displaying sensor data in a table format with real database data
 */
const SensorDataTable = ({ data = [], isLoading = false, maxRows = 10 }) => {
    // Add console logging for data updates
    useEffect(() => {
        if (data && data.length > 0) {
            console.log('SensorDataTable - Data received:', data);
            console.log('SensorDataTable - First record sample:', data[0]);

            // Log information about real-time updates
            if (data.some(item => item.real_time)) {
                console.log('%cSensorDataTable - Contains real-time updates!', 'background: #27ae60; color: white; padding: 2px 5px; border-radius: 3px;');
            }

            // Log data stats for debugging
            console.log('SensorDataTable - Data stats:', {
                count: data.length,
                timeRange: {
                    oldest: data[data.length - 1]?.timestamp,
                    newest: data[0]?.timestamp
                },
                containsPirActive: data.some(item => item.pir_status),
                containsPumpActive: data.some(item => item.pump_status),
                uniqueDevices: [...new Set(data.map(item => item.device_id))]
            });
        }
    }, [data]);

    // Get visible data (limited to maxRows)
    const visibleData = useMemo(() => {
        return data && data.length > 0 ? data.slice(0, maxRows) : [];
    }, [data, maxRows]);

    // Format timestamp - improved to handle various timestamp formats
    const formatTime = (timestamp) => {
        if (!timestamp) return 'N/A';

        try {
            // Handle ISO strings, Unix timestamps, or date objects
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) return 'Invalid Time';

            return date.toLocaleTimeString();
        } catch (error) {
            errorOnce('DATA_TABLE_TIMESTAMP_ERROR', 'Error formatting timestamp:', error);
            return 'Invalid Time';
        }
    };

    // Format numeric values with proper defaults
    const formatNumber = (value, decimals = 1) => {
        if (value === undefined || value === null) return 'N/A';
        if (typeof value === 'number') return value.toFixed(decimals);
        if (typeof value === 'string') {
            const parsed = parseFloat(value);
            return isNaN(parsed) ? value : parsed.toFixed(decimals);
        }
        return 'N/A';
    };

    // Show loading state
    if (isLoading) {
        return (
            <div className="p-4 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-sm text-gray-600">Loading data...</span>
            </div>
        );
    }

    // Show empty state
    if (!data || data.length === 0) {
        return (
            <div className="p-4 text-center text-sm text-gray-500">
                No data available
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Time
                        </th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Voltage (V)
                        </th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Current (A)
                        </th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Power (W)
                        </th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Energy (kWh)
                        </th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {visibleData.map((item, index) => (
                        <tr key={item.sensor_id || index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                                {formatTime(item.timestamp)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                                {formatNumber(item.voltage, 1)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                                {formatNumber(item.current, 2)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                                {formatNumber(item.power, 1)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                                {formatNumber(item.energy, 4)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs">
                                <div className="flex items-center space-x-2">
                                    <span className={`inline-block w-2 h-2 rounded-full ${item.pump_status ? 'bg-blue-500' : 'bg-gray-300'}`}></span>
                                    <span className={item.pump_status ? 'text-blue-600' : 'text-gray-500'}>
                                        {item.pump_status ? 'Pump ON' : 'Pump OFF'}
                                    </span>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {data.length > maxRows && (
                <div className="text-center py-2 text-xs text-gray-500">
                    Showing {maxRows} of {data.length} records
                </div>
            )}
        </div>
    );
};

export default SensorDataTable;
