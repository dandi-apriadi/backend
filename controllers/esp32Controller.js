import { Sequelize } from 'sequelize';
import moment from 'moment';
import Sensor from "../models/sensorModel.js";
import { Device } from "../models/tableModel.js";
import EnergyTrend from "../models/energyTrendModel.js";
// import { checkSensorAlarms } from "./alarmController.js"; // Removed - alarm feature disabled
import { processESP32Data, getDeviceDatabaseId, validateSensorValues } from "../util/dataProcessor.js";
import Notification from '../models/notificationModel.js';

const { Op } = Sequelize;

// Store the last 100 readings in memory for quick access
let sensorDataCache = [];
const MAX_CACHE_SIZE = 200;
const CACHE_EXPIRY_TIME = 60000; // 60 seconds cache expiry

// Add cache timestamp tracking
let lastCacheCleanup = Date.now();

// Create silent logger for ESP controller
const silentLogger = {
    log: () => { },
    error: () => { },
    warn: () => { },
    info: () => { },
    debug: () => { }
};

// Add a counter for log sequence numbering
let apiLogCounter = 1;

// Track the last PIR motion state per device to detect changes
const lastPirState = new Map();

/**
 * Save electrical data to energy_trends table every 5 seconds
 * @param {Object} electricalData - The electrical data to save
 * @param {number} dbDeviceId - Database device ID
 * @param {Object} transaction - Optional database transaction
 * @returns {Promise<Object>} - The saved energy trend record
 */
async function saveElectricalData(electricalData, dbDeviceId, transaction = null) {
    try {
        // Extract electrical data
        const { voltage, current, power, energy, timestamp } = electricalData;

        // Validate all electrical values and provide fallbacks
        const validVoltage = isNaN(voltage) || voltage === null ? 0 : parseFloat(voltage);
        const validCurrent = isNaN(current) || current === null ? 0 : parseFloat(current);
        const validPower = isNaN(power) || power === null ? 0 : parseFloat(power);
        const validEnergy = isNaN(energy) || energy === null ? 0 : parseFloat(energy);

        // Store last valid readings per device to use as fallbacks
        if (!global.lastValidElectricalValues) {
            global.lastValidElectricalValues = new Map();
        }

        // Get existing values for this device or initialize
        const deviceValues = global.lastValidElectricalValues.get(dbDeviceId) || {
            voltage: 0,
            current: 0,
            power: 0,
            energy: 0,
            timestamp: new Date(),
            updatedCount: 0
        };

        // Only update with non-zero values to maintain data integrity
        // This prevents zeros from overwriting last valid reading
        const updatedValues = {
            voltage: validVoltage > 0 ? validVoltage : deviceValues.voltage,
            current: validCurrent > 0 ? validCurrent : deviceValues.current,
            power: validPower > 0 ? validPower : deviceValues.power,
            energy: validEnergy > 0 ? validEnergy : deviceValues.energy,
            timestamp: new Date(),
            updatedCount: deviceValues.updatedCount + 1
        };

        // Save updated values for future use
        global.lastValidElectricalValues.set(dbDeviceId, updatedValues);

        // Each record represents a 5-second window
        const now = new Date();
        const periodStart = now;
        const periodEnd = new Date(now.getTime() + 5000); // 5 seconds later

        // Use the validated values (potentially from cache if current values are zero)
        const energyRecord = await EnergyTrend.create({
            device_id: dbDeviceId,
            avg_voltage: updatedValues.voltage,
            avg_current: updatedValues.current,
            avg_power: updatedValues.power,
            total_energy: updatedValues.energy,
            pump_active_duration: 0,
            period_start: periodStart,
            period_end: periodEnd,
            period_type: 'realtime',
            data_points: 1
        }, { transaction });

        // Log using JSON format for consistency and include validation info
        // [DISABLED] console.log(JSON.stringify({
        //     event: "ELECTRICAL_DATA_SAVED",
        //     timestamp: now.toISOString(),
        //     device_id: dbDeviceId,
        //     data: {
        //         avg_voltage: updatedValues.voltage,
        //         avg_current: updatedValues.current,
        //         avg_power: updatedValues.power,
        //         total_energy: updatedValues.energy,
        //         used_cached_values: (validVoltage === 0 || validCurrent === 0),
        //         data_points: 1
        //     }
        // }, null, 2));

        return energyRecord;
    } catch (error) {
        console.error(`Error saving electrical data: ${error.message}`);
        throw error;
    }
}

/**
 * Updated shouldSaveData function to save when ANY sensor is true
 * Energy data will be saved separately regardless of this result
 */
const shouldSaveData = (processedData) => {
    const deviceId = processedData.device_id;
    const now = Date.now();

    // Get last PIR state for this device to track changes
    const lastState = lastPirState.get(deviceId) || {
        pirStatus: false,
        pumpStatus: false,
        lastSavedTime: 0,
        lastValues: {
            voltage: 0,
            current: 0,
            power: 0
        }
    };

    // Update last known state in our tracking map
    lastState.pirStatus = processedData.pir_status;
    lastState.pumpStatus = processedData.pump_status;
    lastState.lastValues = {
        voltage: processedData.voltage,
        current: processedData.current,
        power: processedData.power
    };
    lastPirState.set(deviceId, lastState);

    // Save data if EITHER PIR motion detection OR pump is active
    if (processedData.pir_status === true || processedData.pump_status === true) {
        lastState.lastSavedTime = now;

        // Set specific reason based on which sensor is active
        let reason = '';
        if (processedData.pir_status && processedData.pump_status) {
            reason = 'motion_and_pump_active';
        } else if (processedData.pir_status) {
            reason = 'motion_detected';
        } else if (processedData.pump_status) {
            reason = 'pump_active';
        }

        return { shouldSave: true, reason: reason };
    }

    // Don't save if neither is active
    return { shouldSave: false, reason: 'no_sensors_active' };
};

