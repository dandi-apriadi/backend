import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    LineChart, Line, AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ReferenceLine
} from 'recharts';

// API URL - NO LOCALHOST FALLBACK
const API_BASE_URL = process.env.REACT_APP_API_URL;

/**
 * ElectricalUsageTrends Component
 * Displays electrical usage trends in various chart formats
 */
const ElectricalUsageTrends = ({
    deviceId = 'ESP32-PUMP-01',
    refreshInterval = 30000,
    data = null, // Accept data from props
    timeframe = '24h' // Accept timeframe from props
}) => {
    const [energyData, setEnergyData] = useState([]);
    const [electricalData, setElectricalData] = useState([]);
    const [localTimeframe, setLocalTimeframe] = useState(timeframe);
    const [chartType, setChartType] = useState('line');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dataStats, setDataStats] = useState({
        voltage: { min: 0, max: 0, avg: 0 },
        current: { min: 0, max: 0, avg: 0 },
        power: { min: 0, max: 0, avg: 0 },
        energy: { min: 0, max: 0, avg: 0 }
    });
    const [dataSource, setDataSource] = useState('Loading...');

    // Use data from props if provided, otherwise fetch from API
    useEffect(() => {
        if (data && data.length > 0) {
            // If data is passed directly as prop, use it
            setElectricalData(data);
            setEnergyData(data);
            setLoading(false);
            setDataSource(`Passed data (${data.length} records)`);

            // Calculate statistics
            calculateStats(data);
        } else {
            // Otherwise fetch data from API
            fetchEnergyTrends();
        }
    }, [data, deviceId, timeframe]);

    // Calculate statistics from data
    const calculateStats = (data) => {
        if (!data || data.length === 0) return;

        try {
            // Extract and calculate statistical values
            const voltageValues = data.map(item => parseFloat(item.voltage || item.avg_voltage || 0)).filter(v => !isNaN(v) && v > 0);
            const currentValues = data.map(item => parseFloat(item.current || item.avg_current || 0)).filter(v => !isNaN(v) && v > 0);
            const powerValues = data.map(item => parseFloat(item.power || item.avg_power || 0)).filter(v => !isNaN(v) && v > 0);
            const energyValues = data.map(item => parseFloat(item.energy || item.total_energy || 0)).filter(v => !isNaN(v) && v > 0);

            const calculateAverage = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

            setDataStats({
                voltage: {
                    min: voltageValues.length ? Math.min(...voltageValues) : 0,
                    max: voltageValues.length ? Math.max(...voltageValues) : 0,
                    avg: calculateAverage(voltageValues)
                },
                current: {
                    min: currentValues.length ? Math.min(...currentValues) : 0,
                    max: currentValues.length ? Math.max(...currentValues) : 0,
                    avg: calculateAverage(currentValues)
                },
                power: {
                    min: powerValues.length ? Math.min(...powerValues) : 0,
                    max: powerValues.length ? Math.max(...powerValues) : 0,
                    avg: calculateAverage(powerValues)
                },
                energy: {
                    min: energyValues.length ? Math.min(...energyValues) : 0,
                    max: energyValues.length ? Math.max(...energyValues) : 0,
                    avg: calculateAverage(energyValues)
                }
            });
        } catch (err) {
            console.error('Error calculating statistics:', err);
        }
    };

    // Fetch energy trend data from API
    const fetchEnergyTrends = useCallback(async () => {
        try {
            setLoading(true);

            // Use the dashboard-summary endpoint to get all data at once
            const response = await axios.get(
                `${API_BASE_URL}/esp32/dashboard-summary/${deviceId}?timeframe=${localTimeframe}`
            );

            if (response.data && response.data.status === 'success') {
                // Extract data from the response
                const { electrical_chart, energy_trends } = response.data;

                // Process electrical chart data
                if (electrical_chart && electrical_chart.data) {
                    setElectricalData(electrical_chart.data);
                    setDataStats(electrical_chart.stats || dataStats);
                    setDataSource(`Database API (${electrical_chart.data.length} records)`);
                }

                // Process energy trends data
                if (energy_trends && energy_trends.data) {
                    setEnergyData(energy_trends.data);
                }

                setError(null);
            } else {
                throw new Error('Invalid response format');
            }
        } catch (err) {
            console.error('Failed to fetch energy trends:', err.message);
            setError('Could not load energy trend data. Please try again.');
            setDataSource('Error');
        } finally {
            setLoading(false);
        }
    }, [deviceId, localTimeframe]);

    // Initial data load and refresh timer
    useEffect(() => {
        // Only fetch if no data is provided as prop
        if (!data || data.length === 0) {
            fetchEnergyTrends();

            // Set up periodic refresh
            if (refreshInterval > 0) {
                const timer = setInterval(fetchEnergyTrends, refreshInterval);
                return () => clearInterval(timer);
            }
        }
    }, [fetchEnergyTrends, refreshInterval, data]);

    // Handle timeframe change
    const handleTimeframeChange = (newTimeframe) => {
        setLocalTimeframe(newTimeframe);
    };

    // Format timestamp for display
    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';

        try {
            const date = new Date(timestamp);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return timestamp;
        }
    };

    // Custom tooltip formatter
    const renderTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 rounded-lg shadow-md border border-gray-200">
                    <p className="text-sm text-gray-500 font-medium">{formatTimestamp(label)}</p>
                    {payload.map((entry, index) => (
                        <p key={`item-${index}`} className="text-sm" style={{ color: entry.color }}>
                            <span className="font-medium">{entry.name}: </span>
                            <span>{entry.value.toFixed(2)} {entry.name === 'Voltage' ? 'V' :
                                entry.name === 'Current' ? 'A' :
                                    entry.name === 'Power' ? 'W' : 'Wh'}</span>
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    // If we already have rendered content from props, no need for loading state
    if (loading && !data) {
        return (
            <div className="h-full flex justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // Error state
    if (error && !data) {
        return (
            <div className="h-full flex justify-center items-center flex-col">
                <p className="text-red-500 mb-3">{error}</p>
                <button
                    onClick={fetchEnergyTrends}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Try Again
                </button>
            </div>
        );
    }

    // No data state
    if ((electricalData.length === 0 && !data) || (data && data.length === 0)) {
        return (
            <div className="h-full flex justify-center items-center text-gray-500">
                No electrical data available for the selected timeframe
            </div>
        );
    }

    // Use either passed data or fetched data
    const displayData = data || electricalData;

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <span className="text-sm font-medium text-gray-500 mr-2">Data Source:</span>
                    <span className="text-sm text-blue-600">{data ? 'Direct from Database' : dataSource}</span>
                </div>

                {/* Chart Type Toggle */}
                <div className="flex space-x-2">
                    <button
                        onClick={() => setChartType('line')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${chartType === 'line'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        Line
                    </button>
                    <button
                        onClick={() => setChartType('area')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${chartType === 'area'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        Area
                    </button>
                </div>
            </div>

            {/* Record count indicator */}
            <div className="bg-blue-50 text-blue-700 text-xs p-2 rounded mb-3">
                Showing {displayData.length} records from database for period: {timeframe || localTimeframe}
            </div>

            {/* Voltage & Current Chart */}
            <div className="flex-1">
                <div className="h-full">
                    <ResponsiveContainer width="100%" height="100%">
                        {chartType === 'line' ? (
                            <LineChart data={displayData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                <XAxis
                                    dataKey="time"
                                    tickFormatter={formatTimestamp}
                                    stroke="#9CA3AF"
                                    fontSize={12}
                                />
                                <YAxis
                                    yAxisId="voltage"
                                    domain={['auto', 'auto']}
                                    stroke="#3B82F6"
                                    fontSize={12}
                                />
                                <YAxis
                                    yAxisId="current"
                                    orientation="right"
                                    domain={['auto', 'auto']}
                                    stroke="#10B981"
                                    fontSize={12}
                                />
                                <Tooltip content={renderTooltip} />
                                <Legend />
                                <Line
                                    yAxisId="voltage"
                                    type="monotone"
                                    dataKey="voltage"
                                    name="Voltage"
                                    stroke="#3B82F6"
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 6, strokeWidth: 2 }}
                                />
                                <Line
                                    yAxisId="current"
                                    type="monotone"
                                    dataKey="current"
                                    name="Current"
                                    stroke="#10B981"
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 6, strokeWidth: 2 }}
                                />
                                <Line
                                    yAxisId="voltage"
                                    type="monotone"
                                    dataKey="power"
                                    name="Power"
                                    stroke="#F59E0B"
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 6, strokeWidth: 2 }}
                                />
                            </LineChart>
                        ) : (
                            <AreaChart data={displayData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                <XAxis
                                    dataKey="time"
                                    tickFormatter={formatTimestamp}
                                    stroke="#9CA3AF"
                                    fontSize={12}
                                />
                                <YAxis
                                    yAxisId="voltage"
                                    domain={['auto', 'auto']}
                                    stroke="#3B82F6"
                                    fontSize={12}
                                />
                                <YAxis
                                    yAxisId="current"
                                    orientation="right"
                                    domain={['auto', 'auto']}
                                    stroke="#10B981"
                                    fontSize={12}
                                />
                                <Tooltip content={renderTooltip} />
                                <Legend />
                                <Area
                                    yAxisId="voltage"
                                    type="monotone"
                                    dataKey="voltage"
                                    name="Voltage"
                                    stroke="#3B82F6"
                                    fill="#93C5FD"
                                    fillOpacity={0.3}
                                />
                                <Area
                                    yAxisId="current"
                                    type="monotone"
                                    dataKey="current"
                                    name="Current"
                                    stroke="#10B981"
                                    fill="#6EE7B7"
                                    fillOpacity={0.3}
                                />
                                <Area
                                    yAxisId="voltage"
                                    type="monotone"
                                    dataKey="power"
                                    name="Power"
                                    stroke="#F59E0B"
                                    fill="#FCD34D"
                                    fillOpacity={0.3}
                                />
                            </AreaChart>
                        )}
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default ElectricalUsageTrends;
