import db from '../config/Database.js';
import { Device } from '../models/tableModel.js';
import Sensor from '../models/sensorModel.js';
import EnergyTrend from '../models/energyTrendModel.js';
// import Alarm from '../models/alarmModel.js'; // Removed - alarm feature disabled

/**
 * Setup the database with all required tables
 * Adds indexes and optimizes for performance
 */
const setupDatabase = async () => {
    try {
        console.log('Setting up database...');
        console.log('Checking database connection...');

        // Test connection
        await db.authenticate();
        console.log('Database connection successful');

        // Synchronize models
        console.log('Creating or updating database tables...');

        // Disable foreign key checks during setup
        await db.query('SET FOREIGN_KEY_CHECKS = 0');

        // Create tables in proper order to respect dependencies
        try {
            await Device.sync({ alter: true });
            console.log('Device table synced');
        } catch (err) {
            console.error('Error syncing Device table:', err.message);
            return false;
        }

        try {
            await Sensor.sync({ alter: true });
            console.log('Sensor table synced');
        } catch (err) {
            console.error('Error syncing Sensor table:', err.message);
        }

        try {
            await EnergyTrend.sync({ alter: true });
            console.log('EnergyTrend table synced');
        } catch (err) {
            console.error('Error syncing EnergyTrend table:', err.message);
        }

        // Alarm table sync removed - alarm feature disabled
        /* 
        try {
            await Alarm.sync({ alter: true });
            console.log('Alarm table synced');
        } catch (err) {
            console.error('Error syncing Alarm table:', err.message);
        }
        */

        // Enable foreign key checks after setup
        await db.query('SET FOREIGN_KEY_CHECKS = 1');

        // Create default device if none exists
        const deviceCount = await Device.count();
        if (deviceCount === 0) {
            console.log('Creating default device...');
            await Device.create({
                device_name: 'ESP32-PUMP-01',
                device_status: 'nonaktif',
                location: 'Default Location',
                created_at: new Date()
            });
            console.log('Default device created');
        }

        // Create custom indexes
        console.log('Setting up additional indexes...');
        try {
            // For time range queries with device_id
            await db.query(`
                CREATE INDEX IF NOT EXISTS idx_sensors_time_range 
                ON sensors (device_id, timestamp)
            `);

            // For pump status filtering
            await db.query(`
                CREATE INDEX IF NOT EXISTS idx_sensors_pump 
                ON sensors (pump_status)
            `);

            // Alarm index removed - alarm feature disabled
            /*
            // For aggregation queries
            await db.query(`
                CREATE INDEX IF NOT EXISTS idx_alarms_device_time 
                ON alarms (device_id, timestamp)
            `);
            */
        } catch (indexError) {
            console.warn('Error creating custom indexes:', indexError.message);
            console.warn('Some queries may be slower without these indexes');
        }

        console.log('Database setup completed successfully');
        return true;
    } catch (error) {
        console.error('Database setup error:', error);
        return false;
    }
};

// Run setup if this script is executed directly
if (process.argv[1].endsWith('dbSetup.js')) {
    setupDatabase().then((success) => {
        if (success) {
            console.log('Database setup successful');
            process.exit(0);
        } else {
            console.error('Database setup failed');
            process.exit(1);
        }
    }).catch(err => {
        console.error('Unhandled error during database setup:', err);
        process.exit(1);
    });
}

export default setupDatabase;
