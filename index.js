import dotenv from 'dotenv';
dotenv.config();

import { Sequelize, Op } from 'sequelize'; // Add Op import
import express from 'express';
import session from 'express-session';
import SequelizeStore from 'connect-session-sequelize';
import cors from 'cors';
import helmet from 'helmet';
import fileUpload from 'express-fileupload';
import path from 'path';
import fs from 'fs';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { WebSocketServer } from 'ws';
import crypto from 'crypto'; // Add crypto import for session ID generation
import db from './config/Database.js';

import authRoutes from './routes/shared/authRoutes.js';
import esp32Routes from './routes/esp32Routes.js';
import modelDataRoutes from './routes/modelDataRoutes.js';
import dashboardRoutes from './routes/administrator/dashboardRoutes.js';
import profileRoutes from './routes/administrator/profileRoutes.js';
import userManagementRoutes from './routes/administrator/userManagementRoutes.js';
import analyticsRoutes from './routes/analytics.js';
import scheduleRoutes from './routes/scheduleRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import pumpRoutes from './routes/pumpRoutes.js'; // Import the new pump routes

// Import the new data processing function
import { processWebSocketData } from './controllers/esp32Controller.js';

const processESP32Data = (data) => {
    // Ensure all values are correct types
    return {
        device_id: data.device_id || 'unknown',
        voltage: parseFloat(data.voltage) || 0,
        current: parseFloat(data.current) || 0,
        power: parseFloat(data.power) || 0,
        energy: parseFloat(data.energy) || 0,
        pir_status: !!data.pir_status,
        pump_status: !!data.pump_status,
        auto_mode: !!data.auto_mode,
        timestamp: data.timestamp || new Date().toISOString()
    };
};

// Define ESP32 data logging function
const logESP32DataOnly = (data) => {
    // First display any warnings before showing the data
    if (data && data.device_id &&
        data.voltage === 0 &&
        data.current === 0 &&
        data.power === 0 &&
        data.energy === 0) {
        console.warn(JSON.stringify({
            warning_type: "ZERO_VALUES",
            timestamp: new Date().toISOString(),
            device_id: data.device_id,
            message: "All electrical values are zero. Possible PZEM connection issue"
        }, null, 2));
    }

    // Print ESP32 data objects in JSON format
    if (data && data.device_id && (data.voltage !== undefined || data.current !== undefined)) {
        console.log(JSON.stringify({
            type: "ESP32_DATA",
            timestamp: new Date().toISOString(),
            device_id: data.device_id,
            data: {
                voltage: parseFloat(data.voltage) || 0,
                current: parseFloat(data.current) || 0,
                power: parseFloat(data.power) || 0,
                energy: parseFloat(data.energy) || 0,
                pir_status: data.pir_status,
                pump_status: data.pump_status
            }
        }, null, 2));
    }
};

// Function to log device events in a consistent table format
const logDeviceEventTable = (deviceId, eventType, message) => {
    console.log(`Device Event: ${deviceId} | ${eventType} | ${message} | ${new Date().toISOString()}`);
};

// Function to calculate connection quality based on metrics
const calculateConnectionQuality = (avgLatency, messageCount, uptime) => {
    // Simple algorithm - can be enhanced with more sophisticated metrics
    let quality = 100;

    // Reduce quality for high latency
    if (avgLatency > 1000) quality -= 30;
    else if (avgLatency > 500) quality -= 20;
    else if (avgLatency > 200) quality -= 10;

    // Boost quality for high message count and uptime
    if (messageCount > 100 && uptime > 3600) quality += 10;    // Cap within 0-100 range
    return Math.max(0, Math.min(100, quality));
};

// Add these constants for WebSocket management
const WEBSOCKET_PING_INTERVAL = 30000; // Send ping every 30 seconds
const WEBSOCKET_TIMEOUT = 10000; // Wait 10 seconds for pong response
const DATA_BUFFER_SIZE = 100; // Number of recent readings to keep in memory

// Initialize Express app
const app = express();
const server = createServer(app);

// Trust proxy for production (important for session cookies)
if (process.env.NODE_ENV === 'production' && process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
    console.log('Trust proxy enabled for production');
}

// CORS Configuration - NO HARDCODE FALLBACK
app.use(
    cors({
        credentials: true,
        origin: process.env.CLIENT_ORIGIN || "http://localhost:80",
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

// Socket.IO untuk frontend komunikasi - NO HARDCODE FALLBACK
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_ORIGIN,
        methods: ["GET", "POST"],
        credentials: true, // Add credentials support
        allowedHeaders: ["*"] // Allow all headers for better compatibility
    },
    // Add ping timeout settings for better detection
    pingTimeout: 10000,
    pingInterval: 5000
});

// WebSocket server untuk ESP32 komunikasi
const wss = new WebSocketServer({
    server: server,
    path: '/ws'
});

// Add global error handler for WebSocket server
wss.on('error', (error) => {
    console.error(JSON.stringify({
        event: "SERVER_ERROR",
        timestamp: new Date().toISOString(),
        source: "WebSocketServer",
        error: error.message || 'Unknown WebSocket server error'
    }, null, 2));
});

