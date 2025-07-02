import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import JadwalSection from "../../../components/dashboard/JadwalSection";

const DEVICE_ID = "ESP32-PUMP-01";
const API_BASE = process.env.REACT_APP_API_BASE_URL;

const SprayingControl = () => {
    const [pumpStatus, setPumpStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [statusTransition, setStatusTransition] = useState(false);
    
    // Schedule management states (aligned with JadwalSection)
    const [schedules, setSchedules] = useState([]);
    const [scheduleLoading, setScheduleLoading] = useState(false);
    const [scheduleError, setScheduleError] = useState(null);
    const [devices, setDevices] = useState([]);
    const [devicesLoading, setDevicesLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);

    // Refs untuk prevent multiple calls
    const intervalRef = useRef(null);
    const isMountedRef = useRef(true);
    const previousPumpStatusRef = useRef(null);
    const hasInitialLoadRef = useRef(false);
    const devicesRef = useRef([]);
    const devicesLoadingRef = useRef(false);
    const scheduleLoadingRef = useRef(false);

    // Memoized functions untuk prevent re-render loops
    const fetchPumpStatus = useCallback(async () => {
        if (!isMountedRef.current) return;
        
        try {
            // ✅ Hanya pump status yang di-poll setiap 2 detik - ini NORMAL
            const res = await axios.get(`${API_BASE}/api/esp32/data`, {
                params: { 
                    device_id: DEVICE_ID,
                    _t: Date.now()
                }
            });
            
            if (!isMountedRef.current) return;
            
            // console.log("Pump status response:", res.data); // Reduced logging
            
            const newPumpStatus = res.data?.data?.pump_status;
            const previousStatus = previousPumpStatusRef.current;
            
            // Check for status change using ref
            if (previousStatus !== null && previousStatus !== newPumpStatus) {
                console.log(`⚡ Pump status changed from ${previousStatus} to ${newPumpStatus}`);
                setStatusTransition(true);
                setTimeout(() => {
                    if (isMountedRef.current) {
                        setStatusTransition(false);
                    }
                }, 1000);
            }
            
            // Update refs and state
            if (res.data?.data?.pump_status !== undefined) {
                previousPumpStatusRef.current = newPumpStatus;
                setPumpStatus(newPumpStatus);
            }
        } catch (err) {
            if (isMountedRef.current) {
                console.error("Error fetching pump status:", err);
            }
        }
    }, []); // Empty dependency - we use refs for current values

    const fetchSchedules = useCallback(async () => {
        if (!isMountedRef.current) return;
        
        // Use ref to prevent concurrent calls
        if (scheduleLoadingRef.current) return;
        
        // Only fetch if not already loaded
        if (hasInitialLoadRef.current) {
            console.log("📅 Schedules already loaded, skipping fetch");
            return;
        }
        
        scheduleLoadingRef.current = true;
        setScheduleLoading(true);
        setScheduleError(null);
        
        try {
            console.log("📅 Fetching schedules - INITIAL LOAD ONLY");
            const res = await axios.get(`${API_BASE}/api/schedules`);
            
            if (isMountedRef.current) {
                const scheduleData = Array.isArray(res.data?.data) ? res.data.data : [];
                console.log(`✅ Fetched ${scheduleData.length} schedules - INITIAL LOAD COMPLETE`);
                setSchedules(scheduleData);
                hasInitialLoadRef.current = true;
            }
        } catch (err) {
            if (isMountedRef.current) {
                console.error("Error fetching schedules:", err);
                setScheduleError("Gagal memuat jadwal");
                setSchedules([]);
            }
        } finally {
            scheduleLoadingRef.current = false;
            if (isMountedRef.current) {
                setScheduleLoading(false);
            }
        }
    }, []); // ✅ EMPTY dependency array

    // Force refresh schedules - dapat dipanggil kapan saja
    const refreshSchedules = useCallback(async () => {
        if (!isMountedRef.current) return;
        
        // Allow refresh even if already loaded
        scheduleLoadingRef.current = true;
        setScheduleLoading(true);
        setScheduleError(null);
        
        try {
            console.log("🔄 Force refreshing schedules...");
            const res = await axios.get(`${API_BASE}/api/schedules`);
            
            if (isMountedRef.current) {
                const scheduleData = Array.isArray(res.data?.data) ? res.data.data : [];
                console.log(`✅ Refreshed ${scheduleData.length} schedules`);
                setSchedules(scheduleData);
            }
        } catch (err) {
            if (isMountedRef.current) {
                console.error("Error refreshing schedules:", err);
                setScheduleError("Gagal memuat jadwal");
            }
        } finally {
            scheduleLoadingRef.current = false;
            if (isMountedRef.current) {
                setScheduleLoading(false);
            }
        }
    }, []); // ✅ EMPTY dependency array

    const fetchDevices = useCallback(async (force = false) => {
        if (!isMountedRef.current) return;

        // Use ref instead of state to prevent concurrent calls
        if (devicesLoadingRef.current) return;
        
        // Only fetch if forced or not yet loaded
        if (!force && devicesRef.current.length > 0) {
            console.log("Devices already loaded, skipping fetch");
            return;
        }
        
        devicesLoadingRef.current = true;
        setDevicesLoading(true);
        try {
            console.log("🔧 Fetching devices - INITIAL LOAD ONLY");
            const res = await axios.get(`${API_BASE}/api/dashboard/devices`);
            if (isMountedRef.current) {
                const deviceData = res.data?.data || [];
                console.log(`✅ Fetched ${deviceData.length} devices - INITIAL LOAD COMPLETE`);
                setDevices(deviceData);
                devicesRef.current = deviceData;
            }
        } catch (err) {
            if (isMountedRef.current) {
                console.error("Error fetching devices:", err);
                setDevices([]);
                devicesRef.current = [];
            }
        } finally {
            devicesLoadingRef.current = false;
            if (isMountedRef.current) {
                setDevicesLoading(false);
            }
        }
    }, []); // ✅ EMPTY dependency array to prevent re-creation

    // Component lifecycle effects
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        isMountedRef.current = true;
        devicesRef.current = [];
        devicesLoadingRef.current = false;
        scheduleLoadingRef.current = false;
        
        // Initial fetch - hanya sekali saat mount
        console.log("🚀 Component mounted - Initial data fetch");
        fetchPumpStatus();
        fetchSchedules();
        fetchDevices();
        
        // Set up polling interval HANYA untuk pump status
        intervalRef.current = setInterval(() => {
            if (isMountedRef.current) {
                fetchPumpStatus(); // Hanya pump status yang di-poll
            }
        }, 2000);
        
        // Cleanup on unmount
        return () => {
            console.log("🔄 Component unmounting - cleaning up");
            isMountedRef.current = false;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, []); // Intentionally empty - we want this to run only once

    // Schedule management functions (aligned with JadwalSection)
    const handleAddSchedule = async (scheduleData) => {
        try {
            const response = await axios.post(`${API_BASE}/api/schedules`, scheduleData);
            
            // ✅ HANYA optimistic update - TIDAK ADA refetch
            if (response.data?.data) {
                setSchedules(prev => [...prev, response.data.data]);
                console.log("✅ Schedule added successfully with optimistic update");
            } else {
                // ❌ HAPUS fallback refetch yang menyebabkan request berlebihan
                console.warn("⚠️ No data returned from add schedule API");
            }
            
            return { success: true };
        } catch (err) {
            console.error("Error adding schedule:", err);
            throw new Error(err.response?.data?.message || "Gagal menambah jadwal");
        }
    };

    const handleUpdateSchedule = async (scheduleId, updateData) => {
        try {
            console.log("🔧 handleUpdateSchedule called with:", {
                scheduleId,
                scheduleIdType: typeof scheduleId,
                updateData,
                currentSchedulesCount: schedules.length
            });

            const response = await axios.put(`${API_BASE}/api/schedules/${scheduleId}`, updateData);
            
            console.log("📡 API Response:", response.data);
            
            // ✅ HANYA optimistic update - TIDAK ADA refetch
            if (response.data?.data) {
                const updatedSchedule = response.data.data;
                setSchedules(prev => {
                    console.log("🔍 Looking for schedule with ID:", scheduleId, "Type:", typeof scheduleId);
                    console.log("📋 Current schedules:", prev.map(s => ({ id: s.schedule_id, idType: typeof s.schedule_id, title: s.title })));
                    
                    const newSchedules = prev.map(schedule => {
                        // Handle both string and number comparison
                        const isMatch = schedule.schedule_id == scheduleId || 
                                       schedule.schedule_id === parseInt(scheduleId) || 
                                       schedule.schedule_id === scheduleId.toString();
                        
                        if (isMatch) {
                            console.log("✅ Found matching schedule to update:", {
                                oldSchedule: { id: schedule.schedule_id, title: schedule.title, active: schedule.is_active },
                                newSchedule: { id: updatedSchedule.schedule_id, title: updatedSchedule.title, active: updatedSchedule.is_active }
                            });
                            return updatedSchedule;
                        }
                        return schedule;
                    });
                    
                    console.log("📊 Schedule updated optimistically:", {
                        scheduleId,
                        oldCount: prev.length,
                        newCount: newSchedules.length,
                        updatedSchedule: {
                            id: updatedSchedule.schedule_id,
                            title: updatedSchedule.title,
                            is_active: updatedSchedule.is_active,
                            start_time: updatedSchedule.start_time
                        }
                    });
                    console.log("🔄 Before update - schedules:", prev.map(s => ({ id: s.schedule_id, title: s.title, active: s.is_active })));
                    console.log("🔄 After update - schedules:", newSchedules.map(s => ({ id: s.schedule_id, title: s.title, active: s.is_active })));
                    return newSchedules;
                });
                console.log("✅ Schedule updated successfully with optimistic update");
            } else {
                // ❌ HAPUS fallback refetch yang menyebabkan request berlebihan
                console.warn("⚠️ No data returned from update schedule API");
                // Fallback: manual update jika response tidak ada data
                setSchedules(prev => prev.map(schedule => 
                    schedule.schedule_id == scheduleId ? { ...schedule, ...updateData } : schedule
                ));
                console.log("🔄 Applied fallback manual update");
            }
            
            return { success: true };
        } catch (err) {
            console.error("❌ Error updating schedule:", err);
            
            // Jika optimistic update gagal, refresh data
            console.log("🔄 Optimistic update failed, refreshing schedules...");
            try {
                const res = await axios.get(`${API_BASE}/api/schedules`);
                if (res.data?.data) {
                    setSchedules(res.data.data);
                    console.log("✅ Schedules refreshed after failed update");
                }
            } catch (refreshErr) {
                console.error("❌ Failed to refresh schedules:", refreshErr);
            }
            
            throw new Error(err.response?.data?.message || "Gagal mengupdate jadwal");
        }
    };

    const handleDeleteSchedule = async (scheduleId) => {
        try {
            await axios.delete(`${API_BASE}/api/schedules/${scheduleId}`);
            
            // Optimistically update local state
            setSchedules(prev => prev.filter(schedule => schedule.schedule_id !== scheduleId));
            
            return { success: true };
        } catch (err) {
            console.error("Error deleting schedule:", err);
            throw new Error(err.response?.data?.message || "Gagal menghapus jadwal");
        }
    };

    const handleToggleScheduleStatus = async (scheduleId) => {
        try {
            const schedule = schedules.find(s => s.schedule_id === scheduleId);
            if (!schedule) throw new Error("Jadwal tidak ditemukan");

            const response = await axios.put(`${API_BASE}/api/schedules/${scheduleId}`, {
                ...schedule,
                is_active: !schedule.is_active
            });
            
            // Optimistically update local state
            if (response.data?.data) {
                setSchedules(prev => prev.map(s => 
                    s.schedule_id === scheduleId ? response.data.data : s
                ));
            } else {
                // Fallback: update just the is_active field
                setSchedules(prev => prev.map(s => 
                    s.schedule_id === scheduleId ? { ...s, is_active: !s.is_active } : s
                ));
            }
            
            return { success: true };
        } catch (err) {
            console.error("Error toggling schedule status:", err);
            throw new Error(err.response?.data?.message || "Gagal mengubah status jadwal");
        }
    };
    
    // Check if device is online
    const checkDeviceStatus = async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/esp32/device-status/${DEVICE_ID}`);
            const isOnline = res.data?.online === true;
            
            // Store last seen info if available
            const lastSeen = res.data?.last_seen;
            
            // If device is offline but we have recent data, consider the device "semi-connected"
            if (!isOnline && lastSeen && typeof lastSeen === 'string' && lastSeen.includes('minute')) {
                // Device was seen recently, might just be a temporary WebSocket disconnection
                // Return true to allow commands to flow through - they might still work
                console.log(`Device appears offline but was seen ${lastSeen}. Will attempt to send commands anyway.`);
                return true;
            }
            
            return isOnline;
        } catch (err) {
            console.error("Error checking device status:", err);
            return false;
        }
    };

    const handlePumpControl = async (command) => { // command can be 'on' or 'off'
        setLoading(true);
        setError("");
        try {
            // Check if device is online first
            const isOnline = await checkDeviceStatus();
            
            if (!isOnline) {
                throw new Error("Perangkat ESP32 mungkin tidak terhubung. Mencoba mengirim perintah...");
            }
            
            // Use the unified command endpoint
            const endpoint = `${API_BASE}/api/pump/command/${DEVICE_ID}`;
            const payload = { command: command }; // 'on' or 'off'
                
            const response = await axios.post(endpoint, payload);
            
            if (response.data?.status === "success") {
                // Immediately update UI with the expected state
                const newStatus = command === 'on';
                previousPumpStatusRef.current = newStatus;
                setPumpStatus(newStatus);
                
                // Brief pulse animation on status dot only
                setStatusTransition(true);
                setTimeout(() => setStatusTransition(false), 1000);
                
                // ✅ TIDAK ADA additional fetch - polling interval akan handle update
                console.log(`✅ Pump command ${command} sent successfully`);
            } else {
                setError("Gagal mengirim perintah ke pompa.");
            }
        } catch (err) {
            // Special handling for displayed errors
            if (err.message.includes("Perangkat ESP32 mungkin tidak terhubung")) {
                // Try sending the command directly anyway - might work if WebSocket reconnects
                try {
                    const endpoint = `${API_BASE}/api/pump/command/${DEVICE_ID}`;
                    const payload = { command: command };
                    const response = await axios.post(endpoint, payload);
                
                    if (response.data?.status === "success") {
                        // It worked despite the device status check failing!
                        const newStatus = command === 'on';
                        previousPumpStatusRef.current = newStatus;
                        setPumpStatus(newStatus);
                        setStatusTransition(true);
                        setTimeout(() => setStatusTransition(false), 1000);
                        
                        // ✅ TIDAK ADA additional fetch - polling akan handle
                        console.log(`✅ Pump command ${command} succeeded despite initial check`);
                        
                        // Clear the error since command succeeded
                        setError("");
                    } else {
                        setError("Perangkat tampak offline. Perintah mungkin tidak berhasil.");
                    }
                } catch (secondErr) {
                    setError("Perangkat ESP32 tidak terhubung. Silakan periksa koneksi perangkat.");
                }
            } else if (err.response?.data?.message) {
                setError(`Error: ${err.response.data.message}`);
            } else if (err.message) {
                setError(err.message);
            } else {
                setError("Gagal mengirim perintah ke pompa. Periksa koneksi perangkat.");
            }
            
            if (err.response) {
                console.error("Error response:", err.response.data);
            } else {
                console.error("Error message:", err.message);
            }
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="mb-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                    </svg>
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">
                                        Sistem Kontrol Penyemprotan
                                    </h1>
                                    <p className="text-gray-600 text-sm">Kelola dan pantau sistem penyemprotan otomatis</p>
                                </div>
                            </div>
                            <div className="hidden lg:flex items-center space-x-2 text-sm text-gray-500">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span>Real-time monitoring</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Control Panel */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
                    {/* Status Overview Card */}
                    <div className="xl:col-span-1">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Status Perangkat</h3>
                                <div className={`w-3 h-3 rounded-full ${pumpStatus ? 'bg-green-500' : 'bg-red-500'} ${statusTransition ? 'animate-pulse' : ''}`}></div>
                            </div>
                            
                            {/* Status Indicator */}
                            <div className="flex flex-col items-center mb-6">
                                <div className={`relative w-24 h-24 rounded-full flex items-center justify-center mb-3 transition-all duration-300
                                    ${pumpStatus 
                                        ? 'bg-green-500 shadow-lg shadow-green-500/25' 
                                        : 'bg-red-500 shadow-lg shadow-red-500/25'
                                    }`}>
                                    {pumpStatus ? (
                                        <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                        </svg>
                                    ) : (
                                        <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
                                        </svg>
                                    )}
                                </div>
                                
                                <h4 className={`text-xl font-semibold ${pumpStatus ? 'text-green-600' : 'text-red-600'}`}>
                                    {pumpStatus ? "SISTEM AKTIF" : "SISTEM NONAKTIF"}
                                </h4>
                                <p className="text-gray-500 text-center text-sm mt-1">
                                    {pumpStatus ? "Pompa beroperasi dalam mode manual" : "Pompa dalam keadaan standby"}
                                </p>
                            </div>

                            {/* Device Info */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="text-gray-600 font-medium text-sm">Device ID</span>
                                    <span className="text-gray-800 font-mono text-xs">{DEVICE_ID}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="text-gray-600 font-medium text-sm">Connection</span>
                                    <span className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <span className="text-green-600 font-medium text-sm">Online</span>
                                    </span>
                                </div>
                            </div>

                            {/* Error Display */}
                            {error && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <div className="flex items-start space-x-2">
                                        <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        <div>
                                            <h5 className="text-red-800 font-medium text-sm">Peringatan Sistem</h5>
                                            <p className="text-red-700 text-xs mt-1">{error}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Control Panel */}
                    <div className="xl:col-span-2">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Kontrol Manual</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                                {/* ON Button */}
                                <button
                                    className={`rounded-lg p-6 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500/20 ${
                                        loading || pumpStatus === true 
                                            ? 'bg-gray-100 cursor-not-allowed' 
                                            : 'bg-green-500 hover:bg-green-600 shadow-md hover:shadow-lg'
                                    }`}
                                    onClick={() => handlePumpControl("on")}
                                    disabled={loading || pumpStatus === true}
                                >
                                    <div className="flex flex-col items-center justify-center space-y-3">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                            loading || pumpStatus === true 
                                                ? 'bg-gray-200' 
                                                : 'bg-white/20'
                                        }`}>
                                            {loading ? (
                                                <svg className="w-6 h-6 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                            ) : (
                                                <svg className={`w-6 h-6 ${loading || pumpStatus === true ? 'text-gray-400' : 'text-white'}`} fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M8 5v14l11-7z"/>
                                                </svg>
                                            )}
                                        </div>
                                        <div className="text-center">
                                            <h4 className={`text-lg font-semibold ${loading || pumpStatus === true ? 'text-gray-400' : 'text-white'}`}>
                                                NYALAKAN
                                            </h4>
                                            <p className={`text-sm ${loading || pumpStatus === true ? 'text-gray-400' : 'text-white/80'}`}>
                                                {pumpStatus === true ? 'Sudah Aktif' : 'Aktifkan Pompa'}
                                            </p>
                                        </div>
                                    </div>
                                </button>

                                {/* OFF Button */}
                                <button
                                    className={`rounded-lg p-6 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 ${
                                        loading || pumpStatus === false 
                                            ? 'bg-gray-100 cursor-not-allowed' 
                                            : 'bg-red-500 hover:bg-red-600 shadow-md hover:shadow-lg'
                                    }`}
                                    onClick={() => handlePumpControl("off")}
                                    disabled={loading || pumpStatus === false}
                                >
                                    <div className="flex flex-col items-center justify-center space-y-3">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                            loading || pumpStatus === false 
                                                ? 'bg-gray-200' 
                                                : 'bg-white/20'
                                        }`}>
                                            {loading ? (
                                                <svg className="w-6 h-6 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                            ) : (
                                                <svg className={`w-6 h-6 ${loading || pumpStatus === false ? 'text-gray-400' : 'text-white'}`} fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M6 6h12v12H6z"/>
                                                </svg>
                                            )}
                                        </div>
                                        <div className="text-center">
                                            <h4 className={`text-lg font-semibold ${loading || pumpStatus === false ? 'text-gray-400' : 'text-white'}`}>
                                                MATIKAN
                                            </h4>
                                            <p className={`text-sm ${loading || pumpStatus === false ? 'text-gray-400' : 'text-white/80'}`}>
                                                {pumpStatus === false ? 'Sudah Nonaktif' : 'Matikan Pompa'}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Schedule Management Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-blue-600 p-6">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Jadwal Penyemprotan</h3>
                                <p className="text-blue-100 text-sm">Kelola jadwal otomatis untuk sistem penyemprotan</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-6">
                        <JadwalSection
                            schedules={schedules}
                            scheduleLoading={scheduleLoading}
                            scheduleError={scheduleError}
                            devices={devices}
                            devicesLoading={devicesLoading}
                            onAddSchedule={handleAddSchedule}
                            onUpdateSchedule={handleUpdateSchedule}
                            onDeleteSchedule={handleDeleteSchedule}
                            onToggleScheduleStatus={handleToggleScheduleStatus}
                            onRefreshSchedules={refreshSchedules}
                            showAddModal={showAddModal}
                            setShowAddModal={setShowAddModal}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SprayingControl;
