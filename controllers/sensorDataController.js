import { Sequelize } from 'sequelize';
import moment from 'moment';
import Sensor from '../models/sensorModel.js';
import { Device } from '../models/tableModel.js';
import EnergyTrend from '../models/energyTrendModel.js';
import Notification from '../models/notificationModel.js';

const { Op } = Sequelize;

/**
 * Get the latest readings with device information
 * Optimized for dashboard display
 */
export const getLatestReadings = async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const parsedLimit = Math.min(parseInt(limit), 50); // Cap at 50 for performance

        // Get latest readings with device information
        const latestReadings = await Sensor.findAll({
            attributes: [
                'sensor_id', 'device_id', 'voltage', 'current',
                'power', 'energy', 'pir_status', 'pump_status',
                'auto_mode', 'timestamp'
            ],
            include: [{
                model: Device,
                attributes: ['device_name', 'location'],
                as: 'device'
            }],
            order: [['timestamp', 'DESC']],
            limit: parsedLimit
        });

        return res.json({
            status: 'success',
            message: 'Latest readings retrieved successfully',
            count: latestReadings.length,
            data: latestReadings
        });
    } catch (error) {
        console.error('Error in getLatestReadings:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve latest readings',
            error: error.message
        });
    }
};

/**
 * Get sensor history data for a device
 */
export const getSensorHistory = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { timeframe = '24h', format = 'aggregated' } = req.query;

        // Find device ID by name with minimal attributes
        const device = await Device.findOne({
            where: { device_name: deviceId },
            attributes: ['device_id', 'device_name']
        });

        if (!device) {
            return res.status(404).json({
                status: 'error',
                message: `Device not found: ${deviceId}`
            });
        }

        // Calculate time range based on timeframe
        let startDate = new Date();
        if (timeframe) {
            switch (timeframe) {
                case '1h': startDate.setHours(startDate.getHours() - 1); break;
                case '6h': startDate.setHours(startDate.getHours() - 6); break;
                case '12h': startDate.setHours(startDate.getHours() - 12); break;
                case '24h': startDate.setHours(startDate.getHours() - 24); break;
                case '7d': startDate.setDate(startDate.getDate() - 7); break;
                case '30d': startDate.setDate(startDate.getDate() - 30); break;
                default: startDate.setHours(startDate.getHours() - 24);
            }
        }

        let data = [];  // Initialize as empty array

        try {
            // Query for data
            if (format === 'raw') {
                data = await Sensor.findAll({
                    where: {
                        device_id: device.device_id,
                        timestamp: {
                            [Op.between]: [startDate, new Date()]
                        }
                    },
                    order: [['timestamp', 'ASC']],
                    raw: true
                }) || []; // Ensure data is an array even if result is null
            } else {
                // Use aggregated query
                const results = await Sensor.sequelize.query(`
          SELECT 
            DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i:00') as time_interval,
            ROUND(AVG(NULLIF(voltage, 0)), 2) as voltage,
            ROUND(AVG(NULLIF(current, 0)), 2) as current,
            ROUND(AVG(NULLIF(power, 0)), 2) as power,
            ROUND(AVG(NULLIF(energy, 0)), 2) as energy,
            MAX(pir_status) as pir_status,
            MAX(pump_status) as pump_status,
            MAX(auto_mode) as auto_mode,
            COUNT(*) as reading_count,
            MIN(timestamp) as first_reading,
            MAX(timestamp) as last_reading
          FROM sensors
          WHERE device_id = ? AND timestamp BETWEEN ? AND ?
          GROUP BY time_interval
          ORDER BY MIN(timestamp) ASC
        `, {
                    replacements: [device.device_id, startDate, new Date()],
                    type: Sensor.sequelize.QueryTypes.SELECT
                });

                // Fixed: Properly handle results and ensure data is an array
                data = results || [];

                // If results is an array with two elements (rows and metadata as returned by sequelize)
                if (Array.isArray(results) && results.length === 2) {
                    data = results[0] || [];
                }
            }
        } catch (err) {
            console.error('Query error:', err);
            data = []; // Ensure data is always an array on error
        }

        // Fix the error causing line: Always check if data exists and is an array before mapping
        if (data && Array.isArray(data) && data.length > 0) {
            data = data.map(point => {
                // Transform data
                const transformed = transformTimestamp(point);
                return {
                    ...transformed,
                    voltage: parseFloat(transformed.voltage || 0),
                    current: parseFloat(transformed.current || 0),
                    power: parseFloat(transformed.power || 0),
                    energy: parseFloat(transformed.energy || 0)
                };
            });
        } else {
            // Ensure data is always a valid array
            data = [];
        }

        // Send response
        return res.json({
            status: 'success',
            message: data.length > 0 ? 'Sensor history retrieved' : 'No sensor data found for this period',
            timeframe,
            device_id: deviceId,
            count: data.length,
            data
        });

    } catch (error) {
        console.error('Error getting sensor history:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve sensor history',
            error: error.message
        });
    }
};

/**
 * Calculate summary statistics for sensor data
 */
function calculateSummary(data) {
    if (!data || data.length === 0) return null;

    // Initialize accumulators
    const summary = {
        voltage: { min: Infinity, max: -Infinity, avg: 0, sum: 0 },
        current: { min: Infinity, max: -Infinity, avg: 0, sum: 0 },
        power: { min: Infinity, max: -Infinity, avg: 0, sum: 0 },
        energy: { min: Infinity, max: -Infinity, avg: 0, sum: 0 },
        pir_activity: { count: 0, percentage: 0 },
        pump_activity: { count: 0, percentage: 0, duration: 0 }
    };

    // Process data
    data.forEach(item => {
        // Update min/max for electrical readings
        ['voltage', 'current', 'power', 'energy'].forEach(field => {
            const value = parseFloat(item[field] || 0);
            if (value > 0) { // Skip zero values which might be errors
                summary[field].min = Math.min(summary[field].min, value);
                summary[field].max = Math.max(summary[field].max, value);
                summary[field].sum += value;
            }
        });

        // Count PIR activity
        if (item.pir_status) {
            summary.pir_activity.count++;
        }

        // Count pump activity
        if (item.pump_status) {
            summary.pump_activity.count++;
        }
    });

    // Calculate averages
    const count = data.length;
    ['voltage', 'current', 'power', 'energy'].forEach(field => {
        summary[field].avg = count > 0 ? summary[field].sum / count : 0;

        // Clean up infinity values if no valid data was found
        if (summary[field].min === Infinity) summary[field].min = 0;
        if (summary[field].max === -Infinity) summary[field].max = 0;
    });

    // Calculate percentages
    summary.pir_activity.percentage = count > 0 ?
        (summary.pir_activity.count / count * 100).toFixed(1) : 0;

    summary.pump_activity.percentage = count > 0 ?
        (summary.pump_activity.count / count * 100).toFixed(1) : 0;

    return summary;
}

