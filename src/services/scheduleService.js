// Schedule Service
// Service untuk mengelola operasi jadwal (CRUD)

const API_BASE_URL = process.env.REACT_APP_API_URL;

class ScheduleService {
    // Get all schedules
    static async getSchedules(filters = {}) {
        try {
            const queryParams = new URLSearchParams();

            if (filters.device_id) queryParams.append('device_id', filters.device_id);
            if (filters.is_active !== undefined) queryParams.append('is_active', filters.is_active);

            const url = `${API_BASE_URL}/schedules${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            } const result = await response.json();

            console.log('ScheduleService.getSchedules - Response:', result);
            console.log('ScheduleService.getSchedules - Data:', result.data);

            if (result.status === 'success') {
                const schedules = result.data || [];
                console.log('ScheduleService.getSchedules - Returning schedules:', schedules.length);
                return schedules;
            } else {
                throw new Error(result.message || 'Failed to fetch schedules');
            }
        } catch (error) {
            console.error('Error fetching schedules:', error);
            throw error;
        }
    }

    // Get schedule by ID
    static async getScheduleById(scheduleId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/schedules/${scheduleId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.status === 'success') {
                return result.data;
            } else {
                throw new Error(result.message || 'Failed to fetch schedule');
            }
        } catch (error) {
            console.error('Error fetching schedule by ID:', error);
            throw error;
        }
    }

    // Create new schedule
    static async createSchedule(scheduleData) {
        try {
            // Validate required fields
            if (!scheduleData.device_id || !scheduleData.title || !scheduleData.start_time || !scheduleData.schedule_type) {
                throw new Error('Semua field yang wajib harus diisi');
            }

            const response = await fetch(`${API_BASE_URL}/api/schedules`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }, body: JSON.stringify({
                    device_id: parseInt(scheduleData.device_id),
                    title: scheduleData.title.trim(),
                    schedule_type: scheduleData.schedule_type,
                    start_time: scheduleData.start_time,
                    end_time: scheduleData.end_time || null,
                    action_type: scheduleData.action_type || 'turn_on',
                    is_active: scheduleData.is_active !== undefined ? scheduleData.is_active : true
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.status === 'success') {
                return result.data;
            } else {
                throw new Error(result.message || 'Gagal menambahkan jadwal');
            }
        } catch (error) {
            console.error('Error creating schedule:', error);
            throw error;
        }
    }

    // Update schedule
    static async updateSchedule(scheduleId, updateData) {
        try {
            console.log('ScheduleService.updateSchedule called with:', { scheduleId, updateData });
            console.log('API URL:', `${API_BASE_URL}/api/schedules/${scheduleId}`);
            
            const response = await fetch(`${API_BASE_URL}/api/schedules/${scheduleId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            });

            console.log('ScheduleService.updateSchedule response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('ScheduleService.updateSchedule error response:', errorData);
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('ScheduleService.updateSchedule result:', result);

            if (result.status === 'success') {
                return result.data;
            } else {
                throw new Error(result.message || 'Gagal memperbarui jadwal');
            }
        } catch (error) {
            console.error('Error updating schedule:', error);
            throw error;
        }
    }

    // Delete schedule
    static async deleteSchedule(scheduleId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/schedules/${scheduleId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.status === 'success') {
                return true;
            } else {
                throw new Error(result.message || 'Gagal menghapus jadwal');
            }
        } catch (error) {
            console.error('Error deleting schedule:', error);
            throw error;
        }
    }

    // Toggle schedule status (active/inactive)
    static async toggleScheduleStatus(scheduleId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/schedules/${scheduleId}/toggle`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.status === 'success') {
                return result.data;
            } else {
                throw new Error(result.message || 'Gagal mengubah status jadwal');
            }
        } catch (error) {
            console.error('Error toggling schedule status:', error);
            throw error;
        }
    }

    // Get active schedules only
    static async getActiveSchedules() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/schedules/active/all`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.status === 'success') {
                return result.data || [];
            } else {
                throw new Error(result.message || 'Failed to fetch active schedules');
            }
        } catch (error) {
            console.error('Error fetching active schedules:', error);
            throw error;
        }
    }

    // Get today's schedules
    static async getTodaySchedules() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/schedules/today`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.status === 'success') {
                return result.data || [];
            } else {
                throw new Error(result.message || 'Failed to fetch today schedules');
            }
        } catch (error) {
            console.error('Error fetching today schedules:', error);
            throw error;
        }
    }

    // Validate schedule data
    static validateScheduleData(scheduleData) {
        const errors = [];

        if (!scheduleData.device_id) {
            errors.push('Device harus dipilih');
        }

        if (!scheduleData.title || scheduleData.title.trim().length === 0) {
            errors.push('Judul jadwal harus diisi');
        }

        if (!scheduleData.schedule_type) {
            errors.push('Tipe jadwal harus dipilih');
        }

        if (!scheduleData.start_time) {
            errors.push('Waktu mulai harus diisi');
        }

        // Validate end_time if provided
        if (scheduleData.end_time && scheduleData.start_time) {
            const startTime = new Date(`2000-01-01T${scheduleData.start_time}`);
            const endTime = new Date(`2000-01-01T${scheduleData.end_time}`);

            if (endTime <= startTime) {
                errors.push('Waktu selesai harus lebih besar dari waktu mulai');
            }
        }

        return errors;
    }

    // Format schedule data for display
    static formatScheduleForDisplay(schedule) {
        return {
            ...schedule,
            schedule_type_display: this.getScheduleTypeDisplay(schedule.schedule_type),
            action_type_display: this.getActionTypeDisplay(schedule.action_type),
            start_time_display: this.formatTime(schedule.start_time),
            end_time_display: schedule.end_time ? this.formatTime(schedule.end_time) : null,
            status_display: schedule.is_active ? 'Aktif' : 'Tidak Aktif'
        };
    }

    // Get schedule type display text
    static getScheduleTypeDisplay(scheduleType) {
        const types = {
            'one-time': 'Sekali',
            'daily': 'Harian',
            'weekly': 'Mingguan',
            'custom': 'Custom'
        };
        return types[scheduleType] || scheduleType;
    }

    // Get action type display text
    static getActionTypeDisplay(actionType) {
        const actions = {
            'turn_on': 'Nyalakan',
            'turn_off': 'Matikan',
            'toggle': 'Toggle'
        };
        return actions[actionType] || actionType;
    }

    // Format time for display
    static formatTime(timeString) {
        if (!timeString) return '-';
        try {
            return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return timeString;
        }
    }
}

export default ScheduleService;
