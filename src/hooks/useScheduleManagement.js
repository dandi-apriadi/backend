import { useState, useCallback, useEffect } from 'react';
import ScheduleService from '../services/scheduleService';

export const useScheduleManagement = () => {
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch all schedules
    const fetchSchedules = useCallback(async (filters = {}) => {
        try {
            setLoading(true);
            setError(null);

            console.log('useScheduleManagement - fetchSchedules called with filters:', filters);
            const data = await ScheduleService.getSchedules(filters);
            console.log('useScheduleManagement - fetchSchedules received data:', data?.length, 'schedules');
            setSchedules(data);

            return data;
        } catch (err) {
            const errorMessage = err.message || 'Failed to fetch schedules';
            setError(errorMessage);
            console.error('Error fetching schedules:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Create new schedule
    const createSchedule = useCallback(async (scheduleData) => {
        try {
            setLoading(true);
            setError(null);

            // Validate data first
            const validationErrors = ScheduleService.validateScheduleData(scheduleData);
            if (validationErrors.length > 0) {
                throw new Error(validationErrors.join(', '));
            }

            const newSchedule = await ScheduleService.createSchedule(scheduleData);

            // Update local state
            setSchedules(prev => [newSchedule, ...prev]);

            return newSchedule;
        } catch (err) {
            const errorMessage = err.message || 'Failed to create schedule';
            setError(errorMessage);
            console.error('Error creating schedule:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Update schedule
    const updateSchedule = useCallback(async (scheduleId, updateData) => {
        try {
            setLoading(true);
            setError(null);

            console.log('useScheduleManagement - updateSchedule called with:', { scheduleId, updateData });
            const updatedSchedule = await ScheduleService.updateSchedule(scheduleId, updateData);
            console.log('useScheduleManagement - updateSchedule result:', updatedSchedule);

            // Instead of updating local state immediately, let the refresh handle it
            // This prevents race conditions between local updates and fresh fetches
            console.log('useScheduleManagement - Schedule updated successfully, relying on refresh for state update');

            return updatedSchedule;
        } catch (err) {
            const errorMessage = err.message || 'Failed to update schedule';
            setError(errorMessage);
            console.error('Error updating schedule:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Delete schedule
    const deleteSchedule = useCallback(async (scheduleId) => {
        try {
            setLoading(true);
            setError(null);

            await ScheduleService.deleteSchedule(scheduleId);

            // Update local state
            setSchedules(prev => prev.filter(schedule => schedule.schedule_id !== scheduleId));

            return true;
        } catch (err) {
            const errorMessage = err.message || 'Failed to delete schedule';
            setError(errorMessage);
            console.error('Error deleting schedule:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Toggle schedule status
    const toggleScheduleStatus = useCallback(async (scheduleId) => {
        try {
            setLoading(true);
            setError(null);

            const updatedSchedule = await ScheduleService.toggleScheduleStatus(scheduleId);

            // Update local state
            setSchedules(prev => prev.map(schedule =>
                schedule.schedule_id === scheduleId ? updatedSchedule : schedule
            ));

            return updatedSchedule;
        } catch (err) {
            const errorMessage = err.message || 'Failed to toggle schedule status';
            setError(errorMessage);
            console.error('Error toggling schedule status:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Get schedule by ID
    const getScheduleById = useCallback(async (scheduleId) => {
        try {
            const schedule = await ScheduleService.getScheduleById(scheduleId);
            return schedule;
        } catch (err) {
            const errorMessage = err.message || 'Failed to fetch schedule';
            setError(errorMessage);
            console.error('Error fetching schedule by ID:', err);
            throw err;
        }
    }, []);

    // Get active schedules
    const getActiveSchedules = useCallback(async () => {
        try {
            const activeSchedules = await ScheduleService.getActiveSchedules();
            return activeSchedules;
        } catch (err) {
            const errorMessage = err.message || 'Failed to fetch active schedules';
            setError(errorMessage);
            console.error('Error fetching active schedules:', err);
            throw err;
        }
    }, []);

    // Get today's schedules
    const getTodaySchedules = useCallback(async () => {
        try {
            const todaySchedules = await ScheduleService.getTodaySchedules();
            return todaySchedules;
        } catch (err) {
            const errorMessage = err.message || 'Failed to fetch today schedules';
            setError(errorMessage);
            console.error('Error fetching today schedules:', err);
            throw err;
        }
    }, []);

    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // Reset schedules
    const resetSchedules = useCallback(() => {
        setSchedules([]);
        setError(null);
    }, []);

    // Filter schedules locally
    const filterSchedules = useCallback((filters) => {
        return schedules.filter(schedule => {
            // Device filter
            if (filters.deviceId && filters.deviceId !== 'all') {
                if (schedule.device_id !== parseInt(filters.deviceId)) {
                    return false;
                }
            }

            // Status filter
            if (filters.status && filters.status !== 'all') {
                if (filters.status === 'active' && !schedule.is_active) {
                    return false;
                }
                if (filters.status === 'inactive' && schedule.is_active) {
                    return false;
                }
            }

            // Time filter
            if (filters.timeFilter && filters.timeFilter !== 'all') {
                const today = new Date().toISOString().split('T')[0];

                if (filters.timeFilter === 'today') {
                    // For recurring schedules, they're always considered "today" if active
                    // For one-time schedules, check if scheduled for today
                    if (schedule.schedule_type === 'one-time') {
                        // Assuming start_time includes date for one-time schedules
                        if (!schedule.start_time?.includes(today)) {
                            return false;
                        }
                    }
                } else if (filters.timeFilter === 'week') {
                    // Add week filtering logic if needed
                }
            }

            return true;
        });
    }, [schedules]);

    // Format schedules for display
    const getFormattedSchedules = useCallback(() => {
        return schedules.map(schedule => ScheduleService.formatScheduleForDisplay(schedule));
    }, [schedules]);

    // Auto-fetch schedules on first load
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                console.log('useScheduleManagement - Auto-fetching schedules on mount...');
                await fetchSchedules();
            } catch (error) {
                console.error('useScheduleManagement - Error auto-fetching schedules:', error);
            }
        }; loadInitialData();
    }, [fetchSchedules]); // Add fetchSchedules as dependency

    return {
        // State
        schedules,
        loading,
        error,

        // Actions
        fetchSchedules,
        createSchedule,
        updateSchedule,
        deleteSchedule,
        toggleScheduleStatus,
        getScheduleById,
        getActiveSchedules,
        getTodaySchedules,

        // Utilities
        clearError,
        resetSchedules,
        filterSchedules,
        getFormattedSchedules,

        // Computed
        scheduleCount: schedules.length,
        activeScheduleCount: schedules.filter(s => s.is_active).length,
        inactiveScheduleCount: schedules.filter(s => !s.is_active).length,
    };
};
