import express from 'express';
import * as esp32Controller from "../controllers/esp32Controller.js";
import * as sensorDataController from "../controllers/sensorDataController.js";
import { getAllSensorData, getLatestSensorData, getInsectActivityStats } from '../controllers/sensorDataController.js';
import { getDueSchedules } from '../controllers/scheduleController.js';

const router = express.Router();

/**
 * ESP32 API Routes
 * IoT System for Sensor Data Management
 */

/**
 * @route GET /api/esp32/device-status
 * @description Check if an ESP32 device is online
 * @access Public
 */
router.get('/device-status', async (req, res) => {
    try {
        const deviceId = req.query.device_id;
        
        if (!deviceId) {
            return res.status(400).json({ 
                status: 'error',
                message: 'Device ID is required',
                online: false
            });
        }

        // Check if the device is connected via WebSocket
        const isConnected = global.espConnections ? global.espConnections.has(deviceId) : false;
        
        return res.status(200).json({
            status: 'success',
            online: isConnected,
            device_id: deviceId,
            message: isConnected ? 'Device is online' : 'Device is offline'
        });
    } catch (error) {
        console.error('Error checking device status:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to check device status',
            online: false
        });
    }
});

/**
 * @route GET /api/esp32/device-status/:deviceId
 * @description Check if an ESP32 device is online using URL parameter
 * @access Public
 */
router.get('/device-status/:deviceId', async (req, res) => {
    try {
        const { deviceId } = req.params;
        
        if (!deviceId) {
            return res.status(400).json({ 
                status: 'error',
                message: 'Device ID is required',
                online: false
            });
        }

        // Check if the device is connected via WebSocket
        const isConnected = global.espConnections ? global.espConnections.has(deviceId) : false;
        
        // Get last seen data (if available) to provide additional context
        let lastSeen = null;
        let lastDataTimestamp = null;
        
        try {
            // Dynamic import of SensorData model
            const SensorData = await import('../models/sensorModel.js');
            const SensorModel = SensorData.default;
            
            // Try to get the latest data record for the device
            const latestData = await SensorModel.findOne({ 
                where: { device_id: deviceId },
                order: [['timestamp', 'DESC']]
            });
            
            if (latestData && latestData.timestamp) {
                lastDataTimestamp = latestData.timestamp;
                const timeDiff = Date.now() - new Date(latestData.timestamp).getTime();
                const minutesAgo = Math.floor(timeDiff / (1000 * 60));
                
                if (minutesAgo < 5) {
                    // If data was received within the last 5 minutes, device might just have a temporary WebSocket disconnection
                    lastSeen = `${minutesAgo} minute${minutesAgo !== 1 ? 's' : ''} ago`;
                } else {
                    lastSeen = lastDataTimestamp;
                }
            }
        } catch (dataError) {
            console.warn(`Could not retrieve last seen data for ${deviceId}:`, dataError.message);
            // Non-critical error, continue
        }
        
        return res.status(200).json({
            status: 'success',
            online: isConnected,
            device_id: deviceId,
            message: isConnected ? 'Device is online' : 'Device is offline',
            last_seen: lastSeen,
            last_data: lastDataTimestamp
        });
    } catch (error) {
        console.error('Error checking device status:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to check device status',
            online: false
        });
    }
});

// Sensor data routes - HTTP API
router.post('/data', esp32Controller.recordSensorData);
router.get('/data', esp32Controller.getLatestSensorData);

// Enhanced data routes for frontend
router.get('/data/history/:deviceId', sensorDataController.getSensorHistory);
router.get('/data/latest', esp32Controller.getLatestSensorData);
router.get('/data/readings/latest', sensorDataController.getLatestReadings);
router.get('/data/daily/:deviceId', sensorDataController.getDailyConsumption);
router.get('/data/stats/:deviceId', sensorDataController.getAggregateStats);

// Check first before setting up this route to avoid errors
if (typeof esp32Controller.getRecentSensorDataForDashboard === 'function') {
    router.get('/data/dashboard', esp32Controller.getRecentSensorDataForDashboard);
} else {
    // Create a fallback route that just returns an error
    router.get('/data/dashboard', (req, res) => {
        return res.status(501).json({
            status: 'error',
            message: 'This endpoint is not implemented yet'
        });
    });
}

