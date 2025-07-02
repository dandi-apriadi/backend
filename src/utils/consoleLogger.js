// Console Logger Utility with deduplication
// Prevents repetitive console messages by tracking and replacing previous logs

class ConsoleLogger {
    constructor() {
        // Map to store last log messages for each identifier
        this.lastLogs = new Map();
        // Store original console methods
        this.originalConsole = {
            log: console.log.bind(console),
            warn: console.warn.bind(console),
            error: console.error.bind(console),
            info: console.info.bind(console)
        };
    }

    // Generic method to handle different console levels
    _logWithDeduplication(level, identifier, message, ...args) {
        const logKey = `${level}:${identifier}`;
        const currentMessage = typeof message === 'string' ? message : JSON.stringify(message);

        // Check if this is the same message as the last one
        const lastLog = this.lastLogs.get(logKey);
        if (lastLog && lastLog.message === currentMessage) {
            // Same message, don't log again
            return;
        }

        // Clear console if there was a previous message (optional, can be disabled)
        if (lastLog && lastLog.clearPrevious) {
            // For browser environments, we can't actually clear specific lines
            // But we can indicate message replacement
            this.originalConsole[level](`[REPLACED] ${identifier}:`, currentMessage, ...args);
        } else {
            this.originalConsole[level](`${identifier}:`, currentMessage, ...args);
        }

        // Store the current message
        this.lastLogs.set(logKey, {
            message: currentMessage,
            timestamp: Date.now(),
            clearPrevious: true
        });
    }

    // Public methods for different log levels
    log(identifier, message, ...args) {
        this._logWithDeduplication('log', identifier, message, ...args);
    }

    warn(identifier, message, ...args) {
        this._logWithDeduplication('warn', identifier, message, ...args);
    }

    error(identifier, message, ...args) {
        this._logWithDeduplication('error', identifier, message, ...args);
    }

    info(identifier, message, ...args) {
        this._logWithDeduplication('info', identifier, message, ...args);
    }

    // Method to force log (bypass deduplication)
    forceLog(level = 'log', identifier, message, ...args) {
        this.originalConsole[level](`[FORCED] ${identifier}:`, message, ...args);
    }

    // Clear stored logs for a specific identifier
    clearIdentifier(identifier) {
        for (const key of this.lastLogs.keys()) {
            if (key.includes(identifier)) {
                this.lastLogs.delete(key);
            }
        }
    }

    // Clear all stored logs
    clearAll() {
        this.lastLogs.clear();
    }

    // Get statistics about logging
    getStats() {
        return {
            totalIdentifiers: this.lastLogs.size,
            identifiers: Array.from(this.lastLogs.keys()).map(key => key.split(':')[1])
        };
    }
}

// Create singleton instance
const logger = new ConsoleLogger();

// Export convenience methods
export const logOnce = (identifier, message, ...args) => logger.log(identifier, message, ...args);
export const warnOnce = (identifier, message, ...args) => logger.warn(identifier, message, ...args);
export const errorOnce = (identifier, message, ...args) => logger.error(identifier, message, ...args);
export const infoOnce = (identifier, message, ...args) => logger.info(identifier, message, ...args);
export const forceLog = (level, identifier, message, ...args) => logger.forceLog(level, identifier, message, ...args);
export const clearLogs = (identifier) => logger.clearIdentifier(identifier);
export const clearAllLogs = () => logger.clearAll();
export const getLogStats = () => logger.getStats();

export default logger;
