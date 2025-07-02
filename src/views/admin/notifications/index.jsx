import React, { useState, useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import useNotifications from "./useNotifications";

const Notifications = () => {
    // Get the base URL from Redux store
    const baseURL = useSelector(state => state.auth.baseURL?.defaults?.baseURL) || process.env.REACT_APP_API_BASE_URL;
    
    // UI state
    const [filter, setFilter] = useState('all'); // all, unread, insect, pump, schedule

    const { notifications, loading, fetchNotifications } = useNotifications();
    
    // Count various notification types
    const insectNotificationsCount = notifications.filter(n => n.type === 'insect' && n.status === 'unread').length;
    const pumpNotificationsCount = notifications.filter(n => n.type === 'pump' && n.status === 'unread').length;
    const scheduleNotificationsCount = notifications.filter(n => n.type === 'schedule' && n.status === 'unread').length;
    const totalUnreadCount = notifications.filter(n => n.status === 'unread').length;

    // Filter notifications based on active filter
    const filteredNotifications = notifications.filter(notification => {
        switch (filter) {
            case 'unread':
                return notification.status === 'unread';
            case 'insect':
                return notification.type === 'insect';
            case 'pump':
                return notification.type === 'pump';
            case 'schedule':
                return notification.type === 'schedule';
            default:
                return true;
        }
    });

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'insect':
                return <span className="text-xl">🐞</span>;
            case 'pump':
                return <span className="text-xl">💧</span>;
            case 'schedule':
                return <span className="text-xl">⏰</span>;
            default:
                return <span className="text-xl">🔔</span>;
        }
    };

    const getNotificationColor = (type) => {
        switch (type) {
            case 'insect':
                return 'border-red-500 bg-red-50';
            case 'pump':
                return 'border-blue-500 bg-blue-50';
            case 'schedule':
                return 'border-green-500 bg-green-50';
            default:
                return 'border-gray-300 bg-gray-50';
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'Baru saja';
        if (diffInMinutes < 60) return `${diffInMinutes} menit yang lalu`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} jam yang lalu`;
        return date.toLocaleDateString('id-ID', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl">
                                    <span className="text-2xl">🔔</span>
                                </div>
                                Pusat Notifikasi
                            </h1>
                            <p className="mt-2 text-gray-600">
                                Kelola notifikasi dan pengaturan pemberitahuan sistem IoT
                            </p>
                        </div>
                        
                        {/* Quick Stats */}
                        <div className="hidden lg:flex items-center gap-4">
                            <div className="bg-white rounded-xl p-4 shadow-sm border">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-100 rounded-lg">
                                        <span className="text-lg">🔔</span>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-red-600">{totalUnreadCount}</p>
                                        <p className="text-sm text-gray-500">Belum Dibaca</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-xl p-4 shadow-sm border">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <span className="text-lg">✅</span>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-blue-600">{notifications.length}</p>
                                        <p className="text-sm text-gray-500">Total</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="bg-white rounded-xl shadow-sm border mb-6">
                    <div className="flex border-b border-gray-200">
                        <div className="flex-1 px-6 py-4 text-sm font-medium text-red-600 border-b-2 border-red-600 bg-red-50">
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-lg">🔔</span>
                                <span>Notifikasi</span>
                                {totalUnreadCount > 0 && (
                                    <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                        {totalUnreadCount}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notifications List */}
                <div className="space-y-6">
                        {/* Filter and Actions Bar */}
                        <div className="bg-white rounded-xl shadow-sm border p-6">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                {/* Filters */}
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setFilter('all')}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            filter === 'all'
                                                ? 'bg-gray-900 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        Semua ({notifications.length})
                                    </button>
                                    <button
                                        onClick={() => setFilter('unread')}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            filter === 'unread'
                                                ? 'bg-red-600 text-white'
                                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                                        }`}
                                    >
                                        Belum Dibaca ({totalUnreadCount})
                                    </button>
                                    <button
                                        onClick={() => setFilter('insect')}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            filter === 'insect'
                                                ? 'bg-orange-600 text-white'
                                                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                        }`}
                                    >
                                        🐞 Serangga ({insectNotificationsCount})
                                    </button>
                                    <button
                                        onClick={() => setFilter('pump')}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            filter === 'pump'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                        }`}
                                    >
                                        💧 Pompa ({pumpNotificationsCount})
                                    </button>
                                    <button
                                        onClick={() => setFilter('schedule')}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            filter === 'schedule'
                                                ? 'bg-green-600 text-white'
                                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                                        }`}
                                    >
                                        ⏰ Jadwal ({scheduleNotificationsCount})
                                    </button>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={async () => {
                                            try {
                                                await axios.post('/api/notifications/mark-all-read', {}, { baseURL });
                                                fetchNotifications();
                                            } catch (error) {
                                                console.error("Error marking all as read:", error);
                                                alert("Gagal menandai semua notifikasi sebagai telah dibaca. Silakan coba lagi.");
                                            }
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                    >
                                        <span className="text-lg">✅</span>
                                        Tandai Semua Dibaca
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (window.confirm('Apakah Anda yakin ingin menghapus semua notifikasi?')) {
                                                try {
                                                    await axios.delete('/api/notifications/delete-all', { baseURL });
                                                    fetchNotifications();
                                                } catch (error) {
                                                    console.error("Error deleting all notifications:", error);
                                                    alert("Gagal menghapus semua notifikasi. Silakan coba lagi.");
                                                }
                                            }
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                                    >
                                        <span className="text-lg">🗑️</span>
                                        Hapus Semua
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Notifications List */}
                        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                                    <span className="ml-3 text-gray-600">Memuat notifikasi...</span>
                                </div>
                            ) : filteredNotifications.length === 0 ? (
                                <div className="text-center py-12">
                                    <span className="text-6xl">🔔</span>
                                    <h3 className="mt-4 text-lg font-medium text-gray-900">
                                        {filter === 'all' ? 'Tidak ada notifikasi' : `Tidak ada notifikasi ${filter}`}
                                    </h3>
                                    <p className="mt-2 text-gray-500">
                                        {filter === 'all' 
                                            ? 'Belum ada notifikasi yang diterima.'
                                            : `Tidak ada notifikasi dalam kategori ${filter}.`
                                        }
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-200">
                                    {filteredNotifications.map((notif, idx) => (
                                        <div
                                            key={notif.id || notif.notif_id || idx}
                                            className={`p-6 transition-all hover:bg-gray-50 ${
                                                notif.status === 'unread' ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                                            }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-4 flex-1">
                                                    <div className="flex-shrink-0 mt-1">
                                                        {getNotificationIcon(notif.type)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <h4 className="text-lg font-semibold text-gray-900 truncate">
                                                                {notif.title}
                                                            </h4>
                                                            {notif.status === 'unread' && (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                                    Baru
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-gray-700 mb-3 leading-relaxed">
                                                            {notif.message}
                                                        </p>
                                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                                            <span className="flex items-center gap-1">
                                                                <span className="text-sm">🕒</span>
                                                                {formatDate(notif.created_at)}
                                                            </span>
                                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                                notif.type === 'insect' 
                                                                    ? 'bg-orange-100 text-orange-800'
                                                                    : notif.type === 'pump'
                                                                        ? 'bg-blue-100 text-blue-800'
                                                                        : 'bg-green-100 text-green-800'
                                                            }`}>
                                                                {notif.type === 'insect' ? '🐞 Deteksi Serangga' : 
                                                                 notif.type === 'pump' ? '💧 Aktivitas Pompa' : 
                                                                 '⏰ Penjadwalan'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {notif.status === 'unread' && (
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                const notificationId = notif.notif_id || notif.id;
                                                                if (!notificationId) {
                                                                    alert("ID notifikasi tidak ditemukan. Silakan muat ulang halaman.");
                                                                    return;
                                                                }
                                                                
                                                                await axios.post(`/api/notifications/${notificationId}/read`, {}, { baseURL });
                                                                fetchNotifications();
                                                            } catch (error) {
                                                                console.error("Error marking notification as read:", error);
                                                                alert("Gagal menandai notifikasi sebagai telah dibaca. Silakan coba lagi.");
                                                            }
                                                        }}
                                                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium ml-4"
                                                    >
                                                        <span className="text-sm">👁️</span>
                                                        Tandai Dibaca
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
    );
};

export default Notifications;
