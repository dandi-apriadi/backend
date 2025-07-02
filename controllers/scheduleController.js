import Schedule from '../models/scheduleModel.js';
import { Device } from '../models/tableModel.js'; // Import Device dari named exports
import { sendCommandToDevice } from '../services/esp32Service.js';
import { Op } from 'sequelize';
import { createPumpActivationNotification, createScheduleExecutionNotification } from './notificationController.js'; // Import notification functions
import { notifyScheduleResult } from './sensorDataController.js'; // Import notifyScheduleResult function

// Helper function to find device by ID or name
const findDeviceByIdOrName = async (identifier) => {
    // First try to find by primary key (device_id)
    let device = await Device.findByPk(identifier);
    
    // If not found and identifier is a string, try to find by device_name
    if (!device && typeof identifier === 'string') {
        device = await Device.findOne({ 
            where: { device_name: identifier } 
        });
    }
    
    return device;
};

// Get all schedules
export const getAllSchedules = async (req, res) => {
    try {
        const { device_id, is_active } = req.query;
        let whereClause = {};

        // Apply filters if provided
        if (device_id) {
            whereClause.device_id = device_id;
        }

        if (is_active !== undefined) {
            whereClause.is_active = is_active === 'true';
        }

        console.log('GetAllSchedules - Fetching schedules with filters:', whereClause);

        const schedules = await Schedule.findAll({
            where: whereClause,
            include: [{
                model: Device,
                attributes: ['device_name', 'location']
            }],
            order: [['updated_at', 'DESC']]
        });

        console.log('GetAllSchedules - Found schedules:', schedules.length);
        console.log('GetAllSchedules - Schedule data:', schedules.map(s => ({
            id: s.schedule_id,
            title: s.title,
            device_id: s.device_id,
            schedule_type: s.schedule_type
        })));

        return res.json({
            status: 'success',
            message: 'Schedules retrieved successfully',
            data: schedules,
            count: schedules.length
        });
    } catch (error) {
        console.error('Error fetching schedules:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve schedules',
            error: error.message
        });
    }
};

// Get schedule by ID
export const getScheduleById = async (req, res) => {
    try {
        const { id } = req.params;

        const schedule = await Schedule.findByPk(id, {
            include: [{
                model: Device,
                attributes: ['device_name', 'location']
            }]
        });

        if (!schedule) {
            return res.status(404).json({
                status: 'error',
                message: `Schedule with ID ${id} not found`
            });
        }

        return res.json({
            status: 'success',
            message: 'Schedule retrieved successfully',
            data: schedule
        });
    } catch (error) {
        console.error('Error fetching schedule:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve schedule',
            error: error.message
        });
    }
};

// Create new schedule
export const createSchedule = async (req, res) => {
    try {
        const {
            device_id,
            title,
            schedule_type,
            start_time,
            end_time,
            action_type,
            is_active
        } = req.body;

        // Validate required fields
        if (!device_id || !title || !schedule_type || !start_time) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields: device_id, title, schedule_type, and start_time are required'
            });
        }

        // Validate device exists (can be device_id or device_name)
        const device = await findDeviceByIdOrName(device_id);
        if (!device) {
            return res.status(404).json({
                status: 'error',
                message: `Device with ID/Name ${device_id} not found`
            });
        }
        
        // Use the actual database device_id for storing the schedule
        const actualDeviceId = device.device_id;

        // Validate schedule_type
        if (!['one-time', 'daily', 'weekly', 'custom'].includes(schedule_type)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid schedule_type. Must be one of: one-time, daily, weekly, custom'
            });
        }

        // Validate action_type if provided
        if (action_type && !['turn_on', 'turn_off', 'toggle'].includes(action_type)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid action_type. Must be one of: turn_on, turn_off, toggle'
            });
        }        // Create the schedule
        const newSchedule = await Schedule.create({
            device_id: actualDeviceId,
            title,
            schedule_type,
            start_time,
            end_time,
            action_type: action_type || 'turn_on',
            is_active: is_active !== undefined ? is_active : true
        });

        // Send schedule to ESP32 in real-time using device_name
        await sendScheduleToESP32(device.device_name, newSchedule, 'add');

        // Notifikasi schedule berhasil dibuat/berhasil dijalankan (simulasi eksekusi)
        await notifyScheduleResult({
            device,
            device_id: actualDeviceId,
            timestamp: new Date(),
            success: true
        });

        return res.status(201).json({
            status: 'success',
            message: 'Schedule created successfully',
            data: newSchedule
        });
    } catch (error) {
        // Notifikasi schedule gagal dibuat/eksekusi gagal
        await notifyScheduleResult({
            device: null,
            device_id: req.body.device_id,
            timestamp: new Date(),
            success: false,
            reason: error.message
        });
        console.error('Error creating schedule:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to create schedule',
            error: error.message
        });
    }
};

