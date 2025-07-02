/**
 * Connection Helper Utilities
 * Provides helper functions for managing and troubleshooting connections
 */

// Test if server is reachable via HTTP fallback
export const testHttpConnection = async (baseUrl, timeout = 5000) => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(`${baseUrl}/api/esp32/ping`, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            return { success: false, error: `HTTP error ${response.status}` };
        }

        const data = await response.json();
        return {
            success: true,
            data,
            timestamp: new Date()
        };
    } catch (error) {
        return {
            success: false,
            error: error.name === 'AbortError' ? 'Connection timeout' : error.message,
            timestamp: new Date()
        };
    }
};

// Check if WebSocket server is available without establishing a connection
export const checkWebSocketAvailability = async (wsUrl, timeout = 5000) => {
    try {
        // Extract host and port from WebSocket URL
        const url = new URL(wsUrl.replace('ws://', 'http://').replace('wss://', 'https://'));

        // Build a URL for checking server availability via HTTP
        const checkUrl = `${url.origin}/api/esp32/ping`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(checkUrl, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            return { available: false, error: `HTTP error ${response.status}` };
        }

        const data = await response.json();
        return {
            available: true,
            serverInfo: data,
            timestamp: new Date()
        };
    } catch (error) {
        return {
            available: false,
            error: error.name === 'AbortError' ? 'Connection timeout' : error.message,
            timestamp: new Date()
        };
    }
};

// Detect network issues that might be preventing connections
export const detectNetworkIssues = async () => {
    const results = {
        hasInternetAccess: false,
        connectionType: 'unknown',
        issues: []
    };

    // Check for internet connectivity by pinging a reliable external service
    try {
        const response = await fetch('https://www.google.com/generate_204', {
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'no-cache',
            timeout: 5000
        });
        results.hasInternetAccess = true;
    } catch (error) {
        results.issues.push('No internet access detected');
        results.hasInternetAccess = false;
    }

    // Check connection information if available in navigator
    if (navigator.connection) {
        results.connectionType = navigator.connection.effectiveType;
        if (navigator.connection.downlink < 1) {
            results.issues.push('Slow network connection detected');
        }
        if (navigator.connection.rtt > 500) {
            results.issues.push('High network latency detected');
        }
    }

    return results;
};

// Export a helper for detecting connection issues
export const diagnoseConnectionProblems = async (apiBaseUrl, wsUrl) => {
    const results = {
        timestamp: new Date(),
        networkStatus: await detectNetworkIssues(),
        httpApiStatus: await testHttpConnection(apiBaseUrl),
        wsServerStatus: await checkWebSocketAvailability(wsUrl),
        recommendations: []
    };

    // Generate recommendations based on test results
    if (!results.networkStatus.hasInternetAccess) {
        results.recommendations.push('Check your internet connection');
    }

    if (!results.httpApiStatus.success && results.networkStatus.hasInternetAccess) {
        results.recommendations.push('API server may be down or unreachable');
    }

    if (!results.wsServerStatus.available && results.httpApiStatus.success) {
        results.recommendations.push('WebSocket server may be down while HTTP is working');
    }

    if (results.recommendations.length === 0 && results.httpApiStatus.success) {
        results.recommendations.push('Connection appears healthy, issue may be temporary');
    }

    return results;
};

export default {
    testHttpConnection,
    checkWebSocketAvailability,
    detectNetworkIssues,
    diagnoseConnectionProblems
};
