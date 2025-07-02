// backend/controllers/notificationController.js
import Notification from '../models/notificationModel.js';
import { Op } from 'sequelize';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Path to notification settings file
const settingsPath = path.join(__dirname, '..', 'config', 'notificationSettings.json');

export const getAllNotifications = async (req, res) => {
  try {
    const notifications = await Notification.getAll();
    res.json({ success: true, data: notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch notifications', error: err.message });
  }
};

// Get a notification by ID (debug endpoint)
export const getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`[NOTIFIKASI][GET_BY_ID] Attempting to fetch notification with ID: ${id}`);
    
    if (!id || isNaN(parseInt(id))) {
      console.log(`[NOTIFIKASI][GET_BY_ID][ERROR] Invalid ID format: ${id}`);
      return res.status(400).json({ success: false, message: 'Valid notification ID is required' });
    }
    
    // Parse to integer to ensure correct comparison
    const notificationId = parseInt(id, 10);
    
    // Fetch the notification using our custom method
    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
      console.log(`[NOTIFIKASI][GET_BY_ID][ERROR] Notification ${notificationId} not found`);
      return res.status(404).json({ 
        success: false, 
        message: 'Notification not found',
        id: notificationId,
        // Add debug info to help diagnose the issue
        debug: {
          requestId: id,
          parsedId: notificationId,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    console.log(`[NOTIFIKASI][GET_BY_ID][SUCCESS] Notification ${notificationId} found:`, notification.toJSON());
    res.json({ 
      success: true, 
      data: notification,
      raw: notification.toJSON()
    });
  } catch (err) {
    console.error('[NOTIFIKASI][GET_BY_ID][ERROR]', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch notification', 
      error: err.message,
      id: req.params.id
    });
  }
};

export const createNotification = async (req, res) => {
  try {
    const { type, title, message } = req.body;
    const notification = await Notification.create({ type, title, message });
    console.log('[NOTIFIKASI][SUKSES]', notification);
    res.json({ success: true, data: notification });
  } catch (err) {
    console.error('[NOTIFIKASI][ERROR]', err.message);
    res.status(500).json({ success: false, message: 'Failed to create notification', error: err.message });
  }
};

export const markAllRead = async (req, res) => {
  try {
    await Notification.markAllRead();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to mark as read', error: err.message });
  }
};

export const deleteAll = async (req, res) => {
  try {
    await Notification.deleteAll();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete notifications', error: err.message });
  }
};

export const testNotification = async (req, res) => {
  try {
    const now = new Date();
    const notification = await Notification.create({
      type: 'test',
      title: 'Notifikasi Test',
      message: `Notifikasi test dibuat pada ${now.toISOString()}`
    });
    console.log('[NOTIFIKASI][SUKSES]', notification);
    res.json({ success: true, data: notification });
  } catch (err) {
    console.error('[NOTIFIKASI][ERROR]', err.message);
    res.status(500).json({ success: false, message: 'Failed to create test notification', error: err.message });
  }
};

// New function to create insect detection notifications
export const createInsectDetectionNotification = async (deviceInfo, timestamp) => {
  try {
    const { device_id, device_name, location, duration = 0 } = deviceInfo;
    const title = 'Deteksi Serangga!';
    
    // Include duration information in the notification message
    let message = `Serangga terdeteksi oleh sensor ${device_name || device_id} di lokasi ${location || '-'} pada ${new Date(timestamp).toLocaleString('id-ID')}`;
    
    // Add duration information if available
    if (duration > 0) {
      message += ` dengan aktivitas berkelanjutan selama ${duration} detik`;
    }
    
    const notification = await Notification.create({
      type: 'insect',
      title,
      message,
      device_id,
      status: 'unread'
    });
    
    console.log('[NOTIFIKASI][SERANGGA][SUKSES]', notification.toJSON());
    return notification;
  } catch (err) {
    console.error('[NOTIFIKASI][SERANGGA][ERROR]', err.message);
    return null;
  }
};

// Function to create pump activation notification (manual or scheduled)
export const createPumpActivationNotification = async (deviceInfo, isScheduled = false, schedule = null, activationType = null) => {
  try {
    const { device_id, device_name, location } = deviceInfo;
    const title = 'Pompa Aktif';
    
    // Create different messages based on activation type
    let message;
    let icon = '💧'; // Default water drop icon
    
    if (isScheduled && schedule) {
      message = `${icon} Pompa dinyalakan otomatis sesuai jadwal "${schedule.title}" pada sensor ${device_name || device_id} di lokasi ${location || '-'} pada ${new Date().toLocaleString('id-ID')}`;
    } else if (activationType === 'SCHEDULE') {
      message = `${icon} Pompa dinyalakan otomatis sesuai jadwal pada sensor ${device_name || device_id} di lokasi ${location || '-'} pada ${new Date().toLocaleString('id-ID')}`;
    } else if (activationType === 'MANUAL') {
      icon = '👤'; // Manual user icon
      message = `${icon} Pompa dinyalakan secara manual pada sensor ${device_name || device_id} di lokasi ${location || '-'} pada ${new Date().toLocaleString('id-ID')}`;
    } else if (activationType === 'AUTO') {
      icon = '🤖'; // Auto robot icon
      message = `${icon} Pompa dinyalakan otomatis (mode auto) pada sensor ${device_name || device_id} di lokasi ${location || '-'} pada ${new Date().toLocaleString('id-ID')}`;
    } else {
      // Default case for backward compatibility
      message = `${icon} Pompa dinyalakan pada sensor ${device_name || device_id} di lokasi ${location || '-'} pada ${new Date().toLocaleString('id-ID')}`;
    }
    
    const notification = await Notification.create({
      type: 'pump',
      title,
      message,
      device_id,
      status: 'unread'
    });
    
    console.log(`[NOTIFIKASI][POMPA][AKTIF][${activationType || 'UNKNOWN'}]`, notification.toJSON());
    return notification;
  } catch (err) {
    console.error('[NOTIFIKASI][POMPA][ERROR]', err.message);
    return null;
  }
};

// Function to create pump deactivation notifications
export const createPumpDeactivationNotification = async (deviceInfo, isScheduled = false, schedule = null, activationType = null) => {
  try {
    const { device_id, device_name, location } = deviceInfo;
    const title = 'Pompa Dimatikan';
    
    // Create different messages based on deactivation type
    let message;
    let icon = '🛑'; // Default stop icon
    
    if (isScheduled && schedule) {
      message = `${icon} Pompa dimatikan otomatis sesuai jadwal "${schedule.title}" pada sensor ${device_name || device_id} di lokasi ${location || '-'} pada ${new Date().toLocaleString('id-ID')}`;
    } else if (activationType === 'SCHEDULE') {
      message = `${icon} Pompa dimatikan otomatis sesuai jadwal pada sensor ${device_name || device_id} di lokasi ${location || '-'} pada ${new Date().toLocaleString('id-ID')}`;
    } else if (activationType === 'MANUAL') {
      icon = '👤'; // Manual user icon
      message = `${icon} Pompa dimatikan secara manual pada sensor ${device_name || device_id} di lokasi ${location || '-'} pada ${new Date().toLocaleString('id-ID')}`;
    } else if (activationType === 'AUTO') {
      icon = '🤖'; // Auto robot icon
      message = `${icon} Pompa dimatikan otomatis (mode auto) pada sensor ${device_name || device_id} di lokasi ${location || '-'} pada ${new Date().toLocaleString('id-ID')}`;
    } else {
      // Default case for backward compatibility
      message = `${icon} Pompa dimatikan pada sensor ${device_name || device_id} di lokasi ${location || '-'} pada ${new Date().toLocaleString('id-ID')}`;
    }
    
    const notification = await Notification.create({
      type: 'pump',
      title,
      message,
      device_id,
      status: 'unread'
    });
    
    console.log(`[NOTIFIKASI][POMPA][DIMATIKAN][${activationType || 'UNKNOWN'}]`, notification.toJSON());
    return notification;
  } catch (err) {
    console.error('[NOTIFIKASI][POMPA][DIMATIKAN][ERROR]', err.message);
    return null;
  }
};

// Function to create notification for schedule execution results
export const createScheduleExecutionNotification = async (deviceInfo, schedule, success = true, error = null) => {
  try {
    const { device_id, device_name, location } = deviceInfo;
    const title = success ? 'Jadwal Berhasil Dijalankan' : 'Jadwal Gagal Dijalankan';
    
    // Create message based on success/failure
    let message;
    if (success) {
      message = `Jadwal "${schedule.title}" berhasil dijalankan pada sensor ${device_name || device_id} di lokasi ${location || '-'} pada ${new Date().toLocaleString('id-ID')}`;
    } else {
      message = `Jadwal "${schedule.title}" gagal dijalankan pada sensor ${device_name || device_id} di lokasi ${location || '-'} pada ${new Date().toLocaleString('id-ID')}. Error: ${error || 'Tidak diketahui'}`;
    }
    
    const notification = await Notification.create({
      type: 'schedule',
      title,
      message,
      device_id,
      status: 'unread'
    });
    
    console.log('[NOTIFIKASI][JADWAL][SUKSES]', notification.toJSON());
    return notification;
  } catch (err) {
    console.error('[NOTIFIKASI][JADWAL][ERROR]', err.message);
    return null;
  }
};

// Get notification settings
export const getNotificationSettings = async (req, res) => {
  try {
    // Create directory if it doesn't exist
    const configDir = path.join(__dirname, '..', 'config');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    // Check if settings file exists, if not create default settings
    if (!fs.existsSync(settingsPath)) {
      const defaultSettings = {
        methods: {
          email: true,
          whatsapp: false
        },
        contact: {
          email: 'user@example.com',
          emailPassword: '',
          phone: ''
        }
      };
      
      fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
      return res.json({ success: true, data: defaultSettings });
    }
    
    // Read and parse settings file
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    res.json({ success: true, data: settings });
  } catch (err) {
    console.error('[NOTIFIKASI][SETTINGS][ERROR]', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve notification settings', 
      error: err.message 
    });
  }
};

