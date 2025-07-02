import { useState } from 'react';
import { useESP32Data } from 'hooks/useESP32Data';

const ESP32Dashboard = () => {
    const {
        sensorData,
        devices,
        deviceStatus,
        lastUpdate,
        isConnected,
        sendCommand
    } = useESP32Data();

    const [selectedDevice, setSelectedDevice] = useState('ESP32-PUMP-01');

    const handleAutoModeToggle = () => {
        sendCommand(selectedDevice, 'set_auto_mode', !sensorData.auto_mode);
    };

    const handleManualPumpToggle = () => {
        sendCommand(selectedDevice, 'set_manual_pump', !sensorData.pump_status);
    };

    const handlePumpActivate = () => {
        sendCommand(selectedDevice, 'activate_pump', true);
    };

    const handlePumpDeactivate = () => {
        sendCommand(selectedDevice, 'deactivate_pump', true);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'online': return 'text-green-500';
            case 'offline': return 'text-red-500';
            default: return 'text-gray-500';
        }
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp).toLocaleString();
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">ESP32 IoT Dashboard</h1>
                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="font-medium">
                            {isConnected ? 'Connected to Server' : 'Disconnected'}
                        </span>
                    </div>
                    {lastUpdate && (
                        <span className="text-gray-500">
                            Last Update: {formatTimestamp(lastUpdate)}
                        </span>
                    )}
                </div>
            </div>

            {/* Device Status Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4">Device Status</h2>
                    {devices.length > 0 ? (
                        devices.map(device => (
                            <div key={device.device_id} className="flex justify-between items-center py-2">
                                <div>
                                    <div className="font-medium">{device.device_id}</div>
                                    <div className="text-sm text-gray-500">{device.location}</div>
                                </div>
                                <div className={`font-medium ${getStatusColor(deviceStatus[device.device_id]?.status)}`}>
                                    {deviceStatus[device.device_id]?.status || 'unknown'}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-gray-500">No devices connected</div>
                    )}
                </div>

                {/* Sensor Data */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4">Electrical Sensors</h2>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Voltage:</span>
                            <span className="font-medium">{sensorData.voltage.toFixed(2)} V</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Current:</span>
                            <span className="font-medium">{sensorData.current.toFixed(3)} A</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Power:</span>
                            <span className="font-medium">{sensorData.power.toFixed(2)} W</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Energy:</span>
                            <span className="font-medium">{sensorData.energy.toFixed(2)} Wh</span>
                        </div>
                    </div>
                </div>

                {/* Motion & Pump Status */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4">System Status</h2>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">PIR Motion:</span>
                            <span className={`px-2 py-1 rounded text-sm font-medium ${sensorData.pir_status
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                                }`}>
                                {sensorData.pir_status ? 'DETECTED' : 'NO MOTION'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Pump Status:</span>
                            <span className={`px-2 py-1 rounded text-sm font-medium ${sensorData.pump_status
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                                }`}>
                                {sensorData.pump_status ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Auto Mode:</span>
                            <span className={`px-2 py-1 rounded text-sm font-medium ${sensorData.auto_mode
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                {sensorData.auto_mode ? 'AUTO' : 'MANUAL'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Control Panel */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4">Device Control</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                    {/* Device Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Device
                        </label>
                        <select
                            value={selectedDevice}
                            onChange={(e) => setSelectedDevice(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {devices.map(device => (
                                <option key={device.device_id} value={device.device_id}>
                                    {device.device_id}
                                </option>
                            ))}
                            {devices.length === 0 && (
                                <option value="ESP32-PUMP-01">ESP32-PUMP-01</option>
                            )}
                        </select>
                    </div>

                    {/* Auto Mode Toggle */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Auto Mode
                        </label>
                        <button
                            onClick={handleAutoModeToggle}
                            disabled={!isConnected}
                            className={`w-full px-4 py-2 rounded-md font-medium ${sensorData.auto_mode
                                ? 'bg-blue-500 text-white hover:bg-blue-600'
                                : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {sensorData.auto_mode ? 'AUTO ON' : 'AUTO OFF'}
                        </button>
                    </div>

                    {/* Manual Pump Control */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Manual Pump
                        </label>
                        <button
                            onClick={handleManualPumpToggle}
                            disabled={!isConnected || sensorData.auto_mode}
                            className={`w-full px-4 py-2 rounded-md font-medium ${sensorData.pump_status && !sensorData.auto_mode
                                ? 'bg-green-500 text-white hover:bg-green-600'
                                : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {sensorData.pump_status && !sensorData.auto_mode ? 'PUMP ON' : 'PUMP OFF'}
                        </button>
                    </div>

                    {/* Emergency Controls */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Emergency
                        </label>
                        <div className="flex gap-2">
                            <button
                                onClick={handlePumpActivate}
                                disabled={!isConnected}
                                className="flex-1 px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                                ON
                            </button>
                            <button
                                onClick={handlePumpDeactivate}
                                disabled={!isConnected}
                                className="flex-1 px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                                OFF
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Real-time Chart Placeholder */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Real-time Data</h2>
                <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                    <div className="text-center text-gray-500">
                        <div className="text-2xl mb-2">📊</div>
                        <div>Real-time chart will be displayed here</div>
                        <div className="text-sm mt-2">
                            Current: {sensorData.voltage.toFixed(2)}V, {sensorData.current.toFixed(3)}A, {sensorData.power.toFixed(2)}W
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ESP32Dashboard;