// Update schedule
export const updateSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            device_id, // tambahkan device_id
            title,
            schedule_type,
            start_time,
            end_time,
            action_type,
            is_active
        } = req.body;

        console.log('updateSchedule - Params ID:', id);
        console.log('updateSchedule - Request body:', req.body);

        // Find the schedule
        const schedule = await Schedule.findByPk(id);
        if (!schedule) {
            console.log('updateSchedule - Schedule not found:', id);
            return res.status(404).json({
                status: 'error',
                message: `Schedule with ID ${id} not found`
            });
        }

        console.log('updateSchedule - Found schedule:', {
            id: schedule.schedule_id,
            title: schedule.title,
            device_id: schedule.device_id
        });

        // Prepare update data
        const updateData = {};

        // Izinkan update device_id jika dikirim
        if (device_id !== undefined) {
            // Validasi device_id
            const device = await Device.findByPk(device_id);
            if (!device) {
                return res.status(404).json({
                    status: 'error',
                    message: `Device with ID ${device_id} not found`
                });
            }
            updateData.device_id = device_id;
        }
        if (title !== undefined) updateData.title = title;
        if (schedule_type !== undefined) {
            if (!['one-time', 'daily', 'weekly', 'custom'].includes(schedule_type)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid schedule_type. Must be one of: one-time, daily, weekly, custom'
                });
            }
            updateData.schedule_type = schedule_type;
        }
        if (start_time !== undefined) updateData.start_time = start_time;
        if (end_time !== undefined) updateData.end_time = end_time;
        if (action_type !== undefined) {
            if (!['turn_on', 'turn_off', 'toggle'].includes(action_type)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid action_type. Must be one of: turn_on, turn_off, toggle'
                });
            }
            updateData.action_type = action_type;
        }
        if (is_active !== undefined) updateData.is_active = is_active;

        console.log('updateSchedule - Final updateData:', updateData);

        // Update the schedule
        const updateResult = await schedule.update(updateData);
        console.log('updateSchedule - Update result:', updateResult.dataValues);

        // Get the updated schedule with device information
        const updatedSchedule = await Schedule.findByPk(id, {
            include: [{
                model: Device,
                attributes: ['device_name', 'location'],
                required: false // Make the join optional
            }]
        });

        // Send updated schedule to ESP32 in real-time if start_time was changed
        if (updateData.start_time !== undefined) {
            try {
                // Get device info for ESP32 communication
                let deviceName = null;
                
                // Try to get device name from the original schedule
                if (schedule.Device && schedule.Device.device_name) {
                    deviceName = schedule.Device.device_name;
                } else if (updatedSchedule.Device && updatedSchedule.Device.device_name) {
                    deviceName = updatedSchedule.Device.device_name;
                } else if (schedule.device_id) {
                    // Fallback: find device by device_id
                    const device = await Device.findByPk(schedule.device_id);
                    if (device && device.device_name) {
                        deviceName = device.device_name;
                    }
                }
                
                if (deviceName) {
                    // Remove old schedule first
                    await sendScheduleToESP32(deviceName, schedule, 'remove');
                    // Add new schedule
                    await sendScheduleToESP32(deviceName, updatedSchedule, 'add');
                    console.log(`Successfully updated schedule on ESP32 ${deviceName}`);
                } else {
                    console.warn(`Could not find device name for schedule ${id}, ESP32 not updated`);
                }
            } catch (esp32Error) {
                console.error(`Failed to update schedule on ESP32:`, esp32Error.message);
                // Continue even if ESP32 communication fails
            }
        }

        console.log('updateSchedule - Final updated schedule:', {
            id: updatedSchedule.schedule_id,
            title: updatedSchedule.title,
            device_id: updatedSchedule.device_id,
            start_time: updatedSchedule.start_time
        });

        return res.json({
            status: 'success',
            message: 'Schedule updated successfully',
            data: updatedSchedule
        });
    } catch (error) {
        console.error('Error updating schedule:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to update schedule',
            error: error.message
        });
    }
};

