import { Sequelize } from 'sequelize';
const { Op } = Sequelize;
import moment from 'moment';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Dashboard Summary - Updated to remove unused tables
export const getDashboardSummary = async (req, res) => {
    try {
        // Dynamic import of models
        const { Device, Notification } = await import("../../models/tableModel.js");
        const Sensor = await import("../../models/sensorModel.js");
        const SensorModel = Sensor.default;
        
        // Get statistics
        const deviceStats = {
            total: await Device.count(),
            active: await Device.count({ where: { device_status: 'aktif' } }),
            inactive: await Device.count({ where: { device_status: 'nonaktif' } })
        };

        // Get recent pump activations from sensor data instead of spraying logs
        const recentPumpActivations = await Sensor.findAll({
            include: [{
                model: Device,
                attributes: ['device_name', 'location']
            }],
            where: {
                pump_status: true,
                timestamp: { [Op.gte]: moment().subtract(24, 'hours').toDate() }
            },
            limit: 5,
            order: [['timestamp', 'DESC']]
        });

        // Get devices with high pest level (for alerts)
        const highPestDevices = await Sensor.findAll({
            include: [{
                model: Device,
                attributes: ['device_name', 'location']
            }],
            where: {
                pest_level: { [Op.gte]: 7 }, // Assuming 7+ is high pest level
                timestamp: { [Op.gte]: moment().subtract(24, 'hours').toDate() }
            },
            order: [['pest_level', 'DESC']],
            limit: 5
        });

        // Get unread notifications
        const unreadNotifications = await Notification.count({
            where: { status: 'belum terbaca' }
        });

        // Get system summary data from sensor readings
        const totalSensorReadings = await Sensor.count();
        const recentPumpActivationsCount = await Sensor.count({ 
            where: { 
                pump_status: true,
                timestamp: { [Op.gte]: moment().subtract(7, 'days').toDate() }
            } 
        });

        // Calculate average pest levels for the past week
        const lastWeek = await Sensor.findAll({
            attributes: [
                [Sequelize.fn('DATE', Sequelize.col('timestamp')), 'date'],
                [Sequelize.fn('AVG', Sequelize.col('pest_level')), 'average_pest_level']
            ],
            where: {
                timestamp: { [Op.gte]: moment().subtract(7, 'days').toDate() }
            },
            group: [Sequelize.fn('DATE', Sequelize.col('timestamp'))],
            order: [[Sequelize.literal('date'), 'ASC']]
        });

        const summaryData = {
            statistics: {
                devices: deviceStats,
                totalSensorReadings,
                recentPumpActivationsCount,
                unreadNotifications
            },
            recentActivity: {
                pumpActivations: recentPumpActivations.map(sensor => ({
                    id: sensor.sensor_id,
                    deviceName: sensor?.Device?.device_name || 'Unknown',
                    location: sensor?.Device?.location || 'Unknown',
                    pestLevel: sensor.pest_level,
                    timestamp: moment(sensor.timestamp).format('D MMMM, YYYY, h:mm A'),
                    voltage: sensor.voltage,
                    current: sensor.current,
                    power: sensor.power
                }))
            },
            alerts: {
                highPestLevels: highPestDevices.map(sensor => ({
                    deviceId: sensor.device_id,
                    deviceName: sensor?.Device?.device_name || 'Unknown',
                    location: sensor?.Device?.location || 'Unknown',
                    pestLevel: sensor.pest_level,
                    timestamp: moment(sensor.timestamp).format('D MMMM, YYYY, h:mm A')
                }))
            },
            trends: {
                weeklyPestLevels: lastWeek.map(day => ({
                    date: day.getDataValue('date'),
                    averagePestLevel: parseFloat(day.getDataValue('average_pest_level')).toFixed(2)
                }))
            }
        };

        res.json({
            status: 'success',
            data: summaryData
        });
    } catch (error) {
        console.error('Get dashboard summary error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Failed to fetch dashboard summary'
        });
    }
};

// Device management
export const getAllDevices = async (req, res) => {
    try {
        const devices = await Device.findAll({
            order: [['created_at', 'DESC']]
        });

        res.json({
            status: 'success',
            data: devices
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message || 'Failed to fetch devices'
        });
    }
};

export const getDeviceById = async (req, res) => {
    try {
        const { id } = req.params;
        const device = await Device.findByPk(id);

        if (!device) {
            return res.status(404).json({
                status: 'error',
                message: 'Device not found'
            });
        }

        res.json({
            status: 'success',
            data: device
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message || 'Failed to fetch device'
        });
    }
};

