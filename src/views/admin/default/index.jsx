import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useESP32Data } from "../../../hooks/useESP32Data";
import { useScheduleManagement } from "../../../hooks/useScheduleManagement";
import PerangkatSection from "../../../components/dashboard/PerangkatSection";
import JadwalSection from "../../../components/dashboard/JadwalSection";
import ESP32Section from "../../../components/dashboard/ESP32Section";
import RealtimeClock from "../../../components/dashboard/RealtimeClock";
import ConnectionQualityIndicator from "../../../components/dashboard/ConnectionQualityIndicator";
import { useDataConsistencyVerification } from "../../../hooks/useDataConsistencyVerification";
import "../../../components/dashboard/dashboard-stable.css"; // Import the stabilizing CSS
import OfflineModeBanner from "../../../components/dashboard/OfflineModeBanner";
import { logOnce, warnOnce, errorOnce } from "../../../utils/consoleLogger";
// Import device status components
import DeviceStatusCard from "../../../components/dashboard/DeviceStatusCard";

// Constants
const REQUEST_CACHE = new Map();
const CACHE_DURATION = 30000; // 30 seconds cache
const DEVICE_INACTIVE_TIMEOUT = 15000; // 15 seconds without data means device is inactive

// Add API base URL constant - NO LOCALHOST FALLBACK
const API_BASE_URL = process.env.REACT_APP_API_URL;