// Delete schedule
export const deleteSchedule = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the schedule with device information
        const schedule = await Schedule.findByPk(id, {
            include: [{
                model: Device,
                attributes: ['device_name', 'device_id'],
                required: false // Make the join optional
            }]
        });
        
        if (!schedule) {
            return res.status(404).json({
                status: 'error',
                message: `Schedule with ID ${id} not found`
            });
        }

        // Try to send remove schedule command to ESP32 before deleting
        // Only if device information is available
        if (schedule.Device && schedule.Device.device_name) {
            try {
                await sendScheduleToESP32(schedule.Device.device_name, schedule, 'remove');
                console.log(`Successfully sent remove command to ESP32 ${schedule.Device.device_name}`);
            } catch (esp32Error) {
                console.error(`Failed to send remove command to ESP32:`, esp32Error.message);
                // Continue with deletion even if ESP32 communication fails
            }
        } else {
            // If device info is not available, try to find device by device_id
            if (schedule.device_id) {
                try {
                    const device = await Device.findByPk(schedule.device_id);
                    if (device && device.device_name) {
                        await sendScheduleToESP32(device.device_name, schedule, 'remove');
                        console.log(`Successfully sent remove command to ESP32 ${device.device_name}`);
                    } else {
                        console.warn(`Device with ID ${schedule.device_id} not found or has no device_name`);
                    }
                } catch (deviceError) {
                    console.error(`Failed to find device or send remove command:`, deviceError.message);
                    // Continue with deletion even if ESP32 communication fails
                }
            } else {
                console.warn(`Schedule ${id} has no associated device_id`);
            }
        }

        // Delete the schedule from database
        await schedule.destroy();

        return res.json({
            status: 'success',
            message: 'Schedule deleted successfully',
            data: { id }
        });
    } catch (error) {
        console.error('Error deleting schedule:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to delete schedule',
            error: error.message
        });
    }
};

// Toggle schedule active status
export const toggleScheduleStatus = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the schedule
        const schedule = await Schedule.findByPk(id);
        if (!schedule) {
            return res.status(404).json({
                status: 'error',
                message: `Schedule with ID ${id} not found`
            });
        }

        // Toggle the status
        await schedule.update({
            is_active: !schedule.is_active
        });

        return res.json({
            status: 'success',
            message: `Schedule ${schedule.is_active ? 'activated' : 'deactivated'} successfully`,
            data: {
                id: schedule.schedule_id,
                is_active: schedule.is_active
            }
        });
    } catch (error) {
        console.error('Error toggling schedule status:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to toggle schedule status',
            error: error.message
        });
    }
};

// Get schedules for dashboard (active schedules only)
export const getActiveSchedules = async (req, res) => {
    try {
        const activeSchedules = await Schedule.findAll({
            where: { is_active: true },
            include: [{
                model: Device,
                attributes: ['device_name', 'location']
            }],
            order: [['start_time', 'ASC']]
        });

        return res.json({
            status: 'success',
            message: 'Active schedules retrieved successfully',
            data: activeSchedules,
            count: activeSchedules.length
        });
    } catch (error) {
        console.error('Error fetching active schedules:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve active schedules',
            error: error.message
        });
    }
};

// Get today's schedules
export const getTodaySchedules = async (req, res) => {
    try {
        // Get current day of week (0=Sunday, 1=Monday, ..., 6=Saturday)        const today = new Date().getDay();
        // Convert to our format (1=Monday, ..., 7=Sunday)
        const dayOfWeek = today === 0 ? 7 : today;

        // Find schedules that are active (no longer filtering by days_of_week since field is removed)
        const todaySchedules = await Schedule.findAll({
            where: {
                is_active: true,
                [Op.or]: [
                    { schedule_type: 'daily' },
                    { schedule_type: 'weekly' },
                    { schedule_type: 'custom' },
                    { schedule_type: 'one-time', start_time: { [Op.gte]: new Date() } }
                ]
            },
            include: [{
                model: Device,
                attributes: ['device_name', 'location']
            }],
            order: [['start_time', 'ASC']]
        });

        return res.json({
            status: 'success',
            message: "Today's schedules retrieved successfully",
            data: todaySchedules,
            count: todaySchedules.length
        });
    } catch (error) {
        console.error("Error fetching today's schedules:", error);
        return res.status(500).json({
            status: 'error',
            message: "Failed to retrieve today's schedules",
            error: error.message
        });
    }
};