// Implement the broadcastSensorData function
const broadcastSensorData = (data, deviceId) => {
    if (!data) return;

    try {
        // Normalize data format for frontend
        const normalizedData = {
            type: "ESP32_DATA",
            timestamp: new Date().toISOString(),
            device_id: deviceId || data.device_id,
            data: {
                voltage: parseFloat(data.voltage) || 0,
                current: parseFloat(data.current) || 0,
                power: parseFloat(data.power) || 0,
                energy: parseFloat(data.energy) || 0,
                pir_status: !!data.pir_status,
                pump_status: !!data.pump_status,
                auto_mode: !!data.auto_mode
            }
        };

        // Log the data being broadcast (add this for debugging)
        console.log("Broadcasting data to frontend:", JSON.stringify(normalizedData, null, 2));

        // Broadcast to all connected Socket.IO clients
        if (global.io) {
            global.io.emit('sensor_data', normalizedData);
            console.log(`Real-time data broadcast to ${frontendConnections.size} frontend clients`);
        }

        // Return the normalized data (useful for chaining)
        return normalizedData;
    } catch (err) {
        console.error('Error broadcasting sensor data:', err);
    }
};

// Store untuk koneksi aktif
const espConnections = new Map(); // ESP32 connections 
const frontendConnections = new Set(); // Frontend connections
const sensorDataHistory = []; // Store recent sensor data

// Make connections available globally for controllers to use
global.espConnections = espConnections;

// Setup Socket.IO global reference for use in controllers
global.io = io;

const sessionStore = SequelizeStore(session.Store);

// Create session store with database
const store = new sessionStore({
    db: db,
    tableName: process.env.SESSION_TABLE_NAME || 'Sessions',
    checkExpirationInterval: parseInt(process.env.SESSION_CLEANUP_INTERVAL) || 15 * 60 * 1000, // Clean expired sessions every 15 minutes
    expiration: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000, // 24 hours
    // Add error handling for production
    onError: (error) => {
        console.error('Session store error:', error);
    },
    // Add retry logic for production
    retry: {
        max: 3,
        timeout: 30000
    }
});

// Middleware
app.use(helmet()); // Security headers
app.use(express.json()); // Parse JSON bodies
app.use(express.static("public")); // Serve static files

// File upload configuration - modify to only apply to specific routes
const fileUploadMiddleware = fileUpload({
    createParentPath: true,
    limits: {
        fileSize: 20 * 1024 * 1024, // 20MB limit
        files: 6 // Maximum number of files
    },
    abortOnLimit: true,
    useTempFiles: true,
    tempFileDir: path.join(process.cwd(), 'tmp'),
    parseNested: true, // Enable nested object parsing
    debug: false, // Set to false to disable debug messages
    safeFileNames: true,
    preserveExtension: true,
    // Silence noisy messages
    responseOnLimit: 'File size limit exceeded',
    // Only allow certain MIME types
    useTempFiles: true,
    // Add a filter to skip file upload processing for certain routes
    uploadFileFilter: function (req, res) {
        return req.path.startsWith('/api/upload') || req.path.includes('/files/');
    }
});

app.use(['/api/upload', '/files'], fileUploadMiddleware);
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true }));

// Session Configuration
app.use(
    session({
        secret: process.env.SESS_SECRET || "default_secret_key",
        resave: false,
        saveUninitialized: false, // Only save when session is modified
        store: store,
        rolling: true, // Reset expiration on activity
        cookie: {
            secure: process.env.NODE_ENV === "production" ? false : false, // Keep false for HTTP in production (change to true when using HTTPS)
            httpOnly: true,
            maxAge: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000, // Use env variable
            sameSite: process.env.NODE_ENV === "production" ? 'lax' : 'lax', // Use lax for HTTP in production
            domain: process.env.COOKIE_DOMAIN || undefined, // Use env variable for domain
        },
        // Add session name for production
        name: process.env.SESSION_NAME || 'iot.session.id',
        // Add error handling for session operations
        genid: (req) => {
            const sessionId = crypto.randomBytes(16).toString('hex');
            console.log(`[SESSION] Generated new session ID: ${sessionId}`);
            return sessionId;
        }
    })
);

// Session debugging middleware untuk production
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.path.includes('/api/auth/')) {
            console.log(`[SESSION DEBUG] ${req.method} ${req.path}`, {
                sessionExists: !!req.session,
                sessionId: req.sessionID,
                userId: req.session ? req.session.user_id : 'undefined',
                cookies: req.headers.cookie ? 'present' : 'missing'
            });
        }
        next();
    });
}

// Create upload directories
const createUploadDirs = () => {
    const dirs = [
        path.join(process.cwd(), 'public', 'uploads', 'destinations'),
        path.join(process.cwd(), 'tmp')
    ];

    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            fs.chmodSync(dir, 0o755);
        }
    });
};

createUploadDirs();

// Make uploads directory accessible
app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