/**
 * Enhanced record sensor data function with separated energy data storage
 */
export const recordSensorData = async (req, res) => {
    const startTime = Date.now();
    const logId = apiLogCounter++;
    const timestamp = new Date().toISOString();

    try {
        // Process the raw data using our utility for comprehensive validation
        const processedData = processESP32Data(req.body);
        processedData.source = 'http_api';
        const deviceId = processedData.device_id;

        // Ensure electrical data is never empty by using fallback values if needed
        const validatedData = ensureNonEmptyElectricalData(processedData, deviceId);

        // Store in global cache for immediate use by WebSocket requests
        if (global.sensorDataCache && deviceId) {
            global.sensorDataCache.set(deviceId, {
                data: validatedData,
                timestamp: Date.now()
            });
        }

        // Always broadcast to WebSocket clients regardless of database saving
        try {
            if (global.io) {
                global.io.emit('sensor_data', {
                    ...validatedData,
                    real_time: true,
                    fallback_used: validatedData._fallback_used || false
                });
            }
        } catch (socketError) {
            console.error('Failed to broadcast data:', socketError.message);
        }

        // Use optimized DB transaction for real-time performance
        let transaction;
        try {
            transaction = await Device.sequelize.transaction();
        } catch (txError) {
            console.error("Transaction creation error:", txError.message);
            return res.status(500).json({
                status: 'error',
                message: 'Database transaction error',
                detail: txError.message
            });
        }

        try {
            // Find or create device in a single transaction with better error handling
            let deviceRecord;
            try {
                deviceRecord = await Device.findOne({
                    where: { device_name: deviceId },
                    transaction,
                    attributes: ['device_id', 'device_name', 'device_status']
                });
            } catch (findError) {
                console.error("Error finding device:", findError.message);
                throw new Error(`Device lookup failed: ${findError.message}`);
            }

            // If device doesn't exist, create it with robust error handling
            if (!deviceRecord) {
                try {
                    deviceRecord = await Device.create({
                        device_name: deviceId,
                        device_status: 'aktif',
                        location: 'Default location',
                        last_online: new Date()
                    }, { transaction });
                    console.log(`Created new device: ${deviceId} with ID ${deviceRecord.device_id}`);
                } catch (createError) {
                    console.error("Device creation error:", createError.message);
                    throw new Error(`Failed to create device: ${createError.message}`);
                }
            } else {
                // Update device's last_online timestamp with error handling
                try {
                    await deviceRecord.update({
                        last_online: new Date(),
                        device_status: 'aktif'
                    }, { transaction });
                } catch (updateError) {
                    console.error("Error updating device status:", updateError.message);
                    // We can continue even if update fails
                }
            }

            // Notifikasi jika perangkat baru terhubung atau status aktif
            if (!deviceRecord.last_online || (new Date() - new Date(deviceRecord.last_online)) > 60000) {
                await notifyDeviceConnected(deviceRecord);
                await saveEspOnlineNotification(deviceRecord);
            }

            // ALWAYS save electrical data to energy_trends table regardless of sensor status
            // This will now save every 5 seconds for real-time trend analysis
            const energyRecord = await saveElectricalData({
                voltage: processedData.voltage,
                current: processedData.current,
                power: processedData.power,
                energy: processedData.energy,
                timestamp: processedData.timestamp
            }, deviceRecord.device_id, transaction);

            // Log using JSON format for consistency and include validation info
            /*
            console.log(`\n========== ELECTRICAL DATA SAVED (REAL-TIME) ==========`);
            console.log(`📊 Device: ${deviceId} | ${new Date().toISOString()}`);
            console.log(`⚡ Voltage: ${processedData.voltage}V | Current: ${processedData.current}A`);
            console.log(`💡 Power: ${processedData.power}W | Energy: ${processedData.energy}Wh`);
            console.log(`================================================\n`);
            */

            // Determine if we should save sensor data based on our filtering rules
            const saveDecision = shouldSaveData(processedData);

            // If we shouldn't save sensor data, commit transaction and return early with success message
            if (!saveDecision.shouldSave) {
                /*
                console.log(JSON.stringify({
                    log_id: `API-${logId.toString().padStart(6, '0')}`,
                    timestamp: timestamp,
                    device_id: deviceId,
                    message: 'PIR/Pump data received but not saved to sensors table (electrical data saved)',
                    filter_reason: saveDecision.reason
                }, null, 2));
                */

                // Commit the transaction with energy data only
                await transaction.commit();

                return res.status(200).json({
                    status: 'success',
                    message: 'Data received, electrical data stored, sensor data filtered',
                    filter_reason: saveDecision.reason,
                    energy_record_id: energyRecord.trend_id,
                    processing_time_ms: Date.now() - startTime
                });
            }

            // If we reach here, we need to save sensor data too
            // Log processed data that will be saved to database
            /*
            console.log(JSON.stringify({
                log_id: `API-${logId.toString().padStart(6, '0')}`,
                timestamp: timestamp,
                device_id: deviceId,
                message: `SAVING SENSOR DATA: ${saveDecision.reason}`,
                data: {
                    pir_status: processedData.pir_status,
                    pump_status: processedData.pump_status,
                    auto_mode: processedData.auto_mode,
                }
            }, null, 2));
            */

            // Create new sensor reading using processed data with enhanced fields
            let newReading;
            try {
                newReading = await Sensor.create({
                    device_id: deviceRecord.device_id,
                    voltage: processedData.voltage,
                    current: processedData.current,
                    power: processedData.power,
                    energy: processedData.energy,
                    pir_status: processedData.pir_status,
                    pump_status: processedData.pump_status,
                    auto_mode: processedData.auto_mode,
                    timestamp: new Date(processedData.timestamp),
                    source: processedData.source
                }, { transaction });

                // Emit data to all connected clients for real-time updates
                if (global.io) {
                    global.io.emit('sensor_data', {
                        ...processedData,
                        real_time: true,
                        db_id: newReading.sensor_id,
                        saved: true,
                        save_reason: saveDecision.reason
                    });
                }

                // Enhanced success log with PIR status highlight
                if (processedData.pir_status === true) {
                    /*
                    console.log(`🔴 MOTION DETECTED: Stored data for ${deviceId} (ID: ${newReading.sensor_id})`);
                    */
                } else {
                    /*
                    console.log(`⚡ Stored electrical data: V=${processedData.voltage}V, I=${processedData.current}A, P=${processedData.power}W, E=${processedData.energy}Wh`);
                    */
                }
            } catch (sensorError) {
                console.error("Sensor data creation error:", sensorError.message);
                throw new Error(`Failed to create sensor reading: ${sensorError.message}`);
            }

            // Commit the transaction with both energy and sensor data
            await transaction.commit();

            // Print a highlighted console message for successful save
            /*
            const saveReason = saveDecision.reason.toUpperCase().replace(/_/g, ' ');
            const pirStatus = processedData.pir_status ? '⚠️ MOTION DETECTED ⚠️' : 'No Motion';
            console.log(`\n========== SENSOR DATA SAVED (${saveReason}) ==========`);
            console.log(`📊 Device: ${deviceId} | ${new Date().toISOString()}`);
            console.log(`📍 PIR Status: ${pirStatus}`);
            console.log(`🚰 Pump: ${processedData.pump_status ? 'ON' : 'OFF'} | Auto: ${processedData.auto_mode ? 'YES' : 'NO'}`);
            console.log(`=================================================\n`);
            */

            // Update in-memory cache with optimized caching strategy
            const cacheEntry = {
                ...newReading.toJSON(),
                device_name: deviceRecord.device_name,
                received_at: new Date(),
                cache_expires_at: Date.now() + CACHE_EXPIRY_TIME
            };

            sensorDataCache.push(cacheEntry);

            // Keep cache size in check and perform periodic cleanup
            if (sensorDataCache.length > MAX_CACHE_SIZE || Date.now() - lastCacheCleanup > 30000) {
                cleanupExpiredCache();
            }

            // Alarm checking feature has been disabled
            // checkSensorAlarms() calls removed as alarm system is no longer used

            return res.status(201).json({
                status: 'success',
                message: 'All data recorded successfully',
                sensor_id: newReading.sensor_id,
                energy_record_id: energyRecord.trend_id,
                save_reason: saveDecision.reason,
                processing_time_ms: Date.now() - startTime
            });
        } catch (error) {
            // Rollback transaction on error
            if (transaction) await transaction.rollback();
            console.error(`Error in recordSensorData: ${error.message}`);
            throw error;
        }
    } catch (error) {
        // Log errors in JSON format
        console.error(JSON.stringify({
            log_id: `API-${logId.toString().padStart(6, '0')}`,
            timestamp: new Date().toISOString(),
            status: "ERROR",
            error: error.message,
            processing_time_ms: Date.now() - startTime
        }, null, 2));

        return res.status(500).json({
            status: 'error',
            message: 'Failed to record sensor data',
            detail: error.message,
            processing_time_ms: Date.now() - startTime
        });
    }
};