// Endpoint untuk polling jadwal yang sudah waktunya dijalankan
export const getDueSchedules = async (req, res) => {
    try {
        const now = new Date();
        const dueSchedules = await Schedule.findAll({
            where: {
                is_active: true,
                start_time: { [Op.lte]: now },
                // Logika untuk jadwal harian/mingguan/sekali jalan
                [Op.or]: [
                    { schedule_type: 'one-time', executed_at: null },
                    { schedule_type: 'daily' },
                    { schedule_type: 'weekly' /* Tambahkan logika pengecekan hari jika perlu */ },
                ]
            },
            include: [Device]
        });

        for (const schedule of dueSchedules) {
            // Cek apakah jadwal harian sudah dijalankan hari ini
            if (schedule.schedule_type === 'daily' && schedule.last_executed_at) {
                const lastExecuted = new Date(schedule.last_executed_at);
                if (lastExecuted.getFullYear() === now.getFullYear() &&
                    lastExecuted.getMonth() === now.getMonth() &&
                    lastExecuted.getDate() === now.getDate()) {
                    continue; // Lewati jika sudah dijalankan hari ini
                }
            }

            const deviceId = schedule.Device.device_id; // Use device_id instead of device_name
            const command = schedule.action_type === 'turn_on' ? 'pump_on' : 'pump_off'; // Gunakan perintah yang spesifik

            try {
                // Cek apakah jadwal memiliki interval yang lama (> 30 menit)
                let scheduleData = {};
                
                // Cek apakah ada end_time dan hitung durasi jadwal
                if (schedule.end_time) {
                    const startTime = new Date(`1970-01-01T${schedule.start_time}`);
                    const endTime = new Date(`1970-01-01T${schedule.end_time}`);
                    
                    // Jika tanggal sama, hitung selisih waktu
                    let durationMinutes = (endTime - startTime) / (60 * 1000);
                    
                    // Jika endTime < startTime, maka jadwal melewati tengah malam
                    if (durationMinutes < 0) {
                        durationMinutes += 24 * 60; // Tambahkan 24 jam dalam menit
                    }
                    
                    // Jika durasi > 30 menit, set interval repeat
                    if (durationMinutes > 30) {
                        scheduleData = {
                            duration: 5, // Durasi pompa menyala dalam detik
                            interval: 30, // Interval pengulangan dalam menit
                            repeat: true, // Flag untuk mengulang
                            end_time: schedule.end_time // Waktu berakhir
                        };
                    }
                }
                
                await sendCommandToDevice(deviceId, command, scheduleData);
                console.log(`Executed schedule ${schedule.title} for device ${deviceId} with command ${command}`, scheduleData);

                // Tandai jadwal sudah dieksekusi
                schedule.last_executed_at = new Date();
                if (schedule.schedule_type === 'one-time') {
                    schedule.is_active = false; // Nonaktifkan setelah jalan
                }
                await schedule.save();

                const deviceInfo = {
                    device_id: schedule.Device.device_id,
                    device_name: schedule.Device.device_name,
                    location: schedule.Device.location || '-'
                };
                
                // Kirim notifikasi sukses eksekusi jadwal
                await createScheduleExecutionNotification(deviceInfo, {
                    title: schedule.title,
                    id: schedule.schedule_id
                }, true);
                
                // Kirim notifikasi tambahan jika pompa dinyalakan
                if (schedule.action_type === 'turn_on') {
                    await createPumpActivationNotification(deviceInfo, true, {
                        title: schedule.title,
                        id: schedule.schedule_id
                    });
                }

            } catch (error) {
                console.error(`Failed to execute schedule ${schedule.title} for device ${deviceId}:`, error.message);
                
                // Kirim notifikasi kegagalan eksekusi jadwal
                const deviceInfo = {
                    device_id: schedule.Device.device_id,
                    device_name: schedule.Device.device_name,
                    location: schedule.Device.location || '-'
                };
                
                await createScheduleExecutionNotification(deviceInfo, {
                    title: schedule.title,
                    id: schedule.schedule_id
                }, false, error.message);
            }
        }

        return res.json({
            status: 'success',
            message: `Checked for due schedules. ${dueSchedules.length} schedules processed.`,
            data: dueSchedules
        });

    } catch (error) {
        console.error('Error getting due schedules:', error);
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

// Get schedules from ESP32 device
export const getSchedulesFromESP32 = async (req, res) => {
    try {
        const { device_id } = req.params;

        // Validate device exists in database
        const device = await Device.findByPk(device_id);
        if (!device) {
            return res.status(404).json({
                status: 'error',
                message: `Device with ID ${device_id} not found`
            });
        }

        const deviceId = device.device_id; // Use device_id for WebSocket communication
        console.log(`Requesting schedules from ESP32 device ${deviceId}`);

        try {
            // Send get_schedules command to ESP32
            await sendCommandToDevice(deviceId, 'get_schedules', {});
            
            return res.json({
                status: 'success',
                message: 'Schedule request sent to ESP32. Check WebSocket logs for response.',
                device_id: device_id,
                device_name: deviceId
            });
        } catch (error) {
            console.error(`Failed to request schedules from ESP32 ${deviceId}:`, error.message);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to send schedule request to ESP32',
                error: error.message,
                details: error.details || null
            });
        }
    } catch (error) {
        console.error('Error requesting schedules from ESP32:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to request schedules from ESP32',
            error: error.message
        });
    }
};

