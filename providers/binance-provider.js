/**
 * Binance Provider
 * 
 * Implements the external data provider interface for Binance exchange.
 * Handles market data retrieval, websocket connections, and API rate limiting.
 */

const axios = require('axios');
const WebSocket = require('ws');
const BaseProvider = require('./base-provider');
const crypto = require('crypto');

class BinanceProvider extends BaseProvider {
  constructor() {
    super('binance');
    
    // Binance-specific properties
    this.baseUrl = 'https://api.binance.com';
    this.websocketUrl = 'wss://stream.binance.com:9443/ws';
    this.apiKey = null;
    this.apiSecret = null;
    this.subscriptions = new Map();
    this.websocket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    
    // Update rate limits with Binance defaults
    this._updateRateLimits({
      maxRequests: 1200,
      perTimeWindow: 60 * 1000, // 1 minute
      remaining: 1200,
      resetTime: Date.now() + 60 * 1000
    });
  }
  
  /**
   * Initialize the provider connection
   * @param {Object} config - Provider configuration
   * @param {string} config.apiKey - Binance API key
   * @param {string} config.apiSecret - Binance API secret
   * @param {boolean} config.useTestnet - Use testnet instead of production
   * @returns {Promise<boolean>} Connection success
   */
  async initialize(config = {}) {
    try {
      this.logger.info('Initializing Binance provider...');
      
      // Store configuration
      this.apiKey = config.apiKey;
      this.apiSecret = config.apiSecret;
      
      // Update URLs based on testnet configuration
      if (config.useTestnet) {
        this.baseUrl = 'https://testnet.binance.vision';
        this.websocketUrl = 'wss://testnet.binance.vision/ws';
        this.logger.info('Using Binance testnet');
      }
      
      // Test connection by getting exchange info
      const response = await this._makeRequest('/api/v3/exchangeInfo', 'GET');
      
      if (response && response.data && response.data.symbols) {
        this.connected = true;
        this.logger.info('Binance provider initialized successfully');
        
        // Extract rate limits from response
        if (response.data.rateLimits) {
          const requestLimit = response.data.rateLimits.find(
            limit => limit.rateLimitType === 'REQUEST_WEIGHT'
          );
          
          if (requestLimit) {
            this._updateRateLimits({
              maxRequests: requestLimit.limit,
              perTimeWindow: requestLimit.intervalNum * 
                (requestLimit.interval === 'MINUTE' ? 60 * 1000 : 1000)
            });
          }
        }
        
        return true;
      } else {
        this.logger.error('Failed to initialize Binance provider: Invalid response');
        this.connected = false;
        return false;
      }
    } catch (error) {
      this._handleConnectionError(error);
      return false;
    }
  }
  
  /**
   * Get current market data for a symbol
   * @param {string} symbol - Market symbol (e.g., 'BTCUSDT')
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Market data
   */
  async getMarketData(symbol, options = {}) {
    try {
      this.logger.debug(`Getting market data for ${symbol}`);
      
      // Ensure symbol is properly formatted for Binance
      const formattedSymbol = this._formatSymbol(symbol);
      
      // Get ticker data
      const tickerResponse = await this._makeRequest('/api/v3/ticker/24hr', 'GET', {
        symbol: formattedSymbol
      });
      
      // Get order book data if requested
      let orderBook = null;
      if (options.includeOrderBook) {
        const orderBookResponse = await this._makeRequest('/api/v3/depth', 'GET', {
          symbol: formattedSymbol,
          limit: options.orderBookLimit || 20
        });
        orderBook = orderBookResponse.data;
      }
      
      // Get recent trades if requested
      let recentTrades = null;
      if (options.includeRecentTrades) {
        const tradesResponse = await this._makeRequest('/api/v3/trades', 'GET', {
          symbol: formattedSymbol,
          limit: options.tradesLimit || 50
        });
        recentTrades = tradesResponse.data;
      }
      
      // Normalize the response
      const marketData = this._normalizeMarketData({
        ticker: tickerResponse.data,
        orderBook,
        recentTrades,
        timestamp: new Date().toISOString()
      });
      
      return marketData;
    } catch (error) {
      this.logger.error(`Error getting market data for ${symbol}:`, error);
      throw error;
    }
  }
  
