import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import axios from "axios";

const useNotifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const baseURL = useSelector(state => state.auth.baseURL?.defaults?.baseURL) || process.env.REACT_APP_API_BASE_URL;

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await axios.get("/api/notifications", { baseURL });
            
            // Debug log to check response structure
            console.log("Notifications API response:", res.data);
            
            // Process the notifications data to ensure consistent structure
            const processedNotifications = (res.data.data || []).map(notif => {
                // Ensure both id and notif_id are available for compatibility
                return {
                    ...notif,
                    id: notif.id || notif.notif_id,
                    notif_id: notif.notif_id || notif.id
                };
            });
            
            setNotifications(processedNotifications);
        } catch (e) {
            console.error('Error fetching notifications:', e);
            setNotifications([]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 10 seconds for new notifications
        const interval = setInterval(fetchNotifications, 10000);
        return () => clearInterval(interval);
    }, [baseURL]);

    return { notifications, loading, fetchNotifications };
};

export default useNotifications;