/**
 * Clean up expired cache entries
 */
function cleanupExpiredCache() {
    const now = Date.now();

    // Remove expired entries
    sensorDataCache = sensorDataCache.filter(entry =>
        !entry.cache_expires_at || entry.cache_expires_at > now);

    // Ensure we're within size limits
    if (sensorDataCache.length > MAX_CACHE_SIZE) {
        sensorDataCache = sensorDataCache.slice(-MAX_CACHE_SIZE);
    }

    lastCacheCleanup = now;
}

/**
 * Get all sensor data with pagination
 */
export const getAllSensorData = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 0;
        const limit = parseInt(req.query.limit) || 10;
        const offset = page * limit;
        const search = req.query.search || "";
        const deviceId = req.query.device_id || "";

        // Construct where clause
        const whereClause = {};
        if (deviceId) {
            whereClause.device_id = deviceId;
        }

        // Get date range if provided
        const startDate = req.query.start_date ? new Date(req.query.start_date) : null;
        const endDate = req.query.end_date ? new Date(req.query.end_date) : null;

        if (startDate && endDate) {
            whereClause.timestamp = {
                [Op.between]: [startDate, endDate]
            };
        } else if (startDate) {
            whereClause.timestamp = {
                [Op.gte]: startDate
            };
        } else if (endDate) {
            whereClause.timestamp = {
                [Op.lte]: endDate
            };
        }

        // Execute query
        const { count, rows: data } = await Sensor.findAndCountAll({
            where: whereClause,
            offset: offset,
            limit: limit,
            order: [['timestamp', 'DESC']]
        });

        return res.json({
            status: 'success',
            message: 'Sensor data retrieved',
            data,
            page,
            limit,
            rows: data.length,
            total_rows: count,
            total_pages: Math.ceil(count / limit)
        });
    } catch (error) {
        console.error('Error getting sensor data:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve sensor data',
            error: error.message
        });
    }
};

