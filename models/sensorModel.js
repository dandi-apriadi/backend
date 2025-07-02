import { Sequelize } from "sequelize";
import db from "../config/Database.js";
import moment from "moment";
import { Device } from './tableModel.js';

const { DataTypes } = Sequelize;

// Enhanced Sensor Model with electrical measurements and optimized indexes
const Sensor = db.define('sensors', {
    sensor_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    device_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        // Using string reference to avoid circular dependencies
        references: {
            model: 'devices',
            key: 'device_id'
        }
    },
    voltage: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: 0
    },
    current: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: 0
    },
    power: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: 0
    },
    energy: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: 0
    },
    pir_status: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false
    },
    pump_status: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false
    },
    auto_mode: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: true
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        get() {
            const rawValue = this.getDataValue('timestamp');
            if (rawValue) {
                return moment(rawValue).format('YYYY-MM-DD HH:mm:ss');
            }
            return null;
        }
    },
    source: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: 'unknown',
        comment: 'Source of data: http_api, websocket, etc.'
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
        // Only keep essential indexes to avoid MySQL key limit
        {
            name: 'idx_device_timestamp',
            fields: ['device_id', 'timestamp']
        },
        {
            name: 'idx_timestamp_desc',
            fields: [{ attribute: 'timestamp', order: 'DESC' }]
        }
    ],
    // Add table options for better performance with time-series data
    engine: 'InnoDB',
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    comment: 'Stores ESP32 sensor readings with time-series optimization'
});

Sensor.belongsTo(Device, { foreignKey: 'device_id', as: 'device' });

export default Sensor;