// Sync all schedules to ESP32 device
export const syncSchedulesToESP32 = async (req, res) => {
    try {
        const { device_id } = req.params;

        // Validate device exists in database
        const device = await Device.findByPk(device_id);
        if (!device) {
            return res.status(404).json({
                status: 'error',
                message: `Device with ID ${device_id} not found`
            });
        }

        const deviceName = device.device_name;
        console.log(`Syncing all schedules to ESP32 device ${deviceName}`);

        try {
            // Import and use the sync function
            const { syncAllSchedulesToDevice } = await import('../services/esp32Service.js');
            const syncResult = await syncAllSchedulesToDevice(deviceName);
            
            return res.json({
                status: 'success',
                message: 'Schedule synchronization completed',
                device_id: device_id,
                device_name: deviceName,
                syncResult: syncResult
            });
        } catch (error) {
            console.error(`Failed to sync schedules to ESP32 ${deviceName}:`, error.message);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to sync schedules to ESP32',
                error: error.message,
                details: error.details || null
            });
        }
    } catch (error) {
        console.error('Error syncing schedules to ESP32:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to sync schedules to ESP32',
            error: error.message
        });
    }
};

// Helper function to send schedule to ESP32 in real-time
const sendScheduleToESP32 = async (deviceName, schedule, action = 'add') => {
    try {
        // Validate input parameters
        if (!deviceName) {
            throw new Error('Device name is required for ESP32 communication');
        }
        
        if (!schedule) {
            throw new Error('Schedule data is required for ESP32 communication');
        }
        
        if (!schedule.schedule_id) {
            throw new Error('Schedule ID is required for ESP32 communication');
        }

        console.log(`Sending schedule ${action} to ESP32 device ${deviceName}:`, {
            schedule_id: schedule.schedule_id,
            title: schedule.title,
            start_time: schedule.start_time,
            action
        });

        // Parse start_time - handle both TIME format (HH:MM:SS) and DateTime
        let hour, minute;
        
        if (!schedule.start_time) {
            throw new Error('Schedule start_time is required');
        }
        
        if (typeof schedule.start_time === 'string') {
            // Handle TIME format like "08:30:00" or "08:30"
            const timeParts = schedule.start_time.split(':');
            if (timeParts.length < 2) {
                throw new Error(`Invalid time format: ${schedule.start_time}`);
            }
            hour = parseInt(timeParts[0], 10);
            minute = parseInt(timeParts[1], 10);
        } else {
            // Handle Date object
            const startTime = new Date(schedule.start_time);
            if (isNaN(startTime.getTime())) {
                throw new Error(`Invalid date format: ${schedule.start_time}`);
            }
            hour = startTime.getHours();
            minute = startTime.getMinutes();
        }

        // Validate hour and minute values
        if (isNaN(hour) || hour < 0 || hour > 23) {
            throw new Error(`Invalid hour value: ${hour}`);
        }
        if (isNaN(minute) || minute < 0 || minute > 59) {
            throw new Error(`Invalid minute value: ${minute}`);
        }

        console.log(`Parsed time - Hour: ${hour}, Minute: ${minute}`);

        let command;
        let commandValue = {};

        if (action === 'add') {
            command = 'add_schedule';
            commandValue = {
                hour: hour,
                minute: minute,
                schedule_id: schedule.schedule_id,
                title: schedule.title
            };
        } else if (action === 'remove') {
            command = 'remove_schedule';
            commandValue = {
                hour: hour,
                minute: minute,
                schedule_id: schedule.schedule_id
            };
        }

        // Send command to ESP32 with value parameter
        await sendCommandToDevice(deviceName, command, commandValue);
        console.log(`Successfully sent ${action} schedule command to ESP32 ${deviceName}`);
        
        return true;
    } catch (error) {
        console.error(`Failed to send schedule ${action} to ESP32 ${deviceName}:`, error.message);
        // Don't throw error - schedule should still be saved even if ESP32 communication fails
        return false;
    }
};
