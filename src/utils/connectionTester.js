/**
 * Connection Tester
 * Tests actual connectivity to backend services
 */

import { API_CONFIG } from '../config/apiConfig';

export class ConnectionTester {
    constructor() {
        this.results = {
            backend: { status: 'pending', message: '', timestamp: null },
            websocket: { status: 'pending', message: '', timestamp: null },
            database: { status: 'pending', message: '', timestamp: null }
        };
    }

    /**
     * Test all connections
     */
    async testAll() {
        console.group('🔌 Connection Testing');

        const tests = [
            this.testBackendAPI(),
            this.testWebSocketConnection(),
            this.testDatabaseConnection()
        ];

        await Promise.allSettled(tests);

        this.displayResults();
        console.groupEnd();

        return this.results;
    }

    /**
     * Test backend API connection
     */
    async testBackendAPI() {
        console.log('Testing Backend API...');

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`${API_CONFIG.BASE_URL}/api/ping`, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                this.results.backend = {
                    status: 'success',
                    message: `Connected successfully (${response.status})`,
                    timestamp: new Date().toLocaleTimeString(),
                    data
                };
                console.log('✅ Backend API: Connected');
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            this.results.backend = {
                status: 'error',
                message: error.name === 'AbortError' ? 'Connection timeout' : error.message,
                timestamp: new Date().toLocaleTimeString()
            };
            console.log('❌ Backend API:', this.results.backend.message);
        }
    }

    /**
     * Test WebSocket connection
     */
    async testWebSocketConnection() {
        return new Promise((resolve) => {
            console.log('Testing WebSocket...');

            try {
                const wsUrl = API_CONFIG.SOCKET_URL.replace('http', 'ws') + API_CONFIG.WS_ENDPOINT;
                const ws = new WebSocket(wsUrl);

                const timeout = setTimeout(() => {
                    ws.close();
                    this.results.websocket = {
                        status: 'error',
                        message: 'Connection timeout',
                        timestamp: new Date().toLocaleTimeString()
                    };
                    console.log('❌ WebSocket: Timeout');
                    resolve();
                }, 5000);

                ws.onopen = () => {
                    clearTimeout(timeout);
                    this.results.websocket = {
                        status: 'success',
                        message: 'Connected successfully',
                        timestamp: new Date().toLocaleTimeString()
                    };
                    console.log('✅ WebSocket: Connected');
                    ws.close();
                    resolve();
                };

                ws.onerror = (error) => {
                    clearTimeout(timeout);
                    this.results.websocket = {
                        status: 'error',
                        message: 'Connection failed',
                        timestamp: new Date().toLocaleTimeString()
                    };
                    console.log('❌ WebSocket: Failed');
                    resolve();
                };

            } catch (error) {
                this.results.websocket = {
                    status: 'error',
                    message: error.message,
                    timestamp: new Date().toLocaleTimeString()
                };
                console.log('❌ WebSocket:', error.message);
                resolve();
            }
        });
    }

    /**
     * Test database connection through API
     */
    async testDatabaseConnection() {
        console.log('Testing Database (via API)...');

        try {
            const response = await fetch(`${API_CONFIG.API_URL}/health`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.results.database = {
                    status: 'success',
                    message: 'Database accessible via API',
                    timestamp: new Date().toLocaleTimeString(),
                    data
                };
                console.log('✅ Database: Accessible');
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            this.results.database = {
                status: 'warning',
                message: 'Unable to test database connection',
                timestamp: new Date().toLocaleTimeString()
            };
            console.log('⚠️ Database: Cannot test (endpoint may not exist)');
        }
    }

    /**
     * Display test results
     */
    displayResults() {
        console.group('📊 Connection Test Results');

        Object.entries(this.results).forEach(([service, result]) => {
            const icon = result.status === 'success' ? '✅' :
                result.status === 'error' ? '❌' : '⚠️';

            console.log(`${icon} ${service.toUpperCase()}: ${result.message} (${result.timestamp})`);
        });

        const allSuccess = Object.values(this.results).every(r => r.status === 'success');

        if (allSuccess) {
            console.log('\n🎉 All connections successful!');
        } else {
            console.log('\n🚨 Some connections failed. Check your backend server.');
        }

        console.groupEnd();
    }

    /**
     * Get connection summary
     */
    getSummary() {
        const total = Object.keys(this.results).length;
        const successful = Object.values(this.results).filter(r => r.status === 'success').length;
        const failed = Object.values(this.results).filter(r => r.status === 'error').length;

        return {
            total,
            successful,
            failed,
            successRate: Math.round((successful / total) * 100),
            allSuccess: failed === 0
        };
    }
}

// Create and export instance
export const connectionTester = new ConnectionTester();

export default connectionTester;