/**
 * Get daily energy consumption statistics
 */
export const getDailyConsumption = async (req, res) => {
    try {
        const { deviceId } = req.params;

        // Find device
        const device = await Device.findOne({
            where: { device_name: deviceId },
            attributes: ['device_id', 'device_name']
        });

        if (!device) {
            return res.status(404).json({
                status: 'error',
                message: `Device not found: ${deviceId}`
            });
        }

        // Get today's start and end
        const today = moment().startOf('day');
        const tomorrow = moment(today).add(1, 'days');

        // Get hourly energy consumption
        const [hourlyData] = await Sensor.sequelize.query(`
      SELECT 
        DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00') as hour,
        ROUND(AVG(voltage), 2) as avg_voltage,
        ROUND(AVG(current), 2) as avg_current,
        ROUND(AVG(power), 2) as avg_power,
        ROUND(AVG(energy), 2) as avg_energy,
        ROUND(MAX(energy) - MIN(energy), 2) as energy_diff,
        COUNT(*) as reading_count
      FROM sensors
      WHERE device_id = ? 
        AND timestamp BETWEEN ? AND ?
      GROUP BY DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00')
      ORDER BY hour ASC
    `, {
            replacements: [device.device_id, today.toDate(), tomorrow.toDate()],
            type: Sensor.sequelize.QueryTypes.SELECT
        });

        // Calculate summary stats
        const totalEnergyToday = hourlyData.reduce((sum, hour) =>
            sum + parseFloat(hour.energy_diff || 0), 0);

        const avgPowerToday = hourlyData.reduce((sum, hour) =>
            sum + parseFloat(hour.avg_power || 0), 0) / (hourlyData.length || 1);

        return res.json({
            status: 'success',
            device: {
                id: device.device_id,
                name: device.device_name
            },
            date: today.format('YYYY-MM-DD'),
            summary: {
                total_energy_kwh: parseFloat((totalEnergyToday / 1000).toFixed(3)), // Convert to kWh
                avg_power_w: parseFloat(avgPowerToday.toFixed(1)),
                hours_recorded: hourlyData.length,
                peak_hour: hourlyData.length > 0 ?
                    hourlyData.reduce((max, hour) =>
                        parseFloat(hour.avg_power) > parseFloat(max.avg_power) ? hour : max,
                        { avg_power: 0 }).hour : null
            },
            hourly_data: hourlyData.map(hour => ({
                hour: hour.hour,
                avg_voltage: parseFloat(hour.avg_voltage || 0),
                avg_current: parseFloat(hour.avg_current || 0),
                avg_power: parseFloat(hour.avg_power || 0),
                energy_consumed: parseFloat(hour.energy_diff || 0),
                reading_count: parseInt(hour.reading_count)
            }))
        });
    } catch (error) {
        console.error('Error in getDailyConsumption:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve daily consumption data',
            error: error.message
        });
    }
};

/**
 * Get aggregate statistics over time
 */
export const getAggregateStats = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { period = '7d' } = req.query;

        // Find device
        const device = await Device.findOne({
            where: { device_name: deviceId },
            attributes: ['device_id', 'device_name']
        });

        if (!device) {
            return res.status(404).json({
                status: 'error',
                message: `Device not found: ${deviceId}`
            });
        }

        // Calculate date range
        let startDate = moment();
        let endDate = moment();

        switch (period) {
            case '24h': startDate.subtract(24, 'hours'); break;
            case '7d': startDate.subtract(7, 'days'); break;
            case '30d': startDate.subtract(30, 'days'); break;
            case '90d': startDate.subtract(90, 'days'); break;
            case '1y': startDate.subtract(1, 'year'); break;
            default: startDate.subtract(7, 'days'); // Default to 7 days
        }

        // Get daily aggregated data
        const [dailyData] = await Sensor.sequelize.query(`
      SELECT 
        DATE_FORMAT(timestamp, '%Y-%m-%d') as date,
        ROUND(AVG(voltage), 2) as avg_voltage,
        ROUND(AVG(current), 2) as avg_current,
        ROUND(AVG(power), 2) as avg_power,
        ROUND(MAX(energy) - MIN(energy), 2) as daily_energy,
        SUM(pump_status) as pump_active_readings,
        COUNT(*) as total_readings
      FROM sensors
      WHERE device_id = ? 
        AND timestamp BETWEEN ? AND ?
      GROUP BY DATE_FORMAT(timestamp, '%Y-%m-%d')
      ORDER BY date ASC
    `, {
            replacements: [device.device_id, startDate.toDate(), endDate.toDate()],
            type: Sensor.sequelize.QueryTypes.SELECT
        });

        // Calculate totals and averages
        const totalEnergy = dailyData.reduce((sum, day) =>
            sum + parseFloat(day.daily_energy || 0), 0);

        const avgDailyEnergy = dailyData.length > 0 ?
            totalEnergy / dailyData.length : 0;

        const avgPumpUsage = dailyData.reduce((sum, day) => {
            const pumpUsagePercent = day.total_readings > 0 ?
                (day.pump_active_readings / day.total_readings * 100) : 0;
            return sum + pumpUsagePercent;
        }, 0) / (dailyData.length || 1);

        return res.json({
            status: 'success',
            device: {
                id: device.device_id,
                name: device.device_name
            },
            period,
            time_range: {
                start: startDate.format('YYYY-MM-DD'),
                end: endDate.format('YYYY-MM-DD'),
                days: dailyData.length
            },
            summary: {
                total_energy_kwh: parseFloat((totalEnergy / 1000).toFixed(3)), // Convert to kWh
                avg_daily_energy_kwh: parseFloat((avgDailyEnergy / 1000).toFixed(3)),
                avg_pump_usage_percent: parseFloat(avgPumpUsage.toFixed(1))
            },
            daily_data: dailyData.map(day => ({
                date: day.date,
                avg_voltage: parseFloat(day.avg_voltage || 0),
                avg_current: parseFloat(day.avg_current || 0),
                avg_power: parseFloat(day.avg_power || 0),
                energy_consumed: parseFloat(day.daily_energy || 0),
                energy_kwh: parseFloat((day.daily_energy / 1000 || 0).toFixed(3)),
                pump_usage_percent: parseFloat(((day.pump_active_readings / day.total_readings * 100) || 0).toFixed(1)),
                reading_count: parseInt(day.total_readings)
            }))
        });
    } catch (error) {
        console.error('Error in getAggregateStats:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve aggregate statistics',
            error: error.message
        });
    }
};

