import { Sequelize } from "sequelize";
import db from "../config/Database.js";
import moment from "moment";
import { Device } from "./tableModel.js";

const { DataTypes } = Sequelize;

// Schedule Model for device automation
const Schedule = db.define('schedules', {
    schedule_id: {
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
    title: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    schedule_type: {
        type: DataTypes.ENUM('one-time', 'daily', 'weekly', 'custom'),
        allowNull: false,
        defaultValue: 'one-time'
    },
    start_time: {
        type: DataTypes.TIME,
        allowNull: false
    }, end_time: {
        type: DataTypes.TIME,
        allowNull: true
    },
    action_type: {
        type: DataTypes.ENUM('turn_on', 'turn_off', 'toggle'),
        allowNull: false,
        defaultValue: 'turn_on'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    last_executed: {
        type: DataTypes.DATE,
        allowNull: true,
        get() {
            const rawValue = this.getDataValue('last_executed');
            if (rawValue) {
                return moment(rawValue).format('D MMMM, YYYY, h:mm A');
            }
            return null;
        }
    },
    execution_status: {
        type: DataTypes.ENUM('pending', 'success', 'failed'),
        allowNull: false,
        defaultValue: 'pending'
    },
    failure_reason: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        get() {
            const rawValue = this.getDataValue('created_at');
            if (rawValue) {
                return moment(this.getDataValue('created_at')).format('D MMMM, YYYY, h:mm A');
            }
            return null;
        }
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        get() {
            const rawValue = this.getDataValue('updated_at');
            if (rawValue) {
                return moment(this.getDataValue('updated_at')).format('D MMMM, YYYY, h:mm A');
            }
            return null;
        }
    }
}, {
    freezeTableName: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at', indexes: [
        // Keep only essential index
        {
            fields: ['device_id', 'is_active']
        }
    ]
});

// Define relationships
Device.hasMany(Schedule, { foreignKey: 'device_id' });
Schedule.belongsTo(Device, { foreignKey: 'device_id' });

export default Schedule;
