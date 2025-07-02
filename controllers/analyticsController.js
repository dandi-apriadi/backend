import { Sequelize } from 'sequelize';
import moment from 'moment';
import Sensor from "../models/sensorModel.js";
import { Device } from "../models/tableModel.js";
import EnergyTrend from "../models/energyTrendModel.js";
// import Alarm from "../models/alarmModel.js"; // Removed - alarm feature disabled

const { Op } = Sequelize;

/**
 * Get energy consumption summary for a specific period
 */
export const getEnergyConsumptionSummary = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const period = req.query.period || 'daily'; // hourly, daily, weekly, monthly
        const startDate = req.query.start_date ? new Date(req.query.start_date) : moment().subtract(7, 'days').toDate();
        const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();

        // Find trends for the specified period
        const trends = await EnergyTrend.findAll({
            where: {
                device_id: deviceId,
                period_type: period,
                period_start: {
                    [Op.between]: [startDate, endDate]
                }
            },
            order: [['period_start', 'ASC']]
        });

        if (trends.length === 0) {
            // If no pre-aggregated data, calculate on-the-fly
            let timeFormat;
            let groupByFormat;

            switch (period) {
                case 'hourly':
                    timeFormat = '%Y-%m-%d %H:00:00';
                    groupByFormat = 'YYYY-MM-DD HH:00:00';
                    break;
                case 'daily':
                    timeFormat = '%Y-%m-%d';
                    groupByFormat = 'YYYY-MM-DD';
                    break;
                case 'weekly':
                    timeFormat = '%Y-%u'; // ISO week
                    groupByFormat = 'YYYY-[W]WW';
                    break;
                case 'monthly':
                    timeFormat = '%Y-%m';
                    groupByFormat = 'YYYY-MM';
                    break;
                default:
                    timeFormat = '%Y-%m-%d';
                    groupByFormat = 'YYYY-MM-DD';
            }

            // Use raw SQL for more efficient aggregation
            const [rawData] = await Sensor.sequelize.query(`
                SELECT 
                    DATE_FORMAT(timestamp, '${timeFormat}') as time_period,
                    AVG(voltage) as avg_voltage,
                    AVG(current) as avg_current,
                    AVG(power) as avg_power,
                    SUM(energy) as total_energy,
                    SUM(pump_status) * (
                        TIMESTAMPDIFF(SECOND, 
                            MIN(timestamp), 
                            MAX(timestamp)
                        ) / COUNT(*)
                    ) as pump_active_seconds,
                    COUNT(*) as data_points
                FROM sensors
                WHERE device_id = ? AND timestamp BETWEEN ? AND ?
                GROUP BY time_period
                ORDER BY MIN(timestamp)
            `, {
                replacements: [deviceId, startDate, endDate],
                type: Sensor.sequelize.QueryTypes.SELECT
            });

            // Format the raw data to match our trend model
            const formattedData = rawData.map(item => ({
                device_id: deviceId,
                period: item.time_period,
                avg_voltage: parseFloat(item.avg_voltage || 0).toFixed(2),
                avg_current: parseFloat(item.avg_current || 0).toFixed(2),
                avg_power: parseFloat(item.avg_power || 0).toFixed(2),
                total_energy: parseFloat(item.total_energy || 0).toFixed(2),
                pump_active_duration: Math.round(item.pump_active_seconds || 0),
                data_points: parseInt(item.data_points || 0)
            }));

            return res.json({
                status: 'success',
                message: 'Energy consumption summary generated',
                period,
                start_date: moment(startDate).format('YYYY-MM-DD'),
                end_date: moment(endDate).format('YYYY-MM-DD'),
                data: formattedData
            });
        }

        // Return pre-aggregated trend data
        return res.json({
            status: 'success',
            message: 'Energy consumption trends retrieved',
            period,
            start_date: moment(startDate).format('YYYY-MM-DD'),
            end_date: moment(endDate).format('YYYY-MM-DD'),
            data: trends
        });
    } catch (error) {
        console.error('Error getting energy consumption summary:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve energy consumption summary',
            error: error.message
        });
    }
};

/**
 * Get pump usage statistics
 */
