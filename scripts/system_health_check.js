#!/usr/bin/env node
/**
 * System Health Monitor for IoT Rice Pest Spraying System
 * 
 * This script provides comprehensive monitoring and diagnostics for the
 * entire system stack: ESP32, WebSocket Server, API Server, Database, and Frontend.
 */

const http = require('http');
const WebSocket = require('ws');
const mysql = require('mysql2/promise');
const axios = require('axios');
const fs = require('fs').promises;
const { execSync } = require('child_process');
const readline = require('readline');

// Configuration - NO LOCALHOST FALLBACK
const config = {
    backend: {
        http: process.env.BACKEND_URL,
        websocket: process.env.WS_SERVER_URL,
        apiKey: process.env.API_KEY || ''
    }, frontend: {
        url: process.env.CLIENT_ORIGIN,
        buildCheck: true
    },
    database: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'iot_rice_system',
        connectionLimit: 5
    },
    esp32: {
        simulateTest: true,
        testDuration: 10 // seconds
    },
    logFile: './system_health_report.log',
    verbose: process.argv.includes('--verbose'),
    skipTests: process.argv.filter(arg => arg.startsWith('--skip=')).map(arg => arg.replace('--skip=', ''))
};

// State
let isRunning = true;
const state = {
    startTime: Date.now(),
    results: {
        backend: { status: 'pending', details: {} },
        websocket: { status: 'pending', details: {} },
        database: { status: 'pending', details: {} },
        frontend: { status: 'pending', details: {} },
        esp32: { status: 'pending', details: {} }
    },
    summary: {
        healthy: 0,
        warnings: 0,
        errors: 0,
        total: 5
    }
};

// Utility Functions
const log = (message, type = 'info') => {
    const timestamp = new Date().toISOString();
    const coloredMessage = colorize(message, type);
    console.log(`[${timestamp}] ${coloredMessage}`);
};

const verbose = (message, type = 'debug') => {
    if (config.verbose) {
        const timestamp = new Date().toISOString();
        const coloredMessage = colorize(message, type);
        console.log(`[VERBOSE] ${coloredMessage}`);
    }
};

const colorize = (message, type) => {
    const colors = {
        success: '\x1b[32m', // green
        error: '\x1b[31m',   // red
        warning: '\x1b[33m', // yellow
        info: '\x1b[36m',    // cyan
        debug: '\x1b[90m',   // gray
        reset: '\x1b[0m'     // reset
    };

    return `${colors[type] || ''}${message}${colors.reset}`;
};

const updateSummary = () => {
    state.summary.healthy = Object.values(state.results).filter(r => r.status === 'healthy').length;
    state.summary.warnings = Object.values(state.results).filter(r => r.status === 'warning').length;
    state.summary.errors = Object.values(state.results).filter(r => r.status === 'error').length;
};

const printResults = () => {
    console.log('\n' + '='.repeat(80));
    console.log(' SYSTEM HEALTH REPORT');
    console.log('='.repeat(80));

    console.log(`\nTime: ${new Date().toISOString()}`);
    console.log(`Duration: ${((Date.now() - state.startTime) / 1000).toFixed(1)}s`);
    console.log('\n' + '-'.repeat(80));

    Object.entries(state.results).forEach(([key, value]) => {
        const icon = value.status === 'healthy' ? '✅' :
            value.status === 'warning' ? '⚠️' :
                value.status === 'error' ? '❌' : '⏳';

        console.log(`\n${icon} ${key.toUpperCase()}: ${colorize(value.status.toUpperCase(), value.status)}`);

        if (value.message) {
            console.log(`   ${value.message}`);
        }

        if (config.verbose && value.details) {
            console.log('\n   Details:');
            Object.entries(value.details).forEach(([detailKey, detailValue]) => {
                console.log(`   - ${detailKey}: ${JSON.stringify(detailValue)}`);
            });
        }
    });

    console.log('\n' + '-'.repeat(80));
    console.log(` SUMMARY: ${colorize(`${state.summary.healthy} healthy`, 'success')}, ${colorize(`${state.summary.warnings} warnings`, 'warning')}, ${colorize(`${state.summary.errors} errors`, 'error')} (of ${state.summary.total} components)`);
    console.log('='.repeat(80) + '\n');
};

