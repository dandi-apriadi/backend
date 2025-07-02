/**
 * Service to interact with ESP32 devices over WebSocket.
 */

/**
 * Sends a command to a specific device.
 * @param {string} deviceId - The ID of the device to send the command to.
 * @param {string} command - The command to send (e.g., 'toggle_pump', 'set_mode').
 * @param {object} [value] - Optional value to send with the command.
 * @returns {Promise<object>} - A promise that resolves with the result of the command.
 * @throws {Error} - Throws an error if the device is not connected or the command fails.
 */
export const sendCommandToDevice = (deviceId, command, value) => {
    return new Promise((resolve, reject) => {
        const espConnections = global.espConnections;
        
        // More detailed error when device connections aren't initialized
        if (!espConnections) {
            console.error("WebSocket connections not initialized. Check if the WebSocket server is running.");
            const error = new Error('WebSocket connection management not initialized');
            error.statusCode = 500;
            return reject(error);
        }
        
        // Check if device is connected
        if (!espConnections.has(deviceId)) {
            console.warn(`Device ${deviceId} not found in active connections. Available devices: ${[...espConnections.keys()].join(', ') || 'none'}`);
            
            // Log more diagnostic information
            console.log(`Active WebSocket connections: ${espConnections.size}`);
            espConnections.forEach((conn, id) => {
                console.log(`- Device ${id}: connected since ${conn.connectedSince}`);
            });
            
            const error = new Error('Device not found or offline');
            error.statusCode = 404;
            error.deviceId = deviceId;
            error.details = {
                activeConnections: espConnections.size,
                activeDevices: [...espConnections.keys()]
            };
            return reject(error);
        }

        const deviceConn = espConnections.get(deviceId);
        
        // Add additional check for WebSocket readiness
        if (!deviceConn.ws || deviceConn.ws.readyState !== 1) { // 1 = OPEN
            console.warn(`Device ${deviceId} WebSocket not in OPEN state. Current state: ${deviceConn.ws ? deviceConn.ws.readyState : 'undefined'}`);
            const error = new Error('Device connection not ready');
            error.statusCode = 503;
            error.deviceId = deviceId;
            return reject(error);
        }
        
        const commandMessage = {
            command: command,
            timestamp: new Date().toISOString(),
            command_id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` // Add unique command ID
        };

        if (value !== undefined) {
            commandMessage.value = value;
        }

        try {
            deviceConn.ws.send(JSON.stringify(commandMessage), (error) => {
                if (error) {
                    const sendError = new Error('Failed to send command to device.');
                    sendError.statusCode = 500;
                    return reject(sendError);
                }
                console.log(`Command '${command}' sent to ${deviceId}`);
                resolve({ deviceId, command, value });
            });
        } catch (error) {
            const catchError = new Error('Exception while sending command.');
            catchError.statusCode = 500;
            reject(catchError);
        }
    });
};

/**
 * Sends all active schedules to a specific ESP32 device.
 * This function is typically called when a device first connects.
 * @param {string} deviceId - The ID of the device to sync schedules to.
 * @returns {Promise<object>} - A promise that resolves with the sync result.
 */
export const syncAllSchedulesToDevice = async (deviceName) => {
    try {
        // Import here to avoid circular dependency
        const { Schedule } = await import('../models/scheduleModel.js');
        const { Device } = await import('../models/tableModel.js');
        
        console.log(`Starting schedule sync for device ${deviceName}`);
        
        // First, find the device by name to get the numeric device_id
        const device = await Device.findOne({
            where: { device_name: deviceName }
        });
        
        if (!device) {
            console.error(`Device with name ${deviceName} not found in database`);
            return { success: false, syncedCount: 0, error: 'Device not found' };
        }
        
        console.log(`Found device ${deviceName} with database ID ${device.device_id}`);
        
        // Get all active schedules for this device using the numeric device_id
        const schedules = await Schedule.findAll({
            where: {
                device_id: device.device_id,
                is_active: true
            },
            order: [['start_time', 'ASC']]
        });

        console.log(`Found ${schedules.length} active schedules for device ${deviceName} (ID: ${device.device_id})`);

        if (schedules.length === 0) {
            console.log(`No schedules to sync for device ${deviceName}`);
            return { success: true, syncedCount: 0 };
        }

        let syncedCount = 0;
        const errors = [];

        // Send each schedule to the ESP32
        for (const schedule of schedules) {
            try {
                // Parse start_time - handle both TIME format (HH:MM:SS) and DateTime
                let hour, minute;
                
                if (typeof schedule.start_time === 'string') {
                    // Handle TIME format like "08:30:00" or "08:30"
                    const timeParts = schedule.start_time.split(':');
                    hour = parseInt(timeParts[0], 10);
                    minute = parseInt(timeParts[1], 10);
                } else {
                    // Handle Date object
                    const startTime = new Date(schedule.start_time);
                    hour = startTime.getHours();
                    minute = startTime.getMinutes();
                }

                console.log(`Syncing schedule ${schedule.schedule_id} - Parsed time: ${hour}:${minute}`);

                const commandValue = {
                    hour: hour,
                    minute: minute,
                    schedule_id: schedule.schedule_id,
                    title: schedule.title
                };

                await sendCommandToDevice(deviceName, 'add_schedule', commandValue);
                syncedCount++;
                
                console.log(`Synced schedule ${schedule.schedule_id} (${schedule.title}) to device ${deviceName}`);
            } catch (error) {
                console.error(`Failed to sync schedule ${schedule.schedule_id} to device ${deviceName}:`, error.message);
                errors.push({ schedule_id: schedule.schedule_id, error: error.message });
            }
        }

        console.log(`Schedule sync completed for device ${deviceName}: ${syncedCount}/${schedules.length} schedules synced`);

        return {
            success: errors.length === 0,
            syncedCount: syncedCount,
            totalSchedules: schedules.length,
            errors: errors
        };
    } catch (error) {
        console.error(`Failed to sync schedules to device ${deviceName}:`, error.message);
        throw error;
    }
};
