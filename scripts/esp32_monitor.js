#!/usr/bin/env node
/**
 * ESP32 Connection Monitor
 * 
 * This utility displays real-time information about connected ESP32 devices
 * and helps troubleshoot connection issues between devices and the backend.
 */

const { io } = require('socket.io-client');
const axios = require('axios');
const readline = require('readline');
const WebSocket = require('ws');

// Configuration - NO LOCALHOST FALLBACK
const config = {
    backend: process.env.BACKEND_URL,
    wsServer: process.env.WS_SERVER_URL,
    refreshInterval: 3000,  // ms
    verbose: process.argv.includes('--verbose')
};

// State management
const state = {
    devices: [],
    connections: new Map(),
    recentData: new Map(),
    backendStatus: 'unknown',
    wsServerStatus: 'unknown',
    lastUpdate: null,
    stats: {
        messagesReceived: 0,
        dataPoints: 0,
        errors: 0
    }
};

// Terminal UI helpers
const clear = () => {
    process.stdout.write('\x1Bc');
};

const cursorTo = (x, y) => {
    process.stdout.write(`\x1b[${y};${x}H`);
};

const setColor = (text, colorCode) => {
    return `\x1b[${colorCode}m${text}\x1b[0m`;
};

// Color constants
const COLORS = {
    GREEN: '32',
    RED: '31',
    YELLOW: '33',
    BLUE: '34',
    MAGENTA: '35',
    CYAN: '36',
    GRAY: '90',
    BRIGHT_GREEN: '92',
    BRIGHT_RED: '91',
    BRIGHT_YELLOW: '93',
    BRIGHT_BLUE: '94'
};

// Socket.IO connection for frontend
let socket;

// Initialize the application
const init = async () => {
    clear();
    console.log(setColor('ESP32 Connection Monitor', COLORS.BRIGHT_BLUE));
    console.log(setColor('Initializing...', COLORS.GRAY));

    // Setup keyboard input
    setupKeyboardHandlers();

    try {
        // Connect to backend Socket.IO
        socket = io(config.backend, {
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            transports: ['websocket', 'polling']
        });

        // Setup Socket.IO event handlers
        setupSocketHandlers();

        // Start monitoring WebSocket server
        monitorWebSocketServer();

        // Fetch initial data
        await Promise.all([
            checkBackendStatus(),
            fetchDevices()
        ]);

        // Start refresh timer
        setInterval(refreshData, config.refreshInterval);

        // Initial render
        render();
    } catch (error) {
        console.error(setColor(`Initialization error: ${error.message}`, COLORS.RED));
    }
};

const setupSocketHandlers = () => {
    socket.on('connect', () => {
        state.backendStatus = 'connected';
        log('Socket.IO connected to backend');
        render();
    });

    socket.on('disconnect', () => {
        state.backendStatus = 'disconnected';
        log('Socket.IO disconnected from backend');
        render();
    });

    socket.on('connect_error', (error) => {
        state.backendStatus = 'error';
        log(`Socket.IO connection error: ${error.message}`);
        render();
    });

    socket.on('device_status', (data) => {
        log(`Device status update: ${JSON.stringify(data)}`);
        updateDeviceStatus(data);
        render();
    });

    socket.on('sensor_data', (data) => {
        state.stats.messagesReceived++;
        state.stats.dataPoints++;
        log(`Sensor data received: ${JSON.stringify(data)}`);
        updateSensorData(data);
        render();
    });
};

const monitorWebSocketServer = () => {
    // Create test WebSocket and check if server responds
    const checkWebSocketServer = () => {
        try {
            const ws = new WebSocket(config.wsServer);

            ws.on('open', () => {
                state.wsServerStatus = 'connected';
                ws.send(JSON.stringify({
                    type: 'monitor_ping',
                    timestamp: new Date().toISOString()
                }));
                setTimeout(() => ws.close(), 1000);
                render();
            });

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    log(`WebSocket server responded: ${JSON.stringify(message)}`);
                } catch (e) {
                    log(`Received non-JSON message: ${data}`);
                }
            });

            ws.on('error', (error) => {
                state.wsServerStatus = 'error';
                log(`WebSocket error: ${error.message}`);
                render();
            });

            ws.on('close', () => {
                log('Test WebSocket closed');
            });
        } catch (error) {
            state.wsServerStatus = 'error';
            log(`WebSocket test error: ${error.message}`);
            render();
        }
    };

    // Check now and then every 15 seconds
    checkWebSocketServer();
    setInterval(checkWebSocketServer, 15000);
};