/**
 * Get energy trend data for charting
 * @param {Request} req - Express request object with deviceId param and timeframe query
 * @param {Response} res - Express response object
 */
export const getEnergyTrends = async (req, res) => {
    const startTime = Date.now();
    try {
        const { deviceId } = req.params;
        const timeframe = req.query.timeframe || '24h';

        // Find device by name
        const device = await Device.findOne({
            where: { device_name: deviceId },
            attributes: ['device_id']
        });

        if (!device) {
            return res.status(404).json({
                status: 'error',
                message: `Device not found: ${deviceId}`
            });
        }

        // Calculate start date based on timeframe
        let startDate = new Date();
        let interval = '5 minute'; // Default interval for aggregation

        switch (timeframe) {
            case '1h':
                startDate.setHours(startDate.getHours() - 1);
                interval = '1 minute';
                break;
            case '6h':
                startDate.setHours(startDate.getHours() - 6);
                interval = '5 minute';
                break;
            case '12h':
                startDate.setHours(startDate.getHours() - 12);
                interval = '10 minute';
                break;
            case '24h':
                startDate.setHours(startDate.getHours() - 24);
                interval = '15 minute';
                break;
            case '7d':
                startDate.setDate(startDate.getDate() - 7);
                interval = '1 hour';
                break;
            case '30d':
                startDate.setDate(startDate.getDate() - 30);
                interval = '6 hour';
                break;
            default:
                startDate.setHours(startDate.getHours() - 24);
        }

        // Get data in appropriate time windows
        const data = await EnergyTrend.sequelize.query(`
      SELECT 
        DATE_FORMAT(period_start, '%Y-%m-%d %H:%i:00') as period_start,
        ROUND(AVG(avg_voltage), 2) as avg_voltage,
        ROUND(AVG(avg_current), 3) as avg_current,
        ROUND(AVG(avg_power), 2) as avg_power,
        ROUND(SUM(total_energy), 3) as total_energy,
        SUM(pump_active_duration) as pump_active_duration,
        COUNT(*) as data_points
      FROM energy_trends
      WHERE device_id = ? AND period_start >= ?
      GROUP BY DATE_FORMAT(period_start, CONCAT('%Y-%m-%d %H:', FLOOR(MINUTE(period_start) / EXTRACT(MINUTE FROM INTERVAL ${interval}) ) * EXTRACT(MINUTE FROM INTERVAL ${interval}), ':00'))
      ORDER BY period_start ASC
    `, {
            replacements: [device.device_id, startDate],
            type: Sequelize.QueryTypes.SELECT
        });

        // Return data with metadata
        return res.json({
            status: 'success',
            message: 'Energy trend data retrieved',
            data,
            timeframe,
            device_id: deviceId,
            interval,
            count: data.length,
            processing_time_ms: Date.now() - startTime
        });
    } catch (error) {
        console.error('Error getting energy trends:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve energy trend data',
            error: error.message,
            processing_time_ms: Date.now() - startTime
        });
    }
};

/**
 * Get latest energy data for real-time monitoring
 * @param {Request} req - Express request object with deviceId param
 * @param {Response} res - Express response object
 */
export const getLatestEnergyData = async (req, res) => {
    const startTime = Date.now();

    try {
        const { deviceId } = req.params;
        const count = parseInt(req.query.count) || 10; // Number of recent points to return

        // Find device by name
        const device = await Device.findOne({
            where: { device_name: deviceId },
            attributes: ['device_id']
        });

        if (!device) {
            return res.status(404).json({
                status: 'error',
                message: `Device not found: ${deviceId}`
            });
        }

        // Get the most recent energy trend data
        const latestData = await EnergyTrend.findAll({
            where: {
                device_id: device.device_id,
                period_type: 'realtime'
            },
            order: [['period_start', 'DESC']],
            limit: count
        });

        // Calculate current usage metrics
        const current = latestData.length > 0 ? {
            voltage: latestData[0].avg_voltage,
            current: latestData[0].avg_current,
            power: latestData[0].avg_power,
            energy_rate: latestData[0].avg_power / 1000, // kWh per hour at current rate
            timestamp: latestData[0].period_start
        } : null;

        // Calculate summary metrics
        const last24Hours = await EnergyTrend.findAll({
            where: {
                device_id: device.device_id,
                period_start: {
                    [Op.gte]: moment().subtract(24, 'hours').toDate()
                }
            },
            attributes: [
                [Sequelize.fn('AVG', Sequelize.col('avg_power')), 'avg_power'],
                [Sequelize.fn('SUM', Sequelize.col('total_energy')), 'total_energy'],
                [Sequelize.fn('SUM', Sequelize.col('pump_active_duration')), 'pump_duration']
            ],
            raw: true
        });

        // Format results for frontend
        const data = latestData.map(item => ({
            period_start: item.period_start,
            avg_voltage: parseFloat(item.avg_voltage),
            avg_current: parseFloat(item.avg_current),
            avg_power: parseFloat(item.avg_power),
            total_energy: parseFloat(item.total_energy),
            pump_active_duration: item.pump_active_duration
        })).reverse(); // Reverse to get chronological order

        const summary = {
            avg_power_24h: parseFloat((last24Hours[0]?.avg_power || 0).toFixed(2)),
            total_energy_24h: parseFloat((last24Hours[0]?.total_energy || 0).toFixed(3)),
            pump_duration_24h: last24Hours[0]?.pump_duration || 0,
            estimated_daily_kwh: parseFloat(((last24Hours[0]?.avg_power || 0) * 24 / 1000).toFixed(2)),
            current
        };

        return res.json({
            status: 'success',
            message: 'Latest energy data retrieved',
            device_id: deviceId,
            data,
            summary,
            timestamp: new Date(),
            processing_time_ms: Date.now() - startTime
        });
    } catch (error) {
        console.error('Error getting latest energy data:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve latest energy data',
            error: error.message,
            processing_time_ms: Date.now() - startTime
        });
    }
};

