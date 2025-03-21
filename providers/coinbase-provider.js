/**
 * Coinbase Provider
 * 
 * External data provider connector for Coinbase Pro API
 */

const BaseProvider = require('./base-provider');
const logger = require('../tools/logger');
const axios = require('axios');
const crypto = require('crypto');
const WebSocket = require('ws');

/**
 * Coinbase Pro API provider implementation
 */
class CoinbaseProvider extends BaseProvider {
  /**
   * Create a new Coinbase provider
   */
  constructor() {
    super('coinbase');
    
    this.baseRestUrl = 'https://api.exchange.coinbase.com';
    this.wsUrl = 'wss://ws-feed.exchange.coinbase.com';
    
    this.apiKey = null;
    this.apiSecret = null;
    this.apiPassphrase = null;
    
    this.wsConnection = null;
    this.subscriptions = new Map();
    this.channelTypes = ['ticker', 'level2', 'matches'];
    
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
    
    this.logger.info('Coinbase provider created');
  }
  
  /**
   * Initialize the provider with API credentials
   * @param {Object} options - Provider options
   * @param {string} options.apiKey - Coinbase API key
   * @param {string} options.apiSecret - Coinbase API secret
   * @param {string} options.apiPassphrase - Coinbase API passphrase
   * @returns {Promise<boolean>} Initialization success
   */
  async initialize(options = {}) {
    try {
      this.apiKey = options.apiKey;
      this.apiSecret = options.apiSecret;
      this.apiPassphrase = options.apiPassphrase;
      
      // Verify credentials if provided
      if (this.apiKey && this.apiSecret && this.apiPassphrase) {
        try {
          // Test API connection by getting server time
          const response = await this._makeRequest('GET', '/time');
          this.logger.info(`Coinbase provider connected, server time: ${response.data.iso}`);
          this.isAuthenticated = true;
        } catch (error) {
          this.logger.error('Failed to authenticate with Coinbase:', error.message);
          this.isAuthenticated = false;
        }
      } else {
        this.logger.warn('Coinbase provider initialized without authentication');
        this.isAuthenticated = false;
      }
      
      this.initialized = true;
      this.logger.info('Coinbase provider initialized');
      return true;
    } catch (error) {
      this.logger.error('Error initializing Coinbase provider:', error);
      return false;
    }
  }
  
  /**
   * Get current market data for specified symbols
   * @param {string[]} symbols - Array of market symbols (e.g. ['BTC-USD'])
   * @returns {Promise<Object[]>} Array of market data objects
   */
  async getMarketData(symbols = []) {
    try {
      if (!this.initialized) {
        throw new Error('Provider not initialized');
      }
      
      const marketData = [];
      
      // Process each symbol
      for (const symbol of symbols) {
        try {
          // Get ticker data
          const tickerResponse = await this._makeRequest('GET', `/products/${symbol}/ticker`);
          
          // Get 24hr stats
          const statsResponse = await this._makeRequest('GET', `/products/${symbol}/stats`);
          
          // Combined data
          const rawData = {
            symbol,
            price: parseFloat(tickerResponse.data.price),
            bid: parseFloat(tickerResponse.data.bid),
            ask: parseFloat(tickerResponse.data.ask),
            volume: parseFloat(statsResponse.data.volume),
            high24h: parseFloat(statsResponse.data.high),
            low24h: parseFloat(statsResponse.data.low),
            open24h: parseFloat(statsResponse.data.open),
            timestamp: new Date(tickerResponse.data.time).getTime()
          };
          
          // Normalize the data
          const normalizedData = this._normalizeMarketData(rawData);
          marketData.push(normalizedData);
        } catch (error) {
          this.logger.error(`Error fetching market data for ${symbol}:`, error.message);
        }
      }
      
      return marketData;
    } catch (error) {
      this.logger.error('Error in getMarketData:', error);
      throw error;
    }
  }
  
