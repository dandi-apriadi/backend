import { Sequelize } from "sequelize";
import db from "../config/Database.js";
import moment from "moment";
import { Device } from "./tableModel.js";

const { DataTypes } = Sequelize;

// Energy Consumption Trends Model - For analytics and reporting
const EnergyTrend = db.define('energy_trends', {
    trend_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    device_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'devices',
            key: 'device_id'
        }
    },
    avg_voltage: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0
    },
    avg_current: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0
    },
    avg_power: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0
    },
    total_energy: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0
    },
    pump_active_duration: {
        type: DataTypes.INTEGER, // in seconds
        allowNull: false,
        defaultValue: 0
    },
    period_start: {
        type: DataTypes.DATE,
        allowNull: false,
        get() {
            return moment(this.getDataValue('period_start')).format('YYYY-MM-DD HH:mm:ss');
        }
    },
    period_end: {
        type: DataTypes.DATE,
        allowNull: false,
        get() {
            return moment(this.getDataValue('period_end')).format('YYYY-MM-DD HH:mm:ss');
        }
    },
    period_type: {
        type: DataTypes.ENUM('realtime', 'hourly', 'daily', 'weekly', 'monthly'),
        allowNull: false,
        defaultValue: 'realtime' // Changed default to realtime
    },
    data_points: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of sensor readings included in this trend record'
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    freezeTableName: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false, indexes: [
        // Keep only essential composite index
        {
            name: 'idx_device_period',
            fields: ['device_id', 'period_type', 'period_start']
        }
    ]
});

// Define relationships
Device.hasMany(EnergyTrend, { foreignKey: 'device_id' });
EnergyTrend.belongsTo(Device, { foreignKey: 'device_id' });

export default EnergyTrend;