/**
 * Get electrical chart data formatted for dashboard visualization
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const getElectricalChartData = async (req, res) => {
    const startTime = Date.now();
    try {
        const { deviceId } = req.params;
        const timeframe = req.query.timeframe || '1h';
        const chartType = req.query.type || 'line'; // line, area, bar

        // Find device by name
        const device = await Device.findOne({
            where: { device_name: deviceId },
            attributes: ['device_id']
        });

        if (!device) {
            return res.status(404).json({
                status: 'error',
                message: `Device not found: ${deviceId}`
            });
        }

        // Calculate start date and appropriate interval based on timeframe
        let startDate = new Date();
        let interval, maxPoints;

        switch (timeframe) {
            case '1h':
                startDate.setHours(startDate.getHours() - 1);
                interval = 'realtime'; // Use raw data for 1 hour
                maxPoints = 60; // One point per minute
                break;
            case '6h':
                startDate.setHours(startDate.getHours() - 6);
                interval = '5 minute';
                maxPoints = 72; // One point per 5 minutes
                break;
            case '12h':
                startDate.setHours(startDate.getHours() - 12);
                interval = '10 minute';
                maxPoints = 72; // One point per 10 minutes
                break;
            case '24h':
                startDate.setHours(startDate.getHours() - 24);
                interval = '15 minute';
                maxPoints = 96; // One point per 15 minutes
                break;
            case '7d':
                startDate.setDate(startDate.getDate() - 7);
                interval = '1 hour';
                maxPoints = 168; // One point per hour
                break;
            case '30d':
                startDate.setDate(startDate.getDate() - 30);
                interval = '6 hour';
                maxPoints = 120; // One point per 6 hours
                break;
            default:
                startDate.setHours(startDate.getHours() - 1);
                interval = 'realtime';
                maxPoints = 60;
        }

        let data;

        if (interval === 'realtime') {
            // For 1-hour, use sensor data directly for higher resolution
            data = await Sensor.findAll({
                where: {
                    device_id: device.device_id,
                    timestamp: { [Op.gte]: startDate }
                },
                attributes: [
                    'timestamp',
                    'voltage',
                    'current',
                    'power',
                    'energy',
                    'pump_status'
                ],
                order: [['timestamp', 'ASC']],
                limit: maxPoints
            });

            // Format for charting
            data = data.map(item => ({
                time: item.timestamp,
                voltage: parseFloat(item.voltage || 0),
                current: parseFloat(item.current || 0) * 1000, // Convert to mA for better visualization
                power: parseFloat(item.power || 0),
                pump_active: item.pump_status ? 1 : 0
            }));
        } else {
            // For longer timeframes, use aggregated data from energy_trends
            data = await EnergyTrend.sequelize.query(`
        SELECT 
          DATE_FORMAT(period_start, '%Y-%m-%d %H:%i:00') as time,
          ROUND(AVG(avg_voltage), 1) as voltage,
          ROUND(AVG(avg_current) * 1000, 2) as current, 
          ROUND(AVG(avg_power), 1) as power,
          SUM(total_energy) as energy,
          SUM(pump_active_duration) > 0 as pump_active
        FROM energy_trends
        WHERE device_id = ? AND period_start >= ?
        GROUP BY DATE_FORMAT(period_start, CONCAT('%Y-%m-%d %H:', FLOOR(MINUTE(period_start) / EXTRACT(MINUTE FROM INTERVAL ${interval}) ) * EXTRACT(MINUTE FROM INTERVAL ${interval}), ':00'))
        ORDER BY time ASC
        LIMIT ?
      `, {
                replacements: [device.device_id, startDate, maxPoints],
                type: Sequelize.QueryTypes.SELECT
            });
        }

        // Calculate statistics
        const stats = {
            voltage: {
                avg: parseFloat(data.reduce((sum, item) => sum + item.voltage, 0) / (data.length || 1)).toFixed(1),
                min: parseFloat(Math.min(...data.map(item => item.voltage))).toFixed(1),
                max: parseFloat(Math.max(...data.map(item => item.voltage))).toFixed(1)
            },
            current: {
                avg: parseFloat(data.reduce((sum, item) => sum + item.current, 0) / (data.length || 1)).toFixed(2),
                min: parseFloat(Math.min(...data.map(item => item.current))).toFixed(2),
                max: parseFloat(Math.max(...data.map(item => item.current))).toFixed(2)
            },
            power: {
                avg: parseFloat(data.reduce((sum, item) => sum + item.power, 0) / (data.length || 1)).toFixed(1),
                min: parseFloat(Math.min(...data.map(item => item.power))).toFixed(1),
                max: parseFloat(Math.max(...data.map(item => item.power))).toFixed(1)
            }
        };

        // Prepare chart configuration
        const chartConfig = {
            type: chartType,
            timeframe,
            interval,
            xAxis: {
                type: 'time',
                label: 'Time'
            },
            yAxes: [
                {
                    id: 'voltage',
                    position: 'left',
                    label: 'Voltage (V)',
                    min: Math.max(0, Math.floor(stats.voltage.min - 5)),
                    max: Math.ceil(stats.voltage.max + 5)
                },
                {
                    id: 'current',
                    position: 'right',
                    label: 'Current (mA)',
                    min: 0,
                    max: Math.ceil(stats.current.max * 1.1)
                }
            ],
            series: [
                {
                    name: 'Voltage',
                    yAxisID: 'voltage',
                    data: 'voltage',
                    color: '#3b82f6' // blue
                },
                {
                    name: 'Current',
                    yAxisID: 'current',
                    data: 'current',
                    color: '#10b981' // green
                },
                {
                    name: 'Power',
                    yAxisID: 'current',
                    data: 'power',
                    color: '#f59e0b' // amber
                },
                {
                    name: 'Pump',
                    data: 'pump_active',
                    type: 'bar',
                    color: '#ef4444',  // red
                    yAxisID: 'current'
                }
            ]
        };

        return res.json({
            status: 'success',
            message: 'Electrical chart data retrieved',
            device_id: deviceId,
            data,
            stats,
            chartConfig,
            count: data.length,
            processing_time_ms: Date.now() - startTime
        });
    } catch (error) {
        console.error('Error getting electrical chart data:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve electrical chart data',
            error: error.message,
            processing_time_ms: Date.now() - startTime
        });
    }
};

/**
 * Get power consumption statistics
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const getPowerConsumptionStats = async (req, res) => {
    const startTime = Date.now();
    try {
        const { deviceId } = req.params;
        const period = req.query.period || 'day'; // day, week, month

        // Find device by name
        const device = await Device.findOne({
            where: { device_name: deviceId },
            attributes: ['device_id']
        });

        if (!device) {
            return res.status(404).json({
                status: 'error',
                message: `Device not found: ${deviceId}`
            });
        }

        // Calculate start date based on period
        let startDate = new Date();
        let groupBy, formatString;

        switch (period) {
            case 'day':
                startDate.setDate(startDate.getDate() - 1);
                groupBy = 'HOUR(period_start)';
                formatString = '%H:00';
                break;
            case 'week':
                startDate.setDate(startDate.getDate() - 7);
                groupBy = 'DATE(period_start)';
                formatString = '%Y-%m-%d';
                break;
            case 'month':
                startDate.setMonth(startDate.getMonth() - 1);
                groupBy = 'DATE(period_start)';
                formatString = '%Y-%m-%d';
                break;
            default:
                startDate.setDate(startDate.getDate() - 1);
                groupBy = 'HOUR(period_start)';
                formatString = '%H:00';
        }

        // Get aggregated data
        const data = await EnergyTrend.sequelize.query(`
      SELECT 
        ${groupBy} as time_group,
        DATE_FORMAT(period_start, '${formatString}') as time_label,
        ROUND(AVG(avg_power), 2) as avg_power,
        ROUND(SUM(total_energy), 3) as total_energy,
        SUM(pump_active_duration) as pump_duration,
        COUNT(*) as data_points
      FROM energy_trends
      WHERE device_id = ? AND period_start >= ?
      GROUP BY ${groupBy}, time_label
      ORDER BY time_group ASC
    `, {
            replacements: [device.device_id, startDate],
            type: Sequelize.QueryTypes.SELECT
        });

        // Calculate summary statistics
        const totalEnergy = data.reduce((sum, item) => sum + parseFloat(item.total_energy || 0), 0);
        const avgPower = data.reduce((sum, item) => sum + parseFloat(item.avg_power || 0), 0) / (data.length || 1);
        const totalPumpDuration = data.reduce((sum, item) => sum + parseInt(item.pump_duration || 0), 0);

        const stats = {
            total_energy: parseFloat(totalEnergy.toFixed(3)),
            avg_power: parseFloat(avgPower.toFixed(2)),
            total_pump_duration: totalPumpDuration,
            cost_estimate: parseFloat((totalEnergy * 1500).toFixed(2)), // Assuming Rp. 1500/kWh
            data_points: data.reduce((sum, item) => sum + parseInt(item.data_points || 0), 0)
        };

        return res.json({
            status: 'success',
            message: 'Power consumption statistics retrieved',
            device_id: deviceId,
            period,
            data,
            stats,
            processing_time_ms: Date.now() - startTime
        });
    } catch (error) {
        console.error('Error getting power consumption stats:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve power consumption statistics',
            error: error.message,
            processing_time_ms: Date.now() - startTime
        });
    }
};

/**
 * Get all sensor data with flexible filtering
 * Updated to show all sensor data, not just insect detection
 */