  /**
   * Get historical market data
   * @param {string} symbol - Market symbol (e.g., 'BTCUSDT')
   * @param {string} timeframe - Candle timeframe (e.g., '1h', '15m')
   * @param {Object} options - Request options
   * @param {number} options.limit - Number of candles to retrieve
   * @param {number|string} options.startTime - Start time in ms or ISO string
   * @param {number|string} options.endTime - End time in ms or ISO string
   * @returns {Promise<Array>} Historical data
   */
  async getHistoricalData(symbol, timeframe, options = {}) {
    try {
      this.logger.debug(`Getting historical data for ${symbol} (${timeframe})`);
      
      // Ensure symbol is properly formatted for Binance
      const formattedSymbol = this._formatSymbol(symbol);
      
      // Convert timeframe to Binance interval format
      const interval = this._formatTimeframe(timeframe);
      
      // Prepare request parameters
      const params = {
        symbol: formattedSymbol,
        interval: interval,
        limit: options.limit || 500  // Max 1000, default 500
      };
      
      // Add optional parameters if provided
      if (options.startTime) {
        params.startTime = typeof options.startTime === 'string' 
          ? new Date(options.startTime).getTime() 
          : options.startTime;
      }
      
      if (options.endTime) {
        params.endTime = typeof options.endTime === 'string' 
          ? new Date(options.endTime).getTime() 
          : options.endTime;
      }
      
      // Make the request
      const response = await this._makeRequest('/api/v3/klines', 'GET', params);
      
      // Normalize the response
      const historicalData = this._normalizeHistoricalData(response.data, symbol);
      
      return historicalData;
    } catch (error) {
      this.logger.error(`Error getting historical data for ${symbol}:`, error);
      throw error;
    }
  }
  
  /**
   * Subscribe to real-time data
   * @param {string} symbol - Market symbol (e.g., 'BTCUSDT')
   * @param {string} channel - Data channel ('ticker', 'kline', 'depth', 'trade')
   * @param {Object} options - Subscription options
   * @param {string} options.interval - Kline interval (required for 'kline' channel)
   * @returns {Promise<boolean>} Subscription success
   */
  async subscribe(symbol, channel, options = {}) {
    try {
      this.logger.debug(`Subscribing to ${channel} for ${symbol}`);
      
      // Ensure symbol is properly formatted for Binance (lowercase, no separator)
      const formattedSymbol = this._formatSymbol(symbol).toLowerCase();
      
      // Create subscription ID
      const subscriptionId = `${formattedSymbol}_${channel}`;
      
      // Check if already subscribed
      if (this.subscriptions.has(subscriptionId)) {
        this.logger.debug(`Already subscribed to ${subscriptionId}`);
        return true;
      }
      
      // Create websocket if it doesn't exist
      await this._ensureWebsocket();
      
      // Determine the stream name based on channel
      let streamName;
      switch (channel) {
        case 'ticker':
          streamName = `${formattedSymbol}@ticker`;
          break;
        case 'kline':
          if (!options.interval) {
            throw new Error('Interval is required for kline subscription');
          }
          streamName = `${formattedSymbol}@kline_${this._formatTimeframe(options.interval)}`;
          break;
        case 'depth':
          streamName = `${formattedSymbol}@depth`;
          break;
        case 'trade':
          streamName = `${formattedSymbol}@trade`;
          break;
        default:
          throw new Error(`Unsupported channel: ${channel}`);
      }
      
      // Subscribe to the stream
      this.websocket.send(JSON.stringify({
        method: 'SUBSCRIBE',
        params: [streamName],
        id: Date.now()
      }));
      
      // Store subscription
      this.subscriptions.set(subscriptionId, { streamName, options });
      
      this.logger.info(`Subscribed to ${streamName}`);
      return true;
    } catch (error) {
      this.logger.error(`Error subscribing to ${channel} for ${symbol}:`, error);
      return false;
    }
  }
  