  /**
   * Get historical data for a symbol
   * @param {string} symbol - Market symbol (e.g. 'BTC-USD')
   * @param {Object} options - Query options
   * @param {string} options.granularity - Timeframe in seconds (60, 300, 900, 3600, 21600, 86400)
   * @param {number} options.startTime - Start time in milliseconds
   * @param {number} options.endTime - End time in milliseconds
   * @returns {Promise<Object[]>} Array of historical data points
   */
  async getHistoricalData(symbol, options = {}) {
    try {
      if (!this.initialized) {
        throw new Error('Provider not initialized');
      }
      
      // Coinbase requires granularity in seconds
      const granularity = options.granularity || 3600; // Default to 1 hour
      
      // Convert timestamps to ISO strings
      const startTime = options.startTime ? new Date(options.startTime).toISOString() : undefined;
      const endTime = options.endTime ? new Date(options.endTime).toISOString() : undefined;
      
      // Build query parameters
      const params = { granularity };
      if (startTime) params.start = startTime;
      if (endTime) params.end = endTime;
      
      // Make API request
      const response = await this._makeRequest('GET', `/products/${symbol}/candles`, params);
      
      // Process and normalize the response
      // Coinbase returns: [timestamp, low, high, open, close, volume]
      const rawData = response.data.map(candle => ({
        timestamp: candle[0] * 1000, // Convert to milliseconds
        low: candle[1],
        high: candle[2],
        open: candle[3],
        close: candle[4],
        volume: candle[5],
        symbol
      }));
      
      // Normalize the data
      const normalizedData = rawData.map(candle => this._normalizeHistoricalData(candle));
      
      return normalizedData;
    } catch (error) {
      this.logger.error(`Error in getHistoricalData for ${symbol}:`, error);
      throw error;
    }
  }
  
  /**
   * Subscribe to real-time market data
   * @param {string[]} symbols - Array of market symbols
   * @param {string} channel - Channel type ('ticker', 'level2', 'matches')
   * @param {Function} callback - Callback function for data events
   * @returns {Promise<boolean>} Subscription success
   */
  async subscribeToMarketData(symbols, channel, callback) {
    try {
      if (!this.initialized) {
        throw new Error('Provider not initialized');
      }
      
      if (!this.channelTypes.includes(channel)) {
        throw new Error(`Invalid channel type: ${channel}. Must be one of: ${this.channelTypes.join(', ')}`);
      }
      
      // Connect WebSocket if not already connected
      if (!this.wsConnection) {
        await this._connectWebSocket();
      }
      
      // Store subscription
      const subscriptionKey = `${channel}-${symbols.join('-')}`;
      this.subscriptions.set(subscriptionKey, {
        symbols,
        channel,
        callback
      });
      
      // Send subscription message
      const subscriptionMessage = {
        type: 'subscribe',
        product_ids: symbols,
        channels: [channel]
      };
      
      // Add authentication if available
      if (this.isAuthenticated) {
        const timestamp = Math.floor(Date.now() / 1000);
        const signature = this._generateWebSocketSignature(timestamp, 'GET', '/users/self/verify', '');
        
        subscriptionMessage.signature = signature;
        subscriptionMessage.key = this.apiKey;
        subscriptionMessage.passphrase = this.apiPassphrase;
        subscriptionMessage.timestamp = timestamp;
      }
      
      this.wsConnection.send(JSON.stringify(subscriptionMessage));
      this.logger.info(`Subscribed to ${channel} for symbols: ${symbols.join(', ')}`);
      
      return true;
    } catch (error) {
      this.logger.error('Error in subscribeToMarketData:', error);
      return false;
    }
  }
  
  /**
   * Unsubscribe from real-time data
   * @param {string[]} symbols - Array of market symbols
   * @param {string} channel - Channel type
   * @returns {Promise<boolean>} Unsubscription success
   */
  async unsubscribeFromMarketData(symbols, channel) {
    try {
      if (!this.wsConnection || !this.connected) {
        return true; // Already disconnected
      }
      
      // Find the subscription
      const subscriptionKey = `${channel}-${symbols.join('-')}`;
      const subscription = this.subscriptions.get(subscriptionKey);
      
      if (!subscription) {
        this.logger.warn(`No active subscription found for ${channel} on symbols: ${symbols.join(', ')}`);
        return true;
      }
      
      // Send unsubscribe message
      const unsubscribeMessage = {
        type: 'unsubscribe',
        product_ids: symbols,
        channels: [channel]
      };
      
      this.wsConnection.send(JSON.stringify(unsubscribeMessage));
      
      // Remove from subscriptions map
      this.subscriptions.delete(subscriptionKey);
      
      this.logger.info(`Unsubscribed from ${channel} for symbols: ${symbols.join(', ')}`);
      return true;
    } catch (error) {
      this.logger.error('Error in unsubscribeFromMarketData:', error);
      return false;
    }
  }
  