export const getAllSensorData = async (req, res) => {
    try {
        const { limit = 50, include_all = 'true' } = req.query;
        const parsedLimit = Math.min(parseInt(limit), 200); // Cap at 200 for performance
        
        console.log('Fetching all sensor data with limit:', parsedLimit, 'include_all:', include_all);

        // Get all sensor data with device information
        const rawData = await Sensor.findAll({
            attributes: [
                'sensor_id', 'device_id', 'voltage', 'current',
                'power', 'energy', 'pir_status', 'pump_status',
                'auto_mode', 'timestamp'
            ],
            include: [{ 
                model: Device, 
                attributes: ['device_name', 'location'], 
                as: 'device',
                required: false // LEFT JOIN instead of INNER JOIN
            }],
            order: [['timestamp', 'DESC']],
            limit: parsedLimit
        });

        console.log(`Found ${rawData.length} sensor readings`);

        // If include_all is true, return all data without complex filtering
        if (include_all === 'true') {
            const formattedData = rawData.map(reading => {
                const data = reading.toJSON();
                
                // Format timestamp
                if (data.timestamp) {
                    data.timestamp = new Date(data.timestamp).toISOString().slice(0, 19).replace('T', ' ');
                }
                
                // Add basic insect detection flag based on PIR status
                data.insect_detected = data.pir_status ? true : false;
                
                return data;
            });

            return res.json({ 
                status: 'success', 
                message: `Retrieved ${formattedData.length} sensor readings`,
                count: formattedData.length,
                data: formattedData 
            });
        }

        // Legacy algorithm for strict insect detection (when include_all=false)
        const result = [];
        
        // Track last notification time to prevent spam
        if (!global.lastInsectNotificationTime) {
            global.lastInsectNotificationTime = new Map();
        }
        
        // Group readings by device
        const deviceReadings = {};
        rawData.forEach(item => {
            if (!deviceReadings[item.device_id]) {
                deviceReadings[item.device_id] = [];
            }
            deviceReadings[item.device_id].push(item);
        });
        
        // Process each device separately for strict detection
        for (const [deviceId, readings] of Object.entries(deviceReadings)) {
            // Sort readings by timestamp (oldest first)
            readings.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            
            // Find consistent motion periods (5 seconds instead of 30 for more flexible detection)
            let consecutiveActiveTime = 0;
            let lastActiveTime = null;
            let firstActiveReading = null;
            
            for (const item of readings) {
                if (item.pir_status) {
                    const currentTime = new Date(item.timestamp).getTime();
                    
                    if (!firstActiveReading) {
                        firstActiveReading = item;
                        lastActiveTime = currentTime;
                        consecutiveActiveTime = 0;
                    } else if (currentTime - lastActiveTime <= 5000) { // Allow gaps up to 5 seconds
                        consecutiveActiveTime += (currentTime - lastActiveTime);
                    } else {
                        // Reset if there's a gap in activity
                        firstActiveReading = item;
                        consecutiveActiveTime = 0;
                    }
                    
                    lastActiveTime = currentTime;
                    
                    // Check if we have 5 seconds of activity (more flexible than 30 seconds)
                    if (consecutiveActiveTime >= 5000) {
                        // Add to results
                        result.push({
                            ...item.toJSON(),
                            insect_detected: true,
                            active_duration: consecutiveActiveTime / 1000 // in seconds
                        });
                        
                        // Reset detection to avoid multiple notifications
                        consecutiveActiveTime = 0;
                        firstActiveReading = null;
                    }
                } else {
                    // Reset on inactivity
                    if (consecutiveActiveTime < 5000) { // Only reset if we haven't reached threshold
                        consecutiveActiveTime = 0;
                        firstActiveReading = null;
                    }
                }
            }
        }
        
        res.json({ 
            status: 'success', 
            message: `Found ${result.length} insect detections`,
            count: result.length,
            data: result 
        });
    } catch (error) {
        console.error('Error in getAllSensorData:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to retrieve sensor data',
            error: error.message,
            data: []
        });
    }
};