  /**
   * Unsubscribe from real-time data
   * @param {string} symbol - Market symbol
   * @param {string} channel - Data channel
   * @returns {Promise<boolean>} Unsubscription success
   */
  async unsubscribe(symbol, channel) {
    try {
      // Ensure symbol is properly formatted for Binance
      const formattedSymbol = this._formatSymbol(symbol).toLowerCase();
      
      // Create subscription ID
      const subscriptionId = `${formattedSymbol}_${channel}`;
      
      // Check if subscribed
      if (!this.subscriptions.has(subscriptionId)) {
        this.logger.debug(`Not subscribed to ${subscriptionId}`);
        return true;
      }
      
      // If websocket exists and is connected
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        const { streamName } = this.subscriptions.get(subscriptionId);
        
        // Unsubscribe from the stream
        this.websocket.send(JSON.stringify({
          method: 'UNSUBSCRIBE',
          params: [streamName],
          id: Date.now()
        }));
        
        // Remove subscription
        this.subscriptions.delete(subscriptionId);
        
        this.logger.info(`Unsubscribed from ${streamName}`);
        return true;
      } else {
        // Websocket not connected, just remove the subscription
        this.subscriptions.delete(subscriptionId);
        return true;
      }
    } catch (error) {
      this.logger.error(`Error unsubscribing from ${channel} for ${symbol}:`, error);
      return false;
    }
  }
  
  /**
   * Make an API request to Binance
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method
   * @param {Object} params - Request parameters
   * @param {boolean} secured - Whether this requires API key authentication
   * @returns {Promise<Object>} Response object
   * @private
   */
  async _makeRequest(endpoint, method, params = {}, secured = false) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers = {};
      let queryString = '';
      
      // Prepare query parameters
      if (Object.keys(params).length > 0) {
        queryString = Object.entries(params)
          .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
          .join('&');
      }
      
      // Add authentication if required
      if (secured) {
        if (!this.apiKey || !this.apiSecret) {
          throw new Error('API key and secret required for secured endpoints');
        }
        
        // Add timestamp
        const timestamp = Date.now();
        queryString = queryString 
          ? `${queryString}&timestamp=${timestamp}` 
          : `timestamp=${timestamp}`;
        
        // Create signature
        const signature = crypto
          .createHmac('sha256', this.apiSecret)
          .update(queryString)
          .digest('hex');
        
        // Add signature to query string
        queryString = `${queryString}&signature=${signature}`;
        
        // Add API key to headers
        headers['X-MBX-APIKEY'] = this.apiKey;
      }
      
      // Make request
      const requestUrl = queryString ? `${url}?${queryString}` : url;
      const response = await axios({
        method,
        url: requestUrl,
        headers
      });
      
      // Update rate limits from response headers
      if (response.headers && response.headers['x-mbx-used-weight']) {
        const usedWeight = parseInt(response.headers['x-mbx-used-weight']);
        this._updateRateLimits({
          remaining: this.rateLimits.maxRequests - usedWeight
        });
      }
      
      return response;
    } catch (error) {
      // Handle rate limit errors
      if (error.response && error.response.status === 429) {
        this.logger.warn('Rate limit exceeded');
        this._updateRateLimits({
          remaining: 0,
          resetTime: Date.now() + 60 * 1000 // Assume 1 minute window
        });
        this.emit('rate-limit-warning', this.rateLimits);
      }
      
      throw error;
    }
  }
  
  /**
   * Ensure websocket connection is established
   * @returns {Promise<void>}
   * @private
   */
  async _ensureWebsocket() {
    // If websocket already exists and is open, return
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      return;
    }
    
    // If websocket exists but is not open, close it
    if (this.websocket) {
      try {
        this.websocket.terminate();
      } catch (e) {
        // Ignore errors on close
      }
    }
    
    // Create new websocket
    this.websocket = new WebSocket(this.websocketUrl);
    
    // Set up event handlers
    this.websocket.on('open', () => {
      this.logger.info('Binance websocket connected');
      this.reconnectAttempts = 0;
      
      // Resubscribe to all streams
      for (const [subscriptionId, { streamName }] of this.subscriptions) {
        this.logger.debug(`Resubscribing to ${streamName}`);
        this.websocket.send(JSON.stringify({
          method: 'SUBSCRIBE',
          params: [streamName],
          id: Date.now()
        }));
      }
    });
    
    this.websocket.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        
        // Ignore subscription confirmation messages
        if (message.result === null && message.id) {
          return;
        }
        
        // Process the data
        this._processWebsocketMessage(message);
      } catch (error) {
        this.logger.error('Error processing websocket message:', error);
      }
    });
    
    this.websocket.on('error', (error) => {
      this.logger.error('Binance websocket error:', error);
      this.emit('websocket-error', error);
    });
    
    this.websocket.on('close', () => {
      this.logger.warn('Binance websocket disconnected');
      
      // Attempt to reconnect
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        
        this.logger.info(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
        
        setTimeout(() => {
          this._ensureWebsocket().catch(err => {
            this.logger.error('Error reconnecting websocket:', err);
          });
        }, delay);
      } else {
        this.logger.error(`Failed to reconnect after ${this.maxReconnectAttempts} attempts`);
        this.emit('connection-error', new Error('Websocket reconnection failed'));
      }
    });
    
    // Wait for connection or error
    return new Promise((resolve, reject) => {
      const onOpen = () => {
        this.websocket.removeListener('error', onError);
        resolve();
      };
      
      const onError = (error) => {
        this.websocket.removeListener('open', onOpen);
        reject(error);
      };
      
      this.websocket.once('open', onOpen);
      this.websocket.once('error', onError);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        this.websocket.removeListener('open', onOpen);
        this.websocket.removeListener('error', onError);
        reject(new Error('Websocket connection timeout'));
      }, 10000);
    });
  }
  
  /**
   * Process websocket message
   * @param {Object} message - Websocket message
   * @private
   */
  _processWebsocketMessage(message) {
    // Determine the message type
    let eventType, symbol, eventData;
    
    if (message.e) {
      eventType = message.e;
      symbol = message.s;
      eventData = message;
    } else {
      // If not a standard message, log and return
      return;
    }
    
    // Process the message based on event type
    let normalizedData;
    let channel;
    
    switch (eventType) {
      case '24hrTicker':
        channel = 'ticker';
        normalizedData = this._normalizeTickerData(eventData);
        break;
      case 'kline':
        channel = 'kline';
        normalizedData = this._normalizeKlineData(eventData);
        break;
      case 'depthUpdate':
        channel = 'depth';
        normalizedData = this._normalizeDepthData(eventData);
        break;
      case 'trade':
        channel = 'trade';
        normalizedData = this._normalizeTradeData(eventData);
        break;
      default:
        this.logger.debug(`Unhandled event type: ${eventType}`);
        return;
    }
    
    // Format the symbol to Perseus Drive standard
    const formattedSymbol = this._reverseFormatSymbol(symbol);
    
    // Emit the event
    this.emit('data', {
      provider: 'binance',
      channel,
      symbol: formattedSymbol,
      data: normalizedData,
      timestamp: new Date().toISOString(),
      raw: message
    });
  }
  
  /**
   * Format symbol to Binance format
   * @param {string} symbol - Standard symbol (e.g., 'BTC-USDT')
   * @returns {string} Binance formatted symbol (e.g., 'BTCUSDT')
   * @private
   */
  _formatSymbol(symbol) {
    // Convert from "BTC-USDT" to "BTCUSDT"
    return symbol.replace('-', '').toUpperCase();
  }
  
  /**
   * Convert Binance symbol to standard format
   * @param {string} symbol - Binance symbol (e.g., 'BTCUSDT')
   * @returns {string} Standard symbol (e.g., 'BTC-USDT')
   * @private
   */
  _reverseFormatSymbol(symbol) {
    // Common quote assets to identify the split point
    const quoteAssets = ['USDT', 'BTC', 'ETH', 'BNB', 'BUSD', 'USDC'];
    
    for (const quote of quoteAssets) {
      if (symbol.endsWith(quote)) {
        const base = symbol.slice(0, -quote.length);
        return `${base}-${quote}`;
      }
    }
    
    // If no common quote asset found, assume last 4 characters are quote asset
    const base = symbol.slice(0, -4);
    const quote = symbol.slice(-4);
    return `${base}-${quote}`;
  }
  
  /**
   * Format timeframe to Binance interval
   * @param {string} timeframe - Standard timeframe (e.g., '1h', '15m')
   * @returns {string} Binance interval
   * @private
   */
  _formatTimeframe(timeframe) {
    // Binance uses the same format as our standard, just verify
    const validIntervals = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'];
    
    if (validIntervals.includes(timeframe)) {
      return timeframe;
    }
    
    // Try to convert some common formats
    const conversions = {
      '1min': '1m',
      '3min': '3m',
      '5min': '5m',
      '15min': '15m',
      '30min': '30m',
      '1hour': '1h',
      '2hour': '2h',
      '4hour': '4h',
      '1day': '1d',
      '1week': '1w',
      '1month': '1M'
    };
    
    if (conversions[timeframe]) {
      return conversions[timeframe];
    }
    
    // If not recognized, default to 1h
    this.logger.warn(`Unrecognized timeframe: ${timeframe}, defaulting to 1h`);
    return '1h';
  }
  
  /**
   * Normalize market data to standard format
   * @param {Object} data - Binance-specific data
   * @returns {Object} Normalized data
   * @private
   */
  _normalizeMarketData(data) {
    const { ticker, orderBook, recentTrades, timestamp } = data;
    
    const result = {
      symbol: this._reverseFormatSymbol(ticker.symbol),
      timestamp,
      prices: [
        parseFloat(ticker.lastPrice)
      ],
      volume: parseFloat(ticker.volume),
      priceChange: parseFloat(ticker.priceChange),
      priceChangePercent: parseFloat(ticker.priceChangePercent),
      high: parseFloat(ticker.highPrice),
      low: parseFloat(ticker.lowPrice),
      open: parseFloat(ticker.openPrice),
      exchange: 'binance'
    };
    
    // Add order book if available
    if (orderBook) {
      result.orderBook = {
        bids: orderBook.bids.map(([price, quantity]) => ({ 
          price: parseFloat(price), 
          quantity: parseFloat(quantity) 
        })),
        asks: orderBook.asks.map(([price, quantity]) => ({ 
          price: parseFloat(price), 
          quantity: parseFloat(quantity) 
        }))
      };
    }
    
    // Add recent trades if available
    if (recentTrades) {
      result.recentTrades = recentTrades.map(trade => ({
        id: trade.id,
        price: parseFloat(trade.price),
        quantity: parseFloat(trade.qty),
        time: new Date(trade.time).toISOString(),
        isBuyerMaker: trade.isBuyerMaker
      }));
    }
    
    return result;
  }
  
  /**
   * Normalize historical data to standard format
   * @param {Array} data - Binance klines data
   * @param {string} symbol - Market symbol
   * @returns {Array} Normalized historical data
   * @private
   */
  _normalizeHistoricalData(data, symbol) {
    // Binance klines format:
    // [
    //   0: Open time,
    //   1: Open price,
    //   2: High price,
    //   3: Low price,
    //   4: Close price,
    //   5: Volume,
    //   6: Close time,
    //   7: Quote asset volume,
    //   8: Number of trades,
    //   9: Taker buy base asset volume,
    //   10: Taker buy quote asset volume,
    //   11: Ignore
    // ]
    
    return data.map(candle => ({
      symbol: this._reverseFormatSymbol(this._formatSymbol(symbol)),
      timestamp: new Date(candle[0]).toISOString(),
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5]),
      closeTime: new Date(candle[6]).toISOString(),
      quoteVolume: parseFloat(candle[7]),
      trades: parseInt(candle[8]),
      buyBaseVolume: parseFloat(candle[9]),
      buyQuoteVolume: parseFloat(candle[10]),
      exchange: 'binance'
    }));
  }
  
  /**
   * Normalize ticker data from websocket
   * @param {Object} data - Binance ticker data
   * @returns {Object} Normalized ticker data
   * @private
   */
  _normalizeTickerData(data) {
    return {
      symbol: this._reverseFormatSymbol(data.s),
      price: parseFloat(data.c),
      priceChange: parseFloat(data.p),
      priceChangePercent: parseFloat(data.P),
      high: parseFloat(data.h),
      low: parseFloat(data.l),
      volume: parseFloat(data.v),
      quoteVolume: parseFloat(data.q),
      openTime: new Date(data.O).toISOString(),
      closeTime: new Date(data.C).toISOString(),
      timestamp: new Date(data.E).toISOString(),
      trades: parseInt(data.n),
      exchange: 'binance'
    };
  }
  
  /**
   * Normalize kline data from websocket
   * @param {Object} data - Binance kline data
   * @returns {Object} Normalized kline data
   * @private
   */
  _normalizeKlineData(data) {
    const k = data.k;
    
    return {
      symbol: this._reverseFormatSymbol(data.s),
      interval: k.i,
      startTime: new Date(k.t).toISOString(),
      closeTime: new Date(k.T).toISOString(),
      open: parseFloat(k.o),
      high: parseFloat(k.h),
      low: parseFloat(k.l),
      close: parseFloat(k.c),
      volume: parseFloat(k.v),
      trades: parseInt(k.n),
      isClosed: k.x,
      quoteVolume: parseFloat(k.q),
      buyBaseVolume: parseFloat(k.V),
      buyQuoteVolume: parseFloat(k.Q),
      timestamp: new Date(data.E).toISOString(),
      exchange: 'binance'
    };
  }
  
  /**
   * Normalize depth data from websocket
   * @param {Object} data - Binance depth data
   * @returns {Object} Normalized depth data
   * @private
   */
  _normalizeDepthData(data) {
    return {
      symbol: this._reverseFormatSymbol(data.s),
      timestamp: new Date(data.E).toISOString(),
      firstUpdateId: data.U,
      finalUpdateId: data.u,
      bids: data.b.map(([price, quantity]) => ({ 
        price: parseFloat(price), 
        quantity: parseFloat(quantity) 
      })),
      asks: data.a.map(([price, quantity]) => ({ 
        price: parseFloat(price), 
        quantity: parseFloat(quantity) 
      })),
      exchange: 'binance'
    };
  }
  
  /**
   * Normalize trade data from websocket
   * @param {Object} data - Binance trade data
   * @returns {Object} Normalized trade data
   * @private
   */
  _normalizeTradeData(data) {
    return {
      symbol: this._reverseFormatSymbol(data.s),
      id: data.t,
      price: parseFloat(data.p),
      quantity: parseFloat(data.q),
      time: new Date(data.T).toISOString(),
      isBuyerMaker: data.m,
      isBestMatch: data.M,
      timestamp: new Date(data.E).toISOString(),
      exchange: 'binance'
    };
  }
}

module.exports = new BinanceProvider(); 