const checkBackendStatus = async () => {
    try {
        const response = await axios.get(`${config.backend}/api/health`, { timeout: 3000 });
        state.backendStatus = 'connected';
        log(`Backend health check: ${JSON.stringify(response.data)}`);
    } catch (error) {
        state.backendStatus = 'error';
        log(`Backend health check error: ${error.message}`);
        state.stats.errors++;
    }
    render();
};

const fetchDevices = async () => {
    try {
        const response = await axios.get(`${config.backend}/api/esp32/devices`, { timeout: 5000 });
        if (response.data && response.data.status === 'success') {
            state.devices = response.data.data || [];
            log(`Fetched ${state.devices.length} devices`);
        } else {
            log(`Unexpected response format: ${JSON.stringify(response.data)}`);
        }
    } catch (error) {
        log(`Error fetching devices: ${error.message}`);
        state.stats.errors++;
    }
    state.lastUpdate = new Date();
    render();
};

const refreshData = async () => {
    await Promise.all([
        checkBackendStatus(),
        fetchDevices()
    ]);
};

const updateDeviceStatus = (statusData) => {
    if (!statusData || !statusData.device_id) return;

    const deviceId = statusData.device_id;
    const status = statusData.status;
    const timestamp = statusData.timestamp || new Date().toISOString();

    state.connections.set(deviceId, {
        status,
        timestamp,
        lastUpdate: new Date()
    });
};

const updateSensorData = (data) => {
    if (!data || !data.device_id) return;

    const deviceId = data.device_id;

    // Store recent data
    state.recentData.set(deviceId, {
        data,
        timestamp: new Date()
    });
};

const setupKeyboardHandlers = () => {
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
    }

    process.stdin.on('keypress', (str, key) => {
        if (key.ctrl && key.name === 'c') {
            // Ctrl+C to exit
            process.exit();
        } else if (key.name === 'r') {
            // R to refresh
            refreshData();
        } else if (key.name === 'v') {
            // V to toggle verbose
            config.verbose = !config.verbose;
            render();
        } else if (key.name === 'c') {
            // C to clear screen
            clear();
            render();
        } else if (key.name === 'q') {
            // Q to quit
            process.exit();
        }
    });
};