/**
 * Get latest sensor data with simplified logic
 * Returns all recent sensor readings without complex insect detection
 */
export const getLatestSensorData = async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        const parsedLimit = Math.min(parseInt(limit), 100); // Cap at 100 for performance

        console.log('Fetching latest sensor data with limit:', parsedLimit);

        // Get latest readings with device information
        const latestReadings = await Sensor.findAll({
            attributes: [
                'sensor_id', 'device_id', 'voltage', 'current',
                'power', 'energy', 'pir_status', 'pump_status',
                'auto_mode', 'timestamp'
            ],
            include: [{
                model: Device,
                attributes: ['device_name', 'location'],
                as: 'device',
                required: false // LEFT JOIN instead of INNER JOIN
            }],
            order: [['timestamp', 'DESC']],
            limit: parsedLimit
        });

        console.log(`Found ${latestReadings.length} sensor readings`);

        // Convert to plain objects and format data
        const formattedData = latestReadings.map(reading => {
            const data = reading.toJSON();
            
            // Ensure timestamp is formatted properly
            if (data.timestamp) {
                data.timestamp = new Date(data.timestamp).toISOString().slice(0, 19).replace('T', ' ');
            }
            
            return data;
        });

        return res.json({
            status: 'success',
            message: `Retrieved ${formattedData.length} latest sensor readings`,
            count: formattedData.length,
            data: formattedData
        });
    } catch (error) {
        console.error('Error in getLatestSensorData:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve latest sensor data',
            error: error.message,
            data: []
        });
    }
};

/**
 * Internal version of getElectricalChartData that returns data object directly
 * Used for combined dashboard endpoints
 * @param {string} deviceId - Device ID to fetch data for
 * @param {string} timeframe - Time range for data 
 */
export const getElectricalChartDataInternal = async (deviceId, timeframe) => {
    try {
        // Find device by name
        const device = await Device.findOne({
            where: { device_name: deviceId },
            attributes: ['device_id', 'device_name']
        });

        if (!device) {
            return { error: `Device not found: ${deviceId}` };
        }

        // Calculate start date and appropriate interval based on timeframe
        let startDate = new Date();
        let interval, maxPoints;

        // Configure based on timeframe
        switch (timeframe) {
            case '1h':
                startDate.setHours(startDate.getHours() - 1);
                interval = 'realtime';
                maxPoints = 60;
                break;
            case '6h':
                startDate.setHours(startDate.getHours() - 6);
                interval = '5 minute';
                maxPoints = 72;
                break;
            case '12h':
                startDate.setHours(startDate.getHours() - 12);
                interval = '10 minute';
                maxPoints = 72;
                break;
            case '24h':
                startDate.setHours(startDate.getHours() - 24);
                interval = '15 minute';
                maxPoints = 96;
                break;
            case '7d':
                startDate.setDate(startDate.getDate() - 7);
                interval = '1 hour';
                maxPoints = 168;
                break;
            case '30d':
                startDate.setDate(startDate.getDate() - 30);
                interval = '6 hour';
                maxPoints = 120;
                break;
            default:
                startDate.setHours(startDate.getHours() - 24);
                interval = '15 minute';
                maxPoints = 96;
        }

        // Query and format data
        let data;

        if (interval === 'realtime') {
            // Use sensor data for high resolution
            data = await Sensor.findAll({
                where: {
                    device_id: device.device_id,
                    timestamp: { [Op.gte]: startDate }
                },
                attributes: [
                    'timestamp',
                    'voltage',
                    'current',
                    'power',
                    'energy',
                    'pump_status'
                ],
                order: [['timestamp', 'ASC']],
                limit: maxPoints,
                raw: true
            });

            // Format for charting
            data = data.map(item => ({
                time: item.timestamp,
                voltage: parseFloat(item.voltage || 0),
                current: parseFloat(item.current || 0),
                power: parseFloat(item.power || 0),
                energy: parseFloat(item.energy || 0),
                pump_active: item.pump_status ? 1 : 0
            }));
        } else {
            // Use aggregated data from energy_trends
            data = await EnergyTrend.sequelize.query(`
        SELECT 
          DATE_FORMAT(period_start, '%Y-%m-%d %H:%i:00') as time,
          ROUND(AVG(avg_voltage), 1) as voltage,
          ROUND(AVG(avg_current) * 1000, 2) as current, 
          ROUND(AVG(avg_power), 1) as power,
          SUM(total_energy) as energy,
          SUM(pump_active_duration) > 0 as pump_active
        FROM energy_trends
        WHERE device_id = ? AND period_start >= ?
        GROUP BY DATE_FORMAT(period_start, CONCAT('%Y-%m-%d %H:', FLOOR(MINUTE(period_start) / EXTRACT(MINUTE FROM INTERVAL ${interval}) ) * EXTRACT(MINUTE FROM INTERVAL ${interval}), ':00'))
        ORDER BY time ASC
        LIMIT ?
      `, {
                replacements: [device.device_id, startDate, maxPoints],
                type: Sequelize.QueryTypes.SELECT
            });
        }

        // Calculate statistics
        const stats = {
            voltage: {
                avg: parseFloat((data.reduce((sum, item) => sum + (parseFloat(item.voltage) || 0), 0) / (data.length || 1)).toFixed(1)),
                min: parseFloat((Math.min(...data.map(item => parseFloat(item.voltage) || 0))).toFixed(1)),
                max: parseFloat((Math.max(...data.map(item => parseFloat(item.voltage) || 0))).toFixed(1))
            },
            current: {
                avg: parseFloat((data.reduce((sum, item) => sum + (parseFloat(item.current) || 0), 0) / (data.length || 1)).toFixed(3)),
                min: parseFloat((Math.min(...data.map(item => parseFloat(item.current) || 0))).toFixed(3)),
                max: parseFloat((Math.max(...data.map(item => parseFloat(item.current) || 0))).toFixed(3))
            },
            power: {
                avg: parseFloat((data.reduce((sum, item) => sum + (parseFloat(item.power) || 0), 0) / (data.length || 1)).toFixed(1)),
                min: parseFloat((Math.min(...data.map(item => parseFloat(item.power) || 0))).toFixed(1)),
                max: parseFloat((Math.max(...data.map(item => parseFloat(item.power) || 0))).toFixed(1))
            }
        };

        // Prepare chart configuration
        const chartConfig = {
            type: 'line',
            timeframe,
            interval,
            xAxis: {
                type: 'time',
                label: 'Time'
            },
            yAxes: [
                {
                    id: 'voltage',
                    position: 'left',
                    label: 'Voltage (V)',
                    min: Math.max(0, Math.floor(stats.voltage.min - 5)),
                    max: Math.ceil(stats.voltage.max + 5)
                },
                {
                    id: 'current',
                    position: 'right',
                    label: 'Current (A)',
                    min: 0,
                    max: Math.ceil(stats.current.max * 1.1)
                }
            ],
            series: [
                {
                    name: 'Voltage',
                    yAxisID: 'voltage',
                    data: 'voltage',
                    color: '#3b82f6' // blue
                },
                {
                    name: 'Current',
                    yAxisID: 'current',
                    data: 'current',
                    color: '#10b981' // green
                },
                {
                    name: 'Power',
                    yAxisID: 'current',
                    data: 'power',
                    color: '#f59e0b' // amber
                },
                {
                    name: 'Pump',
                    data: 'pump_active',
                    type: 'bar',
                    color: '#ef4444', // red
                    yAxisID: 'current'
                }
            ]
        };

        return {
            data,
            stats,
            chartConfig,
            timeframe,
            count: data.length
        };
    } catch (error) {
        console.error('Error in getElectricalChartDataInternal:', error);
        return { error: error.message };
    }
};