export const getPumpUsageStats = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const startDate = req.query.start_date ? new Date(req.query.start_date) : moment().subtract(7, 'days').toDate();
        const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();

        // Get daily pump usage statistics
        const [pumpStats] = await Sensor.sequelize.query(`
            SELECT 
                DATE(timestamp) as date,
                SUM(CASE WHEN pump_status = 1 THEN 1 ELSE 0 END) as active_readings,
                COUNT(*) as total_readings,
                SUM(CASE WHEN pump_status = 1 THEN 1 ELSE 0 END) * 100 / COUNT(*) as active_percentage,
                AVG(CASE WHEN pump_status = 1 THEN power ELSE NULL END) as avg_power_when_active,
                SUM(CASE WHEN pump_status = 1 THEN energy ELSE 0 END) as total_energy_consumed
            FROM sensors
            WHERE device_id = ? AND timestamp BETWEEN ? AND ?
            GROUP BY DATE(timestamp)
            ORDER BY DATE(timestamp)
        `, {
            replacements: [deviceId, startDate, endDate],
            type: Sensor.sequelize.QueryTypes.SELECT
        });

        // Calculate average daily usage
        const totalDays = pumpStats.length;
        const totalActivePercentage = pumpStats.reduce((sum, day) => sum + parseFloat(day.active_percentage || 0), 0);
        const avgDailyUsage = totalDays > 0 ? (totalActivePercentage / totalDays).toFixed(2) : 0;

        // Calculate total energy consumed by pump
        const totalEnergy = pumpStats.reduce((sum, day) => sum + parseFloat(day.total_energy_consumed || 0), 0).toFixed(2);

        return res.json({
            status: 'success',
            message: 'Pump usage statistics retrieved',
            device_id: deviceId,
            start_date: moment(startDate).format('YYYY-MM-DD'),
            end_date: moment(endDate).format('YYYY-MM-DD'),
            summary: {
                total_days: totalDays,
                avg_daily_usage_percent: avgDailyUsage,
                total_energy_consumed: totalEnergy,
                unit: 'Wh'
            },
            daily_stats: pumpStats.map(day => ({
                date: day.date,
                active_percentage: parseFloat(day.active_percentage).toFixed(2),
                active_readings: parseInt(day.active_readings),
                total_readings: parseInt(day.total_readings),
                avg_power_when_active: parseFloat(day.avg_power_when_active || 0).toFixed(2),
                energy_consumed: parseFloat(day.total_energy_consumed || 0).toFixed(2)
            }))
        });
    } catch (error) {
        console.error('Error getting pump usage statistics:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve pump usage statistics',
            error: error.message
        });
    }
};

/**
 * Get alarm history - DISABLED
 * Alarm functionality has been removed from the system
 */
export const getAlarmHistory = async (req, res) => {
    return res.status(410).json({
        status: 'error',
        message: 'Alarm functionality has been removed from the system',
        error: 'This endpoint is no longer available'
    });
};

/**
 * Get device performance metrics 
 */