export const createDevice = async (req, res) => {
    try {
        const { device_name, device_status, location } = req.body;

        const device = await Device.create({
            device_name,
            device_status: device_status || 'nonaktif',
            location
        });

        res.status(201).json({
            status: 'success',
            data: device
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message || 'Failed to create device'
        });
    }
};

export const updateDevice = async (req, res) => {
    try {
        const { id } = req.params;
        const { device_name, device_status, location } = req.body;

        const device = await Device.findByPk(id);

        if (!device) {
            return res.status(404).json({
                status: 'error',
                message: 'Device not found'
            });
        }

        await device.update({
            device_name: device_name || device.device_name,
            device_status: device_status || device.device_status,
            location: location || device.location
        });

        res.json({
            status: 'success',
            data: device
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message || 'Failed to update device'
        });
    }
};

export const deleteDevice = async (req, res) => {
    try {
        const { id } = req.params;

        const device = await Device.findByPk(id);

        if (!device) {
            return res.status(404).json({
                status: 'error',
                message: 'Device not found'
            });
        }

        await device.destroy();

        res.json({
            status: 'success',
            message: 'Device deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message || 'Failed to delete device'
        });
    }
};

// Device Status Management
export const updateDeviceStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { device_status } = req.body;

        if (!device_status || !['aktif', 'nonaktif'].includes(device_status)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid device status. Must be "aktif" or "nonaktif"'
            });
        }

        const device = await Device.findByPk(id);

        if (!device) {
            return res.status(404).json({
                status: 'error',
                message: 'Device not found'
            });
        }

        await device.update({ device_status });

        res.json({
            status: 'success',
            message: 'Device status updated successfully',
            data: device
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message || 'Failed to update device status'
        });
    }
};

// Sensor data recording
export const recordSensorData = async (req, res) => {
    try {
        const { device_id, pest_level } = req.body;

        // Validate device exists
        const device = await Device.findByPk(device_id);
        if (!device) {
            return res.status(404).json({
                status: 'error',
                message: 'Device not found'
            });
        }

        // Record sensor data
        const sensorData = await Sensor.create({
            device_id,
            pest_level,
            timestamp: new Date()
        });

        // Update device last online time
        await device.update({
            last_online: new Date()
        });

        // Check if pest level is high and create notification if needed
        if (pest_level >= 8) { // Assuming 8+ is critical
            await Notification.create({
                device_id,
                message: `High pest level detected (${pest_level}/10) at ${device.location}. Check the area immediately.`,
                status: 'belum terbaca'
            });
        }

        res.status(201).json({
            status: 'success',
            data: sensorData
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message || 'Failed to record sensor data'
        });
    }
};

// Notification management
export const getNotifications = async (req, res) => {
    try {
        const { status, limit = 50 } = req.query;
        let whereClause = {};

        if (status && ['terbaca', 'belum terbaca'].includes(status)) {
            whereClause.status = status;
        }

        const notifications = await Notification.findAll({
            include: [{
                model: Device,
                attributes: ['device_name', 'location']
            }],
            where: whereClause,
            order: [['created_at', 'DESC']],
            limit: parseInt(limit)
        });

        res.json({
            status: 'success',
            data: notifications
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message || 'Failed to fetch notifications'
        });
    }
};

export const markNotificationAsRead = async (req, res) => {
    try {
        const { id } = req.params;

        const notification = await Notification.findByPk(id);

        if (!notification) {
            return res.status(404).json({
                status: 'error',
                message: 'Notification not found'
            });
        }

        await notification.update({
            status: 'terbaca'
        });

        res.json({
            status: 'success',
            data: notification
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message || 'Failed to mark notification as read'
        });
    }
};

export const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;

        const notification = await Notification.findByPk(id);

        if (!notification) {
            return res.status(404).json({
                status: 'error',
                message: 'Notification not found'
            });
        }

        await notification.destroy();

        res.json({
            status: 'success',
            message: 'Notification deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message || 'Failed to delete notification'
        });
    }
};