// =====================================================
// Routes Configuration
// =====================================================
// Mount auth routes both with /api/auth prefix and directly for frontend compatibility
app.use('/api/auth', authRoutes);
app.use('/api/esp32', esp32Routes);
app.use('/api/data', modelDataRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/users', userManagementRoutes);
// app.use('/api/alarms', alarmRoutes); // Removed - alarm feature no longer used
app.use('/api/analytics', analyticsRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/pump', pumpRoutes); // Add pump routes

// =====================================================
// ESP32 WebSocket Handler
// =====================================================
wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`New WebSocket connection from ${clientIp}`);

    let deviceId = null;
    let dbDeviceId = null;
    let connectionAlive = true;
    let lastMessageReceived = Date.now();

    // Keep track of ping/pong for improved connection monitoring
    ws.isAlive = true;
    ws.lastPingTime = Date.now();
    ws.pingTimeoutId = null;

    // Setup ping timeout handler
    const setupPingTimeout = () => {
        clearTimeout(ws.pingTimeoutId);
        ws.pingTimeoutId = setTimeout(() => {
            if (!ws.isAlive) {
                console.error(`WebSocket ping timeout for ${deviceId || 'unknown device'}`);
                ws.terminate();
                return;
            }
            ws.isAlive = false;
            ws.ping();
            ws.lastPingTime = Date.now();
            setupPingTimeout();
        }, WEBSOCKET_PING_INTERVAL);
    };

    // Start ping/pong monitoring
    setupPingTimeout();

    // Send initial welcome message to confirm connection
    try {
        ws.send(JSON.stringify({
            type: 'server_welcome',
            message: 'Connected to IoT server',
            timestamp: new Date().toISOString()
        }));
    } catch (error) {
        // Silent error handling
    }

    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data);
            const messageType = message.type;

            console.log(`Received ${messageType} message from ${clientIp}`);

            // Handle device_register message
            if (messageType === 'device_register') {
                deviceId = message.device_id;
                // Tambahkan log untuk debugging
                console.log('[DEBUG] Device registered via WebSocket:', deviceId);

                // Add device to the connections map with proper initialized connectionStats
                espConnections.set(deviceId, {
                    ws: ws,
                    deviceInfo: {
                        device_type: message.device_type || 'ESP32',
                        location: message.location || 'Unknown',
                        connected_since: new Date(),
                        last_seen: new Date()
                    },
                    connectionStats: {
                        messagesReceived: 0,
                        messagesSent: 0,
                        connectionQuality: 100,
                        latencyMeasurements: []  // Initialize the array
                    }
                });

                // Try to register device in the database if not yet registered
                try {
                    // Import Device model dynamically to avoid circular dependencies
                    const { Device } = await import("./models/tableModel.js");

                    // Check if device exists in database
                    let deviceRecord = await Device.findOne({
                        where: { device_name: deviceId }
                    });

                    // Create device record if it doesn't exist
                    if (!deviceRecord) {
                        deviceRecord = await Device.create({
                            device_name: deviceId,
                            device_type: message.device_type || 'ESP32',
                            location: message.location || 'Unknown',
                            device_status: 'aktif',
                            last_online: new Date()
                        });
                        console.log(`Device ${deviceId} registered in database with ID ${deviceRecord.device_id}`);
                    } else {
                        // Update existing device record
                        await deviceRecord.update({
                            device_status: 'aktif',
                            last_online: new Date()
                        });
                        console.log(`Device ${deviceId} status updated in database`);
                    }

                    // Send successful registration response
                    ws.send(JSON.stringify({
                        status: 'success',
                        received_at: new Date().toISOString(),
                        echo: 'device_register',
                        db_device_id: deviceRecord.device_id,
                        message: 'Device registration successful',
                        timestamp: new Date().toISOString()
                    }));

                    // Sync all active schedules to the newly connected device
                    try {
                        const { syncAllSchedulesToDevice } = await import('./services/esp32Service.js');
                        console.log(`Starting schedule sync for device ${deviceId}`);
                        
                        // Small delay to ensure device is ready to receive commands
                        setTimeout(async () => {
                            try {
                                const syncResult = await syncAllSchedulesToDevice(deviceId);
                                console.log(`Schedule sync completed for ${deviceId}:`, syncResult);
                                
                                // Send sync status to device
                                if (espConnections.has(deviceId)) {
                                    espConnections.get(deviceId).ws.send(JSON.stringify({
                                        type: 'schedule_sync_complete',
                                        syncedCount: syncResult.syncedCount,
                                        totalSchedules: syncResult.totalSchedules,
                                        success: syncResult.success,
                                        timestamp: new Date().toISOString()
                                    }));
                                }
                            } catch (syncError) {
                                console.error(`Schedule sync failed for ${deviceId}:`, syncError.message);
                            }
                        }, 2000); // 2 second delay
                    } catch (importError) {
                        console.error(`Failed to import schedule sync service:`, importError.message);
                    }
                } catch (dbError) {
                    console.error(`Database registration failed for ${deviceId}: ${dbError}`);

                    // Send registration response even if database operation fails
                    ws.send(JSON.stringify({
                        status: 'warning',
                        received_at: new Date().toISOString(),
                        echo: 'device_register',
                        message: 'Connected to server but database registration failed',
                        error: dbError.message,
                        timestamp: new Date().toISOString()
                    }));
                }
            }
            // Handle schedules response from ESP32
            else if (messageType === 'schedules_response') {
                console.log(`[SCHEDULE] Received schedules list from ${deviceId}:`, {
                    scheduleCount: message.schedules ? message.schedules.length : 0,
                    schedules: message.schedules
                });
                
                // Send acknowledgment back to ESP32
                if (ws && ws.readyState === 1) {
                    ws.send(JSON.stringify({
                        type: 'ack',
                        received_type: 'schedules_response',
                        success: true,
                        timestamp: new Date().toISOString()
                    }));
                }
                
                // Log the current schedules in ESP32
                if (message.schedules && message.schedules.length > 0) {
                    console.log(`[SCHEDULE] Current schedules in ${deviceId}:`);
                    message.schedules.forEach((schedule, index) => {
                        const timeStr = `${String(schedule.hour).padStart(2, '0')}:${String(schedule.minute).padStart(2, '0')}`;
                        const executed = schedule.hasExecutedToday ? ' (executed today)' : ' (pending)';
                        console.log(`  ${index + 1}. ${timeStr}${executed}`);
                    });
                } else {
                    console.log(`[SCHEDULE] No active schedules found in ${deviceId}`);
                }
            }
            // Handle schedule response from ESP32
            else if (messageType === 'schedule_response') {
                console.log(`[SCHEDULE] Received schedule response from ${deviceId}:`, {
                    action: message.action,
                    success: message.success,
                    hour: message.hour,
                    minute: message.minute,
                    message: message.message
                });
                
                // Send acknowledgment back to ESP32
                if (ws && ws.readyState === 1) {
                    ws.send(JSON.stringify({
                        type: 'ack',
                        received_type: 'schedule_response',
                        success: true,
                        timestamp: new Date().toISOString()
                    }));
                }
                
                // Log successful schedule operations
                if (message.success) {
                    console.log(`[SCHEDULE] Successfully ${message.action}ed schedule ${message.hour}:${String(message.minute).padStart(2, '0')} on device ${deviceId}`);
                } else {
                    console.error(`[SCHEDULE] Failed to ${message.action} schedule ${message.hour}:${String(message.minute).padStart(2, '0')} on device ${deviceId}: ${message.message}`);
                }
            }
            // Handle sync status from ESP32
            else if (messageType === 'schedule_sync_complete') {
                console.log(`[SCHEDULE] Schedule sync completed for ${deviceId}:`, {
                    syncedCount: message.syncedCount,
                    totalSchedules: message.totalSchedules,
                    success: message.success
                });
            }
            // Handle pump status change message with activation type
            else if (messageType === 'pump_status') {
                console.log(`[PUMP] Received pump status update from ${deviceId}:`, {
                    status: message.status,
                    activation_type: message.activation_type,
                    timestamp: message.timestamp
                });
                
                // Create appropriate notification based on activation type
                try {
                    const { Device } = await import("./models/tableModel.js");
                    const { createPumpActivationNotification, createPumpDeactivationNotification } = 
                        await import("./controllers/notificationController.js");
                    
                    // Find device in the database
                    const device = await Device.findOne({ 
                        where: { device_name: deviceId }
                    });
                    
                    if (device) {
                        const deviceInfo = {
                            device_id: device.device_id,
                            device_name: device.device_name,
                            location: device.location
                        };
                        
                        // Determine if this is a scheduled action
                        const isScheduled = message.activation_type === 'SCHEDULE';
                        
                        if (message.status) {
                            // Pump turned ON - create activation notification
                            console.log(`[PUMP] Creating pump activation notification for ${deviceId} (${message.activation_type})`);
                            await createPumpActivationNotification(deviceInfo, isScheduled, null, message.activation_type);
                        } else {
                            // Pump turned OFF - create deactivation notification
                            console.log(`[PUMP] Creating pump deactivation notification for ${deviceId} (${message.activation_type})`);
                            await createPumpDeactivationNotification(deviceInfo, isScheduled, null, message.activation_type);
                        }
                        
                        // Broadcast pump status to frontend with activation type
                        io.emit('pump_status_update', {
                            device_id: deviceId,
                            status: message.status,
                            activation_type: message.activation_type,
                            timestamp: message.timestamp
                        });
                    }
                } catch (notifError) {
                    console.error(`Error creating pump status notification for ${deviceId}: ${notifError.message}`);
                }
                
                // Send acknowledgment back to ESP32
                if (ws && ws.readyState === 1) {
                    ws.send(JSON.stringify({
                        type: 'ack',
                        received_type: 'pump_status',
                        success: true,
                        timestamp: new Date().toISOString()
                    }));
                }
            }
            // Handle sensor_data message with our updated processing function
            else if (messageType === 'sensor_data') {
                // Store the previous pump status (if available) before updating
                let previousPumpStatus = false;
                if (deviceId && espConnections.has(deviceId)) {
                    const deviceConn = espConnections.get(deviceId);
                    if (deviceConn.deviceInfo && deviceConn.deviceInfo.pump_status !== undefined) {
                        previousPumpStatus = deviceConn.deviceInfo.pump_status;
                    }
                }

                // Process the sensor data with our new filtering function
                const processingResult = await processWebSocketData(message);
                
                // Check if pump status has changed
                const currentPumpStatus = message.pump_status;
                
                // Update device connection info with the current pump status
                if (deviceId && espConnections.has(deviceId)) {
                    const deviceConn = espConnections.get(deviceId);
                    deviceConn.deviceInfo.pump_status = currentPumpStatus;
                    deviceConn.deviceInfo.auto_mode = message.auto_mode || false;
                    
                    // If pump status changed and it's not the first reading
                    // This prevents creating notifications on initial connection
                    if (previousPumpStatus !== undefined && 
                        currentPumpStatus !== previousPumpStatus && 
                        deviceConn.deviceInfo.connected_since) {
                        
                        // Get time since connection to avoid notifications during initial setup
                        const timeConnected = Date.now() - new Date(deviceConn.deviceInfo.connected_since).getTime();
                        
                        // Only create notifications if device has been connected for at least 10 seconds
                        // This avoids notifications during reconnection or initialization
                        if (timeConnected > 10000) {
                            try {
                                // Import needed modules
                                const { Device } = await import("./models/tableModel.js");
                                const { createPumpActivationNotification, createPumpDeactivationNotification } = 
                                    await import("./controllers/notificationController.js");
                                
                                // Find device in the database
                                const device = await Device.findOne({ 
                                    where: { device_name: deviceId }
                                });
                                
                                if (device) {
                                    const deviceInfo = {
                                        device_id: device.device_id,
                                        device_name: device.device_name,
                                        location: device.location
                                    };
                                    
                                    // Create notification based on the new pump status
                                    if (currentPumpStatus) {
                                        // Pump turned ON
                                        console.log(`[PUMP] Detected pump turned ON for ${deviceId}, creating notification`);
                                        await createPumpActivationNotification(deviceInfo, false);
                                    } else {
                                        // Pump turned OFF
                                        console.log(`[PUMP] Detected pump turned OFF for ${deviceId}, creating notification`);
                                        await createPumpDeactivationNotification(deviceInfo, false);
                                    }
                                }
                            } catch (notifError) {
                                console.error(`Error creating pump status change notification: ${notifError.message}`);
                            }
                        }
                    }
                }

                // Send acknowledgment back to the device
                try {
                    ws.send(JSON.stringify({
                        status: processingResult.status,
                        received_at: new Date().toISOString(),
                        echo: 'sensor_data',
                        saved_energy: processingResult.saved_energy || false,
                        saved_sensor: processingResult.saved_sensor || false,
                        reason: processingResult.reason || 'unknown',
                        timestamp: new Date().toISOString()
                    }));
                } catch (sendError) {
                    console.error(`Error sending acknowledgment: ${sendError.message}`);
                }
            }
            // ... handle other message types ...
        } catch (error) {
            // ...existing code...
        }
    });

    // Enhanced WebSocket ping/pong handling for better connection monitoring
    ws.on('pong', () => {
        ws.isAlive = true;
        if (deviceId && espConnections.has(deviceId)) {
            const deviceConn = espConnections.get(deviceId);

            // Update last seen timestamp
            deviceConn.deviceInfo.last_seen = new Date();

            // Calculate ping latency
            const pingLatency = Date.now() - ws.lastPingTime;

            // Make sure connectionStats and latencyMeasurements exist
            if (!deviceConn.connectionStats) {
                deviceConn.connectionStats = {
                    messagesReceived: 0,
                    messagesSent: 0,
                    connectionQuality: 100,
                    latencyMeasurements: []
                };
            }

            if (!deviceConn.connectionStats.latencyMeasurements) {
                deviceConn.connectionStats.latencyMeasurements = [];
            }

            // Now safely push the measurement
            deviceConn.connectionStats.latencyMeasurements.push(pingLatency);

            // Keep only the last 10 measurements
            if (deviceConn.connectionStats.latencyMeasurements.length > 10) {
                deviceConn.connectionStats.latencyMeasurements.shift();
            }

            // Update connection quality based on latency
            const avgLatency = deviceConn.connectionStats.latencyMeasurements.reduce(
                (sum, val) => sum + val, 0
            ) / deviceConn.connectionStats.latencyMeasurements.length;

            deviceConn.connectionStats.avgLatency = avgLatency;

            // Calculate connection quality (0-100)
            deviceConn.connectionStats.connectionQuality = Math.max(
                0,
                Math.min(
                    100,
                    100 - (avgLatency > 500 ? (avgLatency - 500) / 50 : 0)
                )
            );
        }
    });

    ws.on('ping', () => {
        ws.pong();
    });

    // Handle connection close with better cleanup
    ws.on('close', async () => {
        // Clear ping timeout
        clearTimeout(ws.pingTimeoutId);

        if (deviceId) {
            // Log device disconnect with table format
            logDeviceEventTable(deviceId, 'DISCONNECT', 'WebSocket connection closed');
            console.log(`WebSocket connection closed for device ${deviceId}`);

            // Update device status in database
            try {
                const { Device } = await import("./models/tableModel.js");
                await Device.update(
                    { device_status: 'nonaktif' },
                    { where: { device_name: deviceId } }
                );
                console.log(`Device ${deviceId} marked as offline in database`);
            } catch (error) {
                console.error(`Failed to update device status for ${deviceId}:`, error);
            }

            // Clean up connection tracking
            espConnections.delete(deviceId);

            // Broadcast device offline status
            io.emit('device_status', {
                device_id: deviceId,
                status: 'offline',
                timestamp: new Date()
            });
        }
    });

    ws.on('error', (error) => {
        // Improve error handling with logging
        console.error(JSON.stringify({
            event: "ERROR",
            timestamp: new Date().toISOString(),
            source: "WebSocket",
            error: error.message || 'Unknown WebSocket error',
            deviceId: deviceId || 'unknown'
        }, null, 2));

        clearTimeout(ws.pingTimeoutId);
    });
});