export const getDevicePerformance = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const period = req.query.period || 'day'; // day, week, month

        let startDate;
        switch (period) {
            case 'day':
                startDate = moment().subtract(1, 'days').toDate();
                break;
            case 'week':
                startDate = moment().subtract(7, 'days').toDate();
                break;
            case 'month':
                startDate = moment().subtract(30, 'days').toDate();
                break;
            default:
                startDate = moment().subtract(1, 'days').toDate();
        }

        const endDate = new Date();

        // Get statistical summary
        const stats = await Sensor.findAll({
            attributes: [
                [Sequelize.fn('MIN', Sequelize.col('voltage')), 'min_voltage'],
                [Sequelize.fn('MAX', Sequelize.col('voltage')), 'max_voltage'],
                [Sequelize.fn('AVG', Sequelize.col('voltage')), 'avg_voltage'],
                [Sequelize.fn('MIN', Sequelize.col('current')), 'min_current'],
                [Sequelize.fn('MAX', Sequelize.col('current')), 'max_current'],
                [Sequelize.fn('AVG', Sequelize.col('current')), 'avg_current'],
                [Sequelize.fn('MIN', Sequelize.col('power')), 'min_power'],
                [Sequelize.fn('MAX', Sequelize.col('power')), 'max_power'],
                [Sequelize.fn('AVG', Sequelize.col('power')), 'avg_power'],
                [Sequelize.fn('SUM', Sequelize.col('energy')), 'total_energy'],
                [Sequelize.fn('SUM', Sequelize.literal('CASE WHEN pump_status = 1 THEN 1 ELSE 0 END')), 'pump_active_count'],
                [Sequelize.fn('COUNT', Sequelize.col('*')), 'total_readings']
            ],
            where: {
                device_id: deviceId,
                timestamp: {
                    [Op.between]: [startDate, endDate]
                }
            }
        });

        // Calculate uptime percentage
        const totalMinutes = moment(endDate).diff(moment(startDate), 'minutes');
        const readingsPerMinute = stats[0].dataValues.total_readings / totalMinutes;
        const uptimePercent = Math.min(100, (readingsPerMinute / 1) * 100).toFixed(2); // Assuming 1 reading per minute is 100% uptime

        // Get device info
        const device = await Device.findByPk(deviceId);

        return res.json({
            status: 'success',
            message: 'Device performance metrics retrieved',
            device_info: device,
            period,
            start_date: moment(startDate).format('YYYY-MM-DD HH:mm:ss'),
            end_date: moment(endDate).format('YYYY-MM-DD HH:mm:ss'),
            performance_metrics: {
                uptime_percent: uptimePercent,
                total_readings: parseInt(stats[0].dataValues.total_readings),
                voltage: {
                    min: parseFloat(stats[0].dataValues.min_voltage).toFixed(2),
                    max: parseFloat(stats[0].dataValues.max_voltage).toFixed(2),
                    avg: parseFloat(stats[0].dataValues.avg_voltage).toFixed(2)
                },
                current: {
                    min: parseFloat(stats[0].dataValues.min_current).toFixed(2),
                    max: parseFloat(stats[0].dataValues.max_current).toFixed(2),
                    avg: parseFloat(stats[0].dataValues.avg_current).toFixed(2)
                },
                power: {
                    min: parseFloat(stats[0].dataValues.min_power).toFixed(2),
                    max: parseFloat(stats[0].dataValues.max_power).toFixed(2),
                    avg: parseFloat(stats[0].dataValues.avg_power).toFixed(2)
                },
                energy: {
                    total: parseFloat(stats[0].dataValues.total_energy).toFixed(2),
                    unit: 'Wh'
                },
                pump: {
                    active_count: parseInt(stats[0].dataValues.pump_active_count),
                    active_percent: (parseInt(stats[0].dataValues.pump_active_count) / parseInt(stats[0].dataValues.total_readings) * 100).toFixed(2)
                }
            }
        });
    } catch (error) {
        console.error('Error getting device performance metrics:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve device performance metrics',
            error: error.message
        });
    }
};

/**
 * Generate and store aggregated energy trends (called periodically by a scheduler or cron job)
 * This helps optimize dashboard performance by pre-calculating trends
 */
export const generateEnergyTrends = async () => {
    try {
        console.log(JSON.stringify({
            event: "ENERGY_TREND_GENERATION",
            timestamp: new Date().toISOString(),
            status: "STARTED"
        }, null, 2));

        const now = new Date();

        // Get all devices
        const devices = await Device.findAll();

        if (!devices || devices.length === 0) {
            console.log(JSON.stringify({
                event: "ENERGY_TREND_GENERATION",
                timestamp: new Date().toISOString(),
                status: "NO_DEVICES",
                message: "No devices found for trend generation"
            }, null, 2));
            return true;
        }

        for (const device of devices) {
            const deviceId = device.device_id;
            console.log(JSON.stringify({
                event: "ENERGY_TREND_GENERATION",
                timestamp: new Date().toISOString(),
                device_id: deviceId,
                status: "PROCESSING"
            }, null, 2));

            // Generate hourly trends for the last 24 hours
            const hourlyStart = moment(now).subtract(24, 'hours').startOf('hour').toDate();
            await generateTrendForPeriod(deviceId, hourlyStart, now, 'hourly');

            // Generate daily trends for the last 30 days
            const dailyStart = moment(now).subtract(30, 'days').startOf('day').toDate();
            await generateTrendForPeriod(deviceId, dailyStart, now, 'daily');

            // Generate weekly trends for the last 12 weeks
            const weeklyStart = moment(now).subtract(12, 'weeks').startOf('week').toDate();
            await generateTrendForPeriod(deviceId, weeklyStart, now, 'weekly');

            // Generate monthly trends for the last 12 months
            const monthlyStart = moment(now).subtract(12, 'months').startOf('month').toDate();
            await generateTrendForPeriod(deviceId, monthlyStart, now, 'monthly');
        }

        console.log(JSON.stringify({
            event: "ENERGY_TREND_GENERATION",
            timestamp: new Date().toISOString(),
            status: "COMPLETED"
        }, null, 2));

        return true;
    } catch (error) {
        console.error(JSON.stringify({
            event: "ENERGY_TREND_GENERATION",
            timestamp: new Date().toISOString(),
            status: "ERROR",
            error: error.message
        }, null, 2));

        return false;
    }
};