// Health Check Functions
const checkBackendHealth = async () => {
    if (config.skipTests.includes('backend')) {
        state.results.backend = { status: 'skipped', message: 'Test skipped by user' };
        return;
    }

    log('Checking backend API health...');

    try {
        const startTime = Date.now();
        const response = await axios.get(`${config.backend.http}/api/health`, {
            timeout: 5000,
            headers: config.backend.apiKey ? { 'Authorization': `Bearer ${config.backend.apiKey}` } : {}
        });
        const responseTime = Date.now() - startTime;

        verbose(`Backend response: ${JSON.stringify(response.data)}`);

        if (response.status === 200 && response.data.status === 'ok') {
            state.results.backend = {
                status: responseTime > 1000 ? 'warning' : 'healthy',
                message: responseTime > 1000 ?
                    `API is operational but slow (${responseTime}ms)` :
                    `API is operational (${responseTime}ms)`,
                details: {
                    version: response.data.version || 'unknown',
                    uptime: response.data.uptime || 'unknown',
                    memoryUsage: response.data.memory || 'unknown',
                    responseTime: `${responseTime}ms`
                }
            };
        } else {
            state.results.backend = {
                status: 'warning',
                message: `API responded with unexpected status: ${response.data.status}`,
                details: { response: response.data }
            };
        }
    } catch (error) {
        state.results.backend = {
            status: 'error',
            message: `Failed to connect to backend: ${error.message}`,
            details: { error: error.toString() }
        };
    }
};

const checkWebSocketHealth = async () => {
    if (config.skipTests.includes('websocket')) {
        state.results.websocket = { status: 'skipped', message: 'Test skipped by user' };
        return;
    }

    log('Checking WebSocket server health...');

    return new Promise((resolve) => {
        try {
            const startTime = Date.now();
            let messageReceived = false;
            let connectionSuccessful = false;

            const ws = new WebSocket(config.backend.websocket);

            const timeout = setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close();
                }

                if (connectionSuccessful) {
                    state.results.websocket = {
                        status: messageReceived ? 'healthy' : 'warning',
                        message: messageReceived
                            ? `WebSocket connection and message exchange successful (${Date.now() - startTime}ms)`
                            : 'WebSocket connected but no message received',
                        details: { connectionTime: `${Date.now() - startTime}ms` }
                    };
                } else {
                    state.results.websocket = {
                        status: 'error',
                        message: 'Failed to establish WebSocket connection within timeout',
                        details: { timeout: '5000ms' }
                    };
                }

                resolve();
            }, 5000);

            ws.on('open', () => {
                connectionSuccessful = true;
                verbose('WebSocket connection opened');

                // Send test message
                ws.send(JSON.stringify({
                    type: 'ping',
                    timestamp: new Date().toISOString(),
                    client: 'system-health-monitor'
                }));
            });

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    messageReceived = true;

                    verbose(`WebSocket message received: ${JSON.stringify(message)}`);

                    // Early success - can resolve now
                    clearTimeout(timeout);
                    ws.close();

                    state.results.websocket = {
                        status: 'healthy',
                        message: `WebSocket connection and message exchange successful (${Date.now() - startTime}ms)`,
                        details: {
                            connectionTime: `${Date.now() - startTime}ms`,
                            response: message
                        }
                    };

                    resolve();
                } catch (err) {
                    verbose(`WebSocket message parse error: ${err}`);
                }
            });

            ws.on('error', (error) => {
                clearTimeout(timeout);

                state.results.websocket = {
                    status: 'error',
                    message: `WebSocket error: ${error.message}`,
                    details: { error: error.toString() }
                };

                resolve();
            });

            ws.on('close', () => {
                verbose('WebSocket connection closed');
            });
        } catch (error) {
            state.results.websocket = {
                status: 'error',
                message: `WebSocket setup failed: ${error.message}`,
                details: { error: error.toString() }
            };
            resolve();
        }
    });
};