// Handle WebSocket message from frontend client
io.on('connection', (socket) => {
    console.log('Frontend client connected:', socket.id);
    frontendConnections.add(socket);

    // Send immediate server status on connection
    socket.emit('server_status', {
        status: 'online',
        timestamp: new Date(),
        active_esp_connections: espConnections.size
    });

    // Send current device status
    const deviceStatuses = [];
    espConnections.forEach((conn, deviceId) => {
        deviceStatuses.push({
            device_id: deviceId,
            status: 'online',
            ...conn.deviceInfo
        });
    });

    socket.emit('device_list', deviceStatuses);

    // Send recent sensor data 
    if (sensorDataHistory.length > 0) {
        socket.emit('sensor_history', sensorDataHistory.slice(-10)); // Last 10 readings
    }

    // Handle frontend commands
    socket.on('send_command', (data) => {
        const { device_id, command, value } = data;

        if (espConnections.has(device_id)) {
            const deviceConn = espConnections.get(device_id);
            const commandMessage = {
                command: command,
                value: value,
                timestamp: new Date().toISOString()
            };

            deviceConn.ws.send(JSON.stringify(commandMessage));
            console.log(`Command sent to ${device_id}:`, commandMessage);

            // Send confirmation to frontend
            socket.emit('command_sent', {
                device_id: device_id,
                command: command,
                status: 'sent',
                timestamp: new Date()
            });
        } else {
            socket.emit('command_error', {
                device_id: device_id,
                error: 'Device not connected',
                timestamp: new Date()
            });
        }
    });

    // Add ping handler to help the frontend detect connection status
    socket.on('ping_server', (data) => {
        console.log(`Ping received from client ${socket.id}:`, data);
        // Send back a pong with the same data plus server timestamp
        socket.emit('pong_client', {
            ...data,
            server_timestamp: new Date(),
            esp_connections: espConnections.size
        });
    });

    // Handle device status request with improved error handling
    socket.on('get_device_status', () => {
        try {
            // Get device statuses
            const deviceStatuses = [];
            espConnections.forEach((conn, deviceId) => {
                const isActive = Date.now() - conn.lastSeen < 30000;

                deviceStatuses.push({
                    device_id: deviceId,
                    status: isActive ? 'online' : 'offline',
                    last_seen: conn.lastSeen,
                    ...conn.deviceInfo
                });
            });

            // Send device status response to the client
            socket.emit('device_status', {
                type: 'device_status',
                devices: deviceStatuses,
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            console.error('Error processing device status request:', err);
            socket.emit('error', {
                message: 'Error processing device status request',
                error: err.message
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('Frontend client disconnected:', socket.id);
        frontendConnections.delete(socket);
    });
});

async function checkInactiveDevices() {
    try {
        const now = Date.now();
        const INACTIVE_THRESHOLD = 30000; // 30 seconds without data = inactive

        // Get all devices from the database with a connection
        const { Device } = await import("./models/tableModel.js");
        const activeDevices = await Device.findAll({
            where: {
                device_status: 'aktif'
            }
        });

        // Check each active device
        for (const device of activeDevices) {
            const deviceId = device.device_name;
            const lastOnline = device.last_online ? new Date(device.last_online).getTime() : 0;
            const timeSinceLastActive = now - lastOnline;

            // Check if this device has a WebSocket connection
            const hasWsConnection = espConnections.has(deviceId);

            // If device is inactive for too long and has no active WebSocket, mark as offline
            if (timeSinceLastActive > INACTIVE_THRESHOLD && !hasWsConnection) {
                console.log(`Device ${deviceId} inactive for ${Math.floor(timeSinceLastActive / 1000)} seconds, marking as offline`);

                // Update device status in the database
                await device.update({ device_status: 'nonaktif' });

                // Broadcast device offline status to frontend clients
                io.emit('device_status', {
                    device_id: deviceId,
                    status: 'offline',
                    timestamp: new Date(),
                    last_seen: new Date(lastOnline)
                });
            }
            // If connection exists but no activity, ping the device
            else if (hasWsConnection && timeSinceLastActive > 15000) {
                const connection = espConnections.get(deviceId);
                try {
                    // Try to ping the device to check connection
                    connection.ws.ping();
                    console.log(`Sent ping to inactive device ${deviceId}`);
                } catch (err) {
                    console.error(`Error pinging device ${deviceId}:`, err);
                    // Connection might be broken, clean it up
                    espConnections.delete(deviceId);
                }
            }
        }

        // Also check for any devices that are marked as active but don't have recent data
        const staleDevices = await Device.findAll({
            where: {
                device_status: 'aktif',
                last_online: {
                    [Op.lt]: new Date(now - INACTIVE_THRESHOLD)
                }
            }
        });

        // Update any stale devices to inactive status
        if (staleDevices.length > 0) {
            console.log(`Found ${staleDevices.length} stale devices to mark inactive`);

            for (const device of staleDevices) {
                await device.update({ device_status: 'nonaktif' });

                // Broadcast status change to frontend
                io.emit('device_status', {
                    device_id: device.device_name,
                    status: 'offline',
                    timestamp: new Date(),
                    last_seen: device.last_online
                });
            }
        }
    } catch (error) {
        console.error('Error checking inactive devices:', error);
    }
}

// Run the inactive device check every 10 seconds
setInterval(checkInactiveDevices, 10000);

// Import needed functions for schedule execution (moved to dynamic imports)
import { sendCommandToDevice } from './services/esp32Service.js';
import { createPumpActivationNotification, createScheduleExecutionNotification } from './controllers/notificationController.js';

/**
 * Checks for schedules that need to be executed and runs them
 * This function will run every minute and check for schedules that need to be executed
 */
async function checkAndExecuteSchedules() {
    try {
        console.log('[SCHEDULE CHECKER] Checking for schedules to execute...');
        
        // Dynamic import of models
        const { default: Schedule } = await import('./models/scheduleModel.js');
        const { Device } = await import('./models/tableModel.js');
        
        // Get current date and time
        const now = new Date();
        
        // Find all active schedules that should run at this time
        const schedulesToRun = await Schedule.findAll({
            where: {
                is_active: true
            },
            include: [{
                model: Device,
                attributes: ['device_name', 'location']
            }]
        });
        
        if (schedulesToRun.length === 0) {
            console.log('[SCHEDULE CHECKER] No active schedules found');
            return;
        }
        
        console.log(`[SCHEDULE CHECKER] Found ${schedulesToRun.length} active schedules to check`);
        
        // Check each schedule if it should run now
        for (const schedule of schedulesToRun) {
            try {
                const { schedule_id, title, device_id, schedule_type, start_time, action_type } = schedule;
                const device = schedule.Device;
                
                // Skip if no associated device
                if (!device) {
                    console.log(`[SCHEDULE CHECKER] Schedule ${schedule_id} (${title}) has no associated device`);
                    continue;
                }
                
                const deviceName = device.device_name;
                const deviceLocation = device.location;
                
                // Parse schedule time
                const scheduleTime = new Date(start_time);
                const scheduleHour = scheduleTime.getHours();
                const scheduleMinute = scheduleTime.getMinutes();
                
                // Check if schedule should run at current time
                const currentHour = now.getHours();
                const currentMinute = now.getMinutes();
                
                let shouldRun = false;
                
                // For 'daily' schedules, check if current time matches schedule time
                if (schedule_type === 'daily' && 
                    currentHour === scheduleHour && 
                    currentMinute === scheduleMinute) {
                    shouldRun = true;
                }
                // For 'one-time' schedules, check if current time matches and it hasn't been executed
                else if (schedule_type === 'one-time' && 
                         !schedule.last_executed &&
                         currentHour === scheduleHour && 
                         currentMinute === scheduleMinute) {
                    shouldRun = true;
                }
                // For 'weekly' schedules, check day of week as well
                else if (schedule_type === 'weekly') {
                    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
                    const scheduleDay = scheduleTime.getDay();
                    
                    if (currentDay === scheduleDay && 
                        currentHour === scheduleHour && 
                        currentMinute === scheduleMinute) {
                        shouldRun = true;
                    }
                }
                
                if (shouldRun) {
                    console.log(`[SCHEDULE CHECKER] Executing schedule ${schedule_id} (${title}) for device ${deviceName}`);
                    
                    // Prepare device info for notification
                    const deviceInfo = {
                        device_id,
                        device_name: deviceName,
                        location: deviceLocation
                    };
                    
                    // Execute the schedule (turn pump on)
                    if (action_type === 'pump_on') {
                        try {
                            // Check if device is connected
                            if (espConnections.has(deviceName)) {
                                // Send command to device
                                await sendCommandToDevice(deviceName, 'pump_on');
                                
                                // Create pump activation notification (isScheduled = true)
                                await createPumpActivationNotification(deviceInfo, true, schedule, 'SCHEDULE');
                                
                                // Create schedule execution notification (success = true)
                                await createScheduleExecutionNotification(deviceInfo, schedule, true);
                                
                                // Update schedule last_executed time
                                await schedule.update({ 
                                    last_executed: now,
                                    execution_status: 'success'
                                });
                                
                                console.log(`[SCHEDULE CHECKER] Successfully executed schedule ${schedule_id}`);
                            } else {
                                // Device offline, create failure notification
                                const errorMsg = `Perangkat ${deviceName} sedang offline`;
                                await createScheduleExecutionNotification(deviceInfo, schedule, false, errorMsg);
                                
                                await schedule.update({
                                    last_executed: now,
                                    execution_status: 'failed',
                                    failure_reason: errorMsg
                                });
                                
                                console.log(`[SCHEDULE CHECKER] Failed to execute schedule ${schedule_id}: Device offline`);
                            }
                        } catch (error) {
                            // Command failed, create failure notification
                            await createScheduleExecutionNotification(deviceInfo, schedule, false, error.message);
                            
                            await schedule.update({
                                last_executed: now,
                                execution_status: 'failed',
                                failure_reason: error.message
                            });
                            
                            console.error(`[SCHEDULE CHECKER] Error executing schedule ${schedule_id}:`, error.message);
                        }
                    }
                }
            } catch (scheduleError) {
                console.error(`[SCHEDULE CHECKER] Error processing schedule ${schedule.schedule_id}:`, scheduleError);
            }
        }
    } catch (error) {
        console.error('[SCHEDULE CHECKER] Error checking schedules:', error);
    }
}

// Run schedule checker every minute
setInterval(checkAndExecuteSchedules, 60000);

// Make sure you have a route to the server running
const PORT = process.env.APP_PORT || process.env.PORT || 5000;

// Initialize database connection before starting server
const initializeDatabase = async () => {
    try {
        console.log('Connecting to database...');
        await db.authenticate();
        console.log('Database connection has been established successfully.');

        // Import models to register them
        await import('./models/sensorModel.js');
        await import('./models/tableModel.js');
        await import('./models/userModel.js');
        // await import('./models/alarmModel.js'); // Removed - alarm feature disabled

        console.log('Models imported successfully.');

        // Sync database (don't force in production)
        await db.sync({ alter: true });
        console.log('Database synchronized successfully.');

        // Sync session store to create sessions table
        try {
            await store.sync();
            console.log('Session store synchronized successfully.');
            
            // Test session store connection
            await store.length();
            console.log('Session store connection test passed.');
        } catch (sessionError) {
            console.error('Session store sync failed:', sessionError);
            console.log('Attempting session store repair...');
            
            // Try to create sessions table manually if sync fails
            try {
                await db.query(`
                    CREATE TABLE IF NOT EXISTS Sessions (
                        sid VARCHAR(36) NOT NULL PRIMARY KEY,
                        expires DATETIME,
                        data TEXT,
                        createdAt DATETIME NOT NULL,
                        updatedAt DATETIME NOT NULL
                    )
                `);
                console.log('Sessions table created manually.');
            } catch (manualError) {
                console.error('Manual session table creation failed:', manualError);
                throw new Error('Session store initialization completely failed');
            }
        }

    } catch (error) {
        console.error('Unable to connect to the database:', error);
        process.exit(1);
    }
};

// Start server after database initialization
const startServer = async () => {
    await initializeDatabase();

    server.listen(PORT, () => {
        console.log(`========================================`);
        console.log(`🚀 Server is running on port ${PORT}`);
        console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
        console.log(`📡 WebSocket server is ready at ws://${process.env.SERVER_URL?.replace('http://', '') || 'localhost'}:${PORT}/ws`);
        console.log(`🔌 Socket.IO is ready at ${process.env.SERVER_URL || `http://localhost:${PORT}`}`);
        console.log(`🍪 Session configuration:`);
        console.log(`   - Session Name: ${process.env.SESSION_NAME || 'iot.session.id'}`);
        console.log(`   - Cookie Domain: ${process.env.COOKIE_DOMAIN || 'undefined'}`);
        console.log(`   - Trust Proxy: ${process.env.TRUST_PROXY === 'true' ? 'Enabled' : 'Disabled'}`);
        console.log(`   - Secure Cookies: ${process.env.NODE_ENV === "production" ? 'false (HTTP)' : 'false'}`);
        console.log(`📊 API endpoints available:`);
        console.log(`   GET  ${process.env.SERVER_URL || `http://localhost:${PORT}`}/api/auth/me`);
        console.log(`   POST ${process.env.SERVER_URL || `http://localhost:${PORT}`}/api/auth/login`);
        console.log(`   GET  ${process.env.SERVER_URL || `http://localhost:${PORT}`}/api/esp32/data/latest`);
        console.log(`   GET  ${process.env.SERVER_URL || `http://localhost:${PORT}`}/api/esp32/diagnostics`);
        console.log(`   POST ${process.env.SERVER_URL || `http://localhost:${PORT}`}/api/esp32/data`);
        console.log(`========================================`);
    });
};

// Start the server
startServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
