/**
 * Base Provider Interface
 * 
 * Abstract base class for all external data provider implementations.
 * Defines the standard interface that all provider connectors must implement.
 */

const EventEmitter = require('events');
const logger = require('../tools/logger');

class BaseProvider extends EventEmitter {
  /**
   * Create a new data provider connector
   * @param {string} id - Provider identifier
   */
  constructor(id) {
    super();
    this.id = id;
    this.connected = false;
    this.rateLimits = {
      maxRequests: 0,
      perTimeWindow: 0,
      remaining: 0,
      resetTime: null
    };
    this.logger = logger.createComponentLogger(`provider-${id}`);
    this.logger.info(`Provider ${id} created`);
  }
  
  /**
   * Initialize the provider connection
   * Must be implemented by subclasses
   * @param {Object} config - Provider-specific configuration
   * @returns {Promise<boolean>} Connection success
   */
  async initialize(config) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Get current market data for a symbol
   * Must be implemented by subclasses
   * @param {string} symbol - Market symbol
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Market data
   */
  async getMarketData(symbol, options = {}) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Get historical market data
   * Must be implemented by subclasses
   * @param {string} symbol - Market symbol
   * @param {string} timeframe - Candle timeframe
   * @param {Object} options - Request options
   * @returns {Promise<Array>} Historical data
   */
  async getHistoricalData(symbol, timeframe, options = {}) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Subscribe to real-time data
   * Must be implemented by subclasses
   * @param {string} symbol - Market symbol
   * @param {string} channel - Data channel
   * @returns {Promise<boolean>} Subscription success
   */
  async subscribe(symbol, channel) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Unsubscribe from real-time data
   * Must be implemented by subclasses
   * @param {string} symbol - Market symbol
   * @param {string} channel - Data channel
   * @returns {Promise<boolean>} Unsubscription success
   */
  async unsubscribe(symbol, channel) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Check connection status
   * @returns {boolean} Connection status
   */
  isConnected() {
    return this.connected;
  }
  
  /**
   * Get available rate limit information
   * @returns {Object} Rate limit info
   */
  getRateLimits() {
    return this.rateLimits;
  }
  
  /**
   * Update rate limit tracking
   * @param {Object} limits - New limit information
   * @protected
   */
  _updateRateLimits(limits) {
    this.rateLimits = { ...this.rateLimits, ...limits };
    
    // Emit event if we're close to hitting rate limits
    if (this.rateLimits.remaining && this.rateLimits.remaining < this.rateLimits.maxRequests * 0.1) {
      this.emit('rate-limit-warning', this.rateLimits);
      this.logger.warn(`Rate limit warning: ${this.rateLimits.remaining}/${this.rateLimits.maxRequests} remaining`);
    }
  }
  
  /**
   * Handle connection errors
   * @param {Error} error - Connection error
   * @protected
   */
  _handleConnectionError(error) {
    this.connected = false;
    this.logger.error(`Connection error for provider ${this.id}:`, error);
    this.emit('connection-error', error);
  }
  
  /**
   * Normalize market data to standard format
   * @param {Object} data - Provider-specific data format
   * @returns {Object} Normalized data
   * @protected
   */
  _normalizeMarketData(data) {
    // Default implementation - should be overridden by providers
    return data;
  }
}

module.exports = BaseProvider; 