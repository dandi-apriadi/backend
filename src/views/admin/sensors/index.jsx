import React, { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import XLSX from './xlsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, ComposedChart } from 'recharts';

const SensorData = () => {
    const [sensorData, setSensorData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [insectStats, setInsectStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);
    
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Ambil baseURL dari redux (authSlice)
    const baseURL = useSelector(state => state.auth.baseURL?.defaults?.baseURL) || process.env.REACT_APP_API_BASE_URL;

    // Chart data processing
    const chartData = useMemo(() => {
        if (!sensorData.length) return { timelineData: [], statusData: [], insectActivityData: [] };

        // Timeline data for line chart (last 24 hours)
        const timelineData = sensorData
            .slice(0, 24)
            .reverse()
            .map((item, index) => ({
                time: item.timestamp ? item.timestamp.split(' ')[1]?.substring(0, 5) : `${index}`,
                voltage: parseFloat(item.voltage) || 0,
                current: parseFloat(item.current) || 0,
                power: parseFloat(item.power) || 0,
                pir: item.pir_status ? 1 : 0,
                pump: item.pump_status ? 1 : 0
            }));

        // Enhanced status distribution with more detailed metrics
        const pirActive = sensorData.filter(item => item.pir_status).length;
        const pumpActive = sensorData.filter(item => item.pump_status).length;
        const bothActive = sensorData.filter(item => item.pir_status && item.pump_status).length;
        const inactive = sensorData.filter(item => !item.pir_status && !item.pump_status).length;
        
        const statusData = [
            { 
                name: 'Serangga Terdeteksi & Pompa Aktif', 
                value: bothActive, 
                color: '#dc2626',
                percentage: ((bothActive / sensorData.length) * 100).toFixed(1)
            },
            { 
                name: 'Hanya Serangga Terdeteksi', 
                value: pirActive - bothActive, 
                color: '#f59e0b',
                percentage: (((pirActive - bothActive) / sensorData.length) * 100).toFixed(1)
            },
            { 
                name: 'Hanya Pompa Aktif', 
                value: pumpActive - bothActive, 
                color: '#3b82f6',
                percentage: (((pumpActive - bothActive) / sensorData.length) * 100).toFixed(1)
            },
            { 
                name: 'Sistem Standby', 
                value: inactive, 
                color: '#10b981',
                percentage: ((inactive / sensorData.length) * 100).toFixed(1)
            }
        ].filter(item => item.value > 0);

        // Insect activity over time periods (hourly distribution) - Enhanced for last 30 days
        const hourlyActivity = {};
        const currentDate = new Date();
        const thirtyDaysAgo = new Date(currentDate.getTime() - (30 * 24 * 60 * 60 * 1000));
        
        sensorData.forEach(item => {
            if (item.pir_status && item.timestamp) {
                const date = new Date(item.timestamp);
                
                // Only include data from last 30 days
                if (date >= thirtyDaysAgo) {
                    const hour = date.getHours();
                    const hourLabel = `${hour.toString().padStart(2, '0')}:00`;
                    
                    // Hourly activity
                    if (!hourlyActivity[hourLabel]) {
                        hourlyActivity[hourLabel] = {
                            hour: hourLabel,
                            detections: 0,
                            pumpActivations: 0,
                            uniqueDevices: new Set(),
                            avgVoltage: 0,
                            avgCurrent: 0,
                            avgPower: 0,
                            voltageSum: 0,
                            currentSum: 0,
                            powerSum: 0,
                            readingsCount: 0
                        };
                    }
                    
                    hourlyActivity[hourLabel].detections++;
                    hourlyActivity[hourLabel].readingsCount++;
                    hourlyActivity[hourLabel].voltageSum += parseFloat(item.voltage) || 0;
                    hourlyActivity[hourLabel].currentSum += parseFloat(item.current) || 0;
                    hourlyActivity[hourLabel].powerSum += parseFloat(item.power) || 0;
                    
                    if (item.pump_status) {
                        hourlyActivity[hourLabel].pumpActivations++;
                    }
                    hourlyActivity[hourLabel].uniqueDevices.add(item.device_id);
                }
            }
        });

        // Convert hourly activity to array and calculate averages
        const insectActivityData = Object.values(hourlyActivity)
            .map(item => ({
                hour: item.hour,
                detections: item.detections,
                pumpActivations: item.pumpActivations,
                deviceCount: item.uniqueDevices.size,
                efficiency: item.pumpActivations > 0 ? ((item.pumpActivations / item.detections) * 100) : 0,
                avgVoltage: item.readingsCount > 0 ? (item.voltageSum / item.readingsCount) : 0,
                avgCurrent: item.readingsCount > 0 ? (item.currentSum / item.readingsCount) : 0,
                avgPower: item.readingsCount > 0 ? (item.powerSum / item.readingsCount) : 0,
                intensity: item.detections, // For area chart intensity
                responseTime: item.pumpActivations > 0 ? (item.pumpActivations / item.detections) * 100 : 0
            }))
            .sort((a, b) => a.hour.localeCompare(b.hour));

        return { timelineData, statusData, insectActivityData };
    }, [sensorData]);

    useEffect(() => {
        setLoading(true);
        // Use the flexible getAllSensorData endpoint with include_all parameter
        axios.get("/api/esp32/data/all?include_all=true&limit=100", { baseURL })
            .then(res => {
                console.log('Sensor data response:', res.data);
                setSensorData(res.data.data || []);
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching sensor data:', error);
                setLoading(false);
            });

        // Fetch insect activity statistics from backend
        setStatsLoading(true);
        axios.get("/api/esp32/stats/insect-activity", { baseURL })
            .then(res => {
                console.log('Insect stats response:', res.data);
                setInsectStats(res.data.data || null);
                setStatsLoading(false);
            })
            .catch(error => {
                console.error('Error fetching insect stats:', error);
                setStatsLoading(false);
            });
    }, [baseURL]);

    return (
        <div className="bg-gray-50 min-h-screen pb-8">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 shadow-lg rounded-b-2xl overflow-hidden mb-6">
                <div className="px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-1">Monitoring Sensor</h2>
                            <p className="text-blue-100">Pantau kondisi lahan pertanian secara real-time</p>
                        </div>
                        <div className="hidden md:flex items-center space-x-2">
                            <div className="flex items-center bg-white bg-opacity-20 px-3 py-1.5 rounded-lg">
                                <svg className="h-4 w-4 text-blue-100 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-sm text-white">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto px-4">
                {/* Charts Section */}
                {!loading && sensorData.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        {/* Timeline Chart */}
                        <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Trend Data Sensor (24 Data Terakhir)</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={chartData.timelineData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                                    <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: '#f8fafc', 
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="voltage" stroke="#8b5cf6" strokeWidth={2} name="Voltage (V)" />
                                    <Line type="monotone" dataKey="current" stroke="#06b6d4" strokeWidth={2} name="Current (A)" />
                                    <Line type="monotone" dataKey="power" stroke="#f59e0b" strokeWidth={2} name="Power (W)" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Enhanced Status Distribution Chart */}
                        <div className="bg-white rounded-xl shadow-md p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Distribusi Status Sistem</h3>
                            <div className="space-y-4">
                                {chartData.statusData.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div 
                                                className="w-4 h-4 rounded-full" 
                                                style={{ backgroundColor: item.color }}
                                            ></div>
                                            <span className="text-sm font-medium text-gray-700">{item.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-gray-900">{item.value}</div>
                                            <div className="text-xs text-gray-500">{item.percentage}%</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Visual Progress Bars */}
                            <div className="mt-6 space-y-3">
                                {chartData.statusData.map((item, index) => (
                                    <div key={index}>
                                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                                            <span>{item.name}</span>
                                            <span>{item.percentage}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div 
                                                className="h-2 rounded-full transition-all duration-500"
                                                style={{ 
                                                    width: `${item.percentage}%`,
                                                    backgroundColor: item.color 
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Trend Aktivitas Serangga - Format sama dengan Trend Data Sensor */}
                        {insectStats && insectStats.insectActivityData && insectStats.insectActivityData.length > 0 && (
                            <div className="lg:col-span-3 space-y-6">
                                {/* Trend Aktivitas Serangga - LineChart sama seperti Trend Data Sensor */}
                                <div className="bg-white rounded-xl shadow-md p-6">
                                    <h3 className="text-lg font-bold text-gray-800 mb-4">Trend Aktivitas Serangga (30 Hari Terakhir)</h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <LineChart data={insectStats.insectActivityData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                                            <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                                            <YAxis tick={{ fontSize: 12 }} />
                                            <Tooltip 
                                                contentStyle={{ 
                                                    backgroundColor: '#f8fafc', 
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: '8px'
                                                }}
                                            />
                                            <Legend />
                                            <Line type="monotone" dataKey="detections" stroke="#ef4444" strokeWidth={2} name="Deteksi Serangga" />
                                            <Line type="monotone" dataKey="pumpActivations" stroke="#3b82f6" strokeWidth={2} name="Aktivasi Pompa" />
                                            <Line type="monotone" dataKey="efficiency" stroke="#10b981" strokeWidth={2} name="Efisiensi (%)" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                
                                {/* Enhanced Summary Statistics */}
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                                    <h4 className="text-lg font-bold text-gray-800 mb-4">Statistik Aktivitas Serangga</h4>
                                    {statsLoading ? (
                                        <div className="text-center py-8">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                            <p className="text-gray-500 mt-2">Memuat statistik...</p>
                                        </div>
                                    ) : insectStats ? (
                                        <>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                                                    <div className="text-3xl font-bold text-red-600 mb-1">
                                                        {insectStats.totalDetections}
                                                    </div>
                                                    <div className="text-sm text-gray-600 font-medium">Total Deteksi</div>
                                                    <div className="text-xs text-gray-500 mt-1">Serangga Teridentifikasi</div>
                                                </div>
                                                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                                                    <div className="text-3xl font-bold text-blue-600 mb-1">
                                                        {insectStats.totalPumpActivations}
                                                    </div>
                                                    <div className="text-sm text-gray-600 font-medium">Aktivasi Pompa</div>
                                                    <div className="text-xs text-gray-500 mt-1">Respon Sistem</div>
                                                </div>
                                                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                                                    <div className="text-3xl font-bold text-green-600 mb-1">
                                                        {insectStats.efficiency}%
                                                    </div>
                                                    <div className="text-sm text-gray-600 font-medium">Efisiensi Rata-rata</div>
                                                    <div className="text-xs text-gray-500 mt-1">Tingkat Keberhasilan</div>
                                                </div>
                                                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                                                    <div className="text-3xl font-bold text-purple-600 mb-1">
                                                        {insectStats.peakDetections}
                                                    </div>
                                                    <div className="text-sm text-gray-600 font-medium">Puncak Aktivitas</div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        Jam {insectStats.peakHour}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-4 text-center">
                                                <p className="text-xs text-gray-500">
                                                    Data periode: {insectStats.dataRange?.from} - {insectStats.dataRange?.to} 
                                                    ({insectStats.dataRange?.totalRecords} total data)
                                                </p>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center py-4">
                                            <p className="text-gray-500">Tidak ada data statistik tersedia</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Tabel Data Sensor */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
                    <div className="p-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-blue-700">Data Sensor Real-time</h3>
                            <button
                                className="flex items-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-all"
                                onClick={() => {
                                    // Export data as Excel (XLSX)
                                    const header = ['No', 'Tanggal', 'Jam', 'Sensor', 'Lokasi', 'Status PIR', 'Status Pompa', 'Voltage', 'Current', 'Power'];
                                    const rows = sensorData.map((item, idx) => {
                                        const [tanggal, jam] = item.timestamp ? item.timestamp.split(' ') : ['-', '-'];
                                        return [
                                            idx + 1, // Sequential numbering for full dataset
                                            tanggal,
                                            jam,
                                            item.device && item.device.device_name ? item.device.device_name : `ID: ${item.device_id}`,
                                            item.device && item.device.location ? item.device.location : '-',
                                            item.pir_status ? 'Aktif' : 'Tidak Aktif',
                                            item.pump_status ? 'Hidup' : 'Mati',
                                            item.voltage || '-',
                                            item.current || '-',
                                            item.power || '-'
                                        ];
                                    });
                                    const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
                                    const workbook = XLSX.utils.book_new();
                                    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Sensor');
                                    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
                                    const blob = new Blob([wbout], { type: 'application/octet-stream' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'data_sensor.xlsx';
                                    a.click();
                                    URL.revokeObjectURL(url);
                                }}
                            >
                                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Export Data
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead>
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">No</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Tanggal</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Jam</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Sensor</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Lokasi</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status PIR</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status Pompa</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Voltage</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Current</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Power</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr><td colSpan={10} className="text-center py-4">Loading...</td></tr>
                                    ) : sensorData.length === 0 ? (
                                        <tr><td colSpan={10} className="text-center py-4">Tidak ada data sensor</td></tr>
                                    ) : (() => {
                                        // Calculate pagination
                                        const indexOfLastItem = currentPage * itemsPerPage;
                                        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
                                        const currentItems = sensorData.slice(indexOfFirstItem, indexOfLastItem);

                                        return currentItems.map((item, idx) => {
                                            const globalIndex = indexOfFirstItem + idx;
                                            const [tanggal, jam] = item.timestamp ? item.timestamp.split(' ') : ['-', '-'];
                                            return (
                                                <tr key={item.sensor_id || globalIndex} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-700">{globalIndex + 1}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{tanggal}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{jam}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.device && item.device.device_name ? item.device.device_name : `ID: ${item.device_id}`}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.device && item.device.location ? item.device.location : '-'}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${item.pir_status ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                                                            {item.pir_status ? 'Aktif' : 'Tidak Aktif'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${item.pump_status ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                                                            {item.pump_status ? 'Hidup' : 'Mati'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.voltage ? `${item.voltage}V` : '-'}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.current ? `${item.current}A` : '-'}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.power ? `${item.power}W` : '-'}</td>
                                                </tr>
                                            );
                                        });
                                    })()}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Pagination Controls */}
                        {!loading && sensorData.length > 0 && (
                            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 pt-4 border-t border-gray-200">
                                <div className="flex items-center space-x-2 mb-4 sm:mb-0">
                                    <span className="text-sm text-gray-700">Tampilkan</span>
                                    <select
                                        value={itemsPerPage}
                                        onChange={(e) => {
                                            setItemsPerPage(Number(e.target.value));
                                            setCurrentPage(1); // Reset to first page when changing items per page
                                        }}
                                        className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value={5}>5</option>
                                        <option value={10}>10</option>
                                        <option value={25}>25</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                    <span className="text-sm text-gray-700">
                                        dari {sensorData.length} entri
                                    </span>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                    {(() => {
                                        const totalPages = Math.ceil(sensorData.length / itemsPerPage);
                                        const startIndex = (currentPage - 1) * itemsPerPage + 1;
                                        const endIndex = Math.min(currentPage * itemsPerPage, sensorData.length);
                                        
                                        return (
                                            <>
                                                <span className="text-sm text-gray-700 mr-4">
                                                    Menampilkan {startIndex} - {endIndex} dari {sensorData.length}
                                                </span>
                                                
                                                <button
                                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                    disabled={currentPage === 1}
                                                    className="px-3 py-1 text-sm bg-gray-200 text-gray-600 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Previous
                                                </button>
                                                
                                                <div className="flex space-x-1">
                                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                                        .filter(page => 
                                                            page === 1 || 
                                                            page === totalPages || 
                                                            (page >= currentPage - 2 && page <= currentPage + 2)
                                                        )
                                                        .map((page, index, array) => (
                                                            <React.Fragment key={page}>
                                                                {index > 0 && array[index - 1] !== page - 1 && (
                                                                    <span className="px-2 py-1 text-sm text-gray-500">...</span>
                                                                )}
                                                                <button
                                                                    onClick={() => setCurrentPage(page)}
                                                                    className={`px-3 py-1 text-sm rounded ${
                                                                        currentPage === page
                                                                            ? 'bg-blue-600 text-white'
                                                                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                                                    }`}
                                                                >
                                                                    {page}
                                                                </button>
                                                            </React.Fragment>
                                                        ))}
                                                </div>
                                                
                                                <button
                                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                    disabled={currentPage === totalPages}
                                                    className="px-3 py-1 text-sm bg-gray-200 text-gray-600 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Next
                                                </button>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SensorData;