// Sensor Data Management
export const getAllSensorData = async (req, res) => {
    try {
        const { page = 1, limit = 50, deviceId } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        const whereClause = deviceId ? { device_id: deviceId } : {};

        const sensorData = await Sensor.findAndCountAll({
            where: whereClause,
            include: [{
                model: Device,
                attributes: ['device_name', 'location']
            }],
            order: [['timestamp', 'DESC']],
            limit: parseInt(limit),
            offset: offset
        });

        res.json({
            status: 'success',
            data: {
                sensors: sensorData.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: sensorData.count,
                    totalPages: Math.ceil(sensorData.count / parseInt(limit))
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message || 'Failed to fetch sensor data'
        });
    }
};

export const getSensorDataByDevice = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { limit = 20 } = req.query;

        const sensorData = await Sensor.findAll({
            where: { device_id: deviceId },
            include: [{
                model: Device,
                attributes: ['device_name', 'location']
            }],
            order: [['timestamp', 'DESC']],
            limit: parseInt(limit)
        });

        res.json({
            status: 'success',
            data: sensorData
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message || 'Failed to fetch sensor data by device'
        });
    }
};

export const getLatestSensorData = async (req, res) => {
    try {
        const latestData = await Sensor.findAll({
            include: [{
                model: Device,
                attributes: ['device_name', 'location', 'device_status']
            }],
            order: [['device_id', 'ASC'], ['timestamp', 'DESC']],
            group: ['device_id'],
            limit: 50
        });

        res.json({
            status: 'success',
            data: latestData
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message || 'Failed to fetch latest sensor data'
        });
    }
};

// Spraying Management (Placeholder functions since we don't have spraying logs table)
export const getSprayingLogs = async (req, res) => {
    try {
        // Since we don't have spraying logs table, we'll use pump status from sensor data
        const sprayingData = await Sensor.findAll({
            where: { pump_status: true },
            include: [{
                model: Device,
                attributes: ['device_name', 'location']
            }],
            order: [['timestamp', 'DESC']],
            limit: 50
        });

        res.json({
            status: 'success',
            data: sprayingData,
            message: 'Showing pump activation data as spraying logs'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message || 'Failed to fetch spraying logs'
        });
    }
};

export const getSprayingLogsByDevice = async (req, res) => {
    try {
        const { deviceId } = req.params;

        const sprayingData = await Sensor.findAll({
            where: { 
                device_id: deviceId,
                pump_status: true 
            },
            include: [{
                model: Device,
                attributes: ['device_name', 'location']
            }],
            order: [['timestamp', 'DESC']],
            limit: 20
        });

        res.json({
            status: 'success',
            data: sprayingData,
            message: 'Showing pump activation data as spraying logs for device'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message || 'Failed to fetch spraying logs by device'
        });
    }
};

export const initiateManualSpraying = async (req, res) => {
    try {
        const { deviceId } = req.params;

        // Check if device exists
        const device = await Device.findByPk(deviceId);
        if (!device) {
            return res.status(404).json({
                status: 'error',
                message: 'Device not found'
            });
        }

        // This would typically send a command to the ESP32 device
        // For now, we'll just return a success message
        res.json({
            status: 'success',
            message: `Manual spraying initiated for device ${device.device_name}`,
            data: {
                deviceId: deviceId,
                deviceName: device.device_name,
                timestamp: new Date()
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message || 'Failed to initiate manual spraying'
        });
    }
};

export const completeSprayingLog = async (req, res) => {
    try {
        const { id } = req.params;

        // Since we don't have a spraying logs table, this is a placeholder
        res.json({
            status: 'success',
            message: 'Spraying log marked as complete',
            data: {
                id: id,
                completedAt: new Date()
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message || 'Failed to complete spraying log'
        });
    }
};

// Settings Management (Placeholder functions)
export const getAllSettings = async (req, res) => {
    try {
        // Placeholder for settings - you can implement actual settings table later
        const defaultSettings = [
            {
                id: 1,
                key: 'pest_threshold',
                value: '7',
                description: 'Pest level threshold for automatic spraying'
            },
            {
                id: 2,
                key: 'spray_duration',
                value: '30',
                description: 'Default spraying duration in seconds'
            },
            {
                id: 3,
                key: 'notification_enabled',
                value: 'true',
                description: 'Enable notifications for pest detection'
            }
        ];

        res.json({
            status: 'success',
            data: defaultSettings,
            message: 'Showing default settings - implement settings table for persistence'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message || 'Failed to fetch settings'
        });
    }
};

export const updateSetting = async (req, res) => {
    try {
        const { id } = req.params;
        const { value } = req.body;

        // Placeholder for settings update
        res.json({
            status: 'success',
            message: `Setting ${id} updated successfully`,
            data: {
                id: id,
                value: value,
                updatedAt: new Date()
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message || 'Failed to update setting'
        });
    }
};