const checkDatabaseHealth = async () => {
    if (config.skipTests.includes('database')) {
        state.results.database = { status: 'skipped', message: 'Test skipped by user' };
        return;
    }

    log('Checking database connection and health...');

    try {
        // Create connection
        const startTime = Date.now();
        const connection = await mysql.createConnection({
            host: config.database.host,
            user: config.database.user,
            password: config.database.password,
            database: config.database.database,
            connectTimeout: 5000
        });

        const connectionTime = Date.now() - startTime;
        verbose(`Database connected in ${connectionTime}ms`);

        // Check database status
        const [statusResult] = await connection.query('SHOW STATUS');
        const status = {};
        statusResult.forEach(row => {
            if (['Uptime', 'Threads_connected', 'Threads_running', 'Questions'].includes(row.Variable_name)) {
                status[row.Variable_name] = row.Value;
            }
        });

        // Check sensors table
        const [sensorRows] = await connection.query('SELECT COUNT(*) as count FROM sensors');
        const sensorCount = sensorRows[0].count;

        // Check recent data
        const [recentData] = await connection.query(
            'SELECT COUNT(*) as count FROM sensors WHERE timestamp > DATE_SUB(NOW(), INTERVAL 1 HOUR)'
        );
        const recentCount = recentData[0].count;

        // Close connection
        await connection.end();

        const queryTime = Date.now() - startTime - connectionTime;

        state.results.database = {
            status: connectionTime > 1000 ? 'warning' : 'healthy',
            message: connectionTime > 1000
                ? `Database connected but slow (${connectionTime}ms)`
                : `Database connected and healthy (${connectionTime}ms)`,
            details: {
                connectionTime: `${connectionTime}ms`,
                queryTime: `${queryTime}ms`,
                sensorRecords: sensorCount,
                recentRecords: recentCount,
                status
            }
        };
    } catch (error) {
        state.results.database = {
            status: 'error',
            message: `Database connection failed: ${error.message}`,
            details: { error: error.toString() }
        };
    }
};

const checkFrontendHealth = async () => {
    if (config.skipTests.includes('frontend')) {
        state.results.frontend = { status: 'skipped', message: 'Test skipped by user' };
        return;
    }

    log('Checking frontend availability...');

    try {
        const startTime = Date.now();
        const response = await axios.get(config.frontend.url, { timeout: 5000 });
        const responseTime = Date.now() - startTime;

        // Check for React app markers in HTML
        const hasReactRoot = response.data.includes('id="root"');
        const hasAppJs = response.data.includes('static/js/main');

        let buildInfo = {};

        // Try to get build info if enabled
        if (config.frontend.buildCheck) {
            try {
                const assetManifest = await axios.get(`${config.frontend.url}/asset-manifest.json`);
                buildInfo = {
                    hasManifest: true,
                    entrypoints: assetManifest.data.entrypoints || []
                };
            } catch (err) {
                buildInfo = { hasManifest: false, error: err.message };
                verbose(`Could not fetch asset manifest: ${err.message}`);
            }
        }

        state.results.frontend = {
            status: (hasReactRoot && hasAppJs) ? 'healthy' : 'warning',
            message: (hasReactRoot && hasAppJs)
                ? `Frontend is available (${responseTime}ms)`
                : 'Frontend is available but may not be the React app',
            details: {
                responseTime: `${responseTime}ms`,
                hasReactRoot,
                hasAppJs,
                contentLength: response.headers['content-length'] || 'unknown',
                buildInfo
            }
        };
    } catch (error) {
        state.results.frontend = {
            status: 'error',
            message: `Frontend not available: ${error.message}`,
            details: { error: error.toString() }
        };
    }
};

