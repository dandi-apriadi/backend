import React, { useState, useEffect } from 'react';

/**
 * Component to display a real-time clock
 */
const RealtimeClock = ({ className = '' }) => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        // Update time every second
        const interval = setInterval(() => {
            setTime(new Date());
        }, 1000);

        // Clean up interval
        return () => clearInterval(interval);
    }, []);

    // Format time as HH:MM:SS
    const formattedTime = time.toLocaleTimeString();

    return (
        <div className={className}>
            {formattedTime}
        </div>
    );
};

export default RealtimeClock;