/**
 * Get latest sensor data for each device with real-time optimization
 */
export const getLatestSensorData = async (req, res) => {
    const startTime = Date.now();

    try {
        const deviceId = req.query.device_id;
        const limit = parseInt(req.query.limit) || 1;

        // Enhanced cache-first strategy with validation
        if (deviceId && limit === 1 && sensorDataCache.length > 0) {
            // Check for fresh data in cache first
            const now = Date.now();
            const freshCachedData = sensorDataCache
                .filter(data =>
                    data.device_id === deviceId &&
                    (!data.cache_expires_at || data.cache_expires_at > now))
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 1);

            if (freshCachedData.length > 0) {
                return res.json({
                    status: 'success',
                    message: 'Latest sensor data retrieved from cache',
                    data: freshCachedData[0],
                    is_cached: true,
                    processing_time_ms: Date.now() - startTime
                });
            }
        }

        // Use optimized query with index hints for better performance
        let query;
        if (deviceId) {
            // Query for specific device using more efficient query approach
            query = `
                SELECT s.* 
                FROM sensors s
                INNER JOIN (
                    SELECT device_id, MAX(timestamp) as max_time
                    FROM sensors 
                    WHERE device_id = ?
                    GROUP BY device_id
                ) latest ON s.device_id = latest.device_id AND s.timestamp = latest.max_time
                LIMIT ?
            `;

            const [latestData] = await Sensor.sequelize.query(query, {
                replacements: [deviceId, limit],
                type: Sensor.sequelize.QueryTypes.SELECT,
                model: Sensor
            });

            return res.json({
                status: 'success',
                message: latestData ? 'Latest sensor data retrieved' : 'No sensor data found',
                data: latestData || null,
                is_cached: false,
                processing_time_ms: Date.now() - startTime
            });
        } else {
            // Optimized query for all devices
            query = `
                SELECT s.*
                FROM sensors s
                INNER JOIN (
                    SELECT device_id, MAX(timestamp) as max_time
                    FROM sensors
                    GROUP BY device_id
                ) latest ON s.device_id = latest.device_id AND s.timestamp = latest.max_time
                ORDER BY s.timestamp DESC
                LIMIT ?
            `;

            const latestData = await Sensor.sequelize.query(query, {
                replacements: [limit],
                type: Sensor.sequelize.QueryTypes.SELECT,
                model: Sensor
            });

            return res.json({
                status: 'success',
                message: 'Latest sensor data retrieved',
                data: latestData,
                is_cached: false,
                count: latestData.length,
                processing_time_ms: Date.now() - startTime
            });
        }
    } catch (error) {
        // Silent error handling
        return res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve latest sensor data',
            processing_time_ms: Date.now() - startTime
        });
    }
};

/**
 * Get device status (online/offline)
 */