/**
 * Internal version of getEnergyTrends that returns data object directly
 * Used for combined dashboard endpoints
 * @param {string} deviceId - Device ID to fetch data for
 * @param {string} timeframe - Time range for data
 */
export const getEnergyTrendsInternal = async (deviceId, timeframe) => {
    try {
        // Find device by name
        const device = await Device.findOne({
            where: { device_name: deviceId },
            attributes: ['device_id']
        });

        if (!device) {
            return { error: `Device not found: ${deviceId}` };
        }

        // Calculate start date based on timeframe
        let startDate = new Date();
        let interval = '5 minute'; // Default interval for aggregation

        switch (timeframe) {
            case '1h':
                startDate.setHours(startDate.getHours() - 1);
                interval = '1 minute';
                break;
            case '6h':
                startDate.setHours(startDate.getHours() - 6);
                interval = '5 minute';
                break;
            case '12h':
                startDate.setHours(startDate.getHours() - 12);
                interval = '10 minute';
                break;
            case '24h':
                startDate.setHours(startDate.getHours() - 24);
                interval = '15 minute';
                break;
            case '7d':
                startDate.setDate(startDate.getDate() - 7);
                interval = '1 hour';
                break;
            case '30d':
                startDate.setDate(startDate.getDate() - 30);
                interval = '6 hour';
                break;
            default:
                startDate.setHours(startDate.getHours() - 24);
        }

        // Get data in appropriate time windows
        const data = await EnergyTrend.sequelize.query(`
      SELECT 
        DATE_FORMAT(period_start, '%Y-%m-%d %H:%i:00') as period_start,
        ROUND(AVG(avg_voltage), 2) as avg_voltage,
        ROUND(AVG(avg_current), 3) as avg_current,
        ROUND(AVG(avg_power), 2) as avg_power,
        ROUND(SUM(total_energy), 3) as total_energy,
        SUM(pump_active_duration) as pump_active_duration,
        COUNT(*) as data_points
      FROM energy_trends
      WHERE device_id = ? AND period_start >= ?
      GROUP BY DATE_FORMAT(period_start, CONCAT('%Y-%m-%d %H:', FLOOR(MINUTE(period_start) / EXTRACT(MINUTE FROM INTERVAL ${interval}) ) * EXTRACT(MINUTE FROM INTERVAL ${interval}), ':00'))
      ORDER BY period_start ASC
    `, {
            replacements: [device.device_id, startDate],
            type: Sequelize.QueryTypes.SELECT
        });

        return {
            data,
            timeframe,
            interval
        };
    } catch (error) {
        console.error('Error in getEnergyTrendsInternal:', error);
        return { error: error.message };
    }
};

/**
 * Internal version of getLatestEnergyData that returns data object directly
 * Used for combined dashboard endpoints
 * @param {string} deviceId - Device ID to fetch data for
 */
export const getLatestEnergyDataInternal = async (deviceId) => {
    try {
        // Find device by name
        const device = await Device.findOne({
            where: { device_name: deviceId },
            attributes: ['device_id']
        });

        if (!device) {
            return { error: `Device not found: ${deviceId}` };
        }

        // Get the most recent energy trend data (last 10 points)
        const latestData = await EnergyTrend.findAll({
            where: {
                device_id: device.device_id,
                period_type: 'realtime'
            },
            order: [['period_start', 'DESC']],
            limit: 10,
            raw: true
        });

        // Calculate current usage metrics (from most recent reading)
        const current = latestData.length > 0 ? {
            voltage: parseFloat(latestData[0].avg_voltage),
            current: parseFloat(latestData[0].avg_current),
            power: parseFloat(latestData[0].avg_power),
            energy_rate: parseFloat(latestData[0].avg_power) / 1000, // kWh per hour at current rate
            timestamp: latestData[0].period_start
        } : null;

        // Calculate summary metrics for last 24 hours
        const last24Hours = await EnergyTrend.findAll({
            where: {
                device_id: device.device_id,
                period_start: {
                    [Op.gte]: moment().subtract(24, 'hours').toDate()
                }
            },
            attributes: [
                [Sequelize.fn('AVG', Sequelize.col('avg_power')), 'avg_power'],
                [Sequelize.fn('SUM', Sequelize.col('total_energy')), 'total_energy'],
                [Sequelize.fn('SUM', Sequelize.col('pump_active_duration')), 'pump_duration']
            ],
            raw: true
        });

        // Format results for frontend
        const data = latestData.map(item => ({
            period_start: item.period_start,
            avg_voltage: parseFloat(item.avg_voltage),
            avg_current: parseFloat(item.avg_current),
            avg_power: parseFloat(item.avg_power),
            total_energy: parseFloat(item.total_energy),
            pump_active_duration: item.pump_active_duration
        })).reverse(); // Reverse to get chronological order

        const summary = {
            avg_power_24h: parseFloat((last24Hours[0]?.avg_power || 0).toFixed(2)),
            total_energy_24h: parseFloat((last24Hours[0]?.total_energy || 0).toFixed(3)),
            pump_duration_24h: last24Hours[0]?.pump_duration || 0,
            estimated_daily_kwh: parseFloat(((last24Hours[0]?.avg_power || 0) * 24 / 1000).toFixed(2)),
            current
        };

        return {
            data,
            summary
        };
    } catch (error) {
        console.error('Error in getLatestEnergyDataInternal:', error);
        return { error: error.message };
    }
};

