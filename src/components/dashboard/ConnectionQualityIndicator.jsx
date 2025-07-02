import React from 'react';

/**
 * Component to display real-time connection quality
 */
const ConnectionQualityIndicator = ({ connectionStatus, showDetails = false, className = '' }) => {
    const quality = connectionStatus?.connectionQuality || 0;
    const isConnected = connectionStatus?.isConnected;

    // Determine color based on quality and connection status
    let color = 'gray';
    if (isConnected) {
        if (quality >= 90) color = 'green';
        else if (quality >= 70) color = 'blue';
        else if (quality >= 50) color = 'yellow';
        else if (quality >= 30) color = 'orange';
        else color = 'red';
    } else {
        color = 'red';
    }

    // Get the color class based on the color variable
    const getColorClass = (baseColor) => {
        switch (baseColor) {
            case 'green': return 'bg-green-500';
            case 'blue': return 'bg-blue-500';
            case 'yellow': return 'bg-yellow-500';
            case 'orange': return 'bg-orange-500';
            case 'red': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    // Get status text
    const getStatusText = () => {
        if (!isConnected) return 'Offline';
        if (quality >= 90) return 'Excellent';
        if (quality >= 70) return 'Good';
        if (quality >= 50) return 'Fair';
        if (quality >= 30) return 'Poor';
        return 'Critical';
    };

    return (
        <div className={`flex items-center ${className}`} title={`Connection Quality: ${quality}%`}>
            <div className={`h-2 w-2 rounded-full ${getColorClass(color)} mr-1`}></div>

            {showDetails && (
                <span className="text-xs text-white font-medium">
                    {quality}% - {getStatusText()}
                </span>
            )}
        </div>
    );
};

export default ConnectionQualityIndicator;
