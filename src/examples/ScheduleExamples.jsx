// Example Usage: Cara Menggunakan Fitur Tambah Jadwal
// File ini menunjukkan contoh penggunaan fungsi-fungsi jadwal

import { useScheduleManagement } from '../hooks/useScheduleManagement';

// 1. SETUP - Menggunakan hook di komponen
const MyComponent = () => {
    const {
        schedules,
        loading,
        error,
        createSchedule,
        updateSchedule,
        deleteSchedule,
        toggleScheduleStatus,
        fetchSchedules
    } = useScheduleManagement();

    // 2. CONTOH: Tambah Jadwal Penyiraman Harian
    const handleTambahJadwalHarian = async () => {
        try {
            const jadwalBaru = {
                device_id: 1, // ID device ESP32
                title: "Penyiraman Pagi",
                schedule_type: "daily", // Harian
                start_time: "07:00",
                end_time: "07:30", // Opsional
                action_type: "turn_on",
                is_active: true
            };

            const result = await createSchedule(jadwalBaru);
            console.log('Jadwal berhasil ditambahkan:', result);
            alert('Jadwal penyiraman pagi berhasil dibuat!');
        } catch (error) {
            console.error('Error:', error);
            alert('Gagal membuat jadwal: ' + error.message);
        }
    };

    // 3. CONTOH: Tambah Jadwal Mingguan (Senin-Jumat)
    const handleTambahJadwalMingguan = async () => {
        try {
            const jadwalBaru = {
                device_id: 1,
                title: "Penyiraman Hari Kerja",
                schedule_type: "weekly",
                start_time: "08:00",
                end_time: "08:15",
                days_of_week: "1,2,3,4,5", // Senin sampai Jumat
                action_type: "turn_on",
                is_active: true
            };

            await createSchedule(jadwalBaru);
            alert('Jadwal mingguan berhasil dibuat!');
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    // 4. CONTOH: Tambah Jadwal Sekali (One-time)
    const handleTambahJadwalSekali = async () => {
        try {
            const jadwalBaru = {
                device_id: 1,
                title: "Penyiraman Khusus Hari Ini",
                schedule_type: "one-time",
                start_time: "15:00",
                end_time: "15:10",
                action_type: "turn_on",
                is_active: true
            };

            await createSchedule(jadwalBaru);
            alert('Jadwal sekali pakai berhasil dibuat!');
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    // 5. CONTOH: Edit Jadwal Existing
    const handleEditJadwal = async (scheduleId) => {
        try {
            const updateData = {
                title: "Penyiraman Sore (Updated)",
                start_time: "17:30",
                end_time: "17:45"
            };

            await updateSchedule(scheduleId, updateData);
            alert('Jadwal berhasil diperbarui!');
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    // 6. CONTOH: Hapus Jadwal
    const handleHapusJadwal = async (scheduleId) => {
        if (window.confirm('Yakin ingin menghapus jadwal ini?')) {
            try {
                await deleteSchedule(scheduleId);
                alert('Jadwal berhasil dihapus!');
            } catch (error) {
                alert('Error: ' + error.message);
            }
        }
    };

    // 7. CONTOH: Toggle Status Jadwal (Aktif/Non-aktif)
    const handleToggleStatus = async (scheduleId) => {
        try {
            const result = await toggleScheduleStatus(scheduleId);
            const status = result.is_active ? 'aktif' : 'non-aktif';
            alert(`Jadwal berhasil diubah menjadi ${status}!`);
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    // 8. CONTOH: Refresh Data Jadwal
    const handleRefresh = async () => {
        try {
            await fetchSchedules();
            alert('Data jadwal berhasil diperbarui!');
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    return (
        <div>
            <h1>Contoh Penggunaan Fitur Jadwal</h1>

            {/* Loading State */}
            {loading && <p>Loading...</p>}

            {/* Error State */}
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}

            {/* Buttons untuk contoh */}
            <div style={{ marginBottom: '20px' }}>
                <button onClick={handleTambahJadwalHarian}>
                    Tambah Jadwal Harian
                </button>
                <button onClick={handleTambahJadwalMingguan}>
                    Tambah Jadwal Mingguan
                </button>
                <button onClick={handleTambahJadwalSekali}>
                    Tambah Jadwal Sekali
                </button>
                <button onClick={handleRefresh}>
                    Refresh Data
                </button>
            </div>

            {/* Tampilkan daftar jadwal */}
            <div>
                <h2>Daftar Jadwal ({schedules.length})</h2>
                {schedules.map(schedule => (
                    <div key={schedule.schedule_id} style={{
                        border: '1px solid #ccc',
                        padding: '10px',
                        margin: '10px 0',
                        borderRadius: '5px'
                    }}>
                        <h3>{schedule.title}</h3>
                        <p>Tipe: {schedule.schedule_type}</p>
                        <p>Waktu: {schedule.start_time} - {schedule.end_time}</p>
                        <p>Status: {schedule.is_active ? 'Aktif' : 'Non-aktif'}</p>
                        <p>Aksi: {schedule.action_type}</p>

                        <button onClick={() => handleEditJadwal(schedule.schedule_id)}>
                            Edit
                        </button>
                        <button onClick={() => handleToggleStatus(schedule.schedule_id)}>
                            Toggle Status
                        </button>
                        <button onClick={() => handleHapusJadwal(schedule.schedule_id)}>
                            Hapus
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

// CONTOH PENGGUNAAN LANGSUNG (tanpa hook)
// Jika ingin menggunakan service langsung tanpa hook

import ScheduleService from '../services/scheduleService';

// Contoh fungsi standalone
export const contohTambahJadwalLangsung = async () => {
    try {
        const jadwalBaru = {
            device_id: 1,
            title: "Test Jadwal",
            schedule_type: "daily",
            start_time: "10:00",
            action_type: "turn_on",
            is_active: true
        };

        // Validasi dulu
        const errors = ScheduleService.validateScheduleData(jadwalBaru);
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }

        // Buat jadwal
        const result = await ScheduleService.createSchedule(jadwalBaru);
        console.log('Jadwal berhasil dibuat:', result);

        return result;
    } catch (error) {
        console.error('Error membuat jadwal:', error);
        throw error;
    }
};

// CONTOH FORM COMPONENT
const FormTambahJadwal = () => {
    const [formData, setFormData] = useState({
        device_id: '',
        title: '',
        schedule_type: 'daily',
        start_time: '',
        end_time: '',
        days_of_week: '',
        action_type: 'turn_on',
        is_active: true
    });

    const { createSchedule, loading, error } = useScheduleManagement();

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            await createSchedule(formData);
            alert('Jadwal berhasil dibuat!');

            // Reset form
            setFormData({
                device_id: '',
                title: '',
                schedule_type: 'daily',
                start_time: '',
                end_time: '',
                days_of_week: '',
                action_type: 'turn_on',
                is_active: true
            });
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    return (
        <form onSubmit={handleSubmit}>
            <h2>Tambah Jadwal Baru</h2>

            {error && <div style={{ color: 'red' }}>Error: {error}</div>}

            <div>
                <label>Device ID:</label>
                <input
                    type="number"
                    name="device_id"
                    value={formData.device_id}
                    onChange={handleChange}
                    required
                />
            </div>

            <div>
                <label>Judul:</label>
                <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                />
            </div>

            <div>
                <label>Tipe Jadwal:</label>
                <select
                    name="schedule_type"
                    value={formData.schedule_type}
                    onChange={handleChange}
                >
                    <option value="one-time">Sekali</option>
                    <option value="daily">Harian</option>
                    <option value="weekly">Mingguan</option>
                    <option value="custom">Custom</option>
                </select>
            </div>

            <div>
                <label>Waktu Mulai:</label>
                <input
                    type="time"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleChange}
                    required
                />
            </div>

            <div>
                <label>Waktu Selesai:</label>
                <input
                    type="time"
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleChange}
                />
            </div>

            {(formData.schedule_type === 'weekly' || formData.schedule_type === 'custom') && (
                <div>
                    <label>Hari (1=Senin, 7=Minggu):</label>
                    <input
                        type="text"
                        name="days_of_week"
                        value={formData.days_of_week}
                        onChange={handleChange}
                        placeholder="1,2,3,4,5"
                    />
                </div>
            )}

            <div>
                <label>Aksi:</label>
                <select
                    name="action_type"
                    value={formData.action_type}
                    onChange={handleChange}
                >
                    <option value="turn_on">Nyalakan</option>
                    <option value="turn_off">Matikan</option>
                    <option value="toggle">Toggle</option>
                </select>
            </div>

            <div>
                <label>
                    <input
                        type="checkbox"
                        name="is_active"
                        checked={formData.is_active}
                        onChange={handleChange}
                    />
                    Aktif
                </label>
            </div>

            <button type="submit" disabled={loading}>
                {loading ? 'Menyimpan...' : 'Simpan Jadwal'}
            </button>
        </form>
    );
};

export default FormTambahJadwal;