export const getDeviceStatus = async (req, res) => {
    try {
        // Get WebSocket connections from global variable
        const espConnections = global.espConnections || new Map();
        const now = new Date();

        // First, get all devices from the database
        const allDevices = await Device.findAll({
            attributes: ['device_id', 'device_name', 'device_status', 'location', 'last_online']
        });

        const devices = [];

        // Process each device, determining if it's truly online based on recent data
        for (const device of allDevices) {
            const deviceId = device.device_name;
            const wsConnection = espConnections.get(deviceId);

            // Check both WebSocket connection AND recent database activity
            const lastOnline = device.last_online ? new Date(device.last_online) : null;
            const wsLastSeen = wsConnection?.deviceInfo?.last_seen ? new Date(wsConnection.deviceInfo.last_seen) : null;

            // Get most recent activity timestamp, either from WS or database
            const mostRecentActivity = wsLastSeen && lastOnline ?
                (wsLastSeen > lastOnline ? wsLastSeen : lastOnline) :
                (wsLastSeen || lastOnline);

            // Device is considered online if it has been active in the last 30 seconds
            const isOnline = mostRecentActivity && (now - mostRecentActivity < 30000);

            // For logging device status changes
            const statusChanged = device.device_status === 'aktif' && !isOnline ||
                device.device_status === 'nonaktif' && isOnline;

            if (statusChanged) {
                console.log(`Device ${deviceId} status changed: ${device.device_status} -> ${isOnline ? 'online' : 'offline'}`);
            }            // If device should be online based on recent data
            if (isOnline) {
                devices.push({
                    device_id: device.device_id, // Use the proper integer ID
                    device_name: device.device_name, // Use the device name
                    status: 'online',
                    last_seen: mostRecentActivity,
                    location: device.location,
                    device_info: wsConnection?.deviceInfo || {},
                    // Add more diagnostic info
                    connection_type: wsConnection ? 'websocket' : 'http',
                    database_status: device.device_status
                });

                // Update database status if it doesn't match actual status
                if (device.device_status !== 'aktif') {
                    await Device.update(
                        { device_status: 'aktif' },
                        { where: { device_id: device.device_id } }
                    );
                }
            } else {
                // If device is offline
                devices.push({
                    device_id: device.device_id, // Use the proper integer ID
                    device_name: device.device_name, // Use the device name
                    status: 'offline',
                    last_seen: mostRecentActivity,
                    location: device.location,
                    device_info: {
                        device_type: 'ESP32',
                        last_seen: mostRecentActivity
                    },
                    // Add more diagnostic info
                    database_status: device.device_status,
                    last_activity_seconds_ago: mostRecentActivity ? Math.round((now - mostRecentActivity) / 1000) : null
                });

                // Update device status in DB if it's marked active but is actually offline
                if (device.device_status === 'aktif') {
                    await Device.update(
                        { device_status: 'nonaktif' },
                        { where: { device_id: device.device_id } }
                    );
                }
            }
        }

        return res.json({
            status: 'success',
            message: 'Device status retrieved',
            data: devices,
            count: devices.length,
            timestamp: now
        });
    } catch (error) {
        console.error('Error getting device status:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve device status',
            error: error.message
        });
    }
};

/**
 * Get sensor data history for a specific device with completely silent operation
 * Optimized for real-time data retrieval
 */
export const getSensorHistoryByDevice = async (req, res) => {
    const startTime = Date.now();

    try {
        const { deviceId } = req.params;
        const timeframe = req.query.timeframe || '24h';
        // Add format parameter with default value to fix undefined error
        const format = req.query.format || 'aggregated';

        // Ensure proper timestamp format for the frontend
        const transformTimestamp = (item) => {
            // Make sure timestamp is in ISO format that frontend can parse
            if (item.time_interval && !item.timestamp) {
                item.timestamp = new Date(item.time_interval).toISOString();
            }
            return item;
        };

        // Find device ID by name with minimal attributes
        const device = await Device.findOne({
            where: { device_name: deviceId },
            attributes: ['device_id', 'device_name'] // Only get what we need
        });

        if (!device) {
            return res.status(404).json({
                status: 'error',
                message: `Device not found: ${deviceId}`,
                timestamp: new Date()
            });
        }

        // Calculate time range based on timeframe
        let startDate = new Date();
        switch (timeframe) {
            case '1h':
                startDate.setHours(startDate.getHours() - 1);
                break;
            case '6h':
                startDate.setHours(startDate.getHours() - 6);
                break;
            case '12h':
                startDate.setHours(startDate.getHours() - 12);
                break;
            case '24h':
                startDate.setHours(startDate.getHours() - 24);
                break;
            case '7d':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(startDate.getDate() - 30);
                break;
            default:
                startDate.setHours(startDate.getHours() - 24);
        }

        let data = [];
        let queryError = null;

        try {
            if (format === 'raw') {
                // Optimized query with explicit index hint
                data = await Sensor.findAll({
                    where: {
                        device_id: device.device_id,
                        timestamp: {
                            [Op.gte]: startDate
                        }
                    },
                    order: [['timestamp', 'ASC']],
                    raw: true, // Return plain objects for better performance
                    // Specify required fields only
                    attributes: [
                        'sensor_id', 'device_id', 'voltage', 'current',
                        'power', 'energy', 'pir_status', 'pump_status',
                        'auto_mode', 'timestamp'
                    ]
                }) || [];
            } else {
                // Use optimized query with time interval grouping
                const results = await Sensor.sequelize.query(`
                    SELECT 
                        DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i:00') as time_interval,
                        ROUND(AVG(NULLIF(voltage, 0)), 2) as voltage,
                        ROUND(AVG(NULLIF(current, 0)), 2) as current,
                        ROUND(AVG(NULLIF(power, 0)), 2) as power,
                        ROUND(AVG(NULLIF(energy, 0)), 2) as energy,
                        MAX(pir_status) as pir_status,
                        MAX(pump_status) as pump_status,
                        MAX(auto_mode) as auto_mode
                    FROM sensors
                    USE INDEX (idx_device_timestamp)
                    WHERE device_id = ? AND timestamp >= ?
                    GROUP BY time_interval
                    ORDER BY time_interval ASC
                `, {
                    replacements: [device.device_id, startDate],
                    type: Sensor.sequelize.QueryTypes.SELECT
                });

                // Fix: Ensure results is properly destructured and handle null case
                data = results || [];
            }
        } catch (err) {
            queryError = err.message;
            data = []; // Ensure data is at least an empty array on error
        }

        // Transform and clean data for the frontend
        if (data && data.length > 0) {
            data = data.map(point => {
                const transformed = transformTimestamp(point);
                return {
                    ...transformed,
                    // Ensure all values are proper numbers with reasonable ranges
                    voltage: parseFloat(transformed.voltage || 0),
                    current: parseFloat(transformed.current || 0),
                    power: parseFloat(transformed.power || 0),
                    energy: parseFloat(transformed.energy || 0)
                };
            });
        } else {
            // Ensure data is always an array even if empty
            data = [];
        }

        // Send data with proper metadata that frontend expects
        return res.json({
            status: 'success',
            message: data.length > 0 ? 'Sensor history retrieved' : 'No sensor data found for this period',
            timeframe,
            device_id: deviceId,
            db_device_id: device.device_id,
            count: data.length,
            data,
            processing_time_ms: Date.now() - startTime
        });

    } catch (error) {
        // Improved error handling
        console.error(`History request error for ${req.params?.deviceId}:`, error.message);
        return res.status(500).json({
            status: 'error',
            message: 'Database query failed',
            error: error.message,
            processing_time_ms: Date.now() - startTime
        });
    }
};