const checkEsp32Integration = async () => {
    if (config.skipTests.includes('esp32')) {
        state.results.esp32 = { status: 'skipped', message: 'Test skipped by user' };
        return;
    }

    log('Checking ESP32 integration...');

    // If simulation is enabled, run the test script
    if (config.esp32.simulateTest) {
        try {
            log('Running ESP32 simulation test script...');

            // We'll use the test_websocket.py script with a timeout
            const pythonScript = 'test_websocket.py';
            const scriptPath = `./ESP32/${pythonScript}`;

            try {
                await fs.access(scriptPath);

                // Run the script with a timeout
                const testStartTime = Date.now();

                // Execute the python script and capture output
                const output = execSync(
                    `cd ./ESP32 && python ${pythonScript} --test-mode --timeout ${config.esp32.testDuration}`,
                    { timeout: (config.esp32.testDuration + 5) * 1000 }
                ).toString();

                verbose(`ESP32 test script output: ${output}`);

                // Check for success markers in the output
                const isConnected = output.includes('Connected to WebSocket server');
                const dataReceived = output.includes('Received message');
                const dataSent = output.includes('Sent sensor data');

                const testDuration = Date.now() - testStartTime;

                state.results.esp32 = {
                    status: (isConnected && dataSent && dataReceived) ? 'healthy' : 'warning',
                    message: (isConnected && dataSent && dataReceived)
                        ? `ESP32 integration test successful (${testDuration}ms)`
                        : `ESP32 integration test incomplete: ${isConnected ? 'Connected' : 'Not connected'}, ${dataSent ? 'Data sent' : 'No data sent'}, ${dataReceived ? 'Data received' : 'No data received'}`,
                    details: {
                        testDuration: `${testDuration}ms`,
                        isConnected,
                        dataSent,
                        dataReceived,
                        outputExcerpt: output.substring(0, 500) + (output.length > 500 ? '...' : '')
                    }
                };
            } catch (err) {
                verbose(`Error accessing test script: ${err}`);

                state.results.esp32 = {
                    status: 'error',
                    message: `Cannot run ESP32 test script: ${err.message}`,
                    details: { error: err.toString() }
                };
            }
        } catch (error) {
            state.results.esp32 = {
                status: 'error',
                message: `ESP32 test script execution failed: ${error.message}`,
                details: { error: error.toString() }
            };
        }
    } else {
        // Check for recent ESP32 data in the database
        try {
            const connection = await mysql.createConnection({
                host: config.database.host,
                user: config.database.user,
                password: config.database.password,
                database: config.database.database
            });

            const [recentEsp32Data] = await connection.query(
                'SELECT COUNT(*) as count, MAX(timestamp) as latest FROM sensors WHERE timestamp > DATE_SUB(NOW(), INTERVAL 5 MINUTE)'
            );

            await connection.end();

            const recentCount = recentEsp32Data[0].count;
            const latestTimestamp = recentEsp32Data[0].latest;

            if (recentCount > 0) {
                const latestTime = new Date(latestTimestamp);
                const ageInSeconds = (Date.now() - latestTime.getTime()) / 1000;

                if (ageInSeconds < 60) {
                    state.results.esp32 = {
                        status: 'healthy',
                        message: `ESP32 data received in the last minute (${recentCount} records)`,
                        details: {
                            recentCount,
                            latestTimestamp,
                            ageInSeconds: `${Math.round(ageInSeconds)}s`
                        }
                    };
                } else {
                    state.results.esp32 = {
                        status: 'warning',
                        message: `ESP32 data received in the last 5 minutes, but not in the last minute`,
                        details: {
                            recentCount,
                            latestTimestamp,
                            ageInSeconds: `${Math.round(ageInSeconds)}s`
                        }
                    };
                }
            } else {
                state.results.esp32 = {
                    status: 'error',
                    message: 'No ESP32 data received in the last 5 minutes',
                    details: {
                        recentCount: 0
                    }
                };
            }
        } catch (error) {
            state.results.esp32 = {
                status: 'error',
                message: `Failed to check ESP32 data: ${error.message}`,
                details: { error: error.toString() }
            };
        }
    }
};