const log = (message) => {
    if (config.verbose) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${message}`);
    }
};

const render = () => {
    if (!config.verbose) {
        clear();
    }

    console.log(setColor('==== ESP32 CONNECTION MONITOR ====', COLORS.BRIGHT_BLUE));
    console.log(setColor(`Last Updated: ${new Date().toLocaleTimeString()}`, COLORS.GRAY));
    console.log();

    // Connection status
    console.log(setColor('SYSTEM STATUS:', COLORS.BRIGHT_YELLOW));
    console.log(
        `Backend Server:   ${getStatusIndicator(state.backendStatus)} ${getStatusText(state.backendStatus)}`
    );
    console.log(
        `WebSocket Server: ${getStatusIndicator(state.wsServerStatus)} ${getStatusText(state.wsServerStatus)}`
    );
    console.log(
        `Messages:         ${state.stats.messagesReceived} received, ${state.stats.dataPoints} data points, ${state.stats.errors} errors`
    );
    console.log();

    // Device list
    console.log(setColor('DEVICES:', COLORS.BRIGHT_YELLOW));
    if (state.devices.length === 0) {
        console.log(setColor('No devices found', COLORS.GRAY));
    } else {
        // Headers
        console.log(
            setColor('DEVICE ID', COLORS.CYAN).padEnd(20) +
            setColor('STATUS', COLORS.CYAN).padEnd(15) +
            setColor('LAST ONLINE', COLORS.CYAN).padEnd(25) +
            setColor('LATEST DATA', COLORS.CYAN)
        );

        console.log('-'.repeat(80));

        // Device rows
        for (const device of state.devices) {
            const deviceId = device.device_id || device.device_name;
            const connectionInfo = state.connections.get(deviceId);
            const recentData = state.recentData.get(deviceId);

            const status = connectionInfo ? connectionInfo.status : (device.device_status || 'unknown');
            const lastOnline = formatTimestamp(
                connectionInfo ? connectionInfo.timestamp : device.last_online
            );

            const latestData = recentData ? formatSensorDataPreview(recentData.data) : 'No data';

            console.log(
                deviceId.padEnd(20) +
                getDeviceStatusText(status).padEnd(15) +
                lastOnline.padEnd(25) +
                latestData
            );
        }
    }
    console.log();

    // Commands
    console.log(setColor('COMMANDS:', COLORS.BRIGHT_YELLOW));
    console.log('r: Refresh  v: Toggle verbose  c: Clear screen  q: Quit');
};

const getStatusIndicator = (status) => {
    switch (status) {
        case 'connected':
            return setColor('●', COLORS.GREEN);
        case 'disconnected':
            return setColor('●', COLORS.YELLOW);
        case 'error':
            return setColor('●', COLORS.RED);
        default:
            return setColor('●', COLORS.GRAY);
    }
};

const getStatusText = (status) => {
    switch (status) {
        case 'connected':
            return setColor('Connected', COLORS.GREEN);
        case 'disconnected':
            return setColor('Disconnected', COLORS.YELLOW);
        case 'error':
            return setColor('Error', COLORS.RED);
        default:
            return setColor('Unknown', COLORS.GRAY);
    }
};

const getDeviceStatusText = (status) => {
    switch (status) {
        case 'online':
        case 'aktif':
            return setColor('Online', COLORS.GREEN);
        case 'offline':
        case 'nonaktif':
            return setColor('Offline', COLORS.RED);
        default:
            return setColor(status, COLORS.GRAY);
    }
};

const formatTimestamp = (timestamp) => {
    if (!timestamp) return setColor('Never', COLORS.GRAY);

    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return setColor('Invalid date', COLORS.GRAY);

    const now = new Date();
    const diffSeconds = Math.floor((now - date) / 1000);

    if (diffSeconds < 60) {
        return setColor(`${diffSeconds}s ago`, COLORS.GREEN);
    } else if (diffSeconds < 3600) {
        return setColor(`${Math.floor(diffSeconds / 60)}m ago`, COLORS.GREEN);
    } else if (diffSeconds < 86400) {
        return setColor(`${Math.floor(diffSeconds / 3600)}h ago`, COLORS.YELLOW);
    } else {
        return setColor(date.toLocaleString(), COLORS.RED);
    }
};

const formatSensorDataPreview = (data) => {
    if (!data) return setColor('No data', COLORS.GRAY);

    // Format the values
    const voltage = data.voltage !== undefined ? `${data.voltage.toFixed(1)}V` : '?V';
    const current = data.current !== undefined ? `${data.current.toFixed(2)}A` : '?A';
    const power = data.power !== undefined ? `${data.power.toFixed(1)}W` : '?W';
    const pirStatus = data.pir_status !== undefined ? (data.pir_status ? 'ON' : 'OFF') : '?';

    // Create a preview string with colors
    return [
        `V:${setColor(voltage, COLORS.CYAN)}`,
        `I:${setColor(current, COLORS.MAGENTA)}`,
        `P:${setColor(power, COLORS.YELLOW)}`,
        `PIR:${data.pir_status ? setColor('ON', COLORS.BRIGHT_GREEN) : setColor('OFF', COLORS.GRAY)}`
    ].join(' | ');
};

// Start the application
init();