/**
 * Send command to ESP32 via WebSocket with improved reliability
 */
// export const sendCommandToESP32 = async (req, res) => {
//     const startTime = Date.now();

//     try {
//         const { deviceId } = req.params;
//         const { command, value } = req.body;

//         if (!deviceId || !command) {
//             return res.status(400).json({
//                 status: 'error',
//                 message: 'deviceId and command are required'
//             });
//         }

//         // Get WebSocket connections from global variable
//         const espConnections = global.espConnections;

//         // Tambahkan log untuk debugging
//         console.log('[DEBUG] DeviceId from request:', deviceId);
//         console.log('[DEBUG] Online devices:', espConnections ? Array.from(espConnections.keys()) : []);

//         if (!espConnections || !espConnections.has(deviceId)) {
//             return res.status(404).json({
//                 status: 'error',
//                 message: 'Device not found or offline'
//             });
//         }

//         const deviceConn = espConnections.get(deviceId);
//         const commandId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
//         const commandMessage = {
//             command_id: commandId, // Add unique ID to track command
//             command: command,
//             value: value,
//             timestamp: new Date().toISOString()
//         };

//         // Update connection stats for command tracking
//         deviceConn.connectionStats.messagesSent++;

//         // Send with promise for better error handling
//         try {
//             deviceConn.ws.send(JSON.stringify(commandMessage));

//             return res.json({
//                 status: 'success',
//                 message: 'Command sent',
//                 command_id: commandId,
//                 data: {
//                     device_id: deviceId,
//                     command: command,
//                     value: value,
//                     timestamp: new Date(),
//                     processing_time_ms: Date.now() - startTime
//                 }
//             });
//         } catch (wsError) {
//             // WebSocket error handling
//             return res.status(502).json({
//                 status: 'error',
//                 message: 'WebSocket send failed',
//                 error: wsError.message,
//                 processing_time_ms: Date.now() - startTime
//             });
//         }
//     } catch (error) {
//         // Silent error handling
//         return res.status(500).json({
//             status: 'error',
//             message: 'Failed to send command',
//             processing_time_ms: Date.now() - startTime
//         });
//     }
// };

/**
 * Get recent sensor data for dashboard
 */
export const getRecentSensorDataForDashboard = async (req, res) => {
    const startTime = Date.now();

    try {
        // If we have data in cache, use it
        if (sensorDataCache.length > 0) {
            const groupedByDevice = {};

            // Group data by device
            sensorDataCache.forEach(reading => {
                if (!groupedByDevice[reading.device_id]) {
                    groupedByDevice[reading.device_id] = [];
                }
                groupedByDevice[reading.device_id].push(reading);
            });

            // Sort each device's readings by timestamp and take only the 12 most recent
            for (const deviceId in groupedByDevice) {
                groupedByDevice[deviceId].sort((a, b) =>
                    new Date(b.timestamp) - new Date(a.timestamp)
                );
                groupedByDevice[deviceId] = groupedByDevice[deviceId].slice(0, 12);
            }

            return res.json({
                status: 'success',
                message: 'Recent sensor data retrieved from cache',
                data: groupedByDevice,
                is_cached: true,
                processing_time_ms: Date.now() - startTime
            });
        }

        // If cache is empty, query the database
        // Get data from last hour
        const startDate = new Date();
        startDate.setHours(startDate.getHours() - 1);

        const recentData = await Sensor.findAll({
            where: {
                timestamp: {
                    [Op.gte]: startDate
                }
            },
            order: [['timestamp', 'DESC']],
            limit: 100
        });

        // Group by device
        const groupedByDevice = {};
        recentData.forEach(reading => {
            if (!groupedByDevice[reading.device_id]) {
                groupedByDevice[reading.device_id] = [];
            }
            groupedByDevice[reading.device_id].push(reading);
        });

        // Take only 12 readings per device
        for (const deviceId in groupedByDevice) {
            groupedByDevice[deviceId] = groupedByDevice[deviceId].slice(0, 12);
        }

        return res.json({
            status: 'success',
            message: 'Recent sensor data retrieved',
            data: groupedByDevice,
            is_cached: false,
            processing_time_ms: Date.now() - startTime
        });
    } catch (error) {
        // Silent error handling
        return res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve recent sensor data',
            processing_time_ms: Date.now() - startTime
        });
    }
};