/**
 * Generate energy consumption trends for the specified period and device
 */
export const generateTrendForPeriod = async (deviceId, periodType, startDate, endDate) => {
    try {
        const sensorData = await getSensorDataForPeriod(deviceId, startDate, endDate);

        // If no sensor data, return empty array instead of undefined
        if (!sensorData || sensorData.length === 0) {
            console.log(JSON.stringify({
                event: "TREND_GENERATION",
                timestamp: new Date().toISOString(),
                device_id: deviceId,
                period: periodType,
                status: "NO_DATA",
                message: `No sensor data available for device ${deviceId} in the ${periodType} period`
            }, null, 2));
            return [];
        }

        // Group data by time intervals
        const groupedData = groupSensorDataByTimeInterval(sensorData, periodType);

        // If no grouped data, return empty array
        if (!groupedData || Object.keys(groupedData).length === 0) {
            console.log(`No grouped data available for device ${deviceId} in the ${periodType} period`);
            return [];  // Return empty array
        }

        // Generate trends from grouped data
        const trends = calculateTrends(groupedData, deviceId, periodType);

        // Ensure trends is always an array or empty array
        if (!trends || !Array.isArray(trends)) {
            console.log(`Found undefined or invalid trends for device ${deviceId}`);
            return []; // Return empty array if trends is not an array
        }

        console.log(JSON.stringify({
            event: "TREND_GENERATION",
            timestamp: new Date().toISOString(),
            device_id: deviceId,
            period: periodType,
            status: "COMPLETED",
            trends_count: trends.length
        }, null, 2));

        // Save trends to database
        if (trends.length > 0) {
            await saveTrendsToDatabase(trends);
            console.log(`Saved ${trends.length} ${periodType} trends to database for device ${deviceId}`);
        }

        return trends;
    } catch (error) {
        console.error(JSON.stringify({
            event: "TREND_GENERATION",
            timestamp: new Date().toISOString(),
            device_id: deviceId,
            period: periodType,
            status: "ERROR",
            error: error.message
        }, null, 2));

        return [];
    }
};

/**
 * Calculate trends from grouped sensor data
 * Ensure this returns an array
 */
const calculateTrends = (groupedData, deviceId, periodType) => {
    if (!groupedData || typeof groupedData !== 'object') {
        console.log(`Invalid grouped data for device ${deviceId}, returning empty array`);
        return [];  // Return empty array for invalid data
    }

    const trends = [];

    try {
        // Process each time interval
        for (const [interval, readings] of Object.entries(groupedData)) {
            if (!readings || !Array.isArray(readings) || readings.length === 0) {
                console.log(`No readings for interval ${interval}, skipping`);
                continue;
            }

            // Calculate average values
            let totalPower = 0;
            let totalEnergy = 0;
            let maxPower = 0;
            let readingsCount = 0;

            readings.forEach(reading => {
                if (reading && typeof reading === 'object') {
                    // Ensure numeric values with fallback to 0
                    const power = parseFloat(reading.power) || 0;
                    const energy = parseFloat(reading.energy) || 0;

                    totalPower += power;
                    totalEnergy += energy;
                    maxPower = Math.max(maxPower, power);
                    readingsCount++;
                }
            });

            // Only create trend if we have readings
            if (readingsCount > 0) {
                const avgPower = totalPower / readingsCount;
                const energyUsed = totalEnergy / readingsCount; // This is average energy from readings

                trends.push({
                    device_id: deviceId,
                    period_type: periodType,
                    time_interval: interval,
                    avg_power: avgPower,
                    max_power: maxPower,
                    energy_used: energyUsed,
                    reading_count: readingsCount,
                    created_at: new Date()
                });
            }
        }

        return trends;
    } catch (error) {
        console.error(`Error calculating trends for device ${deviceId}:`, error);
        return []; // Return empty array on error
    }
};
