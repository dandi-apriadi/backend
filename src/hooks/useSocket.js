import { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';

// Socket configuration - NO HARDCODE FALLBACK
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL;
const RECONNECT_ATTEMPTS = 5;
const RECONNECTION_DELAY_BASE = 1000;
const SOCKET_TIMEOUT = 5000; // 5 second connection timeout

export const useSocket = () => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState(null);
    const reconnectCountRef = useRef(0);
    const connectionTimeout = useRef(null);

    // Add a React-safe way to track the latest socket object
    const socketRef = useRef(null);

    // Function to handle connection timeouts
    const handleTimeout = useCallback(() => {
        console.log('Socket connection timeout');
        setIsConnected(false);
        setConnectionError('Connection timeout');

        // Try to reconnect
        if (socketRef.current) {
            try {
                socketRef.current.disconnect();
                setTimeout(() => {
                    socketRef.current.connect();
                }, 1000);
            } catch (e) {
                console.error('Error during reconnect:', e);
            }
        }
    }, []);

    useEffect(() => {
        console.log('Initializing socket connection to:', SOCKET_URL);

        // Create socket instance with better reconnection settings
        const socketInstance = io(SOCKET_URL, {
            reconnectionAttempts: RECONNECT_ATTEMPTS,
            reconnectionDelay: RECONNECTION_DELAY_BASE,
            reconnectionDelayMax: RECONNECTION_DELAY_BASE * 10,
            timeout: SOCKET_TIMEOUT,
            // Add transports specification for better compatibility
            transports: ['websocket', 'polling'],
            autoConnect: true,
            forceNew: false
        });

        // Update the ref immediately to prevent race conditions
        socketRef.current = socketInstance;

        // Set up event handlers for connection state
        socketInstance.on('connect', () => {
            console.log('Socket connected with ID:', socketInstance.id);
            setIsConnected(true);
            setConnectionError(null);
            reconnectCountRef.current = 0;

            // Clear any pending timeout
            if (connectionTimeout.current) {
                clearTimeout(connectionTimeout.current);
                connectionTimeout.current = null;
            }
        });

        socketInstance.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            setConnectionError(error.message);

            // Don't immediately set disconnected on first error
            reconnectCountRef.current += 1;

            // Only set disconnected after multiple failures
            if (reconnectCountRef.current > 1) {
                setIsConnected(false);
            }
        });

        socketInstance.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);

            // Don't set disconnected for certain recoverable disconnects
            if (reason === 'io server disconnect') {
                // The server closed the connection, so need to manually reconnect
                socketInstance.connect();
            } else if (reason !== 'io client disconnect') {
                // Don't set disconnected if this was an intentional disconnect
                setIsConnected(false);
            }
        });

        socketInstance.on('reconnect', (attemptNumber) => {
            console.log(`Socket reconnected after ${attemptNumber} attempts`);
            setIsConnected(true);
            reconnectCountRef.current = 0;
        });

        socketInstance.on('reconnect_failed', () => {
            console.error('Socket reconnection failed after max attempts');
            setIsConnected(false);
            setConnectionError('Maximum reconnection attempts reached');
        });

        // Set connection timeout
        connectionTimeout.current = setTimeout(handleTimeout, SOCKET_TIMEOUT);

        // Store the socket instance
        setSocket(socketInstance);

        // Cleanup on unmount
        return () => {
            console.log('Cleaning up socket connection');
            clearTimeout(connectionTimeout.current);
            socketInstance.disconnect();
        };
    }, [handleTimeout]);

    // Add manual reconnect function
    const reconnect = useCallback(() => {
        if (socket) {
            console.log('Manually reconnecting socket...');
            socket.disconnect();
            socket.connect();

            // Reset the timeout
            if (connectionTimeout.current) {
                clearTimeout(connectionTimeout.current);
            }
            connectionTimeout.current = setTimeout(handleTimeout, SOCKET_TIMEOUT);
        }
    }, [socket, handleTimeout]);

    return {
        socket,
        isConnected,
        connectionError,
        reconnect
    };
};

export default useSocket;