  /**
   * Close the provider and clean up resources
   * @returns {Promise<boolean>} Disconnection success
   */
  async disconnect() {
    try {
      // Close WebSocket connection if open
      if (this.wsConnection) {
        // Close all subscriptions
        const unsubscribePromises = [];
        for (const [key, subscription] of this.subscriptions.entries()) {
          unsubscribePromises.push(
            this.unsubscribeFromMarketData(subscription.symbols, subscription.channel)
          );
        }
        
        await Promise.all(unsubscribePromises);
        
        this.wsConnection.terminate();
        this.wsConnection = null;
        this.connected = false;
      }
      
      this.subscriptions.clear();
      this.logger.info('Coinbase provider disconnected');
      return true;
    } catch (error) {
      this.logger.error('Error disconnecting Coinbase provider:', error);
      return false;
    }
  }
  
  /**
   * Make a signed REST API request to Coinbase
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} API response
   * @private
   */
  async _makeRequest(method, endpoint, params = {}) {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const url = `${this.baseRestUrl}${endpoint}`;
      
      // Build query string
      const queryString = Object.keys(params).length
        ? '?' + new URLSearchParams(params).toString()
        : '';
      
      // Request options
      const options = {
        method,
        url: url + queryString,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Perseus-Drive-Trading-Bot'
        }
      };
      
      // Add authentication headers if available
      if (this.isAuthenticated) {
        const signature = this._generateRESTSignature(
          timestamp,
          method,
          endpoint + queryString,
          ''
        );
        
        options.headers['CB-ACCESS-KEY'] = this.apiKey;
        options.headers['CB-ACCESS-SIGN'] = signature;
        options.headers['CB-ACCESS-TIMESTAMP'] = timestamp;
        options.headers['CB-ACCESS-PASSPHRASE'] = this.apiPassphrase;
      }
      
