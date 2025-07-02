import { sendCommandToDevice } from '../services/esp32Service.js';
import { Device } from '../models/tableModel.js'; // Import Device model dari named exports
import { createPumpActivationNotification, createPumpDeactivationNotification } from './notificationController.js'; // Import notification functions

/**
 * Send a command to toggle the pump.
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 */
export const togglePump = async (req, res) => {
    const { deviceId } = req.params;
    try {
        // Get device details for notification before sending the command
        const device = await Device.findOne({ where: { device_name: deviceId } });
        
        if (!device) {
            return res.status(404).json({ status: 'error', message: 'Device not found' });
        }
        
        // Get current pump status to determine if we're turning it on or off
        let currentStatus = false;
        if (global.espConnections && global.espConnections.has(deviceId)) {
            const connection = global.espConnections.get(deviceId);
            if (connection.deviceInfo && connection.deviceInfo.pump_status !== undefined) {
                currentStatus = connection.deviceInfo.pump_status;
            }
        }
        
        // Send the command
        const result = await sendCommandToDevice(deviceId, 'toggle_pump');
        
        // Create device info object for notification
        const deviceInfo = {
            device_id: device.device_id,
            device_name: device.device_name,
            location: device.location
        };
        
        // Create notification based on the pump's new status (opposite of current)
        if (currentStatus) {
            // Pump was on, now turning off
            await createPumpDeactivationNotification(deviceInfo, false);
            console.log(`[PUMP] Pump turned OFF for device ${deviceId}, notification created`);
        } else {
            // Pump was off, now turning on
            await createPumpActivationNotification(deviceInfo, false);
            console.log(`[PUMP] Pump turned ON for device ${deviceId}, notification created`);
        }
        
        res.status(200).json({ status: 'success', message: 'Toggle pump command sent.', ...result });
    } catch (error) {
        res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
    }
};

/**
 * Send a command to turn the pump on.
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 */
export const turnPumpOn = async (req, res) => {
    const { deviceId } = req.params;
    try {
        const result = await sendCommandToDevice(deviceId, 'pump_on');
        
        // Get device details for notification
        const device = await Device.findOne({ where: { device_name: deviceId } });
        
        // Send notification for pump activation
        if (device) {
            const deviceInfo = {
                device_id: device.device_id,
                device_name: device.device_name,
                location: device.location
            };
            await createPumpActivationNotification(deviceInfo, false);
            console.log(`[PUMP] Pump turned ON for device ${deviceId}, notification created`);
        }
        
        res.status(200).json({ status: 'success', message: 'Turn pump ON command sent.', ...result });
    } catch (error) {
        res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
    }
};

/**
 * Send a command to turn the pump off.
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 */
export const turnPumpOff = async (req, res) => {
    const { deviceId } = req.params;
    try {
        const result = await sendCommandToDevice(deviceId, 'pump_off');
        
        // Get device details for notification
        const device = await Device.findOne({ where: { device_name: deviceId } });
        
        // Send notification for pump deactivation
        if (device) {
            const deviceInfo = {
                device_id: device.device_id,
                device_name: device.device_name,
                location: device.location
            };
            await createPumpDeactivationNotification(deviceInfo, false);
            console.log(`[PUMP] Pump turned OFF for device ${deviceId}, notification created`);
        }
        
        res.status(200).json({ status: 'success', message: 'Turn pump OFF command sent.', ...result });
    } catch (error) {
        res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
    }
};

/**
 * Unified endpoint to control the pump with a command parameter.
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 */
export const pumpCommand = async (req, res) => {
    const { deviceId } = req.params;
    const { command } = req.body;
    
    if (!command || !['on', 'off', 'toggle'].includes(command)) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Invalid command. Must be "on", "off", or "toggle".' 
        });
    }
    
    try {
        let cmdType;
        
        // Map frontend commands to backend commands
        if (command === 'on') {
            cmdType = 'pump_on';
        } else if (command === 'off') {
            cmdType = 'pump_off';
        } else if (command === 'toggle') {
            cmdType = 'toggle_pump';
        }
        
        // Check if device exists in connections
        const espConnections = global.espConnections;
        if (!espConnections || !espConnections.has(deviceId)) {
            console.warn(`Device ${deviceId} not connected. Command may not be delivered immediately.`);
            
            // Return a special response for offline devices that will be interpreted by frontend
            return res.status(202).json({
                status: 'pending',
                message: `Device appears to be offline. Command queued but may not be delivered until device reconnects.`,
                command: command,
                deviceId: deviceId
            });
        }
        
        // Device is connected, send command normally
        const result = await sendCommandToDevice(deviceId, cmdType);
        res.status(200).json({ 
            status: 'success', 
            message: `Pump ${command} command sent successfully.`, 
            ...result 
        });
    } catch (error) {
        // Special handling for offline devices
        if (error.message === 'Device not found or offline') {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Device not found or offline. Please ensure the ESP32 device is connected.',
                offline: true
            });
        }
        
        res.status(error.statusCode || 500).json({ 
            status: 'error', 
            message: error.message 
        });
    }
};

/**
 * Send a command to set the pump mode (auto/manual).
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 */
export const setPumpMode = async (req, res) => {
    const { deviceId } = req.params;
    const { mode } = req.body; // "auto" or "manual"

    if (!mode || !['auto', 'manual'].includes(mode)) {
        return res.status(400).json({ status: 'error', message: 'Invalid mode specified. Must be "auto" or "manual".' });
    }

    try {
        const result = await sendCommandToDevice(deviceId, 'set_mode', { value: mode });
        res.status(200).json({ status: 'success', message: `Set mode to ${mode} command sent.`, ...result });
    } catch (error) {
        res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
    }
};
