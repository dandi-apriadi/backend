// backend/models/notificationModel.js
import { Sequelize } from "sequelize";
import db from "../config/Database.js";
import moment from "moment";

const { DataTypes } = Sequelize;

const Notification = db.define('notifications', {
    notif_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    device_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    type: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    title: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('unread', 'read', 'belum terbaca', 'terbaca'),
        allowNull: false,
        defaultValue: 'unread'
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        get() {
            const rawValue = this.getDataValue('created_at');
            if (rawValue) {
                return moment(rawValue).format('D MMMM, YYYY, h:mm A');
            }
            return null;
        }
    }
}, {
    freezeTableName: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: []
});

Notification.addHook('afterCreate', (notif, options) => {
    console.log('[NOTIFIKASI][DB][SUKSES]', notif.toJSON());
});

// Add missing static methods referenced in the controller
Notification.getAll = async function() {
    return await this.findAll({
        order: [['created_at', 'DESC']]
    });
};

Notification.markAllRead = async function() {
    return await this.update({ status: 'read' }, {
        where: { status: 'unread' }
    });
};

Notification.deleteAll = async function() {
    return await this.destroy({
        where: {},
        truncate: true
    });
};

/**
 * Check if there are recent notifications of the same type and device
 * within the specified cooldown period
 * @param {string} type - The type of notification
 * @param {number} deviceId - The device ID
 * @param {number} cooldownMinutes - The cooldown period in minutes
 * @returns {Promise<boolean>} - True if there are recent notifications, false otherwise
 */
Notification.hasRecentNotifications = async function(type, deviceId, cooldownMinutes = 5) {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - cooldownMinutes);
    
    const count = await this.count({
        where: {
            type,
            device_id: deviceId,
            created_at: {
                [Sequelize.Op.gte]: cutoffTime
            }
        }
    });
    
    return count > 0;
};

/**
 * Mark a notification as read by ID
 * @param {number} id - The notification ID
 * @returns {Promise<[number]>} - Array containing the number of affected rows
 */
Notification.markAsReadById = async function(id) {
    console.log(`[NOTIFIKASI][MARK_READ] Attempting to mark notification ${id} as read`);
    
    try {
        const result = await this.update(
            { status: 'read' },
            { 
                where: { notif_id: id },
                returning: true
            }
        );
        
        console.log(`[NOTIFIKASI][MARK_READ] Result: ${result[0]} rows affected`);
        return result;
    } catch (error) {
        console.error(`[NOTIFIKASI][MARK_READ][ERROR] Failed to mark notification ${id} as read:`, error.message);
        throw error;
    }
};

/**
 * Find a notification by ID
 * @param {number} id - The notification ID
 * @returns {Promise<Object>} - The notification object
 */
Notification.findById = async function(id) {
    try {
        console.log(`[NOTIFIKASI][FIND_BY_ID] Looking for notification with ID: ${id}`);
        const notification = await this.findOne({
            where: { notif_id: id }
        });
        
        if (notification) {
            console.log(`[NOTIFIKASI][FIND_BY_ID] Found notification: ${notification.notif_id}`);
        } else {
            console.log(`[NOTIFIKASI][FIND_BY_ID] Notification with ID ${id} not found`);
        }
        
        return notification;
    } catch (error) {
        console.error(`[NOTIFIKASI][FIND_BY_ID][ERROR] Error finding notification ${id}:`, error.message);
        throw error;
    }
};

export default Notification;