// Device management routes
router.get('/devices', esp32Controller.getDeviceStatus);

// Add a diagnostic endpoint for testing connectivity
router.get('/diagnostics', (req, res) => {
    const wsConnections = global.espConnections ? [...global.espConnections.keys()] : [];

    res.json({
        status: 'success',
        message: 'Diagnostics information',
        data: {
            connected_devices: wsConnections,
            websocket_active: wsConnections.length > 0,
            server_time: new Date(),
            socket_io: {
                connected_clients: global.frontendConnections ? global.frontendConnections.size : 0
            }
        }
    });
});

// Add ping endpoint for connectivity testing
router.get('/ping', (req, res) => {
    const deviceId = req.query.device_id;
    const timestamp = new Date();

    // If device_id provided, check if device is registered
    if (deviceId) {
        // Check if device is in WebSocket connections
        const isConnected = global.espConnections ? global.espConnections.has(deviceId) : false;

        if (isConnected) {
            // Get device connection and send a ping command
            const deviceConn = global.espConnections.get(deviceId);
            try {
                deviceConn.ws.ping();
                console.log(`Ping sent to device ${deviceId}`);
            } catch (err) {
                console.error(`Error sending ping to device ${deviceId}:`, err);
            }
        }

        res.json({
            status: 'success',
            message: 'Ping response',
            device_id: deviceId,
            connected_via_websocket: isConnected,
            server_time: timestamp,
            echo: req.query
        });
    } else {
        // No device_id, just return server status
        res.json({
            status: 'success',
            message: 'Server is running',
            server_time: timestamp,
            active_connections: global.espConnections ? global.espConnections.size : 0,
            frontend_connections: global.frontendConnections ? global.frontendConnections.size : 0,
            echo: req.query
        });
    }
});

// Energy trends routes for real-time monitoring
router.get('/energy-trends/:deviceId', sensorDataController.getEnergyTrends);
router.get('/energy-trends/latest/:deviceId', sensorDataController.getLatestEnergyData);

// New route for optimized electrical chart data for dashboard
router.get('/electrical-chart/:deviceId', sensorDataController.getElectricalChartData);

// New route for aggregated power consumption statistics
router.get('/power-stats/:deviceId', async (req, res) => {
    try {
        const { deviceId } = req.params;
        const period = req.query.period || 'day'; // day, week, month

        // Forward to controller function
        await sensorDataController.getPowerConsumptionStats(req, res);
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve power statistics',
            error: error.message
        });
    }
});

// Add a dashboard summary endpoint to get all chart data in one call
router.get('/dashboard-summary/:deviceId', async (req, res) => {
    try {
        const { deviceId } = req.params;
        const timeframe = req.query.timeframe || '24h';

        // Collect all needed data in parallel
        const [electricalData, energyTrends, latestData] = await Promise.all([
            // Directly call controller functions to avoid extra HTTP requests
            sensorDataController.getElectricalChartDataInternal(deviceId, timeframe),
            sensorDataController.getEnergyTrendsInternal(deviceId, timeframe),
            sensorDataController.getLatestEnergyDataInternal(deviceId)
        ]);

        res.json({
            status: 'success',
            message: 'Dashboard summary data retrieved',
            device_id: deviceId,
            electrical_chart: electricalData,
            energy_trends: energyTrends,
            latest_data: latestData,
            timestamp: new Date()
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve dashboard summary',
            error: error.message
        });
    }
});

// Route untuk mengambil semua data sensor (data mentah)
router.get('/data/all', getAllSensorData);

// Route untuk mengambil data sensor terbaru (simplified)
router.get('/data/latest', getLatestSensorData);

// Route untuk mengambil jadwal yang sudah jatuh tempo
router.get('/schedules/trigger-due', getDueSchedules);

// Statistics routes
router.get('/stats/insect-activity', sensorDataController.getInsectActivityStats);

export default router;