// Replace the logESP32DataOnly function with a JSON-formatted version
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
        // [DISABLED] console.log(JSON.stringify({
        //     type: "ESP32_DATA",
        //     timestamp: new Date().toISOString(),
        //     device_id: data.device_id,
        //     data: {
        //         voltage: parseFloat(data.voltage) || 0,
        //         current: parseFloat(data.current) || 0,
        //         power: parseFloat(data.power) || 0,
        //         energy: parseFloat(data.energy) || 0,
        //         pir_status: !!data.pir_status,
        //         pump_status: !!data.pump_status,
        //         auto_mode: !!data.auto_mode
        //     }
        // }, null, 2));
    }
};

/**
 * Process ESP32 data received via WebSocket with separated energy and sensor data storage
 * @param {Object} data - Raw ESP32 data from WebSocket
 * @returns {Promise<Object>} - Processing result
 */
export const processWebSocketData = async (data) => {
    const startTime = Date.now();
    const logId = apiLogCounter++;
    const timestamp = new Date().toISOString();

    try {
        // Process data the same way as HTTP endpoint
        const processedData = processESP32Data(data);
        processedData.source = 'websocket';
        const deviceId = processedData.device_id;

        // Validate electrical data and use last known values if needed
        if (!global.deviceElectricalData) {
            global.deviceElectricalData = new Map();
        }

        let lastKnownData = global.deviceElectricalData.get(deviceId);

        // Check for invalid/empty electrical readings
        const hasEmptyReadings =
            isNaN(processedData.voltage) || processedData.voltage === 0 ||
            isNaN(processedData.current) || processedData.current === 0;

        // If we have missing data but previous valid values, use them
        if (hasEmptyReadings && lastKnownData) {
            console.log(`Using last known electrical values for ${deviceId} - current values invalid`);
            processedData.voltage = lastKnownData.voltage || processedData.voltage;
            processedData.current = lastKnownData.current || processedData.current;
            processedData.power = lastKnownData.power || processedData.power;
            processedData.energy = lastKnownData.energy || processedData.energy;
            processedData._used_fallback = true;
        }
        // If data is valid, store it for future fallback
        else if (!hasEmptyReadings) {
            global.deviceElectricalData.set(deviceId, {
                voltage: processedData.voltage,
                current: processedData.current,
                power: processedData.power,
                energy: processedData.energy,
                timestamp: new Date()
            });
        }

        // Update global cache 
        if (global.sensorDataCache && deviceId) {
            global.sensorDataCache.set(deviceId, {
                data: processedData,
                timestamp: Date.now()
            });
        }

        // Always broadcast data to WebSocket clients
        if (global.io) {
            global.io.emit('sensor_data', {
                ...processedData,
                real_time: true,
                data_quality: hasEmptyReadings ? 'fallback_used' : 'live'
            });
        }

        // Start database transaction
        const transaction = await Device.sequelize.transaction();

        try {
            // Find or create device
            let deviceRecord = await Device.findOne({
                where: { device_name: deviceId },
                transaction,
                attributes: ['device_id', 'device_name', 'device_status']
            });

            if (!deviceRecord) {
                deviceRecord = await Device.create({
                    device_name: deviceId,
                    device_status: 'aktif',
                    location: 'Default location',
                    last_online: new Date()
                }, { transaction });
            } else {
                await deviceRecord.update({
                    last_online: new Date(),
                    device_status: 'aktif'
                }, { transaction });
            }

            // Notifikasi jika perangkat baru terhubung atau status aktif
            if (!deviceRecord.last_online || (new Date() - new Date(deviceRecord.last_online)) > 60000) {
                await notifyDeviceConnected(deviceRecord);
                await saveEspOnlineNotification(deviceRecord);
            }

            // ALWAYS save electrical data regardless of sensor status
            // The implementation inside this function is already updated to save every 5 seconds
            const energyRecord = await saveElectricalData({
                voltage: processedData.voltage,
                current: processedData.current,
                power: processedData.power,
                energy: processedData.energy,
                timestamp: processedData.timestamp
            }, deviceRecord.device_id, transaction);

            // Log the electrical data saving
            /*
            console.log(`\n== WEBSOCKET ELECTRICAL DATA SAVED ==`);
            console.log(`Device: ${deviceId} | ${new Date().toISOString()}`);
            console.log(`V: ${processedData.voltage}V | I: ${processedData.current}A | P: ${processedData.power}W`);
            */

            // Check if we should save sensor data based on filtering rules
            const saveDecision = shouldSaveData(processedData);

            // If we shouldn't save sensor data, commit the transaction with energy data only
            if (!saveDecision.shouldSave) {
                console.log(JSON.stringify({
                    log_id: `WS-${logId.toString().padStart(6, '0')}`,
                    timestamp: timestamp,
                    device_id: deviceId,
                    message: 'WebSocket sensor data filtered (electrical data saved)',
                    filter_reason: saveDecision.reason
                }, null, 2));

                // Commit transaction with just energy data
                await transaction.commit();

                return {
                    status: 'success',
                    saved_energy: true,
                    saved_sensor: false,
                    reason: saveDecision.reason,
                    energy_record_id: energyRecord.trend_id,
                    processing_time_ms: Date.now() - startTime
                };
            }

            // If we reach here, we need to save sensor data too
            // Log that we're saving this data
            console.log(JSON.stringify({
                log_id: `WS-${logId.toString().padStart(6, '0')}`,
                timestamp: timestamp,
                device_id: deviceId,
                message: `SAVING WEBSOCKET SENSOR DATA: ${saveDecision.reason}`,
                data: {
                    pir_status: processedData.pir_status,
                    pump_status: processedData.pump_status
                }
            }, null, 2));

            // Create sensor reading
            const newReading = await Sensor.create({
                device_id: deviceRecord.device_id,
                voltage: processedData.voltage,
                current: processedData.current,
                power: processedData.power,
                energy: processedData.energy,
                pir_status: processedData.pir_status,
                pump_status: processedData.pump_status,
                auto_mode: processedData.auto_mode,
                timestamp: new Date(processedData.timestamp),
                source: processedData.source
            }, { transaction });

            // Commit transaction with both energy and sensor data
            await transaction.commit();

            // Print highlighted console message
            const saveReason = saveDecision.reason.toUpperCase().replace(/_/g, ' ');
            const pirStatus = processedData.pir_status ? '⚠️ MOTION DETECTED ⚠️' : 'No Motion';
            console.log(`\n=== WEBSOCKET SENSOR DATA SAVED (${saveReason}) ===`);
            console.log(`📊 Device: ${deviceId} | ${new Date().toISOString()}`);
            console.log(`📍 PIR Status: ${pirStatus}`);
            console.log(`🚰 Pump: ${processedData.pump_status ? 'ON' : 'OFF'}`);
            console.log(`=============================================\n`);

            return {
                status: 'success',
                saved_energy: true,
                saved_sensor: true,
                reason: saveDecision.reason,
                energy_record_id: energyRecord.trend_id,
                sensor_id: newReading.sensor_id,
                processing_time_ms: Date.now() - startTime
            };

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        console.error(`WebSocket data processing error: ${error.message}`);
        return {
            status: 'error',
            message: error.message,
            processing_time_ms: Date.now() - startTime
        };
    }
}

// Add this helper function to prevent data gaps
const ensureNonEmptyElectricalData = (data, deviceId) => {
    // If we don't have a global cache for valid readings, create one
    if (!global.lastValidReadings) {
        global.lastValidReadings = new Map();
    }

    // Get last valid readings for this device
    const lastValid = global.lastValidReadings.get(deviceId) || {
        voltage: 220, // Default reasonable values
        current: 0.1,
        power: 22,
        energy: 0,
        timestamp: new Date(0) // Old timestamp to indicate default values
    };

    // Current reading
    const current = {
        voltage: parseFloat(data.voltage) || 0,
        current: parseFloat(data.current) || 0,
        power: parseFloat(data.power) || 0,
        energy: parseFloat(data.energy) || 0,
        timestamp: new Date()
    };

    // If all values are zero/empty, use last valid readings
    if (current.voltage === 0 && current.current === 0 && current.power === 0) {
        console.log(`All electrical values empty for ${deviceId}, using last valid readings`);
        return {
            ...data,
            voltage: lastValid.voltage,
            current: lastValid.current,
            power: lastValid.power,
            energy: lastValid.energy || data.energy,
            _fallback_used: true
        };
    }

    // If values are non-zero, update last valid readings
    if (current.voltage > 0) {
        lastValid.voltage = current.voltage;
    }
    if (current.current > 0) {
        lastValid.current = current.current;
    }
    if (current.power > 0) {
        lastValid.power = current.power;
    }
    if (!isNaN(current.energy)) {
        lastValid.energy = current.energy;
    }

    // Update last valid timestamp
    lastValid.timestamp = current.timestamp;

    // Store updated valid readings
    global.lastValidReadings.set(deviceId, lastValid);

    return data;
};

// Fungsi notifikasi jika perangkat berhasil terhubung
export const notifyDeviceConnected = async (device) => {
    try {
        if (!device || !device.device_id) {
            console.error('[NOTIFIKASI][ERROR] Device info tidak valid:', device);
            return;
        }
        const notif = await Notification.create({
            type: 'device',
            title: 'Perangkat Terhubung',
            message: `Perangkat ${device.device_name || device.device_id || '-'} berhasil terhubung pada ${new Date().toLocaleString('id-ID')}`,
            device_id: device.device_id
        });
        console.log('[NOTIFIKASI][SUKSES][DEVICE ONLINE]', notif.toJSON());
    } catch (err) {
        console.error('[NOTIFIKASI][ERROR][DEVICE ONLINE]', err.message);
    }
}

// Fungsi untuk selalu menyimpan notifikasi ESP32 online setiap kali dipanggil
async function saveEspOnlineNotification(deviceRecord) {
    try {
        if (!deviceRecord || !deviceRecord.device_id) {
            console.error('[NOTIFIKASI][ERROR] Device info tidak valid:', deviceRecord);
            return;
        }
        const notif = await Notification.create({
            type: 'device',
            title: 'ESP32 Online',
            device_id: deviceRecord.device_id,
            message: `ESP32 (${deviceRecord.device_name || deviceRecord.device_id || '-'}) telah terhubung ke server pada ${new Date().toLocaleString('id-ID')}`
        });
        console.log('[NOTIFIKASI][SUKSES][ESP32 ONLINE]', notif.toJSON());
    } catch (err) {
        console.error('[NOTIFIKASI][ERROR][ESP32 ONLINE]', err.message);
    }
}
