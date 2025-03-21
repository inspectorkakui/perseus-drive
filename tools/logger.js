/**
 * Perseus Drive Logger
 * 
 * Centralized logging utility for consistent, well-formatted logs
 * across all Perseus Drive components. Addresses console output
 * formatting issues identified in BUG-003.
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.printf(({ level, message, timestamp, component, agentId }) => {
  const componentStr = component ? `[${component}]` : '';
  const agentStr = agentId ? `[${agentId}]` : '';
  const prefix = `${timestamp} [${level.toUpperCase()}] ${componentStr} ${agentStr}`;
  
  // Add spacing to align all messages
  return `${prefix.padEnd(60)} ${message}`;
});

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'perseus-drive' },
  transports: [
    // Console transport with pretty formatting
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        consoleFormat
      )
    }),
    // File transport with detailed JSON logs
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log') 
    })
  ]
});

// Component-specific loggers
const createComponentLogger = (component) => {
  return {
    error: (message, meta = {}) => logger.error(message, { component, ...meta }),
    warn: (message, meta = {}) => logger.warn(message, { component, ...meta }),
    info: (message, meta = {}) => logger.info(message, { component, ...meta }),
    debug: (message, meta = {}) => logger.debug(message, { component, ...meta }),
    verbose: (message, meta = {}) => logger.verbose(message, { component, ...meta })
  };
};

// Agent-specific loggers
const createAgentLogger = (agentId, component = 'agent') => {
  return {
    error: (message, meta = {}) => logger.error(message, { component, agentId, ...meta }),
    warn: (message, meta = {}) => logger.warn(message, { component, agentId, ...meta }),
    info: (message, meta = {}) => logger.info(message, { component, agentId, ...meta }),
    debug: (message, meta = {}) => logger.debug(message, { component, agentId, ...meta }),
    verbose: (message, meta = {}) => logger.verbose(message, { component, agentId, ...meta })
  };
};

module.exports = {
  logger,
  createComponentLogger,
  createAgentLogger
}; 