// Main execution
const runHealthCheck = async () => {
    log('Starting System Health Check', 'info');
    log(`Mode: ${config.verbose ? 'Verbose' : 'Normal'}`, 'info');

    try {
        // Run tests in parallel
        await Promise.all([
            checkBackendHealth(),
            checkWebSocketHealth(),
            checkDatabaseHealth(),
            checkFrontendHealth(),
            checkEsp32Integration()
        ]);

        updateSummary();
        printResults();

        // Save results to log file
        try {
            const resultText = JSON.stringify({
                timestamp: new Date().toISOString(),
                summary: state.summary,
                results: state.results,
                duration: Date.now() - state.startTime
            }, null, 2);

            await fs.writeFile(config.logFile, resultText);
            log(`Results saved to ${config.logFile}`, 'info');
        } catch (err) {
            log(`Failed to save results: ${err.message}`, 'error');
        }

        // Exit with appropriate code
        const exitCode = state.summary.errors > 0 ? 1 : 0;
        process.exit(exitCode);
    } catch (error) {
        log(`Health check failed: ${error.message}`, 'error');
        process.exit(1);
    }
};

// Interactive mode
const startInteractiveMode = () => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.clear();
    console.log(colorize('\n=== IoT Rice Pest Spraying System - Interactive Health Monitor ===\n', 'info'));

    const showMenu = () => {
        console.log('\nAvailable commands:');
        console.log('  1. Run full health check');
        console.log('  2. Check backend API');
        console.log('  3. Check WebSocket server');
        console.log('  4. Check database');
        console.log('  5. Check frontend');
        console.log('  6. Check ESP32 integration');
        console.log('  7. Show current results');
        console.log('  v. Toggle verbose mode (current: ' + (config.verbose ? 'ON' : 'OFF') + ')');
        console.log('  q. Quit\n');
    };

    const processCommand = async (command) => {
        switch (command.trim().toLowerCase()) {
            case '1':
                await Promise.all([
                    checkBackendHealth(),
                    checkWebSocketHealth(),
                    checkDatabaseHealth(),
                    checkFrontendHealth(),
                    checkEsp32Integration()
                ]);
                updateSummary();
                printResults();
                break;
            case '2':
                await checkBackendHealth();
                updateSummary();
                printResults();
                break;
            case '3':
                await checkWebSocketHealth();
                updateSummary();
                printResults();
                break;
            case '4':
                await checkDatabaseHealth();
                updateSummary();
                printResults();
                break;
            case '5':
                await checkFrontendHealth();
                updateSummary();
                printResults();
                break;
            case '6':
                await checkEsp32Integration();
                updateSummary();
                printResults();
                break;
            case '7':
                updateSummary();
                printResults();
                break;
            case 'v':
                config.verbose = !config.verbose;
                console.log(colorize(`Verbose mode ${config.verbose ? 'enabled' : 'disabled'}`, 'info'));
                break;
            case 'q':
                console.log(colorize('Exiting...', 'info'));
                rl.close();
                process.exit(0);
                break;
            default:
                console.log(colorize('Unknown command', 'warning'));
        }
    };

    const promptUser = () => {
        showMenu();
        rl.question('Enter command: ', async (command) => {
            await processCommand(command);
            promptUser();
        });
    };

    promptUser();
};

// Check if in interactive mode
if (process.argv.includes('--interactive') || process.argv.includes('-i')) {
    startInteractiveMode();
} else {
    runHealthCheck();
}