// Save notification settings
export const saveNotificationSettings = async (req, res) => {
  try {
    const { methods, contact } = req.body;
    
    if (!methods || !contact) {
      return res.status(400).json({ 
        success: false, 
        message: 'Methods and contact data are required' 
      });
    }
    
    // Create directory if it doesn't exist
    const configDir = path.join(__dirname, '..', 'config');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    // Create settings object
    const settings = { methods, contact };
    
    // Write settings to file
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    
    res.json({ success: true, data: settings });
  } catch (err) {
    console.error('[NOTIFIKASI][SETTINGS][ERROR]', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save notification settings', 
      error: err.message 
    });
  }
};

// Mark a single notification as read
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`[NOTIFIKASI][MARK_READ] Received request to mark notification ${id} as read`);
    
    if (!id || isNaN(parseInt(id))) {
      console.log(`[NOTIFIKASI][MARK_READ][ERROR] Invalid ID format: ${id}`);
      return res.status(400).json({ success: false, message: 'Valid notification ID is required' });
    }
    
    // Parse to integer to ensure correct comparison
    const notificationId = parseInt(id, 10);
    console.log(`[NOTIFIKASI][MARK_READ] Parsed ID: ${notificationId}`);
    
    // Use the helper method to mark notification as read
    const updated = await Notification.markAsReadById(notificationId);
    
    if (updated[0] === 0) {
      console.log(`[NOTIFIKASI][MARK_READ][ERROR] Notification ${notificationId} not found`);
      return res.status(404).json({ 
        success: false, 
        message: 'Notification not found',
        id: notificationId
      });
    }
    
    console.log(`[NOTIFIKASI][MARK_READ][SUCCESS] Notification ${notificationId} marked as read`);
    res.json({ 
      success: true,
      message: 'Notification marked as read successfully',
      id: notificationId
    });
  } catch (err) {
    console.error('[NOTIFIKASI][MARK_READ][ERROR]', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to mark notification as read', 
      error: err.message,
      id: req.params.id
    });
  }
};