/**
 * --- NOTIFICATION LOGIC ---
 */

/**
 * Create a notification for insect detection
 * @param {Object} detectionEvent - The detection event data
 * @param {Object} detectionEvent.device - The device object
 * @param {string} detectionEvent.device_id - The device ID
 * @param {Date} detectionEvent.timestamp - The detection timestamp
 */
export const notifyInsectDetection = async (detectionEvent) => {
    try {
        const { device, device_id, timestamp, duration = 0 } = detectionEvent;
        
        // Check if we've already sent a notification for this device recently
        const hasRecent = await Notification.hasRecentNotifications('insect', device_id, 5); // 5 minute cooldown
        
        if (hasRecent) {
            console.log(`[INSECT DETECTION] Skipping notification for device ${device_id} - cooldown period active`);
            return;
        }
        
        // Prepare device info
        const deviceInfo = {
            device_id,
            device_name: device?.device_name,
            location: device?.location,
            duration // Include duration in seconds
        };
        
        // Use the specialized notification function from notificationController
        const { createInsectDetectionNotification } = await import('./notificationController.js');
        await createInsectDetectionNotification(deviceInfo, timestamp);
        
        console.log(`[INSECT DETECTION] Notification created for device ${device_id} at ${timestamp} (activity duration: ${duration}s)`);
    } catch (err) {
        console.error('Failed to create insect detection notification:', err.message);
    }
};

/**
 * Create a notification for schedule result
 * @param {Object} param - The notification parameters
 * @param {Object} param.device - The device object
 * @param {string} param.device_id - The device ID
 * @param {Date} param.timestamp - The schedule execution timestamp
 * @param {boolean} param.success - Whether the schedule was successful
 * @param {string} [param.reason] - The reason for failure (if any)
 */
export const notifyScheduleResult = async ({ device, device_id, timestamp, success, reason }) => {
    try {
        const title = success ? 'Jadwal Berhasil Dijalankan' : 'Jadwal Gagal Dijalankan';
        const message = success
            ? `Jadwal berhasil dijalankan pada sensor ${device?.device_name || device_id} di lokasi ${device?.location || '-'} pada ${timestamp}`
            : `Jadwal gagal dijalankan pada sensor ${device?.device_name || device_id} di lokasi ${device?.location || '-'} pada ${timestamp}. Alasan: ${reason || '-'}`;
        await Notification.create({ type: 'schedule', title, message });
    } catch (err) {
        console.error('Failed to create schedule notification:', err.message);
    }
};

// Get comprehensive insect activity statistics from database
export const getInsectActivityStats = async (req, res) => {
    try {
        const db = await connectDB();
        
        // Get all sensor data with PIR detections (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const query = `
            SELECT 
                s.pir_status,
                s.pump_status,
                s.timestamp,
                s.voltage,
                s.current,
                s.power,
                s.device_id,
                d.device_name,
                d.location
            FROM sensor_data s
            LEFT JOIN devices d ON s.device_id = d.device_id
            WHERE s.timestamp >= ?
            ORDER BY s.timestamp DESC
        `;
        
        const [rows] = await db.execute(query, [thirtyDaysAgo.toISOString().slice(0, 19).replace('T', ' ')]);
        
        // Calculate statistics
        const totalDetections = rows.filter(row => row.pir_status === 1).length;
        const totalPumpActivations = rows.filter(row => row.pump_status === 1).length;
        const bothActive = rows.filter(row => row.pir_status === 1 && row.pump_status === 1).length;
        
        // Calculate efficiency (pump activations when insect detected)
        const efficiency = totalDetections > 0 ? Math.round((bothActive / totalDetections) * 100) : 0;
        
        // Find peak activity hour
        const hourlyActivity = {};
        rows.forEach(row => {
            if (row.pir_status === 1 && row.timestamp) {
                const hour = new Date(row.timestamp).getHours();
                const hourLabel = `${hour.toString().padStart(2, '0')}:00`;
                hourlyActivity[hourLabel] = (hourlyActivity[hourLabel] || 0) + 1;
            }
        });
        
        const peakHour = Object.keys(hourlyActivity).reduce((a, b) => 
            hourlyActivity[a] > hourlyActivity[b] ? a : b, Object.keys(hourlyActivity)[0]) || '-';
        const peakDetections = hourlyActivity[peakHour] || 0;
        
        // Generate hourly activity data for chart
        const insectActivityData = [];
        for (let hour = 0; hour < 24; hour++) {
            const hourLabel = `${hour.toString().padStart(2, '0')}:00`;
            const hourDetections = hourlyActivity[hourLabel] || 0;
            const hourPumpActivations = rows.filter(row => {
                if (row.timestamp && row.pump_status === 1) {
                    const rowHour = new Date(row.timestamp).getHours();
                    return rowHour === hour;
                }
                return false;
            }).length;
            
            const hourEfficiency = hourDetections > 0 ? 
                Math.round((rows.filter(row => {
                    if (row.timestamp && row.pir_status === 1 && row.pump_status === 1) {
                        const rowHour = new Date(row.timestamp).getHours();
                        return rowHour === hour;
                    }
                    return false;
                }).length / hourDetections) * 100) : 0;
            
            insectActivityData.push({
                hour: hourLabel,
                detections: hourDetections,
                pumpActivations: hourPumpActivations,
                efficiency: hourEfficiency
            });
        }
        
        const stats = {
            totalDetections,
            totalPumpActivations,
            efficiency,
            peakHour,
            peakDetections,
            insectActivityData,
            dataRange: {
                from: thirtyDaysAgo.toISOString().slice(0, 10),
                to: new Date().toISOString().slice(0, 10),
                totalRecords: rows.length
            }
        };
        
        res.json({
            success: true,
            message: 'Statistik aktivitas serangga berhasil diambil',
            data: stats
        });
        
    } catch (error) {
        console.error('Error getting insect activity stats:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil statistik aktivitas serangga',
            error: error.message
        });
    }
};

// export {
//     getLatestReadings,
//     getSensorHistory,
//     getDailyConsumption,
//     getAggregateStats,
//     getEnergyTrends,
//     getLatestEnergyData,
//     getElectricalChartData
// };