      // Make the request
      const response = await axios(options);
      
      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers['retry-after'] || '5', 10);
        this.logger.warn(`Rate limited by Coinbase, waiting ${retryAfter * 1000}ms before retrying`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return this._makeRequest(method, endpoint, params);
      }
      
      return response;
    } catch (error) {
      this.logger.error('Coinbase API request failed:', error.message);
      throw error;
    }
  }
  
  /**
   * Connect to Coinbase WebSocket feed
   * @returns {Promise<boolean>} Connection success
   * @private
   */
  async _connectWebSocket() {
    return new Promise((resolve, reject) => {
      try {
        this.wsConnection = new WebSocket(this.wsUrl);
        
        this.wsConnection.onopen = () => {
          this.connected = true;
          this.reconnectAttempts = 0;
          this.logger.info('Coinbase WebSocket connected');
          
          // Resubscribe to all active subscriptions
          this._resubscribeAll();
        };
        
        this.wsConnection.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this._handleWebSocketMessage(message);
          } catch (error) {
            this.logger.error('Error processing WebSocket message:', error);
          }
        };
        
        this.wsConnection.onerror = (error) => {
          this.logger.error('Coinbase WebSocket error:', error);
          this.connected = false;
        };
        
        this.wsConnection.onclose = () => {
          this.connected = false;
          this.logger.info('Coinbase WebSocket connection closed');
          this._handleWebSocketReconnect();
        };
        
        resolve(true);
      } catch (error) {
        this.logger.error('Error connecting to Coinbase WebSocket:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Handle WebSocket reconnection logic
   * @private
   */
  _handleWebSocketReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error(`Maximum reconnect attempts (${this.maxReconnectAttempts}) reached`);
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts) + Math.random() * 1000,
      30000 // Max 30 seconds
    );
    
    this.logger.info(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(async () => {
      try {
        await this._connectWebSocket();
      } catch (error) {
        this.logger.error('Error during WebSocket reconnection:', error);
        this._handleWebSocketReconnect();
      }
    }, delay);
  }
  
  /**
   * Handle incoming WebSocket messages
   * @param {Object} message - WebSocket message
   * @private
   */
  _handleWebSocketMessage(message) {
    // Handle subscription confirmations
    if (message.type === 'subscriptions') {
      this.logger.debug('Coinbase subscription confirmed:', message.channels);
      return;
    }
    
    // Handle error messages
    if (message.type === 'error') {
      this.logger.error('Coinbase WebSocket error:', message.message);
      return;
    }
    
    // Handle data messages
    const channel = message.type || message.channel;
    
    // Find relevant subscriptions
    for (const [key, subscription] of this.subscriptions.entries()) {
      if (
        subscription.channel === channel &&
        subscription.symbols.includes(message.product_id)
      ) {
        // Normalize message before sending to callback
        const normalizedMessage = this._normalizeWebSocketMessage(message);
        subscription.callback(normalizedMessage);
        return;
      }
    }
  }
  
  /**
   * Generate signature for REST API requests
   * @param {number} timestamp - UNIX timestamp
   * @param {string} method - HTTP method
   * @param {string} path - Request path with query string
   * @param {string} body - Request body
   * @returns {string} Base64-encoded signature
   * @private
   */
  _generateRESTSignature(timestamp, method, path, body) {
    const message = `${timestamp}${method}${path}${body}`;
    const key = Buffer.from(this.apiSecret, 'base64');
    const hmac = crypto.createHmac('sha256', key);
    return hmac.update(message).digest('base64');
  }
  
  /**
   * Generate signature for WebSocket authentication
   * @param {number} timestamp - UNIX timestamp
   * @param {string} method - HTTP method
   * @param {string} path - Request path with query string
   * @param {string} body - Request body
   * @returns {string} Base64-encoded signature
   * @private
   */
  _generateWebSocketSignature(timestamp, method, path, body) {
    return this._generateRESTSignature(timestamp, method, path, body);
  }
  
  /**
   * Normalize market data to standard format
   * @param {Object} rawData - Raw market data from Coinbase
   * @returns {Object} Normalized market data
   * @private
   */
  _normalizeMarketData(rawData) {
    // Extract the relevant fields and normalize to the standard format
    return {
      provider: 'coinbase',
      symbol: rawData.id,
      price: parseFloat(rawData.price),
      bid: parseFloat(rawData.best_bid),
      ask: parseFloat(rawData.best_ask),
      volume24h: parseFloat(rawData.volume_24h),
      high24h: parseFloat(rawData.high_24h),
      low24h: parseFloat(rawData.low_24h),
      timestamp: new Date(rawData.time).getTime(),
      rawData: rawData
    };
  }
  
  /**
   * Normalize historical data to standard format
   * @param {Array} rawCandles - Raw candle data from Coinbase
   * @returns {Array} Normalized candle data
   * @private
   */
  _normalizeHistoricalData(rawCandles) {
    return rawCandles.map(candle => ({
      provider: 'coinbase',
      timestamp: new Date(candle.start).getTime(),
      open: parseFloat(candle.open),
      high: parseFloat(candle.high),
      low: parseFloat(candle.low),
      close: parseFloat(candle.close),
      volume: parseFloat(candle.volume),
      rawData: candle
    }));
  }
  
  /**
   * Normalize WebSocket message to standard format
   * @param {Object} message - Raw WebSocket message
   * @returns {Object} Normalized message data
   * @private
   */
  _normalizeWebSocketMessage(message) {
    if (message.type === 'ticker') {
      return {
        provider: 'coinbase',
        type: 'ticker',
        symbol: message.product_id,
        price: parseFloat(message.price),
        side: message.side,
        timestamp: new Date(message.time).getTime(),
        rawData: message
      };
    }
    
    if (message.type === 'match' || message.type === 'last_match') {
      return {
        provider: 'coinbase',
        type: 'trade',
        symbol: message.product_id,
        price: parseFloat(message.price),
        size: parseFloat(message.size),
        side: message.side,
        timestamp: new Date(message.time).getTime(),
        tradeId: message.trade_id,
        rawData: message
      };
    }
    
    return null;
  }
}

module.exports = new CoinbaseProvider(); 