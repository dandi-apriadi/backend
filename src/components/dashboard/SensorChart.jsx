import React, { useState, useEffect, useRef, memo } from "react";
import ReactApexChart from "react-apexcharts";
import { dummySensorHistory } from "../../utils/dummyData";
import { errorOnce } from '../../utils/consoleLogger';

// Create memoized chart component to prevent unnecessary re-renders
const SensorChart = memo(({
    electricalData = { voltage: 220, current: 5.1, power: 1122, energy: 1075 },
    loading = false,
    sensorHistory = dummySensorHistory,
    onTimeframeChange,
    stableRendering = false
}) => {
    const [selectedTimeframe, setSelectedTimeframe] = useState("24h");
    const [chartData, setChartData] = useState(null);
    const chartRef = useRef(null);
    const dataRef = useRef(null);

    // Generate chart data only once for UI design testing
    useEffect(() => {
        // Generate data once on component mount
        const parsedData = generateChartData();
        setChartData(parsedData);
        dataRef.current = parsedData;

        // No automatic updates
    }, []); // Empty array means this runs once on mount only

    // Handle timeframe change
    const handleTimeframeChange = (timeframe) => {
        setSelectedTimeframe(timeframe);
        if (onTimeframeChange) {
            onTimeframeChange(timeframe);
        }
    };

    // Generate time labels
    const generateTimeLabels = () => {
        // If we have history data, use those timestamps
        if (sensorHistory && sensorHistory.length > 0) {
            return sensorHistory.map((item, index) => {
                try {
                    // Support both timestamp formats
                    const timestamp = item.timestamp || item.time_interval;
                    if (!timestamp) return `Point ${index}`;

                    const date = new Date(timestamp);

                    // Verify date is valid
                    if (isNaN(date.getTime())) {
                        return `Invalid-${index}`;
                    }

                    return date.getHours().toString().padStart(2, "0") + ":" +
                        date.getMinutes().toString().padStart(2, "0");
                } catch (e) {
                    return `Error-${index}`;
                }
            });
        }

        // Fallback to generated timestamps
        const now = new Date();
        const labels = [];
        for (let i = 0; i < 12; i++) {
            const time = new Date(now);
            time.setHours(now.getHours() - (11 - i) * 2);
            labels.push(time.getHours().toString().padStart(2, "0") + ":00");
        }

        return labels;
    };

    // Add simulated data integrity indicator
    const [dataIntegrity, setDataIntegrity] = useState({
        valid: true,
        gaps: false,
        message: ''
    });

    // Generate chart data
    const generateChartData = () => {
        if (sensorHistory && sensorHistory.length > 0) {
            try {
                // Map values with validation
                const safeGetValue = (item, prop, defaultVal = 0) => {
                    if (!item || !item.hasOwnProperty(prop)) return defaultVal;
                    const val = parseFloat(item[prop]);
                    return isNaN(val) ? defaultVal : val;
                };

                return {
                    voltage: sensorHistory.map(item => safeGetValue(item, 'voltage', electricalData?.voltage || 0)),
                    current: sensorHistory.map(item => safeGetValue(item, 'current', electricalData?.current || 0)),
                    power: sensorHistory.map(item => safeGetValue(item, 'power', electricalData?.power || 0)),
                    energy: sensorHistory.map(item => safeGetValue(item, 'energy', electricalData?.energy || 0)),
                    timestamps: sensorHistory.map(item => item?.timestamp || item?.time_interval || '')
                };
            } catch (err) {
                errorOnce('SENSOR_CHART_PROCESSING_ERROR', 'Error processing sensor history data:', err);
                return generateFallbackData();
            }
        }

        return generateFallbackData();
    };

    // Generate fallback data when real data is not available
    const generateFallbackData = () => {
        // Create realistic variations based on current values
        const baseValues = {
            voltage: electricalData?.voltage || 220,
            current: electricalData?.current || 5.2,
            power: electricalData?.power || 1144,
            energy: electricalData?.energy || 1080
        };

        const data = {
            voltage: [],
            current: [],
            power: [],
            energy: [],
            timestamps: []
        };

        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const time = new Date(now);
            time.setHours(now.getHours() - (11 - i) * 2);

            // Add variations to make the chart look realistic
            const voltageVar = (Math.random() - 0.5) * 8;
            const currentVar = (Math.random() - 0.5) * 0.6;
            const powerVar = (Math.random() - 0.5) * 200;
            const energyVar = (Math.random() - 0.5) * 160;

            data.voltage.push(Math.max(210, Math.min(235, baseValues.voltage + voltageVar)));
            data.current.push(Math.max(4.5, Math.min(6.0, baseValues.current + currentVar)));
            data.power.push(Math.max(950, Math.min(1400, baseValues.power + powerVar)));
            data.energy.push(Math.max(900, Math.min(1300, baseValues.energy + energyVar)));
            data.timestamps.push(time.toISOString());
        }

        return data;
    };

    // Chart data - use cached data while loading or re-rendering
    const electricalTrendData = chartData || dataRef.current || generateFallbackData();

    // Chart options - stable configuration to prevent flickering
    const chartOptions = {
        chart: {
            type: 'line',
            height: 300,
            toolbar: { show: false },
            zoom: { enabled: false },
            animations: {
                enabled: !stableRendering,
                easing: 'smooth',
                dynamicAnimation: { speed: 250 }
            },
            background: '#fff'
        },
        colors: ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B'],
        stroke: { curve: 'smooth', width: 3 },
        grid: {
            borderColor: '#f1f1f1',
            strokeDashArray: 5,
            row: {
                colors: ['#f8fafc', 'transparent'],
                opacity: 0.5
            },
        },
        markers: {
            size: 4,
            hover: {
                size: 6,
            }
        },
        xaxis: {
            categories: generateTimeLabels(),
            labels: {
                style: {
                    colors: '#64748b',
                    fontSize: '10px',
                },
            },
            axisTicks: {
                show: false
            }
        },
        yaxis: [
            {
                title: {
                    text: "Tegangan (V) & Arus (A)",
                    style: {
                        color: '#8B5CF6',
                        fontSize: '10px',
                        fontWeight: 500
                    }
                },
                labels: {
                    style: {
                        colors: '#64748b',
                        fontSize: '10px',
                    },
                    formatter: function (val) {
                        return val.toFixed(1);
                    }
                },
                forceNiceScale: true
            },
            {
                opposite: true,
                title: {
                    text: "Daya (W) & Energi (Wh)",
                    style: {
                        color: '#10B981',
                        fontSize: '10px',
                        fontWeight: 500
                    }
                },
                labels: {
                    style: {
                        colors: '#64748b',
                        fontSize: '10px',
                    },
                    formatter: function (val) {
                        return val.toFixed(0);
                    }
                },
                forceNiceScale: true
            }
        ],
        tooltip: {
            enabled: true,
            shared: true,
            intersect: false,
            style: {
                fontSize: '12px'
            }
        }
    };

    // Chart series with stable generation
    const chartSeriesData = [
        {
            name: 'Tegangan (V)',
            data: electricalTrendData.voltage
        },
        {
            name: 'Arus (A)',
            data: electricalTrendData.current
        },
        {
            name: 'Konsumsi Daya (W)',
            data: electricalTrendData.power
        },
        {
            name: 'Energi (Wh)',
            data: electricalTrendData.energy
        }
    ];

    // Live indicator replaced with static indicator
    const staticIndicator = (
        <div className="absolute top-2 left-2 flex items-center">
            <div className="flex h-2 w-2 relative">
                <div className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></div>
            </div>
            <span className="ml-1.5 text-xs text-yellow-700 font-medium">Manual Mode</span>
        </div>
    );

    return (
        <div className="relative">
            {/* Timeframe selector */}
            <div className="mb-4 flex justify-end">
                <div className="inline-flex rounded-md shadow-sm" role="group">
                    {['1h', '6h', '24h', '7d'].map((timeframe) => (
                        <button
                            key={timeframe}
                            type="button"
                            className={`px-3 py-1 text-xs font-medium ${timeframe === '1h' ? 'rounded-l-lg ' : timeframe === '7d' ? 'rounded-r-lg ' : ''
                                } ${selectedTimeframe === timeframe ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                            onClick={() => handleTimeframeChange(timeframe)}
                            disabled={loading}
                        >
                            {timeframe}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart component */}
            <div className="h-[300px] relative">
                <ReactApexChart
                    ref={chartRef}
                    options={chartOptions}
                    series={chartSeriesData}
                    type="line"
                    height={300}
                    width="100%"
                    className={loading ? "opacity-50" : ""}
                />

                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50 z-10">
                        <div className="flex flex-col items-center">
                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="mt-2 text-sm text-blue-500 font-medium">Loading Data...</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Replace live indicator with static indicator */}
            {staticIndicator}
        </div>
    );
});

SensorChart.displayName = 'SensorChart';

export default SensorChart;