const Dashboard = () => {
  // Set esp32 as the default tab
  const [activeTab, setActiveTab] = useState("esp32");

  // General state
  const [loadingState, setLoading] = useState(false);
  const [localSensorData, setLocalSensorData] = useState(null);
  const [localLastUpdate, setLocalLastUpdate] = useState(null);
  const [lastDataReceived, setLastDataReceived] = useState(null); const [connectionAttempts, setConnectionAttempts] = useState(0);

  // Device connection tracking
  const deviceDataRef = useRef({
    lastValidReading: null,
    dataConsistencyScore: 100,
    consecutiveFailures: 0
  });
  const reconnectAttemptsRef = useRef(0);
  const [deviceConnectionInfo, setDeviceConnectionInfo] = useState({
    deviceOnline: false,
    serverConnected: false,
    lastPing: null,
    pingAttempts: 0,
    deviceName: 'ESP32-PUMP-01',
    lastDataTimestamp: null,
    dataFreshness: 0
  });  // Schedule management state
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  // Schedule management hook
  const {
    schedules: hookSchedules,
    loading: hookScheduleLoading,
    error: hookScheduleError,
    fetchSchedules: hookFetchSchedules,
    createSchedule: hookCreateSchedule,
    updateSchedule: hookUpdateSchedule,
    deleteSchedule: hookDeleteSchedule,
    toggleScheduleStatus: hookToggleScheduleStatus,
    clearError: clearScheduleError,
    scheduleCount,
    activeScheduleCount
  } = useScheduleManagement();

  // Data hooks
  const {
    sensorData, devices,
    deviceStatus,
    deviceOnlineStatus,
    lastUpdate,
    isConnected,
    isOffline, // New offline state
    loading: dataLoading,
    sendCommand = () => console.warn('sendCommand not implemented'),
    fetchLatestSensorData = () => console.warn('fetchLatestSensorData not implemented'),
    fetchDeviceStatus = () => console.warn('fetchDeviceStatus not implemented'),
    fetchDevices = () => console.warn('fetchDevices not implemented'),
    checkConnection = () => Promise.resolve(false),
    registerRealTimeCallback = () => () => { }, // Returns a no-op cleanup function
    unregisterRealTimeCallback = () => { }, // No-op function
    retryConnection = () => console.warn('retryConnection not implemented')
  } = useESP32Data() || {};

  // Debug logging for devices
  useEffect(() => {
    console.log('Dashboard - Devices from useESP32Data:', devices);
    console.log('Dashboard - Devices length:', devices?.length);
    console.log('Dashboard - Devices is array:', Array.isArray(devices));
  }, [devices]);

  // Create safe implementations of these functions with proper memoization
  const safeFetchLatestSensorData = useCallback(() => {
    if (typeof fetchLatestSensorData === 'function') {
      return fetchLatestSensorData();
    }
    // Return a resolved promise instead of logging warnings
    return Promise.resolve(null);
  }, []); // Empty dependency array to ensure stability

  const safeFetchDeviceStatus = useCallback(() => {
    if (typeof fetchDeviceStatus === 'function') {
      return fetchDeviceStatus();
    }
    // Return a resolved promise instead of logging warnings
    return Promise.resolve(null);
  }, []); // Empty dependency array to ensure stability

  const safeCheckConnection = useCallback(() => {
    if (typeof checkConnection === 'function') {
      return checkConnection();
    }
    console.warn('checkConnection is not available');
    return Promise.resolve(false);
  }, [checkConnection]);

  const safeRegisterCallback = useCallback((callback) => {
    if (typeof registerRealTimeCallback === 'function') {
      return registerRealTimeCallback(callback);
    }
    console.warn('registerRealTimeCallback is not available');
    return () => { }; // Return a no-op cleanup function
  }, [registerRealTimeCallback]);

  const safeUnregisterCallback = useCallback((callback) => {
    if (typeof unregisterRealTimeCallback === 'function') {
      unregisterRealTimeCallback(callback);
    } else {
      console.warn('unregisterRealTimeCallback is not available');
    }
  }, [unregisterRealTimeCallback]);
  // Schedule management functions - now using hooks
  const tambahJadwal = useCallback(async (jadwalData) => {
    try {
      const result = await hookCreateSchedule(jadwalData);
      logOnce('SCHEDULE_ADDED', 'Jadwal berhasil ditambahkan:', result);
      setShowAddScheduleModal(false);
      return result;
    } catch (error) {
      errorOnce('ADD_SCHEDULE_ERROR', 'Gagal menambahkan jadwal:', error.message);
      throw error;
    }
  }, [hookCreateSchedule]);

  const updateJadwal = useCallback(async (scheduleId, updateData) => {
    try {
      console.log('Dashboard - updateJadwal called with:', { scheduleId, updateData });
      const result = await hookUpdateSchedule(scheduleId, updateData);
      console.log('Dashboard - updateJadwal result:', result);
      logOnce('SCHEDULE_UPDATED', 'Jadwal berhasil diperbarui:', result);
      return result;
    } catch (error) {
      console.error('Dashboard - updateJadwal error:', error);
      errorOnce('UPDATE_SCHEDULE_ERROR', 'Gagal memperbarui jadwal:', error.message);
      throw error;
    }
  }, [hookUpdateSchedule]);

  const deleteJadwal = useCallback(async (scheduleId) => {
    try {
      await hookDeleteSchedule(scheduleId);
      logOnce('SCHEDULE_DELETED', 'Jadwal berhasil dihapus');
      return true;
    } catch (error) {
      errorOnce('DELETE_SCHEDULE_ERROR', 'Gagal menghapus jadwal:', error.message);
      throw error;
    }
  }, [hookDeleteSchedule]);

  const toggleScheduleStatus = useCallback(async (scheduleId) => {
    try {
      const result = await hookToggleScheduleStatus(scheduleId);
      logOnce('SCHEDULE_TOGGLED', 'Status jadwal berhasil diubah:', result);
      return result;
    } catch (error) {
      errorOnce('TOGGLE_SCHEDULE_ERROR', 'Gagal mengubah status jadwal:', error.message);
      throw error;
    }
  }, [hookToggleScheduleStatus]);

  const fetchSchedules = useCallback(async () => {
    try {
      console.log('Dashboard - fetchSchedules called');
      await hookFetchSchedules();
      console.log('Dashboard - fetchSchedules completed');
    } catch (error) {
      console.error('Dashboard - fetchSchedules error:', error);
      errorOnce('FETCH_SCHEDULES_ERROR', 'Failed to fetch schedules:', error.message);
    }
  }, [hookFetchSchedules]);

  // Data verification hooks
  const {
    isConsistent,
    inconsistencies,
    resolveInconsistency
  } = useDataConsistencyVerification({
    localData: localSensorData,
    serverData: sensorData,
    refreshFunction: fetchLatestSensorData,
    verificationInterval: 15000,
    onInconsistencyDetected: (data) => {
      console.warn('Data inconsistency detected:', data.inconsistencies);
      setTimeout(resolveInconsistency, 500);
    }
  });

  // Helper functions
  const verifyDeviceData = useCallback((data) => {
    if (!data) return false;

    const hasRequiredFields = (
      typeof data.voltage === 'number' &&
      typeof data.current === 'number' &&
      typeof data.power === 'number' &&
      data.timestamp
    );

    const hasPlausibleValues = (
      data.voltage >= 0 && data.voltage < 250 &&
      data.current >= 0 && data.current < 15 &&
      data.power >= 0 && data.power < 3000
    );

    return hasRequiredFields && hasPlausibleValues;
  }, []);

  // Device status checker
  const checkDeviceStatus = useCallback(() => {
    const now = new Date();
    const lastDataTime = lastUpdate ? new Date(lastUpdate) : null;
    const dataAge = lastDataTime ? now - lastDataTime : Infinity;
    const hasRecentData = lastDataTime && dataAge < DEVICE_INACTIVE_TIMEOUT;

    const mainDeviceName = 'ESP32-PUMP-01';
    const deviceInfo = deviceStatus[mainDeviceName];
    const mainDeviceDbStatus = deviceInfo?.database_status || 'nonaktif';
    const isActiveInDatabase = mainDeviceDbStatus === 'aktif';
    const hasActiveWebSocketConn = isConnected && reconnectAttemptsRef.current === 0;

    // Update device connection status
    if (hasRecentData && isActiveInDatabase && verifyDeviceData(sensorData)) {
      deviceDataRef.current.lastValidReading = now;
      deviceDataRef.current.consecutiveFailures = 0;
      setLastDataReceived(now);

      setDeviceConnectionInfo(prev => ({
        ...prev,
        deviceOnline: true,
        dbStatus: mainDeviceDbStatus,
        lastPing: now,
        pingAttempts: 0,
        dataFresh: true,
        lastValidData: sensorData,
        lastDataTimestamp: lastDataTime,
        dataFreshness: dataAge
      }));
    } else {
      deviceDataRef.current.consecutiveFailures++;
      setDeviceConnectionInfo(prev => ({
        ...prev,
        deviceOnline: false,
        dbStatus: mainDeviceDbStatus,
        dataFresh: hasRecentData,
        pingAttempts: prev.pingAttempts + 1,
        dataFreshness: dataAge
      }));
    }

    // Update server connection status
    setDeviceConnectionInfo(prev => ({
      ...prev,
      serverConnected: isConnected
    }));
  }, [devices, isConnected, sensorData, lastUpdate, deviceStatus, verifyDeviceData]);

  // Error message computation - updated to include offline state
  const error = isOffline
    ? "Operating in offline mode. Please check your internet connection."
    : !deviceConnectionInfo.serverConnected
      ? "Tidak dapat terhubung ke server. Periksa koneksi internet atau server."
      : !deviceConnectionInfo.deviceOnline
        ? deviceDataRef.current.consecutiveFailures > 10
          ? "Perangkat ESP32 tidak merespon dalam waktu yang lama. Periksa perangkat fisik."
          : "Server terhubung, namun perangkat ESP32 tidak mengirimkan data terbaru."
        : null;

  // Electrical data derived from sensor data - updated to use offline cache
  const electricalData = useMemo(() => {
    // Log raw incoming data for debugging
    logOnce('SENSOR_DATA_RAW', 'Raw sensor data received:', sensorData);

    // First check if the device is really online based on data freshness
    const now = new Date();
    const lastDataTime = lastUpdate ? new Date(lastUpdate) : null;
    const dataAge = lastDataTime ? now - lastDataTime : Infinity;
    const isDataFresh = dataAge < DEVICE_INACTIVE_TIMEOUT;

    // Only show data if the device is online according to the server AND we have fresh data
    const deviceIsOnline =
      (isConnected || isOffline) && // Consider device online if we're in offline mode
      deviceConnectionInfo.deviceOnline &&
      (isDataFresh || isOffline); // Consider data fresh if we're in offline mode

    // Log connection status for debugging
    logOnce('DEVICE_CONNECTIVITY', 'Device connectivity status:', {
      isConnected,
      isOffline,
      deviceOnline: deviceConnectionInfo.deviceOnline,
      dataFresh: isDataFresh,
      dataAge: dataAge ? Math.round(dataAge / 1000) + 's' : 'unknown'
    });

    if (deviceIsOnline && sensorData) {
      // Handle both data formats - nested data or direct properties
      const data = {
        voltage: sensorData?.data?.voltage || sensorData?.voltage || 0,
        current: sensorData?.data?.current || sensorData?.current || 0,
        power: sensorData?.data?.power || sensorData?.power || 0,
        energy: sensorData?.data?.energy || sensorData?.energy || 0,
        pir_status: sensorData?.data?.pir_status ?? sensorData?.pir_status ?? false,
        pump_status: sensorData?.data?.pump_status ?? sensorData?.pump_status ?? false,
        isOfflineData: isOffline
      };

      // Log processed data for verification
      logOnce('DEVICE_ONLINE_DATA', 'Device is online with electrical data:', data);
      return data;
    }

    if (!deviceIsOnline && deviceConnectionInfo.lastValidData) {
      logOnce('DEVICE_STALE_DATA', 'Using stale data as device appears offline');
      const data = {
        voltage: deviceConnectionInfo.lastValidData.data?.voltage || deviceConnectionInfo.lastValidData.voltage || 0,
        current: deviceConnectionInfo.lastValidData.data?.current || deviceConnectionInfo.lastValidData.current || 0,
        power: deviceConnectionInfo.lastValidData.data?.power || deviceConnectionInfo.lastValidData.power || 0,
        energy: deviceConnectionInfo.lastValidData.data?.energy || deviceConnectionInfo.lastValidData.energy || 0,
        pir_status: deviceConnectionInfo.lastValidData.data?.pir_status || deviceConnectionInfo.lastValidData.pir_status || false,
        pump_status: deviceConnectionInfo.lastValidData.data?.pump_status || deviceConnectionInfo.lastValidData.pump_status || false,
        isStale: true
      };

      logOnce('DEVICE_LAST_VALID_DATA', 'Using last valid data (stale):', data);
      return data;
    }

    logOnce('DEVICE_OFFLINE', 'No valid data available, device is offline');
    return {
      voltage: 0,
      current: 0,
      power: 0,
      energy: 0,
      pir_status: false,
      pump_status: false,
      isStale: true,
      offline: true
    };
  }, [sensorData, deviceConnectionInfo, isConnected, isOffline, lastUpdate]);

  // Connection status object for UI components
  const connectionStatus = useMemo(() => {
    const now = new Date();
    const lastDataTime = lastUpdate ? new Date(lastUpdate) : null;
    const dataAge = lastDataTime ? now - lastDataTime : Infinity;
    const dataAgeSecs = dataAge ? Math.round(dataAge / 1000) : null;

    // Get device database status 
    const mainDeviceName = 'ESP32-PUMP-01';
    const deviceInfo = deviceStatus[mainDeviceName];
    const mainDeviceDbStatus = deviceInfo?.database_status || 'nonaktif';
    const isActiveInDatabase = mainDeviceDbStatus === 'aktif';

    // Calculate connection quality metrics
    const wsQuality = isConnected ? (reconnectAttemptsRef.current === 0 ? 100 : Math.max(0, 100 - reconnectAttemptsRef.current * 20)) : 0;
    const dataQuality = deviceDataRef.current.dataConsistencyScore;
    const freshnessQuality = dataAgeSecs !== null ?
      (dataAgeSecs < 5 ? 100 : dataAgeSecs < 15 ? 80 : dataAgeSecs < 30 ? 60 : dataAgeSecs < 60 ? 40 : 20) : 0;

    const connectionHealthScore = (wsQuality * 0.3) + (dataQuality * 0.4) + (freshnessQuality * 0.3);
    let qualityLevel;

    if (connectionHealthScore >= 90) qualityLevel = 'excellent';
    else if (connectionHealthScore >= 70) qualityLevel = 'good';
    else if (connectionHealthScore >= 50) qualityLevel = 'fair';
    else if (connectionHealthScore >= 30) qualityLevel = 'poor';
    else qualityLevel = 'critical';

    // Determine if the device is truly online
    const hasRecentData = lastDataTime && dataAge < DEVICE_INACTIVE_TIMEOUT;
    const isDeviceReallyOnline = hasRecentData && isActiveInDatabase && connectionHealthScore > 50;

    return {
      isConnected,
      isDeviceOnline: isDeviceReallyOnline,
      lastUpdate,
      dataAge: dataAgeSecs,
      deviceName: deviceConnectionInfo.deviceName,
      dbStatus: mainDeviceDbStatus,
      reconnectAttempts: connectionAttempts,
      connectionQuality: Math.round(connectionHealthScore),
      qualityLevel,
      metrics: { wsQuality, dataQuality, freshnessQuality, dataAgeSecs }
    };
  }, [isConnected, deviceConnectionInfo, lastUpdate, connectionAttempts, deviceStatus, deviceOnlineStatus]);

  // Real-time data handler
  const handleRealTimeDataUpdate = useCallback((data) => {
    if (!data) return;

    // Log all incoming real-time data for debugging
    logOnce('REALTIME_DATA_UPDATE', 'Real-time electrical data update:', {
      voltage: data.voltage || 0,
      current: data.current || 0,
      power: data.power || 0,
      energy: data.energy || 0,
      pir_status: !!data.pir_status,
      pump_status: !!data.pump_status,
      timestamp: new Date().toISOString()
    });

    const isValidData = verifyDeviceData(data);
    if (isValidData) {
      setLocalSensorData(data);
      setLocalLastUpdate(new Date().toISOString());
      setLastDataReceived(new Date());
      deviceDataRef.current.consecutiveFailures = 0;
      deviceDataRef.current.lastValidReading = new Date();

      if (deviceDataRef.current.dataConsistencyScore < 100) {
        deviceDataRef.current.dataConsistencyScore += 5;
      }

      setDeviceConnectionInfo(prev => ({
        ...prev,
        deviceOnline: true,
        dataFresh: true,
        lastValidData: data,
        lastDataTimestamp: new Date(),
        dataFreshness: 0,
        connectionQuality: deviceDataRef.current.dataConsistencyScore
      }));
    } else {
      deviceDataRef.current.consecutiveFailures++;
      deviceDataRef.current.dataConsistencyScore = Math.max(0, deviceDataRef.current.dataConsistencyScore - 10);

      setDeviceConnectionInfo(prev => ({
        ...prev,
        connectionQuality: deviceDataRef.current.dataConsistencyScore,
        dataQualityIssues: (deviceDataRef.current.consecutiveFailures > 2)
      }));

      if (deviceDataRef.current.consecutiveFailures % 3 === 0) {
        safeFetchLatestSensorData();
      }
    }
  }, [verifyDeviceData, safeFetchLatestSensorData]);



  // Add a data monitoring function for consistent event logging
  const monitorDataUpdates = (data, source) => {
    if (!data) return;

    console.group(`%c${source} - Data Update ${new Date().toLocaleTimeString()}`, 'background: #34495e; color: white; padding: 3px 5px; border-radius: 3px;');

    console.log('Raw data:', data);

    // Log electrical values in a formatted table
    if (data.voltage !== undefined || data.current !== undefined) {
      console.table({
        voltage: typeof data.voltage === 'number' ? data.voltage.toFixed(2) + 'V' : data.voltage,
        current: typeof data.current === 'number' ? data.current.toFixed(3) + 'A' : data.current,
        power: typeof data.power === 'number' ? data.power.toFixed(2) + 'W' : data.power,
        energy: typeof data.energy === 'number' ? data.energy.toFixed(3) + 'kWh' : data.energy,
      });
    }

    // Log sensor states with visual indicators
    if (data.pir_status !== undefined || data.pump_status !== undefined) {
      console.log(
        'Sensors:',
        data.pir_status ? '%c⚠️ MOTION DETECTED' : '%c No Motion',
        data.pir_status ? 'color: red; font-weight: bold' : 'color: gray',
        ' | ',
        data.pump_status ? '%c💧 PUMP ON' : '%c Pump Off',
        data.pump_status ? 'color: blue; font-weight: bold' : 'color: gray'
      );
    }

    console.log('Timestamp:', data.timestamp || 'N/A');
    console.log('Device:', data.device_id || 'unknown');

    // Add connection status information
    if (isConnected !== undefined) {
      console.log('Connection status:', isConnected ? '🟢 Connected' : '🔴 Disconnected');
    }

    console.groupEnd();
  };

  // Add inside useEffect where data is being fetched
  useEffect(() => {
    if (sensorData) {
      // Use the monitor function to log data updates
      monitorDataUpdates(sensorData, 'Real-Time Sensor Data');
    }
  }, [sensorData]);

  // Setup device monitoring with real-time updates
  useEffect(() => {
    // Register the real-time data callback to update local data
    const cleanup = safeRegisterCallback(handleRealTimeDataUpdate);

    // Do an initial check on component mount
    checkDeviceStatus();

    // Periodic checks - only check status, not fetch all data (to reduce load)
    const statusInterval = setInterval(checkDeviceStatus, 10000);

    return () => {
      cleanup(); // Use the cleanup function returned from safeRegisterCallback
      clearInterval(statusInterval);
    };
    // Remove function references from dependencies to prevent loops
  }, [checkDeviceStatus, handleRealTimeDataUpdate, safeRegisterCallback]);
  // Fix initial data load effect
  useEffect(() => {
    // Only try to fetch data if we're online
    if (navigator.onLine) {
      const loadData = async () => {
        try {
          // Only call functions if they exist and log errors silently
          if (typeof fetchLatestSensorData === 'function') {
            fetchLatestSensorData().catch(() => { });
          }

          if (typeof fetchDeviceStatus === 'function') {
            fetchDeviceStatus().catch(() => { });
          }

          // Fetch schedules on initial load
          await fetchSchedules();
        } catch (err) {
          // Silent error handling
        }
      };

      loadData();
    }
  }, [fetchLatestSensorData, fetchDeviceStatus, fetchSchedules]); // Include dependencies

  // Replace sensor data polling with a properly controlled interval
  useEffect(() => {
    // Don't set up polling if we're offline
    if (isOffline || !navigator.onLine) return;

    // Keep track if the component is mounted
    let isMounted = true;

    const pollData = async () => {
      if (!isMounted) return;

      try {
        // Only call functions if they exist and handle errors silently
        if (typeof fetchLatestSensorData === 'function') {
          await fetchLatestSensorData().catch(() => { });
        }

        if (typeof fetchDeviceStatus === 'function') {
          await fetchDeviceStatus().catch(() => { });
        }
      } catch (err) {
        // Silent error handling
      }
    };

    // Initial poll
    pollData();

    // Set up interval for subsequent polls
    const refreshInterval = setInterval(pollData, 30000); // 30 seconds refresh

    // Clean up on unmount
    return () => {
      isMounted = false;
      clearInterval(refreshInterval);
    };
  }, [isOffline]); // Only re-run if offline status changes

  // Define connectionQuality based on connectionStatus
  const connectionQuality = {
    qualityLevel: connectionStatus.qualityLevel || 'unknown'
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-8">
      {/* Show offline banner when in offline mode */}
      {isOffline && (
        <OfflineModeBanner onRetryConnection={retryConnection} />
      )}

      {/* Header */}
      <div className="mb-8 bg-gradient-to-r from-blue-600 to-blue-800 shadow-lg overflow-hidden rounded-b-2xl">
        <div className="px-6 py-6">
          <div className="flex flex-wrap items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-bold text-white">ESP32 Monitoring</h2>
              <div className="bg-blue-500 bg-opacity-30 rounded-lg px-4 py-1.5 text-white text-sm hidden md:block">
                <span className="font-medium">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <RealtimeClock className="bg-blue-500 bg-opacity-30 text-white rounded-lg px-3 py-1.5 text-sm" />

              <div className="flex items-center bg-black bg-opacity-20 rounded-lg px-3 py-1.5">
                <ConnectionQualityIndicator
                  connectionStatus={connectionStatus}
                  showDetails={true}
                  className="mr-2"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 mt-4 lg:mt-0">
              {activeTab === "jadwal" && (
                <button
                  onClick={() => setShowAddScheduleModal(true)}
                  className="px-3 py-1.5 bg-green-500 bg-opacity-80 text-white text-sm font-medium rounded-md hover:bg-opacity-100 transition-colors flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Tambah Jadwal
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation - Only show perangkat and jadwal tabs */}
        <div className="flex border-t border-blue-500 border-opacity-30">
          {["esp32", "perangkat", "jadwal"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-4 text-center text-sm font-medium transition-colors ${activeTab === tab
                ? "text-white border-b-2 border-white"
                : "text-blue-100 hover:text-white"
                }`}
            >
              {tab === "esp32"
                ? "ESP32 Monitoring"
                : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Main content area - organized by tabs */}
      <div className="mx-auto px-4">
        {/* Device status display is always visible at the top */}
        <div className="mb-6">
          <DeviceStatusCard
            device={deviceStatus['ESP32-PUMP-01']}
            sensorData={sensorData}
            lastUpdate={lastUpdate}
            isConnected={isConnected}
          />
        </div>        {/* Tab contents */}
        {activeTab === "esp32" && (
          <ESP32Section
            isConnected={isConnected}
            sensorData={sensorData}
            devices={devices}
            lastUpdate={lastUpdate}
            sendCommand={sendCommand}
            electricalData={electricalData}
          />
        )}

        {activeTab === "perangkat" && (
          <PerangkatSection devices={devices} deviceStatus={deviceStatus} isConnected={isConnected} />
        )}        {activeTab === "jadwal" && (
          <JadwalSection
            schedules={hookSchedules}
            scheduleLoading={hookScheduleLoading}
            scheduleError={hookScheduleError}
            devices={devices}
            devicesLoading={dataLoading?.devices || false}
            onAddSchedule={tambahJadwal}
            onUpdateSchedule={updateJadwal}
            onDeleteSchedule={deleteJadwal}
            onToggleScheduleStatus={toggleScheduleStatus}
            onRefreshSchedules={fetchSchedules}
            onRefreshDevices={fetchDevices}
            showAddModal={showAddScheduleModal}
            setShowAddModal={setShowAddScheduleModal}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;